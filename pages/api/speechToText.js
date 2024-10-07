// pages/api/speechToText.js
import { SpeechClient } from '@google-cloud/speech';
import multer from 'multer';
import fs from 'fs';
import util from 'util';

const unlinkFile = util.promisify(fs.unlink);

const upload = multer({ storage: multer.memoryStorage() });

const speechClient = new SpeechClient({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),  // 改行の処理
  },
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,  // プロジェクトID
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
