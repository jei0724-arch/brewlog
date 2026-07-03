/* ============================================================
   BREWLOG NOTE — src/components/onboarding/OnboardingTutorial.jsx
   신규 가입자용 온보딩 튜토리얼
   ─ 환영 → 장비 설정 → 원두 설정 → 레시피 기록하기 4단계
   ─ Firestore users/{uid}.tutorialSeen=true 로 1회만 자동 노출
   ─ MyModal에서 "튜토리얼 다시보기"로 언제든 재실행 가능(재사용 컴포넌트)
   ============================================================ */
import { useState } from "react";

const STEPS = [
  {
    key: "welcome",
    icon: (
      <svg width="52" height="52" viewBox="0 0 56 56" fill="none">
        <path d="M12 20h32l-4 22H16L12 20z" stroke="var(--latte)" strokeWidth="1.8" strokeLinejoin="round" fill="none"/>
        <path d="M44 26h4a4 4 0 0 1 0 8h-4" stroke="var(--latte)" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
        <path d="M22 16c0 0 2-3 0-6M28 14c0 0 2-3 0-6M34 16c0 0 2-3 0-6" stroke="var(--latte)" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
      </svg>
    ),
    title: { ko: "브루로그에 오신 걸 환영해요 ☕", en: "Welcome to Brewlog Note ☕" },
    desc: {
      ko: "나만의 커피 레시피를 기록하고, 다른 브루어들과 나눠보세요. 시작 전에 딱 3단계만 알려드릴게요 — 1분이면 충분해요.",
      en: "Record your own coffee recipes and share them with other brewers. Just 3 quick steps before you start — takes about a minute.",
    },
  },
  {
    key: "equipment",
    icon: (
      <svg width="52" height="52" viewBox="0 0 56 56" fill="none">
        <rect x="10" y="18" width="30" height="24" rx="3" stroke="var(--latte)" strokeWidth="1.8"/>
        <path d="M17 18v-4a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v4" stroke="var(--latte)" strokeWidth="1.8" strokeLinecap="round"/>
        <circle cx="25" cy="30" r="5" stroke="var(--latte)" strokeWidth="1.6"/>
        <path d="M40 24h4a3 3 0 0 1 0 6h-4" stroke="var(--latte)" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
    title: { ko: "1. 내 장비를 등록해요", en: "1. Register Your Equipment" },
    desc: {
      ko: "상단의 \"내 장비\" 탭에서 사용 중인 머신·그라인더(또는 핸드드립 기구)를 등록해두면, 레시피 기록할 때마다 매번 입력할 필요 없이 자동으로 불러올 수 있어요.",
      en: "Register your machine, grinder, or hand-drip gear under the \"My Equipment\" tab. Once saved, it auto-fills every time you log a new recipe.",
    },
  },
  {
    key: "bean",
    icon: (
      <svg width="52" height="52" viewBox="0 0 56 56" fill="none">
        <ellipse cx="28" cy="28" rx="16" ry="22" fill="none" stroke="var(--latte)" strokeWidth="1.8" transform="rotate(-20 28 28)"/>
        <path d="M28 10 Q32 18 28 28 Q24 38 28 46" stroke="var(--latte)" strokeWidth="1.6" strokeLinecap="round" fill="none" transform="rotate(-20 28 28)"/>
      </svg>
    ),
    title: { ko: "2. 원두를 등록해요", en: "2. Register Your Beans" },
    desc: {
      ko: "\"내 원두\" 탭에서 지금 쓰고 있는 원두를 등록하세요. 로스팅 날짜·산지 등을 기록해두면 남은 양 관리와 레시피 연결이 훨씬 편해져요.",
      en: "Add your current beans under the \"My Beans\" tab. Tracking roast date and origin makes stock management and recipe linking much easier.",
    },
  },
  {
    key: "recipe",
    icon: (
      <svg width="52" height="52" viewBox="0 0 56 56" fill="none">
        <path d="M16 12h24l-3 30H19L16 12z" stroke="var(--latte)" strokeWidth="1.8" strokeLinejoin="round" fill="none"/>
        <path d="M20 12V9a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v3" stroke="var(--latte)" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M21 40h14" stroke="var(--latte)" strokeWidth="1.8" strokeLinecap="round"/>
        <circle cx="40" cy="10" r="7" fill="var(--espresso)"/>
        <path d="M37 10l2 2 4-4" stroke="var(--cream)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: { ko: "3. 첫 레시피를 기록해요", en: "3. Log Your First Recipe" },
    desc: {
      ko: "\"기록하기\" 버튼을 누르고 메뉴·원두량·추출시간·추출량을 입력하면 끝! 등록해둔 장비·원두는 자동으로 불러와지고, 타이머로 시간도 쉽게 잴 수 있어요.",
      en: "Tap \"Record\", fill in menu, dose, time, and yield — that's it! Your saved equipment and beans auto-fill, and the built-in timer makes timing easy.",
    },
  },
];

export default function OnboardingTutorial({ lang = "ko", onFinish }) {
  const [step, setStep] = useState(0);
  const isKo = lang === "ko";
  const last = step === STEPS.length - 1;
  const s = STEPS[step];

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onFinish()}>
      <div className="modal" style={{ maxWidth: "420px", textAlign: "center" }}>
        {/* 건너뛰기 */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.2rem" }}>
          <button onClick={onFinish}
            style={{ background: "none", border: "none", color: "var(--muted)", fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", cursor: "pointer", padding: "4px 6px" }}>
            {isKo ? "건너뛰기" : "Skip"}
          </button>
        </div>

        {/* 아이콘 */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
          {s.icon}
        </div>

        {/* 제목/설명 */}
        <h2 style={{ marginBottom: "10px", fontSize: "1.25rem" }}>{s.title[lang] || s.title.ko}</h2>
        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.88rem", color: "var(--muted)", lineHeight: 1.7, marginBottom: "24px", padding: "0 4px" }}>
          {s.desc[lang] || s.desc.ko}
        </p>

        {/* 진행 점 */}
        <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginBottom: "22px" }}>
          {STEPS.map((_, i) => (
            <span key={i} style={{
              width: i === step ? "18px" : "6px", height: "6px", borderRadius: "3px",
              background: i === step ? "var(--espresso)" : "var(--steam)",
              transition: "all 0.25s",
            }}/>
          ))}
        </div>

        {/* 버튼 */}
        <div style={{ display: "flex", gap: "8px" }}>
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)}
              style={{ flex: 1, padding: "0.75rem", border: "1px solid var(--steam)", borderRadius: "var(--r-btn)", background: "none", color: "var(--muted)", fontFamily: "'DM Sans',sans-serif", fontSize: "0.9rem", cursor: "pointer" }}>
              {isKo ? "이전" : "Back"}
            </button>
          )}
          <button onClick={() => (last ? onFinish() : setStep(s => s + 1))}
            style={{ flex: 2, padding: "0.75rem", border: "none", borderRadius: "var(--r-btn)", background: "var(--espresso)", color: "var(--cream)", fontFamily: "'DM Sans',sans-serif", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer" }}>
            {last ? (isKo ? "시작하기 →" : "Get Started →") : (isKo ? "다음" : "Next")}
          </button>
        </div>
      </div>
    </div>
  );
}
