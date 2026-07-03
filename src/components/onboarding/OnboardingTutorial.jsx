/* ============================================================
   BREWLOG NOTE — src/components/onboarding/OnboardingTutorial.jsx
   신규 가입자용 온보딩 튜토리얼 — 코치마크(coach mark) 방식
   ─ 환영/마무리는 중앙 모달, 중간 3단계는 실제 버튼을 스포트라이트로
     비추고 옆에 말풍선 설명을 붙임
   ─ 타겟 요소는 각 버튼에 달아둔 data-tutorial 속성으로 찾음:
     data-tutorial="equip-tab" | "beans-tab" | "record-btn"
   ─ 창 크기 변경/스크롤 시 위치 재계산
   ============================================================ */
import { useState, useEffect, useRef, useLayoutEffect } from "react";

const STEPS = [
  {
    key: "welcome",
    target: null,
    title: { ko: "브루로그에 오신 걸 환영해요 ☕", en: "Welcome to Brewlog Note ☕" },
    desc: {
      ko: "나만의 커피 레시피를 기록하고, 다른 브루어들과 나눠보세요. 화면에 뜨는 버튼을 직접 짚어드릴게요 — 1분이면 충분해요.",
      en: "Record your own coffee recipes and share them with other brewers. We'll point out the exact buttons — takes about a minute.",
    },
  },
  {
    key: "equipment",
    target: "equip-tab",
    title: { ko: "1. 내 장비를 등록해요", en: "1. Register Your Equipment" },
    desc: {
      ko: "여기를 눌러 머신·그라인더(또는 핸드드립 기구)를 등록해두면, 레시피 기록할 때마다 자동으로 불러올 수 있어요.",
      en: "Tap here to register your machine, grinder, or hand-drip gear — it'll auto-fill every time you log a recipe.",
    },
  },
  {
    key: "bean",
    target: "beans-tab",
    title: { ko: "2. 원두를 등록해요", en: "2. Register Your Beans" },
    desc: {
      ko: "여기서 지금 쓰고 있는 원두를 등록하세요. 로스팅 날짜·산지를 기록해두면 남은 양 관리와 레시피 연결이 편해져요.",
      en: "Add your current beans here. Tracking roast date and origin makes stock management and recipe linking easier.",
    },
  },
  {
    key: "recipe",
    target: "record-btn",
    title: { ko: "3. 첫 레시피를 기록해요", en: "3. Log Your First Recipe" },
    desc: {
      ko: "이 버튼으로 메뉴·원두량·추출시간·추출량을 입력하면 끝! 등록해둔 장비·원두가 자동으로 불러와져요.",
      en: "Tap this to log menu, dose, time, and yield — that's it! Your saved equipment and beans auto-fill.",
    },
  },
  {
    key: "done",
    target: null,
    title: { ko: "준비 끝! 시작해볼까요?", en: "All set! Ready to brew?" },
    desc: {
      ko: "궁금한 게 생기면 MY 설정에서 \"튜토리얼 다시보기\"로 언제든 다시 볼 수 있어요.",
      en: "You can always replay this tutorial from the \"My\" settings menu.",
    },
  },
];

function getRect(target) {
  if (!target) return null;
  const el = document.querySelector(`[data-tutorial="${target}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height, bottom: r.bottom, right: r.right };
}

export default function OnboardingTutorial({ lang = "ko", onFinish }) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState(null);
  const tooltipRef = useRef(null);
  const isKo = lang === "ko";
  const s = STEPS[step];
  const last = step === STEPS.length - 1;
  const hasTarget = !!s.target;

  // 타겟 위치 계산 (스텝 변경/리사이즈/스크롤 시 갱신)
  useLayoutEffect(() => {
    if (!hasTarget) { setRect(null); return; }
    const update = () => {
      const r = getRect(s.target);
      setRect(r); // null이면 타겟을 못 찾은 것 — 아래에서 중앙 모달로 폴백
      if (r) {
        // 타겟이 화면 밖에 있으면 보이는 곳으로 스크롤
        const inView = r.top >= 0 && r.bottom <= window.innerHeight;
        if (!inView) window.scrollTo({ top: window.scrollY + r.top - 120, behavior: "smooth" });
      }
    };
    update();
    const t = setTimeout(update, 250); // 스크롤 애니메이션 이후 재보정
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [step, hasTarget, s.target]);

  const next = () => (last ? onFinish() : setStep(v => v + 1));
  const prev = () => setStep(v => Math.max(0, v - 1));

  // 말풍선 위치 계산 — 타겟 아래에 공간 있으면 아래, 없으면 위
  const PAD = 12;
  let tooltipStyle = {};
  let arrowStyle = null;
  if (rect) {
    const spaceBelow = window.innerHeight - rect.bottom;
    const showBelow = spaceBelow > 220;
    const tooltipW = 300;
    let left = rect.left + rect.width / 2 - tooltipW / 2;
    left = Math.max(12, Math.min(left, window.innerWidth - tooltipW - 12));
    tooltipStyle = {
      position: "fixed",
      left, width: tooltipW,
      top: showBelow ? rect.bottom + PAD : undefined,
      bottom: showBelow ? undefined : (window.innerHeight - rect.top + PAD),
      zIndex: 10002,
    };
    arrowStyle = {
      position: "fixed",
      left: Math.max(24, Math.min(rect.left + rect.width / 2, window.innerWidth - 24)) - 7,
      top: showBelow ? rect.bottom + 2 : undefined,
      bottom: showBelow ? undefined : (window.innerHeight - rect.top + 2),
      width: 0, height: 0,
      borderLeft: "7px solid transparent", borderRight: "7px solid transparent",
      borderBottom: showBelow ? "8px solid var(--foam)" : "none",
      borderTop: showBelow ? "none" : "8px solid var(--foam)",
      zIndex: 10002,
    };
  }

  // ── 타겟이 있고 실제로 화면에서 찾은 경우: 코치마크(스포트라이트) ──
  if (hasTarget && rect) {
    const spotPad = 6;
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 10001 }}>
        {/* 스포트라이트: 타겟 부분만 뚫린 어두운 배경 */}
        <div onClick={onFinish} style={{
          position: "fixed",
          top: rect.top - spotPad, left: rect.left - spotPad,
          width: rect.width + spotPad * 2, height: rect.height + spotPad * 2,
          borderRadius: "10px",
          boxShadow: "0 0 0 9999px rgba(26,22,20,0.62)",
          transition: "top 0.25s ease, left 0.25s ease, width 0.25s ease, height 0.25s ease",
          pointerEvents: "none",
          border: "2px solid var(--latte)",
        }}/>
        {/* 클릭 시 건너뛰기 (스포트라이트 바깥 아무 곳) */}
        <div onClick={onFinish} style={{ position: "fixed", inset: 0, zIndex: 10000 }}/>

        {/* 말풍선 */}
        <div ref={tooltipRef} style={tooltipStyle}>
          <div style={arrowStyle}/>
          <div style={{ background: "var(--foam)", border: "1px solid var(--divider)", borderRadius: "14px", padding: "18px 20px", boxShadow: "0 8px 28px rgba(26,22,20,0.22)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
              <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.65rem", fontWeight: 700, color: "var(--latte)", letterSpacing: "0.05em" }}>
                {step + 1} / {STEPS.length}
              </span>
              <button onClick={onFinish} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "0.72rem", cursor: "pointer", padding: 0, fontFamily: "'DM Sans',sans-serif" }}>
                {isKo ? "건너뛰기" : "Skip"}
              </button>
            </div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.05rem", fontWeight: 700, color: "var(--espresso)", marginBottom: "6px" }}>
              {s.title[lang] || s.title.ko}
            </div>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.6, marginBottom: "14px" }}>
              {s.desc[lang] || s.desc.ko}
            </p>
            <div style={{ display: "flex", gap: "8px" }}>
              {step > 0 && (
                <button onClick={prev} style={{ flex: 1, padding: "0.55rem", border: "1px solid var(--steam)", borderRadius: "var(--r-btn)", background: "none", color: "var(--muted)", fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem", cursor: "pointer" }}>
                  {isKo ? "이전" : "Back"}
                </button>
              )}
              <button onClick={next} style={{ flex: 2, padding: "0.55rem", border: "none", borderRadius: "var(--r-btn)", background: "var(--espresso)", color: "var(--cream)", fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer" }}>
                  {last ? (isKo ? "시작하기 →" : "Get Started →") : (isKo ? "다음" : "Next")}
                </button>
              </div>
            </div>
          </div>
        </div>
    );
  }

  // ── 타겟이 없는 단계(환영/마무리) 또는 타겟을 못 찾은 경우: 중앙 모달로 폴백 ──
  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onFinish()}>
      <div className="modal" style={{ maxWidth: "400px", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.2rem" }}>
          <button onClick={onFinish} style={{ background: "none", border: "none", color: "var(--muted)", fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", cursor: "pointer", padding: "4px 6px" }}>
            {isKo ? "건너뛰기" : "Skip"}
          </button>
        </div>
        <h2 style={{ marginBottom: "10px", fontSize: "1.2rem" }}>{s.title[lang] || s.title.ko}</h2>
        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.88rem", color: "var(--muted)", lineHeight: 1.7, marginBottom: "22px" }}>
          {s.desc[lang] || s.desc.ko}
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginBottom: "20px" }}>
          {STEPS.map((_, i) => (
            <span key={i} style={{ width: i === step ? "18px" : "6px", height: "6px", borderRadius: "3px", background: i === step ? "var(--espresso)" : "var(--steam)", transition: "all 0.25s" }}/>
          ))}
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {step > 0 && (
            <button onClick={prev} style={{ flex: 1, padding: "0.75rem", border: "1px solid var(--steam)", borderRadius: "var(--r-btn)", background: "none", color: "var(--muted)", fontFamily: "'DM Sans',sans-serif", fontSize: "0.9rem", cursor: "pointer" }}>
              {isKo ? "이전" : "Back"}
            </button>
          )}
          <button onClick={next} style={{ flex: 2, padding: "0.75rem", border: "none", borderRadius: "var(--r-btn)", background: "var(--espresso)", color: "var(--cream)", fontFamily: "'DM Sans',sans-serif", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer" }}>
            {last ? (isKo ? "시작하기 →" : "Get Started →") : (isKo ? "다음" : "Next")}
          </button>
        </div>
      </div>
    </div>
  );
}
