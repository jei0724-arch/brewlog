/* ============================================================
   BREWLOG NOTE — src/components/onboarding/OnboardingTutorial.jsx
   신규 가입자용 인터랙티브 온보딩 튜토리얼
   ─ 실제 버튼을 가리키고, 사용자의 실제 클릭/저장 완료를 감지해서
     자동으로 다음 단계로 넘어감 ("다음" 버튼 없이 실습하며 진행)
   ─ 흐름: 환영 → 내 장비 탭 → 추가하기 → 입력/저장 →
          내 원두 탭 → 추가하기 → 입력/저장 →
          내 레시피로 이동 → 기록하기 → 필드 입력 설명 →
          프리셋으로 저장해보기 → 최종 저장 → 마무리
   ─ ctx = { feedTab, equipShowModal, beanShowModal, showModal } (MainApp에서 실시간 전달)
   ============================================================ */
import { useState, useEffect, useLayoutEffect, useRef } from "react";

const STEPS = [
  { key: "welcome", target: null, auto: null,
    title: { ko: "브루로그에 오신 걸 환영해요 ☕", en: "Welcome to Brewlog Note ☕" },
    desc: { ko: "직접 따라 하면서 배워봐요. 화면의 버튼을 실제로 눌러가며 장비 등록 → 원두 등록 → 첫 레시피 기록까지 안내해드릴게요.",
            en: "Let's learn by doing. We'll guide you through registering equipment, adding beans, and logging your first recipe — using the real buttons." } },

  { key: "equip-tab", target: "equip-tab", auto: (c) => c.feedTab === "equip",
    title: { ko: "여기를 눌러주세요", en: "Tap here" },
    desc: { ko: "\"내 장비\" 탭을 눌러 이동해보세요.", en: "Tap the \"My Equipment\" tab to continue." } },

  { key: "equip-add", target: "equip-add-btn", auto: (c) => c.equipShowModal === true,
    title: { ko: "장비 추가하기", en: "Add Your Equipment" },
    desc: { ko: "\"추가하기\" 버튼을 눌러 사용 중인 머신·그라인더(또는 핸드드립 기구)를 등록해보세요.",
            en: "Tap \"Add\" to register your machine, grinder, or hand-drip gear." } },

  { key: "equip-fill", target: null, floating: true, auto: (c) => c.equipShowModal === false,
    title: { ko: "정보를 입력하고 저장하세요", en: "Fill in the details and save" },
    desc: { ko: "브랜드 → 모델 → (해당 시) 용량 순서로 입력한 뒤 저장 버튼을 눌러주세요. 저장하면 자동으로 다음 단계로 넘어가요.",
            en: "Enter brand → model → capacity (if applicable), then tap Save. We'll move on automatically once saved." } },

  { key: "bean-tab", target: "beans-tab", auto: (c) => c.feedTab === "beans",
    title: { ko: "이번엔 원두예요", en: "Now let's add beans" },
    desc: { ko: "\"내 원두\" 탭을 눌러 이동해보세요.", en: "Tap the \"My Beans\" tab to continue." } },

  { key: "bean-add", target: "bean-add-btn", auto: (c) => c.beanShowModal === true,
    title: { ko: "원두 추가하기", en: "Add Your Beans" },
    desc: { ko: "\"추가하기\" 버튼을 눌러 지금 쓰고 있는 원두를 등록해보세요.", en: "Tap \"Add\" to register the beans you're currently using." } },

  { key: "bean-fill", target: null, floating: true, auto: (c) => c.beanShowModal === false,
    title: { ko: "정보를 입력하고 저장하세요", en: "Fill in the details and save" },
    desc: { ko: "원두명 → 원산지/로스터리 → 로스팅 날짜 순서로 입력한 뒤 저장해보세요. 저장하면 자동으로 다음 단계로 넘어가요.",
            en: "Enter bean name → origin/roastery → roast date, then Save. We'll move on automatically once saved." } },

  { key: "record-tab", target: "record-btn", auto: (c) => c.showModal === true, navigateTo: "mine",
    title: { ko: "이제 첫 레시피예요!", en: "Now for your first recipe!" },
    desc: { ko: "\"기록하기\" 버튼을 눌러 새 레시피 작성을 시작해보세요.", en: "Tap \"Record\" to start logging a new recipe." } },

  { key: "recipe-fill", target: null, floating: true, auto: null,
    title: { ko: "각 항목을 하나씩 채워봐요", en: "Fill in each field" },
    desc: { ko: "메뉴 선택 → 등록해둔 원두/장비 자동 불러오기 확인 → 원두량(g) → 추출시간(타이머 사용 가능) → 추출량(ml) 순서로 입력해보세요. 다 채웠으면 아래 \"다음\"을 눌러주세요.",
            en: "Fill in menu → check your saved bean/equipment auto-fill → dose(g) → time (use the built-in timer) → yield(ml). Tap \"Next\" below once done." } },

  { key: "ai-tip", target: "ai-tip-card", auto: null,
    title: { ko: "AI가 오늘 날씨·원두 기준으로 팁을 줘요", en: "AI gives tips based on today's weather & your beans" },
    desc: { ko: "새 레시피를 작성할 때마다 오늘 날씨와 최근 기록을 바탕으로 AI가 추출 파라미터 팁을 자동으로 보여줘요. 등록해둔 원두 정보가 있으면 그 원두에 맞춘 조언도 함께 나와요. (하루 5회까지 새로고침 가능)",
            en: "Every time you write a new recipe, AI shows extraction tips based on today's weather and your recent recipes — and it factors in your registered bean info too. (Refreshable up to 5 times a day.)" } },

  { key: "recipe-preset", target: "preset-save-btn", auto: null,
    title: { ko: "프리셋으로 저장해두면 편해요", en: "Save it as a preset" },
    desc: { ko: "자주 쓰는 설정이면 여기서 \"프리셋으로 저장\"을 눌러보세요. 다음에 레시피 쓸 때 한 번에 불러올 수 있어요. (선택사항 — 안 눌러도 다음으로 넘어가도 돼요)",
            en: "If this is a setup you'll reuse, tap \"Save as Preset\" here — you can reload it instantly next time. (Optional — you can skip ahead too.)" } },

  { key: "recipe-save", target: "recipe-save-btn", auto: (c) => c.showModal === false,
    title: { ko: "마지막! 기록을 저장하세요", en: "Last step! Save your recipe" },
    desc: { ko: "\"저장\" 버튼을 눌러 첫 레시피를 완성해보세요.", en: "Tap \"Save\" to complete your first recipe." } },

  { key: "done", target: null, auto: null,
    title: { ko: "완성! 첫 레시피를 기록했어요 🎉", en: "Done! You logged your first recipe 🎉" },
    desc: { ko: "이제 브루로그의 핵심 기능을 다 알게 되셨어요. 궁금한 게 생기면 MY 설정 → \"튜토리얼 다시보기\"로 언제든 다시 볼 수 있어요.",
            en: "You now know the core features of Brewlog Note. You can always replay this from My Settings → \"Replay Tutorial\"." } },
];

function getRect(target) {
  if (!target) return null;
  const el = document.querySelector(`[data-tutorial="${target}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height, bottom: r.bottom, right: r.right };
}

export default function OnboardingTutorial({ lang = "ko", onFinish, ctx = {}, goToTab }) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState(null);
  const isKo = lang === "ko";
  const s = STEPS[step];
  const last = step === STEPS.length - 1;
  const advancedRef = useRef(false);

  // 이 단계에 필요하면 자동으로 해당 탭으로 이동
  useEffect(() => {
    if (s.navigateTo && goToTab) goToTab(s.navigateTo);
    advancedRef.current = false;
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  // 실제 사용자 행동(탭 이동/모달 열림·닫힘)을 감지해서 자동으로 다음 단계로
  useEffect(() => {
    if (!s.auto || advancedRef.current) return;
    if (s.auto(ctx)) {
      advancedRef.current = true;
      const t = setTimeout(() => setStep(v => Math.min(v + 1, STEPS.length - 1)), 450);
      return () => clearTimeout(t);
    }
  }, [ctx.feedTab, ctx.equipShowModal, ctx.beanShowModal, ctx.showModal, step]); // eslint-disable-line react-hooks/exhaustive-deps

  // 타겟 위치 계산
  useLayoutEffect(() => {
    if (!s.target) { setRect(null); return; }
    const update = () => setRect(getRect(s.target));
    update();
    const t = setTimeout(update, 200);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => { clearTimeout(t); window.removeEventListener("resize", update); window.removeEventListener("scroll", update, true); };
  }, [step, s.target]);

  const next = () => (last ? onFinish() : setStep(v => v + 1));
  const prev = () => setStep(v => Math.max(0, v - 1));

  const PAD = 12;
  let tooltipStyle = {}, arrowStyle = null;
  if (rect) {
    const spaceBelow = window.innerHeight - rect.bottom;
    const showBelow = spaceBelow > 220;
    const tooltipW = 300;
    let left = rect.left + rect.width / 2 - tooltipW / 2;
    left = Math.max(12, Math.min(left, window.innerWidth - tooltipW - 12));
    tooltipStyle = {
      position: "fixed", left, width: tooltipW, pointerEvents: "auto", zIndex: 10002,
      top: showBelow ? rect.bottom + PAD : undefined,
      bottom: showBelow ? undefined : (window.innerHeight - rect.top + PAD),
    };
    arrowStyle = {
      position: "fixed", zIndex: 10002,
      left: Math.max(24, Math.min(rect.left + rect.width / 2, window.innerWidth - 24)) - 7,
      top: showBelow ? rect.bottom + 2 : undefined,
      bottom: showBelow ? undefined : (window.innerHeight - rect.top + 2),
      width: 0, height: 0,
      borderLeft: "7px solid transparent", borderRight: "7px solid transparent",
      borderBottom: showBelow ? "8px solid var(--foam)" : "none",
      borderTop: showBelow ? "none" : "8px solid var(--foam)",
    };
  }

  const TooltipCard = ({ showNav }) => (
    <div style={{ background: "var(--foam)", border: "1px solid var(--divider)", borderRadius: "14px", padding: "18px 20px", boxShadow: "0 8px 28px rgba(26,22,20,0.22)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
        <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.65rem", fontWeight: 700, color: "var(--latte)", letterSpacing: "0.05em" }}>
          {step + 1} / {STEPS.length}
        </span>
        <button onClick={onFinish} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "0.72rem", cursor: "pointer", padding: 0, fontFamily: "'DM Sans',sans-serif" }}>
          {isKo ? "튜토리얼 끝내기" : "End tutorial"}
        </button>
      </div>
      <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.05rem", fontWeight: 700, color: "var(--espresso)", marginBottom: "6px" }}>
        {s.title[lang] || s.title.ko}
      </div>
      <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.6, marginBottom: showNav ? "14px" : 0 }}>
        {s.desc[lang] || s.desc.ko}
      </p>
      {!showNav && (
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.72rem", color: "var(--latte)", fontFamily: "'DM Sans',sans-serif", fontWeight: 600 }}>
          <span className="tutorial-pulse-dot" style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--latte)" }}/>
          {isKo ? "실제로 눌러서 진행해보세요" : "Go ahead and try it"}
        </div>
      )}
      {showNav && (
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
      )}
    </div>
  );

  // ── 타겟이 있고 실제로 찾은 경우: 실제 버튼을 스포트라이트로 강조 (배경 클릭은 그대로 통과) ──
  if (s.target && rect) {
    const spotPad = 6;
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 10001, pointerEvents: "none" }}>
        <div style={{
          position: "fixed",
          top: rect.top - spotPad, left: rect.left - spotPad,
          width: rect.width + spotPad * 2, height: rect.height + spotPad * 2,
          borderRadius: "10px",
          boxShadow: "0 0 0 9999px rgba(26,22,20,0.55)",
          border: "2px solid var(--latte)",
          transition: "top 0.25s ease, left 0.25s ease, width 0.25s ease, height 0.25s ease",
          pointerEvents: "none",
        }}/>
        <div style={arrowStyle}/>
        <div style={tooltipStyle}><TooltipCard showNav={!s.auto}/></div>
      </div>
    );
  }

  // ── target=null, floating=true: 모달 위에 뜨는 작은 안내 카드 (배경/모달 조작 그대로 가능) ──
  if (s.floating) {
    return (
      <div style={{ position: "fixed", top: "16px", left: "50%", transform: "translateX(-50%)", width: "min(340px, 92vw)", zIndex: 10002 }}>
        <TooltipCard showNav={!s.auto}/>
      </div>
    );
  }

  // ── target 없음, floating 아님(환영/마무리/설명 단계): 중앙 모달 ──
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
