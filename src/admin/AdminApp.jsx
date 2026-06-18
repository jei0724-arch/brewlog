/* ============================================================
   BREWLOG NOTE — src/admin/AdminApp.jsx
   관리자 콘솔 — 6개 탭
   ─ 통계  : 총 회원·레시피·공지 + 최근 레시피 목록
   ─ 신고  : 신고 목록 + 공개유지/비공개/삭제 처리
   ─ 회원  : 검색·필터·정렬 + 정지/복구/삭제
   ─ 레시피: 목록 + 삭제
   ─ 공지  : 작성/수정/삭제 (mainApp 상단 배너)
   ─ 브랜드: 머신·그라인더 브랜드 Firestore 동기 관리
   ============================================================ */
import { useState, useEffect, useCallback } from "react";
import {
  collection, doc,
  getDoc, getDocs, addDoc, updateDoc, deleteDoc, setDoc,
  query, orderBy, serverTimestamp,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "../config/firebase";
import { I18N } from "../constants/localization";
import { MACHINE_BRANDS, GRINDER_BRANDS } from "../utils/storage";

// ─────────────────────────────────────────────────────────────────
export default function AdminApp({ user, onExit, lang = "ko" }) {
  const [tab, setTab] = useState("stats");

  // ── 데이터 ───────────────────────────────────────────────────────
  const [users,   setUsers]   = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [notices, setNotices] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);

  // ── 회원 관리 필터 ────────────────────────────────────────────────
  const [userSearch,       setUserSearch]       = useState("");
  const [userStatusFilter, setUserStatusFilter] = useState("all");
  const [userJoinFrom,     setUserJoinFrom]     = useState("");
  const [userJoinTo,       setUserJoinTo]       = useState("");
  const [userSortBy,       setUserSortBy]       = useState("joinDesc");

  // ── 공지사항 폼 ───────────────────────────────────────────────────
  const [noticeTitle,  setNoticeTitle]  = useState("");
  const [noticeBody,   setNoticeBody]   = useState("");
  const [noticeSaving, setNoticeSaving] = useState(false);
  const [editNoticeId, setEditNoticeId] = useState(null);

  // ── 브랜드 관리 ───────────────────────────────────────────────────
  const [machineBrandList, setMachineBrandList] = useState(
    MACHINE_BRANDS.filter(b => b !== "기타 (직접 입력)")
  );
  const [grinderBrandList, setGrinderBrandList] = useState(
    GRINDER_BRANDS.filter(b => b !== "기타 (직접 입력)")
  );
  const [newMachineBrand, setNewMachineBrand] = useState("");
  const [newGrinderBrand, setNewGrinderBrand] = useState("");
  const [brandSaving,     setBrandSaving]     = useState(false);
  const [brandMsg,        setBrandMsg]        = useState(null);

  // ── 전체 로드 ─────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.allSettled([
      getDocs(collection(db, "users"))
        .then(snap => setUsers(snap.docs.map(d => ({ id:d.id, ...d.data() })).filter(u => u.nickname)))
        .catch(e => console.error("users:", e.message)),
      getDocs(query(collection(db, "recipes"), orderBy("createdAt", "desc")))
        .then(snap => setRecipes(snap.docs.map(d => ({ id:d.id, ...d.data() }))))
        .catch(e => console.error("recipes:", e.message)),
      getDocs(query(collection(db, "notices"), orderBy("createdAt", "desc")))
        .then(snap => setNotices(snap.docs.map(d => ({ id:d.id, ...d.data() }))))
        .catch(e => console.error("notices:", e.message)),
      getDoc(doc(db, "settings", "brands"))
        .then(snap => {
          if (snap.exists()) {
            const d = snap.data();
            if (d.machineBrands?.length) setMachineBrandList(d.machineBrands);
            if (d.grinderBrands?.length) setGrinderBrandList(d.grinderBrands);
          }
        })
        .catch(e => console.error("brands:", e.message)),
    ]);
    setLoading(false);
  }, []);

  const loadNotices = useCallback(async () => {
    try {
      const snap = await getDocs(query(collection(db, "notices"), orderBy("createdAt", "desc")));
      setNotices(snap.docs.map(d => ({ id:d.id, ...d.data() })));
    } catch(e) { console.error("loadNotices:", e); }
  }, []);

  const loadReports = async () => {
    try {
      const snap = await getDocs(query(collection(db, "reports"), orderBy("createdAt", "desc")));
      setReports(snap.docs.map(d => ({ id:d.id, ...d.data() })));
    } catch(e) { console.error("loadReports:", e); }
  };

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => {
    if (tab === "notices") loadNotices();
    if (tab === "reports") loadReports();
  }, [tab, loadNotices]);

  // ── 회원 삭제 ─────────────────────────────────────────────────────
  const deleteUser = async (uid, nickname) => {
    if (!confirm(`"${nickname}" 유저의 데이터를 삭제할까요?\n(Firebase Auth 계정은 콘솔에서 별도 삭제 필요)`)) return;
    await deleteDoc(doc(db, "users", uid));
    if (nickname) await deleteDoc(doc(db, "nicknames", nickname));
    loadAll();
  };

  // ── 레시피 삭제 ───────────────────────────────────────────────────
  const deleteRecipe = async (id, bean) => {
    if (!confirm(`"${bean}" 레시피를 삭제할까요?`)) return;
    await deleteDoc(doc(db, "recipes", id));
    loadAll();
  };

  // ── 신고 처리 ─────────────────────────────────────────────────────
  const handleReportAction = async (report, action) => {
    try {
      if (report.type === "recipe") {
        if (action === "restore") await updateDoc(doc(db,"recipes",report.targetId), { isPublic:true, reportHidden:false });
        else if (action === "hide") await updateDoc(doc(db,"recipes",report.targetId), { isPublic:false, reportHidden:true });
        else if (action === "delete") { if (!confirm("레시피를 삭제할까요?")) return; await deleteDoc(doc(db,"recipes",report.targetId)); }
      } else if (report.type === "comment") {
        if (action === "restore") await updateDoc(doc(db,"comments",report.targetId), { hidden:false });
        else if (action === "hide")   await updateDoc(doc(db,"comments",report.targetId), { hidden:true });
        else if (action === "delete") { if (!confirm("댓글을 삭제할까요?")) return; await deleteDoc(doc(db,"comments",report.targetId)); }
      }
      await updateDoc(doc(db,"reports",report.id), { status:action, reviewedAt:serverTimestamp() });
      loadReports();
    } catch(e) { console.error(e); }
  };

  // ── 공지사항 등록/수정/삭제 ──────────────────────────────────────
  const postNotice = async () => {
    if (!noticeTitle.trim() || !noticeBody.trim()) return alert("제목과 내용을 입력해주세요.");
    setNoticeSaving(true);
    if (editNoticeId) {
      await updateDoc(doc(db,"notices",editNoticeId), { title:noticeTitle.trim(), body:noticeBody.trim() });
      setEditNoticeId(null);
    } else {
      await addDoc(collection(db,"notices"), {
        title:noticeTitle.trim(), body:noticeBody.trim(),
        author:user?.displayName, createdAt:serverTimestamp(),
      });
    }
    setNoticeTitle(""); setNoticeBody("");
    setNoticeSaving(false);
    loadNotices();
  };

  const startEditNotice = (n) => {
    setEditNoticeId(n.id); setNoticeTitle(n.title); setNoticeBody(n.body);
    window.scrollTo({ top:0, behavior:"smooth" });
  };

  const cancelEditNotice = () => {
    setEditNoticeId(null); setNoticeTitle(""); setNoticeBody("");
  };

  const deleteNotice = async (id) => {
    if (!confirm("공지사항을 삭제할까요?")) return;
    await deleteDoc(doc(db,"notices",id));
    loadNotices();
  };

  // ── 브랜드 관리 ───────────────────────────────────────────────────
  const saveBrands = async (machineList, grinderList) => {
    setBrandSaving(true);
    try {
      await setDoc(doc(db,"settings","brands"), { machineBrands:machineList, grinderBrands:grinderList });
      // 전역 캐시 갱신 (import된 let 변수 직접 변경 불가 — 페이지 리로드로 반영됨)
      setBrandMsg({ type:"ok", text:"저장됐어요 ✓" });
      setTimeout(() => setBrandMsg(null), 2000);
    } catch(e) {
      setBrandMsg({ type:"error", text:"저장 오류: "+e.message });
    }
    setBrandSaving(false);
  };

  const addMachineBrand = () => {
    if (!newMachineBrand.trim()) return;
    if (machineBrandList.includes(newMachineBrand.trim()))
      return setBrandMsg({ type:"error", text:"이미 있는 브랜드예요." });
    const updated = [...machineBrandList, newMachineBrand.trim()];
    setMachineBrandList(updated);
    saveBrands(updated, grinderBrandList);
    setNewMachineBrand("");
  };

  const removeMachineBrand = (b) => {
    const updated = machineBrandList.filter(x => x !== b);
    setMachineBrandList(updated);
    saveBrands(updated, grinderBrandList);
  };

  const addGrinderBrand = () => {
    if (!newGrinderBrand.trim()) return;
    if (grinderBrandList.includes(newGrinderBrand.trim()))
      return setBrandMsg({ type:"error", text:"이미 있는 브랜드예요." });
    const updated = [...grinderBrandList, newGrinderBrand.trim()];
    setGrinderBrandList(updated);
    saveBrands(machineBrandList, updated);
    setNewGrinderBrand("");
  };

  const removeGrinderBrand = (b) => {
    const updated = grinderBrandList.filter(x => x !== b);
    setGrinderBrandList(updated);
    saveBrands(machineBrandList, updated);
  };

  // ── 회원 필터 파생 계산 ──────────────────────────────────────────
  const fmt = (ts) => {
    if (!ts) return "—";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("ko-KR", { year:"2-digit", month:"2-digit", day:"2-digit" });
  };
  const daysSince = (ts) => {
    if (!ts) return 9999;
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return Math.floor((Date.now() - d.getTime()) / 86400000);
  };

  const filteredUsers = (() => {
    let list = [...users];
    if (userSearch.trim()) {
      const q = userSearch.trim().toLowerCase();
      list = list.filter(u =>
        (u.nickname||"").toLowerCase().includes(q) ||
        (u.id||"").toLowerCase().includes(q)
      );
    }
    if (userStatusFilter !== "all") {
      list = list.filter(u => (u.status||"active") === userStatusFilter);
    }
    if (userJoinFrom) {
      const from = new Date(userJoinFrom);
      list = list.filter(u => { if (!u.createdAt) return false; const d = u.createdAt.toDate?u.createdAt.toDate():new Date(u.createdAt); return d >= from; });
    }
    if (userJoinTo) {
      const to = new Date(userJoinTo); to.setHours(23,59,59);
      list = list.filter(u => { if (!u.createdAt) return false; const d = u.createdAt.toDate?u.createdAt.toDate():new Date(u.createdAt); return d <= to; });
    }
    list.sort((a,b) => {
      if (userSortBy==="joinDesc")  return (b.createdAt?.seconds||0)-(a.createdAt?.seconds||0);
      if (userSortBy==="joinAsc")   return (a.createdAt?.seconds||0)-(b.createdAt?.seconds||0);
      if (userSortBy==="loginDesc") return (b.lastLogin?.seconds||0)-(a.lastLogin?.seconds||0);
      if (userSortBy==="loginAsc")  return (a.lastLogin?.seconds||0)-(b.lastLogin?.seconds||0);
      return 0;
    });
    return list;
  })();

  const TABS = [
    { key:"stats",   label:"통계" },
    { key:"reports", label:"신고 관리" },
    { key:"users",   label:"회원 관리" },
    { key:"recipes", label:"레시피 관리" },
    { key:"notices", label:"공지사항" },
    { key:"brands",  label:"브랜드 관리" },
  ];

  const TAB_ICONS = {
    stats:   <svg width="12" height="12" viewBox="0 0 14 14" fill="none" style={{ flexShrink:0 }}><rect x="1" y="8" width="3" height="5" rx="1" fill="currentColor" opacity="0.7"/><rect x="5.5" y="5" width="3" height="8" rx="1" fill="currentColor" opacity="0.85"/><rect x="10" y="2" width="3" height="11" rx="1" fill="currentColor"/></svg>,
    users:   <svg width="12" height="12" viewBox="0 0 14 14" fill="none" style={{ flexShrink:0 }}><circle cx="5" cy="4.5" r="2.5" stroke="currentColor" strokeWidth="1.3"/><path d="M1 12c0-2.761 1.791-4 4-4s4 1.239 4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><path d="M10 7.5c1.5 0 3 .8 3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><circle cx="10.5" cy="4" r="2" stroke="currentColor" strokeWidth="1.3"/></svg>,
    reports: <svg width="12" height="12" viewBox="0 0 14 14" fill="none" style={{ flexShrink:0 }}><path d="M7 1L1 13h12L7 1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/><path d="M7 5.5v3M7 10v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
    recipes: <svg width="12" height="12" viewBox="0 0 14 14" fill="none" style={{ flexShrink:0 }}><rect x="2" y="1" width="10" height="12" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M4.5 5h5M4.5 7.5h5M4.5 10h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
    notices: <svg width="12" height="12" viewBox="0 0 14 14" fill="none" style={{ flexShrink:0 }}><path d="M7 1C4.239 1 2 3.239 2 6v3.5L1 11h12l-1-1.5V6c0-2.761-2.239-5-5-5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/><path d="M5.5 11.5c0 .828.672 1.5 1.5 1.5s1.5-.672 1.5-1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
    brands:  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" style={{ flexShrink:0 }}><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3"/><path d="M7 4v6M5 5.5h2.5a1.5 1.5 0 0 1 0 3H5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  };

  const statusColor = { active:"#27ae60", suspended:"#e67e22", deleted:"#e74c3c" };
  const statusLabel = { active:"활성", suspended:"정지", deleted:"탈퇴" };

  return (
    <div style={{ width:"100%" }}>
      {/* 헤더 */}
      <header className="app-header">
        <div className="logo">
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="8" stroke="var(--espresso)" strokeWidth="1.5"/><path d="M5 9.5c1-2 3-3 4-2s3 3 4 1" stroke="var(--latte)" strokeWidth="1.5" strokeLinecap="round"/></svg>
          Brewlog <span style={{ fontSize:"0.72rem", color:"#c0392b", marginLeft:"6px", fontFamily:"'DM Sans',sans-serif", fontWeight:600, letterSpacing:"0.08em" }}>ADMIN</span>
        </div>
        <div className="header-right">
          <button className="btn-admin-header" onClick={onExit}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ marginRight:"4px" }}><path d="M8 2L3 7l5 5M3 7h9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            일반화면
          </button>
          <button className="btn-logout" onClick={() => signOut(auth)}>{I18N[lang].logout}</button>
        </div>
      </header>

      <div className="admin-wrap">
        <div className="admin-page-title">Admin Console</div>
        <div className="admin-page-sub">Brewlog note 관리자 페이지</div>

        {/* 탭 */}
        <div className="admin-tabs">
          {TABS.map(t => (
            <button key={t.key} className={`admin-tab ${tab===t.key?"active":""}`} onClick={()=>setTab(t.key)}>
              {TAB_ICONS[t.key]}
              {t.label}
            </button>
          ))}
        </div>

        {/* 로딩 */}
        {loading && (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"8px", padding:"48px 0", color:"var(--muted)", fontSize:"0.85rem" }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ animation:"spin 1s linear infinite" }}><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.8" strokeDasharray="12 26" strokeLinecap="round"/></svg>
            불러오는 중…
          </div>
        )}

        {/* ── 통계 ── */}
        {tab==="stats" && !loading && (
          <>
            <div className="admin-stat-grid">
              {[
                { val:users.length,   label:"총 회원 수" },
                { val:recipes.length, label:"총 레시피 수" },
                { val:notices.length, label:"공지사항 수" },
                { val:recipes.length&&users.length?(recipes.length/users.length).toFixed(1):0, label:"인당 레시피" },
              ].map(({val,label}) => (
                <div key={label} className="stat-card">
                  <span className="stat-card-val">{val}</span>
                  <span className="stat-card-label">{label}</span>
                </div>
              ))}
            </div>
            <div className="admin-card">
              <div className="admin-card-title">최근 레시피</div>
              {recipes.slice(0,5).map((r,i) => (
                <div key={r.id} style={{ display:"flex", alignItems:"center", gap:"10px", padding:"10px 0", borderBottom:i<4?"1px solid var(--divider)":"none" }}>
                  <span style={{ fontFamily:"'Playfair Display',serif", fontSize:"0.85rem", color:"var(--muted)", minWidth:"20px" }}>{String(i+1).padStart(2,"0")}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <span style={{ fontWeight:600, color:"var(--espresso)", fontSize:"0.88rem" }}>{r.company} {r.bean}</span>
                    <span style={{ color:"var(--muted)", fontSize:"0.75rem", marginLeft:"8px" }}>@{r.author}</span>
                  </div>
                  <span style={{ fontSize:"0.72rem", color:"var(--muted)", flexShrink:0 }}>{r.menuLabel}</span>
                </div>
              ))}
              {recipes.length===0 && <p style={{ color:"var(--muted)", textAlign:"center", padding:"24px 0", fontSize:"0.85rem" }}>레시피가 없어요.</p>}
            </div>
          </>
        )}

        {/* ── 회원 관리 ── */}
        {tab==="users" && !loading && (
          <div className="admin-card">
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"16px", flexWrap:"wrap", gap:"8px" }}>
              <div className="admin-card-title" style={{ margin:0 }}>회원 관리 ({filteredUsers.length}/{users.length}명)</div>
              <button className="btn-save-sm" onClick={loadAll}>새로고침</button>
            </div>

            {/* 필터 */}
            <div style={{ background:"var(--cream)", border:"1px solid var(--divider)", borderRadius:"10px", padding:"14px 16px", marginBottom:"16px", display:"flex", flexDirection:"column", gap:"10px" }}>
              <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink:0, color:"var(--muted)" }}><circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5"/><path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                <input value={userSearch} onChange={e=>setUserSearch(e.target.value)} placeholder="닉네임, UID 검색…"
                  style={{ flex:1, border:"1px solid var(--steam)", borderRadius:"6px", padding:"6px 10px", fontFamily:"'DM Sans',sans-serif", fontSize:"0.82rem", background:"white" }}/>
              </div>
              <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                  <span style={{ fontSize:"0.72rem", color:"var(--muted)", whiteSpace:"nowrap" }}>상태</span>
                  <select value={userStatusFilter} onChange={e=>setUserStatusFilter(e.target.value)}
                    style={{ border:"1px solid var(--steam)", borderRadius:"6px", padding:"5px 8px", fontSize:"0.78rem", fontFamily:"'DM Sans',sans-serif", background:"white" }}>
                    <option value="all">전체</option><option value="active">활성</option><option value="suspended">정지</option><option value="deleted">탈퇴</option>
                  </select>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                  <span style={{ fontSize:"0.72rem", color:"var(--muted)", whiteSpace:"nowrap" }}>정렬</span>
                  <select value={userSortBy} onChange={e=>setUserSortBy(e.target.value)}
                    style={{ border:"1px solid var(--steam)", borderRadius:"6px", padding:"5px 8px", fontSize:"0.78rem", fontFamily:"'DM Sans',sans-serif", background:"white" }}>
                    <option value="joinDesc">가입일 최신순</option><option value="joinAsc">가입일 오래된순</option>
                    <option value="loginDesc">최근 접속순</option><option value="loginAsc">오래된 접속순</option>
                  </select>
                </div>
              </div>
              <div style={{ display:"flex", gap:"8px", alignItems:"center", flexWrap:"wrap" }}>
                <span style={{ fontSize:"0.72rem", color:"var(--muted)", whiteSpace:"nowrap" }}>가입일</span>
                <input type="date" value={userJoinFrom} onChange={e=>setUserJoinFrom(e.target.value)}
                  style={{ border:"1px solid var(--steam)", borderRadius:"6px", padding:"5px 8px", fontSize:"0.78rem", fontFamily:"'DM Sans',sans-serif", background:"white" }}/>
                <span style={{ fontSize:"0.72rem", color:"var(--muted)" }}>~</span>
                <input type="date" value={userJoinTo} onChange={e=>setUserJoinTo(e.target.value)}
                  style={{ border:"1px solid var(--steam)", borderRadius:"6px", padding:"5px 8px", fontSize:"0.78rem", fontFamily:"'DM Sans',sans-serif", background:"white" }}/>
                {(userJoinFrom||userJoinTo) && (
                  <button onClick={()=>{ setUserJoinFrom(""); setUserJoinTo(""); }}
                    style={{ fontSize:"0.72rem", color:"var(--muted)", background:"none", border:"none", cursor:"pointer", textDecoration:"underline" }}>초기화</button>
                )}
              </div>
            </div>

            {/* 목록 */}
            {filteredUsers.length===0 ? (
              <p style={{ color:"var(--muted)", textAlign:"center", padding:"24px 0", fontSize:"0.85rem" }}>
                {users.length===0?"회원이 없어요.":"검색 결과가 없어요."}
              </p>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                {filteredUsers.map(u => {
                  const status = u.status||"active";
                  const recipeCount = recipes.filter(r=>r.uid===u.id).length;
                  const loginDays = daysSince(u.lastLogin);
                  const isGhost = loginDays>30;
                  return (
                    <div key={u.id} style={{ background:"var(--foam)", border:`1px solid ${status==="suspended"?"#e67e2230":status==="deleted"?"#e74c3c20":"var(--divider)"}`, borderRadius:"10px", padding:"12px 14px", borderLeft:`3px solid ${statusColor[status]||"#27ae60"}` }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:"8px" }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:"6px", marginBottom:"4px", flexWrap:"wrap" }}>
                            <span style={{ fontWeight:700, fontSize:"0.92rem", color:"var(--espresso)" }}>@{u.nickname}</span>
                            <span style={{ fontSize:"0.62rem", fontWeight:700, color:statusColor[status], background:statusColor[status]+"18", border:`1px solid ${statusColor[status]}40`, borderRadius:"4px", padding:"1px 6px" }}>
                              {statusLabel[status]||status}
                            </span>
                            {isGhost && status==="active" && (
                              <span style={{ fontSize:"0.62rem", color:"#8C8480", background:"#F0EFEF", borderRadius:"4px", padding:"1px 6px" }}>👻 유령</span>
                            )}
                          </div>
                          <div style={{ display:"flex", flexWrap:"wrap", gap:"10px", fontSize:"0.72rem", color:"var(--muted)" }}>
                            <span>가입 {fmt(u.createdAt)}</span>
                            <span>최근접속 {loginDays===9999?"—":`${loginDays}일 전`}</span>
                            <span>레시피 {recipeCount}개</span>
                            <span style={{ fontFamily:"monospace", fontSize:"0.65rem" }}>{u.id.slice(0,10)}…</span>
                          </div>
                        </div>
                        {u.id!==user?.uid && (
                          <div style={{ display:"flex", gap:"5px", flexShrink:0 }}>
                            {status==="active" ? (
                              <button onClick={async()=>{ if(!confirm(`@${u.nickname} 계정을 정지할까요?`)) return; await updateDoc(doc(db,"users",u.id),{status:"suspended",suspendedAt:serverTimestamp()}); loadAll(); }}
                                style={{ padding:"4px 8px", border:"1px solid #e67e2260", borderRadius:"6px", background:"none", cursor:"pointer", fontSize:"0.68rem", color:"#e67e22", fontFamily:"'DM Sans',sans-serif" }}>
                                정지
                              </button>
                            ) : status==="suspended" ? (
                              <button onClick={async()=>{ await updateDoc(doc(db,"users",u.id),{status:"active",suspendedAt:null}); loadAll(); }}
                                style={{ padding:"4px 8px", border:"1px solid #27ae6060", borderRadius:"6px", background:"none", cursor:"pointer", fontSize:"0.68rem", color:"#27ae60", fontFamily:"'DM Sans',sans-serif" }}>
                                복구
                              </button>
                            ) : null}
                            <button className="btn-danger" onClick={()=>deleteUser(u.id,u.nickname)}>삭제</button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── 신고 관리 ── */}
        {tab==="reports" && (
          <div className="admin-card">
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"16px" }}>
              <div className="admin-card-title" style={{ margin:0 }}>신고 목록 ({reports.length}건)</div>
              <button className="btn-save-sm" onClick={loadReports} style={{ display:"flex", alignItems:"center", gap:"5px" }}>
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M12.5 7a5.5 5.5 0 1 1-1.1-3.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M12.5 2.5v2.5H10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                새로고침
              </button>
            </div>
            {reports.length===0 ? (
              <p style={{ color:"var(--muted)", textAlign:"center", padding:"24px 0", fontSize:"0.85rem" }}>신고된 콘텐츠가 없어요.</p>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
                {reports.map(r => (
                  <div key={r.id} className={`report-card ${r.status==="pending"?"pending":"resolved"}`}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:"8px", marginBottom:"10px" }}>
                      <div style={{ display:"flex", gap:"6px", alignItems:"center" }}>
                        <span style={{ fontSize:"0.68rem", padding:"2px 8px", borderRadius:"4px", fontWeight:600, background:r.type==="recipe"?"#e8f4fd":"#fef9e7", color:r.type==="recipe"?"#2980b9":"#e67e22" }}>
                          {r.type==="recipe"?"레시피":"댓글"}
                        </span>
                        <span style={{ fontSize:"0.68rem", padding:"2px 8px", borderRadius:"4px", fontWeight:600, background:r.status==="pending"?"#fdecea":"#eafaf1", color:r.status==="pending"?"#e74c3c":"#27ae60" }}>
                          {r.status==="pending"?"처리 대기":r.status==="restore"?"공개 복구":r.status==="hide"?"비공개":r.status==="delete"?"삭제됨":r.status}
                        </span>
                      </div>
                      <span style={{ fontSize:"0.68rem", color:"var(--muted)", flexShrink:0 }}>{r.createdAt?.toDate?.()?.toLocaleDateString("ko-KR")||""}</span>
                    </div>
                    <div style={{ fontSize:"0.85rem", color:"var(--espresso)", marginBottom:"4px" }}>
                      <span style={{ color:"var(--muted)", fontSize:"0.72rem" }}>사유</span>
                      <span style={{ marginLeft:"8px" }}>{r.reason}</span>
                    </div>
                    <div style={{ fontSize:"0.72rem", color:"var(--muted)", marginBottom:"12px" }}>
                      신고자 {r.uid?.slice(0,10)}… · 대상 {r.targetId?.slice(0,10)}…
                    </div>
                    {r.status==="pending" && (
                      <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
                        <button className="admin-action-btn admin-action-restore" onClick={()=>handleReportAction(r,"restore")}>
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3"/><path d="M4.5 7l2 2 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          공개 유지
                        </button>
                        <button className="admin-action-btn admin-action-hide" onClick={()=>handleReportAction(r,"hide")}>
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><rect x="2" y="6" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M4.5 6V4.5a2.5 2.5 0 0 1 5 0V6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                          비공개
                        </button>
                        <button className="admin-action-btn admin-action-delete" onClick={()=>handleReportAction(r,"delete")}>
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M2.5 3.5h9M4.5 3.5V2.5c0-.28.22-.5.5-.5h4c.28 0 .5.22.5.5v1M5.5 6v4M8.5 6v4M3 3.5l.7 8c.02.4.35.7.76.7h6.08c.4 0 .73-.3.76-.7l.7-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          삭제
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── 레시피 관리 ── */}
        {tab==="recipes" && !loading && (
          <div className="admin-card" style={{ overflowX:"auto" }}>
            <div className="admin-card-title">레시피 목록 ({recipes.length}개)</div>
            <table className="admin-table">
              <thead><tr><th>작성자</th><th>원두</th><th>머신</th><th></th></tr></thead>
              <tbody>
                {recipes.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight:500 }}>@{r.author}</td>
                    <td style={{ fontWeight:500 }}>{r.company} {r.bean}</td>
                    <td style={{ color:"var(--muted)", fontSize:"0.8rem" }}>{r.machine||"—"}</td>
                    <td>
                      <button className="btn-danger" onClick={()=>deleteRecipe(r.id,r.bean)}>
                        <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M2.5 3.5h9M4.5 3.5V2.5c0-.28.22-.5.5-.5h4c.28 0 .5.22.5.5v1M5.5 6v4M8.5 6v4M3 3.5l.7 8c.02.4.35.7.76.7h6.08c.4 0 .73-.3.76-.7l.7-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {recipes.length===0 && <p style={{ color:"var(--muted)", textAlign:"center", padding:"24px 0", fontSize:"0.85rem" }}>레시피가 없어요.</p>}
          </div>
        )}

        {/* ── 공지사항 ── */}
        {tab==="notices" && !loading && (
          <>
            <div className="admin-card">
              <div className="admin-card-title">{editNoticeId?"공지사항 수정":"새 공지사항 작성"}</div>
              <div className="notice-form">
                <div className="field" style={{ marginBottom:0 }}>
                  <label>제목</label>
                  <input value={noticeTitle} onChange={e=>setNoticeTitle(e.target.value)} placeholder="공지사항 제목"/>
                </div>
                <div className="field" style={{ marginBottom:0 }}>
                  <label>내용</label>
                  <textarea value={noticeBody} onChange={e=>setNoticeBody(e.target.value)} placeholder="공지 내용을 입력해주세요…" rows={3}/>
                </div>
                <div style={{ display:"flex", justifyContent:"flex-end", gap:"8px" }}>
                  {editNoticeId && <button className="btn-cancel" onClick={cancelEditNotice}>취소</button>}
                  <button className="btn-save-sm" onClick={postNotice} disabled={noticeSaving}>
                    {noticeSaving?"저장 중…":editNoticeId?"수정 저장":"공지 등록"}
                  </button>
                </div>
              </div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
              {notices.map(n => (
                <div key={n.id} className="notice-item" style={{ borderLeft:editNoticeId===n.id?"3px solid var(--latte)":"none", paddingLeft:editNoticeId===n.id?"13px":undefined }}>
                  <div className="notice-item-header">
                    <div style={{ flex:1, minWidth:0 }}>
                      <div className="notice-item-title">{n.title}</div>
                      <div className="notice-item-body">{n.body}</div>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:"6px", flexShrink:0 }}>
                      <span className="notice-item-date">{n.createdAt?.toDate?.()?.toLocaleDateString("ko-KR")||""}</span>
                      <div style={{ display:"flex", gap:"6px" }}>
                        <button className="btn-change" onClick={()=>startEditNotice(n)}>수정</button>
                        <button className="btn-danger" onClick={()=>deleteNotice(n.id)}>
                          <svg width="11" height="11" viewBox="0 0 14 14" fill="none"><path d="M2.5 3.5h9M4.5 3.5V2.5c0-.28.22-.5.5-.5h4c.28 0 .5.22.5.5v1M5.5 6v4M8.5 6v4M3 3.5l.7 8c.02.4.35.7.76.7h6.08c.4 0 .73-.3.76-.7l.7-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          삭제
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {notices.length===0 && <p style={{ color:"var(--muted)", textAlign:"center", padding:"24px 0", fontSize:"0.85rem" }}>공지사항이 없어요.</p>}
            </div>
          </>
        )}

        {/* ── 브랜드 관리 ── */}
        {tab==="brands" && !loading && (
          <>
            {brandMsg && <p className={brandMsg.type==="error"?"msg-error":"msg-ok"} style={{ marginBottom:"12px", textAlign:"center" }}>{brandMsg.text}</p>}
            {[
              { title:"커피 머신 브랜드", list:machineBrandList, newVal:newMachineBrand, setNew:setNewMachineBrand, onAdd:addMachineBrand, onRemove:removeMachineBrand },
              { title:"그라인더 브랜드",  list:grinderBrandList, newVal:newGrinderBrand, setNew:setNewGrinderBrand, onAdd:addGrinderBrand, onRemove:removeGrinderBrand },
            ].map(({title,list,newVal,setNew,onAdd,onRemove}) => (
              <div key={title} className="admin-card" style={{ marginBottom:"16px" }}>
                <div className="admin-card-title">{title}</div>
                <div style={{ display:"flex", gap:"8px", marginBottom:"14px" }}>
                  <input value={newVal} onChange={e=>setNew(e.target.value)} placeholder="새 브랜드명 입력"
                    onKeyDown={e=>e.key==="Enter"&&onAdd()}
                    style={{ flex:1, padding:"0.7rem 1rem", border:"1px solid var(--steam)", borderRadius:"8px", fontFamily:"'DM Sans',sans-serif", fontSize:"0.88rem", outline:"none", background:"var(--cream)", color:"var(--espresso)", transition:"border-color 0.2s" }}/>
                  <button className="btn-save-sm" onClick={onAdd} disabled={brandSaving}>추가</button>
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:"6px" }}>
                  {list.map(b => (
                    <div key={b} className="brand-tag">
                      <span>{b}</span>
                      <button className="brand-tag-remove" onClick={()=>onRemove(b)}>
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                      </button>
                    </div>
                  ))}
                  {list.length===0 && <p style={{ color:"var(--muted)", fontSize:"0.82rem" }}>브랜드가 없어요.</p>}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
