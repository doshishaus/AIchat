const { VertexAI } = require('@google-cloud/vertexai');
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../firebase';
import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      type: process.env.GOOGLE_TYPE,
      project_id: process.env.GOOGLE_PROJECT_ID,
      private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),  // 改行を適切に処理
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      client_id: process.env.GOOGLE_CLIENT_ID,
      auth_uri: process.env.GOOGLE_AUTH_URI,
      token_uri: process.env.GOOGLE_TOKEN_URI,
      auth_provider_x509_cert_url: process.env.GOOGLE_AUTH_PROVIDER_X509_CERT_URL,
      client_x509_cert_url: process.env.GOOGLE_CLIENT_X509_CERT_URL,
      universe_domain: process.env.GOOGLE_UNIVERSE_DOMAIN
    })
  });
}

const clientOptions = {
  project: 'miyazaki-430102',
  location: 'us-central1',
};

const vertexAI = new VertexAI(clientOptions);
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
        text: `あなたは文章の編集者です。ユーザからMBTIのタイプと今日会った嫌なことの内容をテキストで受け取ります。それをMBTIのタイプに沿って、面白い文章に書き直す役割を担っています。ユーザの視点から、嫌なことを面白い文章として書き直してください。分の量は80文字程度にして`,
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
      console.log('Vertex AIにリクエスト送信:', JSON.stringify(request, null, 2));
      const streamingResp = await generativeModel.generateContentStream(request);

      let aggregatedResponse = '';
      for await (const item of streamingResp.stream) {
        if (item.candidates) {
          for (const candidate of item.candidates) {
            if (candidate.content && candidate.content.parts) {
              aggregatedResponse += candidate.content.parts.map(part => part.text).join('');
            } else if (candidate.safetyRatings) {
              console.error('セーフティチェックによりブロックされました:', JSON.stringify(candidate.safetyRatings, null, 2));
            } else {
              console.error('予期しないレスポンス形式:', JSON.stringify(candidate, null, 2));
            }
          }
        } else {
          console.error('予期しないレスポンス形式:', JSON.stringify(item, null, 2));
        }
      }

      console.log('Vertex AIからのレスポンス受信:', aggregatedResponse);

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
    } catch (error) {
      console.error('予測作成エラー:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      res.status(500).json({ error: '予測作成エラー', details: error.message });
    }
  } else {
    res.status(405).json({ error: '許可されていないメソッドです' });
  }
}
