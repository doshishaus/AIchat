// pages/api/saveMBTI.js
import { db } from '../../firebase';
import { collection, doc, setDoc } from 'firebase/firestore';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { userId, mbti } = req.body;

    try {
      const usersCollection = collection(db, 'users');
      const userDoc = doc(usersCollection, userId);
      await setDoc(userDoc, { mbti });

      res.status(200).json({ message: 'MBTIタイプが保存されました' });
    } catch (error) {
      console.error('Error saving MBTI:', error);
      res.status(500).json({ error: 'MBTIタイプの保存に失敗しました', details: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
