/* ============================================================
   BREWLOG NOTE — src/components/recipes/HandDripTimer.jsx
   핸드드립 전용 스톱워치 + 구간(랩) 기록 타이머
   ─ 에스프레소용 Timer(인퓨전/추출 2페이즈)와 완전히 분리 —
     핸드드립엔 "인퓨전/추출"이라는 개념이 안 맞아서 혼동을 줬음
   ─ "구간 기록" 버튼을 누르면 그 시점 경과 시간이 pourStages에
     즉시 추가됨(시간은 자동, 물량/메모만 나중에 채우면 됨)
   ─ 종료 시 총 경과 시간을 onChange(총초)로 폼에 반영
   ============================================================ */
import { useState, useEffect, useRef, useCallback } from "react";
import { useWakeLock } from "../../hooks/useWakeLock";

function fmt(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export default function HandDripTimer({ value, pourStages, onChange, onStagesChange, lang }) {
  // phase: "idle" | "running" | "done"
  const [phase, setPhase] = useState("idle");
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef(null);

  useWakeLock(phase === "running");

  const clearTimer = useCallback(() => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  }, []);
  useEffect(() => () => clearTimer(), [clearTimer]);

  const start = useCallback(() => {
    clearTimer();
    setPhase("running");
    setElapsed(0);
    intervalRef.current = setInterval(() => setElapsed(p => p + 1), 1000);
  }, [clearTimer]);

  const lap = useCallback(() => {
    const stages = pourStages || [];
    onStagesChange([...stages, { time: String(elapsed), amount: "", note: "" }]);
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
  }, [clearTimer]);

  return (
    <div className="timer-box">
      <div style={{ textAlign: "center", marginBottom: "10px" }}>
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
        {(pourStages || []).length > 0 && (
          <div style={{ fontSize: "0.65rem", color: "var(--muted)", marginTop: "4px", fontFamily: "'DM Sans', sans-serif" }}>
            {lang === "en" ? `${pourStages.length} stage(s) recorded` : `구간 ${pourStages.length}개 기록됨`}
          </div>
        )}
      </div>

      <div className="timer-btns">
        {phase === "idle" && (
          <button type="button" className="timer-start" onClick={start} style={{ background: "#27ae60" }}>
            {lang === "en" ? "Start" : "시작"}
          </button>
        )}
        {phase === "running" && (
          <>
            <button type="button" className="timer-start" onClick={lap} style={{ background: "#e67e22" }}>
              {lang === "en" ? "Record Stage" : "구간 기록"}
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
