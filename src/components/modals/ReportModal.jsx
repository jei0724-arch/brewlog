/* ============================================================
   BREWLOG NOTE — src/components/modals/ReportModal.jsx
   레시피 / 댓글 신고 모달
   ─ 중복 신고 방지 (Firestore where 쿼리)
   ─ 신고 3회 이상 시 자동 비공개 처리
   ─ type: "recipe" | "comment"
   ============================================================ */
import { useState } from "react";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../config/firebase";
import { I18N } from "../../constants/localization";

// ─────────────────────────────────────────────────────────────────
export default function ReportModal({ type, targetId, currentUser, onClose, lang = "ko" }) {
  const t = I18N[lang];

  const [reason,  setReason]  = useState("");
  const [custom,  setCustom]  = useState("");
  const [done,    setDone]    = useState(false);   // false | "ok" | "already"
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!reason) return;
    setLoading(true);
    try {
      // 1) 중복 신고 체크
      const dupQ    = query(
        collection(db, "reports"),
        where("targetId", "==", targetId),
        where("uid",      "==", currentUser.uid)
      );
      const dupSnap = await getDocs(dupQ);
      if (!dupSnap.empty) {
        setDone("already");
        setLoading(false);
        return;
      }

      // 2) 신고 등록
      const reportReason =
        reason === "기타" || reason === "Other"
          ? (custom || reason)
          : reason;

      await addDoc(collection(db, "reports"), {
        type,
        targetId,
        uid:       currentUser.uid,
        reason:    reportReason,
        createdAt: serverTimestamp(),
        status:    "pending",
      });

      // 3) 누적 신고 3회 이상 → 자동 비공개
      const allQ    = query(collection(db, "reports"), where("targetId", "==", targetId));
      const allSnap = await getDocs(allQ);
      if (allSnap.size >= 3) {
        if (type === "recipe") {
          await updateDoc(doc(db, "recipes", targetId), { isPublic: false, reportHidden: true });
        } else if (type === "comment") {
          await updateDoc(doc(db, "comments", targetId), { hidden: true });
        }
      }

      setDone("ok");
    } catch (e) {
      console.error("[ReportModal] submit:", e);
    }
    setLoading(false);
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" style={{ maxWidth: "340px" }}>
        {/* 헤더 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <span style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--espresso)" }}>
            🚨 {t.report}
          </span>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", fontSize: "1.1rem", cursor: "pointer", color: "var(--muted)" }}
          >
            ✕
          </button>
        </div>

        {/* 완료 상태 — 신고 접수됨 */}
        {done === "ok" && (
          <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>✅</div>
            <p style={{ color: "var(--espresso)", fontSize: "0.9rem" }}>{t.reportDone}</p>
            <button
              className="btn-primary"
              style={{ marginTop: "1rem", width: "auto", padding: "0.5rem 1.5rem" }}
              onClick={onClose}
            >
              {lang === "en" ? "OK" : "확인"}
            </button>
          </div>
        )}

        {/* 완료 상태 — 이미 신고함 */}
        {done === "already" && (
          <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>⚠️</div>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>{t.reportAlready}</p>
            <button
              className="btn-primary"
              style={{ marginTop: "1rem", width: "auto", padding: "0.5rem 1.5rem" }}
              onClick={onClose}
            >
              {lang === "en" ? "OK" : "확인"}
            </button>
          </div>
        )}

        {/* 신고 사유 선택 폼 */}
        {!done && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
              {t.reportReasons.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  style={{
                    padding: "0.6rem 1rem",
                    border: "1px solid",
                    borderRadius: "var(--r-btn)",
                    cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "0.88rem",
                    textAlign: "left",
                    transition: "all 0.15s",
                    borderColor: reason === r ? "var(--accent)" : "var(--steam)",
                    background:  reason === r ? "#fff3ee" : "var(--foam)",
                    color:       reason === r ? "var(--accent)" : "var(--espresso)",
                    fontWeight:  reason === r ? 600 : 400,
                  }}
                >
                  {reason === r ? "● " : "○ "}{r}
                </button>
              ))}
            </div>

            {/* 기타 사유 입력 */}
            {(reason === "기타" || reason === "Other") && (
              <input
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder={lang === "en" ? "Please describe…" : "내용을 입력해주세요…"}
                style={{
                  width: "100%",
                  padding: "0.6rem 0.8rem",
                  border: "1px solid var(--steam)",
                  borderRadius: "var(--r-btn)",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "0.88rem",
                  marginBottom: "0.8rem",
                  background: "var(--cream)",
                  color: "var(--espresso)",
                  outline: "none",
                }}
              />
            )}

            <div className="modal-actions">
              <button className="btn-cancel" onClick={onClose}>
                {lang === "en" ? "Cancel" : "취소"}
              </button>
              <button
                className="btn-primary"
                style={{
                  width: "auto",
                  padding: "0.6rem 1.5rem",
                  marginTop: 0,
                  background: "#e74c3c",
                  opacity: reason ? 1 : 0.5,
                }}
                onClick={submit}
                disabled={loading || !reason}
              >
                {loading ? "…" : t.report}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
