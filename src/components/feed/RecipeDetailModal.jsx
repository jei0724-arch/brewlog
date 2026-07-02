/* ============================================================
   BREWLOG NOTE — src/components/feed/RecipeDetailModal.jsx
   레시피 상세 모달
   ─ 장비/날씨/원두 정보 라벨 그리드
   ─ Flavor 레이더 + 2열 바 차트
   ─ 추출 비율 자동 계산 (1:N)
   ─ 댓글 + 대댓글 (onSnapshot 실시간)
   ─ 신고 (ReportModal)
   ─ 차단 / 차단 해제
   ─ 공유 카드 생성 (html2canvas + Web Share API)
   ============================================================ */
import { useState, useEffect } from "react";
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  query, where, onSnapshot, serverTimestamp,
} from "firebase/firestore";
import { db } from "../../config/firebase";
import { I18N }       from "../../constants/localization";
import { COFFEE_MENUS, FLAVOR_AXES } from "../../constants/coffeeMenus";
import { FlavorRadar } from "../ui";
import ReportModal      from "../modals/ReportModal";

// ─────────────────────────────────────────────────────────────────
export default function RecipeDetailModal({
  recipe, onClose, currentUid, currentUser,
  onLike, onEdit, onDelete, onRequireAuth,
  onFollow, isFollowing, onBookmark, isBookmarked,
  onCompare, onCopyRecipe, onAuthorClick,
  onTagClick, activeTag,
  lang = "ko",
}) {
  const t        = I18N[lang];
  const date     = recipe.createdAt?.toDate?.()?.toLocaleDateString(lang==="en"?"en-US":"ko-KR") || "";
  const liked    = (recipe.likedBy || []).includes(currentUid);
  const likeCount = (recipe.likedBy || []).length;
  const isOwner  = recipe.uid === currentUid;

  const [showReport,    setShowReport]    = useState(null);
  const [comments,      setComments]      = useState([]);
  const [commentText,   setCommentText]   = useState("");
  const [commentLoading,setCommentLoading]= useState(false);
  const [replyTo,       setReplyTo]       = useState(null);
  const [editingId,     setEditingId]     = useState(null);
  const [editText,      setEditText]      = useState("");
  const [showMore,      setShowMore]      = useState(false);
  const [isBlocked,     setIsBlocked]     = useState(false);
  const [blockLoading,  setBlockLoading]  = useState(false);

  const BLOCKED_KEY = `brewlog_blocked_${currentUid}`;
  const loadBlocked = () => { try { return JSON.parse(localStorage.getItem(BLOCKED_KEY)||"[]"); } catch { return []; } };

  useEffect(() => {
    if (!currentUid || !recipe?.uid || currentUid === recipe.uid) return;
    setIsBlocked(loadBlocked().includes(recipe.uid));
  }, [recipe?.uid, currentUid]); // eslint-disable-line

  // 댓글 실시간 구독
  useEffect(() => {
    if (!recipe?.id) return;
    const q = query(collection(db, "comments"), where("recipeId","==",recipe.id));
    const unsub = onSnapshot(q, snap => {
      const list = snap.docs.map(d => ({ id:d.id, ...d.data() }));
      list.sort((a,b) => (a.createdAt?.seconds||0) - (b.createdAt?.seconds||0));
      setComments(list.filter(c => !c.hidden));
    });
    return unsub;
  }, [recipe?.id]);

  // 차단
  const handleBlock = async () => {
    if (!currentUid || !recipe?.uid) return;
    setBlockLoading(true);
    const blocked    = loadBlocked();
    const newBlocked = [...new Set([...blocked, recipe.uid])];
    localStorage.setItem(BLOCKED_KEY, JSON.stringify(newBlocked));
    try { await updateDoc(doc(db,"users",currentUid), { blockedUsers:newBlocked }); } catch(e) { console.warn("[block]",e.message); }
    setIsBlocked(true); setBlockLoading(false); setShowMore(false); onClose();
  };

  const handleUnblock = async () => {
    if (!currentUid || !recipe?.uid) return;
    setBlockLoading(true);
    const blocked = loadBlocked().filter(id => id !== recipe.uid);
    localStorage.setItem(BLOCKED_KEY, JSON.stringify(blocked));
    try { await updateDoc(doc(db,"users",currentUid), { blockedUsers:blocked }); } catch(e) { console.warn("[unblock]",e.message); }
    setIsBlocked(false); setBlockLoading(false); setShowMore(false);
  };

  // 댓글 작성
  const submitComment = async () => {
    if (!currentUser) { onRequireAuth?.(); return; }
    const text = commentText.trim();
    if (!text) return;
    setCommentLoading(true);
    try {
      await addDoc(collection(db,"comments"), {
        recipeId: recipe.id, uid: currentUser.uid, author: currentUser.displayName,
        text, parentId: replyTo?.id||null, parentAuthor: replyTo?.author||null,
        createdAt: serverTimestamp(),
      });
      const parentUid = replyTo?.uid || null;
      setReplyTo(null);

      // 레시피 주인 알림 (본인 레시피면 스킵)
      if (recipe.uid && recipe.uid !== currentUser.uid) {
        addDoc(collection(db,"notifications"), {
          toUid: recipe.uid, type:"comment", fromUser:currentUser.displayName,
          recipeId: recipe.id, beanName: recipe.bean||"",
          text: text.slice(0,50), read:false, createdAt: serverTimestamp(),
        }).catch(e => console.error("[알림]",e.message));
      }

      // 답글 알림 — 원댓글 작성자에게 (본인이거나 레시피 주인과 동일하면 중복 발송 방지)
      if (parentUid && parentUid !== currentUser.uid && parentUid !== recipe.uid) {
        addDoc(collection(db,"notifications"), {
          toUid: parentUid, type:"reply", fromUser:currentUser.displayName,
          recipeId: recipe.id, beanName: recipe.bean||"",
          text: text.slice(0,50), read:false, createdAt: serverTimestamp(),
        }).catch(e => console.error("[답글 알림]",e.message));
      }

      setCommentText("");
    } catch(e) { console.error(e); }
    setCommentLoading(false);
  };

  const deleteComment = async (id) => {
    if (!confirm("댓글을 삭제할까요?")) return;
    await deleteDoc(doc(db,"comments",id));
  };

  // 댓글 수정
  const startEdit = (c) => { setEditingId(c.id); setEditText(c.text); };
  const cancelEdit = () => { setEditingId(null); setEditText(""); };
  const saveEdit = async (id) => {
    const trimmed = editText.trim();
    if (!trimmed) return;
    try {
      await updateDoc(doc(db,"comments",id), { text: trimmed, editedAt: serverTimestamp() });
      setEditingId(null); setEditText("");
    } catch(e) { console.error("[댓글 수정]", e.message); }
  };

  // 물 종류 표시 헬퍼
  const waterLabel = (() => {
    if (!recipe.waterType && !recipe.waterBrand) return null;
    const types   = { tap:"수돗물", filter:"정수기", bottle:"생수", other:"기타" };
    const typesEn = { tap:"Tap",   filter:"Filtered", bottle:"Bottled", other:"Other" };
    const lbl     = lang==="en" ? typesEn[recipe.waterType] : types[recipe.waterType];
    return [lbl, recipe.waterBrand].filter(Boolean).join(" · ");
  })();

  // 추출 비율
  const ratio = (() => {
    if (!recipe.gram || !recipe.espressoMl) return null;
    if (recipe.menuId==="hand_drip" || recipe.menuId==="cold_brew") return null;
    const r = (parseFloat(recipe.espressoMl)/parseFloat(recipe.gram)).toFixed(1);
    const isOk = r>=1.5 && r<=3.0;
    const label = r<1.5?(lang==="en"?"Ristretto":"리스트레토"):r<2.2?(lang==="en"?"Espresso":"에스프레소"):r<2.8?(lang==="en"?"Lungo":"룽고"):(lang==="en"?"Over":"과다추출");
    return { r, isOk, label };
  })();

  // 라벨 행 데이터
  const labelRows = [
    recipe.machine    && { lbl: lang==="en"?(recipe.machineType==="handdrip"?"Equipment":"Machine"):(recipe.machineType==="handdrip"?"핸드드립 기구":"커피머신"),
      val: <span>{recipe.machine}{recipe.machineType && recipe.machineType!=="handdrip" && <span style={{ marginLeft:"0.3rem", fontSize:"0.65rem", background:recipe.machineType==="auto"?"var(--latte)":"var(--steam)", color:"var(--espresso)", padding:"0.05rem 0.3rem", borderRadius:"999px" }}>{recipe.machineType==="auto"?(lang==="en"?"Auto":"전자동"):(lang==="en"?"Semi":"반자동")}</span>}</span> },
    recipe.grinder    && { lbl: lang==="en"?"Grinder":"그라인더", val: recipe.grinder },
    recipe.grindSize  && { lbl: lang==="en"?"Grind":"분쇄도",    val: recipe.grindSize },
    recipe.company    && { lbl: lang==="en"?"Brand":"원두 회사",  val: recipe.company },
    recipe.roastDate  && { lbl: lang==="en"?"Roasted":"로스팅",  val: new Date(recipe.roastDate).toLocaleDateString(lang==="ko"?"ko-KR":"en-US") },
    recipe.menuLabel  && { lbl: lang==="en"?"Menu":"메뉴", val: <span style={{ display:"flex", alignItems:"center", gap:"5px" }}>
      {lang==="en"?(COFFEE_MENUS.find(m=>m.id===recipe.menuId)?.labelEn||recipe.menuLabel):recipe.menuLabel}
      {recipe.isIced
        ? <span style={{ fontSize:"0.62rem", fontWeight:700, color:"#2980b9", background:"#EBF5FB", border:"1px solid #AED6F1", borderRadius:"4px", padding:"1px 6px" }}>ICE</span>
        : COFFEE_MENUS.find(m=>m.id===recipe.menuId)?.canIce
        ? <span style={{ fontSize:"0.62rem", fontWeight:700, color:"#e67e22", background:"#FEF3E8", border:"1px solid #FAD7A0", borderRadius:"4px", padding:"1px 6px" }}>HOT</span> : null}
    </span> },
    waterLabel        && { lbl: lang==="en"?"Water":"물 종류", val: waterLabel },
    recipe.weather    && { lbl: lang==="en"?"Weather":"날씨", val: <span style={{ display:"flex", alignItems:"center", gap:"4px" }}><span>{recipe.weather.icon}</span><span>{recipe.weather.descKo||recipe.weather.condition}</span><span style={{ color:"var(--muted)", fontSize:"0.7rem" }}>{recipe.weather.temp}°C · {lang==="en"?"Humidity":"습도"} {recipe.weather.humidity}%</span></span> },
  ].filter(Boolean);

  return (
    <>
    <div className="modal-backdrop" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth:"460px" }}>
        {/* 닫기 */}
        <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:"0.4rem" }}>
          <button onClick={onClose}
            style={{
              background:"none", border:"none", fontSize:"1.2rem", cursor:"pointer", color:"var(--muted)",
              width:"44px", height:"44px", display:"flex", alignItems:"center", justifyContent:"center",
              touchAction:"manipulation", WebkitTapHighlightColor:"transparent",
            }}>✕</button>
        </div>

        {/* 라벨 그리드 */}
        <div style={{ display:"grid", gridTemplateColumns:"auto 1px 1fr", columnGap:"0.6rem", rowGap:"0.1rem", alignItems:"center", fontFamily:"'DM Sans',sans-serif", fontSize:"0.72rem", color:"var(--muted)", lineHeight:1.8, marginBottom:"0.8rem" }}>
          {labelRows.map((row, i) => (
            <span key={i} style={{ display:"contents" }}>
              <span style={{ fontWeight:600, color:"var(--roast)", opacity:0.6, whiteSpace:"nowrap" }}>{row.lbl}</span>
              <span style={{ width:"1px", background:"var(--steam)", alignSelf:"stretch", margin:"0.2rem 0" }}/>
              <span>{row.val}</span>
            </span>
          ))}
        </div>

        {/* 원두명 */}
        <div style={{ borderTop:"1px solid var(--steam)", paddingTop:"0.7rem", marginBottom:"1rem" }}>
          <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.72rem", fontWeight:600, color:"var(--roast)", opacity:0.6, marginBottom:"0.15rem" }}>{lang==="en"?"Product":"제품명"}</div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.25rem", fontWeight:700, color:"var(--espresso)", lineHeight:1.25 }}>{recipe.bean}</div>
        </div>

        {/* stat 박스 — 핸드드립은 타임라인 카드, 나머지는 기존 4박스 그리드 */}
        {recipe.menuId === "hand_drip" ? (
          (() => {
            const total = parseInt(recipe.seconds) || 0;
            const inf   = parseInt(recipe.infusionSeconds) || 0;
            const ext   = Math.max(0, total - inf);
            const infPct = total > 0 ? (inf / total) * 100 : 0;
            const extPct = total > 0 ? (ext / total) * 100 : 100;
            const fmtT = (s) => { const m = Math.floor(s/60), sec = s%60; return m>0 ? `${m}:${String(sec).padStart(2,"0")}` : `${sec}s`; };

            const stages = (recipe.pourStages || [])
              .map(s => ({ time: parseInt(s.time)||0, amount: parseInt(s.amount)||0, note: s.note||"" }))
              .filter(s => s.time > 0 || s.amount > 0)
              .sort((a,b) => a.time - b.time);
            const hasStages = stages.length > 0;
            const palette = ["#e67e22","#27ae60","#2980b9","#8e44ad","#c0625a","#16a085","#d35400"];

            // 단계별 구간 계산 (0초 지점부터 시작 → 각 기록 시점까지)
            const segments = hasStages ? stages.map((s, i) => {
              const prevTime = i === 0 ? 0 : stages[i-1].time;
              return { ...s, dur: Math.max(0, s.time - prevTime), fromMl: i === 0 ? 0 : stages[i-1].amount, color: palette[i % palette.length] };
            }) : [];
            const lastStageTime = hasStages ? stages[stages.length-1].time : 0;
            if (hasStages && total > lastStageTime) {
              segments.push({ time: total, amount: stages[stages.length-1].amount, note: lang==="en"?"Drawdown":"낙수/완료", dur: total - lastStageTime, fromMl: stages[stages.length-1].amount, color: "var(--steam)" });
            }

            return (
              <div style={{ marginBottom:"1rem", padding:"14px 16px", background:"var(--cream)", borderRadius:"var(--r-card)", border:"1px solid var(--divider)" }}>
                <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", marginBottom:"10px" }}>
                  <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.68rem", fontWeight:700, color:"var(--muted)", letterSpacing:"0.06em", textTransform:"uppercase" }}>
                    {lang==="en"?"Brew Timeline":"추출 타임라인"}
                  </span>
                  <span style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.5rem", fontWeight:700, color:"var(--espresso)" }}>
                    {total>0?fmtT(total):"—"}
                  </span>
                </div>

                {hasStages ? (
                  <>
                    {/* 세분화 타임라인 바 */}
                    <div style={{ display:"flex", height:"22px", borderRadius:"6px", overflow:"hidden", marginBottom:"10px" }}>
                      {segments.map((seg, i) => (
                        <div key={i} style={{ width:`${total>0?(seg.dur/total)*100:0}%`, background:seg.color, display:"flex", alignItems:"center", justifyContent:"center", minWidth:"20px" }}>
                          <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.58rem", fontWeight:700, color:"#fff", whiteSpace:"nowrap" }}>{fmtT(seg.dur)}</span>
                        </div>
                      ))}
                    </div>

                    {/* 단계별 리스트 */}
                    <div style={{ display:"flex", flexDirection:"column", gap:"6px", marginBottom:"12px" }}>
                      {segments.map((seg, i) => (
                        <div key={i} style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                          <span style={{ width:"8px", height:"8px", borderRadius:"2px", background:seg.color, flexShrink:0 }}/>
                          <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.74rem", color:"var(--espresso)", fontWeight:600, flexShrink:0 }}>
                            {fmtT(i===0?0:segments[i-1].time)} → {fmtT(seg.time)}
                          </span>
                          {seg.amount>0 && (
                            <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.72rem", color:"var(--latte)", fontWeight:600, flexShrink:0 }}>
                              {seg.fromMl}→{seg.amount}ml
                            </span>
                          )}
                          {seg.note && <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.72rem", color:"var(--muted)" }}>{seg.note}</span>}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    {/* 타임라인 바 (2단계 — 상세 푸어 기록이 없는 레시피) */}
                    {total>0 && (
                      <div style={{ display:"flex", height:"22px", borderRadius:"6px", overflow:"hidden", marginBottom:"6px" }}>
                        {inf>0 && (
                          <div style={{ width:`${infPct}%`, background:"#e67e22", display:"flex", alignItems:"center", justifyContent:"center", minWidth:inf>0?"28px":0 }}>
                            <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.62rem", fontWeight:700, color:"#fff", whiteSpace:"nowrap" }}>{fmtT(inf)}</span>
                          </div>
                        )}
                        <div style={{ width:`${extPct}%`, background:"#27ae60", display:"flex", alignItems:"center", justifyContent:"center" }}>
                          <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.62rem", fontWeight:700, color:"#fff", whiteSpace:"nowrap" }}>{fmtT(ext)}</span>
                        </div>
                      </div>
                    )}
                    {/* 범례 */}
                    {inf>0 && (
                      <div style={{ display:"flex", gap:"14px", marginBottom:"12px" }}>
                        <span style={{ display:"flex", alignItems:"center", gap:"5px", fontFamily:"'DM Sans',sans-serif", fontSize:"0.7rem", color:"var(--muted)" }}>
                          <span style={{ width:"8px", height:"8px", borderRadius:"2px", background:"#e67e22", display:"inline-block" }}/>
                          {lang==="en"?"Bloom / Infusion":"인퓨전(블루밍)"}
                        </span>
                        <span style={{ display:"flex", alignItems:"center", gap:"5px", fontFamily:"'DM Sans',sans-serif", fontSize:"0.7rem", color:"var(--muted)" }}>
                          <span style={{ width:"8px", height:"8px", borderRadius:"2px", background:"#27ae60", display:"inline-block" }}/>
                          {lang==="en"?"Extraction":"추출"}
                        </span>
                      </div>
                    )}
                  </>
                )}

                {/* 원두/물/온도 서브 스탯 */}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"8px", paddingTop:"10px", borderTop:"1px solid var(--divider)" }}>
                  <div style={{ textAlign:"center" }}>
                    <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1rem", fontWeight:700, color:"var(--espresso)" }}>{recipe.gram?`${recipe.gram}g`:"—"}</div>
                    <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.65rem", color:"var(--muted)", marginTop:"2px" }}>{t.statGram}</div>
                  </div>
                  <div style={{ textAlign:"center" }}>
                    <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1rem", fontWeight:700, color:"var(--espresso)" }}>{recipe.espressoMl?`${recipe.espressoMl}ml`:"—"}</div>
                    <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.65rem", color:"var(--muted)", marginTop:"2px" }}>{t.statMl}</div>
                  </div>
                  <div style={{ textAlign:"center" }}>
                    <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1rem", fontWeight:700, color:"var(--espresso)" }}>{recipe.waterTemp?`${recipe.waterTemp}°C`:"—"}</div>
                    <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.65rem", color:"var(--muted)", marginTop:"2px" }}>{lang==="en"?"Temp":"물온도"}</div>
                  </div>
                </div>
              </div>
            );
          })()
        ) : (
        <div className="card-stats" style={{ marginBottom:"1rem", gridTemplateColumns:"repeat(4,1fr)" }}>
          <div className="stat"><span className="stat-val">{recipe.gram?`${recipe.gram}g`:"—"}</span><span className="stat-label">{t.statGram}</span></div>
          <div className="stat">
            <span className="stat-val">{recipe.seconds?`${recipe.seconds}s`:"—"}</span>
            <span className="stat-label">{t.statSeconds}</span>
            {recipe.infusionSeconds && parseInt(recipe.infusionSeconds)>0 && (
              <span style={{ fontSize:"0.55rem", color:"var(--muted)", display:"block", lineHeight:1.2, marginTop:"1px", whiteSpace:"nowrap" }}>
                {lang==="en"?`${recipe.infusionSeconds}+${parseInt(recipe.seconds)-parseInt(recipe.infusionSeconds)}`:`인퓨전 ${recipe.infusionSeconds}+추출 ${parseInt(recipe.seconds)-parseInt(recipe.infusionSeconds)}`}
              </span>
            )}
          </div>
          <div className="stat"><span className="stat-val">{recipe.espressoMl?`${recipe.espressoMl}ml`:"—"}</span><span className="stat-label">{t.statMl}</span></div>
          {recipe.waterTemp && <div className="stat"><span className="stat-val">{recipe.waterTemp}°C</span><span className="stat-label">{lang==="en"?"Temp":"물온도"}</span></div>}
        </div>
        )}

        {/* 추출 비율 */}
        {ratio && (
          <div style={{ display:"inline-flex", alignItems:"center", gap:"5px", marginBottom:"10px", padding:"3px 9px", background:ratio.isOk?"#eafaf1":"#fef9e7", borderRadius:"var(--r-chip)", border:`1px solid ${ratio.isOk?"#a9dfbf":"#f9e4b7"}` }}>
            <span style={{ fontSize:"0.72rem", fontWeight:600, color:ratio.isOk?"#27ae60":"#e67e22", fontFamily:"'DM Sans',sans-serif" }}>1 : {ratio.r}</span>
            <span style={{ fontSize:"0.68rem", color:"var(--muted)", fontFamily:"'DM Sans',sans-serif" }}>{ratio.label}</span>
          </div>
        )}

        {recipe.diluteMl && <div className="card-dilution">{recipe.diluteType} {recipe.diluteMl}ml 희석</div>}

        {/* 별점 */}
        {recipe.rating>0 && (
          <div style={{ display:"flex", gap:"0.15rem", marginBottom:"0.5rem" }}>
            {[1,2,3,4,5].map(s => <span key={s} style={{ fontSize:"1rem", color:s<=recipe.rating?"var(--latte)":"var(--steam)" }}>{s<=recipe.rating?"★":"☆"}</span>)}
          </div>
        )}

        {recipe.note && <div className="card-note">"{recipe.note}"</div>}

        {/* 태그 */}
        {(recipe.tags||[]).length>0 && (
          <div style={{ display:"flex", flexWrap:"wrap", gap:"5px", marginBottom:"8px" }}>
            {(recipe.tags||[]).map(tag => (
              <button key={tag} type="button" onClick={e=>{ e.stopPropagation(); onTagClick?.(tag); }}
                style={{ display:"inline-flex", alignItems:"center", background:activeTag===tag?"var(--espresso)":"var(--cream)", color:activeTag===tag?"var(--cream)":"var(--latte)", border:`1px solid ${activeTag===tag?"var(--espresso)":"var(--latte)"}`, borderRadius:"var(--r-chip)", padding:"2px 9px", fontFamily:"'DM Sans',sans-serif", fontSize:"0.72rem", fontWeight:500, cursor:"pointer", transition:"all 0.15s" }}>
                #{tag}
              </button>
            ))}
          </div>
        )}

        {/* 예상 압력 (ULKA E5 펌프 곡선 기반 자동 계산) */}
        {recipe.showerBar && recipe.machineType!=="handdrip" && (
          <div style={{
            display:"flex", alignItems:"center", justifyContent:"space-between", gap:"8px", marginBottom:"6px", padding:"8px 12px",
            borderRadius:"var(--r-chip)",
            background: recipe.showerBar>=9&&recipe.showerBar<=11?"#27ae6010":"#e74c3c10",
            border: `1px solid ${recipe.showerBar>=9&&recipe.showerBar<=11?"#27ae6025":"#e74c3c25"}`,
          }}>
            <span style={{ display:"flex", alignItems:"center", gap:"8px", fontSize:"0.72rem", color:"var(--muted)", fontFamily:"'DM Sans',sans-serif" }}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 1.5c2.5 3 4 5.2 4 7.3a4 4 0 1 1-8 0c0-2.1 1.5-4.3 4-7.3z" stroke={recipe.showerBar>=9&&recipe.showerBar<=11?"#27ae60":"#e74c3c"} strokeWidth="1.3" strokeLinejoin="round"/></svg>
              {t.pressureTitle}
            </span>
            <strong style={{ fontSize:"0.72rem", fontWeight:600, color: recipe.showerBar>=9&&recipe.showerBar<=11?"#27ae60":"#e74c3c" }}>
              {recipe.showerBar} BAR {recipe.showerBar>=9&&recipe.showerBar<=11?"· OK":"· Check"}
            </strong>
          </div>
        )}

        {/* 측정 압력 */}
        {recipe.brewPressureBar && (
          <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"6px", padding:"8px 12px", background:"var(--cream)", borderRadius:"var(--r-chip)", border:"1px solid var(--divider)" }}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="var(--latte)" strokeWidth="1.3"/><path d="M8 5v3.5l2 1.5" stroke="var(--latte)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span style={{ fontSize:"0.72rem", color:"var(--muted)", fontFamily:"'DM Sans',sans-serif" }}>
              {lang==="en"?"Measured Pressure":"측정 압력"}&nbsp;<strong style={{ color:"var(--espresso)", fontWeight:600 }}>{recipe.brewPressureBar} BAR</strong>
            </span>
          </div>
        )}

        {/* TDS / 추출 수율 */}
        {recipe.tds && recipe.espressoMl && recipe.gram && (() => {
          const tds    = parseFloat(recipe.tds);
          const ml     = parseFloat(recipe.espressoMl);
          const gram   = parseFloat(recipe.gram);
          if (!tds||!ml||!gram) return null;
          const yield_ = (tds * ml) / gram;
          const status = yield_ >= 18 && yield_ <= 22 ? "ideal" : yield_ < 18 ? "under" : "over";
          const color  = { ideal:"#27ae60", under:"#2980b9", over:"#e67e22" }[status];
          const label  = { ideal: lang==="en"?"Ideal":"이상적", under: lang==="en"?"Under":"과소", over: lang==="en"?"Over":"과다" }[status];
          return (
            <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"6px", padding:"8px 12px", background:"var(--cream)", borderRadius:"var(--r-chip)", border:`1px solid ${color}30` }}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke={color} strokeWidth="1.3"/><path d="M5 8h6M8 5v6" stroke={color} strokeWidth="1.3" strokeLinecap="round"/></svg>
              <span style={{ fontSize:"0.72rem", color:"var(--muted)", fontFamily:"'DM Sans',sans-serif" }}>
                TDS <strong style={{ color:"var(--espresso)" }}>{tds}%</strong>
                &nbsp;→&nbsp;
                {lang==="en"?"Yield":"수율"} <strong style={{ color }}>{yield_.toFixed(1)}%</strong>
                &nbsp;<span style={{ color, fontWeight:600, fontSize:"0.68rem" }}>({label})</span>
              </span>
            </div>
          );
        })()}

        {/* 연속 추출 메모 */}
        {recipe.continuousMemo && (
          <div style={{ marginBottom:"8px", padding:"8px 12px", background:"var(--cream)", borderRadius:"var(--r-chip)", border:"1px solid var(--divider)", fontSize:"0.78rem", color:"var(--muted)", fontFamily:"'DM Sans',sans-serif", lineHeight:1.55 }}>
            <span style={{ fontSize:"0.62rem", fontWeight:700, color:"var(--latte)", textTransform:"uppercase", letterSpacing:"0.07em", display:"block", marginBottom:"3px" }}>
              {lang==="en"?"Extraction Note":"연속 추출 메모"}
            </span>
            {recipe.continuousMemo}
          </div>
        )}

        {/* Flavor 레이더 + 바 */}
        {FLAVOR_AXES.some(ax => (parseInt(recipe[ax.key])||0)>0) && (
          <div style={{ margin:"12px 0", padding:"16px", background:"var(--cream)", borderRadius:"8px", border:"1px solid var(--divider)" }}>
            <div style={{ fontSize:"0.68rem", color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"12px" }}>
              {lang==="en"?"Flavor Profile":"플레이버 프로파일"}
            </div>
            <div style={{ display:"flex", justifyContent:"center", marginBottom:"14px" }}>
              <FlavorRadar values={recipe} size={200} lang={lang}/>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px 20px" }}>
              {FLAVOR_AXES.map(ax => {
                const v = parseInt(recipe[ax.key])||0;
                return (
                  <div key={ax.key}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"3px" }}>
                      <span style={{ fontSize:"0.75rem", fontWeight:500, color:"var(--espresso)" }}>{lang==="en"?ax.en:ax.ko}</span>
                      <span style={{ fontSize:"0.72rem", fontWeight:700, color:v>0?"var(--latte)":"var(--steam)", whiteSpace:"nowrap" }}>{v>0?`${v}/5`:"—"}</span>
                    </div>
                    <div style={{ height:"4px", background:"var(--steam)", borderRadius:"2px", overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${(v/5)*100}%`, background:v>0?"var(--latte)":"transparent", borderRadius:"2px", transition:"width 0.3s" }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 푸터: 작성자 + 액션 */}
        <div style={{ marginTop:"1rem", borderTop:"1px solid var(--steam)", paddingTop:"0.75rem" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"0.5rem", flexWrap:"wrap", marginBottom:"4px" }}>
            <span className="card-author" style={{ cursor:onAuthorClick?"pointer":"default", whiteSpace:"nowrap" }}
              onClick={() => { if(onAuthorClick){ onClose(); onAuthorClick({ uid:recipe.uid, name:recipe.author }); }}}>
              @{recipe.author}
            </span>
            {recipe.author && recipe.uid!==currentUid && onFollow && (
              <button className={`follow-btn ${isFollowing?"following":""}`} onClick={e=>{ e.stopPropagation(); onFollow(recipe.uid||recipe.author); }}>
                {isFollowing?t.following:t.follow}
              </button>
            )}
            <span style={{ color:"var(--muted)", fontSize:"0.75rem", whiteSpace:"nowrap" }}>· {date}</span>
          </div>

          {/* 액션 버튼 행 */}
          <div className="card-actions" style={{ marginLeft:"-6px" }}>
            {/* 하트 */}
            <button className={`card-action-btn heart ${liked?"liked":""}`}
              onClick={() => !isOwner && onLike(recipe)}
              style={{ cursor:isOwner?"default":"pointer", opacity:isOwner?0.4:1 }}
              title={isOwner?t.heartOwner:liked?t.heartCancel:t.heart}>
              {liked
                ? <svg width="20" height="20" viewBox="0 0 24 24" fill="#C0625A"><path d="M12 21C12 21 3 14.5 3 8.5C3 5.42 5.42 3 8.5 3C10.04 3 11.41 3.78 12 5.03C12.59 3.78 13.96 3 15.5 3C18.58 3 21 5.42 21 8.5C21 14.5 12 21 12 21Z"/></svg>
                : <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 21C12 21 3 14.5 3 8.5C3 5.42 5.42 3 8.5 3C10.04 3 11.41 3.78 12 5.03C12.59 3.78 13.96 3 15.5 3C18.58 3 21 5.42 21 8.5C21 14.5 12 21 12 21Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>
              }
              {likeCount>0 && <span style={{ fontSize:"0.75rem", marginLeft:"1px", fontFamily:"'DM Sans',sans-serif" }}>{likeCount}</span>}
            </button>

            {/* 즐겨찾기 */}
            {onBookmark && (
              <button className={`card-action-btn bookmark ${isBookmarked?"saved":""}`} onClick={() => onBookmark(recipe.id)} title={isBookmarked?t.bookmarkRemove:t.bookmarkAdd}>
                {isBookmarked
                  ? <svg width="18" height="20" viewBox="0 0 18 22" fill="currentColor"><path d="M1 2a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v19l-8-5-8 5V2z"/></svg>
                  : <svg width="18" height="20" viewBox="0 0 18 22" fill="none"><path d="M1 2a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v19l-8-5-8 5V2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>
                }
              </button>
            )}

            {/* 복사해서 기록하기 */}
            {currentUser && onCopyRecipe && (
              <button className="card-action-btn" onClick={() => onCopyRecipe(recipe)} title={lang==="en"?"Copy & record":"복사해서 기록하기"}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <rect x="9" y="9" width="11" height="13" rx="2" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M14.5 13.5v5M12 16h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              </button>
            )}

            {/* 비교 */}
            {currentUser && onCompare && (
              <button className="card-action-btn" onClick={() => onCompare(recipe)} title={lang==="en"?"Compare":"레시피 비교"}>
                <svg width="20" height="20" viewBox="0 0 22 20" fill="none">
                  <rect x="1" y="3" width="8" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                  <line x1="3" y1="7" x2="7" y2="7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  <line x1="3" y1="10" x2="7" y2="10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  <rect x="13" y="3" width="8" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                  <line x1="15" y1="7" x2="19" y2="7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  <line x1="15" y1="10" x2="19" y2="10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  <text x="11" y="11.5" textAnchor="middle" fontSize="5" fontWeight="700" fill="currentColor" fontFamily="DM Sans,sans-serif">vs</text>
                </svg>
              </button>
            )}

            {/* 공유 */}
            <button className="card-action-btn"
              onClick={async () => {
                try {
                  const { default: html2canvas } = await import("html2canvas");

                  // ── 헬퍼 ──────────────────────────────────────────
                  const WATER_LABELS = { tap:"수돗물", filter:"정수기", bottle:"생수", other:"기타" };
                  const ROAST_NAMES  = { green:"생두", cinnamon:"시나몬", medium:"미디엄", high:"하이", city:"시티", full_city:"풀 시티", french:"프렌치", italian:"이탈리안" };
                  const FLAVOR_KO    = { flavorAcidity:"산미", flavorSweet:"단맛", flavorBitter:"쓴맛", flavorAroma:"아로마", flavorAftertaste:"후미", flavorBalance:"밸런스", flavorBody:"바디" };

                  // 라벨·값 행 빌더 (값 없으면 생략)
                  const row = (label, value) => {
                    if (!value && value !== 0) return "";
                    return `<tr>
                      <td style="width:38%;padding:7px 10px 7px 18px;font-size:10px;font-weight:600;color:#9C8E82;text-align:right;white-space:nowrap;">${label}</td>
                      <td style="width:4px;padding:7px 0;"><div style="width:1px;height:100%;background:#ECEAE7;margin:auto;"></div></td>
                      <td style="width:62%;padding:7px 18px 7px 12px;font-size:12px;color:#1A1614;">${value}</td>
                    </tr>`;
                  };

                  // 추출 수치 4칸 그리드 셀
                  const statCell = (val, unit, label) => `
                    <div style="text-align:center;background:#FAFAF9;border:1px solid #ECEAE7;border-radius:8px;padding:10px 4px;">
                      <div style="font-size:17px;font-weight:700;color:#1A1614;font-family:'Georgia',serif;line-height:1;">${val||"—"}<span style="font-size:10px;font-weight:400;color:#9C8E82;margin-left:1px;">${val?unit:""}</span></div>
                      <div style="font-size:9px;color:#9C8E82;margin-top:4px;">${label}</div>
                    </div>`;

                  // 별점
                  const stars = recipe.rating > 0
                    ? [1,2,3,4,5].map(s => `<span style="font-size:14px;color:${s<=recipe.rating?"#B07D54":"#E8E6E3"}">${s<=recipe.rating?"★":"☆"}</span>`).join("") : "";

                  // 플레이버 레이더 SVG
                  const FKEYS = ["flavorAcidity","flavorSweet","flavorBitter","flavorAroma","flavorAftertaste","flavorBalance","flavorBody"];
                  const hasRadar = FKEYS.some(k => (parseInt(recipe[k])||0) > 0);
                  const radarSVG = (() => {
                    if (!hasRadar) return "";
                    const SIZE=260, cx=130, cy=130, R=80, n=FKEYS.length;
                    const pt = (i,r) => { const a=-Math.PI/2+2*Math.PI*i/n; return [cx+r*Math.cos(a),cy+r*Math.sin(a)]; };
                    const grids = [1,2,3,4,5].map(l => {
                      const r=R*l/5, pts=FKEYS.map((_,i)=>pt(i,r).join(",")).join(" ");
                      return `<polygon points="${pts}" fill="${l%2===0?"#F5F3F0":"none"}" stroke="#DEDAD6" stroke-width="1"/>`;
                    }).join("");
                    const axes = FKEYS.map((_,i) => { const [x,y]=pt(i,R); return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#DEDAD6" stroke-width="1"/>`; }).join("");
                    const datapts = FKEYS.map((k,i) => { const v=parseInt(recipe[k])||0; const r=v>0?(v/5)*R:0.5; return pt(i,r).join(","); }).join(" ");
                    const dots = FKEYS.map((k,i) => { const v=parseInt(recipe[k])||0; if(!v) return ""; const [x,y]=pt(i,(v/5)*R); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="#B07D54" stroke="white" stroke-width="1.5"/>`; }).join("");
                    const labels = FKEYS.map((k,i) => {
                      const [x,y]=pt(i,R+16);
                      const anchor=x<cx-4?"end":x>cx+4?"start":"middle";
                      return `<text x="${x.toFixed(1)}" y="${(y+4).toFixed(1)}" text-anchor="${anchor}" font-size="10" fill="#6B5E54" font-family="DM Sans,sans-serif">${FLAVOR_KO[k]||k}</text>`;
                    }).join("");
                    return `<svg width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg">${grids}${axes}<polygon points="${datapts}" fill="#B07D54" fill-opacity="0.2" stroke="#B07D54" stroke-width="2" stroke-linejoin="round"/>${dots}${labels}</svg>`;
                  })();

                  // 장비 / 원두 정보
                  const waterLabel = recipe.waterType
                    ? [WATER_LABELS[recipe.waterType]||recipe.waterType, recipe.waterBrand].filter(Boolean).join(" ") : "";
                  const diluteLabel = recipe.diluteType
                    ? [(recipe.diluteType==="기타우유"?recipe.diluteCustom||"기타":recipe.diluteType), recipe.diluteMl?`${recipe.diluteMl}ml`:"" ].filter(Boolean).join(" ") : "";
                  const menuLabel = recipe.menuLabel || "";
                  const tempLabel = recipe.isIced ? "ICE" : "HOT";
                  const roastLabel = recipe.roastLevel ? (ROAST_NAMES[recipe.roastLevel]||recipe.roastLevel) : "";
                  const weatherLabel = recipe.weather ? `${recipe.weather.icon||""} ${recipe.weather.descKo||recipe.weather.condition||""} ${recipe.weather.temp||""}°C · 습도 ${recipe.weather.humidity||""}%` : "";
                  const infusionLabel = recipe.infusionSeconds && parseInt(recipe.infusionSeconds)>0
                    ? `인퓨전 ${recipe.infusionSeconds}s + 추출 ${parseInt(recipe.seconds||0)-parseInt(recipe.infusionSeconds)}s` : "";

                  // ── DOM 조립 ──────────────────────────────────────
                  const el = document.createElement("div");
                  el.style.cssText = "position:absolute;left:-9999px;top:0;width:420px;overflow:hidden;background:#FBFBFA;font-family:'DM Sans',Arial,sans-serif;border-radius:16px;box-sizing:border-box;";

                  el.innerHTML = `
                    <!-- 헤더 -->
                    <div style="background:#1A1614;padding:20px 20px 18px;border-radius:16px 16px 0 0;">
                      <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
                        <svg width="16" height="16" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="9" cy="9" r="8" stroke="#FBFBFA" stroke-width="1.5"/>
                          <path d="M5 9.5c1-2 3-3 4-2s3 3 4 1" stroke="#B07D54" stroke-width="1.5" stroke-linecap="round"/>
                        </svg>
                        <span style="font-size:10px;color:#FBFBFA60;letter-spacing:0.12em;text-transform:uppercase;font-weight:600;">Brewlog Note</span>
                        ${menuLabel?`<span style="margin-left:auto;font-size:10px;font-weight:700;color:#B07D54;background:#B07D5420;border:1px solid #B07D5440;border-radius:4px;padding:2px 8px;">${menuLabel}</span>`:""}
                        ${recipe.isIced!==undefined&&menuLabel?`<span style="font-size:10px;font-weight:700;color:${recipe.isIced?"#2980b9":"#e67e22"};background:${recipe.isIced?"#2980b920":"#e67e2220"};border:1px solid ${recipe.isIced?"#2980b940":"#e67e2240"};border-radius:4px;padding:2px 8px;">${tempLabel}</span>`:""}
                      </div>
                      <!-- 원두명 -->
                      <div style="font-size:22px;font-weight:700;color:#FBFBFA;font-family:'Georgia',serif;line-height:1.25;margin-bottom:4px;">${recipe.bean||""}</div>
                      <div style="font-size:11px;color:#FBFBFA60;">${[recipe.company, `@${recipe.author||""}`].filter(Boolean).join(" · ")} · ${date}</div>
                      ${stars?`<div style="margin-top:8px;">${stars}</div>`:""}
                    </div>

                    <!-- 핵심 수치 4칸 -->
                    <div style="padding:16px 16px 12px;background:#FBFBFA;">
                      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:${infusionLabel?"6px":"0"};">
                        ${statCell(recipe.gram,"g","원두량")}
                        ${statCell(recipe.seconds,"s","추출시간")}
                        ${statCell(recipe.espressoMl,"ml","추출량")}
                        ${statCell(recipe.waterTemp,"°C","물온도")}
                      </div>
                      ${infusionLabel?`<div style="font-size:10px;color:#9C8E82;text-align:center;margin-top:2px;">${infusionLabel}</div>`:""}
                    </div>

                    <!-- 상세 정보 테이블 -->
                    <table style="width:100%;border-collapse:collapse;background:#FAFAF9;border-top:1px solid #ECEAE7;">
                      <tbody>
                        ${row("머신", recipe.machine)}
                        ${row("그라인더", recipe.grinder)}
                        ${row("분쇄도", recipe.grindSize)}
                        ${row("원두 회사", recipe.company)}
                        ${row("가공법", recipe.process)}
                        ${row("배전도", roastLabel)}
                        ${row("로스팅일", recipe.roastDate)}
                        ${row("기록일", recipe.recordDate)}
                        ${row("물 종류", waterLabel)}
                        ${row("희석", diluteLabel)}
                        ${recipe.showerBar&&recipe.machineType!=="handdrip"?row("예상압력", `${recipe.showerBar} BAR`):""}
                        ${recipe.brewPressureBar?row("측정압력", `${recipe.brewPressureBar} BAR`):""}
                        ${recipe.syrup?row("시럽", recipe.syrup):""}
                        ${weatherLabel?row("날씨", weatherLabel):""}
                        ${recipe.continuousMemo?row("추출 메모", recipe.continuousMemo):""}
                      </tbody>
                    </table>

                    <!-- 플레이버 레이더 -->
                    ${hasRadar?`
                    <div style="background:#FAFAF9;padding:16px 0 8px;border-top:1px solid #ECEAE7;">
                      <div style="font-size:9px;font-weight:700;color:#BBB;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;padding:0 20px;">Flavor Profile</div>
                      <div style="display:flex;justify-content:center;">${radarSVG}</div>
                    </div>`:""}

                    <!-- 메모 노트 -->
                    ${recipe.note?`
                    <div style="margin:0;padding:14px 18px;background:#FAFAF9;border-top:1px solid #ECEAE7;">
                      <div style="font-size:10px;font-weight:700;color:#9C8E82;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">Note</div>
                      <div style="font-size:12px;color:#3D2B1F;line-height:1.7;border-left:3px solid #B07D54;padding-left:12px;font-style:italic;">&quot;${recipe.note}&quot;</div>
                    </div>`:""}

                    <!-- 태그 -->
                    ${(recipe.tags||[]).length>0?`
                    <div style="padding:10px 18px;background:#FAFAF9;border-top:1px solid #ECEAE7;display:flex;flex-wrap:wrap;gap:5px;">
                      ${(recipe.tags||[]).map(tag=>`<span style="font-size:10px;color:#B07D54;background:#B07D5415;border:1px solid #B07D5430;border-radius:999px;padding:2px 9px;">#${tag}</span>`).join("")}
                    </div>`:""}

                    <!-- 푸터 -->
                    <div style="background:#ECEAE7;padding:10px 20px;border-radius:0 0 16px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;">
                      <div>
                        <div style="font-size:9px;font-weight:700;color:#5C4033;text-transform:uppercase;letter-spacing:0.08em;">Brewlog Note</div>
                        <div style="font-size:9px;color:#8C8480;">brewlog-jade.vercel.app</div>
                      </div>
                      <div style="display:flex;flex-direction:column;align-items:center;gap:3px;">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=52x52&data=https://brewlog-jade.vercel.app&bgcolor=ECEAE7&color=3D2B1F&margin=2"
                          width="52" height="52" style="border-radius:4px;display:block;" crossorigin="anonymous"/>
                        <span style="font-size:7px;color:#B07D54;font-weight:600;letter-spacing:0.06em;">SCAN TO BREW</span>
                      </div>
                    </div>
                  `;

                  document.body.appendChild(el);
                  await new Promise(r => setTimeout(r, 900));
                  const canvas = await html2canvas(el, { scale:2, useCORS:true, allowTaint:false, backgroundColor:"#FBFBFA", logging:false });
                  document.body.removeChild(el);
                  const blob = await new Promise(resolve => canvas.toBlob(resolve,"image/png"));
                  const file = new File([blob], `${recipe.bean||"recipe"}_brewlog.png`, { type:"image/png" });
                  if (navigator.share && navigator.canShare?.({ files:[file] })) {
                    try { await navigator.share({ files:[file], title:`${recipe.bean||""} 레시피`, text:"Brewlog Note에서 기록한 레시피예요.\nhttps://brewlog-jade.vercel.app" }); }
                    catch(e) { if(e.name!=="AbortError") throw e; }
                  } else {
                    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${recipe.bean||"recipe"}_brewlog.png`; a.click();
                    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
                  }
                } catch(e) { console.error("[share]",e); alert(lang==="en"?"Share failed.":"공유에 실패했어요."); }
              }}
              title={lang==="en"?"Share recipe":"레시피 공유"}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="18" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.6"/><circle cx="18" cy="19" r="2.5" stroke="currentColor" strokeWidth="1.6"/><circle cx="6" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.6"/><path d="M8.3 10.8l7.4-4.2M8.3 13.2l7.4 4.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
            </button>

            {/* 수정/삭제 (본인) */}
            {isOwner && (
              <>
                <button className="card-action-btn edit" onClick={()=>{ onClose(); onEdit(recipe); }} title={lang==="en"?"Edit":"수정"}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M16.5 3.5l4 4-11 11H5.5v-4l11-11z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M14 6l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
                </button>
                <button className="card-action-btn delete" onClick={()=>{ onClose(); onDelete(recipe.id); }} title={lang==="en"?"Delete":"삭제"}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M9 6V4h6v2M10 11v6M14 11v6M5 6l1 14h12L19 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </>
            )}

            {/* ··· 더보기 (타인) */}
            {!isOwner && currentUser && (
              <div style={{ position:"relative" }}>
                <button className="card-action-btn" onClick={()=>setShowMore(v=>!v)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>
                </button>
                {showMore && (
                  <>
                    <div style={{ position:"fixed", inset:0, zIndex:9998 }} onClick={()=>setShowMore(false)}/>
                    <div style={{ position:"absolute", right:0, bottom:"calc(100% + 6px)", background:"var(--foam)", border:"1px solid var(--divider)", borderRadius:"10px", boxShadow:"0 4px 20px #0002", zIndex:9999, minWidth:"160px", overflow:"hidden" }}>
                      <button onClick={()=>{ setShowMore(false); setShowReport({ type:"recipe", targetId:recipe.id }); }}
                        style={{ width:"100%", padding:"12px 16px", background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:"10px", fontFamily:"'DM Sans',sans-serif", fontSize:"0.85rem", color:"#e74c3c", textAlign:"left" }}
                        onMouseEnter={e=>e.currentTarget.style.background="#fdecea"} onMouseLeave={e=>e.currentTarget.style.background="none"}>
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2L1 14h14L8 2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/><path d="M8 6v4M8 11.5v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                        {lang==="en"?"Report":"신고하기"}
                      </button>
                      <div style={{ height:"1px", background:"var(--divider)", margin:"0 12px" }}/>
                      <button onClick={isBlocked?handleUnblock:handleBlock} disabled={blockLoading}
                        style={{ width:"100%", padding:"12px 16px", background:"none", border:"none", cursor:blockLoading?"not-allowed":"pointer", display:"flex", alignItems:"center", gap:"10px", fontFamily:"'DM Sans',sans-serif", fontSize:"0.85rem", color:isBlocked?"var(--muted)":"var(--espresso)", textAlign:"left", opacity:blockLoading?0.5:1 }}
                        onMouseEnter={e=>{ if(!blockLoading) e.currentTarget.style.background="var(--cream)"; }} onMouseLeave={e=>e.currentTarget.style.background="none"}>
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/>{isBlocked?<path d="M5 8h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>:<path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>}</svg>
                        {blockLoading?(lang==="en"?"Processing…":"처리 중…"):isBlocked?(lang==="en"?`Unblock @${recipe.author}`:`@${recipe.author} 차단 해제`):(lang==="en"?`Block @${recipe.author}`:`@${recipe.author} 차단하기`)}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 댓글 섹션 */}
        <div style={{ borderTop:"1px solid var(--steam)", marginTop:"1.2rem", paddingTop:"1rem" }}>
          <div style={{ fontSize:"0.82rem", fontWeight:600, color:"var(--espresso)", marginBottom:"0.8rem" }}>
            💬 {t.comments} {comments.length>0?`(${comments.length})`:""}
          </div>
          {comments.length>0 && (
            <div style={{ display:"flex", flexDirection:"column", gap:"0.5rem", marginBottom:"0.8rem", maxHeight:"300px", overflowY:"auto" }}>
              {comments.filter(c=>!c.parentId).map(c => (
                <div key={c.id}>
                  <div style={{ background:"var(--foam)", borderRadius:"6px", padding:"0.6rem 0.8rem", fontSize:"0.85rem" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:"0.5rem" }}>
                      <div>
                        <span style={{ fontWeight:600, color:"var(--espresso)", marginRight:"0.4rem" }}>@{c.author}</span>
                        <span style={{ color:"var(--muted)", fontSize:"0.72rem" }}>{c.createdAt?.toDate?.()?.toLocaleDateString(lang==="ko"?"ko-KR":"en-US")||""}</span>
                      </div>
                      <div style={{ display:"flex", gap:"0.4rem", alignItems:"center", flexShrink:0 }}>
                        {currentUser && <button onClick={()=>setReplyTo(replyTo?.id===c.id?null:{id:c.id,author:c.author,uid:c.uid})} style={{ background:"none", border:"none", color:replyTo?.id===c.id?"var(--accent)":"var(--muted)", fontSize:"0.72rem", cursor:"pointer", padding:0, fontFamily:"'DM Sans',sans-serif" }}>{lang==="en"?"Reply":"답글"}</button>}
                        {c.uid===currentUid && editingId!==c.id && <button onClick={()=>startEdit(c)} style={{ background:"none", border:"none", color:"var(--muted)", fontSize:"0.72rem", cursor:"pointer", padding:0, fontFamily:"'DM Sans',sans-serif" }}>{lang==="en"?"Edit":"수정"}</button>}
                        {c.uid===currentUid && <button onClick={()=>deleteComment(c.id)} style={{ background:"none", border:"none", color:"var(--muted)", fontSize:"0.72rem", cursor:"pointer", padding:0 }}>{t.commentDelete}</button>}
                        {c.uid!==currentUid && currentUser && <button onClick={()=>setShowReport({type:"comment",targetId:c.id})} style={{ background:"none", border:"1px solid #e74c3c40", borderRadius:"2px", color:"#e74c3c", fontSize:"0.68rem", cursor:"pointer", padding:"0.05rem 0.35rem", fontFamily:"'DM Sans',sans-serif" }}>{lang==="en"?"Report":"신고"}</button>}
                      </div>
                    </div>
                    {editingId===c.id ? (
                      <div style={{ marginTop:"0.4rem", display:"flex", flexDirection:"column", gap:"0.4rem" }}>
                        <input value={editText} onChange={e=>setEditText(e.target.value)}
                          onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();saveEdit(c.id);} if(e.key==="Escape")cancelEdit(); }}
                          autoFocus
                          style={{ width:"100%", padding:"0.5rem 0.7rem", border:"1px solid var(--latte)", borderRadius:"6px", fontFamily:"'DM Sans',sans-serif", fontSize:"0.85rem", background:"var(--cream)", color:"var(--espresso)", outline:"none", boxSizing:"border-box" }}/>
                        <div style={{ display:"flex", gap:"0.4rem", justifyContent:"flex-end" }}>
                          <button onClick={cancelEdit} style={{ padding:"0.3rem 0.7rem", border:"1px solid var(--steam)", borderRadius:"6px", background:"none", color:"var(--muted)", fontSize:"0.72rem", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>{lang==="en"?"Cancel":"취소"}</button>
                          <button onClick={()=>saveEdit(c.id)} disabled={!editText.trim()} style={{ padding:"0.3rem 0.9rem", border:"none", borderRadius:"6px", background:"var(--latte)", color:"white", fontSize:"0.72rem", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontWeight:600, opacity:editText.trim()?1:0.5 }}>{lang==="en"?"Save":"저장"}</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ color:"var(--espresso)", marginTop:"0.25rem", lineHeight:1.5 }}>
                        {c.text}{c.editedAt && <span style={{ color:"var(--muted)", fontSize:"0.65rem", marginLeft:"0.4rem" }}>{lang==="en"?"(edited)":"(수정됨)"}</span>}
                      </div>
                    )}
                  </div>
                  {comments.filter(r=>r.parentId===c.id).map(r => (
                    <div key={r.id} style={{ marginLeft:"1.2rem", marginTop:"0.3rem", background:"var(--cream)", borderLeft:"2px solid var(--latte)", borderRadius:"0 6px 6px 0", padding:"0.5rem 0.8rem", fontSize:"0.82rem" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:"0.5rem" }}>
                        <div>
                          <span style={{ fontWeight:600, color:"var(--espresso)", marginRight:"0.3rem" }}>@{r.author}</span>
                          <span style={{ color:"var(--latte)", fontSize:"0.7rem", marginRight:"0.3rem" }}>→ @{r.parentAuthor}</span>
                          <span style={{ color:"var(--muted)", fontSize:"0.7rem" }}>{r.createdAt?.toDate?.()?.toLocaleDateString(lang==="ko"?"ko-KR":"en-US")||""}</span>
                        </div>
                        <div style={{ display:"flex", gap:"0.4rem", alignItems:"center", flexShrink:0 }}>
                          {currentUser && <button onClick={()=>setReplyTo(replyTo?.id===c.id&&replyTo?.author===r.author?null:{id:c.id,author:r.author,uid:r.uid})} style={{ background:"none", border:"none", color:(replyTo?.id===c.id&&replyTo?.author===r.author)?"var(--accent)":"var(--muted)", fontSize:"0.7rem", cursor:"pointer", padding:0, fontFamily:"'DM Sans',sans-serif" }}>{lang==="en"?"Reply":"답글"}</button>}
                          {r.uid===currentUid && editingId!==r.id && <button onClick={()=>startEdit(r)} style={{ background:"none", border:"none", color:"var(--muted)", fontSize:"0.7rem", cursor:"pointer", padding:0, fontFamily:"'DM Sans',sans-serif" }}>{lang==="en"?"Edit":"수정"}</button>}
                          {r.uid===currentUid && <button onClick={()=>deleteComment(r.id)} style={{ background:"none", border:"none", color:"var(--muted)", fontSize:"0.7rem", cursor:"pointer", padding:0 }}>{t.commentDelete}</button>}
                          {r.uid!==currentUid && currentUser && <button onClick={()=>setShowReport({type:"comment",targetId:r.id})} style={{ background:"none", border:"1px solid #e74c3c40", borderRadius:"2px", color:"#e74c3c", fontSize:"0.65rem", cursor:"pointer", padding:"0.05rem 0.3rem", fontFamily:"'DM Sans',sans-serif" }}>{lang==="en"?"Report":"신고"}</button>}
                        </div>
                      </div>
                      {editingId===r.id ? (
                        <div style={{ marginTop:"0.3rem", display:"flex", flexDirection:"column", gap:"0.35rem" }}>
                          <input value={editText} onChange={e=>setEditText(e.target.value)}
                            onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();saveEdit(r.id);} if(e.key==="Escape")cancelEdit(); }}
                            autoFocus
                            style={{ width:"100%", padding:"0.45rem 0.65rem", border:"1px solid var(--latte)", borderRadius:"6px", fontFamily:"'DM Sans',sans-serif", fontSize:"0.8rem", background:"var(--foam)", color:"var(--espresso)", outline:"none", boxSizing:"border-box" }}/>
                          <div style={{ display:"flex", gap:"0.35rem", justifyContent:"flex-end" }}>
                            <button onClick={cancelEdit} style={{ padding:"0.25rem 0.6rem", border:"1px solid var(--steam)", borderRadius:"6px", background:"none", color:"var(--muted)", fontSize:"0.68rem", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>{lang==="en"?"Cancel":"취소"}</button>
                            <button onClick={()=>saveEdit(r.id)} disabled={!editText.trim()} style={{ padding:"0.25rem 0.8rem", border:"none", borderRadius:"6px", background:"var(--latte)", color:"white", fontSize:"0.68rem", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontWeight:600, opacity:editText.trim()?1:0.5 }}>{lang==="en"?"Save":"저장"}</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ color:"var(--espresso)", marginTop:"0.2rem", lineHeight:1.5 }}>
                          {r.text}{r.editedAt && <span style={{ color:"var(--muted)", fontSize:"0.62rem", marginLeft:"0.4rem" }}>{lang==="en"?"(edited)":"(수정됨)"}</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
          {currentUser ? (
            <div style={{ display:"flex", flexDirection:"column", gap:"0.4rem" }}>
              {replyTo && (
                <div style={{ display:"flex", alignItems:"center", gap:"0.5rem", fontSize:"0.75rem", color:"var(--muted)", background:"var(--cream)", padding:"0.3rem 0.7rem", borderRadius:"999px" }}>
                  <span>↩ @{replyTo.author}에게 답글</span>
                  <button onClick={()=>setReplyTo(null)} style={{ background:"none", border:"none", color:"var(--muted)", cursor:"pointer", padding:0, fontSize:"0.8rem" }}>✕</button>
                </div>
              )}
              <div style={{ display:"flex", gap:"0.5rem" }}>
                <input value={commentText} onChange={e=>setCommentText(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&submitComment()}
                  placeholder={replyTo?`@${replyTo.author}에게 답글…`:t.commentPlaceholder}
                  style={{ flex:1, padding:"0.6rem 0.8rem", border:"1px solid var(--steam)", borderRadius:"999px", fontFamily:"'DM Sans',sans-serif", fontSize:"0.85rem", background:"var(--cream)", color:"var(--espresso)", outline:"none" }}/>
                <button onClick={submitComment} disabled={commentLoading||!commentText.trim()}
                  style={{ padding:"0.6rem 1rem", background:"var(--espresso)", color:"var(--cream)", border:"none", borderRadius:"999px", fontFamily:"'DM Sans',sans-serif", fontSize:"0.82rem", cursor:"pointer", whiteSpace:"nowrap", opacity:commentText.trim()?1:0.5 }}>
                  {t.commentSubmit}
                </button>
              </div>
            </div>
          ) : (
            <button onClick={()=>onRequireAuth?.()} style={{ width:"100%", padding:"0.65rem", background:"none", border:"1px dashed var(--steam)", borderRadius:"2px", color:"var(--muted)", fontFamily:"'DM Sans',sans-serif", fontSize:"0.85rem", cursor:"pointer" }}>
              🔒 {t.commentLogin}
            </button>
          )}
        </div>
      </div>
    </div>
    {showReport && currentUser && (
      <ReportModal type={showReport.type} targetId={showReport.targetId} currentUser={currentUser} lang={lang} onClose={()=>setShowReport(null)}/>
    )}
    </>
  );
}
