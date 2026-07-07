/* ============================================================
   BREWLOG NOTE — src/components/feed/RecipeCard.jsx
   피드 레시피 카드
   ─ 장비/날씨/원두 라벨 그리드
   ─ 하트 / 즐겨찾기 / 복사 / 비교 / 수정 / 삭제
   ─ 팔로우 버튼
   ─ 태그 클릭 필터
   ─ 추출 압력 표시 (showerBar)
   ============================================================ */
import { useState, useEffect } from "react";
import { I18N }       from "../../constants/localization";
import { COFFEE_MENUS } from "../../constants/coffeeMenus";
import { translateFields, hasKorean } from "../../utils/translate";

export default function RecipeCard({
  recipe, currentUid, onDelete, onEdit, onLike, onBookmark,
  isBookmarked, onFollow, isFollowing, onCardClick, onCompare,
  onCopy, onAuthorClick, onTagClick, activeTag, lang = "ko",
}) {
  const t        = I18N[lang];
  const date     = recipe.createdAt?.toDate?.()?.toLocaleDateString(lang==="en"?"en-US":"ko-KR") || "";
  const liked    = (recipe.likedBy||[]).includes(currentUid);
  const likeCount = (recipe.likedBy||[]).length;
  const isOwner  = recipe.uid === currentUid;
  const menuName = lang==="en"
    ? (COFFEE_MENUS.find(m=>m.id===recipe.menuId)?.labelEn||recipe.menuLabel)
    : recipe.menuLabel;

  // ── 영문 모드 자동 번역 (원두명/머신/그라인더/분쇄도/원두회사/물브랜드/메모/시럽) ──
  const [translated, setTranslated] = useState(null);

  useEffect(() => {
    setTranslated(null);
    if (lang !== "en") return;
    const fields = {
      bean: recipe.bean || "", machine: recipe.machine || "", grinder: recipe.grinder || "",
      grindSize: recipe.grindSize || "", company: recipe.company || "", waterBrand: recipe.waterBrand || "",
      note: recipe.note || "", syrup: recipe.syrup || "",
    };
    if (!Object.values(fields).some(v => hasKorean(v))) return;
    let cancelled = false;
    translateFields(fields).then(result => { if (!cancelled) setTranslated(result); });
    return () => { cancelled = true; };
  }, [lang, recipe.bean, recipe.machine, recipe.grinder, recipe.grindSize, recipe.company, recipe.waterBrand, recipe.note, recipe.syrup]);

  const tr = (key, fallback) => translated?.[key] || fallback;

  const waterLabel = (() => {
    if (!recipe.waterType && !recipe.waterBrand) return null;
    const types   = { tap:"수돗물", filter:"정수기", bottle:"생수", other:"기타" };
    const typesEn = { tap:"Tap",   filter:"Filtered", bottle:"Bottled", other:"Other" };
    return [lang==="en"?typesEn[recipe.waterType]:types[recipe.waterType], tr("waterBrand", recipe.waterBrand)].filter(Boolean).join(" · ");
  })();

  // 장비 라벨 행 (label/값 pair)
  const labelRows = [
    recipe.machine   && { lbl: lang==="en"?(recipe.machineType==="handdrip"?"Equipment":"Machine"):(recipe.machineType==="handdrip"?"핸드드립 기구":"커피머신"),
      val: <span>{tr("machine", recipe.machine)}{recipe.machineType&&recipe.machineType!=="handdrip"&&<span style={{ marginLeft:"0.3rem", fontSize:"0.65rem", background:recipe.machineType==="auto"?"var(--latte)":"var(--steam)", color:"var(--espresso)", padding:"0.05rem 0.3rem", borderRadius:"999px" }}>{recipe.machineType==="auto"?(lang==="en"?"Auto":"전자동"):(lang==="en"?"Semi":"반자동")}</span>}</span> },
    recipe.grinder   && { lbl:lang==="en"?"Grinder":"그라인더", val:tr("grinder", recipe.grinder) },
    recipe.grindSize && { lbl:lang==="en"?"Grind":"분쇄도",    val:tr("grindSize", recipe.grindSize) },
    recipe.company   && { lbl:lang==="en"?"Brand":"원두 회사",  val:tr("company", recipe.company) },
    recipe.roastDate && { lbl:lang==="en"?"Roasted":"로스팅",  val:new Date(recipe.roastDate).toLocaleDateString(lang==="en"?"en-US":"ko-KR") },
    recipe.menuLabel && { lbl:lang==="en"?"Menu":"메뉴", val:
      <span style={{ display:"flex", alignItems:"center", gap:"5px" }}>
        {menuName}
        {recipe.isIced
          ? <span style={{ fontSize:"0.6rem", fontWeight:700, color:"#2980b9", background:"#EBF5FB", border:"1px solid #AED6F1", borderRadius:"4px", padding:"1px 5px" }}>ICE</span>
          : COFFEE_MENUS.find(m=>m.id===recipe.menuId)?.canIce
          ? <span style={{ fontSize:"0.6rem", fontWeight:700, color:"#e67e22", background:"#FEF3E8", border:"1px solid #FAD7A0", borderRadius:"4px", padding:"1px 5px" }}>HOT</span> : null}
      </span> },
    recipe.isPublic===false && { lbl:lang==="en"?"Visibility":"공개", val:lang==="en"?"Private":"비공개" },
    waterLabel && { lbl:lang==="en"?"Water":"물 종류", val:waterLabel },
    recipe.weather && { lbl:lang==="en"?"Weather":"날씨", val:`${recipe.weather.icon} ${lang==="en"?(recipe.weather.condition||recipe.weather.descKo):(recipe.weather.descKo||recipe.weather.condition)} ${recipe.weather.temp}°C · ${lang==="en"?"Humidity":"습도"} ${recipe.weather.humidity}%` },
  ].filter(Boolean);

  return (
    <div className="recipe-card" onClick={onCardClick} style={{ cursor:onCardClick?"pointer":"default" }}>

      {/* 라벨 그리드 */}
      <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.72rem", color:"var(--muted)", lineHeight:1.8, marginBottom:"0.6rem", display:"grid", gridTemplateColumns:"auto 1px 1fr", columnGap:"0.6rem", rowGap:"0.1rem", alignItems:"center", textAlign:"left" }}>
        {labelRows.map((row, i) => (
          <span key={i} style={{ display:"contents" }}>
            <span style={{ fontWeight:600, color:"var(--roast)", opacity:0.6, whiteSpace:"nowrap" }}>{row.lbl}</span>
            <span style={{ width:"1px", background:"var(--steam)", alignSelf:"stretch", margin:"0.2rem 0" }}/>
            <span>{row.val}</span>
          </span>
        ))}
      </div>

      {/* 원두명 */}
      <div style={{ borderTop:"1px solid var(--steam)", paddingTop:"0.65rem", marginBottom:"1rem", textAlign:"left" }}>
        <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.72rem", fontWeight:600, color:"var(--roast)", opacity:0.6, marginBottom:"0.15rem" }}>{lang==="en"?"Product":"제품명"}</div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.25rem", fontWeight:700, color:"var(--espresso)", lineHeight:1.25, letterSpacing:"-0.01em" }}>{tr("bean", recipe.bean)}</div>
      </div>

      {/* Stat 박스 */}
      <div className="card-stats" style={{ gridTemplateColumns:"repeat(4,1fr)" }}>
        <div className="stat"><span className="stat-val">{recipe.gram}g</span><span className="stat-label">{t.statGram}</span></div>
        <div className="stat">
          <span className="stat-val">{recipe.seconds}s</span>
          <span className="stat-label">{t.statSeconds}</span>
          {recipe.infusionSeconds && parseInt(recipe.infusionSeconds)>0 && recipe.menuId!=="hand_drip" && (
            <span style={{ fontSize:"0.62rem", color:"var(--muted)", display:"block", lineHeight:1.4, marginTop:"2px" }}>
              {lang==="en"?`Inf. ${recipe.infusionSeconds}s + Ext. ${parseInt(recipe.seconds)-parseInt(recipe.infusionSeconds)}s`:`인퓨전 ${recipe.infusionSeconds}초 + 추출 ${parseInt(recipe.seconds)-parseInt(recipe.infusionSeconds)}초`}
            </span>
          )}
        </div>
        <div className="stat"><span className="stat-val">{recipe.espressoMl}ml</span><span className="stat-label">{t.statMl}</span></div>
        {recipe.waterTemp && <div className="stat"><span className="stat-val">{recipe.waterTemp}°C</span><span className="stat-label">{lang==="en"?"Temp":"물온도"}</span></div>}
      </div>

      {recipe.diluteMl && (
        <div className="card-dilution">
          {lang==="en"?(recipe.diluteType==="물"?"Water":recipe.diluteType==="우유"?"Milk":recipe.diluteType):recipe.diluteType} {recipe.diluteMl}ml {t.dilution}
        </div>
      )}
      {recipe.syrup && <div className="card-dilution">{tr("syrup", recipe.syrup)}</div>}

      {/* 압력 표시 */}
      {recipe.showerBar && recipe.machineType!=="handdrip" && (
        <div style={{
          fontSize:"0.78rem", padding:"0.4rem 0.8rem", borderRadius:"6px", marginBottom:"0.5rem",
          background: recipe.showerBar>=9&&recipe.showerBar<=11?"#27ae6010":"#e74c3c10",
          color:      recipe.showerBar>=9&&recipe.showerBar<=11?"#27ae60":"#e74c3c",
          border: `1px solid ${recipe.showerBar>=9&&recipe.showerBar<=11?"#27ae6025":"#e74c3c25"}`,
          display:"flex", justifyContent:"space-between", alignItems:"center",
        }}>
          <span>{t.brewPressure}</span>
          <span style={{ fontWeight:600 }}>{recipe.showerBar} bar {recipe.showerBar>=9&&recipe.showerBar<=11?"· OK":"· Check"}</span>
        </div>
      )}

      {/* 별점 */}
      {recipe.rating>0 && (
        <div style={{ display:"flex", gap:"0.15rem", marginBottom:"0.5rem" }}>
          {[1,2,3,4,5].map(s=><span key={s} style={{ fontSize:"1rem", color:s<=recipe.rating?"var(--latte)":"var(--steam)" }}>{s<=recipe.rating?"★":"☆"}</span>)}
        </div>
      )}

      {recipe.note && <div className="card-note">"{tr("note", recipe.note)}"</div>}

      {/* 푸터 */}
      <div className="card-footer" style={{ flexDirection:"column", alignItems:"flex-start", gap:"0.5rem" }}>
        {/* 닉네임 + 구독 + 날짜 */}
        <div style={{ display:"flex", alignItems:"center", gap:"0.4rem", flexWrap:"wrap", width:"100%" }}>
          <span className="card-author"
            onClick={e=>{ e.stopPropagation(); onAuthorClick&&onAuthorClick({ uid:recipe.uid, name:recipe.author }); }}
            style={{ cursor:onAuthorClick?"pointer":"default" }}>
            @{recipe.author}
          </span>
          {recipe.author && recipe.uid!==currentUid && onFollow && (
            <button className={`follow-btn ${isFollowing?"following":""}`}
              onClick={e=>{ e.stopPropagation(); onFollow(recipe.uid||recipe.author); }}
              title={isFollowing?t.following:t.follow}>
              {isFollowing
                ? <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                    <circle cx="8" cy="6" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M2 17c0-3.314 2.686-5 6-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M13 13l2 2 3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                : <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                    <circle cx="8" cy="6" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M2 17c0-3.314 2.686-5 6-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M15 11v5M12.5 13.5h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                  </svg>
              }
            </button>
          )}
          <span style={{ color:"var(--muted)", fontSize:"0.72rem" }}>· {date}</span>
        </div>

        {/* 액션 버튼 */}
        <div className="card-actions" style={{ width:"100%" }}>
          {/* 하트 */}
          <button className={`card-action-btn heart ${liked?"liked":""}`}
            onClick={e=>{ e.stopPropagation(); !isOwner&&onLike(recipe); }}
            style={{ cursor:isOwner?"default":"pointer", opacity:isOwner?0.4:1 }}
            title={isOwner?t.heartOwner:liked?t.heartCancel:t.heart}>
            {liked
              ? <svg width="20" height="20" viewBox="0 0 24 24" fill="#C0625A"><path d="M12 21C12 21 3 14.5 3 8.5C3 5.42 5.42 3 8.5 3C10.04 3 11.41 3.78 12 5.03C12.59 3.78 13.96 3 15.5 3C18.58 3 21 5.42 21 8.5C21 14.5 12 21 12 21Z"/></svg>
              : <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 21C12 21 3 14.5 3 8.5C3 5.42 5.42 3 8.5 3C10.04 3 11.41 3.78 12 5.03C12.59 3.78 13.96 3 15.5 3C18.58 3 21 5.42 21 8.5C21 14.5 12 21 12 21Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>
            }
            {likeCount>0 && <span style={{ fontSize:"0.72rem", marginLeft:"1px", fontFamily:"'DM Sans',sans-serif" }}>{likeCount}</span>}
          </button>

          {/* 즐겨찾기 */}
          <button className={`card-action-btn bookmark ${isBookmarked?"saved":""}`}
            onClick={e=>{ e.stopPropagation(); onBookmark(recipe.id); }}
            title={isBookmarked?t.bookmarkRemove:t.bookmarkAdd}>
            {isBookmarked
              ? <svg width="18" height="20" viewBox="0 0 18 22" fill="currentColor"><path d="M1 2a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v19l-8-5-8 5V2z"/></svg>
              : <svg width="18" height="20" viewBox="0 0 18 22" fill="none"><path d="M1 2a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v19l-8-5-8 5V2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>
            }
          </button>

          {/* 복사 */}
          {currentUid && onCopy && (
            <button className="card-action-btn" onClick={e=>{ e.stopPropagation(); onCopy(recipe); }} title={lang==="en"?"Copy & record":"복사해서 기록하기"}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect x="9" y="9" width="11" height="13" rx="2" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14.5 13.5v5M12 16h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </button>
          )}

          {/* 비교 */}
          {currentUid && onCompare && (
            <button className="card-action-btn" onClick={e=>{ e.stopPropagation(); onCompare(recipe); }} title={lang==="en"?"Compare":"레시피 비교"}>
              <svg width="20" height="20" viewBox="0 0 22 20" fill="none">
                <rect x="1" y="3" width="8" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                <line x1="3" y1="7" x2="7" y2="7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                <rect x="13" y="3" width="8" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                <line x1="15" y1="7" x2="19" y2="7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                <text x="11" y="11.5" textAnchor="middle" fontSize="5" fontWeight="700" fill="currentColor" fontFamily="DM Sans,sans-serif">vs</text>
              </svg>
            </button>
          )}

          {/* 수정/삭제 */}
          {isOwner && (
            <>
              <button className="card-action-btn edit" onClick={e=>{ e.stopPropagation(); onEdit(recipe); }} title={lang==="en"?"Edit":"수정"}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M16.5 3.5l4 4-11 11H5.5v-4l11-11z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M14 6l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
              </button>
              <button className="card-action-btn delete" onClick={e=>{ e.stopPropagation(); onDelete(recipe.id); }} title={lang==="en"?"Delete":"삭제"}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M9 6V4h6v2M10 11v6M14 11v6M5 6l1 14h12L19 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
