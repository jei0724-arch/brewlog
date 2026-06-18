/* ============================================================
   BREWLOG NOTE — src/components/profile/BrewerProfileModal.jsx
   브루어 프로필 모달
   ─ 핵심 지표 (레시피 수, 평균 별점, 받은 하트, 구독자)
   ─ 주력 머신 + 선호 메뉴 TOP3
   ─ 최근 레시피 3개 미리보기
   ─ 전체 레시피 보기 버튼
   ─ 내 프로필: 공개/비공개 토글
   ─ 타인 프로필: 구독 버튼
   ============================================================ */
import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../config/firebase";

export default function BrewerProfileModal({
  uid, name, currentUid, allRecipes, lang,
  isFollowing, onFollow, onClose, onFilterRecipes,
}) {
  const isKo = lang === "ko";
  const [profileData,   setProfileData]   = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [profilePublic, setProfilePublic] = useState(true);
  const isMyProfile = uid === currentUid;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, "users", uid));
        if (snap.exists()) {
          const d = snap.data();
          setProfileData(d);
          setProfilePublic(d.profilePublic !== false);
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, [uid]);

  const toggleProfilePublic = async () => {
    const next = !profilePublic;
    setProfilePublic(next);
    try { await updateDoc(doc(db, "users", uid), { profilePublic: next }); } catch {}
  };

  // 이 브루어의 공개 레시피
  const userRecipes  = allRecipes.filter(r => r.uid===uid && r.isPublic!==false);
  const totalRecipes = userRecipes.length;
  const avgRating    = (() => {
    const rated = userRecipes.filter(r => r.rating>0);
    return rated.length ? (rated.reduce((s,r)=>s+r.rating,0)/rated.length).toFixed(1) : null;
  })();
  const totalLikes = userRecipes.reduce((s,r)=>s+(r.likedBy?.length||0),0);

  // 주력 머신
  const machineMap = {};
  userRecipes.forEach(r => { if(r.machine) machineMap[r.machine]=(machineMap[r.machine]||0)+1; });
  const topMachine = Object.entries(machineMap).sort((a,b)=>b[1]-a[1])[0]?.[0]||null;

  // 선호 메뉴 TOP3
  const menuMap = {};
  userRecipes.forEach(r => { if(r.menuLabel) menuMap[r.menuLabel]=(menuMap[r.menuLabel]||0)+1; });
  const topMenus = Object.entries(menuMap).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([m])=>m);

  // 최근 레시피 3개
  const recentRecipes = [...userRecipes]
    .sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0))
    .slice(0,3);

  const followerCount = profileData?.followerCount || 0;
  const joinDate = profileData?.createdAt?.toDate
    ? profileData.createdAt.toDate().toLocaleDateString(isKo?"ko-KR":"en-US",{year:"numeric",month:"long"})
    : null;

  const isPrivate = !profilePublic && !isMyProfile;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth:"440px", position:"relative" }} onClick={e=>e.stopPropagation()}>
        <button onClick={onClose} style={{ position:"absolute", top:"16px", right:"16px", background:"none", border:"none", cursor:"pointer", color:"var(--muted)", fontSize:"1.2rem", lineHeight:1, padding:"4px" }}>✕</button>

        {loading ? (
          <div style={{ textAlign:"center", padding:"40px 0", color:"var(--muted)", fontFamily:"'DM Sans',sans-serif", fontSize:"0.85rem" }}>
            {isKo?"불러오는 중…":"Loading…"}
          </div>
        ) : (
          <>
            {/* 프로필 헤더 */}
            <div style={{ display:"flex", alignItems:"center", gap:"16px", marginBottom:"20px", paddingBottom:"20px", borderBottom:"1px solid var(--divider)" }}>
              <div style={{ width:"56px", height:"56px", borderRadius:"50%", background:"var(--espresso)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <span style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.4rem", color:"var(--cream)", fontWeight:700 }}>
                  {(name||"?")[0].toUpperCase()}
                </span>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.15rem", fontWeight:700, color:"var(--espresso)", marginBottom:"2px" }}>
                  @{name}
                </div>
                {profileData?.bio && (
                  <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.8rem", color:"var(--espresso)", marginBottom:"3px", lineHeight:1.45 }}>
                    {profileData.bio}
                  </div>
                )}
                {joinDate && (
                  <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.72rem", color:"var(--muted)" }}>
                    {isKo?`${joinDate}부터 브루잉`:`Brewing since ${joinDate}`}
                  </div>
                )}
              </div>
              {/* 내 프로필: 공개 토글 */}
              {isMyProfile && (
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"4px" }}>
                  <div onClick={toggleProfilePublic}
                    style={{ width:"40px", height:"22px", borderRadius:"11px", background:profilePublic?"var(--latte)":"var(--steam)", position:"relative", cursor:"pointer", transition:"background 0.2s", flexShrink:0 }}>
                    <div style={{ position:"absolute", top:"3px", left:profilePublic?"21px":"3px", width:"16px", height:"16px", borderRadius:"50%", background:"white", boxShadow:"0 1px 3px rgba(0,0,0,0.2)", transition:"left 0.2s" }}/>
                  </div>
                  <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.6rem", color:"var(--muted)" }}>
                    {profilePublic?(isKo?"공개":"Public"):(isKo?"비공개":"Private")}
                  </span>
                </div>
              )}
              {/* 타인: 구독 버튼 */}
              {!isMyProfile && currentUid && (
                <button onClick={onFollow}
                  style={{ padding:"6px 16px", borderRadius:"var(--r-btn)", border:`1px solid ${isFollowing?"var(--steam)":"var(--espresso)"}`, background:isFollowing?"none":"var(--espresso)", color:isFollowing?"var(--muted)":"var(--cream)", fontFamily:"'DM Sans',sans-serif", fontSize:"0.78rem", fontWeight:500, cursor:"pointer", whiteSpace:"nowrap", transition:"all 0.15s" }}>
                  {isFollowing?(isKo?"구독 중":"Following"):(isKo?"구독":"Follow")}
                </button>
              )}
            </div>

            {isPrivate ? (
              <div style={{ textAlign:"center", padding:"32px 0", color:"var(--muted)", fontFamily:"'DM Sans',sans-serif" }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" style={{ marginBottom:"12px", opacity:0.4 }}>
                  <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <div style={{ fontSize:"0.85rem" }}>{isKo?"비공개 프로필이에요.":"This profile is private."}</div>
              </div>
            ) : (
              <>
                {/* 핵심 지표 */}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"8px", marginBottom:"20px" }}>
                  {[
                    { label:isKo?"레시피":"Recipes",   value:totalRecipes },
                    { label:isKo?"평균 별점":"Avg ★",  value:avgRating?`★${avgRating}`:"—" },
                    { label:isKo?"받은 하트":"Likes",   value:totalLikes },
                    { label:isKo?"구독자":"Followers", value:followerCount },
                  ].map(({label,value})=>(
                    <div key={label} style={{ background:"var(--cream)", border:"1px solid var(--divider)", borderRadius:"var(--r-btn)", padding:"10px 6px", textAlign:"center" }}>
                      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.1rem", fontWeight:700, color:"var(--espresso)", lineHeight:1 }}>{value}</div>
                      <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.6rem", color:"var(--muted)", marginTop:"3px" }}>{label}</div>
                    </div>
                  ))}
                </div>

                {/* 주력 머신 + 선호 메뉴 */}
                {(topMachine || topMenus.length>0) && (
                  <div style={{ background:"var(--cream)", border:"1px solid var(--divider)", borderRadius:"var(--r-card)", padding:"12px 14px", marginBottom:"16px" }}>
                    {topMachine && (
                      <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:topMenus.length?"10px":"0" }}>
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="2" y="5" width="12" height="9" rx="1.5" stroke="var(--latte)" strokeWidth="1.3"/><path d="M5 5V4a3 3 0 0 1 6 0v1" stroke="var(--latte)" strokeWidth="1.3" strokeLinecap="round"/><circle cx="8" cy="9.5" r="1.5" fill="var(--latte)"/></svg>
                        <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.78rem", color:"var(--espresso)" }}>
                          <span style={{ color:"var(--muted)", marginRight:"4px" }}>{isKo?"주력 머신":"Main machine"}</span>
                          {topMachine}
                        </span>
                      </div>
                    )}
                    {topMenus.length>0 && (
                      <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 7h10v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" stroke="var(--latte)" strokeWidth="1.3" strokeLinejoin="round"/><path d="M3 7H2a1.5 1.5 0 0 0 0 3h1" stroke="var(--latte)" strokeWidth="1.3" strokeLinecap="round"/></svg>
                        <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.78rem", color:"var(--espresso)" }}>
                          <span style={{ color:"var(--muted)", marginRight:"4px" }}>{isKo?"즐겨 마시는":"Favorites"}</span>
                          {topMenus.join(" · ")}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* 최근 레시피 */}
                {recentRecipes.length>0 && (
                  <div style={{ marginBottom:"16px" }}>
                    <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.65rem", fontWeight:700, color:"var(--muted)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"10px" }}>
                      {isKo?"최근 기록":"Recent Brews"}
                    </div>
                    {recentRecipes.map(r=>(
                      <div key={r.id} style={{ display:"flex", alignItems:"center", gap:"10px", padding:"9px 0", borderBottom:"1px solid var(--divider)" }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.82rem", fontWeight:600, color:"var(--espresso)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                            {r.bean||r.menuLabel||"—"}
                          </div>
                          <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.7rem", color:"var(--muted)" }}>
                            {r.menuLabel}{r.machine?` · ${r.machine}`:""}
                          </div>
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:"6px", flexShrink:0 }}>
                          {r.rating>0 && <span style={{ fontSize:"0.75rem", color:"var(--latte)" }}>★{r.rating}</span>}
                          <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.68rem", color:"var(--muted)" }}>
                            {r.recordDate||r.createdAt?.toDate?.()?.toLocaleDateString(isKo?"ko-KR":"en-US",{month:"short",day:"numeric"})||""}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 전체 보기 */}
                <button onClick={onFilterRecipes}
                  style={{ width:"100%", padding:"10px", background:"none", border:"1px solid var(--steam)", borderRadius:"var(--r-btn)", fontFamily:"'DM Sans',sans-serif", fontSize:"0.82rem", color:"var(--muted)", cursor:"pointer", transition:"border-color 0.15s, color 0.15s" }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--espresso)";e.currentTarget.style.color="var(--espresso)";}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--steam)";e.currentTarget.style.color="var(--muted)";}}>
                  {isKo?`@${name}의 레시피 전체 보기 →`:`View all recipes by @${name} →`}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
