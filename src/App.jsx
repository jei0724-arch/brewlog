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

    // ── 다국어 SEO: URL의 ?lang= 파라미터를 최우선 적용 ──────────────
    // index.html의 hreflang이 /?lang=ko, /?lang=en 각각을 가리키므로,
    // 구글은 두 버전을 별도로 크롤링해서 한국/해외 검색 결과에 각각 알맞게 노출시킬 수 있음
    // (한 URL의 상태가 크롤러 IP에 따라 랜덤하게 바뀌던 이전 방식보다 안정적)
    const urlLang = new URLSearchParams(window.location.search).get("lang");
    if (urlLang === "ko" || urlLang === "en") {
      setLang(urlLang);
      localStorage.setItem("brewlog_lang", urlLang);
    } else if (!localStorage.getItem("brewlog_lang")) {
      // lang 파라미터가 없는 기본 진입(x-default)일 때만 IP 기반 추정 — 실제 방문자 대상
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

  // ── 로딩 화면 ──────────────────────────────────────────────────
  if (user === undefined) {
    return (
      <LangContext.Provider value={lang}>
        <div className="loading-wrap">
          <div className="brew-loader">
            {/* 커피잔 SVG */}
            <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* 잔 테두리 */}
              <path d="M12 20h32l-4 22H16L12 20z" stroke="var(--latte)" strokeWidth="1.8" strokeLinejoin="round" fill="none"/>
              {/* 잔 손잡이 */}
              <path d="M44 26h4a4 4 0 0 1 0 8h-4" stroke="var(--latte)" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
              {/* 커피 채워지는 애니메이션 */}
              <clipPath id="fillClip">
                <rect x="13" y="20" width="30" height="22" rx="1"/>
              </clipPath>
              <rect x="13" y="20" width="30" height="22" fill="var(--latte)" opacity="0.15" rx="1"/>
              <rect className="brew-fill" x="13" y="20" width="30" height="22" fill="var(--latte)" opacity="0.5" rx="1"
                style={{ transformOrigin:"13px 42px", transform:"scaleY(0)", animation:"brewFill 1.6s ease-in-out infinite" }}/>
              {/* 증기 */}
              <path className="brew-steam" d="M22 16c0 0 2-3 0-6" stroke="var(--latte)" strokeWidth="1.5" strokeLinecap="round" opacity="0"
                style={{ animation:"steamRise 1.6s ease-out 0.4s infinite" }}/>
              <path className="brew-steam" d="M28 14c0 0 2-3 0-6" stroke="var(--latte)" strokeWidth="1.5" strokeLinecap="round" opacity="0"
                style={{ animation:"steamRise 1.6s ease-out 0.7s infinite" }}/>
              <path className="brew-steam" d="M34 16c0 0 2-3 0-6" stroke="var(--latte)" strokeWidth="1.5" strokeLinecap="round" opacity="0"
                style={{ animation:"steamRise 1.6s ease-out 1.0s infinite" }}/>
            </svg>
            <span className="brew-loader-text">Brewlog Note</span>
          </div>
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
