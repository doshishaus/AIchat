// // pages/api/predict.js
// import { PredictionServiceClient } from '@google-cloud/aiplatform';
// import { init } from '@google-cloud/aiplatform/build/src';
// import { protos } from '@google-cloud/aiplatform/build/protos/protos';

// const clientOptions = {
//     apiEndpoint: 'us-central1-aiplatform.googleapis.com',
//     credentials: {
//         client_email: process.env.GOOGLE_CLIENT_EMAIL,
//         private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),  // 改行の処理
//     },
//     projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
// };

// const client = new PredictionServiceClient(clientOptions);

// export default async function handler(req, res) {
//     if (req.method === 'POST') {
//         const { text } = req.body;

//         if (!text) {
//             res.status(400).json({ error: 'Text is required' });
//             return;
//         }

//         const endpoint = `projects/miyazaki-430102/locations/us-central1/endpoints/YOUR_ENDPOINT_ID`;

//         const instance = {
//             content: text,
//         };

//         const instances = [instance];

//         const request = {
//             endpoint,
//             instances,
//         };

//         try {
//             const [response] = await client.predict(request);
//             const prediction = response.predictions[0];
//             res.status(200).json({ prediction });
//         } catch (error) {
//             console.error('Error making prediction:', error);
//             res.status(500).json({ error: 'Error making prediction', details: error.message });
//         }
//     } else {
//         res.status(405).json({ error: 'Method not allowed' });
//     }
// }
