/* ============================================================
   BREWLOG NOTE — src/constants/coffeeMenus.js
   커피 메뉴 정의, SVG 아이콘, Flavor 축, 배전도, 가공법 상수
   ============================================================ */
import React from "react";

// ── 커피 메뉴 SVG 아이콘 ─────────────────────────────────────────
export const MenuIcons = {
  espresso: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 7h10l-1 7H6L5 7z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M7 7V5.5C7 4.67 7.67 4 8.5 4h3c.83 0 1.5.67 1.5 1.5V7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M7 16h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M9 10.5c0-.5.5-.8 1-.5s1 .5 1 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  ),
  ristretto: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 8h8l-.8 5.5H6.8L6 8z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M8 8V6.5C8 5.67 8.67 5 9.5 5h1c.83 0 1.5.67 1.5 1.5V8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M7.5 15h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  lungo: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 6h10l-1.5 9H6.5L5 6z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M7 6V4.5C7 3.67 7.67 3 8.5 3h3c.83 0 1.5.67 1.5 1.5V6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M7 17h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  americano: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="6" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M16 9h1.5a1.5 1.5 0 0 1 0 3H16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M8 3.5C8 3.5 8.5 2.5 10 2.5s2 1 2 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M7 10h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.4"/>
    </svg>
  ),
  long_black: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="6" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M16 9h1.5a1.5 1.5 0 0 1 0 3H16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M7 9.5h6M7 12h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.35"/>
    </svg>
  ),
  latte: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 5h12l-1.5 11H5.5L4 5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M4 8c2 1 4 1 6 0s4-1 6 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <ellipse cx="10" cy="8.5" rx="2" ry="1" stroke="currentColor" strokeWidth="1" opacity="0.4"/>
    </svg>
  ),
  cappuccino: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 7h10l-1 8H6L5 7z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M5 9c1.5-1 3.5-1.5 5-1.5s3.5.5 5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M8 7C8 5.5 9 4.5 10 4.5S12 5.5 12 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  ),
  flatwhite: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 7h10l-1 8H6L5 7z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M6 9.5c1-0.8 2.5-1.2 4-1.2s3 .4 4 1.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M8.5 11.5c.5-.3 1-.5 1.5-.5s1 .2 1.5.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.5"/>
    </svg>
  ),
  macchiato: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 8h8l-.8 6H6.8L6 8z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M6.5 10c1-.7 2-.9 3.5-.9s2.5.2 3.5.9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <circle cx="10" cy="8.5" r="1.2" stroke="currentColor" strokeWidth="1.1"/>
      <path d="M8 16h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  cortado: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 7h8l-1 8H7L6 7z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M6.5 10c1-.7 2-1 3.5-1s2.5.3 3.5 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M8.5 8C8.5 6.5 9.2 5.5 10 5.5s1.5 1 1.5 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  ),
  cold_brew: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="5.5" y="4" width="9" height="13" rx="2" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M8 4V3M12 4V3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M7.5 9.5c.7-.5 1.3-.5 2 0s1.3.5 2 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M7.5 12c.7-.5 1.3-.5 2 0s1.3.5 2 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M8.5 7h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.4"/>
    </svg>
  ),
  hand_drip: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 4h8l-1 5H7L6 4z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M10 9v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M7 13h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M6 15h8l.5 1.5H5.5L6 15z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    </svg>
  ),
  other: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M10 7v3l2 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="10" cy="10" r="1" fill="currentColor" opacity="0.3"/>
    </svg>
  ),
};

// ── 커피 메뉴 목록 ───────────────────────────────────────────────
export const COFFEE_MENUS = [
  { id: "espresso",   label: "에스프레소", labelEn: "Espresso",    needsDilute: false, hasSyrup: false, canIce: false },
  { id: "ristretto",  label: "리스트레토", labelEn: "Ristretto",   needsDilute: false, hasSyrup: false, canIce: false },
  { id: "lungo",      label: "룽고",       labelEn: "Lungo",       needsDilute: false, hasSyrup: false, canIce: false },
  { id: "americano",  label: "아메리카노", labelEn: "Americano",   needsDilute: true,  hasSyrup: false, canIce: true,  defaultDilute: "물",  diluteCategory: "water" },
  { id: "long_black", label: "롱블랙",     labelEn: "Long Black",  needsDilute: true,  hasSyrup: false, canIce: true,  defaultDilute: "물",  diluteCategory: "water" },
  { id: "latte",      label: "카페라떼",   labelEn: "Latte",       needsDilute: true,  hasSyrup: true,  canIce: true,  defaultDilute: "우유", diluteCategory: "milk" },
  { id: "cappuccino", label: "카푸치노",   labelEn: "Cappuccino",  needsDilute: true,  hasSyrup: false, canIce: true,  defaultDilute: "우유", diluteCategory: "milk" },
  { id: "flatwhite",  label: "플랫화이트", labelEn: "Flat White",  needsDilute: true,  hasSyrup: false, canIce: false, defaultDilute: "우유", diluteCategory: "milk" },
  { id: "macchiato",  label: "마끼아또",   labelEn: "Macchiato",   needsDilute: true,  hasSyrup: true,  canIce: true,  defaultDilute: "우유", diluteCategory: "milk" },
  { id: "hand_drip",  label: "핸드드립",   labelEn: "Hand Drip",   needsDilute: true,  hasSyrup: false, canIce: true,  defaultDilute: "물", diluteCategory: "water" },
  { id: "cold_brew",  label: "콜드브루",   labelEn: "Cold Brew",   needsDilute: true,  hasSyrup: true,  canIce: true,  defaultDilute: "",    diluteCategory: "both" },
  { id: "other",      label: "기타",       labelEn: "Other",       needsDilute: true,  hasSyrup: false, canIce: true,  defaultDilute: "",    diluteCategory: "both" },
];

// ── Flavor Radar 축 정의 ─────────────────────────────────────────
export const FLAVOR_AXES = [
  { key: "flavorAcidity",    ko: "산미",   en: "Acidity",    desc_ko: "밝고 상큼한 신맛의 강도",        desc_en: "Brightness and citrusy sharpness" },
  { key: "flavorSweet",      ko: "단맛",   en: "Sweet",      desc_ko: "흑설탕·과일 같은 단맛",          desc_en: "Sweetness like fruit or caramel" },
  { key: "flavorBitter",     ko: "쓴맛",   en: "Bitter",     desc_ko: "카카오·견과류 같은 쓴맛",        desc_en: "Cocoa or nutty bitterness" },
  { key: "flavorAroma",      ko: "아로마", en: "Aroma",      desc_ko: "분쇄 후 느껴지는 향의 강도",     desc_en: "Fragrance before drinking" },
  { key: "flavorAftertaste", ko: "후미",   en: "Aftertaste", desc_ko: "삼킨 후 입안에 남는 여운",       desc_en: "Lingering finish after swallowing" },
  { key: "flavorBalance",    ko: "밸런스", en: "Balance",    desc_ko: "전체 맛의 조화로움",             desc_en: "Overall harmony of flavors" },
  { key: "flavorBody",       ko: "바디",   en: "Body",       desc_ko: "입안의 질감과 무게감",           desc_en: "Texture and weight on the palate" },
];

// ── 배전도 (Roast Levels) ────────────────────────────────────────
export const ROAST_LEVELS = [
  { id: "green",     ko: "생두",     en: "Green bean", pct: 0   },
  { id: "cinnamon",  ko: "시나몬",   en: "Cinnamon",   pct: 14  },
  { id: "medium",    ko: "미디엄",   en: "Medium",     pct: 28  },
  { id: "high",      ko: "하이",     en: "High",       pct: 42  },
  { id: "city",      ko: "시티",     en: "City",       pct: 57  },
  { id: "full_city", ko: "풀 시티",  en: "Full city",  pct: 71  },
  { id: "french",    ko: "프렌치",   en: "French",     pct: 85  },
  { id: "italian",   ko: "이탈리안", en: "Italian",    pct: 100 },
];

// ── 가공 방식 프리셋 ─────────────────────────────────────────────
export const PROCESS_PRESETS = [
  "워시드", "내추럴", "허니", "무산소 발효", "웻 허드",
];
