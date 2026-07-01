/* ============================================================
   BREWLOG NOTE — src/constants/wikiSeed.js
   커피 위키 시드 데이터 (한/영 이중 언어)
   ─ SEED_EQUIPMENTS : 유명 머신/그라인더/핸드드립 스펙 미리 채움
   ─ SEED_BEAN_ORIGINS : 알려진 원두 산지 정보 (자동완성용)
   ─ 모든 텍스트 필드는 { ko, en } 객체로 분리, seedText(field, lang)로 추출
   ─ 출처: 제조사 공식 스펙, 일반적으로 알려진 정보
   ============================================================ */

// ── 시드 데이터에서 현재 언어에 맞는 텍스트 추출 헬퍼 ───────────
export function seedText(field, lang) {
  if (!field) return "";
  if (typeof field === "string") return field; // 구형 데이터 호환
  return field[lang] || field.ko || field.en || "";
}

// ── 유명 장비 스펙 (머신 + 그라인더 + 핸드드립) ─────────────────
export const SEED_EQUIPMENTS = [
  // ── 머신 ──
  {
    category: "machine", brand: "Breville", model: "870 (Barista Express)",
    type: "semi", boilerType: "thermoblock", pumpBar: "15", tankL: "2",
    hasSteam: true,
    description: {
      ko: "내장 코니컬 그라인더 일체형. 가정용 입문기로 가장 널리 쓰이는 모델.",
      en: "All-in-one with built-in conical burr grinder. The most widely used entry-level home machine.",
    },
  },
  {
    category: "machine", brand: "Breville", model: "878 (Barista Pro)",
    type: "semi", boilerType: "thermoblock", pumpBar: "15", tankL: "2",
    hasSteam: true,
    description: {
      ko: "870의 후속작. 더 빠른 예열, 정밀 온도 제어(PID) 탑재.",
      en: "Successor to the 870. Faster preheating, precision PID temperature control.",
    },
  },
  {
    category: "machine", brand: "Breville", model: "990 (Oracle)",
    type: "semi", boilerType: "dual", pumpBar: "15", tankL: "2.5",
    hasSteam: true,
    description: {
      ko: "자동 탬핑, 듀얼 보일러로 추출과 스팀 동시 가능.",
      en: "Automatic tamping, dual boiler enables simultaneous brewing and steaming.",
    },
  },
  {
    category: "machine", brand: "Breville", model: "985 (Oracle Jet)",
    type: "semi", boilerType: "dual", pumpBar: "15", tankL: "2.5",
    hasSteam: true,
    description: {
      ko: "WiFi 연결 지원, Breville+ 앱 연동 가능.",
      en: "WiFi-enabled, supports remote control via the Breville+ app.",
    },
  },
  {
    category: "machine", brand: "Breville", model: "880 (Barista Touch)",
    type: "semi", boilerType: "thermoblock", pumpBar: "15", tankL: "2",
    hasSteam: true,
    description: {
      ko: "터치스크린 + 내장 그라인더 일체형. ThermoJet 가열로 3초 예열, 30단계 분쇄 조절.",
      en: "Touchscreen with built-in grinder. ThermoJet heating reaches temperature in 3 seconds, 30 grind settings.",
    },
  },
  {
    category: "machine", brand: "Breville", model: "881 (Barista Touch Impress)",
    type: "semi", boilerType: "thermoblock", pumpBar: "15", tankL: "2",
    hasSteam: true,
    description: {
      ko: "880의 후속작. Impress 자동 탬핑(약 10kg 압력) 탑재, 9bar 추출압력 유지.",
      en: "Successor to the 880. Features Impress automatic tamping (~22lb pressure), maintains 9-bar extraction.",
    },
  },
  {
    category: "machine", brand: "Breville", model: "500 (Bambino Plus)",
    type: "semi", boilerType: "thermoblock", pumpBar: "15", tankL: "1.9",
    hasSteam: true,
    description: {
      ko: "그라인더 미포함 소형 머신. 자동 스팀완드, 1·2샷 원터치 추출량 설정.",
      en: "Compact machine without a grinder. Automatic steam wand, one-touch 1/2 shot volume control.",
    },
  },
  {
    category: "machine", brand: "Breville", model: "995 (Oracle Dual Boiler)",
    type: "semi", boilerType: "dual", pumpBar: "19", tankL: "2.3",
    hasSteam: true,
    description: {
      ko: "최상위 라인업. 자동 탬핑+45단계 그라인더 일체형, Breville+ 앱으로 원격 예열 지원.",
      en: "Flagship model. Automatic tamping with 45-setting grinder, remote preheat via the Breville+ app.",
    },
  },
  {
    category: "machine", brand: "Gaggia", model: "Classic Pro",
    type: "semi", boilerType: "single", pumpBar: "15", tankL: "2.1",
    hasSteam: true,
    description: {
      ko: "스테인리스 보일러, 상업용 포터필터(58mm) 호환으로 입문용 머신 중 인기.",
      en: "Stainless steel boiler, compatible with commercial 58mm portafilters. Popular entry-level choice.",
    },
  },
  {
    category: "machine", brand: "Rancilio", model: "Silvia",
    type: "semi", boilerType: "single", pumpBar: "15", tankL: "2.7",
    hasSteam: true,
    description: {
      ko: "상업용 그룹헤드 적용. 홈바리스타들에게 클래식으로 불림.",
      en: "Uses a commercial-grade group head. Considered a classic among home baristas.",
    },
  },
  {
    category: "machine", brand: "De'Longhi", model: "EC685 (Dedica)",
    type: "semi", boilerType: "thermoblock", pumpBar: "15", tankL: "1.1",
    hasSteam: true,
    description: {
      ko: "슬림 디자인, 좁은 공간에 적합한 컴팩트 머신.",
      en: "Slim design, a compact machine well-suited for small spaces.",
    },
  },
  {
    category: "machine", brand: "La Marzocco", model: "Linea Mini",
    type: "semi", boilerType: "dual", pumpBar: "9", tankL: "2",
    hasSteam: true,
    description: {
      ko: "상업용 라마르조코 기술을 가정용으로 축소. 포화 그룹헤드.",
      en: "Commercial La Marzocco technology scaled down for home use. Saturated group head.",
    },
  },
  {
    category: "machine", brand: "Jura", model: "E8",
    type: "full", boilerType: "thermoblock", pumpBar: "15", tankL: "1.9",
    hasSteam: true,
    description: {
      ko: "전자동, 원터치 라떼/카푸치노 제조 가능.",
      en: "Fully automatic, one-touch latte/cappuccino preparation.",
    },
  },
  {
    category: "machine", brand: "Philips", model: "3200 (LatteGo)",
    type: "full", boilerType: "thermoblock", pumpBar: "15", tankL: "1.8",
    hasSteam: true,
    description: {
      ko: "LatteGo 우유 시스템으로 세척 간편, 전자동 입문기.",
      en: "Easy-to-clean LatteGo milk system. A fully automatic entry-level machine.",
    },
  },

  // ── 그라인더 ──
  {
    category: "grinder", brand: "Baratza", model: "Encore",
    burrType: "conical", grindSteps: "40", motorType: "dc", rpm: "450",
    description: {
      ko: "입문용 그라인더 베스트셀러. 핸드드립부터 에스프레소까지 폭넓게 사용.",
      en: "Best-selling entry-level grinder. Versatile for everything from pour-over to espresso.",
    },
  },
  {
    category: "grinder", brand: "Baratza", model: "Sette 270Wi",
    burrType: "conical", grindSteps: "30", motorType: "dc", rpm: "1400",
    description: {
      ko: "Acaia와 협업한 무게 기반 자동 정지 그라인더. 에스프레소 전용.",
      en: "Weight-based auto-stop grinder developed with Acaia. Espresso-focused.",
    },
  },
  {
    category: "grinder", brand: "Baratza", model: "Virtuoso+",
    burrType: "conical", grindSteps: "40", motorType: "dc", rpm: "450",
    description: {
      ko: "Encore보다 상위 모델, 디지털 타이머 내장.",
      en: "A step up from the Encore, with a built-in digital timer.",
    },
  },
  {
    category: "grinder", brand: "Eureka", model: "Mignon Specialita",
    burrType: "flat", grindSteps: "999", motorType: "dc", rpm: "1350",
    description: {
      ko: "이탈리아 제조, 무단계 조절 가능한 플랫버 그라인더.",
      en: "Italian-made flat burr grinder with stepless grind adjustment.",
    },
  },
  {
    category: "grinder", brand: "Niche", model: "Zero",
    burrType: "conical", grindSteps: "999", motorType: "dc", rpm: "200",
    description: {
      ko: "저속 회전으로 발열 최소화, 싱글도징 전용 설계.",
      en: "Low-RPM design minimizes heat buildup; built for single dosing.",
    },
  },
  {
    category: "grinder", brand: "Comandante", model: "C40",
    burrType: "conical", grindSteps: "999", motorType: "manual", rpm: "",
    description: {
      ko: "수동 핸드 그라인더, 캠핑/여행용으로도 인기.",
      en: "Manual hand grinder, also popular for camping and travel.",
    },
  },
  {
    category: "grinder", brand: "1Zpresso", model: "J-Max",
    burrType: "conical", grindSteps: "999", motorType: "manual", rpm: "",
    description: {
      ko: "수동 그라인더, 분쇄 입도 균일성으로 평가가 좋음.",
      en: "Manual grinder praised for particle size consistency.",
    },
  },

  // ── 핸드드립 도구 ──
  {
    category: "handdrip", brand: "Hario", model: "V60",
    material: "ceramic", dripperShape: "cone", capacityCups: "2",
    description: {
      ko: "나선형 리브, 원뿔형 드리퍼의 대표 모델. 플라스틱/유리/도자기 버전 존재.",
      en: "The classic spiral-ribbed cone dripper. Available in plastic, glass, and ceramic.",
    },
  },
  {
    category: "handdrip", brand: "Kalita", model: "Wave 155",
    material: "stainless", dripperShape: "wave", capacityCups: "2",
    description: {
      ko: "평저형에 웨이브 필터 사용. 균일한 추출로 입문자에게 추천됨.",
      en: "Flat-bottom dripper with wave filters. Recommended for beginners due to even extraction.",
    },
  },
  {
    category: "handdrip", brand: "Chemex", model: "Classic 6-Cup",
    material: "glass", dripperShape: "cone", capacityCups: "6",
    description: {
      ko: "드리퍼와 서버가 일체형. 전용 두꺼운 필터로 깔끔한 맛 표현.",
      en: "All-in-one dripper and carafe. Thick proprietary filters yield a clean cup.",
    },
  },
  {
    category: "handdrip", brand: "Origami", model: "Dripper",
    material: "ceramic", dripperShape: "cone", capacityCups: "2",
    description: {
      ko: "리브가 꽃잎 모양으로 배치되어 다양한 필터(원뿔/평저) 호환.",
      en: "Petal-shaped ribs allow compatibility with multiple filter shapes (cone/flat-bottom).",
    },
  },

  // ── 악세사리: 포타필터 ──
  {
    category: "accessory", brand: "Breville", accessoryType: "portafilter", model: "the Naked Portafilter 58mm",
    diameterMm: "58", spoutType: "bottomless",
    description: {
      ko: "브레빌 오라클/듀얼보일러용 순정 바텀리스 포타필터. 월넛 손잡이.",
      en: "OEM bottomless portafilter for Breville Oracle/Dual Boiler. Walnut handle.",
    },
  },
  {
    category: "accessory", brand: "Breville", accessoryType: "portafilter", model: "the Naked Portafilter 54mm",
    diameterMm: "54", spoutType: "bottomless",
    description: {
      ko: "바리스타 익스프레스/프로/터치용 순정 바텀리스 포타필터.",
      en: "OEM bottomless portafilter for Barista Express/Pro/Touch.",
    },
  },
  {
    category: "accessory", brand: "Crema Coffee Products", accessoryType: "portafilter", model: "Bottomless Naked Portafilter 54mm",
    diameterMm: "54", spoutType: "bottomless",
    description: {
      ko: "브레빌 54mm 머신 호환 서드파티 바텀리스 포타필터. 더블샷 바스켓 포함.",
      en: "Third-party bottomless portafilter for 54mm Breville machines. Includes double-shot basket.",
    },
  },
  {
    category: "accessory", brand: "Crema Coffee Products", accessoryType: "portafilter", model: "Bottomless Naked Portafilter 58mm",
    diameterMm: "58", spoutType: "bottomless",
    description: {
      ko: "E61/58mm 그룹헤드 범용 서드파티 바텀리스 포타필터.",
      en: "Third-party bottomless portafilter for E61/58mm group heads.",
    },
  },
  {
    category: "accessory", brand: "IKAPE", accessoryType: "portafilter", model: "Bottomless Portafilter 58mm",
    diameterMm: "58", spoutType: "bottomless",
    description: {
      ko: "304 스테인리스 + 우드 손잡이. 델롱기 51mm/브레빌 54mm/가찌아 58mm 등 폭넓은 호환.",
      en: "304 stainless steel with wood handle. Wide compatibility across Delonghi 51mm/Breville 54mm/Gaggia 58mm.",
    },
  },
  {
    category: "accessory", brand: "IKAPE", accessoryType: "portafilter", model: "Bottomless Portafilter 54mm",
    diameterMm: "54", spoutType: "bottomless",
    description: {
      ko: "브레빌 54mm 머신용 바텀리스 포타필터. 논프레셔라이즈드 바스켓 포함.",
      en: "Bottomless portafilter for 54mm Breville machines, includes non-pressurized basket.",
    },
  },
  {
    category: "accessory", brand: "Normcore", accessoryType: "portafilter", model: "Bottomless Portafilter 54mm",
    diameterMm: "54", spoutType: "bottomless",
    description: {
      ko: "아메리칸 월넛 손잡이, 18g 바스켓 동봉. 바리스타 익스프레스 계열 호환.",
      en: "American walnut handle with 18g basket included. Compatible with Barista Express series.",
    },
  },
  {
    category: "accessory", brand: "La Marzocco", accessoryType: "portafilter", model: "Standard Spouted Portafilter 58mm",
    diameterMm: "58", spoutType: "double",
    description: {
      ko: "라마르조코 순정 더블 스파웃 포타필터. E61/58mm 그룹헤드 표준.",
      en: "OEM double-spout portafilter from La Marzocco. Standard 58mm/E61 group head fit.",
    },
  },
  {
    category: "accessory", brand: "Rancilio", accessoryType: "portafilter", model: "Silvia Bottomless Portafilter",
    diameterMm: "58", spoutType: "bottomless",
    description: {
      ko: "란칠리오 실비아 전용 바텀리스 포타필터. 트리플샷(21g) 바스켓 포함 버전 존재.",
      en: "Bottomless portafilter specific to the Rancilio Silvia, some versions include a triple-shot (21g) basket.",
    },
  },
  {
    category: "accessory", brand: "Gaggia", accessoryType: "portafilter", model: "Bottomless Portafilter 58mm",
    diameterMm: "58", spoutType: "bottomless",
    description: {
      ko: "가찌아 클래식 프로 등 58mm 머신용 바텀리스 포타필터.",
      en: "Bottomless portafilter for 58mm Gaggia machines such as the Classic Pro.",
    },
  },

  // ── 악세사리: 바스켓 ──
  {
    category: "accessory", brand: "VST", accessoryType: "basket", model: "Precision Basket 18g",
    diameterMm: "58", basketCapacityG: "18", basketHoleType: "precision",
    description: {
      ko: "정밀 필터 바스켓의 기준점. 모든 홀을 개별 측정해 오차범위를 관리. 가장 대중적인 용량.",
      en: "The benchmark precision basket. Every hole is individually measured for tolerance. The most popular capacity.",
    },
  },
  {
    category: "accessory", brand: "VST", accessoryType: "basket", model: "Precision Basket 20g",
    diameterMm: "58", basketCapacityG: "20", basketHoleType: "precision",
    description: {
      ko: "18g보다 도징량이 많은 레시피용. 58mm 표준 규격.",
      en: "For recipes with a higher dose than 18g. Standard 58mm size.",
    },
  },
  {
    category: "accessory", brand: "VST", accessoryType: "basket", model: "Precision Basket 15g",
    diameterMm: "58", basketCapacityG: "15", basketHoleType: "precision",
    description: {
      ko: "적은 도징량(리스트레토 등)에 적합한 소용량 정밀 바스켓.",
      en: "Smaller-capacity precision basket suited to lighter doses (e.g. ristretto).",
    },
  },
  {
    category: "accessory", brand: "VST", accessoryType: "basket", model: "Precision Basket 22g",
    diameterMm: "58", basketCapacityG: "22", basketHoleType: "precision",
    description: {
      ko: "고도징 레시피용 대용량 정밀 바스켓.",
      en: "High-capacity precision basket for high-dose recipes.",
    },
  },
  {
    category: "accessory", brand: "IMS", accessoryType: "basket", model: "Competition Nanotech Basket 18-20g",
    diameterMm: "58", basketCapacityG: "18-20", basketHoleType: "precision",
    description: {
      ko: "레이저 커팅 홀 + 나노텍 코팅으로 세척이 쉽고 균일한 추출을 돕는 대회용 바스켓.",
      en: "Laser-cut holes with nanotech coating for easy cleaning and even extraction; a competition-grade basket.",
    },
  },
  {
    category: "accessory", brand: "IMS", accessoryType: "basket", model: "Big Bang Basket 18-20g",
    diameterMm: "58", basketCapacityG: "18-20", basketHoleType: "precision",
    description: {
      ko: "IMS의 하이엔드 라인업 중 하나. 균일한 홀 분포로 채널링을 줄여줌.",
      en: "One of IMS's high-end lineups, with uniform hole distribution that reduces channeling.",
    },
  },
  {
    category: "accessory", brand: "Pullman", accessoryType: "basket", model: "Barista Basket 17-19g",
    diameterMm: "58", basketCapacityG: "17-19", basketHoleType: "precision",
    description: {
      ko: "호주 풀먼의 정밀 바스켓. 빅스텝 탬퍼와 궁합이 좋고 링리스 디자인.",
      en: "Australian Pullman's precision basket. Pairs well with the Big Step tamper, ridgeless design.",
    },
  },
  {
    category: "accessory", brand: "Pullman", accessoryType: "basket", model: "Barista Basket 19-22g",
    diameterMm: "58", basketCapacityG: "19-22", basketHoleType: "precision",
    description: {
      ko: "풀먼 바스켓의 고용량 버전. VST/IMS와 유사한 추출력, 독자적 홀 패턴.",
      en: "Higher-capacity version of the Pullman basket. Similar extraction to VST/IMS with a distinctive hole pattern.",
    },
  },
  {
    category: "accessory", brand: "Breville", accessoryType: "basket", model: "Dual Wall (Pressurized) Basket",
    diameterMm: "54", basketCapacityG: "18", basketHoleType: "standard",
    description: {
      ko: "브레빌 머신 순정 동봉 압력 바스켓. 신선하지 않은 원두로도 크레마를 만들어주지만 정밀도는 낮음.",
      en: "OEM pressurized basket bundled with Breville machines. Helps produce crema even with stale beans, but lower precision.",
    },
  },
  {
    category: "accessory", brand: "Breville", accessoryType: "basket", model: "Single Wall (Non-Pressurized) Basket",
    diameterMm: "54", basketCapacityG: "18", basketHoleType: "standard",
    description: {
      ko: "브레빌 머신 순정 논프레셔라이즈드 바스켓. 신선한 원두 기준 표준 추출에 적합.",
      en: "OEM non-pressurized basket for Breville machines. Suited to standard extraction with fresh beans.",
    },
  },

  // ── 악세사리: 샤워스크린 ──
  {
    category: "accessory", brand: "IMS", accessoryType: "showerscreen", model: "Competition Nanotech Shower Screen (MA200NT)",
    diameterMm: "56.4", material: "metal",
    description: {
      ko: "라마르조코/슬레이어/시네소용. 200마이크론 통합 멤브레인, 나노쿼츠 코팅으로 물방울을 균일하게 분산.",
      en: "For La Marzocco/Slayer/Synesso. 200-micron integrated membrane with NanoQuartz coating for uniform water dispersion.",
    },
  },
  {
    category: "accessory", brand: "IMS", accessoryType: "showerscreen", model: "E61 Nanotec Shower Screen",
    diameterMm: "60", material: "metal",
    description: {
      ko: "E61 그룹헤드 전용 나노텍 샤워스크린. 균일한 물 분산으로 채널링 감소.",
      en: "Nanotec shower screen specific to E61 group heads. Reduces channeling via even water dispersion.",
    },
  },
  {
    category: "accessory", brand: "IMS", accessoryType: "showerscreen", model: "Precision Shower Screen for Breville 54mm (BV200NT)",
    diameterMm: "54", material: "metal",
    description: {
      ko: "브레빌 54mm 머신(익스프레스/밤비노/터치 등) 호환 나노텍 정밀 샤워스크린.",
      en: "Nanotech precision shower screen compatible with 54mm Breville machines (Express, Bambino, Touch, etc.).",
    },
  },
  {
    category: "accessory", brand: "La Marzocco", accessoryType: "showerscreen", model: "OEM Dispersion Screen",
    diameterMm: "57", material: "metal",
    description: {
      ko: "라마르조코 순정 디스퍼전 스크린. 정기 교체가 권장되는 소모품.",
      en: "OEM dispersion screen from La Marzocco. A wear part recommended for periodic replacement.",
    },
  },
  {
    category: "accessory", brand: "E&B Lab", accessoryType: "showerscreen", model: "Quartz Nanotechnology Shower Screen",
    diameterMm: "58", material: "metal",
    description: {
      ko: "필터링 멤브레인 일체형 샤워스크린. 나노 코팅으로 물이 균일한 물방울로 분산.",
      en: "Shower screen with an integrated filtering membrane. Nano coating disperses water into uniform droplets.",
    },
  },
  {
    category: "accessory", brand: "ROK", accessoryType: "showerscreen", model: "Smartshot Screen",
    diameterMm: "58", material: "plastic",
    description: {
      ko: "유연한 식품용 실리콘 소재의 교체용 샤워스크린. 균일한 물 분산을 돕는 저가형 대안.",
      en: "Flexible food-grade silicone replacement shower screen. A budget-friendly alternative for even water dispersion.",
    },
  },
  {
    category: "accessory", brand: "Rancilio", accessoryType: "showerscreen", model: "Silvia OEM Shower Screen",
    diameterMm: "53", material: "metal",
    description: {
      ko: "란칠리오 실비아 순정 샤워스크린. 정기 교체 및 세척이 필요한 소모품.",
      en: "OEM shower screen for the Rancilio Silvia. A wear part requiring periodic cleaning/replacement.",
    },
  },
  {
    category: "accessory", brand: "Breville", accessoryType: "showerscreen", model: "OEM Shower Screen",
    diameterMm: "54", material: "metal",
    description: {
      ko: "브레빌 머신(54mm/58mm 버전 별도) 순정 샤워스크린.",
      en: "OEM shower screen for Breville machines (separate 54mm/58mm versions).",
    },
  },
  {
    category: "accessory", brand: "San Marco", accessoryType: "showerscreen", model: "Shower Screen",
    diameterMm: "58", material: "metal",
    description: {
      ko: "상업용 머신에 널리 쓰이는 산마르코 순정/호환 샤워스크린.",
      en: "OEM/compatible shower screen widely used on San Marco commercial machines.",
    },
  },
  {
    category: "accessory", brand: "Synesso", accessoryType: "showerscreen", model: "Sproline Precision Shower Screen",
    diameterMm: "58", material: "metal",
    description: {
      ko: "시네소 스프로라인 전용 정밀 샤워스크린.",
      en: "Precision shower screen specific to the Synesso Sproline.",
    },
  },
];

// ── 알려진 원두 산지 정보 (자동완성용) ──────────────────────────
export const SEED_BEAN_ORIGINS = [
  {
    name: { ko: "에티오피아 예가체프", en: "Ethiopia Yirgacheffe" },
    origin: { ko: "에티오피아", en: "Ethiopia" },
    region: { ko: "예가체프(Yirgacheffe)", en: "Yirgacheffe" },
    variety: { ko: "헤이룸", en: "Heirloom" },
    process: { ko: "워시드", en: "Washed" },
    altitude: "1700-2200m",
    description: {
      ko: "꽃향, 시트러스, 베르가못 풍미가 특징. 에티오피아 대표 산지.",
      en: "Known for floral, citrus, and bergamot notes. A flagship Ethiopian origin.",
    },
  },
  {
    name: { ko: "에티오피아 시다모", en: "Ethiopia Sidamo" },
    origin: { ko: "에티오피아", en: "Ethiopia" },
    region: { ko: "시다모(Sidamo)", en: "Sidamo" },
    variety: { ko: "헤이룸", en: "Heirloom" },
    process: { ko: "내추럴", en: "Natural" },
    altitude: "1500-2200m",
    description: {
      ko: "베리류 단맛과 와인 같은 산미가 특징.",
      en: "Features berry sweetness with wine-like acidity.",
    },
  },
  {
    name: { ko: "콜롬비아 후일라", en: "Colombia Huila" },
    origin: { ko: "콜롬비아", en: "Colombia" },
    region: { ko: "후일라(Huila)", en: "Huila" },
    variety: { ko: "카투라, 카스티요", en: "Caturra, Castillo" },
    process: { ko: "워시드", en: "Washed" },
    altitude: "1500-2000m",
    description: {
      ko: "균형 잡힌 단맛과 산미, 캐러멜 노트가 특징.",
      en: "Balanced sweetness and acidity with caramel notes.",
    },
  },
  {
    name: { ko: "콜롬비아 나리뇨", en: "Colombia Nariño" },
    origin: { ko: "콜롬비아", en: "Colombia" },
    region: { ko: "나리뇨(Nariño)", en: "Nariño" },
    variety: { ko: "카투라, 티피카", en: "Caturra, Typica" },
    process: { ko: "워시드", en: "Washed" },
    altitude: "1700-2300m",
    description: {
      ko: "고지대 재배로 산미가 강하고 복합적인 풍미.",
      en: "High-altitude grown, with bright acidity and complex flavor.",
    },
  },
  {
    name: { ko: "케냐 키암부", en: "Kenya Kiambu" },
    origin: { ko: "케냐", en: "Kenya" },
    region: { ko: "키암부(Kiambu)", en: "Kiambu" },
    variety: { ko: "SL28, SL34", en: "SL28, SL34" },
    process: { ko: "워시드", en: "Washed" },
    altitude: "1500-2100m",
    description: {
      ko: "강한 산미와 블랙커런트 풍미로 유명한 케냐 대표 산지.",
      en: "A flagship Kenyan origin known for bright acidity and blackcurrant notes.",
    },
  },
  {
    name: { ko: "과테말라 안티구아", en: "Guatemala Antigua" },
    origin: { ko: "과테말라", en: "Guatemala" },
    region: { ko: "안티구아(Antigua)", en: "Antigua" },
    variety: { ko: "버번, 카투라", en: "Bourbon, Caturra" },
    process: { ko: "워시드", en: "Washed" },
    altitude: "1500-1700m",
    description: {
      ko: "화산토양 재배, 초콜릿과 스파이시한 풍미.",
      en: "Grown in volcanic soil, with chocolate and spicy notes.",
    },
  },
  {
    name: { ko: "코스타리카 타라주", en: "Costa Rica Tarrazú" },
    origin: { ko: "코스타리카", en: "Costa Rica" },
    region: { ko: "타라주(Tarrazú)", en: "Tarrazú" },
    variety: { ko: "카투라, 카투아이", en: "Caturra, Catuaí" },
    process: { ko: "워시드", en: "Washed" },
    altitude: "1200-1900m",
    description: {
      ko: "깔끔한 산미와 단맛의 균형이 좋은 산지.",
      en: "A well-balanced origin with clean acidity and sweetness.",
    },
  },
  {
    name: { ko: "파나마 게이샤", en: "Panama Geisha" },
    origin: { ko: "파나마", en: "Panama" },
    region: { ko: "보케테(Boquete)", en: "Boquete" },
    variety: { ko: "게이샤", en: "Geisha" },
    process: { ko: "워시드", en: "Washed" },
    altitude: "1500-1900m",
    description: {
      ko: "재스민, 베르가못 향의 고급 품종. 경매가 최고가 기록.",
      en: "A premium variety with jasmine and bergamot aromatics. Holds record auction prices.",
    },
  },
  {
    name: { ko: "브라질 세하도", en: "Brazil Cerrado" },
    origin: { ko: "브라질", en: "Brazil" },
    region: { ko: "세하도(Cerrado)", en: "Cerrado" },
    variety: { ko: "버번, 카투아이", en: "Bourbon, Catuaí" },
    process: { ko: "내추럴", en: "Natural" },
    altitude: "800-1300m",
    description: {
      ko: "낮은 산미, 너트와 초콜릿 풍미로 블렌드 베이스로 많이 사용.",
      en: "Low acidity with nutty, chocolatey notes. Commonly used as a blend base.",
    },
  },
  {
    name: { ko: "인도네시아 만델링", en: "Indonesia Mandheling" },
    origin: { ko: "인도네시아", en: "Indonesia" },
    region: { ko: "수마트라(Sumatra)", en: "Sumatra" },
    variety: { ko: "티피카, 카투라", en: "Typica, Caturra" },
    process: { ko: "세미워시드(길링바사)", en: "Semi-washed (Giling Basah)" },
    altitude: "1100-1600m",
    description: {
      ko: "묵직한 바디감, 흙내음과 허브 풍미가 특징.",
      en: "Heavy body with earthy and herbal flavor notes.",
    },
  },
  {
    name: { ko: "예멘 모카 마타리", en: "Yemen Mocha Mattari" },
    origin: { ko: "예멘", en: "Yemen" },
    region: { ko: "마타리(Mattari)", en: "Mattari" },
    variety: { ko: "예멘 토착종", en: "Yemeni heirloom" },
    process: { ko: "내추럴", en: "Natural" },
    altitude: "1500-2200m",
    description: {
      ko: "와인 같은 산미와 초콜릿 풍미, 야생적인 캐릭터.",
      en: "Wine-like acidity with chocolate notes and a wild, untamed character.",
    },
  },
  {
    name: { ko: "르완다 키부", en: "Rwanda Lake Kivu" },
    origin: { ko: "르완다", en: "Rwanda" },
    region: { ko: "키부 호수(Lake Kivu)", en: "Lake Kivu" },
    variety: { ko: "버번", en: "Bourbon" },
    process: { ko: "워시드", en: "Washed" },
    altitude: "1500-2000m",
    description: {
      ko: "밝은 산미와 차(Tea) 같은 깔끔한 뒷맛.",
      en: "Bright acidity with a clean, tea-like finish.",
    },
  },
];

// ── 한국 유명 로스터리 대표 원두 (자동완성용) ────────────────────
// 출처: 각 로스터리 공식 정보 기준으로 일반적으로 알려진 시그니처 원두
// roastery 필드는 BeanWikiForm의 "로스터리" 입력란에 매핑됨
export const SEED_KOREAN_ROASTERS = [
  {
    name: { ko: "프릳츠 올드독", en: "Fritz Old Dog" },
    roastery: { ko: "프릳츠커피컴퍼니", en: "Fritz Coffee Company" },
    origin: { ko: "브라질, 콜롬비아 블렌드", en: "Brazil, Colombia Blend" },
    region: "",
    variety: "",
    process: { ko: "워시드/내추럴 혼합", en: "Washed/Natural Mix" },
    altitude: "",
    description: {
      ko: "프릳츠의 시그니처 블렌드. 견과류와 캐러멜의 균형 잡힌 단맛이 특징.",
      en: "Fritz's signature blend. Balanced sweetness with nutty and caramel notes.",
    },
  },
  {
    name: { ko: "모모스 시그니처 블렌드", en: "Momos Signature Blend" },
    roastery: { ko: "모모스커피", en: "Momos Coffee" },
    origin: { ko: "에티오피아, 콜롬비아 블렌드", en: "Ethiopia, Colombia Blend" },
    region: "", variety: "",
    process: { ko: "워시드", en: "Washed" },
    altitude: "",
    description: {
      ko: "월드 바리스타 챔피언십 우승 로스터리의 시그니처 블렌드. 산지 직거래 원두 사용.",
      en: "Signature blend from a World Barista Championship-winning roastery, using direct-trade beans.",
    },
  },
  {
    name: { ko: "빈브라더스 하우스 블렌드", en: "Bean Brothers House Blend" },
    roastery: { ko: "빈브라더스", en: "Bean Brothers" },
    origin: { ko: "콜롬비아, 브라질 블렌드", en: "Colombia, Brazil Blend" },
    region: "", variety: "",
    process: { ko: "워시드", en: "Washed" },
    altitude: "",
    description: {
      ko: "균형 잡힌 바디감과 단맛 중심의 데일리 블렌드.",
      en: "A balanced daily blend with body and sweetness focus.",
    },
  },
  {
    name: { ko: "테라로사 게이샤", en: "Terarosa Geisha" },
    roastery: { ko: "테라로사", en: "Terarosa" },
    origin: { ko: "파나마", en: "Panama" },
    region: { ko: "보케테(Boquete)", en: "Boquete" },
    variety: { ko: "게이샤", en: "Geisha" },
    process: { ko: "워시드", en: "Washed" },
    altitude: "1500-1900m",
    description: {
      ko: "강릉 기반 로스터리의 프리미엄 라인업. 재스민, 시트러스 향이 특징.",
      en: "Premium lineup from the Gangneung-based roastery. Jasmine and citrus aromatics.",
    },
  },
  {
    name: { ko: "커피리브레 50 블렌드", en: "Coffee Libre 50 Blend" },
    roastery: { ko: "커피리브레", en: "Coffee Libre" },
    origin: { ko: "에티오피아, 콜롬비아 블렌드", en: "Ethiopia, Colombia Blend" },
    region: "", variety: "",
    process: { ko: "워시드", en: "Washed" },
    altitude: "",
    description: {
      ko: "직거래 산지 원두를 사용하는 스페셜티 로스터리의 대표 블렌드.",
      en: "Flagship blend from a specialty roastery using direct-trade beans.",
    },
  },
  {
    name: { ko: "나무사이로 싱글오리진", en: "Namusiro Single Origin" },
    roastery: { ko: "나무사이로", en: "Namusiro" },
    origin: { ko: "에티오피아", en: "Ethiopia" },
    region: "", variety: { ko: "헤이룸", en: "Heirloom" },
    process: { ko: "워시드", en: "Washed" },
    altitude: "",
    description: {
      ko: "성수동 기반 로스터리. 산미가 살아있는 밝은 풍미의 싱글 오리진 위주.",
      en: "Seongsu-dong based roastery, known for bright, acidity-forward single origins.",
    },
  },
  {
    name: { ko: "앤트러사이트 시그니처", en: "Anthracite Signature" },
    roastery: { ko: "앤트러사이트커피", en: "Anthracite Coffee" },
    origin: { ko: "콜롬비아, 에티오피아 블렌드", en: "Colombia, Ethiopia Blend" },
    region: "", variety: "",
    process: { ko: "워시드", en: "Washed" },
    altitude: "",
    description: {
      ko: "합정·제주 기반 로스터리. 밸런스 좋은 미디엄 로스트 블렌드.",
      en: "Hapjeong/Jeju based roastery. Well-balanced medium-roast blend.",
    },
  },
  {
    name: { ko: "헬카페 콜드브루 블렌드", en: "Helcafe Cold Brew Blend" },
    roastery: { ko: "헬카페", en: "Helcafe" },
    origin: { ko: "브라질, 과테말라 블렌드", en: "Brazil, Guatemala Blend" },
    region: "", variety: "",
    process: { ko: "내추럴/워시드 혼합", en: "Natural/Washed Mix" },
    altitude: "",
    description: {
      ko: "다크 초콜릿, 견과류 풍미의 묵직한 바디 블렌드.",
      en: "A full-bodied blend with dark chocolate and nutty notes.",
    },
  },
  {
    name: { ko: "펠트 에스프레소 블렌드", en: "Felt Espresso Blend" },
    roastery: { ko: "펠트커피", en: "Felt Coffee" },
    origin: { ko: "브라질, 콜롬비아 블렌드", en: "Brazil, Colombia Blend" },
    region: "", variety: "",
    process: { ko: "워시드", en: "Washed" },
    altitude: "",
    description: {
      ko: "한남동 기반 로스터리. 캐러멜, 카카오 풍미의 클래식 에스프레소 블렌드.",
      en: "Hannam-dong based roastery. A classic espresso blend with caramel and cacao notes.",
    },
  },
  {
    name: { ko: "센터커피 시그니처", en: "Center Coffee Signature" },
    roastery: { ko: "센터커피", en: "Center Coffee" },
    origin: { ko: "콜롬비아", en: "Colombia" },
    region: "", variety: "",
    process: { ko: "워시드", en: "Washed" },
    altitude: "",
    description: {
      ko: "성수동 로스터리. 단맛과 산미의 균형을 중시하는 시그니처 라인.",
      en: "Seongsu-dong roastery. Signature line emphasizing balance of sweetness and acidity.",
    },
  },
  {
    name: { ko: "커피몽타주 블렌드", en: "Coffee Montage Blend" },
    roastery: { ko: "커피몽타주", en: "Coffee Montage" },
    origin: { ko: "에티오피아, 브라질 블렌드", en: "Ethiopia, Brazil Blend" },
    region: "", variety: "",
    process: { ko: "워시드", en: "Washed" },
    altitude: "",
    description: {
      ko: "다양한 산지 원두를 조합한 균형 잡힌 하우스 블렌드.",
      en: "A balanced house blend combining beans from multiple origins.",
    },
  },
  {
    name: { ko: "레드빈 시그니처 블렌드", en: "Redbean Signature Blend" },
    roastery: { ko: "레드빈", en: "Redbean" },
    origin: { ko: "콜롬비아, 에티오피아 블렌드", en: "Colombia, Ethiopia Blend" },
    region: "", variety: "",
    process: { ko: "워시드", en: "Washed" },
    altitude: "",
    description: {
      ko: "부드러운 단맛과 깔끔한 후미가 특징인 데일리 블렌드.",
      en: "A daily blend known for smooth sweetness and a clean finish.",
    },
  },
  {
    name: { ko: "디 에디트 하우스 블렌드", en: "The Edit House Blend" },
    roastery: { ko: "디 에디트", en: "The Edit" },
    origin: { ko: "브라질, 콜롬비아 블렌드", en: "Brazil, Colombia Blend" },
    region: "", variety: "",
    process: { ko: "워시드", en: "Washed" },
    altitude: "",
    description: {
      ko: "균형 잡힌 산미와 바디감의 올라운드 블렌드.",
      en: "An all-around blend with balanced acidity and body.",
    },
  },
  {
    name: { ko: "카페식스 에스프레소 블렌드", en: "Cafe Six Espresso Blend" },
    roastery: { ko: "카페식스", en: "Cafe Six" },
    origin: { ko: "브라질, 과테말라 블렌드", en: "Brazil, Guatemala Blend" },
    region: "", variety: "",
    process: { ko: "내추럴/워시드 혼합", en: "Natural/Washed Mix" },
    altitude: "",
    description: {
      ko: "달콤한 캐러멜 노트의 클래식 에스프레소 베이스 블렌드.",
      en: "A classic espresso-base blend with sweet caramel notes.",
    },
  },
  {
    name: { ko: "매뉴팩트 시그니처", en: "Manufact Signature" },
    roastery: { ko: "매뉴팩트커피", en: "Manufact Coffee" },
    origin: { ko: "에티오피아, 콜롬비아 블렌드", en: "Ethiopia, Colombia Blend" },
    region: "", variety: "",
    process: { ko: "워시드", en: "Washed" },
    altitude: "",
    description: {
      ko: "성수동 기반 로스터리. 화사한 산미를 강조한 라이트 로스트 위주.",
      en: "Seongsu-dong based roastery, focused on light roasts with bright acidity.",
    },
  },
  {
    name: { ko: "어니언 하우스 블렌드", en: "Onion House Blend" },
    roastery: { ko: "어니언", en: "Onion" },
    origin: { ko: "콜롬비아, 브라질 블렌드", en: "Colombia, Brazil Blend" },
    region: "", variety: "",
    process: { ko: "워시드", en: "Washed" },
    altitude: "",
    description: {
      ko: "베이커리 카페로 유명한 어니언의 데일리 하우스 블렌드.",
      en: "Daily house blend from Onion, a cafe known for its bakery items.",
    },
  },
  {
    name: { ko: "보헤미안 시그니처 블렌드", en: "Bohemian Signature Blend" },
    roastery: { ko: "보헤미안커피", en: "Bohemian Coffee" },
    origin: { ko: "브라질, 콜롬비아 블렌드", en: "Brazil, Colombia Blend" },
    region: "", variety: "",
    process: { ko: "워시드", en: "Washed" },
    altitude: "",
    description: {
      ko: "강릉 기반의 국내 1세대 스페셜티 로스터리 시그니처 블렌드.",
      en: "Signature blend from a first-generation specialty roastery based in Gangneung.",
    },
  },
  {
    name: { ko: "카페공명 시그니처", en: "Cafe Gongmyung Signature" },
    roastery: { ko: "카페공명", en: "Cafe Gongmyung" },
    origin: { ko: "에티오피아, 콜롬비아 블렌드", en: "Ethiopia, Colombia Blend" },
    region: "", variety: "",
    process: { ko: "워시드", en: "Washed" },
    altitude: "",
    description: {
      ko: "전주 기반 로스터리. 균형 잡힌 풍미의 시그니처 블렌드.",
      en: "Jeonju-based roastery. A signature blend with balanced flavor.",
    },
  },
  {
    name: { ko: "인덱스 시그니처 블렌드", en: "Index Signature Blend" },
    roastery: { ko: "인덱스커피", en: "Index Coffee" },
    origin: { ko: "콜롬비아, 브라질 블렌드", en: "Colombia, Brazil Blend" },
    region: "", variety: "",
    process: { ko: "워시드", en: "Washed" },
    altitude: "",
    description: {
      ko: "균형 잡힌 단맛과 바디감의 데일리 블렌드.",
      en: "A daily blend with balanced sweetness and body.",
    },
  },
  {
    name: { ko: "콩볶는 곰다방 하우스 블렌드", en: "Bear Coffee House Blend" },
    roastery: { ko: "콩볶는곰다방", en: "Bear Coffee Roasters" },
    origin: { ko: "브라질, 콜롬비아 블렌드", en: "Brazil, Colombia Blend" },
    region: "", variety: "",
    process: { ko: "워시드", en: "Washed" },
    altitude: "",
    description: {
      ko: "동네 로스터리로 시작해 인지도를 넓힌 친근한 하우스 블렌드.",
      en: "A friendly house blend from a roastery that grew from a local neighborhood shop.",
    },
  },
];
