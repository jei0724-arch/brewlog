/* ============================================================
   BREWLOG NOTE — src/components/modals/CollectionModal.jsx
   레시피 컬렉션(북마크 폴더) 관리 모달
   ─ 폴더 목록 + 레시피 수 표시
   ─ 폴더에 레시피 추가/제거 (체크박스)
   ─ 새 폴더 만들기 (이름 + 컬러 픽커)
   ─ 폴더 이름 수정 / 삭제
   ─ 컬러 변경
   ============================================================ */
import { useState } from "react";

const PRESET_COLORS = [
  "#B07D54", "#e67e22", "#27ae60", "#2980b9",
  "#8e44ad", "#e74c3c", "#16a085", "#d35400",
  "#1A1614", "#7f8c8d",
];

export default function CollectionModal({
  recipeId,        // 추가/제거할 레시피 ID (없으면 폴더 관리 모드)
  collections,     // { folderName: { color, ids } }
  onAddToCollection,
  onCreateCollection,
  onRenameCollection,
  onDeleteCollection,
  onUpdateColor,
  onClose,
  lang = "ko",
}) {
  const isKo        = lang === "ko";
  const folderNames = Object.keys(collections);

  const [newName,    setNewName]    = useState("");
  const [newColor,   setNewColor]   = useState(PRESET_COLORS[0]);
  const [creating,   setCreating]   = useState(false);
  const [editingFolder, setEditingFolder] = useState(null); // folderName | null
  const [editName,   setEditName]   = useState("");
  const [colorPicker, setColorPicker] = useState(null);    // folderName | null

  const handleCreate = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const ok = onCreateCollection(trimmed, newColor);
    if (ok === false) {
      alert(isKo ? "이미 있는 폴더 이름이에요." : "A folder with that name already exists.");
      return;
    }
    setNewName(""); setNewColor(PRESET_COLORS[0]); setCreating(false);
    // 새 폴더에 바로 추가
    if (recipeId) onAddToCollection(recipeId, trimmed);
  };

  const handleRename = (oldName) => {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === oldName) { setEditingFolder(null); return; }
    onRenameCollection(oldName, trimmed);
    setEditingFolder(null);
  };

  const handleDelete = (name) => {
    const msg = isKo
      ? `"${name}" 폴더를 삭제할까요?\n폴더 안의 레시피는 삭제되지 않아요.`
      : `Delete "${name}" folder?\nRecipes inside won't be deleted.`;
    if (!confirm(msg)) return;
    onDeleteCollection(name);
  };

  const folderBtn = (active) => ({
    flex: 1, height: "36px", border: "1px solid",
    borderColor:  active ? "var(--espresso)" : "var(--steam)",
    background:   active ? "var(--espresso)" : "var(--foam)",
    color:        active ? "var(--cream)"    : "var(--muted)",
    fontFamily:   "'DM Sans', sans-serif", fontSize: "0.82rem",
    fontWeight:   active ? 600 : 400,
    borderRadius: "8px", cursor: "pointer", transition: "all 0.15s",
  });

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: "400px" }}>
        <h2 style={{ marginBottom: "4px" }}>
          {recipeId
            ? (isKo ? "컬렉션에 추가" : "Add to Collection")
            : (isKo ? "내 컬렉션" : "My Collections")}
        </h2>
        {recipeId && (
          <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", color: "var(--muted)", marginBottom: "20px" }}>
            {isKo ? "저장할 폴더를 선택하세요" : "Select a folder to save to"}
          </p>
        )}

        {/* 폴더 목록 */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
          {folderNames.length === 0 && (
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem", color: "var(--muted)", textAlign: "center", padding: "16px 0" }}>
              {isKo ? "아직 폴더가 없어요." : "No folders yet."}
            </p>
          )}
          {folderNames.map(name => {
            const folder  = collections[name];
            const isInFolder = recipeId && (folder.ids || []).includes(recipeId);
            const isEditing  = editingFolder === name;
            const isPickingColor = colorPicker === name;

            return (
              <div key={name} style={{ background: "var(--foam)", border: "1px solid var(--divider)", borderRadius: "10px", padding: "12px 14px", borderLeft: `3px solid ${folder.color || "#B07D54"}` }}>
                {/* 폴더 행 */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  {/* 컬러 도트 (클릭 시 픽커) */}
                  <button
                    type="button"
                    onClick={() => setColorPicker(isPickingColor ? null : name)}
                    style={{ width: "20px", height: "20px", borderRadius: "50%", background: folder.color || "#B07D54", border: "2px solid white", boxShadow: "0 1px 4px #0003", cursor: "pointer", flexShrink: 0, outline: isPickingColor ? "2px solid var(--espresso)" : "none", outlineOffset: "2px" }}
                  />

                  {/* 폴더 이름 / 수정 인풋 */}
                  {isEditing ? (
                    <input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") handleRename(name); if (e.key === "Escape") setEditingFolder(null); }}
                      autoFocus
                      style={{ flex: 1, padding: "4px 8px", border: "1px solid var(--latte)", borderRadius: "6px", fontFamily: "'DM Sans',sans-serif", fontSize: "0.85rem", outline: "none" }}
                    />
                  ) : (
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.88rem", fontWeight: 600, color: "var(--espresso)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {name === "_default" ? (isKo ? "기본 즐겨찾기" : "Default") : name}
                      </div>
                      <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", color: "var(--muted)" }}>
                        {(folder.ids || []).length}{isKo ? "개 레시피" : " recipes"}
                      </div>
                    </div>
                  )}

                  {/* 액션 버튼들 */}
                  <div style={{ display: "flex", gap: "5px", alignItems: "center", flexShrink: 0 }}>
                    {isEditing ? (
                      <>
                        <button onClick={() => handleRename(name)}
                          style={{ padding: "4px 10px", border: "1px solid var(--latte)", borderRadius: "6px", background: "var(--latte)", color: "white", fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", cursor: "pointer" }}>
                          {isKo ? "저장" : "Save"}
                        </button>
                        <button onClick={() => setEditingFolder(null)}
                          style={{ padding: "4px 8px", border: "1px solid var(--steam)", borderRadius: "6px", background: "none", color: "var(--muted)", fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", cursor: "pointer" }}>
                          ✕
                        </button>
                      </>
                    ) : (
                      <>
                        {/* 폴더에 추가/제거 (recipeId 있을 때) */}
                        {recipeId && (
                          <button
                            onClick={() => onAddToCollection(recipeId, name)}
                            style={{ padding: "5px 12px", border: "1px solid", borderRadius: "8px", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", fontWeight: 500, transition: "all 0.15s",
                              borderColor: isInFolder ? "var(--espresso)" : "var(--steam)",
                              background:  isInFolder ? "var(--espresso)" : "var(--foam)",
                              color:       isInFolder ? "var(--cream)"    : "var(--muted)" }}>
                            {isInFolder ? (isKo ? "저장됨 ✓" : "Saved ✓") : (isKo ? "저장" : "Save")}
                          </button>
                        )}

                        {/* 이름 수정 (기본 폴더는 이름 고정) */}
                        {name !== "_default" && (
                          <button
                            onClick={() => { setEditingFolder(name); setEditName(name); setColorPicker(null); }}
                            style={{ padding: "4px 8px", border: "1px solid var(--steam)", borderRadius: "6px", background: "none", color: "var(--muted)", fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", cursor: "pointer" }}>
                            {isKo ? "수정" : "Edit"}
                          </button>
                        )}

                        {/* 삭제 */}
                        <button
                          onClick={() => handleDelete(name)}
                          style={{ padding: "4px 8px", border: "1px solid #c0392b30", borderRadius: "6px", background: "none", color: "#c0392b", fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", cursor: "pointer" }}>
                          {isKo ? "삭제" : "Del"}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* 컬러 픽커 */}
                {isPickingColor && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "10px", paddingTop: "10px", borderTop: "1px solid var(--divider)" }}>
                    {PRESET_COLORS.map(c => (
                      <button key={c} type="button"
                        onClick={() => { onUpdateColor(name, c); setColorPicker(null); }}
                        style={{ width: "24px", height: "24px", borderRadius: "50%", background: c, border: folder.color === c ? "2.5px solid var(--espresso)" : "2px solid white", boxShadow: "0 1px 4px #0002", cursor: "pointer", outline: "none", transition: "transform 0.1s" }}
                        onMouseEnter={e => e.currentTarget.style.transform = "scale(1.2)"}
                        onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 새 폴더 만들기 */}
        {creating ? (
          <div style={{ background: "var(--cream)", border: "1px solid var(--divider)", borderRadius: "10px", padding: "14px" }}>
            <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", fontWeight: 600, color: "var(--espresso)", marginBottom: "10px" }}>
              {isKo ? "새 폴더" : "New Folder"}
            </div>
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleCreate()}
              placeholder={isKo ? "예) 라떼 모음, 싱글오리진" : "e.g. Latte collection"}
              autoFocus
              style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--steam)", borderRadius: "8px", fontFamily: "'DM Sans',sans-serif", fontSize: "0.88rem", marginBottom: "10px", boxSizing: "border-box", outline: "none" }}
            />
            {/* 컬러 선택 */}
            <div style={{ display: "flex", gap: "7px", flexWrap: "wrap", marginBottom: "12px" }}>
              {PRESET_COLORS.map(c => (
                <button key={c} type="button"
                  onClick={() => setNewColor(c)}
                  style={{ width: "22px", height: "22px", borderRadius: "50%", background: c, border: newColor === c ? "2.5px solid var(--espresso)" : "2px solid white", boxShadow: "0 1px 4px #0002", cursor: "pointer", outline: "none" }}
                />
              ))}
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button style={folderBtn(false)} onClick={() => { setCreating(false); setNewName(""); }}>
                {isKo ? "취소" : "Cancel"}
              </button>
              <button style={folderBtn(true)} onClick={handleCreate} disabled={!newName.trim()}>
                {isKo ? "만들기" : "Create"}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            style={{ width: "100%", padding: "11px", border: "1px dashed var(--latte)", borderRadius: "10px", background: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: "0.85rem", color: "var(--latte)", fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", gap: "7px", transition: "background 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.background = "#B07D5410"}
            onMouseLeave={e => e.currentTarget.style.background = "none"}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            {isKo ? "새 폴더 만들기" : "New Folder"}
          </button>
        )}

        <div className="modal-actions" style={{ marginTop: "20px" }}>
          <button className="btn-cancel" onClick={onClose}>{isKo ? "닫기" : "Close"}</button>
        </div>
      </div>
    </div>
  );
}
