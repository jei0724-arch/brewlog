/* ============================================================
   BREWLOG NOTE — src/constants/localization.js
   다국어(I18N), 보안질문, 개인정보 처리방침 상수
   ============================================================ */

// ── 보안 질문 (한국어 / 영어) ────────────────────────────────────
export const SECURITY_QUESTIONS = [
  "첫 번째로 키운 반려동물의 이름은?",
  "초등학교 때 가장 친한 친구 이름은?",
  "태어난 도시는?",
  "어머니의 고향은?",
  "좋아하는 커피 원두는?",
];

export const SECURITY_QUESTIONS_EN = [
  "What was your first pet's name?",
  "What was your best friend's name in elementary school?",
  "What city were you born in?",
  "What is your mother's hometown?",
  "What is your favorite coffee bean?",
];

// ── 개인정보 처리방침 ────────────────────────────────────────────
export const PRIVACY_POLICY_KO = `Brewlog 개인정보 처리방침

Brewlog는 이용자의 개인정보를 보호하기 위해 다음과 같이 처리방침을 수립합니다.

1. 개인정보의 수집 및 이용 목적
   - 회원 식별 및 서비스 부정이용 방지
   - 커피 추출 레시피 기록 및 공유 서비스 제공

2. 수집하는 개인정보 항목
   - 이메일 가입: 닉네임, 비밀번호(암호화 저장)
   - 구글 로그인: 구글 고유 ID, 프로필 닉네임

3. 개인정보 보유 및 이용 기간
   - 회원 탈퇴 시까지 보유하며, 탈퇴 즉시 파기합니다.

4. 제3자 제공
   - 이용자의 개인정보를 외부에 제공하지 않습니다.
   - 인프라 서비스: Firebase(Google), Vercel

5. 이용자의 권리
   - 언제든지 본인 정보 조회·수정·삭제를 요청할 수 있습니다.

6. 개인정보 보호 책임자
   - 담당자: 조민우
   - 이메일: jei0724@gmail.com

공고일자: 2026년 5월 21일
시행일자: 2026년 5월 21일

본 동의는 서비스 이용을 위한 필수 항목입니다.`;

export const PRIVACY_POLICY_EN = `Brewlog Privacy Policy

Brewlog establishes the following privacy policy to protect users' personal information.

1. Purpose of Collection and Use
   - Member identification and prevention of service misuse
   - Providing coffee recipe recording and sharing service

2. Items Collected
   - Email signup: Nickname, password (encrypted)
   - Google login: Google unique ID, profile nickname

3. Retention Period
   - Retained until account deletion, then immediately destroyed.

4. Third Party Disclosure
   - Personal information is not provided to third parties.
   - Infrastructure: Firebase (Google), Vercel

5. User Rights
   - You may request to view, modify, or delete your information at any time.

6. Privacy Officer
   - Name: Minwoo Jo
   - Email: jei0724@gmail.com

Announced: May 21, 2026
Effective: May 21, 2026

This consent is required to use the service.`;

// ── 다국어 팩 ─────────────────────────────────────────────────────
export const I18N = {
  ko: {
    appSub: "나만의 추출 노트",
    login: "로그인", register: "회원가입", findPw: "비밀번호 찾기",
    nickname: "닉네임", password: "비밀번호", pwConfirm: "비밀번호 확인",
    dupCheck: "중복 확인", confirmed: "확인 ✓",
    secQuestion: "보안 질문", secAnswer: "보안 질문 답변",
    loginBtn: "로그인하기", registerBtn: "가입하기",
    googleLogin: "Google로 로그인", googleRegister: "Google로 시작하기",
    orNickname: "또는 닉네임으로 가입",
    pwMatch: "비밀번호가 일치합니다 ✓", pwMismatch: "비밀번호가 일치하지 않습니다.",
    findStep1: "다음", findStep2: "확인",
    findDone: "본인 확인 완료!", findDoneDesc: "보안상 비밀번호를 직접 표시할 수 없어요. 새 비밀번호로 로그인하려면 다시 가입하거나 관리자에게 문의해주세요.",
    goLogin: "로그인하러 가기",
    feedTitle: "Brew Archive", myFeedTitle: "My Brews",
    feedSub: "브루어들의 추출 기록을 살펴보세요.",
    myFeedSub: "내가 기록한 추출 노트입니다.",
    followingFeedTitle: "Following",
    followingFeedSub: "구독 중인 브루어의 최신 기록이에요.",
    bookmarksFeedTitle: "Saved",
    bookmarksFeedSub: "저장해둔 레시피를 모아봤어요.",
    searchPlaceholder: "메뉴, 머신, 원두, 닉네임, 메모 검색 …",
    newRecipe: "기록하기",
    logout: "로그아웃", myBtn: "MY",
    emptyFeed: "아직 레시피가 없어요. 첫 번째 기록을 남겨보세요!",
    emptyMy: "아직 내 레시피가 없어요. 첫 번째 기록을 남겨보세요!",
    emptySearch: "검색 결과가 없어요.",
    bestTitle: "베스트 레시피",
    recordTitle: "레시피 기록하기", editTitle: "레시피 수정하기",
    machine: "커피 머신", machineBrand: "커피 머신 브랜드", machineModel: "세부 모델명",
    machineType: "머신 타입", autoType: "전자동", manualType: "반자동",
    grinder: "그라인더", grinderBrand: "그라인더 브랜드",
    company: "원두 회사명 *", bean: "원두 이름 *", roastDate: "로스팅 일자",
    coffeeMenu: "커피 메뉴 *", gram: "원두량 (G) *", gramAuto: "원두 분쇄량 (콩 갯수) *",
    seconds: "추출 시간 *", espressoMl: "추출량 (ML) *",
    diluteType: "희석 종류", diluteMl: "희석량 (ML)", syrup: "시럽 / 추가 재료",
    rating: "레시피 평가", note: "맛 노트 · 메모",
    pressureTitle: "예상 추출 압력", brewPressure: "추출 압력",
    pressureGood: "✅ 적정 압력", pressureHigh: "⚠️ 압력 높음", pressureLow: "⚠️ 압력 낮음",
    pressureRange: "적정: 9~11 bar",
    brewPressureDetail: "추출 압력 세부 기록 (BAR)",
    brewPressureDetailPh: "예) 9.0 — 직접 측정한 압력게이지 값",
    continuousMemo: "연속 추출 메모",
    continuousMemoPh: "예) 2샷 연속 / 더블 샷 / 탬핑 조정 후 재추출 등",
    save: "기록 저장", update: "수정 저장", saving: "저장 중…", cancel: "취소",
    deleteConfirm: "이 레시피를 삭제할까요?",
    mySettings: "MY 설정", myMachine: "커피 머신", myGrinder: "그라인더",
    myPw: "비밀번호 변경", curPw: "현재 비밀번호", newPw: "새 비밀번호", newPwConfirm: "새 비밀번호 확인",
    changePw: "비밀번호 변경", changing: "변경 중…", close: "닫기", changeBtn: "변경",
    timerStart: "추출 시작", timerStop: "정지", timerReset: "초기화", timerApply: "적용",
    follow: "구독", following: "구독중", unfollow: "구독취소", followingFeed: "구독",
    commentPlaceholder: "댓글을 남겨보세요…", commentSubmit: "등록", commentDelete: "삭제",
    commentLogin: "로그인 후 댓글 작성 가능해요", comments: "댓글",
    report: "신고", reportDone: "신고가 접수됐어요", reportAlready: "이미 신고한 콘텐츠예요",
    reportReasons: ["스팸/홍보", "욕설/혐오", "부적절한 내용", "기타"],
    bookmarks: "즐겨찾기", bookmarkSave: "저장됨", bookmarkAdd: "즐겨찾기 추가", bookmarkRemove: "즐겨찾기 해제",
    allRecipes: "전체", myBookmarks: "즐겨찾기", myRecipes: "내 레시피", myBeans: "내 원두", myEquip: "내 장비",
    equipVaultSub: "내가 사용하는 장비를 관리해요.",
    equipEmpty: "등록된 장비가 없어요.", equipEmptySub: "자주 쓰는 머신과 그라인더를 추가해보세요.",
    equipAdd: "장비 추가", equipEdit: "장비 수정", equipDelete: "장비 삭제",
    equipName: "장비 이름 *", equipBrand: "머신 브랜드 *", equipModel: "세부 모델",
    equipGrinder: "그라인더 브랜드", equipGrinderModel: "그라인더 모델",
    equipPurchaseDate: "구매일", equipNote: "메모",
    equipSetPrimary: "대표로 설정", equipIsPrimary: "대표 장비",
    equipDeleteConfirm: "이 장비를 삭제할까요?",
    equipTypeMachine: "커피 머신", equipTypeHanddrip: "핸드드립",
    beanVault: "Bean Vault", beanVaultSub: "내가 사용 중인 원두 재고를 관리해요.",
    beanAdd: "원두 추가", beanEdit: "원두 수정", beanDelete: "삭제",
    beanName: "원두 이름 *", beanRoastery: "로스터리 *",
    beanOrigin: "원산지", beanOriginDetail: "국가 · 지역 · 농장",
    beanOriginType: "원산지 유형", beanSingle: "싱글 오리진", beanBlend: "블렌드",
    beanVariety: "품종", beanVarietyPh: "예) 아라비카, 게이샤, 버본",
    beanProcess: "가공 방식", beanProcessPh: "예) 워시드, 내추럴, 무산소 발효",
    beanRoastLevel: "배전도",
    beanLight: "라이트", beanMedLight: "미디엄 라이트", beanMedium: "미디엄",
    beanMedDark: "미디엄 다크", beanDark: "다크",
    beanRoastDate: "로스팅 날짜", beanBuyDate: "구매 날짜",
    beanPrice: "구매 가격 (원)", beanWeight: "용량 (g)",
    beanNote: "메모",
    beanStatusLabel: "상태", beanOpen: "개봉 중", beanSealed: "미개봉", beanEmpty: "소진",
    beanDeleteConfirm: "이 원두를 삭제할까요?",
    beanDaysOld: "일 경과", beanFresh: "프레시", beanPeak: "피크", beanAging: "숙성 중", beanStale: "주의",
    beanEmptyState: "등록된 원두가 없어요.", beanEmptySub: "사용 중인 원두를 추가해보세요.",
    beanPricePerG: "원/g",
    ratingLabels: ["평가 없음", "별로예요", "그저 그래요", "괜찮아요", "맛있어요", "최고예요!"],
    roasting: "로스팅", beanUnit: "원두", extractTime: "추출시간", extractVol: "추출량",
    dilution: "희석", syrupLabel: "시럽",
    heartOwner: "내 레시피엔 하트를 누를 수 없어요",
    heartCancel: "하트 취소", heart: "하트",
    statGram: "원두", statSeconds: "추출시간", statMl: "추출량",
    beanCount: "개",
  },
  en: {
    appSub: "Your Personal Brew Log",
    login: "Login", register: "Sign Up", findPw: "Find Password",
    nickname: "Nickname", password: "Password", pwConfirm: "Confirm Password",
    dupCheck: "Check", confirmed: "OK ✓",
    secQuestion: "Security Question", secAnswer: "Answer",
    loginBtn: "Login", registerBtn: "Sign Up",
    googleLogin: "Continue with Google", googleRegister: "Start with Google",
    orNickname: "Or sign up with nickname",
    pwMatch: "Passwords match ✓", pwMismatch: "Passwords do not match.",
    findStep1: "Next", findStep2: "Confirm",
    findDone: "Identity Verified!", findDoneDesc: "For security, we can't display your password. Please re-register or contact admin.",
    goLogin: "Go to Login",
    feedTitle: "Brew Archive", myFeedTitle: "My Brews",
    feedSub: "Explore extraction notes from the community.",
    myFeedSub: "Your personal brew log.",
    followingFeedTitle: "Following",
    followingFeedSub: "Latest records from brewers you follow.",
    bookmarksFeedTitle: "Saved",
    bookmarksFeedSub: "Recipes you've bookmarked.",
    searchPlaceholder: "Search menu, machine, bean …",
    newRecipe: "Record",
    logout: "Logout", myBtn: "MY",
    emptyFeed: "No recipes yet. Be the first to share!",
    emptyMy: "No recipes yet. Start sharing!",
    emptySearch: "No results found.",
    bestTitle: "Best Recipes",
    recordTitle: "Record Recipe", editTitle: "Edit Recipe",
    machine: "Coffee Machine", machineBrand: "Machine Brand", machineModel: "Model Name",
    machineType: "Machine Type", autoType: "Automatic", manualType: "Semi-auto",
    grinder: "Grinder", grinderBrand: "Grinder Brand",
    company: "Brand *", bean: "Bean Name *", roastDate: "Roast Date",
    coffeeMenu: "Coffee Menu *", gram: "Dose (G) *", gramAuto: "Bean Count *",
    seconds: "Extraction Time *", espressoMl: "Yield (ML) *",
    diluteType: "Dilution Type", diluteMl: "Dilution (ML)", syrup: "Syrup / Add-ons",
    rating: "Rating", note: "Tasting Notes",
    pressureTitle: "Est. Brew Pressure", brewPressure: "Brew Pressure",
    pressureGood: "✅ Optimal", pressureHigh: "⚠️ Too High", pressureLow: "⚠️ Too Low",
    pressureRange: "Optimal: 9~11 bar",
    brewPressureDetail: "Brew Pressure Detail (BAR)",
    brewPressureDetailPh: "e.g. 9.0 — measured gauge reading",
    continuousMemo: "Continuous Extraction Note",
    continuousMemoPh: "e.g. 2nd shot / double shot / after tamping adjustment",
    save: "Save", update: "Update", saving: "Saving…", cancel: "Cancel",
    deleteConfirm: "Delete this recipe?",
    mySettings: "My Settings", myMachine: "Coffee Machine", myGrinder: "Grinder",
    myPw: "Change Password", curPw: "Current Password", newPw: "New Password", newPwConfirm: "Confirm New Password",
    changePw: "Change Password", changing: "Changing…", close: "Close", changeBtn: "Edit",
    timerStart: "Start", timerStop: "Stop", timerReset: "Reset", timerApply: "Apply",
    follow: "Subscribe", following: "Subscribed", unfollow: "Unsubscribe", followingFeed: "Following",
    commentPlaceholder: "Leave a comment…", commentSubmit: "Post", commentDelete: "Delete",
    commentLogin: "Sign in to leave a comment", comments: "Comments",
    report: "Report", reportDone: "Report submitted", reportAlready: "Already reported",
    reportReasons: ["Spam", "Hate speech", "Inappropriate content", "Other"],
    bookmarks: "Bookmarks", bookmarkSave: "Saved", bookmarkAdd: "Save recipe", bookmarkRemove: "Remove bookmark",
    allRecipes: "All", myBookmarks: "Bookmarks", myRecipes: "My Recipes", myBeans: "My Beans", myEquip: "My Gear",
    equipVaultSub: "Manage your brewing equipment.",
    equipEmpty: "No equipment yet.", equipEmptySub: "Add your machines and grinders.",
    equipAdd: "Add Equipment", equipEdit: "Edit", equipDelete: "Delete",
    equipName: "Equipment Name *", equipBrand: "Machine Brand *", equipModel: "Model",
    equipGrinder: "Grinder Brand", equipGrinderModel: "Grinder Model",
    equipPurchaseDate: "Purchase Date", equipNote: "Notes",
    equipSetPrimary: "Set as Primary", equipIsPrimary: "Primary",
    equipDeleteConfirm: "Delete this equipment?",
    equipTypeMachine: "Coffee Machine", equipTypeHanddrip: "Hand Drip",
    beanVault: "Bean Vault", beanVaultSub: "Track your current bean inventory.",
    beanAdd: "Add Bean", beanEdit: "Edit Bean", beanDelete: "Delete",
    beanName: "Bean Name *", beanRoastery: "Roastery *",
    beanOrigin: "Origin", beanOriginDetail: "Country · Region · Farm",
    beanOriginType: "Origin Type", beanSingle: "Single Origin", beanBlend: "Blend",
    beanVariety: "Variety", beanVarietyPh: "e.g. Arabica, Geisha, Bourbon",
    beanProcess: "Process", beanProcessPh: "e.g. Washed, Natural, Anaerobic",
    beanRoastLevel: "Roast Level",
    beanLight: "Light", beanMedLight: "Med-Light", beanMedium: "Medium",
    beanMedDark: "Med-Dark", beanDark: "Dark",
    beanRoastDate: "Roast Date", beanBuyDate: "Purchase Date",
    beanPrice: "Price (₩)", beanWeight: "Weight (g)",
    beanNote: "Notes",
    beanStatusLabel: "Status", beanOpen: "In Use", beanSealed: "Sealed", beanEmpty: "Empty",
    beanDeleteConfirm: "Delete this bean?",
    beanDaysOld: "days old", beanFresh: "Fresh", beanPeak: "Peak", beanAging: "Aging", beanStale: "Stale",
    beanEmptyState: "No beans added yet.", beanEmptySub: "Add your current beans to track inventory.",
    beanPricePerG: "₩/g",
    ratingLabels: ["No rating", "Poor", "Fair", "Good", "Great", "Excellent!"],
    roasting: "Roasted", beanUnit: "bean", extractTime: "Time", extractVol: "Yield",
    dilution: "dilution", syrupLabel: "Syrup",
    heartOwner: "Can't like your own recipe",
    heartCancel: "Unlike", heart: "Like",
    statGram: "Dose", statSeconds: "Time", statMl: "Yield",
    beanCount: "beans",
  },
};
