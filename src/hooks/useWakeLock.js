/* ============================================================
   BREWLOG NOTE — src/hooks/useWakeLock.js
   타이머 진행 중 화면 자동 꺼짐 방지 (Screen Wake Lock API)
   ─ active가 true인 동안 화면 잠금(꺼짐)을 막음
   ─ 브라우저가 탭 전환/백그라운드 시 wake lock을 자동 해제하므로,
     다시 화면으로 돌아오면(visibilitychange) 재요청
   ─ Wake Lock API 미지원 브라우저(구형 iOS Safari 등)에서는 조용히 무시
     (화면이 꺼지는 것 외에 다른 기능에는 영향 없음)
   ============================================================ */
import { useRef, useCallback, useEffect } from "react";

export function useWakeLock(active) {
  const wakeLockRef = useRef(null);

  const requestWakeLock = useCallback(async () => {
    try {
      if ("wakeLock" in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
      }
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
