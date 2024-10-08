"use client";

import { useAuth } from './context/AuthContext';
import { useState, useCallback, useMemo, useEffect } from 'react';
import axios from 'axios';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image';
import bg from "@/public/bg-top.png";
import topimg from "@/public/topicon.png";
import talkicon from "@/public/talkicon.png";
import {
    Box,
    Button,
    Dialog,
    DialogContent,
    Divider,
    FormControl,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Stack,
    Typography
} from "@mui/material";
import {
    ArrowBack,
    Stop,
    Mic as MicIcon
} from '@mui/icons-material';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase';




const ReactMediaRecorder = dynamic(
    () => import('react-media-recorder').then(mod => mod.ReactMediaRecorder),
    { ssr: false }
);

const mbtiTypes = [
    "INTJ", "INTP", "ENTJ", "ENTP", "INFJ", "INFP", "ENFJ", "ENFP",
    "ISTJ", "ISFJ", "ESTJ", "ESFJ", "ISTP", "ISFP", "ESTP", "ESFP"
];


/** ログイン/ログアウト状態で切り替えを行う */
export default function Home() {
    const { user, login, logout } = useAuth();
    const [mbti, setMbti] = useState("");
    const [recordedText, setRecordedText] = useState("");
    const [prediction, setPrediction] = useState("");
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [isStopOpen, setIsStopOpen] = useState<boolean>(false);
    const [userMbti, setUserMbti] = useState("");


    /** MBTIを保存する関数 */
    const handleSave = useCallback(async () => {
        if (!user) {
            setError('ログインが必要です');
            console.error('User is not authenticated');
            return;
        }
        if (mbti) {
            try {
                await axios.post('/api/saveMBTI', { userId: user.uid, mbti });
                alert('MBTIタイプが保存されました');
            } catch (error) {
                console.error('MBTIタイプの保存エラー:', error);
                alert('MBTIタイプの保存に失敗しました');
            }
        } else {
            alert('MBTIタイプを選択してください');
        }
    }, [mbti, user]);
    /** firebaseのMBTIタイプを取得する関数 */
    const fetchUserMBTI = useCallback(async () => {
        if (user) {
            try {
                const userDocRef = doc(db, "users", user.uid);  // usersコレクションからユーザーIDを使ってドキュメントを参照
                const userDoc = await getDoc(userDocRef);  // ドキュメントの取得

                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    setUserMbti(userData.mbti);
                    setMbti(userData.mbti);
                } else {
                    console.log("ドキュメントが存在しません");
                }
            } catch (error) {
                console.error("MBTIタイプの取得エラー:", error);
            }
        }
    }, [user]);
    /** 読み込み時にMBTI取得関数を実行する */
    useEffect(() => {
        fetchUserMBTI();
    }, [fetchUserMBTI]);
    /**  */
    const isSaveDisabled = useMemo(() => mbti !== "" && mbti === userMbti, [mbti, userMbti]);

    /** 生成を開始するボタン */
    const handleRecord = useCallback(async () => {
        if (!user) {
            setError('ログインが必要です');
            console.error('User is not authenticated');
            return;
        }
        if (audioBlob) {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'audio.webm');

            try {
                console.log('音声を /api/speechToText に送信');
                const response = await axios.post('/api/speechToText', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });
                const { transcript } = response.data;
                console.log('テキスト変換結果受信:', transcript);
                setRecordedText(transcript);

                // Vertex AIに送信
                console.log('テキストを /api/vertexAI に送信');
                console.log('送信するデータ:', {
                    text: transcript,
                    mbti: mbti,
                    userId: user?.uid,
                    userName: user?.displayName,
                });
                const aiResponse = await axios.post('/api/vertexAI', { text: transcript, mbti, userId: user.uid, userName: user.displayName });
                console.log('Vertex AIからのレスポンス受信:', aiResponse.data.response);
                setPrediction(aiResponse.data.response);

                setIsOpen(true);
            } catch (error: any) {
                console.error('音声処理エラー:', error);
                setError('音声処理エラー: ' + (error.response?.data?.details || error.message));
            }
        } else {
            setError('録音された音声がありません');
        }
    }, [audioBlob, mbti]);

    return (
        <div className="container h-screen w-screen mx-auto p-4 bg-sky-500 bg-cover bg-center" style={{ backgroundImage: `url(${bg.src})` }}>
            {!user ? (
                <Box
                    display="flex"
                    height="75vh"
                    justifyContent="center"
                    alignItems="center"
                >
                    <Stack >
                        <Image src={topimg} alt='アイコン' width={400} height={400} />
                        <Stack display="flex" justifyContent="center" alignItems="center">
                            <Button onClick={login} variant='contained' size='large'>LOGIN(Google)</Button>
                        </Stack>
                    </Stack>
                </Box>
            ) : (
                <div>
                    <Paper sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 1 }}>
                        <Button variant='outlined' startIcon={<ArrowBack />} onClick={logout}>戻る</Button>
                        <Typography>こんにちは、{user.displayName}さん</Typography>
                    </Paper>
                    <Image src={talkicon} alt='アイコン' width={400} height={400} className='mx-auto' />

                    <Paper sx={{ padding: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Stack>
                            <FormControl variant='filled' style={{ minWidth: 120 }} disabled={isSaveDisabled}>
                                <InputLabel>MBTIタイプを選択</InputLabel>
                                <Select
                                    value={mbti}
                                    onChange={(e) => setMbti(e.target.value)}
                                    label="MBTIタイプを選択"
                                >
                                    <MenuItem value="">
                                        <em>MBTIタイプを選択</em>
                                    </MenuItem>
                                    {mbtiTypes.map((type) => (
                                        <MenuItem key={type} value={type}>
                                            {type}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <Button
                                onClick={handleSave}
                                variant="contained"
                                color="primary"
                                style={{ marginTop: '16px' }}
                                disabled={isSaveDisabled}
                            >
                                保存
                            </Button>
                        </Stack>
                        <Stack>

                            {error && <p className="text-red-500">{error}</p>}
                            <ReactMediaRecorder
                                audio
                                blobPropertyBag={{ type: 'audio/webm' }}
                                onStop={(blobUrl, blob) => setAudioBlob(blob)}
                                render={({ startRecording, stopRecording, mediaBlobUrl }) => (
                                    <Stack direction="row" gap={2} justifyContent="center">
                                        <Button
                                            onClick={() => {
                                                startRecording();
                                                setIsStopOpen(true);
                                            }}
                                            size='large'
                                            color='success'
                                            startIcon={<MicIcon fontSize='large' />}
                                            variant='contained'
                                        >
                                            愚痴る！
                                        </Button>
                                        <Dialog open={isStopOpen}>
                                            <DialogContent sx={{ padding: 2, gap: 1, display: "flex", flexDirection: "column" }}>
                                                <Typography textAlign="center" variant='h5' component="p" color='success'>録音中...</Typography>
                                                <Typography textAlign="center" variant='body2'>こんなことを喋ってみて！</Typography>
                                                <Typography variant='body2' padding={1}>今日あったむかついたことは？<br />疲れちゃったことは？</Typography>
                                                <Stack textAlign="center">
                                                    <Button
                                                        onClick={() => {
                                                            stopRecording();
                                                            setIsStopOpen(false);
                                                        }}
                                                        size='large'
                                                        color='error'
                                                        startIcon={<Stop fontSize='large' />}
                                                        variant='contained'
                                                    >
                                                        停止！
                                                    </Button>
                                                </Stack>
                                            </DialogContent>
                                        </Dialog>
                                        <Button onClick={handleRecord} variant='contained' >
                                            ぐちを生成/投稿
                                        </Button>
                                        {/* {mediaBlobUrl && <audio src={mediaBlobUrl} controls />} */}

                                    </Stack>
                                )}
                            />
                        </Stack>
                        <Stack textAlign="center">
                            <Link href="/chat" className='block'>
                                <Button>チャットページへ</Button>
                            </Link>
                        </Stack>
                    </Paper>
                    <Dialog open={isOpen} >
                        <DialogContent sx={{ padding: 2, gap: 1 }}>
                            <Stack paddingBottom={1}>
                                <Typography variant='body1' fontSize="20px" textAlign="center">あなたが言ったことは...</Typography>
                                <Typography> {recordedText}</Typography>
                            </Stack>
                            <Divider />
                            <Stack >
                                <Typography variant='body1' fontSize="20px" textAlign="center">変換！</Typography>
                                <Typography> {prediction}</Typography>
                            </Stack>
                            <Stack textAlign="right">
                                <Link href="/chat" className='block'>
                                    <Button>チャットページへ</Button>
                                </Link>
                            </Stack>
                        </DialogContent>
                    </Dialog>
                </div>
            )}
        </div>
    );
}
