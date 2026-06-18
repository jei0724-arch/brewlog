/* ============================================================
   BREWLOG NOTE — src/hooks/useAuth.js
   Firebase Auth 전체 비즈니스 로직 커스텀 훅
   ─ onAuthStateChanged 세션 유지
   ─ 닉네임/비밀번호 회원가입
   ─ Google 로그인 (signInWithPopup)
   ─ 닉네임 로그인, 로그아웃
   ─ 비밀번호 찾기 (보안질문 3단계)
   ─ 비밀번호 변경 (reauthenticate → updatePassword)
   ─ 언어 감지 (IP → localStorage)
   ─ 다크모드 토글
   ============================================================ */
import { useState, useEffect } from "react";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  signInWithPopup,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  deleteDoc as _deleteDoc,   // pwReset 삭제용 — 아래 db 래퍼와 혼동 방지
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  collection,
  query,
  where,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db, googleProvider } from "../config/firebase";
import { loadBrandsFromDB } from "../utils/storage";   // 브랜드 캐시 초기 로드

// ── 내부 헬퍼 ─────────────────────────────────────────────────────
const makeEmail = (nick) => `${nick.trim()}@brewlog.app`;

// ─────────────────────────────────────────────────────────────────
export function useAuth() {
  // ── 세션 상태 ───────────────────────────────────────────────────
  // undefined: 아직 확인 중 / null: 비로그인 / User: 로그인됨
  const [user, setUser] = useState(undefined);
  const [lang, setLang] = useState(
    () => localStorage.getItem("brewlog_lang") || "ko"
  );
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("brewlog_theme") === "dark"
  );
  const [guestMode, setGuestMode] = useState(false);
  const [authDefaultTab, setAuthDefaultTab] = useState("login");

  // ── 다크모드 ────────────────────────────────────────────────────
  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem("brewlog_theme", next ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
  };

  // ── 언어 토글 ───────────────────────────────────────────────────
  const toggleLang = () => {
    const next = lang === "ko" ? "en" : "ko";
    setLang(next);
    localStorage.setItem("brewlog_lang", next);
  };

  // ── 비회원이 기록하기 클릭 시 회원가입 탭으로 이동 ──────────────
  const requireAuth = () => {
    setGuestMode(false);
    setAuthDefaultTab("register");
  };

  // ── 초기화: 테마, 언어, 브랜드, onAuthStateChanged ───────────────
  useEffect(() => {
    // 1) 저장된 테마 적용
    const savedTheme = localStorage.getItem("brewlog_theme");
    if (savedTheme) {
      document.documentElement.setAttribute("data-theme", savedTheme);
    }

    // 2) 브랜드 데이터 Firestore에서 로드 (전역 캐시 갱신)
    loadBrandsFromDB();

    // 3) 최초 방문 시 IP 기반 언어 감지
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

    // 4) Firebase Auth 세션 구독
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u ?? null);

      // 자동 로그인 시 최종 접속일 하루 1회 업데이트
      if (u) {
        try {
          const userDoc = await getDoc(doc(db, "users", u.uid));
          if (userDoc.exists()) {
            const last = userDoc.data().lastLogin?.toDate?.();
            const today = new Date().toDateString();
            if (!last || last.toDateString() !== today) {
              await updateDoc(doc(db, "users", u.uid), {
                lastLogin: serverTimestamp(),
              });
            }
          }
        } catch {
          // 권한 오류 등은 무시
        }
      }
    });

    return unsub;
  }, []);

  // ── 닉네임 중복 확인 ────────────────────────────────────────────
  const checkNickname = async (nick) => {
    if (!nick.trim()) return { ok: false, msg: "닉네임을 입력해주세요." };
    const snap = await getDoc(doc(db, "nicknames", nick.trim()));
    if (snap.exists()) {
      return { ok: false, msg: lang === "en" ? "Nickname already taken." : "이미 사용 중인 닉네임입니다." };
    }
    return { ok: true, msg: lang === "en" ? "Nickname available ✓" : "사용 가능한 닉네임입니다 ✓" };
  };

  // ── 닉네임/비밀번호 회원가입 ────────────────────────────────────
  const register = async ({ nick, pw, pwConfirm, secQuestion, secAnswer, privacyAgreed }) => {
    if (!nick.trim())        return { error: "닉네임을 입력해주세요." };
    if (!pw.trim())          return { error: "비밀번호를 입력해주세요." };
    if (pw !== pwConfirm)    return { error: "비밀번호가 일치하지 않습니다." };
    if (!secAnswer.trim())   return { error: "보안 질문 답변을 입력해주세요." };
    if (!privacyAgreed)      return { error: "PRIVACY" }; // 호출 측에서 privacyError 표시

    try {
      const email = makeEmail(nick);
      const cred  = await createUserWithEmailAndPassword(auth, email, pw);
      await updateProfile(cred.user, { displayName: nick.trim() });
      await setDoc(doc(db, "nicknames", nick.trim()), { uid: cred.user.uid });
      await setDoc(doc(db, "users", cred.user.uid), {
        nickname:         nick.trim(),
        securityQuestion: secQuestion,
        securityAnswer:   secAnswer.trim().toLowerCase(),
        createdAt:        serverTimestamp(),
        lastLogin:        serverTimestamp(),
      });
      return { ok: true };
    } catch (e) {
      const msg =
        e.code === "auth/email-already-in-use"   ? "이미 사용 중인 닉네임입니다."
        : e.code === "auth/weak-password"         ? "비밀번호는 6자 이상이어야 해요."
        : e.code === "auth/network-request-failed"? "네트워크 오류. 인터넷 연결을 확인해주세요."
        : "가입 오류: " + e.message;
      return { error: msg };
    }
  };

  // ── 닉네임/비밀번호 로그인 ──────────────────────────────────────
  const login = async ({ nick, pw }) => {
    if (!nick.trim() || !pw.trim()) {
      return { error: lang === "en" ? "Please enter nickname and password." : "닉네임과 비밀번호를 입력해주세요." };
    }
    try {
      const email = makeEmail(nick);

      // 비밀번호 재설정 요청 확인 (보안질문 기반 변경 플로우)
      const nickSnap = await getDoc(doc(db, "nicknames", nick.trim()));
      if (nickSnap.exists()) {
        const uid = nickSnap.data().uid;
        try {
          const resetSnap = await getDoc(doc(db, "pwReset", uid));
          if (resetSnap.exists() && resetSnap.data().verified) {
            const newPw = resetSnap.data().newPw;
            try {
              const cred = await signInWithEmailAndPassword(auth, email, newPw);
              await updatePassword(cred.user, newPw);
              await deleteDoc(doc(db, "pwReset", uid));
              await updateDoc(doc(db, "users", uid), { lastLogin: serverTimestamp() });
              return { ok: true };
            } catch {
              // 새 비밀번호 로그인 실패 시 기존 비밀번호로 시도
            }
          }
        } catch {
          // pwReset 컬렉션 읽기 실패 시 무시
        }
      }

      // 일반 로그인
      const cred = await signInWithEmailAndPassword(auth, email, pw);
      await updateDoc(doc(db, "users", cred.user.uid), { lastLogin: serverTimestamp() });
      return { ok: true };
    } catch {
      return { error: lang === "en" ? "Incorrect nickname or password." : "닉네임 또는 비밀번호가 맞지 않습니다." };
    }
  };

  // ── Google 로그인/회원가입 ───────────────────────────────────────
  const loginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const u = result.user;
      const userSnap = await getDoc(doc(db, "users", u.uid));
      if (!userSnap.exists()) {
        // 최초 가입
        const nickname = u.displayName || u.email?.split("@")[0] || "user";
        await setDoc(doc(db, "users", u.uid), {
          nickname,
          securityQuestion: "",
          securityAnswer:   "",
          createdAt:        serverTimestamp(),
          lastLogin:        serverTimestamp(),
        });
        await setDoc(doc(db, "nicknames", nickname), { uid: u.uid });
        if (!u.displayName) await updateProfile(u, { displayName: nickname });
      } else {
        await updateDoc(doc(db, "users", u.uid), { lastLogin: serverTimestamp() });
      }
      return { ok: true };
    } catch (e) {
      if (e.code === "auth/popup-closed-by-user") return { ok: false }; // 취소
      return { error: "구글 로그인 오류: " + e.message };
    }
  };

  // ── 로그아웃 ────────────────────────────────────────────────────
  const logout = () => signOut(auth).catch(() => {});

  // ── 비밀번호 찾기 Step 1: 닉네임으로 보안질문 조회 ───────────────
  const findStep1 = async (nick) => {
    if (!nick.trim()) {
      return { error: lang === "en" ? "Please enter your nickname." : "닉네임을 입력해주세요." };
    }
    try {
      const nickSnap = await getDoc(doc(db, "nicknames", nick.trim()));
      if (!nickSnap.exists()) {
        return { error: lang === "en" ? "Nickname not found." : "존재하지 않는 닉네임입니다." };
      }
      const uid = nickSnap.data().uid;
      let securityQuestion = "";
      try {
        const userSnap = await getDoc(doc(db, "users", uid));
        if (userSnap.exists()) securityQuestion = userSnap.data().securityQuestion || "";
      } catch (e) {
        console.error("users 읽기 실패:", e);
      }
      if (!securityQuestion) {
        return { error: lang === "en" ? "No security question set for this account." : "보안 질문이 설정되지 않은 계정입니다." };
      }
      return { ok: true, uid, securityQuestion };
    } catch (e) {
      return { error: lang === "en" ? "Error: " + e.message : "오류: " + e.message };
    }
  };

  // ── 비밀번호 찾기 Step 2: 보안질문 답변 확인 ────────────────────
  const findStep2 = async (uid, answer) => {
    if (!answer.trim()) {
      return { error: lang === "en" ? "Please enter your answer." : "답변을 입력해주세요." };
    }
    try {
      const userSnap = await getDoc(doc(db, "users", uid));
      if (answer.trim().toLowerCase() !== userSnap.data().securityAnswer) {
        return { error: lang === "en" ? "Incorrect answer." : "답변이 올바르지 않습니다." };
      }
      return { ok: true };
    } catch (e) {
      return { error: "오류: " + e.message };
    }
  };

  // ── 비밀번호 찾기 Step 3: 새 비밀번호 저장 (Firestore 경유) ─────
  const findStep3 = async (uid, nick, newPw, newPwConfirm) => {
    if (!newPw) {
      return { error: lang === "en" ? "Please enter a new password." : "새 비밀번호를 입력해주세요." };
    }
    if (newPw.length < 6) {
      return { error: lang === "en" ? "Password must be at least 6 characters." : "비밀번호는 6자 이상이어야 해요." };
    }
    if (newPw !== newPwConfirm) {
      return { error: lang === "en" ? "Passwords do not match." : "비밀번호가 일치하지 않습니다." };
    }
    try {
      await setDoc(doc(db, "pwReset", uid), {
        newPw, nick: nick.trim(), verified: true, createdAt: serverTimestamp(),
      });
      return { ok: true };
    } catch (e) {
      return { error: lang === "en" ? "Error: " + e.message : "오류: " + e.message };
    }
  };

  // ── 비밀번호 찾기 Step 4: 새 비밀번호로 자동 로그인 ────────────
  const findLoginWithNewPw = async (nick) => {
    try {
      const email    = makeEmail(nick);
      const nickSnap = await getDoc(doc(db, "nicknames", nick.trim()));
      if (!nickSnap.exists()) return { error: "닉네임을 찾을 수 없어요." };
      const uid       = nickSnap.data().uid;
      const resetSnap = await getDoc(doc(db, "pwReset", uid));
      if (!resetSnap.exists()) return { error: "재설정 정보를 찾을 수 없어요." };
      const newPw = resetSnap.data().newPw;
      await signInWithEmailAndPassword(auth, email, newPw);
      await deleteDoc(doc(db, "pwReset", uid));
      return { ok: true };
    } catch {
      return { error: lang === "en" ? "Login failed. Try logging in manually." : "로그인 실패. 직접 로그인해주세요." };
    }
  };

  // ── 로그인된 상태에서 비밀번호 변경 (MY > 비밀번호 변경) ─────────
  const changePassword = async ({ currentPw, newPw, newPwConfirm }) => {
    if (!currentPw) return { error: lang === "en" ? "Enter current password." : "현재 비밀번호를 입력해주세요." };
    if (!newPw || newPw.length < 6) {
      return { error: lang === "en" ? "New password must be at least 6 characters." : "새 비밀번호는 6자 이상이어야 해요." };
    }
    if (newPw !== newPwConfirm) {
      return { error: lang === "en" ? "Passwords do not match." : "비밀번호가 일치하지 않습니다." };
    }
    try {
      const email      = user.email;
      const credential = EmailAuthProvider.credential(email, currentPw);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPw);
      return { ok: true };
    } catch (e) {
      const msg =
        e.code === "auth/wrong-password" || e.code === "auth/invalid-credential"
          ? (lang === "en" ? "Current password is incorrect." : "현재 비밀번호가 틀렸어요.")
          : (lang === "en" ? "Error: " + e.message : "오류: " + e.message);
      return { error: msg };
    }
  };

  return {
    // 상태
    user,
    lang,
    darkMode,
    guestMode,
    authDefaultTab,
    // 세터
    setGuestMode,
    setAuthDefaultTab,
    // 액션
    toggleLang,
    toggleDark,
    requireAuth,
    // 인증 액션
    checkNickname,
    register,
    login,
    loginWithGoogle,
    logout,
    // 비밀번호 찾기 단계
    findStep1,
    findStep2,
    findStep3,
    findLoginWithNewPw,
    // 비밀번호 변경 (로그인 상태)
    changePassword,
  };
}
