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

// ── 악세사리 (관리자 큐레이션 — 정적 카탈로그, 유저 등록 불가) ────
// category: "basket" | "tamper" | "prep" | "cleaning" | "measure" | "milk" | "storage"
export const SEED_ACCESSORIES = [
  { category: "bottomless", name: { ko: "보텀리스 포터필터", en: "Bottomless Portafilter" },
    description: { ko: "바닥이 뚫려 있어 추출 흐름(채널링)을 육안으로 확인할 수 있는 포터필터.", en: "A portafilter with no spout, letting you visually check extraction flow and channeling." } },
  { category: "basket", name: { ko: "프리시전 바스켓 (VST/IMS)", en: "Precision Basket (VST/IMS)" },
    description: { ko: "레이저 가공으로 구멍 크기가 균일해 추출 편차를 줄여주는 고정밀 바스켓.", en: "Laser-drilled basket with uniform hole size, reducing extraction variance." } },
  { category: "prep", name: { ko: "WDT 툴", en: "WDT Tool (Weiss Distribution Technique)" },
    description: { ko: "가는 바늘로 도징 후 원두를 휘저어 뭉침을 풀고 균일하게 분산시키는 도구.", en: "Fine needles used to stir grounds after dosing, breaking up clumps for even distribution." } },
  { category: "tamper", name: { ko: "탬퍼", en: "Tamper" },
    description: { ko: "분쇄된 원두를 평평하고 균일하게 눌러 다지는 도구. 58mm가 표준 규격.", en: "Used to press ground coffee into a flat, even puck. 58mm is the standard size." } },
  { category: "prep", name: { ko: "디스트리뷰터 (레벨러)", en: "Distributor / Leveler" },
    description: { ko: "탬핑 전 원두 표면을 회전시켜 평평하게 고르는 도구. OCD가 대표적.", en: "Levels the coffee bed before tamping via a spinning motion. OCD is the well-known brand." } },
  { category: "prep", name: { ko: "도징 퍼널", en: "Dosing Funnel" },
    description: { ko: "그라인더에서 포터필터로 원두를 옮길 때 흘림과 정전기 튐을 막아주는 깔때기.", en: "A funnel that clips onto the portafilter to prevent spills and static scatter when dosing." } },
  { category: "prep", name: { ko: "도징컵", en: "Dosing Cup" },
    description: { ko: "그라인더에서 갈린 원두를 받아두는 컵. 싱글도징 워크플로우에 사용.", en: "A cup that catches freshly ground coffee, used in single-dosing workflows." } },
  { category: "basket", name: { ko: "퍽 스크린", en: "Puck Screen" },
    description: { ko: "샤워스크린 물자국 방지 및 고른 물 분산을 위해 퍽 위에 올리는 금속망.", en: "A metal mesh placed on top of the puck for even water distribution and a cleaner shower screen." } },
  { category: "cleaning", name: { ko: "넉박스", en: "Knock Box" },
    description: { ko: "사용한 원두 찌꺼기(퍽)를 두드려 버리는 통.", en: "A container for knocking out spent coffee pucks after brewing." } },
  { category: "milk", name: { ko: "밀크 피처", en: "Milk Pitcher" },
    description: { ko: "우유 스티밍 및 라떼아트용 스테인리스 피처. 350ml/600ml가 흔한 용량.", en: "Stainless steel pitcher for steaming milk and latte art. 350ml/600ml are common sizes." } },
  { category: "measure", name: { ko: "전자저울 (커피용)", en: "Coffee Scale" },
    description: { ko: "도징량과 추출량을 0.1g 단위로 측정하는 저울. Acaia가 대표적.", en: "Measures dose and yield to 0.1g precision. Acaia is a well-known brand." } },
  { category: "cleaning", name: { ko: "에스프레소 머신 청소정 (탭탭)", en: "Espresso Cleaning Tablets" },
    description: { ko: "그룹헤드 백플러싱 시 사용하는 세척 전용 정제.", en: "Cleaning tablets used specifically for backflushing the group head." } },
  { category: "cleaning", name: { ko: "블라인드 필터 (백플러시 디스크)", en: "Blind Filter (Backflush Disc)" },
    description: { ko: "구멍이 없는 필터로, 세척액을 그룹헤드 내부에서 순환시켜 백플러싱할 때 사용.", en: "A solid filter with no holes, used to circulate cleaning solution inside the group head during backflushing." } },
  { category: "measure", name: { ko: "TDS 굴절계 (당도계)", en: "TDS Refractometer" },
    description: { ko: "추출된 커피의 용존 고형분 농도(TDS)를 측정해 수율 계산에 사용.", en: "Measures the dissolved solids concentration (TDS) of brewed coffee to calculate extraction yield." } },
  { category: "prep", name: { ko: "커피 스쿱", en: "Coffee Scoop" },
    description: { ko: "핸드드립·프렌치프레스 등에서 원두량을 가늠할 때 쓰는 계량스푼.", en: "A measuring spoon for estimating coffee dose in pour-over, French press, etc." } },
  { category: "cleaning", name: { ko: "탬핑 매트", en: "Tamping Mat" },
    description: { ko: "탬핑 시 포터필터를 올려두는 실리콘 받침. 작업대 보호 및 미끄럼 방지.", en: "A silicone mat to rest the portafilter on while tamping, protecting the counter and preventing slips." } },
  { category: "cleaning", name: { ko: "그라인더 청소솔", en: "Grinder Cleaning Brush" },
    description: { ko: "그라인더 날과 도징챔버에 낀 원두 잔여물을 제거하는 솔.", en: "A brush for clearing coffee residue from grinder burrs and the dosing chamber." } },
  { category: "prep", name: { ko: "드립 여과지", en: "Pour-Over Filter Papers" },
    description: { ko: "핸드드립 드리퍼용 종이 필터. 드리퍼 형태(원뿔형/웨이브 등)에 맞춰 규격이 다름.", en: "Paper filters for pour-over drippers. Sizes vary by dripper shape (cone, wave, etc.)." } },
  { category: "prep", name: { ko: "구스넥 케틀 (드립포트)", en: "Gooseneck Kettle" },
    description: { ko: "가늘고 일정한 물줄기로 핸드드립 추출을 컨트롤하기 위한 목이 긴 주전자.", en: "A long-necked kettle for controlling a thin, steady water flow during pour-over brewing." } },
  { category: "storage", name: { ko: "원두 보관통 (에어타이트 캐니스터)", en: "Airtight Coffee Canister" },
    description: { ko: "원두 산화를 늦추기 위해 공기와 빛을 차단하는 밀폐 보관용기. 원웨이 밸브가 흔히 탑재됨.", en: "An airtight, light-blocking container that slows bean oxidation, often with a one-way degassing valve." } },
  { category: "milk", name: { ko: "라떼아트 펜", en: "Latte Art Pen" },
    description: { ko: "우유 거품으로 세밀한 그림/글씨를 그릴 때 쓰는 얇은 꼬치형 도구.", en: "A thin skewer-like tool for drawing fine details or writing in milk foam art." } },
  { category: "milk", name: { ko: "스팀피처 린서 (린싱컵)", en: "Steam Pitcher Rinser" },
    description: { ko: "스팀완드를 헹굴 때 우유 잔여물이 튀지 않도록 잡아주는 컵.", en: "A cup that catches spray and residue when rinsing the steam wand between uses." } },
  { category: "cleaning", name: { ko: "그룹헤드 브러시", en: "Group Head Brush" },
    description: { ko: "그룹헤드 개스킷과 샤워스크린 주변의 커피 찌꺼기를 제거하는 전용 솔.", en: "A dedicated brush for clearing coffee grounds around the group head gasket and shower screen." } },
];
