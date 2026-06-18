/* ============================================================
   BREWLOG NOTE — src/hooks/useRecipes.js
   레시피 관련 모든 비즈니스 로직 커스텀 훅
   ─ Firestore getDocs (초기 로드)
   ─ handleDelete / handleLike (CRUD)
   ─ following   : localStorage 기반 구독 목록
   ─ bookmarks   : localStorage 기반 즐겨찾기 목록
   ─ blocked     : localStorage 기반 차단 목록
   ─ filtered    : feedTab / search / activeTag 기반 파생 목록
   ─ isAdmin     : admins 컬렉션 체크
   ─ notices     : 공지사항 최신 1건
   ============================================================ */
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  addDoc,
  query,
  orderBy,
  where,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "../config/firebase";

// ─────────────────────────────────────────────────────────────────
export function useRecipes(user, { onRequireAuth } = {}) {
  // ── 레시피 목록 ─────────────────────────────────────────────────
  const [recipes,    setRecipes]    = useState([]);

  // ── 검색 / 필터 상태 ────────────────────────────────────────────
  const [search,       setSearch]       = useState("");
  const [activeTag,    setActiveTag]    = useState(null);
  const [myRecipesOnly, setMyRecipesOnly] = useState(false);
  const [filterAuthor,  setFilterAuthor]  = useState(null); // { uid, name } | null
  const [feedTab,       setFeedTab]       = useState("all"); // "all"|"following"|"bookmarks"|"mine"|"beans"|"equip"

  // ── 관리자 / 공지사항 ────────────────────────────────────────────
  const [isAdmin,  setIsAdmin]  = useState(false);
  const [notices,  setNotices]  = useState([]);

  // ── following (localStorage 캐시) ────────────────────────────────
  const [following, setFollowing] = useState(() => {
    try {
      return user?.uid
        ? JSON.parse(localStorage.getItem("brewlog_following_" + user.uid) || "[]")
        : [];
    } catch { return []; }
  });

  // ── collections (컬렉션/폴더별 북마크) ─────────────────────────
  // 구조: { folderName: { color, ids: [recipeId, ...] }, ... }
  // "_default" = 기본 즐겨찾기 폴더
  const COLL_KEY = user?.uid ? "brewlog_collections_" + user.uid : null;

  const [collections, setCollections] = useState(() => {
    try {
      if (!user?.uid) return {};
      const saved = JSON.parse(localStorage.getItem("brewlog_collections_" + user.uid) || "null");
      if (saved) return saved;
      // 기존 bookmarks 마이그레이션
      const oldIds = JSON.parse(localStorage.getItem("brewlog_bookmarks_" + user.uid) || "[]");
      return oldIds.length ? { "_default": { color:"#B07D54", ids: oldIds } } : {};
    } catch { return {}; }
  });

  // 전체 북마크 id 목록 (하위 호환용)
  const bookmarks = useMemo(() =>
    Object.values(collections).flatMap(c => c.ids || []),
  [collections]);

  // 컬렉션 저장 헬퍼
  const saveCollections = useCallback((next) => {
    if (!user?.uid) return;
    try { localStorage.setItem("brewlog_collections_" + user.uid, JSON.stringify(next)); } catch {}
    // Firestore 백업 (실패해도 무시)
    setDoc(doc(db, "users", user.uid), { collections: next }, { merge: true }).catch(() => {});
  }, [user?.uid]);

  // ── blocked (localStorage, 읽기 전용) ───────────────────────────
  const blocked = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem(`brewlog_blocked_${user?.uid}`) || "[]");
    } catch { return []; }
  }, [user?.uid]);

  // ── 초기 로드 ────────────────────────────────────────────────────
  const loadRecipes = useCallback(async () => {
    try {
      const q    = query(collection(db, "recipes"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setRecipes(
        snap.docs.map((d) => {
          const data = { id: d.id, ...d.data() };
          // 기존 데이터 waterTemp 빈값 보정
          if (!data.waterTemp && data.waterTemp !== 0) data.waterTemp = "93";
          return data;
        })
      );
    } catch (e) {
      console.error("[useRecipes] loadRecipes:", e);
    }
  }, []);

  useEffect(() => {
    loadRecipes();

    // 관리자 여부 확인 (재시도 포함)
    const checkAdmin = async () => {
      if (!user) return;
      try {
        await user.getIdToken(true); // 토큰 갱신
        const snap = await getDoc(doc(db, "admins", user.uid));
        setIsAdmin(snap.exists());
      } catch (e) {
        console.error("[useRecipes] checkAdmin:", e);
        // 네트워크 오류 시 1초 후 재시도
        setTimeout(async () => {
          try {
            const snap = await getDoc(doc(db, "admins", user.uid));
            setIsAdmin(snap.exists());
          } catch (e2) {
            console.error("[useRecipes] checkAdmin retry:", e2);
          }
        }, 1000);
      }
    };
    checkAdmin();

    // 공지사항 최신 1건 로드
    getDocs(query(collection(db, "notices"), orderBy("createdAt", "desc")))
      .then((snap) => {
        setNotices(snap.docs.slice(0, 1).map((d) => ({ id: d.id, ...d.data() })));
      })
      .catch(() => {});
  }, [loadRecipes, user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── following 동기화 (user 변경 시 localStorage에서 재로드) ──────
  useEffect(() => {
    if (!user?.uid) { setFollowing([]); setCollections({}); return; }
    try {
      setFollowing(JSON.parse(localStorage.getItem("brewlog_following_" + user.uid) || "[]"));
      const saved = JSON.parse(localStorage.getItem("brewlog_collections_" + user.uid) || "null");
      if (saved) {
        setCollections(saved);
      } else {
        // 기존 bookmarks 마이그레이션
        const oldIds = JSON.parse(localStorage.getItem("brewlog_bookmarks_" + user.uid) || "[]");
        if (oldIds.length) setCollections({ "_default": { color:"#B07D54", ids: oldIds } });
      }
    } catch {
      setFollowing([]);
      setCollections({});
    }
  }, [user?.uid]);

  // ── toggleFollow ────────────────────────────────────────────────
  const toggleFollow = useCallback((authorUid) => {
    if (!user) { onRequireAuth?.(); return; }
    if (!authorUid || authorUid === user?.uid || authorUid === user?.displayName) return;

    setFollowing((prev) => {
      const next = prev.includes(authorUid)
        ? prev.filter((id) => id !== authorUid)
        : [...prev, authorUid];
      try { localStorage.setItem("brewlog_following_" + user.uid, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [user, onRequireAuth]);

  // ── toggleBookmark — 기본 폴더(_default) 토글 ────────────────────
  const toggleBookmark = useCallback((recipeId) => {
    if (!user) { onRequireAuth?.(); return; }
    setCollections((prev) => {
      const folder = prev["_default"] || { color:"#B07D54", ids:[] };
      const ids    = folder.ids.includes(recipeId)
        ? folder.ids.filter(id => id !== recipeId)
        : [...folder.ids, recipeId];
      // 폴더가 비어도 폴더 자체는 유지
      const next = { ...prev, "_default": { ...folder, ids } };
      saveCollections(next);
      return next;
    });
  }, [user, onRequireAuth, saveCollections]);

  // ── addToCollection — 특정 폴더에 추가/제거 ───────────────────────
  const addToCollection = useCallback((recipeId, folderName) => {
    if (!user) { onRequireAuth?.(); return; }
    setCollections((prev) => {
      const folder  = prev[folderName] || { color:"#B07D54", ids:[] };
      const hasId   = folder.ids.includes(recipeId);
      const ids     = hasId ? folder.ids.filter(id => id !== recipeId) : [...folder.ids, recipeId];
      // 폴더가 비어도 폴더 자체는 유지 (삭제는 deleteCollection으로만)
      const next = { ...prev, [folderName]: { ...folder, ids } };
      saveCollections(next);
      return next;
    });
  }, [user, onRequireAuth, saveCollections]);

  // ── createCollection — 새 폴더 생성 ──────────────────────────────
  const createCollection = useCallback((name, color = "#B07D54") => {
    if (!user || !name.trim()) return false;
    if (collections[name]) return false; // 중복
    setCollections((prev) => {
      const next = { ...prev, [name]: { color, ids:[] } };
      saveCollections(next);
      return next;
    });
    return true;
  }, [user, collections, saveCollections]);

  // ── renameCollection ──────────────────────────────────────────────
  const renameCollection = useCallback((oldName, newName) => {
    if (!user || !newName.trim() || oldName === newName) return;
    setCollections((prev) => {
      if (prev[newName]) return prev; // 중복
      const { [oldName]: folder, ...rest } = prev;
      const next = { ...rest, [newName]: folder };
      saveCollections(next);
      return next;
    });
  }, [user, saveCollections]);

  // ── deleteCollection ──────────────────────────────────────────────
  const deleteCollection = useCallback((name) => {
    if (!user) return;
    setCollections((prev) => {
      const { [name]: _, ...next } = prev;
      saveCollections(next);
      return next;
    });
  }, [user, saveCollections]);

  // ── updateCollectionColor ─────────────────────────────────────────
  const updateCollectionColor = useCallback((name, color) => {
    if (!user) return;
    setCollections((prev) => {
      const next = { ...prev, [name]: { ...prev[name], color } };
      saveCollections(next);
      return next;
    });
  }, [user, saveCollections]);

  // ── handleLike ──────────────────────────────────────────────────
  const handleLike = useCallback(async (recipe) => {
    if (!user) { onRequireAuth?.(); return; }
    const likedBy      = recipe.likedBy || [];
    const alreadyLiked = likedBy.includes(user.uid);
    const newLikedBy   = alreadyLiked
      ? likedBy.filter((id) => id !== user.uid)
      : [...likedBy, user.uid];
    try {
      await updateDoc(doc(db, "recipes", recipe.id), { likedBy: newLikedBy });
      // 낙관적 업데이트: 로컬 상태 즉시 반영
      setRecipes((prev) =>
        prev.map((r) => r.id === recipe.id ? { ...r, likedBy: newLikedBy } : r)
      );
    } catch (e) {
      console.error("[useRecipes] handleLike:", e);
      loadRecipes(); // 실패 시 서버 데이터로 복구
    }
  }, [user, onRequireAuth, loadRecipes]);

  // ── handleDelete ────────────────────────────────────────────────
  const handleDelete = useCallback(async (id) => {
    if (!confirm("이 레시피를 삭제할까요?")) return;
    try {
      await deleteDoc(doc(db, "recipes", id));
      // 낙관적 업데이트
      setRecipes((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      console.error("[useRecipes] handleDelete:", e);
      loadRecipes();
    }
  }, [loadRecipes]);

  // ── handleCopyRecipe — 복사 후 편집 폼에 넘길 초기값 반환 ───────
  const buildCopyPayload = useCallback((recipe) => {
    const { id, uid, author, createdAt, updatedAt, likedBy, isImported, ...rest } = recipe;
    return { ...rest, _isCopy: true };
  }, []);

  // ── filtered — 현재 탭/검색/태그 기준으로 파생 ──────────────────
  const filtered = useMemo(() => {
    return recipes.filter((r) => {
      // 비공개 처리된 타인 레시피 제외
      if (r.isPublic === false && r.uid !== user?.uid) return false;
      // 차단 유저 제외
      if (blocked.includes(r.uid)) return false;
      // 닉네임 클릭 → 특정 작성자 필터
      if (filterAuthor) {
        if (filterAuthor.uid
          ? r.uid !== filterAuthor.uid
          : r.author !== filterAuthor.name
        ) return false;
      }
      // 내 레시피만 보기
      if (myRecipesOnly && r.uid !== user?.uid) return false;
      // 탭별 필터
      if (feedTab === "bookmarks" && !bookmarks.includes(r.id))   return false;
      if (feedTab === "following" && !following.includes(r.uid) && !following.includes(r.author)) return false;
      if (feedTab === "mine"     && r.uid !== user?.uid)           return false;
      // 태그 필터 + 폴더 필터 (__folder__xxx 형태)
      if (activeTag) {
        if (activeTag.startsWith("__folder__")) {
          const folderName = activeTag.replace("__folder__", "");
          const folder = collections[folderName];
          if (!folder || !(folder.ids || []).includes(r.id)) return false;
        } else {
          if (!(r.tags || []).includes(activeTag)) return false;
        }
      }
      // 텍스트 검색
      const q = search.toLowerCase().trim();
      if (!q) return true;
      return (
        (r.menuLabel  || "").toLowerCase().includes(q) ||
        (r.machine    || "").toLowerCase().includes(q) ||
        (r.grinder    || "").toLowerCase().includes(q) ||
        (r.company    || "").toLowerCase().includes(q) ||
        (r.bean       || "").toLowerCase().includes(q) ||
        (r.author     || "").toLowerCase().includes(q) ||
        (r.note       || "").toLowerCase().includes(q) ||
        (r.tags       || []).some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [recipes, user?.uid, blocked, filterAuthor, myRecipesOnly, feedTab, bookmarks, collections, following, activeTag, search]);

  return {
    // 원시 데이터
    recipes,
    // 파생 데이터
    filtered,
    following,
    bookmarks,
    collections,
    blocked,
    isAdmin,
    notices,
    // 검색/필터 상태
    search,       setSearch,
    activeTag,    setActiveTag,
    myRecipesOnly, setMyRecipesOnly,
    filterAuthor,  setFilterAuthor,
    feedTab,       setFeedTab,
    // 액션
    loadRecipes,
    handleLike,
    handleDelete,
    toggleFollow,
    toggleBookmark,
    addToCollection,
    createCollection,
    renameCollection,
    deleteCollection,
    updateCollectionColor,
    buildCopyPayload,
  };
}
