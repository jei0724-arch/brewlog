/* ============================================================
   BREWLOG NOTE — src/components/recipes/PourTimer.jsx
   핸드드립 전용 랩 타이머 (블룸 → 1차 → 2차 → ...)
   ─ setInterval을 이 컴포넌트 내부에만 격리 (부모 리렌더 방지)
   ─ "다음 물붓기" 탭마다 랩 기록 + 소리(Web Audio) + 진동 알림
   ─ 완료 시 onChange(총초), onInfusionChange(블룸초), onPoursChange(랩 배열) 호출
   ─ 수동 입력(랩별 초 수정)도 병행 가능
   ============================================================ */
import { useState, useEffect, useRef, useCallback } from "react";

// ── 포맷 헬퍼 ───────────────────────────────────────────────────
function fmt(s) {
  const m   = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}:${String(sec).padStart(2, "0")}` : `${String(sec).padStart(2, "0")}`;
}

// ── 랩 라벨 헬퍼 (0=블룸, 1=1차, 2=2차...) ─────────────────────
function lapLabel(i, lang) {
  if (i === 0) return lang === "en" ? "Bloom" : "블룸";
  return lang === "en" ? `Pour ${i}` : `${i}차`;
}

// ── 알림음 (Web Audio, 외부 파일 불필요) ───────────────────────
function playBeep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
    osc.onended = () => ctx.close().catch(() => {});
  } catch {}
}

function vibrate() {
  try { navigator.vibrate?.(200); } catch {}
}

// ─────────────────────────────────────────────────────────────────
export default function PourTimer({
  value, infusionValue, pours, onChange, onInfusionChange, onPoursChange,
  lang, t, soundEnabled = true,
}) {
  // phase: "idle" | "running" | "done"
  const [phase,   setPhase]   = useState("idle");
  const [laps,    setLaps]    = useState(() => Array.isArray(pours) && pours.length ? pours : []);
  const [elapsed, setElapsed] = useState(0); // 현재 랩 경과 초
  const [muted,   setMuted]   = useState(!soundEnabled);

  const intervalRef = useRef(null);

  const clearTimer = useCallback(() => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  }, []);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const alert = useCallback(() => {
    if (muted) return;
    playBeep();
    vibrate();
  }, [muted]);

  // ── 시작 (블룸) ─────────────────────────────────────────────
  const start = useCallback(() => {
    clearTimer();
    setPhase("running");
    setElapsed(0);
    setLaps([]);
    intervalRef.current = setInterval(() => setElapsed((p) => p + 1), 1000);
    alert();
  }, [clearTimer, alert]);

  // ── 다음 물붓기 (현재 랩 기록 + 새 랩 시작) ──────────────────
  const nextPour = useCallback(() => {
    setLaps((prev) => {
      const next = [...prev, { label: lapLabel(prev.length, lang), seconds: elapsed }];
      return next;
    });
    setElapsed(0);
    alert();
  }, [elapsed, lang, alert]);

  // ── 완료 ───────────────────────────────────────────────────
  const finish = useCallback(() => {
    clearTimer();
    setLaps((prev) => {
      const finalLaps = [...prev, { label: lapLabel(prev.length, lang), seconds: elapsed }];
      const total = finalLaps.reduce((s, l) => s + l.seconds, 0);
      const bloom = finalLaps[0]?.seconds || 0;
      onInfusionChange(String(bloom));
      onChange(String(total));
      onPoursChange?.(finalLaps);
      return finalLaps;
    });
    setPhase("done");
    setElapsed(0);
    alert();
  }, [clearTimer, elapsed, lang, onChange, onInfusionChange, onPoursChange, alert]);

  // ── 리셋 ───────────────────────────────────────────────────
  const reset = useCallback(() => {
    clearTimer();
    setPhase("idle");
    setElapsed(0);
    setLaps([]);
    onInfusionChange("0");
    onChange("0");
    onPoursChange?.([]);
  }, [clearTimer, onChange, onInfusionChange, onPoursChange]);

  // ── 수동 랩 편집 (idle/done 상태에서 값 직접 수정) ────────────
  const updateLapSeconds = (idx, v) => {
    const secs = Math.max(0, Number(v) || 0);
    setLaps((prev) => {
      const next = prev.map((l, i) => (i === idx ? { ...l, seconds: secs } : l));
      const total = next.reduce((s, l) => s + l.seconds, 0);
      const bloom = next[0]?.seconds || 0;
      onInfusionChange(String(bloom));
      onChange(String(total));
      onPoursChange?.(next);
      return next;
    });
  };

  const addManualLap = () => {
    setLaps((prev) => {
      const next = [...prev, { label: lapLabel(prev.length, lang), seconds: 0 }];
      onPoursChange?.(next);
      return next;
    });
    setPhase("done");
  };

  const removeLap = (idx) => {
    setLaps((prev) => {
      const next = prev
        .filter((_, i) => i !== idx)
        .map((l, i) => ({ ...l, label: lapLabel(i, lang) }));
      const total = next.reduce((s, l) => s + l.seconds, 0);
      const bloom = next[0]?.seconds || 0;
      onInfusionChange(String(bloom));
      onChange(String(total));
      onPoursChange?.(next);
      return next;
    });
  };

  const runningTotal = laps.reduce((s, l) => s + l.seconds, 0) + (phase === "running" ? elapsed : 0);

  return (
    <div>
      {/* ── 타이머 박스 ── */}
      <div className="timer-box">
        {/* 상단: 음소거 토글 */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "4px" }}>
          <button type="button" onClick={() => setMuted((m) => !m)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", color: "var(--muted)", fontSize: "0.68rem", fontFamily: "'DM Sans',sans-serif", display: "flex", alignItems: "center", gap: "4px" }}>
            {muted ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M11 5L6 9H3v6h3l5 4V5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><line x1="16" y1="9" x2="21" y2="14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><line x1="21" y1="9" x2="16" y2="14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M11 5L6 9H3v6h3l5 4V5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M15.5 8.5a5 5 0 0 1 0 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="M18 6a9 9 0 0 1 0 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
            )}
            {muted ? (lang === "en" ? "Muted" : "무음") : (lang === "en" ? "Alerts on" : "알림 켜짐")}
          </button>
        </div>

        {/* 경과 시간 디스플레이 */}
        <div style={{ textAlign: "center", marginBottom: "10px" }}>
          {phase === "idle" && laps.length === 0 && (
            <div style={{ fontSize: "2rem", fontFamily: "'DM Sans', sans-serif", fontWeight: 700, color: "var(--steam)" }}>
              00
            </div>
          )}

          {phase === "running" && (
            <div>
              <div style={{ fontSize: "0.65rem", color: "#e67e22", fontWeight: 600, fontFamily: "'DM Sans', sans-serif", marginBottom: "2px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {lapLabel(laps.length, lang)} {lang === "en" ? "pouring…" : "붓는 중…"}
              </div>
              <div className="timer-display running" style={{ color: "#e67e22" }}>
                {fmt(elapsed)}
              </div>
              <div style={{ fontSize: "0.62rem", color: "var(--muted)", marginTop: "2px", fontFamily: "'DM Sans', sans-serif" }}>
                {lang === "en" ? `Total ${fmt(runningTotal)}` : `누적 ${fmt(runningTotal)}`}
              </div>
            </div>
          )}

          {phase === "done" && (
            <div>
              <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginBottom: "2px", fontFamily: "'DM Sans', sans-serif" }}>
                {laps.map((l) => `${l.label} ${fmt(l.seconds)}`).join(" + ") || (lang === "en" ? "No pours yet" : "기록된 물붓기 없음")}
              </div>
              <div style={{ fontSize: "2rem", fontFamily: "'DM Sans', sans-serif", fontWeight: 700, color: "var(--espresso)" }}>
                {fmt(runningTotal)}
                <span style={{ fontSize: "0.75rem", color: "var(--muted)", marginLeft: "4px" }}>
                  {lang === "en" ? "total" : "총"}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 랩 리스트 (진행 중 + 완료 상태 모두 표시) */}
        {laps.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginBottom: "10px" }}>
            {laps.map((l, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", background: "var(--cream)", borderRadius: "6px", padding: "5px 8px" }}>
                <span style={{ fontSize: "0.72rem", color: "var(--muted)", fontFamily: "'DM Sans', sans-serif", width: "44px", flexShrink: 0 }}>
                  {l.label}
                </span>
                {phase === "running" ? (
                  <span style={{ fontSize: "0.78rem", color: "var(--espresso)", fontFamily: "'DM Sans', sans-serif" }}>{fmt(l.seconds)}s</span>
                ) : (
                  <input type="number" min="0" value={l.seconds}
                    onChange={(e) => updateLapSeconds(i, e.target.value)}
                    style={{ width: "56px", padding: "3px 6px", border: "1px solid var(--steam)", borderRadius: "5px", fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", color: "var(--espresso)", outline: "none", boxSizing: "border-box" }}/>
                )}
                {phase !== "running" && (
                  <button type="button" onClick={() => removeLap(i)}
                    style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: "0.9rem", padding: "0 4px" }}
                    title={lang === "en" ? "Remove" : "삭제"}>×</button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 컨트롤 버튼 */}
        <div className="timer-btns">
          {phase === "idle" && (
            <>
              <button type="button" className="timer-start" onClick={start} style={{ background: "#e67e22" }}>
                {lang === "en" ? "Start (Bloom)" : "시작 (블룸)"}
              </button>
              {laps.length === 0 && (
                <button type="button" className="timer-reset" onClick={addManualLap}>
                  {lang === "en" ? "Enter manually" : "직접 입력"}
                </button>
              )}
            </>
          )}

          {phase === "running" && (
            <>
              <button type="button" className="timer-start" onClick={nextPour} style={{ background: "#27ae60" }}>
                {lang === "en" ? "Next pour" : "다음 물붓기"}
              </button>
              <button type="button" className="timer-start" onClick={finish} style={{ background: "var(--espresso)" }}>
                {lang === "en" ? "Finish" : "완료"}
              </button>
              <button type="button" className="timer-reset" onClick={reset}>
                {t?.timerReset || "초기화"}
              </button>
            </>
          )}

          {phase === "done" && (
            <>
              <button type="button" className="timer-reset" onClick={addManualLap}>
                {lang === "en" ? "+ Add pour" : "+ 물붓기 추가"}
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
