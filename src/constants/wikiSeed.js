/* ============================================================
   BREWLOG NOTE — src/constants/wikiSeed.js
   커피 위키 시드 데이터
   ─ SEED_EQUIPMENTS : 유명 머신/그라인더 스펙 미리 채움
   ─ SEED_BEAN_ORIGINS : 알려진 원두 산지 정보 (자동완성용)
   ─ 출처: 제조사 공식 스펙, 일반적으로 알려진 정보
   ============================================================ */

// ── 유명 장비 스펙 (머신 + 그라인더) ──────────────────────────
export const SEED_EQUIPMENTS = [
  // ── 머신 ──
  {
    category: "machine", brand: "Breville", model: "870 (Barista Express)",
    type: "semi", boilerType: "thermoblock", pumpBar: "15", tankL: "2",
    hasSteam: true, description: "내장 코니컬 그라인더 일체형. 가정용 입문기로 가장 널리 쓰이는 모델.",
  },
  {
    category: "machine", brand: "Breville", model: "878 (Barista Pro)",
    type: "semi", boilerType: "thermoblock", pumpBar: "15", tankL: "2",
    hasSteam: true, description: "870의 후속작. 더 빠른 예열, 정밀 온도 제어(PID) 탑재.",
  },
  {
    category: "machine", brand: "Breville", model: "990 (Oracle)",
    type: "semi", boilerType: "dual", pumpBar: "15", tankL: "2.5",
    hasSteam: true, description: "자동 탬핑, 듀얼 보일러로 추출과 스팀 동시 가능.",
  },
  {
    category: "machine", brand: "Breville", model: "985 (Oracle Jet)",
    type: "semi", boilerType: "dual", pumpBar: "15", tankL: "2.5",
    hasSteam: true, description: "WiFi 연결 지원, Breville+ 앱 연동 가능.",
  },
  {
    category: "machine", brand: "Gaggia", model: "Classic Pro",
    type: "semi", boilerType: "single", pumpBar: "15", tankL: "2.1",
    hasSteam: true, description: "스테인리스 보일러, 상업용 포터필터(58mm) 호환으로 입문용 머신 중 인기.",
  },
  {
    category: "machine", brand: "Rancilio", model: "Silvia",
    type: "semi", boilerType: "single", pumpBar: "15", tankL: "2.7",
    hasSteam: true, description: "상업용 그룹헤드 적용. 홈바리스타들에게 클래식으로 불림.",
  },
  {
    category: "machine", brand: "De'Longhi", model: "EC685 (Dedica)",
    type: "semi", boilerType: "thermoblock", pumpBar: "15", tankL: "1.1",
    hasSteam: true, description: "슬림 디자인, 좁은 공간에 적합한 컴팩트 머신.",
  },
  {
    category: "machine", brand: "La Marzocco", model: "Linea Mini",
    type: "semi", boilerType: "dual", pumpBar: "9", tankL: "2",
    hasSteam: true, description: "상업용 라마르조코 기술을 가정용으로 축소. 포화 그룹헤드.",
  },
  {
    category: "machine", brand: "Jura", model: "E8",
    type: "full", boilerType: "thermoblock", pumpBar: "15", tankL: "1.9",
    hasSteam: true, description: "전자동, 원터치 라떼/카푸치노 제조 가능.",
  },
  {
    category: "machine", brand: "Philips", model: "3200 (LatteGo)",
    type: "full", boilerType: "thermoblock", pumpBar: "15", tankL: "1.8",
    hasSteam: true, description: "LatteGo 우유 시스템으로 세척 간편, 전자동 입문기.",
  },

  // ── 그라인더 ──
  {
    category: "grinder", brand: "Baratza", model: "Encore",
    burrType: "conical", grindSteps: "40", motorType: "dc", rpm: "450",
    description: "입문용 그라인더 베스트셀러. 핸드드립부터 에스프레소까지 폭넓게 사용.",
  },
  {
    category: "grinder", brand: "Baratza", model: "Sette 270Wi",
    burrType: "conical", grindSteps: "30", motorType: "dc", rpm: "1400",
    description: "Acaia와 협업한 무게 기반 자동 정지 그라인더. 에스프레소 전용.",
  },
  {
    category: "grinder", brand: "Baratza", model: "Virtuoso+",
    burrType: "conical", grindSteps: "40", motorType: "dc", rpm: "450",
    description: "Encore보다 상위 모델, 디지털 타이머 내장.",
  },
  {
    category: "grinder", brand: "Eureka", model: "Mignon Specialita",
    burrType: "flat", grindSteps: "999", motorType: "dc", rpm: "1350",
    description: "이탈리아 제조, 무단계 조절 가능한 플랫버 그라인더.",
  },
  {
    category: "grinder", brand: "Niche", model: "Zero",
    burrType: "conical", grindSteps: "999", motorType: "dc", rpm: "200",
    description: "저속 회전으로 발열 최소화, 싱글도징 전용 설계.",
  },
  {
    category: "grinder", brand: "Comandante", model: "C40",
    burrType: "conical", grindSteps: "999", motorType: "ac", rpm: "0",
    description: "수동 핸드 그라인더, 캠핑/여행용으로도 인기.",
  },
  {
    category: "grinder", brand: "1Zpresso", model: "J-Max",
    burrType: "conical", grindSteps: "999", motorType: "ac", rpm: "0",
    description: "수동 그라인더, 분쇄 입도 균일성으로 평가가 좋음.",
  },

  // ── 핸드드립 도구 ──
  {
    category: "handdrip", brand: "Hario", model: "V60",
    material: "ceramic", dripperShape: "cone", capacityCups: "2",
    description: "나선형 리브, 원뿔형 드리퍼의 대표 모델. 플라스틱/유리/도자기 버전 존재.",
  },
  {
    category: "handdrip", brand: "Kalita", model: "Wave 155",
    material: "stainless", dripperShape: "wave", capacityCups: "2",
    description: "평저형에 웨이브 필터 사용. 균일한 추출로 입문자에게 추천됨.",
  },
  {
    category: "handdrip", brand: "Chemex", model: "Classic 6-Cup",
    material: "glass", dripperShape: "cone", capacityCups: "6",
    description: "드리퍼와 서버가 일체형. 전용 두꺼운 필터로 깔끔한 맛 표현.",
  },
  {
    category: "handdrip", brand: "Origami", model: "Dripper",
    material: "ceramic", dripperShape: "cone", capacityCups: "2",
    description: "리브가 꽃잎 모양으로 배치되어 다양한 필터(원뿔/평저) 호환.",
  },
];

// ── 알려진 원두 산지 정보 (자동완성용) ──────────────────────────
export const SEED_BEAN_ORIGINS = [
  {
    name: "에티오피아 예가체프", origin: "에티오피아", region: "예가체프(Yirgacheffe)",
    variety: "헤이룸", process: "워시드", altitude: "1700-2200m",
    description: "꽃향, 시트러스, 베르가못 풍미가 특징. 에티오피아 대표 산지.",
  },
  {
    name: "에티오피아 시다모", origin: "에티오피아", region: "시다모(Sidamo)",
    variety: "헤이룸", process: "내추럴", altitude: "1500-2200m",
    description: "베리류 단맛과 와인 같은 산미가 특징.",
  },
  {
    name: "콜롬비아 후일라", origin: "콜롬비아", region: "후일라(Huila)",
    variety: "카투라, 카스티요", process: "워시드", altitude: "1500-2000m",
    description: "균형 잡힌 단맛과 산미, 캐러멜 노트가 특징.",
  },
  {
    name: "콜롬비아 나리뇨", origin: "콜롬비아", region: "나리뇨(Nariño)",
    variety: "카투라, 티피카", process: "워시드", altitude: "1700-2300m",
    description: "고지대 재배로 산미가 강하고 복합적인 풍미.",
  },
  {
    name: "케냐 키암부", origin: "케냐", region: "키암부(Kiambu)",
    variety: "SL28, SL34", process: "워시드", altitude: "1500-2100m",
    description: "강한 산미와 블랙커런트 풍미로 유명한 케냐 대표 산지.",
  },
  {
    name: "과테말라 안티구아", origin: "과테말라", region: "안티구아(Antigua)",
    variety: "버번, 카투라", process: "워시드", altitude: "1500-1700m",
    description: "화산토양 재배, 초콜릿과 스파이시한 풍미.",
  },
  {
    name: "코스타리카 타라주", origin: "코스타리카", region: "타라주(Tarrazú)",
    variety: "카투라, 카투아이", process: "워시드", altitude: "1200-1900m",
    description: "깔끔한 산미와 단맛의 균형이 좋은 산지.",
  },
  {
    name: "파나마 게이샤", origin: "파나마", region: "보케테(Boquete)",
    variety: "게이샤", process: "워시드", altitude: "1500-1900m",
    description: "재스민, 베르가못 향의 고급 품종. 경매가 최고가 기록.",
  },
  {
    name: "브라질 세하도", origin: "브라질", region: "세하도(Cerrado)",
    variety: "버번, 카투아이", process: "내추럴", altitude: "800-1300m",
    description: "낮은 산미, 너트와 초콜릿 풍미로 블렌드 베이스로 많이 사용.",
  },
  {
    name: "인도네시아 만델링", origin: "인도네시아", region: "수마트라(Sumatra)",
    variety: "티피카, 카투라", process: "세미워시드(길링바사)", altitude: "1100-1600m",
    description: "묵직한 바디감, 흙내음과 허브 풍미가 특징.",
  },
  {
    name: "예멘 모카 마타리", origin: "예멘", region: "마타리(Mattari)",
    variety: "예멘 토착종", process: "내추럴", altitude: "1500-2200m",
    description: "와인 같은 산미와 초콜릿 풍미, 야생적인 캐릭터.",
  },
  {
    name: "르완다 키부", origin: "르완다", region: "키부 호수(Lake Kivu)",
    variety: "버번", process: "워시드", altitude: "1500-2000m",
    description: "밝은 산미와 차(Tea) 같은 깔끔한 뒷맛.",
  },
];
