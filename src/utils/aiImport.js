/* ============================================================
   BREWLOG NOTE — src/utils/aiImport.js
   인스타그램 캡션 / 블로그 글 텍스트에서 레시피 정보를 추출해
   레시피 기록 폼에 자동으로 채워넣기 위한 Gemini 파싱 유틸
   ─ translate.js와 동일한 방식으로 Gemini API 직접 호출 (별도 백엔드 불필요)
   ─ 브라우저에서 인스타/블로그 원문을 직접 fetch하는 건 CORS로 막히므로,
     사용자가 캡션/본문 텍스트를 직접 붙여넣는 방식으로 구현
     (URL은 참고용으로만 별도 저장 — 인스타 링크는 기존 igUrl 필드 재사용)
   ============================================================ */

const GEMINI_KEY = import.meta.env.VITE_GEMINI_KEY;

const SCHEMA_HINT = `{
  "menuGuess": "espresso" | "ristretto" | "lungo" | "americano" | "long_black" | "latte" | "cappuccino" | "flatwhite" | "macchiato" | "hand_drip" | "cold_brew" | null,
  "bean": string | null,
  "company": string | null,
  "machine": string | null,
  "grinder": string | null,
  "grindSize": string | null,
  "gram": number | null,
  "seconds": number | null,
  "espressoMl": number | null,
  "waterTemp": number | null,
  "note": string | null,
  "tags": string[],
  "pourStages": [{ "time": number, "amount": number, "label": string }]
}`;

// ── 재시도 헬퍼 (503 과부하 대응, translate.js와 동일 패턴) ──────
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
        await new Promise((r) => setTimeout(r, 2 ** i * 1000));
        continue;
      }
      return res;
    } catch (e) {
      lastErr = e;
      if (e.name === "AbortError") throw e;
      if (i < maxRetry - 1) await new Promise((r) => setTimeout(r, 2 ** i * 1000));
    }
  }
  throw lastErr || new Error("gemini fetch failed");
}

/**
 * 인스타 캡션/블로그 본문 텍스트를 구조화된 레시피 정보로 파싱
 * @param {string} text - 사용자가 붙여넣은 원문 텍스트
 * @param {string} lang - "ko" | "en" (에러 메시지 언어용)
 * @returns {Promise<object>} 파싱된 필드 객체
 */
export async function parseRecipeFromText(text, lang = "ko") {
  const trimmed = (text || "").trim();
  if (!trimmed) return null;

  if (!GEMINI_KEY) {
    throw new Error(lang === "en" ? "AI import is not configured." : "AI 가져오기 기능이 설정되어 있지 않아요.");
  }

  const prompt =
    `다음은 커피 레시피에 대한 인스타그램 캡션 또는 블로그 글입니다. ` +
    `여기서 실제로 언급된 레시피 정보만 최대한 정확하게 추출해서, 오직 아래 JSON 스키마 형태로만 응답하세요. ` +
    `글에 없는 정보는 절대 추측하지 말고 null(배열은 빈 배열)로 두세요. ` +
    `JSON 앞뒤로 설명, 마크다운 코드블록(\`\`\`) 등 어떤 텍스트도 붙이지 마세요.\n\n` +
    `스키마:\n${SCHEMA_HINT}\n\n` +
    `참고: pourStages는 핸드드립처럼 "1차 30초 80ml, 2차 30초 100ml"식으로 구간별 기록이 명시된 경우에만 채우고, ` +
    `time은 그 구간 "자체의 길이(초)"입니다(누적 시간이 아님). 그 외 메뉴는 빈 배열로 두세요.\n\n` +
    `글:\n"""\n${trimmed}\n"""`;

  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), 15000);
  let res;
  try {
    res = await geminiWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${GEMINI_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 800, thinkingConfig: { thinkingLevel: "minimal" } },
      },
      controller.signal
    );
  } finally {
    clearTimeout(tid);
  }

  const data = await res.json();
  if (data.error) throw new Error(data.error.message);

  const parts = data.candidates?.[0]?.content?.parts || [];
  const raw = (parts.find((p) => !p.thought && p.text) || parts[0] || {}).text || "";
  const cleaned = raw.replace(/```json|```/g, "").trim();

  try {
    const parsed = JSON.parse(cleaned);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    throw new Error(
      lang === "en"
        ? "Couldn't understand the AI response. Please try again."
        : "AI 응답을 해석하지 못했어요. 다시 시도해주세요."
    );
  }
}
