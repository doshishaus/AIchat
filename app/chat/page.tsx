"use client";

import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../context/AuthContext';
import { Button, Paper, Typography } from '@mui/material';
import ArrowBack from '@mui/icons-material/ArrowBack';
import { useRouter } from 'next/navigation';

// Post型の定義
type Post = {
    id: string;
    userName: string;
    response: string;
    userId: string;
    timestamp: any;
};


export default function Chat() {
    const { user } = useAuth();
    const [posts, setPosts] = useState<Post[]>([]);
    const router = useRouter();

    useEffect(() => {
        const q = query(collection(db, "posts"), orderBy("timestamp", "asc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setPosts(snapshot.docs.map(doc => {
                const data = doc.data() as Omit<Post, 'id'>; // 'id' を除いた Post 型として扱う
                return { id: doc.id, ...data }; // 'id' をドキュメントIDに戻す
            }));
        });
        return unsubscribe;
    }, []);

    const handleReturn = () => {
        router.back();
    }

    return (
        <div className="container mx-auto p-4 min-h-screen bg-blue-400">
            <div className="space-y-4">
                <Paper sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding:1}}>
                    <Button startIcon={<ArrowBack />} onClick={handleReturn}>戻る</Button>
                    <Typography variant='body2'>ログイン中:{user?.displayName}</Typography>
                </Paper>
                {posts.map((post) => (
                    <div
                        key={post.id}
                        className={`p-4 rounded-lg text-black ${post.userId === user?.uid ? 'bg-green-400 ml-auto text-left' : 'bg-white mr-auto text-left'}`}
                        style={{ maxWidth: '75%' }}
                    >
                        <p className="font-semibold">{post.userName}</p> {/* ユーザー名を表示 */}
                        {/* <p>{post.text}</p> */}
                        <p className="font-bold mt-2">{post.response}</p>
                        {/* <p className="text-sm text-gray-500 mt-1">{new Date(post.timestamp.toDate()).toLocaleString()}</p> */}
                    </div>
                ))}
            </div>
        </div>
    );
}
