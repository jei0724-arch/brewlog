/* ============================================================
   BREWLOG NOTE — src/components/ui/InstagramEmbed.jsx
   인스타그램 게시물 임베드 (2026.6 정책 변경으로 토큰/앱등록 불필요)
   ─ 레시피에 igUrl이 있으면 실제 인스타그램 카드를 그대로 렌더링
   ─ embed.js는 페이지당 한 번만 로드, 이후 새 게시물마다 process() 재호출
   ============================================================ */
import { useEffect, useRef } from "react";

let scriptPromise = null;
function loadEmbedScript() {
  if (window.instgrm?.Embeds) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve) => {
    const existing = document.querySelector('script[src*="instagram.com/embed.js"]');
    if (existing) { existing.addEventListener("load", resolve); return; }
    const script = document.createElement("script");
    script.src = "https://www.instagram.com/embed.js";
    script.async = true;
    script.onload = resolve;
    document.body.appendChild(script);
  });
  return scriptPromise;
}

export default function InstagramEmbed({ url }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    loadEmbedScript().then(() => {
      if (cancelled) return;
      // instgrm.Embeds.process()는 처리 안 된 blockquote만 골라서 iframe으로 치환함 (중복 호출해도 안전)
      window.instgrm?.Embeds?.process();
    });
    return () => { cancelled = true; };
  }, [url]);

  if (!url) return null;

  return (
    <div style={{ display: "flex", justifyContent: "center", margin: "0.8rem 0" }}>
      <blockquote
        ref={ref}
        className="instagram-media"
        data-instgrm-permalink={url}
        data-instgrm-version="14"
        style={{
          background: "#FFF", border: 0, borderRadius: "8px", margin: 0,
          maxWidth: "100%", minWidth: "280px", padding: 0, width: "100%",
        }}
      />
    </div>
  );
}
