// pages/api/speechToText.js
import { SpeechClient } from '@google-cloud/speech';
import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});


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
        const transcription = response.results
          .map((result) => result.alternatives[0].transcript)
          .join('\n');
        res.status(200).json({ transcript: transcription });
      } catch (error) {
        console.error('Error processing audio file:', error);
        res.status(500).json({ error: 'Error processing audio file', details: error.message });
      }
    });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
