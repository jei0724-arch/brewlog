/* ============================================================
   BREWLOG NOTE — src/utils/translate.js
   레시피 텍스트 자동 번역 (한 → 영)
   ─ Gemini AI 재사용 (별도 API 비용 없음)
   ─ localStorage 영구 캐싱 (같은 문장 재번역 방지)
   ─ 한글 포함 여부 자동 감지 → 한글 없으면 번역 스킵
   ============================================================ */

const GEMINI_KEY = import.meta.env.VITE_GEMINI_KEY;

// ── 한글 포함 여부 검사 ──────────────────────────────────────
export function hasKorean(text) {
  if (!text) return false;
  return /[가-힣]/.test(text);
}

// ── 간단한 해시 (캐시 키용) ──────────────────────────────────
function hashText(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function cacheKey(text) {
  return `brewlog_translate_${hashText(text)}`;
}

// ── 재시도 헬퍼 (503 과부하 대응, 지수 백오프) ──────────────────
async function geminiWithRetry(url, body, signal, maxRetry = 2) {
  let lastErr;
  for (let i = 0; i < maxRetry; i++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal,
        body: JSON.stringify(body),
      });
      if (res.status === 503 && i < maxRetry - 1) {
        await new Promise(r => setTimeout(r, (2 ** i) * 1000));
        continue;
      }
      return res;
    } catch (e) {
      lastErr = e;
      if (e.name === "AbortError") throw e;
      if (i < maxRetry - 1) await new Promise(r => setTimeout(r, (2 ** i) * 1000));
    }
  }
  throw lastErr || new Error("translate fetch failed");
}

// ── 단일 텍스트 번역 (캐시 우선) ─────────────────────────────────
export async function translateText(text) {
  if (!text || !hasKorean(text)) return text;

  const key = cacheKey(text);
  try {
    const cached = localStorage.getItem(key);
    if (cached) return cached;
  } catch {}

  if (!GEMINI_KEY) return text; // 키 없으면 원문 반환

  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 10000);
    let res;
    try {
      res = await geminiWithRetry(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${GEMINI_KEY}`,
        {
          contents: [{ parts: [{
            text: `Translate the following Korean coffee-related text to natural English. Keep brand/model names as-is. Respond with ONLY the translated text, no quotes, no explanation:\n\n${text}`
          }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 256, thinkingConfig: { thinkingLevel: "minimal" } },
        },
        controller.signal
      );
    } finally { clearTimeout(tid); }

    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    const parts = data.candidates?.[0]?.content?.parts || [];
    const translated = (parts.find(p => !p.thought && p.text) || parts[0] || {}).text?.trim();

    if (translated) {
      try { localStorage.setItem(key, translated); } catch {}
      return translated;
    }
    return text;
  } catch (e) {
    console.warn("[translate]", e.message);
    return text; // 실패 시 원문 그대로
  }
}

// ── 여러 필드 한 번에 번역 (병렬 처리) ───────────────────────────
// fields: { key: text, ... } → { key: translatedText, ... }
export async function translateFields(fields) {
  const entries = Object.entries(fields).filter(([, v]) => hasKorean(v));
  if (entries.length === 0) return fields;

  const results = await Promise.all(
    entries.map(async ([key, text]) => [key, await translateText(text)])
  );

  const translatedMap = Object.fromEntries(results);
  return { ...fields, ...translatedMap };
}
