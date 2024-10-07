const { VertexAI } = require('@google-cloud/vertexai');
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../firebase';
import admin from 'firebase-admin';
import dotenv from "dotenv";
import serviceAccount from '../../keyfile.json';


dotenv.config();

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}
let vertexAI;
try {
  vertexAI = new VertexAI({
    project: process.env.GOOGLE_PROJECT_ID,
    location: 'us-central1',
  });

  console.log('Vertex AIの認証は成功しました');
} catch (error) {
  console.error('Vertex AIの認証に失敗しました: ', error);
  throw new Error('Vertex AIの認証に失敗しました');
}
const model = 'gemini-1.5-pro-001';

const generativeModel = vertexAI.preview.getGenerativeModel({
  model: model,
  generationConfig: {
    maxOutputTokens: 8192,
    temperature: 1,
    topP: 0.95,
  },
  safetySettings: [
    {
      category: 'HARM_CATEGORY_HATE_SPEECH',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE',
    },
    {
      category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE',
    },
    {
      category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE',
    },
    {
      category: 'HARM_CATEGORY_HARASSMENT',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE',
    },
  ],
  systemInstruction: {
    parts: [
      {
        text: `あなたは文章の編集者です。ユーザからMBTIのタイプと今日あった嫌なことの内容をテキストで受け取ります。それをMBTIのタイプに沿って、面白い文章に書き直す役割を担っています。ユーザの視点から、嫌なことを面白い文章として書き直してください。分の量は80文字程度にして`,
      },
    ],
  },
});


export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { mbti, text, userId, userName } = req.body;

    if (!mbti || !text) {
      res.status(400).json({ error: 'MBTIタイプとテキストは必須です' });
      return;
    }
    console.log('受信したリクエスト:', { mbti, text });

    const reqText = `[${mbti}] ${text}`;
    console.log(reqText);

    const request = {
      contents: [
        { role: 'user', parts: [{ text: reqText }] },
      ],
    };

    try {
      console.log('Vertex AIにリクエスト送信(サーバサイド):', JSON.stringify(request, null, 2));

      // ストリームレスポンスを取得
      const streamingResp = await generativeModel.generateContentStream(request);
      console.log("ストリームのレスポンスを受信しました:", streamingResp);

      let aggregatedResponse = '';

      try {
        // ストリームのアイテムを処理
        for await (const item of streamingResp.stream) {
          console.log('ストリームのアイテムを処理中:', item);

          if (item.candidates) {
            for (const candidate of item.candidates) {
              if (candidate.content && candidate.content.parts) {
                aggregatedResponse += candidate.content.parts.map(part => part.text).join('');
              } else if (candidate.safetyRatings) {
                console.error('セーフティチェックによりブロックされました:', JSON.stringify(candidate.safetyRatings, null, 2));
              } else {
                console.error('予期しないレスポンス形式 (候補あり):', JSON.stringify(candidate, null, 2));
              }
            }
          } else {
            console.error('予期しないレスポンス形式 (候補なし):', JSON.stringify(item, null, 2));
          }
        }
      } catch (streamError) {
        console.error('ストリームの処理中にエラーが発生しました:', streamError);
        throw streamError; // ストリーム処理のエラーは再スロー
      }

      console.log('Vertex AIからのレスポンス受信:', aggregatedResponse);

      try {
        // Firestoreに保存
        const docRef = await addDoc(collection(db, "posts"), {
          userId,
          userName,
          mbti,
          text,
          response: aggregatedResponse,
          timestamp: new Date()
        });

        console.log("Document written with ID: ", docRef.id);
        res.status(200).json({ response: aggregatedResponse });
      } catch (firestoreError) {
        console.error('Firestoreへの保存時にエラーが発生しました:', firestoreError);
        res.status(500).json({ error: 'Firestore保存エラー', details: firestoreError.message });
      }

    } catch (error) {
      console.error('予測作成エラー:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      res.status(500).json({ error: '予測作成エラー', details: error.message });
    }
  } else {
    res.status(405).json({ error: '許可されていないメソッドです' });
  }
}
