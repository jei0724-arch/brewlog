/* ============================================================
   BREWLOG NOTE — src/components/auth/AuthScreen.jsx
   인증 화면 (로그인 / 회원가입 / 비밀번호 찾기)
   ─ 닉네임+비밀번호 회원가입 (보안질문 포함)
   ─ Google 로그인 (signInWithPopup)
   ─ 닉네임 중복 확인
   ─ 비밀번호 찾기 4단계
   ─ 개인정보 처리방침 동의 (PrivacyModal 인라인)
   ============================================================ */
import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
  updatePassword,
} from "firebase/auth";
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc as firestoreDeleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db, googleProvider } from "../../config/firebase";
import { I18N, SECURITY_QUESTIONS, SECURITY_QUESTIONS_EN, PRIVACY_POLICY_KO, PRIVACY_POLICY_EN } from "../../constants/localization";

// ── PrivacyModal (인라인 서브 컴포넌트) ─────────────────────────
function PrivacyModal({ onClose, lang }) {
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth:"480px" }}>
        <h2 style={{ fontSize:"1.1rem", marginBottom:"1rem" }}>
          {lang === "en" ? "Privacy Policy" : "개인정보 처리방침"}
        </h2>
        <pre style={{ whiteSpace:"pre-wrap", fontSize:"0.82rem", color:"var(--muted)", lineHeight:1.8, fontFamily:"'DM Sans',sans-serif" }}>
          {lang === "en" ? PRIVACY_POLICY_EN : PRIVACY_POLICY_KO}
        </pre>
        <div className="modal-actions">
          <button className="btn-primary" style={{ marginTop:0, width:"auto", padding:"0.6rem 2rem" }} onClick={onClose}>
            {lang === "en" ? "Close" : "닫기"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Google 아이콘 SVG
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18">
    <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
    <path fill="#34A353" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.01c-.72.48-1.63.76-2.7.76-2.08 0-3.84-1.4-4.47-3.29H1.88v2.07A8 8 0 0 0 8.98 17z"/>
    <path fill="#FBBC05" d="M4.51 10.52A4.8 4.8 0 0 1 4.26 9c0-.53.09-1.04.25-1.52V5.41H1.88A8 8 0 0 0 .98 9c0 1.29.31 2.51.9 3.59l2.63-2.07z"/>
    <path fill="#EA4335" d="M8.98 3.58c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 8.98 1a8 8 0 0 0-7.1 4.41l2.63 2.07c.63-1.89 2.39-3.3 4.47-3.3z"/>
  </svg>
);

// ─────────────────────────────────────────────────────────────────
export default function AuthScreen({ lang, toggleLang, onGuest, defaultTab, darkMode, toggleDark }) {
  const [tab,     setTab]     = useState(defaultTab || "login");
  const [msg,     setMsg]     = useState(null);
  const [loading, setLoading] = useState(false);

  // 로그인
  const [loginNick, setLoginNick] = useState("");
  const [loginPw,   setLoginPw]   = useState("");

  // 회원가입
  const [regNick,        setRegNick]        = useState("");
  const [regPw,          setRegPw]          = useState("");
  const [regPwConfirm,   setRegPwConfirm]   = useState("");
  const [regQuestion,    setRegQuestion]    = useState(SECURITY_QUESTIONS[0]);
  const [regAnswer,      setRegAnswer]      = useState("");
  const [nickChecked,    setNickChecked]    = useState(false);
  const [nickCheckMsg,   setNickCheckMsg]   = useState(null);
  const [privacyAgreed,  setPrivacyAgreed]  = useState(false);
  const [privacyError,   setPrivacyError]   = useState(false);
  const [showPrivacy,    setShowPrivacy]    = useState(false);

  // 비밀번호 찾기
  const [findNick,          setFindNick]          = useState("");
  const [findQuestion,      setFindQuestion]      = useState("");
  const [findAnswer,        setFindAnswer]        = useState("");
  const [findStep,          setFindStep]          = useState(1);
  const [findUid,           setFindUid]           = useState("");
  const [findNewPw,         setFindNewPw]         = useState("");
  const [findNewPwConfirm,  setFindNewPwConfirm]  = useState("");
  const [findPwSaving,      setFindPwSaving]      = useState(false);

  const pwMatch    = regPwConfirm.length > 0 && regPw === regPwConfirm;
  const pwMismatch = regPwConfirm.length > 0 && regPw !== regPwConfirm;

  const switchTab = (t) => {
    setTab(t); setMsg(null); setLoading(false);
    setLoginNick(""); setLoginPw("");
    setRegNick(""); setRegPw(""); setRegPwConfirm(""); setRegAnswer("");
    setNickChecked(false); setNickCheckMsg(null);
    setFindNick(""); setFindAnswer(""); setFindStep(1); setFindUid("");
  };

  // 닉네임 중복 확인
  const checkNick = async () => {
    if (!regNick.trim()) return setNickCheckMsg({ type:"error", text:"닉네임을 입력해주세요." });
    const snap = await getDoc(doc(db, "nicknames", regNick.trim()));
    if (snap.exists()) {
      setNickChecked(false);
      setNickCheckMsg({ type:"error", text: lang==="en"?"Nickname already taken.":"이미 사용 중인 닉네임입니다." });
    } else {
      setNickChecked(true);
      setNickCheckMsg({ type:"ok", text: lang==="en"?"Nickname available ✓":"사용 가능한 닉네임입니다 ✓" });
    }
  };

  // 회원가입
  const handleRegister = async () => {
    setMsg(null);
    if (!regNick.trim())  return setMsg({ type:"error", text:"닉네임을 입력해주세요." });
    if (!nickChecked)     return setMsg({ type:"error", text:"닉네임 중복 확인을 먼저 해주세요." });
    if (!regPw.trim())    return setMsg({ type:"error", text:"비밀번호를 입력해주세요." });
    if (regPw !== regPwConfirm) return setMsg({ type:"error", text:"비밀번호가 일치하지 않습니다." });
    if (!regAnswer.trim()) return setMsg({ type:"error", text:"보안 질문 답변을 입력해주세요." });
    if (!privacyAgreed)  { setPrivacyError(true); return; }
    setPrivacyError(false);
    setLoading(true);
    try {
      const email = `${regNick.trim()}@brewlog.app`;
      const cred  = await createUserWithEmailAndPassword(auth, email, regPw);
      await updateProfile(cred.user, { displayName: regNick.trim() });
      await setDoc(doc(db, "nicknames", regNick.trim()), { uid: cred.user.uid });
      await setDoc(doc(db, "users", cred.user.uid), {
        nickname:         regNick.trim(),
        securityQuestion: regQuestion,
        securityAnswer:   regAnswer.trim().toLowerCase(),
        createdAt:        serverTimestamp(),
        lastLogin:        serverTimestamp(),
      });
    } catch (e) {
      const errMsg =
        e.code === "auth/email-already-in-use"    ? "이미 사용 중인 닉네임입니다."
        : e.code === "auth/weak-password"         ? "비밀번호는 6자 이상이어야 해요."
        : e.code === "auth/network-request-failed"? "네트워크 오류. 인터넷 연결을 확인해주세요."
        : "가입 오류: " + e.message;
      setMsg({ type:"error", text: errMsg });
    }
    setLoading(false);
  };

  // Google 로그인
  const handleGoogleLogin = async () => {
    setMsg(null); setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const u = result.user;
      const userSnap = await getDoc(doc(db, "users", u.uid));
      if (!userSnap.exists()) {
        const nickname = u.displayName || u.email?.split("@")[0] || "user";
        await setDoc(doc(db, "users", u.uid), {
          nickname, securityQuestion:"", securityAnswer:"",
          createdAt: serverTimestamp(), lastLogin: serverTimestamp(),
        });
        await setDoc(doc(db, "nicknames", nickname), { uid: u.uid });
        if (!u.displayName) await updateProfile(u, { displayName: nickname });
      } else {
        await updateDoc(doc(db, "users", u.uid), { lastLogin: serverTimestamp() });
      }
    } catch (e) {
      if (e.code !== "auth/popup-closed-by-user") {
        setMsg({ type:"error", text:"구글 로그인 오류: " + e.message });
      }
    }
    setLoading(false);
  };

  // 로그인
  const handleLogin = async () => {
    setMsg(null);
    if (!loginNick.trim() || !loginPw.trim()) {
      return setMsg({ type:"error", text: lang==="en"?"Please enter nickname and password.":"닉네임과 비밀번호를 입력해주세요." });
    }
    setLoading(true);
    try {
      const email = `${loginNick.trim()}@brewlog.app`;
      // 비밀번호 재설정 요청 확인
      const nickSnap = await getDoc(doc(db, "nicknames", loginNick.trim()));
      if (nickSnap.exists()) {
        const uid = nickSnap.data().uid;
        try {
          const resetSnap = await getDoc(doc(db, "pwReset", uid));
          if (resetSnap.exists() && resetSnap.data().verified) {
            const newPw = resetSnap.data().newPw;
            try {
              const cred = await signInWithEmailAndPassword(auth, email, newPw);
              await updatePassword(cred.user, newPw);
              await firestoreDeleteDoc(doc(db, "pwReset", uid));
              await updateDoc(doc(db, "users", uid), { lastLogin: serverTimestamp() });
              setLoading(false); return;
            } catch {}
          }
        } catch {}
      }
      const cred = await signInWithEmailAndPassword(auth, email, loginPw);
      await updateDoc(doc(db, "users", cred.user.uid), { lastLogin: serverTimestamp() });
    } catch {
      setMsg({ type:"error", text: lang==="en"?"Incorrect nickname or password.":"닉네임 또는 비밀번호가 맞지 않습니다." });
    }
    setLoading(false);
  };

  // 비밀번호 찾기 Step1: 닉네임으로 보안질문 조회
  const handleFindStep1 = async () => {
    setMsg(null);
    if (!findNick.trim()) return setMsg({ type:"error", text: lang==="en"?"Please enter your nickname.":"닉네임을 입력해주세요." });
    setLoading(true);
    try {
      const nickSnap = await getDoc(doc(db, "nicknames", findNick.trim()));
      if (!nickSnap.exists()) {
        setMsg({ type:"error", text: lang==="en"?"Nickname not found.":"존재하지 않는 닉네임입니다." });
        setLoading(false); return;
      }
      const uid = nickSnap.data().uid;
      let securityQuestion = "";
      try {
        const userSnap = await getDoc(doc(db, "users", uid));
        if (userSnap.exists()) securityQuestion = userSnap.data().securityQuestion || "";
      } catch (e) { console.error("users 읽기 실패:", e); }
      if (!securityQuestion) {
        setMsg({ type:"error", text: lang==="en"?"No security question set.":"보안 질문이 설정되지 않은 계정입니다." });
        setLoading(false); return;
      }
      setFindQuestion(securityQuestion); setFindUid(uid);
      setFindStep(2); setMsg(null);
    } catch (e) {
      setMsg({ type:"error", text: lang==="en"?"Error: "+e.message:"오류: "+e.message });
    }
    setLoading(false);
  };

  // 비밀번호 찾기 Step2: 보안질문 답변 확인
  const handleFindStep2 = async () => {
    setMsg(null);
    if (!findAnswer.trim()) return setMsg({ type:"error", text: lang==="en"?"Please enter your answer.":"답변을 입력해주세요." });
    setLoading(true);
    try {
      const userSnap = await getDoc(doc(db, "users", findUid));
      if (findAnswer.trim().toLowerCase() !== userSnap.data().securityAnswer) {
        setMsg({ type:"error", text: lang==="en"?"Incorrect answer.":"답변이 올바르지 않습니다." });
        setLoading(false); return;
      }
      setFindStep(3); setMsg(null);
    } catch (e) {
      setMsg({ type:"error", text:"오류: "+e.message });
    }
    setLoading(false);
  };

  // 비밀번호 찾기 Step3: 새 비밀번호 저장
  const handleResetPassword = async () => {
    if (!findNewPw) return setMsg({ type:"error", text: lang==="en"?"Please enter a new password.":"새 비밀번호를 입력해주세요." });
    if (findNewPw.length < 6) return setMsg({ type:"error", text: lang==="en"?"Min 6 characters.":"비밀번호는 6자 이상이어야 해요." });
    if (findNewPw !== findNewPwConfirm) return setMsg({ type:"error", text: lang==="en"?"Passwords do not match.":"비밀번호가 일치하지 않습니다." });
    setFindPwSaving(true); setMsg(null);
    try {
      await setDoc(doc(db, "pwReset", findUid), {
        newPw: findNewPw, nick: findNick.trim(), verified: true, createdAt: serverTimestamp(),
      });
      setMsg({ type:"ok", text: lang==="en"?"✅ Password saved! Please login with your new password.":"✅ 비밀번호 변경이 저장됐어요. 새 비밀번호로 로그인해주세요." });
      setFindStep(4);
    } catch (e) {
      setMsg({ type:"error", text: lang==="en"?"Error: "+e.message:"오류: "+e.message });
    }
    setFindPwSaving(false);
  };

  // 비밀번호 찾기 Step4: 새 비밀번호로 자동 로그인
  const handleAutoLogin = async () => {
    setLoading(true);
    try {
      const email    = `${findNick.trim()}@brewlog.app`;
      const nickSnap = await getDoc(doc(db, "nicknames", findNick.trim()));
      if (nickSnap.exists()) {
        const uid       = nickSnap.data().uid;
        const resetSnap = await getDoc(doc(db, "pwReset", uid));
        if (resetSnap.exists()) {
          const newPw = resetSnap.data().newPw;
          await signInWithEmailAndPassword(auth, email, newPw);
          await firestoreDeleteDoc(doc(db, "pwReset", uid));
          return;
        }
      }
    } catch {
      setMsg({ type:"error", text: lang==="en"?"Login failed. Try manually.":"로그인 실패. 직접 로그인해주세요." });
    }
    setLoading(false);
    switchTab("login");
  };

  const t = I18N[lang];

  const googleBtnStyle = {
    width:"100%", padding:"0.82rem", background:"var(--foam)",
    color:"var(--espresso)", border:"1px solid var(--steam)",
    borderRadius:"8px", fontFamily:"'DM Sans',sans-serif",
    fontSize:"0.88rem", fontWeight:500, cursor:"pointer",
    display:"flex", alignItems:"center", justifyContent:"center",
    gap:"0.7rem", letterSpacing:"0.02em", transition:"border-color 0.2s",
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        {/* 언어 토글 */}
        <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:"0.5rem" }}>
          <button onClick={toggleLang} style={{ background:"none", border:"1px solid var(--steam)", borderRadius:"8px", padding:"0.25rem 0.75rem", fontSize:"0.72rem", color:"var(--muted)", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", letterSpacing:"0.05em", transition:"border-color 0.2s, color 0.2s" }}>
            {lang === "ko" ? "EN" : "KO"}
          </button>
        </div>

        {/* 브랜드 */}
        <div className="brand">
          <span className="brand-icon">
            <svg width="36" height="36" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="18" stroke="var(--espresso)" strokeWidth="1.8"/>
              <path d="M10 21c2.5-5 7-7.5 10-5s7 7.5 10 2.5" stroke="var(--latte)" strokeWidth="2" strokeLinecap="round"/>
              <path d="M14 28c.5-1 1.5-1.5 2.5-1s2 1 3 .5 2-1.5 2.5-1" stroke="var(--espresso)" strokeWidth="1.3" strokeLinecap="round" opacity="0.35"/>
            </svg>
          </span>
          <h1>Brewlog note</h1>
          <p>{t.appSub}</p>
        </div>

        {/* 탭 */}
        <div className="tab-row">
          <button className={`tab-btn ${tab==="login"?"active":""}`}    onClick={() => switchTab("login")}>{t.login}</button>
          <button className={`tab-btn ${tab==="register"?"active":""}`} onClick={() => switchTab("register")}>{t.register}</button>
          <button className={`tab-btn ${tab==="find"?"active":""}`}     onClick={() => switchTab("find")}>{t.findPw}</button>
        </div>

        {/* ── 로그인 탭 ── */}
        {tab === "login" && (
          <>
            <div className="field">
              <label>{t.nickname}</label>
              <input value={loginNick} onChange={e => setLoginNick(e.target.value)} placeholder={t.nickname} onKeyDown={e => e.key==="Enter" && handleLogin()}/>
            </div>
            <div className="field">
              <label>{t.password}</label>
              <input type="password" value={loginPw} onChange={e => setLoginPw(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key==="Enter" && handleLogin()}/>
            </div>
            <button className="btn-primary" onClick={handleLogin} disabled={loading}>
              {loading ? (lang==="en"?"Logging in…":"로그인 중…") : t.loginBtn}
            </button>
            <button onClick={handleGoogleLogin} disabled={loading} style={{ ...googleBtnStyle, marginTop:"0.5rem" }}>
              <GoogleIcon/> {t.googleLogin}
            </button>
          </>
        )}

        {/* ── 회원가입 탭 ── */}
        {tab === "register" && (
          <>
            <button onClick={handleGoogleLogin} disabled={loading} style={{ ...googleBtnStyle, marginTop:"0.3rem" }}>
              <GoogleIcon/> {t.googleRegister}
            </button>
            <div className="divider-or">{t.orNickname}</div>

            {/* 닉네임 + 중복확인 */}
            <div className="field">
              <label>{t.nickname}</label>
              <div style={{ display:"flex", gap:"0.5rem" }}>
                <input value={regNick} onChange={e => { setRegNick(e.target.value); setNickChecked(false); setNickCheckMsg(null); }}
                  placeholder={lang==="en"?"Your nickname":"나만의 닉네임"} style={{ flex:1 }}/>
                <button onClick={checkNick}
                  style={{ padding:"0 1rem", background: nickChecked?"#27ae60":"var(--roast)", color:"white", border:"none", borderRadius:"8px", fontFamily:"'DM Sans',sans-serif", fontSize:"0.8rem", cursor:"pointer", whiteSpace:"nowrap", flexShrink:0, transition:"background 0.2s" }}>
                  {nickChecked ? t.confirmed : t.dupCheck}
                </button>
              </div>
              {nickCheckMsg && <p className={nickCheckMsg.type==="error"?"msg-error":"msg-ok"} style={{ marginTop:"0.4rem" }}>{nickCheckMsg.text}</p>}
            </div>
            <div className="field">
              <label>{t.password}</label>
              <input type="password" value={regPw} onChange={e => setRegPw(e.target.value)} placeholder="••••••••"/>
            </div>
            <div className="field">
              <label>{t.pwConfirm}</label>
              <input type="password" value={regPwConfirm} onChange={e => setRegPwConfirm(e.target.value)} placeholder="••••••••"
                style={{ borderColor: pwMatch?"#27ae60":pwMismatch?"#c0392b":undefined }}/>
              {pwMatch    && <p className="msg-ok"    style={{ marginTop:"0.4rem" }}>{t.pwMatch}</p>}
              {pwMismatch && <p className="msg-error" style={{ marginTop:"0.4rem" }}>{t.pwMismatch}</p>}
            </div>
            <div className="field">
              <label>{t.secQuestion}</label>
              <select value={regQuestion} onChange={e => setRegQuestion(e.target.value)}>
                {(lang==="en" ? SECURITY_QUESTIONS_EN : SECURITY_QUESTIONS).map((q, i) => (
                  <option key={i} value={SECURITY_QUESTIONS[i]}>{q}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>{t.secAnswer}</label>
              <input value={regAnswer} onChange={e => setRegAnswer(e.target.value)}
                placeholder={lang==="en"?"Your answer":"답변 입력"} onKeyDown={e => e.key==="Enter" && handleRegister()}/>
            </div>

            {/* 개인정보 동의 */}
            <div style={{ margin:"0.8rem 0", padding:"0.8rem 1rem", background:"var(--cream)", borderRadius:"8px", border: privacyError?"1px solid #c0392b":"1px solid var(--steam)", fontSize:"0.82rem", color:"var(--muted)", lineHeight:1.8 }}>
              <label style={{ display:"flex", gap:"0.6rem", alignItems:"flex-start", cursor:"pointer" }}>
                <input type="checkbox" style={{ marginTop:"0.25rem", flexShrink:0, width:"16px", height:"16px", accentColor:"var(--espresso)" }}
                  onChange={e => { setPrivacyAgreed(e.target.checked); setPrivacyError(false); }} checked={privacyAgreed}/>
                <span>
                  {lang === "en"
                    ? <span>I agree to the <button type="button" onClick={() => setShowPrivacy(true)} style={{ background:"none", border:"none", color:"var(--latte)", cursor:"pointer", fontSize:"0.82rem", textDecoration:"underline", textUnderlineOffset:"2px", padding:0, fontFamily:"'DM Sans',sans-serif" }}>Privacy Policy</button> (required)</span>
                    : <span><button type="button" onClick={() => setShowPrivacy(true)} style={{ background:"none", border:"none", color:"var(--latte)", cursor:"pointer", fontSize:"0.82rem", textDecoration:"underline", textUnderlineOffset:"2px", padding:0, fontFamily:"'DM Sans',sans-serif" }}>개인정보 처리방침</button>에 동의합니다 (필수)</span>
                  }
                </span>
              </label>
              {privacyError && <p style={{ color:"#c0392b", marginTop:"0.4rem", fontSize:"0.78rem" }}>{lang==="en"?"Please agree to continue.":"개인정보 처리방침에 동의해주세요."}</p>}
            </div>
            {showPrivacy && <PrivacyModal lang={lang} onClose={() => setShowPrivacy(false)}/>}

            <button className="btn-primary" onClick={handleRegister} disabled={loading}>
              {loading ? (lang==="en"?"Signing up…":"가입 중…") : t.registerBtn}
            </button>
          </>
        )}

        {/* ── 비밀번호 찾기 탭 ── */}
        {tab === "find" && (
          <>
            {/* Step 1: 닉네임 입력 */}
            {findStep === 1 && (
              <>
                <div className="field">
                  <label>{t.nickname}</label>
                  <input value={findNick} onChange={e => setFindNick(e.target.value)}
                    placeholder={lang==="en"?"Your nickname":"가입한 닉네임"}
                    onKeyDown={e => e.key==="Enter" && handleFindStep1()}/>
                </div>
                <button className="btn-primary" onClick={handleFindStep1} disabled={loading}>
                  {loading ? "…" : t.findStep1}
                </button>
              </>
            )}

            {/* Step 2: 보안질문 답변 */}
            {findStep === 2 && (
              <>
                <div style={{ background:"var(--cream)", padding:"0.8rem 1rem", borderRadius:"8px", marginBottom:"1.2rem", fontSize:"0.88rem", color:"var(--roast)", fontWeight:500, borderLeft:"3px solid var(--latte)" }}>
                  Q. {findQuestion}
                </div>
                <div className="field">
                  <label>{lang==="en"?"Answer":"답변"}</label>
                  <input value={findAnswer} onChange={e => setFindAnswer(e.target.value)}
                    placeholder={lang==="en"?"Your answer":"답변 입력"}
                    onKeyDown={e => e.key==="Enter" && handleFindStep2()}/>
                </div>
                <button className="btn-primary" onClick={handleFindStep2} disabled={loading}>
                  {loading ? "…" : t.findStep2}
                </button>
              </>
            )}

            {/* Step 3: 새 비밀번호 설정 */}
            {findStep === 3 && (
              <>
                <div style={{ textAlign:"center", marginBottom:"1.2rem" }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"10px" }}>
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                      <circle cx="20" cy="20" r="18" stroke="#27ae60" strokeWidth="1.6"/>
                      <path d="M12 20l6 6 10-12" stroke="#27ae60" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <p style={{ fontSize:"0.88rem", color:"var(--muted)" }}>
                    {lang==="en"?"Identity verified. Set a new password.":"본인 확인 완료. 새 비밀번호를 설정해주세요."}
                  </p>
                </div>
                <div className="field">
                  <label>{lang==="en"?"New Password":"새 비밀번호"}</label>
                  <input type="password" value={findNewPw} onChange={e => setFindNewPw(e.target.value)} placeholder="••••••••"/>
                </div>
                <div className="field">
                  <label>{lang==="en"?"Confirm New Password":"새 비밀번호 확인"}</label>
                  <input type="password" value={findNewPwConfirm} onChange={e => setFindNewPwConfirm(e.target.value)}
                    placeholder="••••••••"
                    style={{ borderColor: findNewPwConfirm.length>0 ? (findNewPw===findNewPwConfirm?"#27ae60":"#c0392b") : undefined }}/>
                  {findNewPwConfirm.length>0 && findNewPw===findNewPwConfirm && <p className="msg-ok" style={{ marginTop:"0.3rem" }}>{lang==="en"?"Passwords match ✓":"일치합니다 ✓"}</p>}
                  {findNewPwConfirm.length>0 && findNewPw!==findNewPwConfirm && <p className="msg-error" style={{ marginTop:"0.3rem" }}>{lang==="en"?"Do not match.":"일치하지 않습니다."}</p>}
                </div>
                <button className="btn-primary" onClick={handleResetPassword} disabled={findPwSaving}>
                  {findPwSaving ? "…" : (lang==="en"?"Change Password":"비밀번호 변경")}
                </button>
              </>
            )}

            {/* Step 4: 완료 → 자동 로그인 */}
            {findStep === 4 && (
              <div style={{ textAlign:"center", padding:"1rem 0" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"12px" }}>
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                    <circle cx="20" cy="20" r="18" stroke="var(--latte)" strokeWidth="1.6"/>
                    <circle cx="16" cy="18" r="5" stroke="var(--latte)" strokeWidth="1.6"/>
                    <path d="M20 21l8 8M25 26l2 2" stroke="var(--latte)" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                </div>
                <p style={{ fontSize:"0.88rem", color:"var(--muted)", marginBottom:"1.2rem", lineHeight:1.6 }}>
                  {lang==="en"?"New password saved.":"새 비밀번호가 저장됐어요."}
                </p>
                <button className="btn-primary" onClick={handleAutoLogin} disabled={loading}>
                  {lang==="en"?"Login Now":"지금 로그인하기"}
                </button>
              </div>
            )}
          </>
        )}

        {msg && <p className={msg.type==="error"?"msg-error":"msg-ok"}>{msg.text}</p>}

        {onGuest && (
          <button onClick={onGuest}
            style={{ width:"100%", marginTop:"1.2rem", padding:"0.75rem", background:"none", border:"none", color:"var(--muted)", fontFamily:"'DM Sans',sans-serif", fontSize:"0.85rem", cursor:"pointer", textDecoration:"underline", textUnderlineOffset:"3px" }}>
            {lang==="en"?"Browse without signing in →":"로그인 없이 구경하기 →"}
          </button>
        )}
      </div>
    </div>
  );
}
