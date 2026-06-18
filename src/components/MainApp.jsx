/* ============================================================
   BREWLOG NOTE — src/components/MainApp.jsx
   피드 + 모든 모달 렌더링 조율 컴포넌트
   ─ PWA 설치 배너
   ─ 헤더 (스크롤 숨김/표시)
   ─ 탭바 (전체/구독/즐겨찾기/내레시피/원두/장비)
   ─ 알림 드롭다운 (onSnapshot 실시간)
   ─ Gemini AI 바리스타 카드
   ─ 베스트 레시피 (오늘/이번주/이번달)
   ─ TOP 100 랭킹 페이지
   ─ 내 레시피 통계 대시보드
   ─ 피드 카드 목록
   ─ 모든 모달 (RecipeModal, RecipeDetailModal, MyModal,
                CompareModal, BeanVault, EquipmentVault,
                BrewerProfileModal)
   ─ 뒤로가기(popstate) → 모달 닫기
   ─ iOS 핀치줌/더블탭 확대 차단
   ─ 수평 스와이프 → 탭 전환
   ============================================================ */
import React, {
  useState, useEffect, useRef, useCallback, useMemo,
} from "react";
import { signOut } from "firebase/auth";
import {
  collection, doc, getDoc, updateDoc,
  query, where, onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../config/firebase";
import { I18N }           from "../constants/localization";
import { COFFEE_MENUS } from "../constants/coffeeMenus";
import { useRecipes }   from "../hooks/useRecipes";
import { loadCurrency } from "../utils/storage";
import RecipeCard         from "./feed/RecipeCard";
import RecipeDetailModal  from "./feed/RecipeDetailModal";
import BrewerProfileModal from "./profile/BrewerProfileModal";
import RecipeModal        from "./modals/RecipeModal";
import MyModal            from "./modals/MyModal";
import CompareModal       from "./modals/CompareModal";
import CollectionModal    from "./modals/CollectionModal";
import { BeanVault, EquipmentVault } from "./vault/BeanVault";
import AdminApp           from "../admin/AdminApp";

// ─────────────────────────────────────────────────────────────────
export default function MainApp({
  user, lang, toggleLang, onRequireAuth, darkMode, toggleDark,
}) {
  const t = I18N[lang];

  // ── useRecipes 훅 ───────────────────────────────────────────────
  const {
    recipes, filtered,
    following, bookmarks, collections,
    isAdmin, notices,
    search, setSearch,
    activeTag, setActiveTag,
    myRecipesOnly, setMyRecipesOnly,
    filterAuthor, setFilterAuthor,
    feedTab, setFeedTab,
    loadRecipes,
    handleLike, handleDelete,
    toggleFollow, toggleBookmark,
    addToCollection, createCollection,
    renameCollection, deleteCollection, updateCollectionColor,
    buildCopyPayload,
  } = useRecipes(user, { onRequireAuth });

  // ── 기타 UI 상태 ────────────────────────────────────────────────
  const [adminMode,      setAdminMode]      = useState(false);
  const [noticeDismissed,setNoticeDismissed]= useState(false);
  const [bestPeriod,     setBestPeriod]     = useState("month");
  const [showRanking,    setShowRanking]    = useState(false);
  const [statModeVal,    setStatModeVal]    = useState("machine");
  const [profileModal,   setProfileModal]   = useState(null); // { uid, name }
  const [beanFilterStatus, setBeanFilterStatus] = useState("all");

  // ── PWA ─────────────────────────────────────────────────────────
  const [pwaPrompt,    setPwaPrompt]    = useState(null);
  const [showPwaBanner,setShowPwaBanner]= useState(false);
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setPwaPrompt(e);
      if (!localStorage.getItem("brewlog_pwa_dismissed")) setShowPwaBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const installPwa = async () => {
    if (!pwaPrompt) return;
    pwaPrompt.prompt();
    const { outcome } = await pwaPrompt.userChoice;
    if (outcome === "accepted") { setPwaPrompt(null); setShowPwaBanner(false); }
  };
  const dismissPwa = () => {
    setShowPwaBanner(false);
    localStorage.setItem("brewlog_pwa_dismissed","1");
  };

  // ── 알림 ─────────────────────────────────────────────────────────
  const [notifications, setNotifications] = useState([]);
  const [showNotif,     setShowNotif]     = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db,"notifications"), where("toUid","==",user.uid));
    const unsub = onSnapshot(q, snap => {
      const list = snap.docs.map(d => ({ id:d.id, ...d.data() }));
      list.sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0));
      setNotifications(list.slice(0,30));
    }, err => console.error("notifications error:", err));
    return unsub;
  }, [user?.uid]);

  useEffect(() => {
    if (!showNotif) return;
    const handler = (e) => {
      if (!e.target.closest(".notif-dropdown") && !e.target.closest(".notif-btn")) setShowNotif(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showNotif]);

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.read);
    await Promise.all(unread.map(n => updateDoc(doc(db,"notifications",n.id), { read:true }).catch(()=>{})));
  };

  // ── 헤더 스크롤 숨김/표시 ────────────────────────────────────────
  const [headerVisible, setHeaderVisible] = useState(true);
  const [topBarHeight,  setTopBarHeight]  = useState(56);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const measure = () => {
      const el = document.getElementById("top-bar");
      if (el) setTopBarHeight(el.offsetHeight);
    };
    measure();
    const t = setTimeout(measure, 100);
    window.addEventListener("resize", measure);
    return () => { clearTimeout(t); window.removeEventListener("resize", measure); };
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const currentY = window.scrollY;
      const diff = currentY - lastScrollY.current;
      if (currentY < 80) setHeaderVisible(true);
      else if (diff > 8)  setHeaderVisible(false);
      else if (diff < -8) setHeaderVisible(true);
      lastScrollY.current = currentY;
    };
    window.addEventListener("scroll", onScroll, { passive:true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ── iOS 핀치줌/더블탭 차단 ──────────────────────────────────────
  useEffect(() => {
    const onTouchMove = (e) => { if (e.touches.length > 1) e.preventDefault(); };
    const preventGesture = (e) => e.preventDefault();
    let lastTap = 0;
    const preventDoubleTap = (e) => {
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const now = Date.now();
      if (now - lastTap < 300) e.preventDefault();
      lastTap = now;
    };
    document.addEventListener("touchmove", onTouchMove, { passive:false });
    document.addEventListener("gesturestart", preventGesture, { passive:false });
    document.addEventListener("gesturechange", preventGesture, { passive:false });
    document.addEventListener("gestureend", preventGesture, { passive:false });
    document.addEventListener("touchend", preventDoubleTap, { passive:false });
    const meta = document.querySelector("meta[name=viewport]");
    if (meta) meta.content = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no";
    return () => {
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("gesturestart", preventGesture);
      document.removeEventListener("gesturechange", preventGesture);
      document.removeEventListener("gestureend", preventGesture);
      document.removeEventListener("touchend", preventDoubleTap);
    };
  }, []);

  // ── 수평 스와이프 탭 전환 ────────────────────────────────────────
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const feedTabRef  = useRef(feedTab);
  const userRef     = useRef(user);
  useEffect(() => { feedTabRef.current = feedTab; }, [feedTab]);
  useEffect(() => { userRef.current = user; }, [user]);

  useEffect(() => {
    const onStart = (e) => {
      if (document.querySelector(".modal-backdrop")) return;
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    };
    const onEnd = (e) => {
      if (touchStartX.current === null) return;
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      const dy = e.changedTouches[0].clientY - touchStartY.current;
      touchStartX.current = null; touchStartY.current = null;
      if (Math.abs(dx) < 40 || Math.abs(dy) >= Math.abs(dx)) return;
      const tabs = userRef.current
        ? ["all","following","bookmarks","mine","beans","equip"]
        : ["all","following","bookmarks"];
      const cur  = tabs.indexOf(feedTabRef.current);
      if (dx < 0) { const next = (cur+1)%tabs.length; setFeedTab(tabs[next]); setMyRecipesOnly(false); setShowRanking(false); }
      else         { const prev = (cur-1+tabs.length)%tabs.length; setFeedTab(tabs[prev]); setMyRecipesOnly(false); setShowRanking(false); }
    };
    document.addEventListener("touchstart", onStart, { passive:true });
    document.addEventListener("touchend", onEnd, { passive:true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchend", onEnd);
    };
  }, [setFeedTab, setMyRecipesOnly]);

  // ── 모달 상태 ────────────────────────────────────────────────────
  const [showModal,    setShowModal]    = useState(false);
  const [editTarget,   setEditTarget]   = useState(null);
  const [showMyModal,  setShowMyModal]  = useState(false);
  const [detailRecipe, setDetailRecipe] = useState(null);
  const [compareTarget,setCompareTarget]= useState(null);
  const [collectionTarget, setCollectionTarget] = useState(null); // recipeId | "manage"
  const collectionTargetRef = useRef(null);
  const [beanShowModal,setBeanShowModal]= useState(false);
  const [equipShowModal,setEquipShowModal]= useState(false);
  const [beanEditTarget,setBeanEditTarget]= useState(null);

  const detailRecipeRef  = useRef(null);
  const showModalRef     = useRef(false);
  const showMyModalRef   = useRef(false);
  const beanShowModalRef = useRef(false);
  const equipShowModalRef= useRef(false);
  const compareTargetRef = useRef(null);
  const pendingDetailRef = useRef(null);

  const setDetailRecipeWrapped = (r)=> { detailRecipeRef.current=r; setDetailRecipe(r); };
  const setShowModalWrapped    = (v)=> { showModalRef.current=v; setShowModal(v); };
  const setShowMyModalWrapped  = (v)=> { showMyModalRef.current=v; setShowMyModal(v); };
  const setCompareTargetState  = (v)=> {
    compareTargetRef.current=v;
    setCompareTarget(v);
    if (v) window.history.pushState({modal:true},"");
  };

  const openModal  = ()  => { window.history.pushState({modal:true},""); setShowModalWrapped(true); };
  const openMyModal= ()  => { window.history.pushState({modal:true},""); setShowMyModalWrapped(true); };
  const openDetail = (r) => { window.history.pushState({modal:true},""); setDetailRecipeWrapped(r); };

  // 뒤로가기 → 모달 닫기
  useEffect(() => {
    // 앱 진입 시 베이스 히스토리 엔트리 1개 확보 (뒤로가기가 앱 밖으로 나가는 것 방지)
    window.history.replaceState({base:true}, "");

    const onPop = (e) => {
      // 열린 모달이 있으면 닫고, 히스토리는 소비된 것으로 처리
      if (compareTargetRef.current)  { setCompareTargetState(null); return; }
      if (detailRecipeRef.current)   { setDetailRecipeWrapped(null); return; }
      if (showModalRef.current) {
        setShowModalWrapped(false); setEditTarget(null);
        if (pendingDetailRef.current) {
          setDetailRecipeWrapped(pendingDetailRef.current);
          pendingDetailRef.current = null;
        }
        return;
      }
      if (showMyModalRef.current)  { setShowMyModalWrapped(false); return; }
      if (beanShowModalRef.current){ setBeanShowModal(false); return; }
      if (equipShowModalRef.current){ setEquipShowModal(false); return; }

      // 모달이 하나도 없는데 popstate가 발생하면 (히스토리 소진)
      // 베이스 엔트리로 되돌려서 앱 밖으로 나가는 것을 방지
      if (e.state?.base) {
        window.history.pushState({base:true}, "");
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // ── 작성자 클릭 → 프로필 모달 ────────────────────────────────────
  const handleAuthorClick = (author) => {
    if (!author?.uid) return;
    setProfileModal(author);
  };

  // ── 레시피 복사 ──────────────────────────────────────────────────
  const handleCopyRecipe = (recipe) => {
    setEditTarget(buildCopyPayload(recipe));
    openModal();
  };

  // ── Gemini AI 추천 ───────────────────────────────────────────────
  const [geminiAdvice,  setGeminiAdvice]  = useState(null);
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [geminiError,   setGeminiError]   = useState(false);
  const geminiCalledRef = useRef(false);

  const fetchGeminiAdvice = useCallback(async () => {
    if (!user) return;
    const GEMINI_KEY = import.meta.env.VITE_GEMINI_KEY;
    if (!GEMINI_KEY) return;
    const storageKey = `brewlog_gemini_${user.uid}`;
    const langKey    = `${storageKey}_${lang}`;
    const today      = new Date().toDateString();
    try {
      const cached = JSON.parse(localStorage.getItem(langKey)||"null");
      if (cached?.fetchedAt === today) { setGeminiAdvice(cached); return; }
    } catch {}
    setGeminiLoading(true); setGeminiError(false);
    try {
      const mine    = recipes.filter(r => r.uid === user.uid);
      const sorted  = [...mine].sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
      const recent  = sorted.slice(0,7);
      const latestR = recent[0] || {};

      const prompt = lang === "ko"
        ? `당신은 전문 바리스타 AI입니다. 아래 유저의 최근 에스프레소 레시피 데이터를 분석하여 오늘의 추출 팁과 추천 레시피를 JSON으로만 응답하세요.
레시피: ${JSON.stringify(recent.slice(0,3).map(r=>({bean:r.bean,gram:r.gram,seconds:r.seconds,espressoMl:r.espressoMl,waterTemp:r.waterTemp,rating:r.rating,note:r.note})))}
응답 형식(JSON only): {"tip":"3문장 이내 추출 팁","recipeTitle":"추천 레시피 이름","recipeDesc":"2문장 설명","gram":"권장 원두량(숫자만)","temp":"권장 물온도(숫자만)","seconds":"권장 추출시간(숫자만)"}`
        : `You are a professional barista AI. Analyze the user's recent espresso recipe data and respond with today's extraction tip and recommended recipe in JSON only.
Recipes: ${JSON.stringify(recent.slice(0,3).map(r=>({bean:r.bean,gram:r.gram,seconds:r.seconds,espressoMl:r.espressoMl,waterTemp:r.waterTemp,rating:r.rating,note:r.note})))}
Response format (JSON only): {"tip":"tip in 3 sentences","recipeTitle":"recommended recipe name","recipeDesc":"2 sentence description","gram":"recommended dose (number only)","temp":"recommended temp (number only)","seconds":"recommended time (number only)"}`;

      // 20초 타임아웃 — 모바일 네트워크 hang 방지
      const controller = new AbortController();
      const timeoutId  = setTimeout(() => controller.abort(), 20000);

      let res;
      try {
        res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_KEY}`,
          { method:"POST",
            headers:{"Content-Type":"application/json"},
            signal: controller.signal,
            body: JSON.stringify({
              contents:[{ parts:[{ text:prompt }] }],
              generationConfig:{
                temperature:0.7,
                maxOutputTokens:2048,
                thinkingConfig:{ thinkingLevel:"minimal" },
              },
            }) }
        );
      } finally {
        clearTimeout(timeoutId);
      }

      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      // parts 중 thought가 아닌 실제 텍스트만 추출
      const parts = data.candidates?.[0]?.content?.parts || [];
      const textPart = parts.find(p => !p.thought && p.text) || parts[0] || {};
      const text = textPart.text || "";
      const clean = text.replace(/```json\s*/g,"").replace(/```/g,"").trim();
      const parsed = JSON.parse(clean);
      const result = { ...parsed, fetchedAt: today };
      localStorage.setItem(langKey, JSON.stringify(result));
      setGeminiAdvice(result);
    } catch (e) {
      console.error("[Gemini]", e.name === "AbortError" ? "타임아웃(20s)" : e);
      setGeminiError(true);
    } finally {
      setGeminiLoading(false);
    }
  }, [user, recipes, lang]);

  useEffect(() => {
    if (!user?.uid || recipes.length === 0) return;
    const mine = recipes.filter(r => r.uid === user.uid);
    if (!mine.length) return;
    const today  = new Date().toDateString();
    const langKey = `brewlog_gemini_${user.uid}_${lang}`;
    try {
      const cached = JSON.parse(localStorage.getItem(langKey)||"null");
      if (cached?.fetchedAt === today) { setGeminiAdvice(cached); return; }
    } catch {}
    if (geminiCalledRef.current === `${today}_${lang}`) return;
    geminiCalledRef.current = `${today}_${lang}`;
    fetchGeminiAdvice();
  }, [user?.uid, recipes.length, lang, fetchGeminiAdvice]);

  // ── 베스트 레시피 계산 ────────────────────────────────────────────
  const bestData = useMemo(() => {
    const now = new Date();
    const startOfDay   = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek  = new Date(startOfDay); startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const sinceMap = { day:startOfDay, week:startOfWeek, month:startOfMonth };
    const since = sinceMap[bestPeriod];
    const list = [...recipes].filter(r => {
      if (!(r.likedBy||[]).length) return false;
      const created = r.createdAt?.toDate?r.createdAt.toDate():new Date(r.createdAt);
      return created && created >= since;
    }).sort((a,b) => (b.likedBy?.length||0)-(a.likedBy?.length||0));
    return { top3:list.slice(0,3), full:list.slice(0,100) };
  }, [recipes, bestPeriod]);

  if (adminMode) return <AdminApp user={user} lang={lang} onExit={() => setAdminMode(false)}/>;

  const PERIODS = [
    { key:"day",   label: lang==="en"?"Today":"오늘" },
    { key:"week",  label: lang==="en"?"This Week":"이번 주" },
    { key:"month", label: lang==="en"?"This Month":"이번 달" },
  ];

  return (
    <>
      {/* 공지사항 배너 */}
      {notices.length > 0 && !noticeDismissed && (
        <div className="notice-banner">
          <span style={{ fontSize:"0.82rem" }}>{notices[0].title} — {notices[0].body}</span>
          <button className="notice-banner-close" onClick={() => setNoticeDismissed(true)}>✕</button>
        </div>
      )}

      {/* PWA 설치 배너 */}
      {showPwaBanner && (
        <div style={{ background:"var(--espresso)", color:"var(--cream)", padding:"10px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:"12px", fontSize:"0.82rem", fontFamily:"'DM Sans',sans-serif" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"8px", minWidth:0 }}>
            <span style={{ flexShrink:0 }}>☕</span>
            <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {lang==="en"?"Install Brewlog Note for quick home screen access.":"홈 화면에 앱처럼 설치하면 더 빠르게 접근할 수 있어요."}
            </span>
          </div>
          <div style={{ display:"flex", gap:"8px", flexShrink:0 }}>
            <button onClick={installPwa} style={{ background:"var(--latte)", color:"var(--cream)", border:"none", borderRadius:"6px", padding:"5px 12px", cursor:"pointer", fontSize:"0.78rem", fontWeight:600, fontFamily:"'DM Sans',sans-serif", whiteSpace:"nowrap" }}>
              {lang==="en"?"Install":"설치"}
            </button>
            <button onClick={dismissPwa} style={{ background:"none", border:"none", color:"var(--muted)", cursor:"pointer", fontSize:"1rem", padding:"0 4px" }}>✕</button>
          </div>
        </div>
      )}

      {/* ── Fixed 상단 바 (헤더 + 탭바) ── */}
      <div id="top-bar" style={{ position:"fixed", top:0, left:0, right:0, zIndex:200, transform:headerVisible?"translateY(0)":"translateY(-100%)", transition:"transform 0.35s cubic-bezier(0.4,0,0.2,1)", background:"var(--cream)", boxShadow:"0 1px 0 var(--divider)" }}>
        <header className="app-header" style={{ transform:"none", transition:"none" }}>
          <div className="app-header-inner">
            <div className="logo">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="9" cy="9" r="8" stroke="var(--espresso)" strokeWidth="1.5"/>
                <path d="M5 9.5c1-2 3-3 4-2s3 3 4 1" stroke="var(--latte)" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Brewlog note
            </div>
            <div className="header-right">
              {user ? (
                <>
                  <span className={`nick-badge ${myRecipesOnly?"active":""}`}
                    onClick={() => setMyRecipesOnly(v => !v)}
                    title={myRecipesOnly?"전체 피드 보기":"내 레시피만 보기"}>
                    @{user?.displayName}{myRecipesOnly?" ·":""}
                  </span>
                  {isAdmin && <button className="btn-admin-header" onClick={() => setAdminMode(true)}>관리자</button>}
                  {/* 다크모드 */}
                  <button onClick={toggleDark}
                    style={{ background:"none", border:"1px solid var(--steam)", borderRadius:"var(--r-btn)", width:"32px", height:"32px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--muted)", transition:"border-color var(--transition-base), color var(--transition-base)", flexShrink:0 }}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--espresso)";e.currentTarget.style.color="var(--espresso)";}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--steam)";e.currentTarget.style.color="var(--muted)";}}>
                    {darkMode
                      ? <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="4" stroke="currentColor" strokeWidth="1.4"/><path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M11.89 3.05l-1.06 1.06M4.11 11.89l-1.06 1.06" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                      : <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M13.5 10.5A6 6 0 0 1 5.5 2.5a6 6 0 1 0 8 8z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>}
                  </button>
                  <button className="btn-lang" onClick={toggleLang}>{lang==="ko"?"EN":"KO"}</button>
                  <button className="btn-my" onClick={() => openMyModal()}>MY</button>
                  {/* 알림 */}
                  <div style={{ position:"relative", flexShrink:0 }}>
                    <button className="notif-btn" onClick={() => setShowNotif(v => !v)}>
                      <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M9 2C6.24 2 4 4.24 4 7v4l-1.5 2h13L14 11V7C14 4.24 11.76 2 9 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M7.5 15.5C7.5 16.33 8.17 17 9 17s1.5-.67 1.5-1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                      {unreadCount>0 && <span className="notif-badge">{unreadCount>9?"9+":unreadCount}</span>}
                    </button>
                    {showNotif && (
                      <div className="notif-dropdown">
                        <div className="notif-header">
                          <span>
                            {lang==="en"?"Notifications":"알림"}
                            {unreadCount>0 && <span style={{ marginLeft:"6px", fontSize:"0.68rem", fontWeight:400, color:"var(--latte)" }}>{lang==="en"?`${unreadCount} unread`:`${unreadCount}개 안읽음`}</span>}
                          </span>
                          <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
                            {unreadCount>0 && <button onClick={markAllRead} style={{ background:"none", border:"none", cursor:"pointer", fontSize:"0.7rem", color:"var(--muted)", fontFamily:"'DM Sans',sans-serif", padding:0 }}>{lang==="en"?"Mark all read":"전체 읽음"}</button>}
                            <button onClick={()=>setShowNotif(false)} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--muted)", padding:"2px", display:"flex", alignItems:"center" }}>
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                            </button>
                          </div>
                        </div>
                        <div className="notif-list">
                          {notifications.length===0
                            ? <div className="notif-empty">{lang==="en"?"No notifications":"알림이 없어요"}</div>
                            : notifications.map(n => (
                            <div key={n.id} className={`notif-item ${n.read?"":"unread"}`}
                              onClick={async()=>{
                                setShowNotif(false);
                                if (!n.read) await updateDoc(doc(db,"notifications",n.id),{read:true}).catch(()=>{});
                                if (n.recipeId) {
                                  const snap = await getDoc(doc(db,"recipes",n.recipeId)).catch(()=>null);
                                  if (snap?.exists()) setDetailRecipeWrapped({ id:snap.id, ...snap.data() });
                                } else if (n.type==="newRecipe") { setFeedTab("all"); setSearch(n.fromUser||""); }
                              }}>
                              <div className="notif-item-text">
                                {n.type==="comment"
                                  ? (lang==="en"?`${n.fromUser} commented on "${n.beanName}"`:`${n.fromUser}님이 "${n.beanName}" 레시피에 댓글을 남겼어요`)
                                  : (lang==="en"?`${n.fromUser} posted a new recipe: "${n.beanName}"`:`구독 중인 ${n.fromUser}님이 "${n.beanName}" 레시피를 올렸어요`)}
                              </div>
                              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                                <div className="notif-item-time">{n.createdAt?.toDate?.()?.toLocaleDateString(lang==="ko"?"ko-KR":"en-US")||""}</div>
                                {!n.read && <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:"var(--latte)", flexShrink:0 }}/>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <button className="btn-lang" onClick={toggleLang}>{lang==="ko"?"EN":"KO"}</button>
                  <button className="btn-my" onClick={() => onRequireAuth?.()} style={{ color:"var(--accent)", borderColor:"var(--accent)" }}>
                    {lang==="en"?"Login":"로그인"}
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        {/* 탭바 */}
        <div style={{ background:"var(--cream)", borderBottom:"1px solid var(--divider)", padding:"14px 24px 14px" }}>
          <div style={{ maxWidth:"900px", margin:"0 auto", display:"flex", flexDirection:"column", gap:"6px" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:"8px", flexWrap:"wrap" }}>
              <div style={{ display:"flex", gap:"4px", flexShrink:0 }}>
                {[["all",t.allRecipes],["following",`${t.followingFeed}${following.length>0?` (${following.length})`:""}`],["bookmarks",`${t.myBookmarks}${Object.keys(collections).length>0?` (${Object.keys(collections).length})`:""}`]].map(([v,lbl])=>(
                  <button key={v} className={`bookmark-tab-btn ${feedTab===v&&!showRanking?"active":""}`}
                    onClick={()=>{ setFeedTab(v); setMyRecipesOnly(false); setFilterAuthor(null); setShowRanking(false); }}>
                    {lbl}
                  </button>
                ))}
              </div>
              {user && <div style={{ width:"1px", height:"20px", background:"var(--divider)", flexShrink:0 }}/>}
              {user && (
                <div style={{ display:"flex", gap:"4px", overflowX:"auto", WebkitOverflowScrolling:"touch", scrollbarWidth:"none", flexShrink:1 }}>
                  {[["mine",t.myRecipes],["beans",t.myBeans],["equip",t.myEquip]].map(([v,lbl])=>(
                    <button key={v} className={`bookmark-tab-btn ${feedTab===v&&!showRanking?"active":""}`}
                      onClick={()=>{ setFeedTab(v); setMyRecipesOnly(false); setFilterAuthor(null); setShowRanking(false); }}>
                      {lbl}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 두 번째 행: 검색/필터/추가 */}
            <div style={{ borderTop:"1px solid var(--divider)", marginTop:"10px", paddingTop:"10px", maxWidth:"900px", margin:"10px auto 0" }}>
              {feedTab==="beans" ? (
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:"8px" }}>
                  <div style={{ display:"flex", gap:"5px", flexWrap:"nowrap", overflowX:"auto", WebkitOverflowScrolling:"touch", scrollbarWidth:"none" }}>
                    {[["all",lang==="en"?"All":"전체"],["open",t.beanOpen],["sealed",t.beanSealed]].map(([v,lbl])=>(
                      <button key={v} onClick={()=>setBeanFilterStatus(v)}
                        style={{ padding:"5px 12px", border:"1px solid", borderRadius:"20px", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontSize:"0.72rem", whiteSpace:"nowrap", flexShrink:0, transition:"all 0.15s", lineHeight:1,
                          borderColor: beanFilterStatus===v?"var(--espresso)":"var(--steam)",
                          background:  beanFilterStatus===v?"var(--espresso)":"transparent",
                          color:       beanFilterStatus===v?"var(--cream)":"var(--muted)",
                          fontWeight:  beanFilterStatus===v?600:400 }}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                  <button className="btn-new" style={{ flexShrink:0 }} onClick={()=>{ setBeanEditTarget(null); setBeanShowModal(true); }}>
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                    {lang==="en"?"Add Bean":"추가하기"}
                  </button>
                </div>
              ) : feedTab==="equip" ? (
                <div style={{ display:"flex", justifyContent:"flex-end" }}>
                  <button className="btn-new" onClick={()=>setEquipShowModal(true)}>
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                    {lang==="en"?"Add Gear":"추가하기"}
                  </button>
                </div>
              ) : (
                <div className="search-row" style={{ display:"flex", gap:"0.5rem", width:"100%", boxSizing:"border-box", overflow:"hidden" }}>
                  <div className="search-box" style={{ flex:1, minWidth:0 }}>
                    <span className="search-icon">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5"/><path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    </span>
                    <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t.searchPlaceholder}/>
                  </div>
                  <button className="btn-new" style={{ flexShrink:0 }} onClick={()=>{ if(!user&&onRequireAuth){ onRequireAuth(); } else { openModal(); } }}>
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M9.5 1.5l3 3-7 7H2.5v-3l7-7z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M7.5 3.5l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                    <span className="btn-new-text">{t.newRecipe}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── 타이틀 + 베스트 ── */}
      <div className="main-wrap" style={{ paddingTop:`${topBarHeight+8}px` }}>
        {/* 타이틀 */}
        {(() => {
          let title, sub;
          if (filterAuthor) { title=`@${filterAuthor.name}`; sub=lang==="en"?`Recipes by @${filterAuthor.name}`:`@${filterAuthor.name}의 레시피`; }
          else if (myRecipesOnly||feedTab==="mine") { title=t.myFeedTitle; sub=t.myFeedSub; }
          else if (feedTab==="following") { title=t.followingFeedTitle; sub=t.followingFeedSub; }
          else if (feedTab==="bookmarks") { title=t.bookmarksFeedTitle; sub=t.bookmarksFeedSub; }
          else if (feedTab==="beans")     { title=t.beanVault; sub=t.beanVaultSub; }
          else if (feedTab==="equip")     { title=t.myEquip; sub=t.equipVaultSub; }
          else { title=t.feedTitle; sub=t.feedSub; }
          return <><div className="section-title">{title}</div><div className="section-sub">{sub}</div></>;
        })()}

        {/* 작성자 필터 배지 */}
        {filterAuthor && (
          <div style={{ display:"flex", alignItems:"center", gap:"8px", margin:"8px 0 12px" }}>
            <div style={{ display:"inline-flex", alignItems:"center", gap:"6px", padding:"5px 10px 5px 12px", background:"var(--espresso)", color:"var(--cream)", borderRadius:"20px", fontSize:"0.78rem", fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>
              @{filterAuthor.name}
              <button onClick={()=>setFilterAuthor(null)} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--cream)", opacity:0.7, padding:"0 0 0 2px", lineHeight:1, fontSize:"1rem", display:"flex", alignItems:"center" }}>×</button>
            </div>
            <span style={{ fontSize:"0.72rem", color:"var(--muted)", fontFamily:"'DM Sans',sans-serif" }}>{filtered.length}{lang==="en"?" recipes":"개"}</span>
          </div>
        )}

        {/* 태그 필터 배지 */}
        {activeTag && (
          <div style={{ display:"flex", alignItems:"center", gap:"8px", margin:"8px 0 12px" }}>
            <div style={{ display:"inline-flex", alignItems:"center", gap:"6px", padding:"5px 10px 5px 12px", background:"var(--latte)", color:"var(--cream)", borderRadius:"20px", fontSize:"0.78rem", fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>
              #{activeTag}
              <button onClick={()=>setActiveTag(null)} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--cream)", opacity:0.7, padding:"0 0 0 2px", lineHeight:1, fontSize:"1rem", display:"flex", alignItems:"center" }}>×</button>
            </div>
            <span style={{ fontSize:"0.72rem", color:"var(--muted)", fontFamily:"'DM Sans',sans-serif" }}>{filtered.length}{lang==="en"?" recipes":"개"}</span>
          </div>
        )}

        <div className="divider" style={{ marginBottom:"1.5rem" }}/>

        {/* Gemini AI 카드 */}
        {feedTab==="all" && !myRecipesOnly && !showRanking && !filterAuthor && user && (() => {
          if (geminiLoading) return (
            <div style={{ background:"linear-gradient(135deg,#1A1A1A 0%,#2C1A0E 100%)", borderRadius:14, padding:"18px 16px", marginBottom:16, position:"relative", overflow:"hidden" }}>
              <div style={{ width:"90%", height:10, borderRadius:6, background:"rgba(255,255,255,0.08)", marginBottom:8 }}/>
              <div style={{ width:"75%", height:10, borderRadius:6, background:"rgba(255,255,255,0.06)", marginBottom:16 }}/>
              <div style={{ display:"flex", gap:8 }}>
                {[1,2,3].map(i=><div key={i} style={{ flex:1, height:48, borderRadius:10, background:"rgba(255,255,255,0.07)" }}/>)}
              </div>
            </div>
          );
          if (geminiError) return (
            <div style={{ background:"var(--espresso)", borderRadius:14, padding:"16px 18px", marginBottom:16, display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.75rem", color:"rgba(255,255,255,0.65)" }}>
                {lang==="ko"?"레시피를 분석 중입니다. 잠시 후 다시 시도해 주세요.":"Analyzing your recipes. Please retry in a moment."}
              </div>
              <button onClick={()=>{ geminiCalledRef.current=false; setGeminiError(false); fetchGeminiAdvice(); }}
                style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.72rem", color:"var(--latte)", background:"rgba(176,125,84,0.15)", border:"1px solid rgba(176,125,84,0.3)", borderRadius:8, padding:"6px 12px", cursor:"pointer", fontWeight:600, flexShrink:0 }}>
                {lang==="ko"?"다시 시도":"Retry"}
              </button>
            </div>
          );
          if (!geminiAdvice) return null;
          return (
            <div style={{ background:"linear-gradient(135deg,#1A1A1A 0%,#2C1A0E 100%)", borderRadius:14, padding:"18px 16px", marginBottom:16, position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", right:-20, top:-20, width:90, height:90, borderRadius:"50%", background:"rgba(176,125,84,0.15)", pointerEvents:"none" }}/>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                  <div style={{ width:22, height:22, borderRadius:"50%", background:"var(--latte)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="white"/></svg>
                  </div>
                  <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.65rem", fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:"var(--latte)" }}>
                    {lang==="ko"?"AI 바리스타 · 오늘의 추천":"AI Barista · Today's Pick"}
                  </span>
                </div>
                <button onClick={()=>{ geminiCalledRef.current=false; setGeminiAdvice(null); fetchGeminiAdvice(); }}
                  style={{ background:"rgba(255,255,255,0.08)", border:"none", borderRadius:8, padding:"4px 8px", cursor:"pointer", color:"rgba(255,255,255,0.5)", fontFamily:"'DM Sans',sans-serif", fontSize:"0.65rem", display:"flex", alignItems:"center", gap:4 }}>
                  {lang==="ko"?"새로고침":"Refresh"}
                </button>
              </div>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.8rem", color:"rgba(255,255,255,0.82)", lineHeight:1.6, marginBottom:14 }}>{geminiAdvice.tip}</div>
              <div style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(176,125,84,0.25)", borderRadius:10, padding:"12px 14px", marginBottom:12 }}>
                <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.6rem", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"rgba(176,125,84,0.9)", marginBottom:5 }}>
                  {lang==="ko"?"오늘 시도해볼 레시피":"Recipe to Try Today"}
                </div>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"0.92rem", fontWeight:700, color:"#fff", marginBottom:5 }}>{geminiAdvice.recipeTitle}</div>
                <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.75rem", color:"rgba(255,255,255,0.6)", lineHeight:1.5 }}>{geminiAdvice.recipeDesc}</div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
                {[
                  { label:lang==="ko"?"원두량":"Dose",    value:geminiAdvice.gram,    unit:"g" },
                  { label:lang==="ko"?"물 온도":"Temp",   value:geminiAdvice.temp,    unit:"°C" },
                  { label:lang==="ko"?"추출 시간":"Time", value:geminiAdvice.seconds, unit:"s" },
                ].map(({label,value,unit})=>(
                  <div key={label} style={{ background:"rgba(255,255,255,0.07)", borderRadius:10, padding:"10px 8px", textAlign:"center" }}>
                    <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.6rem", color:"rgba(255,255,255,0.4)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>{label}</div>
                    <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.1rem", fontWeight:700, color:"var(--latte)", lineHeight:1 }}>{value}</div>
                    <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.65rem", color:"rgba(255,255,255,0.35)", marginTop:2 }}>{unit}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Bean Vault / Equipment Vault */}
        {feedTab==="beans" && user && (
          <BeanVault user={user} lang={lang}
            filterStatus={beanFilterStatus} setFilterStatus={setBeanFilterStatus}
            showModal={beanShowModal} setShowModal={(v)=>{ beanShowModalRef.current=v; if(v) window.history.pushState({modal:true},""); setBeanShowModal(v); }}
            editTarget={beanEditTarget} setEditTarget={setBeanEditTarget}
            currency={loadCurrency()}/>
        )}
        {feedTab==="equip" && user && (
          <EquipmentVault user={user} lang={lang} showModal={equipShowModal}
            setShowModal={(v)=>{ equipShowModalRef.current=v; if(v) window.history.pushState({modal:true},""); setEquipShowModal(v); }}/>
        )}

        {/* 베스트 레시피 (전체 피드만) */}
        {feedTab==="all" && !myRecipesOnly && !showRanking && (
          <div className="best-section">
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"16px", flexWrap:"wrap", gap:"8px" }}>
              <div className="best-title" style={{ margin:0 }}>{t.bestTitle}</div>
              <div style={{ display:"flex", gap:"4px" }}>
                {PERIODS.map(p=>(
                  <button key={p.key} onClick={()=>setBestPeriod(p.key)}
                    style={{ padding:"0 12px", height:"28px", borderRadius:"8px", border:"1px solid var(--steam)", fontFamily:"'DM Sans',sans-serif", fontSize:"0.72rem", cursor:"pointer", transition:"all 0.2s",
                      background: bestPeriod===p.key?"var(--espresso)":"var(--foam)",
                      color:      bestPeriod===p.key?"var(--cream)":"var(--muted)",
                      fontWeight: bestPeriod===p.key?600:400 }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            {bestData.top3.length>0 ? (
              <div style={{ background:"var(--foam)", border:"1px solid var(--divider)", borderRadius:"8px", overflow:"hidden", marginBottom:"8px" }}>
                {bestData.top3.map((r,i)=>(
                  <div key={r.id} className="best-row" onClick={()=>openDetail(r)}>
                    <div className={`best-rank-num rank-${i+1}`}>{String(i+1).padStart(2,"0")}</div>
                    <div className="best-row-content">
                      <div className="best-row-bean">{r.bean}</div>
                      <div className="best-row-meta">
                        <span>@{r.author}</span>
                        {r.machine && <><span style={{ opacity:0.4 }}>·</span><span>{r.machine}</span></>}
                        {r.menuLabel && <><span style={{ opacity:0.4 }}>·</span><span>{lang==="en"?(COFFEE_MENUS.find(m=>m.id===r.menuId)?.labelEn||r.menuLabel):r.menuLabel}</span></>}
                      </div>
                    </div>
                    <div className="best-row-right">
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 13.5C8 13.5 2 9.5 2 5.5C2 3.567 3.567 2 5.5 2C6.612 2 7.595 2.518 8 3.354C8.405 2.518 9.388 2 10.5 2C12.433 2 14 3.567 14 5.5C14 9.5 8 13.5 8 13.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>
                      <span>{(r.likedBy||[]).length}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize:"0.78rem", color:"var(--muted)", padding:"8px 0", marginBottom:"8px" }}>{lang==="en"?"No recipes yet.":"이 기간에 레시피가 없어요."}</p>
            )}
            {bestData.top3.length>0 && (
              <div style={{ textAlign:"right" }}>
                <button onClick={()=>setShowRanking(true)} style={{ background:"none", border:"none", fontFamily:"'DM Sans',sans-serif", fontSize:"0.72rem", color:"var(--muted)", cursor:"pointer" }}>
                  {lang==="en"?"View all →":"전체 보기 →"}
                </button>
              </div>
            )}
            <div className="divider" style={{ marginTop:"12px", marginBottom:0 }}/>
          </div>
        )}
      </div>

      {/* 랭킹 페이지 */}
      {showRanking && (
        <div className="main-wrap" style={{ paddingTop:`${topBarHeight+8}px` }}>
          <div style={{ display:"flex", alignItems:"center", gap:"0.8rem", marginBottom:"1.2rem" }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.2rem", color:"var(--espresso)", fontWeight:700 }}>
              {PERIODS.find(p=>p.key===bestPeriod)?.label} {lang==="en"?"Best":"베스트"}
            </div>
            <div style={{ marginLeft:"auto", fontSize:"0.75rem", color:"var(--muted)" }}>{bestData.full.length}{lang==="en"?" recipes":"개"}</div>
          </div>
          {bestData.full.length===0 ? (
            <p style={{ color:"var(--muted)", textAlign:"center", padding:"3rem 0", fontSize:"0.88rem" }}>
              {lang==="en"?"No recipes for this period yet.":"이 기간에 레시피가 없어요."}
            </p>
          ) : (
            <div style={{ borderRadius:"8px", border:"1px solid var(--steam)", overflow:"hidden", background:"var(--foam)" }}>
              {bestData.full.map((r,i)=>(
                <div key={r.id} onClick={()=>openDetail(r)}
                  style={{ display:"flex", alignItems:"center", gap:"0.9rem", padding:"0.8rem 1rem", borderBottom:i<bestData.full.length-1?"1px solid var(--steam)":"none", cursor:"pointer", transition:"background 0.15s" }}
                  onMouseEnter={e=>e.currentTarget.style.background="var(--cream)"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <div style={{ minWidth:"2.5rem", textAlign:"right", fontFamily:"'DM Sans',sans-serif", fontWeight:600, fontSize:"0.88rem", letterSpacing:"-0.02em", color:i===0?"var(--espresso)":i<3?"var(--latte)":"var(--muted)" }}>
                    {String(i+1).padStart(2,"0")}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1rem", fontWeight:600, color:"var(--espresso)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{r.bean}</div>
                    <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.72rem", color:"var(--muted)", display:"flex", gap:"0.35rem", alignItems:"center", marginTop:"0.15rem", flexWrap:"wrap" }}>
                      {r.company&&<span>{r.company}</span>}
                      {r.machine&&<><span>·</span><span>{r.machine}</span></>}
                      <span>·</span><span style={{ color:"var(--roast)", fontWeight:500 }}>@{r.author}</span>
                    </div>
                  </div>
                  <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.82rem", color:"var(--muted)", fontWeight:500, display:"flex", alignItems:"center", gap:"4px", flexShrink:0 }}>
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 13.5C8 13.5 2 9.5 2 5.5C2 3.567 3.567 2 5.5 2C6.612 2 7.595 2.518 8 3.354C8.405 2.518 9.388 2 10.5 2C12.433 2 14 3.567 14 5.5C14 9.5 8 13.5 8 13.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>
                    {(r.likedBy||[]).length}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 피드 카드 목록 */}
      {!showRanking && feedTab!=="beans" && feedTab!=="equip" && (
        <div className="main-wrap" style={{ paddingTop:"0" }}>
          {feedTab==="mine" && (
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1rem", fontWeight:700, color:"var(--espresso)", marginBottom:"1rem", display:"flex", alignItems:"center", gap:"0.5rem" }}>
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none" style={{ color:"var(--latte)", flexShrink:0 }}><rect x="3" y="2" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M6 6h6M6 9h6M6 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              {lang==="en"?"My Recipes":"내 레시피"}
            </div>
          )}

          {/* 즐겨찾기 탭 — 폴더 그리드 */}
          {feedTab==="bookmarks" && (
            <div style={{ marginBottom:"20px" }}>
              {/* 폴더 그리드 */}
              {Object.keys(collections).length > 0 && (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginBottom:"20px" }}>
                  {Object.entries(collections).map(([name, folder]) => {
                    const isActive = activeTag === `__folder__${name}`;
                    return (
                      <button key={name} type="button"
                        onClick={() => setActiveTag(isActive ? null : `__folder__${name}`)}
                        style={{
                          display:"flex", alignItems:"center", gap:"10px", padding:"12px 14px",
                          background: isActive ? "var(--espresso)" : "var(--foam)",
                          borderTop:`1px solid ${isActive ? "var(--espresso)" : "var(--divider)"}`,
                          borderRight:`1px solid ${isActive ? "var(--espresso)" : "var(--divider)"}`,
                          borderBottom:`1px solid ${isActive ? "var(--espresso)" : "var(--divider)"}`,
                          borderLeft:`4px solid ${folder.color || "#B07D54"}`,
                          borderRadius:"10px", cursor:"pointer", textAlign:"left",
                          transition:"all 0.15s",
                        }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.85rem", fontWeight:600, color: isActive?"var(--cream)":"var(--espresso)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                            {name === "_default" ? (lang==="en"?"Default":"기본 즐겨찾기") : name}
                          </div>
                          <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.72rem", color: isActive?"rgba(255,255,255,0.6)":"var(--muted)" }}>
                            {(folder.ids||[]).length}{lang==="en"?" recipes":"개"}
                          </div>
                        </div>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink:0, color: isActive?"var(--cream)":"var(--muted)" }}>
                          <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    );
                  })}
                </div>
              )}
              {/* 폴더 관리 + 전체 표시 행 */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"12px" }}>
                {activeTag?.startsWith("__folder__") && (
                  <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                    <div style={{ width:"8px", height:"8px", borderRadius:"50%", background: collections[activeTag.replace("__folder__","")]?.color||"#B07D54", flexShrink:0 }}/>
                    <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.78rem", fontWeight:600, color:"var(--espresso)" }}>
                      {activeTag.replace("__folder__","") === "_default" ? (lang==="en"?"Default":"기본 즐겨찾기") : activeTag.replace("__folder__","")}
                    </span>
                    <button onClick={()=>setActiveTag(null)}
                      style={{ background:"none", border:"none", cursor:"pointer", color:"var(--muted)", fontSize:"0.9rem", padding:0, lineHeight:1 }}>×</button>
                  </div>
                )}
                <button
                  onClick={()=>{ setCollectionTarget("manage"); window.history.pushState({modal:true},""); }}
                  style={{ marginLeft:"auto", background:"none", border:"1px solid var(--steam)", borderRadius:"8px", padding:"5px 12px", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontSize:"0.72rem", color:"var(--muted)", display:"flex", alignItems:"center", gap:"5px", transition:"border-color 0.15s, color 0.15s" }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--latte)";e.currentTarget.style.color="var(--latte)";}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--steam)";e.currentTarget.style.color="var(--muted)";}}>
                  <svg width="11" height="11" viewBox="0 0 14 14" fill="none"><path d="M1 4h12M1 8h8M1 12h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                  {lang==="en"?"Manage folders":"폴더 관리"}
                </button>
              </div>
            </div>
          )}
          <div className="recipes-grid">
            {filtered.length===0 ? (
              <div className="empty-state">
                <svg className="empty-state-icon" viewBox="0 0 56 56" fill="none"><ellipse cx="28" cy="34" rx="14" ry="4" stroke="currentColor" strokeWidth="2"/><path d="M14 34c0-8 5-16 14-18 9 2 14 10 14 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                <div className="empty-state-title">{lang==="en"?"No recipes yet":"아직 레시피가 없어요"}</div>
                <div className="empty-state-sub">{lang==="en"?"Be the first to share your brew.":"첫 번째로 레시피를 공유해보세요."}</div>
              </div>
            ) : filtered.map(rec=>(
              <RecipeCard key={rec.id} recipe={rec} currentUid={user?.uid} lang={lang}
                onDelete={handleDelete}
                onLike={handleLike}
                onBookmark={(id)=>{ setCollectionTarget(id); window.history.pushState({modal:true},""); }}
                isBookmarked={bookmarks.includes(rec.id)}
                onFollow={toggleFollow}
                isFollowing={following.includes(rec.uid)||following.includes(rec.author)}
                onEdit={()=>{ setEditTarget(rec); openModal(); }}
                onCardClick={()=>openDetail(rec)}
                onCompare={user?.uid?()=>setCompareTargetState(rec):null}
                onCopy={user?.uid?()=>handleCopyRecipe(rec):null}
                onAuthorClick={a=>handleAuthorClick(a)}
                onTagClick={tag=>setActiveTag(prev=>prev===tag?null:tag)}
                activeTag={activeTag}/>
            ))}
          </div>
        </div>
      )}

      {/* ── 모달들 ── */}
      {showMyModal && (
        <MyModal user={user} lang={lang} onClose={()=>{ window.history.go(-1); setShowMyModalWrapped(false); }} onLogout={()=>{ setShowMyModalWrapped(false); signOut(auth); }}/>
      )}
      {compareTarget && (
        <CompareModal targetRecipe={compareTarget} myRecipes={recipes.filter(r=>r.id!==compareTarget.id)} onClose={()=>{ window.history.go(-1); setCompareTargetState(null); }} lang={lang}/>
      )}
      {detailRecipe && (
        <RecipeDetailModal
          recipe={detailRecipe}
          currentUid={user?.uid}
          currentUser={user}
          onRequireAuth={onRequireAuth}
          lang={lang}
          onClose={()=>{ window.history.go(-1); setDetailRecipeWrapped(null); }}
          onLike={r=>{ handleLike(r); }}
          onEdit={r=>{ setEditTarget(r); openModal(); setDetailRecipeWrapped(null); }}
          onDelete={id=>{ handleDelete(id); setDetailRecipeWrapped(null); }}
          onFollow={toggleFollow}
          isFollowing={detailRecipe&&(following.includes(detailRecipe.uid)||following.includes(detailRecipe.author))}
          onBookmark={(id)=>{ setCollectionTarget(id); window.history.pushState({modal:true},""); }}
          isBookmarked={detailRecipe&&bookmarks.includes(detailRecipe.id)}
          onCompare={user?.uid?(r)=>setCompareTargetState(r):null}
          onCopyRecipe={user?.uid?(r)=>{ pendingDetailRef.current=detailRecipeRef.current; setDetailRecipeWrapped(null); handleCopyRecipe(r); }:null}
          onAuthorClick={a=>{ setDetailRecipeWrapped(null); handleAuthorClick(a); }}
          onTagClick={tag=>setActiveTag(prev=>prev===tag?null:tag)}
          activeTag={activeTag}
        />
      )}
      {collectionTarget && (
        <CollectionModal
          recipeId={collectionTarget === "manage" ? null : collectionTarget}
          collections={collections}
          onAddToCollection={addToCollection}
          onCreateCollection={createCollection}
          onRenameCollection={renameCollection}
          onDeleteCollection={deleteCollection}
          onUpdateColor={updateCollectionColor}
          lang={lang}
          onClose={()=>{ window.history.go(-1); setCollectionTarget(null); }}
        />
      )}
      {showModal && (
        <RecipeModal user={user} editTarget={editTarget} lang={lang} recipes={recipes.filter(r=>r.uid===user?.uid).slice(0,5)}
          onClose={()=>{ window.history.go(-1); setShowModalWrapped(false); setEditTarget(null); }}
          onSave={()=>{ loadRecipes(); setShowModalWrapped(false); setEditTarget(null); }}/>
      )}
      {profileModal && (
        <BrewerProfileModal
          uid={profileModal.uid}
          name={profileModal.name}
          currentUid={user?.uid}
          allRecipes={recipes}
          lang={lang}
          isFollowing={following.includes(profileModal.uid)}
          onFollow={()=>toggleFollow(profileModal.uid)}
          onClose={()=>setProfileModal(null)}
          onFilterRecipes={()=>{ setFilterAuthor(profileModal); setFeedTab("all"); setProfileModal(null); }}
        />
      )}
    </>
  );
}
