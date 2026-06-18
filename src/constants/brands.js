/* ============================================================
   BREWLOG NOTE — src/constants/brands.js
   커피 머신 / 그라인더 브랜드 상수
   ─ DEFAULT_MACHINE_BRANDS : 기본 머신 브랜드 목록
   ─ DEFAULT_GRINDER_BRANDS : 기본 그라인더 브랜드 목록
   ─ AUTO_MACHINE_BRANDS    : 전자동 전용 브랜드
   ─ BOTH_MODE_BRANDS       : 전자동/반자동 선택 가능 브랜드
   ─ BUILTIN_GRINDER_MAP    : 머신 모델 → 내장 그라인더 매핑
   ============================================================ */

export const DEFAULT_MACHINE_BRANDS = [
  // ── 상업용 ──
  "La Marzocco (라마르조코)",
  "Nuova Simonelli (누오바 시모넬리)",
  "Victoria Arduino (빅토리아 아르두이노)",
  "Sanremo (산레모)",
  "Rancilio (란칠리오)",
  "Faema (파에마)",
  "Gaggia (가찌아)",
  "La Cimbali (라 침발리)",
  "Rocket Espresso (로켓 에스프레소)",
  "Slayer (슬레이어)",
  "Synesso (시네소)",
  "Kees Van Der Westen (키스 반 데르 베스텐)",
  "Astoria (아스토리아)",
  "Wega (웨가)",
  "Ascaso (아스카소)",
  "Anfim (안핌)",
  // ── 홈/세미커머셜 ──
  "Breville (브레빌)",
  "De'Longhi (드롱기)",
  "Jura (유라)",
  "Nespresso (네스프레소)",
  "Sage (세이지)",
  "Philips (필립스)",
  "Siemens (지멘스)",
  "Miele (밀레)",
  "기타 (직접 입력)",
];

export const DEFAULT_GRINDER_BRANDS = [
  // ── 상업용 ──
  "Mahlkönig (말코닉)",
  "Mazzer (마쩌)",
  "Nuova Simonelli / Mythos (누오바 시모넬리/미토스)",
  "Compak (콤팩)",
  "Anfim (안핌)",
  "Ditting (디팅)",
  "La Marzocco (라마르조코)",
  "Victoria Arduino (빅토리아 아르두이노)",
  "Fiorenzato (피오렌자토)",
  "Macap (마캡)",
  "Sanremo (산레모)",
  // ── 홈/세미커머셜 ──
  "Baratza (바라짜)",
  "Eureka (유레카)",
  "Niche (니체)",
  "Fellow (펠로우)",
  "Comandante (코만단테)",
  "1Zpresso (원제이프레소)",
  "Timemore (타임모어)",
  "Hario (하리오)",
  "Wilfa (윌파)",
  "기타 (직접 입력)",
];

// 전자동 전용 브랜드 (그라인더 UI 숨김)
export const AUTO_MACHINE_BRANDS = [
  "De'Longhi (드롱기)", "Jura (유라)", "Philips (필립스)",
  "Siemens (지멘스)", "Gaggia (가찌아)", "Miele (밀레)",
  "Melitta (멜리타)", "Saeco (세코)", "Krups (크룹스)",
];

// 전자동 / 반자동 선택 가능 브랜드
export const BOTH_MODE_BRANDS = [
  "De'Longhi (드롱기)", "Gaggia (가찌아)", "Saeco (세코)", "Philips (필립스)",
];

// 머신 모델 → 내장 그라인더 매핑
export const BUILTIN_GRINDER_MAP = {
  "barista express":         { brand: "Breville (브레빌)", model: "그라인더 일체형 (올인원)" },
  "barista express impress": { brand: "Breville (브레빌)", model: "그라인더 일체형 (올인원)" },
  "barista pro":             { brand: "Breville (브레빌)", model: "그라인더 일체형 (올인원)" },
  "barista touch":           { brand: "Breville (브레빌)", model: "그라인더 일체형 (올인원)" },
  "barista touch impress":   { brand: "Breville (브레빌)", model: "그라인더 일체형 (올인원)" },
  "the oracle":              { brand: "Breville (브레빌)", model: "그라인더 일체형 (올인원)" },
  "oracle touch":            { brand: "Breville (브레빌)", model: "그라인더 일체형 (올인원)" },
  "dual boiler":             { brand: "Breville (브레빌)", model: "그라인더 별도" },
  "magnifica":               { brand: "De'Longhi (드롱기)", model: "내장 그라인더" },
  "eletta":                  { brand: "De'Longhi (드롱기)", model: "내장 그라인더" },
  "dinamica":                { brand: "De'Longhi (드롱기)", model: "내장 그라인더" },
  "primadonna":              { brand: "De'Longhi (드롱기)", model: "내장 그라인더" },
  "e8":                      { brand: "Jura (유라)", model: "내장 그라인더" },
  "e6":                      { brand: "Jura (유라)", model: "내장 그라인더" },
  "s8":                      { brand: "Jura (유라)", model: "내장 그라인더" },
  "f9":                      { brand: "Jura (유라)", model: "내장 그라인더" },
  "z10":                     { brand: "Jura (유라)", model: "내장 그라인더" },
  "3200":                    { brand: "Philips (필립스)", model: "내장 그라인더" },
  "4300":                    { brand: "Philips (필립스)", model: "내장 그라인더" },
  "5400":                    { brand: "Philips (필립스)", model: "내장 그라인더" },
};
