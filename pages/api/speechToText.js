// pages/api/speechToText.js
import { SpeechClient } from '@google-cloud/speech';
import multer from 'multer';
import fs from 'fs';
import util from 'util';

const unlinkFile = util.promisify(fs.unlink);  // ファイル削除のためのpromisify関数

const upload = multer({ storage: multer.memoryStorage() });

const speechClient = new SpeechClient({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),  // 改行の処理
  },
  projectId: process.env.GOOGLE_PROJECT_ID,  // プロジェクトID
});

export const config = {
  api: {
    bodyParser: false,  // multerを使用するためbodyParserを無効に
  },
};

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const uploadMiddleware = upload.single('audio');
    
    // Promiseでmulterの処理をラップ
    const runMiddleware = (req, res, fn) =>
      new Promise((resolve, reject) => {
        fn(req, res, (result) => {
          if (result instanceof Error) {
            return reject(result);
          }
          resolve();
        });
      });

    try {
      // multerの非同期処理
      await runMiddleware(req, res, uploadMiddleware);

      // MIMEタイプの確認
      const mimeType = req.file.mimetype;
      console.log('アップロードされたファイルのMIMEタイプ:', mimeType);

      if (mimeType !== 'audio/webm' && mimeType !== 'audio/ogg') {
        res.status(400).json({ error: `サポートされていないファイル形式: ${mimeType}` });
        return;
      }

      // base64変換の確認
      const audioBytes = req.file.buffer.toString('base64');

      const audio = {
        content: audioBytes,
      };

      const config = {
        encoding: 'WEBM',  // WebM Opus形式の設定
        sampleRateHertz: 48000,
        languageCode: 'ja-JP',
      };

      const request = {
        audio: audio,
        config: config,
      };

      console.log('APIリクエスト:', JSON.stringify(request, null, 2));

      // Google Speech-to-Text API呼び出し
      const [response] = await speechClient.recognize(request);
      const transcription = response.results
        .map((result) => result.alternatives[0].transcript)
        .join('\n');

      // 成功時のレスポンス
      res.status(200).json({ transcript: transcription });
    } catch (error) {
      console.error('音声ファイル処理中のエラー:', error);
      res.status(500).json({ error: 'Error processing audio file', details: error.message });
    } finally {
      // 使用した一時ファイルの削除（もし存在すれば）
      if (req.file && req.file.path) {
        await unlinkFile(req.file.path);
      }
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
