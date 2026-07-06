/* ============================================================
   BREWLOG NOTE — src/components/ui/InstagramEmbed.jsx
   인스타그램 게시물 임베드 (공식 embed.js 위젯, 토큰 불필요)
   ─ 전체 카드(사진+캡션+좋아요 등) 형태로 표시됨
   ─ "사진만" 표시하려면 Meta 개발자 앱(액세스 토큰) 필요 — 추후 고려
   ============================================================ */
import { useEffect } from "react";

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
  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    loadEmbedScript().then(() => {
      if (!cancelled) window.instgrm?.Embeds?.process();
    });
    return () => { cancelled = true; };
  }, [url]);

  if (!url) return null;

  return (
    <div style={{ display: "flex", justifyContent: "center", margin: "0.8rem 0" }}>
      <blockquote
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
