/* ============================================================
   BREWLOG NOTE — src/hooks/useWakeLock.js
   타이머 진행 중 화면 자동 꺼짐 방지 (Screen Wake Lock API)
   ─ active가 true인 동안 화면 잠금(꺼짐)을 막음
   ─ 브라우저가 탭 전환/백그라운드 시 wake lock을 자동 해제하므로,
     다시 화면으로 돌아오면(visibilitychange) 재요청
   ─ 삼성 등 일부 Android 기기는 배터리 최적화로 OS가 임의로 wake lock을
     끊기도 하는데, 이 경우 sentinel의 'release' 이벤트가 발생하므로
     여전히 active면 즉시 재요청해서 최대한 버팀 (완전한 우회는 불가 —
     기기 배터리 설정에서 브라우저를 "제한 없음"으로 두는 게 근본 해결)
   ─ Wake Lock API 미지원 브라우저(구형 iOS Safari 등)에서는 조용히 무시
     (화면이 꺼지는 것 외에 다른 기능에는 영향 없음)
   ============================================================ */
import { useRef, useCallback, useEffect } from "react";

export function useWakeLock(active) {
  const wakeLockRef = useRef(null);
  const activeRef   = useRef(active);
  useEffect(() => { activeRef.current = active; }, [active]);

  const requestWakeLock = useCallback(async () => {
    try {
      if (!("wakeLock" in navigator)) return;
      const sentinel = await navigator.wakeLock.request("screen");
      wakeLockRef.current = sentinel;
      // OS/브라우저가 임의로 해제한 경우(배터리 최적화 등) — 여전히 켜져 있어야 하면 즉시 재요청
      sentinel.addEventListener("release", () => {
        if (wakeLockRef.current === sentinel) wakeLockRef.current = null;
        if (activeRef.current) requestWakeLock();
      });
    } catch (e) {
      // 권한 거부, 미지원 등 — 화면이 꺼질 수 있다는 것 외엔 앱 동작에 영향 없으므로 조용히 무시
      console.warn("[useWakeLock] 요청 실패:", e?.message);
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    try { await wakeLockRef.current?.release(); } catch {}
    wakeLockRef.current = null;
  }, []);

  useEffect(() => {
    if (active) requestWakeLock();
    else releaseWakeLock();
  }, [active, requestWakeLock, releaseWakeLock]);

  // 탭을 껐다가 다시 돌아왔을 때(visibilitychange) — 브라우저가 자동으로
  // wake lock을 해제하므로, 여전히 타이머가 진행 중이면 다시 요청
  useEffect(() => {
    const onVisibility = () => {
      if (active && document.visibilityState === "visible") requestWakeLock();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [active, requestWakeLock]);

  // 언마운트 시 반드시 해제
  useEffect(() => () => { releaseWakeLock(); }, [releaseWakeLock]);
}
