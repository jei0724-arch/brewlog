/* ============================================================
   BREWLOG NOTE — src/components/recipes/Timer.jsx
   인퓨전 → 추출 → 완료 3단계 타이머
   ─ setInterval을 이 컴포넌트 내부에만 격리
   ─ 1초 tick이 부모 RecipeModal을 재렌더하지 않음
   ─ 완료 시 onChange(총초), onInfusionChange(인퓨전초) 호출
   ─ 수동 입력 필드(인퓨전 / 추출 / 총시간)와 병행 사용 가능
   ============================================================ */
import { useState, useEffect, useRef, useCallback } from "react";
import { useWakeLock } from "../../hooks/useWakeLock";

// ── 포맷 헬퍼 ───────────────────────────────────────────────────
function fmt(s) {
  const m   = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}:${String(sec).padStart(2, "0")}` : `${String(sec).padStart(2, "0")}`;
}

// 페이즈별 색상 맵
const PHASE_COLOR = {
  idle:       "var(--muted)",
  infusing:   "#e67e22",
  extracting: "#27ae60",
  done:       "var(--espresso)",
};

// ─────────────────────────────────────────────────────────────────
export default function Timer({ value, infusionValue, onChange, onInfusionChange, lang, t }) {
  // phase: "idle" | "infusing" | "extracting" | "done"
  const [phase,          setPhase]          = useState("idle");
  const [infusionSecs,   setInfusionSecs]   = useState(0);
  const [extractionSecs, setExtractionSecs] = useState(0);
  const [elapsed,        setElapsed]        = useState(0); // 현재 페이즈 경과 초

  const intervalRef = useRef(null);

  // 타이머가 실행 중인 동안 화면이 자동으로 꺼지지 않도록
  useWakeLock(phase === "infusing" || phase === "extracting");

  // ── 타이머 헬퍼 ───────────────────────────────────────────────
  const clearTimer = useCallback(() => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  }, []);

  const tick = () => setElapsed((p) => p + 1);

  // ── 언마운트 시 정리 ──────────────────────────────────────────
  useEffect(() => () => clearTimer(), [clearTimer]);

  // ── 인퓨전 시작 ───────────────────────────────────────────────
  const startInfusion = useCallback(() => {
    clearTimer();
    setPhase("infusing");
    setElapsed(0);
    setInfusionSecs(0);
    setExtractionSecs(0);
    intervalRef.current = setInterval(tick, 1000);
  }, [clearTimer]);

  // ── 추출 시작 (인퓨전 → 추출 전환) ────────────────────────────
  const startExtraction = useCallback(() => {
    clearTimer();
    const inf = elapsed;
    setInfusionSecs(inf);
    setElapsed(0);
    setPhase("extracting");
    intervalRef.current = setInterval(tick, 1000);
  }, [clearTimer, elapsed]);

  // ── 종료 ──────────────────────────────────────────────────────
  const stop = useCallback(() => {
    clearTimer();
    const ext = elapsed;
    setExtractionSecs(ext);
    setPhase("done");
    setElapsed(0);
    // 폼에 즉시 반영
    onInfusionChange(String(infusionSecs));
    onChange(String(infusionSecs + ext));
  }, [clearTimer, elapsed, infusionSecs, onChange, onInfusionChange]);

  // ── 리셋 ──────────────────────────────────────────────────────
  const reset = useCallback(() => {
    clearTimer();
    setPhase("idle");
    setElapsed(0);
    setInfusionSecs(0);
    setExtractionSecs(0);
  }, [clearTimer]);

  // ── 완료 후 수동 적용 ─────────────────────────────────────────
  const applyManual = useCallback(() => {
    onInfusionChange(String(infusionSecs));
    onChange(String(infusionSecs + extractionSecs));
  }, [infusionSecs, extractionSecs, onChange, onInfusionChange]);

  const totalSecs = infusionSecs + extractionSecs;

  // ── 수동 입력 필드 3개 정의 ────────────────────────────────────
  const manualFields = [
    {
      lbl: lang === "en" ? "Infusion (s)" : "인퓨전 (초)",
      val: infusionValue,
      onChange: (v) => {
        onInfusionChange(v);
        onChange(String((parseInt(v) || 0) + (parseInt(value) || 0) - (parseInt(infusionValue) || 0)));
      },
      highlight: false,
    },
    {
      lbl: lang === "en" ? "Extraction (s)" : "추출 (초)",
      val: String(Math.max(0, (parseInt(value) || 0) - (parseInt(infusionValue) || 0))),
      onChange: (v) => onChange(String((parseInt(infusionValue) || 0) + (parseInt(v) || 0))),
      highlight: false,
    },
    {
      lbl: lang === "en" ? "Total (s)" : "총 시간 (초)",
      val: value,
      onChange: (v) => onChange(v),
      highlight: true,
    },
  ];

  // ── 페이즈 인디케이터 정의 ─────────────────────────────────────
  const phases = [
    { key: "infusing",   lbl: lang === "en" ? "Infusion"  : "인퓨전" },
    { key: "extracting", lbl: lang === "en" ? "Extraction": "추출" },
    { key: "done",       lbl: lang === "en" ? "Done"      : "완료" },
  ];

  return (
    <div>
      {/* ── 수동 입력 행 3개 ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.2fr", gap: "8px", marginBottom: "10px" }}>
        {manualFields.map(({ lbl, val, onChange: oc, highlight }) => (
          <div key={lbl}>
            <div style={{
              fontSize: "0.62rem",
              color: highlight ? "var(--espresso)" : "var(--muted)",
              fontWeight: highlight ? 600 : 400,
              marginBottom: "4px",
              fontFamily: "'DM Sans', sans-serif",
            }}>
              {lbl}
            </div>
            <input
              type="number"
              value={val}
              min="0"
              onChange={(e) => oc(String(Math.max(0, Number(e.target.value))))}
              style={{
                width: "100%",
                padding: "0.65rem 0.4rem",
                border: `1px solid ${highlight ? "var(--latte)" : "var(--steam)"}`,
                borderRadius: "8px",
                background: highlight ? "#FDF6EF" : "var(--cream)",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.9rem",
                color: "var(--espresso)",
                outline: "none",
                boxSizing: "border-box",
                fontWeight: highlight ? 600 : 400,
                textAlign: "center",
              }}
            />
          </div>
        ))}
      </div>

      {/* ── 타이머 박스 ── */}
      <div className="timer-box">
        {/* 페이즈 인디케이터 도트 */}
        <div style={{ display: "flex", gap: "4px", marginBottom: "10px", justifyContent: "center" }}>
          {phases.map((p, i) => {
            const isActive = phase === p.key;
            const isPassed =
              (phase === "extracting" && i === 0) ||
              (phase === "done"       && i <= 1);
            return (
              <span key={p.key} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{
                  width: "6px", height: "6px", borderRadius: "50%",
                  background: isActive ? PHASE_COLOR[p.key] : isPassed ? "#aaa" : "var(--steam)",
                  display: "inline-block",
                  transition: "all 0.3s",
                }}/>
                <span style={{
                  fontSize: "0.62rem",
                  fontFamily: "'DM Sans', sans-serif",
                  color: isActive ? PHASE_COLOR[p.key] : "var(--muted)",
                  fontWeight: isActive ? 700 : 400,
                }}>
                  {p.lbl}
                </span>
                {i < 2 && (
                  <span style={{ fontSize: "0.6rem", color: "var(--steam)", margin: "0 2px" }}>→</span>
                )}
              </span>
            );
          })}
        </div>

        {/* 경과 시간 디스플레이 */}
        <div style={{ textAlign: "center", marginBottom: "10px" }}>
          {phase === "idle" && (
            <div style={{ fontSize: "2rem", fontFamily: "'DM Sans', sans-serif", fontWeight: 700, color: "var(--steam)" }}>
              00
            </div>
          )}

          {phase === "done" && (
            <div>
              <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginBottom: "2px", fontFamily: "'DM Sans', sans-serif" }}>
                {lang === "en"
                  ? `Infusion ${fmt(infusionSecs)}s + Extraction ${fmt(extractionSecs)}s`
                  : `인퓨전 ${fmt(infusionSecs)}초 + 추출 ${fmt(extractionSecs)}초`}
              </div>
              <div style={{ fontSize: "2rem", fontFamily: "'DM Sans', sans-serif", fontWeight: 700, color: "var(--espresso)" }}>
                {fmt(totalSecs)}
                <span style={{ fontSize: "0.75rem", color: "var(--muted)", marginLeft: "4px" }}>
                  {lang === "en" ? "total" : "총"}
                </span>
              </div>
            </div>
          )}

          {(phase === "infusing" || phase === "extracting") && (
            <div>
              <div style={{
                fontSize: "0.65rem",
                color: PHASE_COLOR[phase],
                fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
                marginBottom: "2px",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}>
                {phase === "infusing"
                  ? (lang === "en" ? "Infusing…"   : "인퓨전 중…")
                  : (lang === "en" ? "Extracting…" : "추출 중…")}
              </div>
              <div className="timer-display running" style={{ color: PHASE_COLOR[phase] }}>
                {fmt(elapsed)}
              </div>
              {phase === "extracting" && (
                <div style={{ fontSize: "0.62rem", color: "var(--muted)", marginTop: "2px", fontFamily: "'DM Sans', sans-serif" }}>
                  {lang === "en"
                    ? `Infusion: ${fmt(infusionSecs)}s`
                    : `인퓨전: ${fmt(infusionSecs)}초`}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 컨트롤 버튼 */}
        <div className="timer-btns">
          {phase === "idle" && (
            <button type="button" className="timer-start" onClick={startInfusion} style={{ background: "#e67e22" }}>
              {lang === "en" ? "Start Infusion" : "인퓨전 시작"}
            </button>
          )}

          {phase === "infusing" && (
            <>
              <button type="button" className="timer-start" onClick={startExtraction} style={{ background: "#27ae60" }}>
                {lang === "en" ? "Start Extraction" : "추출 시작"}
              </button>
              <button type="button" className="timer-reset" onClick={reset}>
                {t?.timerReset || "초기화"}
              </button>
            </>
          )}

          {phase === "extracting" && (
            <>
              <button type="button" className="timer-start" onClick={stop} style={{ background: "var(--espresso)" }}>
                {lang === "en" ? "Stop" : "종료"}
              </button>
              <button type="button" className="timer-reset" onClick={reset}>
                {t?.timerReset || "초기화"}
              </button>
            </>
          )}

          {phase === "done" && (
            <>
              <button type="button" className="timer-start" onClick={applyManual} style={{ background: "#27ae60" }}>
                {lang === "en"
                  ? `Apply (${fmt(totalSecs)}s total)`
                  : `적용 (총 ${fmt(totalSecs)}초)`}
              </button>
              <button type="button" className="timer-reset" onClick={reset}>
                {t?.timerReset || "초기화"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
