/* ============================================================
   BREWLOG NOTE — src/components/recipes/HandDripTimer.jsx
   핸드드립 전용 타이머
   ─ pourStages의 각 time 값은 "그 구간 자체의 길이(duration)"이며,
     배열 순서 = 실제 브루잉 순서. 절대시간이 아니므로 정렬하지 않고
     순서대로 누적(cumulative)해서 시작/종료 시점을 계산함
   ─ 기록 모드: 계획된 구간이 없을 때 — "구간 기록"으로 새로 만듦
     (직전 기록 시점 이후 흐른 시간이 그 구간의 duration으로 저장됨)
   ─ 가이드 모드: 이미 기록된 구간이 있을 때 — 누적 시간표대로 안내
     (진동+비프음, 현재/다음 단계 표시)
   ============================================================ */
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useWakeLock } from "../../hooks/useWakeLock";

function fmt(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

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
  const [phase, setPhase] = useState("idle"); // idle | running | done
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef(null);
  const firedRef = useRef(new Set());
  const lastLapRef = useRef(0); // 마지막 "구간 기록" 시점 (기록 모드에서 duration 계산용)

  useWakeLock(phase === "running");

  // 배열 순서대로 누적(cumulative) 시작/종료 시점 계산 — duration 모델
  // 시간이 비어있는(0) "빈 단계"는 누적 계산 전에 제외 — 안 그러면 그 순간 즉시 "현재 단계"로
  // 판정되면서 다음(사실상 마지막) 단계로 순식간에 넘어가버리는 버그가 생김
  const plan = useMemo(() => {
    let cum = 0;
    return (pourStages || [])
      .filter(s => (parseInt(s.time) || 0) > 0)
      .map((s, idx) => {
        const dur = parseInt(s.time) || 0;
        const start = cum;
        cum += dur;
        return { ...s, _idx: idx, dur, start, end: cum };
      });
  }, [pourStages]);
  const isGuideMode = plan.length > 0;
  const totalPlanned = plan.length ? plan[plan.length - 1].end : 0;

  const clearTimer = useCallback(() => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  }, []);
  useEffect(() => () => clearTimer(), [clearTimer]);

  const start = useCallback(() => {
    clearTimer();
    setPhase("running");
    setElapsed(0);
    lastLapRef.current = 0;
    firedRef.current = new Set();
    intervalRef.current = setInterval(() => setElapsed(p => p + 1), 1000);
  }, [clearTimer]);

  // 가이드 모드 — 새 구간 시작 시점(start)에 도달하면 알림 (0번째는 시작 버튼으로 이미 인지했으니 스킵)
  useEffect(() => {
    if (phase !== "running" || !isGuideMode) return;
    plan.forEach((s, i) => {
      if (i === 0) return;
      if (s.dur <= 0) return;
      if (elapsed >= s.start && !firedRef.current.has(i)) {
        firedRef.current.add(i);
        alertStage();
      }
    });
  }, [elapsed, phase, isGuideMode, plan]);

  // 구간 기록 — 직전 기록 이후 흐른 시간을 이번 구간의 duration으로 저장
  const lap = useCallback(() => {
    const dur = Math.max(0, elapsed - lastLapRef.current);
    lastLapRef.current = elapsed;
    const stages = pourStages || [];
    onStagesChange([...stages, { time: String(dur), amount: "", label: "", desc: "" }]);
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
    lastLapRef.current = 0;
    firedRef.current = new Set();
  }, [clearTimer]);

  const currentStageIdx = isGuideMode
    ? plan.reduce((acc, s, i) => (elapsed >= s.start ? i : acc), -1)
    : -1;
  const nextStage = isGuideMode ? plan[currentStageIdx + 1] : null;

  return (
    <div className="timer-box">
      {isGuideMode && (
        <div style={{ fontSize: "0.62rem", fontWeight: 700, color: "var(--latte)", textAlign: "center", marginBottom: "6px", letterSpacing: "0.04em", textTransform: "uppercase" }}>
          {lang === "en"
            ? `Guide Mode · ${plan.length} stages · Total ${fmt(totalPlanned)}`
            : `가이드 모드 · 단계 ${plan.length}개 · 총 ${fmt(totalPlanned)}`}
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

        {isGuideMode && phase === "running" && (
          <div style={{ marginTop: "4px" }}>
            {currentStageIdx >= 0 && (
              <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#27ae60", fontFamily: "'DM Sans',sans-serif" }}>
                {lang === "en" ? "Now: " : "진행 중: "}{plan[currentStageIdx].label || (lang === "en" ? `Stage ${currentStageIdx + 1}` : `${currentStageIdx + 1}단계`)}
              </div>
            )}
            {nextStage && (
              <div style={{ fontSize: "0.68rem", color: "var(--muted)", fontFamily: "'DM Sans',sans-serif", marginTop: "2px" }}>
                {lang === "en" ? "Next: " : "다음: "}{nextStage.label || (lang === "en" ? `Stage ${plan.indexOf(nextStage)+1}` : `${plan.indexOf(nextStage)+1}단계`)} · {Math.max(0, nextStage.start - elapsed)}{lang==="en"?"s":"초"} {lang==="en"?"left":"뒤"}
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

      {isGuideMode && phase !== "idle" && totalPlanned > 0 && (
        <div style={{ display: "flex", height: "6px", borderRadius: "3px", overflow: "hidden", marginBottom: "10px", background: "var(--steam)" }}>
          {plan.filter(s => s.dur > 0).map((s, i, arr) => {
            const isPast = elapsed >= s.end;
            const isCurrent = currentStageIdx === s._idx;
            return (
              <div key={i} style={{
                width: `${(s.dur / totalPlanned) * 100}%`,
                background: isPast ? "#27ae60" : isCurrent ? "#e67e22" : "var(--steam)",
                borderRight: i < arr.length - 1 ? "1px solid var(--foam)" : "none",
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
