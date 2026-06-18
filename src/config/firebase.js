/* ============================================================
   BREWLOG NOTE — src/config/firebase.js
   Firebase 앱 초기화 및 인스턴스 export
   사용: import { auth, db, googleProvider } from '@/config/firebase'
   ============================================================ */
import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  browserLocalPersistence,
  setPersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// ── Firebase 프로젝트 설정 ────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyDpVWWn3QiSei5V3mryUIowMJOhRVYHWQE",
  authDomain:        "coffee-recipe-app-382e5.firebaseapp.com",
  projectId:         "coffee-recipe-app-382e5",
  storageBucket:     "coffee-recipe-app-382e5.firebasestorage.app",
  messagingSenderId: "638702089903",
  appId:             "1:638702089903:web:3834d80ddd68bf22f4065a",
};

// ── 앱 초기화 ─────────────────────────────────────────────────────
const app = initializeApp(firebaseConfig);

// ── 서비스 인스턴스 ──────────────────────────────────────────────
export const auth           = getAuth(app);
export const db             = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// ── 자동 로그인 (브라우저 종료 후에도 유지) ──────────────────────
setPersistence(auth, browserLocalPersistence).catch(() => {});

export default app;
