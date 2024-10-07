// pages/api/speechToText.js
import { SpeechClient } from '@google-cloud/speech';
import multer from 'multer';
import fs from 'fs';
import util from 'util';

const unlinkFile = util.promisify(fs.unlink);

const upload = multer({ dest: 'uploads/' });

const speechClient = new SpeechClient({
  keyFilename: 'keyfile.json',

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

      const audioBytes = fs.readFileSync(req.file.path).toString('base64');

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
        await unlinkFile(req.file.path); // Clean up the uploaded file
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
