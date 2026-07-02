/* ============================================================
   BREWLOG NOTE — src/components/recipes/HandDripTimer.jsx
   핸드드립 전용 타이머
   ─ 기록 모드: 단계가 없을 때 — "구간 기록"으로 새로 계획을 만듦
   ─ 가이드 모드: 이미 기록된 단계(pourStages, 프리셋에서 불러온 것 포함)가
     있을 때 — 그 시간표대로 진행 상황을 안내(진동+비프음+하이라이트)
   ─ 두 모드 모두 같은 컴포넌트 안에서 자동 전환됨(계획 유무로 판단)
   ─ 진행 중에도 "구간 추가"로 계획에 없던 단계를 즉석에서 추가 가능
   ============================================================ */
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useWakeLock } from "../../hooks/useWakeLock";

function fmt(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

// 짧은 비프음 (Web Audio) — 진동 미지원 환경(데스크탑 등) 대비
function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(); osc.stop(ctx.currentTime + 0.4);
  } catch {}
}

function alertStage() {
  beep();
  if (navigator.vibrate) navigator.vibrate([200, 80, 200]);
}

export default function HandDripTimer({ value, pourStages, onChange, onStagesChange, lang }) {
  // phase: "idle" | "running" | "done"
  const [phase, setPhase] = useState("idle");
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef(null);
  const firedRef = useRef(new Set()); // 이미 알림 울린 단계 인덱스

  useWakeLock(phase === "running");

  // 계획된 단계(시간 기록이 있는 것) — 이게 있으면 "가이드 모드"
  const plan = useMemo(() => {
    return (pourStages || [])
      .map((s, idx) => ({ ...s, _idx: idx, time: parseInt(s.time) || 0 }))
      .filter(s => s.time > 0)
      .sort((a, b) => a.time - b.time);
  }, [pourStages]);
  const isGuideMode = plan.length > 0;

  const clearTimer = useCallback(() => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  }, []);
  useEffect(() => () => clearTimer(), [clearTimer]);

  const start = useCallback(() => {
    clearTimer();
    setPhase("running");
    setElapsed(0);
    firedRef.current = new Set();
    intervalRef.current = setInterval(() => setElapsed(p => p + 1), 1000);
  }, [clearTimer]);

  // 가이드 모드 — 계획된 시간에 도달하면 알림
  useEffect(() => {
    if (phase !== "running" || !isGuideMode) return;
    plan.forEach((s, i) => {
      if (elapsed >= s.time && !firedRef.current.has(i)) {
        firedRef.current.add(i);
        alertStage();
      }
    });
  }, [elapsed, phase, isGuideMode, plan]);

  const lap = useCallback(() => {
    const stages = pourStages || [];
    onStagesChange([...stages, { time: String(elapsed), amount: "", label: "", desc: "" }]);
  }, [elapsed, pourStages, onStagesChange]);

  const stop = useCallback(() => {
    clearTimer();
    setPhase("done");
    onChange(String(elapsed));
  }, [clearTimer, elapsed, onChange]);

  const reset = useCallback(() => {
    clearTimer();
    setPhase("idle");
    setElapsed(0);
    firedRef.current = new Set();
  }, [clearTimer]);

  // 현재/다음 단계 계산 (가이드 모드)
  const currentStageIdx = isGuideMode
    ? plan.reduce((acc, s, i) => (elapsed >= s.time ? i : acc), -1)
    : -1;
  const nextStage = isGuideMode ? plan[currentStageIdx + 1] : null;

  return (
    <div className="timer-box">
      {isGuideMode && (
        <div style={{ fontSize: "0.62rem", fontWeight: 700, color: "var(--latte)", textAlign: "center", marginBottom: "6px", letterSpacing: "0.04em", textTransform: "uppercase" }}>
          {lang === "en" ? `Guide Mode · ${plan.length} stages` : `가이드 모드 · 단계 ${plan.length}개`}
        </div>
      )}

      <div style={{ textAlign: "center", marginBottom: "8px" }}>
        {phase === "idle" && (
          <div style={{ fontSize: "2rem", fontFamily: "'DM Sans', sans-serif", fontWeight: 700, color: "var(--steam)" }}>
            00
          </div>
        )}
        {phase !== "idle" && (
          <div className={`timer-display ${phase === "running" ? "running" : ""}`}
            style={{ color: phase === "running" ? "#27ae60" : "var(--espresso)" }}>
            {fmt(elapsed)}
          </div>
        )}

        {/* 가이드 모드 — 현재/다음 단계 안내 */}
        {isGuideMode && phase === "running" && (
          <div style={{ marginTop: "4px" }}>
            {currentStageIdx >= 0 && (
              <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#27ae60", fontFamily: "'DM Sans',sans-serif" }}>
                {lang === "en" ? "Now: " : "진행 중: "}{plan[currentStageIdx].label || (lang === "en" ? `Stage ${currentStageIdx + 1}` : `${currentStageIdx + 1}단계`)}
              </div>
            )}
            {nextStage && (
              <div style={{ fontSize: "0.68rem", color: "var(--muted)", fontFamily: "'DM Sans',sans-serif", marginTop: "2px" }}>
                {lang === "en" ? "Next: " : "다음: "}{nextStage.label || (lang === "en" ? `Stage ${plan.indexOf(nextStage)+1}` : `${plan.indexOf(nextStage)+1}단계`)} · {fmt(nextStage.time)} ({lang==="en"?"in":""} {Math.max(0, nextStage.time - elapsed)}{lang==="en"?"s":"초 뒤"})
              </div>
            )}
            {!nextStage && currentStageIdx === plan.length - 1 && (
              <div style={{ fontSize: "0.68rem", color: "var(--muted)", fontFamily: "'DM Sans',sans-serif", marginTop: "2px" }}>
                {lang === "en" ? "Last stage — finish when ready" : "마지막 단계예요 — 준비되면 종료하세요"}
              </div>
            )}
          </div>
        )}

        {(pourStages || []).length > 0 && !isGuideMode && (
          <div style={{ fontSize: "0.65rem", color: "var(--muted)", marginTop: "4px", fontFamily: "'DM Sans', sans-serif" }}>
            {lang === "en" ? `${pourStages.length} stage(s) recorded` : `구간 ${pourStages.length}개 기록됨`}
          </div>
        )}
      </div>

      {/* 가이드 모드 진행 바 */}
      {isGuideMode && phase !== "idle" && (
        <div style={{ display: "flex", height: "6px", borderRadius: "3px", overflow: "hidden", marginBottom: "10px", background: "var(--steam)" }}>
          {plan.map((s, i) => {
            const prevT = i === 0 ? 0 : plan[i-1].time;
            const isPast = elapsed >= s.time;
            const isCurrent = i === currentStageIdx;
            return (
              <div key={i} style={{
                width: `${((s.time - prevT) / (plan[plan.length-1].time || 1)) * 100}%`,
                background: isPast ? "#27ae60" : isCurrent ? "#e67e22" : "var(--steam)",
                borderRight: i < plan.length-1 ? "1px solid var(--foam)" : "none",
                transition: "background 0.3s",
              }}/>
            );
          })}
        </div>
      )}

      <div className="timer-btns">
        {phase === "idle" && (
          <button type="button" className="timer-start" onClick={start} style={{ background: "#27ae60" }}>
            {isGuideMode ? (lang === "en" ? "Start Guided Brew" : "가이드 시작") : (lang === "en" ? "Start" : "시작")}
          </button>
        )}
        {phase === "running" && (
          <>
            <button type="button" className="timer-start" onClick={lap} style={{ background: "#e67e22" }}>
              {lang === "en" ? "Add Stage" : "구간 추가"}
            </button>
            <button type="button" className="timer-start" onClick={stop} style={{ background: "var(--espresso)" }}>
              {lang === "en" ? "Stop" : "종료"}
            </button>
          </>
        )}
        {phase === "done" && (
          <button type="button" className="timer-reset" onClick={reset}>
            {lang === "en" ? "Reset" : "초기화"}
          </button>
        )}
      </div>
    </div>
  );
}
