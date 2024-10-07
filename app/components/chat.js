"use client";

import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase'; // firebase.js を正しくインポート
import { useAuth } from '../context/AuthContext'; // 正しいパスを指定

export default function Chat() {
    let user = useAuth();
    console.log("Chatコンポーネント内のユーザー:", user);

    const [posts, setPosts] = useState([]);

    useEffect(() => {
        const q = query(collection(db, "posts"), orderBy("timestamp", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return unsubscribe;
    }, []);

    return (
        <div className="container mx-auto p-4 h-screen">
            <h1>チャット</h1>
            <div className="space-y-4">
                {posts.map((post) => (
                    <div
                        key={post.id}
                        className={`p-4 rounded-lg ${post.userId === user?.uid ? 'bg-blue-100 text-right ml-auto' : 'bg-gray-100 text-left mr-auto'}`}
                        style={{ maxWidth: '75%' }}
                    >
                        <p className="font-bold">{post.userName}</p>
                        <p className="font-bold">{post.response}</p>
                        {/* <p>{post.text}</p> */}
                        {/* <p className="text-sm text-gray-500">{new Date(post.timestamp.toDate()).toLocaleString()}</p> */}
                    </div>
                ))}
            </div>
        </div>
    );
}