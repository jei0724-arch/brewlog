/* ============================================================
   BREWLOG NOTE — src/components/modals/RecipeModal.jsx
   레시피 기록 / 수정 / 복사 모달
   ─ 프리셋 시스템 (최대 10개, 저장/적용/삭제/수정)
   ─ 내 원두 Vault 연동 (Bean Vault)
   ─ 내 장비 Vault 연동 (Equipment Vault)
   ─ 전자동 / 반자동 / 핸드드립 머신 분기
   ─ Timer 컴포넌트 분리 격리 (인퓨전 + 추출 2페이즈)
   ─ Flavor Radar 실시간 미리보기
   ─ 추출 압력 자동 계산 (ULKA E5 펌프 곡선)
   ─ 날씨 자동 획득 (OpenWeatherMap)
   ─ 구글 드라이브 자동 백업 (저장 시 백그라운드)
   ─ Gemini 캐시 무효화 (저장 후 다음 분석 최신화)
   ============================================================ */
import React, {
  useState, useEffect, useRef, useCallback,
} from "react";
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc,
  query, where, serverTimestamp,
} from "firebase/firestore";
import { db } from "../../config/firebase";
import { I18N }         from "../../constants/localization";
import { COFFEE_MENUS, MenuIcons, FLAVOR_AXES } from "../../constants/coffeeMenus";
import {
  MACHINE_BRANDS, GRINDER_BRANDS,
  loadMyMachine, saveMyMachine,
  loadMyGrinder, saveMyGrinder,
  loadMyBean, saveMyBean,
  loadRecipeDefaults, saveRecipeDefaults,
  loadPresets, savePresets, syncPresetsFromFirestore,
  isAutoMachine, isBothModeBrand, getBuiltinGrinder,
} from "../../utils/storage";
import { calcPressure } from "../../utils/pressure";
import { CoffeeBeanIcon, BrandInput, TagInput, FlavorRadar } from "../ui";
import Timer from "../recipes/Timer";
import HandDripTimer from "../recipes/HandDripTimer";

// ── OpenWeatherMap API ───────────────────────────────────────────
const OWM_KEY    = import.meta.env.VITE_OWM_KEY;
const GEMINI_KEY = import.meta.env.VITE_GEMINI_KEY;
const WEATHER_ICONS = {
  Clear:"☀️", Clouds:"☁️", Rain:"🌧️", Drizzle:"🌦️",
  Thunderstorm:"⛈️", Snow:"❄️", Mist:"🌫️", Fog:"🌫️",
  Haze:"🌫️", Dust:"🌪️", Sand:"🌪️", Smoke:"🌫️",
};


// Gemini API 재시도 헬퍼 (503 과부하 시 최대 3회 지수 백오프)
async function geminiWithRetry(url, body, signal, maxRetry = 3) {
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
        const wait = (2 ** i) * 1000; // 1s → 2s → 4s
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      return res;
    } catch (e) {
      lastErr = e;
      if (e.name === "AbortError") throw e; // 타임아웃은 재시도 안 함
      if (i < maxRetry - 1) await new Promise(r => setTimeout(r, (2 ** i) * 1000));
    }
  }
  throw lastErr || new Error("Gemini 호출 실패");
}

// ── 날씨 팁 캐시 키 (오전/오후 2회 제한) ────────────────────────
function getWeatherTipCacheKey(uid) {
  const now    = new Date();
  const date   = now.toISOString().slice(0, 10);          // 2026-06-18
  const period = now.getHours() < 13 ? "AM" : "PM";      // 오전(~12시) / 오후(13시~)
  return `brewlog_weather_tip_${uid}_${date}_${period}`;
}

// ── 규칙 기반 즉시 팁 생성 ───────────────────────────────────────
function getRuleBasedTip(weather, lang) {
  if (!weather) return null;
  const { temp, humidity, condition } = weather;
  const isKo = lang === "ko";
  const tips = [];

  // 온도 기반
  if (temp >= 28) {
    tips.push(isKo
      ? `🌡️ ${temp}°C 고온 — 분쇄도 0.5단계 굵게, 추출량 3ml 줄이기 권장`
      : `🌡️ ${temp}°C heat — coarser grind by 0.5, reduce yield by 3ml`);
  } else if (temp <= 10) {
    tips.push(isKo
      ? `🥶 ${temp}°C 저온 — 머신 예열 30초 추가, 분쇄도 미세하게 조정`
      : `🥶 ${temp}°C cold — extra 30s preheat, grind slightly finer`);
  } else if (temp >= 23 && temp < 28) {
    tips.push(isKo
      ? `☀️ ${temp}°C 따뜻함 — 평소 레시피 유지, 추출 안정 조건`
      : `☀️ ${temp}°C warm — stable conditions, usual recipe recommended`);
  }

  // 습도 기반
  if (humidity >= 70) {
    tips.push(isKo
      ? `💧 습도 ${humidity}% — 원두 산화 주의, 밀봉 보관 확인`
      : `💧 ${humidity}% humidity — check bean storage, risk of oxidation`);
  } else if (humidity <= 30) {
    tips.push(isKo
      ? `🏜️ 건조 ${humidity}% — 원두가 빠르게 마름, 추출 시간 1초 단축 고려`
      : `🏜️ Dry ${humidity}% — beans dry fast, consider 1s shorter extraction`);
  }

  // 날씨 상태 기반
  if (condition === "Rain" || condition === "Drizzle") {
    tips.push(isKo
      ? `🌧️ 비 날씨 — 기압 낮아 추출 빨라질 수 있음, 분쇄도 미세하게`
      : `🌧️ Rainy — lower pressure may speed extraction, grind slightly finer`);
  } else if (condition === "Thunderstorm") {
    tips.push(isKo
      ? `⛈️ 폭풍 — 기압 급변 주의, 추출 시간 모니터링 권장`
      : `⛈️ Storm — watch extraction time, pressure may vary`);
  }

  return tips.length > 0 ? tips.join("\n") : null;
}

// ── Gemini 날씨 팁 (오전/오후 2회 캐싱) ─────────────────────────
async function fetchGeminiWeatherTip(weather, recentRecipes, lang, uid) {
  if (!GEMINI_KEY || !weather || !uid) return null;
  const cacheKey = getWeatherTipCacheKey(uid);
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
    if (cached) return cached;
  } catch {}

  const isKo = lang === "ko";
  const avgGram     = recentRecipes.length
    ? (recentRecipes.reduce((s,r)=>s+(parseFloat(r.gram)||0),0)/recentRecipes.length).toFixed(1) : null;
  const avgSeconds  = recentRecipes.length
    ? (recentRecipes.reduce((s,r)=>s+(parseFloat(r.seconds)||0),0)/recentRecipes.length).toFixed(0) : null;
  const avgEspresso = recentRecipes.length
    ? (recentRecipes.reduce((s,r)=>s+(parseFloat(r.espressoMl)||0),0)/recentRecipes.length).toFixed(0) : null;
  const topMachine  = recentRecipes.find(r=>r.machine)?.machine || "";
  const topBean     = recentRecipes.find(r=>r.bean)?.bean || "";

  const prompt = isKo
    ? `당신은 전문 바리스타 AI입니다. 현재 날씨와 유저의 평균 레시피를 보고, 오늘 추출에 맞는 파라미터 팁을 JSON으로만 응답하세요.
현재 날씨: ${weather.descKo} ${weather.temp}°C, 습도 ${weather.humidity}%
평균 레시피: 원두 ${avgGram}g / 추출 ${avgSeconds}초 / 추출량 ${avgEspresso}ml${topMachine?" / 머신 "+topMachine:""}${topBean?" / 원두 "+topBean:""}
JSON 형식(반드시 이 형식만): {"tip":"2문장 이내 핵심 팁","grindAdjust":"굵게/미세하게/유지","timeAdjust":"단축/연장/유지","tempAdjust":"높이기/낮추기/유지"}`
    : `You are a professional barista AI. Based on today's weather and the user's average recipe, respond in JSON only with extraction tips.
Weather: ${weather.descKo||weather.condition} ${weather.temp}°C, humidity ${weather.humidity}%
Avg recipe: ${avgGram}g dose / ${avgSeconds}s extraction / ${avgEspresso}ml yield${topMachine?" / machine "+topMachine:""}${topBean?" / bean "+topBean:""}
JSON format only: {"tip":"Key tip in 2 sentences","grindAdjust":"coarser/finer/maintain","timeAdjust":"shorter/longer/maintain","tempAdjust":"higher/lower/maintain"}`;

  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 15000);
    let res;
    try {
      res = await geminiWithRetry(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${GEMINI_KEY}`,
        {
          contents:[{ parts:[{ text:prompt }] }],
          generationConfig:{ temperature:0.4, maxOutputTokens:256, thinkingConfig:{ thinkingLevel:"minimal" } },
        },
        controller.signal
      );
    } finally { clearTimeout(tid); }
    const data   = await res.json();
    if (data.error) throw new Error(data.error.message);
    const parts  = data.candidates?.[0]?.content?.parts || [];
    const text   = (parts.find(p => !p.thought && p.text) || parts[0] || {}).text || "";
    const clean  = text.replace(/```json\s*/g,"").replace(/```/g,"").trim();
    const parsed = JSON.parse(clean);
    localStorage.setItem(cacheKey, JSON.stringify(parsed));
    return parsed;
  } catch (e) {
    console.warn("[WeatherTip]", e.name === "AbortError" ? "timeout" : e.message);
    return null;
  }
}

async function fetchWeather() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation)
      return reject("위치 정보를 지원하지 않는 브라우저예요.");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude: lat, longitude: lon } = pos.coords;
          const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OWM_KEY}&units=metric&lang=kr`;
          const res = await fetch(url);
          if (!res.ok) return reject("날씨 API 오류: " + res.status);
          const d = await res.json();
          if (d.cod !== 200) return reject("날씨 오류: " + d.message);
          resolve({
            condition: d.weather[0].main,
            descKo: d.weather[0].description,
            temp: Math.round(d.main.temp),
            humidity: d.main.humidity,
            icon: WEATHER_ICONS[d.weather[0].main] || "🌡️",
            country: d.sys?.country || "",
            recordedAt: new Date().toISOString(),
          });
        } catch (e) { reject("네트워크 오류: " + e.message); }
      },
      (err) => {
        const msg =
          err.code === 1 ? "위치 권한을 허용해주세요."
          : err.code === 2 ? "위치를 찾을 수 없어요."
          : err.code === 3 ? "위치 요청 시간이 초과됐어요."
          : err.message;
        reject(msg);
      },
      { timeout: 15000, maximumAge: 60000, enableHighAccuracy: false }
    );
  });
}

// ─────────────────────────────────────────────────────────────────
export default function RecipeModal({
  onClose, onSave, user, editTarget, lang = "ko", recipes = [],
}) {
  const t      = I18N[lang];
  // isEdit/isCopy는 "Firestore 문서 id 존재 여부"로 판별한다.
  // (예전 버그로 일부 레시피에 _isCopy:true가 영구 저장된 경우가 있어,
  //  _isCopy 플래그만으로 판별하면 실제 문서(id 있음)도 계속 복사 모드로 오인식됨)
  const isEdit = !!editTarget?.id;
  const isCopy = !!editTarget && !editTarget.id;

  // ── 내 원두 / 장비 로드 ─────────────────────────────────────────
  const [myBeans,         setMyBeans]         = useState([]);
  const [linkedBeanId,    setLinkedBeanId]    = useState(null);
  const [myEquips,        setMyEquips]        = useState([]);
  const [selectedEquipIds, setSelectedEquipIds] = useState({});

  const applyEquipment = useCallback((eq) => {
    if (!eq) return;
    if (eq.category === "handdrip") {
      setMachineType("handdrip");
      setHandDripName(`${eq.brand}${eq.model ? " " + eq.model : ""}`);
      setMachineBrand(""); setMachineModel("");
      setMachineLocked(true);
    } else if (eq.category === "machine") {
      setMachineType("semi");
      setMachineBrand(eq.brand || "");
      setMachineModel(eq.model || "");
      setMachineLocked(true);
    } else if (eq.category === "grinder") {
      setGrinderBrand(eq.brand || "");
      setGrinderModel(eq.model || "");
      setGrinderLocked(true);
    }
  }, []);

  useEffect(() => {
    if (!user?.uid) return;
    getDocs(query(collection(db, "equipments"), where("uid", "==", user.uid)))
      .then((snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0));
        setMyEquips(list);
        // 신규 작성 시에만 대표 장비 자동 적용
        if (!isEdit && !isCopy) {
          const pMachine  = list.find((e) => e.category === "machine"  && e.isPrimary);
          const pGrinder  = list.find((e) => e.category === "grinder"  && e.isPrimary);
          const pHanddrip = list.find((e) => e.category === "handdrip" && e.isPrimary);
          const newSelected = {};
          if (pHanddrip) { applyEquipment(pHanddrip); newSelected.handdrip = pHanddrip.id; }
          else if (pMachine) { applyEquipment(pMachine); newSelected.machine = pMachine.id; }
          else {
            // isPrimary 없지만 단 1개뿐인 경우 자동 선택
            const onlyMachine  = list.filter(e => e.category === "machine");
            const onlyHanddrip = list.filter(e => e.category === "handdrip");
            if (!pHanddrip && onlyHanddrip.length === 1) { applyEquipment(onlyHanddrip[0]); newSelected.handdrip = onlyHanddrip[0].id; }
            else if (!pMachine && onlyMachine.length === 1) { applyEquipment(onlyMachine[0]); newSelected.machine = onlyMachine[0].id; }
          }
          if (pGrinder)  { applyEquipment(pGrinder);  newSelected.grinder  = pGrinder.id; }
          else {
            const onlyGrinder = list.filter(e => e.category === "grinder");
            if (!pGrinder && onlyGrinder.length === 1) { applyEquipment(onlyGrinder[0]); newSelected.grinder = onlyGrinder[0].id; }
          }
          setSelectedEquipIds(newSelected);
        }
      }).catch(() => {});
  }, [user?.uid, isEdit, isCopy, applyEquipment]);

  useEffect(() => {
    if (!user?.uid) return;
    getDocs(query(collection(db, "beans"), where("uid", "==", user.uid)))
      .then((snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
          .filter((b) => b.status !== "empty")
          .sort(
            (a, b) =>
              (b.createdAt?.toDate?.()?.getTime() ?? 0) -
              (a.createdAt?.toDate?.()?.getTime() ?? 0)
          );
        setMyBeans(list);
        // 신규 작성 + 원두 1개면 자동 선택
        if (!isEdit && !isCopy && list.length === 1) {
          const b = list[0];
          setLinkedBeanId(b.id);
          setForm(f => ({ ...f,
            company:   b.roastery  || "",
            bean:      b.name      || "",
            roastDate: b.roastDate || "",
          }));
        }
      }).catch(() => {});
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 머신 상태 ───────────────────────────────────────────────────
  const savedMachine = loadMyMachine();
  const isHandDrip   = !isEdit && !isCopy && savedMachine?.equipType === "handdrip";

  const [machineLocked, setMachineLocked] = useState(
    isCopy
      ? !!(editTarget.machineBrand || editTarget.machineType === "handdrip")
      : !!savedMachine && !isEdit
  );
  const [machineBrand, setMachineBrand] = useState(
    (isEdit || isCopy) ? (editTarget.machineBrand || "")
    : (isHandDrip ? "" : (savedMachine?.brand || ""))
  );
  const [machineModel, setMachineModel] = useState(
    (isEdit || isCopy) ? (editTarget.machineModel || "")
    : (isHandDrip ? "" : (savedMachine?.model || ""))
  );
  const [machineType, setMachineType] = useState(
    (isEdit || isCopy) ? (editTarget.machineType || "auto")
    : (isHandDrip ? "handdrip" : "auto")
  );
  const [handDripName, setHandDripName] = useState(
    (isEdit || isCopy)
      ? (editTarget.machine && editTarget.machineType === "handdrip" ? editTarget.machine : "")
      : (savedMachine?.handDripName || "")
  );
  const isAutoMode = isAutoMachine(machineBrand) && machineType === "auto";

  // ── 그라인더 상태 ───────────────────────────────────────────────
  const savedGrinder = loadMyGrinder();
  const [grinderLocked, setGrinderLocked] = useState(
    isCopy ? !!editTarget.grinderBrand : (!!savedGrinder && !isEdit)
  );
  const [grinderBrand, setGrinderBrand] = useState(
    (isEdit || isCopy) ? (editTarget.grinderBrand || "") : (savedGrinder?.brand || "")
  );
  const [grinderModel, setGrinderModel] = useState(
    (isEdit || isCopy) ? (editTarget.grinderModel || "") : (savedGrinder?.model || "")
  );
  const isCustomGrinderBrand = grinderBrand === "기타 (직접 입력)";

  // ── 폼 상태 ─────────────────────────────────────────────────────
  const savedBean     = loadMyBean();
  const savedDefaults = loadRecipeDefaults();

  const [form, setForm] = useState(
    (isEdit || isCopy)
      ? {
          ...editTarget,
          waterTemp:       editTarget.waterTemp       || "93",
          waterType:       editTarget.waterType       || "",
          waterBrand:      editTarget.waterBrand      || "",
          diluteCustom:    editTarget.diluteCustom    || "",
          brewPressureBar: editTarget.brewPressureBar || "",
          continuousMemo:  editTarget.continuousMemo  || "",
          tds:             editTarget.tds             || "",
          basketBrand:     editTarget.basketBrand     || "",
          basketSize:      editTarget.basketSize      || "double",
          basketCapacity:  editTarget.basketCapacity  || "",
          tags:            editTarget.tags            || [],
          igUrl:           editTarget.igUrl           || "",
          recipeSteps:     editTarget.recipeSteps     || [],
          recordDate: isCopy
            ? new Date().toISOString().split("T")[0]
            : (editTarget.recordDate || new Date().toISOString().split("T")[0]),
          isPublic: isCopy ? true : (editTarget.isPublic !== false),
        }
      : {
          company:         savedBean?.company   || "",
          bean:            savedBean?.bean      || "",
          roastDate:       savedBean?.roastDate || "",
          recordDate:      new Date().toISOString().split("T")[0],
          rating:          0,
          flavorAcidity:   0, flavorSweet:      0, flavorBitter: 0,
          flavorAroma:     0, flavorAftertaste: 0, flavorBalance: 0, flavorBody: 0,
          gram:            savedDefaults?.gram       || "",
          seconds:         savedDefaults?.seconds    || "",
          infusionSeconds: savedDefaults?.infusionSeconds || "0",
          espressoMl:      savedDefaults?.espressoMl || "",
          diluteMl:        savedDefaults?.diluteMl   || "",
          diluteType:      savedDefaults?.diluteType || "물",
          waterTemp:       savedDefaults?.waterTemp  || "93",
          waterType:       savedDefaults?.waterType  || "",
          waterBrand:      "",
          diluteCustom:    "",
          grindSize:       savedDefaults?.grindSize  || "",
          basketBrand:     savedDefaults?.basketBrand || "",
          basketSize:      savedDefaults?.basketSize  || "double",
          basketCapacity:  savedDefaults?.basketCapacity || "",
          isPublic:  true,
          isIced:    false,
          syrup: "", note: "",
          brewPressureBar: "",
          continuousMemo:  "",
          tds:             "",
          tags: [],
          pourStages: [],
          igUrl: "",
          recipeSteps: [],
        }
  );
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setPourStages = (stages) => setForm((f) => ({ ...f, pourStages: stages }));
  const setRecipeSteps = (steps) => setForm((f) => ({ ...f, recipeSteps: steps }));

  const [saving,  setSaving]  = useState(false);
  const [errors,  setErrors]  = useState({});
  const [weather, setWeather] = useState(isEdit ? (editTarget.weather || null) : null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError,   setWeatherError]   = useState(null);
  // ── 날씨 팁 상태 ─────────────────────────────────────────────
  const [ruleTip,     setRuleTip]     = useState(null); // 규칙 기반 즉시 팁
  const [geminiTip,   setGeminiTip]   = useState(null); // Gemini AI 팁
  const [tipLoading,  setTipLoading]  = useState(false);

  // 신규/복사 시 날씨 자동 획득
  useEffect(() => {
    if (!isEdit && !weather) {
      setWeatherLoading(true);
      fetchWeather()
        .then((w) => { setWeather(w); setWeatherError(null); })
        .catch((e) => { setWeatherError(typeof e === "string" ? e : e.message); })
        .finally(() => setWeatherLoading(false));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 날씨 획득 완료 → 팁 생성 (규칙 즉시 + Gemini 캐시/호출)
  useEffect(() => {
    if (!weather || isEdit) return;
    // 1. 규칙 기반 즉시 표시
    const rule = getRuleBasedTip(weather, lang);
    setRuleTip(rule);
    // 2. Gemini 팁 (캐시 확인 후 없으면 호출)
    if (!GEMINI_KEY || !user?.uid) return;
    const cacheKey = getWeatherTipCacheKey(user.uid);
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
      if (cached) { setGeminiTip(cached); return; }
    } catch {}
    // 캐시 없으면 Gemini 호출
    setTipLoading(true);
    fetchGeminiWeatherTip(weather, recipes.slice(0,5), lang, user.uid)
      .then(tip => { if (tip) setGeminiTip(tip); })
      .finally(() => setTipLoading(false));
  }, [weather]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 메뉴 선택 ───────────────────────────────────────────────────
  const [selectedMenu, setSelectedMenu] = useState(
    (isEdit || isCopy) ? (editTarget.menuId || "") : ""
  );

  const MENU_DEFAULTS = {
    espresso:   { seconds: "25", espressoMl: "30",  diluteMl: "",    diluteType: "물" },
    ristretto:  { seconds: "20", espressoMl: "15",  diluteMl: "",    diluteType: "물" },
    lungo:      { seconds: "40", espressoMl: "60",  diluteMl: "",    diluteType: "물" },
    americano:  { seconds: "25", espressoMl: "30",  diluteMl: "150", diluteType: "물" },
    long_black: { seconds: "25", espressoMl: "60",  diluteMl: "150", diluteType: "물" },
    latte:      { seconds: "25", espressoMl: "30",  diluteMl: "150", diluteType: "우유" },
    cappuccino: { seconds: "25", espressoMl: "30",  diluteMl: "100", diluteType: "우유" },
    flatwhite:  { seconds: "25", espressoMl: "40",  diluteMl: "80",  diluteType: "우유" },
    macchiato:  { seconds: "25", espressoMl: "30",  diluteMl: "20",  diluteType: "우유" },
    cortado:    { seconds: "25", espressoMl: "30",  diluteMl: "30",  diluteType: "우유" },
    cold_brew:  { seconds: "30", espressoMl: "60",  diluteMl: "100", diluteType: "물" },
    hand_drip:  { seconds: "180", espressoMl: "200", diluteMl: "",   diluteType: "" },
  };

  const selectMenu = (menu) => {
    setSelectedMenu(menu.id);
    if (!menu.canIce) set("isIced", false);
    if (MENU_DEFAULTS[menu.id]) {
      setForm((f) => ({ ...f, ...MENU_DEFAULTS[menu.id] }));
    }
  };

  // 핸드드립 메뉴 ↔ machineType 동기화
  const applyingPresetRef = useRef(false);
  const menuSyncMountedRef = useRef(false);
  useEffect(() => {
    if (applyingPresetRef.current) return;
    // 최초 마운트 시엔 스킵 — 저장된 내 머신이 핸드드립이어도
    // 메뉴가 아직 선택 안 된 상태(빈 값)일 뿐이지, machineType까지 되돌리면 안 됨
    if (!menuSyncMountedRef.current) { menuSyncMountedRef.current = true; return; }
    if (selectedMenu === "hand_drip") {
      setMachineType("handdrip");
      setSelectedEquipIds((prev) => {
        if (!prev.machine) return prev;
        const next = { ...prev }; delete next.machine; return next;
      });
      setMachineBrand(""); setMachineModel(""); setMachineLocked(false);
    } else if (machineType === "handdrip") {
      setMachineType("auto");
    }
  }, [selectedMenu]); // eslint-disable-line react-hooks/exhaustive-deps

  // 핸드드립 — 푸어 단계의 최종 누적 물량을 추출량에 자동 반영
  useEffect(() => {
    if (selectedMenu !== "hand_drip") return;
    const amounts = (form.pourStages || []).map(s => parseInt(s.amount) || 0).filter(n => n > 0);
    if (amounts.length === 0) return;
    const maxAmt = Math.max(...amounts);
    if (String(maxAmt) !== form.espressoMl) set("espressoMl", String(maxAmt));
  }, [form.pourStages, selectedMenu]); // eslint-disable-line react-hooks/exhaustive-deps

  // 머신 브랜드/모델 → 내장 그라인더 자동 감지
  useEffect(() => {
    if (!isEdit && !isCopy) {
      const builtin = getBuiltinGrinder(machineBrand, machineModel);
      if (builtin) {
        setGrinderBrand(builtin.brand);
        setGrinderModel(builtin.model);
        setGrinderLocked(true);
      }
    }
  }, [machineBrand, machineModel]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentMenu    = COFFEE_MENUS.find((m) => m.id === selectedMenu);
  const needsDilute    = !currentMenu || currentMenu.needsDilute;
  const diluteCategory = currentMenu?.diluteCategory || "both";
  const hasSyrup       = currentMenu?.hasSyrup  || false;
  const canIce         = currentMenu?.canIce     || false;

  const machineDisplay =
    machineType === "handdrip"
      ? handDripName
      : machineBrand
      ? machineModel ? `${machineBrand} ${machineModel}` : machineBrand
      : "";
  const grinderDisplay = grinderBrand
    ? grinderModel ? `${grinderBrand} ${grinderModel}` : grinderBrand
    : "";

  const isCustomBrand = machineBrand === "기타 (직접 입력)";

  // ── 프리셋 ──────────────────────────────────────────────────────
  const PRESET_LIMIT = 10;
  const [presets,       setPresets]       = useState(() => loadPresets(user?.uid));
  const [showPresetSave, setShowPresetSave] = useState(false);
  const [presetName,    setPresetName]    = useState("");
  const [activePresetId, setActivePresetId] = useState(null);

  // 모달 진입 시 Firestore 백업과 동기화 (앱 재설치/기기 변경으로 localStorage가 비어있어도 복구)
  useEffect(() => {
    if (!user?.uid) return;
    let cancelled = false;
    syncPresetsFromFirestore(user.uid).then(remote => {
      if (!cancelled && remote.length > 0) setPresets(remote);
    });
    return () => { cancelled = true; };
  }, [user?.uid]);

  const applyPreset = (preset) => {
    applyingPresetRef.current = true;
    if (preset.menuId) setSelectedMenu(preset.menuId);
    if (preset.linkedBeanId) {
      setLinkedBeanId(preset.linkedBeanId);
      const bean = myBeans.find((b) => b.id === preset.linkedBeanId);
      if (bean) {
        set("company", bean.roastery || "");
        set("bean", bean.name || "");
        set("roastDate", bean.roastDate || "");
      }
    } else { setLinkedBeanId(null); }

    if (preset.equipType === "handdrip") {
      setMachineType("handdrip"); setHandDripName(preset.handDripName || "");
      setMachineBrand(""); setMachineModel("");
    } else {
      setMachineType(preset.machineType || "auto");
      setMachineBrand(preset.machineBrand || "");
      setMachineModel(preset.machineModel || "");
      setHandDripName("");
    }
    setMachineLocked(!!(preset.machineBrand || preset.handDripName));
    setGrinderBrand(preset.grinderBrand || "");
    setGrinderModel(preset.grinderModel || "");
    setGrinderLocked(!!preset.grinderBrand);
    if (preset.selectedEquipIds) setSelectedEquipIds({ ...preset.selectedEquipIds });

    setForm((f) => ({
      ...f,
      isIced:          preset.isIced          ?? false,
      gram:            preset.gram            ?? "",
      seconds:         preset.seconds         ?? "",
      infusionSeconds: preset.infusionSeconds ?? "0",
      espressoMl:      preset.espressoMl      ?? "",
      waterTemp:       preset.waterTemp       ?? "",
      waterType:       preset.waterType       ?? "",
      waterBrand:      preset.waterBrand      ?? "",
      grindSize:       preset.grindSize       ?? "",
      basketBrand:     preset.basketBrand     ?? "",
      basketSize:      preset.basketSize      ?? "double",
      basketCapacity:  preset.basketCapacity  ?? "",
      diluteMl:        preset.diluteMl        ?? "",
      diluteType:      preset.diluteType      ?? "물",
      syrup:           preset.syrup           ?? "",
      brewPressureBar: preset.brewPressureBar ?? "",
      continuousMemo:  preset.continuousMemo  ?? "",
      pourStages:      preset.pourStages      ?? [],
    }));
    setTimeout(() => { applyingPresetRef.current = false; }, 300);
  };

  // 활성 프리셋을 다시 눌렀을 때 — 프리셋이 채웠던 필드만 원래대로(빈 값) 되돌림
  const clearPreset = () => {
    applyingPresetRef.current = true;
    setLinkedBeanId(null);
    set("company", ""); set("bean", ""); set("roastDate", "");

    setMachineType("auto");
    setMachineBrand(""); setMachineModel(""); setHandDripName("");
    setMachineLocked(false);
    setGrinderBrand(""); setGrinderModel(""); setGrinderLocked(false);
    setSelectedEquipIds({});

    setForm((f) => ({
      ...f,
      isIced: false, gram: "", seconds: "", infusionSeconds: "0",
      espressoMl: "", waterTemp: "", waterType: "", waterBrand: "",
      grindSize: "", basketBrand: "", basketSize: "double", basketCapacity: "",
      diluteMl: "", diluteType: "물", syrup: "", brewPressureBar: "",
      continuousMemo: "", pourStages: [],
    }));
    setTimeout(() => { applyingPresetRef.current = false; }, 300);
  };

  const savePreset = () => {
    const trimmed = presetName.trim();
    if (!trimmed) return;
    if (/^[ㄱ-ㅎㅏ-ㅣ]+$/.test(trimmed)) {
      alert(lang === "en" ? "Please enter a valid preset name." : "프리셋 이름을 정확히 입력해 주세요.");
      return;
    }
    // 같은 이름 있으면 덮어쓰기 confirm
    const existing = presets.find(p => p.name === trimmed);
    if (existing) {
      const ok = window.confirm(lang === "en"
        ? `Preset "${trimmed}" already exists. Overwrite?`
        : `"${trimmed}" 프리셋이 이미 있어요. 덮어씌울까요?`);
      if (!ok) return;
    }
    if (!existing && presets.length >= PRESET_LIMIT) {
      alert(lang === "en"
        ? `You can save up to ${PRESET_LIMIT} presets.`
        : `프리셋은 최대 ${PRESET_LIMIT}개까지 저장할 수 있어요.`);
      return;
    }
    const hdMode = machineType === "handdrip";
    const newPreset = {
      id: existing ? existing.id : `preset_${Date.now()}`,
      name: trimmed,
      menuId:          selectedMenu,
      isIced:          form.isIced  || false,
      linkedBeanId:    linkedBeanId || null,
      equipType:       hdMode ? "handdrip" : "machine",
      handDripName:    hdMode ? handDripName : "",
      machineBrand:    hdMode ? "" : machineBrand,
      machineModel:    hdMode ? "" : machineModel,
      machineType:     hdMode ? "" : machineType,
      grinderBrand, grinderModel,
      selectedEquipIds: { ...selectedEquipIds },
      gram:            form.gram,
      seconds:         form.seconds,
      infusionSeconds: form.infusionSeconds || "0",
      espressoMl:      form.espressoMl,
      waterTemp:       form.waterTemp  || "",
      waterType:       form.waterType  || "",
      waterBrand:      form.waterBrand || "",
      grindSize:       form.grindSize,
      basketBrand:     form.basketBrand,
      basketSize:      form.basketSize,
      basketCapacity:  form.basketCapacity,
      diluteMl:        form.diluteMl,
      diluteType:      form.diluteType,
      syrup:           form.syrup           || "",
      brewPressureBar: form.brewPressureBar || "",
      continuousMemo:  form.continuousMemo  || "",
      pourStages:      hdMode ? (form.pourStages || []) : [],
      createdAt: new Date().toISOString(),
    };
    const updated = existing
      ? presets.map(p => p.id === existing.id ? newPreset : p)
      : [...presets, newPreset];
    savePresets(user?.uid, updated);
    setPresets(updated);
    setPresetName(""); setShowPresetSave(false);
  };

  const deletePreset = (id) => {
    const updated = presets.filter((p) => p.id !== id);
    savePresets(user?.uid, updated);
    setPresets(updated);
    if (activePresetId === id) setActivePresetId(null);
  };

  // ── 유효성 검사 + 저장 ─────────────────────────────────────────
  const modalRef = useRef(null);
  const scrollBodyRef = useRef(null);

  // 스크롤 진행률 — 폼을 얼마나 내려봤는지 (상단 고정 진행바에 사용)
  // 헤더/본문 분리 구조라 실제 스크롤은 modal-scroll-body(scrollBodyRef)에서 일어남
  const [scrollPct, setScrollPct] = useState(0);
  useEffect(() => {
    const el = scrollBodyRef.current;
    if (!el) return;
    const onScroll = () => {
      const max = el.scrollHeight - el.clientHeight;
      setScrollPct(max > 0 ? Math.min(100, Math.round((el.scrollTop / max) * 100)) : 0);
    };
    onScroll();
    el.addEventListener("scroll", onScroll);
    return () => { el.removeEventListener("scroll", onScroll); };
  }, []);

  const scrollToError = (errorKeys) => {
    const priority = ["menu","company","bean","gram","seconds","espressoMl"];
    const first    = priority.find((k) => errorKeys.includes(k));
    if (!first || !modalRef.current) return;
    const el = modalRef.current.querySelector(`[data-field="${first}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const save = async () => {
    const newErrors = {};
    if (!selectedMenu)  newErrors.menu       = true;
    if (!form.company)  newErrors.company    = true;
    if (!form.bean)     newErrors.bean       = true;
    if (!form.gram)     newErrors.gram       = true;
    if (!form.seconds)  newErrors.seconds    = true;
    if (!form.espressoMl) newErrors.espressoMl = true;
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      scrollToError(Object.keys(newErrors));
      return;
    }
    setErrors({});

    // localStorage 저장
    if (machineType === "handdrip") {
      saveMyMachine({ brand: "", model: "", equipType: "handdrip", handDripName: handDripName.trim() });
    } else if (machineBrand && machineModel && !machineLocked) {
      saveMyMachine({ brand: machineBrand, model: machineModel, equipType: "machine", handDripName: "" });
    }
    if (grinderBrand && grinderModel && !grinderLocked) {
      saveMyGrinder({ brand: grinderBrand, model: grinderModel });
    }
    if (form.company || form.bean) {
      saveMyBean({ company: form.company, bean: form.bean, roastDate: form.roastDate });
    }
    saveRecipeDefaults({
      gram: form.gram, seconds: form.seconds,
      infusionSeconds: form.infusionSeconds, espressoMl: form.espressoMl,
      diluteMl: form.diluteMl, diluteType: form.diluteType,
      waterTemp: form.waterTemp, grindSize: form.grindSize,
    });

    setSaving(true);
    try {
      const pressureData = calcPressure(form.espressoMl, form.seconds);
      const payload = {
        weather: weather || null,
        ...form,
        menuId:    selectedMenu,
        menuLabel: currentMenu?.label || "",
        flowRate:  pressureData?.flowRate  || null,
        pumpBar:   pressureData?.pumpBar   || null,
        showerBar: pressureData?.showerBar || null,
        machine:      machineDisplay,
        machineBrand: machineType === "handdrip" ? "" : machineBrand,
        machineModel: machineType === "handdrip" ? "" : machineModel,
        machineType:  machineType === "handdrip"
          ? "handdrip"
          : isAutoMachine(machineBrand) ? machineType : "manual",
        grinder: grinderDisplay,
        grinderBrand, grinderModel,
        grindSize:       form.grindSize,
        basketBrand:     machineType !== "handdrip" ? (form.basketBrand || null) : null,
        basketSize:      machineType !== "handdrip" ? (form.basketSize  || null) : null,
        basketCapacity:  machineType !== "handdrip" ? (form.basketCapacity || null) : null,
        isPublic:        form.isPublic !== false,
        linkedBeanId:    linkedBeanId   || null,
        brewPressureBar: form.brewPressureBar || null,
        continuousMemo:  form.continuousMemo  || "",
        tds:             form.tds             || null,
        tags:            (form.tags || []).filter(Boolean),
        pourStages:      selectedMenu === "hand_drip"
          ? (form.pourStages || []).filter(s => (parseInt(s.time) || 0) > 0 || (parseInt(s.amount) || 0) > 0)
          : [],
        igUrl:           (form.igUrl || "").trim(),
        recipeSteps:     (form.recipeSteps || [])
          .map(sec => ({
            section: (sec.section || "").trim(),
            steps: (sec.steps || []).filter(s => (s.title || "").trim() || (s.desc || "").trim()),
          }))
          .filter(sec => sec.section || sec.steps.length > 0),
      };
      delete payload._isCopy; // 저장 시 절대 Firestore에 남지 않도록 제거 (복사모드 영구고착 버그 방지)

      if (isEdit) {
        // ── consumedG 차액 반영 (24시간 이내 수정) ──
        if (linkedBeanId || editTarget.linkedBeanId) {
          try {
            const createdAt = editTarget.createdAt?.toDate?.() || null;
            const within24h = createdAt && (Date.now() - createdAt.getTime()) < 86400000;
            const prevBeanId = editTarget.linkedBeanId || null;
            const newBeanId  = linkedBeanId || null;
            const prevGram   = parseFloat(editTarget.gram) || 0;
            const newGram    = parseFloat(form.gram) || 0;

            if (within24h) {
              if (prevBeanId && newBeanId && prevBeanId === newBeanId) {
                const diff = newGram - prevGram;
                if (diff !== 0) {
                  const bRef  = doc(db, "beans", prevBeanId);
                  const bSnap = await getDoc(bRef);
                  if (bSnap.exists()) {
                    const cur = parseFloat(bSnap.data().consumedG) || 0;
                    await updateDoc(bRef, { consumedG: Math.max(0, cur + diff) });
                  }
                }
              }
              if (prevBeanId && newBeanId && prevBeanId !== newBeanId) {
                const prevRef  = doc(db, "beans", prevBeanId);
                const prevSnap = await getDoc(prevRef);
                if (prevSnap.exists()) {
                  const cur = parseFloat(prevSnap.data().consumedG) || 0;
                  await updateDoc(prevRef, { consumedG: Math.max(0, cur - prevGram) });
                }
                const newRef  = doc(db, "beans", newBeanId);
                const newSnap = await getDoc(newRef);
                if (newSnap.exists()) {
                  const cur = parseFloat(newSnap.data().consumedG) || 0;
                  await updateDoc(newRef, { consumedG: cur + newGram });
                }
              }
              if (prevBeanId && !newBeanId) {
                const prevRef  = doc(db, "beans", prevBeanId);
                const prevSnap = await getDoc(prevRef);
                if (prevSnap.exists()) {
                  const cur = parseFloat(prevSnap.data().consumedG) || 0;
                  await updateDoc(prevRef, { consumedG: Math.max(0, cur - prevGram) });
                }
              }
              if (!prevBeanId && newBeanId) {
                const newRef  = doc(db, "beans", newBeanId);
                const newSnap = await getDoc(newRef);
                if (newSnap.exists()) {
                  const cur = parseFloat(newSnap.data().consumedG) || 0;
                  await updateDoc(newRef, { consumedG: cur + newGram });
                }
              }
            }
          } catch (e) { console.error("[consumedG] 수정 반영 실패:", e.message); }
        }
        const { id, ...rest } = payload;
        try {
          await updateDoc(doc(db, "recipes", editTarget.id), rest);
        } catch (updateErr) {
          if (updateErr.code === "not-found") {
            alert(
              lang === "en"
                ? "This recipe was already deleted (possibly from another device). Your edits weren't saved."
                : "이 레시피는 이미 삭제되었어요 (다른 기기에서 삭제됐을 수 있어요). 수정 내용은 저장되지 않았습니다."
            );
            onSave();   // 목록 새로고침 + 모달 닫기 (go(-1) 포함)
            setSaving(false);
            return;
          }
          throw updateErr;
        }

      } else {
        await addDoc(collection(db, "recipes"), {
          ...payload,
          author:    user?.displayName,
          uid:       user?.uid,
          createdAt: serverTimestamp(),
        });
        // ── consumedG 누적 (신규) ──
        if (linkedBeanId) {
          try {
            const bRef  = doc(db, "beans", linkedBeanId);
            const bSnap = await getDoc(bRef);
            if (bSnap.exists()) {
              const cur      = parseFloat(bSnap.data().consumedG) || 0;
              const curCount = bSnap.data().usedCount || 0;
              const upd = {
                consumedG:  cur + (parseFloat(form.gram) || 0),
                usedCount:  curCount + 1,
                lastUsedAt: serverTimestamp(),
              };
              if (bSnap.data().status === "sealed" || !bSnap.data().status) upd.status = "open";
              await updateDoc(bRef, upd);
            }
          } catch (e) { console.error("[consumedG] 신규 반영 실패:", e.message); }
        }
        // ── 구독자 알림 ──
        try {
          const followSnap = await getDocs(
            query(collection(db, "users"), where("following", "array-contains", user?.uid))
          );
          await Promise.all(
            followSnap.docs.map((d) =>
              addDoc(collection(db, "notifications"), {
                toUid:    d.id,
                type:     "newRecipe",
                fromUser: user?.displayName,
                beanName: payload.bean || "",
                read:     false,
                createdAt: serverTimestamp(),
              }).catch((e) => console.error("[알림] newRecipe 실패:", e.message))
            )
          );
        } catch (e) { console.error("[알림] 구독자 알림 오류:", e.message); }
      }

      onSave();

      // Gemini 캐시 무효화
      try {
        ["ko", "en"].forEach((l) =>
          localStorage.removeItem(`brewlog_gemini_${user?.uid}_${l}`)
        );
      } catch {}

    } catch (e) {
      alert("저장 오류: " + e.message);
    }
    setSaving(false);
  };

  // ── 추출 압력 실시간 계산 ───────────────────────────────────────
  const pressureData = calcPressure(form.espressoMl, form.seconds);

  // ── JSX ─────────────────────────────────────────────────────────
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal modal--framed" ref={modalRef}>
        <div className="modal-sticky-header">
          <h2 style={{ marginBottom:"10px" }}>
            {isEdit
              ? t.editTitle
              : isCopy
              ? "레시피 복사하기"
              : t.recordTitle}
          </h2>

          {/* 진행 상태 바 — 스크롤한 만큼 채워짐 (지금 폼의 어디쯤 와있는지) */}
          {(() => {
            const requiredChecks = [
              !!selectedMenu,
              !!linkedBeanId || !!(form.bean || "").trim(),
              !!(form.gram || "").toString().trim(),
              !!(form.seconds || "").toString().trim(),
              !!(form.espressoMl || "").toString().trim(),
            ];
            const done = requiredChecks.filter(Boolean).length;
            const total = requiredChecks.length;
            return (
              <div style={{ marginBottom:"14px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"6px" }}>
                  <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.68rem", fontWeight:700, color:"var(--muted)", letterSpacing:"0.05em", textTransform:"uppercase" }}>
                    {lang === "en" ? `Required ${done}/${total}` : `필수 항목 ${done}/${total}`}
                  </span>
                  <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.72rem", fontWeight:600, color: scrollPct === 100 ? "#27ae60" : "var(--latte)" }}>
                    {scrollPct}%
                  </span>
                </div>
                <div style={{ height:"5px", borderRadius:"3px", background:"var(--steam)", overflow:"hidden" }}>
                  <div style={{ width:`${scrollPct}%`, height:"100%", background: scrollPct === 100 ? "#27ae60" : "var(--latte)", transition:"width 0.15s linear, background 0.3s ease" }}/>
                </div>
              </div>
            );
          })()}

          {/* 복사 모드 안내 */}
          {isCopy && (
            <div style={{ background:"#EBF5FB", border:"1px solid #AED6F1", borderRadius:"8px", padding:"10px 14px", marginBottom:"14px", fontSize:"0.8rem", color:"#2980b9", display:"flex", alignItems:"center", gap:"8px" }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/><path d="M8 7v4M8 5.5v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
              다른 레시피를 복사했어요. 내용을 수정하고 저장하면 내 새 레시피로 등록됩니다.
            </div>
          )}

          {/* ── 프리셋 영역 ── */}
          <div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"10px" }}>
              <span style={{ fontSize:"0.72rem", color:"var(--muted)", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", fontFamily:"'DM Sans',sans-serif" }}>
                {lang === "en" ? "Presets" : "프리셋"}
              </span>
              <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.7rem", color: presets.length >= PRESET_LIMIT ? "#e67e22" : "var(--muted)" }}>
                {presets.length} / {PRESET_LIMIT}
              </span>
            </div>
            {presets.length === 0 ? (
              <p style={{ fontSize:"0.78rem", color:"var(--muted)", opacity:0.7 }}>
                {lang === "en"
                  ? "No presets yet. Fill in settings below and save."
                  : "저장된 프리셋이 없어요. 아래 설정을 입력한 뒤 저장해보세요."}
              </p>
            ) : (
              <div style={{ display:"flex", flexWrap:"wrap", gap:"6px" }}>
                {presets.map((p) => {
                  const isActive = activePresetId === p.id;
                  return (
                    <button key={p.id} type="button"
                      onClick={() => {
                        if (isActive) { clearPreset(); setActivePresetId(null); }
                        else { applyPreset(p); setActivePresetId(p.id); }
                      }}
                      style={{
                        padding:"6px 14px", borderRadius:"8px",
                        border:`1px solid ${isActive ? "var(--espresso)" : "var(--latte)"}`,
                        background: isActive ? "var(--espresso)" : "var(--highlight-bg)",
                        color: isActive ? "var(--cream)" : "var(--latte)",
                        fontFamily:"'DM Sans',sans-serif", fontSize:"0.82rem",
                        cursor:"pointer", fontWeight: isActive ? 700 : 500,
                        transition:"all 0.15s",
                        boxShadow: isActive ? "0 0 0 2px var(--espresso)" : "none",
                      }}>
                      {p.name || (lang === "en" ? "(unnamed)" : "(이름 없음)")}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="modal-scroll-body" ref={scrollBodyRef}>
        {/* 프리셋 저장 오버레이 */}
        {showPresetSave && (
          <div style={{ position:"fixed", inset:0, background:"#0005", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}
            onClick={(e) => e.target === e.currentTarget && setShowPresetSave(false)}>
            <div style={{ background:"var(--foam)", borderRadius:"12px", padding:"24px", width:"100%", maxWidth:"380px", boxShadow:"0 8px 32px #0003" }}>
              <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.1rem", marginBottom:"8px", color:"var(--espresso)" }}>
                {lang === "en" ? "Save as Preset" : "프리셋으로 저장"}
              </h3>
              <p style={{ fontSize:"0.78rem", color:"var(--muted)", marginBottom:"16px", lineHeight:1.6 }}>
                {lang === "en"
                  ? "Save current settings as a new preset, or overwrite an existing one."
                  : "새 프리셋으로 저장하거나, 기존 프리셋을 선택해서 덮어씌울 수 있어요."}
              </p>

              {/* ── 기존 프리셋 덮어쓰기 선택 ── */}
              {presets.length > 0 && (
                <div style={{ marginBottom:"16px" }}>
                  <div style={{ fontSize:"0.72rem", fontWeight:700, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"8px" }}>
                    {lang === "en" ? "Overwrite existing preset" : "기존 프리셋 덮어쓰기"}
                  </div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:"6px", marginBottom:"4px" }}>
                    {presets.map((p) => {
                      const isSelected = presetName === p.name;
                      return (
                        <button key={p.id} type="button"
                          onClick={() => setPresetName(isSelected ? "" : p.name)}
                          style={{ padding:"5px 12px", borderRadius:"8px", border:`1px solid ${isSelected ? "var(--latte)" : "var(--steam)"}`,
                            background: isSelected ? "var(--latte)" : "var(--foam)",
                            color: isSelected ? "var(--cream)" : "var(--muted)",
                            fontFamily:"'DM Sans',sans-serif", fontSize:"0.78rem",
                            fontWeight: isSelected ? 600 : 400, cursor:"pointer", transition:"all 0.15s" }}>
                          {p.name}
                          {isSelected && <span style={{ marginLeft:"4px", fontSize:"0.7rem" }}>✓</span>}
                        </button>
                      );
                    })}
                  </div>
                  <p style={{ fontSize:"0.68rem", color:"var(--muted)", opacity:0.7 }}>
                    {lang === "en" ? "Tap to select → will overwrite" : "탭해서 선택하면 해당 프리셋을 덮어씌워요"}
                  </p>
                </div>
              )}

              {/* ── 구분선 ── */}
              {presets.length > 0 && (
                <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"14px" }}>
                  <div style={{ flex:1, height:"1px", background:"var(--divider)" }}/>
                  <span style={{ fontSize:"0.68rem", color:"var(--muted)", whiteSpace:"nowrap" }}>
                    {lang === "en" ? "or create new" : "또는 새로 만들기"}
                  </span>
                  <div style={{ flex:1, height:"1px", background:"var(--divider)" }}/>
                </div>
              )}

              {/* ── 새 프리셋 이름 입력 ── */}
              <div className="field full" style={{ marginBottom:"16px" }}>
                <label style={{ fontSize:"0.72rem", fontWeight:700, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.07em" }}>
                  {lang === "en" ? "New preset name" : "새 프리셋 이름"}
                </label>
                <input
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") savePreset(); if (e.key === "Escape") setShowPresetSave(false); }}
                  placeholder={lang === "en" ? "e.g. Morning Espresso" : "예) 아침 에스프레소"}
                  autoFocus={presets.length === 0}
                />
              </div>

              <div style={{ display:"flex", gap:"8px", justifyContent:"flex-end" }}>
                <button className="btn-cancel" onClick={() => { setShowPresetSave(false); setPresetName(""); }}>
                  {lang === "en" ? "Cancel" : "취소"}
                </button>
                <button className="btn-save-sm" onClick={savePreset} disabled={!presetName.trim()}>
                  {(() => {
                    const exists = presets.find(p => p.name === presetName.trim());
                    if (exists) return lang === "en" ? "Overwrite" : "덮어쓰기";
                    return lang === "en" ? "Save" : "저장";
                  })()}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="modal-grid">
          {/* ── 섹션: 기본 정보 ── */}
          <div style={{ gridColumn:"1 / -1", margin:"4px 0 16px" }}>
            <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.78rem", fontWeight:700, color:"var(--espresso)", letterSpacing:"0.04em" }}>{lang === "en" ? "Basic Info" : "기본 정보"}</span>
            <div style={{ height:"1px", background:"var(--divider)", marginTop:"10px" }}/>
          </div>

          {/* 커피 메뉴 선택 */}
          <div className="field full" data-field="menu">
            <label style={{ color: errors.menu ? "#c0392b" : undefined }}>{t.coffeeMenu}</label>
            <div className="menu-selector" style={{ border: errors.menu ? "1px solid #c0392b" : "none", borderRadius:"8px", padding: errors.menu ? "0.5rem" : "0" }}>
              {COFFEE_MENUS.map((m) => (
                <button key={m.id} type="button"
                  className={`menu-btn ${selectedMenu === m.id ? "selected" : ""}`}
                  onClick={() => { selectMenu(m); setErrors((p) => ({ ...p, menu: false })); }}>
                  {MenuIcons[m.id]}
                  {lang === "en" ? m.labelEn : m.label}
                </button>
              ))}
            </div>
            {errors.menu && <p style={{ color:"#c0392b", fontSize:"0.78rem", marginTop:"0.3rem" }}>⚠️ 커피 메뉴를 선택해주세요</p>}
          </div>

          {/* HOT / ICE 토글 */}
          {canIce && (
            <div className="field full">
              <div style={{ display:"flex", gap:"8px" }}>
                {[
                  { isIced:false, label:"HOT", color:"#e67e22", bg:"#FEF3E8" },
                  { isIced:true,  label:"ICE", color:"#2980b9", bg:"#EBF5FB" },
                ].map(({ isIced, label, color, bg }) => (
                  <button key={label} type="button"
                    onClick={() => { set("isIced", isIced); if (!isIced && !form.waterTemp) set("waterTemp","93"); }}
                    style={{ flex:1, height:"44px", border:"1px solid", borderRadius:"8px", cursor:"pointer",
                      fontFamily:"'DM Sans',sans-serif", fontSize:"0.9rem", fontWeight: form.isIced === isIced ? 600 : 400,
                      transition:"all 0.2s", display:"flex", alignItems:"center", justifyContent:"center", gap:"6px",
                      borderColor: form.isIced === isIced ? color : "var(--steam)",
                      background:  form.isIced === isIced ? bg    : "var(--foam)",
                      color:       form.isIced === isIced ? color : "var(--muted)" }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 원두 선택 — 내 원두에서 */}
          {myBeans.length === 0 ? (
            <div className="field full">
              <div style={{ background:"var(--cream)", border:"1px solid var(--divider)", borderRadius:"8px", padding:"14px 16px", fontSize:"0.82rem", color:"var(--muted)", lineHeight:1.6 }}>
                {lang === "en"
                  ? "No beans registered. Add beans in the My Beans tab first."
                  : "등록된 원두가 없어요. 내 원두 탭에서 원두를 먼저 추가해주세요."}
              </div>
            </div>
          ) : (
            <div className="field full">
              <label style={{ color: errors.bean ? "#c0392b" : undefined }}>
                {lang === "en" ? "Select Bean *" : "원두 선택 *"}
              </label>
              <div style={{ display:"flex", flexWrap:"wrap", gap:"6px" }}>
                {myBeans.map((b) => {
                  const roastDays  = b.roastDate ? Math.floor((Date.now() - new Date(b.roastDate)) / 86400000) : null;
                  const isExhausted = b.status === "empty";
                  const isSelected  = linkedBeanId === b.id;
                  return (
                    <button key={b.id} type="button"
                      disabled={isExhausted}
                      onClick={() => {
                        if (isSelected) {
                          setLinkedBeanId(null);
                          set("company",""); set("bean",""); set("roastDate","");
                        } else {
                          setLinkedBeanId(b.id);
                          set("company", b.roastery || "");
                          set("bean",    b.name     || "");
                          set("roastDate", b.roastDate || "");
                          setErrors((p) => ({ ...p, bean:false, company:false }));
                        }
                      }}
                      style={{
                        padding:"6px 12px", border:"1px solid", borderRadius:"8px",
                        fontFamily:"'DM Sans',sans-serif", fontSize:"0.78rem",
                        cursor: isExhausted ? "not-allowed" : "pointer",
                        borderColor: isSelected  ? "var(--espresso)" : "var(--steam)",
                        background:  isSelected  ? "var(--espresso)" : isExhausted ? "var(--divider)" : "var(--foam)",
                        color:       isSelected  ? "var(--cream)"    : isExhausted ? "var(--muted)"   : "var(--espresso)",
                        opacity: isExhausted ? 0.5 : 1, textAlign:"left", lineHeight:1.4, transition:"all 0.15s",
                      }}>
                      <span style={{ fontWeight:600 }}>{b.name}</span>
                      <span style={{ marginLeft:"4px", fontSize:"0.72rem", opacity:0.7 }}>· {b.roastery}</span>
                      {roastDays !== null && (
                        <span style={{ marginLeft:"4px", fontSize:"0.65rem", opacity:0.6 }}>
                          ({roastDays}{lang === "en" ? "d" : "일"})
                        </span>
                      )}
                      {b.usedCount > 0 && (
                        <span style={{ marginLeft:"3px", fontSize:"0.65rem", color: isSelected ? "var(--cream)" : "var(--latte)", opacity:0.8 }}>
                          ×{b.usedCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {errors.bean && <p style={{ color:"#c0392b", fontSize:"0.78rem", marginTop:"0.4rem" }}>⚠️ {lang === "en" ? "Please select a bean." : "원두를 선택해주세요."}</p>}
            </div>
          )}

          {/* 기록 날짜 */}
          <div className="field full">
            <label>{lang === "en" ? "Brew Date" : "기록 날짜"}</label>
            <input type="date" value={form.recordDate || ""}
              onChange={(e) => set("recordDate", e.target.value)}
              max={new Date().toISOString().split("T")[0]}/>
          </div>

          {/* ── 섹션: 장비 설정 ── */}
          <div style={{ gridColumn:"1 / -1", margin:"36px 0 16px" }}>
            <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.78rem", fontWeight:700, color:"var(--espresso)", letterSpacing:"0.04em" }}>{lang === "en" ? "Equipment" : "장비 설정"}</span>
            <div style={{ height:"1px", background:"var(--divider)", marginTop:"10px" }}/>
          </div>

          {/* 내 장비에서 선택 */}
          {myEquips.length > 0 && (
            <div className="field full" style={{ background:"var(--foam)", border:"1px solid var(--latte)", borderRadius:"var(--r-card)", padding:"16px" }}>
              <label style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><rect x="1.5" y="4" width="9" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M4 4V3a2 2 0 0 1 4 0v1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><path d="M10.5 7h1.5a1.5 1.5 0 0 1 0 3h-1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                {lang === "en" ? "Select from My Gear" : "내 장비에서 선택"}
              </label>
              {[
                { cat:"machine",  labelKo:"커피 머신",    labelEn:"Machine" },
                { cat:"handdrip", labelKo:"핸드드립 기구", labelEn:"Hand Drip" },
                { cat:"other",    labelKo:"기타",         labelEn:"Other" },
                { cat:"grinder",  labelKo:"그라인더",     labelEn:"Grinder" },
              ].map(({ cat, labelKo, labelEn }) => {
                if (cat === "machine"  && selectedMenu === "hand_drip") return null;
                if (cat === "handdrip" && selectedMenu && selectedMenu !== "hand_drip" && selectedMenu !== "other") return null;
                const catEquips = myEquips.filter((e) => e.category === cat);
                if (!catEquips.length) return null;
                return (
                  <div key={cat} style={{ marginBottom:"20px", marginTop: cat === "grinder" ? "12px" : 0, paddingTop: cat === "grinder" ? "12px" : 0, borderTop: cat === "grinder" ? "2px solid var(--divider)" : "none" }}>
                    <div style={{ fontSize:"0.64rem", fontWeight:700, color:"var(--latte)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"7px", paddingBottom:"4px", borderBottom:"1px solid var(--divider)" }}>
                      {lang === "en" ? labelEn : labelKo}
                    </div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:"6px" }}>
                      {catEquips.map((eq) => {
                        const isSelected = selectedEquipIds[eq.category] === eq.id;
                        return (
                          <button key={eq.id} type="button"
                            onClick={() => {
                              const newIds = { ...selectedEquipIds };
                              if (isSelected) { delete newIds[eq.category]; setSelectedEquipIds(newIds); }
                              else {
                                if (eq.category === "machine")  delete newIds.handdrip;
                                if (eq.category === "handdrip") delete newIds.machine;
                                newIds[eq.category] = eq.id;
                                setSelectedEquipIds(newIds);
                                applyEquipment(eq);
                              }
                            }}
                            style={{ padding:"5px 12px", border:"1px solid", borderRadius:"8px",
                              fontFamily:"'DM Sans',sans-serif", fontSize:"0.78rem", cursor:"pointer", transition:"all 0.15s",
                              display:"flex", alignItems:"center", gap:"5px",
                              borderColor: isSelected ? "var(--espresso)" : "var(--steam)",
                              background:  isSelected ? "var(--espresso)" : "var(--foam)" }}>
                            <span style={{ fontWeight:600, color: isSelected ? "var(--cream)" : "var(--espresso)" }}>{eq.brand}</span>
                            {eq.isPrimary && !isSelected && <span style={{ fontSize:"0.6rem", color:"var(--latte)" }}>★</span>}
                            {eq.model && <span style={{ color: isSelected ? "var(--cream)" : "var(--muted)", fontSize:"0.72rem", opacity: isSelected ? 0.8 : 1 }}>{eq.model}</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* 분쇄도 — 그라인더 선택과 한 카드 안에서 이어지게 표시 */}
              {!isAutoMode && (
                <div style={{ marginTop:"2px" }}>
                  <div style={{ fontSize:"0.64rem", fontWeight:700, color:"var(--latte)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"7px", paddingBottom:"4px", borderBottom:"1px solid var(--divider)" }}>
                    {lang === "en" ? "Grind Size" : "분쇄도"}
                  </div>
                  <input value={form.grindSize} onChange={(e) => set("grindSize", e.target.value)}
                    placeholder={lang === "en" ? "e.g. 15, Medium-Fine …" : "예) 15, 중세 …"}
                    style={{ width:"100%", padding:"0.7rem 1rem", border:"1px solid var(--steam)", borderRadius:"var(--r-btn)", background:"var(--foam)", fontFamily:"'DM Sans',sans-serif", fontSize:"0.9rem", color:"var(--espresso)", outline:"none", boxSizing:"border-box" }}/>
                </div>
              )}
            </div>
          )}

          {/* 분쇄도 (내 장비 카드가 없을 때의 대체 — 독립 박스로 표시) */}
          {myEquips.length === 0 && !isAutoMode && (
            <div className="field full" style={{ marginTop:"8px" }}>
              <div style={{ background:"var(--foam)", border:"1px solid var(--latte)", borderRadius:"var(--r-card)", padding:"14px 16px" }}>
                <label style={{ display:"flex", alignItems:"center", gap:"6px", marginBottom:"8px" }}>
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="var(--latte)" strokeWidth="1.4"/><circle cx="8" cy="8" r="2" fill="var(--latte)"/></svg>
                  {lang === "en" ? "Grind Size" : "분쇄도"}
                </label>
                <input value={form.grindSize} onChange={(e) => set("grindSize", e.target.value)}
                  placeholder={lang === "en" ? "e.g. 15, Medium-Fine …" : "예) 15, 중세 …"}/>
              </div>
            </div>
          )}

          {/* 머신 / 핸드드립 (내 장비 미등록 시) */}
          {!myEquips.some((e) => e.category === "machine" || e.category === "handdrip") && (
            <div className="field full">
              <label>{machineType === "handdrip" ? (lang === "en" ? "Hand Drip Equipment" : "핸드드립 기구") : t.machine}</label>
              <div style={{ display:"flex", gap:"8px", marginBottom:"10px" }}>
                {[
                  { val:"auto",     label: lang === "en" ? "Coffee Machine" : "커피 머신" },
                  { val:"handdrip", label: lang === "en" ? "Hand Drip"      : "핸드드립" },
                ].map(({ val, label }) => (
                  <button key={val} type="button"
                    onClick={() => {
                      if (val === "handdrip") {
                        setMachineType("handdrip"); setMachineBrand(""); setMachineModel(""); setMachineLocked(false);
                        const hd = COFFEE_MENUS.find((m) => m.id === "hand_drip");
                        if (hd) selectMenu(hd);
                      } else {
                        setMachineType("auto");
                        setMachineBrand(savedMachine?.equipType !== "handdrip" ? (savedMachine?.brand || "") : "");
                        setMachineModel(savedMachine?.equipType !== "handdrip" ? (savedMachine?.model || "") : "");
                        setMachineLocked(false);
                      }
                    }}
                    style={{ flex:1, height:"42px", border:"1px solid", borderRadius:"8px",
                      borderColor: (val === "handdrip" ? machineType === "handdrip" : machineType !== "handdrip") ? "var(--espresso)" : "var(--steam)",
                      background:  (val === "handdrip" ? machineType === "handdrip" : machineType !== "handdrip") ? "var(--espresso)" : "var(--foam)",
                      color:       (val === "handdrip" ? machineType === "handdrip" : machineType !== "handdrip") ? "var(--cream)"    : "var(--muted)",
                      fontFamily:"'DM Sans',sans-serif", fontSize:"0.88rem",
                      fontWeight: (val === "handdrip" ? machineType === "handdrip" : machineType !== "handdrip") ? 600 : 400,
                      cursor:"pointer", transition:"all 0.2s" }}>
                    {label}
                  </button>
                ))}
              </div>
              {machineType === "handdrip" ? (
                <input value={handDripName} onChange={(e) => setHandDripName(e.target.value)}
                  placeholder={lang === "en" ? "e.g. Hario V60, Chemex …" : "예) 하리오 V60, 케멕스 …"}
                  style={{ width:"100%", padding:"0.75rem 1rem", border:"1px solid var(--steam)", borderRadius:"8px", background:"var(--cream)", fontFamily:"'DM Sans',sans-serif", fontSize:"0.95rem", color:"var(--espresso)", outline:"none" }}
                />
              ) : machineLocked ? (
                <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
                  <div style={{ flex:1, padding:"0.75rem 1rem", border:"1px solid var(--steam)", borderRadius:"8px", background:"var(--cream)", fontSize:"0.95rem", color:"var(--espresso)", fontWeight:500 }}>
                    {machineDisplay}
                  </div>
                  <button onClick={() => setMachineLocked(false)}
                    style={{ height:"42px", padding:"0 16px", background:"none", border:"1px solid var(--steam)", borderRadius:"8px", fontFamily:"'DM Sans',sans-serif", fontSize:"0.82rem", color:"var(--muted)", cursor:"pointer", whiteSpace:"nowrap", flexShrink:0, transition:"all 0.2s" }}>
                    {lang === "en" ? "Edit" : "변경"}
                  </button>
                </div>
              ) : (
                <>
                  <BrandInput value={machineBrand} onChange={(v) => { setMachineBrand(v); setMachineModel(""); }}
                    brands={MACHINE_BRANDS} placeholder="브랜드 입력 또는 검색 (예: Breville, 드롱기…)"/>
                  {machineBrand && (
                    <>
                      {isBothModeBrand(machineBrand) && (
                        <div style={{ display:"flex", gap:"8px", marginTop:"8px" }}>
                          {[{ val:"auto", label: t.autoType }, { val:"manual", label: t.manualType }].map(({ val, label }) => (
                            <button key={val} type="button" onClick={() => setMachineType(val)}
                              style={{ flex:1, height:"42px", border:"1px solid", borderRadius:"8px",
                                borderColor: machineType === val ? "var(--espresso)" : "var(--steam)",
                                background:  machineType === val ? "var(--espresso)" : "var(--foam)",
                                color:       machineType === val ? "var(--cream)"    : "var(--muted)",
                                fontFamily:"'DM Sans',sans-serif", fontSize:"0.88rem",
                                fontWeight: machineType === val ? 600 : 400, cursor:"pointer", transition:"all 0.2s" }}>
                              {label}
                            </button>
                          ))}
                        </div>
                      )}
                      <input value={machineModel} onChange={(e) => setMachineModel(e.target.value)}
                        placeholder={isCustomBrand ? "브랜드명과 모델명 입력" : "예) Barista Express, Dedica …"}
                        style={{ width:"100%", marginTop:"8px", padding:"0.75rem 1rem", border:"1px solid var(--steam)", borderRadius:"8px", background:"var(--cream)", fontFamily:"'DM Sans',sans-serif", fontSize:"0.95rem", color:"var(--espresso)", outline:"none" }}
                      />
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* 그라인더 (내 장비 미등록 + 전자동 아닐 때) */}
          {!myEquips.some((e) => e.category === "grinder") && !isAutoMode && (
            grinderLocked ? (
              <div className="field full">
                <label>{t.grinder}</label>
                <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
                  <div style={{ flex:1, padding:"0.75rem 1rem", border:"1px solid var(--steam)", borderRadius:"8px", background:"var(--cream)", fontSize:"0.95rem", color:"var(--espresso)", fontWeight:500 }}>
                    {grinderDisplay}
                  </div>
                  <button onClick={() => setGrinderLocked(false)}
                    style={{ height:"42px", padding:"0 16px", background:"none", border:"1px solid var(--steam)", borderRadius:"8px", fontFamily:"'DM Sans',sans-serif", fontSize:"0.82rem", color:"var(--muted)", cursor:"pointer", whiteSpace:"nowrap", flexShrink:0, transition:"all 0.2s" }}>
                    {lang === "en" ? "Edit" : "변경"}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="field full">
                  <label>{t.grinderBrand}</label>
                  <BrandInput value={grinderBrand} onChange={(v) => { setGrinderBrand(v); setGrinderModel(""); }}
                    brands={GRINDER_BRANDS} placeholder="브랜드 입력 또는 검색 (예: Mahlkönig, 마쩌…)"/>
                </div>
                {grinderBrand && (
                  <div className="field full">
                    <label>{t.machineModel}</label>
                    <input value={grinderModel} onChange={(e) => setGrinderModel(e.target.value)}
                      placeholder={isCustomGrinderBrand ? "브랜드명과 모델명 입력" : "예) Encore, C40, Nano …"}/>
                  </div>
                )}
              </>
            )
          )}

          {/* 바스켓 (핸드드립 아닐 때만) — 브랜드/사이즈/용량을 하나의 카드로 묶어서 "바스켓 설정"이라는 한 그룹임을 명확히 함 */}
          {machineType !== "handdrip" && (
            <div className="field full" style={{ marginTop:"8px" }}>
              <div style={{ background:"var(--cream)", border:"1px solid var(--divider)", borderRadius:"var(--r-card)", padding:"16px", display:"flex", flexDirection:"column", gap:"14px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 6h10l-1 7H4L3 6z" stroke="var(--latte)" strokeWidth="1.3" strokeLinejoin="round"/><path d="M3 6h10" stroke="var(--latte)" strokeWidth="1.3"/></svg>
                  <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.72rem", fontWeight:700, color:"var(--espresso)", letterSpacing:"0.06em", textTransform:"uppercase" }}>
                    {lang === "en" ? "Basket Settings" : "바스켓 설정"}
                  </span>
                </div>

                {/* 브랜드 */}
                <div>
                  <label style={{ display:"block", fontSize:"0.72rem", color:"var(--muted)", letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:"6px" }}>
                    {lang === "en" ? "Brand" : "브랜드"}
                  </label>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:"6px", marginBottom:"8px" }}>
                    {["기본 제공", "VST", "IMS", "Pullman", "직접입력"].map(b => (
                      <button key={b} type="button"
                        onClick={() => set("basketBrand", b === "직접입력" ? (form.basketBrand && !["기본 제공","VST","IMS","Pullman"].includes(form.basketBrand) ? form.basketBrand : "") : b)}
                        style={{
                          padding:"6px 12px", borderRadius:"999px", border:"1px solid",
                          borderColor: (b === "직접입력" ? (form.basketBrand && !["기본 제공","VST","IMS","Pullman"].includes(form.basketBrand)) : form.basketBrand === b) ? "var(--espresso)" : "var(--steam)",
                          background:  (b === "직접입력" ? (form.basketBrand && !["기본 제공","VST","IMS","Pullman"].includes(form.basketBrand)) : form.basketBrand === b) ? "var(--espresso)" : "var(--foam)",
                          color:       (b === "직접입력" ? (form.basketBrand && !["기본 제공","VST","IMS","Pullman"].includes(form.basketBrand)) : form.basketBrand === b) ? "var(--cream)" : "var(--muted)",
                          fontFamily:"'DM Sans',sans-serif", fontSize:"0.78rem", cursor:"pointer", transition:"all 0.15s" }}>
                        {b === "기본 제공" ? (lang === "en" ? "Stock" : "기본 제공") : b === "직접입력" ? (lang === "en" ? "Other" : "직접입력") : b}
                      </button>
                    ))}
                  </div>
                  {(form.basketBrand && !["기본 제공","VST","IMS","Pullman"].includes(form.basketBrand)) || form.basketBrand === "" ? (
                    <input value={["기본 제공","VST","IMS","Pullman"].includes(form.basketBrand) ? "" : form.basketBrand}
                      onChange={(e) => set("basketBrand", e.target.value)}
                      placeholder={lang === "en" ? "e.g. Decent, Synesso…" : "예) 디센트, 시네소 등 직접 입력"}/>
                  ) : null}
                </div>

                {/* 사이즈 */}
                <div>
                  <label style={{ display:"block", fontSize:"0.72rem", color:"var(--muted)", letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:"6px" }}>
                    {lang === "en" ? "Size" : "사이즈"}
                  </label>
                  <div style={{ display:"flex", gap:"8px" }}>
                    {[["single", lang === "en" ? "Single" : "싱글"], ["double", lang === "en" ? "Double" : "더블"], ["triple", lang === "en" ? "Triple" : "트리플"]].map(([v, lbl]) => (
                      <button key={v} type="button" onClick={() => set("basketSize", v)}
                        style={{ flex:1, padding:"9px", borderRadius:"8px", border:"1px solid",
                          borderColor: form.basketSize === v ? "var(--espresso)" : "var(--steam)",
                          background:  form.basketSize === v ? "var(--espresso)" : "var(--foam)",
                          color:       form.basketSize === v ? "var(--cream)" : "var(--muted)",
                          fontFamily:"'DM Sans',sans-serif", fontSize:"0.82rem", cursor:"pointer", transition:"all 0.15s" }}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 용량 */}
                <div>
                  <label style={{ display:"block", fontSize:"0.72rem", color:"var(--muted)", letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:"6px" }}>
                    {lang === "en" ? "Capacity (g, optional)" : "용량(g, 선택)"}
                  </label>
                  <input type="number" step="0.5" value={form.basketCapacity} onChange={(e) => set("basketCapacity", e.target.value)}
                    placeholder={lang === "en" ? "e.g. 18, 20, 22 (VST/IMS spec)" : "예) 18, 20, 22 (VST/IMS 표기 용량)"}
                    style={{ width:"100%", padding:"0.7rem 1rem", border:"1px solid var(--steam)", borderRadius:"var(--r-btn)", background:"var(--foam)", fontFamily:"'DM Sans',sans-serif", fontSize:"0.9rem", color:"var(--espresso)", outline:"none", boxSizing:"border-box" }}/>
                </div>
              </div>
            </div>
          )}

          {/* ── 섹션: 추출 파라미터 ── */}
          <div style={{ gridColumn:"1 / -1", margin:"36px 0 16px" }}>
            <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.78rem", fontWeight:700, color:"var(--espresso)", letterSpacing:"0.04em" }}>{lang === "en" ? "Extraction Parameters" : "추출 파라미터"}</span>
            <div style={{ height:"1px", background:"var(--divider)", marginTop:"10px" }}/>
          </div>

          <div style={{ gridColumn:"1 / -1", display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", background:"var(--foam)", border:"1px solid var(--latte)", borderRadius:"var(--r-card)", padding:"16px" }}>
          {/* 원두량 */}
          {isAutoMode ? (
            <div className="field full">
              <div className="bean-counter">
                <span className="bean-counter-label">
                  {t.gramAuto}
                  <span className="auto-badge">전자동</span>
                </span>
                <div className="bean-counter-display">
                  <div className="bean-icons">
                    {Array.from({ length: Number(form.gram) || 0 }).map((_, i) => (
                      <span key={i} className="bean-icon" title="클릭해서 제거"
                        onClick={() => set("gram", String(Math.max(0, (Number(form.gram)||0) - 1)))}>
                        <CoffeeBeanIcon size={22}/>
                      </span>
                    ))}
                    {(!form.gram || Number(form.gram) === 0) && (
                      <span style={{ fontSize:"0.82rem", color:"var(--muted)" }}>
                        {lang === "ko" ? "콩을 추가해주세요" : "Add beans"}
                      </span>
                    )}
                  </div>
                  <div className="bean-counter-btns">
                    <button type="button" className="bean-btn"
                      onClick={() => set("gram", String(Math.max(0, (Number(form.gram)||0) - 1)))}>−</button>
                    <button type="button" className="bean-btn"
                      onClick={() => set("gram", String((Number(form.gram)||0) + 1))}>+</button>
                  </div>
                </div>
                <span className="bean-count-text">{form.gram || 0}개</span>
              </div>
            </div>
          ) : (
            <div className="field" data-field="gram">
              <label style={{ color: errors.gram ? "#c0392b" : undefined }}>{t.gram}</label>
              <input type="number" value={form.gram}
                onChange={(e) => { set("gram", String(Math.max(0, Number(e.target.value)))); setErrors((p) => ({ ...p, gram:false })); }}
                placeholder="18" min="0"
                style={{ borderColor: errors.gram ? "#c0392b" : undefined }}/>
              {errors.gram && <p style={{ color:"#c0392b", fontSize:"0.78rem", marginTop:"0.3rem" }}>⚠️ 필수 항목이에요</p>}
            </div>
          )}

          {/* 추출 시간 — 메뉴에 따라 다른 타이머 */}
          <div className="field" data-field="seconds">
            <label style={{ color: errors.seconds ? "#c0392b" : undefined }}>{t.seconds}</label>
            {selectedMenu === "hand_drip" ? (
              <HandDripTimer
                value={form.seconds}
                pourStages={form.pourStages}
                onChange={(v) => { set("seconds", v); setErrors((p) => ({ ...p, seconds:false })); }}
                onStagesChange={setPourStages}
                lang={lang}
              />
            ) : (
              <Timer
                value={form.seconds}
                infusionValue={form.infusionSeconds || "0"}
                onChange={(v) => { set("seconds", v); setErrors((p) => ({ ...p, seconds:false })); }}
                onInfusionChange={(v) => set("infusionSeconds", v)}
                lang={lang} t={t}
              />
            )}
            {errors.seconds && <p style={{ color:"#c0392b", fontSize:"0.78rem", marginTop:"0.3rem" }}>{lang === "en" ? "⚠️ Required" : "⚠️ 필수 항목이에요"}</p>}
          </div>

          {/* 푸어 단계별 기록 — 핸드드립 전용. 위 타이머에서 "구간 기록"을 누르면 시간이 자동으로 여기 채워짐 */}
          {selectedMenu === "hand_drip" && (
            <div className="field full" data-field="pourStages">
              <label>{lang === "en" ? "Pour Stages (optional)" : "푸어 단계 기록 (선택)"}</label>
              <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.72rem", color:"var(--muted)", marginBottom:"10px", lineHeight:1.5 }}>
                {lang === "en"
                  ? "Tap \"Record Stage\" on the timer above to auto-fill the time, then fill in the title/amount/description so others can follow your recipe step by step."
                  : "위 타이머에서 \"구간 기록\"을 누르면 시간이 자동으로 채워져요. 제목·물량·설명을 채우면 다른 사람도 그대로 따라 할 수 있어요."}
              </p>

              {(() => {
                const raw = form.pourStages || [];
                // time = 각 구간 자체의 길이(duration). 배열 순서가 곧 브루잉 순서이므로
                // 정렬하지 않고 순서대로 누적해서 시작~종료 구간을 계산함
                let cum = 0;
                const withCum = raw.map((stage) => {
                  const dur = parseInt(stage.time) || 0;
                  const start = cum;
                  cum += dur;
                  return { stage, start, end: cum };
                });
                const total = cum;

                const updateStage = (origIdx, patch) => {
                  const next = [...raw];
                  next[origIdx] = { ...next[origIdx], ...patch };
                  setPourStages(next);
                };
                const removeStage = (origIdx) => setPourStages(raw.filter((_, idx) => idx !== origIdx));

                return (
                  <>
                    {withCum.map(({ stage, start, end }, origIdx) => (
                  <div key={origIdx} style={{ background:"var(--cream)", border:"1px solid var(--divider)", borderRadius:"10px", padding:"12px", marginBottom:"10px" }}>
                    {/* 헤더 행: 번호 + 누적 시간범위 + 삭제 */}
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"8px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                        <span style={{ width:"20px", height:"20px", borderRadius:"50%", background:"var(--espresso)", color:"var(--cream)", fontSize:"0.68rem", fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{origIdx+1}</span>
                        <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.72rem", color:"var(--muted)" }}>
                          {start}{lang==="en"?"s":"초"} → {end}{lang==="en"?"s":"초"} {lang==="en"?"(cumulative)":"(누적)"}
                        </span>
                      </div>
                      <button type="button"
                        onClick={() => removeStage(origIdx)}
                        style={{ background:"none", border:"none", color:"var(--muted)", cursor:"pointer", fontSize:"1rem", padding:"2px" }}>✕</button>
                    </div>

                    {/* 구간 길이(초) / 물량 */}
                    <div style={{ display:"flex", gap:"8px", alignItems:"center", marginBottom:"8px" }}>
                      <input type="number" min="0" value={stage.time}
                        onChange={e => updateStage(origIdx, { time: e.target.value })}
                        placeholder={lang === "en" ? "sec" : "초"}
                        style={{ width:"64px", padding:"0.55rem 0.4rem", border:"1px solid var(--steam)", borderRadius:"8px", background:"var(--foam)", fontFamily:"'DM Sans',sans-serif", fontSize:"0.85rem", textAlign:"center", boxSizing:"border-box" }}/>
                      <span style={{ fontSize:"0.72rem", color:"var(--muted)", flexShrink:0 }}>{lang==="en"?"s (this stage) →":"초 (이 구간 길이) →"}</span>
                      <input type="number" min="0" value={stage.amount}
                        onChange={e => updateStage(origIdx, { amount: e.target.value })}
                        placeholder={lang === "en" ? "total ml" : "누적 ml"}
                        style={{ width:"76px", padding:"0.55rem 0.4rem", border:"1px solid var(--steam)", borderRadius:"8px", background:"var(--foam)", fontFamily:"'DM Sans',sans-serif", fontSize:"0.85rem", textAlign:"center", boxSizing:"border-box" }}/>
                      <span style={{ fontSize:"0.72rem", color:"var(--muted)", flexShrink:0 }}>ml</span>
                    </div>

                    {/* 제목 (프리셋 칩) */}
                    <input value={stage.label || ""}
                      onChange={e => updateStage(origIdx, { label: e.target.value })}
                      placeholder={lang === "en" ? "Stage title, e.g. Pre-infusion" : "단계 제목, 예) 뜸 들이기 (Pre-infusion)"}
                      style={{ width:"100%", padding:"0.6rem 0.7rem", border:"1px solid var(--steam)", borderRadius:"8px", background:"var(--foam)", fontFamily:"'DM Sans',sans-serif", fontSize:"0.85rem", fontWeight:600, boxSizing:"border-box", marginBottom:"6px" }}/>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:"5px", marginBottom:"8px" }}>
                      {(lang==="en"
                        ? ["Pre-infusion","Main Extraction","2nd Pour","3rd Pour","Drawdown","Remove Dripper"]
                        : ["뜸 들이기","1차 추출","2차 추출","3차 추출","낙수","드리퍼 제거"]
                      ).map(preset => (
                        <button key={preset} type="button"
                          onClick={() => updateStage(origIdx, { label: preset })}
                          style={{ padding:"3px 9px", borderRadius:"999px", border:"1px solid var(--steam)", background:"var(--foam)", color:"var(--muted)", fontSize:"0.66rem", fontFamily:"'DM Sans',sans-serif", cursor:"pointer" }}>
                          {preset}
                        </button>
                      ))}
                    </div>

                    {/* 상세 설명 */}
                    <textarea value={stage.desc || ""}
                      onChange={e => updateStage(origIdx, { desc: e.target.value })}
                      rows={2}
                      placeholder={lang === "en" ? "How to pour, technique tips..." : "붓는 방법, 요령 등을 자유롭게 적어주세요"}
                      style={{ width:"100%", padding:"0.6rem 0.7rem", border:"1px solid var(--steam)", borderRadius:"8px", background:"var(--foam)", fontFamily:"'DM Sans',sans-serif", fontSize:"0.8rem", resize:"vertical", boxSizing:"border-box" }}/>
                  </div>
                    ))}

                    {/* 총 시간 표시 — 개별 구간이 아니라 여기 한 번만 */}
                    {total > 0 && (
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 12px", background:"var(--foam)", border:"1px solid var(--divider)", borderRadius:"8px", marginBottom:"10px" }}>
                        <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.78rem", color:"var(--muted)" }}>
                          {lang === "en" ? "Total planned time" : "계획된 총 시간"}
                        </span>
                        <span style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.1rem", fontWeight:700, color:"var(--espresso)" }}>
                          {Math.floor(total/60)}:{String(total%60).padStart(2,"0")}
                        </span>
                      </div>
                    )}
                  </>
                );
              })()}

              <button type="button"
                onClick={() => setPourStages([...(form.pourStages || []), { time:"", amount:"", label:"", desc:"" }])}
                style={{ width:"100%", padding:"10px", border:"1px dashed var(--latte)", borderRadius:"8px", background:"none", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontSize:"0.82rem", color:"var(--latte)", fontWeight:500, display:"flex", alignItems:"center", justifyContent:"center", gap:"6px" }}>
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                {lang === "en" ? "Add Stage" : "단계 추가"}
              </button>
            </div>
          )}

          {/* 추출량 — 핸드드립은 푸어 단계의 최종 누적량으로 자동계산(수동 수정 가능) */}
          <div className="field" data-field="espressoMl">
            <label style={{ color: errors.espressoMl ? "#c0392b" : undefined }}>
              {t.espressoMl}
              {selectedMenu === "hand_drip" && (form.pourStages || []).some(s => parseInt(s.amount) > 0) && (
                <span style={{ fontWeight:400, color:"var(--muted)", fontSize:"0.7rem", marginLeft:"6px" }}>
                  {lang === "en" ? "(auto from stages)" : "(구간 기록 기준 자동계산)"}
                </span>
              )}
            </label>
            <input type="number" value={form.espressoMl}
              onChange={(e) => { set("espressoMl", String(Math.max(0, Number(e.target.value)))); setErrors((p) => ({ ...p, espressoMl:false })); }}
              placeholder="36" min="0"
              style={{ borderColor: errors.espressoMl ? "#c0392b" : undefined }}/>
            {errors.espressoMl && <p style={{ color:"#c0392b", fontSize:"0.78rem", marginTop:"0.3rem" }}>⚠️ 필수 항목이에요</p>}
          </div>

          {/* 물온도 */}
          <div className="field">
            <label>{lang === "en" ? "Water Temp (°C)" : "물온도 (°C)"}</label>
            <input type="number" value={form.waterTemp}
              onChange={(e) => set("waterTemp", String(Math.max(0, Number(e.target.value))))}
              placeholder="93" min="0" max="100"/>
          </div>

          {/* 물 종류 */}
          <div className="field full">
            <label>{lang === "en" ? "Water Type" : "물 종류"}</label>
            <div style={{ display:"flex", flexWrap:"wrap", gap:"6px", marginBottom:"6px" }}>
              {[
                { id:"tap",    ko:"수돗물", en:"Tap Water" },
                { id:"filter", ko:"정수기", en:"Filtered" },
                { id:"bottle", ko:"생수",   en:"Bottled" },
                { id:"other",  ko:"기타",   en:"Other" },
              ].map((w) => {
                const isSel = form.waterType === w.id;
                return (
                  <button key={w.id} type="button" onClick={() => set("waterType", isSel ? "" : w.id)}
                    style={{ padding:"5px 12px", border:"1px solid", borderRadius:"8px",
                      fontFamily:"'DM Sans',sans-serif", fontSize:"0.78rem", cursor:"pointer", transition:"all 0.15s",
                      borderColor: isSel ? "var(--espresso)" : "var(--steam)",
                      background:  isSel ? "var(--espresso)" : "var(--foam)",
                      color:       isSel ? "var(--cream)"    : "var(--espresso)" }}>
                    {lang === "en" ? w.en : w.ko}
                  </button>
                );
              })}
            </div>
            {(form.waterType === "filter" || form.waterType === "bottle" || form.waterType === "other") && (
              <input value={form.waterBrand || ""} onChange={(e) => set("waterBrand", e.target.value)}
                placeholder={
                  form.waterType === "filter" ? (lang === "en" ? "e.g. Coway, Brita…" : "예) 코웨이, 브리타…")
                  : form.waterType === "bottle" ? (lang === "en" ? "e.g. Evian, Volvic…" : "예) 삼다수, 에비앙…")
                  : (lang === "en" ? "Specify…" : "직접 입력…")
                }/>
            )}
          </div>

          {/* 희석 */}
          {needsDilute && (
            <>
              <div className="field full">
                <label>{t.diluteType}</label>
                {diluteCategory !== "milk" && (
                  <div style={{ marginBottom:"10px" }}>
                    <div style={{ fontSize:"0.62rem", color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"5px" }}>{lang === "en" ? "Water" : "물"}</div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:"6px" }}>
                      <button type="button" onClick={() => set("diluteType", form.diluteType === "물" ? "" : "물")}
                        style={{ padding:"5px 12px", border:"1px solid", borderRadius:"8px", fontFamily:"'DM Sans',sans-serif", fontSize:"0.78rem", cursor:"pointer", transition:"all 0.15s",
                          borderColor: form.diluteType === "물" ? "var(--espresso)" : "var(--steam)",
                          background:  form.diluteType === "물" ? "var(--espresso)" : "var(--foam)",
                          color:       form.diluteType === "물" ? "var(--cream)"    : "var(--espresso)" }}>
                        {lang === "en" ? "Water" : "물"}
                      </button>
                    </div>
                  </div>
                )}
                <div>
                  <div style={{ fontSize:"0.62rem", color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"5px" }}>{lang === "en" ? "Milk" : "우유"}</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:"6px" }}>
                    {[
                      { id:"우유",       en:"Whole Milk" },
                      { id:"저지방우유", en:"Low-fat Milk" },
                      { id:"두유",       en:"Soy Milk" },
                      { id:"귀리우유",   en:"Oat Milk" },
                      { id:"아몬드우유", en:"Almond Milk" },
                      { id:"코코넛우유", en:"Coconut Milk" },
                      { id:"기타우유",   en:"Other Milk" },
                    ].map((m) => {
                      const isSel = form.diluteType === m.id;
                      return (
                        <button key={m.id} type="button"
                          onClick={() => { set("diluteType", isSel ? "" : m.id); if (m.id !== "기타우유") set("diluteCustom",""); }}
                          style={{ padding:"5px 12px", border:"1px solid", borderRadius:"8px",
                            fontFamily:"'DM Sans',sans-serif", fontSize:"0.78rem", cursor:"pointer", transition:"all 0.15s",
                            borderColor: isSel ? "var(--espresso)" : "var(--steam)",
                            background:  isSel ? "var(--espresso)" : "var(--foam)",
                            color:       isSel ? "var(--cream)"    : "var(--espresso)" }}>
                          {lang === "en" ? m.en : m.id === "기타우유" ? "기타" : m.id}
                        </button>
                      );
                    })}
                  </div>
                  {form.diluteType === "기타우유" && (
                    <input style={{ marginTop:"6px" }} value={form.diluteCustom || ""}
                      onChange={(e) => set("diluteCustom", e.target.value)}
                      placeholder={lang === "en" ? "e.g. Rice milk…" : "예) 쌀우유, 마카다미아 우유…"}/>
                  )}
                </div>
              </div>
              <div className="field full">
                <label>{t.diluteMl}</label>
                <input type="number" value={form.diluteMl}
                  onChange={(e) => set("diluteMl", String(Math.max(0, Number(e.target.value))))}
                  placeholder="150" min="0"/>
              </div>
            </>
          )}

          {/* 시럽 */}
          {hasSyrup && (
            <div className="field full">
              <label>{t.syrup}</label>
              <input value={form.syrup || ""} onChange={(e) => set("syrup", e.target.value)}
                placeholder="바닐라 시럽 1펌프, 카라멜 시럽 2펌프 …"/>
            </div>
          )}
          </div>


          {/* ── 섹션 구분선 ── */}
          <div style={{ gridColumn:"1 / -1", margin:"28px 0 14px" }}>
            <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.78rem", fontWeight:700, color:"var(--espresso)", letterSpacing:"0.04em" }}>{lang === "en" ? "Brew Details" : "추출 세부 기록"}</span>
            <div style={{ height:"1px", background:"var(--divider)", marginTop:"10px" }}/>
          </div>
          {machineType !== "handdrip" && (
            <div className="field full" style={{ background:"var(--cream)", border:"1px solid var(--divider)", borderRadius:"var(--r-card)", padding:"16px", display:"flex", flexDirection:"column", gap:"14px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="var(--latte)" strokeWidth="1.3"/><path d="M8 5v3.5l2 1.5" stroke="var(--latte)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.72rem", fontWeight:700, color:"var(--espresso)", letterSpacing:"0.06em", textTransform:"uppercase" }}>
                  {lang === "en" ? "Advanced Brew Log" : "추출 세부 기록"}
                </span>
              </div>
              {/* 예상 압력 (입력값 기반 자동계산) */}
              {machineType !== "handdrip" && pressureData && (
                <div className={`pressure-box ${pressureData.status}`} style={{ marginBottom:0 }}>
                  <div className="pressure-title">{t.pressureTitle}</div>
                  <div className="pressure-row">
                    <span style={{ color:"var(--muted)" }}>{t.brewPressure}</span>
                    <span className={`pressure-val pressure-${pressureData.status}`}>
                      {pressureData.status === "high"
                        ? `9 bar - (${lang === "en" ? "Pump" : "펌프 압력"} ${pressureData.pumpBar} bar)`
                        : `${pressureData.showerBar} bar`}
                    </span>
                  </div>
                  <div style={{ marginTop:"0.3rem", fontSize:"0.78rem", color:"var(--muted)" }}>
                    {pressureData.status === "good" ? t.pressureGood : pressureData.status === "high" ? t.pressureHigh : t.pressureLow}
                    {" "}({t.pressureRange})
                  </div>
                </div>
              )}
              {/* 압력 직접 입력 */}
              <div>
                <label style={{ display:"block", fontSize:"0.72rem", color:"var(--muted)", letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:"6px" }}>
                  {t.brewPressureDetail}
                </label>
                <div style={{ position:"relative", display:"flex", alignItems:"center" }}>
                  <input type="number" min="0" max="20" step="0.1"
                    value={form.brewPressureBar || ""}
                    onChange={(e) => set("brewPressureBar", e.target.value)}
                    placeholder={t.brewPressureDetailPh}
                    style={{ width:"100%", padding:"0.7rem 3.2rem 0.7rem 1rem", border:"1px solid var(--steam)", borderRadius:"var(--r-btn)", background:"var(--foam)", fontFamily:"'DM Sans',sans-serif", fontSize:"0.9rem", color:"var(--espresso)", outline:"none", transition:"border-color var(--transition-base)" }}
                    onFocus={(e) => { e.target.style.borderColor = "var(--latte)"; }}
                    onBlur={(e)  => { e.target.style.borderColor = "var(--steam)"; }}
                  />
                  <span style={{ position:"absolute", right:"12px", fontSize:"0.8rem", color:"var(--muted)", fontFamily:"'DM Sans',sans-serif", fontWeight:600, pointerEvents:"none" }}>BAR</span>
                </div>
                {form.brewPressureBar && (() => {
                  const bar    = parseFloat(form.brewPressureBar);
                  const status = bar >= 9 && bar <= 11 ? "good" : bar > 11 ? "high" : "low";
                  const colors = { good:"#27ae60", high:"#e67e22", low:"#2980b9" };
                  const labels = { good: t.pressureGood, high: t.pressureHigh, low: t.pressureLow };
                  return (
                    <p style={{ marginTop:"5px", fontSize:"0.75rem", color:colors[status] }}>
                      {labels[status]} ({t.pressureRange})
                    </p>
                  );
                })()}
              </div>
              {/* 연속 추출 메모 */}
              <div>
                <label style={{ display:"block", fontSize:"0.72rem", color:"var(--muted)", letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:"6px" }}>
                  {t.continuousMemo}
                </label>
                <textarea value={form.continuousMemo || ""}
                  onChange={(e) => set("continuousMemo", e.target.value)}
                  placeholder={t.continuousMemoPh} rows={2}
                  style={{ width:"100%", padding:"0.7rem 1rem", border:"1px solid var(--steam)", borderRadius:"var(--r-btn)", background:"var(--foam)", fontFamily:"'DM Sans',sans-serif", fontSize:"0.9rem", color:"var(--espresso)", outline:"none", resize:"vertical", minHeight:"70px", lineHeight:1.55, transition:"border-color var(--transition-base)" }}
                  onFocus={(e) => { e.target.style.borderColor = "var(--latte)"; }}
                  onBlur={(e)  => { e.target.style.borderColor = "var(--steam)"; }}
                />
              </div>

              {/* TDS / 추출 수율 계산기 */}
              <div>
                <label style={{ display:"block", fontSize:"0.72rem", color:"var(--muted)", letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:"6px" }}>
                  TDS / {lang === "en" ? "Extraction Yield" : "추출 수율"}
                </label>
                <div style={{ display:"flex", gap:"8px", alignItems:"center", marginBottom:"8px" }}>
                  <div style={{ position:"relative", flex:1 }}>
                    <input type="number" min="0" max="25" step="0.01"
                      value={form.tds || ""}
                      onChange={(e) => set("tds", e.target.value)}
                      placeholder={lang === "en" ? "e.g. 9.2" : "예) 9.2"}
                      style={{ width:"100%", padding:"0.7rem 3.2rem 0.7rem 1rem", border:"1px solid var(--steam)", borderRadius:"var(--r-btn)", background:"var(--foam)", fontFamily:"'DM Sans',sans-serif", fontSize:"0.9rem", color:"var(--espresso)", outline:"none", transition:"border-color var(--transition-base)", boxSizing:"border-box" }}
                      onFocus={(e) => { e.target.style.borderColor = "var(--latte)"; }}
                      onBlur={(e)  => { e.target.style.borderColor = "var(--steam)"; }}
                    />
                    <span style={{ position:"absolute", right:"12px", top:"50%", transform:"translateY(-50%)", fontSize:"0.78rem", color:"var(--muted)", fontFamily:"'DM Sans',sans-serif", fontWeight:600, pointerEvents:"none" }}>TDS%</span>
                  </div>
                </div>

                {/* 수율 계산 결과 */}
                {(() => {
                  const tds       = parseFloat(form.tds);
                  const espresso  = parseFloat(form.espressoMl);
                  const gram      = parseFloat(form.gram);
                  if (!tds || !espresso || !gram || tds <= 0 || espresso <= 0 || gram <= 0) {
                    return (
                      <p style={{ fontSize:"0.72rem", color:"var(--muted)", lineHeight:1.6 }}>
                        {lang === "en"
                          ? "Enter TDS%, yield(ml), and dose(g) above to calculate extraction yield."
                          : "TDS%와 추출량(ml), 원두량(g)을 입력하면 수율이 자동 계산돼요."}
                      </p>
                    );
                  }
                  // 수율 = (TDS% × 추출량ml) / 원두량g
                  const yield_ = (tds * espresso) / gram;
                  const yieldRounded = yield_.toFixed(1);
                  const ratio   = (espresso / gram).toFixed(2);

                  // SCA 기준: 18~22% 이상적
                  const status =
                    yield_ >= 18 && yield_ <= 22 ? "ideal"
                    : yield_ < 18                 ? "under"
                    :                               "over";
                  const statusColors = { ideal:"#27ae60", under:"#2980b9", over:"#e67e22" };
                  const statusLabels = {
                    ideal: lang==="en" ? "Ideal extraction" : "이상적인 추출",
                    under: lang==="en" ? "Under-extracted" : "과소 추출 (분쇄 더 가늘게)",
                    over:  lang==="en" ? "Over-extracted"  : "과다 추출 (분쇄 더 굵게)",
                  };
                  const color = statusColors[status];

                  return (
                    <div style={{ background:"var(--foam)", border:`1px solid ${color}40`, borderRadius:"10px", padding:"12px 14px" }}>
                      {/* 핵심 수치 행 */}
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"8px", marginBottom:"10px" }}>
                        {[
                          { label:lang==="en"?"Yield":"추출 수율", value:`${yieldRounded}%`, color },
                          { label:lang==="en"?"Ratio":"추출 비율", value:`1 : ${ratio}`,   color:"var(--espresso)" },
                          { label:"TDS",                              value:`${tds}%`,        color:"var(--muted)" },
                        ].map(({ label, value, color: c }) => (
                          <div key={label} style={{ textAlign:"center", background:"var(--cream)", borderRadius:"8px", padding:"8px 4px" }}>
                            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.55rem", color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"3px" }}>{label}</div>
                            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.1rem", fontWeight:700, color:c, lineHeight:1 }}>{value}</div>
                          </div>
                        ))}
                      </div>

                      {/* 게이지 바 */}
                      <div style={{ marginBottom:"6px" }}>
                        <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.6rem", color:"var(--muted)", marginBottom:"3px" }}>
                          <span>0%</span>
                          <span style={{ color:"#27ae60", fontWeight:600 }}>18% ── 22%</span>
                          <span>30%</span>
                        </div>
                        <div style={{ position:"relative", height:"8px", background:"var(--steam)", borderRadius:"4px", overflow:"hidden" }}>
                          {/* SCA 이상 구간 표시 */}
                          <div style={{ position:"absolute", left:`${(18/30)*100}%`, width:`${((22-18)/30)*100}%`, height:"100%", background:"#27ae6030", borderRadius:"2px" }}/>
                          {/* 현재 수율 마커 */}
                          <div style={{ position:"absolute", left:`${Math.min(Math.max((yield_/30)*100,0),100)}%`, top:0, transform:"translateX(-50%)", width:"4px", height:"100%", background:color, borderRadius:"2px", transition:"left 0.3s" }}/>
                        </div>
                        <div style={{ display:"flex", justifyContent:"center", marginTop:"3px" }}>
                          <span style={{ fontSize:"0.6rem", color:"#27ae60", opacity:0.7 }}>
                            {lang==="en"?"SCA ideal range (18~22%)": "SCA 권장 수율 (18~22%)"}
                          </span>
                        </div>
                      </div>

                      {/* 상태 메시지 + 조언 */}
                      <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                        <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:color, flexShrink:0 }}/>
                        <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.75rem", color, fontWeight:600 }}>
                          {statusLabels[status]}
                        </span>
                        {status !== "ideal" && (
                          <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.72rem", color:"var(--muted)", marginLeft:"2px" }}>
                            {status === "under"
                              ? (lang==="en" ? "— finer grind or longer time" : "— 분쇄 가늘게 or 추출 시간 늘리기")
                              : (lang==="en" ? "— coarser grind or shorter time" : "— 분쇄 굵게 or 추출 시간 줄이기")}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* ── 섹션 구분선 ── */}
          <div style={{ gridColumn:"1 / -1", margin:"28px 0 14px" }}>
            <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.78rem", fontWeight:700, color:"var(--espresso)", letterSpacing:"0.04em" }}>{lang === "en" ? "Environment & AI Tips" : "환경 & AI 팁"}</span>
            <div style={{ height:"1px", background:"var(--divider)", marginTop:"10px" }}/>
          </div>
          {/* 날씨 */}
          <div className="field full">
            <label style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span>{lang === "en" ? "Weather at Brew Time" : "추출 시점 날씨"}</span>
              {!weatherLoading && (
                <button type="button" onClick={() => {
                  setWeatherError(null); setWeatherLoading(true);
                  fetchWeather().then((w) => { setWeather(w); setWeatherError(null); })
                    .catch((e) => { setWeatherError(typeof e === "string" ? e : e.message); })
                    .finally(() => setWeatherLoading(false));
                }} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--muted)", display:"inline-flex", alignItems:"center", gap:"4px", fontSize:"0.7rem", fontFamily:"'DM Sans',sans-serif", padding:0 }}>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M13.5 8a5.5 5.5 0 1 1-1.1-3.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M13.5 3v2.5H11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  {lang === "en" ? "Refresh" : "새로고침"}
                </button>
              )}
            </label>
            {weatherLoading && (
              <div className="weather-loading">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ animation:"spin 1s linear infinite" }}>
                  <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="10 25" strokeLinecap="round"/>
                </svg>
                {lang === "en" ? "Getting weather…" : "날씨 불러오는 중…"}
              </div>
            )}
            {!weatherLoading && weather && (
              <div className="weather-box">
                <span className="weather-icon">{weather.icon}</span>
                <div className="weather-info">
                  <span className="weather-main">{weather.descKo} {weather.temp}°C</span>
                  <span className="weather-detail">
                    {lang === "en" ? "Humidity" : "습도"} {weather.humidity}% · {weather.country}
                  </span>
                </div>
              </div>
            )}
            {!weatherLoading && !weather && !weatherError && (
              <p style={{ fontSize:"0.78rem", color:"var(--muted)", opacity:0.7 }}>
                {lang === "en" ? "Location permission required." : "위치 권한이 필요해요."}
              </p>
            )}
            {weatherError && (
              <p style={{ fontSize:"0.78rem", color:"#e67e22", marginTop:"0.3rem" }}>
                ⚠️ {lang === "en" ? "Could not get weather. " : "날씨를 가져올 수 없어요. "}{weatherError}
              </p>
            )}
          </div>

          {/* ── 날씨 기반 파라미터 팁 ── */}
          {!isEdit && (ruleTip || geminiTip || tipLoading) && (
            <div className="field full" data-tutorial="ai-tip-card">
              <div style={{ background:"linear-gradient(135deg,#1A1A1A 0%,#2C1A0E 100%)", borderRadius:"12px", padding:"14px 16px", position:"relative", overflow:"hidden" }}>
                {/* 배경 장식 */}
                <div style={{ position:"absolute", right:-16, top:-16, width:72, height:72, borderRadius:"50%", background:"rgba(176,125,84,0.12)", pointerEvents:"none" }}/>
                {/* 헤더 */}
                <div style={{ display:"flex", alignItems:"center", gap:"6px", marginBottom:"10px" }}>
                  <div style={{ width:18, height:18, borderRadius:"50%", background:"var(--latte)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="white"/></svg>
                  </div>
                  <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.65rem", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"var(--latte)" }}>
                    {lang === "en" ? "AI Brew Tip · Today's Weather" : "AI 브루 팁 · 오늘 날씨 기반"}
                  </span>
                  {weather && (
                    <span style={{ marginLeft:"auto", fontFamily:"'DM Sans',sans-serif", fontSize:"0.68rem", color:"rgba(255,255,255,0.45)" }}>
                      {weather.icon} {weather.temp}°C · {weather.humidity}%
                    </span>
                  )}
                </div>

                {/* 규칙 기반 즉시 팁 */}
                {ruleTip && (
                  <div style={{ marginBottom: geminiTip||tipLoading ? "10px" : "0" }}>
                    {ruleTip.split("\n").map((line, i) => (
                      <div key={i} style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.8rem", color:"rgba(255,255,255,0.85)", lineHeight:1.6, marginBottom:"3px" }}>
                        {line}
                      </div>
                    ))}
                  </div>
                )}

                {/* Gemini AI 팁 로딩 */}
                {tipLoading && !geminiTip && (
                  <div style={{ display:"flex", alignItems:"center", gap:"6px", padding:"8px 0" }}>
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" style={{ animation:"spin 1s linear infinite", flexShrink:0 }}>
                      <circle cx="7" cy="7" r="5.5" stroke="rgba(176,125,84,0.8)" strokeWidth="1.5" strokeDasharray="10 22" strokeLinecap="round"/>
                    </svg>
                    <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.72rem", color:"rgba(255,255,255,0.4)" }}>
                      {lang === "en" ? "Personalizing based on your recipes…" : "내 레시피 기반으로 분석 중…"}
                    </span>
                  </div>
                )}

                {/* Gemini AI 팁 */}
                {geminiTip && (
                  <div style={{ borderTop:ruleTip?"1px solid rgba(255,255,255,0.08)":"none", paddingTop:ruleTip?"10px":"0" }}>
                    <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.78rem", color:"rgba(255,255,255,0.75)", lineHeight:1.65, marginBottom:"10px" }}>
                      {geminiTip.tip}
                    </div>
                    {/* 파라미터 조정 뱃지 */}
                    <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
                      {[
                        { label: lang==="en"?"Grind":"분쇄도",   val: geminiTip.grindAdjust, map:{ "굵게":"↑", "미세하게":"↓", "유지":"─", coarser:"↑", finer:"↓", maintain:"─" } },
                        { label: lang==="en"?"Time":"추출시간",  val: geminiTip.timeAdjust,  map:{ "단축":"↓", "연장":"↑", "유지":"─", shorter:"↓", longer:"↑", maintain:"─" } },
                        { label: lang==="en"?"Temp":"물온도",    val: geminiTip.tempAdjust,  map:{ "높이기":"↑", "낮추기":"↓", "유지":"─", higher:"↑", lower:"↓", maintain:"─" } },
                      ].map(({ label, val, map }) => {
                        if (!val) return null;
                        const arrow = map[val] || "─";
                        const color = arrow==="↑"?"#27ae60":arrow==="↓"?"#e67e22":"rgba(255,255,255,0.3)";
                        return (
                          <div key={label} style={{ background:"rgba(255,255,255,0.07)", borderRadius:"8px", padding:"5px 10px", display:"flex", flexDirection:"column", alignItems:"center", gap:"2px", minWidth:"60px" }}>
                            <span style={{ fontSize:"0.6rem", color:"rgba(255,255,255,0.35)", textTransform:"uppercase", letterSpacing:"0.07em" }}>{label}</span>
                            <span style={{ fontSize:"1rem", fontWeight:700, color, lineHeight:1 }}>{arrow}</span>
                            <span style={{ fontSize:"0.6rem", color:"rgba(255,255,255,0.4)", whiteSpace:"nowrap" }}>{val}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Flavor 프로파일 */}

          {/* ── 섹션 구분선 ── */}
          <div style={{ gridColumn:"1 / -1", margin:"28px 0 14px" }}>
            <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.78rem", fontWeight:700, color:"var(--espresso)", letterSpacing:"0.04em" }}>{lang === "en" ? "Rating & Notes" : "평가"}</span>
            <div style={{ height:"1px", background:"var(--divider)", marginTop:"10px" }}/>
          </div>
          <div className="field full flavor-radar-wrap" style={{ background:"var(--foam)", border:"1px solid var(--latte)", borderRadius:"var(--r-card)", padding:"16px" }}>
            <label style={{ marginBottom:"16px", display:"block" }}>
              {lang === "en" ? "Flavor Profile" : "플레이버 프로파일"}
            </label>
            <div style={{ display:"flex", justifyContent:"center", marginBottom:"20px" }}>
              <FlavorRadar values={form} size={200} lang={lang}/>
            </div>
            <div className="flavor-grid-2col" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px 24px" }}>
              {FLAVOR_AXES.map((ax) => {
                const val = form[ax.key] || 0;
                const pct = (val / 5) * 100;
                return (
                  <div key={ax.key} className="flavor-slider-row">
                    <div className="flavor-slider-label">
                      <span className="flavor-slider-name">{lang === "en" ? ax.en : ax.ko}</span>
                      <span className={`flavor-slider-val${val === 0 ? " zero" : ""}`}>
                        {val === 0 ? "—" : `${val} / 5`}
                      </span>
                    </div>
                    <input type="range" min="0" max="5" step="1"
                      value={val}
                      onChange={(e) => {
                        e.stopPropagation();
                        setForm(f => ({ ...f, [ax.key]: parseInt(e.target.value) }));
                      }}
                      onFocus={(e) => e.target.blur()}
                      className="flavor-range" style={{ "--pct": `${pct}%` }}/>
                    <div style={{ fontSize:"0.62rem", color:"var(--muted)", opacity:0.65, lineHeight:1.3, marginTop:"1px" }}>
                      {lang === "en" ? ax.desc_en : ax.desc_ko}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 평가 (별점 + 맛노트) — 하나의 카드로 묶음 */}
          <div className="field full" style={{ background:"var(--foam)", border:"1px solid var(--latte)", borderRadius:"var(--r-card)", padding:"16px", display:"flex", flexDirection:"column", gap:"14px" }}>
            <div>
              <label style={{ marginBottom:"6px", display:"block" }}>{t.rating}</label>
              <div className="star-rating">
                {[1,2,3,4,5].map((star) => (
                  <button key={star} type="button"
                    className={`star-btn ${star <= (form.rating || 0) ? "active" : ""}`}
                    onClick={() => set("rating", form.rating === star ? 0 : star)}>
                    {star <= (form.rating || 0) ? "★" : "☆"}
                  </button>
                ))}
                <span className="star-label">{t.ratingLabels[form.rating || 0]}</span>
              </div>
            </div>
            <div>
              <label style={{ marginBottom:"6px", display:"block" }}>{t.note}</label>
              <textarea value={form.note} onChange={(e) => set("note", e.target.value)}
                placeholder={lang === "en" ? "Bright acidity with fruity aroma…" : "산미가 밝고 과일향이 가득했어요 …"}/>
            </div>
          </div>

          {/* ── 섹션 구분선 ── */}
          <div style={{ gridColumn:"1 / -1", margin:"28px 0 14px" }}>
            <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.78rem", fontWeight:700, color:"var(--espresso)", letterSpacing:"0.04em" }}>{lang === "en" ? "More Details (optional)" : "더 알려주기 (선택)"}</span>
            <div style={{ height:"1px", background:"var(--divider)", marginTop:"10px" }}/>
          </div>

          {/* 제조 순서 (선택) — 구획(섹션) 단위로 묶어서 기록. 흑임자라떼처럼 "크림 만들기" 같은 하위 작업이 있는 음료에 유용 */}
          <div className="field full">
            <label style={{ display:"flex", alignItems:"center", gap:"6px" }}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="3" cy="3.5" r="1.3" fill="currentColor"/><circle cx="3" cy="8" r="1.3" fill="currentColor"/><circle cx="3" cy="12.5" r="1.3" fill="currentColor"/><path d="M6.5 3.5h7M6.5 8h7M6.5 12.5h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              {lang === "en" ? "Preparation Steps (optional)" : "제조 순서 (선택)"}
            </label>
            <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.72rem", color:"var(--muted)", marginBottom:"10px", lineHeight:1.5 }}>
              {lang === "en"
                ? "Group steps into sections (e.g. \"Pull espresso\" / \"Make the cream\" / \"Assemble\") so the flow reads clearly, like a recipe card."
                : "\"에스프레소 추출\" / \"흑임자 크림 만들기\" / \"조립하기\"처럼 구획으로 묶으면 흐름이 훨씬 잘 읽혀요."}
            </p>

            {(form.recipeSteps || []).map((section, si) => (
              <div key={si} style={{ background:"var(--cream)", border:"1px solid var(--divider)", borderRadius:"10px", padding:"12px", marginBottom:"10px" }}>
                {/* 구획 헤더 */}
                <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"10px" }}>
                  <span style={{ width:"20px", height:"20px", borderRadius:"50%", background:"var(--espresso)", color:"var(--cream)", fontSize:"0.68rem", fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{si+1}</span>
                  <input value={section.section || ""}
                    onChange={e => { const next=[...(form.recipeSteps||[])]; next[si]={...next[si], section:e.target.value}; setRecipeSteps(next); }}
                    placeholder={lang === "en" ? "Section title, e.g. Make the cream" : "구획 제목, 예) 흑임자 크림 만들기"}
                    style={{ flex:1, padding:"0.55rem 0.7rem", border:"1px solid var(--steam)", borderRadius:"8px", background:"var(--foam)", fontFamily:"'DM Sans',sans-serif", fontSize:"0.88rem", fontWeight:700, boxSizing:"border-box" }}/>
                  <button type="button"
                    onClick={() => setRecipeSteps((form.recipeSteps || []).filter((_, idx) => idx !== si))}
                    style={{ background:"none", border:"none", color:"var(--muted)", cursor:"pointer", fontSize:"1rem", padding:"4px", flexShrink:0 }}>✕</button>
                </div>

                {/* 구획 안 세부 단계들 */}
                {(section.steps || []).map((step, ti) => (
                  <div key={ti} style={{ display:"flex", gap:"8px", alignItems:"flex-start", marginBottom:"8px", paddingLeft:"28px" }}>
                    <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.72rem", color:"var(--muted)", flexShrink:0, marginTop:"9px" }}>{ti+1}.</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <input value={step.title || ""}
                        onChange={e => { const next=[...(form.recipeSteps||[])]; const steps=[...(next[si].steps||[])]; steps[ti]={...steps[ti],title:e.target.value}; next[si]={...next[si],steps}; setRecipeSteps(next); }}
                        placeholder={lang === "en" ? "e.g. Whisk cream to yogurt-like thickness" : "예) 요거트 농도로 휘핑하기"}
                        style={{ width:"100%", padding:"0.5rem 0.65rem", border:"1px solid var(--steam)", borderRadius:"7px", background:"var(--foam)", fontFamily:"'DM Sans',sans-serif", fontSize:"0.82rem", fontWeight:600, boxSizing:"border-box", marginBottom:"5px" }}/>
                      <textarea value={step.desc || ""}
                        onChange={e => { const next=[...(form.recipeSteps||[])]; const steps=[...(next[si].steps||[])]; steps[ti]={...steps[ti],desc:e.target.value}; next[si]={...next[si],steps}; setRecipeSteps(next); }}
                        rows={1}
                        placeholder={lang === "en" ? "Details / ingredients (optional)" : "재료·요령 등 세부 설명 (선택)"}
                        style={{ width:"100%", padding:"0.45rem 0.65rem", border:"1px solid var(--steam)", borderRadius:"7px", background:"var(--foam)", fontFamily:"'DM Sans',sans-serif", fontSize:"0.78rem", resize:"vertical", boxSizing:"border-box" }}/>
                    </div>
                    <button type="button"
                      onClick={() => { const next=[...(form.recipeSteps||[])]; next[si]={...next[si], steps:(next[si].steps||[]).filter((_,idx)=>idx!==ti)}; setRecipeSteps(next); }}
                      style={{ background:"none", border:"none", color:"var(--muted)", cursor:"pointer", fontSize:"0.9rem", padding:"4px", flexShrink:0, marginTop:"3px" }}>✕</button>
                  </div>
                ))}

                <button type="button"
                  onClick={() => { const next=[...(form.recipeSteps||[])]; next[si]={...next[si], steps:[...(next[si].steps||[]), {title:"",desc:""}]}; setRecipeSteps(next); }}
                  style={{ marginLeft:"28px", width:"calc(100% - 28px)", padding:"7px", border:"1px dashed var(--steam)", borderRadius:"7px", background:"none", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontSize:"0.76rem", color:"var(--muted)" }}>
                  {lang === "en" ? "+ Add step in this section" : "+ 이 구획에 단계 추가"}
                </button>
              </div>
            ))}

            <button type="button"
              onClick={() => setRecipeSteps([...(form.recipeSteps || []), { section:"", steps:[] }])}
              style={{ width:"100%", padding:"10px", border:"1px dashed var(--latte)", borderRadius:"8px", background:"none", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontSize:"0.82rem", color:"var(--latte)", fontWeight:500, display:"flex", alignItems:"center", justifyContent:"center", gap:"6px" }}>
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
              {lang === "en" ? "Add Section" : "구획 추가"}
            </button>
          </div>

          {/* 인스타그램 게시물 링크 (선택) — 사진 대신 실제 인스타 카드가 그대로 임베드됨 */}
          <div className="field full">
            <label style={{ display:"flex", alignItems:"center", gap:"6px" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.6"/><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>
              {lang === "en" ? "Instagram Post (optional)" : "인스타그램 게시물 (선택)"}
            </label>
            <input value={form.igUrl} onChange={(e) => set("igUrl", e.target.value.trim())}
              placeholder="https://www.instagram.com/p/..." />
            <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.7rem", color:"var(--muted)", marginTop:"5px", lineHeight:1.5 }}>
              {lang === "en"
                ? "Paste a public Instagram post link and it'll show up as a real embedded card on your recipe."
                : "공개 인스타그램 게시물 링크를 붙여넣으면 레시피에 실제 카드로 그대로 보여져요."}
            </p>
          </div>

          {/* 태그 */}
          <div className="field full">
            <label style={{ display:"flex", alignItems:"center", gap:"6px" }}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M2 2h6l6 6-6 6-6-6V2z" stroke="var(--latte)" strokeWidth="1.3" strokeLinejoin="round"/>
                <circle cx="5.5" cy="5.5" r="1" fill="var(--latte)"/>
              </svg>
              {lang === "en" ? "Tags" : "태그"}
            </label>
            <TagInput tags={form.tags || []} onChange={(tags) => set("tags", tags)} lang={lang}/>
          </div>

          {/* ── 섹션 구분선 ── */}
          <div style={{ gridColumn:"1 / -1", margin:"28px 0 14px" }}>
            <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.78rem", fontWeight:700, color:"var(--espresso)", letterSpacing:"0.04em" }}>{lang === "en" ? "Visibility" : "공개 설정"}</span>
            <div style={{ height:"1px", background:"var(--divider)", marginTop:"10px" }}/>
          </div>
          <div className="field full">
            <div style={{ display:"flex", gap:"0.5rem" }}>
              {[
                { pub:true,  label: lang === "en" ? "Public"  : "공개",   desc: lang === "en" ? "Visible to everyone" : "피드에 공개됩니다" },
                { pub:false, label: lang === "en" ? "Private" : "비공개", desc: lang === "en" ? "Only visible to you" : "나만 볼 수 있어요" },
              ].map(({ pub, label, desc }) => {
                const active = pub ? form.isPublic !== false : form.isPublic === false;
                return (
                  <button key={label} type="button" onClick={() => set("isPublic", pub)}
                    style={{ flex:1, padding:"0.65rem", border:"1px solid", borderRadius:"8px", cursor:"pointer",
                      fontFamily:"'DM Sans',sans-serif", fontSize:"0.88rem", transition:"all 0.2s",
                      display:"flex", alignItems:"center", justifyContent:"center", gap:"6px",
                      borderColor: active ? "var(--espresso)" : "var(--steam)",
                      background:  active ? "var(--espresso)" : "var(--foam)",
                      color:       active ? "var(--cream)"    : "var(--muted)",
                      fontWeight:  active ? 600 : 400 }}>
                    {label}
                  </button>
                );
              })}
            </div>
            <p style={{ fontSize:"0.76rem", color:"var(--muted)", marginTop:"0.4rem" }}>
              {form.isPublic !== false
                ? (lang === "en" ? "Visible to everyone in the feed" : "피드에 공개됩니다")
                : (lang === "en" ? "Only visible to you" : "나만 볼 수 있어요")}
            </p>
          </div>
        </div>

        {/* 프리셋으로 저장 버튼 */}
        <div style={{ display:"flex", justifyContent:"flex-end", marginTop:"16px" }}>
          <button type="button" data-tutorial="preset-save-btn"
            onClick={() => presets.length < PRESET_LIMIT && setShowPresetSave(true)}
            disabled={presets.length >= PRESET_LIMIT}
            style={{
              background:"none", border:`1px solid ${presets.length >= PRESET_LIMIT ? "var(--divider)" : "var(--steam)"}`,
              borderRadius:"8px", padding:"7px 14px",
              cursor: presets.length >= PRESET_LIMIT ? "not-allowed" : "pointer",
              fontSize:"0.78rem", color:"var(--muted)", fontFamily:"'DM Sans',sans-serif",
              display:"flex", alignItems:"center", gap:"5px", transition:"all 0.2s",
              opacity: presets.length >= PRESET_LIMIT ? 0.5 : 1,
            }}
            onMouseEnter={(e) => { if (presets.length < PRESET_LIMIT) { e.currentTarget.style.borderColor = "var(--latte)"; e.currentTarget.style.color = "var(--latte)"; }}}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = presets.length >= PRESET_LIMIT ? "var(--divider)" : "var(--steam)"; e.currentTarget.style.color = "var(--muted)"; }}>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            {lang === "en" ? "Save as Preset" : "현재 설정 프리셋으로 저장"}
            {presets.length >= PRESET_LIMIT && (
              <span style={{ fontSize:"0.68rem", color:"#e67e22", marginLeft:"2px" }}>({PRESET_LIMIT}/{PRESET_LIMIT})</span>
            )}
          </button>
        </div>

        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>{t.cancel}</button>
          <button className="btn-primary" data-tutorial="recipe-save-btn" style={{ width:"auto", marginTop:0, padding:"0.7rem 2rem" }}
            onClick={save} disabled={saving}>
            {saving ? t.saving : isEdit ? t.update : t.save}
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
