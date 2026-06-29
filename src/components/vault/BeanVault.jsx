/* ============================================================
   BREWLOG NOTE — src/components/vault/BeanVault.jsx
   원두 창고 (Bean Vault)
   ─ BeanModal  : 원두 추가/수정 모달 (내부 서브컴포넌트)
   ─ BeanVault  : 원두 목록 + 통계 대시보드 + 신선도 바
   ─ EquipmentModal : 장비 추가/수정 (내부 서브컴포넌트)
   ─ EquipmentVault : 장비 목록 + 대표 장비 설정
   ============================================================ */
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, query, where, serverTimestamp,
} from "firebase/firestore";
import { db } from "../../config/firebase";
import { I18N }      from "../../constants/localization";
import { ROAST_LEVELS, PROCESS_PRESETS } from "../../constants/coffeeMenus";
import {
  MACHINE_BRANDS, GRINDER_BRANDS,
  loadCurrency, loadCachedRate,
  fetchUsdRate, formatPrice, formatPricePerG, formatCostPerCup,
} from "../../utils/storage";
import { BrandInput } from "../ui";

// ─────────────────────────────────────────────────────────────────
// EquipmentModal — 내부 서브컴포넌트
// ─────────────────────────────────────────────────────────────────
function EquipmentModal({ lang, user, editTarget, onClose, onSaved }) {
  const t = I18N[lang];
  const CATEGORIES = [
    { id:"machine",  labelKo:"커피 머신",  labelEn:"Coffee Machine", color:"#e67e22" },
    { id:"grinder",  labelKo:"그라인더",   labelEn:"Grinder",        color:"#27ae60" },
    { id:"handdrip", labelKo:"핸드드립",   labelEn:"Hand Drip",      color:"#2980b9" },
    { id:"other",    labelKo:"기타",       labelEn:"Other",           color:"#8C8480" },
  ];
  const empty = { category:"machine", brand:"", model:"", purchaseDate:"", price:"", note:"", isPrimary:false };
  const [form,   setForm]   = useState(editTarget ? { ...empty, ...editTarget } : empty);
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setForm(f => ({ ...f, [k]:v }));

  const getBrands = () => {
    if (form.category==="machine") return MACHINE_BRANDS;
    if (form.category==="grinder") return GRINDER_BRANDS;
    return [];
  };

  const handleSave = async () => {
    if (!form.brand.trim()) return alert(lang==="en"?"Please enter a brand.":"브랜드를 입력해주세요.");
    setSaving(true);
    try {
      const payload = { ...form, uid:user.uid, updatedAt:serverTimestamp() };
      if (editTarget?.id) {
        await updateDoc(doc(db,"equipments",editTarget.id), payload);
      } else {
        await addDoc(collection(db,"equipments"), { ...payload, createdAt:serverTimestamp() });
      }
      onSaved(); onClose();
    } catch(e) { alert("저장 오류: "+e.message); }
    setSaving(false);
  };

  return (
    <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{ maxWidth:"420px" }}>
        <h2>{editTarget?t.equipEdit:t.equipAdd}</h2>
        <div className="modal-grid">
          {/* 장비 종류 */}
          <div className="field full">
            <label>{lang==="en"?"Category":"장비 종류"}</label>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px" }}>
              {CATEGORIES.map(c=>(
                <button key={c.id} type="button" onClick={()=>{ set("category",c.id); set("brand",""); set("model",""); }}
                  style={{ height:"42px", border:"1px solid", borderRadius:"8px", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontSize:"0.85rem", transition:"all 0.2s",
                    borderColor: form.category===c.id?"var(--espresso)":"var(--steam)",
                    background:  form.category===c.id?"var(--espresso)":"var(--foam)",
                    color:       form.category===c.id?"var(--cream)":"var(--muted)",
                    fontWeight:  form.category===c.id?600:400 }}>
                  {lang==="en"?c.labelEn:c.labelKo}
                </button>
              ))}
            </div>
          </div>
          {/* 브랜드 */}
          <div className="field full">
            <label>{lang==="en"?"Brand *":"브랜드 *"}</label>
            {getBrands().length>0
              ? <BrandInput value={form.brand} onChange={v=>set("brand",v)} brands={getBrands()}/>
              : <input value={form.brand} onChange={e=>set("brand",e.target.value)} placeholder={lang==="en"?"e.g. Hario, Kalita…":"예) 하리오, 칼리타…"}/>
            }
          </div>
          {/* 모델명 */}
          <div className="field full">
            <label>{lang==="en"?"Model":"모델명"}</label>
            <input value={form.model} onChange={e=>set("model",e.target.value)}
              placeholder={form.category==="machine"?(lang==="en"?"e.g. Barista Express Pro":"예) Barista Express Pro"):form.category==="grinder"?(lang==="en"?"e.g. Encore, C40":"예) 엔코어, C40"):form.category==="handdrip"?(lang==="en"?"e.g. V60, Chemex":"예) V60 02, 케멕스"):(lang==="en"?"Model name":"모델명")}/>
          </div>
          <div className="field">
            <label>{t.equipPurchaseDate}</label>
            <input type="date" value={form.purchaseDate} onChange={e=>set("purchaseDate",e.target.value)}/>
          </div>
          <div className="field">
            <label>{lang==="en"?"Purchase Price":"구매 가격"}</label>
            <div style={{ position:"relative" }}>
              <span style={{ position:"absolute", left:"12px", top:"50%", transform:"translateY(-50%)", fontSize:"0.88rem", color:"var(--muted)", pointerEvents:"none" }}>₩</span>
              <input type="number" value={form.price} onChange={e=>set("price",e.target.value)} placeholder="0" min="0" style={{ paddingLeft:"28px", width:"100%", boxSizing:"border-box" }}/>
            </div>
          </div>
          <div className="field full">
            <label>{t.equipNote}</label>
            <textarea value={form.note} onChange={e=>set("note",e.target.value)} rows={2} placeholder={lang==="en"?"Any notes…":"이 장비에 대한 메모…"}/>
          </div>
          <div className="field full" style={{ display:"flex", alignItems:"center", gap:"10px" }}>
            <input type="checkbox" id="isPrimaryEq" checked={form.isPrimary} onChange={e=>set("isPrimary",e.target.checked)} style={{ width:"16px", height:"16px", accentColor:"var(--latte)", cursor:"pointer" }}/>
            <label htmlFor="isPrimaryEq" style={{ cursor:"pointer", fontSize:"0.88rem", color:"var(--espresso)", fontWeight:500 }}>
              {t.equipSetPrimary}
              <span style={{ fontSize:"0.72rem", color:"var(--muted)", fontWeight:400, marginLeft:"6px" }}>({lang==="en"?"auto-selected in recipe":"레시피 기록 시 자동 선택"})</span>
            </label>
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>{lang==="en"?"Cancel":"취소"}</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ marginTop:0, width:"auto", padding:"0.7rem 1.5rem" }}>
            {saving?(lang==="en"?"Saving…":"저장 중…"):(lang==="en"?"Save":"저장")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// EquipmentVault
// ─────────────────────────────────────────────────────────────────
export function EquipmentVault({ user, lang, showModal, setShowModal }) {
  const t = I18N[lang];
  const CATEGORIES = [
    { id:"machine",  labelKo:"커피 머신",  labelEn:"Coffee Machine", color:"#e67e22" },
    { id:"grinder",  labelKo:"그라인더",   labelEn:"Grinder",        color:"#27ae60" },
    { id:"handdrip", labelKo:"핸드드립",   labelEn:"Hand Drip",      color:"#2980b9" },
    { id:"other",    labelKo:"기타",       labelEn:"Other",           color:"#8C8480" },
  ];
  const [equips,     setEquips]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [editTarget, setEditTarget] = useState(null);

  const loadEquips = async () => {
    setLoading(true);
    try {
      const q    = query(collection(db,"equipments"), where("uid","==",user.uid));
      const snap = await getDocs(q);
      const data = snap.docs.map(d=>({ id:d.id, ...d.data() }));
      const catOrder = { machine:0, grinder:1, handdrip:2, other:3 };
      data.sort((a,b) => {
        if ((catOrder[a.category]??9) !== (catOrder[b.category]??9))
          return (catOrder[a.category]??9) - (catOrder[b.category]??9);
        if (a.isPrimary && !b.isPrimary) return -1;
        if (!a.isPrimary && b.isPrimary) return 1;
        return (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0);
      });
      setEquips(data);
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  useEffect(()=>{ loadEquips(); }, [user?.uid]); // eslint-disable-line

  const handleDelete = async (id) => {
    if (!window.confirm(t.equipDeleteConfirm)) return;
    await deleteDoc(doc(db,"equipments",id));
    loadEquips();
  };

  const handleSetPrimary = async (eq) => {
    await Promise.all(
      equips.filter(e=>e.category===eq.category).map(e=>
        updateDoc(doc(db,"equipments",e.id), { isPrimary:e.id===eq.id })
      )
    );
    loadEquips();
  };

  const grouped = ["machine","grinder","handdrip","other"].map(cat=>({
    cat, info:CATEGORIES.find(c=>c.id===cat),
    items:equips.filter(e=>e.category===cat),
  })).filter(g=>g.items.length>0);

  return (
    <div>
      {loading && (
        <div style={{ display:"flex", justifyContent:"center", padding:"48px 0", color:"var(--muted)", gap:"8px", fontSize:"0.85rem" }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ animation:"spin 1s linear infinite" }}><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.8" strokeDasharray="12 26" strokeLinecap="round"/></svg>
          {lang==="en"?"Loading…":"불러오는 중…"}
        </div>
      )}

      {!loading && equips.length===0 && (
        <div className="empty-state">
          <svg className="empty-state-icon" viewBox="0 0 56 56" fill="none"><rect x="10" y="18" width="28" height="22" rx="4" stroke="currentColor" strokeWidth="2"/><path d="M38 26h4a4 4 0 0 1 0 8h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M16 40v4M28 40v4M12 44h20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          <div className="empty-state-title">{t.equipEmpty}</div>
          <div className="empty-state-sub">{t.equipEmptySub}</div>
        </div>
      )}

      {!loading && grouped.map(({cat,info,items})=>(
        <div key={cat} style={{ marginBottom:"28px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"10px" }}>
            <div style={{ width:"8px", height:"8px", borderRadius:"50%", background:info.color, flexShrink:0 }}/>
            <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.72rem", fontWeight:700, color:"var(--espresso)", textTransform:"uppercase", letterSpacing:"0.08em" }}>
              {lang==="en"?info.labelEn:info.labelKo}
            </span>
            <div style={{ flex:1, height:"1px", background:"var(--divider)" }}/>
            <span style={{ fontSize:"0.68rem", color:"var(--muted)" }}>{items.length}</span>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
            {items.map(eq=>(
              <div key={eq.id} style={{ background:"var(--foam)", borderRadius:"10px", padding:"14px 16px", borderLeft:`3px solid ${eq.isPrimary?info.color:"var(--divider)"}`, border:`1px solid ${eq.isPrimary?info.color+"50":"var(--divider)"}` }}>
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:"8px" }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:"6px", marginBottom:"3px" }}>
                      <span style={{ fontFamily:"'Playfair Display',serif", fontSize:"1rem", fontWeight:700, color:"var(--espresso)" }}>{eq.brand}</span>
                      {eq.isPrimary && <span style={{ fontSize:"0.6rem", fontWeight:700, color:info.color, background:info.color+"15", border:`1px solid ${info.color}40`, borderRadius:"4px", padding:"1px 6px" }}>{t.equipIsPrimary}</span>}
                    </div>
                    {eq.model && <div style={{ fontSize:"0.82rem", color:"var(--muted)" }}>{eq.model}</div>}
                    <div style={{ display:"flex", flexWrap:"wrap", gap:"8px", fontSize:"0.7rem", color:"var(--muted)", marginTop:"4px" }}>
                      {eq.purchaseDate && <span>{lang==="en"?"Purchased":"구매"}: {eq.purchaseDate}</span>}
                      {eq.price && <span>{lang==="en"?"Price":"가격"}: ₩{parseInt(eq.price).toLocaleString()}</span>}
                      {eq.note && <span style={{ fontStyle:"italic" }}>"{eq.note}"</span>}
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:"5px", flexShrink:0 }}>
                    {!eq.isPrimary && (
                      <button onClick={()=>handleSetPrimary(eq)} style={{ padding:"4px 8px", border:`1px solid ${info.color}60`, borderRadius:"6px", background:"none", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontSize:"0.68rem", color:info.color }}>
                        {t.equipSetPrimary}
                      </button>
                    )}
                    <button onClick={()=>{ setEditTarget(eq); setShowModal(true); }} style={{ padding:"4px 8px", border:"1px solid var(--steam)", borderRadius:"6px", background:"none", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontSize:"0.68rem", color:"var(--muted)" }}>
                      {t.equipEdit}
                    </button>
                    <button onClick={()=>handleDelete(eq.id)} style={{ padding:"4px 8px", border:"1px solid #c0392b30", borderRadius:"6px", background:"none", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontSize:"0.68rem", color:"#c0392b" }}>
                      {t.equipDelete}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {showModal && (
        <EquipmentModal lang={lang} user={user} editTarget={editTarget}
          onClose={()=>setShowModal(false)} onSaved={loadEquips}/>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// BeanModal — 내부 서브컴포넌트
// ─────────────────────────────────────────────────────────────────
function BeanModal({ lang, user, editTarget, onClose, onSaved }) {
  const t = I18N[lang];
  const empty = { name:"", roastery:"", originType:"single", originDetail:"", variety:"", process:"", roastLevel:"medium", roastDate:"", buyDate:"", price:"", weight:"", quantity:"1", note:"", status:"open" };
  const [form,      setForm]      = useState(editTarget ? { ...empty, ...editTarget } : empty);
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState(null);
  const set = (k,v) => setForm(p=>({ ...p, [k]:v }));

  const handleSave = async () => {
    if (!form.name.trim()||!form.roastery.trim()) return;
    setSaving(true); setSaveError(null);
    try {
      const data = { ...form, uid:user.uid, updatedAt:serverTimestamp() };
      if (editTarget?.id) {
        await updateDoc(doc(db,"beans",editTarget.id), data);
      } else {
        await addDoc(collection(db,"beans"), { ...data, createdAt:serverTimestamp() });
      }
      onSaved(form); onClose();
    } catch(e) {
      console.error(e);
      setSaveError(e.code==="permission-denied"
        ? (lang==="en"?"Save failed: Firestore rules for 'beans' not set.":"저장 실패: Firestore rules에 beans 컬렉션 규칙이 없어요.")
        : (lang==="en"?`Save failed: ${e.message}`:`저장 실패: ${e.message}`));
    }
    setSaving(false);
  };

  return (
    <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{ maxWidth:"560px" }}>
        <h2>{editTarget?t.beanEdit:t.beanAdd}</h2>
        <div className="modal-grid">
          <div className="field full"><label>{t.beanName}</label><input value={form.name} onChange={e=>set("name",e.target.value)} placeholder="예) 에티오피아 예가체프 코체레"/></div>
          <div className="field full"><label>{t.beanRoastery}</label><input value={form.roastery} onChange={e=>set("roastery",e.target.value)} placeholder="예) 오니버스 커피, 테라로사"/></div>
          {/* 원산지 유형 */}
          <div className="field full">
            <label>{t.beanOriginType}</label>
            <div style={{ display:"flex", gap:"8px" }}>
              {[["single",t.beanSingle],["blend",t.beanBlend]].map(([v,lbl])=>(
                <button key={v} type="button" onClick={()=>set("originType",v)}
                  style={{ flex:1, padding:"0.6rem", border:"1px solid", borderRadius:"8px", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontSize:"0.85rem", transition:"all 0.2s",
                    borderColor: form.originType===v?"var(--espresso)":"var(--steam)",
                    background:  form.originType===v?"var(--espresso)":"var(--foam)",
                    color:       form.originType===v?"var(--cream)":"var(--muted)", fontWeight:form.originType===v?600:400 }}>{lbl}</button>
              ))}
            </div>
          </div>
          <div className="field full"><label>{t.beanOrigin}</label><input value={form.originDetail} onChange={e=>set("originDetail",e.target.value)} placeholder="예) 에티오피아 · 시다마 · 코체레 워시드 스테이션"/></div>
          <div className="field"><label>{t.beanVariety}</label><input value={form.variety} onChange={e=>set("variety",e.target.value)} placeholder={t.beanVarietyPh}/></div>
          <div className="field">
            <label>{t.beanProcess}</label>
            <input value={form.process} onChange={e=>set("process",e.target.value)} placeholder={t.beanProcessPh} list="process-presets"/>
            <datalist id="process-presets">{PROCESS_PRESETS.map(p=><option key={p} value={p}/>)}</datalist>
          </div>
          {/* 배전도 슬라이더 */}
          <div className="field full">
            <label>{t.beanRoastLevel}</label>
            <div style={{ padding:"8px 4px 4px" }}>
              <div style={{ position:"relative", marginBottom:"10px" }}>
                <div style={{ height:"8px", borderRadius:"4px", background:"linear-gradient(90deg,#e8f0d8 0%,#f5e6c8 8%,#e8c97a 20%,#c8a050 35%,#a07038 50%,#7a5030 65%,#4a2818 82%,#1a0a04 100%)", cursor:"pointer" }}
                  onClick={e=>{ const rect=e.currentTarget.getBoundingClientRect(); const ratio=(e.clientX-rect.left)/rect.width; const idx=Math.round(ratio*(ROAST_LEVELS.length-1)); set("roastLevel",ROAST_LEVELS[Math.max(0,Math.min(ROAST_LEVELS.length-1,idx))].id); }}/>
                {ROAST_LEVELS.map((r,i)=>{ const leftPct=(i/(ROAST_LEVELS.length-1))*100; const isActive=form.roastLevel===r.id; return (
                  <div key={r.id} onClick={()=>set("roastLevel",r.id)}
                    style={{ position:"absolute", top:"50%", left:`${leftPct}%`, transform:"translate(-50%,-50%)", width:isActive?"16px":"8px", height:isActive?"16px":"8px", borderRadius:"50%", background:isActive?"var(--espresso)":"white", border:isActive?"2.5px solid white":"1.5px solid #a07038", boxShadow:isActive?"0 1px 6px #0005":"none", cursor:"pointer", transition:"all 0.15s", zIndex:isActive?2:1 }}/>
                ); })}
              </div>
              <div style={{ position:"relative", height:"36px", marginTop:"4px" }}>
                {ROAST_LEVELS.map((r,i)=>{ const leftPct=(i/(ROAST_LEVELS.length-1))*100; const isActive=form.roastLevel===r.id; return (
                  <button key={r.id} type="button" onClick={()=>set("roastLevel",r.id)}
                    style={{ position:"absolute", left:`${leftPct}%`, transform:i===0?"none":i===ROAST_LEVELS.length-1?"translateX(-100%)":"translateX(-50%)", background:"none", border:"none", cursor:"pointer", padding:0, textAlign:i===0?"left":i===ROAST_LEVELS.length-1?"right":"center", lineHeight:1.3 }}>
                    <div style={{ fontSize:"0.6rem", color:isActive?"var(--espresso)":"var(--muted)", fontWeight:isActive?700:400, fontFamily:"'DM Sans',sans-serif", whiteSpace:"nowrap" }}>{r.en}</div>
                    <div style={{ fontSize:"0.58rem", color:isActive?"var(--latte)":"var(--muted)", opacity:0.75, fontFamily:"'DM Sans',sans-serif", whiteSpace:"nowrap" }}>{r.ko}</div>
                  </button>
                ); })}
              </div>
            </div>
          </div>
          <div className="field"><label>{t.beanRoastDate}</label><input type="date" value={form.roastDate} onChange={e=>set("roastDate",e.target.value)} max={new Date().toISOString().split("T")[0]}/></div>
          <div className="field"><label>{t.beanBuyDate}</label><input type="date" value={form.buyDate} onChange={e=>set("buyDate",e.target.value)} max={new Date().toISOString().split("T")[0]}/></div>
          <div className="field"><label>{t.beanPrice}</label><input type="number" value={form.price} onChange={e=>set("price",e.target.value)} placeholder="예) 22000" min="0"/></div>
          <div className="field"><label>{t.beanWeight}</label><input type="number" value={form.weight} onChange={e=>set("weight",e.target.value)} placeholder="예) 200" min="0"/></div>
          {/* 수량 */}
          <div className="field full">
            <label>{lang==="en"?"Quantity (bags)":"수량 (봉지)"}</label>
            <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
              <button type="button" onClick={()=>set("quantity",String(Math.max(1,parseInt(form.quantity||1)-1)))} style={{ width:"36px", height:"36px", border:"1px solid var(--steam)", borderRadius:"8px", background:"var(--foam)", fontFamily:"'DM Sans',sans-serif", fontSize:"1.1rem", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--espresso)", flexShrink:0 }}>−</button>
              <input type="number" value={form.quantity} onChange={e=>set("quantity",String(Math.max(1,parseInt(e.target.value)||1)))} min="1" style={{ width:"64px", textAlign:"center", padding:"0.5rem", border:"1px solid var(--steam)", borderRadius:"8px", background:"var(--cream)", fontFamily:"'DM Sans',sans-serif", fontSize:"0.95rem", color:"var(--espresso)", outline:"none" }}/>
              <button type="button" onClick={()=>set("quantity",String(parseInt(form.quantity||1)+1))} style={{ width:"36px", height:"36px", border:"1px solid var(--steam)", borderRadius:"8px", background:"var(--foam)", fontFamily:"'DM Sans',sans-serif", fontSize:"1.1rem", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--espresso)", flexShrink:0 }}>+</button>
              <span style={{ fontSize:"0.8rem", color:"var(--muted)" }}>{form.weight&&form.quantity?`총 ${parseInt(form.weight)*parseInt(form.quantity||1)}g`:""}</span>
            </div>
          </div>
          <div className="field full">
            <label>{t.beanStatusLabel}</label>
            <div className="bean-status-row">
              {[["open",t.beanOpen],["sealed",t.beanSealed]].map(([v,lbl])=>(
                <button key={v} type="button" className={`bean-status-btn ${form.status===v?"active":""}`} onClick={()=>set("status",v)}>{lbl}</button>
              ))}
            </div>
          </div>
          <div className="field full">
            <label>{t.beanNote}</label>
            <textarea value={form.note} onChange={e=>set("note",e.target.value)} rows={3} placeholder={lang==="en"?"Tasting notes, impressions…":"향미, 맛 노트, 첫인상 등 자유롭게…"} style={{ width:"100%", padding:"0.75rem 1rem", border:"1px solid var(--steam)", borderRadius:"8px", background:"var(--cream)", fontFamily:"'DM Sans',sans-serif", fontSize:"0.9rem", color:"var(--espresso)", outline:"none", resize:"vertical", minHeight:"72px", transition:"border-color 0.2s" }}/>
          </div>
        </div>
        <div className="modal-actions" style={{ flexDirection:"column", alignItems:"stretch", gap:"8px" }}>
          {saveError && (
            <div style={{ background:"#fce4ec", border:"1px solid #ef9a9a", borderRadius:"8px", padding:"10px 14px", fontSize:"0.8rem", color:"#c62828", lineHeight:1.6 }}>
              <strong>{lang==="en"?"Error":"오류"}</strong> — {saveError}
            </div>
          )}
          <div style={{ display:"flex", gap:"8px", justifyContent:"flex-end" }}>
            <button className="btn-cancel" onClick={onClose}>{t.cancel}</button>
            <button className="btn-primary" style={{ width:"auto", marginTop:0, padding:"0.7rem 2rem" }} onClick={handleSave} disabled={saving||!form.name.trim()||!form.roastery.trim()}>
              {saving?t.saving:(editTarget?t.update:t.save)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// FirstBrewSuggestionModal — 신규 원두 첫 추출 파라미터 제안
// ─────────────────────────────────────────────────────────────────

// Gemini API 재시도 헬퍼 (503 과부하 시 최대 3회 지수 백오프)
async function geminiWithRetry(url, body, signal, maxRetry = 3) {
  let lastErr;
  for (let i = 0; i < maxRetry; i++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal,
        body: JSON.stringify(body),
      });
      if (res.status === 503 && i < maxRetry - 1) {
        const wait = (2 ** i) * 1000; // 1s → 2s → 4s
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      return res;
    } catch (e) {
      lastErr = e;
      if (e.name === "AbortError") throw e; // 타임아웃은 재시도 안 함
      if (i < maxRetry - 1) await new Promise(r => setTimeout(r, (2 ** i) * 1000));
    }
  }
  throw lastErr || new Error("Gemini 호출 실패");
}

const GEMINI_KEY = import.meta.env.VITE_GEMINI_KEY;

function FirstBrewSuggestionModal({ bean, lang, user, onClose }) {
  const isKo = lang === "ko";
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [asked,   setAsked]   = useState(false);

  // 캐시 키: 원두명 + 로스팅레벨 기반 (같은 원두는 재호출 안 함)
  const cacheKey = user?.uid
    ? `brewlog_firstbrew_${user.uid}_${bean.name}_${bean.roastLevel}_${bean.process}`.replace(/\s+/g,"_")
    : null;

  const ROAST_NAMES = {
    green:"생두", cinnamon:"시나몬", medium:"미디엄", high:"하이",
    city:"시티", full_city:"풀 시티", french:"프렌치", italian:"이탈리안",
  };

  // 모달 열릴 때 캐시 확인
  useEffect(() => {
    if (!cacheKey) return;
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
      if (cached) { setResult(cached); setAsked(true); }
    } catch {}
  }, [cacheKey]);

  const fetchSuggestion = async () => {
    if (!GEMINI_KEY) { setError(isKo ? "VITE_GEMINI_KEY가 설정되지 않았어요." : "VITE_GEMINI_KEY not set."); return; }
    setLoading(true); setError(null); setAsked(true);

    const roastLabel = ROAST_NAMES[bean.roastLevel] || bean.roastLevel || "미디엄";

    const prompt = isKo
      ? `당신은 전문 바리스타 AI입니다. 아래 원두의 첫 에스프레소 추출을 위한 시작점 파라미터를 JSON으로만 응답하세요.
원두 정보:
- 이름: ${bean.name}
- 로스터리: ${bean.roastery}
- 산지: ${bean.originDetail || bean.originType}
- 품종: ${bean.variety || "미상"}
- 가공법: ${bean.process || "미상"}
- 배전도: ${roastLabel}
- 원두 타입: ${bean.originType === "single" ? "싱글 오리진" : "블렌드"}
응답 형식(JSON only, 다른 텍스트 금지):
{
  "gram": "숫자만(g)",
  "seconds": "숫자만(s)",
  "espressoMl": "숫자만(ml)",
  "waterTemp": "숫자만(°C)",
  "grindDesc": "분쇄도 설명 한 문장",
  "ratioDesc": "추출 비율 설명",
  "tip": "이 원두 특성에 맞는 추출 팁 2~3문장",
  "flavorExpect": "기대 플레이버 노트 3가지 이내"
}`
      : `You are a professional barista AI. Suggest starting espresso parameters for the bean below. Respond in JSON only.
Bean info:
- Name: ${bean.name}
- Roastery: ${bean.roastery}
- Origin: ${bean.originDetail || bean.originType}
- Variety: ${bean.variety || "unknown"}
- Process: ${bean.process || "unknown"}
- Roast level: ${bean.roastLevel || "medium"}
- Type: ${bean.originType === "single" ? "Single Origin" : "Blend"}
JSON only:
{
  "gram": "number only(g)",
  "seconds": "number only(s)",
  "espressoMl": "number only(ml)",
  "waterTemp": "number only(°C)",
  "grindDesc": "one sentence grind description",
  "ratioDesc": "ratio explanation",
  "tip": "2-3 sentences extraction tip for this bean",
  "flavorExpect": "up to 3 expected flavor notes"
}`;

    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 20000);
      let res;
      try {
        res = await geminiWithRetry(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${GEMINI_KEY}`,
          {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 512, thinkingConfig: { thinkingLevel: "minimal" } },
          },
          controller.signal
        );
      } finally { clearTimeout(tid); }

      const data  = await res.json();
      if (data.error) throw new Error(data.error.message);
      const parts = data.candidates?.[0]?.content?.parts || [];
      const text  = (parts.find(p => !p.thought && p.text) || parts[0] || {}).text || "";
      const clean = text.replace(/```json\s*/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(clean);
      if (cacheKey) localStorage.setItem(cacheKey, JSON.stringify(parsed));
      setResult(parsed);
    } catch (e) {
      console.error("[FirstBrew]", e);
      setError(isKo
        ? (e.name === "AbortError" ? "응답 시간이 초과됐어요. 다시 시도해주세요." : "AI 추천을 가져오지 못했어요: " + e.message)
        : (e.name === "AbortError" ? "Request timed out. Please try again." : "Failed to get AI suggestion: " + e.message));
    }
    setLoading(false);
  };

  const StatBox = ({ label, value, unit }) => (
    <div style={{ background:"rgba(255,255,255,0.07)", borderRadius:"10px", padding:"12px 8px", textAlign:"center" }}>
      <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.6rem", color:"rgba(255,255,255,0.4)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"4px" }}>{label}</div>
      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.3rem", fontWeight:700, color:"var(--latte)", lineHeight:1 }}>{value}</div>
      <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.65rem", color:"rgba(255,255,255,0.35)", marginTop:"2px" }}>{unit}</div>
    </div>
  );

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth:"420px", padding:0, overflow:"hidden", borderRadius:"16px" }}>
        {/* 헤더 */}
        <div style={{ background:"linear-gradient(135deg,#1A1A1A 0%,#2C1A0E 100%)", padding:"20px 20px 18px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"12px" }}>
            <div style={{ width:20, height:20, borderRadius:"50%", background:"var(--latte)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="white"/></svg>
            </div>
            <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.65rem", fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:"var(--latte)" }}>
              {isKo ? "AI 첫 추출 파라미터 제안" : "AI First Brew Suggestion"}
            </span>
            <button onClick={onClose} style={{ marginLeft:"auto", background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.4)", fontSize:"1.1rem", lineHeight:1, padding:"2px" }}>✕</button>
          </div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.2rem", fontWeight:700, color:"#FBFBFA", marginBottom:"3px" }}>{bean.name}</div>
          <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.75rem", color:"rgba(255,255,255,0.55)", display:"flex", flexWrap:"wrap", gap:"6px" }}>
            {bean.roastery && <span>{bean.roastery}</span>}
            {bean.originDetail && <><span style={{ opacity:0.3 }}>·</span><span>{bean.originDetail}</span></>}
            {bean.process     && <><span style={{ opacity:0.3 }}>·</span><span>{bean.process}</span></>}
            {bean.roastLevel  && <><span style={{ opacity:0.3 }}>·</span><span>{ROAST_NAMES[bean.roastLevel]||bean.roastLevel}</span></>}
          </div>
        </div>

        <div style={{ padding:"20px", background:"var(--foam)" }}>
          {/* 아직 요청 안 한 상태 */}
          {!asked && !loading && !result && (
            <div style={{ textAlign:"center", padding:"8px 0 16px" }}>
              <div style={{ marginBottom:"14px" }}>
                <svg width="44" height="44" viewBox="0 0 56 56" fill="none" style={{ margin:"0 auto 10px", display:"block" }}>
                  <circle cx="28" cy="28" r="26" stroke="var(--latte)" strokeWidth="1.5" opacity="0.3"/>
                  <ellipse cx="28" cy="36" rx="12" ry="3.5" stroke="var(--latte)" strokeWidth="1.5"/>
                  <path d="M16 36c0-8 4-16 12-18 8 2 12 10 12 18" stroke="var(--latte)" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M22 20c0-3 2.5-5 6-5s6 2 6 5" stroke="var(--latte)" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.85rem", color:"var(--espresso)", fontWeight:500, marginBottom:"6px" }}>
                  {isKo ? `"${bean.name}" 원두를 처음 추출하시나요?` : `First brew with "${bean.name}"?`}
                </p>
                <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.78rem", color:"var(--muted)", lineHeight:1.6 }}>
                  {isKo
                    ? "산지·가공법·배전도를 분석해서 에스프레소 시작점 파라미터를 제안해드려요."
                    : "I'll analyze the origin, process, and roast level to suggest starting espresso parameters."}
                </p>
              </div>
              <button onClick={fetchSuggestion}
                style={{ width:"100%", padding:"12px", background:"var(--espresso)", color:"var(--cream)", border:"none", borderRadius:"10px", fontFamily:"'DM Sans',sans-serif", fontSize:"0.9rem", fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:"8px" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor"/></svg>
                {isKo ? "첫 추출 파라미터 추천받기" : "Get First Brew Parameters"}
              </button>
              <button onClick={onClose}
                style={{ width:"100%", marginTop:"8px", padding:"10px", background:"none", border:"none", fontFamily:"'DM Sans',sans-serif", fontSize:"0.82rem", color:"var(--muted)", cursor:"pointer" }}>
                {isKo ? "괜찮아요, 직접 설정할게요" : "No thanks, I'll set it myself"}
              </button>
            </div>
          )}

          {/* 로딩 */}
          {loading && (
            <div style={{ textAlign:"center", padding:"32px 0" }}>
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none" style={{ animation:"spin 1s linear infinite", margin:"0 auto 14px", display:"block" }}>
                <circle cx="18" cy="18" r="15" stroke="var(--latte)" strokeWidth="2" strokeDasharray="24 56" strokeLinecap="round"/>
              </svg>
              <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.85rem", color:"var(--muted)", lineHeight:1.6 }}>
                {isKo ? "원두 특성을 분석하는 중이에요…" : "Analyzing bean characteristics…"}
              </p>
            </div>
          )}

          {/* 에러 */}
          {error && !loading && (
            <div style={{ textAlign:"center", padding:"16px 0" }}>
              <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.82rem", color:"#c0392b", marginBottom:"14px", lineHeight:1.6 }}>⚠️ {error}</p>
              <button onClick={fetchSuggestion}
                style={{ padding:"9px 20px", background:"var(--espresso)", color:"var(--cream)", border:"none", borderRadius:"8px", fontFamily:"'DM Sans',sans-serif", fontSize:"0.82rem", cursor:"pointer" }}>
                {isKo ? "다시 시도" : "Retry"}
              </button>
            </div>
          )}

          {/* 결과 */}
          {result && !loading && (
            <div>
              {/* 수치 4칸 */}
              <div style={{ background:"linear-gradient(135deg,#1A1A1A 0%,#2C1A0E 100%)", borderRadius:"12px", padding:"16px", marginBottom:"14px" }}>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"8px", marginBottom:"10px" }}>
                  <StatBox label={isKo?"원두량":"Dose"}     value={result.gram}       unit="g"/>
                  <StatBox label={isKo?"추출시간":"Time"}    value={result.seconds}    unit="s"/>
                  <StatBox label={isKo?"추출량":"Yield"}     value={result.espressoMl} unit="ml"/>
                  <StatBox label={isKo?"물온도":"Temp"}      value={result.waterTemp}  unit="°C"/>
                </div>
                {result.ratioDesc && (
                  <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.72rem", color:"rgba(255,255,255,0.45)", textAlign:"center" }}>
                    {result.ratioDesc}
                  </div>
                )}
              </div>

              {/* 분쇄도 */}
              {result.grindDesc && (
                <div style={{ background:"var(--cream)", border:"1px solid var(--divider)", borderRadius:"10px", padding:"12px 14px", marginBottom:"10px" }}>
                  <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.62rem", fontWeight:700, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"5px" }}>
                    {isKo ? "분쇄도" : "Grind Size"}
                  </div>
                  <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.85rem", color:"var(--espresso)", lineHeight:1.5 }}>
                    {result.grindDesc}
                  </div>
                </div>
              )}

              {/* 기대 플레이버 */}
              {result.flavorExpect && (
                <div style={{ background:"var(--cream)", border:"1px solid var(--divider)", borderRadius:"10px", padding:"12px 14px", marginBottom:"10px" }}>
                  <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.62rem", fontWeight:700, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"6px" }}>
                    {isKo ? "기대 플레이버" : "Expected Flavors"}
                  </div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:"6px" }}>
                    {result.flavorExpect.split(/[,，·]/).map((f,i) => (
                      <span key={i} style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.78rem", color:"var(--latte)", background:"#B07D5415", border:"1px solid #B07D5430", borderRadius:"999px", padding:"3px 10px" }}>
                        {f.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 추출 팁 */}
              {result.tip && (
                <div style={{ background:"var(--cream)", border:"1px solid var(--divider)", borderLeft:"3px solid var(--latte)", borderRadius:"0 10px 10px 0", padding:"12px 14px", marginBottom:"16px" }}>
                  <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.62rem", fontWeight:700, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"5px" }}>
                    {isKo ? "추출 팁" : "Brew Tip"}
                  </div>
                  <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.82rem", color:"var(--espresso)", lineHeight:1.65 }}>
                    {result.tip}
                  </div>
                </div>
              )}

              <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.72rem", color:"var(--muted)", textAlign:"center", lineHeight:1.6, marginBottom:"14px" }}>
                {isKo
                  ? "이 수치는 시작점 제안이에요. 실제 추출 후 맛을 보며 조정해보세요 ☕"
                  : "These are starting suggestions. Taste and adjust after your first pull ☕"}
              </p>

              <button onClick={onClose}
                style={{ width:"100%", padding:"11px", background:"var(--espresso)", color:"var(--cream)", border:"none", borderRadius:"10px", fontFamily:"'DM Sans',sans-serif", fontSize:"0.88rem", fontWeight:500, cursor:"pointer" }}>
                {isKo ? "확인했어요" : "Got it"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// BeanVault
// ─────────────────────────────────────────────────────────────────
export function BeanVault({ user, lang, filterStatus, setFilterStatus, showModal, setShowModal, editTarget, setEditTarget, currency="KRW" }) {
  const t = I18N[lang];
  const [beans,        setBeans]        = useState([]);
  const [usedGramsMap, setUsedGramsMap] = useState({});
  const [statsResetDate, setStatsResetDate] = useState(() => localStorage.getItem(`brewlog_stats_reset_${user?.uid}`)||null);
  const [firstBrewTarget, setFirstBrewTarget] = useState(null); // 신규 원두 첫 추출 제안
  const [usdRate,    setUsdRate]    = useState(()=>loadCachedRate()||null);
  const [rateLoading,setRateLoading]= useState(false);

  useEffect(()=>{ if(currency==="USD"&&!usdRate){ setRateLoading(true); fetchUsdRate().then(r=>{setUsdRate(r);setRateLoading(false);}); } }, [currency]); // eslint-disable-line

  const loadBeans = async () => {
    if(!user) return;
    try {
      const q    = query(collection(db,"beans"), where("uid","==",user.uid));
      const snap = await getDocs(q);
      const data = snap.docs.map(d=>({ id:d.id, ...d.data() }));
      data.sort((a,b)=>(b.createdAt?.toDate?.()?.getTime()??0)-(a.createdAt?.toDate?.()?.getTime()??0));
      setBeans(data);
      await loadUsedGrams(data);
    } catch(e){ console.error("[BeanVault]",e.code,e.message); }
  };

  const loadUsedGrams = async (beanList) => {
    if(!beanList.length) return;
    try {
      const map = {};
      const migrationUpdates = [];
      for(const bean of beanList){
        if(bean.consumedGMigrated===true){
          map[bean.id] = parseFloat(bean.consumedG)||0;
        } else {
          const rq = query(collection(db,"recipes"), where("uid","==",user.uid), where("linkedBeanId","==",bean.id));
          const rsnap = await getDocs(rq);
          const total = rsnap.docs.reduce((s,d)=>s+(parseFloat(d.data().gram)||0),0);
          map[bean.id] = total;
          migrationUpdates.push(updateDoc(doc(db,"beans",bean.id), { consumedG:total, consumedGMigrated:true }).catch(()=>{}));
        }
      }
      if(migrationUpdates.length) await Promise.all(migrationUpdates);
      setUsedGramsMap(map);
      // 소진 자동 감지
      const updates = [];
      beanList.forEach(bean=>{
        const totalG = (parseFloat(bean.weight)||0)*(parseInt(bean.quantity)||1);
        const usedG  = map[bean.id]||0;
        const isExhausted = totalG>0 && usedG>=totalG;
        if(isExhausted && bean.status!=="empty") updates.push(updateDoc(doc(db,"beans",bean.id),{status:"empty"}));
        if(!isExhausted && bean.status==="empty" && totalG>0) updates.push(updateDoc(doc(db,"beans",bean.id),{status:"open"}));
      });
      if(updates.length){ await Promise.all(updates); loadBeans(); }
    } catch(e){ console.error("[loadUsedGrams]",e); }
  };

  useEffect(()=>{ loadBeans(); }, [user?.uid]); // eslint-disable-line

  const beanStats = useMemo(()=>{
    if(!beans.length) return null;
    const totalBeans  = beans.length;
    const activeBeans = beans.filter(b=>b.status!=="empty").length;
    let totalStockG=0,totalInvest=0,usedStockG=0;
    beans.forEach(b=>{
      const g=(parseFloat(b.weight)||0)*(parseInt(b.quantity)||1);
      totalStockG += g;
      totalInvest += (parseFloat(b.price)||0)*(parseInt(b.quantity)||1);
      usedStockG  += (usedGramsMap[b.id]||0);
    });
    const remainG = Math.max(0,totalStockG-usedStockG);
    const totalBrews  = beans.reduce((s,b)=>s+(b.usedCount||0),0);
    const totalUsedG  = Object.values(usedGramsMap).reduce((s,g)=>s+g,0);
    const avgGramPerBrew = totalBrews>0 ? totalUsedG/totalBrews : null;
    const avgCostPerCup  = totalBrews>0&&totalInvest>0 ? (totalInvest/totalStockG)*(totalUsedG/totalBrews) : null;
    const fresh={fresh:0,peak:0,aged:0,stale:0,sealed:0};
    beans.forEach(b=>{
      if(b.status==="sealed"){fresh.sealed++;return;}
      if(b.status==="empty") return;
      if(!b.roastDate) return;
      const d=Math.floor((new Date()-new Date(b.roastDate))/86400000);
      if(d<=7)fresh.fresh++; else if(d<=30)fresh.peak++; else if(d<=60)fresh.aged++; else fresh.stale++;
    });
    const mode=(arr)=>{ const cnt={}; arr.forEach(v=>v&&(cnt[v]=(cnt[v]||0)+1)); return Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0]?.[0]||null; };
    const topRoast=mode(beans.map(b=>b.roastLevel)), topProcess=mode(beans.map(b=>b.process)), topOrigin=mode(beans.map(b=>b.originDetail)), topType=mode(beans.map(b=>b.originType));
    const mostUsed=[...beans].sort((a,b)=>(b.usedCount||0)-(a.usedCount||0))[0];
    const resetDate=statsResetDate?new Date(statsResetDate):null;
    const oldestBean=[...beans].filter(b=>b.createdAt?.toDate?.()).sort((a,b)=>a.createdAt.toDate()-b.createdAt.toDate())[0];
    const startDate=resetDate||oldestBean?.createdAt?.toDate()||null;
    return { totalBeans,activeBeans,totalStockG,remainG,totalInvest,totalBrews,totalUsedG,avgGramPerBrew,avgCostPerCup,fresh,topRoast,topProcess,topOrigin,topType,mostUsed,startDate,endDate:new Date() };
  }, [beans,usedGramsMap,statsResetDate]);

  const handleStatsReset = async () => {
    if(!window.confirm(lang==="en"?"Reset all bean stats?":"원두 통계를 초기화할까요?\n이 작업은 되돌릴 수 없어요.")) return;
    try {
      const now = new Date().toISOString();
      await Promise.all(beans.map(bean=>updateDoc(doc(db,"beans",bean.id),{ consumedG:0, consumedGMigrated:true, usedCount:0, lastUsedAt:null }).catch(()=>{})));
      localStorage.setItem(`brewlog_stats_reset_${user?.uid}`,now);
      setStatsResetDate(now); setUsedGramsMap({});
      await loadBeans();
      alert(lang==="en"?"Stats reset.":"통계가 초기화됐어요.");
    } catch(e){ alert(lang==="en"?"Reset failed: "+e.message:"초기화 실패: "+e.message); }
  };

  const handleDelete = async (id) => {
    if(!window.confirm(t.beanDeleteConfirm)) return;
    await deleteDoc(doc(db,"beans",id));
    loadBeans();
  };

  const getFreshness = (bean) => {
    if(bean.status==="sealed") return { key:"sealed", label:t.beanSealed };
    const totalG=(parseFloat(bean.weight)||0)*(parseInt(bean.quantity)||1);
    const usedG=usedGramsMap[bean.id]||0;
    if(totalG>0&&usedG>=totalG) return { key:"empty", label:t.beanEmpty };
    if(!bean.roastDate) return null;
    const days=Math.floor((new Date()-new Date(bean.roastDate))/86400000);
    if(days<=7)  return { key:"fresh", label:t.beanFresh,  days };
    if(days<=30) return { key:"peak",  label:t.beanPeak,   days };
    if(days<=60) return { key:"aging", label:t.beanAging,  days };
    return              { key:"stale", label:t.beanStale,  days };
  };

  const roastPct   = (level) => { const idx=ROAST_LEVELS.findIndex(r=>r.id===level); return idx<0?50:Math.round((idx/(ROAST_LEVELS.length-1))*100); };
  const roastLabel = (level) => { const r=ROAST_LEVELS.find(r=>r.id===level); return r?(lang==="en"?r.en:r.ko):""; };
  const ppgCalc    = (b)     => b.price&&b.weight?(parseFloat(b.price)/parseFloat(b.weight)):null;
  const daysFromRoast=(b)    => b.roastDate?Math.floor((new Date()-new Date(b.roastDate))/86400000):null;

  const filtered = filterStatus==="all" ? beans : beans.filter(b=>b.status===filterStatus);

  return (
    <div>
      {/* 원두 통계 */}
      {beanStats && beans.length>0 && (
        <div style={{ marginBottom:"24px" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"4px" }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.1rem", fontWeight:700, color:"var(--espresso)" }}>{lang==="en"?"Bean Stats":"원두 통계"}</div>
            <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
              <div style={{ fontSize:"0.72rem", color:"var(--muted)" }}>{lang==="en"?`${beanStats.totalBeans} beans total`:`총 ${beanStats.totalBeans}종`}</div>
              <button onClick={handleStatsReset} title={lang==="en"?"Reset stats":"통계 초기화"}
                style={{ background:"none", border:"1px solid var(--steam)", borderRadius:"6px", padding:"3px 8px", cursor:"pointer", display:"flex", alignItems:"center", gap:"4px", fontSize:"0.68rem", color:"var(--muted)", fontFamily:"'DM Sans',sans-serif", transition:"all 0.2s" }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor="#c0392b";e.currentTarget.style.color="#c0392b";}} onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--steam)";e.currentTarget.style.color="var(--muted)";}}>
                <svg width="11" height="11" viewBox="0 0 14 14" fill="none"><path d="M12.5 7a5.5 5.5 0 1 1-1.1-3.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M12.5 2.5v2.5H10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {lang==="en"?"Reset":"초기화"}
              </button>
            </div>
          </div>
          {beanStats.startDate && (
            <div style={{ fontSize:"0.68rem", color:"var(--muted)", opacity:0.75, marginBottom:"14px" }}>
              {beanStats.startDate.toLocaleDateString(lang==="en"?"en-US":"ko-KR")} – {beanStats.endDate.toLocaleDateString(lang==="en"?"en-US":"ko-KR")}
              {statsResetDate && <span style={{ marginLeft:"4px", padding:"1px 6px", background:"var(--cream)", border:"1px solid var(--divider)", borderRadius:"4px", fontSize:"0.62rem" }}>{lang==="en"?"since reset":"초기화 이후"}</span>}
            </div>
          )}
          {/* 핵심 수치 4칸 */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"8px", marginBottom:"8px" }}>
            {[
              { val:beanStats.totalBrews,  unit:lang==="en"?"brews":"회",  lbl:lang==="en"?"Total Brews":"총 추출" },
              { val:beanStats.totalUsedG>=1000?`${(beanStats.totalUsedG/1000).toFixed(2)}`:Math.round(beanStats.totalUsedG), unit:beanStats.totalUsedG>=1000?"kg":"g", lbl:lang==="en"?"Used":"총 사용량" },
              { val:beanStats.avgGramPerBrew?beanStats.avgGramPerBrew.toFixed(1):"—", unit:beanStats.avgGramPerBrew?"g":"", lbl:lang==="en"?"Avg/Cup":"잔당 평균" },
              { val:beanStats.avgCostPerCup&&beanStats.totalInvest>0?(currency==="USD"?(usdRate?`$${(beanStats.avgCostPerCup/usdRate).toFixed(2)}`:"…"):Math.round(beanStats.avgCostPerCup).toLocaleString()):"—", unit:beanStats.avgCostPerCup&&beanStats.totalInvest>0?(currency==="USD"?"/cup":"원/잔"):"", lbl:lang==="en"?"Cost/Cup":"잔당 단가" },
            ].map(({val,unit,lbl})=>(
              <div key={lbl} style={{ background:"var(--foam)", border:"1px solid var(--divider)", borderRadius:"8px", padding:"14px 10px", textAlign:"center" }}>
                <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"1.3rem", fontWeight:700, color:"var(--espresso)", lineHeight:1, marginBottom:"2px" }}>
                  {val}<span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.72rem", fontWeight:400, color:"var(--muted)", marginLeft:"2px" }}>{unit}</span>
                </div>
                <div style={{ width:"24px", height:"1px", background:"var(--divider)", margin:"6px auto" }}/>
                <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.65rem", color:"var(--muted)", letterSpacing:"0.04em" }}>{lbl}</div>
              </div>
            ))}
          </div>
          {/* 신선도 + 취향 */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px" }}>
            <div style={{ background:"var(--foam)", border:"1px solid var(--divider)", borderRadius:"8px", padding:"14px 16px" }}>
              <div style={{ fontSize:"0.65rem", color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"10px", fontWeight:600 }}>{lang==="en"?"Freshness":"신선도 현황"}</div>
              {[{key:"fresh",label:lang==="en"?"Fresh":"프레시",color:"#27ae60"},{key:"peak",label:lang==="en"?"Peak":"피크",color:"#f39c12"},{key:"aged",label:lang==="en"?"Aged":"숙성",color:"#e67e22"},{key:"stale",label:lang==="en"?"Stale":"주의",color:"#e74c3c"},{key:"sealed",label:lang==="en"?"Sealed":"미개봉",color:"var(--muted)"}].filter(f=>beanStats.fresh[f.key]>0).map(f=>(
                <div key={f.key} style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"5px" }}>
                  <div style={{ width:"7px", height:"7px", borderRadius:"50%", background:f.color, flexShrink:0 }}/>
                  <span style={{ fontSize:"0.75rem", color:"var(--espresso)", flex:1 }}>{f.label}</span>
                  <span style={{ fontSize:"0.75rem", fontWeight:700, color:"var(--espresso)" }}>{beanStats.fresh[f.key]}</span>
                </div>
              ))}
            </div>
            <div style={{ background:"var(--foam)", border:"1px solid var(--divider)", borderRadius:"8px", padding:"14px 16px" }}>
              <div style={{ fontSize:"0.65rem", color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"10px", fontWeight:600 }}>{lang==="en"?"My Preference":"취향 프로파일"}</div>
              {[
                { lbl:lang==="en"?"Origin":"원산지",  val:beanStats.topOrigin },
                { lbl:lang==="en"?"Process":"가공법", val:beanStats.topProcess },
                { lbl:lang==="en"?"Roast":"배전도",   val:beanStats.topRoast?(ROAST_LEVELS.find(r=>r.id===beanStats.topRoast)?.[lang==="en"?"en":"ko"]||beanStats.topRoast):null },
                { lbl:lang==="en"?"Type":"타입",      val:beanStats.topType?(beanStats.topType==="single"?(lang==="en"?"Single Origin":"싱글 오리진"):(lang==="en"?"Blend":"블렌드")):null },
              ].map(({lbl,val})=>val?(
                <div key={lbl} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"6px" }}>
                  <span style={{ fontSize:"0.72rem", color:"var(--muted)" }}>{lbl}</span>
                  <span style={{ fontSize:"0.75rem", fontWeight:600, color:"var(--espresso)", background:"var(--cream)", padding:"1px 8px", borderRadius:"4px", border:"1px solid var(--divider)" }}>{val}</span>
                </div>
              ):null)}
            </div>
          </div>
        </div>
      )}

      {/* 카드 그리드 */}
      {filtered.length===0 ? (
        <div className="empty-state">
          <svg className="empty-state-icon" viewBox="0 0 56 56" fill="none"><ellipse cx="28" cy="38" rx="14" ry="4" stroke="currentColor" strokeWidth="2"/><path d="M14 38c0-10 5-20 14-22 9 2 14 12 14 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M22 20c0-3 2.5-6 6-6s6 3 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          <div className="empty-state-title">{t.beanEmptyState}</div>
          <div className="empty-state-sub">{t.beanEmptySub}</div>
        </div>
      ) : (
        <div className="bean-grid">
          {filtered.map(bean=>{
            const freshness=getFreshness(bean);
            const isEmpty=freshness?.key==="empty";
            const ppg=ppgCalc(bean);
            const days=daysFromRoast(bean);
            const totalG=(parseFloat(bean.weight)||0)*(parseInt(bean.quantity)||1);
            const usedG=usedGramsMap[bean.id]||0;
            const remainG=Math.max(0,totalG-usedG);
            const pct=totalG>0?Math.max(0,Math.min(100,(remainG/totalG)*100)):null;
            const totalPrice=(parseFloat(bean.price)||0)*(parseInt(bean.quantity)||1);
            const ppgBase=totalG>0&&totalPrice>0?totalPrice/totalG:null;
            const usedCost=ppgBase?usedG*ppgBase:0;
            const avgGramPerBrew=(bean.usedCount>0&&usedG>0)?usedG/bean.usedCount:null;
            const costPerCup=(ppgBase&&avgGramPerBrew)?ppgBase*avgGramPerBrew:null;
            const barColor=pct===null?"var(--latte)":pct>50?"#5c9e6e":pct>20?"#d4a843":"#c0392b";
            return (
              <div key={bean.id} className="bean-card" style={{ opacity:isEmpty?0.55:1 }}>
                <div className="bean-card-header">
                  <div>
                    <div className="bean-card-name">{bean.name}</div>
                    <div className="bean-card-roastery">{bean.roastery}</div>
                  </div>
                  {freshness && <span className={`bean-freshness-badge bean-${freshness.key}`}>{freshness.label}</span>}
                </div>
                <div className="bean-meta-row">
                  {bean.originType&&<span className="bean-tag">{bean.originType==="single"?t.beanSingle:t.beanBlend}</span>}
                  {bean.originDetail&&<span className="bean-tag">{bean.originDetail}</span>}
                  {bean.variety&&<span className="bean-tag">{bean.variety}</span>}
                  {bean.process&&<span className="bean-tag">{bean.process}</span>}
                </div>
                {bean.roastLevel && (
                  <div className="bean-roast-bar">
                    <div style={{ position:"relative" }}>
                      <div className="bean-roast-track">
                        <div className="bean-roast-fill" style={{ width:`${roastPct(bean.roastLevel)}%` }}/>
                      </div>
                      {(()=>{ const idx=ROAST_LEVELS.findIndex(r=>r.id===bean.roastLevel); if(idx<0) return null; const leftPct=(idx/(ROAST_LEVELS.length-1))*100; return <div style={{ position:"absolute", top:"50%", left:`${leftPct}%`, transform:"translate(-50%,-50%)", width:"12px", height:"12px", borderRadius:"50%", background:"var(--espresso)", border:"2px solid white", boxShadow:"0 1px 4px #0004", pointerEvents:"none" }}/>; })()}
                    </div>
                    <div className="bean-roast-markers">{ROAST_LEVELS.map((r)=><span key={r.id} className={`bean-roast-marker${bean.roastLevel===r.id?" active":""}`}>{lang==="en"?r.en:r.ko}</span>)}</div>
                  </div>
                )}
                {totalG>0&&usedG>0 && (
                  <div style={{ marginBottom:"12px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:"5px" }}>
                      <span style={{ fontSize:"0.7rem", color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.06em" }}>{lang==="en"?"Remaining":"잔여량"}</span>
                      <span style={{ fontSize:"0.85rem", fontWeight:700, color:barColor }}>{remainG%1===0?remainG:remainG.toFixed(1)}g<span style={{ fontSize:"0.68rem", fontWeight:400, color:"var(--muted)", marginLeft:"4px" }}>/ {totalG}g</span></span>
                    </div>
                    <div style={{ height:"5px", background:"var(--steam)", borderRadius:"3px", overflow:"hidden" }}><div style={{ height:"100%", width:`${pct}%`, background:barColor, borderRadius:"3px", transition:"width 0.4s ease" }}/></div>
                    <div style={{ fontSize:"0.65rem", color:"var(--muted)", marginTop:"3px", textAlign:"right", opacity:0.7 }}>{lang==="en"?`${usedG.toFixed(1)}g used · ${bean.usedCount||0} brews`:`${usedG%1===0?usedG:usedG.toFixed(1)}g 사용 · ${bean.usedCount||0}회 추출`}</div>
                  </div>
                )}
                <div className="bean-stat-row" style={{ gridTemplateColumns:`repeat(${costPerCup?5:4},1fr)`, marginBottom:"14px" }}>
                  <div className="bean-stat"><span className="bean-stat-val">{days!==null?`${days}`:"—"}</span><span className="bean-stat-lbl">{lang==="en"?"days":"경과일"}</span></div>
                  <div className="bean-stat"><span className="bean-stat-val" style={{ color:totalG>0&&usedG>0?barColor:undefined }}>{totalG>0&&usedG>0?`${remainG%1===0?remainG:remainG.toFixed(1)}g`:(bean.weight?`${bean.weight}g`:"—")}</span><span className="bean-stat-lbl">{lang==="en"?(usedG>0?"Left":"Weight"):(usedG>0?"잔여":"용량")}</span></div>
                  <div className="bean-stat"><span className="bean-stat-val">{bean.quantity?`×${bean.quantity}`:"×1"}</span><span className="bean-stat-lbl">{lang==="en"?"Qty":"수량"}</span></div>
                  <div className="bean-stat"><span className="bean-stat-val" style={{ fontSize:"0.78rem" }}>{ppgBase?formatPricePerG(ppgBase,currency,usdRate):"—"}</span><span className="bean-stat-lbl">{currency==="USD"?"$/g":(lang==="en"?"₩/g":"원/g")}</span></div>
                  {costPerCup && <div className="bean-stat" style={{ borderColor:"var(--latte)", background:"#FDF6EF" }}><span className="bean-stat-val" style={{ fontSize:"0.78rem", color:"var(--latte)", fontWeight:700 }}>{formatCostPerCup(costPerCup,currency,usdRate)}</span><span className="bean-stat-lbl" style={{ color:"var(--latte)" }}>{currency==="USD"?"$/cup":(lang==="en"?"₩/cup":"원/잔")}</span></div>}
                </div>
                {bean.note && <div style={{ fontSize:"0.78rem", color:"var(--muted)", lineHeight:1.55, marginBottom:"12px", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>{bean.note}</div>}
                <div className="bean-card-footer">
                  <div className="bean-days-chip">{bean.buyDate&&`${lang==="en"?"Purchased":"구매"} ${bean.buyDate}`}</div>
                  <div className="bean-actions">
                    <button className="bean-btn" onClick={()=>{ setEditTarget(bean); setShowModal(true); }}>
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M9.5 1.5l3 3-7 7H2.5v-3l7-7z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>
                    </button>
                    <button className="bean-btn danger" onClick={()=>handleDelete(bean.id)}>
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M2.5 3.5h9M4.5 3.5V2.5c0-.28.22-.5.5-.5h4c.28 0 .5.22.5.5v1M5.5 6v4M8.5 6v4M3 3.5l.7 8c.02.4.35.7.76.7h6.08c.4 0 .73-.3.76-.7l.7-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {showModal && <BeanModal lang={lang} user={user} editTarget={editTarget} onClose={()=>setShowModal(false)}
        onSaved={(savedForm)=>{
          loadBeans();
          // 신규 원두 등록 시에만 첫 추출 제안 표시
          if (!editTarget) setFirstBrewTarget(savedForm);
        }}/>}
      {firstBrewTarget && (
        <FirstBrewSuggestionModal
          bean={firstBrewTarget}
          lang={lang}
          user={user}
          onClose={()=>setFirstBrewTarget(null)}
        />
      )}
    </div>
  );
}
