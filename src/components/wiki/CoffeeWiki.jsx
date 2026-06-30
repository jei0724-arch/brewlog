/* ============================================================
   BREWLOG NOTE — src/components/wiki/CoffeeWiki.jsx
   커피 위키 — 유저 기여형 원두/장비 데이터베이스 (1단계)
   ============================================================ */
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  collection, query, orderBy, limit,
  getDocs, doc, addDoc, updateDoc, serverTimestamp,
} from "firebase/firestore";
import { db } from "../../config/firebase";
import { SEED_EQUIPMENTS, SEED_BEAN_ORIGINS, seedText } from "../../constants/wikiSeed";
import { translateFields, hasKorean } from "../../utils/translate";

const I18N = {
  ko: {
    title: "커피 위키", sub: "원두와 장비, 함께 만드는 커피 데이터베이스",
    tabBeans: "원두", tabEquip: "장비",
    search: "원두명, 산지, 브랜드로 검색",
    addBean: "원두 추가하기", addEquip: "장비 추가하기",
    empty: "아직 등록된 항목이 없어요. 첫 항목을 추가해보세요!",
    noResult: "검색 결과가 없어요.",
    linkedRecipes: "개 레시피", contributedBy: "기여자",
    editedBy: "최근 수정", createdAt: "등록일",
    save: "저장", cancel: "취소", edit: "편집", close: "닫기",
    beanName: "원두명", origin: "산지(국가)", region: "지역",
    variety: "품종", process: "가공법", altitude: "고도",
    description: "설명", roastery: "로스터리(선택)",
    equipCategory: "분류", equipBrand: "브랜드", equipModel: "모델명",
    equipType: "타입", machine: "머신", grinder: "그라인더", handdrip: "핸드드립",
    fullAuto: "전자동", semiAuto: "반자동", manual: "수동",
    required: "필수 항목을 입력해주세요.",
    duplicateWarn: "비슷한 항목이 이미 있어요:",
    createNew: "그래도 새로 만들기",
    // 머신 스펙
    specBoiler: "보일러 타입", specPump: "펌프 압력(bar)", specTank: "워터탱크 용량(L)", specSteam: "스팀완드",
    boilerSingle: "싱글 보일러", boilerDual: "듀얼 보일러", boilerHeatExchange: "열교환식", boilerThermoblock: "서모블록",
    steamYes: "있음", steamNo: "없음",
    // 그라인더 스펙
    specBurr: "날 타입", specSteps: "분쇄 단계", specMotor: "모터 타입", specRpm: "RPM(분당 회전수)",
    burrConical: "코니컬", burrFlat: "플랫",
    motorDC: "DC 모터", motorAC: "AC 모터",
    // 핸드드립 스펙
    specMaterial: "재질", specShape: "드리퍼 형태", specCapacity: "용량(컵)",
    materialCeramic: "도자기", materialGlass: "유리", materialPlastic: "플라스틱", materialMetal: "금속",
    shapeCone: "원뿔형", shapeFlat: "평저형", shapeWave: "웨이브",
  },
  en: {
    title: "Coffee Wiki", sub: "A community-built coffee bean & equipment database",
    tabBeans: "Beans", tabEquip: "Equipment",
    search: "Search by name, origin, or brand",
    addBean: "Add Bean", addEquip: "Add Equipment",
    empty: "No entries yet. Be the first to add one!",
    noResult: "No results found.",
    linkedRecipes: " recipes", contributedBy: "Contributor",
    editedBy: "Last edited", createdAt: "Added",
    save: "Save", cancel: "Cancel", edit: "Edit", close: "Close",
    beanName: "Bean Name", origin: "Origin (Country)", region: "Region",
    variety: "Variety", process: "Process", altitude: "Altitude",
    description: "Description", roastery: "Roastery (optional)",
    equipCategory: "Category", equipBrand: "Brand", equipModel: "Model",
    equipType: "Type", machine: "Machine", grinder: "Grinder", handdrip: "Hand Drip",
    fullAuto: "Full-Auto", semiAuto: "Semi-Auto", manual: "Manual",
    required: "Please fill in required fields.",
    duplicateWarn: "Similar entries already exist:",
    createNew: "Create new anyway",
    specBoiler: "Boiler Type", specPump: "Pump Pressure(bar)", specTank: "Tank Capacity(L)", specSteam: "Steam Wand",
    boilerSingle: "Single Boiler", boilerDual: "Dual Boiler", boilerHeatExchange: "Heat Exchanger", boilerThermoblock: "Thermoblock",
    steamYes: "Yes", steamNo: "No",
    specBurr: "Burr Type", specSteps: "Grind Steps", specMotor: "Motor Type", specRpm: "RPM",
    burrConical: "Conical", burrFlat: "Flat",
    motorDC: "DC Motor", motorAC: "AC Motor",
    specMaterial: "Material", specShape: "Dripper Shape", specCapacity: "Capacity (cups)",
    materialCeramic: "Ceramic", materialGlass: "Glass", materialPlastic: "Plastic", materialMetal: "Metal",
    shapeCone: "Cone", shapeFlat: "Flat-bottom", shapeWave: "Wave",
  },
};

// ── 브랜드/용어 한영 매핑 (브레빌 ↔ Breville 같은 중복 방지) ─────
const BRAND_ALIASES = [
  ["브레빌", "breville"], ["가찌아", "gaggia"], ["란칠리오", "rancilio"],
  ["드롱기", "delonghi", "de'longhi", "de longhi"], ["주라", "jura"],
  ["필립스", "philips"], ["지멘스", "siemens"], ["밀레", "miele"],
  ["멜리타", "melitta"], ["세코", "saeco"], ["크룹스", "krups"],
  ["라마르조코", "la marzocco", "lamarzocco"], ["바라짜", "baratza"],
  ["유레카", "eureka"], ["니체", "niche"], ["코만단테", "comandante"],
  ["하리오", "hario"], ["칼리타", "kalita"], ["케멕스", "chemex"], ["오리가미", "origami"],
  ["아카이아", "acaia"], ["펠리치타", "felicita"], ["타임모어", "timemore"],
  ["월쓰", "wirsh"], ["북우", "bookoo"],
];

function normalizeAlias(str) {
  const lower = str.toLowerCase().replace(/\s+/g, "").replace(/['’.]/g, "");
  for (const group of BRAND_ALIASES) {
    const normalizedGroup = group.map(g => g.toLowerCase().replace(/\s+/g, "").replace(/['’.]/g, ""));
    if (normalizedGroup.some(g => lower.includes(g) || g.includes(lower))) {
      return normalizedGroup[normalizedGroup.length - 1]; // 영문 대표값으로 통일
    }
  }
  return lower;
}

// ── 레벤슈타인 거리 (오타 허용 비교) ──────────────────────────
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    }
  }
  return dp[m][n];
}

function similar(a, b) {
  if (!a || !b) return false;
  const na = normalizeAlias(a);
  const nb = normalizeAlias(b);
  if (!na || !nb) return false;
  // 1. 포함 관계
  if (na.includes(nb) || nb.includes(na)) return true;
  // 2. 짧은 문자열 오타 보정 (편집거리 기반, 길이 비례 허용치)
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen <= 3) return na === nb;
  const threshold = Math.ceil(maxLen * 0.25); // 25% 이내 오타는 동일로 간주
  return levenshtein(na, nb) <= threshold;
}

function BeanWikiForm({ user, lang, editTarget, allBeans, onClose, onSaved }) {
  const t = I18N[lang];
  const [form, setForm] = useState({
    name: editTarget?.name || "",
    origin: editTarget?.origin || "",
    region: editTarget?.region || "",
    variety: editTarget?.variety || "",
    process: editTarget?.process || "",
    altitude: editTarget?.altitude || "",
    roastery: editTarget?.roastery || "",
    description: editTarget?.description || "",
  });
  const [saving, setSaving] = useState(false);
  const [dupWarn, setDupWarn] = useState(null);
  const [forceNew, setForceNew] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // 시드 데이터 자동완성 추천 — 한/영 양쪽 이름 모두로 매칭 (개수 제한 없음)
  const seedMatches = !editTarget && form.name.trim().length >= 2
    ? SEED_BEAN_ORIGINS.filter(s =>
        similar(seedText(s.name, "ko"), form.name) || similar(seedText(s.name, "en"), form.name) ||
        similar(seedText(s.origin, "ko"), form.name) || similar(seedText(s.origin, "en"), form.name)
      )
    : [];

  // 항상 현재 lang에 맞는 텍스트로 채움 (한국어 입력 + 영문 모드여도 영문으로 채워짐)
  const applySeed = (seed) => {
    setForm(f => ({
      ...f,
      name: seedText(seed.name, lang), origin: seedText(seed.origin, lang),
      region: seedText(seed.region, lang), variety: seedText(seed.variety, lang),
      process: seedText(seed.process, lang), altitude: seed.altitude,
      description: seedText(seed.description, lang),
    }));
  };

  useEffect(() => {
    if (editTarget || forceNew || !form.name.trim()) { setDupWarn(null); return; }
    const matches = allBeans.filter(b => similar(b.name, form.name) && b.name !== form.name);
    setDupWarn(matches.length > 0 ? matches.slice(0, 3) : null);
  }, [form.name, allBeans, editTarget, forceNew]);

  const handleSave = async () => {
    if (!form.name.trim() || !form.origin.trim()) { alert(t.required); return; }
    setSaving(true);
    try {
      if (editTarget) {
        await updateDoc(doc(db, "wiki_beans", editTarget.id), {
          ...form,
          editedBy: [...(editTarget.editedBy || []), user.uid].slice(-10),
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, "wiki_beans"), {
          ...form,
          createdBy: user.uid,
          createdByName: user.displayName || "익명",
          editedBy: [],
          linkedRecipeCount: 0,
          createdAt: serverTimestamp(),
        });
      }
      onSaved();
      onClose();
    } catch (e) {
      console.error("[wiki bean save]", e);
      alert(lang === "en" ? "Failed to save." : "저장에 실패했어요.");
    }
    setSaving(false);
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: "440px" }}>
        <h2>{editTarget ? t.edit : t.addBean}</h2>

        {/* 원두명 입력 + 시드 추천 */}
        <div className="field full" style={{ marginBottom: "12px" }}>
          <label>{t.beanName}<span style={{ color: "#c0392b" }}> *</span></label>
          <input value={form.name} onChange={e => set("name", e.target.value)} placeholder={lang === "en" ? "e.g. Ethiopia Yirgacheffe" : "예) 에티오피아 예가체프 코체레"} />
        </div>

        {/* 시드 데이터 자동완성 카드 */}
        {seedMatches.length > 0 && (
          <div style={{ marginBottom: "14px" }}>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.7rem", color: "var(--latte)", fontWeight: 600, marginBottom: "8px", display: "flex", alignItems: "center", gap: "4px" }}>
              <svg width="11" height="11" viewBox="0 0 14 14" fill="none"><path d="M7 1L8.6 5.2L13 5.7L9.8 8.6L10.7 13L7 10.8L3.3 13L4.2 8.6L1 5.7L5.4 5.2L7 1Z" fill="currentColor"/></svg>
              {lang === "en" ? `Quick fill from known origins (${seedMatches.length})` : `알려진 산지 정보로 빠르게 채우기 (${seedMatches.length}개)`}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "220px", overflowY: "auto", paddingRight: "2px" }}>
              {seedMatches.map((seed, i) => (
                <button key={i} type="button" onClick={() => applySeed(seed)}
                  style={{ textAlign: "left", padding: "10px 12px", borderRadius: "8px", border: "1px solid #B07D5430", background: "#B07D5408", cursor: "pointer", transition: "background 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#B07D5415"}
                  onMouseLeave={e => e.currentTarget.style.background = "#B07D5408"}>
                  <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem", fontWeight: 600, color: "var(--espresso)" }}>{seedText(seed.name, lang)}</div>
                  <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", color: "var(--muted)", marginTop: "2px" }}>
                    {[seedText(seed.origin, lang), seedText(seed.region, lang), seedText(seed.process, lang)].filter(Boolean).join(" · ")}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {[
          { key: "origin", label: t.origin, required: true, phKo: "예) 에티오피아", phEn: "e.g. Ethiopia" },
          { key: "region", label: t.region, phKo: "예) 예가체프", phEn: "e.g. Yirgacheffe" },
          { key: "variety", label: t.variety, phKo: "예) 헤이룸", phEn: "e.g. Heirloom" },
          { key: "process", label: t.process, phKo: "예) 워시드", phEn: "e.g. Washed" },
          { key: "altitude", label: t.altitude, phKo: "예) 1900-2200m", phEn: "e.g. 1900-2200m" },
          { key: "roastery", label: t.roastery, phKo: "예) 우리집커피", phEn: "e.g. Local Roastery" },
        ].map(({ key, label, required, phKo, phEn }) => (
          <div className="field full" key={key} style={{ marginBottom: "12px" }}>
            <label>{label}{required && <span style={{ color: "#c0392b" }}> *</span>}</label>
            <input value={form[key]} onChange={e => set(key, e.target.value)} placeholder={lang === "en" ? phEn : phKo} />
          </div>
        ))}

        <div className="field full" style={{ marginBottom: "12px" }}>
          <label>{t.description}</label>
          <textarea value={form.description} onChange={e => set("description", e.target.value)}
            rows={3} placeholder={lang === "en" ? "Flavor notes, characteristics..." : "풍미, 특징 등을 자유롭게 적어주세요"}
            style={{ width: "100%", padding: "0.7rem 1rem", border: "1px solid var(--steam)", borderRadius: "var(--r-btn)", background: "var(--foam)", fontFamily: "'DM Sans',sans-serif", fontSize: "0.9rem", resize: "vertical", boxSizing: "border-box" }}
          />
        </div>

        {dupWarn && (
          <div style={{ background: "#FFF8E1", border: "1px solid #F0C36D", borderRadius: "10px", padding: "12px 14px", marginBottom: "14px" }}>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", fontWeight: 600, color: "#8a6d1f", marginBottom: "8px" }}>
              ⚠️ {t.duplicateWarn}
            </p>
            {dupWarn.map(b => (
              <div key={b.id} style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.8rem", color: "#5c4a14", padding: "4px 0" }}>
                · {b.name} {b.origin && `(${b.origin})`}
              </div>
            ))}
            <button onClick={() => setForceNew(true)}
              style={{ marginTop: "8px", fontSize: "0.74rem", color: "#8a6d1f", background: "none", border: "none", textDecoration: "underline", cursor: "pointer", padding: 0 }}>
              {t.createNew}
            </button>
          </div>
        )}

        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>{t.cancel}</button>
          <button className="btn-primary" style={{ marginTop:0, width:"auto", padding:"0.7rem 1.5rem" }} onClick={handleSave} disabled={saving || (dupWarn && !forceNew)}>
            {saving ? "..." : t.save}
          </button>
        </div>
      </div>
    </div>
  );
}

function EquipWikiForm({ user, lang, editTarget, allEquips, onClose, onSaved }) {
  const t = I18N[lang];
  const [form, setForm] = useState({
    category: editTarget?.category || "machine",
    brand: editTarget?.brand || "",
    model: editTarget?.model || "",
    type: editTarget?.type || "semi",
    description: editTarget?.description || "",
    // 머신 스펙
    boilerType: editTarget?.boilerType || "",
    pumpBar: editTarget?.pumpBar || "",
    tankL: editTarget?.tankL || "",
    hasSteam: editTarget?.hasSteam ?? true,
    // 그라인더 스펙
    burrType: editTarget?.burrType || "",
    grindSteps: editTarget?.grindSteps || "",
    motorType: editTarget?.motorType || "",
    rpm: editTarget?.rpm || "",
    // 핸드드립 스펙
    material: editTarget?.material || "",
    dripperShape: editTarget?.dripperShape || "",
    capacityCups: editTarget?.capacityCups || "",
  });
  const [saving, setSaving] = useState(false);
  const [dupWarn, setDupWarn] = useState(null);
  const [forceNew, setForceNew] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // 시드 데이터 자동완성 추천 (브랜드 또는 모델 입력 시)
  // 브랜드만 입력 → 해당 브랜드 전체 모델 노출 (4개 제한 없음)
  // 모델까지 입력 → 더 좁혀서 매칭
  const seedMatches = !editTarget && (form.brand.trim().length >= 2 || form.model.trim().length >= 2)
    ? SEED_EQUIPMENTS.filter(s => {
        if (s.category !== form.category) return false;
        const brandQ = form.brand.trim();
        const modelQ = form.model.trim();
        // 브랜드가 입력됐으면 브랜드는 반드시 일치해야 함
        if (brandQ && !similar(s.brand, brandQ)) return false;
        // 모델까지 입력됐으면 모델도 매칭 확인 (좁히기)
        if (modelQ && modelQ.length >= 2 && !similar(s.model, modelQ) && !similar(`${s.brand} ${s.model}`, `${brandQ} ${modelQ}`)) {
          // 모델 검색어가 브랜드만으로 매칭된 결과에 포함되지 않으면 제외하되,
          // 브랜드만 친 상태에서 모델을 한두 글자 입력 중일 수 있으니 모델 부분 일치도 허용
          if (!s.model.toLowerCase().includes(modelQ.toLowerCase())) return false;
        }
        return true;
      })
    : [];

  const applySeed = (seed) => {
    setForm(f => ({
      ...f,
      brand: seed.brand, model: seed.model, type: seed.type || f.type,
      boilerType: seed.boilerType || "", pumpBar: seed.pumpBar || "", tankL: seed.tankL || "",
      hasSteam: seed.hasSteam ?? true,
      burrType: seed.burrType || "", grindSteps: seed.grindSteps || "", motorType: seed.motorType || "", rpm: seed.rpm || "",
      material: seed.material || "", dripperShape: seed.dripperShape || "", capacityCups: seed.capacityCups || "",
      description: seedText(seed.description, lang),
    }));
  };

  useEffect(() => {
    if (editTarget || forceNew || !form.brand.trim() || !form.model.trim()) { setDupWarn(null); return; }
    const fullName = `${form.brand} ${form.model}`;
    const matches = allEquips.filter(e =>
      e.category === form.category &&
      similar(`${e.brand} ${e.model}`, fullName) &&
      `${e.brand} ${e.model}` !== fullName
    );
    setDupWarn(matches.length > 0 ? matches.slice(0, 3) : null);
  }, [form.brand, form.model, form.category, allEquips, editTarget, forceNew]);

  const handleSave = async () => {
    if (!form.brand.trim() || !form.model.trim()) { alert(t.required); return; }
    setSaving(true);
    try {
      if (editTarget) {
        await updateDoc(doc(db, "wiki_equipments", editTarget.id), {
          ...form,
          editedBy: [...(editTarget.editedBy || []), user.uid].slice(-10),
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, "wiki_equipments"), {
          ...form,
          createdBy: user.uid,
          createdByName: user.displayName || "익명",
          editedBy: [],
          linkedRecipeCount: 0,
          createdAt: serverTimestamp(),
        });
      }
      onSaved();
      onClose();
    } catch (e) {
      console.error("[wiki equip save]", e);
      alert(lang === "en" ? "Failed to save." : "저장에 실패했어요.");
    }
    setSaving(false);
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: "440px" }}>
        <h2>{editTarget ? t.edit : t.addEquip}</h2>

        <div className="field full" style={{ marginBottom: "12px" }}>
          <label>{t.equipCategory}</label>
          <div style={{ display: "flex", gap: "8px" }}>
            {[["machine", t.machine], ["grinder", t.grinder], ["handdrip", t.handdrip]].map(([v, lbl]) => (
              <button key={v} type="button" onClick={() => set("category", v)}
                style={{ flex: 1, padding: "9px", borderRadius: "8px", border: `1px solid ${form.category === v ? "var(--espresso)" : "var(--steam)"}`,
                  background: form.category === v ? "var(--espresso)" : "var(--foam)",
                  color: form.category === v ? "var(--cream)" : "var(--muted)",
                  fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem", cursor: "pointer" }}>
                {lbl}
              </button>
            ))}
          </div>
        </div>

        <div className="field full" style={{ marginBottom: "12px" }}>
          <label>{t.equipBrand}<span style={{ color: "#c0392b" }}> *</span></label>
          <input value={form.brand} onChange={e => set("brand", e.target.value)} placeholder={lang === "en" ? "e.g. Breville" : "예) Breville"} />
        </div>
        <div className="field full" style={{ marginBottom: "12px" }}>
          <label>{t.equipModel}<span style={{ color: "#c0392b" }}> *</span></label>
          <input value={form.model} onChange={e => set("model", e.target.value)} placeholder={lang === "en" ? "e.g. Barista Express" : "예) Barista Express"} />
        </div>

        {/* 시드 데이터 자동완성 카드 */}
        {seedMatches.length > 0 && (
          <div style={{ marginBottom: "14px" }}>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.7rem", color: "var(--latte)", fontWeight: 600, marginBottom: "8px", display: "flex", alignItems: "center", gap: "4px" }}>
              <svg width="11" height="11" viewBox="0 0 14 14" fill="none"><path d="M7 1L8.6 5.2L13 5.7L9.8 8.6L10.7 13L7 10.8L3.3 13L4.2 8.6L1 5.7L5.4 5.2L7 1Z" fill="currentColor"/></svg>
              {lang === "en" ? `Quick fill known specs (${seedMatches.length})` : `알려진 스펙으로 빠르게 채우기 (${seedMatches.length}개)`}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "220px", overflowY: "auto", paddingRight: "2px" }}>
              {seedMatches.map((seed, i) => (
                <button key={i} type="button" onClick={() => applySeed(seed)}
                  style={{ textAlign: "left", padding: "10px 12px", borderRadius: "8px", border: "1px solid #B07D5430", background: "#B07D5408", cursor: "pointer", transition: "background 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#B07D5415"}
                  onMouseLeave={e => e.currentTarget.style.background = "#B07D5408"}>
                  <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem", fontWeight: 600, color: "var(--espresso)" }}>{seed.brand} {seed.model}</div>
                  <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", color: "var(--muted)", marginTop: "2px" }}>
                    {seedText(seed.description, lang)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {form.category === "machine" && (
          <>
            <div className="field full" style={{ marginBottom: "12px" }}>
              <label>{t.equipType}</label>
              <div style={{ display: "flex", gap: "8px" }}>
                {[["full", t.fullAuto], ["semi", t.semiAuto], ["manual", t.manual]].map(([v, lbl]) => (
                  <button key={v} type="button" onClick={() => set("type", v)}
                    style={{ flex: 1, padding: "8px", borderRadius: "8px", border: `1px solid ${form.type === v ? "var(--latte)" : "var(--steam)"}`,
                      background: form.type === v ? "var(--latte)" : "var(--foam)",
                      color: form.type === v ? "white" : "var(--muted)",
                      fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", cursor: "pointer" }}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            {/* ── 머신 스펙 ── */}
            <div className="field full" style={{ marginBottom: "12px" }}>
              <label>{t.specBoiler}</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {[["single", t.boilerSingle], ["dual", t.boilerDual], ["heatExchange", t.boilerHeatExchange], ["thermoblock", t.boilerThermoblock]].map(([v, lbl]) => (
                  <button key={v} type="button" onClick={() => set("boilerType", v)}
                    style={{ padding: "8px", borderRadius: "8px", border: `1px solid ${form.boilerType === v ? "var(--latte)" : "var(--steam)"}`,
                      background: form.boilerType === v ? "var(--latte)" : "var(--foam)",
                      color: form.boilerType === v ? "white" : "var(--muted)",
                      fontFamily: "'DM Sans',sans-serif", fontSize: "0.76rem", cursor: "pointer" }}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
              <div className="field">
                <label>{t.specPump}</label>
                <input type="number" step="0.1" value={form.pumpBar} onChange={e => set("pumpBar", e.target.value)} placeholder={lang === "en" ? "e.g. 15" : "예) 15"} />
              </div>
              <div className="field">
                <label>{t.specTank}</label>
                <input type="number" step="0.1" value={form.tankL} onChange={e => set("tankL", e.target.value)} placeholder={lang === "en" ? "e.g. 2.8" : "예) 2.8"} />
              </div>
            </div>

            <div className="field full" style={{ marginBottom: "12px" }}>
              <label>{t.specSteam}</label>
              <div style={{ display: "flex", gap: "8px" }}>
                {[[true, t.steamYes], [false, t.steamNo]].map(([v, lbl]) => (
                  <button key={String(v)} type="button" onClick={() => set("hasSteam", v)}
                    style={{ flex: 1, padding: "8px", borderRadius: "8px", border: `1px solid ${form.hasSteam === v ? "var(--latte)" : "var(--steam)"}`,
                      background: form.hasSteam === v ? "var(--latte)" : "var(--foam)",
                      color: form.hasSteam === v ? "white" : "var(--muted)",
                      fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", cursor: "pointer" }}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {form.category === "grinder" && (
          <>
            {/* ── 그라인더 스펙 ── */}
            <div className="field full" style={{ marginBottom: "12px" }}>
              <label>{t.specBurr}</label>
              <div style={{ display: "flex", gap: "8px" }}>
                {[["conical", t.burrConical], ["flat", t.burrFlat]].map(([v, lbl]) => (
                  <button key={v} type="button" onClick={() => set("burrType", v)}
                    style={{ flex: 1, padding: "8px", borderRadius: "8px", border: `1px solid ${form.burrType === v ? "var(--latte)" : "var(--steam)"}`,
                      background: form.burrType === v ? "var(--latte)" : "var(--foam)",
                      color: form.burrType === v ? "white" : "var(--muted)",
                      fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", cursor: "pointer" }}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
              <div className="field">
                <label>{t.specSteps}</label>
                <input type="number" value={form.grindSteps} onChange={e => set("grindSteps", e.target.value)} placeholder={lang === "en" ? "e.g. 40" : "예) 40"} />
              </div>
              <div className="field">
                <label>{t.specRpm}</label>
                <input type="number" value={form.rpm} onChange={e => set("rpm", e.target.value)} placeholder={lang === "en" ? "e.g. 1600" : "예) 1600"} />
              </div>
            </div>

            <div className="field full" style={{ marginBottom: "12px" }}>
              <label>{t.specMotor}</label>
              <div style={{ display: "flex", gap: "8px" }}>
                {[["dc", t.motorDC], ["ac", t.motorAC]].map(([v, lbl]) => (
                  <button key={v} type="button" onClick={() => set("motorType", v)}
                    style={{ flex: 1, padding: "8px", borderRadius: "8px", border: `1px solid ${form.motorType === v ? "var(--latte)" : "var(--steam)"}`,
                      background: form.motorType === v ? "var(--latte)" : "var(--foam)",
                      color: form.motorType === v ? "white" : "var(--muted)",
                      fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", cursor: "pointer" }}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {form.category === "handdrip" && (
          <>
            {/* ── 핸드드립 스펙 ── */}
            <div className="field full" style={{ marginBottom: "12px" }}>
              <label>{t.specMaterial}</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {[["ceramic", t.materialCeramic], ["glass", t.materialGlass], ["plastic", t.materialPlastic], ["metal", t.materialMetal]].map(([v, lbl]) => (
                  <button key={v} type="button" onClick={() => set("material", v)}
                    style={{ padding: "8px", borderRadius: "8px", border: `1px solid ${form.material === v ? "var(--latte)" : "var(--steam)"}`,
                      background: form.material === v ? "var(--latte)" : "var(--foam)",
                      color: form.material === v ? "white" : "var(--muted)",
                      fontFamily: "'DM Sans',sans-serif", fontSize: "0.76rem", cursor: "pointer" }}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            <div className="field full" style={{ marginBottom: "12px" }}>
              <label>{t.specShape}</label>
              <div style={{ display: "flex", gap: "8px" }}>
                {[["cone", t.shapeCone], ["flat", t.shapeFlat], ["wave", t.shapeWave]].map(([v, lbl]) => (
                  <button key={v} type="button" onClick={() => set("dripperShape", v)}
                    style={{ flex: 1, padding: "8px", borderRadius: "8px", border: `1px solid ${form.dripperShape === v ? "var(--latte)" : "var(--steam)"}`,
                      background: form.dripperShape === v ? "var(--latte)" : "var(--foam)",
                      color: form.dripperShape === v ? "white" : "var(--muted)",
                      fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", cursor: "pointer" }}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            <div className="field full" style={{ marginBottom: "12px" }}>
              <label>{t.specCapacity}</label>
              <input type="number" value={form.capacityCups} onChange={e => set("capacityCups", e.target.value)} placeholder={lang === "en" ? "e.g. 2" : "예) 2"} />
            </div>
          </>
        )}

        <div className="field full" style={{ marginBottom: "12px" }}>
          <label>{t.description}</label>
          <textarea value={form.description} onChange={e => set("description", e.target.value)}
            rows={3} placeholder={lang === "en" ? "Notes, tips, characteristics..." : "특징, 사용팁 등을 자유롭게 적어주세요"}
            style={{ width: "100%", padding: "0.7rem 1rem", border: "1px solid var(--steam)", borderRadius: "var(--r-btn)", background: "var(--foam)", fontFamily: "'DM Sans',sans-serif", fontSize: "0.9rem", resize: "vertical", boxSizing: "border-box" }}
          />
        </div>

        {dupWarn && (
          <div style={{ background: "#FFF8E1", border: "1px solid #F0C36D", borderRadius: "10px", padding: "12px 14px", marginBottom: "14px" }}>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", fontWeight: 600, color: "#8a6d1f", marginBottom: "8px" }}>
              ⚠️ {t.duplicateWarn}
            </p>
            {dupWarn.map(e => (
              <div key={e.id} style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.8rem", color: "#5c4a14", padding: "4px 0" }}>
                · {e.brand} {e.model}
              </div>
            ))}
            <button onClick={() => setForceNew(true)}
              style={{ marginTop: "8px", fontSize: "0.74rem", color: "#8a6d1f", background: "none", border: "none", textDecoration: "underline", cursor: "pointer", padding: 0 }}>
              {t.createNew}
            </button>
          </div>
        )}

        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>{t.cancel}</button>
          <button className="btn-primary" style={{ marginTop:0, width:"auto", padding:"0.7rem 1.5rem" }} onClick={handleSave} disabled={saving || (dupWarn && !forceNew)}>
            {saving ? "..." : t.save}
          </button>
        </div>
      </div>
    </div>
  );
}

function WikiDetailModal({ item, type, lang, onClose, onEdit }) {
  const t = I18N[lang];
  const isBean = type === "bean";

  // ── 영문 모드 자동 번역 (원두명/산지/지역/품종/가공법/로스터리/설명) ──
  const [translated, setTranslated] = useState(null);
  const [translating, setTranslating] = useState(false);

  useEffect(() => {
    setTranslated(null);
    if (lang !== "en") return;
    const fields = isBean
      ? {
          name: item.name || "", origin: item.origin || "", region: item.region || "",
          variety: item.variety || "", process: item.process || "",
          roastery: item.roastery || "", description: item.description || "",
        }
      : {
          description: item.description || "",
        };
    const needsTranslation = Object.values(fields).some(v => hasKorean(v));
    if (!needsTranslation) return;

    let cancelled = false;
    setTranslating(true);
    translateFields(fields).then(result => {
      if (!cancelled) { setTranslated(result); setTranslating(false); }
    });
    return () => { cancelled = true; };
  }, [lang, isBean, item.name, item.origin, item.region, item.variety, item.process, item.roastery, item.description]);

  const tr = (key, fallback) => translated?.[key] || fallback;

  const fmtDate = (ts) => {
    if (!ts?.toDate) return "";
    return ts.toDate().toLocaleDateString(lang === "en" ? "en-US" : "ko-KR");
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: "440px", padding: 0, overflow: "hidden" }}>
        <div style={{ background: "var(--espresso)", padding: "20px 20px 18px", position: "relative" }}>
          <button onClick={onClose} style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)", fontSize: "1.1rem" }}>✕</button>
          <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--latte)", marginBottom: "8px" }}>
            {isBean ? t.tabBeans : t.tabEquip}
            {translating && <span style={{ marginLeft: "8px", opacity: 0.6, textTransform: "none", letterSpacing: 0 }}>{lang === "en" ? "translating…" : "번역 중…"}</span>}
          </div>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.3rem", fontWeight: 700, color: "#FBFBFA", marginBottom: "4px" }}>
            {isBean ? tr("name", item.name) : `${item.brand} ${item.model}`}
          </div>
          <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.8rem", color: "rgba(255,255,255,0.55)" }}>
            {isBean
              ? [tr("origin", item.origin), tr("region", item.region), tr("process", item.process)].filter(Boolean).join(" · ")
              : [item.category === "machine" ? t.machine : item.category === "grinder" ? t.grinder : t.handdrip,
                 item.type === "full" ? t.fullAuto : item.type === "semi" ? t.semiAuto : item.type === "manual" ? t.manual : null
                ].filter(Boolean).join(" · ")}
          </div>
        </div>

        <div style={{ padding: "20px", background: "var(--foam)" }}>
          {isBean && [
            [t.origin, tr("origin", item.origin)], [t.region, tr("region", item.region)],
            [t.variety, tr("variety", item.variety)], [t.process, tr("process", item.process)],
            [t.altitude, item.altitude], [t.roastery, tr("roastery", item.roastery)],
          ].map(([label, value]) => value && (
            <div key={label} style={{ display: "flex", gap: "8px", padding: "7px 0", borderBottom: "1px solid var(--divider)" }}>
              <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", fontWeight: 600, color: "var(--muted)", width: "72px", flexShrink: 0 }}>{label}</span>
              <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem", color: "var(--espresso)" }}>{value}</span>
            </div>
          ))}

          {/* 장비 스펙 */}
          {!isBean && item.category === "machine" && [
            [t.specBoiler, { single:t.boilerSingle, dual:t.boilerDual, heatExchange:t.boilerHeatExchange, thermoblock:t.boilerThermoblock }[item.boilerType]],
            [t.specPump, item.pumpBar ? `${item.pumpBar} bar` : null],
            [t.specTank, item.tankL ? `${item.tankL} L` : null],
            [t.specSteam, item.hasSteam === true ? t.steamYes : item.hasSteam === false ? t.steamNo : null],
          ].map(([label, value]) => value && (
            <div key={label} style={{ display: "flex", gap: "8px", padding: "7px 0", borderBottom: "1px solid var(--divider)" }}>
              <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", fontWeight: 600, color: "var(--muted)", width: "100px", flexShrink: 0 }}>{label}</span>
              <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem", color: "var(--espresso)" }}>{value}</span>
            </div>
          ))}

          {!isBean && item.category === "grinder" && [
            [t.specBurr, { conical:t.burrConical, flat:t.burrFlat }[item.burrType]],
            [t.specSteps, item.grindSteps ? `${item.grindSteps}${lang==="en"?" steps":"단계"}` : null],
            [t.specMotor, { dc:t.motorDC, ac:t.motorAC }[item.motorType]],
            [t.specRpm, item.rpm ? `${item.rpm} RPM` : null],
          ].map(([label, value]) => value && (
            <div key={label} style={{ display: "flex", gap: "8px", padding: "7px 0", borderBottom: "1px solid var(--divider)" }}>
              <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", fontWeight: 600, color: "var(--muted)", width: "100px", flexShrink: 0 }}>{label}</span>
              <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem", color: "var(--espresso)" }}>{value}</span>
            </div>
          ))}

          {!isBean && item.category === "handdrip" && [
            [t.specMaterial, { ceramic:t.materialCeramic, glass:t.materialGlass, plastic:t.materialPlastic, metal:t.materialMetal }[item.material]],
            [t.specShape, { cone:t.shapeCone, flat:t.shapeFlat, wave:t.shapeWave }[item.dripperShape]],
            [t.specCapacity, item.capacityCups ? `${item.capacityCups}${lang==="en"?" cups":"컵"}` : null],
          ].map(([label, value]) => value && (
            <div key={label} style={{ display: "flex", gap: "8px", padding: "7px 0", borderBottom: "1px solid var(--divider)" }}>
              <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", fontWeight: 600, color: "var(--muted)", width: "100px", flexShrink: 0 }}>{label}</span>
              <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem", color: "var(--espresso)" }}>{value}</span>
            </div>
          ))}

          {item.description && (
            <div style={{ marginTop: "14px", padding: "12px 14px", background: "var(--cream)", borderRadius: "8px", borderLeft: "3px solid var(--latte)" }}>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.65 }}>{tr("description", item.description)}</p>
            </div>
          )}

          <div style={{ marginTop: "16px", padding: "12px 14px", background: "rgba(176,125,84,0.08)", borderRadius: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke="var(--latte)" strokeWidth="1.3"/></svg>
            <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.8rem", color: "var(--latte)", fontWeight: 600 }}>
              {item.linkedRecipeCount || 0}{t.linkedRecipes}
            </span>
          </div>

          <div style={{ marginTop: "14px", fontFamily: "'DM Sans',sans-serif", fontSize: "0.7rem", color: "var(--muted)", lineHeight: 1.7 }}>
            <div>{t.contributedBy}: @{item.createdByName || "익명"}</div>
            <div>{t.createdAt}: {fmtDate(item.createdAt)}</div>
            {(item.editedBy || []).length > 0 && <div>{t.editedBy}: {item.editedBy.length}{lang === "en" ? " times" : "회"}</div>}
          </div>

          <div style={{ display: "flex", gap: "8px", marginTop: "20px" }}>
            <button onClick={onEdit}
              style={{ flex: 1, padding: "11px", border: "1px solid var(--steam)", borderRadius: "10px", background: "none", fontFamily: "'DM Sans',sans-serif", fontSize: "0.85rem", color: "var(--muted)", cursor: "pointer" }}>
              {t.edit}
            </button>
            <button onClick={onClose}
              style={{ flex: 1, padding: "11px", border: "none", borderRadius: "10px", background: "var(--espresso)", color: "var(--cream)", fontFamily: "'DM Sans',sans-serif", fontSize: "0.85rem", fontWeight: 500, cursor: "pointer" }}>
              {t.close}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CoffeeWiki({ user, lang = "ko" }) {
  const t = I18N[lang];
  const [tab, setTab] = useState("beans");
  const [beans, setBeans] = useState([]);
  const [equips, setEquips] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [showBeanForm, setShowBeanForm] = useState(false);
  const [showEquipForm, setShowEquipForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [detailItem, setDetailItem] = useState(null);

  // 모달 상태 ref (popstate 핸들러에서 최신값 참조용)
  const showBeanFormRef  = useRef(false);
  const showEquipFormRef = useRef(false);
  const editTargetRef    = useRef(null);
  const detailItemRef    = useRef(null);
  useEffect(() => { showBeanFormRef.current  = showBeanForm;  }, [showBeanForm]);
  useEffect(() => { showEquipFormRef.current = showEquipForm; }, [showEquipForm]);
  useEffect(() => { editTargetRef.current    = editTarget;    }, [editTarget]);
  useEffect(() => { detailItemRef.current    = detailItem;    }, [detailItem]);

  // 뒤로가기 → 위키 모달 닫기 (앱 밖으로 나가는 것 방지)
  useEffect(() => {
    const onPop = () => {
      if (showBeanFormRef.current)  { setShowBeanForm(false);  return; }
      if (showEquipFormRef.current) { setShowEquipForm(false); return; }
      if (editTargetRef.current)    { setEditTarget(null);     return; }
      if (detailItemRef.current)    { setDetailItem(null);     return; }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // 모달 열기 래퍼 — pushState와 함께
  const openBeanForm  = () => { window.history.pushState({ wikiModal: true }, ""); setShowBeanForm(true); };
  const openEquipForm = () => { window.history.pushState({ wikiModal: true }, ""); setShowEquipForm(true); };
  const openEditTarget = (item) => { window.history.pushState({ wikiModal: true }, ""); setEditTarget(item); };
  const openDetailItem = (item) => { window.history.pushState({ wikiModal: true }, ""); setDetailItem(item); };

  // 모달 닫기 래퍼 — go(-1)과 함께
  const closeBeanForm  = () => { window.history.go(-1); setShowBeanForm(false); };
  const closeEquipForm = () => { window.history.go(-1); setShowEquipForm(false); };
  const closeEditTarget = () => { window.history.go(-1); setEditTarget(null); };
  const closeDetailItem = () => { window.history.go(-1); setDetailItem(null); };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [beanSnap, equipSnap] = await Promise.all([
        getDocs(query(collection(db, "wiki_beans"), orderBy("createdAt", "desc"), limit(200))),
        getDocs(query(collection(db, "wiki_equipments"), orderBy("createdAt", "desc"), limit(200))),
      ]);
      setBeans(beanSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setEquips(equipSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error("[wiki load]", e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredBeans = useMemo(() => {
    if (!search.trim()) return beans;
    const q = search.toLowerCase();
    return beans.filter(b =>
      b.name?.toLowerCase().includes(q) ||
      b.origin?.toLowerCase().includes(q) ||
      b.region?.toLowerCase().includes(q) ||
      b.roastery?.toLowerCase().includes(q)
    );
  }, [beans, search]);

  const filteredEquips = useMemo(() => {
    if (!search.trim()) return equips;
    const q = search.toLowerCase();
    return equips.filter(e =>
      e.brand?.toLowerCase().includes(q) ||
      e.model?.toLowerCase().includes(q)
    );
  }, [equips, search]);

  return (
    <div style={{ maxWidth: "720px", margin: "0 auto", padding: "0 16px" }}>
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.6rem", fontWeight: 700, color: "var(--espresso)", marginBottom: "4px" }}>
          {t.title}
        </h1>
        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.85rem", color: "var(--muted)" }}>{t.sub}</p>
      </div>

      <div style={{ display: "flex", gap: "6px", marginBottom: "16px" }}>
        {[["beans", t.tabBeans], ["equip", t.tabEquip]].map(([v, lbl]) => (
          <button key={v} onClick={() => setTab(v)}
            style={{ padding: "8px 18px", borderRadius: "999px", border: `1px solid ${tab === v ? "var(--espresso)" : "var(--steam)"}`,
              background: tab === v ? "var(--espresso)" : "var(--foam)",
              color: tab === v ? "var(--cream)" : "var(--muted)",
              fontFamily: "'DM Sans',sans-serif", fontSize: "0.85rem", fontWeight: 500, cursor: "pointer", transition: "all 0.15s" }}>
            {lbl}
          </button>
        ))}
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.search}
        style={{ width: "100%", padding: "11px 16px", border: "1px solid var(--steam)", borderRadius: "var(--r-btn)", background: "var(--foam)", fontFamily: "'DM Sans',sans-serif", fontSize: "0.88rem", marginBottom: "16px", boxSizing: "border-box", outline: "none" }}
      />

      {user && (
        <button onClick={() => tab === "beans" ? openBeanForm() : openEquipForm()}
          style={{ width: "100%", padding: "12px", border: "1px dashed var(--latte)", borderRadius: "10px", background: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: "0.85rem", color: "var(--latte)", fontWeight: 500, marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
          {tab === "beans" ? t.addBean : t.addEquip}
        </button>
      )}

      {loading ? (
        <p style={{ textAlign: "center", color: "var(--muted)", padding: "40px 0", fontFamily: "'DM Sans',sans-serif" }}>...</p>
      ) : tab === "beans" ? (
        filteredBeans.length === 0 ? (
          <p style={{ textAlign: "center", color: "var(--muted)", padding: "40px 0", fontFamily: "'DM Sans',sans-serif", fontSize: "0.85rem" }}>
            {search ? t.noResult : t.empty}
          </p>
        ) : (
          <div style={{ display: "grid", gap: "10px" }}>
            {filteredBeans.map(b => (
              <div key={b.id} onClick={() => openDetailItem(b)}
                style={{ background: "var(--foam)", border: "1px solid var(--divider)", borderRadius: "12px", padding: "14px 16px", cursor: "pointer" }}>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1rem", fontWeight: 700, color: "var(--espresso)", marginBottom: "4px" }}>{b.name}</div>
                <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", color: "var(--muted)" }}>
                  {[b.origin, b.region, b.process].filter(Boolean).join(" · ")}
                </div>
                {b.linkedRecipeCount > 0 && (
                  <div style={{ marginTop: "8px", display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.7rem", color: "var(--latte)", fontFamily: "'DM Sans',sans-serif" }}>
                    {b.linkedRecipeCount}{t.linkedRecipes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        filteredEquips.length === 0 ? (
          <p style={{ textAlign: "center", color: "var(--muted)", padding: "40px 0", fontFamily: "'DM Sans',sans-serif", fontSize: "0.85rem" }}>
            {search ? t.noResult : t.empty}
          </p>
        ) : (
          <div style={{ display: "grid", gap: "10px" }}>
            {filteredEquips.map(e => (
              <div key={e.id} onClick={() => openDetailItem(e)}
                style={{ background: "var(--foam)", border: "1px solid var(--divider)", borderRadius: "12px", padding: "14px 16px", cursor: "pointer" }}>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1rem", fontWeight: 700, color: "var(--espresso)", marginBottom: "4px" }}>
                  {e.brand} {e.model}
                </div>
                <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", color: "var(--muted)" }}>
                  {e.category === "machine" ? t.machine : e.category === "grinder" ? t.grinder : t.handdrip}
                </div>
                {e.linkedRecipeCount > 0 && (
                  <div style={{ marginTop: "8px", display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.7rem", color: "var(--latte)", fontFamily: "'DM Sans',sans-serif" }}>
                    {e.linkedRecipeCount}{t.linkedRecipes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {showBeanForm && (
        <BeanWikiForm user={user} lang={lang} editTarget={null} allBeans={beans}
          onClose={closeBeanForm} onSaved={loadData} />
      )}
      {showEquipForm && (
        <EquipWikiForm user={user} lang={lang} editTarget={null} allEquips={equips}
          onClose={closeEquipForm} onSaved={loadData} />
      )}
      {editTarget && tab === "beans" && (
        <BeanWikiForm user={user} lang={lang} editTarget={editTarget} allBeans={beans}
          onClose={closeEditTarget} onSaved={loadData} />
      )}
      {editTarget && tab === "equip" && (
        <EquipWikiForm user={user} lang={lang} editTarget={editTarget} allEquips={equips}
          onClose={closeEditTarget} onSaved={loadData} />
      )}

      {detailItem && (
        <WikiDetailModal
          item={detailItem} type={tab === "beans" ? "bean" : "equip"} lang={lang}
          onClose={closeDetailItem}
          onEdit={() => { setEditTarget(detailItem); setDetailItem(null); }}
        />
      )}
    </div>
  );
}
