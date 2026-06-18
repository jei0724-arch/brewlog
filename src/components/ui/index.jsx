/* ============================================================
   BREWLOG NOTE — src/components/ui/index.jsx
   재사용 Atomic 컴포넌트 모음
   ─ CoffeeBeanIcon  : 원두 SVG 아이콘
   ─ BrandInput      : React.memo 자동완성 인풋 (useMemo 최적화)
   ─ TagInput        : #해시태그 방식 태그 입력
   ─ FlavorRadar     : SVG 레이더 차트 (7축 플레이버)
   ============================================================ */
import React, {
  useState, useEffect, useCallback, useMemo
} from "react";
import { FLAVOR_AXES } from "../../constants/coffeeMenus";

// ─────────────────────────────────────────────────────────────────
// CoffeeBeanIcon
// ─────────────────────────────────────────────────────────────────
export function CoffeeBeanIcon({ size = 22, color = "#5c3317" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <ellipse
        cx="12" cy="12" rx="7" ry="10"
        fill={color}
        transform="rotate(-30 12 12)"
      />
      <path
        d="M12 4 Q14 8 12 12 Q10 16 12 20"
        stroke="#f5efe6"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        transform="rotate(-30 12 12)"
      />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────
// BrandInput — React.memo + useMemo (자동완성 재연산 방지)
// ─────────────────────────────────────────────────────────────────
export const BrandInput = React.memo(function BrandInput({
  value,
  onChange,
  brands,
  placeholder,
}) {
  const [query, setQuery] = useState(value || "");
  const [open,  setOpen]  = useState(false);
  const wrapRef = React.useRef(null);

  // query 또는 brands가 바뀔 때만 필터링 재연산
  const filtered = useMemo(
    () =>
      query.trim()
        ? brands.filter((b) =>
            b.toLowerCase().includes(query.toLowerCase())
          )
        : brands,
    [query, brands]
  );

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const select = useCallback(
    (b) => {
      setQuery(b);
      onChange(b);
      setOpen(false);
    },
    [onChange]
  );

  return (
    <div className="autocomplete-wrap" ref={wrapRef}>
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder || "브랜드 입력 또는 검색…"}
        style={{
          width: "100%",
          padding: "0.75rem 1rem",
          border: "1px solid var(--steam)",
          borderRadius: "var(--r-btn)",
          background: "var(--cream)",
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "0.95rem",
          color: "var(--espresso)",
          outline: "none",
          transition: "border-color var(--transition-base)",
        }}
      />
      {open && filtered.length > 0 && (
        <div className="autocomplete-list">
          {filtered.map((b) => (
            <div
              key={b}
              className="autocomplete-item"
              onMouseDown={() => select(b)}
            >
              {b}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────
// TagInput — #해시태그 방식 태그 입력
// ─────────────────────────────────────────────────────────────────
export function TagInput({ tags, onChange, lang }) {
  const [input, setInput] = useState("");
  const isKo    = lang === "ko";
  const MAX_TAGS = 10;
  const MAX_LEN  = 20;

  const addTag = (raw) => {
    const val = raw
      .replace(/^#+/, "")
      .trim()
      .replace(/\s+/g, "_");
    if (!val || val.length > MAX_LEN) return;
    if (tags.includes(val))          return;
    if (tags.length >= MAX_TAGS)     return;
    onChange([...tags, val]);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" || e.key === " " || e.key === ",") {
      e.preventDefault();
      addTag(input);
      setInput("");
    } else if (e.key === "Backspace" && !input && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  const removeTag = (t) => onChange(tags.filter((x) => x !== t));

  return (
    <div
      style={{
        border: "1px solid var(--steam)",
        borderRadius: "var(--r-btn)",
        padding: "8px 10px",
        background: "var(--cream)",
        cursor: "text",
        transition: "border-color 0.2s",
      }}
      onClick={(e) => e.currentTarget.querySelector("input")?.focus()}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
        {tags.map((t) => (
          <span
            key={t}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              background: "var(--espresso)",
              color: "var(--cream)",
              borderRadius: "var(--r-chip)",
              padding: "3px 8px",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.75rem",
              fontWeight: 500,
            }}
          >
            #{t}
            <button
              type="button"
              onClick={() => removeTag(t)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "rgba(255,255,255,0.6)",
                padding: "0",
                lineHeight: 1,
                fontSize: "0.8rem",
                display: "flex",
                alignItems: "center",
              }}
            >
              ✕
            </button>
          </span>
        ))}
        {tags.length < MAX_TAGS && (
          <input
            value={input}
            onChange={(e) => setInput(e.target.value.replace(/\s/g, ""))}
            onKeyDown={handleKey}
            onBlur={() => {
              if (input) { addTag(input); setInput(""); }
            }}
            placeholder={
              tags.length === 0
                ? isKo
                  ? "#에티오피아 #내추럴 (Enter로 추가)"
                  : "#ethiopia #natural (press Enter)"
                : ""
            }
            style={{
              border: "none",
              outline: "none",
              background: "transparent",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.88rem",
              color: "var(--espresso)",
              minWidth: "120px",
              flex: 1,
              padding: "2px 0",
            }}
          />
        )}
      </div>
      <div
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "0.65rem",
          color: "var(--muted)",
          marginTop: "5px",
        }}
      >
        {isKo
          ? `Enter · 스페이스 · 쉼표로 추가 · 최대 ${MAX_TAGS}개`
          : `Press Enter, space, or comma to add · max ${MAX_TAGS} tags`}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// FlavorRadar — SVG 레이더 차트 (7축)
// ─────────────────────────────────────────────────────────────────
export function FlavorRadar({ values, size = 200, lang = "ko" }) {
  const pad    = 24;
  const vb     = size + pad * 2;
  const cx     = vb / 2;
  const cy     = vb / 2;
  const maxR   = (vb / 2) * 0.60;
  const n      = FLAVOR_AXES.length;
  const levels = 5;

  const angleOf = (i) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const ptAt    = (i, r) => ({
    x: cx + r * Math.cos(angleOf(i)),
    y: cy + r * Math.sin(angleOf(i)),
  });

  // 격자 다각형
  const grids = Array.from({ length: levels }, (_, l) => {
    const r = maxR * (l + 1) / levels;
    return Array.from({ length: n }, (_, i) => ptAt(i, r))
      .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(" ") + " Z";
  });

  // 데이터 경로 (0값은 r=1로 폴리곤 유지)
  const dataPath = FLAVOR_AXES.map((ax, i) => {
    const v = Math.max(0, Math.min(5, parseInt(values[ax.key]) || 0));
    const r = v > 0 ? (v / 5) * maxR : 1;
    const p = ptAt(i, r);
    return `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }).join(" ") + " Z";

  const hasData = FLAVOR_AXES.some(
    (ax) => (parseInt(values[ax.key]) || 0) > 0
  );

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${vb} ${vb}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", flexShrink: 0 }}
    >
      {/* 격자 */}
      {grids.map((d, l) => (
        <path
          key={l}
          d={d}
          fill={l % 2 === 1 ? "#F7F5F2" : "none"}
          stroke="#DEDAD6"
          strokeWidth="1"
        />
      ))}
      {/* 축선 */}
      {FLAVOR_AXES.map((_, i) => {
        const p = ptAt(i, maxR);
        return (
          <line
            key={i}
            x1={cx.toFixed(1)} y1={cy.toFixed(1)}
            x2={p.x.toFixed(1)} y2={p.y.toFixed(1)}
            stroke="#DEDAD6"
            strokeWidth="1"
          />
        );
      })}
      {/* 레벨 숫자 */}
      {[1, 2, 3, 4, 5].map((lv) => {
        const p = ptAt(0, maxR * lv / 5);
        return (
          <text
            key={lv}
            x={(p.x + 3).toFixed(1)}
            y={(p.y - 2).toFixed(1)}
            fontSize="8"
            fill="#9C8E82"
            opacity="0.8"
            fontFamily="'DM Sans', sans-serif"
          >
            {lv}
          </text>
        );
      })}
      {/* 데이터 영역 */}
      {hasData && (
        <>
          <path
            d={dataPath}
            fill="var(--latte)"
            fillOpacity="0.2"
            stroke="var(--latte)"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {FLAVOR_AXES.map((ax, i) => {
            const v = parseInt(values[ax.key]) || 0;
            if (v === 0) return null;
            const p = ptAt(i, (v / 5) * maxR);
            return (
              <circle
                key={i}
                cx={p.x.toFixed(1)}
                cy={p.y.toFixed(1)}
                r="4"
                fill="#B07D54"
                stroke="white"
                strokeWidth="1.5"
              />
            );
          })}
        </>
      )}
      {/* 축 레이블 */}
      {FLAVOR_AXES.map((ax, i) => {
        const p      = ptAt(i, maxR + 15);
        const anchor =
          p.x < cx - 6 ? "end" : p.x > cx + 6 ? "start" : "middle";
        return (
          <text
            key={i}
            x={p.x.toFixed(1)}
            y={(p.y + 4).toFixed(1)}
            fontSize="10"
            textAnchor={anchor}
            fontFamily="'DM Sans', sans-serif"
            fontWeight="500"
            fill="var(--espresso)"
            opacity="0.9"
          >
            {lang === "en" ? ax.en : ax.ko}
          </text>
        );
      })}
    </svg>
  );
}
