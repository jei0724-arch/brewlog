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
    burrType: "conical", grindSteps: "999", motorType: "ac", rpm: "0",
    description: {
      ko: "수동 핸드 그라인더, 캠핑/여행용으로도 인기.",
      en: "Manual hand grinder, also popular for camping and travel.",
    },
  },
  {
    category: "grinder", brand: "1Zpresso", model: "J-Max",
    burrType: "conical", grindSteps: "999", motorType: "ac", rpm: "0",
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
