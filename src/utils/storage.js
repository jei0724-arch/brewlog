/* ============================================================
   BREWLOG NOTE — src/utils/storage.js
   localStorage + Firestore 브랜드 캐시 관련 유틸 함수 모음
   ─ loadMyMachine / saveMyMachine
   ─ loadMyGrinder / saveMyGrinder
   ─ loadMyBean    / saveMyBean
   ─ loadRecipeDefaults / saveRecipeDefaults
   ─ loadPresets   / savePresets
   ─ loadCurrency  / saveCurrency
   ─ loadCachedRate / saveCachedRate
   ─ fetchUsdRate
   ─ formatPrice / formatPricePerG / formatCostPerCup
   ─ loadBrandsFromDB (Firestore 브랜드 캐시 초기화)
   ─ detectDefaultCurrency
   ============================================================ */
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import {
  DEFAULT_MACHINE_BRANDS,
  DEFAULT_GRINDER_BRANDS,
  AUTO_MACHINE_BRANDS,
  BOTH_MODE_BRANDS,
  BUILTIN_GRINDER_MAP,
} from "../constants/brands";

// ── 전역 브랜드 캐시 (Firestore에서 로드 후 덮어씀) ──────────────
export let MACHINE_BRANDS = [...DEFAULT_MACHINE_BRANDS];
export let GRINDER_BRANDS = [...DEFAULT_GRINDER_BRANDS];

// ── Firestore에서 브랜드 데이터 로드 ─────────────────────────────
export async function loadBrandsFromDB() {
  try {
    const snap = await getDoc(doc(db, "settings", "brands"));
    if (snap.exists()) {
      const d = snap.data();
      if (d.machineBrands?.length) {
        MACHINE_BRANDS = [...d.machineBrands, "기타 (직접 입력)"];
      }
      if (d.grinderBrands?.length) {
        GRINDER_BRANDS = [...d.grinderBrands, "기타 (직접 입력)"];
      }
    }
  } catch (e) {
    console.error("[storage] 브랜드 로드 오류:", e);
  }
}

// ── 머신 브랜드 유틸 ─────────────────────────────────────────────
export function isAutoMachine(brand) {
  return AUTO_MACHINE_BRANDS.some(
    (b) =>
      brand &&
      (b.toLowerCase().includes(brand.toLowerCase().split(" ")[0]) ||
        brand === b)
  );
}

export function isBothModeBrand(brand) {
  return BOTH_MODE_BRANDS.some(
    (b) =>
      brand &&
      (b === brand || brand.includes(b.split(" ")[0]))
  );
}

export function getBuiltinGrinder(brand, model) {
  if (!brand) return null;
  const brandLow = brand.toLowerCase();
  const modelLow = (model || "").toLowerCase().trim();

  // 브레빌 — 그라인더 내장 모델 감지
  if (
    brandLow.includes("breville") ||
    brandLow.includes("브레빌") ||
    brandLow.includes("sage") ||
    brandLow.includes("세이지")
  ) {
    const integrated = [
      "barista express", "barista pro", "barista touch",
      "oracle", "the oracle", "impress",
    ];
    if (integrated.some((k) => modelLow.includes(k))) {
      return { brand, model: "그라인더 일체형 (올인원)" };
    }
    const noGrinder = ["dual boiler", "bambino", "infuser", "dedica"];
    if (noGrinder.some((k) => modelLow.includes(k))) return null;
    if (modelLow.length > 0) return { brand, model: "그라인더 일체형 (올인원)" };
  }

  // 전자동 머신 — 내장 그라인더
  if (isAutoMachine(brand) && modelLow.length > 0) {
    return { brand, model: "내장 그라인더" };
  }

  // BUILTIN_GRINDER_MAP 조회 (세부 모델별 매핑)
  for (const [key, val] of Object.entries(BUILTIN_GRINDER_MAP)) {
    if (modelLow.includes(key)) return val;
  }

  return null;
}

// ── localStorage 키 상수 ─────────────────────────────────────────
const MACHINE_KEY        = "brewlog_my_machine";
const GRINDER_KEY        = "brewlog_my_grinder";
const BEAN_KEY           = "brewlog_my_bean";
const RECIPE_DEFAULTS_KEY = "brewlog_recipe_defaults";
const PRESETS_KEY_PREFIX  = "brewlog_presets_";
const CURRENCY_KEY        = "brewlog_currency";
const EXRATE_KEY          = "brewlog_exrate";
const EXIM_API_KEY        = "VmIDcPiswN7Jg7G0NQ4L6nIcSZzSWR6O";

// ── 내 머신 ──────────────────────────────────────────────────────
export function loadMyMachine() {
  try {
    const m = JSON.parse(localStorage.getItem(MACHINE_KEY) || "null");
    if (m && !m.equipType) m.equipType = "machine"; // 하위 호환
    return m;
  } catch { return null; }
}
export function saveMyMachine(m) {
  try { localStorage.setItem(MACHINE_KEY, JSON.stringify(m)); } catch {}
}

// ── 내 그라인더 ───────────────────────────────────────────────────
export function loadMyGrinder() {
  try { return JSON.parse(localStorage.getItem(GRINDER_KEY) || "null"); } catch { return null; }
}
export function saveMyGrinder(g) {
  try { localStorage.setItem(GRINDER_KEY, JSON.stringify(g)); } catch {}
}

// ── 내 원두 ──────────────────────────────────────────────────────
export function loadMyBean() {
  try { return JSON.parse(localStorage.getItem(BEAN_KEY) || "null"); } catch { return null; }
}
export function saveMyBean(b) {
  try { localStorage.setItem(BEAN_KEY, JSON.stringify(b)); } catch {}
}

// ── 레시피 기본값 ────────────────────────────────────────────────
export function loadRecipeDefaults() {
  try { return JSON.parse(localStorage.getItem(RECIPE_DEFAULTS_KEY) || "null"); } catch { return null; }
}
export function saveRecipeDefaults(d) {
  try { localStorage.setItem(RECIPE_DEFAULTS_KEY, JSON.stringify(d)); } catch {}
}

// ── 프리셋 ──────────────────────────────────────────────────────
// localStorage = 빠른 캐시 / Firestore = 영구 백업 (앱 재설치/기기 변경 시 복구용)
export function loadPresets(uid) {
  try { return JSON.parse(localStorage.getItem(PRESETS_KEY_PREFIX + uid) || "[]"); } catch { return []; }
}

export function savePresets(uid, list) {
  try { localStorage.setItem(PRESETS_KEY_PREFIX + uid, JSON.stringify(list)); } catch {}
  // Firestore 백업 (실패해도 localStorage는 이미 저장됐으므로 무시)
  if (uid) {
    setDoc(doc(db, "userPresets", uid), { presets: list, updatedAt: Date.now() }).catch(() => {});
  }
}

// 앱 진입/재설치 후 호출 — Firestore에 저장된 프리셋을 가져와 localStorage와 병합
export async function syncPresetsFromFirestore(uid) {
  if (!uid) return loadPresets(uid);
  try {
    const snap = await getDoc(doc(db, "userPresets", uid));
    const remote = snap.exists() ? (snap.data().presets || []) : [];
    if (remote.length > 0) {
      try { localStorage.setItem(PRESETS_KEY_PREFIX + uid, JSON.stringify(remote)); } catch {}
    }
    return remote.length > 0 ? remote : loadPresets(uid);
  } catch {
    return loadPresets(uid); // 네트워크 실패 시 로컬 캐시로 폴백
  }
}

// ── 통화 ────────────────────────────────────────────────────────
export function detectDefaultCurrency() {
  try {
    const locale = navigator.language || navigator.languages?.[0] || "en";
    const region = new Intl.Locale(locale).region || "";
    if (region === "KR") return "KRW";
    if (locale.toLowerCase().startsWith("ko")) return "KRW";
    return "USD";
  } catch {
    return "KRW";
  }
}

export function loadCurrency() {
  try {
    const saved = localStorage.getItem(CURRENCY_KEY);
    if (saved) return saved;
    return detectDefaultCurrency();
  } catch {
    return "KRW";
  }
}
export function saveCurrency(c) {
  try { localStorage.setItem(CURRENCY_KEY, c); } catch {}
}

// ── 환율 캐시 (날짜별 1일 캐싱) ──────────────────────────────────
export function loadCachedRate() {
  try {
    const raw = localStorage.getItem(EXRATE_KEY);
    if (!raw) return null;
    const { rate, date } = JSON.parse(raw);
    const today = new Date().toISOString().slice(0, 10);
    return date === today ? rate : null;
  } catch { return null; }
}
export function saveCachedRate(rate) {
  try {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem(EXRATE_KEY, JSON.stringify({ rate, date: today }));
  } catch {}
}

// ── 한국수출입은행 환율 API ───────────────────────────────────────
export async function fetchUsdRate() {
  const cached = loadCachedRate();
  if (cached) return cached;
  try {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const url = `https://www.koreaexim.go.kr/site/program/financial/exchangeJSON?authkey=${EXIM_API_KEY}&searchdate=${dateStr}&data=AP01`;
    const res  = await fetch(url);
    const data = await res.json();
    const usd  = data.find((d) => d.cur_unit === "USD");
    if (!usd) throw new Error("USD not found");
    const rate = parseFloat(usd.deal_bas_r.replace(/,/g, ""));
    saveCachedRate(rate);
    return rate;
  } catch (e) {
    console.warn("[storage] 환율 API 실패:", e.message);
    const raw = localStorage.getItem(EXRATE_KEY);
    if (raw) return JSON.parse(raw).rate;
    return 1380; // fallback
  }
}

// ── 금액 포맷 ────────────────────────────────────────────────────
export function formatPrice(amount, currency, rate = null) {
  if (!amount && amount !== 0) return "—";
  const n = parseFloat(amount);
  if (isNaN(n) || n === 0) return "—";
  if (currency === "USD") {
    const usd = rate ? n / rate : n;
    return `$${usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${Math.round(n).toLocaleString()}원`;
}

export function formatPricePerG(ppg, currency, rate = null) {
  if (!ppg && ppg !== 0) return "—";
  const n = parseFloat(ppg);
  if (isNaN(n) || n === 0) return "—";
  if (currency === "USD") {
    const usd = rate ? n / rate : n;
    return `$${usd.toFixed(4)}/g`;
  }
  return `${n.toFixed(1)}원/g`;
}

export function formatCostPerCup(cost, currency, rate = null) {
  if (!cost && cost !== 0) return "—";
  const n = parseFloat(cost);
  if (isNaN(n) || n === 0) return "—";
  if (currency === "USD") {
    const usd = rate ? n / rate : n;
    return `$${usd.toFixed(2)}/cup`;
  }
  return `${Math.round(n)}원/잔`;
}
