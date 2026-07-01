/* ============================================================
   BREWLOG NOTE — src/components/recipes/PourTimer.jsx
   핸드드립 전용 타이머 — 두 가지 모드
   ─ 수동 모드: "다음 물붓기" 탭마다 랩 기록
   ─ 예약 모드: 시작 전에 단계별 시간(+선택적으로 물량 g)을 각각 원하는
     만큼 미리 계획해두고, "시작"을 누르면 그 계획대로 자동으로 다음
     단계로 넘어가며 알림. 진행 중엔 단계별 알약(pill) 바 + TIME/WATER
     큰 숫자 패널로 표시
   ─ setInterval을 이 컴포넌트 내부에만 격리 (부모 리렌더 방지)
   ─ 알림 = 소리(Web Audio) + 진동
   ─ 완료 시 onChange(총초), onInfusionChange(블룸초), onPoursChange(랩 배열) 호출
   ─ 완료된 기록의 수동 편집(랩별 초/물량 수정)도 병행 가능
   ============================================================ */
import { useState, useEffect, useRef, useCallback } from "react";

// ── 포맷 헬퍼 ───────────────────────────────────────────────────
function fmt(s) {
  const m   = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}
function fmtShort(s) {
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
  // mode: "manual" (탭으로 기록) | "scheduled" (미리 짠 단계별 계획대로 자동 알림)
  const [mode, setMode] = useState("manual");
  // phase: "idle" | "running" | "done"
  const [phase,   setPhase]   = useState("idle");
  const [laps,    setLaps]    = useState(() => Array.isArray(pours) && pours.length ? pours : []);
  const [elapsed, setElapsed] = useState(0); // 현재 랩(구간) 경과 초
  const [muted,   setMuted]   = useState(!soundEnabled);

  // ── 예약 모드: 시작 전에 짜두는 단계별 계획 (시간 + 선택적 물량g) ──
  const [plannedStages, setPlannedStages] = useState([
    { seconds: 30, waterG: 0 }, { seconds: 30, waterG: 0 },
    { seconds: 30, waterG: 0 }, { seconds: 30, waterG: 0 },
  ]);
  const [stagesFired, setStagesFired] = useState(0); // 지금까지 자동 발화된 단계 수

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

  // ── 시작 ───────────────────────────────────────────────────
  const start = useCallback(() => {
    clearTimer();
    setPhase("running");
    setElapsed(0);
    setLaps([]);
    setStagesFired(0);
    intervalRef.current = setInterval(() => setElapsed((p) => p + 1), 1000);
    alert();
  }, [clearTimer, alert]);

  // ── 다음 물붓기 (수동 모드 전용 — 현재 구간 기록 + 새 구간 시작) ──
  const nextPour = useCallback(() => {
    setLaps((prev) => [...prev, { label: lapLabel(prev.length, lang), seconds: elapsed }]);
    setElapsed(0);
    alert();
  }, [elapsed, lang, alert]);

  // ── 예약 모드: elapsed가 계획된 단계 시간에 도달할 때마다 자동으로 랩 기록 ──
  useEffect(() => {
    if (mode !== "scheduled" || phase !== "running") return;
    if (stagesFired >= plannedStages.length) return;
    const target = plannedStages[stagesFired];
    if (elapsed >= target.seconds) {
      setLaps((prev) => [...prev, { label: lapLabel(prev.length, lang), seconds: target.seconds, waterG: target.waterG || 0 }]);
      setStagesFired((s) => s + 1);
      setElapsed(0);
      alert();
    }
  }, [elapsed, mode, phase, stagesFired, plannedStages, lang, alert]);

  // ── 완료 ───────────────────────────────────────────────────
  const finish = useCallback(() => {
    clearTimer();
    setLaps((prev) => {
      const cur = mode === "scheduled" ? plannedStages[stagesFired] : null;
      const finalLaps = elapsed > 0
        ? [...prev, { label: lapLabel(prev.length, lang), seconds: elapsed, waterG: cur?.waterG || 0 }]
        : prev;
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
  }, [clearTimer, elapsed, lang, mode, plannedStages, stagesFired, onChange, onInfusionChange, onPoursChange, alert]);

  // ── 리셋 (모드/계획은 유지) ──────────────────────────────────
  const reset = useCallback(() => {
    clearTimer();
    setPhase("idle");
    setElapsed(0);
    setLaps([]);
    setStagesFired(0);
    onInfusionChange("0");
    onChange("0");
    onPoursChange?.([]);
  }, [clearTimer, onChange, onInfusionChange, onPoursChange]);

  // ── 완료된 랩 편집 (done 상태에서 값 직접 수정) ────────────
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

  const updateLapWater = (idx, v) => {
    const g = Math.max(0, Number(v) || 0);
    setLaps((prev) => {
      const next = prev.map((l, i) => (i === idx ? { ...l, waterG: g } : l));
      onPoursChange?.(next);
      return next;
    });
  };

  const addManualLap = () => {
    setLaps((prev) => {
      const next = [...prev, { label: lapLabel(prev.length, lang), seconds: 0, waterG: 0 }];
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

  // ── 계획 단계 편집 (시작 전, 예약 모드) ──────────────────────
  const updatePlannedStage = (idx, field, v) => {
    const num = Math.max(0, Number(v) || 0);
    setPlannedStages((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: num } : s)));
  };
  const addPlannedStage = () => {
    setPlannedStages((prev) => [...prev, { ...(prev[prev.length - 1] || { seconds: 30, waterG: 0 }) }]);
  };
  const removePlannedStage = (idx) => {
    setPlannedStages((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));
  };
  const fillEqualStages = (count, sec) => {
    setPlannedStages((prev) =>
      Array.from({ length: Math.max(1, count) }, (_, i) => ({ seconds: Math.max(1, sec), waterG: prev[i]?.waterG || 0 }))
    );
  };

  const runningTotal  = laps.reduce((s, l) => s + l.seconds, 0) + (phase === "running" ? elapsed : 0);
  const waterSoFar    = laps.reduce((s, l) => s + (l.waterG || 0), 0);
  const canEditMode   = phase === "idle" && laps.length === 0;
  const scheduleDone  = mode === "scheduled" && stagesFired >= plannedStages.length;
  const plannedTotal  = plannedStages.reduce((s, v) => s + v.seconds, 0);
  const plannedWaterTotal = plannedStages.reduce((s, v) => s + (v.waterG || 0), 0);
  const hasWater      = plannedStages.some((s) => s.waterG > 0) || laps.some((l) => l.waterG > 0);

  return (
    <div>
      {/* ── 시작 전 설정 영역: 모드 선택 + (예약모드) 단계별 계획 + 시작 버튼을
             한 블록으로 묶어서 스크롤 없이 바로 이어서 보이도록 구성 ── */}
      {canEditMode && (
        <div style={{ marginBottom: "10px" }}>
          <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
            {[
              { id: "manual",    lbl: lang === "en" ? "Manual (tap)"     : "수동 (직접 탭)" },
              { id: "scheduled", lbl: lang === "en" ? "Scheduled alerts" : "예약 알림" },
            ].map((m) => (
              <button key={m.id} type="button" onClick={() => setMode(m.id)}
                style={{
                  flex: 1, padding: "8px", borderRadius: "8px",
                  border: `1px solid ${mode === m.id ? "var(--espresso)" : "var(--steam)"}`,
                  background: mode === m.id ? "var(--espresso)" : "var(--foam)",
                  color: mode === m.id ? "var(--cream)" : "var(--muted)",
                  fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", fontWeight: mode === m.id ? 600 : 400,
                  cursor: "pointer", transition: "all 0.15s",
                }}>
                {m.lbl}
              </button>
            ))}
          </div>

          {mode === "scheduled" && (
            <div style={{ marginBottom: "8px", padding: "10px", background: "var(--cream)", borderRadius: "8px", border: "1px solid var(--divider)" }}>
              {/* 빠른 채우기 (모두 같은 간격으로) */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                <span style={{ fontSize: "0.66rem", color: "var(--muted)", fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap" }}>
                  {lang === "en" ? "Quick fill:" : "일괄 채우기:"}
                </span>
                <button type="button" onClick={() => fillEqualStages(4, 30)}
                  style={{ padding: "4px 10px", border: "1px solid var(--latte)", borderRadius: "999px", background: "#FDF6EF", color: "var(--latte)", fontFamily: "'DM Sans',sans-serif", fontSize: "0.7rem", cursor: "pointer" }}>
                  4 × 30s
                </button>
                <button type="button" onClick={() => fillEqualStages(3, 45)}
                  style={{ padding: "4px 10px", border: "1px solid var(--latte)", borderRadius: "999px", background: "#FDF6EF", color: "var(--latte)", fontFamily: "'DM Sans',sans-serif", fontSize: "0.7rem", cursor: "pointer" }}>
                  3 × 45s
                </button>
              </div>

              {/* 단계별 계획 리스트 (각 단계 시간 + 선택적 물량 편집) */}
              <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginBottom: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "0 2px" }}>
                  <span style={{ width: "44px", flexShrink: 0 }}/>
                  <span style={{ width: "64px", fontSize: "0.6rem", color: "var(--muted)", textAlign: "center", fontFamily: "'DM Sans',sans-serif" }}>{lang === "en" ? "sec" : "시간(초)"}</span>
                  <span style={{ width: "64px", fontSize: "0.6rem", color: "var(--muted)", textAlign: "center", fontFamily: "'DM Sans',sans-serif" }}>{lang === "en" ? "water(g, optional)" : "물량(g, 선택)"}</span>
                </div>
                {plannedStages.map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "0.72rem", color: "var(--muted)", fontFamily: "'DM Sans', sans-serif", width: "44px", flexShrink: 0 }}>
                      {lapLabel(i, lang)}
                    </span>
                    <input type="number" min="1" value={s.seconds}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => updatePlannedStage(i, "seconds", e.target.value)}
                      style={{ width: "64px", padding: "5px 7px", border: "1px solid var(--steam)", borderRadius: "6px", fontFamily: "'DM Sans', sans-serif", fontSize: "0.82rem", color: "var(--espresso)", outline: "none", boxSizing: "border-box", textAlign: "center" }}/>
                    <input type="number" min="0" placeholder="—" value={s.waterG || ""}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => updatePlannedStage(i, "waterG", e.target.value)}
                      style={{ width: "64px", padding: "5px 7px", border: "1px solid var(--steam)", borderRadius: "6px", fontFamily: "'DM Sans', sans-serif", fontSize: "0.82rem", color: "var(--espresso)", outline: "none", boxSizing: "border-box", textAlign: "center" }}/>
                    <button type="button" onClick={() => removePlannedStage(i)} disabled={plannedStages.length <= 1}
                      style={{ marginLeft: "auto", background: "none", border: "none", cursor: plannedStages.length <= 1 ? "not-allowed" : "pointer", color: "var(--muted)", fontSize: "0.9rem", padding: "0 4px", opacity: plannedStages.length <= 1 ? 0.3 : 1 }}
                      title={lang === "en" ? "Remove" : "삭제"}>×</button>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button type="button" onClick={addPlannedStage}
                  style={{ padding: "5px 12px", border: "1px dashed var(--steam)", borderRadius: "6px", background: "none", color: "var(--muted)", fontFamily: "'DM Sans',sans-serif", fontSize: "0.74rem", cursor: "pointer" }}>
                  {lang === "en" ? "+ Stage" : "+ 단계 추가"}
                </button>
                <span style={{ fontSize: "0.68rem", color: "var(--muted)", fontFamily: "'DM Sans',sans-serif", textAlign: "right" }}>
                  {lang === "en"
                    ? `${plannedStages.length} stages = ${fmtShort(plannedTotal)}${plannedWaterTotal > 0 ? ` · ${plannedWaterTotal}g` : ""}`
                    : `${plannedStages.length}단계 = ${fmtShort(plannedTotal)}${plannedWaterTotal > 0 ? ` · ${plannedWaterTotal}g` : ""}`}
                </span>
              </div>
            </div>
          )}

          {/* 시작 버튼 — 설정 바로 아래, 스크롤 없이 바로 보이는 위치 */}
          <div style={{ display: "flex", gap: "8px" }}>
            <button type="button" onClick={start}
              style={{ flex: 1, padding: "12px", border: "none", borderRadius: "10px", background: "#e67e22", color: "#fff", fontFamily: "'DM Sans',sans-serif", fontSize: "0.9rem", fontWeight: 700, cursor: "pointer" }}>
              {mode === "scheduled"
                ? (lang === "en" ? `Start (${plannedStages.length} stages)` : `시작 (${plannedStages.length}단계 계획대로)`)
                : (lang === "en" ? "Start (Bloom)" : "시작 (블룸)")}
            </button>
            <button type="button" onClick={addManualLap}
              style={{ padding: "12px 14px", border: "1px solid var(--steam)", borderRadius: "10px", background: "var(--foam)", color: "var(--muted)", fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem", cursor: "pointer", whiteSpace: "nowrap" }}>
              {lang === "en" ? "Log manually" : "완료 기록만 입력"}
            </button>
          </div>
        </div>
      )}

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

        {/* ── 예약 모드: 진행 중/완료 상태 = 단계별 알약(pill) 바 + TIME/WATER 패널 ── */}
        {mode === "scheduled" && (phase === "running" || phase === "done") ? (
          <>
            {/* 알약 바 */}
            <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "6px", marginBottom: "10px" }}>
              {plannedStages.map((s, i) => {
                const isDone    = i < stagesFired || phase === "done";
                const isCurrent = phase === "running" && i === stagesFired && !scheduleDone;
                return (
                  <div key={i} style={{
                    flex: "0 0 auto", minWidth: "62px", textAlign: "center", padding: "8px 6px", borderRadius: "10px",
                    background: isCurrent ? "var(--espresso)" : isDone ? "#eafaf1" : "var(--cream)",
                    border: `1px solid ${isCurrent ? "var(--espresso)" : isDone ? "#a9dfbf" : "var(--steam)"}`,
                    opacity: isCurrent || isDone ? 1 : 0.55,
                  }}>
                    <div style={{ fontSize: "0.7rem", fontWeight: 700, fontFamily: "'DM Sans',sans-serif", color: isCurrent ? "var(--cream)" : isDone ? "#27ae60" : "var(--muted)" }}>
                      {s.seconds}s
                    </div>
                    <div style={{ fontSize: "0.6rem", fontWeight: 600, fontFamily: "'DM Sans',sans-serif", marginTop: "2px", color: isCurrent ? "var(--cream)" : isDone ? "#27ae60" : "var(--muted)", whiteSpace: "nowrap" }}>
                      {isDone
                        ? "✓"
                        : lapLabel(i, lang).toUpperCase()}
                    </div>
                    {s.waterG > 0 && (
                      <div style={{ fontSize: "0.6rem", fontFamily: "'DM Sans',sans-serif", marginTop: "2px", color: isCurrent ? "#FDF6EF" : "#2980b9" }}>
                        +{s.waterG}g
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* TIME / WATER 큰 패널 */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
              <div style={{ flex: 1, textAlign: "center", padding: "10px 6px", background: "var(--cream)", borderRadius: "10px", border: "1px solid var(--divider)" }}>
                <div style={{ fontSize: "0.6rem", fontWeight: 700, color: "#e67e22", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "'DM Sans',sans-serif" }}>
                  {lang === "en" ? "Time" : "시간"}
                </div>
                <div style={{ fontSize: "1.7rem", fontWeight: 700, fontFamily: "'DM Sans',sans-serif", color: "var(--espresso)" }}>
                  {fmt(phase === "running" ? elapsed : 0)}
                </div>
                <div style={{ fontSize: "0.62rem", color: "var(--muted)", fontFamily: "'DM Sans',sans-serif" }}>
                  {lang === "en" ? `Total ${fmtShort(runningTotal)}` : `누적 ${fmtShort(runningTotal)}`}
                </div>
              </div>
              {hasWater && (
                <div style={{ flex: 1, textAlign: "center", padding: "10px 6px", background: "var(--cream)", borderRadius: "10px", border: "1px solid var(--divider)" }}>
                  <div style={{ fontSize: "0.6rem", fontWeight: 700, color: "#2980b9", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "'DM Sans',sans-serif" }}>
                    {lang === "en" ? "Water" : "물량"}
                  </div>
                  <div style={{ fontSize: "1.7rem", fontWeight: 700, fontFamily: "'DM Sans',sans-serif", color: "var(--espresso)" }}>
                    {waterSoFar}<span style={{ fontSize: "1rem" }}>g</span>
                  </div>
                  <div style={{ fontSize: "0.62rem", color: "var(--muted)", fontFamily: "'DM Sans',sans-serif" }}>
                    {!scheduleDone && plannedStages[stagesFired]?.waterG > 0
                      ? (lang === "en" ? `Step +${plannedStages[stagesFired].waterG}g` : `이번 단계 +${plannedStages[stagesFired].waterG}g`)
                      : (lang === "en" ? `Planned ${plannedWaterTotal}g` : `예상 ${plannedWaterTotal}g`)}
                  </div>
                </div>
              )}
            </div>

            {scheduleDone && phase === "running" && (
              <div style={{ textAlign: "center", fontSize: "0.68rem", color: "var(--espresso)", fontWeight: 600, fontFamily: "'DM Sans',sans-serif", marginBottom: "6px" }}>
                {lang === "en" ? "Schedule done — extra time running" : "예약 완료 — 추가 시간 진행 중"}
              </div>
            )}
          </>
        ) : (
          <>
            {/* ── 그 외(수동 모드 또는 idle): 기존 방식 ── */}
            <div style={{ textAlign: "center", marginBottom: "10px" }}>
              {phase === "idle" && laps.length === 0 && (
                <div style={{ fontSize: "2rem", fontFamily: "'DM Sans', sans-serif", fontWeight: 700, color: "var(--steam)" }}>
                  00
                </div>
              )}

              {phase === "running" && mode === "manual" && (
                <div>
                  <div style={{ fontSize: "0.65rem", color: "#e67e22", fontWeight: 600, fontFamily: "'DM Sans', sans-serif", marginBottom: "2px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {lapLabel(laps.length, lang)} {lang === "en" ? "pouring…" : "붓는 중…"}
                  </div>
                  <div className="timer-display running" style={{ color: "#e67e22" }}>
                    {fmtShort(elapsed)}
                  </div>
                  <div style={{ fontSize: "0.62rem", color: "var(--muted)", marginTop: "2px", fontFamily: "'DM Sans', sans-serif" }}>
                    {lang === "en" ? `Total ${fmtShort(runningTotal)}` : `누적 ${fmtShort(runningTotal)}`}
                  </div>
                </div>
              )}

              {phase === "done" && mode === "manual" && (
                <div>
                  <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginBottom: "2px", fontFamily: "'DM Sans', sans-serif" }}>
                    {laps.map((l) => `${l.label} ${fmtShort(l.seconds)}`).join(" + ") || (lang === "en" ? "No pours yet" : "기록된 물붓기 없음")}
                  </div>
                  <div style={{ fontSize: "2rem", fontFamily: "'DM Sans', sans-serif", fontWeight: 700, color: "var(--espresso)" }}>
                    {fmtShort(runningTotal)}
                    <span style={{ fontSize: "0.75rem", color: "var(--muted)", marginLeft: "4px" }}>
                      {lang === "en" ? "total" : "총"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 랩 리스트 (수동 모드 진행/완료 상태) */}
            {laps.length > 0 && mode === "manual" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginBottom: "10px" }}>
                {laps.map((l, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", background: "var(--cream)", borderRadius: "6px", padding: "5px 8px" }}>
                    <span style={{ fontSize: "0.72rem", color: "var(--muted)", fontFamily: "'DM Sans', sans-serif", width: "44px", flexShrink: 0 }}>
                      {l.label}
                    </span>
                    {phase === "running" ? (
                      <span style={{ fontSize: "0.78rem", color: "var(--espresso)", fontFamily: "'DM Sans', sans-serif" }}>{fmtShort(l.seconds)}s</span>
                    ) : (
                      <input type="number" min="0" value={l.seconds}
                        onFocus={(e) => e.target.select()}
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
          </>
        )}

        {/* 예약 모드 완료 시: 랩(단계)별 시간/물량 편집 리스트 */}
        {mode === "scheduled" && phase === "done" && laps.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginBottom: "10px" }}>
            {laps.map((l, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", background: "var(--cream)", borderRadius: "6px", padding: "5px 8px" }}>
                <span style={{ fontSize: "0.72rem", color: "var(--muted)", fontFamily: "'DM Sans', sans-serif", width: "44px", flexShrink: 0 }}>
                  {l.label}
                </span>
                <input type="number" min="0" value={l.seconds}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => updateLapSeconds(i, e.target.value)}
                  style={{ width: "50px", padding: "3px 6px", border: "1px solid var(--steam)", borderRadius: "5px", fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", color: "var(--espresso)", outline: "none", boxSizing: "border-box" }}/>
                <span style={{ fontSize: "0.68rem", color: "var(--muted)" }}>s</span>
                <input type="number" min="0" placeholder="—" value={l.waterG || ""}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => updateLapWater(i, e.target.value)}
                  style={{ width: "50px", padding: "3px 6px", border: "1px solid var(--steam)", borderRadius: "5px", fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", color: "var(--espresso)", outline: "none", boxSizing: "border-box" }}/>
                <span style={{ fontSize: "0.68rem", color: "var(--muted)" }}>g</span>
                <button type="button" onClick={() => removeLap(i)}
                  style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: "0.9rem", padding: "0 4px" }}
                  title={lang === "en" ? "Remove" : "삭제"}>×</button>
              </div>
            ))}
          </div>
        )}

        {/* 컨트롤 버튼 */}
        <div className="timer-btns">
          {phase === "running" && (
            <>
              {mode === "manual" && (
                <button type="button" className="timer-start" onClick={nextPour} style={{ background: "#27ae60" }}>
                  {lang === "en" ? "Next pour" : "다음 물붓기"}
                </button>
              )}
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
