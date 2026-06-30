/* ============================================================
   BREWLOG NOTE — src/components/modals/CompareModal.jsx
   레시피 A vs B 수치 비교 + Flavor 레이더 오버레이 + 공유 카드 생성
   ─ html2canvas 동적 import (번들 사이즈 최적화)
   ─ navigator.share → Web Share API / 폴백: 파일 다운로드
   ─ QR 코드는 api.qrserver.com CDN 사용
   ============================================================ */
import { useState } from "react";
import { I18N } from "../../constants/localization";

// ── 비교 수치 필드 정의 ────────────────────────────────────────
const FIELDS = [
  { key: "gram",       label: "원두량",   unit: "g"  },
  { key: "seconds",    label: "추출시간", unit: "s"  },
  { key: "espressoMl", label: "추출량",   unit: "ml" },
  { key: "waterTemp",  label: "물온도",   unit: "°C" },
  { key: "grindSize",  label: "분쇄도",   unit: ""   },
  { key: "diluteMl",   label: "희석량",   unit: "ml" },
];

// ── Flavor 레이더 축 ───────────────────────────────────────────
const FLAVOR_KEYS   = ["Acidity", "Sweet", "Bitter", "Aroma", "Aftertaste", "Balance", "Body"];
const FLAVOR_LABELS = {
  Acidity: "산미", Sweet: "단맛", Bitter: "쓴맛",
  Aroma: "아로마", Aftertaste: "후미", Balance: "밸런스", Body: "바디",
};

// ── 수치 방향 비교 ─────────────────────────────────────────────
function diff(a, b) {
  const na = parseFloat(a), nb = parseFloat(b);
  if (isNaN(na) || isNaN(nb) || na === nb) return null;
  return na > nb ? "up" : "down";
}

// ── 레시피 선택 칩 ────────────────────────────────────────────
function RecipeChip({ r, recipeA, selectedId, onSelect }) {
  const isSelected = selectedId === r.id;
  const isSameBean = (r.bean || "").toLowerCase() === (recipeA.bean || "").toLowerCase() && r.bean;

  return (
    <button
      type="button"
      onClick={() => onSelect(r.id)}
      style={{
        border: "1px solid",
        borderRadius: "10px",
        cursor: "pointer",
        transition: "all 0.15s",
        textAlign: "left",
        padding: "10px 12px",
        width: "100%",
        borderColor: isSelected ? "var(--espresso)" : "var(--divider)",
        background:  isSelected ? "var(--espresso)" : "var(--foam)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "6px" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "2px" }}>
            <span style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "0.9rem",
              fontWeight: 700,
              color: isSelected ? "var(--cream)" : "var(--espresso)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}>
              {r.bean || "—"}
            </span>
            {isSameBean && !isSelected && (
              <span style={{
                fontSize: "0.6rem", padding: "1px 5px", borderRadius: "4px",
                background: "var(--latte)20", color: "var(--latte)", fontWeight: 700, flexShrink: 0,
              }}>
                같은원두
              </span>
            )}
          </div>
          <div style={{
            fontSize: "0.7rem",
            color: isSelected ? "rgba(255,255,255,0.7)" : "var(--muted)",
            display: "flex", flexWrap: "wrap", gap: "4px",
          }}>
            {r.company  && <span>{r.company}</span>}
            {r.menuLabel && <span>· {r.menuLabel}{r.isIced ? " · ICE" : ""}</span>}
            {r.author    && <span>· @{r.author}</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: "4px", flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {r.gram       && <Chip val={r.gram}       unit="g"  isSelected={isSelected}/>}
          {r.seconds    && <Chip val={r.seconds}    unit="s"  isSelected={isSelected}/>}
          {r.espressoMl && <Chip val={r.espressoMl} unit="ml" isSelected={isSelected}/>}
        </div>
      </div>
    </button>
  );
}

function Chip({ val, unit, isSelected }) {
  return (
    <span style={{
      fontSize: "0.65rem", padding: "2px 5px", borderRadius: "4px",
      background: isSelected ? "rgba(255,255,255,0.2)" : "var(--cream)",
      color:      isSelected ? "var(--cream)"          : "var(--muted)",
    }}>
      {val}{unit}
    </span>
  );
}

// ── 인라인 Flavor 레이더 SVG (React 렌더) ────────────────────
function FlavorOverlay({ recipeA, recipeB }) {
  const SIZE = 260, cx = 130, cy = 130, R = 90, n = FLAVOR_KEYS.length;

  const pt = (i, r) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };

  const grid = [1, 2, 3, 4, 5].map((l) => {
    const r   = R * l / 5;
    const pts = FLAVOR_KEYS.map((_, i) => pt(i, r).join(",")).join(" ");
    return (
      <polygon
        key={l}
        points={pts}
        fill={l % 2 === 0 ? "#F5F3F0" : "none"}
        stroke={l === 5 ? "#D5CFC8" : "#E8E4DF"}
        strokeWidth={l === 5 ? 1.2 : 0.7}
      />
    );
  });

  const axes = FLAVOR_KEYS.map((_, i) => {
    const [x, y] = pt(i, R);
    return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#DDD9D3" strokeWidth="0.8"/>;
  });

  const aVals = FLAVOR_KEYS.map((k) => (parseInt(recipeA[`flavor${k}`]) || 0) / 5);
  const bVals = FLAVOR_KEYS.map((k) => (parseInt(recipeB[`flavor${k}`]) || 0) / 5);
  const aPts  = FLAVOR_KEYS.map((_, i) => pt(i, Math.max(aVals[i], 0.04) * R).join(",")).join(" ");
  const bPts  = FLAVOR_KEYS.map((_, i) => pt(i, Math.max(bVals[i], 0.04) * R).join(",")).join(" ");

  const lbls = FLAVOR_KEYS.map((k, i) => {
    const [x, y] = pt(i, R + 20);
    const anchor = x < cx - 8 ? "end" : x > cx + 8 ? "start" : "middle";
    return (
      <text key={k} x={x} y={y} textAnchor={anchor} dominantBaseline="middle"
        fontSize="9.5" fill="#8C8480" fontFamily="DM Sans,sans-serif">
        {FLAVOR_LABELS[k]}
      </text>
    );
  });

  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ display: "block", margin: "0 auto" }}>
      {grid}
      {axes}
      <polygon points={aPts} fill="var(--latte)" fillOpacity="0.18" stroke="var(--latte)" strokeWidth="2" strokeLinejoin="round"/>
      <polygon points={bPts} fill="#2980b9"       fillOpacity="0.15" stroke="#2980b9"       strokeWidth="2" strokeLinejoin="round"/>
      {FLAVOR_KEYS.map((k, i) => {
        const [ax, ay] = pt(i, aVals[i] * R);
        const [bx, by] = pt(i, bVals[i] * R);
        return (
          <g key={k}>
            {aVals[i] > 0 && <circle cx={ax} cy={ay} r="3.5" fill="var(--latte)" stroke="white" strokeWidth="1.2"/>}
            {bVals[i] > 0 && <circle cx={bx} cy={by} r="3.5" fill="#2980b9"       stroke="white" strokeWidth="1.2"/>}
          </g>
        );
      })}
      {lbls}
    </svg>
  );
}

// ── 공유 카드 생성 + 저장/공유 ────────────────────────────────
async function shareCompareCard(recipeA, recipeB) {
  const html2canvas = (await import("html2canvas")).default;

  const diffVal = (a, b) => {
    const na = parseFloat(a), nb = parseFloat(b);
    if (isNaN(na) || isNaN(nb) || na === nb) return null;
    return na > nb
      ? { dir: "up",   delta: Math.abs(na - nb) }
      : { dir: "down", delta: Math.abs(na - nb) };
  };

  // ── Flavor 레이더 SVG 문자열 ────────────────────────────────
  const hasRadar = FLAVOR_KEYS.some(
    (k) => recipeA[`flavor${k}`] > 0 || recipeB[`flavor${k}`] > 0
  );
  const radarSVG = (() => {
    if (!hasRadar) return "";
    const PAD = 44, LPAD = 42, R = 90, cx = 140, cy = 140;
    const n   = FLAVOR_KEYS.length;
    const pt  = (i, r) => {
      const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
      return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    };

    const gridLines = [1, 2, 3, 4, 5].map((l) => {
      const r   = R * l / 5;
      const pts = FLAVOR_KEYS.map((_, i) => pt(i, r).join(",")).join(" ");
      return `<polygon points="${pts}" fill="${l % 2 === 0 ? "#F5F3F0" : "none"}" stroke="${l === 5 ? "#D5CFC8" : "#E8E4DF"}" stroke-width="${l === 5 ? 1.2 : 0.7}"/>`;
    }).join("");

    const axes = FLAVOR_KEYS.map((_, i) => {
      const [x, y] = pt(i, R);
      return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#DDD9D3" stroke-width="0.8"/>`;
    }).join("");

    const aVals = FLAVOR_KEYS.map((k) => (parseInt(recipeA[`flavor${k}`]) || 0) / 5);
    const bVals = FLAVOR_KEYS.map((k) => (parseInt(recipeB[`flavor${k}`]) || 0) / 5);
    const aPts  = FLAVOR_KEYS.map((_, i) => pt(i, Math.max(aVals[i], 0.04) * R).join(",")).join(" ");
    const bPts  = FLAVOR_KEYS.map((_, i) => pt(i, Math.max(bVals[i], 0.04) * R).join(",")).join(" ");

    const dots = FLAVOR_KEYS.map((k, i) => {
      const [ax, ay] = pt(i, aVals[i] * R);
      const [bx, by] = pt(i, bVals[i] * R);
      return (aVals[i] > 0 ? `<circle cx="${ax}" cy="${ay}" r="4" fill="#B07D54" stroke="white" stroke-width="1.2"/>` : "")
           + (bVals[i] > 0 ? `<circle cx="${bx}" cy="${by}" r="4" fill="#2980b9" stroke="white" stroke-width="1.2"/>` : "");
    }).join("");

    const labels = FLAVOR_KEYS.map((k, i) => {
      const [x, y]   = pt(i, R + PAD);
      const isLeft   = x < cx - 10;
      const isRight  = x > cx + 10;
      const anchor   = isLeft ? "end" : isRight ? "start" : "middle";
      const baseline = y < cy - 10 ? "auto" : y > cy + 10 ? "hanging" : "middle";
      return `<text x="${x}" y="${y}" text-anchor="${anchor}" dominant-baseline="${baseline}" font-size="11" fill="#8C8480" font-family="DM Sans,sans-serif">${FLAVOR_LABELS[k]}</text>`;
    }).join("");

    const vbX = cx - R - PAD - LPAD;
    const vbY = cy - R - PAD - 14;
    const vbW = (R + PAD + 10) * 2 + LPAD;
    const vbH = (R + PAD + 14) * 2;
    const svgW = cx * 2 + LPAD;
    const svgH = cy * 2;

    return `<svg width="${svgW}" height="${svgH}" viewBox="${vbX} ${vbY} ${vbW} ${vbH}" xmlns="http://www.w3.org/2000/svg">
      ${gridLines}${axes}
      <polygon points="${aPts}" fill="#B07D54" fill-opacity="0.18" stroke="#B07D54" stroke-width="2" stroke-linejoin="round"/>
      <polygon points="${bPts}" fill="#2980b9" fill-opacity="0.15" stroke="#2980b9" stroke-width="2" stroke-linejoin="round"/>
      ${dots}${labels}
    </svg>`;
  })();

  // ── 공유 카드 HTML 생성 ──────────────────────────────────────
  const WATER_LABELS = { tap:"수돗물", filter:"정수기", bottle:"생수", other:"기타" };
  const ROAST_NAMES  = {
    green:"생두", cinnamon:"시나몬", medium:"미디엄", high:"하이",
    city:"시티", full_city:"풀 시티", french:"프렌치", italian:"이탈리안",
  };

  // 레시피별 전체 정보 행 빌더
  const buildInfoRows = (ra, rb, colorA, colorB) => {
    const ALL_FIELDS = [
      { key:"gram",        label:"원두량",    unit:"g"  },
      { key:"seconds",     label:"추출시간",  unit:"s"  },
      { key:"espressoMl",  label:"추출량",    unit:"ml" },
      { key:"waterTemp",   label:"물온도",    unit:"°C" },
      { key:"grindSize",   label:"분쇄도",    unit:""   },
      { key:"diluteMl",    label:"희석량",    unit:"ml" },
      { key:"infusionSeconds", label:"인퓨전", unit:"s", skip0:true },
      { key:"brewPressureBar", label:"추출압력", unit:"bar" },
    ];

    // 머신 / 그라인더 / 원두 정보
    const metaRow = (label, va, vb) => {
      if (!va && !vb) return "";
      const d = va !== vb && va && vb;
      return `<tr style="border-top:1px solid #F0EFEF;">
        <td style="width:44%;padding:8px 12px 8px 18px;font-size:11px;color:${va?colorA:"#BBB"};text-align:right;word-break:break-all;">${va||"—"}</td>
        <td style="width:12%;padding:8px 4px;text-align:center;">
          <div style="font-size:8px;color:#BBB;margin-bottom:2px;white-space:nowrap;">${label}</div>
          <div style="font-size:9px;color:${d?"#e67e22":"#DDD"};">${d?"≠":"＝"}</div>
        </td>
        <td style="width:44%;padding:8px 18px 8px 12px;font-size:11px;color:${vb?colorB:"#BBB"};text-align:left;word-break:break-all;">${vb||"—"}</td>
      </tr>`;
    };

    const numRows = ALL_FIELDS.map(f => {
      const av = ra[f.key], bv = rb[f.key];
      if (f.skip0 && (!av || parseInt(av)===0) && (!bv || parseInt(bv)===0)) return "";
      if (!av && !bv) return "";
      const na = parseFloat(av), nb = parseFloat(bv);
      const d  = (!isNaN(na) && !isNaN(nb) && na !== nb) ? (na > nb ? "up" : "down") : null;
      const aC = d==="up"   ? colorA : "#8C8480";
      const bC = d==="down" ? colorB : "#8C8480";
      const aW = d==="up"   ? "700"  : "400";
      const bW = d==="down" ? "700"  : "400";
      const mid = d
        ? `<div style="font-size:9px;font-weight:700;color:${d==="up"?"#27ae60":"#e67e22"};">${d==="up"?"▲":"▼"} ${Math.abs(na-nb)}${f.unit}</div>`
        : `<div style="font-size:10px;color:#DDD;">＝</div>`;
      return `<tr style="border-top:1px solid #F0EFEF;">
        <td style="width:44%;padding:9px 12px 9px 18px;font-size:13px;font-weight:${aW};color:${aC};text-align:right;">${av?`${av}${f.unit}`:"—"}</td>
        <td style="width:12%;padding:9px 4px;text-align:center;">
          <div style="font-size:8px;color:#BBB;margin-bottom:2px;white-space:nowrap;">${f.label}</div>
          ${mid}
        </td>
        <td style="width:44%;padding:9px 18px 9px 12px;font-size:13px;font-weight:${bW};color:${bC};text-align:left;">${bv?`${bv}${f.unit}`:"—"}</td>
      </tr>`;
    }).join("");

    // 희석 타입
    const diluteA = ra.diluteType === "기타우유" ? (ra.diluteCustom||"기타") : ra.diluteType;
    const diluteB = rb.diluteType === "기타우유" ? (rb.diluteCustom||"기타") : rb.diluteType;

    // 물 종류
    const waterA = ra.waterType ? [WATER_LABELS[ra.waterType]||ra.waterType, ra.waterBrand].filter(Boolean).join(" ") : "";
    const waterB = rb.waterType ? [WATER_LABELS[rb.waterType]||rb.waterType, rb.waterBrand].filter(Boolean).join(" ") : "";

    return numRows
      + metaRow("머신",    ra.machine,  rb.machine)
      + metaRow("그라인더", ra.grinder,  rb.grinder)
      + metaRow("분쇄도",  ra.grindSize, rb.grindSize)
      + metaRow("물 종류", waterA,       waterB)
      + metaRow("희석",    diluteA&&ra.diluteMl?`${diluteA} ${ra.diluteMl}ml`:"", diluteB&&rb.diluteMl?`${diluteB} ${rb.diluteMl}ml`:"")
      + metaRow("배전도",  ra.roastLevel?ROAST_NAMES[ra.roastLevel]||ra.roastLevel:"", rb.roastLevel?ROAST_NAMES[rb.roastLevel]||rb.roastLevel:"")
      + metaRow("가공법",  ra.process,   rb.process)
      + metaRow("로스팅일", ra.roastDate, rb.roastDate)
      + metaRow("기록일",  ra.recordDate, rb.recordDate);
  };

  const infoRows = buildInfoRows(recipeA, recipeB, "#B07D54", "#2980b9");

  // 별점 HTML
  const starsHtml = (recipe, color) => recipe.rating > 0
    ? [1,2,3,4,5].map(s => `<span style="color:${s<=recipe.rating?color:"#E8E6E3"};font-size:12px;">${s<=recipe.rating?"★":"☆"}</span>`).join("")
    : "";

  // 메모 HTML
  const noteRow = (ra, rb) => {
    if (!ra.note && !rb.note) return "";
    return `<tr style="border-top:1px solid #F0EFEF;">
      <td style="padding:10px 12px 10px 18px;font-size:10px;color:#8C8480;font-style:italic;text-align:right;vertical-align:top;">${ra.note?`"${ra.note}"`:""}</td>
      <td style="padding:10px 4px;text-align:center;"><div style="font-size:8px;color:#BBB;">메모</div></td>
      <td style="padding:10px 18px 10px 12px;font-size:10px;color:#8C8480;font-style:italic;text-align:left;vertical-align:top;">${rb.note?`"${rb.note}"`:""}</td>
    </tr>`;
  };

  // 날씨 HTML
  const weatherRow = (ra, rb) => {
    if (!ra.weather && !rb.weather) return "";
    const wa = ra.weather ? `${ra.weather.icon||""} ${ra.weather.temp||""}°C` : "";
    const wb = rb.weather ? `${rb.weather.icon||""} ${rb.weather.temp||""}°C` : "";
    return `<tr style="border-top:1px solid #F0EFEF;">
      <td style="padding:8px 12px 8px 18px;font-size:11px;color:#8C8480;text-align:right;">${wa||"—"}</td>
      <td style="padding:8px 4px;text-align:center;"><div style="font-size:8px;color:#BBB;">날씨</div></td>
      <td style="padding:8px 18px 8px 12px;font-size:11px;color:#8C8480;text-align:left;">${wb||"—"}</td>
    </tr>`;
  };

  // ── DOM 엘리먼트 조립 ────────────────────────────────────────
  const el = document.createElement("div");
  el.style.cssText =
    "position:absolute;left:-9999px;top:0;font-family:'DM Sans',Arial,sans-serif;width:920px;overflow:hidden;background:#FBFBFA;border-radius:32px;box-sizing:border-box;";

  el.innerHTML = `
    <!-- 헤더 -->
    <div style="background:#1A1614;padding:18px 20px 16px;border-radius:16px 16px 0 0;box-sizing:border-box;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
        <svg width="16" height="16" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="9" cy="9" r="8" stroke="#FBFBFA" stroke-width="1.5"/>
          <path d="M5 9.5c1-2 3-3 4-2s3 3 4 1" stroke="#B07D54" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <span style="font-size:11px;color:#FBFBFA80;letter-spacing:0.12em;text-transform:uppercase;font-weight:600;">Brewlog Note — Recipe Compare</span>
      </div>
      <!-- 레시피 A / B 헤더 -->
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="width:45%;vertical-align:top;">
            <div style="font-size:9px;font-weight:700;color:#B07D54;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px;">A</div>
            <div style="font-size:15px;font-weight:700;color:#FBFBFA;font-family:'Georgia',serif;line-height:1.3;margin-bottom:3px;">${recipeA.bean||"—"}</div>
            <div style="font-size:9px;color:#FBFBFA60;line-height:1.5;">${[recipeA.company, recipeA.menuLabel, `@${recipeA.author}`].filter(Boolean).join(" · ")}</div>
            ${recipeA.rating>0?`<div style="margin-top:5px;">${starsHtml(recipeA,"#B07D54")}</div>`:""}
          </td>
          <td style="width:10%;text-align:center;vertical-align:middle;">
            <div style="font-size:12px;font-weight:900;color:#666;">vs</div>
          </td>
          <td style="width:45%;vertical-align:top;">
            <div style="font-size:9px;font-weight:700;color:#2980b9;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px;">B</div>
            <div style="font-size:15px;font-weight:700;color:#FBFBFA;font-family:'Georgia',serif;line-height:1.3;margin-bottom:3px;">${recipeB.bean||"—"}</div>
            <div style="font-size:9px;color:#FBFBFA60;line-height:1.5;">${[recipeB.company, recipeB.menuLabel, `@${recipeB.author}`].filter(Boolean).join(" · ")}</div>
            ${recipeB.rating>0?`<div style="margin-top:5px;">${starsHtml(recipeB,"#2980b9")}</div>`:""}
          </td>
        </tr>
      </table>
    </div>

    <!-- 컬럼 레이블 -->
    <table style="width:100%;border-collapse:collapse;background:#ECEAE7;table-layout:fixed;">
      <tr>
        <td style="width:44%;padding:6px 12px 6px 18px;font-size:9px;font-weight:700;color:#B07D54;text-align:right;">레시피 A</td>
        <td style="width:12%;"></td>
        <td style="width:44%;padding:6px 18px 6px 12px;font-size:9px;font-weight:700;color:#2980b9;text-align:left;">레시피 B</td>
      </tr>
    </table>

    <!-- 전체 수치 + 장비 + 메타 비교 -->
    <table style="width:100%;border-collapse:collapse;background:#FAFAF9;table-layout:fixed;">
      ${infoRows}
      ${noteRow(recipeA, recipeB)}
      ${weatherRow(recipeA, recipeB)}
    </table>

    <!-- 플레이버 레이더 -->
    ${hasRadar ? `
    <div style="background:#FAFAF9;padding:16px 0 8px;border-top:1px solid #ECEAE7;">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:4px;padding:0 20px;">
        <span style="font-size:9px;font-weight:700;color:#BBB;text-transform:uppercase;letter-spacing:0.1em;">Flavor</span>
        <span style="display:flex;align-items:center;gap:5px;"><span style="width:14px;height:3px;background:#B07D54;display:inline-block;border-radius:2px;"></span><span style="font-size:9px;color:#AAA;">A</span></span>
        <span style="display:flex;align-items:center;gap:5px;"><span style="width:14px;height:3px;background:#2980b9;display:inline-block;border-radius:2px;"></span><span style="font-size:9px;color:#AAA;">B</span></span>
      </div>
      <div style="width:100%;display:flex;justify-content:center;overflow:visible;">${radarSVG}</div>
    </div>` : ""}

    <!-- 푸터 -->
    <div style="background:#ECEAE7;padding:10px 20px;border-radius:0 0 16px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;">
      <div style="display:flex;flex-direction:column;gap:2px;">
        <span style="font-size:9px;font-weight:700;color:#5C4033;letter-spacing:0.08em;text-transform:uppercase;">Brewlog Note</span>
        <span style="font-size:9px;color:#8C8480;">brewlog-jade.vercel.app</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <div style="display:flex;flex-direction:column;align-items:center;gap:3px;">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=52x52&data=https://brewlog-jade.vercel.app/landing.html&bgcolor=ECEAE7&color=3D2B1F&margin=2"
            width="52" height="52" style="border-radius:4px;display:block;" crossorigin="anonymous"/>
          <span style="font-size:7px;color:#B07D54;letter-spacing:0.06em;font-weight:600;">SCAN TO BREW</span>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(el);
  // QR 이미지 로드 대기
  await new Promise((r) => setTimeout(r, 900));

  const canvas = await html2canvas(el, {
    scale: 3, useCORS: true, allowTaint: false,
    backgroundColor: "#FBFBFA", logging: false,
  });
  document.body.removeChild(el);

  const blob     = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  const fileName = `${recipeA.bean || "A"}_vs_${recipeB.bean || "B"}_brewlog.png`;
  const file     = new File([blob], fileName, { type: "image/png" });

  // Web Share API — 파일 공유 지원 여부 확인 후 폴백
  const canWebShare = typeof navigator.share === "function"
    && typeof navigator.canShare === "function"
    && navigator.canShare({ files: [file] });

  if (canWebShare) {
    try {
      await navigator.share({
        files: [file],
        title: "레시피 비교",
        text:  "Brewlog Note 레시피 비교 결과예요.\nhttps://brewlog-jade.vercel.app",
      });
      return;
    } catch (e) {
      if (e.name === "AbortError") return; // 사용자가 취소
      // Web Share 실패 시 다운로드로 폴백
    }
  }
  // 폴백: 파일 다운로드
  const a  = document.createElement("a");
  a.href   = URL.createObjectURL(blob);
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// ─────────────────────────────────────────────────────────────────
export default function CompareModal({ targetRecipe, myRecipes, onClose, lang = "ko" }) {
  const [selectedId, setSelectedId] = useState(null);
  const [search,     setSearch]     = useState("");
  const [sortBy,     setSortBy]     = useState("recent");
  const [sharing,    setSharing]    = useState(false);

  const recipeA = targetRecipe;
  const recipeB = myRecipes.find((r) => r.id === selectedId) || null;

  const SORT_OPTIONS = [
    { id: "recent",   label: "최신순" },
    { id: "popular",  label: "인기순" },
    { id: "sameBean", label: "동일 원두" },
    { id: "mine",     label: "내 레시피" },
  ];

  // 검색 필터
  const searched = myRecipes.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (r.bean      || "").toLowerCase().includes(q) ||
      (r.menuLabel || "").toLowerCase().includes(q) ||
      (r.company   || "").toLowerCase().includes(q) ||
      (r.author    || "").toLowerCase().includes(q)
    );
  });

  // 정렬
  const filteredList = [...searched].sort((a, b) => {
    if (sortBy === "recent")   return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
    if (sortBy === "popular")  return (b.likedBy || []).length - (a.likedBy || []).length;
    if (sortBy === "sameBean") {
      const aM = (a.bean || "").toLowerCase() === (recipeA.bean || "").toLowerCase() ? 1 : 0;
      const bM = (b.bean || "").toLowerCase() === (recipeA.bean || "").toLowerCase() ? 1 : 0;
      return bM - aM;
    }
    if (sortBy === "mine") {
      const aM = a.uid === recipeA.uid ? 1 : 0;
      const bM = b.uid === recipeA.uid ? 1 : 0;
      if (bM !== aM) return bM - aM;
      return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
    }
    return 0;
  });

  const hasFlavorData = FLAVOR_KEYS.some(
    (k) => recipeA[`flavor${k}`] > 0 || (recipeB && recipeB[`flavor${k}`] > 0)
  );

  const handleShare = async () => {
    if (!recipeB || sharing) return;
    setSharing(true);
    try {
      await shareCompareCard(recipeA, recipeB);
    } catch (e) {
      console.error("[CompareModal] share:", e);
      alert("공유에 실패했어요.");
    }
    setSharing(false);
  };

  return (
    <div className="modal-backdrop" style={{ zIndex: 210 }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: "700px", maxHeight: "90vh", overflowY: "auto", padding: "24px" }}>

        {/* 헤더 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="var(--espresso)" strokeWidth="1.8"/>
              <path d="M16.5 16.5L21 21" stroke="var(--espresso)" strokeWidth="1.8" strokeLinecap="round"/>
              <path d="M8 11h6M11 8v6" stroke="var(--latte)" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
            <h2 style={{ margin: 0, fontSize: "1.2rem" }}>레시피 비교</h2>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: "1.4rem", lineHeight: 1, padding: "4px" }}>
            ×
          </button>
        </div>

        {/* 레시피 A (기준) */}
        <div style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "0.62rem", fontWeight: 700, color: "var(--latte)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>
            레시피 A (기준)
          </div>
          <div style={{ background: "#FDF6EF", border: "1px solid var(--latte)40", borderLeft: "3px solid var(--latte)", borderRadius: "0 10px 10px 0", padding: "12px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 700, color: "var(--espresso)" }}>
                  {recipeA.bean || "—"}
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "2px" }}>
                  {recipeA.company && <span>{recipeA.company} · </span>}
                  {recipeA.menuLabel}{recipeA.isIced ? " · ICE" : ""} · @{recipeA.author}
                </div>
              </div>
              <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                {recipeA.gram       && <Chip val={recipeA.gram}       unit="g"  isSelected={false}/>}
                {recipeA.seconds    && <Chip val={recipeA.seconds}    unit="s"  isSelected={false}/>}
                {recipeA.espressoMl && <Chip val={recipeA.espressoMl} unit="ml" isSelected={false}/>}
              </div>
            </div>
          </div>
        </div>

        {/* 레시피 B 선택 */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{ fontSize: "0.62rem", fontWeight: 700, color: "#2980b9", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>
            레시피 B 선택
          </div>
          {/* 검색 */}
          <div style={{ display: "flex", gap: "6px", alignItems: "center", marginBottom: "8px", background: "var(--foam)", border: "1px solid var(--divider)", borderRadius: "8px", padding: "8px 12px" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="6.5" cy="6.5" r="5" stroke="var(--muted)" strokeWidth="1.4"/>
              <path d="M10.5 10.5L14 14" stroke="var(--muted)" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="원두명, 메뉴, 로스터리, 닉네임 검색…"
              style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontFamily: "'DM Sans', sans-serif", fontSize: "0.82rem", color: "var(--espresso)" }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: "1rem", padding: 0, lineHeight: 1 }}>
                ×
              </button>
            )}
          </div>
          {/* 정렬 칩 */}
          <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", marginBottom: "8px" }}>
            {SORT_OPTIONS.map((opt) => {
              const isActive = sortBy === opt.id;
              const count =
                opt.id === "sameBean"
                  ? myRecipes.filter((r) => (r.bean || "").toLowerCase() === (recipeA.bean || "").toLowerCase()).length
                  : opt.id === "mine"
                  ? myRecipes.filter((r) => r.uid === recipeA.uid).length
                  : null;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSortBy(opt.id)}
                  style={{
                    padding: "4px 10px",
                    border: "1px solid",
                    borderRadius: "20px",
                    cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "0.72rem",
                    lineHeight: 1,
                    transition: "all 0.15s",
                    borderColor: isActive ? "var(--espresso)" : "var(--steam)",
                    background:  isActive ? "var(--espresso)" : "transparent",
                    color:       isActive ? "var(--cream)" : "var(--muted)",
                    fontWeight:  isActive ? 600 : 400,
                  }}
                >
                  {opt.label}
                  {count !== null && count > 0 && (
                    <span style={{ marginLeft: "4px", fontSize: "0.65rem", opacity: 0.8 }}>{count}</span>
                  )}
                </button>
              );
            })}
          </div>
          {/* 레시피 목록 */}
          <div style={{ display: "flex", flexDirection: "column", gap: "5px", maxHeight: "200px", overflowY: "auto" }}>
            {filteredList.length === 0 ? (
              <p style={{ fontSize: "0.8rem", color: "var(--muted)", textAlign: "center", padding: "16px 0" }}>
                검색 결과가 없어요
              </p>
            ) : filteredList.map((r) => (
              <RecipeChip
                key={r.id}
                r={r}
                recipeA={recipeA}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            ))}
          </div>
        </div>

        {/* ── 비교 결과 ── */}
        {recipeB && (
          <>
            <div style={{ height: "1px", background: "var(--divider)", margin: "4px 0 20px" }}/>

            {/* 수치 비교 테이블 */}
            <div style={{ background: "var(--foam)", border: "1px solid var(--divider)", borderRadius: "12px", overflow: "hidden", marginBottom: "16px" }}>
              {/* 컬럼 헤더 */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 1fr", background: "var(--cream)", borderBottom: "1px solid var(--divider)", padding: "8px 14px" }}>
                <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--latte)", textAlign: "right" }}>레시피 A</div>
                <div/>
                <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#2980b9" }}>레시피 B</div>
              </div>
              {FIELDS.map((f, idx) => {
                const av = recipeA[f.key], bv = recipeB[f.key];
                const d  = diff(av, bv);
                return (
                  <div
                    key={f.key}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 80px 1fr",
                      alignItems: "center",
                      borderTop: idx === 0 ? "none" : "1px solid var(--divider)",
                      background: d ? "#FFFBF7" : "transparent",
                      padding: "0 14px",
                    }}
                  >
                    <div style={{ padding: "10px 0", fontSize: "0.88rem", textAlign: "right", color: d ? "var(--espresso)" : "var(--muted)", fontWeight: d ? 700 : 400 }}>
                      {av ? `${av}${f.unit}` : "—"}
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "0.6rem", color: "var(--muted)", marginBottom: "2px" }}>{f.label}</div>
                      {d ? (
                        <div style={{ fontSize: "0.68rem", fontWeight: 700, color: d === "up" ? "#27ae60" : "#e67e22" }}>
                          {d === "up" ? "▲" : "▼"} {Math.abs(parseFloat(av || 0) - parseFloat(bv || 0))}{f.unit}
                        </div>
                      ) : (
                        <div style={{ fontSize: "0.68rem", color: "var(--muted)" }}>＝</div>
                      )}
                    </div>
                    <div style={{ padding: "10px 0", fontSize: "0.88rem", color: d ? "#2980b9" : "var(--muted)", fontWeight: d ? 700 : 400 }}>
                      {bv ? `${bv}${f.unit}` : "—"}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 플레이버 오버레이 레이더 */}
            {hasFlavorData && (
              <div style={{ background: "var(--foam)", border: "1px solid var(--divider)", borderRadius: "12px", padding: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "12px" }}>
                  <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Flavor</span>
                  <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <span style={{ width: "16px", height: "3px", background: "var(--latte)", display: "inline-block", borderRadius: "2px" }}/>
                    <span style={{ fontSize: "0.65rem", color: "var(--muted)" }}>A</span>
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <span style={{ width: "16px", height: "3px", background: "#2980b9", display: "inline-block", borderRadius: "2px" }}/>
                    <span style={{ fontSize: "0.65rem", color: "var(--muted)" }}>B</span>
                  </span>
                </div>
                <FlavorOverlay recipeA={recipeA} recipeB={recipeB}/>
              </div>
            )}

            {/* 공유 버튼 */}
            <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={handleShare}
                disabled={sharing}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "7px",
                  padding: "9px 18px",
                  background: "var(--espresso)",
                  color: "var(--cream)",
                  border: "none",
                  borderRadius: "8px",
                  cursor: sharing ? "not-allowed" : "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "0.83rem",
                  fontWeight: 600,
                  opacity: sharing ? 0.6 : 1,
                  transition: "opacity 0.15s",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="18" cy="5"  r="2.5" stroke="currentColor" strokeWidth="1.6"/>
                  <circle cx="18" cy="19" r="2.5" stroke="currentColor" strokeWidth="1.6"/>
                  <circle cx="6"  cy="12" r="2.5" stroke="currentColor" strokeWidth="1.6"/>
                  <path d="M8.3 10.8l7.4-4.2M8.3 13.2l7.4 4.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
                {sharing ? "생성 중…" : "비교 결과 공유"}
              </button>
            </div>
          </>
        )}

        {/* 레시피 B 미선택 안내 */}
        {!recipeB && (
          <div style={{ textAlign: "center", padding: "24px 0", color: "var(--muted)", fontSize: "0.85rem" }}>
            위에서 비교할 레시피 B를 선택해주세요
          </div>
        )}
      </div>
    </div>
  );
}
