// pages/api/speechToText.js
import { SpeechClient } from '@google-cloud/speech';
import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type'; 

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

console.log("リプレイス実行前 ", process.env.GOOGLE_PRIVATE_KEY);
// 置換を実行
const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');

// 置換後の状態を確認
console.log("実行後 ", privateKey);


const speechClient = new SpeechClient({
  credentials: {
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
    universe_domain: process.env.GOOGLE_UNIVERSE_DOMAIN,
  },
  projectId: process.env.GOOGLE_PROJECT_ID,
});
console.log(speechClient);

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const uploadMiddleware = upload.single('audio');
    uploadMiddleware(req, res, async (err) => {
      if (err) {
        res.status(500).json({ error: 'Error uploading file', details: err.message });
        return;
      }

      // MIMEタイプを確認する
      const mimeType = req.file.mimetype;
      console.log('Uploaded file MIMEタイプ:', mimeType);

      // サポートされている形式かどうかをチェック
      if (mimeType !== 'audio/webm' && mimeType !== 'audio/wav' && mimeType !== 'audio/mpeg') {
        res.status(400).json({ error: 'Unsupported audio format' });
        return;
      }

      // 必要に応じて、file-typeライブラリを使ってさらにファイル形式を厳密に確認できる
      const fileType = await fileTypeFromBuffer(req.file.buffer);
      if (fileType) {
        console.log(`Detected file type: ${fileType.ext}, MIME type: ${fileType.mime}`);
      }

      const audioBytes = req.file.buffer.toString('base64');

      const audio = {
        content: audioBytes,
      };

      const config = {
        encoding: 'WEBM_OPUS',
        sampleRateHertz: 48000,
        languageCode: 'ja-JP',
      };

      const request = {
        audio: audio,
        config: config,
      };

      try {
        const [response] = await speechClient.recognize(request);
        console.log()
        const transcription = response.results
          .map((result) => result.alternatives[0].transcript)
          .join('\n');
        res.status(200).json({ transcript: transcription });
      } catch (error) {
        console.log(speechClient);
        console.error('Error processing audio file:', error);
        res.status(500).json({ error: 'Error processing audio file', details: error.message });
      }
    });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
