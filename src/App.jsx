/* ============================================================
   BREWLOG NOTE — src/App.jsx  (Root)
   onAuthStateChanged → user 상태 관리
   lang / darkMode 전역 토글
   게스트 모드 지원
   LangContext 공급 (children이 useLang()으로 소비)
   ============================================================ */
import { useState, useEffect, createContext, useContext } from "react";
import React from "react";
import {
  onAuthStateChanged, setPersistence, browserLocalPersistence,
} from "firebase/auth";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./config/firebase";
import { loadBrandsFromDB } from "./utils/storage";
import AuthScreen from "./components/auth/AuthScreen";
import MainApp    from "./components/MainApp";
import "./styles/global.css";

// ── LangContext (전역 언어 공유) ──────────────────────────────────
export const LangContext = createContext("ko");
export function useLang() { return useContext(LangContext); }

// 로그인 상태 유지 (브라우저 종료 후에도)
setPersistence(auth, browserLocalPersistence).catch(() => {});

// ─────────────────────────────────────────────────────────────────
export default function App() {
  // undefined → 로딩 중, null → 비로그인, User → 로그인됨
  const [user,            setUser]            = useState(undefined);
  const [lang,            setLang]            = useState(
    () => localStorage.getItem("brewlog_lang") || "ko"
  );
  const [guestMode,       setGuestMode]       = useState(false);
  const [authDefaultTab,  setAuthDefaultTab]  = useState("login");

  // ── 다크 모드 ────────────────────────────────────────────────────
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("brewlog_theme") === "dark"
  );

  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem("brewlog_theme", next ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
  };

  // 초기 로드 시 저장된 테마 적용
  useEffect(() => {
    const saved = localStorage.getItem("brewlog_theme");
    if (saved) document.documentElement.setAttribute("data-theme", saved);
  }, []);

  // ── 언어 토글 ────────────────────────────────────────────────────
  const toggleLang = () => {
    const next = lang === "ko" ? "en" : "ko";
    setLang(next);
    localStorage.setItem("brewlog_lang", next);
  };

  // ── 비회원이 회원가입 필요 시 ────────────────────────────────────
  const requireAuth = () => {
    setGuestMode(false);
    setAuthDefaultTab("register");
  };

  // ── 인증 상태 감지 + 브랜드 초기 로드 ───────────────────────────
  useEffect(() => {
    // Firestore 브랜드 캐시 초기화
    loadBrandsFromDB();

    // onAuthStateChanged
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u ?? null);
      // 자동 로그인 시 최종 접속일 업데이트 (하루 1회)
      if (u) {
        try {
          const userDoc = await getDoc(doc(db, "users", u.uid));
          if (userDoc.exists()) {
            const last  = userDoc.data().lastLogin?.toDate?.();
            const today = new Date().toDateString();
            if (!last || last.toDateString() !== today) {
              await updateDoc(doc(db, "users", u.uid), { lastLogin: serverTimestamp() });
            }
          }
        } catch {}
      }
    });

    // 최초 방문 시 IP 기반 언어 감지
    if (!localStorage.getItem("brewlog_lang")) {
      fetch("https://ipapi.co/json/")
        .then((r) => r.json())
        .then((d) => {
          const detected = d.country_code === "KR" ? "ko" : "en";
          setLang(detected);
          localStorage.setItem("brewlog_lang", detected);
        })
        .catch(() => {});
    }

    return unsub;
  }, []);

  // ── 로딩 스피너 ──────────────────────────────────────────────────
  if (user === undefined) {
    return (
      <LangContext.Provider value={lang}>
        <div className="loading-wrap">
          <p style={{ display:"flex", alignItems:"center", gap:"8px" }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"
              style={{ animation:"spin 1s linear infinite", color:"var(--muted)" }}>
              <circle cx="9" cy="9" r="7" stroke="currentColor"
                strokeWidth="1.8" strokeDasharray="14 30" strokeLinecap="round"/>
            </svg>
            로딩 중…
          </p>
        </div>
      </LangContext.Provider>
    );
  }

  // ── 라우팅 ───────────────────────────────────────────────────────
  return (
    <LangContext.Provider value={lang}>
      {user ? (
        // 로그인 유저 → MainApp
        <MainApp
          user={user}
          lang={lang}
          toggleLang={toggleLang}
          darkMode={darkMode}
          toggleDark={toggleDark}
        />
      ) : guestMode ? (
        // 게스트 모드 → MainApp (user=null)
        <MainApp
          user={null}
          lang={lang}
          toggleLang={toggleLang}
          darkMode={darkMode}
          toggleDark={toggleDark}
          onRequireAuth={requireAuth}
        />
      ) : (
        // 비로그인 → AuthScreen
        <AuthScreen
          lang={lang}
          toggleLang={toggleLang}
          darkMode={darkMode}
          toggleDark={toggleDark}
          defaultTab={authDefaultTab}
          onGuest={() => {
            setGuestMode(true);
            setAuthDefaultTab("login");
          }}
        />
      )}
    </LangContext.Provider>
  );
}
