"use client";
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User, Auth } from 'firebase/auth';
import { auth } from '../../firebase'; 

type children = {
    children:ReactNode;
}

export const AuthProvider = ({ children }:children) => {
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                console.log("ユーザーがログインしました:", user);
                setUser(user);
            } else {
                console.log("ログインしているユーザーはいません");
                setUser(null);
            }
        });
        return () => unsubscribe();
    }, []);

    const login = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("ログイン中にエラーが発生しました:", error);
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("ログアウト中にエラーが発生しました:", error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

type AuthProps = {
    user: User | null;
    login: () => void;
    logout: () => void;
}
const AuthContext = createContext<AuthProps | undefined>(undefined);


export const useAuth = (): AuthProps => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        console.error("useAuthはAuthProvider内で使用する必要があります");
        throw new Error("useAuthはAuthProvider内で使用する必要があります");
    }
    return context;
};
