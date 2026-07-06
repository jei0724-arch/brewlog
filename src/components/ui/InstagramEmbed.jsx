/* ============================================================
   BREWLOG NOTE — src/components/ui/InstagramEmbed.jsx
   인스타그램 게시물 표시 — 사진/릴스만 (프로필·좋아요·캡션 등 제외)
   ─ Instagram oEmbed API의 thumbnail_url 필드로 썸네일만 가져옴
     (2026.6 정책 변경으로 토큰/앱등록 불필요)
   ─ 공식 정책상 이미지만 쓸 경우 원작자 표시 + 원문 링크 필수 →
     하단에 작게 "@작성자 · Instagram" 오버레이로 표시
   ─ API 실패 시(네트워크 등) 공식 전체 카드 임베드(embed.js)로 자동 대체
   ============================================================ */
import { useState, useEffect } from "react";

const OEMBED_URL = "https://graph.facebook.com/v25.0/instagram_oembed";

// ── 실패 시 폴백 — 공식 전체 카드 임베드 (기존 방식) ──────────────
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

function FullCardEmbed({ url }) {
  useEffect(() => {
    let cancelled = false;
    loadEmbedScript().then(() => { if (!cancelled) window.instgrm?.Embeds?.process(); });
    return () => { cancelled = true; };
  }, [url]);

  return (
    <div style={{ display: "flex", justifyContent: "center", margin: "0.8rem 0" }}>
      <blockquote className="instagram-media" data-instgrm-permalink={url} data-instgrm-version="14"
        style={{ background: "#FFF", border: 0, borderRadius: "8px", margin: 0, maxWidth: "100%", minWidth: "280px", padding: 0, width: "100%" }} />
    </div>
  );
}

// ── 메인 — 사진/릴스 썸네일만 우선 시도 ──────────────────────────
export default function InstagramEmbed({ url }) {
  const [thumb, setThumb] = useState(null); // { thumbnail_url, author_name }
  const [status, setStatus] = useState("loading"); // loading | ok | fallback

  useEffect(() => {
    if (!url) return;
    setThumb(null);
    setStatus("loading");
    const controller = new AbortController();

    fetch(`${OEMBED_URL}?url=${encodeURIComponent(url)}&fields=thumbnail_url,author_name&omitscript=true`, { signal: controller.signal })
      .then(res => { if (!res.ok) throw new Error("oembed failed"); return res.json(); })
      .then(json => {
        if (json?.thumbnail_url) { setThumb(json); setStatus("ok"); }
        else setStatus("fallback");
      })
      .catch(() => setStatus("fallback"));

    return () => controller.abort();
  }, [url]);

  if (!url) return null;

  if (status === "fallback") return <FullCardEmbed url={url} />;

  if (status === "ok" && thumb) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer"
        style={{ display: "block", margin: "0.8rem 0", borderRadius: "10px", overflow: "hidden", position: "relative", background: "var(--steam)" }}>
        <img src={thumb.thumbnail_url} alt="Instagram post" style={{ width: "100%", display: "block" }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "8px 10px", background: "linear-gradient(transparent, rgba(0,0,0,0.6))", display: "flex", alignItems: "center", gap: "5px" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="5" stroke="#fff" strokeWidth="1.8"/><circle cx="12" cy="12" r="4" stroke="#fff" strokeWidth="1.8"/><circle cx="17.5" cy="6.5" r="1.1" fill="#fff"/></svg>
          <span style={{ color: "#fff", fontSize: "0.72rem", fontFamily: "'DM Sans',sans-serif", fontWeight: 600 }}>
            {thumb.author_name ? `@${thumb.author_name}` : "Instagram"}
          </span>
        </div>
      </a>
    );
  }

  // 로딩 중 — 자리 차지하는 스켈레톤
  return <div style={{ margin: "0.8rem 0", borderRadius: "10px", background: "var(--steam)", aspectRatio: "1/1", opacity: 0.4 }} />;
}
