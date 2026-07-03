/* ============================================================
   BREWLOG NOTE — src/components/modals/MyModal.jsx
   MY 설정 모달
   ─ 한 줄 소개 (bio) 수정
   ─ 프로필 공개/비공개 토글
   ─ 비밀번호 변경 (Google 로그인 시 숨김)
   ─ 프리셋 관리 (보기/수정/삭제)
   ─ 차단 목록 관리
   ─ 통화 설정 (KRW / USD)
   ─ 내 레시피 Excel 내보내기
   ─ 구글 드라이브 백업 (수동 + 자동)
   ─ 엑셀에서 레시피 가져오기 (RecipeImporter)
   ============================================================ */
import { useState, useEffect } from "react";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import {
  doc, getDoc, updateDoc, getDocs,
  collection, query, where, addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../../config/firebase";
import { I18N }           from "../../constants/localization";
import { COFFEE_MENUS }   from "../../constants/coffeeMenus";
import {
  loadPresets, savePresets,
  loadCurrency, saveCurrency, loadCachedRate,
} from "../../utils/storage";

// ── RecipeImporter (내부 서브컴포넌트) ───────────────────────────
function RecipeImporter({ lang, user }) {
  const [importFile,   setImportFile]   = useState(null);
  const [importing,    setImporting]    = useState(false);
  const [importResult, setImportResult] = useState(null);

  const doImport = async () => {
    if (!importFile || !user?.uid) return;
    setImporting(true);
    setImportResult(null);
    try {
      if (!window.XLSX) {
        await new Promise((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
          s.onload = resolve; s.onerror = reject;
          document.head.appendChild(s);
        });
      }
      const XLSX = window.XLSX;
      const buf  = await importFile.arrayBuffer();
      const wb   = XLSX.read(buf, { type: "array" });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

      // 1행=헤더, 2행=예시, 3행=설명 건너뜀
      const dataRows = rows.slice(3).filter((r) =>
        r.some((c) => String(c).trim() !== "")
      );
      if (!dataRows.length) {
        setImportResult({ type: "error", text: "가져올 데이터가 없어요." });
        setImporting(false);
        return;
      }

      const MENU_MAP = {
        에스프레소:"espresso", 리스트레토:"ristretto", 룽고:"lungo",
        아메리카노:"americano", 롱블랙:"long_black", 카페라떼:"latte",
        라떼:"latte", 카푸치노:"cappuccino", 플랫화이트:"flatwhite",
        마끼아또:"macchiato", 핸드드립:"hand_drip", 콜드브루:"cold_brew",
        기타:"other",
        espresso:"espresso", ristretto:"ristretto", lungo:"lungo",
        americano:"americano", "long black":"long_black", latte:"latte",
        cappuccino:"cappuccino", "flat white":"flatwhite", macchiato:"macchiato",
        "hand drip":"hand_drip", "cold brew":"cold_brew", other:"other",
      };

      let ok = 0, fail = 0;
      for (const r of dataRows) {
        try {
          const [
            menuRaw, bean, company, roastDate, recordDate,
            machine, grinder, grindSize, gram, seconds, espressoMl, waterTemp,
            waterType, diluteType, diluteMl, rating, note,
            isPublicRaw, brewPressureBar, continuousMemo,
          ] = r.map((c) => String(c).trim());

          const menuId    = MENU_MAP[menuRaw?.toLowerCase()] || "other";
          const menuDef   = COFFEE_MENUS.find((m) => m.id === menuId);
          const menuLabel = menuDef?.label || menuRaw || "";
          const isPublic  = isPublicRaw?.toUpperCase() !== "FALSE";

          await addDoc(collection(db, "recipes"), {
            menuId, menuLabel, bean, company, roastDate, recordDate,
            machine, grinder, grindSize, gram, seconds, espressoMl,
            waterTemp: waterTemp || "93", waterType, diluteType, diluteMl,
            rating:    parseInt(rating) || 0,
            note:      note || "",
            isPublic,
            brewPressureBar: brewPressureBar || null,
            continuousMemo:  continuousMemo  || "",
            author:    user.displayName,
            uid:       user.uid,
            isImported: true,
            createdAt: serverTimestamp(),
          });
          ok++;
        } catch {
          fail++;
        }
      }
      setImportResult({
        type: ok > 0 ? "ok" : "error",
        text: `${ok}개 가져오기 완료${fail > 0 ? ` (${fail}개 실패)` : ""} ✓`,
      });
    } catch (e) {
      setImportResult({ type: "error", text: "오류: " + e.message });
    }
    setImporting(false);
  };

  return (
    <div>
      <input
        type="file" accept=".xlsx,.xls"
        onChange={(e) => { setImportFile(e.target.files[0] || null); setImportResult(null); }}
        style={{ width:"100%", marginBottom:"10px" }}
      />
      {importFile && (
        <button onClick={doImport} disabled={importing}
          style={{ width:"100%", padding:"10px", background: importing ? "var(--steam)" : "var(--espresso)", color: importing ? "var(--muted)" : "var(--cream)", border:"none", borderRadius:"8px", fontFamily:"'DM Sans',sans-serif", fontSize:"0.88rem", cursor: importing ? "not-allowed" : "pointer" }}>
          {importing ? "가져오는 중…" : "선택한 파일 가져오기"}
        </button>
      )}
      {importResult && (
        <p style={{ marginTop:"8px", fontSize:"0.82rem", color: importResult.type === "ok" ? "#27ae60" : "#c0392b" }}>
          {importResult.text}
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
export default function MyModal({ onClose, user, lang = "ko", onLogout, onShowTutorial }) {
  const t = I18N[lang];

  // ── 비밀번호 ─────────────────────────────────────────────────────
  const [curPw,        setCurPw]        = useState("");
  const [newPw,        setNewPw]        = useState("");
  const [newPwConfirm, setNewPwConfirm] = useState("");
  const [pwMsg,        setPwMsg]        = useState(null);
  const [pwSaving,     setPwSaving]     = useState(false);

  // ── 통화 ────────────────────────────────────────────────────────
  const [currency, setCurrencyState] = useState(loadCurrency());
  const handleCurrency = (c) => { setCurrencyState(c); saveCurrency(c); };

  // ── 프로필 공개 / bio ────────────────────────────────────────────
  const [profilePublicMy, setProfilePublicMy] = useState(true);
  const [bio,             setBio]             = useState("");
  const [bioSaving,       setBioSaving]       = useState(false);
  const [bioMsg,          setBioMsg]          = useState(null);

  useEffect(() => {
    if (!user?.uid) return;
    getDoc(doc(db, "users", user.uid)).then((snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setProfilePublicMy(d.profilePublic !== false);
        setBio(d.bio || "");
      }
    }).catch(() => {});
  }, [user?.uid]);

  const toggleMyProfilePublic = async () => {
    const next = !profilePublicMy;
    setProfilePublicMy(next);
    try { await updateDoc(doc(db, "users", user.uid), { profilePublic: next }); } catch {}
  };

  const saveBio = async () => {
    if (bio.length > 100) {
      setBioMsg({ type:"error", text: lang==="en" ? "Max 100 characters." : "최대 100자까지 입력할 수 있어요." });
      return;
    }
    setBioSaving(true); setBioMsg(null);
    try {
      await updateDoc(doc(db, "users", user.uid), { bio: bio.trim() });
      setBioMsg({ type:"ok", text: lang==="en" ? "Saved ✓" : "저장됐어요 ✓" });
      setTimeout(() => setBioMsg(null), 2000);
    } catch {
      setBioMsg({ type:"error", text: lang==="en" ? "Save failed." : "저장에 실패했어요." });
    }
    setBioSaving(false);
  };

  // ── 프리셋 관리 ─────────────────────────────────────────────────
  const [myPresets,     setMyPresets]     = useState(() => loadPresets(user?.uid));
  const [editingPreset, setEditingPreset] = useState(null);

  const delPreset = (id) => {
    const updated = myPresets.filter((p) => p.id !== id);
    savePresets(user?.uid, updated);
    setMyPresets(updated);
  };
  const saveEditingPreset = () => {
    if (!editingPreset || !editingPreset.name?.trim()) return;
    const updated = myPresets.map((p) =>
      p.id === editingPreset.id ? { ...editingPreset, name: editingPreset.name.trim() } : p
    );
    savePresets(user?.uid, updated);
    setMyPresets(updated);
    setEditingPreset(null);
  };
  const setEP = (k, v) => setEditingPreset((p) => ({ ...p, [k]: v }));

  // ── 비밀번호 변경 ────────────────────────────────────────────────
  const handlePwChange = async () => {
    setPwMsg(null);
    if (!curPw) return setPwMsg({ type:"error", text:"현재 비밀번호를 입력해주세요." });
    if (!newPw) return setPwMsg({ type:"error", text:"새 비밀번호를 입력해주세요." });
    if (newPw.length < 6) return setPwMsg({ type:"error", text:"비밀번호는 6자 이상이어야 해요." });
    if (newPw !== newPwConfirm) return setPwMsg({ type:"error", text:"새 비밀번호가 일치하지 않습니다." });
    setPwSaving(true);
    try {
      const credential = EmailAuthProvider.credential(user?.email, curPw);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPw);
      setPwMsg({ type:"ok", text:"비밀번호가 변경됐어요 ✓" });
      setCurPw(""); setNewPw(""); setNewPwConfirm("");
    } catch (e) {
      setPwMsg({
        type:"error",
        text: (e.code === "auth/wrong-password" || e.code === "auth/invalid-credential")
          ? "현재 비밀번호가 올바르지 않습니다."
          : "오류: " + e.message,
      });
    }
    setPwSaving(false);
  };

  // ── 레시피 내보내기 ──────────────────────────────────────────────
  const [exporting,  setExporting]  = useState(false);
  const [exportMsg,  setExportMsg]  = useState(null);

  const exportMyRecipes = async () => {
    if (!user?.uid) return;
    setExporting(true); setExportMsg(null);
    try {
      if (!window.XLSX) {
        await new Promise((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
          s.onload = resolve; s.onerror = reject;
          document.head.appendChild(s);
        });
      }
      const XLSX = window.XLSX;
      const snap = await getDocs(query(collection(db, "recipes"), where("uid", "==", user.uid)));
      const recipes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      recipes.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

      if (!recipes.length) {
        setExportMsg({ type:"error", text: lang==="en" ? "No recipes to export." : "내보낼 레시피가 없어요." });
        setExporting(false); return;
      }

      const fmtDate = (v) => {
        if (!v) return "";
        if (v?.toDate) return v.toDate().toISOString().slice(0, 10);
        return typeof v === "string" ? v.slice(0, 10) : "";
      };
      const WATER_LABEL = { tap:"수돗물", filter:"정수기", bottle:"생수", other:"기타" };
      const headers = ["메뉴","원두명","원두회사","로스팅일자","기록날짜","커피머신","그라인더","분쇄도","원두량(g)","추출시간(s)","추출량(ml)","물온도(°C)","물종류","희석종류","희석량(ml)","별점(1-5)","메모","공개(TRUE/FALSE)","추출압력(BAR)","연속추출메모","하트수","작성일시"];
      const rows = recipes.map((r) => {
        const menuDef   = COFFEE_MENUS.find((m) => m.id === r.menuId);
        const menuLabel = lang === "en" ? (menuDef?.labelEn || r.menuLabel || "") : (r.menuLabel || menuDef?.label || "");
        return [menuLabel, r.bean||"", r.company||"", r.roastDate||"", r.recordDate||fmtDate(r.createdAt), r.machine||"", r.grinder||"", r.grindSize||"", r.gram||"", r.seconds||"", r.espressoMl||"", r.waterTemp||"", WATER_LABEL[r.waterType]||r.waterType||"", r.diluteType||"", r.diluteMl||"", r.rating||0, r.note||"", r.isPublic!==false?"TRUE":"FALSE", r.brewPressureBar||"", r.continuousMemo||"", r.likedBy?.length||0, fmtDate(r.createdAt)];
      });

      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      ws["!cols"] = [14,18,14,12,12,18,16,8,10,10,10,10,12,14,10,8,30,14,14,20,6,14].map((w) => ({ wch: w }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, lang==="en" ? "My Recipes" : "내 레시피");
      const today = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `brewlog_my_recipes_${today}.xlsx`);
      setExportMsg({ type:"ok", text: lang==="en" ? `${recipes.length} recipes exported ✓` : `${recipes.length}개 레시피를 내보냈어요 ✓` });
    } catch (e) {
      setExportMsg({ type:"error", text: lang==="en" ? "Export failed: " + e.message : "내보내기 실패: " + e.message });
    }
    setExporting(false);
  };

  // ── 구글 드라이브 백업 ────────────────────────────────────────────
  const GDRIVE_TOKEN_KEY = `brewlog_gdrive_token_${user?.uid}`;
  const GDRIVE_AUTO_KEY  = `brewlog_gdrive_auto_${user?.uid}`;

  const [driveToken,   setDriveToken]   = useState(() => sessionStorage.getItem(GDRIVE_TOKEN_KEY) || null);
  const [driveAuto,    setDriveAuto]    = useState(() => localStorage.getItem(GDRIVE_AUTO_KEY) === "true");
  const [driveLoading, setDriveLoading] = useState(false);
  const [driveMsg,     setDriveMsg]     = useState(null);

  const loadGis = () => new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) { resolve(); return; }
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });

  const connectDrive = async () => {
    const clientId = import.meta.env.VITE_GDRIVE_CLIENT_ID;
    if (!clientId) { setDriveMsg({ type:"error", text:"VITE_GDRIVE_CLIENT_ID 환경변수가 없어요." }); return; }
    setDriveLoading(true); setDriveMsg(null);
    try {
      await loadGis();
      await new Promise((resolve, reject) => {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: "https://www.googleapis.com/auth/drive.file",
          callback: (resp) => {
            if (resp.error) { reject(new Error(resp.error)); return; }
            sessionStorage.setItem(GDRIVE_TOKEN_KEY, resp.access_token);
            setDriveToken(resp.access_token);
            resolve();
          },
        });
        client.requestAccessToken({ prompt: "consent" });
      });
      setDriveMsg({ type:"ok", text: lang==="en" ? "Google Drive connected ✓" : "구글 드라이브 연결됐어요 ✓" });
    } catch (e) {
      setDriveMsg({ type:"error", text: lang==="en" ? "Connection failed: " + e.message : "연결 실패: " + e.message });
    }
    setDriveLoading(false);
  };

  const backupToDrive = async (token) => {
    const useToken = token || driveToken;
    if (!useToken || !user?.uid) return false;
    if (!window.XLSX) {
      await new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
        s.onload = resolve; s.onerror = reject;
        document.head.appendChild(s);
      });
    }
    const XLSX = window.XLSX;
    const snap = await getDocs(query(collection(db, "recipes"), where("uid","==",user.uid)));
    const recipes = snap.docs.map((d) => ({ id:d.id, ...d.data() }));
    recipes.sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0));
    if (!recipes.length) return false;

    const fmtDate = (v) => { if (!v) return ""; if (v?.toDate) return v.toDate().toISOString().slice(0,10); return typeof v==="string"?v.slice(0,10):""; };
    const WATER_LABEL = { tap:"수돗물", filter:"정수기", bottle:"생수", other:"기타" };
    const headers = ["메뉴","원두명","원두회사","로스팅일자","기록날짜","커피머신","그라인더","분쇄도","원두량(g)","추출시간(s)","추출량(ml)","물온도(°C)","물종류","희석종류","희석량(ml)","별점(1-5)","메모","공개(TRUE/FALSE)","추출압력(BAR)","연속추출메모","하트수","작성일시"];
    const rows = recipes.map((r) => {
      const md = COFFEE_MENUS.find((m) => m.id === r.menuId);
      return [lang==="en"?(md?.labelEn||r.menuLabel||""):(r.menuLabel||md?.label||""), r.bean||"", r.company||"", r.roastDate||"", r.recordDate||fmtDate(r.createdAt), r.machine||"", r.grinder||"", r.grindSize||"", r.gram||"", r.seconds||"", r.espressoMl||"", r.waterTemp||"", WATER_LABEL[r.waterType]||r.waterType||"", r.diluteType||"", r.diluteMl||"", r.rating||0, r.note||"", r.isPublic!==false?"TRUE":"FALSE", r.brewPressureBar||"", r.continuousMemo||"", r.likedBy?.length||0, fmtDate(r.createdAt)];
    });
    const ws = XLSX.utils.aoa_to_sheet([headers,...rows]);
    ws["!cols"] = [14,18,14,12,12,18,16,8,10,10,10,10,12,14,10,8,30,14,14,20,6,14].map((w) => ({ wch:w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, lang==="en"?"My Recipes":"내 레시피");
    const buf = XLSX.write(wb, { type:"array", bookType:"xlsx" });
    const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
    const fileName = "brewlog_backup.xlsx";
    const authHeader = { Authorization: `Bearer ${useToken}` };
    const boundary   = "brewlog_boundary";
    const metadata   = { name: fileName, mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" };

    // 폴더 찾기 or 생성
    const folderSearch = await fetch(`https://www.googleapis.com/drive/v3/files?q=name%3D'Brewlog'%20and%20mimeType%3D'application%2Fvnd.google-apps.folder'%20and%20trashed%3Dfalse&fields=files(id)`, { headers: authHeader }).then((r) => r.json());
    let folderId = folderSearch.files?.[0]?.id;
    if (!folderId) {
      const fr = await fetch("https://www.googleapis.com/drive/v3/files", { method:"POST", headers:{...authHeader,"Content-Type":"application/json"}, body: JSON.stringify({name:"Brewlog",mimeType:"application/vnd.google-apps.folder"}) }).then((r) => r.json());
      folderId = fr.id;
    }
    // 기존 파일 찾기
    const fileSearch = await fetch(`https://www.googleapis.com/drive/v3/files?q=name%3D'${fileName}'%20and%20'${folderId}'%20in%20parents%20and%20trashed%3Dfalse&fields=files(id)`, { headers: authHeader }).then((r) => r.json());
    const mkBody = (m) => [`--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(m)}\r\n`,`--${boundary}\r\nContent-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\nContent-Transfer-Encoding: base64\r\n\r\n${b64}\r\n`,`--${boundary}--`].join("");

    if (fileSearch.files?.length > 0) {
      const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileSearch.files[0].id}?uploadType=multipart`, { method:"PATCH", headers:{...authHeader,"Content-Type":`multipart/related; boundary=${boundary}`}, body: mkBody(metadata) });
      if (!res.ok) throw new Error(await res.text());
    } else {
      metadata.parents = [folderId];
      const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`, { method:"POST", headers:{...authHeader,"Content-Type":`multipart/related; boundary=${boundary}`}, body: mkBody(metadata) });
      if (!res.ok) throw new Error(await res.text());
    }
    return true;
  };

  const handleManualBackup = async () => {
    setDriveLoading(true); setDriveMsg(null);
    try {
      await backupToDrive();
      const now = new Date().toLocaleString(lang==="en"?"en-US":"ko-KR");
      setDriveMsg({ type:"ok", text: lang==="en" ? `Backed up ✓ (${now})` : `구글 드라이브에 백업됐어요 ✓ (${now})` });
    } catch (e) {
      if (e.message?.includes("401") || e.message?.includes("invalid_token")) {
        sessionStorage.removeItem(GDRIVE_TOKEN_KEY); setDriveToken(null);
        setDriveMsg({ type:"error", text: lang==="en" ? "Session expired. Reconnect." : "세션이 만료됐어요. 다시 연결해 주세요." });
      } else {
        setDriveMsg({ type:"error", text: lang==="en" ? "Backup failed: " + e.message : "백업 실패: " + e.message });
      }
    }
    setDriveLoading(false);
  };

  const toggleDriveAuto = () => {
    const next = !driveAuto;
    setDriveAuto(next);
    localStorage.setItem(GDRIVE_AUTO_KEY, String(next));
    setDriveMsg({ type:"ok", text: next ? (lang==="en"?"Auto backup enabled.":"자동 백업 켜짐.") : (lang==="en"?"Auto backup disabled.":"자동 백업 꺼짐.") });
  };

  // ── 차단 목록 ────────────────────────────────────────────────────
  const BLOCKED_KEY = `brewlog_blocked_${user?.uid}`;
  const [blockedIds,      setBlockedIds]      = useState(() => {
    try { return JSON.parse(localStorage.getItem(BLOCKED_KEY) || "[]"); } catch { return []; }
  });
  const [blockedProfiles, setBlockedProfiles] = useState([]);

  useEffect(() => {
    if (!blockedIds.length) { setBlockedProfiles([]); return; }
    Promise.all(
      blockedIds.map((id) =>
        getDoc(doc(db, "users", id))
          .then((d) => d.exists() ? { id, ...d.data() } : { id, nickname: id.slice(0,8) + "…" })
      )
    ).then(setBlockedProfiles).catch(() => {});
  }, [blockedIds.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  const unblock = async (uid) => {
    const newList = blockedIds.filter((id) => id !== uid);
    localStorage.setItem(BLOCKED_KEY, JSON.stringify(newList));
    await updateDoc(doc(db, "users", user.uid), { blockedUsers: newList }).catch(() => {});
    setBlockedIds(newList);
    setBlockedProfiles((p) => p.filter((u) => u.id !== uid));
  };

  const tabBtn = (active) => ({
    flex:1, height:"42px", border:"1px solid",
    borderColor: active ? "var(--espresso)" : "var(--steam)",
    background:  active ? "var(--espresso)" : "var(--foam)",
    color:       active ? "var(--cream)"    : "var(--muted)",
    fontFamily:"'DM Sans',sans-serif", fontSize:"0.88rem",
    fontWeight: active ? 600 : 400,
    borderRadius:"8px", cursor:"pointer", transition:"all 0.2s",
  });

  // ── JSX ─────────────────────────────────────────────────────────
  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2>{lang === "en" ? "My Settings" : "MY 설정"}</h2>

        {/* ── 한 줄 소개 ── */}
        <div className="my-section">
          <div className="my-section-title" style={{ display:"flex", alignItems:"center", gap:"6px" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h8M2 12h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
            {lang === "en" ? "Bio" : "한 줄 소개"}
          </div>
          <div style={{ position:"relative" }}>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)}
              placeholder={lang==="en" ? "e.g. Espresso purist ☕ Single-origin explorer" : "예) 에스프레소 순수주의자 · 싱글오리진 탐험가"}
              maxLength={100} rows={2}
              style={{ width:"100%", padding:"0.75rem 1rem", border:"1px solid var(--steam)", borderRadius:"var(--r-btn)", background:"var(--cream)", fontFamily:"'DM Sans',sans-serif", fontSize:"0.9rem", color:"var(--espresso)", outline:"none", resize:"none", lineHeight:1.55, transition:"border-color 0.2s, box-shadow 0.2s", boxSizing:"border-box" }}
              onFocus={(e) => { e.target.style.borderColor="var(--latte)"; e.target.style.boxShadow="0 0 0 3px rgba(176,125,84,0.12)"; }}
              onBlur={(e)  => { e.target.style.borderColor="var(--steam)";  e.target.style.boxShadow="none"; }}
            />
            <span style={{ position:"absolute", bottom:"8px", right:"10px", fontFamily:"'DM Sans',sans-serif", fontSize:"0.65rem", color: bio.length > 90 ? "#e67e22" : "var(--muted)", pointerEvents:"none" }}>
              {bio.length}/100
            </span>
          </div>
          {bioMsg && (
            <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.78rem", marginTop:"6px", color: bioMsg.type==="ok" ? "#27ae60" : "#c0392b" }}>
              {bioMsg.text}
            </p>
          )}
          <div className="save-row">
            <button className="btn-save-sm" onClick={saveBio} disabled={bioSaving}>
              {bioSaving ? (lang==="en"?"Saving…":"저장 중…") : (lang==="en"?"Save":"저장")}
            </button>
          </div>
        </div>

        {/* ── 프로필 공개/비공개 ── */}
        <div className="my-section">
          <div className="my-section-title" style={{ display:"flex", alignItems:"center", gap:"6px" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.3"/><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
            {lang === "en" ? "Profile Visibility" : "프로필 공개 설정"}
          </div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 14px", background:"var(--cream)", borderRadius:"var(--r-btn)", border:"1px solid var(--divider)" }}>
            <div>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.85rem", fontWeight:500, color:"var(--espresso)", marginBottom:"2px" }}>
                {profilePublicMy ? (lang==="en"?"Public Profile":"공개 프로필") : (lang==="en"?"Private Profile":"비공개 프로필")}
              </div>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.72rem", color:"var(--muted)", lineHeight:1.4 }}>
                {profilePublicMy
                  ? (lang==="en"?"Anyone can view your profile.":"누구나 내 프로필과 통계를 볼 수 있어요.")
                  : (lang==="en"?"Only you can see your profile details.":"나만 내 프로필 상세를 볼 수 있어요.")}
              </div>
            </div>
            <div onClick={toggleMyProfilePublic}
              style={{ width:"44px", height:"24px", borderRadius:"12px", background: profilePublicMy ? "var(--latte)" : "var(--steam)", position:"relative", cursor:"pointer", transition:"background 0.2s", flexShrink:0, marginLeft:"12px" }}>
              <div style={{ position:"absolute", top:"3px", left: profilePublicMy ? "23px" : "3px", width:"18px", height:"18px", borderRadius:"50%", background:"white", boxShadow:"0 1px 4px rgba(0,0,0,0.2)", transition:"left 0.2s" }}/>
            </div>
          </div>
        </div>

        {/* ── 비밀번호 변경 (Google 로그인 시 숨김) ── */}
        {!user?.providerData?.some((p) => p.providerId === "google.com") && (
          <div className="my-section">
            <div className="my-section-title" style={{ display:"flex", alignItems:"center", gap:"6px" }}>
              <svg width="13" height="14" viewBox="0 0 14 16" fill="none"><rect x="2" y="7" width="10" height="8" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M4.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
              {lang === "en" ? "Change Password" : "비밀번호 변경"}
            </div>
            {[
              { lbl: lang==="en"?"Current Password":"현재 비밀번호", val:curPw, set:setCurPw },
              { lbl: lang==="en"?"New Password":"새 비밀번호", val:newPw, set:setNewPw, hint: lang==="en"?"Min 6 characters":"6자 이상" },
              { lbl: lang==="en"?"Confirm New Password":"새 비밀번호 확인", val:newPwConfirm, set:setNewPwConfirm,
                style: { borderColor: newPwConfirm.length > 0 ? (newPw === newPwConfirm ? "#27ae60" : "#c0392b") : undefined } },
            ].map(({ lbl, val, set: setFn, hint, style }) => (
              <div key={lbl} className="field full" style={{ marginBottom:"10px" }}>
                <label>{lbl}</label>
                <input type="password" value={val} onChange={(e) => setFn(e.target.value)}
                  placeholder={hint || "••••••••"} style={style}/>
              </div>
            ))}
            {newPwConfirm.length > 0 && newPw === newPwConfirm && <p className="msg-ok" style={{ marginTop:"4px" }}>일치합니다 ✓</p>}
            {newPwConfirm.length > 0 && newPw !== newPwConfirm && <p className="msg-error" style={{ marginTop:"4px" }}>일치하지 않습니다.</p>}
            <div style={{ display:"flex", justifyContent:"flex-end" }}>
              <button className="btn-save-sm" onClick={handlePwChange} disabled={pwSaving}>
                {pwSaving ? (lang==="en"?"Saving…":"변경 중…") : (lang==="en"?"Change Password":"비밀번호 변경")}
              </button>
            </div>
            {pwMsg && <p className={pwMsg.type==="error" ? "msg-error" : "msg-ok"} style={{ marginTop:"8px" }}>{pwMsg.text}</p>}
          </div>
        )}

        {/* ── 프리셋 관리 ── */}
        <div className="my-section">
          <div className="my-section-title" style={{ display:"flex", alignItems:"center", gap:"6px" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="3.5" width="13" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M5 3.5V2M11 3.5V2M1.5 7.5h13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><path d="M5 10.5h2.5M9 10.5h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
            {lang === "en" ? "Recipe Presets" : "레시피 프리셋"}
          </div>
          {myPresets.length === 0 ? (
            <p style={{ fontSize:"0.8rem", color:"var(--muted)", lineHeight:1.6 }}>
              {lang === "en"
                ? "No presets yet. Save your settings in the recipe form."
                : "저장된 프리셋이 없어요. 레시피 기록 시 '현재 설정 저장' 버튼으로 추가할 수 있어요."}
            </p>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
              {myPresets.map((p) => (
                <div key={p.id} style={{ background:"var(--cream)", border:"1px solid var(--divider)", borderRadius:"8px", padding:"14px" }}>
                  {editingPreset?.id === p.id ? (
                    /* 수정 모드 */
                    <div>
                      <div className="field full" style={{ marginBottom:"10px" }}>
                        <label>{lang==="en"?"Preset Name":"프리셋 이름"}</label>
                        <input value={editingPreset.name} onChange={(e) => setEP("name", e.target.value)} autoFocus/>
                      </div>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px", marginBottom:"10px" }}>
                        <div className="field" style={{ marginBottom:0 }}>
                          <label>{lang==="en"?"Menu":"메뉴"}</label>
                          <select value={editingPreset.menuId||""} onChange={(e) => setEP("menuId", e.target.value)}
                            style={{ width:"100%", padding:"0.7rem 0.9rem", border:"1px solid var(--steam)", borderRadius:"8px", fontFamily:"'DM Sans',sans-serif", fontSize:"0.88rem", background:"var(--cream)", color:"var(--espresso)", outline:"none" }}>
                            <option value="">선택</option>
                            {COFFEE_MENUS.map((m) => <option key={m.id} value={m.id}>{lang==="en"?m.labelEn:m.label}</option>)}
                          </select>
                        </div>
                        <div className="field" style={{ marginBottom:0 }}>
                          <label>HOT / ICE</label>
                          <div style={{ display:"flex", gap:"6px", height:"42px" }}>
                            {["hot","ice"].map((v) => (
                              <button key={v} type="button" onClick={() => setEP("isIced", v==="ice")}
                                style={{ flex:1, border:"1px solid", borderRadius:"8px", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontSize:"0.82rem", fontWeight:600, transition:"all 0.15s",
                                  borderColor: (v==="ice"?editingPreset.isIced:!editingPreset.isIced) ? (v==="ice"?"#2980b9":"#e67e22") : "var(--steam)",
                                  background:  (v==="ice"?editingPreset.isIced:!editingPreset.isIced) ? (v==="ice"?"#EBF5FB":"#FEF3E8") : "var(--foam)",
                                  color:       (v==="ice"?editingPreset.isIced:!editingPreset.isIced) ? (v==="ice"?"#2980b9":"#e67e22") : "var(--muted)" }}>
                                {v==="ice"?"ICE":"HOT"}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px", marginBottom:"10px" }}>
                        {[
                          { lbl:lang==="en"?"Machine Brand":"머신 브랜드", key:"machineBrand", ph:"e.g. Breville" },
                          { lbl:lang==="en"?"Machine Model":"머신 모델",  key:"machineModel", ph:"e.g. Barista Express" },
                          { lbl:lang==="en"?"Grinder Brand":"그라인더 브랜드", key:"grinderBrand", ph:"e.g. Baratza" },
                          { lbl:lang==="en"?"Grinder Model":"그라인더 모델",  key:"grinderModel", ph:"e.g. Encore" },
                        ].map(({ lbl, key, ph }) => (
                          <div key={key} className="field" style={{ marginBottom:0 }}>
                            <label>{lbl}</label>
                            <input value={editingPreset[key]||""} onChange={(e) => setEP(key, e.target.value)} placeholder={ph}/>
                          </div>
                        ))}
                      </div>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px", marginBottom:"10px" }}>
                        {[
                          { lbl:lang==="en"?"Dose (g)":"원두량 (g)",      key:"gram",            ph:"18",  type:"number" },
                          { lbl:lang==="en"?"Grind Size":"분쇄도",         key:"grindSize",       ph:"13",  type:"number" },
                          { lbl:lang==="en"?"Infusion (s)":"인퓨전 (초)", key:"infusionSeconds", ph:"0",   type:"number" },
                          { lbl:lang==="en"?"Total Time (s)":"총 시간 (초)", key:"seconds",       ph:"27",  type:"number" },
                          { lbl:lang==="en"?"Yield (ml)":"추출량 (ml)",    key:"espressoMl",     ph:"36",  type:"number" },
                          ...(!editingPreset.isIced ? [{ lbl:lang==="en"?"Temp (°C)":"물온도 (°C)", key:"waterTemp", ph:"93", type:"number" }] : []),
                        ].map(({ lbl, key, ph, type }) => (
                          <div key={key} className="field" style={{ marginBottom:0 }}>
                            <label>{lbl}</label>
                            <input type={type||"text"} value={editingPreset[key]||""} onChange={(e) => setEP(key, e.target.value)} placeholder={ph}/>
                          </div>
                        ))}
                      </div>
                      <div style={{ display:"flex", gap:"8px", justifyContent:"flex-end" }}>
                        <button className="btn-cancel" onClick={() => setEditingPreset(null)}>
                          {lang==="en"?"Cancel":"취소"}
                        </button>
                        <button className="btn-save-sm" onClick={saveEditingPreset}>
                          {lang==="en"?"Save":"저장"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* 보기 모드 */
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:"8px" }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:600, fontSize:"0.9rem", color:"var(--espresso)", marginBottom:"6px" }}>{p.name}</div>
                        <div style={{ display:"flex", flexWrap:"wrap", gap:"4px" }}>
                          {[
                            p.menuId && (COFFEE_MENUS.find((m) => m.id === p.menuId)?.[lang==="en"?"labelEn":"label"]),
                            p.isIced ? "ICE" : null,
                            p.machineBrand && `${p.machineBrand}${p.machineModel?" "+p.machineModel:""}`,
                            p.grinderBrand && `${p.grinderBrand}${p.grinderModel?" "+p.grinderModel:""}`,
                            p.gram && `${p.gram}g`,
                            p.seconds && `${p.seconds}s`,
                            p.espressoMl && `${p.espressoMl}ml`,
                            p.waterTemp && `${p.waterTemp}°C`,
                            p.grindSize && `분쇄도 ${p.grindSize}`,
                          ].filter(Boolean).map((tag, i) => (
                            <span key={i} style={{ padding:"2px 7px", background:"var(--foam)", border:"1px solid var(--divider)", borderRadius:"4px", fontSize:"0.7rem", color:"var(--muted)" }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div style={{ display:"flex", gap:"6px", flexShrink:0 }}>
                        <button onClick={() => setEditingPreset({ ...p })}
                          style={{ background:"none", border:"1px solid var(--steam)", borderRadius:"6px", padding:"5px 10px", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontSize:"0.72rem", color:"var(--muted)" }}>
                          {lang==="en"?"Edit":"수정"}
                        </button>
                        <button onClick={() => delPreset(p.id)}
                          style={{ background:"none", border:"1px solid #c0392b30", borderRadius:"6px", padding:"5px 10px", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontSize:"0.72rem", color:"#c0392b" }}>
                          {lang==="en"?"Delete":"삭제"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── 차단 목록 ── */}
        <div className="my-section">
          <div className="my-section-title" style={{ display:"flex", alignItems:"center", gap:"6px" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/><path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
            {lang === "en" ? "Blocked Users" : "차단 목록"}
          </div>
          {blockedIds.length === 0 ? (
            <p style={{ fontSize:"0.8rem", color:"var(--muted)" }}>
              {lang === "en" ? "No blocked users." : "차단한 사용자가 없어요."}
            </p>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
              {blockedProfiles.map((u) => (
                <div key={u.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:"var(--cream)", border:"1px solid var(--divider)", borderRadius:"8px", padding:"10px 14px" }}>
                  <span style={{ fontSize:"0.85rem", fontWeight:500, color:"var(--espresso)" }}>@{u.nickname || u.id}</span>
                  <button onClick={() => unblock(u.id)}
                    style={{ background:"none", border:"1px solid var(--steam)", borderRadius:"6px", padding:"4px 10px", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontSize:"0.72rem", color:"var(--muted)" }}>
                    {lang === "en" ? "Unblock" : "차단 해제"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── 통화 설정 ── */}
        <div className="my-section">
          <div className="my-section-title" style={{ display:"flex", alignItems:"center", gap:"6px" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/><path d="M8 5v6M6 6.5h2.5a1.5 1.5 0 0 1 0 3H6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
            {lang === "en" ? "Currency" : "통화 설정"}
          </div>
          <p style={{ fontSize:"0.78rem", color:"var(--muted)", marginBottom:"10px", lineHeight:1.5 }}>
            {lang === "en" ? "Set the currency displayed in Bean Vault." : "내 원두 재고에서 표시되는 금액 단위를 설정해요."}
          </p>
          <div style={{ display:"flex", gap:"8px" }}>
            {[
              { val:"KRW", label:"₩ 원화 (KRW)", labelEn:"₩ Korean Won" },
              { val:"USD", label:"$ 달러 (USD)", labelEn:"$ US Dollar" },
            ].map((opt) => (
              <button key={opt.val} type="button" style={tabBtn(currency === opt.val)}
                onClick={() => handleCurrency(opt.val)}>
                {lang === "en" ? opt.labelEn : opt.label}
              </button>
            ))}
          </div>
          {currency === "USD" && (() => {
            const cached = loadCachedRate();
            return (
              <p style={{ fontSize:"0.72rem", color:"var(--latte)", marginTop:"8px", lineHeight:1.5 }}>
                {lang === "en" ? "Prices are converted from KRW using today's rate." : "원화 금액을 오늘 환율로 자동 변환해요."}
                {cached && (
                  <span style={{ marginLeft:"4px", color:"var(--muted)" }}>
                    (1$ = {cached.toLocaleString()}원 · {new Date().toLocaleDateString(lang==="en"?"en-US":"ko-KR")} 기준)
                  </span>
                )}
              </p>
            );
          })()}
        </div>

        {/* ── 내 레시피 내보내기 ── */}
        <div className="my-section">
          <div className="my-section-title" style={{ display:"flex", alignItems:"center", gap:"6px" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 12V4a1 1 0 0 1 1-1h7l4 4v5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/><path d="M9 3v4h4" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/><path d="M6 8l2-2 2 2M8 6v5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {lang === "en" ? "Export My Recipes" : "내 레시피 내보내기"}
          </div>
          <p style={{ fontSize:"0.78rem", color:"var(--muted)", lineHeight:1.6, marginBottom:"14px" }}>
            {lang === "en"
              ? "Download all your brew records as an Excel file (.xlsx)."
              : "내가 기록한 모든 추출 레시피를 엑셀 파일(.xlsx)로 다운받아요."}
          </p>
          {exportMsg && (
            <p style={{ fontSize:"0.82rem", marginBottom:"10px", padding:"8px 12px", borderRadius:"var(--r-btn)", background: exportMsg.type==="ok"?"#eafaf1":"#fdecea", color: exportMsg.type==="ok"?"#27ae60":"#c0392b", border:`1px solid ${exportMsg.type==="ok"?"#a9dfbf":"#f5b7b1"}` }}>
              {exportMsg.text}
            </p>
          )}
          <button onClick={exportMyRecipes} disabled={exporting}
            style={{ width:"100%", padding:"11px 0", background: exporting?"var(--steam)":"var(--espresso)", color: exporting?"var(--muted)":"var(--cream)", border:"none", borderRadius:"var(--r-btn)", fontFamily:"'DM Sans',sans-serif", fontSize:"0.88rem", fontWeight:500, cursor: exporting?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:"8px" }}>
            {exporting ? "내보내는 중…" : (lang==="en"?"Download as Excel (.xlsx)":"엑셀로 다운받기 (.xlsx)")}
          </button>
        </div>

        {/* ── 구글 드라이브 백업 ── */}
        <div className="my-section">
          <div className="my-section-title" style={{ display:"flex", alignItems:"center", gap:"6px" }}>
            <svg width="15" height="13" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
              <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0a15.92 15.92 0 0 0 2.1 7.9z" fill="#0066da"/>
              <path d="M43.65 25L29.9 1.2a15.5 15.5 0 0 0-3.3 3.3L2.1 45.5A15.92 15.92 0 0 0 0 53h27.5z" fill="#00ac47"/>
              <path d="M73.55 76.8a15.5 15.5 0 0 0 3.3-3.3l1.6-2.75 7.65-13.25A15.92 15.92 0 0 0 88.3 50H60.8l5.85 11.5z" fill="#ea4335"/>
              <path d="M43.65 25L57.4 1.2A15.67 15.67 0 0 0 49.5 0h-11.7a15.67 15.67 0 0 0-7.9 1.2z" fill="#00832d"/>
              <path d="M60.8 50H27.5L13.75 73.8a15.67 15.67 0 0 0 7.9 2.2h41.8a15.67 15.67 0 0 0 7.9-2.2z" fill="#2684fc"/>
              <path d="M73.4 26.5l-13.75-23.8a15.5 15.5 0 0 0-3.3-3.3L43.65 25 60.8 50h27.45a15.92 15.92 0 0 0-2.1-7.9z" fill="#ffba00"/>
            </svg>
            {lang === "en" ? "Google Drive Backup" : "구글 드라이브 백업"}
          </div>
          <p style={{ fontSize:"0.78rem", color:"var(--muted)", lineHeight:1.6, marginBottom:"14px" }}>
            {lang === "en"
              ? "Back up all your recipes to your own Google Drive (Brewlog/ folder)."
              : "내 레시피를 내 구글 드라이브의 Brewlog 폴더에 자동 백업해요."}
          </p>
          {driveMsg && (
            <p style={{ fontSize:"0.82rem", marginBottom:"12px", padding:"8px 12px", borderRadius:"var(--r-btn)", background: driveMsg.type==="ok"?"#eafaf1":"#fdecea", color: driveMsg.type==="ok"?"#27ae60":"#c0392b", border:`1px solid ${driveMsg.type==="ok"?"#a9dfbf":"#f5b7b1"}`, lineHeight:1.5 }}>
              {driveMsg.text}
            </p>
          )}
          {!driveToken ? (
            <button onClick={connectDrive} disabled={driveLoading}
              style={{ width:"100%", padding:"11px 0", background: driveLoading?"var(--steam)":"var(--foam)", color: driveLoading?"var(--muted)":"var(--espresso)", border:"1px solid var(--steam)", borderRadius:"var(--r-btn)", fontFamily:"'DM Sans',sans-serif", fontSize:"0.88rem", fontWeight:500, cursor: driveLoading?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:"8px" }}>
              {driveLoading ? "연결 중…" : (lang==="en"?"Connect Google Drive":"구글 드라이브 연결하기")}
            </button>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:"8px", padding:"8px 12px", background:"#eafaf1", border:"1px solid #a9dfbf", borderRadius:"var(--r-btn)", fontSize:"0.78rem", color:"#27ae60" }}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" fill="#27ae60"/><path d="M5 8l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {lang === "en" ? "Connected — saves to Brewlog/ folder" : "연결됨 — 내 드라이브 Brewlog 폴더에 저장돼요"}
                <button onClick={() => { sessionStorage.removeItem(GDRIVE_TOKEN_KEY); setDriveToken(null); setDriveMsg(null); }}
                  style={{ marginLeft:"auto", background:"none", border:"none", cursor:"pointer", fontSize:"0.72rem", color:"#27ae60", textDecoration:"underline", fontFamily:"'DM Sans',sans-serif", padding:0 }}>
                  {lang === "en" ? "Disconnect" : "연결 해제"}
                </button>
              </div>
              <button onClick={handleManualBackup} disabled={driveLoading}
                style={{ width:"100%", padding:"11px 0", background: driveLoading?"var(--steam)":"#4285F4", color: driveLoading?"var(--muted)":"white", border:"none", borderRadius:"var(--r-btn)", fontFamily:"'DM Sans',sans-serif", fontSize:"0.88rem", fontWeight:500, cursor: driveLoading?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:"8px" }}>
                {driveLoading ? "백업 중…" : (lang==="en"?"Backup Now":"지금 바로 백업")}
              </button>
              {/* 자동 백업 토글 */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", background:"var(--cream)", border:"1px solid var(--divider)", borderRadius:"var(--r-btn)" }}>
                <div>
                  <div style={{ fontSize:"0.85rem", fontWeight:500, color:"var(--espresso)", marginBottom:"2px" }}>
                    {lang === "en" ? "Auto Backup" : "자동 백업"}
                  </div>
                  <div style={{ fontSize:"0.72rem", color:"var(--muted)" }}>
                    {lang === "en" ? "Sync to Drive after every recipe save" : "레시피 저장할 때마다 자동으로 백업"}
                  </div>
                </div>
                <div onClick={toggleDriveAuto}
                  style={{ width:"44px", height:"24px", borderRadius:"12px", background: driveAuto?"#4285F4":"var(--steam)", position:"relative", cursor:"pointer", transition:"background var(--transition-base)", flexShrink:0 }}>
                  <div style={{ position:"absolute", top:"3px", left: driveAuto?"23px":"3px", width:"18px", height:"18px", borderRadius:"50%", background:"white", boxShadow:"0 1px 4px rgba(0,0,0,0.2)", transition:"left var(--transition-base)" }}/>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── 엑셀에서 레시피 가져오기 ── */}
        <div className="my-section">
          <div className="my-section-title" style={{ display:"flex", alignItems:"center", gap:"6px" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 12V4a1 1 0 0 1 1-1h7l4 4v5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/><path d="M9 3v4h4" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/><path d="M6 10l2 2 2-2M8 7v5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {lang === "en" ? "Import Recipes from Excel" : "엑셀에서 레시피 가져오기"}
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:"10px", marginBottom:"16px" }}>
            {[
              { step:"01", title:"템플릿 다운로드", desc:"아래 버튼으로 xlsx 템플릿을 받아요" },
              { step:"02", title:"엑셀에서 작성", desc:"1행(헤더)·2행(예시)·3행(설명)은 그대로 두고, 4행부터 레시피를 입력해요" },
              { step:"03", title:"파일 업로드", desc:"저장한 xlsx 파일을 아래에서 선택하면 자동으로 가져와요" },
            ].map(({ step, title, desc }) => (
              <div key={step} style={{ display:"flex", gap:"10px", alignItems:"flex-start" }}>
                <span style={{ fontFamily:"'Playfair Display',serif", fontSize:"0.78rem", fontWeight:700, color:"var(--latte)", flexShrink:0, minWidth:"20px" }}>{step}</span>
                <div>
                  <div style={{ fontSize:"0.82rem", fontWeight:600, color:"var(--espresso)", marginBottom:"1px" }}>{title}</div>
                  <div style={{ fontSize:"0.75rem", color:"var(--muted)", lineHeight:1.5 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
          {/* 템플릿 다운로드 */}
          <button onClick={async () => {
            if (!window.XLSX) {
              await new Promise((r, j) => { const s=document.createElement("script"); s.src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"; s.onload=r; s.onerror=j; document.head.appendChild(s); });
            }
            const XLSX = window.XLSX;
            const headers = ["메뉴","원두명","원두회사","로스팅일자","기록날짜","커피머신","그라인더","분쇄도","원두량(g)","추출시간(s)","추출량(ml)","물온도(°C)","물종류","희석종류","희석량(ml)","별점(1-5)","메모","공개(TRUE/FALSE)","추출압력(BAR)","연속추출메모"];
            const example = ["아메리카노","에티오피아 예가체프","테라로사","2026-05-01","2026-06-01","Breville 870","Baratza Encore","7","18","28","36","93","생수","물","150","4","맛있었음","TRUE","9.2","2샷 연속 추출"];
            const hint    = ["※ 메뉴: 에스프레소/리스트레토/룽고/아메리카노/롱블랙/카페라떼/카푸치노/플랫화이트/마끼아또/핸드드립/콜드브루/기타","","","","","","","","","","","","수돗물/정수기/생수/기타","물/우유/저지방우유/두유/귀리우유/아몬드우유/코코넛우유","","1~5 숫자","","TRUE 또는 FALSE","압력게이지 측정값(선택)","자유 기재(선택)"];
            const ws = XLSX.utils.aoa_to_sheet([headers, example, hint]);
            ws["!cols"] = headers.map((_, i) => ({ wch: [12,16,12,12,12,16,14,8,10,10,10,10,12,14,10,8,20,14,14,18][i] || 12 }));
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "레시피");
            XLSX.writeFile(wb, "brewlog_template.xlsx");
          }}
            style={{ width:"100%", padding:"10px", border:"1px solid var(--steam)", borderRadius:"8px", background:"var(--foam)", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontSize:"0.82rem", color:"var(--espresso)", display:"flex", alignItems:"center", justifyContent:"center", gap:"8px", marginBottom:"10px" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2v8M5 7l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 12h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
            템플릿 다운로드 (xlsx)
          </button>
          <RecipeImporter lang={lang} user={user}/>
        </div>

        {/* 튜토리얼 다시보기 */}
        {onShowTutorial && (
          <button onClick={() => { onShowTutorial(); onClose(); }}
            style={{ width:"100%", padding:"10px", border:"1px dashed var(--latte)", borderRadius:"8px", background:"none", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontSize:"0.82rem", color:"var(--latte)", display:"flex", alignItems:"center", justifyContent:"center", gap:"8px", marginBottom:"20px" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4"/><path d="M8 5v3.5l2.5 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {lang === "en" ? "Replay Tutorial" : "튜토리얼 다시보기"}
          </button>
        )}

        {/* 액션 */}
        <div className="modal-actions" style={{ justifyContent:"space-between" }}>
          <button onClick={onLogout}
            style={{ padding:"0.7rem 1.2rem", background:"none", border:"1px solid #c0392b40", color:"#c0392b", borderRadius:"8px", fontFamily:"'DM Sans',sans-serif", fontSize:"0.85rem", cursor:"pointer" }}>
            {lang === "en" ? "Logout" : "로그아웃"}
          </button>
          <button className="btn-cancel" onClick={onClose}>{lang === "en" ? "Close" : "닫기"}</button>
        </div>
      </div>
    </div>
  );
}
