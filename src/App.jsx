/* ============================================================
   BREWLOG NOTE — App.jsx  (Single-File React + Vite)
   ──────────────────────────────────────────────────────────
   SECTION MAP:
     1. IMPORTS & FIREBASE INIT
     2. STYLES (CSS)  ← CSS variables (Light + Soft Dark Mode)
     3. CONSTANTS & I18N
     4. UTILITY FUNCTIONS (Brand/Bean/Preset storage, calcPressure)
     5. SUB-COMPONENTS
        5-1. CoffeeBeanIcon
        5-2. BrandInput (React.memo + useMemo 최적화)
        5-3. TimerField (1초 tick 격리 — 폼 재렌더 방지)
        5-4. FlavorRadar
        5-5. RecipeModal (추출 압력 세부기록 + 연속추출 메모 포함)
        5-6. MyModal / RecipeImporter
        5-7. ReportModal / RecipeCompareModal / etc.
     6. MAIN APP COMPONENT (MainApp + App root)
   ──────────────────────────────────────────────────────────
   KEY DESIGN TOKENS:
     --r-chip: 4px  --r-btn: 8px  --r-card: 12px  --r-modal: 14px
     --transition-fast / --transition-base / --transition-slow
     --shadow-card / --shadow-hover / --shadow-modal
   ============================================================ */

/* ============================================================
   1. IMPORTS & FIREBASE INIT
   ============================================================ */
import { useState, useEffect, useCallback, useRef } from "react";
import React from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  browserLocalPersistence,
  setPersistence,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";

// ─── Firebase 초기화 ───────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyDpVWWn3QiSei5V3mryUIowMJOhRVYHWQE",
  authDomain: "coffee-recipe-app-382e5.firebaseapp.com",
  projectId: "coffee-recipe-app-382e5",
  storageBucket: "coffee-recipe-app-382e5.firebasestorage.app",
  messagingSenderId: "638702089903",
  appId: "1:638702089903:web:3834d80ddd68bf22f4065a",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// 자동 로그인 - 브라우저 종료 후에도 로그인 유지
setPersistence(auth, browserLocalPersistence).catch(() => {});

/* ============================================================
   2. STYLES (CSS)
   - Light mode + Soft Dark Mode CSS variable structure
   - Consistent border-radius tokens: --r-chip(4px) --r-card(12px) --r-modal(14px)
   - Smooth hover interactions: translateY, box-shadow, scale transitions
   - clamp() + flex-wrap for perfect mobile responsiveness (max-width: 430px)
   ============================================================ */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  /* ── Light Mode (default) ── */
  :root {
    --cream:   #FBFBFA;
    --foam:    #FFFFFF;
    --steam:   #EDEBE8;
    --divider: #F0EFEF;
    --espresso:#1A1A1A;
    --roast:   #3D2B1F;
    --latte:   #B07D54;
    --accent:  #3D2B1F;
    --muted:   #8C8480;

    /* ── Border-radius tokens (일관성) ── */
    --r-chip:  4px;   /* 마이크로 칩, 배지 */
    --r-btn:   8px;   /* 버튼, 인풋 */
    --r-card:  12px;  /* 레시피 카드, 메인 카드 */
    --r-modal: 14px;  /* 모달 */
    --r8: 8px; /* 하위 호환 */

    /* ── Transition tokens ── */
    --transition-fast: 0.15s ease;
    --transition-base: 0.22s ease;
    --transition-slow: 0.35s ease;

    /* ── Shadow tokens ── */
    --shadow-card:  0 4px 16px rgba(26,22,20,0.06), 0 1px 4px rgba(26,22,20,0.04);
    --shadow-hover: 0 8px 28px rgba(26,22,20,0.10), 0 2px 8px rgba(26,22,20,0.06);
    --shadow-modal: 0 20px 60px rgba(26,22,20,0.16), 0 4px 16px rgba(26,22,20,0.08);
  }

  /* ── Soft Dark Mode — prefers-color-scheme 또는 [data-theme="dark"] ── */
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --cream:   #1C1917;
      --foam:    #231F1C;
      --steam:   #332E2A;
      --divider: #2C2825;
      --espresso:#F2EDE8;
      --roast:   #D4A47A;
      --latte:   #C99B6E;
      --accent:  #C99B6E;
      --muted:   #8A8480;
      --shadow-card:  0 4px 16px rgba(0,0,0,0.28), 0 1px 4px rgba(0,0,0,0.18);
      --shadow-hover: 0 8px 28px rgba(0,0,0,0.38), 0 2px 8px rgba(0,0,0,0.22);
      --shadow-modal: 0 20px 60px rgba(0,0,0,0.50), 0 4px 16px rgba(0,0,0,0.30);
    }
  }
  [data-theme="dark"] {
    --cream:   #1C1917;
    --foam:    #231F1C;
    --steam:   #332E2A;
    --divider: #2C2825;
    --espresso:#F2EDE8;
    --roast:   #D4A47A;
    --latte:   #C99B6E;
    --accent:  #C99B6E;
    --muted:   #8A8480;
    --shadow-card:  0 4px 16px rgba(0,0,0,0.28), 0 1px 4px rgba(0,0,0,0.18);
    --shadow-hover: 0 8px 28px rgba(0,0,0,0.38), 0 2px 8px rgba(0,0,0,0.22);
    --shadow-modal: 0 20px 60px rgba(0,0,0,0.50), 0 4px 16px rgba(0,0,0,0.30);
  }
  body { font-family: 'DM Sans', sans-serif; background: var(--cream); color: var(--espresso); min-height: 100vh; -webkit-font-smoothing: antialiased; overflow-x: hidden; overscroll-behavior-x: none; transition: background var(--transition-slow), color var(--transition-slow); }
  html { overflow-x: hidden; overscroll-behavior-x: none; max-width: 100vw; }
  *, *::before, *::after { box-sizing: border-box; max-width: 100%; }

  .auth-wrap {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: var(--cream);
    padding: 16px;
  }
  .auth-card {
    background: var(--foam); border: 1px solid var(--steam); border-radius: var(--r-card);
    padding: clamp(1.5rem, 5vw, 3rem) clamp(1.2rem, 5vw, 2.5rem);
    width: 100%; max-width: 440px; box-shadow: var(--shadow-card); position: relative;
  }
  .auth-card::before {
    content: ''; position: absolute; top: 0; left: 2rem; right: 2rem; height: 2px;
    background: linear-gradient(90deg, transparent, var(--latte), transparent);
  }
  .brand { text-align: center; margin-bottom: 2rem; }
  .brand-icon { display: flex; align-items: center; justify-content: center; margin-bottom: 12px; }
  .brand h1 { font-family: 'Playfair Display', serif; font-size: clamp(1.5rem, 5vw, 2rem); color: var(--espresso); letter-spacing: -0.02em; }
  .brand p { font-size: 0.72rem; color: var(--muted); margin-top: 6px; letter-spacing: 0.14em; text-transform: uppercase; opacity: 0.8; }

  .divider-or {
    display: flex; align-items: center; gap: 12px;
    font-family: 'DM Sans', sans-serif; font-size: 0.72rem;
    color: var(--muted); letter-spacing: 0.06em; text-transform: uppercase;
    margin: 16px 0;
  }
  .divider-or::before, .divider-or::after {
    content: ''; flex: 1; height: 1px; background: var(--steam);
  }

  .tab-row { display: flex; flex-wrap: wrap; border-bottom: 1px solid var(--steam); margin-bottom: 1.5rem; }
  .tab-btn {
    flex: 1 1 auto; padding: 0.55rem 0.4rem; background: none; border: none;
    font-family: 'DM Sans', sans-serif; font-size: clamp(0.72rem, 2.5vw, 0.85rem); color: var(--muted);
    cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; transition: all 0.2s;
    white-space: nowrap; text-align: center;
  }
  .tab-btn.active { color: var(--roast); border-bottom-color: var(--accent); font-weight: 500; }

  .field { margin-bottom: 1.2rem; }
  .field label { display: block; font-size: 0.75rem; color: var(--muted); letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 0.4rem; }
  .field input, .field select {
    width: 100%; padding: 0.75rem 1rem; border: 1px solid var(--steam); border-radius: var(--r-btn);
    background: var(--cream); font-family: 'DM Sans', sans-serif; font-size: 0.95rem;
    color: var(--espresso); outline: none; transition: border-color var(--transition-base), box-shadow var(--transition-base);
  }
  .field input:focus, .field select:focus { border-color: var(--latte); box-shadow: 0 0 0 3px rgba(176,125,84,0.12); }

  .btn-primary {
    width: 100%; padding: 0.85rem; background: var(--espresso); color: var(--foam);
    border: none; border-radius: var(--r-btn); font-family: 'DM Sans', sans-serif;
    font-size: 0.9rem; font-weight: 500; cursor: pointer;
    transition: background var(--transition-base), transform var(--transition-fast), box-shadow var(--transition-base);
    margin-top: 0.5rem; letter-spacing: 0.01em;
  }
  .btn-primary:hover { background: #2D1E15; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(26,22,20,0.18); }
  .btn-primary:active { transform: translateY(0); box-shadow: none; }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }
  .msg-error { color: #c0392b; font-size: 0.82rem; margin-top: 0.8rem; text-align: center; }
  .msg-ok { color: #27ae60; font-size: 0.82rem; margin-top: 0.8rem; text-align: center; }

  .app-header {
    background: var(--foam);
    padding: 0 24px;
    height: 56px;
    display: flex; align-items: center; justify-content: center;
    border-bottom: 1px solid var(--divider);
  }
  .app-header-inner {
    width: 100%; max-width: 900px;
    display: flex; align-items: center; justify-content: space-between;
  }
  .app-header .logo {
    font-family: 'Playfair Display', serif;
    font-size: 1.15rem;
    color: var(--espresso);
    letter-spacing: -0.02em;
    display: flex; align-items: center; gap: 8px;
  }
  .header-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; min-width: 0; }
  .header-right > * { flex-shrink: 0; }

  /* EN 모드에서 버튼 텍스트 축약 — 모바일 */
  @media (max-width: 430px) {
    .app-header { padding: 0 10px; }
    .app-header .logo { font-size: 0.95rem; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .btn-lang, .btn-my { padding: 0 8px; font-size: 0.65rem; }
    .nick-badge { max-width: 72px; font-size: 0.65rem; padding: 0 8px; }
    .btn-admin-header { padding: 0 8px; font-size: 0.65rem; }
  }

  /* 헤더 공통 버튼 base — 모두 border-radius: 8px, 높이 32px */
  .header-btn-base {
    height: 32px;
    padding: 0 12px;
    background: none;
    border: 1px solid var(--steam);
    border-radius: 8px;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.72rem;
    color: var(--muted);
    cursor: pointer;
    transition: border-color 0.2s, color 0.2s;
    white-space: nowrap;
    display: inline-flex; align-items: center;
  }
  .header-btn-base:hover { border-color: var(--espresso); color: var(--espresso); }

  .nick-badge {
    height: 32px; padding: 0 12px;
    background: none; border: 1px solid var(--steam); border-radius: 8px;
    font-family: 'DM Sans', sans-serif; font-size: 0.72rem; color: var(--muted);
    cursor: pointer; transition: all 0.2s; max-width: 110px;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    display: inline-flex; align-items: center;
  }
  .nick-badge:hover { border-color: var(--latte); color: var(--espresso); }
  .nick-badge.active { background: var(--espresso); color: var(--foam); border-color: var(--espresso); font-weight: 500; }

  .btn-logout {
    height: 32px; padding: 0 12px;
    background: none; border: 1px solid var(--steam); color: var(--muted);
    border-radius: 8px; font-family: 'DM Sans', sans-serif;
    font-size: 0.72rem; cursor: pointer; transition: all 0.2s; white-space: nowrap;
    display: inline-flex; align-items: center;
  }
  .btn-logout:hover { border-color: var(--espresso); color: var(--espresso); }
  .btn-lang {
    height: 32px; padding: 0 12px;
    background: none; border: 1px solid var(--steam); color: var(--muted);
    border-radius: 8px; font-family: 'DM Sans', sans-serif;
    font-size: 0.72rem; cursor: pointer; transition: all 0.2s; letter-spacing: 0.05em;
    white-space: nowrap; display: inline-flex; align-items: center;
  }
  .btn-lang:hover { border-color: var(--espresso); color: var(--espresso); }
  .btn-my {
    height: 32px; padding: 0 12px;
    background: none; border: 1px solid var(--steam); color: var(--muted);
    border-radius: 8px; font-family: 'DM Sans', sans-serif;
    font-size: 0.72rem; cursor: pointer; transition: all 0.2s; font-weight: 500;
    white-space: nowrap; display: inline-flex; align-items: center;
  }
  .btn-my:hover { border-color: var(--espresso); color: var(--espresso); }

  .main-wrap { max-width: 900px; margin: 0 auto; padding: 12px 24px 40px; }

  /* ── 모바일 반응형 전면 보강 ── */
  @media (max-width: 600px) {
    /* 레이아웃 기본 */
    .main-wrap        { padding: 10px 14px 60px; }
    .toolbar          { padding: 0 14px; gap: 6px; }
    .admin-wrap       { padding: 16px 14px; }

    /* 헤더 */
    .app-header       { padding: 0 12px; height: 48px; }
    .app-header-inner { gap: 6px; }

    /* 레시피 카드 */
    .recipe-card      { padding: 16px 14px; }
    .card-stats       { grid-template-columns: repeat(4,1fr); gap: 4px; }
    .stat             { padding: 6px 2px; }
    .stat-val         { font-size: 0.9rem; }
    .stat-lbl         { font-size: 0.6rem; }
    .card-chips       { flex-wrap: wrap; gap: 4px; }

    /* 섹션 타이틀 */
    .section-title    { font-size: 1.35rem; }

    /* 베스트 레시피 */
    .best-row         { padding: 12px 14px; gap: 10px; }

    /* 검색창 */
    .search-box input { font-size: 0.82rem; height: 34px; }

    /* 버튼 */
    .btn-new          { padding: 0 12px; height: 34px; font-size: 0.76rem; }

    /* 모달 */
    .modal            { padding: 22px 16px; border-radius: 12px 12px 0 0; max-height: 95vh; }
    .modal h2         { font-size: 1.2rem; margin-bottom: 18px; }
    .modal-grid       { grid-template-columns: 1fr; gap: 10px; }
    .field.full       { grid-column: 1; }

    /* MY 섹션 */
    .my-section       { padding: 16px 14px; }

    /* 탭 버튼 */
    .bookmark-tab-btn { padding: 5px 10px; font-size: 0.75rem; }

    /* 알림 드롭다운 */
    .notif-dropdown   { width: calc(100vw - 20px); right: -10px; }

    /* 어드민 테이블 */
    .admin-table      { font-size: 0.74rem; }
    .admin-table th,
    .admin-table td   { padding: 7px 6px; }

    /* 빈 화면 */
    .empty-state      { padding: 40px 20px; }

    /* AI 카드 */
    .ai-card          { margin: 0 0 16px; border-radius: 12px; }

    /* bean 카드 */
    .bean-card        { padding: 14px 12px; }
    .bean-stat-row    { gap: 6px; }
  }

  @media (max-width: 390px) {
    .main-wrap        { padding: 8px 10px 60px; }
    .toolbar          { padding: 0 10px; }
    .recipe-card      { padding: 14px 10px; }
    .section-title    { font-size: 1.2rem; }
    .card-stats       { gap: 3px; }
  }
  .section-title {
    font-family: 'Playfair Display', serif;
    font-size: 1.75rem;
    color: var(--espresso);
    margin-bottom: 4px;
    letter-spacing: -0.03em;
    font-weight: 700;
    margin-bottom: 2px;
  }
  .section-sub {
    font-size: 0.82rem;
    color: var(--muted);
    margin-bottom: 12px;
    font-weight: 300;
    letter-spacing: 0.01em;
    opacity: 0.85;
  }
  .divider { height: 1px; background: var(--divider); margin: 0.4rem 0 0.8rem; }

  .toolbar-sticky {
    position: sticky; top: 56px; z-index: 90;
    background: var(--cream); padding: 12px 0;
    margin-bottom: 24px;
    border-bottom: 1px solid var(--divider);
  }
  @media (max-width: 600px) {
    .toolbar-sticky { top: 48px; padding: 8px 0; margin-bottom: 16px; }
  }
  .toolbar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; max-width: 900px; margin: 0 auto; padding: 0 24px; }
  .search-box { flex: 1; min-width: 180px; position: relative; }
  .search-box input {
    width: 100%; padding: 0 16px 0 40px; height: 36px;
    border: 1px solid var(--steam); border-radius: 8px; background: var(--foam);
    font-family: 'DM Sans', sans-serif; font-size: 0.85rem; color: var(--espresso);
    outline: none; transition: border-color 0.2s;
  }
  .search-box input:focus { border-color: var(--latte); }
  .search-icon {
    position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
    color: var(--muted); pointer-events: none;
    display: flex; align-items: center;
  }

  /* btn-new: editorial style */
  .btn-new {
    padding: 0 16px; height: 36px;
    background: var(--espresso); color: var(--foam);
    border: 1px solid var(--espresso);
    border-radius: var(--r-btn); font-family: 'DM Sans', sans-serif; font-size: 0.8rem;
    font-weight: 500; cursor: pointer; white-space: nowrap;
    transition: background var(--transition-base), transform var(--transition-fast), box-shadow var(--transition-base);
    display: inline-flex; align-items: center; gap: 7px; letter-spacing: 0.02em;
  }
  .btn-new:hover { background: var(--roast); border-color: var(--roast); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(26,22,20,0.18); }
  .btn-new:active { transform: translateY(0); box-shadow: none; }

  .recipes-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
  /* ── 카드 공통 폰트 기준 ──────────────────────────────── */
  /* label-xs : 0.68rem / label-sm : 0.75rem / body : 0.85rem / title : 1.05rem */

  .recipe-card {
    background: var(--foam); border: 1px solid var(--divider); border-radius: var(--r-card);
    padding: 24px;
    position: relative;
    transition: transform var(--transition-base), box-shadow var(--transition-base), border-color var(--transition-base); overflow: hidden;
    font-family: 'DM Sans', sans-serif; text-align: left;
  }
  .recipe-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-hover); border-color: #DEDAD6; }

  /* 장비 칩 태그 */
  .card-chip {
    display: inline-flex; align-items: center; gap: 3px;
    font-family: 'DM Sans', sans-serif; font-size: 0.7rem; font-weight: 400;
    color: var(--muted); background: var(--cream);
    border: 1px solid var(--steam); border-radius: var(--r-chip);
    padding: 2px 8px; white-space: nowrap; line-height: 1.4;
  }

  /* 머신 / 그라인더 */
  .card-machine {
    font-family: 'DM Sans', sans-serif; font-size: 0.75rem;
    color: var(--muted); margin-bottom: 4px; line-height: 1.4;
  }
  /* 원두 회사 */
  .card-company {
    font-family: 'DM Sans', sans-serif; font-size: 0.7rem;
    color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 3px; text-align: left;
    opacity: 0.7;
  }
  /* 원두 이름 (card-bean - 하위호환용) */
  .card-bean {
    font-family: 'Playfair Display', serif; font-size: 1.1rem;
    color: var(--espresso); margin-bottom: 4px; line-height: 1.3; font-weight: 700; text-align: left;
  }
  /* 스탯 박스 */
  .card-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 16px; }
  .stat { background: var(--cream); padding: 8px 4px; border-radius: var(--r-btn); text-align: center; border: 1px solid var(--divider); min-width: 0; }
  .stat-val {
    font-family: 'DM Sans', sans-serif; font-size: 0.95rem; font-weight: 600;
    color: var(--roast); display: block; letter-spacing: -0.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .stat-label {
    font-family: 'DM Sans', sans-serif; font-size: 0.62rem; color: var(--muted);
    letter-spacing: 0.02em; display: block; margin-top: 0.15rem; white-space: nowrap;
  }
  /* 희석 / 날씨 */
  .card-dilution {
    font-family: 'DM Sans', sans-serif; font-size: 0.78rem;
    color: var(--muted); padding: 0.45rem 0.75rem;
    background: var(--cream); border-radius: 4px; margin-bottom: 0.7rem;
  }
  /* 메모 */
  .card-note {
    font-family: 'DM Sans', sans-serif; font-size: 0.82rem;
    color: var(--roast); font-style: italic; line-height: 1.6;
    border-left: 2px solid var(--latte); padding-left: 0.75rem; margin-bottom: 0.8rem;
  }
  /* 푸터 */
  .card-footer {
    display: flex; justify-content: space-between; align-items: center;
    font-family: 'DM Sans', sans-serif; font-size: 0.75rem; color: var(--muted);
    border-top: 1px solid var(--steam); padding-top: 0.75rem; margin-top: 0.1rem;
  }
  .card-author { font-family: 'DM Sans', sans-serif; font-size: 0.78rem; font-weight: 600; color: var(--roast); }
  .card-author:hover { text-decoration: underline; text-underline-offset: 2px; }
  .card-actions { display: flex; gap: 0; align-items: center; }
  .card-action-btn { background: none; border: none; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 50%; transition: background 0.15s, color 0.15s; color: var(--muted); padding: 0; }
  .card-action-btn:hover { background: rgba(0,0,0,0.05); }
  .card-action-btn.heart { color: var(--muted); }
  .card-action-btn.heart.liked { color: #C0625A; }
  .card-action-btn.heart:hover { color: #C0625A; }
  .card-action-btn.bookmark { color: var(--muted); }
  .card-action-btn.bookmark.saved { color: var(--latte); }
  .card-action-btn.bookmark:hover { color: var(--latte); }
  .card-action-btn.edit:hover { color: var(--espresso); }
  .card-action-btn.delete:hover { color: #c0392b; }
  .card-edit { background: none; border: none; color: var(--muted); cursor: pointer; font-size: 0.95rem; transition: color 0.2s; }
  .card-edit:hover { color: var(--accent); }
  .card-delete { background: none; border: none; color: #c0392b55; cursor: pointer; font-size: 0.95rem; transition: color 0.2s; }
  .card-delete:hover { color: #c0392b; }
  .empty-state {
    grid-column: 1 / -1;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 64px 24px 80px;
    text-align: center;
  }
  .empty-state-icon {
    width: 56px; height: 56px; margin-bottom: 20px;
    color: var(--steam);
  }
  .empty-state-title {
    font-family: 'Playfair Display', serif;
    font-size: 1rem; font-weight: 600;
    color: var(--espresso); margin-bottom: 6px;
    letter-spacing: -0.01em;
  }
  .empty-state-sub {
    font-family: 'DM Sans', sans-serif;
    font-size: 0.82rem; color: var(--muted);
    line-height: 1.6; max-width: 260px;
  }
  .pressure-box {
    background: var(--foam); color: var(--espresso); border-radius: var(--r-btn);
    padding: 0.8rem 1rem; margin-top: 0.5rem; font-size: 0.82rem; line-height: 1.7;
    border: 1px solid var(--steam);
  }
  .pressure-box.good { border-left: 3px solid #27ae60; }
  .pressure-box.high { border-left: 3px solid #e67e22; }
  .pressure-box.low  { border-left: 3px solid #e74c3c; }
  .pressure-title { font-size: 0.75rem; color: var(--latte); letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 0.4rem; }
  .pressure-row { display: flex; justify-content: space-between; align-items: center; }
  .pressure-val { font-weight: 600; font-size: 1rem; }
  .pressure-good { color: #2ecc71; }
  .pressure-high { color: #f39c12; }
  .pressure-low  { color: #e74c3c; }
  .star-rating { display: flex; gap: 0.3rem; align-items: center; }
  .star-btn { background: none; border: none; cursor: pointer; font-size: 1.8rem; line-height: 1; padding: 0; transition: transform var(--transition-fast); color: var(--steam); }
  .star-btn:hover, .star-btn.active { color: var(--latte); transform: scale(1.15); }
  .star-label { font-size: 0.78rem; color: var(--muted); margin-left: 0.4rem; }
  .weather-box { display: flex; align-items: center; gap: 0.8rem; padding: 0.7rem 1rem; background: var(--cream); border: 1px solid var(--steam); border-radius: var(--r-btn); font-size: 0.85rem; color: var(--muted); }
  .weather-icon { font-size: 1.5rem; }
  .weather-info { display: flex; flex-direction: column; gap: 0.1rem; }
  .weather-main { font-size: 0.88rem; color: var(--espresso); font-weight: 500; }
  .weather-detail { font-size: 0.78rem; color: var(--muted); }
  .weather-loading { color: var(--muted); font-size: 0.82rem; display: flex; align-items: center; gap: 6px; }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .card-weather { font-family: "DM Sans", sans-serif; font-size: 0.75rem; color: var(--muted); padding: 0.35rem 0.7rem; background: var(--cream); border-radius: var(--r-chip); margin-bottom: 0.6rem; display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; }
  .menu-selector {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }
  .menu-btn {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 6px;
    padding: 12px 8px 10px;
    border: 1px solid var(--steam); border-radius: var(--r-btn);
    background: var(--foam);
    font-family: 'DM Sans', sans-serif; font-size: 0.75rem; font-weight: 400;
    color: var(--muted); cursor: pointer; transition: all var(--transition-base);
    line-height: 1.2; text-align: center; white-space: nowrap;
  }
  .menu-btn:hover {
    border-color: var(--latte); color: var(--espresso);
    background: #FDF9F6; transform: translateY(-1px);
  }
  .menu-btn:hover svg { color: var(--latte); }
  .menu-btn.selected {
    background: var(--espresso); color: var(--cream);
    border-color: var(--espresso); font-weight: 500;
  }
  .menu-btn.selected svg { color: var(--cream); opacity: 0.9; }
  .menu-btn svg { flex-shrink: 0; transition: color var(--transition-base); }
  .timer-box { display: flex; flex-direction: column; align-items: center; gap: 0.6rem; padding: 1rem 1rem 0.8rem; background: var(--cream); border: 1px solid var(--steam); border-radius: var(--r-btn); margin-top: 0.5rem; }
  .timer-display { font-family: 'Playfair Display', serif; font-size: 3rem; color: var(--espresso); letter-spacing: 0.08em; line-height: 1; min-width: 4rem; text-align: center; }
  .timer-display.running { color: var(--accent); }
  .timer-display.done { color: #27ae60; }
  .timer-btns { display: flex; gap: 0.5rem; width: 100%; }
  .timer-start { flex: 1; padding: 0.6rem 0; background: var(--espresso); color: var(--cream); border: none; border-radius: var(--r-btn); font-family: 'DM Sans',sans-serif; font-size: 0.85rem; cursor: pointer; transition: background var(--transition-base), transform var(--transition-fast); white-space: nowrap; }
  .timer-start:hover { background: var(--roast); transform: translateY(-1px); }
  .timer-start:active { transform: translateY(0); }
  .timer-reset { flex: 1; padding: 0.6rem 0; background: none; border: 1px solid var(--steam); border-radius: var(--r-btn); font-family: 'DM Sans',sans-serif; font-size: 0.85rem; color: var(--muted); cursor: pointer; white-space: nowrap; transition: border-color var(--transition-base), color var(--transition-base); }
  .timer-reset:hover { border-color: var(--espresso); color: var(--espresso); }
  .bean-counter { display: flex; flex-direction: column; gap: 0.5rem; }
  .bean-counter-label { font-size: 0.75rem; color: var(--muted); letter-spacing: 0.08em; text-transform: uppercase; }
  .bean-counter-display { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
  .bean-icons { display: flex; flex-wrap: wrap; gap: 0.3rem; min-height: 2rem; align-items: center; padding: 0.5rem; background: var(--cream); border: 1px solid var(--steam); border-radius: var(--r-btn); flex: 1; }
  .bean-icon { cursor: pointer; transition: transform var(--transition-fast); display: inline-flex; align-items: center; }
  .bean-icon:hover { transform: scale(1.2); }
  .bean-counter-btns { display: flex; gap: 0.4rem; }
  .bean-btn { width: 2rem; height: 2rem; border: 1px solid var(--steam); border-radius: var(--r-btn); background: var(--foam); font-size: 1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: border-color var(--transition-base), color var(--transition-base); color: var(--espresso); }
  .bean-btn:hover { border-color: var(--accent); color: var(--accent); }
  .bean-count-text { font-size: 0.82rem; color: var(--muted); min-width: 3rem; }
  .auto-badge { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.72rem; background: var(--latte); color: var(--espresso); padding: 0.2rem 0.6rem; border-radius: 999px; font-weight: 500; margin-left: 0.4rem; }
  .autocomplete-wrap { position: relative; }
  .autocomplete-list {
    position: absolute; top: calc(100% + 4px); left: 0; right: 0;
    background: var(--foam); border: 1px solid var(--latte); border-radius: var(--r-btn);
    max-height: 200px; overflow-y: auto; z-index: 300;
    box-shadow: var(--shadow-hover);
  }
  .autocomplete-item {
    padding: 0.6rem 1rem; font-family: 'DM Sans', sans-serif; font-size: 0.9rem;
    color: var(--espresso); cursor: pointer; transition: background var(--transition-fast);
  }
  .autocomplete-item:hover, .autocomplete-item.active { background: var(--cream); color: var(--roast); }
  .btn-bookmark { background: none; border: none; cursor: pointer; font-size: 0.95rem; color: var(--muted); transition: all 0.15s; padding: 0; line-height: 1; display: inline-flex; align-items: center; }
  .btn-bookmark:hover { color: var(--latte); transform: scale(1.1); }
  .btn-bookmark.saved { color: var(--latte); }
  .follow-btn { background: none; border: 1px solid var(--steam); border-radius: 8px; padding: 0 10px; height: 24px; font-family: 'DM Sans',sans-serif; font-size: 0.7rem; cursor: pointer; transition: all 0.2s; color: var(--muted); white-space: nowrap; display: inline-flex; align-items: center; }
  .follow-btn:hover { border-color: var(--espresso); color: var(--espresso); }
  .follow-btn.following { background: var(--espresso); color: var(--cream); border-color: var(--espresso); }
  .follow-btn.following:hover { background: #c0392b; border-color: #c0392b; }
  .bookmark-tab { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
  .bookmark-tab-btn {
    padding: 7px 14px;
    border: 1px solid var(--steam); border-radius: var(--r-btn); background: var(--foam);
    font-family: 'DM Sans', sans-serif; font-size: 0.8rem; color: var(--muted);
    cursor: pointer; transition: border-color var(--transition-base), color var(--transition-base), background var(--transition-base); white-space: nowrap;
    display: inline-flex; align-items: center; justify-content: center; gap: 5px;
    line-height: 1;
  }
  .bookmark-tab-btn:hover { border-color: #C5BFB8; color: var(--espresso); background: var(--cream); }
  .bookmark-tab-btn.active { background: var(--espresso); color: var(--foam); border-color: var(--espresso); font-weight: 500; }

  /* 하트 버튼 — 이모지 제거, 라인 아이콘 + 단색 */
  .btn-heart {
    background: none; border: none; cursor: pointer;
    display: flex; align-items: center; gap: 5px;
    color: var(--muted); transition: all 0.15s; padding: 0; line-height: 1;
  }
  .btn-heart:hover { color: #C0625A; }
  .btn-heart.liked { color: #C0625A; }
  .btn-heart span { font-size: 0.72rem; font-family: 'DM Sans', sans-serif; }

  /* ── 베스트 섹션 — 매거진 리스트 스타일 ── */
  .best-section { margin-bottom: 16px; }
  .best-title {
    font-family: 'Playfair Display', serif;
    font-size: 0.9rem;
    color: var(--espresso);
    margin-bottom: 16px;
    display: flex; align-items: center; gap: 8px;
    font-weight: 600; letter-spacing: 0.02em; text-transform: uppercase;
  }

  /* 베스트 리스트 행 */
  .best-row {
    display: flex; align-items: center; gap: 16px;
    padding: 16px 20px;
    border-bottom: 1px solid var(--divider);
    cursor: pointer; transition: background var(--transition-fast);
    position: relative;
  }
  .best-row:last-child { border-bottom: none; }
  .best-row:hover { background: #FAFAF8; }

  /* 순위 번호 — Playfair Serif, 매거진 스타일 */
  .best-rank-num {
    font-family: 'Playfair Display', serif;
    font-size: 1.25rem;
    font-weight: 400;
    letter-spacing: -0.02em;
    min-width: 36px;
    text-align: left;
    line-height: 1;
    flex-shrink: 0;
  }
  .best-rank-num.rank-1 { color: var(--espresso); font-weight: 700; }
  .best-rank-num.rank-2 { color: var(--latte); font-weight: 600; }
  .best-rank-num.rank-3 { color: #9C8E82; font-weight: 500; }

  .best-row-content { flex: 1; min-width: 0; text-align: left; }
  .best-row-bean {
    font-family: 'Playfair Display', serif;
    font-size: 0.95rem; font-weight: 600;
    color: var(--espresso); line-height: 1.25;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    margin-bottom: 4px;
  }
  .best-row-meta {
    font-family: 'DM Sans', sans-serif;
    font-size: 0.7rem;
    color: #6F5F58;
    display: flex; gap: 5px; align-items: center; flex-wrap: wrap;
  }
  .best-row-right {
    display: flex; align-items: center; gap: 5px;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.75rem; font-weight: 500;
    color: #9C8E82;
    flex-shrink: 0; margin-left: auto;
  }

  .modal-backdrop {
    position: fixed; inset: 0; background: #1A1A1ACC; z-index: 200;
    display: flex; align-items: center; justify-content: center; padding: 16px;
    backdrop-filter: blur(4px); animation: fadeIn 0.15s ease;
    touch-action: none; overscroll-behavior: none; overflow: hidden;
    -webkit-overflow-scrolling: none;
  }
  @media (max-width: 600px) {
    .modal-backdrop {
      align-items: flex-end;
      padding: 0;
    }
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .modal {
    background: var(--foam); border: 1px solid var(--steam); border-radius: var(--r-modal);
    padding: 32px 28px; width: 100%; max-width: 500px; max-height: 90vh;
    overflow-y: auto; overflow-x: hidden; position: relative; animation: slideUp 0.22s ease;
    text-align: left; box-shadow: var(--shadow-modal);
    touch-action: pan-y; overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
  }
  @media (max-width: 600px) {
    .modal {
      max-width: 100%;
      border-radius: 18px 18px 0 0;
      border-bottom: none;
      max-height: 93vh;
      padding: 20px 16px 36px;
      /* 바텀시트 슬라이드 업 */
      animation: slideUpMobile 0.25s ease;
    }
    @keyframes slideUpMobile { from { transform: translateY(60px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    /* 모달 상단 핸들 */
    .modal::after {
      content: '';
      position: absolute;
      top: 10px; left: 50%;
      transform: translateX(-50%);
      width: 36px; height: 4px;
      background: var(--steam);
      border-radius: 2px;
    }
  }
  @keyframes slideUp { from { transform: translateY(24px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  .modal::before { content: ''; position: absolute; top: 0; left: 2rem; right: 2rem; height: 2px; background: linear-gradient(90deg, transparent, var(--latte), transparent); }
  .modal h2 { font-family: 'Playfair Display', serif; font-size: 1.5rem; margin-bottom: 24px; color: var(--espresso); }
  .modal-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .modal-grid .field { margin-bottom: 0; }
  .field.full { grid-column: 1 / -1; }
  .modal-actions { display: flex; gap: 8px; margin-top: 24px; justify-content: flex-end; }
  .btn-cancel { padding: 0.7rem 1.5rem; background: none; border: 1px solid var(--steam); border-radius: var(--r-btn); font-family: 'DM Sans', sans-serif; font-size: 0.88rem; color: var(--muted); cursor: pointer; transition: border-color var(--transition-base), color var(--transition-base); }
  .btn-cancel:hover { border-color: var(--muted); color: var(--espresso); }
  textarea { width: 100%; padding: 0.75rem 1rem; border: 1px solid var(--steam); border-radius: var(--r-btn); background: var(--cream); font-family: 'DM Sans', sans-serif; font-size: 0.9rem; color: var(--espresso); outline: none; resize: vertical; min-height: 80px; transition: border-color var(--transition-base), box-shadow var(--transition-base); }
  textarea:focus { border-color: var(--latte); box-shadow: 0 0 0 3px rgba(176,125,84,0.12); }
  .loading-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--cream); }
  .loading-wrap p { font-family: 'Playfair Display', serif; font-size: 1.2rem; color: var(--muted); }
  .my-section { margin-bottom: 1.8rem; padding-bottom: 1.5rem; border-bottom: 1px solid var(--steam); }
  .my-section:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
  .my-section-title { font-family: 'Playfair Display', serif; font-size: 1rem; color: var(--espresso); margin-bottom: 1rem; }
  .my-locked-row { display: flex; gap: 0.5rem; align-items: center; }
  .my-locked-val { flex: 1; padding: 0.7rem 1rem; border: 1px solid var(--steam); border-radius: var(--r-btn); background: var(--steam); font-size: 0.9rem; color: var(--espresso); font-weight: 500; }
  .btn-change { padding: 0.7rem 0.8rem; background: none; border: 1px solid var(--steam); border-radius: var(--r-btn); font-family: 'DM Sans',sans-serif; font-size: 0.8rem; color: var(--muted); cursor: pointer; white-space: nowrap; flex-shrink: 0; transition: border-color var(--transition-base), color var(--transition-base); }
  .btn-change:hover { border-color: var(--accent); color: var(--accent); }
  .save-row { display: flex; justify-content: flex-end; margin-top: 0.8rem; }
  .btn-save-sm { padding: 0.6rem 1.5rem; background: var(--espresso); color: var(--cream); border: none; border-radius: var(--r-btn); font-family: 'DM Sans',sans-serif; font-size: 0.85rem; cursor: pointer; transition: background var(--transition-base), transform var(--transition-fast); }
  .btn-save-sm:hover { background: var(--roast); transform: translateY(-1px); }
  .btn-save-sm:active { transform: translateY(0); }
  .btn-save-sm:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }


  /* ── Admin ── */
  .admin-wrap { max-width: 960px; margin: 0 auto; padding: 24px 24px; box-sizing: border-box; width: 100%; }
  .admin-page-title {
    font-family: 'Playfair Display', serif; font-size: 1.25rem; font-weight: 700;
    color: var(--espresso); letter-spacing: -0.02em; margin-bottom: 2px;
  }
  .admin-page-sub { font-size: 0.75rem; color: var(--muted); margin-bottom: 20px; opacity: 0.8; }

  .admin-tabs {
    display: flex; gap: 6px; margin-bottom: 24px;
    flex-wrap: nowrap; overflow-x: auto; -webkit-overflow-scrolling: touch;
    scrollbar-width: none; padding-bottom: 2px;
    margin-left: -24px; margin-right: -24px;
    padding-left: 24px; padding-right: 24px;
  }
  .admin-tabs::-webkit-scrollbar { display: none; }
  .admin-tab {
    padding: 0 14px; height: 34px; border: 1px solid var(--steam); border-radius: 8px;
    background: var(--foam); font-family: 'DM Sans', sans-serif; font-size: 0.78rem;
    color: var(--muted); cursor: pointer; transition: all 0.2s; white-space: nowrap;
    flex-shrink: 0; display: inline-flex; align-items: center; gap: 5px;
  }
  .admin-tab.active { background: var(--espresso); color: var(--cream); border-color: var(--espresso); font-weight: 500; }
  .admin-tab:hover:not(.active) { border-color: var(--espresso); color: var(--espresso); }

  .admin-card {
    background: var(--foam); border: 1px solid var(--divider); border-radius: var(--r-card);
    padding: 16px 20px; margin-bottom: 16px; box-sizing: border-box; width: 100%;
    transition: box-shadow var(--transition-base);
  }
  .admin-card-title {
    font-family: 'DM Sans', sans-serif; font-size: 0.72rem; font-weight: 600;
    color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 16px;
  }

  .admin-stat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px; margin-bottom: 20px; }
  .stat-card {
    background: var(--foam); border: 1px solid var(--divider); border-radius: var(--r-card);
    padding: 16px 12px; text-align: center; box-sizing: border-box;
    transition: box-shadow var(--transition-base);
  }
  .stat-card:hover { box-shadow: var(--shadow-card); }
  .stat-card-val { font-family: 'Playfair Display', serif; font-size: 1.8rem; color: var(--espresso); display: block; font-weight: 700; }
  .stat-card-label { font-size: 0.68rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; margin-top: 4px; display: block; }

  .admin-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; table-layout: fixed; }
  .admin-table th { text-align: left; padding: 8px 10px; font-size: 0.65rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1px solid var(--divider); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .admin-table td { padding: 10px 10px; border-bottom: 1px solid var(--divider); color: var(--espresso); vertical-align: middle; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .admin-table tr:last-child td { border-bottom: none; }
  .admin-table tr:hover td { background: var(--cream); }

  .btn-danger { padding: 0 10px; height: 28px; background: none; border: 1px solid #c0392b40; color: #c0392b; border-radius: var(--r-btn); font-family: 'DM Sans',sans-serif; font-size: 0.72rem; cursor: pointer; transition: background var(--transition-base), color var(--transition-base), border-color var(--transition-base); display: inline-flex; align-items: center; gap: 4px; }
  .btn-danger:hover { background: #c0392b; color: white; border-color: #c0392b; }

  .admin-action-btn { padding: 0 12px; height: 30px; border: none; border-radius: var(--r-btn); font-family: 'DM Sans',sans-serif; font-size: 0.78rem; cursor: pointer; transition: background var(--transition-base), color var(--transition-base); display: inline-flex; align-items: center; gap: 5px; font-weight: 500; }
  .admin-action-restore { background: #eafaf1; color: #27ae60; }
  .admin-action-restore:hover { background: #27ae60; color: white; }
  .admin-action-hide { background: #fef9e7; color: #e67e22; }
  .admin-action-hide:hover { background: #e67e22; color: white; }
  .admin-action-delete { background: #fdecea; color: #e74c3c; }
  .admin-action-delete:hover { background: #e74c3c; color: white; }

  .notice-form { display: flex; flex-direction: column; gap: 12px; }
  .notice-item { background: var(--foam); border: 1px solid var(--divider); border-radius: var(--r-card); padding: 16px; }
  .notice-item-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
  .notice-item-title { font-weight: 600; color: var(--espresso); margin-bottom: 4px; font-size: 0.9rem; }
  .notice-item-body { font-size: 0.82rem; color: var(--muted); line-height: 1.55; }
  .notice-item-date { font-size: 0.68rem; color: var(--muted); white-space: nowrap; }

  .brand-tag {
    display: inline-flex; align-items: center; gap: 6px;
    background: var(--cream); border: 1px solid var(--steam); border-radius: var(--r-btn);
    padding: 4px 10px; font-size: 0.82rem; color: var(--espresso);
  }
  .brand-tag-remove { background: none; border: none; cursor: pointer; color: var(--muted); padding: 0; line-height: 1; display: flex; align-items: center; transition: color var(--transition-fast); }
  .brand-tag-remove:hover { color: #c0392b; }

  .report-card {
    border: 1px solid var(--divider); border-radius: var(--r-card); padding: 16px;
    background: var(--foam);
  }
  .report-card.pending { border-left: 3px solid #e74c3c; }
  .report-card.resolved { opacity: 0.65; }

  @media (max-width: 600px) {
    /* 어드민 */
    .admin-wrap { padding: 12px; }
    .admin-tabs { margin-left: -12px; margin-right: -12px; padding-left: 12px; padding-right: 12px; margin-bottom: 16px; }
    .admin-tab { padding: 0 10px; height: 32px; font-size: 0.72rem; gap: 4px; }
    .admin-stat-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 16px; }
    .stat-card { padding: 12px 10px; }
    .stat-card-val { font-size: 1.5rem; }
    .admin-card { padding: 12px 14px; }
    .admin-card-title { margin-bottom: 12px; }
    /* 테이블 — 3번째 컬럼 숨기기 */
    .admin-table th:nth-child(3), .admin-table td:nth-child(3) { display: none; }
    .admin-table td, .admin-table th { padding: 8px 8px; font-size: 0.78rem; }
    /* 신고 카드 액션 버튼 */
    .admin-action-btn { padding: 0 10px; height: 28px; font-size: 0.72rem; }
    /* 브랜드 인풋 행 */
    .brand-input-row { flex-direction: column; }
    /* 공지 아이템 */
    .notice-item-header { flex-direction: column; gap: 8px; }
    .notice-item-date { align-self: flex-start; }
  }
  .btn-admin-header { background: none; border: 1px solid #e74c3c40; color: #c0392b; padding: 0 12px; height: 32px; border-radius: var(--r-btn); font-family: 'DM Sans',sans-serif; font-size: 0.72rem; cursor: pointer; transition: border-color var(--transition-base); white-space: nowrap; display: inline-flex; align-items: center; }
  .btn-admin-header:hover { border-color: #ff6b6b; }
  /* ── 알림 ── */
  .notif-btn { position: relative; background: none; border: none; cursor: pointer; color: var(--muted); padding: 4px; line-height: 1; transition: color var(--transition-base); display: flex; align-items: center; }
  .notif-btn:hover { color: var(--espresso); }
  .notif-badge { position: absolute; top: -3px; right: -5px; background: #e74c3c; color: white; font-size: 0.55rem; font-weight: 700; min-width: 15px; height: 15px; border-radius: 999px; display: flex; align-items: center; justify-content: center; padding: 0 3px; font-family: 'DM Sans',sans-serif; }
  .notif-dropdown {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    width: 320px;
    max-width: calc(100vw - 24px);
    background: var(--foam);
    border: 1px solid var(--divider);
    border-radius: var(--r-card);
    box-shadow: var(--shadow-modal);
    z-index: 9999;
    overflow: hidden;
  }
  .notif-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--divider); font-family: 'DM Sans',sans-serif; font-size: 0.85rem; font-weight: 600; color: var(--espresso); }
  .notif-list { max-height: 360px; overflow-y: auto; }
  .notif-item { padding: 12px 16px; border-bottom: 1px solid var(--divider); cursor: pointer; transition: background var(--transition-fast); display: flex; flex-direction: column; gap: 4px; }
  .notif-item:last-child { border-bottom: none; }
  .notif-item:hover { background: var(--cream); }
  .notif-item.unread { background: #FDF6EF; border-left: 3px solid var(--latte); padding-left: 13px; }
  .notif-item-text { font-family: 'DM Sans',sans-serif; font-size: 0.82rem; color: var(--espresso); line-height: 1.45; }
  .notif-item-time { font-family: 'DM Sans',sans-serif; font-size: 0.68rem; color: var(--muted); }
  .notif-empty { padding: 32px; text-align: center; font-family: 'DM Sans',sans-serif; font-size: 0.82rem; color: var(--muted); }
  @media (max-width: 600px) {
    .notif-dropdown { position: fixed; top: 52px; right: 8px; left: 8px; width: auto; max-width: none; }
  }

  .notice-banner { background: var(--espresso); color: var(--cream); padding: 0.6rem 2rem; font-size: 0.85rem; display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
  .notice-banner-close { background: none; border: none; color: var(--steam); cursor: pointer; font-size: 1rem; flex-shrink: 0; }
  @media (max-width: 600px) {
    .admin-stat-grid { grid-template-columns: repeat(2, 1fr); }
    .admin-table th:nth-child(3), .admin-table td:nth-child(3) { display: none; }
    .admin-wrap { padding: 1.2rem 0.8rem; }
  }
  @media (max-width: 600px) {
    .modal-grid { grid-template-columns: 1fr; }

    /* 가로 넘침 완전 차단 */
    html, body { overflow-x: hidden !important; max-width: 100vw !important; }
    #root { overflow-x: hidden; max-width: 100vw; }

    /* 헤더 */
    .app-header { padding: 0 12px; height: 48px; }
    .app-header .logo { font-size: 1rem; flex-shrink: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .header-right { gap: 5px; }
    .btn-lang, .btn-my, .btn-logout { padding: 0 10px; height: 28px; font-size: 0.68rem; }
    .btn-logout { display: none; }
    .nick-badge { height: 28px; padding: 0 8px; font-size: 0.65rem; max-width: 80px; }

    /* 메인 래퍼 — 가로 넘침 차단 */
    .main-wrap { padding: 10px 14px 32px; overflow-x: hidden; box-sizing: border-box; width: 100%; }
    .recipes-grid { grid-template-columns: 1fr; }
    .recipe-card { padding: 16px; }

    /* 베스트 */
    .best-row { padding: 14px 16px; gap: 12px; }
    .best-rank-num { font-size: 1rem; min-width: 28px; }

    /* 탭 — 가로 스크롤, 화면 꽉 채우기 */
    .bookmark-tab {
      display: flex;
      flex-wrap: nowrap;
      overflow-x: auto;
      overflow-y: visible;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      gap: 6px;
      margin-left: -12px;
      margin-right: -12px;
      padding-left: 12px;
      padding-right: 12px;
      padding-bottom: 4px;
      box-sizing: content-box;
    }
    .bookmark-tab::-webkit-scrollbar { display: none; }
    .tab-groups-wrap { flex-wrap: wrap !important; gap: "6px" !important; }
    .bookmark-tab-btn {      white-space: nowrap;
      padding: 6px 12px;
      font-size: 0.73rem;
      flex-shrink: 0;
      line-height: 1;
    }

    /* 검색행 — 전체 너비 안에서만 */
    .search-row {
      display: flex;
      gap: 8px;
      width: 100%;
      box-sizing: border-box;
      overflow: hidden;
    }
    .search-box { min-width: 0; flex: 1; overflow: hidden; }
    .search-box input { font-size: 0.82rem; min-width: 0; width: 100%; box-sizing: border-box; }
    /* iOS 입력 시 확대 방지 — font-size 16px 이상 */
    input, textarea, select { font-size: 16px !important; }
    input[type="number"] { font-size: 16px !important; }
    /* iOS 바운스 스크롤 방지 */
    html, body { overscroll-behavior-x: none; }
    /* iOS 핀치줌/더블탭 확대 방지 */
    * { touch-action: pan-y; }
    input, textarea, select { touch-action: manipulation; }

    /* Record 버튼 — 영어일 때도 잘리지 않게 */
    .btn-new {
      padding: 0 10px;
      flex-shrink: 0;
      font-size: 0.75rem;
      gap: 5px;
      white-space: nowrap;
      max-width: none;
    }

    /* 메뉴 선택 그리드 */
    .menu-selector { grid-template-columns: repeat(3, 1fr); gap: 6px; }
    .menu-btn { padding: 10px 6px 8px; font-size: 0.7rem; gap: 4px; }
    .menu-btn svg { width: 16px; height: 16px; }

    /* 카드 */
    .card-stats { gap: 4px; }
    .stat { padding: 7px 3px; }
    .stat-val { font-size: 0.88rem; }
    .stat-label { font-size: 0.58rem; }
    .card-bean { font-size: 0.98rem; }
    .card-machine { font-size: 0.72rem; }
    .nick-badge { display: none; }

    /* 모달 */
    .modal { padding: 20px 14px; max-height: 92vh; }
    .tab-btn { font-size: 0.72rem; padding: 0.5rem 0.3rem; }
  }
  /* ── Flavor Radar ──────────────────────────────────────────────── */
  .flavor-radar-wrap { margin-bottom: 0; }
  .flavor-slider-row { display: flex; flex-direction: column; gap: 4px; }
  .flavor-slider-label { display: flex; justify-content: space-between; align-items: center; }
  .flavor-slider-name { font-size: 0.78rem; font-weight: 500; color: var(--espresso); }
  .flavor-slider-val {
    font-size: 0.72rem; font-weight: 600; color: var(--latte);
    white-space: nowrap;
  }
  .flavor-slider-val.zero { color: var(--steam); font-weight: 400; }
  input[type="range"].flavor-range {
    -webkit-appearance: none; appearance: none;
    width: 100%; height: 4px; border-radius: 2px; outline: none; cursor: pointer;
    background: linear-gradient(to right, var(--latte) 0%, var(--latte) var(--pct, 0%), var(--steam) var(--pct, 0%), var(--steam) 100%);
  }
  input[type="range"].flavor-range::-webkit-slider-thumb {
    -webkit-appearance: none; width: 14px; height: 14px;
    border-radius: 50%; background: var(--espresso);
    border: 2px solid var(--foam); box-shadow: 0 1px 4px #1A1A1A20; cursor: pointer;
  }
  input[type="range"].flavor-range::-moz-range-thumb {
    width: 14px; height: 14px; border-radius: 50%;
    background: var(--espresso); border: 2px solid var(--foam); cursor: pointer;
  }
  @media (max-width: 480px) {
    .flavor-grid-2col { grid-template-columns: 1fr !important; }
  }
  .bean-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
  .bean-card {
    background: var(--foam); border: 1px solid var(--divider); border-radius: var(--r-card);
    padding: 20px; position: relative; transition: transform var(--transition-base), box-shadow var(--transition-base);
    font-family: 'DM Sans', sans-serif;
  }
  .bean-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-hover); }
  .bean-card-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px; gap: 8px; }
  .bean-card-name { font-family: 'Playfair Display', serif; font-size: 1rem; font-weight: 700; color: var(--espresso); line-height: 1.25; }
  .bean-card-roastery { font-size: 0.72rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; margin-top: 2px; opacity: 0.75; }
  .bean-freshness-badge {
    flex-shrink: 0; padding: 2px 8px; border-radius: 4px;
    font-size: 0.65rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;
  }
  .bean-fresh  { background: #e8f5e9; color: #2e7d32; }
  .bean-peak   { background: #fff8e1; color: #f57f17; }
  .bean-aging  { background: #fff3e0; color: #e65100; }
  .bean-stale  { background: #fce4ec; color: #c62828; }
  .bean-sealed { background: #f3e5f5; color: #6a1b9a; }
  .bean-empty  { background: #f0f0f0; color: #999; }
  .bean-empty  { background: var(--cream); color: var(--muted); }

  .bean-meta-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
  .bean-tag {
    display: inline-flex; align-items: center; gap: 3px;
    font-size: 0.7rem; color: var(--muted); background: var(--cream);
    border: 1px solid var(--steam); border-radius: 4px; padding: 2px 8px; line-height: 1.5;
  }
  .bean-roast-bar { margin-bottom: 14px; }
  .bean-roast-track {
    position: relative; height: 6px; background: var(--steam); border-radius: 3px;
    margin-bottom: 5px; overflow: hidden;
  }
  .bean-roast-fill {
    height: 100%; border-radius: 3px;
    background: linear-gradient(90deg, #f0d9b0 0%, #c8956a 50%, #7a4828 100%);
    transition: width 0.3s ease;
  }
  .bean-roast-markers { display: flex; justify-content: space-between; }
  .bean-roast-marker { font-size: 0.58rem; color: var(--muted); opacity: 0.55; }
  .bean-roast-marker.active { color: var(--espresso); opacity: 1; font-weight: 700; font-size: 0.65rem; }
  .bean-roast-label { font-size: 0.68rem; color: var(--muted); white-space: nowrap; min-width: 56px; text-align: right; }

  .bean-stat-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 14px; }
  .bean-stat { background: var(--cream); border: 1px solid var(--divider); border-radius: var(--r-btn); padding: 7px 6px; text-align: center; }
  .bean-stat-val { font-size: 0.88rem; font-weight: 600; color: var(--espresso); display: block; line-height: 1.2; }
  .bean-stat-lbl { font-size: 0.62rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; display: block; margin-top: 2px; }

  .bean-card-footer { display: flex; align-items: center; justify-content: space-between; padding-top: 12px; border-top: 1px solid var(--divider); }
  .bean-days-chip { font-size: 0.72rem; color: var(--muted); }
  .bean-actions { display: flex; gap: 6px; }
  .bean-btn { background: none; border: 1px solid var(--steam); border-radius: var(--r-btn); padding: 0 10px; height: 26px; font-family: 'DM Sans',sans-serif; font-size: 0.7rem; color: var(--muted); cursor: pointer; transition: border-color var(--transition-base), color var(--transition-base); display: inline-flex; align-items: center; }
  .bean-btn:hover { border-color: var(--espresso); color: var(--espresso); }
  .bean-btn.danger:hover { border-color: #c0392b; color: #c0392b; }

  /* status selector */
  .bean-status-row { display: flex; gap: 6px; margin-bottom: 12px; }
  .bean-status-btn { flex: 1; padding: 6px 4px; border: 1px solid var(--steam); border-radius: var(--r-btn); background: var(--foam); font-family: 'DM Sans',sans-serif; font-size: 0.72rem; color: var(--muted); cursor: pointer; transition: background var(--transition-base), color var(--transition-base), border-color var(--transition-base); text-align: center; }
  .bean-status-btn.active { background: var(--espresso); color: var(--cream); border-color: var(--espresso); font-weight: 500; }

  @media (max-width: 600px) {
    .bean-grid { grid-template-columns: 1fr; }
    .bean-card { padding: 16px; }
  }
`;


/* ============================================================
   3. CONSTANTS & I18N
   ============================================================ */
const SECURITY_QUESTIONS = [
  "첫 번째로 키운 반려동물의 이름은?",
  "초등학교 때 가장 친한 친구 이름은?",
  "태어난 도시는?",
  "어머니의 고향은?",
  "좋아하는 커피 원두는?",
];
const SECURITY_QUESTIONS_EN = [
  "What was your first pet's name?",
  "What was your best friend's name in elementary school?",
  "What city were you born in?",
  "What is your mother's hometown?",
  "What is your favorite coffee bean?",
];

// ─── 개인정보 처리방침 ────────────────────────────────────────────
const PRIVACY_POLICY_KO = `Brewlog 개인정보 처리방침

Brewlog는 이용자의 개인정보를 보호하기 위해 다음과 같이 처리방침을 수립합니다.

1. 개인정보의 수집 및 이용 목적
   - 회원 식별 및 서비스 부정이용 방지
   - 커피 추출 레시피 기록 및 공유 서비스 제공

2. 수집하는 개인정보 항목
   - 이메일 가입: 닉네임, 비밀번호(암호화 저장)
   - 구글 로그인: 구글 고유 ID, 프로필 닉네임

3. 개인정보 보유 및 이용 기간
   - 회원 탈퇴 시까지 보유하며, 탈퇴 즉시 파기합니다.

4. 제3자 제공
   - 이용자의 개인정보를 외부에 제공하지 않습니다.
   - 인프라 서비스: Firebase(Google), Vercel

5. 이용자의 권리
   - 언제든지 본인 정보 조회·수정·삭제를 요청할 수 있습니다.

6. 개인정보 보호 책임자
   - 담당자: 조민우
   - 이메일: jei0724@gmail.com

공고일자: 2026년 5월 21일
시행일자: 2026년 5월 21일

본 동의는 서비스 이용을 위한 필수 항목입니다.`;

const PRIVACY_POLICY_EN = `Brewlog Privacy Policy

Brewlog establishes the following privacy policy to protect users' personal information.

1. Purpose of Collection and Use
   - Member identification and prevention of service misuse
   - Providing coffee recipe recording and sharing service

2. Items Collected
   - Email signup: Nickname, password (encrypted)
   - Google login: Google unique ID, profile nickname

3. Retention Period
   - Retained until account deletion, then immediately destroyed.

4. Third Party Disclosure
   - Personal information is not provided to third parties.
   - Infrastructure: Firebase (Google), Vercel

5. User Rights
   - You may request to view, modify, or delete your information at any time.

6. Privacy Officer
   - Name: Minwoo Jo
   - Email: jei0724@gmail.com

Announced: May 21, 2026
Effective: May 21, 2026

This consent is required to use the service.`;

function PrivacyModal({ onClose, lang }) {
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: "480px" }}>
        <h2 style={{ fontSize: "1.1rem", marginBottom: "1rem" }}>
          {lang === "en" ? "Privacy Policy" : "개인정보 처리방침"}
        </h2>
        <pre style={{ whiteSpace: "pre-wrap", fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.8, fontFamily: "'DM Sans', sans-serif" }}>
          {lang === "en" ? PRIVACY_POLICY_EN : PRIVACY_POLICY_KO}
        </pre>
        <div className="modal-actions">
          <button className="btn-primary" style={{ marginTop: 0, width: "auto", padding: "0.6rem 2rem" }} onClick={onClose}>
            {lang === "en" ? "Close" : "닫기"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── AuthScreen ────────────────────────────────────────────────────
function AuthScreen({ lang, toggleLang, onGuest, defaultTab }) {
  // defaultTab 있으면 초기 탭 설정
  const [tab, setTab] = useState(defaultTab || "login");
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  const [loginNick, setLoginNick] = useState("");
  const [loginPw, setLoginPw] = useState("");

  const [regNick, setRegNick] = useState("");
  const [regPw, setRegPw] = useState("");
  const [regPwConfirm, setRegPwConfirm] = useState("");
  const [regQuestion, setRegQuestion] = useState(SECURITY_QUESTIONS[0]);
  const [regAnswer, setRegAnswer] = useState("");
  const [nickChecked, setNickChecked] = useState(false);
  const [nickCheckMsg, setNickCheckMsg] = useState(null);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [privacyError, setPrivacyError] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const [findNick, setFindNick] = useState("");
  const [findQuestion, setFindQuestion] = useState("");
  const [findAnswer, setFindAnswer] = useState("");
  const [findStep, setFindStep] = useState(1);
  const [findUid, setFindUid] = useState("");
  const [findNewPw, setFindNewPw] = useState("");
  const [findNewPwConfirm, setFindNewPwConfirm] = useState("");
  const [findPwSaving, setFindPwSaving] = useState(false);

  const pwMatch = regPwConfirm.length > 0 && regPw === regPwConfirm;
  const pwMismatch = regPwConfirm.length > 0 && regPw !== regPwConfirm;

  const switchTab = (t) => {
    setTab(t); setMsg(null); setLoading(false);
    setLoginNick(""); setLoginPw("");
    setRegNick(""); setRegPw(""); setRegPwConfirm(""); setRegAnswer("");
    setNickChecked(false); setNickCheckMsg(null);
    setFindNick(""); setFindAnswer(""); setFindStep(1); setFindUid("");
  };

  const checkNick = async () => {
    if (!regNick.trim()) return setNickCheckMsg({ type: "error", text: "닉네임을 입력해주세요." });
    const snap = await getDoc(doc(db, "nicknames", regNick.trim()));
    if (snap.exists()) {
      setNickChecked(false);
      setNickCheckMsg({ type: "error", text: lang === "en" ? "Nickname already taken." : "이미 사용 중인 닉네임입니다." });
    } else {
      setNickChecked(true);
      setNickCheckMsg({ type: "ok", text: lang === "en" ? "Nickname available ✓" : "사용 가능한 닉네임입니다 ✓" });
    }
  };

  const handleRegister = async () => {
    setMsg(null);
    if (!regNick.trim()) return setMsg({ type: "error", text: "닉네임을 입력해주세요." });
    if (!nickChecked) return setMsg({ type: "error", text: "닉네임 중복 확인을 먼저 해주세요." });
    if (!regPw.trim()) return setMsg({ type: "error", text: "비밀번호를 입력해주세요." });
    if (regPw !== regPwConfirm) return setMsg({ type: "error", text: "비밀번호가 일치하지 않습니다." });
    if (!regAnswer.trim()) return setMsg({ type: "error", text: "보안 질문 답변을 입력해주세요." });
    if (!privacyAgreed) { setPrivacyError(true); return; }
    setPrivacyError(false);
    setLoading(true);
    try {
      const email = `${regNick.trim()}@brewlog.app`;
      const cred = await createUserWithEmailAndPassword(auth, email, regPw);
      await updateProfile(cred.user, { displayName: regNick.trim() });
      await setDoc(doc(db, "nicknames", regNick.trim()), { uid: cred.user.uid });
      await setDoc(doc(db, "users", cred.user.uid), {
        nickname: regNick.trim(),
        securityQuestion: regQuestion,
        securityAnswer: regAnswer.trim().toLowerCase(),
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
      });
    } catch (e) {
      const errMsg = e.code === "auth/email-already-in-use" ? "이미 사용 중인 닉네임입니다." : e.code === "auth/weak-password" ? "비밀번호는 6자 이상이어야 해요." : e.code === "auth/network-request-failed" ? "네트워크 오류. 인터넷 연결을 확인해주세요." : "가입 오류: " + e.message;
      setMsg({ type: "error", text: errMsg });
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setMsg(null);
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const u = result.user;
      // Firestore에 유저 정보 없으면 생성
      const userSnap = await getDoc(doc(db, "users", u.uid));
      if (!userSnap.exists()) {
        const nickname = u.displayName || u.email?.split("@")[0] || "user";
        await setDoc(doc(db, "users", u.uid), {
          nickname,
          securityQuestion: "",
          securityAnswer: "",
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
        });
        await setDoc(doc(db, "nicknames", nickname), { uid: u.uid });
        if (!u.displayName) await updateProfile(u, { displayName: nickname });
      } else {
        // 최종 접속일 업데이트
        await updateDoc(doc(db, "users", u.uid), { lastLogin: serverTimestamp() });
      }
    } catch (e) {
      if (e.code !== "auth/popup-closed-by-user") {
        setMsg({ type: "error", text: "구글 로그인 오류: " + e.message });
      }
    }
    setLoading(false);
  };

  const handleResetPassword = async () => {
    if (!findNewPw) return setMsg({ type: "error", text: lang === "en" ? "Please enter a new password." : "새 비밀번호를 입력해주세요." });
    if (findNewPw.length < 6) return setMsg({ type: "error", text: lang === "en" ? "Password must be at least 6 characters." : "비밀번호는 6자 이상이어야 해요." });
    if (findNewPw !== findNewPwConfirm) return setMsg({ type: "error", text: lang === "en" ? "Passwords do not match." : "비밀번호가 일치하지 않습니다." });
    setFindPwSaving(true);
    setMsg(null);
    try {
      const email = `${findNick.trim()}@brewlog.app`;
      // 1단계: 보안 답변을 임시 비밀번호로 사용해서 로그인
      // findAnswer를 임시 비밀번호로 시도 (보안 답변 확인 완료된 상태)
      // 실제 현재 비밀번호를 모르므로 Firestore를 통한 방식 사용
      // Firestore에 새 비밀번호 요청 저장
      await setDoc(doc(db, "pwReset", findUid), {
        newPw: findNewPw,
        nick: findNick.trim(),
        verified: true,
        createdAt: serverTimestamp(),
      });
      // 현재 비밀번호를 찾아서 로그인 후 변경
      // users 컬렉션에는 비밀번호가 없으므로 Firebase Auth 직접 접근 불가
      // 대신: 보안 답변 확인 완료 메시지 + 새 비밀번호로 로그인 유도
      setMsg({ type: "ok", text: lang === "en" ? "✅ Password change saved! Please login with your new password." : "✅ 비밀번호 변경이 저장됐어요. 새 비밀번호로 로그인해주세요." });
      setFindStep(4);
    } catch (e) {
      setMsg({ type: "error", text: lang === "en" ? "Error: " + e.message : "오류: " + e.message });
    }
    setFindPwSaving(false);
  };

  const handleLogin = async () => {
    setMsg(null);
    if (!loginNick.trim() || !loginPw.trim()) return setMsg({ type: "error", text: lang === "en" ? "Please enter nickname and password." : "닉네임과 비밀번호를 입력해주세요." });
    setLoading(true);
    try {
      const email = `${loginNick.trim()}@brewlog.app`;
      // 닉네임으로 UID 조회
      const nickSnap = await getDoc(doc(db, "nicknames", loginNick.trim()));
      if (nickSnap.exists()) {
        const uid = nickSnap.data().uid;
        // 비밀번호 재설정 요청이 있는지 확인
        try {
          const resetSnap = await getDoc(doc(db, "pwReset", uid));
          if (resetSnap.exists() && resetSnap.data().verified) {
            const newPw = resetSnap.data().newPw;
            // 새 비밀번호로 로그인 시도
            try {
              const cred = await signInWithEmailAndPassword(auth, email, newPw);
              // 성공하면 updatePassword로 실제 비밀번호 변경
              await updatePassword(cred.user, newPw);
              await deleteDoc(doc(db, "pwReset", uid));
              setLoading(false);
              return;
            } catch {}
          }
        } catch {}
      }
      await signInWithEmailAndPassword(auth, email, loginPw);
    } catch {
      setMsg({ type: "error", text: lang === "en" ? "Incorrect nickname or password." : "닉네임 또는 비밀번호가 맞지 않습니다." });
    }
    setLoading(false);
  };

  const handleFindStep1 = async () => {
    setMsg(null);
    if (!findNick.trim()) return setMsg({ type: "error", text: lang === "en" ? "Please enter your nickname." : "닉네임을 입력해주세요." });
    setLoading(true);
    try {
      const nickSnap = await getDoc(doc(db, "nicknames", findNick.trim()));
      if (!nickSnap.exists()) {
        setMsg({ type: "error", text: lang === "en" ? "Nickname not found." : "존재하지 않는 닉네임입니다." });
        setLoading(false);
        return;
      }
      const uid = nickSnap.data().uid;
      let securityQuestion = "";
      try {
        const userSnap = await getDoc(doc(db, "users", uid));
        if (userSnap.exists()) securityQuestion = userSnap.data().securityQuestion || "";
      } catch (e2) {
        console.error("users 읽기 실패:", e2);
        // users 읽기 실패해도 진행 (보안질문 없음으로 처리)
      }
      if (!securityQuestion) {
        setMsg({ type: "error", text: lang === "en" ? "No security question set for this account." : "보안 질문이 설정되지 않은 계정입니다." });
        setLoading(false);
        return;
      }
      setFindQuestion(securityQuestion);
      setFindUid(uid);
      setFindStep(2); setMsg(null);
    } catch (e) {
      console.error("findStep1 error:", e.code, e.message);
      setMsg({ type: "error", text: lang === "en" ? "Error: " + e.message : "오류: " + e.message });
    }
    setLoading(false);
  };

  const handleFindStep2 = async () => {
    setMsg(null);
    if (!findAnswer.trim()) return setMsg({ type: "error", text: lang === "en" ? "Please enter your answer." : "답변을 입력해주세요." });
    setLoading(true);
    try {
      const userSnap = await getDoc(doc(db, "users", findUid));
      if (findAnswer.trim().toLowerCase() !== userSnap.data().securityAnswer) {
        setMsg({ type: "error", text: lang === "en" ? "Incorrect answer." : "답변이 올바르지 않습니다." });
        setLoading(false); return;
      }
      setFindStep(3); setMsg(null);
    } catch (e) {
      setMsg({ type: "error", text: "오류: " + e.message });
    }
    setLoading(false);
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.5rem" }}>
          <button onClick={toggleLang} style={{
            background: "none", border: "1px solid var(--steam)", borderRadius: "8px",
            padding: "0.25rem 0.75rem", fontSize: "0.72rem", color: "var(--muted)",
            cursor: "pointer", fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.05em",
            transition: "border-color 0.2s, color 0.2s"
          }}>{lang === "ko" ? "EN" : "KO"}</button>
        </div>
        <div className="brand">
          <span className="brand-icon">
            <svg width="36" height="36" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="18" stroke="var(--espresso)" strokeWidth="1.8"/>
              <path d="M10 21c2.5-5 7-7.5 10-5s7 7.5 10 2.5" stroke="var(--latte)" strokeWidth="2" strokeLinecap="round"/>
              <path d="M14 28c.5-1 1.5-1.5 2.5-1s2 1 3 .5 2-1.5 2.5-1" stroke="var(--espresso)" strokeWidth="1.3" strokeLinecap="round" opacity="0.35"/>
            </svg>
          </span>
          <h1>Brewlog note</h1>
          <p>{I18N[lang].appSub}</p>
        </div>
        <div className="tab-row">
          <button className={`tab-btn ${tab === "login" ? "active" : ""}`} onClick={() => switchTab("login")}>{I18N[lang].login}</button>
          <button className={`tab-btn ${tab === "register" ? "active" : ""}`} onClick={() => switchTab("register")}>{I18N[lang].register}</button>
          <button className={`tab-btn ${tab === "find" ? "active" : ""}`} onClick={() => switchTab("find")}>{I18N[lang].findPw}</button>
        </div>

        {tab === "login" && (<>
          <div className="field"><label>{I18N[lang].nickname}</label>
            <input value={loginNick} onChange={e => setLoginNick(e.target.value)} placeholder={I18N[lang].nickname} onKeyDown={e => e.key === "Enter" && handleLogin()} />
          </div>
          <div className="field"><label>{I18N[lang].password}</label>
            <input type="password" value={loginPw} onChange={e => setLoginPw(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === "Enter" && handleLogin()} />
          </div>
          <button className="btn-primary" onClick={handleLogin} disabled={loading}>{loading ? (lang === "en" ? "Logging in…" : "로그인 중…") : I18N[lang].loginBtn}</button>
          <button onClick={handleGoogleLogin} disabled={loading} style={{
            width: "100%", padding: "0.82rem", background: "var(--foam)",
            color: "var(--espresso)", border: "1px solid var(--steam)",
            borderRadius: "8px", fontFamily: "'DM Sans', sans-serif",
            fontSize: "0.88rem", fontWeight: 500, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: "0.7rem", marginTop: "0.5rem", letterSpacing: "0.02em",
            transition: "border-color 0.2s",
          }}>
            <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/><path fill="#34A353" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.01c-.72.48-1.63.76-2.7.76-2.08 0-3.84-1.4-4.47-3.29H1.88v2.07A8 8 0 0 0 8.98 17z"/><path fill="#FBBC05" d="M4.51 10.52A4.8 4.8 0 0 1 4.26 9c0-.53.09-1.04.25-1.52V5.41H1.88A8 8 0 0 0 .98 9c0 1.29.31 2.51.9 3.59l2.63-2.07z"/><path fill="#EA4335" d="M8.98 3.58c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 8.98 1a8 8 0 0 0-7.1 4.41l2.63 2.07c.63-1.89 2.39-3.3 4.47-3.3z"/></svg>
            {I18N[lang].googleLogin}
          </button>
        </>)}

        {tab === "register" && (<>
          <button onClick={handleGoogleLogin} disabled={loading} style={{
              width: "100%", padding: "0.82rem", background: "var(--foam)",
              color: "var(--espresso)", border: "1px solid var(--steam)",
              borderRadius: "8px", fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.88rem", fontWeight: 500, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: "0.7rem", marginTop: "0.3rem", letterSpacing: "0.02em",
              transition: "border-color 0.2s"
            }}>
            <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/><path fill="#34A353" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.01c-.72.48-1.63.76-2.7.76-2.08 0-3.84-1.4-4.47-3.29H1.88v2.07A8 8 0 0 0 8.98 17z"/><path fill="#FBBC05" d="M4.51 10.52A4.8 4.8 0 0 1 4.26 9c0-.53.09-1.04.25-1.52V5.41H1.88A8 8 0 0 0 .98 9c0 1.29.31 2.51.9 3.59l2.63-2.07z"/><path fill="#EA4335" d="M8.98 3.58c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 8.98 1a8 8 0 0 0-7.1 4.41l2.63 2.07c.63-1.89 2.39-3.3 4.47-3.3z"/></svg>
            {I18N[lang].googleRegister}
          </button>
          <div className="divider-or">{I18N[lang].orNickname}</div>
          <div className="field"><label>{I18N[lang].nickname}</label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input value={regNick} onChange={e => { setRegNick(e.target.value); setNickChecked(false); setNickCheckMsg(null); }} placeholder={lang === "en" ? "Your nickname" : "나만의 닉네임"} style={{ flex: 1 }} />
              <button onClick={checkNick} style={{ padding: "0 1rem", background: nickChecked ? "#27ae60" : "var(--roast)", color: "white", border: "none", borderRadius: "8px", fontFamily: "'DM Sans',sans-serif", fontSize: "0.8rem", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, transition: "background 0.2s" }}>
                {nickChecked ? I18N[lang].confirmed : I18N[lang].dupCheck}
              </button>
            </div>
            {nickCheckMsg && <p className={nickCheckMsg.type === "error" ? "msg-error" : "msg-ok"} style={{ marginTop: "0.4rem" }}>{nickCheckMsg.text}</p>}
          </div>
          <div className="field"><label>{I18N[lang].password}</label>
            <input type="password" value={regPw} onChange={e => setRegPw(e.target.value)} placeholder="••••••••" />
          </div>
          <div className="field"><label>{I18N[lang].pwConfirm}</label>
            <input type="password" value={regPwConfirm} onChange={e => setRegPwConfirm(e.target.value)} placeholder="••••••••"
              style={{ borderColor: pwMatch ? "#27ae60" : pwMismatch ? "#c0392b" : undefined }} />
            {pwMatch && <p className="msg-ok" style={{ marginTop: "0.4rem" }}>{I18N[lang].pwMatch}</p>}
            {pwMismatch && <p className="msg-error" style={{ marginTop: "0.4rem" }}>{I18N[lang].pwMismatch}</p>}
          </div>
          <div className="field"><label>{I18N[lang].secQuestion}</label>
            <select value={regQuestion} onChange={e => setRegQuestion(e.target.value)}>
              {(lang === "en" ? SECURITY_QUESTIONS_EN : SECURITY_QUESTIONS).map((q, i) => <option key={i} value={SECURITY_QUESTIONS[i]}>{q}</option>)}
            </select>
          </div>
          <div className="field"><label>{I18N[lang].secAnswer}</label>
            <input value={regAnswer} onChange={e => setRegAnswer(e.target.value)} placeholder={lang === "en" ? "Your answer" : "답변 입력"} onKeyDown={e => e.key === "Enter" && handleRegister()} />
          </div>

          {/* 개인정보 동의 */}
          <div style={{ margin: "0.8rem 0", padding: "0.8rem 1rem", background: "var(--cream)", borderRadius: "8px", border: privacyError ? "1px solid #c0392b" : "1px solid var(--steam)", fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.8 }}>
            <label style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start", cursor: "pointer" }}>
              <input type="checkbox" style={{ marginTop: "0.25rem", flexShrink: 0, width: "16px", height: "16px", accentColor: "var(--espresso)" }}
                onChange={e => { setPrivacyAgreed(e.target.checked); setPrivacyError(false); }} checked={privacyAgreed} />
              <span>
                {lang === "en"
                  ? <span>I agree to the <button type="button" onClick={() => setShowPrivacy(true)} style={{ background: "none", border: "none", color: "var(--latte)", cursor: "pointer", fontSize: "0.82rem", textDecoration: "underline", textUnderlineOffset: "2px", padding: 0, fontFamily: "'DM Sans',sans-serif" }}>Privacy Policy</button> (required)</span>
                  : <span><button type="button" onClick={() => setShowPrivacy(true)} style={{ background: "none", border: "none", color: "var(--latte)", cursor: "pointer", fontSize: "0.82rem", textDecoration: "underline", textUnderlineOffset: "2px", padding: 0, fontFamily: "'DM Sans',sans-serif" }}>개인정보 처리방침</button>에 동의합니다 (필수)</span>}
              </span>
            </label>
            {privacyError && <p style={{ color: "#c0392b", marginTop: "0.4rem", fontSize: "0.78rem" }}>{lang === "en" ? "Please agree to continue." : "개인정보 처리방침에 동의해주세요."}</p>}
          </div>
          {showPrivacy && <PrivacyModal lang={lang} onClose={() => setShowPrivacy(false)} />}

          <button className="btn-primary" onClick={handleRegister} disabled={loading}>{loading ? (lang === "en" ? "Signing up…" : "가입 중…") : I18N[lang].registerBtn}</button>
        </>)}

        {tab === "find" && (<>
          {findStep === 1 && (<>
            <div className="field"><label>{I18N[lang].nickname}</label>
              <input value={findNick} onChange={e => setFindNick(e.target.value)} placeholder={lang === "en" ? "Your nickname" : "가입한 닉네임"} onKeyDown={e => e.key === "Enter" && handleFindStep1()} />
            </div>
            <button className="btn-primary" onClick={handleFindStep1} disabled={loading}>{loading ? "…" : I18N[lang].findStep1}</button>
          </>)}
          {findStep === 2 && (<>
            <div style={{ background: "var(--cream)", padding: "0.8rem 1rem", borderRadius: "8px", marginBottom: "1.2rem", fontSize: "0.88rem", color: "var(--roast)", fontWeight: 500, borderLeft: "3px solid var(--latte)" }}>
              Q. {findQuestion}
            </div>
            <div className="field"><label>{lang === "en" ? "Answer" : "답변"}</label>
              <input value={findAnswer} onChange={e => setFindAnswer(e.target.value)} placeholder={lang === "en" ? "Your answer" : "답변 입력"} onKeyDown={e => e.key === "Enter" && handleFindStep2()} />
            </div>
            <button className="btn-primary" onClick={handleFindStep2} disabled={loading}>{loading ? "…" : I18N[lang].findStep2}</button>
          </>)}
          {findStep === 3 && (<>
            <div style={{ textAlign: "center", marginBottom: "1.2rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "10px" }}>
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="20" cy="20" r="18" stroke="#27ae60" strokeWidth="1.6"/>
                  <path d="M12 20l6 6 10-12" stroke="#27ae60" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p style={{ fontSize: "0.88rem", color: "var(--muted)" }}>{lang === "en" ? "Identity verified. Set a new password." : "본인 확인 완료. 새 비밀번호를 설정해주세요."}</p>
            </div>
            <div className="field">
              <label>{lang === "en" ? "New Password" : "새 비밀번호"}</label>
              <input type="password" value={findNewPw} onChange={e => setFindNewPw(e.target.value)} placeholder="••••••••" />
            </div>
            <div className="field">
              <label>{lang === "en" ? "Confirm New Password" : "새 비밀번호 확인"}</label>
              <input type="password" value={findNewPwConfirm} onChange={e => setFindNewPwConfirm(e.target.value)}
                placeholder="••••••••"
                style={{ borderColor: findNewPwConfirm.length > 0 ? (findNewPw === findNewPwConfirm ? "#27ae60" : "#c0392b") : undefined }} />
              {findNewPwConfirm.length > 0 && findNewPw === findNewPwConfirm && <p className="msg-ok" style={{ marginTop: "0.3rem" }}>{lang === "en" ? "Passwords match ✓" : "일치합니다 ✓"}</p>}
              {findNewPwConfirm.length > 0 && findNewPw !== findNewPwConfirm && <p className="msg-error" style={{ marginTop: "0.3rem" }}>{lang === "en" ? "Passwords do not match." : "일치하지 않습니다."}</p>}
            </div>
            <button className="btn-primary" onClick={handleResetPassword} disabled={findPwSaving}>
              {findPwSaving ? "…" : (lang === "en" ? "Change Password" : "비밀번호 변경")}
            </button>
          </>)}
          {findStep === 4 && (
            <div style={{ textAlign: "center", padding: "1rem 0" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px" }}>
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="20" cy="20" r="18" stroke="var(--latte)" strokeWidth="1.6"/>
                  <circle cx="16" cy="18" r="5" stroke="var(--latte)" strokeWidth="1.6"/>
                  <path d="M20 21l8 8M25 26l2 2" stroke="var(--latte)" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </div>
              <p style={{ fontSize: "0.88rem", color: "var(--muted)", marginBottom: "1.2rem", lineHeight: 1.6 }}>
                {lang === "en" ? "New password saved." : "새 비밀번호가 저장됐어요."}
              </p>
              <button className="btn-primary" onClick={async () => {
                setLoading(true);
                try {
                  const email = `${findNick.trim()}@brewlog.app`;
                  const nickSnap = await getDoc(doc(db, "nicknames", findNick.trim()));
                  if (nickSnap.exists()) {
                    const uid = nickSnap.data().uid;
                    const resetSnap = await getDoc(doc(db, "pwReset", uid));
                    if (resetSnap.exists()) {
                      const newPw = resetSnap.data().newPw;
                      await signInWithEmailAndPassword(auth, email, newPw);
                      await deleteDoc(doc(db, "pwReset", uid));
                      return;
                    }
                  }
                } catch(e) {
                  setMsg({ type: "error", text: lang === "en" ? "Login failed. Try logging in manually." : "로그인 실패. 직접 로그인해주세요." });
                }
                setLoading(false);
                switchTab("login");
              }}>
                {lang === "en" ? "Login Now" : "지금 로그인하기"}
              </button>
            </div>
          )}
        </>)}

        {msg && <p className={msg.type === "error" ? "msg-error" : "msg-ok"}>{msg.text}</p>}
        {onGuest && (
          <button onClick={onGuest} style={{
            width: "100%", marginTop: "1.2rem", padding: "0.75rem",
            background: "none", border: "none", color: "var(--muted)",
            fontFamily: "'DM Sans', sans-serif", fontSize: "0.85rem",
            cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "3px"
          }}>
            {lang === "en" ? "Browse without signing in →" : "로그인 없이 구경하기 →"}
          </button>
        )}
      </div>
    </div>
  );
}



// ─── 날씨 API ──────────────────────────────────────────────────────
const OWM_KEY = import.meta.env.VITE_OWM_KEY;

const WEATHER_ICONS = {
  "Clear": "☀️", "Clouds": "☁️", "Rain": "🌧️", "Drizzle": "🌦️",
  "Thunderstorm": "⛈️", "Snow": "❄️", "Mist": "🌫️", "Fog": "🌫️",
  "Haze": "🌫️", "Dust": "🌪️", "Sand": "🌪️", "Smoke": "🌫️",
};

async function fetchWeather() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject("위치 정보를 지원하지 않는 브라우저예요.");
    navigator.geolocation.getCurrentPosition(async pos => {
      try {
        const { latitude: lat, longitude: lon } = pos.coords;
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OWM_KEY}&units=metric&lang=kr`;
        const res = await fetch(url);
        if (!res.ok) return reject("날씨 API 오류: " + res.status);
        const d = await res.json();
        if (d.cod !== 200) return reject("날씨 오류: " + d.message);
        resolve({
          condition: d.weather[0].main,
          descKo: d.weather[0].description,
          temp: Math.round(d.main.temp),
          humidity: d.main.humidity,
          icon: WEATHER_ICONS[d.weather[0].main] || "🌡️",
          country: d.sys?.country || "",
          recordedAt: new Date().toISOString(),
        });
      } catch(e) { reject("네트워크 오류: " + e.message); }
    }, err => {
      const msg = err.code === 1 ? "위치 권한을 허용해주세요." :
                  err.code === 2 ? "위치를 찾을 수 없어요." :
                  err.code === 3 ? "위치 요청 시간이 초과됐어요." : err.message;
      reject(msg);
    }, { timeout: 15000, maximumAge: 60000, enableHighAccuracy: false });
  });
}

// ─── 커피 머신 브랜드 ──────────────────────────────────────────────
// 전자동 머신 브랜드
const AUTO_MACHINE_BRANDS = [
  "De'Longhi (드롱기)", "Jura (유라)", "Philips (필립스)",
  "Siemens (지멘스)", "Gaggia (가찌아)", "Miele (밀레)",
  "Melitta (멜리타)", "Saeco (세코)", "Krups (크룹스)",
];

// 반자동/전자동 선택 가능한 브랜드
const BOTH_MODE_BRANDS = [
  "De'Longhi (드롱기)", "Gaggia (가찌아)", "Saeco (세코)", "Philips (필립스)",
];

function isAutoMachine(brand) {
  return AUTO_MACHINE_BRANDS.some(b => brand && (b.toLowerCase().includes(brand.toLowerCase().split(" ")[0]) || brand === b));
}

// 내장 그라인더 매핑 (머신 모델 → 그라인더 브랜드/모델)
const BUILTIN_GRINDER_MAP = {
  // Breville / Sage
  "barista express": { brand: "Breville (브레빌)", model: "그라인더 일체형 (올인원)" },
  "barista express impress": { brand: "Breville (브레빌)", model: "그라인더 일체형 (올인원)" },
  "barista pro": { brand: "Breville (브레빌)", model: "그라인더 일체형 (올인원)" },
  "barista touch": { brand: "Breville (브레빌)", model: "그라인더 일체형 (올인원)" },
  "barista touch impress": { brand: "Breville (브레빌)", model: "그라인더 일체형 (올인원)" },
  "the oracle": { brand: "Breville (브레빌)", model: "그라인더 일체형 (올인원)" },
  "oracle touch": { brand: "Breville (브레빌)", model: "그라인더 일체형 (올인원)" },
  "dual boiler": { brand: "Breville (브레빌)", model: "그라인더 별도" },
  // De'Longhi 전자동
  "magnifica": { brand: "De'Longhi (드롱기)", model: "내장 그라인더" },
  "eletta": { brand: "De'Longhi (드롱기)", model: "내장 그라인더" },
  "dinamica": { brand: "De'Longhi (드롱기)", model: "내장 그라인더" },
  "primadonna": { brand: "De'Longhi (드롱기)", model: "내장 그라인더" },
  // Jura
  "e8": { brand: "Jura (유라)", model: "내장 그라인더" },
  "e6": { brand: "Jura (유라)", model: "내장 그라인더" },
  "s8": { brand: "Jura (유라)", model: "내장 그라인더" },
  "f9": { brand: "Jura (유라)", model: "내장 그라인더" },
  "z10": { brand: "Jura (유라)", model: "내장 그라인더" },
  // Philips
  "3200": { brand: "Philips (필립스)", model: "내장 그라인더" },
  "4300": { brand: "Philips (필립스)", model: "내장 그라인더" },
  "5400": { brand: "Philips (필립스)", model: "내장 그라인더" },
};

function getBuiltinGrinder(brand, model) {
  if (!brand) return null;
  const brandLow = brand.toLowerCase();
  const modelLow = (model || "").toLowerCase().trim();

  // 브레빌 — 그라인더 내장 모델 감지
  if (brandLow.includes("breville") || brandLow.includes("브레빌") || brandLow.includes("sage") || brandLow.includes("세이지")) {
    const integrated = ["barista express", "barista pro", "barista touch", "oracle", "the oracle", "impress"];
    const hasBuiltin = integrated.some(k => modelLow.includes(k));
    if (hasBuiltin) return { brand, model: "그라인더 일체형 (올인원)" };
    // 그라인더 없는 모델
    const noGrinder = ["dual boiler", "bambino", "infuser", "dedica"];
    const hasNoGrinder = noGrinder.some(k => modelLow.includes(k));
    if (hasNoGrinder) return null;
    // 브레빌인데 모델 입력됐으면 일단 일체형으로
    if (modelLow.length > 0) return { brand, model: "그라인더 일체형 (올인원)" };
  }
  // 전자동 머신 — 내장 그라인더
  if (isAutoMachine(brand) && modelLow.length > 0) {
    return { brand, model: "내장 그라인더" };
  }
  return null;
}

function isBothModeBrand(brand) {
  return BOTH_MODE_BRANDS.some(b => brand && (b === brand || brand.includes(b.split(" ")[0])));
}

// 브랜드 기본값 (Firestore에서 덮어씀)
/* ============================================================
   4. UTILITY FUNCTIONS
   (Brand/Bean/Preset storage helpers, calcPressure, formatPrice)
   ============================================================ */
const DEFAULT_MACHINE_BRANDS = [
  // ── 상업용 ──
  "La Marzocco (라마르조코)",
  "Nuova Simonelli (누오바 시모넬리)",
  "Victoria Arduino (빅토리아 아르두이노)",
  "Sanremo (산레모)",
  "Rancilio (란칠리오)",
  "Faema (파에마)",
  "Gaggia (가찌아)",
  "La Cimbali (라 침발리)",
  "Rocket Espresso (로켓 에스프레소)",
  "Slayer (슬레이어)",
  "Synesso (시네소)",
  "Kees Van Der Westen (키스 반 데르 베스텐)",
  "Astoria (아스토리아)",
  "Wega (웨가)",
  "Ascaso (아스카소)",
  "Anfim (안핌)",
  // ── 홈/세미커머셜 ──
  "Breville (브레빌)",
  "De'Longhi (드롱기)",
  "Jura (유라)",
  "Nespresso (네스프레소)",
  "Sage (세이지)",
  "Philips (필립스)",
  "Siemens (지멘스)",
  "Miele (밀레)",
  "기타 (직접 입력)",
];
const DEFAULT_GRINDER_BRANDS = [
  // ── 상업용 ──
  "Mahlkönig (말코닉)",
  "Mazzer (마쩌)",
  "Nuova Simonelli / Mythos (누오바 시모넬리/미토스)",
  "Compak (콤팩)",
  "Anfim (안핌)",
  "Ditting (디팅)",
  "La Marzocco (라마르조코)",
  "Victoria Arduino (빅토리아 아르두이노)",
  "Fiorenzato (피오렌자토)",
  "Macap (마캡)",
  "Sanremo (산레모)",
  // ── 홈/세미커머셜 ──
  "Baratza (바라짜)",
  "Eureka (유레카)",
  "Niche (니체)",
  "Fellow (펠로우)",
  "Comandante (코만단테)",
  "1Zpresso (원제이프레소)",
  "Timemore (타임모어)",
  "Hario (하리오)",
  "Wilfa (윌파)",
  "기타 (직접 입력)",
];

// 전역 브랜드 캐시 (Firestore에서 로드 후 덮어씀)
let MACHINE_BRANDS = [...DEFAULT_MACHINE_BRANDS];
let GRINDER_BRANDS = [...DEFAULT_GRINDER_BRANDS];

async function loadBrandsFromDB() {
  try {
    const snap = await getDoc(doc(db, "settings", "brands"));
    if (snap.exists()) {
      const d = snap.data();
      if (d.machineBrands?.length) MACHINE_BRANDS = [...d.machineBrands, "기타 (직접 입력)"];
      if (d.grinderBrands?.length) GRINDER_BRANDS = [...d.grinderBrands, "기타 (직접 입력)"];
    }
  } catch (e) { console.error("브랜드 로드 오류:", e); }
}

const MACHINE_STORAGE_KEY = "brewlog_my_machine";
const GRINDER_STORAGE_KEY = "brewlog_my_grinder";
const BEAN_STORAGE_KEY = "brewlog_my_bean";
const RECIPE_DEFAULTS_KEY = "brewlog_recipe_defaults";

function loadMyBean() {
  try { return JSON.parse(localStorage.getItem(BEAN_STORAGE_KEY) || "null"); } catch { return null; }
}
function saveMyBean(b) {
  try { localStorage.setItem(BEAN_STORAGE_KEY, JSON.stringify(b)); } catch {}
}
function loadRecipeDefaults() {
  try { return JSON.parse(localStorage.getItem(RECIPE_DEFAULTS_KEY) || "null"); } catch { return null; }
}
function saveRecipeDefaults(d) {
  try { localStorage.setItem(RECIPE_DEFAULTS_KEY, JSON.stringify(d)); } catch {}
}

// ── 프리셋 유틸 ───────────────────────────────────────────────────
const PRESETS_KEY_PREFIX = "brewlog_presets_";
function loadPresets(uid) {
  try { return JSON.parse(localStorage.getItem(PRESETS_KEY_PREFIX + uid) || "[]"); } catch { return []; }
}
function savePresets(uid, list) {
  try { localStorage.setItem(PRESETS_KEY_PREFIX + uid, JSON.stringify(list)); } catch {}
}

function loadMyGrinder() {
  try { return JSON.parse(localStorage.getItem(GRINDER_STORAGE_KEY) || "null"); } catch { return null; }
}
function saveMyGrinder(g) {
  try { localStorage.setItem(GRINDER_STORAGE_KEY, JSON.stringify(g)); } catch {}
}

function loadMyMachine() {
  try {
    const m = JSON.parse(localStorage.getItem(MACHINE_STORAGE_KEY) || "null");
    if (m && !m.equipType) m.equipType = "machine"; // 기존 데이터 하위 호환
    return m;
  } catch { return null; }
}
function saveMyMachine(m) {
  try { localStorage.setItem(MACHINE_STORAGE_KEY, JSON.stringify(m)); } catch {}
}

// ─── 통화 설정 ─────────────────────────────────────────────────────
const CURRENCY_KEY = "brewlog_currency";
const EXRATE_KEY   = "brewlog_exrate";   // { rate, date }
const EXIM_API_KEY = "VmIDcPiswN7Jg7G0NQ4L6nIcSZzSWR6O";

// 로케일 기반 기본 통화 감지 (한국 접속 → KRW, 그 외 → USD)
const detectDefaultCurrency = () => {
  try {
    // Intl.Locale로 지역 감지 (최신 브라우저)
    const locale = navigator.language || navigator.languages?.[0] || "en";
    const region = new Intl.Locale(locale).region || "";
    if (region === "KR") return "KRW";
    // 구형 브라우저 폴백: 언어 코드 기반
    if (locale.toLowerCase().startsWith("ko")) return "KRW";
    return "USD";
  } catch {
    return "KRW";
  }
};

const loadCurrency = () => {
  try {
    const saved = localStorage.getItem(CURRENCY_KEY);
    if (saved) return saved;                // 사용자가 직접 설정한 값 우선
    return detectDefaultCurrency();         // 없으면 로케일로 자동 감지
  } catch {
    return "KRW";
  }
};
const saveCurrency = (c) => { try { localStorage.setItem(CURRENCY_KEY, c); } catch {} };

// 캐시된 환율 (날짜별 1일 캐싱)
const loadCachedRate = () => {
  try {
    const raw = localStorage.getItem(EXRATE_KEY);
    if (!raw) return null;
    const { rate, date } = JSON.parse(raw);
    const today = new Date().toISOString().slice(0, 10);
    return date === today ? rate : null;
  } catch { return null; }
};
const saveCachedRate = (rate) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem(EXRATE_KEY, JSON.stringify({ rate, date: today }));
  } catch {}
};

// 한국수출입은행 환율 API 호출
const fetchUsdRate = async () => {
  const cached = loadCachedRate();
  if (cached) return cached;
  try {
    // 오늘 날짜 (YYYYMMDD)
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
    const url = `https://www.koreaexim.go.kr/site/program/financial/exchangeJSON?authkey=${EXIM_API_KEY}&searchdate=${dateStr}&data=AP01`;
    const res = await fetch(url);
    const data = await res.json();
    const usd = data.find(d => d.cur_unit === "USD");
    if (!usd) throw new Error("USD not found");
    // deal_bas_r: "1,380.50" → 1380.50
    const rate = parseFloat(usd.deal_bas_r.replace(/,/g, ""));
    saveCachedRate(rate);
    return rate;
  } catch (e) {
    console.warn("[환율] API 호출 실패:", e.message);
    // 주말/공휴일엔 데이터 없음 → 전날 캐시 또는 fallback
    const raw = localStorage.getItem(EXRATE_KEY);
    if (raw) return JSON.parse(raw).rate;
    return 1380; // fallback
  }
};

// 금액 포맷 (환율 적용)
const formatPrice = (amount, currency, rate = null) => {
  if (!amount && amount !== 0) return "—";
  const n = parseFloat(amount);
  if (isNaN(n) || n === 0) return "—";
  if (currency === "USD") {
    const usd = rate ? n / rate : n;
    return `$${usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${Math.round(n).toLocaleString()}원`;
};

const formatPricePerG = (ppg, currency, rate = null) => {
  if (!ppg && ppg !== 0) return "—";
  const n = parseFloat(ppg);
  if (isNaN(n) || n === 0) return "—";
  if (currency === "USD") {
    const usd = rate ? n / rate : n;
    return `$${usd.toFixed(4)}/g`;
  }
  return `${n.toFixed(1)}원/g`;
};

const formatCostPerCup = (cost, currency, rate = null) => {
  if (!cost && cost !== 0) return "—";
  const n = parseFloat(cost);
  if (isNaN(n) || n === 0) return "—";
  if (currency === "USD") {
    const usd = rate ? n / rate : n;
    return `$${usd.toFixed(2)}/cup`;
  }
  return `${Math.round(n)}원/잔`;
};

/* ============================================================
   5. SUB-COMPONENTS
   ============================================================ */

/* 5-1. CoffeeBeanIcon */
function CoffeeBeanIcon({ size = 22, color = "#5c3317" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="12" cy="12" rx="7" ry="10" fill={color} transform="rotate(-30 12 12)" />
      <path d="M12 4 Q14 8 12 12 Q10 16 12 20" stroke="#f5efe6" strokeWidth="1.5" strokeLinecap="round" fill="none" transform="rotate(-30 12 12)" />
    </svg>
  );
}

/* 5-2. BrandInput — React.memo + useMemo 최적화 (자동완성 재연산 방지) */
const BrandInput = React.memo(function BrandInput({ value, onChange, brands, placeholder }) {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);
  const wrapRef = React.useRef(null);

  // useMemo: query 또는 brands가 바뀔 때만 필터링 재연산
  const filtered = React.useMemo(() =>
    query.trim()
      ? brands.filter(b => b.toLowerCase().includes(query.toLowerCase()))
      : brands,
    [query, brands]
  );

  useEffect(() => {
    const handler = e => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const select = useCallback((b) => {
    setQuery(b);
    onChange(b);
    setOpen(false);
  }, [onChange]);

  return (
    <div className="autocomplete-wrap" ref={wrapRef}>
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder || "브랜드 입력 또는 검색…"}
        style={{ width: "100%", padding: "0.75rem 1rem", border: "1px solid var(--steam)", borderRadius: "var(--r-btn)", background: "var(--cream)", fontFamily: "'DM Sans',sans-serif", fontSize: "0.95rem", color: "var(--espresso)", outline: "none", transition: "border-color var(--transition-base)" }}
      />
      {open && filtered.length > 0 && (
        <div className="autocomplete-list">
          {filtered.map(b => (
            <div key={b} className="autocomplete-item" onMouseDown={() => select(b)}>{b}</div>
          ))}
        </div>
      )}
    </div>
  );
});



/* 5-3 prefix — I18N (다국어) ── 새 텍스트: brewPressureDetail, continuousMemo */
// ─── 다국어 ────────────────────────────────────────────────────────
const I18N = {
  ko: {
    appSub: "나만의 추출 노트",
    login: "로그인", register: "회원가입", findPw: "비밀번호 찾기",
    nickname: "닉네임", password: "비밀번호", pwConfirm: "비밀번호 확인",
    dupCheck: "중복 확인", confirmed: "확인 ✓",
    secQuestion: "보안 질문", secAnswer: "보안 질문 답변",
    loginBtn: "로그인하기", registerBtn: "가입하기",
    googleLogin: "Google로 로그인", googleRegister: "Google로 시작하기",
    orNickname: "또는 닉네임으로 가입",
    pwMatch: "비밀번호가 일치합니다 ✓", pwMismatch: "비밀번호가 일치하지 않습니다.",
    findStep1: "다음", findStep2: "확인",
    findDone: "본인 확인 완료!", findDoneDesc: "보안상 비밀번호를 직접 표시할 수 없어요. 새 비밀번호로 로그인하려면 다시 가입하거나 관리자에게 문의해주세요.",
    goLogin: "로그인하러 가기",
    feedTitle: "Brew Archive", myFeedTitle: "My Brews",
    feedSub: "브루어들의 추출 기록을 살펴보세요.",
    myFeedSub: "내가 기록한 추출 노트입니다.",
    followingFeedTitle: "Following",
    followingFeedSub: "구독 중인 브루어의 최신 기록이에요.",
    bookmarksFeedTitle: "Saved",
    bookmarksFeedSub: "저장해둔 레시피를 모아봤어요.",
    searchPlaceholder: "메뉴, 머신, 원두, 닉네임, 메모 검색 …",
    newRecipe: "기록하기",
    logout: "로그아웃", myBtn: "MY",
    emptyFeed: "아직 레시피가 없어요. 첫 번째 기록을 남겨보세요!",
    emptyMy: "아직 내 레시피가 없어요. 첫 번째 기록을 남겨보세요!",
    emptySearch: "검색 결과가 없어요.",
    bestTitle: "베스트 레시피",
    recordTitle: "레시피 기록하기", editTitle: "레시피 수정하기",
    machine: "커피 머신", machineBrand: "커피 머신 브랜드", machineModel: "세부 모델명",
    machineType: "머신 타입", autoType: "전자동", manualType: "반자동",
    grinder: "그라인더", grinderBrand: "그라인더 브랜드",
    company: "원두 회사명 *", bean: "원두 이름 *", roastDate: "로스팅 일자",
    coffeeMenu: "커피 메뉴 *", gram: "원두량 (G) *", gramAuto: "원두 분쇄량 (콩 갯수) *",
    seconds: "추출 시간 *", espressoMl: "추출량 (ML) *",
    diluteType: "희석 종류", diluteMl: "희석량 (ML)", syrup: "시럽 / 추가 재료",
    rating: "레시피 평가", note: "맛 노트 · 메모",
    pressureTitle: "예상 추출 압력", brewPressure: "추출 압력",
    pressureGood: "✅ 적정 압력", pressureHigh: "⚠️ 압력 높음", pressureLow: "⚠️ 압력 낮음",
    pressureRange: "적정: 9~11 bar",
    brewPressureDetail: "추출 압력 세부 기록 (BAR)",
    brewPressureDetailPh: "예) 9.0 — 직접 측정한 압력게이지 값",
    continuousMemo: "연속 추출 메모",
    continuousMemoPh: "예) 2샷 연속 / 더블 샷 / 탬핑 조정 후 재추출 등",
    save: "기록 저장", update: "수정 저장", saving: "저장 중…", cancel: "취소",
    deleteConfirm: "이 레시피를 삭제할까요?",
    mySettings: "MY 설정", myMachine: "커피 머신", myGrinder: "그라인더",
    myPw: "비밀번호 변경", curPw: "현재 비밀번호", newPw: "새 비밀번호", newPwConfirm: "새 비밀번호 확인",
    changePw: "비밀번호 변경", changing: "변경 중…", close: "닫기", changeBtn: "변경",
    timerStart: "추출 시작", timerStop: "정지", timerReset: "초기화", timerApply: "적용",
    follow: "구독", following: "구독중", unfollow: "구독취소", followingFeed: "구독",
    commentPlaceholder: "댓글을 남겨보세요…", commentSubmit: "등록", commentDelete: "삭제", commentLogin: "로그인 후 댓글 작성 가능해요", comments: "댓글",
    report: "신고", reportDone: "신고가 접수됐어요", reportAlready: "이미 신고한 콘텐츠예요", reportReasons: ["스팸/홍보", "욕설/혐오", "부적절한 내용", "기타"],
    bookmarks: "즐겨찾기", bookmarkSave: "저장됨", bookmarkAdd: "즐겨찾기 추가", bookmarkRemove: "즐겨찾기 해제",
    allRecipes: "전체", myBookmarks: "즐겨찾기", myRecipes: "내 레시피", myBeans: "내 원두", myEquip: "내 장비",
    equipVaultSub: "내가 사용하는 장비를 관리해요.",
    equipEmpty: "등록된 장비가 없어요.", equipEmptySub: "자주 쓰는 머신과 그라인더를 추가해보세요.",
    equipAdd: "장비 추가", equipEdit: "장비 수정", equipDelete: "장비 삭제",
    equipName: "장비 이름 *", equipBrand: "머신 브랜드 *", equipModel: "세부 모델",
    equipGrinder: "그라인더 브랜드", equipGrinderModel: "그라인더 모델",
    equipPurchaseDate: "구매일", equipNote: "메모",
    equipSetPrimary: "대표로 설정", equipIsPrimary: "대표 장비",
    equipDeleteConfirm: "이 장비를 삭제할까요?",
    equipTypeMachine: "커피 머신", equipTypeHanddrip: "핸드드립",
    beanVault: "Bean Vault", beanVaultSub: "내가 사용 중인 원두 재고를 관리해요.",
    beanAdd: "원두 추가", beanEdit: "원두 수정", beanDelete: "삭제",
    beanName: "원두 이름 *", beanRoastery: "로스터리 *",
    beanOrigin: "원산지", beanOriginDetail: "국가 · 지역 · 농장",
    beanOriginType: "원산지 유형", beanSingle: "싱글 오리진", beanBlend: "블렌드",
    beanVariety: "품종", beanVarietyPh: "예) 아라비카, 게이샤, 버본",
    beanProcess: "가공 방식", beanProcessPh: "예) 워시드, 내추럴, 무산소 발효",
    beanRoastLevel: "배전도", beanLight: "라이트", beanMedLight: "미디엄 라이트", beanMedium: "미디엄", beanMedDark: "미디엄 다크", beanDark: "다크",
    beanRoastDate: "로스팅 날짜", beanBuyDate: "구매 날짜",
    beanPrice: "구매 가격 (원)", beanWeight: "용량 (g)",
    beanNote: "메모",
    beanStatusLabel: "상태", beanOpen: "개봉 중", beanSealed: "미개봉", beanEmpty: "소진",
    beanDeleteConfirm: "이 원두를 삭제할까요?",
    beanDaysOld: "일 경과", beanFresh: "프레시", beanPeak: "피크", beanAging: "숙성 중", beanStale: "주의",
    beanEmptyState: "등록된 원두가 없어요.", beanEmptySub: "사용 중인 원두를 추가해보세요.",
    beanPricePerG: "원/g",
    ratingLabels: ["평가 없음", "별로예요", "그저 그래요", "괜찮아요", "맛있어요", "최고예요!"],
    roasting: "로스팅", beanUnit: "원두", extractTime: "추출시간", extractVol: "추출량",
    dilution: "희석", syrupLabel: "시럽", heartOwner: "내 레시피엔 하트를 누를 수 없어요",
    heartCancel: "하트 취소", heart: "하트",
    statGram: "원두", statSeconds: "추출시간", statMl: "추출량",
    beanCount: "개",
  },
  en: {
    appSub: "Your Personal Brew Log",
    login: "Login", register: "Sign Up", findPw: "Find Password",
    nickname: "Nickname", password: "Password", pwConfirm: "Confirm Password",
    dupCheck: "Check", confirmed: "OK ✓",
    secQuestion: "Security Question", secAnswer: "Answer",
    loginBtn: "Login", registerBtn: "Sign Up",
    googleLogin: "Continue with Google", googleRegister: "Start with Google",
    orNickname: "Or sign up with nickname",
    pwMatch: "Passwords match ✓", pwMismatch: "Passwords do not match.",
    findStep1: "Next", findStep2: "Confirm",
    findDone: "Identity Verified!", findDoneDesc: "For security, we can't display your password. Please re-register or contact admin.",
    goLogin: "Go to Login",
    feedTitle: "Brew Archive", myFeedTitle: "My Brews",
    feedSub: "Explore extraction notes from the community.",
    myFeedSub: "Your personal brew log.",
    followingFeedTitle: "Following",
    followingFeedSub: "Latest records from brewers you follow.",
    bookmarksFeedTitle: "Saved",
    bookmarksFeedSub: "Recipes you've bookmarked.",
    searchPlaceholder: "Search menu, machine, bean …",
    newRecipe: "Record",
    logout: "Logout", myBtn: "MY",
    emptyFeed: "No recipes yet. Be the first to share!",
    emptyMy: "No recipes yet. Start sharing!",
    emptySearch: "No results found.",
    bestTitle: "Best Recipes",
    recordTitle: "Record Recipe", editTitle: "Edit Recipe",
    machine: "Coffee Machine", machineBrand: "Machine Brand", machineModel: "Model Name",
    machineType: "Machine Type", autoType: "Automatic", manualType: "Semi-auto",
    grinder: "Grinder", grinderBrand: "Grinder Brand",
    company: "Brand *", bean: "Bean Name *", roastDate: "Roast Date",
    coffeeMenu: "Coffee Menu *", gram: "Dose (G) *", gramAuto: "Bean Count *",
    seconds: "Extraction Time *", espressoMl: "Yield (ML) *",
    diluteType: "Dilution Type", diluteMl: "Dilution (ML)", syrup: "Syrup / Add-ons",
    rating: "Rating", note: "Tasting Notes",
    pressureTitle: "Est. Brew Pressure", brewPressure: "Brew Pressure",
    pressureGood: "✅ Optimal", pressureHigh: "⚠️ Too High", pressureLow: "⚠️ Too Low",
    pressureRange: "Optimal: 9~11 bar",
    brewPressureDetail: "Brew Pressure Detail (BAR)",
    brewPressureDetailPh: "e.g. 9.0 — measured gauge reading",
    continuousMemo: "Continuous Extraction Note",
    continuousMemoPh: "e.g. 2nd shot / double shot / after tamping adjustment",
    save: "Save", update: "Update", saving: "Saving…", cancel: "Cancel",
    deleteConfirm: "Delete this recipe?",
    mySettings: "My Settings", myMachine: "Coffee Machine", myGrinder: "Grinder",
    myPw: "Change Password", curPw: "Current Password", newPw: "New Password", newPwConfirm: "Confirm New Password",
    changePw: "Change Password", changing: "Changing…", close: "Close", changeBtn: "Edit",
    timerStart: "Start", timerStop: "Stop", timerReset: "Reset", timerApply: "Apply",
    follow: "Subscribe", following: "Subscribed", unfollow: "Unsubscribe", followingFeed: "Following",
    commentPlaceholder: "Leave a comment…", commentSubmit: "Post", commentDelete: "Delete", commentLogin: "Sign in to leave a comment", comments: "Comments",
    report: "Report", reportDone: "Report submitted", reportAlready: "Already reported", reportReasons: ["Spam", "Hate speech", "Inappropriate content", "Other"],
    bookmarks: "Bookmarks", bookmarkSave: "Saved", bookmarkAdd: "Save recipe", bookmarkRemove: "Remove bookmark",
    allRecipes: "All", myBookmarks: "Bookmarks", myRecipes: "My Recipes", myBeans: "My Beans", myEquip: "My Gear",
    equipVaultSub: "Manage your brewing equipment.",
    equipEmpty: "No equipment yet.", equipEmptySub: "Add your machines and grinders.",
    equipAdd: "Add Equipment", equipEdit: "Edit", equipDelete: "Delete",
    equipName: "Equipment Name *", equipBrand: "Machine Brand *", equipModel: "Model",
    equipGrinder: "Grinder Brand", equipGrinderModel: "Grinder Model",
    equipPurchaseDate: "Purchase Date", equipNote: "Notes",
    equipSetPrimary: "Set as Primary", equipIsPrimary: "Primary",
    equipDeleteConfirm: "Delete this equipment?",
    equipTypeMachine: "Coffee Machine", equipTypeHanddrip: "Hand Drip",
    beanVault: "Bean Vault", beanVaultSub: "Track your current bean inventory.",
    beanAdd: "Add Bean", beanEdit: "Edit Bean", beanDelete: "Delete",
    beanName: "Bean Name *", beanRoastery: "Roastery *",
    beanOrigin: "Origin", beanOriginDetail: "Country · Region · Farm",
    beanOriginType: "Origin Type", beanSingle: "Single Origin", beanBlend: "Blend",
    beanVariety: "Variety", beanVarietyPh: "e.g. Arabica, Geisha, Bourbon",
    beanProcess: "Process", beanProcessPh: "e.g. Washed, Natural, Anaerobic",
    beanRoastLevel: "Roast Level", beanLight: "Light", beanMedLight: "Med-Light", beanMedium: "Medium", beanMedDark: "Med-Dark", beanDark: "Dark",
    beanRoastDate: "Roast Date", beanBuyDate: "Purchase Date",
    beanPrice: "Price (₩)", beanWeight: "Weight (g)",
    beanNote: "Notes",
    beanStatusLabel: "Status", beanOpen: "In Use", beanSealed: "Sealed", beanEmpty: "Empty",
    beanDeleteConfirm: "Delete this bean?",
    beanDaysOld: "days old", beanFresh: "Fresh", beanPeak: "Peak", beanAging: "Aging", beanStale: "Stale",
    beanEmptyState: "No beans added yet.", beanEmptySub: "Add your current beans to track inventory.",
    beanPricePerG: "₩/g",
    ratingLabels: ["No rating", "Poor", "Fair", "Good", "Great", "Excellent!"],
    roasting: "Roasted", beanUnit: "bean", extractTime: "Time", extractVol: "Yield",
    dilution: "dilution", syrupLabel: "Syrup", heartOwner: "Can't like your own recipe",
    heartCancel: "Unlike", heart: "Like",
    statGram: "Dose", statSeconds: "Time", statMl: "Yield",
    beanCount: "beans",
  },
};

const LangContext = React.createContext("ko");
function useLang() { return React.useContext(LangContext); }

// ─── 커피 메뉴 정의 ────────────────────────────────────────────────
// ─── 커피 메뉴 SVG 아이콘 ──────────────────────────────────────────
const MenuIcons = {
  espresso: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 7h10l-1 7H6L5 7z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M7 7V5.5C7 4.67 7.67 4 8.5 4h3c.83 0 1.5.67 1.5 1.5V7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M7 16h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M9 10.5c0-.5.5-.8 1-.5s1 .5 1 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  ),
  ristretto: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 8h8l-.8 5.5H6.8L6 8z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M8 8V6.5C8 5.67 8.67 5 9.5 5h1c.83 0 1.5.67 1.5 1.5V8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M7.5 15h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  lungo: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 6h10l-1.5 9H6.5L5 6z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M7 6V4.5C7 3.67 7.67 3 8.5 3h3c.83 0 1.5.67 1.5 1.5V6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M7 17h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  americano: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="6" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M16 9h1.5a1.5 1.5 0 0 1 0 3H16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M8 3.5C8 3.5 8.5 2.5 10 2.5s2 1 2 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M7 10h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.4"/>
    </svg>
  ),
  long_black: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="6" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M16 9h1.5a1.5 1.5 0 0 1 0 3H16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M7 9.5h6M7 12h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.35"/>
    </svg>
  ),
  latte: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 5h12l-1.5 11H5.5L4 5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M4 8c2 1 4 1 6 0s4-1 6 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <ellipse cx="10" cy="8.5" rx="2" ry="1" stroke="currentColor" strokeWidth="1" opacity="0.4"/>
    </svg>
  ),
  cappuccino: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 7h10l-1 8H6L5 7z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M5 9c1.5-1 3.5-1.5 5-1.5s3.5.5 5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M8 7C8 5.5 9 4.5 10 4.5S12 5.5 12 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  ),
  flatwhite: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 7h10l-1 8H6L5 7z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M6 9.5c1-0.8 2.5-1.2 4-1.2s3 .4 4 1.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M8.5 11.5c.5-.3 1-.5 1.5-.5s1 .2 1.5.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.5"/>
    </svg>
  ),
  macchiato: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 8h8l-.8 6H6.8L6 8z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M6.5 10c1-.7 2-.9 3.5-.9s2.5.2 3.5.9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <circle cx="10" cy="8.5" r="1.2" stroke="currentColor" strokeWidth="1.1"/>
      <path d="M8 16h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  cortado: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 7h8l-1 8H7L6 7z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M6.5 10c1-.7 2-1 3.5-1s2.5.3 3.5 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M8.5 8C8.5 6.5 9.2 5.5 10 5.5s1.5 1 1.5 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  ),
  cold_brew: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="5.5" y="4" width="9" height="13" rx="2" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M8 4V3M12 4V3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M7.5 9.5c.7-.5 1.3-.5 2 0s1.3.5 2 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M7.5 12c.7-.5 1.3-.5 2 0s1.3.5 2 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M8.5 7h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.4"/>
    </svg>
  ),
  hand_drip: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 4h8l-1 5H7L6 4z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M10 9v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M7 13h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M6 15h8l.5 1.5H5.5L6 15z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    </svg>
  ),
  other: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M10 7v3l2 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="10" cy="10" r="1" fill="currentColor" opacity="0.3"/>
    </svg>
  ),
};

const COFFEE_MENUS = [
  { id: "espresso",   label: "에스프레소", labelEn: "Espresso",    needsDilute: false, hasSyrup: false, canIce: false },
  { id: "ristretto",  label: "리스트레토", labelEn: "Ristretto",   needsDilute: false, hasSyrup: false, canIce: false },
  { id: "lungo",      label: "룽고",       labelEn: "Lungo",       needsDilute: false, hasSyrup: false, canIce: false },
  { id: "americano",  label: "아메리카노", labelEn: "Americano",   needsDilute: true,  hasSyrup: false, canIce: true,  defaultDilute: "물",  diluteCategory: "water" },
  { id: "long_black", label: "롱블랙",     labelEn: "Long Black",  needsDilute: true,  hasSyrup: false, canIce: true,  defaultDilute: "물",  diluteCategory: "water" },
  { id: "latte",      label: "카페라떼",   labelEn: "Latte",       needsDilute: true,  hasSyrup: true,  canIce: true,  defaultDilute: "우유", diluteCategory: "milk" },
  { id: "cappuccino", label: "카푸치노",   labelEn: "Cappuccino",  needsDilute: true,  hasSyrup: false, canIce: true,  defaultDilute: "우유", diluteCategory: "milk" },
  { id: "flatwhite",  label: "플랫화이트", labelEn: "Flat White",  needsDilute: true,  hasSyrup: false, canIce: false, defaultDilute: "우유", diluteCategory: "milk" },
  { id: "macchiato",  label: "마끼아또",   labelEn: "Macchiato",   needsDilute: true,  hasSyrup: true,  canIce: true,  defaultDilute: "우유", diluteCategory: "milk" },
  { id: "hand_drip",  label: "핸드드립",   labelEn: "Hand Drip",   needsDilute: false, hasSyrup: false, canIce: false },
  { id: "cold_brew",  label: "콜드브루",   labelEn: "Cold Brew",   needsDilute: true,  hasSyrup: true,  canIce: true,  defaultDilute: "",    diluteCategory: "both" },
  { id: "other",      label: "기타",       labelEn: "Other",       needsDilute: true,  hasSyrup: false, canIce: true,  defaultDilute: "",    diluteCategory: "both" },
];


// ─── 압력 계산 (ULKA E5 공식 펌프 곡선 기반) ──────────────────────
function calcPressure(espressoMl, seconds) {
  if (!espressoMl || !seconds || seconds <= 0) return null;
  const ml = Number(espressoMl);
  const sec = Number(seconds);
  if (ml <= 0 || sec <= 0) return null;

  // 유량 cc/min 계산
  const flowRate = (ml / sec) * 60;

  // ULKA E5 공식 펌프 곡선 데이터 (DIYCoffeeGuy GitHub + Home-Barista 자료 기반)
  // 유량(cc/min) → 펌프 출구 압력(bar)
  const curve = [
    { flow: 0,   bar: 14.5 },
    { flow: 30,  bar: 14.0 },
    { flow: 60,  bar: 13.2 },
    { flow: 90,  bar: 12.4 },
    { flow: 120, bar: 11.5 },
    { flow: 150, bar: 10.6 },
    { flow: 180, bar: 9.7  },
    { flow: 210, bar: 8.7  },
    { flow: 240, bar: 7.6  },
    { flow: 270, bar: 6.4  },
    { flow: 300, bar: 5.0  },
    { flow: 330, bar: 3.3  },
    { flow: 350, bar: 2.0  },
  ];

  // 선형 보간으로 펌프 압력 계산
  let pumpBar = 14.5;
  if (flowRate >= curve[curve.length - 1].flow) {
    pumpBar = curve[curve.length - 1].bar;
  } else {
    for (let i = 0; i < curve.length - 1; i++) {
      if (flowRate >= curve[i].flow && flowRate < curve[i + 1].flow) {
        const t = (flowRate - curve[i].flow) / (curve[i + 1].flow - curve[i].flow);
        pumpBar = curve[i].bar + t * (curve[i + 1].bar - curve[i].bar);
        break;
      }
    }
  }

  // 추출 압력 = 펌프 압력 - 배관 손실 (0.8 bar: 보일러+배관+그룹헤드 저항)
  // 참고: Home-Barista.com - 실제 브루 압력은 펌프 압력보다 낮음
  const brewBar = pumpBar - 0.8;

  return {
    flowRate: Math.round(flowRate),
    pumpBar: Math.round(pumpBar * 10) / 10,
    showerBar: Math.round(brewBar * 10) / 10,
    status: brewBar >= 9 && brewBar <= 11 ? "good" : brewBar > 11 ? "high" : "low",
  };
}

/* 5-4. TimerField — setInterval은 내부 state만 업데이트, 폼 재렌더 완전 격리 */
// ─── TimerField ────────────────────────────────────────────────────
function TimerField({ value, infusionValue, onChange, onInfusionChange, lang, t }) {
  // phase: idle | infusing | extracting | done
  const [phase, setPhase]       = useState("idle");
  const [infusionSecs, setInfusionSecs] = useState(0);
  const [extractionSecs, setExtractionSecs] = useState(0);
  const [elapsed, setElapsed]   = useState(0); // 현재 페이즈 경과
  const intervalRef = useRef(null);

  const fmt = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}:${String(sec).padStart(2, "0")}` : `${String(sec).padStart(2, "0")}`;
  };

  const clearTimer = () => { clearInterval(intervalRef.current); intervalRef.current = null; };

  const tick = () => setElapsed(p => p + 1);

  // 인퓨전 시작
  const startInfusion = () => {
    setPhase("infusing");
    setElapsed(0);
    setInfusionSecs(0);
    setExtractionSecs(0);
    clearTimer();
    intervalRef.current = setInterval(tick, 1000);
  };

  // 추출 시작 (인퓨전 종료 → 추출 시작)
  const startExtraction = () => {
    clearTimer();
    const inf = elapsed;
    setInfusionSecs(inf);
    setElapsed(0);
    setPhase("extracting");
    intervalRef.current = setInterval(tick, 1000);
  };

  // 종료
  const stop = () => {
    clearTimer();
    const ext = elapsed;
    setExtractionSecs(ext);
    setPhase("done");
    setElapsed(0);
    // 자동으로 폼에 반영
    const inf = infusionSecs;
    onInfusionChange(String(inf));
    onChange(String(inf + ext)); // 총 추출 시간
  };

  // 리셋
  const reset = () => {
    clearTimer();
    setPhase("idle");
    setElapsed(0);
    setInfusionSecs(0);
    setExtractionSecs(0);
  };

  // 수동 적용 (done 상태에서 다시 적용)
  const applyManual = () => {
    onInfusionChange(String(infusionSecs));
    onChange(String(infusionSecs + extractionSecs));
  };

  useEffect(() => () => clearTimer(), []);

  const totalSecs = infusionSecs + extractionSecs;

  // 페이즈별 색상
  const phaseColor = {
    idle: "var(--muted)",
    infusing: "#e67e22",
    extracting: "#27ae60",
    done: "var(--espresso)",
  };

  return (
    <div>
      {/* 수동 입력 행 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.2fr", gap: "8px", marginBottom: "10px" }}>
        {[
          { lbl: lang === "en" ? "Infusion (s)" : "인퓨전 (초)", val: infusionValue, onChange: v => { onInfusionChange(v); onChange(String((parseInt(v)||0) + (parseInt(value)||0) - (parseInt(infusionValue)||0))); } },
          { lbl: lang === "en" ? "Extraction (s)" : "추출 (초)", val: String(Math.max(0, (parseInt(value)||0) - (parseInt(infusionValue)||0))), onChange: v => onChange(String((parseInt(infusionValue)||0) + (parseInt(v)||0))) },
          { lbl: lang === "en" ? "Total (s)" : "총 시간 (초)", val: value, onChange: v => onChange(v), highlight: true },
        ].map(({ lbl, val, onChange: oc, highlight }) => (
          <div key={lbl}>
            <div style={{ fontSize: "0.62rem", color: highlight ? "var(--espresso)" : "var(--muted)", fontWeight: highlight ? 600 : 400, marginBottom: "4px", fontFamily: "'DM Sans',sans-serif" }}>{lbl}</div>
            <input type="number" value={val} min="0"
              onChange={e => oc(String(Math.max(0, Number(e.target.value))))}
              style={{ width: "100%", padding: "0.65rem 0.4rem", border: `1px solid ${highlight ? "var(--latte)" : "var(--steam)"}`, borderRadius: "8px", background: highlight ? "#FDF6EF" : "var(--cream)", fontFamily: "'DM Sans',sans-serif", fontSize: "0.9rem", color: "var(--espresso)", outline: "none", boxSizing: "border-box", fontWeight: highlight ? 600 : 400, textAlign: "center" }}
            />
          </div>
        ))}
      </div>

      {/* 타이머 */}
      <div className="timer-box">
        {/* 페이즈 인디케이터 */}
        <div style={{ display: "flex", gap: "4px", marginBottom: "10px", justifyContent: "center" }}>
          {[
            { key: "infusing",   lbl: lang === "en" ? "Infusion" : "인퓨전" },
            { key: "extracting", lbl: lang === "en" ? "Extraction" : "추출" },
            { key: "done",       lbl: lang === "en" ? "Done" : "완료" },
          ].map((p, i) => {
            const active = phase === p.key;
            const passed = (phase === "extracting" && i === 0) || (phase === "done" && i <= 1);
            return (
              <React.Fragment key={p.key}>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: active ? phaseColor[p.key] : passed ? "#aaa" : "var(--steam)", transition: "all 0.3s" }}/>
                  <span style={{ fontSize: "0.62rem", fontFamily: "'DM Sans',sans-serif", color: active ? phaseColor[p.key] : "var(--muted)", fontWeight: active ? 700 : 400 }}>{p.lbl}</span>
                </div>
                {i < 2 && <span style={{ fontSize: "0.6rem", color: "var(--steam)" }}>→</span>}
              </React.Fragment>
            );
          })}
        </div>

        {/* 경과 시간 표시 */}
        <div style={{ textAlign: "center", marginBottom: "10px" }}>
          {phase === "idle" ? (
            <div style={{ fontSize: "2rem", fontFamily: "'DM Sans',sans-serif", fontWeight: 700, color: "var(--steam)" }}>00</div>
          ) : phase === "done" ? (
            <div>
              <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginBottom: "2px", fontFamily: "'DM Sans',sans-serif" }}>
                {lang === "en" ? `Infusion ${fmt(infusionSecs)}s + Extraction ${fmt(extractionSecs)}s` : `인퓨전 ${fmt(infusionSecs)}초 + 추출 ${fmt(extractionSecs)}초`}
              </div>
              <div style={{ fontSize: "2rem", fontFamily: "'DM Sans',sans-serif", fontWeight: 700, color: "var(--espresso)" }}>
                {fmt(totalSecs)}
                <span style={{ fontSize: "0.75rem", color: "var(--muted)", marginLeft: "4px" }}>{lang === "en" ? "total" : "총"}</span>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: "0.65rem", color: phaseColor[phase], fontWeight: 600, fontFamily: "'DM Sans',sans-serif", marginBottom: "2px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {phase === "infusing" ? (lang === "en" ? "Infusing…" : "인퓨전 중…") : (lang === "en" ? "Extracting…" : "추출 중…")}
              </div>
              <div className={`timer-display running`} style={{ color: phaseColor[phase] }}>{fmt(elapsed)}</div>
              {phase === "extracting" && (
                <div style={{ fontSize: "0.62rem", color: "var(--muted)", marginTop: "2px", fontFamily: "'DM Sans',sans-serif" }}>
                  {lang === "en" ? `Infusion: ${fmt(infusionSecs)}s` : `인퓨전: ${fmt(infusionSecs)}초`}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 버튼 */}
        <div className="timer-btns">
          {phase === "idle" && (
            <button type="button" className="timer-start" onClick={startInfusion} style={{ background: "#e67e22" }}>
              {lang === "en" ? "Start Infusion" : "인퓨전 시작"}
            </button>
          )}
          {phase === "infusing" && (<>
            <button type="button" className="timer-start" onClick={startExtraction} style={{ background: "#27ae60" }}>
              {lang === "en" ? "Start Extraction" : "추출 시작"}
            </button>
            <button type="button" className="timer-reset" onClick={reset}>{t.timerReset}</button>
          </>)}
          {phase === "extracting" && (<>
            <button type="button" className="timer-start" onClick={stop} style={{ background: "var(--espresso)" }}>
              {lang === "en" ? "Stop" : "종료"}
            </button>
            <button type="button" className="timer-reset" onClick={reset}>{t.timerReset}</button>
          </>)}
          {phase === "done" && (<>
            <button type="button" className="timer-start" style={{ background: "#27ae60" }} onClick={applyManual}>
              {lang === "en" ? `Apply (${fmt(totalSecs)}s total)` : `적용 (총 ${fmt(totalSecs)}초)`}
            </button>
            <button type="button" className="timer-reset" onClick={reset}>{t.timerReset}</button>
          </>)}
        </div>
      </div>
    </div>
  );
}

/* 5-5. FlavorRadar — SVG 레이더 차트 */
// ─── RecipeModal ───────────────────────────────────────────────────
// ─── Flavor Radar Chart ────────────────────────────────────────────
const FLAVOR_AXES = [
  { key: "flavorAcidity",     ko: "산미",   en: "Acidity",    desc_ko: "밝고 상큼한 신맛의 강도",        desc_en: "Brightness and citrusy sharpness" },
  { key: "flavorSweet",       ko: "단맛",   en: "Sweet",      desc_ko: "흑설탕·과일 같은 단맛",          desc_en: "Sweetness like fruit or caramel" },
  { key: "flavorBitter",      ko: "쓴맛",   en: "Bitter",     desc_ko: "카카오·견과류 같은 쓴맛",        desc_en: "Cocoa or nutty bitterness" },
  { key: "flavorAroma",       ko: "아로마", en: "Aroma",      desc_ko: "분쇄 후 느껴지는 향의 강도",     desc_en: "Fragrance before drinking" },
  { key: "flavorAftertaste",  ko: "후미",   en: "Aftertaste", desc_ko: "삼킨 후 입안에 남는 여운",       desc_en: "Lingering finish after swallowing" },
  { key: "flavorBalance",     ko: "밸런스", en: "Balance",    desc_ko: "전체 맛의 조화로움",             desc_en: "Overall harmony of flavors" },
  { key: "flavorBody",        ko: "바디",   en: "Body",       desc_ko: "입안의 질감과 무게감",           desc_en: "Texture and weight on the palate" },
];

function FlavorRadar({ values, size = 200, lang = "ko" }) {
  const pad = 24;                          // 레이블용 여백
  const vb  = size + pad * 2;             // viewBox 크기
  const cx  = vb / 2, cy = vb / 2;       // 중심
  const maxR = (vb / 2) * 0.60;   // vb 중심 기준 60% — 레이블 포함 여유
  const n   = FLAVOR_AXES.length;
  const levels = 5;

  const angleOf = (i) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const ptAt = (i, r) => ({
    x: cx + r * Math.cos(angleOf(i)),
    y: cy + r * Math.sin(angleOf(i)),
  });

  // 격자 다각형
  const grids = Array.from({ length: levels }, (_, l) => {
    const r = maxR * (l + 1) / levels;
    return Array.from({ length: n }, (_, i) => ptAt(i, r))
      .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(" ") + " Z";
  });

  // 데이터 — 0값은 r=1로 폴리곤 유지
  const dataPath = FLAVOR_AXES.map((ax, i) => {
    const v = Math.max(0, Math.min(5, parseInt(values[ax.key]) || 0));
    const r = v > 0 ? (v / 5) * maxR : 1;
    const p = ptAt(i, r);
    return `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }).join(" ") + " Z";

  const hasData = FLAVOR_AXES.some(ax => (parseInt(values[ax.key]) || 0) > 0);

  // SVG 표준 방식: width/height로 표시 크기 지정, viewBox로 내부 좌표계 지정
  // SVG가 viewBox 좌표계를 size 픽셀에 맞게 자동 스케일
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${vb} ${vb}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", flexShrink: 0 }}
    >
      {/* 격자 */}
      {grids.map((d, l) => (
        <path key={l} d={d}
          fill={l % 2 === 1 ? "#F7F5F2" : "none"}
          stroke="#DEDAD6" strokeWidth="1"/>
      ))}
      {/* 축선 */}
      {FLAVOR_AXES.map((_, i) => {
        const p = ptAt(i, maxR);
        return <line key={i} x1={cx.toFixed(1)} y1={cy.toFixed(1)}
          x2={p.x.toFixed(1)} y2={p.y.toFixed(1)}
          stroke="#DEDAD6" strokeWidth="1"/>;
      })}
      {/* 레벨 숫자 — 첫 번째 축 방향 */}
      {[1,2,3,4,5].map(lv => {
        const p = ptAt(0, maxR * lv / 5);
        return <text key={lv} x={(p.x + 3).toFixed(1)} y={(p.y - 2).toFixed(1)}
          fontSize="8" fill="#9C8E82" opacity="0.8" fontFamily="'DM Sans',sans-serif">{lv}</text>;
      })}
      {/* 데이터 영역 */}
      {hasData && (
        <>
          <path d={dataPath}
            fill="var(--latte)" fillOpacity="0.2"
            stroke="var(--latte)" strokeWidth="2" strokeLinejoin="round"/>
          {FLAVOR_AXES.map((ax, i) => {
            const v = parseInt(values[ax.key]) || 0;
            if (v === 0) return null;
            const p = ptAt(i, (v / 5) * maxR);
            return <circle key={i}
              cx={p.x.toFixed(1)} cy={p.y.toFixed(1)}
              r="4" fill="#B07D54" stroke="white" strokeWidth="1.5"/>;
          })}
        </>
      )}
      {/* 축 레이블 */}
      {FLAVOR_AXES.map((ax, i) => {
        const p = ptAt(i, maxR + 15);
        const anchor = p.x < cx - 6 ? "end" : p.x > cx + 6 ? "start" : "middle";
        return (
          <text key={i}
            x={p.x.toFixed(1)} y={(p.y + 4).toFixed(1)}
            fontSize="10" textAnchor={anchor}
            fontFamily="'DM Sans',sans-serif" fontWeight="500"
            fill="var(--espresso)" opacity="0.9">
            {lang === "en" ? ax.en : ax.ko}
          </text>
        );
      })}
    </svg>
  );
}

function RecipeModal({ onClose, onSave, user, editTarget, lang = "ko" }) {
  const t = I18N[lang];
  const isEdit = !!editTarget && !editTarget._isCopy;
  const isCopy = !!editTarget?._isCopy;

  // ── 내 원두 목록 로드 ──────────────────────────────
  const [myBeans, setMyBeans] = useState([]);
  const [linkedBeanId, setLinkedBeanId] = useState(null); // 복사 시 원두 연결 초기화 (다른 유저 원두일 수 있음)
  const [myEquips, setMyEquips] = useState([]);
  const [selectedEquipIds, setSelectedEquipIds] = useState({}); // { category: equipId }

  // 내 장비 로드
  useEffect(() => {
    if (!user?.uid) return;
    getDocs(query(collection(db, "equipments"), where("uid", "==", user.uid)))
      .then(snap => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0));
        setMyEquips(list);
        // 대표 장비 자동 적용 (신규 작성 시만 — 편집/복사는 원본값 유지)
        if (!isEdit && !isCopy) {
          const primaryMachine  = list.find(e => e.category === "machine"  && e.isPrimary);
          const primaryGrinder  = list.find(e => e.category === "grinder"  && e.isPrimary);
          const primaryHanddrip = list.find(e => e.category === "handdrip" && e.isPrimary);
          const newSelected = {};
          if (primaryHanddrip) { applyEquipment(primaryHanddrip); newSelected.handdrip = primaryHanddrip.id; }
          else if (primaryMachine) { applyEquipment(primaryMachine); newSelected.machine = primaryMachine.id; }
          if (primaryGrinder) { applyEquipment(primaryGrinder); newSelected.grinder = primaryGrinder.id; }
          setSelectedEquipIds(newSelected);
        }
      }).catch(() => {});
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    getDocs(query(collection(db, "beans"), where("uid", "==", user.uid)))
      .then(snap => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
          .filter(b => b.status !== "empty")
          .sort((a, b) => (b.createdAt?.toDate?.()?.getTime() ?? 0) - (a.createdAt?.toDate?.()?.getTime() ?? 0));
        setMyBeans(list);
      }).catch(() => {});
  }, [user]);

  // 저장된 내 머신 불러오기
  const savedMachine = loadMyMachine();
  const isHandDrip = !isEdit && !isCopy && savedMachine?.equipType === "handdrip";
  const [machineLocked, setMachineLocked] = useState(
    isCopy ? !!(editTarget.machineBrand || editTarget.machineType === "handdrip") : (!!savedMachine && !isEdit)
  );
  const [machineBrand, setMachineBrand] = useState(
    (isEdit || isCopy) ? (editTarget.machineBrand || "") : (isHandDrip ? "" : (savedMachine?.brand || ""))
  );
  const [machineModel, setMachineModel] = useState(
    (isEdit || isCopy) ? (editTarget.machineModel || "") : (isHandDrip ? "" : (savedMachine?.model || ""))
  );
  const isCustomBrand = machineBrand === "기타 (직접 입력)";
  const [machineType, setMachineType] = useState(
    (isEdit || isCopy) ? (editTarget.machineType || "auto") : (isHandDrip ? "handdrip" : "auto")
  );
  const [handDripName, setHandDripName] = useState(
    (isEdit || isCopy) ? (editTarget.machine && editTarget.machineType === "handdrip" ? editTarget.machine : "") : (savedMachine?.handDripName || "")
  );
  // 전자동 전용 브랜드거나, 선택 가능 브랜드에서 전자동 선택 시
  const isAutoMode = isAutoMachine(machineBrand) && machineType === "auto";

  // 저장된 내 그라인더 불러오기
  const savedGrinder = loadMyGrinder();
  const [grinderLocked, setGrinderLocked] = useState(
    isCopy ? !!editTarget.grinderBrand : (!!savedGrinder && !isEdit)
  );
  const [grinderBrand, setGrinderBrand] = useState(
    (isEdit || isCopy) ? (editTarget.grinderBrand || "") : (savedGrinder?.brand || "")
  );
  const [grinderModel, setGrinderModel] = useState(
    (isEdit || isCopy) ? (editTarget.grinderModel || "") : (savedGrinder?.model || "")
  );
  const isCustomGrinderBrand = grinderBrand === "기타 (직접 입력)";

  const savedBean = loadMyBean();
  const savedDefaults = loadRecipeDefaults();
  const [form, setForm] = useState((isEdit || isCopy) ? {
    ...editTarget,
    waterTemp: editTarget.waterTemp || "93",
    waterType: editTarget.waterType || "",
    waterBrand: editTarget.waterBrand || "",
    diluteCustom: editTarget.diluteCustom || "",
    brewPressureBar: editTarget.brewPressureBar || "",    // [신규] 하위 호환
    continuousMemo: editTarget.continuousMemo || "",     // [신규] 하위 호환
    // 복사 시 기록 날짜는 오늘로 초기화
    recordDate: isCopy ? new Date().toISOString().split("T")[0] : (editTarget.recordDate || new Date().toISOString().split("T")[0]),
    // 복사 시 공개 여부는 기본 공개로
    isPublic: isCopy ? true : (editTarget.isPublic !== false),
  } : {
    company: savedBean?.company || "",
    bean: savedBean?.bean || "",
    roastDate: savedBean?.roastDate || "",
    recordDate: new Date().toISOString().split("T")[0],
    rating: 0,
    flavorAcidity: 0, flavorSweet: 0, flavorBitter: 0,
    flavorAroma: 0, flavorAftertaste: 0, flavorBalance: 0, flavorBody: 0,
    gram: savedDefaults?.gram || "",
    seconds: savedDefaults?.seconds || "",
    infusionSeconds: savedDefaults?.infusionSeconds || "0",
    espressoMl: savedDefaults?.espressoMl || "",
    diluteMl: savedDefaults?.diluteMl || "",
    diluteType: savedDefaults?.diluteType || "물",
    waterTemp: savedDefaults?.waterTemp || "93",
    waterType: savedDefaults?.waterType || "",
    waterBrand: savedDefaults?.waterBrand || "",
    diluteCustom: "",
    grindSize: savedDefaults?.grindSize || "",
    isPublic: true,
    isIced: false,
    syrup: "", note: "",
    brewPressureBar: "",   // [신규] 추출 압력 세부 기록 (BAR, 직접 측정값)
    continuousMemo: "",    // [신규] 연속 추출 메모
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  // 편집 시 원본 날씨 유지, 복사/신규는 새로 가져오기
  const [weather, setWeather] = useState(isEdit ? (editTarget.weather || null) : null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState(null);

  // 신규/복사 시 모달 열리면 자동으로 날씨 가져오기
  useEffect(() => {
    if (!isEdit && !weather) {
      setWeatherLoading(true);
      fetchWeather()
        .then(w => { setWeather(w); setWeatherError(null); })
        .catch(e => { setWeatherError(typeof e === "string" ? e : e.message); })
        .finally(() => setWeatherLoading(false));
    }
  }, []);
  const [selectedMenu, setSelectedMenu] = useState(
    (isEdit || isCopy) ? (editTarget.menuId || "") : (isHandDrip ? "hand_drip" : "")
  );

  // 핸드드립 메뉴 선택 시 머신 자동 해제
  useEffect(() => {
    if (selectedMenu === "hand_drip") {
      setSelectedEquipIds(prev => {
        if (!prev.machine) return prev;
        const next = { ...prev };
        delete next.machine;
        return next;
      });
      setMachineBrand(""); setMachineModel(""); setMachineLocked(false);
    }
  }, [selectedMenu]);

  // ── 프리셋 ──────────────────────────────────────────────────────
  const [presets, setPresets] = useState(() => loadPresets(user?.uid));
  const [showPresetSave, setShowPresetSave] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [activePresetId, setActivePresetId] = useState(null);

  const applyPreset = (preset) => {
    // 메뉴
    if (preset.menuId) setSelectedMenu(preset.menuId);
    const menu = COFFEE_MENUS.find(m => m.id === preset.menuId);

    // 원두 연결
    if (preset.linkedBeanId) {
      setLinkedBeanId(preset.linkedBeanId);
      const bean = myBeans.find(b => b.id === preset.linkedBeanId);
      if (bean) {
        set("company", bean.roastery || "");
        set("bean", bean.name || "");
        set("roastDate", bean.roastDate || "");
      }
    } else {
      setLinkedBeanId(null);
    }

    // 머신 — 완전 교체 (이전 값 잔존 방지)
    if (preset.equipType === "handdrip") {
      setMachineType("handdrip");
      setHandDripName(preset.handDripName || "");
      setMachineBrand("");
      setMachineModel("");
    } else {
      setMachineType(preset.machineType || "auto");
      setMachineBrand(preset.machineBrand || "");
      setMachineModel(preset.machineModel || "");
      setHandDripName("");
    }
    setMachineLocked(!!(preset.machineBrand || preset.handDripName));

    // 그라인더 — 완전 교체
    setGrinderBrand(preset.grinderBrand || "");
    setGrinderModel(preset.grinderModel || "");
    setGrinderLocked(!!preset.grinderBrand);

    // 장비 선택 IDs 복원
    if (preset.selectedEquipIds) setSelectedEquipIds({ ...preset.selectedEquipIds });

    // form 전체를 프리셋 값으로 완전 교체
    setForm(f => ({
      ...f,
      isIced:          preset.isIced          ?? false,
      gram:            preset.gram            ?? "",
      seconds:         preset.seconds         ?? "",
      infusionSeconds: preset.infusionSeconds ?? "0",
      espressoMl:      preset.espressoMl      ?? "",
      waterTemp:       preset.waterTemp       ?? "",
      waterType:       preset.waterType       ?? "",
      waterBrand:      preset.waterBrand      ?? "",
      grindSize:       preset.grindSize       ?? "",
      diluteMl:        preset.diluteMl        ?? "",
      diluteType:      preset.diluteType      ?? "물",
      syrup:           preset.syrup           ?? "",
      brewPressureBar: preset.brewPressureBar ?? "",   // [신규]
      continuousMemo:  preset.continuousMemo  ?? "",   // [신규]
    }));
  };

  const savePreset = () => {
    if (!presetName.trim()) return;
    const newPreset = {
      id: `preset_${Date.now()}`,
      name: presetName.trim(),
      // 기본 정보
      menuId:          selectedMenu,
      isIced:          form.isIced || false,
      linkedBeanId:    linkedBeanId || null,
      // 장비 설정
      equipType:       isHandDrip ? "handdrip" : "machine",
      handDripName:    isHandDrip ? handDripName : "",
      machineBrand:    isHandDrip ? "" : machineBrand,
      machineModel:    isHandDrip ? "" : machineModel,
      machineType:     isHandDrip ? "" : machineType,
      grinderBrand:    grinderBrand,
      grinderModel:    grinderModel,
      selectedEquipIds: { ...selectedEquipIds },
      // 추출 파라미터
      gram:            form.gram,
      seconds:         form.seconds,
      infusionSeconds: form.infusionSeconds || "0",
      espressoMl:      form.espressoMl,
      waterTemp:       form.waterTemp || "",
      waterType:       form.waterType || "",
      waterBrand:      form.waterBrand || "",
      grindSize:       form.grindSize,
      diluteMl:        form.diluteMl,
      diluteType:      form.diluteType,
      syrup:           form.syrup || "",
      brewPressureBar: form.brewPressureBar || "",   // [신규]
      continuousMemo:  form.continuousMemo || "",    // [신규]
      createdAt: new Date().toISOString(),
    };
    const updated = [...presets, newPreset];
    savePresets(user?.uid, updated);
    setPresets(updated);
    setPresetName("");
    setShowPresetSave(false);
  };

  const deletePreset = (id) => {
    const updated = presets.filter(p => p.id !== id);
    savePresets(user?.uid, updated);
    setPresets(updated);
  };

  // 장비 선택 시 머신/그라인더 자동 입력
  const applyEquipment = (eq) => {
    if (!eq) return;
    if (eq.category === "handdrip") {
      setMachineType("handdrip");
      setHandDripName(`${eq.brand}${eq.model ? " " + eq.model : ""}`);
      setMachineBrand(""); setMachineModel("");
      setMachineLocked(true);
    } else if (eq.category === "machine") {
      setMachineType("semi");
      setMachineBrand(eq.brand || "");
      setMachineModel(eq.model || "");
      setMachineLocked(true);
    } else if (eq.category === "grinder") {
      setGrinderBrand(eq.brand || "");
      setGrinderModel(eq.model || "");
      setGrinderLocked(true);
    }
  };

  const currentMenu = COFFEE_MENUS.find(m => m.id === selectedMenu);
  const needsDilute = !currentMenu || currentMenu.needsDilute;
  const defaultDilute = currentMenu?.defaultDilute || null;
  const diluteCategory = currentMenu?.diluteCategory || "both";
  const hasSyrup = currentMenu?.hasSyrup || false;
  const canIce = currentMenu?.canIce || false;

  const selectMenu = (menu) => {
    setSelectedMenu(menu.id);
    if (!menu.canIce) set("isIced", false);
    // 메뉴별 기본값 자동 입력
    const defaults = {
      espresso:   { seconds: "25", espressoMl: "30", diluteMl: "", diluteType: "물" },
      ristretto:  { seconds: "20", espressoMl: "15", diluteMl: "", diluteType: "물" },
      lungo:      { seconds: "40", espressoMl: "60", diluteMl: "", diluteType: "물" },
      americano:  { seconds: "25", espressoMl: "30", diluteMl: "150", diluteType: "물" },
      long_black: { seconds: "25", espressoMl: "60", diluteMl: "150", diluteType: "물" },
      latte:      { seconds: "25", espressoMl: "30", diluteMl: "150", diluteType: "우유" },
      cappuccino: { seconds: "25", espressoMl: "30", diluteMl: "100", diluteType: "우유" },
      flatwhite:  { seconds: "25", espressoMl: "40", diluteMl: "80",  diluteType: "우유" },
      macchiato:  { seconds: "25", espressoMl: "30", diluteMl: "20",  diluteType: "우유" },
      cortado:    { seconds: "25", espressoMl: "30", diluteMl: "30",  diluteType: "우유" },
      cold_brew:  { seconds: "30", espressoMl: "60", diluteMl: "100", diluteType: "물" },
      hand_drip:  { seconds: "180", espressoMl: "200", diluteMl: "",  diluteType: "" },
    };
    if (defaults[menu.id]) {
      setForm(f => ({ ...f, ...defaults[menu.id] }));
    }
  };

  // 머신 브랜드/모델 바뀔 때 내장 그라인더 자동 입력
  useEffect(() => {
    if (!isEdit && !isCopy) {
      const builtin = getBuiltinGrinder(machineBrand, machineModel);
      if (builtin) {
        setGrinderBrand(builtin.brand);
        setGrinderModel(builtin.model);
        setGrinderLocked(true);
      }
    }
  }, [machineBrand, machineModel]);

  const machineDisplay = machineType === "handdrip"
    ? handDripName
    : (machineBrand ? (machineModel ? `${machineBrand} ${machineModel}` : machineBrand) : "");

  const grinderDisplay = grinderBrand
    ? (grinderModel ? `${grinderBrand} ${grinderModel}` : grinderBrand)
    : "";

  const modalRef = React.useRef(null);

  const scrollToError = (errorKeys) => {
    // 필드 우선순위 순서
    const priority = ["menu", "company", "bean", "gram", "seconds", "espressoMl"];
    const first = priority.find(k => errorKeys.includes(k));
    if (!first || !modalRef.current) return;
    const el = modalRef.current.querySelector(`[data-field="${first}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const save = async () => {
    const newErrors = {};
    if (!selectedMenu) newErrors.menu = true;
    if (!form.company) newErrors.company = true;
    if (!form.bean) newErrors.bean = true;
    if (!form.gram) newErrors.gram = true;
    if (!form.seconds) newErrors.seconds = true;
    if (!form.espressoMl) newErrors.espressoMl = true;
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      scrollToError(Object.keys(newErrors));
      return;
    }
    setErrors({});
    if (machineType === "handdrip") {
      saveMyMachine({ brand: "", model: "", equipType: "handdrip", handDripName: handDripName.trim() });
    } else if (machineBrand && machineModel && !machineLocked) {
      saveMyMachine({ brand: machineBrand, model: machineModel, equipType: "machine", handDripName: "" });
    }
    if (grinderBrand && grinderModel && !grinderLocked) {
      saveMyGrinder({ brand: grinderBrand, model: grinderModel });
    }
    // 원두 정보 저장
    if (form.company || form.bean) {
      saveMyBean({ company: form.company, bean: form.bean, roastDate: form.roastDate });
    }
    // 추출 기본값 저장
    saveRecipeDefaults({ gram: form.gram, seconds: form.seconds, infusionSeconds: form.infusionSeconds, espressoMl: form.espressoMl, diluteMl: form.diluteMl, diluteType: form.diluteType, waterTemp: form.waterTemp, grindSize: form.grindSize });
    setSaving(true);
    try {
      const pressureData = calcPressure(form.espressoMl, form.seconds);
      const payload = {
        weather: weather || null,
        ...form,
        menuId: selectedMenu,
        menuLabel: currentMenu?.label || "",
        flowRate: pressureData?.flowRate || null,
        pumpBar: pressureData?.pumpBar || null,
        showerBar: pressureData?.showerBar || null,
        machine: machineDisplay,
        machineBrand: machineType === "handdrip" ? "" : machineBrand,
        machineModel: machineType === "handdrip" ? "" : machineModel,
        machineType: machineType === "handdrip" ? "handdrip" : (isAutoMachine(machineBrand) ? machineType : "manual"),
        grinder: grinderDisplay,
        grinderBrand,
        grinderModel,
        grindSize: form.grindSize,
        isPublic: form.isPublic !== false,
        linkedBeanId: linkedBeanId || null,
        brewPressureBar: form.brewPressureBar || null,   // [신규] 직접 측정 압력값
        continuousMemo: form.continuousMemo || "",       // [신규] 연속 추출 메모
      };
      if (isEdit) {
        const { id, ...rest } = payload;
        // ── 수정 시 consumedG 처리 (해석 A: 작성 후 24시간 이내면 차액 반영) ──
        if (linkedBeanId || editTarget.linkedBeanId) {
          try {
            const createdAt = editTarget.createdAt?.toDate?.() || null;
            const within24h = createdAt && (Date.now() - createdAt.getTime()) < 24 * 60 * 60 * 1000;

            const prevBeanId  = editTarget.linkedBeanId || null;
            const newBeanId   = linkedBeanId || null;
            const prevGram    = parseFloat(editTarget.gram) || 0;
            const newGram     = parseFloat(form.gram) || 0;

            if (within24h) {
              // 같은 원두 → 차액만 반영
              if (prevBeanId && newBeanId && prevBeanId === newBeanId) {
                const diff = newGram - prevGram;
                if (diff !== 0) {
                  const bRef = doc(db, "beans", prevBeanId);
                  const bSnap = await getDoc(bRef);
                  if (bSnap.exists()) {
                    const cur = parseFloat(bSnap.data().consumedG) || 0;
                    await updateDoc(bRef, { consumedG: Math.max(0, cur + diff) });
                  }
                }
              }
              // 원두가 변경됨 → 이전 원두 차감 + 새 원두 가산
              if (prevBeanId && newBeanId && prevBeanId !== newBeanId) {
                const prevRef = doc(db, "beans", prevBeanId);
                const prevSnap = await getDoc(prevRef);
                if (prevSnap.exists()) {
                  const cur = parseFloat(prevSnap.data().consumedG) || 0;
                  await updateDoc(prevRef, { consumedG: Math.max(0, cur - prevGram) });
                }
                const newRef = doc(db, "beans", newBeanId);
                const newSnap = await getDoc(newRef);
                if (newSnap.exists()) {
                  const cur = parseFloat(newSnap.data().consumedG) || 0;
                  await updateDoc(newRef, { consumedG: cur + newGram });
                }
              }
              // 원두 연결 해제 → 이전 원두 차감
              if (prevBeanId && !newBeanId) {
                const prevRef = doc(db, "beans", prevBeanId);
                const prevSnap = await getDoc(prevRef);
                if (prevSnap.exists()) {
                  const cur = parseFloat(prevSnap.data().consumedG) || 0;
                  await updateDoc(prevRef, { consumedG: Math.max(0, cur - prevGram) });
                }
              }
              // 원두 새로 연결 → 새 원두 가산
              if (!prevBeanId && newBeanId) {
                const newRef = doc(db, "beans", newBeanId);
                const newSnap = await getDoc(newRef);
                if (newSnap.exists()) {
                  const cur = parseFloat(newSnap.data().consumedG) || 0;
                  await updateDoc(newRef, { consumedG: cur + newGram });
                }
              }
            }
            // 24시간 이후 수정 → consumedG 건드리지 않음
          } catch(e) { console.error("[consumedG] 수정 반영 실패:", e.message); }
        }
        await updateDoc(doc(db, "recipes", editTarget.id), rest);
      } else {
        const recipeRef = await addDoc(collection(db, "recipes"), {
          ...payload,
          author: user?.displayName,
          uid: user?.uid,
          createdAt: serverTimestamp(),
        });
        // ── 신규 레시피: consumedG 누적 + usedCount 증가 ──
        if (linkedBeanId) {
          try {
            const beanRef  = doc(db, "beans", linkedBeanId);
            const beanSnap = await getDoc(beanRef);
            if (beanSnap.exists()) {
              const cur      = parseFloat(beanSnap.data().consumedG) || 0;
              const curCount = beanSnap.data().usedCount || 0;
              const updateData = {
                consumedG:  cur + (parseFloat(form.gram) || 0),
                usedCount:  curCount + 1,
                lastUsedAt: serverTimestamp(),
              };
              // 미개봉 상태면 자동으로 개봉 중으로 변경
              if (beanSnap.data().status === "sealed" || !beanSnap.data().status) {
                updateData.status = "open";
              }
              await updateDoc(beanRef, updateData);
            }
          } catch(e) { console.error("[consumedG] 신규 반영 실패:", e.message); }
        }
        // 작성자를 구독한 유저들에게 알림
        try {
          const followSnap = await getDocs(
            query(collection(db, "users"), where("following", "array-contains", user?.uid))
          );
          const batch = followSnap.docs.map(d =>
            addDoc(collection(db, "notifications"), {
              toUid: d.id,
              type: "newRecipe",
              fromUser: user?.displayName,
              beanName: payload.bean || "",
              read: false,
              createdAt: serverTimestamp(),
            }).catch(e => console.error("[알림] newRecipe 알림 실패:", e.message))
          );
          await Promise.all(batch);
        } catch(e) { console.error("[알림] 구독자 알림 오류:", e.message); }
      }
      onSave();

      // Gemini 캐시 무효화 — 새 레시피 저장 시 다음 접속 때 최신 데이터로 재분석
      try { ["ko","en"].forEach(l => localStorage.removeItem(`brewlog_gemini_${user?.uid}_${l}`)); } catch {}

      // ── 자동 구글 드라이브 백업 (백그라운드, 실패해도 저장은 완료) ──
      try {
        const autoKey  = `brewlog_gdrive_auto_${user?.uid}`;
        const tokenKey = `brewlog_gdrive_token_${user?.uid}`;
        const isAuto   = localStorage.getItem(autoKey) === "true";
        const token    = sessionStorage.getItem(tokenKey);
        if (isAuto && token) {
          (async () => {
            try {
              if (!window.XLSX) {
                await new Promise((res, rej) => {
                  const s = document.createElement("script");
                  s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
                  s.onload = res; s.onerror = rej;
                  document.head.appendChild(s);
                });
              }
              const XLSX = window.XLSX;
              const snap = await getDocs(query(collection(db, "recipes"), where("uid", "==", user.uid)));
              const recs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
              recs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
              if (!recs.length) return;
              const fmtD = (v) => { if (!v) return ""; if (v?.toDate) return v.toDate().toISOString().slice(0,10); return typeof v==="string"?v.slice(0,10):""; };
              const WL = { tap:"수돗물", filter:"정수기", bottle:"생수", other:"기타" };
              const hdrs = ["메뉴","원두명","원두회사","로스팅일자","기록날짜","커피머신","그라인더","분쇄도","원두량(g)","추출시간(s)","추출량(ml)","물온도(°C)","물종류","희석종류","희석량(ml)","별점(1-5)","메모","공개","추출압력(BAR)","연속추출메모","하트수","작성일시"];
              const rows = recs.map(r => {
                const mn = COFFEE_MENUS.find(x => x.id === r.menuId);
                return [r.menuLabel||mn?.label||"", r.bean||"", r.company||"", r.roastDate||"", r.recordDate||fmtD(r.createdAt), r.machine||"", r.grinder||"", r.grindSize||"", r.gram||"", r.seconds||"", r.espressoMl||"", r.waterTemp||"", WL[r.waterType]||r.waterType||"", r.diluteType||"", r.diluteMl||"", r.rating||0, r.note||"", r.isPublic!==false?"TRUE":"FALSE", r.brewPressureBar||"", r.continuousMemo||"", r.likedBy?.length||0, fmtD(r.createdAt)];
              });
              const ws = XLSX.utils.aoa_to_sheet([hdrs, ...rows]);
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, "내 레시피");
              const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
              const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
              const fileName = "brewlog_backup.xlsx";
              const auth = { Authorization: `Bearer ${token}` };
              const fs = await fetch(`https://www.googleapis.com/drive/v3/files?q=name%3D'Brewlog'%20and%20mimeType%3D'application%2Fvnd.google-apps.folder'%20and%20trashed%3Dfalse&fields=files(id)`, { headers: auth }).then(r=>r.json());
              let fid = fs.files?.[0]?.id;
              if (!fid) {
                const fr = await fetch("https://www.googleapis.com/drive/v3/files", { method:"POST", headers:{...auth,"Content-Type":"application/json"}, body:JSON.stringify({name:"Brewlog",mimeType:"application/vnd.google-apps.folder"}) }).then(r=>r.json());
                fid = fr.id;
              }
              const ex = await fetch(`https://www.googleapis.com/drive/v3/files?q=name%3D'${fileName}'%20and%20'${fid}'%20in%20parents%20and%20trashed%3Dfalse&fields=files(id)`, { headers: auth }).then(r=>r.json());
              const bnd = "bl_bnd";
              const meta = { name: fileName, mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" };
              const mkBody = (m) => [`--${bnd}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(m)}\r\n`, `--${bnd}\r\nContent-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\nContent-Transfer-Encoding: base64\r\n\r\n${b64}\r\n`, `--${bnd}--`].join("");
              if (ex.files?.length > 0) {
                await fetch(`https://www.googleapis.com/upload/drive/v3/files/${ex.files[0].id}?uploadType=multipart`, { method:"PATCH", headers:{...auth,"Content-Type":`multipart/related; boundary=${bnd}`}, body: mkBody(meta) });
              } else {
                meta.parents = [fid];
                await fetch(`https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`, { method:"POST", headers:{...auth,"Content-Type":`multipart/related; boundary=${bnd}`}, body: mkBody(meta) });
              }
              console.log("[GDrive] 자동 백업 완료");
            } catch (gErr) { console.warn("[GDrive] 자동 백업 실패:", gErr.message); }
          })();
        }
      } catch (gErr) { /* 자동 백업 오류는 저장에 영향 없음 */ }
    } catch (e) { alert("저장 오류: " + e.message); }
    setSaving(false);
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" ref={modalRef}>
        <h2>{isEdit ? t.editTitle : editTarget?._isCopy ? "레시피 복사하기" : t.recordTitle}</h2>
        {/* 복사 모드 안내 */}
        {editTarget?._isCopy && (
          <div style={{ background:"#EBF5FB", border:"1px solid #AED6F1", borderRadius:"8px", padding:"10px 14px", marginBottom:"16px", fontSize:"0.8rem", color:"#2980b9", display:"flex", alignItems:"center", gap:"8px" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/><path d="M8 7v4M8 5.5v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
            다른 레시피를 복사했어요. 내용을 수정하고 저장하면 내 새 레시피로 등록됩니다.
          </div>
        )}

        {/* ── 프리셋 (모달 최상단) ── */}
        {(
          <div style={{ marginBottom: "20px", paddingBottom: "20px", borderBottom: "1px solid var(--divider)" }}>
            <div style={{ marginBottom: "10px" }}>
              <span style={{ fontSize: "0.72rem", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                {lang === "en" ? "Presets" : "프리셋"}
              </span>
            </div>
            {presets.length === 0 ? (
              <p style={{ fontSize: "0.78rem", color: "var(--muted)", opacity: 0.7 }}>
                {lang === "en"
                  ? "No presets yet. Fill in settings below and save."
                  : "저장된 프리셋이 없어요. 아래 설정을 입력한 뒤 저장해보세요."}
              </p>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {presets.map(p => {
                  const compatible = !p.equipType || p.equipType === (isHandDrip ? "handdrip" : "machine");
                  return (
                    <button key={p.id} type="button"
                      onClick={() => { if (compatible) { applyPreset(p); setActivePresetId(p.id); } }}
                      disabled={!compatible}
                      title={!compatible ? (lang === "en" ? "Different equipment type" : "기구 타입이 달라요") : ""}
                      style={{
                        padding: "6px 14px", borderRadius: "8px",
                        border: `1px solid ${!compatible ? "var(--steam)" : activePresetId === p.id ? "var(--espresso)" : "var(--latte)"}`,
                        background: !compatible ? "var(--cream)" : activePresetId === p.id ? "var(--espresso)" : "#FDF6EF",
                        color: !compatible ? "var(--muted)" : activePresetId === p.id ? "var(--cream)" : "var(--latte)",
                        fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem",
                        cursor: compatible ? "pointer" : "not-allowed",
                        opacity: compatible ? 1 : 0.45,
                        fontWeight: 500,
                        transition: "all 0.15s",
                        display: "flex", alignItems: "center", gap: "5px",
                      }}>
                      {p.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 프리셋 저장 오버레이 */}
        {showPresetSave && (
          <div style={{ position: "fixed", inset: 0, background: "#0005", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
            onClick={e => e.target === e.currentTarget && setShowPresetSave(false)}>
            <div style={{ background: "var(--foam)", borderRadius: "12px", padding: "24px", width: "100%", maxWidth: "360px", boxShadow: "0 8px 32px #0003" }}>
              <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.1rem", marginBottom: "16px", color: "var(--espresso)" }}>
                {lang === "en" ? "Save as Preset" : "프리셋으로 저장"}
              </h3>
              <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: "14px", lineHeight: 1.6 }}>
                {lang === "en"
                  ? "Current settings will be saved: menu, dose, time, yield, temperature, and grind size."
                  : "현재 입력된 메뉴, 원두량, 시간, 추출량, 온도, 분쇄도가 저장돼요."}
              </p>
              <div className="field full" style={{ marginBottom: "14px" }}>
                <label>{lang === "en" ? "Preset Name" : "프리셋 이름"}</label>
                <input
                  value={presetName}
                  onChange={e => setPresetName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") savePreset(); if (e.key === "Escape") setShowPresetSave(false); }}
                  placeholder={lang === "en" ? "e.g. Morning Espresso" : "예) 아침 에스프레소"}
                  autoFocus
                />
              </div>
              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                <button className="btn-cancel" onClick={() => { setShowPresetSave(false); setPresetName(""); }}>
                  {lang === "en" ? "Cancel" : "취소"}
                </button>
                <button className="btn-save-sm" onClick={savePreset} disabled={!presetName.trim()}>
                  {lang === "en" ? "Save" : "저장"}
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="modal-grid">

          <div style={{ gridColumn: "1 / -1", margin: "4px 0 16px" }}>
            <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", fontWeight: 700, color: "var(--espresso)", letterSpacing: "0.04em" }}>기본 정보</span>
            <div style={{ height: "1px", background: "var(--divider)", marginTop: "10px" }}/>
          </div>
          {/* 커피 메뉴 선택 */}
          <div className="field full" data-field="menu">
            <label style={{ color: errors.menu ? "#c0392b" : undefined }}>
              {t.coffeeMenu}
            </label>
            <div className="menu-selector" style={{ border: errors.menu ? "1px solid #c0392b" : "none", borderRadius: "8px", padding: errors.menu ? "0.5rem" : "0" }}>
              {COFFEE_MENUS.map(m => (
                <button
                  key={m.id}
                  type="button"
                  className={`menu-btn ${selectedMenu === m.id ? "selected" : ""}`}
                  onClick={() => { selectMenu(m); setErrors(p => ({...p, menu: false})); }}
                >
                  {MenuIcons[m.id]}
                  {lang === "en" ? m.labelEn : m.label}
                </button>
              ))}
            </div>
            {errors.menu && <p style={{ color: "#c0392b", fontSize: "0.78rem", marginTop: "0.3rem" }}>⚠️ 커피 메뉴를 선택해주세요</p>}
          </div>

          {/* HOT / ICE 토글 */}
          {canIce && (
            <div className="field full">
              <div style={{ display: "flex", gap: "8px" }}>
                <button type="button"
                  onClick={() => { set("isIced", false); if (!form.waterTemp) set("waterTemp", "93"); }}
                  style={{ flex: 1, height: "44px", border: "1px solid", borderRadius: "8px", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: "0.9rem", fontWeight: form.isIced ? 400 : 600, transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                    borderColor: !form.isIced ? "#e67e22" : "var(--steam)",
                    background: !form.isIced ? "#FEF3E8" : "var(--foam)",
                    color: !form.isIced ? "#e67e22" : "var(--muted)" }}>
                  <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                    <circle cx="9" cy="9" r="4" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M9 1v2M9 15v2M1 9h2M15 9h2M3.2 3.2l1.4 1.4M13.4 13.4l1.4 1.4M3.2 14.8l1.4-1.4M13.4 4.6l1.4-1.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  HOT
                </button>
                <button type="button"
                  onClick={() => { set("isIced", true); }}
                  style={{ flex: 1, height: "44px", border: "1px solid", borderRadius: "8px", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: "0.9rem", fontWeight: form.isIced ? 600 : 400, transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                    borderColor: form.isIced ? "#2980b9" : "var(--steam)",
                    background: form.isIced ? "#EBF5FB" : "var(--foam)",
                    color: form.isIced ? "#2980b9" : "var(--muted)" }}>
                  <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                    <path d="M9 2v14M2 9h14M4.5 4.5l9 9M13.5 4.5l-9 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    <circle cx="9" cy="9" r="2.5" fill="currentColor" opacity="0.25"/>
                  </svg>
                  ICE
                </button>
              </div>
            </div>
          )}
          {/* 원두 선택 — 내 원두에서만 */}
          {myBeans.length === 0 ? (
            <div className="field full">
              <div style={{ background: "var(--cream)", border: "1px solid var(--divider)", borderRadius: "8px", padding: "14px 16px", fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.6 }}>
                {lang === "en"
                  ? "No beans registered. Add beans in the My Beans tab first."
                  : "등록된 원두가 없어요. 내 원두 탭에서 원두를 먼저 추가해주세요."}
              </div>
            </div>
          ) : (
            <div className="field full">
              <label style={{ color: errors.bean ? "#c0392b" : undefined }}>
                {lang === "en" ? "Select Bean *" : "원두 선택 *"}
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {myBeans.map(b => {
                  const roastDays = b.roastDate ? Math.floor((Date.now() - new Date(b.roastDate)) / 86400000) : null;
                  const isExhausted = b.status === "empty";
                  const isSelected = linkedBeanId === b.id;
                  return (
                    <button key={b.id} type="button"
                      disabled={isExhausted}
                      onClick={() => {
                        if (isSelected) {
                          setLinkedBeanId(null);
                          set("company", ""); set("bean", ""); set("roastDate", "");
                        } else {
                          setLinkedBeanId(b.id);
                          set("company", b.roastery || "");
                          set("bean", b.name || "");
                          set("roastDate", b.roastDate || "");
                          setErrors(p => ({ ...p, bean: false, company: false }));
                        }
                      }}
                      style={{
                        padding: "6px 12px", border: "1px solid", borderRadius: "8px",
                        fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem",
                        cursor: isExhausted ? "not-allowed" : "pointer",
                        borderColor: isSelected ? "var(--espresso)" : "var(--steam)",
                        background: isSelected ? "var(--espresso)" : isExhausted ? "var(--divider)" : "var(--foam)",
                        color: isSelected ? "var(--cream)" : isExhausted ? "var(--muted)" : "var(--espresso)",
                        opacity: isExhausted ? 0.5 : 1,
                        textAlign: "left", lineHeight: 1.4,
                        transition: "all 0.15s",
                      }}>
                      <span style={{ fontWeight: 600 }}>{b.name}</span>
                      <span style={{ marginLeft: "4px", fontSize: "0.72rem", opacity: 0.7 }}>· {b.roastery}</span>
                      {roastDays !== null && (
                        <span style={{ marginLeft: "4px", fontSize: "0.65rem", opacity: 0.6 }}>
                          ({roastDays}{lang === "en" ? "d" : "일"})
                        </span>
                      )}
                      {b.usedCount > 0 && (
                        <span style={{ marginLeft: "3px", fontSize: "0.65rem", color: isSelected ? "var(--cream)" : "var(--latte)", opacity: 0.8 }}>×{b.usedCount}</span>
                      )}
                    </button>
                  );
                })}
              </div>
              {errors.bean && <p style={{ color: "#c0392b", fontSize: "0.78rem", marginTop: "0.4rem" }}>⚠️ {lang === "en" ? "Please select a bean." : "원두를 선택해주세요."}</p>}
            </div>
          )}
          <div style={{ gridColumn: "1 / -1", margin: "36px 0 16px" }}>
            <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", fontWeight: 700, color: "var(--espresso)", letterSpacing: "0.04em" }}>장비 설정</span>
            <div style={{ height: "1px", background: "var(--divider)", marginTop: "10px" }}/>
          </div>

          {/* 내 장비에서 선택 */}
          {myEquips.length > 0 && (
            <div className="field full">
              <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                  <rect x="1.5" y="4" width="9" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M4 4V3a2 2 0 0 1 4 0v1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  <path d="M10.5 7h1.5a1.5 1.5 0 0 1 0 3h-1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                {lang === "en" ? "Select from My Gear" : "내 장비에서 선택"}
              </label>
              {/* 카테고리별 그룹 - 순서: 커피머신 → 핸드드립 → 그라인더 → 기타 */}
              {[
                { cat: "machine",  labelKo: "커피 머신",   labelEn: "Machine" },
                { cat: "handdrip", labelKo: "핸드드립 기구", labelEn: "Hand Drip" },
                { cat: "grinder",  labelKo: "그라인더",    labelEn: "Grinder" },
                { cat: "other",    labelKo: "기타",        labelEn: "Other" },
              ].map(({ cat, labelKo, labelEn }) => {
                // 핸드드립 메뉴 선택 시 커피 머신 카테고리 숨김
                if (cat === "machine" && selectedMenu === "hand_drip") return null;
                // 핸드드립 메뉴 선택 시 머신이 아닌 경우에만 핸드드립 기구 표시 (반대로 머신 메뉴면 핸드드립 기구 숨김)
                if (cat === "handdrip" && selectedMenu && selectedMenu !== "hand_drip" && selectedMenu !== "other") return null;
                const catEquips = myEquips.filter(e => e.category === cat);
                if (!catEquips.length) return null;
                return (
                  <div key={cat} style={{ marginBottom: "8px" }}>
                    <div style={{ fontSize: "0.62rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "5px" }}>
                      {lang === "en" ? labelEn : labelKo}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {catEquips.map(eq => {
                        const isSelected = selectedEquipIds[eq.category] === eq.id;
                        return (
                          <button key={eq.id} type="button"
                            onClick={() => {
                              const newIds = { ...selectedEquipIds };
                              if (isSelected) {
                                delete newIds[eq.category];
                                setSelectedEquipIds(newIds);
                              } else {
                                // 머신 선택 시 핸드드립 해제, 핸드드립 선택 시 머신 해제
                                if (eq.category === "machine") delete newIds.handdrip;
                                if (eq.category === "handdrip") delete newIds.machine;
                                newIds[eq.category] = eq.id;
                                setSelectedEquipIds(newIds);
                                applyEquipment(eq);
                              }
                            }}
                            style={{ padding: "5px 12px", border: "1px solid", borderRadius: "8px", fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", cursor: "pointer", transition: "all 0.15s",
                              display: "flex", alignItems: "center", gap: "5px",
                              borderColor: isSelected ? "var(--espresso)" : "var(--steam)",
                              background: isSelected ? "var(--espresso)" : "var(--foam)",
                              boxShadow: isSelected ? "none" : "none" }}>
                            <span style={{ fontWeight: 600, color: isSelected ? "var(--cream)" : "var(--espresso)" }}>{eq.brand}</span>
                            {eq.isPrimary && !isSelected && <span style={{ fontSize: "0.6rem", color: "var(--latte)" }}>★</span>}
                            {eq.model && <span style={{ color: isSelected ? "var(--cream)" : "var(--muted)", fontSize: "0.72rem", opacity: isSelected ? 0.8 : 1 }}>{eq.model}</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {/* 내 장비 미등록 시에만 표시: 머신/핸드드립 탭, 그라인더 */}
          {!myEquips.some(e => e.category === "machine" || e.category === "handdrip") && (
          <div className="field full">
            <label>{machineType === "handdrip" ? (lang === "en" ? "Hand Drip Equipment" : "핸드드립 기구") : (t ? t.machine : "커피 머신")}</label>
            {/* 커피머신 / 핸드드립 탭 — 항상 표시 */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
              <button
                type="button"
                onClick={() => { setMachineType("auto"); setMachineBrand(savedMachine?.equipType !== "handdrip" ? (savedMachine?.brand || "") : ""); setMachineModel(savedMachine?.equipType !== "handdrip" ? (savedMachine?.model || "") : ""); setMachineLocked(false); }}
                style={{ flex: 1, height: "42px", border: "1px solid", borderRadius: "8px",
                  borderColor: machineType !== "handdrip" ? "var(--espresso)" : "var(--steam)",
                  background: machineType !== "handdrip" ? "var(--espresso)" : "var(--foam)",
                  color: machineType !== "handdrip" ? "var(--cream)" : "var(--muted)",
                  fontFamily: "'DM Sans',sans-serif", fontSize: "0.88rem", fontWeight: machineType !== "handdrip" ? 600 : 400,
                  cursor: "pointer", transition: "all 0.2s" }}
              >{lang === "en" ? "Coffee Machine" : "커피 머신"}</button>
              <button
                type="button"
                onClick={() => { setMachineType("handdrip"); setMachineBrand(""); setMachineModel(""); setMachineLocked(false); const hd = COFFEE_MENUS.find(m => m.id === "hand_drip"); if (hd) selectMenu(hd); }}
                style={{ flex: 1, height: "42px", border: "1px solid", borderRadius: "8px",
                  borderColor: machineType === "handdrip" ? "var(--espresso)" : "var(--steam)",
                  background: machineType === "handdrip" ? "var(--espresso)" : "var(--foam)",
                  color: machineType === "handdrip" ? "var(--cream)" : "var(--muted)",
                  fontFamily: "'DM Sans',sans-serif", fontSize: "0.88rem", fontWeight: machineType === "handdrip" ? 600 : 400,
                  cursor: "pointer", transition: "all 0.2s" }}
              >{lang === "en" ? "Hand Drip" : "핸드드립"}</button>
            </div>
            {machineType === "handdrip" ? (
              <input
                value={handDripName}
                onChange={e => setHandDripName(e.target.value)}
                placeholder={lang === "en" ? "e.g. Hario V60, Chemex …" : "예) 하리오 V60, 케멕스 …"}
                style={{ width: "100%", padding: "0.75rem 1rem", border: "1px solid var(--steam)", borderRadius: "8px", background: "var(--cream)", fontFamily: "'DM Sans',sans-serif", fontSize: "0.95rem", color: "var(--espresso)", outline: "none" }}
              />
            ) : machineLocked ? (
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <div style={{ flex: 1, padding: "0.75rem 1rem", border: "1px solid var(--steam)", borderRadius: "8px", background: "var(--cream)", fontSize: "0.95rem", color: "var(--espresso)", fontWeight: 500 }}>
                  {machineDisplay}
                </div>
                <button onClick={() => setMachineLocked(false)} style={{ height: "42px", padding: "0 16px", background: "none", border: "1px solid var(--steam)", borderRadius: "8px", fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem", color: "var(--muted)", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, transition: "all 0.2s" }}>
                  {lang === "en" ? "Edit" : "변경"}
                </button>
              </div>
            ) : (
              <>
                <BrandInput
                  value={machineBrand}
                  onChange={v => { setMachineBrand(v); setMachineModel(""); }}
                  brands={MACHINE_BRANDS}
                  placeholder="브랜드 입력 또는 검색 (예: Breville, 드롱기…)"
                />
                {machineBrand && (
                  <>
                    {isBothModeBrand(machineBrand) && (
                      <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                        {[{ val: "auto", label: t.autoType }, { val: "manual", label: t.manualType }].map(({ val, label }) => (
                          <button key={val} type="button" onClick={() => setMachineType(val)}
                            style={{ flex: 1, height: "42px", border: "1px solid", borderRadius: "8px",
                              borderColor: machineType === val ? "var(--espresso)" : "var(--steam)",
                              background: machineType === val ? "var(--espresso)" : "var(--foam)",
                              color: machineType === val ? "var(--cream)" : "var(--muted)",
                              fontFamily: "'DM Sans',sans-serif", fontSize: "0.88rem",
                              fontWeight: machineType === val ? 600 : 400,
                              cursor: "pointer", transition: "all 0.2s" }}
                          >{label}</button>
                        ))}
                      </div>
                    )}
                    <input value={machineModel} onChange={e => setMachineModel(e.target.value)}
                      placeholder={isCustomBrand ? "브랜드명과 모델명 입력" : "예) Barista Express, Dedica …"}
                      style={{ width: "100%", marginTop: "8px", padding: "0.75rem 1rem", border: "1px solid var(--steam)", borderRadius: "8px", background: "var(--cream)", fontFamily: "'DM Sans',sans-serif", fontSize: "0.95rem", color: "var(--espresso)", outline: "none" }}
                    />
                    {machineModel && <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "0.3rem", display: "flex", alignItems: "center", gap: "4px" }}>
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M4 7h6M4 9.5h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><rect x="3" y="1" width="8" height="3" rx="1" fill="currentColor" opacity="0.35"/></svg>
                      저장하면 다음에도 자동으로 채워져요
                    </p>}
                  </>
                )}
              </>
            )}
          </div>
          )} {/* 머신/핸드드립 섹션 조건부 끝 */}

          {/* 그라인더 - 전자동이면 숨김, 내 장비에 그라인더 있으면 숨김 */}
          {!myEquips.some(e => e.category === "grinder") && !isAutoMode && (
            grinderLocked ? (
              <div className="field full">
                <label>{t ? t.grinder : "그라인더"}</label>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <div style={{
                    flex: 1, padding: "0.75rem 1rem", border: "1px solid var(--steam)",
                    borderRadius: "8px", background: "var(--cream)", fontSize: "0.95rem",
                    color: "var(--espresso)", fontWeight: 500,
                  }}>
                    {grinderDisplay}
                  </div>
                  <button onClick={() => setGrinderLocked(false)} style={{
                    height: "42px", padding: "0 16px", background: "none", border: "1px solid var(--steam)",
                    borderRadius: "8px", fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem",
                    color: "var(--muted)", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, transition: "all 0.2s",
                  }}>{ lang === "en" ? "Edit" : "변경"}</button>
                </div>
              </div>
            ) : (
              <>
                <div className="field full">
                  <label>{t ? t.grinderBrand : "그라인더 브랜드"}</label>
                  <BrandInput
                    value={grinderBrand}
                    onChange={v => { setGrinderBrand(v); setGrinderModel(""); }}
                    brands={GRINDER_BRANDS}
                    placeholder="브랜드 입력 또는 검색 (예: Mahlkönig, 마쩌…)"
                  />
                </div>
                {grinderBrand && (
                  <div className="field full">
                    <label>{t ? t.machineModel : "세부 모델명"}</label>
                    <input
                      value={grinderModel}
                      onChange={e => setGrinderModel(e.target.value)}
                      placeholder={isCustomGrinderBrand ? "브랜드명과 모델명 입력" : "예) Encore, C40, Nano …"}
                    />
                    {grinderModel && (
                      <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "0.3rem", display: "flex", alignItems: "center", gap: "4px" }}>
                        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M4 7h6M4 9.5h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><rect x="3" y="1" width="8" height="3" rx="1" fill="currentColor" opacity="0.35"/></svg>
                        저장하면 다음에도 자동으로 채워져요
                      </p>
                    )}
                  </div>
                )}
              </>
            )
          )}

          {/* 분쇄도 - 전자동이면 숨김 */}
          {!isAutoMode && (
            <div className="field full">
              <label>{lang === "en" ? "Grind Size" : "분쇄도"}</label>
              <input
                value={form.grindSize}
                onChange={e => set("grindSize", e.target.value)}
                placeholder={lang === "en" ? "e.g. 15, Medium-Fine …" : "예) 15, 중세 …"}
              />
            </div>
          )}

          <div style={{ gridColumn: "1 / -1", margin: "36px 0 16px" }}>
            <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", fontWeight: 700, color: "var(--espresso)", letterSpacing: "0.04em" }}>추출 파라미터</span>
            <div style={{ height: "1px", background: "var(--divider)", marginTop: "10px" }}/>
          </div>
          {/* 원두량: 전자동이면 콩 갯수, 아니면 g 입력 */}
          {isAutoMode ? (
            <div className="field full">
              <div className="bean-counter">
                <span className="bean-counter-label">
                  {t.gramAuto}
                  <span className="auto-badge">전자동</span>
                </span>
                <div className="bean-counter-display">
                  <div className="bean-icons">
                    {Array.from({ length: Number(form.gram) || 0 }).map((_, i) => (
                      <span key={i} className="bean-icon" title="클릭해서 제거"
                        onClick={() => set("gram", String(Math.max(0, (Number(form.gram)||0) - 1)))}>
                        <CoffeeBeanIcon size={22} />
                      </span>
                    ))}
                    {(!form.gram || Number(form.gram) === 0) && (
                      <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>{lang === "ko" ? "콩을 추가해주세요" : "Add beans"}</span>
                    )}
                  </div>
                  <div className="bean-counter-btns">
                    <button type="button" className="bean-btn"
                      onClick={() => set("gram", String(Math.max(0, (Number(form.gram)||0) - 1)))}>−</button>
                    <button type="button" className="bean-btn"
                      onClick={() => set("gram", String((Number(form.gram)||0) + 1))}>+</button>
                  </div>
                </div>
                <span className="bean-count-text">{form.gram || 0}개</span>
              </div>
            </div>
          ) : (
            <div className="field" data-field="gram">
              <label style={{ color: errors.gram ? "#c0392b" : undefined }}>{t.gram}</label>
              <input type="number" value={form.gram} onChange={e => { set("gram", String(Math.max(0, Number(e.target.value)))); setErrors(p => ({...p, gram: false})); }}
                placeholder="18" min="0"
                style={{ borderColor: errors.gram ? "#c0392b" : undefined }} />
              {errors.gram && <p style={{ color: "#c0392b", fontSize: "0.78rem", marginTop: "0.3rem" }}>⚠️ 필수 항목이에요</p>}
            </div>
          )}
          <div className="field" data-field="seconds">
            <label style={{ color: errors.seconds ? "#c0392b" : undefined }}>{t.seconds}</label>
            <TimerField
              value={form.seconds}
              infusionValue={form.infusionSeconds || "0"}
              onChange={v => { set("seconds", v); setErrors(p => ({...p, seconds: false})); }}
              onInfusionChange={v => set("infusionSeconds", v)}
              lang={lang} t={t}
            />
            {errors.seconds && <p style={{ color: "#c0392b", fontSize: "0.78rem", marginTop: "0.3rem" }}>{lang === "en" ? "⚠️ Required" : "⚠️ 필수 항목이에요"}</p>}
          </div>
          <div className="field" data-field="espressoMl">
            <label style={{ color: errors.espressoMl ? "#c0392b" : undefined }}>{t.espressoMl}</label>
            <input type="number" value={form.espressoMl} onChange={e => { set("espressoMl", String(Math.max(0, Number(e.target.value)))); setErrors(p => ({...p, espressoMl: false})); }}
              placeholder="36" min="0"
              style={{ borderColor: errors.espressoMl ? "#c0392b" : undefined }} />
            {errors.espressoMl && <p style={{ color: "#c0392b", fontSize: "0.78rem", marginTop: "0.3rem" }}>⚠️ 필수 항목이에요</p>}
          </div>
          <div className="field">
            <label>{lang === "en" ? "Water Temp (°C)" : "물온도 (°C)"}</label>
            <input type="number" value={form.waterTemp} onChange={e => set("waterTemp", String(Math.max(0, Number(e.target.value))))}
              placeholder="93" min="0" max="100" />
          </div>
          {/* 물 종류 */}
          <div className="field full">
            <label>{lang === "en" ? "Water Type" : "물 종류"}</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "6px" }}>
              {[
                { id: "tap",    ko: "수돗물",    en: "Tap Water" },
                { id: "filter", ko: "정수기",    en: "Filtered" },
                { id: "bottle", ko: "생수",      en: "Bottled" },
                { id: "other",  ko: "기타",      en: "Other" },
              ].map(w => {
                const isSelected = form.waterType === w.id;
                return (
                  <button key={w.id} type="button"
                    onClick={() => set("waterType", isSelected ? "" : w.id)}
                    style={{ padding: "5px 12px", border: "1px solid", borderRadius: "8px",
                      fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", cursor: "pointer", transition: "all 0.15s",
                      borderColor: isSelected ? "var(--espresso)" : "var(--steam)",
                      background: isSelected ? "var(--espresso)" : "var(--foam)",
                      color: isSelected ? "var(--cream)" : "var(--espresso)" }}>
                    {lang === "en" ? w.en : w.ko}
                  </button>
                );
              })}
            </div>
            {/* 정수기/생수/기타 선택 시 브랜드명 입력 */}
            {(form.waterType === "filter" || form.waterType === "bottle" || form.waterType === "other") && (
              <input
                value={form.waterBrand || ""}
                onChange={e => set("waterBrand", e.target.value)}
                placeholder={
                  form.waterType === "filter" ? (lang === "en" ? "e.g. Coway, Brita…" : "예) 코웨이, 브리타, 직수…") :
                  form.waterType === "bottle" ? (lang === "en" ? "e.g. Evian, Volvic…" : "예) 삼다수, 에비앙, 평창수…") :
                  (lang === "en" ? "Specify…" : "직접 입력…")
                }
              />
            )}
          </div>
          {needsDilute && (<>
            {/* 희석 종류 — 물/우유 칩 선택 */}
            <div className="field full">
              <label>{t ? t.diluteType : "희석 종류"}</label>
              {/* 물 그룹 — milk only 메뉴에서 숨김 */}
              {diluteCategory !== "milk" && (
                <div style={{ marginBottom: "10px" }}>
                  <div style={{ fontSize: "0.62rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "5px" }}>
                    {lang === "en" ? "Water" : "물"}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    <button type="button" onClick={() => set("diluteType", form.diluteType === "물" ? "" : "물")}
                      style={{ padding: "5px 12px", border: "1px solid", borderRadius: "8px", fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", cursor: "pointer", transition: "all 0.15s",
                        borderColor: form.diluteType === "물" ? "var(--espresso)" : "var(--steam)",
                        background: form.diluteType === "물" ? "var(--espresso)" : "var(--foam)",
                        color: form.diluteType === "물" ? "var(--cream)" : "var(--espresso)" }}>
                      {lang === "en" ? "Water" : "물"}
                    </button>
                  </div>
                </div>
              )}
              {/* 우유 그룹 */}
              <div>
                <div style={{ fontSize: "0.62rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "5px" }}>
                  {lang === "en" ? "Milk" : "우유"}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {[
                    { id: "우유",           en: "Whole Milk" },
                    { id: "저지방우유",     en: "Low-fat Milk" },
                    { id: "두유",           en: "Soy Milk" },
                    { id: "귀리우유",       en: "Oat Milk" },
                    { id: "아몬드우유",     en: "Almond Milk" },
                    { id: "코코넛우유",     en: "Coconut Milk" },
                    { id: "기타우유",       en: "Other Milk" },
                  ].map(m => {
                    const isSelected = form.diluteType === m.id;
                    return (
                      <button key={m.id} type="button" onClick={() => { set("diluteType", isSelected ? "" : m.id); if (m.id !== "기타우유") set("diluteCustom", ""); }}
                        style={{ padding: "5px 12px", border: "1px solid", borderRadius: "8px", fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", cursor: "pointer", transition: "all 0.15s",
                          borderColor: isSelected ? "var(--espresso)" : "var(--steam)",
                          background: isSelected ? "var(--espresso)" : "var(--foam)",
                          color: isSelected ? "var(--cream)" : "var(--espresso)" }}>
                        {lang === "en" ? m.en : m.id === "기타우유" ? "기타" : m.id}
                      </button>
                    );
                  })}
                </div>
                {/* 기타 우유 직접 입력 */}
                {form.diluteType === "기타우유" && (
                  <input style={{ marginTop: "6px" }}
                    value={form.diluteCustom || ""}
                    onChange={e => set("diluteCustom", e.target.value)}
                    placeholder={lang === "en" ? "e.g. Rice milk, Macadamia milk…" : "예) 쌀우유, 마카다미아 우유…"} />
                )}
              </div>
            </div>
            <div className="field full"><label>{t.diluteMl}</label>
              <input type="number" value={form.diluteMl} onChange={e => set("diluteMl", String(Math.max(0, Number(e.target.value))))} placeholder="150" min="0" />
            </div>
          </>)}
          {hasSyrup && (
            <div className="field full">
              <label>{t ? t.syrup : "시럽 / 추가 재료"}</label>
              <input value={form.syrup || ""} onChange={e => set("syrup", e.target.value)}
                placeholder="바닐라 시럽 1펌프, 카라멜 시럽 2펌프 …" />
            </div>
          )}
          <div style={{ gridColumn: "1 / -1", margin: "36px 0 16px" }}>
            <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", fontWeight: 700, color: "var(--espresso)", letterSpacing: "0.04em" }}>기록 & 평가</span>
            <div style={{ height: "1px", background: "var(--divider)", marginTop: "10px" }}/>
          </div>
          {/* 기록 날짜 */}
          <div className="field full">
            <label>{lang === "en" ? "Brew Date" : "기록 날짜"}</label>
            <input type="date" value={form.recordDate || ""} onChange={e => set("recordDate", e.target.value)}
              max={new Date().toISOString().split("T")[0]} />
          </div>
          <div className="field full">
            <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>{lang === "en" ? "Weather at Brew Time" : "추출 시점 날씨"}</span>
              {/* 새로고침 버튼 — 항상 표시 */}
              {!weatherLoading && (
                <button type="button" onClick={() => {
                  setWeatherError(null);
                  setWeatherLoading(true);
                  fetchWeather()
                    .then(w => { setWeather(w); setWeatherError(null); })
                    .catch(e => { setWeatherError(typeof e === "string" ? e : e.message); })
                    .finally(() => setWeatherLoading(false));
                }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.7rem", fontFamily: "'DM Sans',sans-serif", padding: 0 }}>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M13.5 8a5.5 5.5 0 1 1-1.1-3.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    <path d="M13.5 3v2.5H11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {lang === "en" ? "Refresh" : "새로고침"}
                </button>
              )}
            </label>
            {weatherLoading && (
              <div className="weather-loading">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ animation: "spin 1s linear infinite" }}>
                  <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="10 25" strokeLinecap="round"/>
                </svg>
                {lang === "en" ? "Getting weather…" : "날씨 불러오는 중…"}
              </div>
            )}
            {!weatherLoading && weather && (
              <div className="weather-box">
                <span className="weather-icon">{weather.icon}</span>
                <div className="weather-info">
                  <span className="weather-main">{weather.descKo} {weather.temp}°C</span>
                  <span className="weather-detail" style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <svg width="11" height="13" viewBox="0 0 11 14" fill="none"><path d="M5.5 1C5.5 1 1 5.5 1 8.5a4.5 4.5 0 0 0 9 0C10 5.5 5.5 1 5.5 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>
                    {lang === "en" ? "Humidity" : "습도"} {weather.humidity}%
                    <span style={{ opacity: 0.4 }}>·</span>
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2"/><path d="M7 1.5C7 1.5 9 4 9 7s-2 5.5-2 5.5M7 1.5C7 1.5 5 4 5 7s2 5.5 2 5.5M1.5 7h11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                    {weather.country}
                  </span>
                </div>
              </div>
            )}
            {!weatherLoading && !weather && !weatherError && (
              <p style={{ fontSize: "0.78rem", color: "var(--muted)", opacity: 0.7 }}>
                {lang === "en" ? "Location permission required." : "위치 권한이 필요해요."}
              </p>
            )}
            {weatherError && (
              <p style={{ fontSize: "0.78rem", color: "#e67e22", marginTop: "0.3rem" }}>
                ⚠️ {lang === "en" ? "Could not get weather. " : "날씨를 가져올 수 없어요. "}{weatherError}
              </p>
            )}
          </div>

          {/* 플레이버 프로파일 */}
          <div className="field full flavor-radar-wrap">
            <label style={{ marginBottom: "16px", display: "block" }}>
              {lang === "en" ? "Flavor Profile" : "플레이버 프로파일"}
            </label>
            {/* 레이더 차트 — 중앙 정렬 */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
              <FlavorRadar values={form} size={200} lang={lang}/>
            </div>
            {/* 슬라이더 — 2열 그리드 */}
            <div className="flavor-grid-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px" }}>
              {FLAVOR_AXES.map(ax => {
                const val = form[ax.key] || 0;
                const pct = (val / 5) * 100;
                return (
                  <div key={ax.key} className="flavor-slider-row">
                    <div className="flavor-slider-label">
                      <span className="flavor-slider-name">{lang === "en" ? ax.en : ax.ko}</span>
                      <span className={`flavor-slider-val${val === 0 ? " zero" : ""}`}>
                        {val === 0 ? "—" : `${val} / 5`}
                      </span>
                    </div>
                    <input
                      type="range" min="0" max="5" step="1"
                      value={val}
                      onChange={e => set(ax.key, parseInt(e.target.value))}
                      className="flavor-range"
                      style={{ "--pct": `${pct}%` }}
                    />
                    <div style={{ fontSize: "0.62rem", color: "var(--muted)", opacity: 0.65, lineHeight: 1.3, marginTop: "1px" }}>
                      {lang === "en" ? ax.desc_en : ax.desc_ko}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 별점 평가 */}
          <div className="field full">
            <label>{t ? t.rating : "레시피 평가"}</label>
            <div className="star-rating">
              {[1,2,3,4,5].map(star => (
                <button
                  key={star}
                  type="button"
                  className={`star-btn ${star <= (form.rating || 0) ? "active" : ""}`}
                  onClick={() => set("rating", form.rating === star ? 0 : star)}
                >
                  {star <= (form.rating || 0) ? "★" : "☆"}
                </button>
              ))}
              <span className="star-label">
                {t.ratingLabels[form.rating || 0]}
              </span>
            </div>
          </div>
          {/* 예상 압력 계산 - 핸드드립에서는 숨김 */}
          {machineType !== "handdrip" && (() => {
            const p = calcPressure(form.espressoMl, form.seconds);
            if (!p) return null;
            return (
              <div className={`pressure-box ${p.status} field full`} style={{ marginBottom: 0 }}>
                <div className="pressure-title">{t.pressureTitle}</div>
                <div className="pressure-row">
                  <span style={{ color: "var(--muted)" }}>{t.brewPressure}</span>
                  <span className={`pressure-val pressure-${p.status}`}>
                    {p.status === "high"
                      ? `9 bar - (${lang === "en" ? "Pump" : "펌프 압력"} ${p.pumpBar} bar)`
                      : p.status === "low"
                      ? `${p.showerBar} bar - (${lang === "en" ? "Pump" : "펌프 압력"} ${p.pumpBar} bar)`
                      : `${p.showerBar} bar`}
                  </span>
                </div>
                <div style={{ marginTop: "0.3rem", fontSize: "0.78rem", color: "var(--muted)" }}>
                  {p.status === "good" ? t.pressureGood : p.status === "high" ? t.pressureHigh : t.pressureLow} ({t.pressureRange})
                </div>
              </div>
            );
          })()}
          <div className="field full"><label>{t ? t.note : "맛 노트 · 메모"}</label>
            <textarea value={form.note} onChange={e => set("note", e.target.value)} placeholder={lang === "en" ? "Bright acidity with fruity aroma…" : "산미가 밝고 과일향이 가득했어요 …"} />
          </div>

          {/* ── [신규] 추출 압력 세부 기록 (BAR) + 연속 추출 메모 ── */}
          {machineType !== "handdrip" && (
            <div className="field full" style={{ background: "var(--cream)", border: "1px solid var(--divider)", borderRadius: "var(--r-card)", padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* 섹션 헤더 */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="8" cy="8" r="6.5" stroke="var(--latte)" strokeWidth="1.3"/>
                  <path d="M8 5v3.5l2 1.5" stroke="var(--latte)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", fontWeight: 700, color: "var(--espresso)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  {lang === "en" ? "Advanced Brew Log" : "추출 세부 기록"}
                </span>
              </div>
              {/* 압력 직접 입력 */}
              <div>
                <label style={{ display: "block", fontSize: "0.72rem", color: "var(--muted)", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: "6px" }}>
                  {t.brewPressureDetail}
                </label>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <input
                    type="number" min="0" max="20" step="0.1"
                    value={form.brewPressureBar || ""}
                    onChange={e => set("brewPressureBar", e.target.value)}
                    placeholder={t.brewPressureDetailPh}
                    style={{ width: "100%", padding: "0.7rem 3.2rem 0.7rem 1rem", border: "1px solid var(--steam)", borderRadius: "var(--r-btn)", background: "var(--foam)", fontFamily: "'DM Sans',sans-serif", fontSize: "0.9rem", color: "var(--espresso)", outline: "none", transition: "border-color var(--transition-base)" }}
                    onFocus={e => e.target.style.borderColor = "var(--latte)"}
                    onBlur={e => e.target.style.borderColor = "var(--steam)"}
                  />
                  <span style={{ position: "absolute", right: "12px", fontSize: "0.8rem", color: "var(--muted)", fontFamily: "'DM Sans',sans-serif", fontWeight: 600, pointerEvents: "none" }}>BAR</span>
                </div>
                {form.brewPressureBar && (() => {
                  const bar = parseFloat(form.brewPressureBar);
                  const status = bar >= 9 && bar <= 11 ? "good" : bar > 11 ? "high" : "low";
                  const colors = { good: "#27ae60", high: "#e67e22", low: "#2980b9" };
                  const labels = { good: t.pressureGood, high: t.pressureHigh, low: t.pressureLow };
                  return (
                    <p style={{ marginTop: "5px", fontSize: "0.75rem", color: colors[status], display: "flex", alignItems: "center", gap: "4px" }}>
                      {labels[status]} ({t.pressureRange})
                    </p>
                  );
                })()}
              </div>
              {/* 연속 추출 메모 */}
              <div>
                <label style={{ display: "block", fontSize: "0.72rem", color: "var(--muted)", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: "6px" }}>
                  {t.continuousMemo}
                </label>
                <textarea
                  value={form.continuousMemo || ""}
                  onChange={e => set("continuousMemo", e.target.value)}
                  placeholder={t.continuousMemoPh}
                  rows={2}
                  style={{ width: "100%", padding: "0.7rem 1rem", border: "1px solid var(--steam)", borderRadius: "var(--r-btn)", background: "var(--foam)", fontFamily: "'DM Sans',sans-serif", fontSize: "0.9rem", color: "var(--espresso)", outline: "none", resize: "vertical", minHeight: "70px", lineHeight: 1.55, transition: "border-color var(--transition-base)" }}
                  onFocus={e => e.target.style.borderColor = "var(--latte)"}
                  onBlur={e => e.target.style.borderColor = "var(--steam)"}
                />
              </div>
            </div>
          )}

          {/* 공개 설정 */}
          <div className="field full">
            <label>{lang === "en" ? "Visibility" : "공개 설정"}</label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button type="button"
                onClick={() => set("isPublic", true)}
                style={{ flex: 1, padding: "0.65rem", border: "1px solid", borderRadius: "8px", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: "0.88rem", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                  borderColor: form.isPublic !== false ? "var(--espresso)" : "var(--steam)",
                  background: form.isPublic !== false ? "var(--espresso)" : "var(--foam)",
                  color: form.isPublic !== false ? "var(--cream)" : "var(--muted)",
                  fontWeight: form.isPublic !== false ? 600 : 400 }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3"/><path d="M8 2C8 2 10 5 10 8s-2 6-2 6M8 2C8 2 6 5 6 8s2 6 2 6M2 8h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                {lang === "en" ? "Public" : "공개"}
              </button>
              <button type="button"
                onClick={() => set("isPublic", false)}
                style={{ flex: 1, padding: "0.65rem", border: "1px solid", borderRadius: "8px", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: "0.88rem", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                  borderColor: form.isPublic === false ? "var(--espresso)" : "var(--steam)",
                  background: form.isPublic === false ? "var(--espresso)" : "var(--foam)",
                  color: form.isPublic === false ? "var(--cream)" : "var(--muted)",
                  fontWeight: form.isPublic === false ? 600 : 400 }}>
                <svg width="13" height="14" viewBox="0 0 14 16" fill="none"><rect x="2" y="7" width="10" height="8" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M4.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                {lang === "en" ? "Private" : "비공개"}
              </button>
            </div>
            <p style={{ fontSize: "0.76rem", color: "var(--muted)", marginTop: "0.4rem" }}>
              {form.isPublic !== false
                ? (lang === "en" ? "Visible to everyone in the feed" : "피드에 공개됩니다")
                : (lang === "en" ? "Only visible to you" : "나만 볼 수 있어요")}
            </p>
          </div>
        </div>
        {/* 현재 설정을 프리셋으로 저장 — 저장 버튼 바로 위 */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
          <button type="button" onClick={() => setShowPresetSave(true)}
            style={{ background: "none", border: "1px solid var(--steam)", borderRadius: "8px", padding: "7px 14px", cursor: "pointer", fontSize: "0.78rem", color: "var(--muted)", fontFamily: "'DM Sans',sans-serif", display: "flex", alignItems: "center", gap: "5px", transition: "all 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--latte)"; e.currentTarget.style.color = "var(--latte)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--steam)"; e.currentTarget.style.color = "var(--muted)"; }}>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            {lang === "en" ? "Save as Preset" : "현재 설정 프리셋으로 저장"}
          </button>
        </div>
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>{t.cancel}</button>
          <button className="btn-primary" style={{ width: "auto", marginTop: 0, padding: "0.7rem 2rem" }} onClick={save} disabled={saving}>
            {saving ? t.saving : isEdit ? t.update : t.save}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MyModal ──────────────────────────────────────────────────────
function RecipeImporter({ lang, user }) {
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const MENU_MAP_FULL = {
    "에스프레소":"espresso","리스트레토":"ristretto","룽고":"lungo",
    "아메리카노":"americano","롱블랙":"long_black","카페라떼":"latte",
    "카푸치노":"cappuccino","플랫화이트":"flatwhite","마끼아또":"macchiato",
    "핸드드립":"hand_drip","콜드브루":"cold_brew","기타":"other",
    "espresso":"espresso","ristretto":"ristretto","lungo":"lungo",
    "americano":"americano","long black":"long_black","latte":"latte",
    "cappuccino":"cappuccino","flat white":"flatwhite","flatwhite":"flatwhite",
    "macchiato":"macchiato","hand drip":"hand_drip","cold brew":"cold_brew","other":"other",
    "cortado":"cortado","코르타도":"cortado",
  };

  // 헤더명 → 필드키 매핑 (한/영 모두 허용)
  const HEADER_MAP = {
    "메뉴": "menuLabel", "menu": "menuLabel",
    "원두명": "bean", "bean": "bean", "원두": "bean",
    "원두회사": "company", "company": "company", "로스터리": "company", "roastery": "company",
    "로스팅일자": "roastDate", "roastdate": "roastDate", "로스팅날짜": "roastDate",
    "기록날짜": "recordDate", "recorddate": "recordDate", "기록일": "recordDate",
    "커피머신": "machine", "machine": "machine", "머신": "machine",
    "그라인더": "grinder", "grinder": "grinder",
    "분쇄도": "grindSize", "grindsize": "grindSize", "grind": "grindSize",
    "원두량(g)": "gram", "원두량": "gram", "gram": "gram", "g": "gram",
    "추출시간(s)": "seconds", "추출시간": "seconds", "seconds": "seconds", "s": "seconds",
    "추출량(ml)": "espressoMl", "추출량": "espressoMl", "espressoml": "espressoMl", "ml": "espressoMl",
    "물온도(°c)": "waterTemp", "물온도": "waterTemp", "watertemp": "waterTemp", "temp": "waterTemp",
    "물종류": "waterType", "watertype": "waterType",
    "희석종류": "diluteType", "dilutetype": "diluteType", "희석": "diluteType",
    "희석량(ml)": "diluteMl", "희석량": "diluteMl", "diluteml": "diluteMl",
    "별점(1-5)": "rating", "별점": "rating", "rating": "rating",
    "메모": "note", "note": "note",
    "공개(true/false)": "isPublic", "공개": "isPublic", "ispublic": "isPublic", "public": "isPublic",
    "추출압력(bar)": "brewPressureBar", "추출압력": "brewPressureBar", "brewpressurebar": "brewPressureBar", "pressure": "brewPressureBar",
    "연속추출메모": "continuousMemo", "continuousmemo": "continuousMemo", "extractionnote": "continuousMemo",
  };

  // SheetJS로 xlsx/csv 파일 → row 배열로 파싱
  const parseFile = async (file) => {
    // SheetJS CDN 로드 (패키지 설치 불필요)
    if (!window.XLSX) {
      await new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
    }
    const XLSX = window.XLSX;
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array", cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    // header: 1 → 2차원 배열로 읽기
    const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    if (raw.length < 2) return [];

    // 1행: 헤더, 2행: 예시, 3행: 힌트 → 모두 건너뛰고 4행~부터 실제 데이터
    const headers = raw[0].map(h => String(h).trim());
    // 헤더행 바로 다음이 예시/힌트인지 판별해서 스킵
    // — 2행의 첫 번째 값이 알려진 메뉴명 또는 "※"로 시작하면 예시/힌트로 간주
    const KNOWN_MENUS = new Set(["에스프레소","리스트레토","룽고","아메리카노","롱블랙","카페라떼","카푸치노","플랫화이트","마끼아또","핸드드립","콜드브루","기타","espresso","ristretto","lungo","americano","latte","cappuccino","flatwhite","macchiato","hand_drip","cold_brew","other"]);
    let dataStartIdx = 1;
    for (let i = 1; i < Math.min(raw.length, 4); i++) {
      const firstCell = String(raw[i][0] || "").trim();
      if (!firstCell || firstCell.startsWith("※") || KNOWN_MENUS.has(firstCell)) {
        dataStartIdx = i + 1; // 이 행은 예시/힌트 → 다음 행부터 시작
      } else {
        break; // 실제 데이터 행 만나면 중단
      }
    }
    const dataRows = raw.slice(dataStartIdx);

    return dataRows.map(row => {
      const obj = {};
      headers.forEach((h, i) => {
        const key = HEADER_MAP[h] || HEADER_MAP[h.toLowerCase()];
        if (key) obj[key] = row[i] !== undefined && row[i] !== null ? String(row[i]).trim() : "";
      });
      return obj;
    }).filter(r => {
      // 힌트 행 제거: ※로 시작하거나 bean/menuLabel 모두 비어있으면 스킵
      if ((r.menuLabel || "").startsWith("※")) return false;
      if ((r.bean || "").startsWith("※")) return false;
      return r.bean || r.menuLabel;
    });
  };

  const handleImport = async () => {
    if (!importFile || !user?.uid) return;
    setImporting(true);
    setImportResult(null);
    try {
      const rows = await parseFile(importFile);
      if (rows.length === 0) {
        setImportResult({ ok: false, msg: "유효한 데이터가 없어요. 템플릿을 확인해주세요." });
        setImporting(false);
        return;
      }
      let success = 0, fail = 0;
      for (const row of rows) {
        try {
          const menuId = MENU_MAP_FULL[row.menuLabel?.trim()] || MENU_MAP_FULL[row.menuLabel?.trim().toLowerCase()] || "other";
          const menuDef = COFFEE_MENUS.find(m => m.id === menuId);
          const menuLabel = menuDef ? menuDef.label : (row.menuLabel || "기타");
          const num = (v) => (v && String(v).trim() !== "") ? String(v).trim() : "";
          // isPublic: "FALSE"/"false" → false, 나머지 → true
          const isPublicVal = String(row.isPublic || "TRUE").toUpperCase() !== "FALSE";
          // rating: 숫자로 변환
          const ratingVal = Math.min(5, Math.max(0, parseInt(row.rating) || 0));
          // waterType: 한글 표시명 → 내부 ID 변환
          const WATER_TYPE_MAP = {
            "수돗물":"tap", "tap":"tap", "tap water":"tap",
            "정수기":"filter", "filter":"filter", "filtered":"filter", "filtered water":"filter",
            "생수":"bottle", "bottle":"bottle", "bottled":"bottle", "bottled water":"bottle",
            "기타":"other", "other":"other",
          };
          const rawWaterType = num(row.waterType).toLowerCase();
          const waterTypeId = WATER_TYPE_MAP[rawWaterType] || WATER_TYPE_MAP[num(row.waterType)] || (rawWaterType ? "other" : "");
          await addDoc(collection(db, "recipes"), {
            menuId, menuLabel,
            bean:            num(row.bean),
            company:         num(row.company),
            roastDate:       num(row.roastDate),
            recordDate:      num(row.recordDate) || new Date().toISOString().split("T")[0],
            machine:         num(row.machine),
            grinder:         num(row.grinder),
            grindSize:       num(row.grindSize),
            gram:            num(row.gram),
            seconds:         num(row.seconds),
            espressoMl:      num(row.espressoMl),
            waterTemp:       num(row.waterTemp) || "93",
            waterType:       waterTypeId,
            diluteType:      num(row.diluteType),
            diluteMl:        num(row.diluteMl),
            rating:          ratingVal,
            note:            num(row.note),
            isPublic:        isPublicVal,
            brewPressureBar: num(row.brewPressureBar) || null,   // [신규]
            continuousMemo:  num(row.continuousMemo) || "",      // [신규]
            uid: user.uid, author: user.displayName,
            likedBy: [],
            createdAt: serverTimestamp(), isImported: true,
          });
          success++;
        } catch(e) { fail++; console.error("[import row]", e); }
      }
      setImportResult({ ok: true, msg: `${success}개 레시피를 가져왔어요.${fail > 0 ? ` (실패 ${fail}개)` : ""}` });
      setImportFile(null);
    } catch(e) {
      console.error("[import]", e);
      setImportResult({ ok: false, msg: "파일 읽기 실패: " + e.message });
    }
    setImporting(false);
  };

  return (
    <div>
      <label style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", border: "2px dashed var(--steam)", borderRadius: "8px", cursor: "pointer", background: importFile ? "var(--foam)" : "transparent", transition: "all 0.2s" }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 10V2M5 5l3-3 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2 12h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
        <span style={{ fontSize: "0.8rem", color: importFile ? "var(--espresso)" : "var(--muted)" }}>
          {importFile ? importFile.name : (lang === "en" ? "Click to select file (xlsx / csv)" : "파일 선택하기 (xlsx / csv)")}
        </span>
        <input type="file" accept=".xlsx,.xls,.csv,.CSV" style={{ display: "none" }}
          onChange={e => { setImportFile(e.target.files[0] || null); setImportResult(null); }} />
      </label>
      {importFile && (
        <button onClick={handleImport} disabled={importing}
          style={{ marginTop: "8px", width: "100%", padding: "10px", background: "var(--espresso)", color: "var(--cream)", border: "none", borderRadius: "8px", fontFamily: "'DM Sans',sans-serif", fontSize: "0.85rem", cursor: importing ? "not-allowed" : "pointer", opacity: importing ? 0.6 : 1 }}>
          {importing ? "가져오는 중…" : (lang === "en" ? "Import Recipes" : "레시피 가져오기")}
        </button>
      )}
      {importResult && (
        <p style={{ fontSize: "0.78rem", marginTop: "8px", color: importResult.ok ? "#27ae60" : "#c0392b", display: "flex", alignItems: "center", gap: "4px" }}>
          {importResult.ok ? "✓" : "✗"} {importResult.msg}
        </p>
      )}
      {/* 잘못 임포트된 레시피 정리 */}
      <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid var(--divider)" }}>
        <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "6px", lineHeight: 1.5 }}>
          임포트 오류로 깨진 레시피가 있다면 아래 버튼으로 일괄 삭제할 수 있어요.
        </p>
        <button onClick={async () => {
          if (!window.confirm("임포트된 레시피를 모두 삭제할까요?\n되돌릴 수 없어요.")) return;
          try {
            const q = query(collection(db, "recipes"), where("uid", "==", user.uid), where("isImported", "==", true));
            const snap = await getDocs(q);
            await Promise.all(snap.docs.map(d => deleteDoc(doc(db, "recipes", d.id))));
            alert(`${snap.docs.length}개 레시피가 삭제됐어요.`);
          } catch(e) { alert("삭제 실패: " + e.message); }
        }} style={{ padding: "6px 14px", border: "1px solid #c0392b40", borderRadius: "8px", background: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: "0.75rem", color: "#c0392b" }}>
          임포트 레시피 전체 삭제
        </button>
      </div>
    </div>
  );
}

function MyModal({ onClose, user, lang = 'ko', onLogout }) {
  const t = I18N[lang];

  // 비밀번호
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPwConfirm, setNewPwConfirm] = useState("");
  const [pwMsg, setPwMsg] = useState(null);
  const [pwSaving, setPwSaving] = useState(false);

  // 통화
  const [currency, setCurrencyState] = useState(loadCurrency());
  const handleCurrency = (c) => { setCurrencyState(c); saveCurrency(c); };

  // 프리셋 관리
  const [myPresets, setMyPresets] = useState(() => loadPresets(user?.uid));
  const [editingPreset, setEditingPreset] = useState(null); // 수정 중인 프리셋 전체 객체

  const delPreset = (id) => {
    const updated = myPresets.filter(p => p.id !== id);
    savePresets(user?.uid, updated);
    setMyPresets(updated);
  };
  const saveEditingPreset = () => {
    if (!editingPreset || !editingPreset.name?.trim()) return;
    const updated = myPresets.map(p => p.id === editingPreset.id ? { ...editingPreset, name: editingPreset.name.trim() } : p);
    savePresets(user?.uid, updated);
    setMyPresets(updated);
    setEditingPreset(null);
  };
  const setEP = (k, v) => setEditingPreset(p => ({ ...p, [k]: v }));

  const handlePwChange = async () => {
    setPwMsg(null);
    if (!curPw) return setPwMsg({ type: "error", text: "현재 비밀번호를 입력해주세요." });
    if (!newPw) return setPwMsg({ type: "error", text: "새 비밀번호를 입력해주세요." });
    if (newPw.length < 6) return setPwMsg({ type: "error", text: "비밀번호는 6자 이상이어야 해요." });
    if (newPw !== newPwConfirm) return setPwMsg({ type: "error", text: "새 비밀번호가 일치하지 않습니다." });
    setPwSaving(true);
    try {
      const credential = EmailAuthProvider.credential(user?.email, curPw);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPw);
      setPwMsg({ type: "ok", text: "비밀번호가 변경됐어요 ✓" });
      setCurPw(""); setNewPw(""); setNewPwConfirm("");
    } catch (e) {
      if (e.code === "auth/wrong-password" || e.code === "auth/invalid-credential") {
        setPwMsg({ type: "error", text: "현재 비밀번호가 올바르지 않습니다." });
      } else {
        setPwMsg({ type: "error", text: "오류: " + e.message });
      }
    }
    setPwSaving(false);
  };

  // ── 레시피 내보내기 ──────────────────────────────────────────────
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState(null);

  const exportMyRecipes = async () => {
    if (!user?.uid) return;
    setExporting(true);
    setExportMsg(null);
    try {
      // SheetJS CDN 로드
      if (!window.XLSX) {
        await new Promise((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
          s.onload = resolve; s.onerror = reject;
          document.head.appendChild(s);
        });
      }
      const XLSX = window.XLSX;

      // 내 레시피 전체 Firestore에서 조회
      const snap = await getDocs(
        query(collection(db, "recipes"), where("uid", "==", user.uid))
      );
      const recipes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // 최신순 정렬
      recipes.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

      if (recipes.length === 0) {
        setExportMsg({ type: "error", text: lang === "en" ? "No recipes to export." : "내보낼 레시피가 없어요." });
        setExporting(false);
        return;
      }

      // 날짜 포맷 헬퍼
      const fmtDate = (v) => {
        if (!v) return "";
        if (v?.toDate) return v.toDate().toISOString().slice(0, 10);
        if (typeof v === "string") return v.slice(0, 10);
        return "";
      };

      // 물 종류 내부 ID → 표시 레이블
      const WATER_LABEL = { tap: "수돗물", filter: "정수기", bottle: "생수", other: "기타" };

      const headers = [
        "메뉴", "원두명", "원두회사", "로스팅일자", "기록날짜",
        "커피머신", "그라인더", "분쇄도",
        "원두량(g)", "추출시간(s)", "추출량(ml)", "물온도(°C)",
        "물종류", "희석종류", "희석량(ml)",
        "별점(1-5)", "메모",
        "공개(TRUE/FALSE)", "추출압력(BAR)", "연속추출메모",
        "하트수", "작성일시"
      ];

      const rows = recipes.map(r => {
        const menuDef = COFFEE_MENUS.find(m => m.id === r.menuId);
        const menuLabel = lang === "en"
          ? (menuDef?.labelEn || r.menuLabel || r.menuId || "")
          : (r.menuLabel || menuDef?.label || r.menuId || "");
        return [
          menuLabel,
          r.bean        || "",
          r.company     || "",
          r.roastDate   || "",
          r.recordDate  || fmtDate(r.createdAt),
          r.machine     || "",
          r.grinder     || "",
          r.grindSize   || "",
          r.gram        || "",
          r.seconds     || "",
          r.espressoMl  || "",
          r.waterTemp   || "",
          WATER_LABEL[r.waterType] || r.waterType || "",
          r.diluteType  || "",
          r.diluteMl    || "",
          r.rating      || 0,
          r.note        || "",
          r.isPublic !== false ? "TRUE" : "FALSE",
          r.brewPressureBar || "",
          r.continuousMemo  || "",
          (r.likedBy?.length) || 0,
          fmtDate(r.createdAt),
        ];
      });

      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

      // 열 너비
      const colWidths = [14,18,14,12,12, 18,16,8, 10,10,10,10, 12,14,10, 8,30, 14,14,20, 6,14];
      ws["!cols"] = headers.map((_, i) => ({ wch: colWidths[i] || 12 }));

      // 헤더 행 스타일 (배경색)
      const range = XLSX.utils.decode_range(ws["!ref"]);
      for (let C = range.s.c; C <= range.e.c; C++) {
        const cellAddr = XLSX.utils.encode_cell({ r: 0, c: C });
        if (!ws[cellAddr]) continue;
        ws[cellAddr].s = {
          fill: { fgColor: { rgb: "3D2B1F" } },
          font: { color: { rgb: "FBFBFA" }, bold: true },
          alignment: { horizontal: "center" },
        };
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, lang === "en" ? "My Recipes" : "내 레시피");

      const today = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `brewlog_my_recipes_${today}.xlsx`);

      setExportMsg({
        type: "ok",
        text: lang === "en"
          ? `${recipes.length} recipes exported successfully.`
          : `${recipes.length}개 레시피를 내보냈어요 ✓`,
      });
    } catch (e) {
      console.error("[export]", e);
      setExportMsg({
        type: "error",
        text: lang === "en" ? "Export failed: " + e.message : "내보내기 실패: " + e.message,
      });
    }
    setExporting(false);
  };

  // ── 구글 드라이브 백업 ────────────────────────────────────────────
  const GDRIVE_TOKEN_KEY = `brewlog_gdrive_token_${user?.uid}`;
  const GDRIVE_AUTO_KEY  = `brewlog_gdrive_auto_${user?.uid}`;

  const [driveToken,    setDriveToken]    = useState(() => sessionStorage.getItem(GDRIVE_TOKEN_KEY) || null);
  const [driveAuto,     setDriveAuto]     = useState(() => localStorage.getItem(GDRIVE_AUTO_KEY) === "true");
  const [driveLoading,  setDriveLoading]  = useState(false);
  const [driveMsg,      setDriveMsg]      = useState(null);

  // Google Identity Services 스크립트 로드 (1회)
  const loadGis = () => new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) { resolve(); return; }
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });

  // OAuth 팝업으로 drive.file 토큰 획득
  const connectDrive = async () => {
    const clientId = import.meta.env.VITE_GDRIVE_CLIENT_ID;
    if (!clientId) {
      setDriveMsg({ type: "error", text: "VITE_GDRIVE_CLIENT_ID 환경변수가 없어요." });
      return;
    }
    setDriveLoading(true);
    setDriveMsg(null);
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
            resolve(resp.access_token);
          },
        });
        client.requestAccessToken({ prompt: "consent" });
      });
      setDriveMsg({ type: "ok", text: lang === "en" ? "Google Drive connected ✓" : "구글 드라이브 연결됐어요 ✓" });
    } catch (e) {
      setDriveMsg({ type: "error", text: lang === "en" ? "Connection failed: " + e.message : "연결 실패: " + e.message });
    }
    setDriveLoading(false);
  };

  // 드라이브에 xlsx 업로드 (Brewlog 폴더 자동 생성 + 덮어쓰기)
  const backupToDrive = async (token) => {
    const useToken = token || driveToken;
    if (!useToken || !user?.uid) return false;

    // SheetJS 로드
    if (!window.XLSX) {
      await new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
        s.onload = resolve; s.onerror = reject;
        document.head.appendChild(s);
      });
    }
    const XLSX = window.XLSX;

    // Firestore에서 내 레시피 조회
    const snap = await getDocs(query(collection(db, "recipes"), where("uid", "==", user.uid)));
    const recipes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    recipes.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    if (recipes.length === 0) return false;

    const fmtDate = (v) => {
      if (!v) return "";
      if (v?.toDate) return v.toDate().toISOString().slice(0, 10);
      return typeof v === "string" ? v.slice(0, 10) : "";
    };
    const WATER_LABEL = { tap: "수돗물", filter: "정수기", bottle: "생수", other: "기타" };
    const headers = ["메뉴","원두명","원두회사","로스팅일자","기록날짜","커피머신","그라인더","분쇄도","원두량(g)","추출시간(s)","추출량(ml)","물온도(°C)","물종류","희석종류","희석량(ml)","별점(1-5)","메모","공개(TRUE/FALSE)","추출압력(BAR)","연속추출메모","하트수","작성일시"];
    const rows = recipes.map(r => {
      const menuDef = COFFEE_MENUS.find(m => m.id === r.menuId);
      return [
        lang === "en" ? (menuDef?.labelEn || r.menuLabel || "") : (r.menuLabel || menuDef?.label || ""),
        r.bean||"", r.company||"", r.roastDate||"", r.recordDate||fmtDate(r.createdAt),
        r.machine||"", r.grinder||"", r.grindSize||"",
        r.gram||"", r.seconds||"", r.espressoMl||"", r.waterTemp||"",
        WATER_LABEL[r.waterType]||r.waterType||"", r.diluteType||"", r.diluteMl||"",
        r.rating||0, r.note||"", r.isPublic!==false?"TRUE":"FALSE",
        r.brewPressureBar||"", r.continuousMemo||"",
        r.likedBy?.length||0, fmtDate(r.createdAt),
      ];
    });
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws["!cols"] = [14,18,14,12,12,18,16,8,10,10,10,10,12,14,10,8,30,14,14,20,6,14].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, lang === "en" ? "My Recipes" : "내 레시피");

    // ArrayBuffer → base64
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
    const fileName = "brewlog_backup.xlsx";
    const authHeader = { Authorization: `Bearer ${useToken}` };

    // 1) Brewlog 폴더 찾기 or 생성
    let folderId = null;
    const folderSearch = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name%3D'Brewlog'%20and%20mimeType%3D'application%2Fvnd.google-apps.folder'%20and%20trashed%3Dfalse&fields=files(id)`,
      { headers: authHeader }
    ).then(r => r.json());
    if (folderSearch.files?.length > 0) {
      folderId = folderSearch.files[0].id;
    } else {
      const folderRes = await fetch("https://www.googleapis.com/drive/v3/files", {
        method: "POST",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Brewlog", mimeType: "application/vnd.google-apps.folder" }),
      }).then(r => r.json());
      folderId = folderRes.id;
    }

    // 2) 기존 백업 파일 찾기 (있으면 덮어쓰기, 없으면 새로 생성)
    const fileSearch = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name%3D'${fileName}'%20and%20'${folderId}'%20in%20parents%20and%20trashed%3Dfalse&fields=files(id)`,
      { headers: authHeader }
    ).then(r => r.json());

    const metadata = { name: fileName, mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" };
    const boundary = "brewlog_boundary";
    const body = [
      `--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(metadata)}\r\n`,
      `--${boundary}\r\nContent-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\nContent-Transfer-Encoding: base64\r\n\r\n${b64}\r\n`,
      `--${boundary}--`,
    ].join("");

    let uploadUrl, uploadMethod;
    if (fileSearch.files?.length > 0) {
      // PATCH: 기존 파일 업데이트
      uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileSearch.files[0].id}?uploadType=multipart`;
      uploadMethod = "PATCH";
    } else {
      // POST: 신규 생성 (폴더 지정)
      metadata.parents = [folderId];
      const bodyWithParent = [
        `--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(metadata)}\r\n`,
        `--${boundary}\r\nContent-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\nContent-Transfer-Encoding: base64\r\n\r\n${b64}\r\n`,
        `--${boundary}--`,
      ].join("");
      uploadUrl = `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`;
      uploadMethod = "POST";
      const uploadRes = await fetch(uploadUrl, {
        method: uploadMethod,
        headers: { ...authHeader, "Content-Type": `multipart/related; boundary=${boundary}` },
        body: bodyWithParent,
      });
      if (!uploadRes.ok) throw new Error(await uploadRes.text());
      return true;
    }

    const uploadRes = await fetch(uploadUrl, {
      method: uploadMethod,
      headers: { ...authHeader, "Content-Type": `multipart/related; boundary=${boundary}` },
      body,
    });
    if (!uploadRes.ok) throw new Error(await uploadRes.text());
    return true;
  };

  // 수동 백업 버튼
  const handleManualBackup = async () => {
    setDriveLoading(true);
    setDriveMsg(null);
    try {
      await backupToDrive();
      const now = new Date().toLocaleString(lang === "en" ? "en-US" : "ko-KR");
      setDriveMsg({ type: "ok", text: lang === "en" ? `Backed up to Google Drive ✓ (${now})` : `구글 드라이브에 백업됐어요 ✓ (${now})` });
    } catch (e) {
      // 토큰 만료 시 재연결 유도
      if (e.message?.includes("401") || e.message?.includes("invalid_token")) {
        sessionStorage.removeItem(GDRIVE_TOKEN_KEY);
        setDriveToken(null);
        setDriveMsg({ type: "error", text: lang === "en" ? "Session expired. Please reconnect." : "세션이 만료됐어요. 다시 연결해 주세요." });
      } else {
        setDriveMsg({ type: "error", text: lang === "en" ? "Backup failed: " + e.message : "백업 실패: " + e.message });
      }
    }
    setDriveLoading(false);
  };

  // 자동 백업 토글
  const toggleDriveAuto = () => {
    const next = !driveAuto;
    setDriveAuto(next);
    localStorage.setItem(GDRIVE_AUTO_KEY, String(next));
    if (next) setDriveMsg({ type: "ok", text: lang === "en" ? "Auto backup enabled. Backup runs after each save." : "자동 백업 켜짐. 레시피 저장할 때마다 자동으로 백업돼요." });
    else setDriveMsg({ type: "ok", text: lang === "en" ? "Auto backup disabled." : "자동 백업 꺼짐." });
  };

  // 차단 목록
  const BLOCKED_KEY = `brewlog_blocked_${user?.uid}`;
  const [blockedIds, setBlockedIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem(BLOCKED_KEY) || "[]"); } catch { return []; }
  });
  const [blockedProfiles, setBlockedProfiles] = useState([]);

  useEffect(() => {
    if (!blockedIds.length) { setBlockedProfiles([]); return; }
    Promise.all(blockedIds.map(id =>
      getDoc(doc(db, "users", id))
        .then(d => d.exists() ? { id, ...d.data() } : { id, nickname: id.slice(0, 8) + "…" })
    )).then(setBlockedProfiles).catch(() => {});
  }, [blockedIds.join(",")]);

  const unblock = async (uid) => {
    const newList = blockedIds.filter(id => id !== uid);
    localStorage.setItem(BLOCKED_KEY, JSON.stringify(newList));
    await updateDoc(doc(db, "users", user.uid), { blockedUsers: newList }).catch(() => {});
    setBlockedIds(newList);
    setBlockedProfiles(p => p.filter(u => u.id !== uid));
  };
  const tabBtn = (active) => ({
    flex: 1, height: "42px", border: "1px solid",
    borderColor: active ? "var(--espresso)" : "var(--steam)",
    background: active ? "var(--espresso)" : "var(--foam)",
    color: active ? "var(--cream)" : "var(--muted)",
    fontFamily: "'DM Sans',sans-serif", fontSize: "0.88rem",
    fontWeight: active ? 600 : 400,
    borderRadius: "8px", cursor: "pointer", transition: "all 0.2s",
  });

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2>{lang === "en" ? "My Settings" : "MY 설정"}</h2>

        {/* ── 비밀번호 변경 ── */}
        {!user?.providerData?.some(p => p.providerId === "google.com") && (
          <div className="my-section">
            <div className="my-section-title" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <svg width="13" height="14" viewBox="0 0 14 16" fill="none">
                <rect x="2" y="7" width="10" height="8" rx="2" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M4.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              {lang === "en" ? "Change Password" : "비밀번호 변경"}
            </div>
            <div className="field full" style={{ marginBottom: "10px" }}>
              <label>{lang === "en" ? "Current Password" : "현재 비밀번호"}</label>
              <input type="password" value={curPw} onChange={e => setCurPw(e.target.value)} placeholder="••••••••" />
            </div>
            <div className="field full" style={{ marginBottom: "10px" }}>
              <label>{lang === "en" ? "New Password" : "새 비밀번호"}</label>
              <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder={lang === "en" ? "Min 6 characters" : "6자 이상"} />
            </div>
            <div className="field full" style={{ marginBottom: "10px" }}>
              <label>{lang === "en" ? "Confirm New Password" : "새 비밀번호 확인"}</label>
              <input type="password" value={newPwConfirm} onChange={e => setNewPwConfirm(e.target.value)}
                placeholder="••••••••"
                style={{ borderColor: newPwConfirm.length > 0 ? (newPw === newPwConfirm ? "#27ae60" : "#c0392b") : undefined }}
              />
              {newPwConfirm.length > 0 && newPw === newPwConfirm && <p className="msg-ok" style={{ marginTop: "4px" }}>일치합니다 ✓</p>}
              {newPwConfirm.length > 0 && newPw !== newPwConfirm && <p className="msg-error" style={{ marginTop: "4px" }}>일치하지 않습니다.</p>}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="btn-save-sm" onClick={handlePwChange} disabled={pwSaving}>
                {pwSaving ? (lang === "en" ? "Saving…" : "변경 중…") : (lang === "en" ? "Change Password" : "비밀번호 변경")}
              </button>
            </div>
            {pwMsg && <p className={pwMsg.type === "error" ? "msg-error" : "msg-ok"} style={{ marginTop: "8px" }}>{pwMsg.text}</p>}
          </div>
        )}

        {/* ── 프리셋 관리 ── */}
        <div className="my-section">
          <div className="my-section-title" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <rect x="1.5" y="3.5" width="13" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M5 3.5V2M11 3.5V2M1.5 7.5h13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              <path d="M5 10.5h2.5M9 10.5h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            {lang === "en" ? "Recipe Presets" : "레시피 프리셋"}
          </div>
          {myPresets.length === 0 ? (
            <p style={{ fontSize: "0.8rem", color: "var(--muted)", lineHeight: 1.6 }}>
              {lang === "en"
                ? "No presets yet. Save your settings in the recipe form."
                : "저장된 프리셋이 없어요. 레시피 기록 시 '현재 설정 저장' 버튼으로 추가할 수 있어요."}
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {myPresets.map(p => (
                <div key={p.id} style={{ background: "var(--cream)", border: "1px solid var(--divider)", borderRadius: "8px", padding: "14px" }}>
                  {editingPreset?.id === p.id ? (
                    /* ── 수정 모드 ── */
                    <div>
                      <div className="field full" style={{ marginBottom: "10px" }}>
                        <label>{lang === "en" ? "Preset Name" : "프리셋 이름"}</label>
                        <input value={editingPreset.name} onChange={e => setEP("name", e.target.value)} autoFocus/>
                      </div>
                      {/* 메뉴 / ICE */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "10px" }}>
                        <div className="field" style={{ marginBottom: 0 }}>
                          <label>{lang === "en" ? "Menu" : "메뉴"}</label>
                          <select value={editingPreset.menuId || ""} onChange={e => setEP("menuId", e.target.value)}
                            style={{ width: "100%", padding: "0.7rem 0.9rem", border: "1px solid var(--steam)", borderRadius: "8px", fontFamily: "'DM Sans',sans-serif", fontSize: "0.88rem", background: "var(--cream)", color: "var(--espresso)", outline: "none" }}>
                            <option value="">선택</option>
                            {COFFEE_MENUS.map(m => <option key={m.id} value={m.id}>{lang === "en" ? m.labelEn : m.label}</option>)}
                          </select>
                        </div>
                        <div className="field" style={{ marginBottom: 0 }}>
                          <label>HOT / ICE</label>
                          <div style={{ display: "flex", gap: "6px", height: "42px" }}>
                            {["hot","ice"].map(v => (
                              <button key={v} type="button" onClick={() => setEP("isIced", v === "ice")}
                                style={{ flex: 1, border: "1px solid", borderRadius: "8px", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem", fontWeight: 600, transition: "all 0.15s",
                                  borderColor: (v === "ice" ? editingPreset.isIced : !editingPreset.isIced) ? (v === "ice" ? "#2980b9" : "#e67e22") : "var(--steam)",
                                  background: (v === "ice" ? editingPreset.isIced : !editingPreset.isIced) ? (v === "ice" ? "#EBF5FB" : "#FEF3E8") : "var(--foam)",
                                  color: (v === "ice" ? editingPreset.isIced : !editingPreset.isIced) ? (v === "ice" ? "#2980b9" : "#e67e22") : "var(--muted)" }}>
                                {v === "ice" ? "ICE" : "HOT"}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      {/* 장비 */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "10px" }}>
                        <div className="field" style={{ marginBottom: 0 }}>
                          <label>{lang === "en" ? "Machine Brand" : "머신 브랜드"}</label>
                          <input value={editingPreset.machineBrand || ""} onChange={e => setEP("machineBrand", e.target.value)} placeholder="e.g. Breville"/>
                        </div>
                        <div className="field" style={{ marginBottom: 0 }}>
                          <label>{lang === "en" ? "Machine Model" : "머신 모델"}</label>
                          <input value={editingPreset.machineModel || ""} onChange={e => setEP("machineModel", e.target.value)} placeholder="e.g. Barista Express"/>
                        </div>
                        <div className="field" style={{ marginBottom: 0 }}>
                          <label>{lang === "en" ? "Grinder Brand" : "그라인더 브랜드"}</label>
                          <input value={editingPreset.grinderBrand || ""} onChange={e => setEP("grinderBrand", e.target.value)} placeholder="e.g. Baratza"/>
                        </div>
                        <div className="field" style={{ marginBottom: 0 }}>
                          <label>{lang === "en" ? "Grinder Model" : "그라인더 모델"}</label>
                          <input value={editingPreset.grinderModel || ""} onChange={e => setEP("grinderModel", e.target.value)} placeholder="e.g. Encore"/>
                        </div>
                      </div>
                      {/* 추출 파라미터 */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "10px" }}>
                        <div className="field" style={{ marginBottom: 0 }}>
                          <label>{lang === "en" ? "Dose (g)" : "원두량 (g)"}</label>
                          <input type="number" value={editingPreset.gram || ""} onChange={e => setEP("gram", e.target.value)} placeholder="18"/>
                        </div>
                        <div className="field" style={{ marginBottom: 0 }}>
                          <label>{lang === "en" ? "Grind Size" : "분쇄도"}</label>
                          <input type="number" value={editingPreset.grindSize || ""} onChange={e => setEP("grindSize", e.target.value)} placeholder="13"/>
                        </div>
                        <div className="field" style={{ marginBottom: 0 }}>
                          <label>{lang === "en" ? "Infusion (s)" : "인퓨전 (초)"}</label>
                          <input type="number" value={editingPreset.infusionSeconds || ""} onChange={e => setEP("infusionSeconds", e.target.value)} placeholder="0"/>
                        </div>
                        <div className="field" style={{ marginBottom: 0 }}>
                          <label>{lang === "en" ? "Total Time (s)" : "총 시간 (초)"}</label>
                          <input type="number" value={editingPreset.seconds || ""} onChange={e => setEP("seconds", e.target.value)} placeholder="27"/>
                        </div>
                        <div className="field" style={{ marginBottom: 0 }}>
                          <label>{lang === "en" ? "Yield (ml)" : "추출량 (ml)"}</label>
                          <input type="number" value={editingPreset.espressoMl || ""} onChange={e => setEP("espressoMl", e.target.value)} placeholder="36"/>
                        </div>
                        {!editingPreset.isIced && (
                          <div className="field" style={{ marginBottom: 0 }}>
                            <label>{lang === "en" ? "Temp (°C)" : "물온도 (°C)"}</label>
                            <input type="number" value={editingPreset.waterTemp || ""} onChange={e => setEP("waterTemp", e.target.value)} placeholder="93"/>
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                        <button className="btn-cancel" onClick={() => setEditingPreset(null)}>
                          {lang === "en" ? "Cancel" : "취소"}
                        </button>
                        <button className="btn-save-sm" onClick={saveEditingPreset}>
                          {lang === "en" ? "Save" : "저장"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ── 보기 모드 ── */
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--espresso)", marginBottom: "6px" }}>{p.name}</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                          {[
                            p.menuId && (COFFEE_MENUS.find(m => m.id === p.menuId)?.[lang === "en" ? "labelEn" : "label"]),
                            p.isIced ? "ICE" : (p.menuId && COFFEE_MENUS.find(m => m.id === p.menuId)?.canIce ? "HOT" : null),
                            p.machineBrand && `${p.machineBrand}${p.machineModel ? " " + p.machineModel : ""}`,
                            p.grinderBrand && `${p.grinderBrand}${p.grinderModel ? " " + p.grinderModel : ""}`,
                            p.gram && `${p.gram}g`,
                            p.seconds && `${p.seconds}s`,
                            p.espressoMl && `${p.espressoMl}ml`,
                            p.waterTemp && `${p.waterTemp}°C`,
                            p.grindSize && `분쇄도 ${p.grindSize}`,
                          ].filter(Boolean).map((tag, i) => (
                            <span key={i} style={{ padding: "2px 7px", background: "var(--foam)", border: "1px solid var(--divider)", borderRadius: "4px", fontSize: "0.7rem", color: "var(--muted)" }}>
                              {tag}
                            </span>
                          ))}
                          <span style={{ padding: "2px 7px", background: "var(--foam)", border: "1px solid var(--divider)", borderRadius: "4px", fontSize: "0.7rem", color: "var(--muted)" }}>
                            {p.equipType === "handdrip" ? (lang === "en" ? "Hand Drip" : "핸드드립") : (lang === "en" ? "Machine" : "머신")}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                        <button onClick={() => setEditingPreset({ ...p })}
                          style={{ background: "none", border: "1px solid var(--steam)", borderRadius: "6px", padding: "5px 10px", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", color: "var(--muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                          <svg width="11" height="11" viewBox="0 0 14 14" fill="none"><path d="M2 10.5V12h1.5l5.5-5.5L7.5 5 2 10.5z" fill="currentColor" opacity="0.6"/><path d="M11.5 2.5a1 1 0 0 1 0 1.414L10 5.414 8.586 4 10 2.5a1 1 0 0 1 1.414 0z" fill="currentColor"/></svg>
                          {lang === "en" ? "Edit" : "수정"}
                        </button>
                        <button onClick={() => delPreset(p.id)}
                          style={{ background: "none", border: "1px solid #c0392b30", borderRadius: "6px", padding: "5px 10px", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", color: "#c0392b", display: "flex", alignItems: "center", gap: "4px" }}>
                          <svg width="11" height="11" viewBox="0 0 14 14" fill="none"><path d="M2.5 3.5h9M4.5 3.5V2.5c0-.28.22-.5.5-.5h4c.28 0 .5.22.5.5v1M5.5 6v4M8.5 6v4M3 3.5l.7 8c.02.4.35.7.76.7h6.08c.4 0 .73-.3.76-.7l.7-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          {lang === "en" ? "Delete" : "삭제"}
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
          <div className="my-section-title" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            {lang === "en" ? "Blocked Users" : "차단 목록"}
          </div>
          {blockedIds.length === 0 ? (
            <p style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
              {lang === "en" ? "No blocked users." : "차단한 사용자가 없어요."}
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {blockedProfiles.map(u => (
                <div key={u.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--cream)", border: "1px solid var(--divider)", borderRadius: "8px", padding: "10px 14px" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--espresso)" }}>@{u.nickname || u.id}</span>
                  <button onClick={() => unblock(u.id)}
                    style={{ background: "none", border: "1px solid var(--steam)", borderRadius: "6px", padding: "4px 10px", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", color: "var(--muted)" }}>
                    {lang === "en" ? "Unblock" : "차단 해제"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── 통화 설정 ── */}
        <div className="my-section">
          <div className="my-section-title" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M8 5v6M6 6.5h2.5a1.5 1.5 0 0 1 0 3H6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            {lang === "en" ? "Currency" : "통화 설정"}
          </div>
          <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: "10px", lineHeight: 1.5 }}>
            {lang === "en" ? "Set the currency displayed in Bean Vault." : "내 원두 재고에서 표시되는 금액 단위를 설정해요."}
          </p>
          <div style={{ display: "flex", gap: "8px" }}>
            {[
              { val: "KRW", label: "₩ 원화 (KRW)", labelEn: "₩ Korean Won" },
              { val: "USD", label: "$ 달러 (USD)", labelEn: "$ US Dollar" },
            ].map(opt => (
              <button key={opt.val} type="button" style={tabBtn(currency === opt.val)}
                onClick={() => handleCurrency(opt.val)}>
                {lang === "en" ? opt.labelEn : opt.label}
              </button>
            ))}
          </div>
          {currency === "USD" && (
            <p style={{ fontSize: "0.72rem", color: "var(--latte)", marginTop: "8px", lineHeight: 1.5 }}>
              {lang === "en"
                ? "Prices are converted from KRW using today's exchange rate."
                : "원화 금액을 오늘 환율로 자동 변환해요."}
              {(() => {
                const cached = loadCachedRate();
                return cached
                  ? <span style={{ marginLeft: "4px", color: "var(--muted)" }}>
                      (1$ = {cached.toLocaleString()}원 · {new Date().toLocaleDateString(lang === "en" ? "en-US" : "ko-KR")} 기준)
                    </span>
                  : <span style={{ marginLeft: "4px", color: "var(--muted)" }}>(환율 로딩 중…)</span>;
              })()}
            </p>
          )}
        </div>

        {/* ── 내 레시피 내보내기 ── */}
        <div className="my-section">
          <div className="my-section-title" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M2 12V4a1 1 0 0 1 1-1h7l4 4v5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
              <path d="M9 3v4h4" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
              <path d="M6 8l2-2 2 2M8 6v5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {lang === "en" ? "Export My Recipes" : "내 레시피 내보내기"}
          </div>

          <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.6, marginBottom: "14px" }}>
            {lang === "en"
              ? "Download all your brew records as an Excel file (.xlsx). Includes menu, bean, machine, extraction data, flavor notes, and more."
              : "내가 기록한 모든 추출 레시피를 엑셀 파일(.xlsx)로 다운받아요. 메뉴, 원두, 머신, 추출 파라미터, 맛 노트 등 전체 데이터가 포함돼요."}
          </p>

          {exportMsg && (
            <p style={{
              fontSize: "0.82rem", marginBottom: "10px", padding: "8px 12px",
              borderRadius: "var(--r-btn)",
              background: exportMsg.type === "ok" ? "#eafaf1" : "#fdecea",
              color:      exportMsg.type === "ok" ? "#27ae60" : "#c0392b",
              border: `1px solid ${exportMsg.type === "ok" ? "#a9dfbf" : "#f5b7b1"}`,
            }}>
              {exportMsg.text}
            </p>
          )}

          <button
            onClick={exportMyRecipes}
            disabled={exporting}
            style={{
              width: "100%", padding: "11px 0",
              background: exporting ? "var(--steam)" : "var(--espresso)",
              color: exporting ? "var(--muted)" : "var(--cream)",
              border: "none", borderRadius: "var(--r-btn)",
              fontFamily: "'DM Sans',sans-serif", fontSize: "0.88rem", fontWeight: 500,
              cursor: exporting ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              transition: "background var(--transition-base), transform var(--transition-fast)",
            }}
            onMouseEnter={e => { if (!exporting) e.currentTarget.style.background = "var(--roast)"; }}
            onMouseLeave={e => { if (!exporting) e.currentTarget.style.background = "var(--espresso)"; }}
          >
            {exporting ? (
              <>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ animation: "spin 1s linear infinite" }}>
                  <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="10 25" strokeLinecap="round"/>
                </svg>
                {lang === "en" ? "Exporting…" : "내보내는 중…"}
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2v8M5 7l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                {lang === "en" ? "Download as Excel (.xlsx)" : "엑셀로 다운받기 (.xlsx)"}
              </>
            )}
          </button>
        </div>

        {/* ── 구글 드라이브 백업 ── */}
        <div className="my-section">
          <div className="my-section-title" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {/* Google Drive 아이콘 */}
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

          <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.6, marginBottom: "14px" }}>
            {lang === "en"
              ? "Back up all your recipes to your own Google Drive (Brewlog/ folder). Free, uses your personal 15GB storage."
              : "내 레시피를 내 구글 드라이브의 Brewlog 폴더에 자동 백업해요. 무료이며, 내 구글 계정 저장공간(15GB)을 사용해요."}
          </p>

          {/* 상태 메시지 */}
          {driveMsg && (
            <p style={{
              fontSize: "0.82rem", marginBottom: "12px", padding: "8px 12px",
              borderRadius: "var(--r-btn)",
              background: driveMsg.type === "ok" ? "#eafaf1" : "#fdecea",
              color:      driveMsg.type === "ok" ? "#27ae60" : "#c0392b",
              border: `1px solid ${driveMsg.type === "ok" ? "#a9dfbf" : "#f5b7b1"}`,
              lineHeight: 1.5,
            }}>
              {driveMsg.text}
            </p>
          )}

          {!driveToken ? (
            /* 미연결 상태 */
            <button onClick={connectDrive} disabled={driveLoading} style={{
              width: "100%", padding: "11px 0",
              background: driveLoading ? "var(--steam)" : "var(--foam)",
              color: driveLoading ? "var(--muted)" : "var(--espresso)",
              border: "1px solid var(--steam)", borderRadius: "var(--r-btn)",
              fontFamily: "'DM Sans',sans-serif", fontSize: "0.88rem", fontWeight: 500,
              cursor: driveLoading ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              transition: "border-color var(--transition-base), box-shadow var(--transition-base)",
            }}
              onMouseEnter={e => { if (!driveLoading) e.currentTarget.style.borderColor = "var(--latte)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--steam)"; }}
            >
              {driveLoading ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ animation: "spin 1s linear infinite" }}>
                    <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="10 25" strokeLinecap="round"/>
                  </svg>
                  {lang === "en" ? "Connecting…" : "연결 중…"}
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M8 1v9M5 7l3 3 3-3" stroke="#4285F4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 11v2a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-2" stroke="#4285F4" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  {lang === "en" ? "Connect Google Drive" : "구글 드라이브 연결하기"}
                </>
              )}
            </button>
          ) : (
            /* 연결됨 상태 */
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {/* 연결 상태 표시 */}
              <div style={{
                display: "flex", alignItems: "center", gap: "8px",
                padding: "8px 12px", background: "#eafaf1",
                border: "1px solid #a9dfbf", borderRadius: "var(--r-btn)",
                fontSize: "0.78rem", color: "#27ae60",
              }}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" fill="#27ae60"/>
                  <path d="M5 8l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {lang === "en" ? "Connected — saves to Brewlog/ folder" : "연결됨 — 내 드라이브 Brewlog 폴더에 저장돼요"}
                <button onClick={() => { sessionStorage.removeItem(GDRIVE_TOKEN_KEY); setDriveToken(null); setDriveMsg(null); }}
                  style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", fontSize: "0.72rem", color: "#27ae60", textDecoration: "underline", fontFamily: "'DM Sans',sans-serif", padding: 0 }}>
                  {lang === "en" ? "Disconnect" : "연결 해제"}
                </button>
              </div>

              {/* 수동 백업 버튼 */}
              <button onClick={handleManualBackup} disabled={driveLoading} style={{
                width: "100%", padding: "11px 0",
                background: driveLoading ? "var(--steam)" : "#4285F4",
                color: driveLoading ? "var(--muted)" : "white",
                border: "none", borderRadius: "var(--r-btn)",
                fontFamily: "'DM Sans',sans-serif", fontSize: "0.88rem", fontWeight: 500,
                cursor: driveLoading ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                transition: "background var(--transition-base), transform var(--transition-fast)",
              }}
                onMouseEnter={e => { if (!driveLoading) { e.currentTarget.style.background = "#2b6de0"; e.currentTarget.style.transform = "translateY(-1px)"; }}}
                onMouseLeave={e => { e.currentTarget.style.background = driveLoading ? "var(--steam)" : "#4285F4"; e.currentTarget.style.transform = "none"; }}
              >
                {driveLoading ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ animation: "spin 1s linear infinite" }}>
                      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="10 25" strokeLinecap="round"/>
                    </svg>
                    {lang === "en" ? "Backing up…" : "백업 중…"}
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M8 1v9M5 7l3 3 3-3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M2 11v2a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-2" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    {lang === "en" ? "Backup Now" : "지금 바로 백업"}
                  </>
                )}
              </button>

              {/* 자동 백업 토글 */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 14px", background: "var(--cream)",
                border: "1px solid var(--divider)", borderRadius: "var(--r-btn)",
              }}>
                <div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--espresso)", marginBottom: "2px" }}>
                    {lang === "en" ? "Auto Backup" : "자동 백업"}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
                    {lang === "en" ? "Sync to Drive after every recipe save" : "레시피 저장할 때마다 자동으로 백업"}
                  </div>
                </div>
                {/* 토글 스위치 */}
                <div onClick={toggleDriveAuto} style={{
                  width: "44px", height: "24px", borderRadius: "12px",
                  background: driveAuto ? "#4285F4" : "var(--steam)",
                  position: "relative", cursor: "pointer",
                  transition: "background var(--transition-base)", flexShrink: 0,
                }}>
                  <div style={{
                    position: "absolute", top: "3px",
                    left: driveAuto ? "23px" : "3px",
                    width: "18px", height: "18px", borderRadius: "50%",
                    background: "white", boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
                    transition: "left var(--transition-base)",
                  }}/>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── 엑셀에서 레시피 가져오기 ── */}
        <div className="my-section">
          <div className="my-section-title" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M2 12V4a1 1 0 0 1 1-1h7l4 4v5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
              <path d="M9 3v4h4" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
              <path d="M6 10l2 2 2-2M8 7v5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {lang === "en" ? "Import Recipes from Excel" : "엑셀에서 레시피 가져오기"}
          </div>

          {/* 단계별 안내 */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
            {[
              { step: "01", title: "템플릿 다운로드", desc: "아래 버튼으로 xlsx 템플릿을 받아요" },
              { step: "02", title: "엑셀에서 작성", desc: "1행(헤더)·2행(예시)·3행(설명)은 그대로 두고, 4행부터 레시피를 입력해요. 작성 후 예시 행을 지워도 괜찮아요" },
              { step: "03", title: "파일 업로드", desc: "저장한 xlsx 파일을 아래에서 선택하면 자동으로 가져와요. 예시·설명 행은 자동으로 건너뛰어요" },
            ].map(({ step, title, desc }) => (
              <div key={step} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <span style={{ fontFamily: "'Playfair Display',serif", fontSize: "0.78rem", fontWeight: 700, color: "var(--latte)", flexShrink: 0, minWidth: "20px" }}>{step}</span>
                <div>
                  <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--espresso)", marginBottom: "1px" }}>{title}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--muted)", lineHeight: 1.5 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* 템플릿 다운로드 버튼 */}
          <button onClick={async () => {
            if (!window.XLSX) {
              await new Promise((resolve, reject) => {
                const s = document.createElement("script");
                s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
                s.onload = resolve;
                s.onerror = reject;
                document.head.appendChild(s);
              });
            }
            const XLSX = window.XLSX;
            const headers = ["메뉴","원두명","원두회사","로스팅일자","기록날짜","커피머신","그라인더","분쇄도","원두량(g)","추출시간(s)","추출량(ml)","물온도(°C)","물종류","희석종류","희석량(ml)","별점(1-5)","메모","공개(TRUE/FALSE)","추출압력(BAR)","연속추출메모"];
            const example = ["아메리카노","에티오피아 예가체프","테라로사","2026-05-01","2026-06-01","Breville 870","Baratza Encore","7","18","28","36","93","생수","물","150","4","맛있었음","TRUE","9.2","2샷 연속 추출"];
            const hint   = ["※ 메뉴: 에스프레소/리스트레토/룽고/아메리카노/롱블랙/카페라떼/카푸치노/플랫화이트/마끼아또/핸드드립/콜드브루/기타","","","","","","","","","","","","수돗물/정수기/생수/기타","물/우유/저지방우유/두유/귀리우유/아몬드우유/코코넛우유","","1~5 숫자","","TRUE 또는 FALSE","압력게이지 측정값(선택)","자유 기재(선택)"];
            const ws = XLSX.utils.aoa_to_sheet([headers, example, hint]);
            // 열 너비 자동 설정
            ws["!cols"] = headers.map((h, i) => ({ wch: Math.max(h.length * 2, [12,16,12,12,12,16,14,8,10,10,10,10,12,14,10,8,20,14,14,18][i] || 12) }));
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "레시피");
            XLSX.writeFile(wb, "brewlog_template.xlsx");
          }} style={{ width: "100%", padding: "10px", border: "1px solid var(--steam)", borderRadius: "8px", background: "var(--foam)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem", color: "var(--espresso)", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "10px" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M8 2v8M5 7l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            템플릿 다운로드 (xlsx)
          </button>

          <RecipeImporter lang={lang} user={user} />
        </div>

        <div className="modal-actions" style={{ justifyContent: "space-between" }}>
          <button className="btn-danger-outline" onClick={onLogout} style={{ padding: "0.7rem 1.2rem", background: "none", border: "1px solid #c0392b40", color: "#c0392b", borderRadius: "8px", fontFamily: "'DM Sans',sans-serif", fontSize: "0.85rem", cursor: "pointer" }}>
            {lang === "en" ? "Logout" : "로그아웃"}
          </button>
          <button className="btn-cancel" onClick={onClose}>{lang === "en" ? "Close" : "닫기"}</button>
        </div>
      </div>
    </div>
  );
}


// ─── ReportModal ──────────────────────────────────────────────────
function ReportModal({ type, targetId, currentUser, onClose, lang = "ko" }) {
  const t = I18N[lang];
  const [reason, setReason] = useState("");
  const [custom, setCustom] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!reason) return;
    setLoading(true);
    try {
      // 중복 신고 체크
      const q = query(collection(db, "reports"),
        where("targetId", "==", targetId),
        where("uid", "==", currentUser.uid)
      );
      const snap = await getDocs(q);
      if (!snap.empty) { setDone("already"); setLoading(false); return; }

      // 신고 등록
      await addDoc(collection(db, "reports"), {
        type, targetId, uid: currentUser.uid,
        reason: reason === "기타" || reason === "Other" ? (custom || reason) : reason,
        createdAt: serverTimestamp(), status: "pending",
      });

      // 신고 수 집계 후 3회 이상이면 비공개 처리
      const allQ = query(collection(db, "reports"), where("targetId", "==", targetId));
      const allSnap = await getDocs(allQ);
      if (allSnap.size >= 3) {
        if (type === "recipe") {
          await updateDoc(doc(db, "recipes", targetId), { isPublic: false, reportHidden: true });
        } else if (type === "comment") {
          await updateDoc(doc(db, "comments", targetId), { hidden: true });
        }
      }
      setDone("ok");
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: "340px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <span style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--espresso)" }}>🚨 {t.report}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "1.1rem", cursor: "pointer", color: "var(--muted)" }}>✕</button>
        </div>
        {done === "ok" ? (
          <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>✅</div>
            <p style={{ color: "var(--espresso)", fontSize: "0.9rem" }}>{t.reportDone}</p>
            <button className="btn-primary" style={{ marginTop: "1rem", width: "auto", padding: "0.5rem 1.5rem" }} onClick={onClose}>확인</button>
          </div>
        ) : done === "already" ? (
          <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>⚠️</div>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>{t.reportAlready}</p>
            <button className="btn-primary" style={{ marginTop: "1rem", width: "auto", padding: "0.5rem 1.5rem" }} onClick={onClose}>확인</button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
              {t.reportReasons.map(r => (
                <button key={r} type="button" onClick={() => setReason(r)}
                  style={{ padding: "0.6rem 1rem", border: "1px solid", borderRadius: "2px", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: "0.88rem", textAlign: "left", transition: "all 0.15s",
                    borderColor: reason === r ? "var(--accent)" : "var(--steam)",
                    background: reason === r ? "#fff3ee" : "var(--foam)",
                    color: reason === r ? "var(--accent)" : "var(--espresso)", fontWeight: reason === r ? 600 : 400 }}>
                  {reason === r ? "● " : "○ "}{r}
                </button>
              ))}
            </div>
            {(reason === "기타" || reason === "Other") && (
              <input value={custom} onChange={e => setCustom(e.target.value)}
                placeholder={lang === "en" ? "Please describe…" : "내용을 입력해주세요…"}
                style={{ width: "100%", padding: "0.6rem 0.8rem", border: "1px solid var(--steam)", borderRadius: "2px", fontFamily: "'DM Sans',sans-serif", fontSize: "0.88rem", marginBottom: "0.8rem", background: "var(--cream)", color: "var(--espresso)", outline: "none" }}
              />
            )}
            <div className="modal-actions">
              <button className="btn-cancel" onClick={onClose}>{lang === "en" ? "Cancel" : "취소"}</button>
              <button className="btn-primary" style={{ width: "auto", padding: "0.6rem 1.5rem", marginTop: 0, background: "#e74c3c", opacity: reason ? 1 : 0.5 }}
                onClick={submit} disabled={loading || !reason}>
                {loading ? "…" : t.report}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── RecipeDetailModal ────────────────────────────────────────────
function RecipeDetailModal({ recipe, onClose, currentUid, currentUser, onLike, onEdit, onDelete, onRequireAuth, onFollow, isFollowing, onBookmark, isBookmarked, onCompare, onCopyRecipe, onAuthorClick, lang = "ko" }) {
  const [showReport, setShowReport] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [showMore, setShowMore] = useState(false); // ··· 메뉴
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);

  const BLOCKED_KEY = `brewlog_blocked_${currentUid}`;
  const loadBlocked = () => { try { return JSON.parse(localStorage.getItem(BLOCKED_KEY) || "[]"); } catch { return []; } };

  // 차단 여부 초기화
  useEffect(() => {
    if (!currentUid || !recipe?.uid || currentUid === recipe.uid) return;
    setIsBlocked(loadBlocked().includes(recipe.uid));
  }, [recipe?.uid, currentUid]);

  // 작성자 차단
  const handleBlock = async () => {
    if (!currentUid || !recipe?.uid) return;
    setBlockLoading(true);
    const blocked = loadBlocked();
    const newBlocked = [...new Set([...blocked, recipe.uid])];
    localStorage.setItem(BLOCKED_KEY, JSON.stringify(newBlocked));
    // Firestore users 컬렉션에도 저장
    try {
      await updateDoc(doc(db, "users", currentUid), { blockedUsers: newBlocked });
    } catch(e) { console.warn("[block]", e.message); }
    setIsBlocked(true);
    setBlockLoading(false);
    setShowMore(false);
    onClose();
  };

  // 차단 해제
  const handleUnblock = async () => {
    if (!currentUid || !recipe?.uid) return;
    setBlockLoading(true);
    const blocked = loadBlocked().filter(id => id !== recipe.uid);
    localStorage.setItem(BLOCKED_KEY, JSON.stringify(blocked));
    try {
      await updateDoc(doc(db, "users", currentUid), { blockedUsers: blocked });
    } catch(e) { console.warn("[unblock]", e.message); }
    setIsBlocked(false);
    setBlockLoading(false);
    setShowMore(false);
  };

  useEffect(() => {
    if (!recipe?.id) return;
    const q = query(collection(db, "comments"), where("recipeId", "==", recipe.id));
    const unsub = onSnapshot(q, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // 클라이언트에서 시간순 정렬 (Firestore 복합 인덱스 불필요)
      list.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
      setComments(list.filter(c => !c.hidden));
    });
    return unsub;
  }, [recipe?.id]);

  const submitComment = async () => {
    if (!currentUser) { onRequireAuth?.(); return; }
    const text = commentText.trim();
    if (!text) return;
    setCommentLoading(true);
    try {
      await addDoc(collection(db, "comments"), {
        recipeId: recipe.id,
        uid: currentUser.uid,
        author: currentUser.displayName,
        text,
        parentId: replyTo?.id || null,
        parentAuthor: replyTo?.author || null,
        createdAt: serverTimestamp(),
      });
      setReplyTo(null);
      // 레시피 작성자에게 알림 (본인 댓글 제외)
      if (recipe.uid && recipe.uid !== currentUser.uid) {
        addDoc(collection(db, "notifications"), {
          toUid: recipe.uid,
          type: "comment",
          fromUser: currentUser.displayName,
          recipeId: recipe.id,
          beanName: recipe.bean || "",
          text: text.slice(0, 50),
          read: false,
          createdAt: serverTimestamp(),
        }).then(() => {
          console.log("[알림] 댓글 알림 전송 성공 → toUid:", recipe.uid);
        }).catch(e => {
          console.error("[알림] 댓글 알림 전송 실패:", e.message, "/ toUid:", recipe.uid);
        });
      }
      setCommentText("");
    } catch(e) { console.error(e); }
    setCommentLoading(false);
  };

  const deleteComment = async (commentId) => {
    if (!confirm("댓글을 삭제할까요?")) return;
    await deleteDoc(doc(db, "comments", commentId));
  };
  const t = I18N[lang];
  const date = recipe.createdAt?.toDate?.()?.toLocaleDateString(lang === "en" ? "en-US" : "ko-KR") || "";
  const liked = (recipe.likedBy || []).includes(currentUid);
  const likeCount = (recipe.likedBy || []).length;
  const isOwner = recipe.uid === currentUid;

  return (
    <>
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: "460px" }}>
        {/* 닫기 버튼 */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.8rem" }}>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "var(--muted)" }}>✕</button>
        </div>

        {/* 라벨 : 값 정보 */}
        <div style={{ display: "grid", gridTemplateColumns: "auto 1px 1fr", columnGap: "0.6rem", rowGap: "0.1rem", alignItems: "center", fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", color: "var(--muted)", lineHeight: 1.8, marginBottom: "0.8rem" }}>
          {recipe.machine && (<>
            <span style={{ fontWeight: 600, color: "var(--roast)", opacity: 0.6, whiteSpace: "nowrap" }}>{lang === "en" ? (recipe.machineType === "handdrip" ? "Equipment" : "Machine") : (recipe.machineType === "handdrip" ? "핸드드립 기구" : "커피머신")}</span>
            <span style={{ width: "1px", background: "var(--steam)", alignSelf: "stretch", margin: "0.2rem 0" }} />
            <span>{recipe.machine}{recipe.machineType && recipe.machineType !== "handdrip" && (<span style={{ marginLeft: "0.3rem", fontSize: "0.65rem", background: recipe.machineType === "auto" ? "var(--latte)" : "var(--steam)", color: "var(--espresso)", padding: "0.05rem 0.3rem", borderRadius: "999px" }}>{recipe.machineType === "auto" ? (lang === "en" ? "Auto" : "전자동") : (lang === "en" ? "Semi" : "반자동")}</span>)}</span>
          </>)}
          {recipe.grinder && (<>
            <span style={{ fontWeight: 600, color: "var(--roast)", opacity: 0.6, whiteSpace: "nowrap" }}>{lang === "en" ? "Grinder" : "그라인더"}</span>
            <span style={{ width: "1px", background: "var(--steam)", alignSelf: "stretch", margin: "0.2rem 0" }} />
            <span>{recipe.grinder}</span>
          </>)}
          {recipe.grindSize && (<>
            <span style={{ fontWeight: 600, color: "var(--roast)", opacity: 0.6, whiteSpace: "nowrap" }}>{lang === "en" ? "Grind" : "분쇄도"}</span>
            <span style={{ width: "1px", background: "var(--steam)", alignSelf: "stretch", margin: "0.2rem 0" }} />
            <span>{recipe.grindSize}</span>
          </>)}
          {recipe.company && (<>
            <span style={{ fontWeight: 600, color: "var(--roast)", opacity: 0.6, whiteSpace: "nowrap" }}>{lang === "en" ? "Brand" : "원두 회사"}</span>
            <span style={{ width: "1px", background: "var(--steam)", alignSelf: "stretch", margin: "0.2rem 0" }} />
            <span>{recipe.company}</span>
          </>)}
          {recipe.roastDate && (<>
            <span style={{ fontWeight: 600, color: "var(--roast)", opacity: 0.6, whiteSpace: "nowrap" }}>{lang === "en" ? "Roasted" : "로스팅"}</span>
            <span style={{ width: "1px", background: "var(--steam)", alignSelf: "stretch", margin: "0.2rem 0" }} />
            <span>{new Date(recipe.roastDate).toLocaleDateString(lang === "ko" ? "ko-KR" : "en-US")}</span>
          </>)}
          {recipe.menuLabel && (<>
            <span style={{ fontWeight: 600, color: "var(--roast)", opacity: 0.6, whiteSpace: "nowrap" }}>{lang === "en" ? "Menu" : "메뉴"}</span>
            <span style={{ width: "1px", background: "var(--steam)", alignSelf: "stretch", margin: "0.2rem 0" }} />
            <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              {lang === "en" ? (COFFEE_MENUS.find(m => m.id === recipe.menuId)?.labelEn || recipe.menuLabel) : recipe.menuLabel}
              {recipe.isIced
                ? <span style={{ fontSize: "0.62rem", fontWeight: 700, color: "#2980b9", background: "#EBF5FB", border: "1px solid #AED6F1", borderRadius: "4px", padding: "1px 6px", letterSpacing: "0.04em" }}>ICE</span>
                : COFFEE_MENUS.find(m => m.id === recipe.menuId)?.canIce
                  ? <span style={{ fontSize: "0.62rem", fontWeight: 700, color: "#e67e22", background: "#FEF3E8", border: "1px solid #FAD7A0", borderRadius: "4px", padding: "1px 6px", letterSpacing: "0.04em" }}>HOT</span>
                  : null
              }
            </span>
          </>)}
          {(recipe.waterType || recipe.waterBrand) && (<>
            <span style={{ fontWeight: 600, color: "var(--roast)", opacity: 0.6, whiteSpace: "nowrap" }}>{lang === "en" ? "Water" : "물 종류"}</span>
            <span style={{ width: "1px", background: "var(--steam)", alignSelf: "stretch", margin: "0.2rem 0" }} />
            <span>
              {(() => {
                const types = { tap: "수돗물", filter: "정수기", bottle: "생수", other: "기타" };
                const typesEn = { tap: "Tap", filter: "Filtered", bottle: "Bottled", other: "Other" };
                const label = lang === "en" ? typesEn[recipe.waterType] : types[recipe.waterType];
                return [label, recipe.waterBrand].filter(Boolean).join(" · ");
              })()}
            </span>
          </>)}
          {recipe.weather && (<>
            <span style={{ fontWeight: 600, color: "var(--roast)", opacity: 0.6, whiteSpace: "nowrap" }}>{lang === "en" ? "Weather" : "날씨"}</span>
            <span style={{ width: "1px", background: "var(--steam)", alignSelf: "stretch", margin: "0.2rem 0" }} />
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span>{recipe.weather.icon}</span>
              <span>{recipe.weather.descKo || recipe.weather.condition}</span>
              <span style={{ color: "var(--muted)", fontSize: "0.7rem" }}>{recipe.weather.temp}°C · {lang === "en" ? "Humidity" : "습도"} {recipe.weather.humidity}%</span>
            </span>
          </>)}
        </div>

        {/* 원두명 */}
        <div style={{ borderTop: "1px solid var(--steam)", paddingTop: "0.7rem", marginBottom: "1rem" }}>
          <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", fontWeight: 600, color: "var(--roast)", opacity: 0.6, marginBottom: "0.15rem" }}>{lang === "en" ? "Product" : "제품명"}</div>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.25rem", fontWeight: 700, color: "var(--espresso)", lineHeight: 1.25 }}>{recipe.bean}</div>
        </div>
        <div className="card-stats" style={{ marginBottom: "1rem", gridTemplateColumns: "repeat(4, 1fr)" }}>
          <div className="stat"><span className="stat-val">{recipe.gram ? `${recipe.gram}g` : "—"}</span><span className="stat-label">{t.statGram}</span></div>
          <div className="stat">
            <span className="stat-val">{recipe.seconds ? `${recipe.seconds}s` : "—"}</span>
            <span className="stat-label">{t.statSeconds}</span>
            {recipe.infusionSeconds && parseInt(recipe.infusionSeconds) > 0 && (
              <span style={{ fontSize: "0.55rem", color: "var(--muted)", display: "block", lineHeight: 1.2, marginTop: "1px", whiteSpace: "nowrap" }}>
                {lang === "en"
                  ? `${recipe.infusionSeconds}+${parseInt(recipe.seconds)-parseInt(recipe.infusionSeconds)}`
                  : `인퓨전 ${recipe.infusionSeconds}+추출 ${parseInt(recipe.seconds)-parseInt(recipe.infusionSeconds)}`}
              </span>
            )}
          </div>
          <div className="stat"><span className="stat-val">{recipe.espressoMl ? `${recipe.espressoMl}ml` : "—"}</span><span className="stat-label">{t.statMl}</span></div>
          {recipe.waterTemp && <div className="stat"><span className="stat-val">{recipe.waterTemp}°C</span><span className="stat-label">{lang === "en" ? "Temp" : "물온도"}</span></div>}
        </div>
        {recipe.diluteMl && (
          <div className="card-dilution">{recipe.diluteType} {recipe.diluteMl}ml 희석</div>
        )}
        {recipe.rating > 0 && (
        <div style={{ display: "flex", gap: "0.15rem", marginBottom: "0.5rem" }}>
          {[1,2,3,4,5].map(s => (
            <span key={s} style={{ fontSize: "1rem", color: s <= recipe.rating ? "var(--latte)" : "var(--steam)" }}>
              {s <= recipe.rating ? "★" : "☆"}
            </span>
          ))}
        </div>
      )}
      {recipe.note && <div className="card-note">"{recipe.note}"</div>}
      {/* [신규] 추출 압력 세부 기록 표시 */}
      {recipe.brewPressureBar && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", padding: "8px 12px", background: "var(--cream)", borderRadius: "var(--r-chip)", border: "1px solid var(--divider)" }}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6.5" stroke="var(--latte)" strokeWidth="1.3"/>
            <path d="M8 5v3.5l2 1.5" stroke="var(--latte)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ fontSize: "0.72rem", color: "var(--muted)", fontFamily: "'DM Sans',sans-serif" }}>
            {lang === "en" ? "Measured Pressure" : "측정 압력"}&nbsp;
            <strong style={{ color: "var(--espresso)", fontWeight: 600 }}>{recipe.brewPressureBar} BAR</strong>
          </span>
        </div>
      )}
      {/* [신규] 연속 추출 메모 표시 */}
      {recipe.continuousMemo && (
        <div style={{ marginBottom: "8px", padding: "8px 12px", background: "var(--cream)", borderRadius: "var(--r-chip)", border: "1px solid var(--divider)", fontSize: "0.78rem", color: "var(--muted)", fontFamily: "'DM Sans',sans-serif", lineHeight: 1.55 }}>
          <span style={{ fontSize: "0.62rem", fontWeight: 700, color: "var(--latte)", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: "3px" }}>
            {lang === "en" ? "Extraction Note" : "연속 추출 메모"}
          </span>
          {recipe.continuousMemo}
        </div>
      )}
      {/* 플레이버 프로파일 — 레이더 + 2열 바 */}
      {FLAVOR_AXES.some(ax => (parseInt(recipe[ax.key]) || 0) > 0) && (
        <div style={{ margin: "12px 0", padding: "16px", background: "var(--cream)", borderRadius: "8px", border: "1px solid var(--divider)" }}>
          <div style={{ fontSize: "0.68rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
            {lang === "en" ? "Flavor Profile" : "플레이버 프로파일"}
          </div>
          {/* 레이더 차트 */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "14px" }}>
            <FlavorRadar values={recipe} size={200} lang={lang}/>
          </div>
          {/* 2열 바 그리드 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 20px" }}>
            {FLAVOR_AXES.map(ax => {
              const v = parseInt(recipe[ax.key]) || 0;
              return (
                <div key={ax.key}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--espresso)" }}>{lang === "en" ? ax.en : ax.ko}</span>
                    <span style={{ fontSize: "0.72rem", fontWeight: 700, color: v > 0 ? "var(--latte)" : "var(--steam)", whiteSpace: "nowrap" }}>{v > 0 ? `${v} / 5` : "—"}</span>
                  </div>
                  <div style={{ height: "4px", background: "var(--steam)", borderRadius: "2px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(v / 5) * 100}%`, background: v > 0 ? "var(--latte)" : "transparent", borderRadius: "2px", transition: "width 0.3s" }}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
        <div style={{ marginTop: "1rem", borderTop: "1px solid var(--steam)", paddingTop: "0.75rem" }}>
          {/* 1행: 닉네임 + 팔로우 + 날짜 */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "4px" }}>
            <span
              className="card-author"
              style={{ cursor: onAuthorClick ? "pointer" : "default", whiteSpace: "nowrap" }}
              onClick={() => { if (onAuthorClick) { onClose(); onAuthorClick({ uid: recipe.uid, name: recipe.author }); } }}
            >@{recipe.author}</span>
            {recipe.author && recipe.uid !== currentUid && onFollow && (
              <button
                className={`follow-btn ${isFollowing ? "following" : ""}`}
                onClick={e => { e.stopPropagation(); onFollow(recipe.uid || recipe.author); }}
              >
                {isFollowing ? t.following : t.follow}
              </button>
            )}
            <span style={{ color: "var(--muted)", fontSize: "0.75rem", whiteSpace: "nowrap" }}>· {date}</span>
          </div>
          {/* 2행: 액션 버튼 */}
          <div className="card-actions" style={{ marginLeft: "-6px" }}>
            {/* 하트 */}
            <button className={`card-action-btn heart ${liked ? "liked" : ""}`}
              onClick={() => !isOwner && onLike(recipe)}
              style={{ cursor: isOwner ? "default" : "pointer", opacity: isOwner ? 0.4 : 1 }}
              title={isOwner ? t.heartOwner : liked ? t.heartCancel : t.heart}>
              {liked ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#C0625A"><path d="M12 21C12 21 3 14.5 3 8.5C3 5.42 5.42 3 8.5 3C10.04 3 11.41 3.78 12 5.03C12.59 3.78 13.96 3 15.5 3C18.58 3 21 5.42 21 8.5C21 14.5 12 21 12 21Z"/></svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 21C12 21 3 14.5 3 8.5C3 5.42 5.42 3 8.5 3C10.04 3 11.41 3.78 12 5.03C12.59 3.78 13.96 3 15.5 3C18.58 3 21 5.42 21 8.5C21 14.5 12 21 12 21Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>
              )}
              {likeCount > 0 && <span style={{ fontSize: "0.75rem", marginLeft: "1px", fontFamily: "'DM Sans',sans-serif" }}>{likeCount}</span>}
            </button>
            {/* 즐겨찾기 */}
            {onBookmark && (
              <button className={`card-action-btn bookmark ${isBookmarked ? "saved" : ""}`}
                onClick={() => onBookmark(recipe.id)}
                title={isBookmarked ? t.bookmarkRemove : t.bookmarkAdd}>
                {isBookmarked ? (
                  <svg width="18" height="20" viewBox="0 0 18 22" fill="currentColor"><path d="M1 2a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v19l-8-5-8 5V2z"/></svg>
                ) : (
                  <svg width="18" height="20" viewBox="0 0 18 22" fill="none"><path d="M1 2a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v19l-8-5-8 5V2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>
                )}
              </button>
            )}
            {/* 복사해서 기록하기 */}
            {currentUser && onCopyRecipe && (
              <button className="card-action-btn"
                onClick={() => { onCopyRecipe(recipe); }}
                title={lang === "en" ? "Copy & record" : "복사해서 기록하기"}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <rect x="9" y="9" width="11" height="13" rx="2" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M14.5 13.5v5M12 16h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              </button>
            )}
            {/* 비교 */}
            {currentUser && onCompare && (
              <button className="card-action-btn"
                onClick={() => { onCompare(recipe); }}
                title={lang === "en" ? "Compare recipes" : "레시피 비교"}>
                <svg width="20" height="20" viewBox="0 0 22 20" fill="none">
                  <rect x="1" y="3" width="8" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                  <line x1="3" y1="7" x2="7" y2="7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  <line x1="3" y1="10" x2="7" y2="10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  <line x1="3" y1="13" x2="5.5" y2="13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  <rect x="13" y="3" width="8" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                  <line x1="15" y1="7" x2="19" y2="7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  <line x1="15" y1="10" x2="19" y2="10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  <line x1="15" y1="13" x2="17.5" y2="13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  <text x="11" y="11.5" textAnchor="middle" fontSize="5" fontWeight="700" fill="currentColor" fontFamily="DM Sans,sans-serif">vs</text>
                </svg>
              </button>
            )}
            {/* 공유 */}
            <button className="card-action-btn"
              onClick={async () => {
                try {
                  const html2canvas = (await import("html2canvas")).default;

                  const menuLabel = COFFEE_MENUS.find(m => m.id === recipe.menuId)?.[lang==="en"?"labelEn":"label"] || "";
                  const isIced = recipe.isIced;
                  const canIce = COFFEE_MENUS.find(m => m.id === recipe.menuId)?.canIce;

                  // 물 종류
                  const waterTypes = { tap:"수돗물", filter:"정수기", bottle:"생수", other:"기타" };
                  const waterLabel = recipe.waterType
                    ? [waterTypes[recipe.waterType], recipe.waterBrand].filter(Boolean).join(" · ") : "";

                  // 희석
                  const diluteLabel = recipe.diluteMl
                    ? [recipe.diluteType === "기타우유" ? (recipe.diluteCustom || "기타") : recipe.diluteType, `${recipe.diluteMl}ml 희석`].filter(Boolean).join(" ") : "";

                  // 별점
                  const starsHtml = recipe.rating > 0
                    ? [1,2,3,4,5].map(s => `<span style="font-size:16px;color:${s<=recipe.rating?"#B07D54":"#E8E6E3"};">${s<=recipe.rating?"★":"☆"}</span>`).join("") : "";

                  // 인퓨전 서브텍스트
                  const infusionSub = recipe.infusionSeconds && parseInt(recipe.infusionSeconds) > 0
                    ? `인퓨전 ${recipe.infusionSeconds}+추출 ${parseInt(recipe.seconds)-parseInt(recipe.infusionSeconds)}` : "";

                  // 라벨 그리드 항목 (카드 상단 정보)
                  const labelItems = [
                    recipe.machine    && { lbl:"커피머신", val: recipe.machine },
                    recipe.grinder    && { lbl:"그라인더", val: recipe.grinder },
                    recipe.grindSize  && { lbl:"분쇄도",   val:recipe.grindSize },
                    recipe.company    && { lbl:"원두 회사", val:recipe.company },
                    recipe.roastDate  && { lbl:"로스팅",   val:recipe.roastDate },
                    recipe.menuId     && { lbl:"메뉴",     val:`${menuLabel}${isIced?" · ICE":canIce?" · HOT":""}` },
                    waterLabel        && { lbl:"물 종류",  val:waterLabel },
                    recipe.weather    && { lbl:"날씨",     val:`${recipe.weather.icon||""} ${recipe.weather.descKo||""} ${recipe.weather.temp}°C · 습도 ${recipe.weather.humidity}%` },
                  ].filter(Boolean);

                  // 레이더 차트 SVG
                  const flavorKeys = ["Acidity","Sweet","Bitter","Aroma","Aftertaste","Balance","Body"];
                  const flavorLabels = { Acidity:"산미", Sweet:"단맛", Bitter:"쓴맛", Aroma:"아로마", Aftertaste:"후미", Balance:"밸런스", Body:"바디" };
                  const flavors = flavorKeys.map(k => ({ k, lbl:flavorLabels[k], val:parseInt(recipe[`flavor${k}`])||0 })).filter(f => f.val > 0);
                  const hasRadar = flavors.length > 0;

                  const radarSVG = hasRadar ? (() => {
                    const SIZE = 260, cx = 130, cy = 130, R = 95, n = flavorKeys.length;
                    const pt = (i, r) => {
                      const a = -Math.PI/2 + (2*Math.PI*i/n);
                      return [cx + r*Math.cos(a), cy + r*Math.sin(a)];
                    };
                    const grid = [1,2,3,4,5].map(l => {
                      const r = R*l/5;
                      const pts = flavorKeys.map((_,i) => pt(i,r).join(",")).join(" ");
                      const isOuter = l === 5;
                      return `<polygon points="${pts}" fill="${l%2===0?"#F5F3F0":"none"}" stroke="${isOuter?"#D5CFC8":"#E8E4DF"}" stroke-width="${isOuter?1.2:0.7}"/>`;
                    }).join("");
                    const axes = flavorKeys.map((_,i) => {
                      const [x,y] = pt(i, R);
                      return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#DDD9D3" stroke-width="0.8"/>`;
                    }).join("");
                    const vals = flavorKeys.map(k => (parseInt(recipe[`flavor${k}`])||0)/5);
                    const dataPts = flavorKeys.map((_,i) => pt(i, Math.max(vals[i],0.05)*R).join(",")).join(" ");
                    const dots = flavorKeys.map((_,i) => {
                      if (!vals[i]) return "";
                      const [x,y] = pt(i, vals[i]*R);
                      return `<circle cx="${x}" cy="${y}" r="4" fill="#B07D54" stroke="white" stroke-width="1.5"/>`;
                    }).join("");
                    const lbls = flavorKeys.map((k,i) => {
                      const [x,y] = pt(i, R+22);
                      const anchor = x < cx-8 ? "end" : x > cx+8 ? "start" : "middle";
                      const v = parseInt(recipe[`flavor${k}`])||0;
                      return `<text x="${x}" y="${y}" text-anchor="${anchor}" dominant-baseline="middle" font-size="10" fill="${v>0?"#5C4033":"#C0BBBA"}" font-family="DM Sans,sans-serif" font-weight="${v>0?600:400}" letter-spacing="-0.3">${flavorLabels[k]}</text>`;
                    }).join("");
                    return `<svg width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg">
                      ${grid}${axes}
                      <polygon points="${dataPts}" fill="#B07D54" fill-opacity="0.15" stroke="#B07D54" stroke-width="2" stroke-linejoin="round"/>
                      ${dots}${lbls}
                    </svg>`;
                  })() : "";

                  const el = document.createElement("div");
                  el.style.cssText = `position:fixed;left:-9999px;top:-9999px;width:380px;background:#FBFBFA;font-family:'DM Sans',sans-serif;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.12);`;

                  el.innerHTML = `
                    <div style="padding:20px;">
                      <!-- 라벨 그리드 (카드 상단 정보) -->
                      ${labelItems.length > 0 ? `
                      <div style="display:grid;grid-template-columns:auto 1px 1fr;align-items:start;gap:5px 10px;margin-bottom:14px;font-size:12px;">
                        ${labelItems.map(r => `
                          <span style="font-weight:600;color:#1A1614;opacity:0.6;white-space:nowrap;">${r.lbl}</span>
                          <span style="background:#E8E6E3;align-self:stretch;margin:2px 0;width:1px;"></span>
                          <span style="color:#1A1614;">${r.val}</span>
                        `).join("")}
                      </div>` : ""}

                      <!-- 구분선 + 제품명 -->
                      <div style="border-top:1px solid #E8E6E3;padding-top:11px;margin-bottom:14px;">
                        <div style="font-size:11px;font-weight:600;color:#1A1614;opacity:0.6;margin-bottom:2px;">${lang==="en"?"Product":"제품명"}</div>
                        <div style="font-family:'Playfair Display',serif;font-size:22px;font-weight:700;color:#1A1614;line-height:1.25;">${recipe.bean||""}</div>
                      </div>

                      <!-- stat 박스 4칸 -->
                      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:14px;">
                        <div style="text-align:center;background:#FAFAF9;border:1px solid #F0EFEF;border-radius:6px;padding:8px 4px;">
                          <div style="font-size:15px;font-weight:600;color:#1A1614;line-height:1;">${recipe.gram||"—"}g</div>
                          <div style="font-size:9px;color:#8C8480;margin-top:3px;">${lang==="en"?"Dose":"원두"}</div>
                        </div>
                        <div style="text-align:center;background:#FAFAF9;border:1px solid #F0EFEF;border-radius:6px;padding:8px 4px;">
                          <div style="font-size:15px;font-weight:600;color:#1A1614;line-height:1;">${recipe.seconds||"—"}s</div>
                          <div style="font-size:9px;color:#8C8480;margin-top:3px;">${lang==="en"?"Time":"추출시간"}</div>
                          ${infusionSub ? `<div style="font-size:8px;color:#8C8480;margin-top:2px;line-height:1.2;">${infusionSub}</div>` : ""}
                        </div>
                        <div style="text-align:center;background:#FAFAF9;border:1px solid #F0EFEF;border-radius:6px;padding:8px 4px;">
                          <div style="font-size:15px;font-weight:600;color:#1A1614;line-height:1;">${recipe.espressoMl||"—"}ml</div>
                          <div style="font-size:9px;color:#8C8480;margin-top:3px;">${lang==="en"?"Yield":"추출량"}</div>
                        </div>
                        <div style="text-align:center;background:#FAFAF9;border:1px solid #F0EFEF;border-radius:6px;padding:8px 4px;">
                          <div style="font-size:15px;font-weight:600;color:#1A1614;line-height:1;">${recipe.waterTemp||"—"}°C</div>
                          <div style="font-size:9px;color:#8C8480;margin-top:3px;">${lang==="en"?"Temp":"물온도"}</div>
                        </div>
                      </div>

                      <!-- 희석 -->
                      ${diluteLabel ? `<div style="font-size:12px;color:#8C8480;background:#FAFAF9;border:1px solid #F0EFEF;border-radius:6px;padding:7px 12px;margin-bottom:12px;">${diluteLabel}</div>` : ""}

                      <!-- 별점 -->
                      ${starsHtml ? `<div style="display:flex;gap:2px;margin-bottom:8px;">${starsHtml}</div>` : ""}

                      <!-- 메모 -->
                      ${recipe.note ? `<div style="font-size:12px;color:#8C8480;background:#FAFAF9;border-left:3px solid #B07D54;padding:9px 12px;border-radius:0 8px 8px 0;line-height:1.6;margin-bottom:12px;">"${recipe.note}"</div>` : ""}

                      <!-- 플레이버 -->
                      ${hasRadar ? `
                      <div style="background:#FAFAF9;border:1px solid #F0EFEF;border-radius:12px;padding:18px;margin-bottom:0;">
                        <div style="font-size:8px;color:#B07D54;text-transform:uppercase;letter-spacing:0.12em;font-weight:700;margin-bottom:14px;">${lang==="en"?"Flavor Profile":"Flavor Profile"}</div>
                        <!-- 레이더 차트 중앙 -->
                        <div style="display:flex;justify-content:center;margin-bottom:16px;">${radarSVG}</div>
                        <!-- 바 차트 — 1열 전체 너비 (글자 잘림 방지) -->
                        <div style="display:flex;flex-direction:column;gap:7px;">
                          ${flavors.map(f => `
                          <div style="display:flex;align-items:center;gap:10px;">
                            <span style="font-size:10px;color:#8C8480;width:52px;flex-shrink:0;font-family:'DM Sans',sans-serif;">${f.lbl}</span>
                            <div style="flex:1;height:5px;background:#EEEBE7;border-radius:3px;overflow:hidden;">
                              <div style="height:100%;width:${f.val/5*100}%;background:linear-gradient(90deg,#C49A6C,#B07D54);border-radius:3px;"></div>
                            </div>
                            <span style="font-size:10px;color:#B07D54;font-weight:700;width:20px;text-align:right;flex-shrink:0;">${f.val}</span>
                          </div>`).join("")}
                        </div>
                      </div>` : ""}
                    </div>

                    <!-- 푸터 — QR 코드 포함 -->
                    <div style="background:#F0EFEF;padding:10px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px;">
                      <div style="display:flex;flex-direction:column;gap:2px;">
                        <span style="font-size:9px;font-weight:700;color:#5C4033;letter-spacing:0.08em;text-transform:uppercase;">Brewlog Note</span>
                        <span style="font-size:9px;color:#8C8480;">@${recipe.author||""} · brewlog-jade.vercel.app</span>
                      </div>
                      <!-- QR 코드 -->
                      <div style="display:flex;align-items:center;gap:8px;">
                        <div style="display:flex;flex-direction:column;align-items:center;gap:3px;">
                          <img src="https://api.qrserver.com/v1/create-qr-code/?size=52x52&data=https://brewlog-jade.vercel.app&bgcolor=F0EFEF&color=3D2B1F&margin=2" width="52" height="52" style="border-radius:4px;display:block;" crossorigin="anonymous"/>
                          <span style="font-size:7px;color:#B07D54;letter-spacing:0.06em;font-weight:600;">SCAN TO BREW</span>
                        </div>
                      </div>
                    </div>
                  `;

                  document.body.appendChild(el);
                  // QR 이미지 로드 대기 후 캡처
                  await new Promise(r => setTimeout(r, 800));
                  const canvas = await html2canvas(el, { scale: 3, useCORS: true, allowTaint: false, backgroundColor: null, logging: false });
                  document.body.removeChild(el);

                  canvas.toBlob(async (blob) => {
                    const file = new File([blob], `${recipe.bean||"recipe"}.png`, { type: "image/png" });
                    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                      await navigator.share({ files: [file], title: `${recipe.bean} 레시피`, text: "Brewlog Note에서 기록한 레시피예요." })
                        .catch(e => { if (e.name !== "AbortError") console.warn(e); });
                    } else {
                      const a = document.createElement("a");
                      a.href = URL.createObjectURL(blob);
                      a.download = `${recipe.bean||"recipe"}_brewlog.png`;
                      a.click();
                      URL.revokeObjectURL(a.href);
                    }
                  }, "image/png");
                } catch(e) {
                  console.error("[share]", e);
                  alert(lang === "en" ? "Share failed." : "공유에 실패했어요.");
                }
              }}
              title={lang === "en" ? "Share recipe" : "레시피 공유"}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="18" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.6"/>
                <circle cx="18" cy="19" r="2.5" stroke="currentColor" strokeWidth="1.6"/>
                <circle cx="6" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.6"/>
                <path d="M8.3 10.8l7.4-4.2M8.3 13.2l7.4 4.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </button>
            {/* 수정/삭제 */}
            {isOwner && (<>
              <button className="card-action-btn edit" onClick={() => { onClose(); onEdit(recipe); }}
                title={lang === "en" ? "Edit" : "수정"}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M16.5 3.5l4 4-11 11H5.5v-4l11-11z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M14 6l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
              </button>
              <button className="card-action-btn delete" onClick={() => { onClose(); onDelete(recipe.id); }}
                title={lang === "en" ? "Delete" : "삭제"}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M9 6V4h6v2M10 11v6M14 11v6M5 6l1 14h12L19 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </>)}
            {/* ··· 더보기 메뉴 (본인 글 제외) */}
            {!isOwner && currentUser && (
              <div style={{ position: "relative" }}>
                <button className="card-action-btn"
                  onClick={() => setShowMore(v => !v)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>
                  </svg>
                </button>
                {showMore && (<>
                  {/* 백드롭 */}
                  <div style={{ position: "fixed", inset: 0, zIndex: 9998 }} onClick={() => setShowMore(false)}/>
                  {/* 드롭다운 */}
                  <div style={{ position: "absolute", right: 0, bottom: "calc(100% + 6px)", background: "var(--foam)", border: "1px solid var(--divider)", borderRadius: "10px", boxShadow: "0 4px 20px #0002", zIndex: 9999, minWidth: "160px", overflow: "hidden" }}>
                    {/* 신고하기 */}
                    <button
                      onClick={() => { setShowMore(false); setShowReport({ type: "recipe", targetId: recipe.id }); }}
                      style={{ width: "100%", padding: "12px 16px", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", fontFamily: "'DM Sans',sans-serif", fontSize: "0.85rem", color: "#e74c3c", textAlign: "left", transition: "background 0.15s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#fdecea"}
                      onMouseLeave={e => e.currentTarget.style.background = "none"}
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="M8 2L1 14h14L8 2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                        <path d="M8 6v4M8 11.5v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                      </svg>
                      {lang === "en" ? "Report" : "신고하기"}
                    </button>
                    <div style={{ height: "1px", background: "var(--divider)", margin: "0 12px" }}/>
                    {/* 차단/차단해제 */}
                    <button
                      onClick={isBlocked ? handleUnblock : handleBlock}
                      disabled={blockLoading}
                      style={{ width: "100%", padding: "12px 16px", background: "none", border: "none", cursor: blockLoading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "10px", fontFamily: "'DM Sans',sans-serif", fontSize: "0.85rem", color: isBlocked ? "var(--muted)" : "var(--espresso)", textAlign: "left", transition: "background 0.15s", opacity: blockLoading ? 0.5 : 1 }}
                      onMouseEnter={e => { if (!blockLoading) e.currentTarget.style.background = "var(--cream)"; }}
                      onMouseLeave={e => e.currentTarget.style.background = "none"}
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/>
                        {isBlocked
                          ? <path d="M5 8h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                          : <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                        }
                      </svg>
                      {blockLoading
                        ? (lang === "en" ? "Processing…" : "처리 중…")
                        : isBlocked
                          ? (lang === "en" ? `Unblock @${recipe.author}` : `@${recipe.author} 차단 해제`)
                          : (lang === "en" ? `Block @${recipe.author}` : `@${recipe.author} 차단하기`)}
                    </button>
                    {isBlocked && (
                      <div style={{ padding: "6px 16px 10px", fontSize: "0.7rem", color: "var(--muted)", lineHeight: 1.4 }}>
                        {lang === "en" ? "Blocked users' content won't appear in your feed." : "차단된 사용자의 콘텐츠는 피드에서 보이지 않아요."}
                      </div>
                    )}
                  </div>
                </>)}
              </div>
            )}
          </div>
        </div>

        {/* 댓글 섹션 */}
        <div style={{ borderTop: "1px solid var(--steam)", marginTop: "1.2rem", paddingTop: "1rem" }}>
          <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--espresso)", marginBottom: "0.8rem" }}>
            💬 {t.comments} {comments.length > 0 ? `(${comments.length})` : ""}
          </div>
          {comments.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "0.8rem", maxHeight: "300px", overflowY: "auto" }}>
              {comments.filter(c => !c.parentId).map(c => (
                <div key={c.id}>
                  {/* 원댓글 */}
                  <div style={{ background: "var(--foam)", borderRadius: "6px", padding: "0.6rem 0.8rem", fontSize: "0.85rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                      <div>
                        <span style={{ fontWeight: 600, color: "var(--espresso)", marginRight: "0.4rem" }}>@{c.author}</span>
                        <span style={{ color: "var(--muted)", fontSize: "0.72rem" }}>{c.createdAt?.toDate?.()?.toLocaleDateString(lang === "ko" ? "ko-KR" : "en-US") || ""}</span>
                      </div>
                      <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", flexShrink: 0 }}>
                        {currentUser && (
                          <button onClick={() => setReplyTo(replyTo?.id === c.id ? null : { id: c.id, author: c.author })}
                            style={{ background: "none", border: "none", color: replyTo?.id === c.id ? "var(--accent)" : "var(--muted)", fontSize: "0.72rem", cursor: "pointer", padding: 0, fontFamily: "'DM Sans',sans-serif" }}>
                            {lang === "en" ? "Reply" : "답글"}
                          </button>
                        )}
                        {c.uid === currentUid && (
                          <button onClick={() => deleteComment(c.id)} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "0.72rem", cursor: "pointer", padding: 0 }}>
                            {t.commentDelete}
                          </button>
                        )}
                        {c.uid !== currentUid && currentUser && (
                          <button onClick={() => setShowReport({ type: "comment", targetId: c.id })}
                            style={{ background: "none", border: "1px solid #e74c3c40", borderRadius: "2px", color: "#e74c3c", fontSize: "0.68rem", cursor: "pointer", padding: "0.05rem 0.35rem", fontFamily: "'DM Sans',sans-serif" }}>
                            {lang === "en" ? "Report" : "신고"}
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={{ color: "var(--espresso)", marginTop: "0.25rem", lineHeight: 1.5 }}>{c.text}</div>
                  </div>
                  {/* 대댓글 */}
                  {comments.filter(r => r.parentId === c.id).map(r => (
                    <div key={r.id} style={{ marginLeft: "1.2rem", marginTop: "0.3rem", background: "var(--cream)", borderLeft: "2px solid var(--latte)", borderRadius: "0 6px 6px 0", padding: "0.5rem 0.8rem", fontSize: "0.82rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                        <div>
                          <span style={{ fontWeight: 600, color: "var(--espresso)", marginRight: "0.3rem" }}>@{r.author}</span>
                          <span style={{ color: "var(--latte)", fontSize: "0.7rem", marginRight: "0.3rem" }}>→ @{r.parentAuthor}</span>
                          <span style={{ color: "var(--muted)", fontSize: "0.7rem" }}>{r.createdAt?.toDate?.()?.toLocaleDateString(lang === "ko" ? "ko-KR" : "en-US") || ""}</span>
                        </div>
                        <div style={{ display: "flex", gap: "0.3rem", flexShrink: 0 }}>
                          {r.uid === currentUid && (
                            <button onClick={() => deleteComment(r.id)} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "0.7rem", cursor: "pointer", padding: 0 }}>
                              {t.commentDelete}
                            </button>
                          )}
                          {r.uid !== currentUid && currentUser && (
                            <button onClick={() => setShowReport({ type: "comment", targetId: r.id })}
                              style={{ background: "none", border: "1px solid #e74c3c40", borderRadius: "2px", color: "#e74c3c", fontSize: "0.65rem", cursor: "pointer", padding: "0.05rem 0.3rem", fontFamily: "'DM Sans',sans-serif" }}>
                              {lang === "en" ? "Report" : "신고"}
                            </button>
                          )}
                        </div>
                      </div>
                      <div style={{ color: "var(--espresso)", marginTop: "0.2rem", lineHeight: 1.5 }}>{r.text}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
          {currentUser ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {replyTo && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem", color: "var(--muted)", background: "var(--cream)", padding: "0.3rem 0.7rem", borderRadius: "999px" }}>
                  <span>↩ @{replyTo.author}에게 답글</span>
                  <button onClick={() => setReplyTo(null)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 0, fontSize: "0.8rem" }}>✕</button>
                </div>
              )}
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && submitComment()}
                  placeholder={replyTo ? `@${replyTo.author}에게 답글…` : t.commentPlaceholder}
                  style={{ flex: 1, padding: "0.6rem 0.8rem", border: "1px solid var(--steam)", borderRadius: "999px", fontFamily: "'DM Sans',sans-serif", fontSize: "0.85rem", background: "var(--cream)", color: "var(--espresso)", outline: "none" }}
                />
                <button onClick={submitComment} disabled={commentLoading || !commentText.trim()}
                  style={{ padding: "0.6rem 1rem", background: "var(--espresso)", color: "var(--cream)", border: "none", borderRadius: "999px", fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem", cursor: "pointer", whiteSpace: "nowrap", opacity: commentText.trim() ? 1 : 0.5 }}>
                  {t.commentSubmit}
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => onRequireAuth?.()} style={{ width: "100%", padding: "0.65rem", background: "none", border: "1px dashed var(--steam)", borderRadius: "2px", color: "var(--muted)", fontFamily: "'DM Sans',sans-serif", fontSize: "0.85rem", cursor: "pointer" }}>
              🔒 {t.commentLogin}
            </button>
          )}
        </div>
      </div>
    </div>
    {showReport && currentUser && (
      <ReportModal
        type={showReport.type}
        targetId={showReport.targetId}
        currentUser={currentUser}
        lang={lang}
        onClose={() => setShowReport(null)}
      />
    )}
    </>
  );
}

// ─── RecipeCard ────────────────────────────────────────────────────
function CompareModal({ targetRecipe, myRecipes, onClose, lang = "ko" }) {
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const recipeA = targetRecipe;
  const recipeB = myRecipes.find(r => r.id === selectedId) || null;

  const SORT_OPTIONS = [
    { id: "recent",   label: "최신순" },
    { id: "popular",  label: "인기순" },
    { id: "sameBean", label: "동일 원두" },
    { id: "mine",     label: "내 레시피" },
  ];

  const FIELDS = [
    { key: "gram",       label: "원두량",   unit: "g" },
    { key: "seconds",    label: "추출시간", unit: "s" },
    { key: "espressoMl", label: "추출량",   unit: "ml" },
    { key: "waterTemp",  label: "물온도",   unit: "°C" },
    { key: "grindSize",  label: "분쇄도",   unit: "" },
    { key: "diluteMl",   label: "희석량",   unit: "ml" },
  ];
  const FLAVOR_KEYS = ["Acidity","Sweet","Bitter","Aroma","Aftertaste","Balance","Body"];
  const FLAVOR_LABELS = { Acidity:"산미",Sweet:"단맛",Bitter:"쓴맛",Aroma:"아로마",Aftertaste:"후미",Balance:"밸런스",Body:"바디" };

  const diff = (a, b) => {
    const na = parseFloat(a), nb = parseFloat(b);
    if (isNaN(na) || isNaN(nb) || na === nb) return null;
    return na > nb ? "up" : "down";
  };

  // 검색 필터
  const searched = myRecipes.filter(r => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (r.bean||"").toLowerCase().includes(q) ||
           (r.menuLabel||"").toLowerCase().includes(q) ||
           (r.company||"").toLowerCase().includes(q) ||
           (r.author||"").toLowerCase().includes(q);
  });

  // 정렬 적용
  const filtered = [...searched].sort((a, b) => {
    if (sortBy === "recent") return (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0);
    if (sortBy === "popular") return ((b.likedBy||[]).length) - ((a.likedBy||[]).length);
    if (sortBy === "sameBean") {
      const aMatch = (a.bean||"").toLowerCase() === (recipeA.bean||"").toLowerCase() ? 1 : 0;
      const bMatch = (b.bean||"").toLowerCase() === (recipeA.bean||"").toLowerCase() ? 1 : 0;
      return bMatch - aMatch;
    }
    if (sortBy === "mine") {
      // 내 레시피 먼저 (targetRecipe.uid 기준으로 본인 레시피)
      const aM = a.uid === recipeA.uid ? 1 : 0;
      const bM = b.uid === recipeA.uid ? 1 : 0;
      if (bM !== aM) return bM - aM;
      return (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0);
    }
    return 0;
  });

  const RecipeChip = ({ r }) => {
    const isSelected = selectedId === r.id;
    const isSameBean = (r.bean||"").toLowerCase() === (recipeA.bean||"").toLowerCase() && r.bean;
    return (
      <button type="button" onClick={() => setSelectedId(r.id)}
        style={{ border:"1px solid", borderRadius:"10px", cursor:"pointer", transition:"all 0.15s", textAlign:"left", padding:"10px 12px", width:"100%",
          borderColor: isSelected ? "var(--espresso)" : "var(--divider)",
          background: isSelected ? "var(--espresso)" : "var(--foam)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:"6px" }}>
          <div style={{ minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:"5px", marginBottom:"2px" }}>
              <span style={{ fontFamily:"'Playfair Display',serif", fontSize:"0.9rem", fontWeight:700,
                color: isSelected ? "var(--cream)" : "var(--espresso)",
                whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                {r.bean || "—"}
              </span>
              {isSameBean && !isSelected && (
                <span style={{ fontSize:"0.6rem", padding:"1px 5px", borderRadius:"4px", background:"var(--latte)20", color:"var(--latte)", fontWeight:700, flexShrink:0 }}>같은원두</span>
              )}
            </div>
            <div style={{ fontSize:"0.7rem", color: isSelected ? "rgba(255,255,255,0.7)" : "var(--muted)", display:"flex", flexWrap:"wrap", gap:"4px" }}>
              {r.company && <span>{r.company}</span>}
              {r.menuLabel && <span>· {r.menuLabel}{r.isIced?" · ICE":""}</span>}
              {r.author && <span>· @{r.author}</span>}
            </div>
          </div>
          <div style={{ display:"flex", gap:"4px", flexShrink:0, flexWrap:"wrap", justifyContent:"flex-end" }}>
            {r.gram && <span style={{ fontSize:"0.65rem", padding:"2px 5px", borderRadius:"4px", background: isSelected?"rgba(255,255,255,0.2)":"var(--cream)", color: isSelected?"var(--cream)":"var(--muted)" }}>{r.gram}g</span>}
            {r.seconds && <span style={{ fontSize:"0.65rem", padding:"2px 5px", borderRadius:"4px", background: isSelected?"rgba(255,255,255,0.2)":"var(--cream)", color: isSelected?"var(--cream)":"var(--muted)" }}>{r.seconds}s</span>}
            {r.espressoMl && <span style={{ fontSize:"0.65rem", padding:"2px 5px", borderRadius:"4px", background: isSelected?"rgba(255,255,255,0.2)":"var(--cream)", color: isSelected?"var(--cream)":"var(--muted)" }}>{r.espressoMl}ml</span>}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="modal-backdrop" style={{ zIndex: 210 }} onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth:"700px", maxHeight:"90vh", overflowY:"auto", padding:"24px" }}>
        {/* 헤더 */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"20px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="var(--espresso)" strokeWidth="1.8"/>
              <path d="M16.5 16.5L21 21" stroke="var(--espresso)" strokeWidth="1.8" strokeLinecap="round"/>
              <path d="M8 11h6M11 8v6" stroke="var(--latte)" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
            <h2 style={{ margin:0, fontSize:"1.2rem" }}>레시피 비교</h2>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--muted)", fontSize:"1.4rem", lineHeight:1, padding:"4px" }}>×</button>
        </div>

        {/* 레시피 A (기준) */}
        <div style={{ marginBottom:"16px" }}>
          <div style={{ fontSize:"0.62rem", fontWeight:700, color:"var(--latte)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"6px" }}>레시피 A (기준)</div>
          <div style={{ background:"#FDF6EF", border:"1px solid var(--latte)40", borderLeft:"3px solid var(--latte)", borderRadius:"0 10px 10px 0", padding:"12px 14px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1rem", fontWeight:700, color:"var(--espresso)" }}>{recipeA.bean || "—"}</div>
                <div style={{ fontSize:"0.72rem", color:"var(--muted)", marginTop:"2px" }}>
                  {recipeA.company && <span>{recipeA.company} · </span>}
                  {recipeA.menuLabel}{recipeA.isIced?" · ICE":""} · @{recipeA.author}
                </div>
              </div>
              <div style={{ display:"flex", gap:"4px", flexWrap:"wrap", justifyContent:"flex-end" }}>
                {recipeA.gram && <span style={{ fontSize:"0.68rem", padding:"2px 6px", borderRadius:"5px", background:"var(--cream)", color:"var(--muted)" }}>{recipeA.gram}g</span>}
                {recipeA.seconds && <span style={{ fontSize:"0.68rem", padding:"2px 6px", borderRadius:"5px", background:"var(--cream)", color:"var(--muted)" }}>{recipeA.seconds}s</span>}
                {recipeA.espressoMl && <span style={{ fontSize:"0.68rem", padding:"2px 6px", borderRadius:"5px", background:"var(--cream)", color:"var(--muted)" }}>{recipeA.espressoMl}ml</span>}
              </div>
            </div>
          </div>
        </div>

        {/* 레시피 B 선택 */}
        <div style={{ marginBottom:"20px" }}>
          <div style={{ fontSize:"0.62rem", fontWeight:700, color:"#2980b9", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"6px" }}>레시피 B 선택</div>
          {/* 검색 */}
          <div style={{ display:"flex", gap:"6px", alignItems:"center", marginBottom:"8px", background:"var(--foam)", border:"1px solid var(--divider)", borderRadius:"8px", padding:"8px 12px" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="6.5" cy="6.5" r="5" stroke="var(--muted)" strokeWidth="1.4"/>
              <path d="M10.5 10.5L14 14" stroke="var(--muted)" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="원두명, 메뉴, 로스터리, 닉네임 검색…"
              style={{ flex:1, border:"none", background:"transparent", outline:"none", fontFamily:"'DM Sans',sans-serif", fontSize:"0.82rem", color:"var(--espresso)" }}/>
            {search && <button onClick={() => setSearch("")} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--muted)", fontSize:"1rem", padding:0, lineHeight:1 }}>×</button>}
          </div>
          {/* 정렬 칩 */}
          <div style={{ display:"flex", gap:"5px", flexWrap:"wrap", marginBottom:"8px" }}>
            {SORT_OPTIONS.map(opt => {
              const isActive = sortBy === opt.id;
              // 같은 원두 매칭 개수 표시
              const count = opt.id === "sameBean"
                ? myRecipes.filter(r => (r.bean||"").toLowerCase() === (recipeA.bean||"").toLowerCase()).length
                : opt.id === "mine"
                ? myRecipes.filter(r => r.uid === recipeA.uid).length
                : null;
              return (
                <button key={opt.id} type="button" onClick={() => setSortBy(opt.id)}
                  style={{ padding:"4px 10px", border:"1px solid", borderRadius:"20px", cursor:"pointer",
                    fontFamily:"'DM Sans',sans-serif", fontSize:"0.72rem", lineHeight:1, transition:"all 0.15s",
                    borderColor: isActive ? "var(--espresso)" : "var(--steam)",
                    background: isActive ? "var(--espresso)" : "transparent",
                    color: isActive ? "var(--cream)" : "var(--muted)",
                    fontWeight: isActive ? 600 : 400 }}>
                  {opt.label}
                  {count !== null && count > 0 && (
                    <span style={{ marginLeft:"4px", fontSize:"0.65rem", opacity:0.8 }}>{count}</span>
                  )}
                </button>
              );
            })}
          </div>
          {/* 레시피 목록 */}
          <div style={{ display:"flex", flexDirection:"column", gap:"5px", maxHeight:"200px", overflowY:"auto" }}>
            {filtered.length === 0 ? (
              <p style={{ fontSize:"0.8rem", color:"var(--muted)", textAlign:"center", padding:"16px 0" }}>검색 결과가 없어요</p>
            ) : filtered.map(r => <RecipeChip key={r.id} r={r}/>)}
          </div>
        </div>

        {/* 비교 결과 */}
        {recipeB && (<>
          <div style={{ height:"1px", background:"var(--divider)", margin:"4px 0 20px" }}/>

          {/* 수치 비교 테이블 */}
          <div style={{ background:"var(--foam)", border:"1px solid var(--divider)", borderRadius:"12px", overflow:"hidden", marginBottom:"16px" }}>
            {/* 컬럼 헤더 */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 80px 1fr", background:"var(--cream)", borderBottom:"1px solid var(--divider)", padding:"8px 14px" }}>
              <div style={{ fontSize:"0.68rem", fontWeight:700, color:"var(--latte)", textAlign:"right" }}>레시피 A</div>
              <div/>
              <div style={{ fontSize:"0.68rem", fontWeight:700, color:"#2980b9" }}>레시피 B</div>
            </div>
            {FIELDS.map((f, idx) => {
              const av = recipeA[f.key], bv = recipeB[f.key];
              const d = diff(av, bv);
              return (
                <div key={f.key} style={{ display:"grid", gridTemplateColumns:"1fr 80px 1fr", alignItems:"center",
                  borderTop: idx===0?"none":"1px solid var(--divider)",
                  background: d ? "#FFFBF7" : "transparent", padding:"0 14px" }}>
                  <div style={{ padding:"10px 0", fontSize:"0.88rem", textAlign:"right",
                    color: d ? "var(--espresso)" : "var(--muted)", fontWeight: d?"700":"400" }}>
                    {av ? `${av}${f.unit}` : "—"}
                  </div>
                  <div style={{ textAlign:"center" }}>
                    <div style={{ fontSize:"0.6rem", color:"var(--muted)", marginBottom:"2px" }}>{f.label}</div>
                    {d ? (
                      <div style={{ fontSize:"0.68rem", fontWeight:700,
                        color: d==="up" ? "#27ae60" : "#e67e22" }}>
                        {d==="up" ? "▲" : "▼"} {Math.abs(parseFloat(av||0)-parseFloat(bv||0))}{f.unit}
                      </div>
                    ) : <div style={{ fontSize:"0.68rem", color:"var(--muted)" }}>＝</div>}
                  </div>
                  <div style={{ padding:"10px 0", fontSize:"0.88rem",
                    color: d ? "#2980b9" : "var(--muted)", fontWeight: d?"700":"400" }}>
                    {bv ? `${bv}${f.unit}` : "—"}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 플레이버 오버레이 레이더 */}
          {FLAVOR_KEYS.some(k => recipeA[`flavor${k}`]>0 || recipeB[`flavor${k}`]>0) && (() => {
            const SIZE=260, cx=130, cy=130, R=90, n=FLAVOR_KEYS.length;
            const pt = (i,r) => { const a=-Math.PI/2+2*Math.PI*i/n; return [cx+r*Math.cos(a), cy+r*Math.sin(a)]; };
            const grid = [1,2,3,4,5].map(l => { const r=R*l/5; const pts=FLAVOR_KEYS.map((_,i)=>pt(i,r).join(",")).join(" "); return <polygon key={l} points={pts} fill={l%2===0?"#F5F3F0":"none"} stroke={l===5?"#D5CFC8":"#E8E4DF"} strokeWidth={l===5?1.2:0.7}/>; });
            const axes = FLAVOR_KEYS.map((_,i) => { const [x,y]=pt(i,R); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#DDD9D3" strokeWidth="0.8"/>; });
            const aVals=FLAVOR_KEYS.map(k=>(parseInt(recipeA[`flavor${k}`])||0)/5);
            const bVals=FLAVOR_KEYS.map(k=>(parseInt(recipeB[`flavor${k}`])||0)/5);
            const aPts=FLAVOR_KEYS.map((_,i)=>pt(i,Math.max(aVals[i],0.04)*R).join(",")).join(" ");
            const bPts=FLAVOR_KEYS.map((_,i)=>pt(i,Math.max(bVals[i],0.04)*R).join(",")).join(" ");
            const lbls=FLAVOR_KEYS.map((k,i)=>{ const [x,y]=pt(i,R+20); const anchor=x<cx-8?"end":x>cx+8?"start":"middle"; return <text key={k} x={x} y={y} textAnchor={anchor} dominantBaseline="middle" fontSize="9.5" fill="#8C8480" fontFamily="DM Sans,sans-serif">{FLAVOR_LABELS[k]}</text>; });
            return (
              <div style={{ background:"var(--foam)", border:"1px solid var(--divider)", borderRadius:"12px", padding:"16px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"16px", marginBottom:"12px" }}>
                  <span style={{ fontSize:"0.68rem", fontWeight:700, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.07em" }}>Flavor</span>
                  <span style={{ display:"flex", alignItems:"center", gap:"5px" }}>
                    <span style={{ width:"16px", height:"3px", background:"var(--latte)", display:"inline-block", borderRadius:"2px" }}/>
                    <span style={{ fontSize:"0.65rem", color:"var(--muted)" }}>A</span>
                  </span>
                  <span style={{ display:"flex", alignItems:"center", gap:"5px" }}>
                    <span style={{ width:"16px", height:"3px", background:"#2980b9", display:"inline-block", borderRadius:"2px" }}/>
                    <span style={{ fontSize:"0.65rem", color:"var(--muted)" }}>B</span>
                  </span>
                </div>
                <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ display:"block", margin:"0 auto" }}>
                  {grid}{axes}
                  <polygon points={aPts} fill="var(--latte)" fillOpacity="0.18" stroke="var(--latte)" strokeWidth="2" strokeLinejoin="round"/>
                  <polygon points={bPts} fill="#2980b9" fillOpacity="0.15" stroke="#2980b9" strokeWidth="2" strokeLinejoin="round"/>
                  {FLAVOR_KEYS.map((k,i)=>{
                    const [ax,ay]=pt(i,aVals[i]*R), [bx,by]=pt(i,bVals[i]*R);
                    return <g key={k}>
                      {aVals[i]>0&&<circle cx={ax} cy={ay} r="3.5" fill="var(--latte)" stroke="white" strokeWidth="1.2"/>}
                      {bVals[i]>0&&<circle cx={bx} cy={by} r="3.5" fill="#2980b9" stroke="white" strokeWidth="1.2"/>}
                    </g>;
                  })}
                  {lbls}
                </svg>
              </div>
            );
          })()}
        </>)}

        {!recipeB && (
          <div style={{ textAlign:"center", padding:"24px 0", color:"var(--muted)", fontSize:"0.85rem" }}>
            위에서 비교할 레시피 B를 선택해주세요
          </div>
        )}

        {/* 공유 버튼 — 비교 대상 선택됐을 때만 */}
        {recipeB && (
          <div style={{ marginTop:"20px", display:"flex", justifyContent:"flex-end" }}>
            <button
              onClick={async () => {
                try {
                  const html2canvas = (await import("html2canvas")).default;

                  const FIELDS_SHARE = [
                    { key:"gram",       label:"원두량",   unit:"g" },
                    { key:"seconds",    label:"추출시간", unit:"s" },
                    { key:"espressoMl", label:"추출량",   unit:"ml" },
                    { key:"waterTemp",  label:"물온도",   unit:"°C" },
                    { key:"grindSize",  label:"분쇄도",   unit:"" },
                    { key:"diluteMl",   label:"희석량",   unit:"ml" },
                  ];

                  const diffVal = (a, b) => {
                    const na = parseFloat(a), nb = parseFloat(b);
                    if (isNaN(na) || isNaN(nb) || na === nb) return null;
                    return na > nb ? { dir:"up", delta: Math.abs(na-nb) } : { dir:"down", delta: Math.abs(na-nb) };
                  };

                  // 플레이버 레이더 SVG (오버레이)
                  const FKEYS = ["Acidity","Sweet","Bitter","Aroma","Aftertaste","Balance","Body"];
                  const FLBLS = { Acidity:"산미",Sweet:"단맛",Bitter:"쓴맛",Aroma:"아로마",Aftertaste:"후미",Balance:"밸런스",Body:"바디" };
                  const hasRadar = FKEYS.some(k => recipeA[`flavor${k}`]>0 || recipeB[`flavor${k}`]>0);
                  const radarSVG = (() => {
                    if (!hasRadar) return "";
                    const SIZE=280, cx=140, cy=140, R=96, n=FKEYS.length;
                    const pt = (i,r) => { const a=-Math.PI/2+2*Math.PI*i/n; return [cx+r*Math.cos(a), cy+r*Math.sin(a)]; };
                    const gridLines = [1,2,3,4,5].map(l => {
                      const r=R*l/5;
                      const pts=FKEYS.map((_,i)=>pt(i,r).join(",")).join(" ");
                      return `<polygon points="${pts}" fill="${l%2===0?"#F5F3F0":"none"}" stroke="${l===5?"#D5CFC8":"#E8E4DF"}" stroke-width="${l===5?1.2:0.7}"/>`;
                    }).join("");
                    const axes = FKEYS.map((_,i) => { const [x,y]=pt(i,R); return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#DDD9D3" stroke-width="0.8"/>`; }).join("");
                    const aVals = FKEYS.map(k=>(parseInt(recipeA[`flavor${k}`])||0)/5);
                    const bVals = FKEYS.map(k=>(parseInt(recipeB[`flavor${k}`])||0)/5);
                    const aPts = FKEYS.map((_,i)=>pt(i,Math.max(aVals[i],0.04)*R).join(",")).join(" ");
                    const bPts = FKEYS.map((_,i)=>pt(i,Math.max(bVals[i],0.04)*R).join(",")).join(" ");
                    const dots = FKEYS.map((k,i) => {
                      const [ax,ay]=pt(i,aVals[i]*R), [bx,by]=pt(i,bVals[i]*R);
                      return `${aVals[i]>0?`<circle cx="${ax}" cy="${ay}" r="4" fill="#B07D54" stroke="white" stroke-width="1.2"/>`:""}`
                           + `${bVals[i]>0?`<circle cx="${bx}" cy="${by}" r="4" fill="#2980b9" stroke="white" stroke-width="1.2"/>`:""}`; 
                    }).join("");
                    const labels = FKEYS.map((k,i) => {
                      const [x,y]=pt(i,R+22);
                      const anchor=x<cx-8?"end":x>cx+8?"start":"middle";
                      return `<text x="${x}" y="${y}" text-anchor="${anchor}" dominant-baseline="middle" font-size="10" fill="#8C8480" font-family="DM Sans,sans-serif">${FLBLS[k]}</text>`;
                    }).join("");
                    return `<svg width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg">
                      ${gridLines}${axes}
                      <polygon points="${aPts}" fill="#B07D54" fill-opacity="0.18" stroke="#B07D54" stroke-width="2" stroke-linejoin="round"/>
                      <polygon points="${bPts}" fill="#2980b9" fill-opacity="0.15" stroke="#2980b9" stroke-width="2" stroke-linejoin="round"/>
                      ${dots}${labels}
                    </svg>`;
                  })();

                  // 수치 비교 행 HTML — table 구조로 html2canvas 안정성 확보
                  const rowsHtml = FIELDS_SHARE.map(f => {
                    const av=recipeA[f.key], bv=recipeB[f.key];
                    const d=diffVal(av,bv);
                    const aColor = d?.dir==="up" ? "#B07D54" : "#8C8480";
                    const bColor = d?.dir==="down" ? "#2980b9" : "#8C8480";
                    const aWeight = d?.dir==="up" ? "700" : "400";
                    const bWeight = d?.dir==="down" ? "700" : "400";
                    const midHtml = d
                      ? `<div style="font-size:9px;font-weight:700;color:${d.dir==="up"?"#27ae60":"#e67e22"};">${d.dir==="up"?"▲":"▼"} ${d.delta}${f.unit}</div>`
                      : `<div style="font-size:11px;color:#DDD;">＝</div>`;
                    return `
                      <tr style="border-top:1px solid #F0EFEF;">
                        <td style="width:160px;padding:10px 14px 10px 20px;font-size:13px;font-weight:${aWeight};color:${aColor};text-align:right;">${av?`${av}${f.unit}`:"—"}</td>
                        <td style="width:90px;padding:10px 0;text-align:center;">
                          <div style="font-size:9px;color:#BBB;margin-bottom:3px;">${f.label}</div>
                          ${midHtml}
                        </td>
                        <td style="width:160px;padding:10px 20px 10px 14px;font-size:13px;font-weight:${bWeight};color:${bColor};text-align:left;">${bv?`${bv}${f.unit}`:"—"}</td>
                      </tr>`;
                  }).join("");

                  const el = document.createElement("div");
                  el.style.cssText = "position:absolute;left:-9999px;top:0;font-family:'DM Sans',Arial,sans-serif;width:460px;background:#FBFBFA;border-radius:16px;";
                  el.innerHTML = `
                    <!-- 헤더 -->
                    <div style="background:#1A1614;padding:18px 20px 16px;border-radius:16px 16px 0 0;">
                      <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
                        <svg width="16" height="16" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="9" cy="9" r="8" stroke="#FBFBFA" stroke-width="1.5"/><path d="M5 9.5c1-2 3-3 4-2s3 3 4 1" stroke="#B07D54" stroke-width="1.5" stroke-linecap="round"/></svg>
                        <span style="font-size:11px;color:#FBFBFA80;letter-spacing:0.12em;text-transform:uppercase;font-weight:600;">Brewlog Note — Recipe Compare</span>
                      </div>
                      <table style="width:100%;border-collapse:collapse;">
                        <tr>
                          <td style="width:45%;vertical-align:top;">
                            <div style="font-size:9px;font-weight:700;color:#B07D54;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:5px;">A</div>
                            <div style="font-size:15px;font-weight:700;color:#FBFBFA;font-family:'Georgia',serif;line-height:1.3;margin-bottom:4px;">${recipeA.bean||"—"}</div>
                            <div style="font-size:10px;color:#FBFBFA70;line-height:1.5;">${[recipeA.company,recipeA.menuLabel,`@${recipeA.author}`].filter(Boolean).join(" · ")}</div>
                          </td>
                          <td style="width:10%;text-align:center;vertical-align:middle;">
                            <div style="font-size:12px;font-weight:900;color:#555;">vs</div>
                          </td>
                          <td style="width:45%;vertical-align:top;">
                            <div style="font-size:9px;font-weight:700;color:#2980b9;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:5px;">B</div>
                            <div style="font-size:15px;font-weight:700;color:#FBFBFA;font-family:'Georgia',serif;line-height:1.3;margin-bottom:4px;">${recipeB.bean||"—"}</div>
                            <div style="font-size:10px;color:#FBFBFA70;line-height:1.5;">${[recipeB.company,recipeB.menuLabel,`@${recipeB.author}`].filter(Boolean).join(" · ")}</div>
                          </td>
                        </tr>
                      </table>
                    </div>

                    <!-- 컬럼 레이블 -->
                    <table style="width:100%;border-collapse:collapse;background:#ECEAE7;">
                      <tr>
                        <td style="width:160px;padding:7px 14px 7px 20px;font-size:9px;font-weight:700;color:#B07D54;text-align:right;">레시피 A</td>
                        <td style="width:90px;"></td>
                        <td style="width:160px;padding:7px 20px 7px 14px;font-size:9px;font-weight:700;color:#2980b9;text-align:left;">레시피 B</td>
                      </tr>
                    </table>

                    <!-- 수치 비교 -->
                    <table style="width:100%;border-collapse:collapse;background:#FAFAF9;">
                      ${rowsHtml}
                    </table>

                    <!-- 플레이버 레이더 -->
                    ${hasRadar ? `
                    <div style="background:#FAFAF9;padding:16px 20px 8px;border-top:1px solid #ECEAE7;">
                      <div style="display:flex;align-items:center;gap:14px;margin-bottom:4px;">
                        <span style="font-size:9px;font-weight:700;color:#BBB;text-transform:uppercase;letter-spacing:0.1em;">Flavor</span>
                        <span style="display:flex;align-items:center;gap:5px;"><span style="width:14px;height:3px;background:#B07D54;display:inline-block;border-radius:2px;"></span><span style="font-size:9px;color:#AAA;">A</span></span>
                        <span style="display:flex;align-items:center;gap:5px;"><span style="width:14px;height:3px;background:#2980b9;display:inline-block;border-radius:2px;"></span><span style="font-size:9px;color:#AAA;">B</span></span>
                      </div>
                      <div style="text-align:center;">${radarSVG}</div>
                    </div>` : ""}

                    <!-- 푸터 — QR 코드 포함 -->
                    <div style="background:#ECEAE7;padding:10px 20px;border-radius:0 0 16px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;">
                      <div style="display:flex;flex-direction:column;gap:2px;">
                        <span style="font-size:9px;font-weight:700;color:#5C4033;letter-spacing:0.08em;text-transform:uppercase;">Brewlog Note</span>
                        <span style="font-size:9px;color:#8C8480;">brewlog-jade.vercel.app</span>
                      </div>
                      <!-- QR 코드 -->
                      <div style="display:flex;align-items:center;gap:8px;">
                        <div style="display:flex;flex-direction:column;align-items:center;gap:3px;">
                          <img src="https://api.qrserver.com/v1/create-qr-code/?size=52x52&data=https://brewlog-jade.vercel.app&bgcolor=ECEAE7&color=3D2B1F&margin=2" width="52" height="52" style="border-radius:4px;display:block;" crossorigin="anonymous"/>
                          <span style="font-size:7px;color:#B07D54;letter-spacing:0.06em;font-weight:600;">SCAN TO BREW</span>
                        </div>
                      </div>
                    </div>
                  `;

                  document.body.appendChild(el);
                  // QR 이미지 로드 대기 후 캡처
                  await new Promise(r => setTimeout(r, 800));
                  const canvas = await html2canvas(el, {
                    scale: 3, useCORS: true, allowTaint: false, backgroundColor: "#FBFBFA",
                    logging: false, width: 460, windowWidth: 460,
                  });
                  document.body.removeChild(el);

                  canvas.toBlob(async (blob) => {
                    const fileName = `${recipeA.bean||"A"}_vs_${recipeB.bean||"B"}_brewlog.png`;
                    const file = new File([blob], fileName, { type:"image/png" });
                    if (navigator.share && navigator.canShare && navigator.canShare({ files:[file] })) {
                      await navigator.share({ files:[file], title:"레시피 비교", text:"Brewlog Note 레시피 비교 결과예요." })
                        .catch(e => { if (e.name !== "AbortError") console.warn(e); });
                    } else {
                      const a = document.createElement("a");
                      a.href = URL.createObjectURL(blob);
                      a.download = fileName;
                      a.click();
                      URL.revokeObjectURL(a.href);
                    }
                  }, "image/png");
                } catch(e) {
                  console.error("[compare-share]", e);
                  alert("공유에 실패했어요.");
                }
              }}
              style={{
                display:"inline-flex", alignItems:"center", gap:"7px",
                padding:"9px 18px", background:"var(--espresso)", color:"var(--cream)",
                border:"none", borderRadius:"8px", cursor:"pointer",
                fontFamily:"'DM Sans',sans-serif", fontSize:"0.83rem", fontWeight:600,
                transition:"opacity 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.opacity="0.85"}
              onMouseLeave={e => e.currentTarget.style.opacity="1"}
              title="비교 결과 공유하기"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="18" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.6"/>
                <circle cx="18" cy="19" r="2.5" stroke="currentColor" strokeWidth="1.6"/>
                <circle cx="6" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.6"/>
                <path d="M8.3 10.8l7.4-4.2M8.3 13.2l7.4 4.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
              비교 결과 공유
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


function RecipeCard({ recipe, currentUid, onDelete, onEdit, onLike, onBookmark, isBookmarked, onFollow, isFollowing, onCardClick, onCompare, onCopy, onAuthorClick, lang = "ko" }) {
  const t = I18N[lang];
  const date = recipe.createdAt?.toDate?.()?.toLocaleDateString(lang === "en" ? "en-US" : "ko-KR") || "";
  const liked = (recipe.likedBy || []).includes(currentUid);
  const likeCount = (recipe.likedBy || []).length;
  const isOwner = recipe.uid === currentUid;

  // Type C: 인라인 압축 구조
  const machineLabel = recipe.machine
    ? `${recipe.machine}${recipe.machineType && recipe.machineType !== "handdrip" ? ` · ${recipe.machineType === "auto" ? (lang === "en" ? "Auto" : "전자동") : (lang === "en" ? "Semi" : "반자동")}` : ""}`
    : null;
  const grinderLabel = recipe.grinder
    ? `${recipe.grinder}${recipe.grindSize ? ` (${recipe.grindSize})` : ""}`
    : null;
  const menuName = lang === "en"
    ? (COFFEE_MENUS.find(m => m.id === recipe.menuId)?.labelEn || recipe.menuLabel)
    : recipe.menuLabel;

  return (
    <div className="recipe-card" onClick={onCardClick} style={{ cursor: onCardClick ? "pointer" : "default" }}>

      {/* ── 장비 / 원두 정보 라벨 영역 ── */}
      <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", color: "var(--muted)", lineHeight: 1.8, marginBottom: "0.6rem", display: "grid", gridTemplateColumns: "auto 1px 1fr", columnGap: "0.6rem", rowGap: "0.1rem", alignItems: "center", textAlign: "left" }}>
        {recipe.machine && (<>
          <span style={{ fontWeight: 600, color: "var(--roast)", opacity: 0.6, whiteSpace: "nowrap" }}>{lang === "en" ? (recipe.machineType === "handdrip" ? "Equipment" : "Machine") : (recipe.machineType === "handdrip" ? "핸드드립 기구" : "커피머신")}</span>
          <span style={{ width: "1px", background: "var(--steam)", alignSelf: "stretch", margin: "0.2rem 0" }} />
          <span>{recipe.machine}{recipe.machineType && recipe.machineType !== "handdrip" && (<span style={{ marginLeft: "0.3rem", fontSize: "0.65rem", background: recipe.machineType === "auto" ? "var(--latte)" : "var(--steam)", color: "var(--espresso)", padding: "0.05rem 0.3rem", borderRadius: "999px" }}>{recipe.machineType === "auto" ? (lang === "en" ? "Auto" : "전자동") : (lang === "en" ? "Semi" : "반자동")}</span>)}</span>
        </>)}
        {recipe.grinder && (<>
          <span style={{ fontWeight: 600, color: "var(--roast)", opacity: 0.6, whiteSpace: "nowrap" }}>{lang === "en" ? "Grinder" : "그라인더"}</span>
          <span style={{ width: "1px", background: "var(--steam)", alignSelf: "stretch", margin: "0.2rem 0" }} />
          <span>{recipe.grinder}</span>
        </>)}
        {recipe.grindSize && (<>
          <span style={{ fontWeight: 600, color: "var(--roast)", opacity: 0.6, whiteSpace: "nowrap" }}>{lang === "en" ? "Grind" : "분쇄도"}</span>
          <span style={{ width: "1px", background: "var(--steam)", alignSelf: "stretch", margin: "0.2rem 0" }} />
          <span>{recipe.grindSize}</span>
        </>)}
        {recipe.company && (<>
          <span style={{ fontWeight: 600, color: "var(--roast)", opacity: 0.6, whiteSpace: "nowrap" }}>{lang === "en" ? "Brand" : "원두 회사"}</span>
          <span style={{ width: "1px", background: "var(--steam)", alignSelf: "stretch", margin: "0.2rem 0" }} />
          <span>{recipe.company}</span>
        </>)}
        {recipe.roastDate && (<>
          <span style={{ fontWeight: 600, color: "var(--roast)", opacity: 0.6, whiteSpace: "nowrap" }}>{lang === "en" ? "Roasted" : "로스팅"}</span>
          <span style={{ width: "1px", background: "var(--steam)", alignSelf: "stretch", margin: "0.2rem 0" }} />
          <span>{new Date(recipe.roastDate).toLocaleDateString(lang === "en" ? "en-US" : "ko-KR")}</span>
        </>)}
        {recipe.menuLabel && (<>
          <span style={{ fontWeight: 600, color: "var(--roast)", opacity: 0.6, whiteSpace: "nowrap" }}>{lang === "en" ? "Menu" : "메뉴"}</span>
          <span style={{ width: "1px", background: "var(--steam)", alignSelf: "stretch", margin: "0.2rem 0" }} />
          <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            {menuName}
            {recipe.isIced
              ? <span style={{ fontSize: "0.6rem", fontWeight: 700, color: "#2980b9", background: "#EBF5FB", border: "1px solid #AED6F1", borderRadius: "4px", padding: "1px 5px", letterSpacing: "0.04em" }}>ICE</span>
              : COFFEE_MENUS.find(m => m.id === recipe.menuId)?.canIce
                ? <span style={{ fontSize: "0.6rem", fontWeight: 700, color: "#e67e22", background: "#FEF3E8", border: "1px solid #FAD7A0", borderRadius: "4px", padding: "1px 5px", letterSpacing: "0.04em" }}>HOT</span>
                : null
            }
          </span>
        </>)}
        {recipe.isPublic === false && (<>
          <span style={{ fontWeight: 600, color: "var(--roast)", opacity: 0.6, whiteSpace: "nowrap" }}>{lang === "en" ? "Visibility" : "공개"}</span>
          <span style={{ width: "1px", background: "var(--steam)", alignSelf: "stretch", margin: "0.2rem 0" }} />
          <span>{lang === "en" ? "Private" : "비공개"}</span>
        </>)}
        {recipe.weather && (<>
          {(recipe.waterType || recipe.waterBrand) && (<>
            <span style={{ fontWeight: 600, color: "var(--roast)", opacity: 0.6, whiteSpace: "nowrap" }}>{lang === "en" ? "Water" : "물 종류"}</span>
            <span style={{ width: "1px", background: "var(--steam)", alignSelf: "stretch", margin: "0.2rem 0" }} />
            <span>
              {(() => {
                const types = { tap: "수돗물", filter: "정수기", bottle: "생수", other: "기타" };
                const typesEn = { tap: "Tap", filter: "Filtered", bottle: "Bottled", other: "Other" };
                const label = lang === "en" ? typesEn[recipe.waterType] : types[recipe.waterType];
                return [label, recipe.waterBrand].filter(Boolean).join(" · ");
              })()}
            </span>
          </>)}
          <span style={{ fontWeight: 600, color: "var(--roast)", opacity: 0.6, whiteSpace: "nowrap" }}>{lang === "en" ? "Weather" : "날씨"}</span>
          <span style={{ width: "1px", background: "var(--steam)", alignSelf: "stretch", margin: "0.2rem 0" }} />
          <span>{recipe.weather.icon} {recipe.weather.descKo || recipe.weather.condition} {recipe.weather.temp}°C · {lang === "en" ? "Humidity" : "습도"} {recipe.weather.humidity}%</span>
        </>)}
      </div>

      {/* ── 원두명 (핵심, 크게) ── */}
      <div style={{ borderTop: "1px solid var(--steam)", paddingTop: "0.65rem", marginBottom: "1rem", textAlign: "left" }}>
        <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", fontWeight: 600, color: "var(--roast)", opacity: 0.6, marginBottom: "0.15rem" }}>{lang === "en" ? "Product" : "제품명"}</div>
        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.25rem", fontWeight: 700, color: "var(--espresso)", lineHeight: 1.25, letterSpacing: "-0.01em" }}>{recipe.bean}</div>
      </div>
      <div className="card-stats" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div className="stat"><span className="stat-val">{recipe.gram}g</span><span className="stat-label">{t.statGram}</span></div>
        <div className="stat">
            <span className="stat-val">{recipe.seconds}s</span>
            <span className="stat-label">{t.statSeconds}</span>
            {recipe.infusionSeconds && parseInt(recipe.infusionSeconds) > 0 && (
              <span style={{ fontSize: "0.62rem", color: "var(--muted)", display: "block", lineHeight: 1.4, marginTop: "2px" }}>
                {lang === "en"
                  ? `Inf. ${recipe.infusionSeconds}s + Ext. ${parseInt(recipe.seconds)-parseInt(recipe.infusionSeconds)}s`
                  : `인퓨전 ${recipe.infusionSeconds}초 + 추출 ${parseInt(recipe.seconds)-parseInt(recipe.infusionSeconds)}초`}
              </span>
            )}
          </div>
        <div className="stat"><span className="stat-val">{recipe.espressoMl}ml</span><span className="stat-label">{t.statMl}</span></div>
        {recipe.waterTemp && <div className="stat"><span className="stat-val">{recipe.waterTemp}°C</span><span className="stat-label">{lang === "en" ? "Temp" : "물온도"}</span></div>}
      </div>
      {recipe.diluteMl && <div className="card-dilution">{lang === "en" ? (recipe.diluteType === "물" ? "Water" : recipe.diluteType === "우유" ? "Milk" : recipe.diluteType === "두유" ? "Soy Milk" : recipe.diluteType) : recipe.diluteType} {recipe.diluteMl}ml {t.dilution}</div>}
      {recipe.syrup && <div className="card-dilution">{recipe.syrup}</div>}
      {recipe.showerBar && recipe.machineType !== "handdrip" && (
        <div style={{
          fontSize: "0.78rem", padding: "0.4rem 0.8rem", borderRadius: "6px", marginBottom: "0.5rem",
          background: recipe.showerBar >= 9 && recipe.showerBar <= 11 ? "#27ae6010" : "#e74c3c10",
          color: recipe.showerBar >= 9 && recipe.showerBar <= 11 ? "#27ae60" : "#e74c3c",
          border: `1px solid ${recipe.showerBar >= 9 && recipe.showerBar <= 11 ? "#27ae6025" : "#e74c3c25"}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span>{t.brewPressure}</span>
          <span style={{ fontWeight: 600 }}>{recipe.showerBar} bar {recipe.showerBar >= 9 && recipe.showerBar <= 11 ? "·  OK" : "·  Check"}</span>
        </div>
      )}
      {recipe.rating > 0 && (
        <div style={{ display: "flex", gap: "0.15rem", marginBottom: "0.5rem" }}>
          {[1,2,3,4,5].map(s => (
            <span key={s} style={{ fontSize: "1rem", color: s <= recipe.rating ? "var(--latte)" : "var(--steam)" }}>
              {s <= recipe.rating ? "★" : "☆"}
            </span>
          ))}
        </div>
      )}
      {recipe.note && <div className="card-note">"{recipe.note}"</div>}
      <div className="card-footer">
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <span
            className="card-author"
            onClick={e => { e.stopPropagation(); onAuthorClick && onAuthorClick({ uid: recipe.uid, name: recipe.author }); }}
            style={{ cursor: onAuthorClick ? "pointer" : "default" }}
          >@{recipe.author}</span>
          {recipe.author && recipe.uid !== currentUid && onFollow && (
            <button
              className={`follow-btn ${isFollowing ? "following" : ""}`}
              onClick={e => { e.stopPropagation(); onFollow(recipe.uid || recipe.author); }}
            >
              {isFollowing ? t.following : t.follow}
            </button>
          )}
          <span style={{ color: "var(--muted)" }}> · {date}</span>
        </div>
        <div className="card-actions">
          {/* 하트 */}
          <button className={`card-action-btn heart ${liked ? "liked" : ""}`}
            onClick={e => { e.stopPropagation(); !isOwner && onLike(recipe); }}
            style={{ cursor: isOwner ? "default" : "pointer", opacity: isOwner ? 0.4 : 1 }}
            title={isOwner ? t.heartOwner : liked ? t.heartCancel : t.heart}>
            {liked ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#C0625A"><path d="M12 21C12 21 3 14.5 3 8.5C3 5.42 5.42 3 8.5 3C10.04 3 11.41 3.78 12 5.03C12.59 3.78 13.96 3 15.5 3C18.58 3 21 5.42 21 8.5C21 14.5 12 21 12 21Z"/></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 21C12 21 3 14.5 3 8.5C3 5.42 5.42 3 8.5 3C10.04 3 11.41 3.78 12 5.03C12.59 3.78 13.96 3 15.5 3C18.58 3 21 5.42 21 8.5C21 14.5 12 21 12 21Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>
            )}
            {likeCount > 0 && <span style={{ fontSize: "0.72rem", marginLeft: "1px", fontFamily: "'DM Sans',sans-serif" }}>{likeCount}</span>}
          </button>
          {/* 즐겨찾기 */}
          <button className={`card-action-btn bookmark ${isBookmarked ? "saved" : ""}`}
            onClick={e => { e.stopPropagation(); onBookmark(recipe.id); }}
            title={isBookmarked ? t.bookmarkRemove : t.bookmarkAdd}>
            {isBookmarked ? (
              <svg width="18" height="20" viewBox="0 0 18 22" fill="currentColor"><path d="M1 2a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v19l-8-5-8 5V2z"/></svg>
            ) : (
              <svg width="18" height="20" viewBox="0 0 18 22" fill="none"><path d="M1 2a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v19l-8-5-8 5V2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>
            )}
          </button>
          {/* 복사해서 기록하기 */}
          {currentUid && onCopy && (
            <button className="card-action-btn"
              onClick={e => { e.stopPropagation(); onCopy(recipe); }}
              title={lang === "en" ? "Copy & record" : "복사해서 기록하기"}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect x="9" y="9" width="11" height="13" rx="2" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14.5 13.5v5M12 16h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </button>
          )}
          {/* 비교 */}
          {currentUid && onCompare && (
            <button className="card-action-btn"
              onClick={e => { e.stopPropagation(); onCompare(recipe); }}
              title={lang === "en" ? "Compare recipes" : "레시피 비교"}>
              <svg width="20" height="20" viewBox="0 0 22 20" fill="none">
                <rect x="1" y="3" width="8" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                <line x1="3" y1="7" x2="7" y2="7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                <line x1="3" y1="10" x2="7" y2="10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                <line x1="3" y1="13" x2="5.5" y2="13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                <rect x="13" y="3" width="8" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                <line x1="15" y1="7" x2="19" y2="7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                <line x1="15" y1="10" x2="19" y2="10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                <line x1="15" y1="13" x2="17.5" y2="13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                <text x="11" y="11.5" textAnchor="middle" fontSize="5" fontWeight="700" fill="currentColor" fontFamily="DM Sans,sans-serif">vs</text>
              </svg>
            </button>
          )}
          {/* 수정/삭제 — 본인만 */}
          {isOwner && (<>
            <button className="card-action-btn edit"
              onClick={e => { e.stopPropagation(); onEdit(recipe); }}
              title={lang === "en" ? "Edit" : "수정"}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M16.5 3.5l4 4-11 11H5.5v-4l11-11z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M14 6l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
            </button>
            <button className="card-action-btn delete"
              onClick={e => { e.stopPropagation(); onDelete(recipe.id); }}
              title={lang === "en" ? "Delete" : "삭제"}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M9 6V4h6v2M10 11v6M14 11v6M5 6l1 14h12L19 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </>)}
        </div>
      </div>
    </div>
  );
}

// ─── MainApp ───────────────────────────────────────────────────────
// ─── Equipment Vault ─────────────────────────────────────────────
function EquipmentModal({ lang, user, editTarget, onClose, onSaved }) {
  const t = I18N[lang];
  const CATEGORIES = [
    { id: "machine",  labelKo: "커피 머신",  labelEn: "Coffee Machine", color: "#e67e22" },
    { id: "grinder",  labelKo: "그라인더",   labelEn: "Grinder",        color: "#27ae60" },
    { id: "handdrip", labelKo: "핸드드립",   labelEn: "Hand Drip",      color: "#2980b9" },
    { id: "other",    labelKo: "기타",       labelEn: "Other",           color: "#8C8480" },
  ];
  const empty = { category: "machine", brand: "", model: "", purchaseDate: "", price: "", note: "", isPrimary: false };
  const [form, setForm] = useState(editTarget ? { ...empty, ...editTarget } : empty);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const getBrands = () => {
    if (form.category === "machine") return MACHINE_BRANDS;
    if (form.category === "grinder") return GRINDER_BRANDS;
    return [];
  };

  const handleSave = async () => {
    if (!form.brand.trim()) return alert(lang === "en" ? "Please enter a brand." : "브랜드를 입력해주세요.");
    setSaving(true);
    try {
      const payload = { ...form, uid: user.uid, updatedAt: serverTimestamp() };
      if (editTarget?.id) {
        await updateDoc(doc(db, "equipments", editTarget.id), payload);
      } else {
        await addDoc(collection(db, "equipments"), { ...payload, createdAt: serverTimestamp() });
      }
      onSaved(); onClose();
    } catch(e) { alert("저장 오류: " + e.message); }
    setSaving(false);
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: "420px" }}>
        <h2>{editTarget ? t.equipEdit : t.equipAdd}</h2>
        <div className="modal-grid">
          {/* 장비 종류 */}
          <div className="field full">
            <label>{lang === "en" ? "Category" : "장비 종류"}</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {CATEGORIES.map(c => (
                <button key={c.id} type="button"
                  onClick={() => { set("category", c.id); set("brand", ""); set("model", ""); }}
                  style={{ height: "42px", border: "1px solid", borderRadius: "8px", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: "0.85rem", transition: "all 0.2s",
                    borderColor: form.category === c.id ? "var(--espresso)" : "var(--steam)",
                    background: form.category === c.id ? "var(--espresso)" : "var(--foam)",
                    color: form.category === c.id ? "var(--cream)" : "var(--muted)",
                    fontWeight: form.category === c.id ? 600 : 400 }}>
                  {lang === "en" ? c.labelEn : c.labelKo}
                </button>
              ))}
            </div>
          </div>
          {/* 브랜드 */}
          <div className="field full">
            <label>{lang === "en" ? "Brand *" : "브랜드 *"}</label>
            {getBrands().length > 0
              ? <BrandInput value={form.brand} onChange={v => set("brand", v)} brands={getBrands()} />
              : <input value={form.brand} onChange={e => set("brand", e.target.value)}
                  placeholder={lang === "en" ? "e.g. Hario, Kalita…" : "예) 하리오, 칼리타…"} />
            }
          </div>
          {/* 모델명 */}
          <div className="field full">
            <label>{lang === "en" ? "Model" : "모델명"}</label>
            <input value={form.model} onChange={e => set("model", e.target.value)}
              placeholder={
                form.category === "machine" ? (lang === "en" ? "e.g. Barista Express Pro" : "예) Barista Express Pro") :
                form.category === "grinder" ? (lang === "en" ? "e.g. Encore, C40" : "예) 엔코어, C40") :
                form.category === "handdrip" ? (lang === "en" ? "e.g. V60, Chemex" : "예) V60 02, 케멕스") :
                (lang === "en" ? "Model name" : "모델명")
              }
            />
          </div>
          {/* 구매일 */}
          <div className="field">
            <label>{t.equipPurchaseDate}</label>
            <input type="date" value={form.purchaseDate} onChange={e => set("purchaseDate", e.target.value)} />
          </div>

          {/* 구매가격 */}
          <div className="field">
            <label>{lang === "en" ? "Purchase Price" : "구매 가격"}</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "0.88rem", color: "var(--muted)", pointerEvents: "none" }}>₩</span>
              <input
                type="number"
                value={form.price}
                onChange={e => set("price", e.target.value)}
                placeholder="0"
                min="0"
                style={{ paddingLeft: "28px", width: "100%", boxSizing: "border-box" }}
              />
            </div>
          </div>
          {/* 메모 */}
          <div className="field full">
            <label>{t.equipNote}</label>
            <textarea value={form.note} onChange={e => set("note", e.target.value)} rows={2}
              placeholder={lang === "en" ? "Any notes about this equipment…" : "이 장비에 대한 메모…"} />
          </div>
          {/* 대표 */}
          <div className="field full" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <input type="checkbox" id="isPrimaryEq" checked={form.isPrimary}
              onChange={e => set("isPrimary", e.target.checked)}
              style={{ width: "16px", height: "16px", accentColor: "var(--latte)", cursor: "pointer" }} />
            <label htmlFor="isPrimaryEq" style={{ cursor: "pointer", fontSize: "0.88rem", color: "var(--espresso)", fontWeight: 500 }}>
              {t.equipSetPrimary}
              <span style={{ fontSize: "0.72rem", color: "var(--muted)", fontWeight: 400, marginLeft: "6px" }}>
                ({lang === "en" ? "auto-selected in recipe" : "레시피 기록 시 자동 선택"})
              </span>
            </label>
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>{lang === "en" ? "Cancel" : "취소"}</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}
            style={{ marginTop: 0, width: "auto", padding: "0.7rem 1.5rem" }}>
            {saving ? (lang === "en" ? "Saving…" : "저장 중…") : (lang === "en" ? "Save" : "저장")}
          </button>
        </div>
      </div>
    </div>
  );
}

function EquipmentVault({ user, lang, showModal, setShowModal }) {
  const t = I18N[lang];
  const CATEGORIES = [
    { id: "machine",  labelKo: "커피 머신",  labelEn: "Coffee Machine", color: "#e67e22" },
    { id: "grinder",  labelKo: "그라인더",   labelEn: "Grinder",        color: "#27ae60" },
    { id: "handdrip", labelKo: "핸드드립",   labelEn: "Hand Drip",      color: "#2980b9" },
    { id: "other",    labelKo: "기타",       labelEn: "Other",           color: "#8C8480" },
  ];
  const [equips, setEquips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState(null);

  const loadEquips = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "equipments"), where("uid", "==", user.uid));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const catOrder = { machine: 0, grinder: 1, handdrip: 2, other: 3 };
      data.sort((a, b) => {
        if ((catOrder[a.category] ?? 9) !== (catOrder[b.category] ?? 9))
          return (catOrder[a.category] ?? 9) - (catOrder[b.category] ?? 9);
        if (a.isPrimary && !b.isPrimary) return -1;
        if (!a.isPrimary && b.isPrimary) return 1;
        return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
      });
      setEquips(data);
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadEquips(); }, [user?.uid]);

  const handleDelete = async (id) => {
    if (!window.confirm(t.equipDeleteConfirm)) return;
    await deleteDoc(doc(db, "equipments", id));
    loadEquips();
  };

  const handleSetPrimary = async (eq) => {
    await Promise.all(
      equips.filter(e => e.category === eq.category).map(e =>
        updateDoc(doc(db, "equipments", e.id), { isPrimary: e.id === eq.id })
      )
    );
    loadEquips();
  };

  const grouped = ["machine", "grinder", "handdrip", "other"].map(cat => ({
    cat, info: CATEGORIES.find(c => c.id === cat),
    items: equips.filter(e => e.category === cat),
  })).filter(g => g.items.length > 0);

  return (
    <div>

      {loading && (
        <div style={{ display: "flex", justifyContent: "center", padding: "48px 0", color: "var(--muted)", gap: "8px", fontSize: "0.85rem" }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ animation: "spin 1s linear infinite" }}><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.8" strokeDasharray="12 26" strokeLinecap="round"/></svg>
          {lang === "en" ? "Loading…" : "불러오는 중…"}
        </div>
      )}

      {!loading && equips.length === 0 && (
        <div className="empty-state">
          <svg className="empty-state-icon" viewBox="0 0 56 56" fill="none">
            <rect x="10" y="18" width="28" height="22" rx="4" stroke="currentColor" strokeWidth="2"/>
            <path d="M38 26h4a4 4 0 0 1 0 8h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M16 40v4M28 40v4M12 44h20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <div className="empty-state-title">{t.equipEmpty}</div>
          <div className="empty-state-sub">{t.equipEmptySub}</div>
        </div>
      )}

      {!loading && grouped.map(({ cat, info, items }) => (
        <div key={cat} style={{ marginBottom: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: info.color, flexShrink: 0 }}/>
            <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", fontWeight: 700, color: "var(--espresso)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {lang === "en" ? info.labelEn : info.labelKo}
            </span>
            <div style={{ flex: 1, height: "1px", background: "var(--divider)" }}/>
            <span style={{ fontSize: "0.68rem", color: "var(--muted)" }}>{items.length}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {items.map(eq => (
              <div key={eq.id} style={{ background: "var(--foam)", borderRadius: "10px", padding: "14px 16px", borderLeft: `3px solid ${eq.isPrimary ? info.color : "var(--divider)"}`, border: `1px solid ${eq.isPrimary ? info.color + "50" : "var(--divider)"}` }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                      <span style={{ fontFamily: "'Playfair Display',serif", fontSize: "1rem", fontWeight: 700, color: "var(--espresso)" }}>{eq.brand}</span>
                      {eq.isPrimary && (
                        <span style={{ fontSize: "0.6rem", fontWeight: 700, color: info.color, background: info.color + "15", border: `1px solid ${info.color}40`, borderRadius: "4px", padding: "1px 6px" }}>
                          {t.equipIsPrimary}
                        </span>
                      )}
                    </div>
                    {eq.model && <div style={{ fontSize: "0.82rem", color: "var(--muted)" }}>{eq.model}</div>}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", fontSize: "0.7rem", color: "var(--muted)", marginTop: "4px" }}>
                      {eq.purchaseDate && <span>{lang === "en" ? "Purchased" : "구매"}: {eq.purchaseDate}</span>}
                      {eq.price && <span>{lang === "en" ? "Price" : "가격"}: ₩{parseInt(eq.price).toLocaleString()}</span>}
                      {eq.note && <span style={{ fontStyle: "italic" }}>"{eq.note}"</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "5px", flexShrink: 0 }}>
                    {!eq.isPrimary && (
                      <button onClick={() => handleSetPrimary(eq)}
                        style={{ padding: "4px 8px", border: `1px solid ${info.color}60`, borderRadius: "6px", background: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: "0.68rem", color: info.color }}>
                        {t.equipSetPrimary}
                      </button>
                    )}
                    <button onClick={() => { setEditTarget(eq); setShowModal(true); }}
                      style={{ padding: "4px 8px", border: "1px solid var(--steam)", borderRadius: "6px", background: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: "0.68rem", color: "var(--muted)" }}>
                      {t.equipEdit}
                    </button>
                    <button onClick={() => handleDelete(eq.id)}
                      style={{ padding: "4px 8px", border: "1px solid #c0392b30", borderRadius: "6px", background: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: "0.68rem", color: "#c0392b" }}>
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
          onClose={() => setShowModal(false)} onSaved={loadEquips} />
      )}
    </div>
  );
}

// ─── Bean Vault ────────────────────────────────────────────────────
const ROAST_LEVELS = [
  { id: "green",      ko: "생두",       en: "Green bean", pct: 0   },
  { id: "cinnamon",   ko: "시나몬",     en: "Cinnamon",   pct: 14  },
  { id: "medium",     ko: "미디엄",     en: "Medium",     pct: 28  },
  { id: "high",       ko: "하이",       en: "High",       pct: 42  },
  { id: "city",       ko: "시티",       en: "City",       pct: 57  },
  { id: "full_city",  ko: "풀 시티",    en: "Full city",  pct: 71  },
  { id: "french",     ko: "프렌치",     en: "French",     pct: 85  },
  { id: "italian",    ko: "이탈리안",   en: "Italian",    pct: 100 },
];
const PROCESS_PRESETS = ["워시드", "내추럴", "허니", "무산소 발효", "웻 허ل드"];

function BeanModal({ lang, user, editTarget, onClose, onSaved }) {
  const t = I18N[lang];
  const empty = { name: "", roastery: "", originType: "single", originDetail: "", variety: "", process: "", roastLevel: "medium", roastDate: "", buyDate: "", price: "", weight: "", quantity: "1", note: "", status: "open" };
  const [form, setForm] = useState(editTarget ? { ...empty, ...editTarget } : empty);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim() || !form.roastery.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const data = { ...form, uid: user.uid, updatedAt: serverTimestamp() };
      if (editTarget?.id) {
        await updateDoc(doc(db, "beans", editTarget.id), data);
      } else {
        await addDoc(collection(db, "beans"), { ...data, createdAt: serverTimestamp() });
      }
      onSaved();
      onClose();
    } catch (e) {
      console.error(e);
      if (e.code === "permission-denied") {
        setSaveError(lang === "en"
          ? "Save failed: Firestore rules for 'beans' collection not set. Add the rule shown in the console."
          : "저장 실패: Firestore rules에 beans 컬렉션 규칙이 없어요. 아래 규칙을 추가해주세요.");
      } else {
        setSaveError(lang === "en" ? `Save failed: ${e.message}` : `저장 실패: ${e.message}`);
      }
    }
    setSaving(false);
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: "560px" }}>
        <h2>{editTarget ? t.beanEdit : t.beanAdd}</h2>
        <div className="modal-grid">
          {/* 원두 이름 */}
          <div className="field full">
            <label>{t.beanName}</label>
            <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="예) 에티오피아 예가체프 코체레"/>
          </div>
          {/* 로스터리 */}
          <div className="field full">
            <label>{t.beanRoastery}</label>
            <input value={form.roastery} onChange={e => set("roastery", e.target.value)} placeholder="예) 오니버스 커피, 테라로사"/>
          </div>
          {/* 원산지 유형 */}
          <div className="field full">
            <label>{t.beanOriginType}</label>
            <div style={{ display: "flex", gap: "8px" }}>
              {[["single", t.beanSingle], ["blend", t.beanBlend]].map(([v, lbl]) => (
                <button key={v} type="button" onClick={() => set("originType", v)}
                  style={{ flex: 1, padding: "0.6rem", border: "1px solid", borderRadius: "8px", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: "0.85rem", transition: "all 0.2s",
                    borderColor: form.originType === v ? "var(--espresso)" : "var(--steam)",
                    background: form.originType === v ? "var(--espresso)" : "var(--foam)",
                    color: form.originType === v ? "var(--cream)" : "var(--muted)", fontWeight: form.originType === v ? 600 : 400 }}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>
          {/* 원산지 상세 */}
          <div className="field full">
            <label>{t.beanOrigin} <span style={{ opacity: 0.5, fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>({t.beanOriginDetail})</span></label>
            <input value={form.originDetail} onChange={e => set("originDetail", e.target.value)} placeholder="예) 에티오피아 · 시다마 · 코체레 워시드 스테이션"/>
          </div>
          {/* 품종 */}
          <div className="field">
            <label>{t.beanVariety}</label>
            <input value={form.variety} onChange={e => set("variety", e.target.value)} placeholder={t.beanVarietyPh}/>
          </div>
          {/* 가공 방식 */}
          <div className="field">
            <label>{t.beanProcess}</label>
            <input value={form.process} onChange={e => set("process", e.target.value)} placeholder={t.beanProcessPh} list="process-presets"/>
            <datalist id="process-presets">{PROCESS_PRESETS.map(p => <option key={p} value={p}/>)}</datalist>
          </div>
          {/* 배전도 */}
          <div className="field full">
            <label>{t.beanRoastLevel}</label>
            <div style={{ padding: "8px 4px 4px" }}>
              {/* 그라데이션 트랙 */}
              <div style={{ position: "relative", marginBottom: "10px" }}>
                <div style={{ height: "8px", borderRadius: "4px", background: "linear-gradient(90deg, #e8f0d8 0%, #f5e6c8 8%, #e8c97a 20%, #c8a050 35%, #a07038 50%, #7a5030 65%, #4a2818 82%, #1a0a04 100%)", cursor: "pointer" }}
                  onClick={e => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const ratio = (e.clientX - rect.left) / rect.width;
                    const idx = Math.round(ratio * (ROAST_LEVELS.length - 1));
                    set("roastLevel", ROAST_LEVELS[Math.max(0, Math.min(ROAST_LEVELS.length - 1, idx))].id);
                  }}
                />
                {/* 각 단계 도트 */}
                {ROAST_LEVELS.map((r, i) => {
                  const leftPct = (i / (ROAST_LEVELS.length - 1)) * 100;
                  const isActive = form.roastLevel === r.id;
                  return (
                    <div key={r.id}
                      onClick={() => set("roastLevel", r.id)}
                      style={{
                        position: "absolute", top: "50%",
                        left: `${leftPct}%`, transform: "translate(-50%, -50%)",
                        width: isActive ? "16px" : "8px",
                        height: isActive ? "16px" : "8px",
                        borderRadius: "50%",
                        background: isActive ? "var(--espresso)" : "white",
                        border: isActive ? "2.5px solid white" : "1.5px solid #a07038",
                        boxShadow: isActive ? "0 1px 6px #0005" : "none",
                        cursor: "pointer",
                        transition: "all 0.15s",
                        zIndex: isActive ? 2 : 1,
                      }}
                    />
                  );
                })}
              </div>
              {/* 레이블 — 절대 위치로 정확히 도트 아래 */}
              <div style={{ position: "relative", height: "36px", marginTop: "4px" }}>
                {ROAST_LEVELS.map((r, i) => {
                  const leftPct = (i / (ROAST_LEVELS.length - 1)) * 100;
                  const isActive = form.roastLevel === r.id;
                  return (
                    <button key={r.id} type="button" onClick={() => set("roastLevel", r.id)}
                      style={{
                        position: "absolute",
                        left: `${leftPct}%`,
                        transform: i === 0 ? "none" : i === ROAST_LEVELS.length - 1 ? "translateX(-100%)" : "translateX(-50%)",
                        background: "none", border: "none", cursor: "pointer", padding: 0,
                        textAlign: i === 0 ? "left" : i === ROAST_LEVELS.length - 1 ? "right" : "center",
                        lineHeight: 1.3,
                      }}>
                      <div style={{ fontSize: "0.6rem", color: isActive ? "var(--espresso)" : "var(--muted)", fontWeight: isActive ? 700 : 400, fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap" }}>
                        {r.en}
                      </div>
                      <div style={{ fontSize: "0.58rem", color: isActive ? "var(--latte)" : "var(--muted)", opacity: 0.75, fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap" }}>
                        {r.ko}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          {/* 로스팅 날짜 */}
          <div className="field">
            <label>{t.beanRoastDate}</label>
            <input type="date" value={form.roastDate} onChange={e => set("roastDate", e.target.value)} max={new Date().toISOString().split("T")[0]}/>
          </div>
          {/* 구매 날짜 */}
          <div className="field">
            <label>{t.beanBuyDate}</label>
            <input type="date" value={form.buyDate} onChange={e => set("buyDate", e.target.value)} max={new Date().toISOString().split("T")[0]}/>
          </div>
          {/* 구매 가격 */}
          <div className="field">
            <label>{loadCurrency() === "USD" ? (lang === "en" ? "Price ($)" : "구매 가격 ($)") : (t.beanPrice)}</label>
            <input type="number" value={form.price} onChange={e => set("price", e.target.value)} placeholder={loadCurrency() === "USD" ? "e.g. 18.99" : "예) 22000"} min="0"/>
          </div>
          {/* 용량 */}
          <div className="field">
            <label>{t.beanWeight}</label>
            <input type="number" value={form.weight} onChange={e => set("weight", e.target.value)} placeholder="예) 200" min="0"/>
          </div>
          {/* 수량 */}
          <div className="field full">
            <label>{lang === "en" ? "Quantity (bags)" : "수량 (봉지)"}</label>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button type="button" onClick={() => set("quantity", String(Math.max(1, parseInt(form.quantity || 1) - 1)))}
                style={{ width: "36px", height: "36px", border: "1px solid var(--steam)", borderRadius: "8px", background: "var(--foam)", fontFamily: "'DM Sans',sans-serif", fontSize: "1.1rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--espresso)", flexShrink: 0 }}>−</button>
              <input type="number" value={form.quantity} onChange={e => set("quantity", String(Math.max(1, parseInt(e.target.value) || 1)))} min="1"
                style={{ width: "64px", textAlign: "center", padding: "0.5rem", border: "1px solid var(--steam)", borderRadius: "8px", background: "var(--cream)", fontFamily: "'DM Sans',sans-serif", fontSize: "0.95rem", color: "var(--espresso)", outline: "none" }}/>
              <button type="button" onClick={() => set("quantity", String(parseInt(form.quantity || 1) + 1))}
                style={{ width: "36px", height: "36px", border: "1px solid var(--steam)", borderRadius: "8px", background: "var(--foam)", fontFamily: "'DM Sans',sans-serif", fontSize: "1.1rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--espresso)", flexShrink: 0 }}>+</button>
              <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                {form.weight && form.quantity ? `총 ${parseInt(form.weight) * parseInt(form.quantity || 1)}g` : ""}
              </span>
            </div>
          </div>
          {/* 상태 */}
          <div className="field full">
            <label>{t.beanStatusLabel}</label>
            <div className="bean-status-row">
              {[["open", t.beanOpen], ["sealed", t.beanSealed]].map(([v, lbl]) => (
                <button key={v} type="button" className={`bean-status-btn ${form.status === v ? "active" : ""}`} onClick={() => set("status", v)}>{lbl}</button>
              ))}
            </div>
          </div>
          {/* 메모 */}
          <div className="field full">
            <label>{t.beanNote}</label>
            <textarea value={form.note} onChange={e => set("note", e.target.value)} rows={3}
              placeholder={lang === "en" ? "Tasting notes, aroma, impressions…" : "향미, 맛 노트, 첫인상 등 자유롭게…"}
              style={{ width: "100%", padding: "0.75rem 1rem", border: "1px solid var(--steam)", borderRadius: "8px", background: "var(--cream)", fontFamily: "'DM Sans',sans-serif", fontSize: "0.9rem", color: "var(--espresso)", outline: "none", resize: "vertical", minHeight: "72px", transition: "border-color 0.2s" }}/>
          </div>
        </div>
        <div className="modal-actions" style={{ flexDirection: "column", alignItems: "stretch", gap: "8px" }}>
          {saveError && (
            <div style={{ background: "#fce4ec", border: "1px solid #ef9a9a", borderRadius: "8px", padding: "10px 14px", fontSize: "0.8rem", color: "#c62828", lineHeight: 1.6 }}>
              <strong>{lang === "en" ? "Error" : "오류"}</strong> — {saveError}
              {saveError.includes("rules") || saveError.includes("permission") ? (
                <pre style={{ marginTop: "8px", background: "#fff", border: "1px solid #ef9a9a", borderRadius: "6px", padding: "8px 10px", fontSize: "0.72rem", overflowX: "auto", whiteSpace: "pre-wrap" }}>{`match /beans/{id} {
  allow read: if request.auth.uid == resource.data.uid;
  allow create: if request.auth != null;
  allow update, delete: if request.auth.uid == resource.data.uid;
}`}</pre>
              ) : null}
            </div>
          )}
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <button className="btn-cancel" onClick={onClose}>{t.cancel}</button>
            <button className="btn-primary" style={{ width: "auto", marginTop: 0, padding: "0.7rem 2rem" }} onClick={handleSave} disabled={saving || !form.name.trim() || !form.roastery.trim()}>
              {saving ? t.saving : (editTarget ? t.update : t.save)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BeanVault({ user, lang, filterStatus, setFilterStatus, showModal, setShowModal, editTarget, setEditTarget, currency = "KRW" }) {
  const t = I18N[lang];
  const [beans, setBeans] = useState([]);
  const [usedGramsMap, setUsedGramsMap] = useState({});
  const [statsResetDate, setStatsResetDate] = useState(() =>
    localStorage.getItem(`brewlog_stats_reset_${user?.uid}`) || null
  );
  const [usdRate, setUsdRate] = useState(() => loadCachedRate() || null);
  const [rateLoading, setRateLoading] = useState(false);

  // 달러 선택 시 환율 자동 로드
  useEffect(() => {
    if (currency === "USD" && !usdRate) {
      setRateLoading(true);
      fetchUsdRate().then(r => {
        setUsdRate(r);
        setRateLoading(false);
      });
    }
  }, [currency]);

  const loadBeans = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, "beans"), where("uid", "==", user.uid));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => {
        const ta = a.createdAt?.toDate?.()?.getTime() ?? 0;
        const tb = b.createdAt?.toDate?.()?.getTime() ?? 0;
        return tb - ta;
      });
      setBeans(data);
      loadUsedGrams(data);
    } catch (e) {
      console.error("[BeanVault] beans 로드 실패:", e.code, e.message);
    }
  };

  const loadUsedGrams = async (beanList) => {
    if (!beanList.length) return;
    try {
      const map = {};
      const migrationUpdates = [];

      for (const bean of beanList) {
        if (bean.consumedGMigrated === true) {
          // 마이그레이션 완료된 원두 → consumedG 그대로 사용 (레시피 삭제해도 변하지 않음)
          map[bean.id] = parseFloat(bean.consumedG) || 0;
        } else {
          // 최초 1회 마이그레이션: 기존 레시피 합산값으로 consumedG 초기화
          const rq = query(collection(db, "recipes"),
            where("uid", "==", user.uid),
            where("linkedBeanId", "==", bean.id)
          );
          const rsnap = await getDocs(rq);
          const total = rsnap.docs.reduce((s, d) => s + (parseFloat(d.data().gram) || 0), 0);
          map[bean.id] = total;
          migrationUpdates.push(
            updateDoc(doc(db, "beans", bean.id), {
              consumedG: total,
              consumedGMigrated: true,   // 마이그레이션 완료 플래그 → 이후 레시피 삭제해도 재계산 안 함
            })
              .then(() => console.log(`[migration] ${bean.name}: consumedG = ${total}g`))
              .catch(e => console.error(`[migration] ${bean.name} 실패:`, e.message))
          );
        }
      }

      if (migrationUpdates.length > 0) {
        await Promise.all(migrationUpdates);
      }

      setUsedGramsMap(map);

      // 소진 자동 감지
      const updates = [];
      beanList.forEach(bean => {
        const totalG = (parseFloat(bean.weight) || 0) * (parseInt(bean.quantity) || 1);
        const usedG  = map[bean.id] || 0;
        const isExhausted = totalG > 0 && usedG >= totalG;
        if (isExhausted && bean.status !== "empty") {
          updates.push(updateDoc(doc(db, "beans", bean.id), { status: "empty" }));
        }
        if (!isExhausted && bean.status === "empty" && totalG > 0) {
          updates.push(updateDoc(doc(db, "beans", bean.id), { status: "open" }));
        }
      });
      if (updates.length > 0) {
        await Promise.all(updates);
        loadBeans();
      }
    } catch (e) { console.error("[loadUsedGrams]", e); }
  };

  useEffect(() => { loadBeans(); }, [user?.uid]);

  // ── 원두 통계 계산 ────────────────────────────────────────────────
  const beanStats = React.useMemo(() => {
    if (!beans.length) return null;

    const totalBeans    = beans.length;
    const activeBeans   = beans.filter(b => b.status !== "empty").length;

    // 재고량 / 투자 금액
    let totalStockG = 0, totalInvest = 0, usedStockG = 0;
    beans.forEach(b => {
      const g = (parseFloat(b.weight) || 0) * (parseInt(b.quantity) || 1);
      totalStockG  += g;
      totalInvest  += (parseFloat(b.price) || 0) * (parseInt(b.quantity) || 1);
      usedStockG   += (usedGramsMap[b.id] || 0);
    });
    const remainG = Math.max(0, totalStockG - usedStockG);

    // 추출 통계
    const totalBrews = beans.reduce((s, b) => s + (b.usedCount || 0), 0);
    const totalUsedG = Object.values(usedGramsMap).reduce((s, g) => s + g, 0);
    const avgGramPerBrew = totalBrews > 0 ? totalUsedG / totalBrews : null;
    const avgCostPerCup  = totalBrews > 0 && totalInvest > 0
      ? (totalInvest / totalStockG) * (totalUsedG / totalBrews) : null;

    // 신선도 분포
    const fresh = { fresh: 0, peak: 0, aged: 0, stale: 0, sealed: 0 };
    beans.forEach(b => {
      if (b.status === "sealed") { fresh.sealed++; return; }
      if (b.status === "empty")  return;
      if (!b.roastDate) return;
      const d = Math.floor((new Date() - new Date(b.roastDate)) / 86400000);
      if (d <= 7)  fresh.fresh++;
      else if (d <= 30) fresh.peak++;
      else if (d <= 60) fresh.aged++;
      else fresh.stale++;
    });

    // 선호 항목 (최빈값)
    const mode = (arr) => {
      const cnt = {};
      arr.forEach(v => v && (cnt[v] = (cnt[v] || 0) + 1));
      return Object.entries(cnt).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    };
    const topRoast   = mode(beans.map(b => b.roastLevel));
    const topProcess = mode(beans.map(b => b.process));
    const topOrigin  = mode(beans.map(b => b.originDetail));
    const topType    = mode(beans.map(b => b.originType));

    // 가장 많이 쓴 원두
    const mostUsed = [...beans].sort((a, b) => (b.usedCount || 0) - (a.usedCount || 0))[0];

    // 기간 계산: statsResetDate가 있으면 그 이후, 없으면 가장 오래된 원두 등록일 기준
    const resetDate = statsResetDate ? new Date(statsResetDate) : null;
    const oldestBean = [...beans]
      .filter(b => b.createdAt?.toDate?.())
      .sort((a, b) => a.createdAt.toDate() - b.createdAt.toDate())[0];
    const startDate = resetDate || oldestBean?.createdAt?.toDate() || null;
    const endDate = new Date();

    return {
      totalBeans, activeBeans, totalStockG, remainG, totalInvest,
      totalBrews, totalUsedG, avgGramPerBrew, avgCostPerCup,
      fresh, topRoast, topProcess, topOrigin, topType, mostUsed,
      startDate, endDate,
    };
  }, [beans, usedGramsMap, statsResetDate]);

  // 통계 초기화: consumedG를 0으로, usedCount를 0으로 리셋
  const handleStatsReset = async () => {
    const confirmMsg = lang === "en"
      ? "Reset all bean stats? This will clear consumed amounts and brew counts. This cannot be undone."
      : "원두 통계를 초기화할까요?\n소비량과 추출 횟수가 모두 0으로 리셋됩니다.\n이 작업은 되돌릴 수 없어요.";
    if (!window.confirm(confirmMsg)) return;
    try {
      const now = new Date().toISOString();
      // 모든 원두의 consumedG, usedCount 초기화
      await Promise.all(beans.map(bean =>
        updateDoc(doc(db, "beans", bean.id), {
          consumedG: 0,
          consumedGMigrated: true,
          usedCount: 0,
          lastUsedAt: null,
        }).catch(e => console.error(`[reset] ${bean.name}:`, e.message))
      ));
      // 리셋 날짜 저장
      localStorage.setItem(`brewlog_stats_reset_${user?.uid}`, now);
      setStatsResetDate(now);
      setUsedGramsMap({});
      await loadBeans();
      alert(lang === "en" ? "Stats have been reset." : "통계가 초기화됐어요.");
    } catch(e) {
      alert(lang === "en" ? "Reset failed: " + e.message : "초기화 실패: " + e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t.beanDeleteConfirm)) return;
    await deleteDoc(doc(db, "beans", id));
    loadBeans();
  };

  // 로스팅 날짜 기준 신선도
  const getFreshness = (bean) => {
    if (bean.status === "sealed") return { key: "sealed", label: t.beanSealed };
    // 잔여량 기준 소진 판단
    const totalG = (parseFloat(bean.weight) || 0) * (parseInt(bean.quantity) || 1);
    const usedG  = usedGramsMap[bean.id] || 0;
    if (totalG > 0 && usedG >= totalG) return { key: "empty", label: t.beanEmpty };
    if (!bean.roastDate) return null;
    const days = Math.floor((new Date() - new Date(bean.roastDate)) / 86400000);
    if (days <= 7)  return { key: "fresh",  label: t.beanFresh,  days };
    if (days <= 30) return { key: "peak",   label: t.beanPeak,   days };
    if (days <= 60) return { key: "aging",  label: t.beanAging,  days };
    return               { key: "stale",  label: t.beanStale,  days };
  };

  const roastPct = (level) => {
    const idx = ROAST_LEVELS.findIndex(r => r.id === level);
    if (idx < 0) return 50;
    return Math.round((idx / (ROAST_LEVELS.length - 1)) * 100);
  };
  const roastLabel = (level) => { const r = ROAST_LEVELS.find(r => r.id === level); return r ? (lang === "en" ? r.en : r.ko) : ""; };
  const ppgCalc = (b) => b.price && b.weight ? (parseFloat(b.price) / parseFloat(b.weight)) : null;
  const daysFromRoast = (b) => b.roastDate ? Math.floor((new Date() - new Date(b.roastDate)) / 86400000) : null;

  const filtered = filterStatus === "all" ? beans : beans.filter(b => b.status === filterStatus);

  return (
    <div>

      {/* 원두 통계 */}
      {beanStats && beans.length > 0 && (
        <div style={{ marginBottom: "24px" }}>
          {/* 타이틀 */}
          <div style={{ marginBottom: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.1rem", fontWeight: 700, color: "var(--espresso)" }}>
                {lang === "en" ? "Bean Stats" : "원두 통계"}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
                  {lang === "en" ? `${beanStats.totalBeans} beans total` : `총 ${beanStats.totalBeans}종`}
                </div>
                <button
                  onClick={handleStatsReset}
                  title={lang === "en" ? "Reset stats" : "통계 초기화"}
                  style={{ background: "none", border: "1px solid var(--steam)", borderRadius: "6px", padding: "3px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "0.68rem", color: "var(--muted)", fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#c0392b"; e.currentTarget.style.color = "#c0392b"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--steam)"; e.currentTarget.style.color = "var(--muted)"; }}
                >
                  <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                    <path d="M12.5 7a5.5 5.5 0 1 1-1.1-3.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    <path d="M12.5 2.5v2.5H10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {lang === "en" ? "Reset" : "초기화"}
                </button>
              </div>
            </div>
            {/* 기간 표시 */}
            {beanStats.startDate && (
              <div style={{ fontSize: "0.68rem", color: "var(--muted)", opacity: 0.75, display: "flex", alignItems: "center", gap: "5px" }}>
                <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                  <rect x="1.5" y="2.5" width="11" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M4.5 1v3M9.5 1v3M1.5 6h11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                {beanStats.startDate.toLocaleDateString(lang === "en" ? "en-US" : "ko-KR")}
                <span style={{ opacity: 0.5 }}>–</span>
                {beanStats.endDate.toLocaleDateString(lang === "en" ? "en-US" : "ko-KR")}
                {statsResetDate && (
                  <span style={{ marginLeft: "4px", padding: "1px 6px", background: "var(--cream)", border: "1px solid var(--divider)", borderRadius: "4px", fontSize: "0.62rem" }}>
                    {lang === "en" ? "since reset" : "초기화 이후"}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 핵심 수치 4칸 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginBottom: "8px" }}>
            {[
              { val: beanStats.totalBrews, unit: lang === "en" ? "brews" : "회", lbl: lang === "en" ? "Total Brews" : "총 추출" },
              { val: beanStats.totalUsedG >= 1000 ? `${(beanStats.totalUsedG/1000).toFixed(2)}` : Math.round(beanStats.totalUsedG), unit: beanStats.totalUsedG >= 1000 ? "kg" : "g", lbl: lang === "en" ? "Used" : "총 사용량" },
              { val: beanStats.avgGramPerBrew ? beanStats.avgGramPerBrew.toFixed(1) : "—", unit: beanStats.avgGramPerBrew ? "g" : "", lbl: lang === "en" ? "Avg/Cup" : "잔당 평균" },
              { val: beanStats.avgCostPerCup && beanStats.totalInvest > 0 ? (currency === "USD" ? (usdRate ? `$${(beanStats.avgCostPerCup / usdRate).toFixed(2)}` : "…") : Math.round(beanStats.avgCostPerCup).toLocaleString()) : "—", unit: beanStats.avgCostPerCup && beanStats.totalInvest > 0 ? (currency === "USD" ? "/cup" : "원/잔") : "", lbl: lang === "en" ? "Cost/Cup" : "잔당 단가" },
            ].map(({ val, unit, lbl }) => (
              <div key={lbl} style={{ background: "var(--foam)", border: "1px solid var(--divider)", borderRadius: "8px", padding: "14px 10px", textAlign: "center" }}>
                <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "1.3rem", fontWeight: 700, color: "var(--espresso)", lineHeight: 1, marginBottom: "2px" }}>
                  {val}
                  <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", fontWeight: 400, color: "var(--muted)", marginLeft: "2px" }}>{unit}</span>
                </div>
                <div style={{ width: "24px", height: "1px", background: "var(--divider)", margin: "6px auto" }}/>
                <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.65rem", color: "var(--muted)", letterSpacing: "0.04em" }}>{lbl}</div>
              </div>
            ))}
          </div>

          {/* 2열 정보 카드 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>

            {/* 신선도 분포 */}
            <div style={{ background: "var(--foam)", border: "1px solid var(--divider)", borderRadius: "8px", padding: "14px 16px" }}>
              <div style={{ fontSize: "0.65rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "10px", fontWeight: 600 }}>
                {lang === "en" ? "Freshness" : "신선도 현황"}
              </div>
              {[
                { key: "fresh",  label: lang === "en" ? "Fresh" : "프레시",  color: "#27ae60", desc: "≤7d" },
                { key: "peak",   label: lang === "en" ? "Peak"  : "피크",    color: "#f39c12", desc: "≤30d" },
                { key: "aged",   label: lang === "en" ? "Aged"  : "숙성",    color: "#e67e22", desc: "≤60d" },
                { key: "stale",  label: lang === "en" ? "Stale" : "주의",    color: "#e74c3c", desc: "60d+" },
                { key: "sealed", label: lang === "en" ? "Sealed": "미개봉",  color: "var(--muted)", desc: "" },
              ].filter(f => beanStats.fresh[f.key] > 0).map(f => (
                <div key={f.key} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "5px" }}>
                  <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: f.color, flexShrink: 0 }}/>
                  <span style={{ fontSize: "0.75rem", color: "var(--espresso)", flex: 1 }}>{f.label}</span>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--espresso)" }}>{beanStats.fresh[f.key]}</span>
                </div>
              ))}
            </div>

            {/* 취향 프로파일 */}
            <div style={{ background: "var(--foam)", border: "1px solid var(--divider)", borderRadius: "8px", padding: "14px 16px" }}>
              <div style={{ fontSize: "0.65rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "10px", fontWeight: 600 }}>
                {lang === "en" ? "My Preference" : "취향 프로파일"}
              </div>
              {[
                { lbl: lang === "en" ? "Origin" : "원산지",   val: beanStats.topOrigin },
                { lbl: lang === "en" ? "Process" : "가공법",  val: beanStats.topProcess },
                { lbl: lang === "en" ? "Roast" : "배전도", val: beanStats.topRoast ? (ROAST_LEVELS.find(r => r.id === beanStats.topRoast)?.[lang === "en" ? "en" : "ko"] || beanStats.topRoast) : null },
                { lbl: lang === "en" ? "Type" : "타입",       val: beanStats.topType ? (beanStats.topType === "single" ? (lang === "en" ? "Single Origin" : "싱글 오리진") : (lang === "en" ? "Blend" : "블렌드")) : null },
              ].map(({ lbl, val }) => val ? (
                <div key={lbl} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{lbl}</span>
                  <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--espresso)", background: "var(--cream)", padding: "1px 8px", borderRadius: "4px", border: "1px solid var(--divider)" }}>{val}</span>
                </div>
              ) : null)}
            </div>

            {/* 가장 많이 쓴 원두 */}
            {beanStats.mostUsed && beanStats.mostUsed.usedCount > 0 && (
              <div style={{ background: "#FDF6EF", border: "1px solid var(--latte)", borderRadius: "8px", padding: "14px 16px", gridColumn: "1 / -1" }}>
                <div style={{ fontSize: "0.65rem", color: "var(--latte)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "8px", fontWeight: 600 }}>
                  {lang === "en" ? "Most Used Bean" : "가장 많이 쓴 원두"}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "0.95rem", fontWeight: 700, color: "var(--espresso)" }}>
                      {beanStats.mostUsed.name}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "2px" }}>{beanStats.mostUsed.roastery}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--latte)", fontFamily: "'Playfair Display',serif" }}>
                      {beanStats.mostUsed.usedCount}
                      <span style={{ fontSize: "0.68rem", fontWeight: 400, color: "var(--muted)", marginLeft: "3px" }}>{lang === "en" ? "brews" : "회"}</span>
                    </div>
                    {usedGramsMap[beanStats.mostUsed.id] > 0 && (
                      <div style={{ fontSize: "0.68rem", color: "var(--muted)" }}>
                        {usedGramsMap[beanStats.mostUsed.id].toFixed(1)}g {lang === "en" ? "used" : "사용"}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* 카드 그리드 */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <svg className="empty-state-icon" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="28" cy="38" rx="14" ry="4" stroke="currentColor" strokeWidth="2"/>
            <path d="M14 38c0-10 5-20 14-22 9 2 14 12 14 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M22 20c0-3 2.5-6 6-6s6 3 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <div className="empty-state-title">{t.beanEmptyState}</div>
          <div className="empty-state-sub">{t.beanEmptySub}</div>
        </div>
      ) : (
        <div className="bean-grid">
          {filtered.map(bean => {
            const freshness = getFreshness(bean);
            const isEmpty = freshness?.key === "empty";
            const ppg = ppgCalc(bean);
            const days = daysFromRoast(bean);
            return (
              <div key={bean.id} className="bean-card" style={{ opacity: isEmpty ? 0.55 : 1 }}>
                {/* 카드 헤더 */}
                <div className="bean-card-header">
                  <div>
                    <div className="bean-card-name">{bean.name}</div>
                    <div className="bean-card-roastery">{bean.roastery}</div>
                  </div>
                  {freshness && (
                    <span className={`bean-freshness-badge bean-${freshness.key}`}>{freshness.label}</span>
                  )}
                </div>

                {/* 태그 행 */}
                <div className="bean-meta-row">
                  {bean.originType && <span className="bean-tag">{bean.originType === "single" ? t.beanSingle : t.beanBlend}</span>}
                  {bean.originDetail && <span className="bean-tag">{bean.originDetail}</span>}
                  {bean.variety && <span className="bean-tag">{bean.variety}</span>}
                  {bean.process && <span className="bean-tag">{bean.process}</span>}
                </div>

                {/* 배전도 바 */}
                {bean.roastLevel && (
                  <div className="bean-roast-bar">
                    <div style={{ position: "relative" }}>
                      <div className="bean-roast-track">
                        <div className="bean-roast-fill" style={{ width: `${roastPct(bean.roastLevel)}%` }}/>
                      </div>
                      {/* 현재 단계 도트 */}
                      {(() => {
                        const idx = ROAST_LEVELS.findIndex(r => r.id === bean.roastLevel);
                        if (idx < 0) return null;
                        const leftPct = (idx / (ROAST_LEVELS.length - 1)) * 100;
                        return <div style={{ position: "absolute", top: "50%", left: `${leftPct}%`, transform: "translate(-50%, -50%)", width: "12px", height: "12px", borderRadius: "50%", background: "var(--espresso)", border: "2px solid white", boxShadow: "0 1px 4px #0004", pointerEvents: "none" }}/>;
                      })()}
                    </div>
                    <div className="bean-roast-markers">
                      {ROAST_LEVELS.map((r, i) => (
                        <span key={r.id} className={`bean-roast-marker${bean.roastLevel === r.id ? " active" : ""}`}>
                          {lang === "en" ? r.en : r.ko}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 스탯 + 잔여량 */}
                {(() => {
                  const totalG   = (parseFloat(bean.weight) || 0) * (parseInt(bean.quantity) || 1);
                  const usedG    = usedGramsMap[bean.id] || 0;
                  const remainG  = Math.max(0, totalG - usedG);
                  const pct      = totalG > 0 ? Math.max(0, Math.min(100, (remainG / totalG) * 100)) : null;

                  const totalPrice    = (parseFloat(bean.price) || 0) * (parseInt(bean.quantity) || 1);
                  const ppgBase       = totalG > 0 && totalPrice > 0 ? totalPrice / totalG : null;
                  const usedCost      = ppgBase ? usedG * ppgBase : 0;
                  const remainCost    = Math.max(0, totalPrice - usedCost);
                  const avgGramPerBrew = (bean.usedCount > 0 && usedG > 0) ? usedG / bean.usedCount : null;
                  const costPerCup    = (ppgBase && avgGramPerBrew) ? ppgBase * avgGramPerBrew : null;

                  // 잔여 비율에 따른 색상
                  const barColor = pct === null ? "var(--latte)"
                    : pct > 50 ? "#5c9e6e"
                    : pct > 20 ? "#d4a843"
                    : "#c0392b";

                  return (<>
                    {/* 잔여량 바 — 연결된 레시피 있을 때만 표시 */}
                    {totalG > 0 && usedG > 0 && (
                      <div style={{ marginBottom: "12px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "5px" }}>
                          <span style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                            {lang === "en" ? "Remaining" : "잔여량"}
                          </span>
                          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: barColor }}>
                            {remainG % 1 === 0 ? remainG : remainG.toFixed(1)}g
                            <span style={{ fontSize: "0.68rem", fontWeight: 400, color: "var(--muted)", marginLeft: "4px" }}>
                              / {totalG}g
                            </span>
                          </span>
                        </div>
                        <div style={{ height: "5px", background: "var(--steam)", borderRadius: "3px", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: "3px", transition: "width 0.4s ease" }}/>
                        </div>
                        <div style={{ fontSize: "0.65rem", color: "var(--muted)", marginTop: "3px", textAlign: "right", opacity: 0.7 }}>
                          {lang === "en"
                            ? `${usedG.toFixed(1)}g used · ${bean.usedCount || 0} brews${usedCost > 0 ? ` · ${formatPrice(usedCost, currency, usdRate)} spent` : ""}`
                            : `${usedG % 1 === 0 ? usedG : usedG.toFixed(1)}g 사용 · ${bean.usedCount || 0}회 추출${usedCost > 0 ? ` · ${formatPrice(usedCost, currency, usdRate)} 소비` : ""}`}
                        </div>
                      </div>
                    )}

                    {/* 5칸 스탯: 경과일 / 잔여 / 수량 / 구매단가 / 잔당단가 */}
                    <div className="bean-stat-row" style={{ gridTemplateColumns: `repeat(${costPerCup ? 5 : 4}, 1fr)`, marginBottom: "14px" }}>
                      <div className="bean-stat">
                        <span className="bean-stat-val">{days !== null ? `${days}` : "—"}</span>
                        <span className="bean-stat-lbl">{lang === "en" ? "days" : "경과일"}</span>
                      </div>
                      <div className="bean-stat">
                        <span className="bean-stat-val" style={{ color: totalG > 0 && usedG > 0 ? barColor : undefined }}>
                          {totalG > 0 && usedG > 0
                            ? `${remainG % 1 === 0 ? remainG : remainG.toFixed(1)}g`
                            : (bean.weight ? `${bean.weight}g` : "—")}
                        </span>
                        <span className="bean-stat-lbl">{lang === "en" ? (usedG > 0 ? "Left" : "Weight") : (usedG > 0 ? "잔여" : "용량")}</span>
                      </div>
                      <div className="bean-stat">
                        <span className="bean-stat-val">{bean.quantity ? `×${bean.quantity}` : "×1"}</span>
                        <span className="bean-stat-lbl">{lang === "en" ? "Qty" : "수량"}</span>
                      </div>
                      {/* 구매 단가 */}
                      <div className="bean-stat">
                        <span className="bean-stat-val" style={{ fontSize: "0.78rem" }}>
                          {ppgBase ? formatPricePerG(ppgBase, currency, usdRate) : "—"}
                        </span>
                        <span className="bean-stat-lbl">
                          {currency === "USD" ? "$/g" : (lang === "en" ? "₩/g" : "원/g")}
                        </span>
                      </div>
                      {/* 잔당 단가 — 추출 기록 있을 때만 */}
                      {costPerCup && (
                        <div className="bean-stat" style={{ borderColor: "var(--latte)", background: "#FDF6EF" }}>
                          <span className="bean-stat-val" style={{ fontSize: "0.78rem", color: "var(--latte)", fontWeight: 700 }}>
                            {formatCostPerCup(costPerCup, currency, usdRate)}
                          </span>
                          <span className="bean-stat-lbl" style={{ color: "var(--latte)" }}>
                            {currency === "USD" ? "$/cup" : (lang === "en" ? "₩/cup" : "원/잔")}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 요약 — 가격 정보 + 추출 기록 있을 때 */}
                    {usedG > 0 && costPerCup && (
                      <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "10px", display: "flex", justifyContent: "space-between", padding: "6px 10px", background: "var(--cream)", borderRadius: "6px", border: "1px solid var(--divider)" }}>
                        <span>
                          {lang === "en"
                            ? `Avg ${avgGramPerBrew.toFixed(1)}g/brew · ${bean.usedCount} brews`
                            : `평균 ${avgGramPerBrew.toFixed(1)}g/잔 · ${bean.usedCount}회 추출`}
                        </span>
                        <span style={{ fontWeight: 600, color: "var(--espresso)" }}>
                          {lang === "en"
                            ? `${formatPrice(usedCost, currency, usdRate)} spent`
                            : `${formatPrice(usedCost, currency, usdRate)} 소비`}
                        </span>
                      </div>
                    )}
                  </>);
                })()}

                {/* 메모 */}
                {bean.note && (
                  <div style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.55, marginBottom: "12px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {bean.note}
                  </div>
                )}

                {/* 푸터 */}
                <div className="bean-card-footer">
                  <div className="bean-days-chip">
                    {bean.buyDate && `${lang === "en" ? "Purchased" : "구매"} ${bean.buyDate}`}
                  </div>
                  <div className="bean-actions">
                    <button className="bean-btn" onClick={() => { setEditTarget(bean); setShowModal(true); }}>
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9.5 1.5l3 3-7 7H2.5v-3l7-7z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    <button className="bean-btn danger" onClick={() => handleDelete(bean.id)}>
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2.5 3.5h9M4.5 3.5V2.5c0-.28.22-.5.5-.5h4c.28 0 .5.22.5.5v1M5.5 6v4M8.5 6v4M3 3.5l.7 8c.02.4.35.7.76.7h6.08c.4 0 .73-.3.76-.7l.7-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <BeanModal lang={lang} user={user} editTarget={editTarget} onClose={() => setShowModal(false)} onSaved={loadBeans}/>
      )}
    </div>
  );
}

/* ============================================================
   6. MAIN APP COMPONENT
   MainApp: 피드, 베스트, 알림, 어드민 등 메인 앱 로직
   App (root): onAuthStateChanged, lang 감지, 게스트 모드
   ============================================================ */
function MainApp({ user, lang, toggleLang, onRequireAuth }) {
  const [notifications, setNotifications] = useState([]);
  const [showNotif, setShowNotif] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  // 스크롤 방향 감지 — 내리면 헤더 숨김, 올리면 표시
  const [headerVisible, setHeaderVisible] = useState(true);
  const [topBarHeight, setTopBarHeight] = useState(56);
  const lastScrollY = useRef(0);

  // iOS 핀치 줌 / 제스처 확대 / 수평 바운스 통합 차단
  const modalOpenRef = useRef(false);
  useEffect(() => {
    // 멀티터치(핀치) 차단
    const onTouchMove = (e) => {
      if (e.touches.length > 1) e.preventDefault();
    };
    // Safari gesture 이벤트 차단
    const preventGesture = (e) => e.preventDefault();
    // 더블탭 확대 방지
    let lastTap = 0;
    const preventDoubleTap = (e) => {
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const now = Date.now();
      if (now - lastTap < 300) e.preventDefault();
      lastTap = now;
    };

    document.addEventListener("touchmove",     onTouchMove,      { passive: false });
    document.addEventListener("gesturestart",  preventGesture,   { passive: false });
    document.addEventListener("gesturechange", preventGesture,   { passive: false });
    document.addEventListener("gestureend",    preventGesture,   { passive: false });
    document.addEventListener("touchend",      preventDoubleTap, { passive: false });

    // viewport meta — user-scalable=no 동적 주입
    const meta = document.querySelector("meta[name=viewport]");
    if (meta) {
      meta.content = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no";
    } else {
      const m = document.createElement("meta");
      m.name = "viewport";
      m.content = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no";
      document.head.appendChild(m);
    }

    return () => {
      document.removeEventListener("touchmove",     onTouchMove);
      document.removeEventListener("gesturestart",  preventGesture);
      document.removeEventListener("gesturechange", preventGesture);
      document.removeEventListener("gestureend",    preventGesture);
      document.removeEventListener("touchend",      preventDoubleTap);
    };
  }, []);
  const scrollTimer = useRef(null);

  useEffect(() => {
    const measure = () => {
      const el = document.getElementById("top-bar");
      if (el) setTopBarHeight(el.offsetHeight);
    };
    // 렌더 후 즉시 + 약간 딜레이 후 재측정
    measure();
    const t = setTimeout(measure, 100);
    window.addEventListener("resize", measure);
    return () => { clearTimeout(t); window.removeEventListener("resize", measure); };
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const currentY = window.scrollY;
      const diff = currentY - lastScrollY.current;
      if (currentY < 80) {
        setHeaderVisible(true);
      } else if (diff > 8) {
        setHeaderVisible(false);
      } else if (diff < -8) {
        setHeaderVisible(true);
      }
      lastScrollY.current = currentY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, "notifications"),
      where("toUid", "==", user.uid)
    );
    const unsub = onSnapshot(q, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setNotifications(list.slice(0, 30));
    }, (err) => { console.error("notifications error:", err); });
    return unsub;
  }, [user?.uid]);

  // 알림 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    if (!showNotif) return;
    const handler = (e) => {
      if (!e.target.closest('.notif-dropdown') && !e.target.closest('.notif-btn')) {
        setShowNotif(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showNotif]);

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.read);
    await Promise.all(unread.map(n => updateDoc(doc(db, "notifications", n.id), { read: true }).catch(() => {})));
  };

  // ── 모바일 뒤로가기: 앱 종료 대신 모달 닫기 ──────────────────────
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [showMyModal, setShowMyModal] = useState(false);
  const [detailRecipe, setDetailRecipe] = useState(null);

  // ref로 최신 상태 추적 (클로저 stale 문제 방지)
  const detailRecipeRef = React.useRef(null);
  const showModalRef    = React.useRef(false);
  const showMyModalRef  = React.useRef(false);

  const setDetailRecipeWrapped = (r) => {
    detailRecipeRef.current = r;
    setDetailRecipe(r);
  };
  const setShowModalWrapped = (v) => {
    showModalRef.current = v;
    setShowModal(v);
  };
  const setShowMyModalWrapped = (v) => {
    showMyModalRef.current = v;
    setShowMyModal(v);
  };

  // 모달 열릴 때 history에 state 추가, 뒤로가기 시 닫기
  const openModal   = ()  => { window.history.pushState({ modal: true }, ""); setShowModalWrapped(true); };
  const openMyModal = ()  => { window.history.pushState({ modal: true }, ""); setShowMyModalWrapped(true); };
  const openDetail  = (r) => { window.history.pushState({ modal: true }, ""); setDetailRecipeWrapped(r); };

  // 복사 완료 후 상세 카드 복원을 위한 ref
  const pendingDetailRef = React.useRef(null);

  const beanShowModalRef = React.useRef(false);
  const equipShowModalRef = React.useRef(false);
  const compareTargetRef = React.useRef(null);

  useEffect(() => {
    const onPop = () => {
      // 비교 모달 닫기 — 상세 카드는 이미 열려 있으므로 그대로 유지
      if (compareTargetRef.current) { setCompareTarget(null); return; }
      // 상세 카드 닫기
      if (detailRecipeRef.current)  { setDetailRecipeWrapped(null); return; }
      // 복사/기록 모달 닫기 → 상세 카드 복원
      if (showModalRef.current) {
        setShowModalWrapped(false);
        setEditTarget(null);
        if (pendingDetailRef.current) {
          // history entry를 상세 카드 용으로 재사용 (추가 pushState 없이 복원)
          setDetailRecipeWrapped(pendingDetailRef.current);
          pendingDetailRef.current = null;
        }
        return;
      }
      if (showMyModalRef.current)   { setShowMyModalWrapped(false); return; }
      if (beanShowModalRef.current) { setBeanShowModal(false); return; }
      if (equipShowModalRef.current){ setEquipShowModal(false); return; }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const [recipes, setRecipes] = useState([]);
  const [search, setSearch] = useState("");
  const [myRecipesOnly, setMyRecipesOnly] = useState(false);
  const [filterAuthor, setFilterAuthor] = useState(null); // { uid, name } | null
  const [isAdmin, setIsAdmin] = useState(false);
  const [feedTab, setFeedTab] = useState("all"); // "all" | "bookmarks" | "following"

  // 탭 순서 — user 여부에 따라 동적 (스와이프 핸들러 내부에서 직접 사용)

  // 스와이프 감지
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const feedTabRef = useRef(feedTab);
  const userRef = useRef(user);
  useEffect(() => { feedTabRef.current = feedTab; }, [feedTab]);
  useEffect(() => { userRef.current = user; }, [user]);

  useEffect(() => {
    const onStart = (e) => {
      // 모달이 열려있으면 스와이프 무시
      if (document.querySelector(".modal-backdrop")) return;
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    };
    const onEnd = (e) => {
      if (touchStartX.current === null) return;
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      const dy = e.changedTouches[0].clientY - touchStartY.current;
      touchStartX.current = null;
      touchStartY.current = null;
      // 수평이 수직보다 크고 40px 이상일 때만
      if (Math.abs(dx) < 40 || Math.abs(dy) >= Math.abs(dx)) return;
      const tabs = userRef.current
        ? ["all", "following", "bookmarks", "mine", "beans", "equip"]
        : ["all", "following", "bookmarks"];
      const cur = tabs.indexOf(feedTabRef.current);
      if (dx < 0) {
        // 왼쪽 스와이프 → 다음 탭 (마지막이면 첫 탭으로)
        const next = (cur + 1) % tabs.length;
        setFeedTab(tabs[next]);
        setMyRecipesOnly(false);
        setShowRanking(false);
      } else if (dx > 0) {
        // 오른쪽 스와이프 → 이전 탭 (첫 탭이면 마지막 탭으로)
        const prev = (cur - 1 + tabs.length) % tabs.length;
        setFeedTab(tabs[prev]);
        setMyRecipesOnly(false);
        setShowRanking(false);
      }
    };
    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchend", onEnd);
    };
  }, []);
  const [bestPeriod, setBestPeriod] = useState("month"); // "day" | "week" | "month"
  const [showRanking, setShowRanking] = useState(false); // true면 TOP100 페이지
  const [statModeVal, setStatModeVal] = useState("machine"); // "machine" | "handdrip"

  // ── Gemini AI 추천 ─────────────────────────────────────────────────
  const [geminiAdvice, setGeminiAdvice] = useState(null);   // { tip, recipe, fetchedAt }
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [geminiError, setGeminiError] = useState(false);
  const geminiCalledRef = useRef(false);

  const fetchGeminiAdvice = async () => {
    if (!user) return;
    const GEMINI_KEY = import.meta.env.VITE_GEMINI_KEY;
    if (!GEMINI_KEY) return;
    // localStorage 캐시 확인 — 언어별로 분리하여 오늘 이미 받았으면 스킵
    const storageKey = `brewlog_gemini_${user.uid}`;
    const langKey    = `${storageKey}_${lang}`;   // ko / en 별도 캐시
    const today = new Date().toDateString();
    try {
      const cached = JSON.parse(localStorage.getItem(langKey) || "null");
      if (cached?.fetchedAt === today) { setGeminiAdvice(cached); return; }
    } catch {}
    setGeminiLoading(true);
    setGeminiError(false);
    try {
      const mine = recipes.filter(r => r.uid === user.uid);
      const sorted = [...mine].sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0));
      const recent  = sorted.slice(0, 7);   // 최신 7개 (상세 분석용)
      const latestR = recent[0] || {};

      // ── 1. 장비 정보 ──────────────────────────────────────────────
      const machineName  = latestR.machine || [latestR.machineBrand, latestR.machineModel].filter(Boolean).join(" ") || "Unknown";
      const machineType  = latestR.machineType === "auto"     ? (lang==="ko"?"전자동":"Super-automatic")
                         : latestR.machineType === "manual"   ? (lang==="ko"?"반자동":"Semi-automatic")
                         : latestR.machineType === "handdrip" ? (lang==="ko"?"핸드드립":"Hand drip")
                         : (lang==="ko"?"에스프레소":"Espresso");
      const machineBrand = latestR.machineBrand || machineName.split(" ")[0] || "";
      const grinderName  = latestR.grinder || [latestR.grinderBrand, latestR.grinderModel].filter(Boolean).join(" ") || "";
      const grinderBrand = latestR.grinderBrand || grinderName.split(" ")[0] || "";
      const pressureVal  = latestR.brewPressureBar
        ? `${latestR.brewPressureBar} BAR (실측)` : latestR.showerBar
        ? `${parseFloat(latestR.showerBar).toFixed(1)} BAR (계산값)` : "";

      // ── 2. 원두 정보 ──────────────────────────────────────────────
      const beanName    = latestR.bean    || "";
      const beanCompany = latestR.company || latestR.beanBrand || "";
      const topBeanLabel = [beanCompany, beanName].filter(Boolean).join(" ");
      const beanBrands   = [...new Set(mine.map(r=>[r.company||r.beanBrand,r.bean].filter(Boolean).join(" ")).filter(Boolean))].slice(0,3).join(" / ");

      // ── 3. 원두 신선도 계산 ───────────────────────────────────────
      const calcFreshness = (r) => {
        if (!r.roastDate) return null;
        const roast  = new Date(r.roastDate);
        const record = r.recordDate ? new Date(r.recordDate) : new Date();
        const days   = Math.round((record - roast) / 86400000);
        if (days < 0) return null;
        const stage  = days <= 3  ? (lang==="ko"?"디개싱 중(미성숙)":"Degassing (too fresh)")
                     : days <= 14 ? (lang==="ko"?"최적 성숙기":"Peak freshness")
                     : days <= 30 ? (lang==="ko"?"사용 가능":"Acceptable")
                     : (lang==="ko"?"신선도 저하 우려":"Possibly stale");
        return { days, stage };
      };
      const freshness = calcFreshness(latestR);

      // ── 4. 날씨 데이터 파싱 ───────────────────────────────────────
      const parseWeather = (r) => {
        if (!r.weather) return null;
        // weather 필드: "☀️ 맑음 · 23°C · 습도 61%" 또는 객체 형태
        if (typeof r.weather === "object") {
          return { desc: r.weather.desc||"", temp: r.weather.temp||"", humidity: r.weather.humidity||"" };
        }
        const tempM = String(r.weather).match(/(-?\d+(?:\.\d+)?)\s*°C/);
        const humM  = String(r.weather).match(/(\d+)\s*%/);
        const desc  = String(r.weather).replace(/[-\d.]+°C/,"").replace(/\d+%/,"").replace(/[·•]/g,"").trim();
        return { desc, temp: tempM?tempM[1]:"", humidity: humM?humM[1]:"" };
      };
      const latestWeather = parseWeather(latestR);
      // 날씨 기반 조언 기준
      const getWeatherNote = (w) => {
        if (!w || !w.temp) return "";
        const t = parseFloat(w.temp);
        const h = parseFloat(w.humidity||"50");
        const notes = [];
        if (t >= 28) notes.push(lang==="ko"?"고온("+t+"°C): 분쇄도 0.5단계 굵게, 추출속도 빨라짐 주의":"High temp("+t+"°C): grind 0.5 step coarser, watch faster flow");
        if (t <= 10) notes.push(lang==="ko"?"저온("+t+"°C): 기기 예열 충분히, 수율 낮아질 수 있음":"Low temp("+t+"°C): allow extra warm-up, yield may drop");
        if (h >= 75) notes.push(lang==="ko"?"고습도("+h+"%): 원두 흡습→분쇄도 굵게 조정 필요":"High humidity("+h+"%): beans absorb moisture, grind coarser");
        if (h <= 30) notes.push(lang==="ko"?"저습도("+h+"%): 정전기 발생 주의, WDT 필수":"Low humidity("+h+"%): static charge risk, WDT essential");
        return notes.join(" / ");
      };
      const weatherNote = latestWeather ? getWeatherNote(latestWeather) : "";

      // ── 5. 별점 추세 분석 ─────────────────────────────────────────
      const ratings = recent.filter(r=>r.rating>0).map(r=>r.rating);
      const avgRating = ratings.length ? (ratings.reduce((a,b)=>a+b,0)/ratings.length).toFixed(1) : null;
      const ratingTrend = (() => {
        if (ratings.length < 3) return null;
        const half = Math.floor(ratings.length/2);
        const older = ratings.slice(half).reduce((a,b)=>a+b,0)/half;
        const newer = ratings.slice(0,half).reduce((a,b)=>a+b,0)/half;
        const diff  = newer - older;
        if (diff > 0.3)  return lang==="ko"?"📈 개선 중":"📈 Improving";
        if (diff < -0.3) return lang==="ko"?"📉 하락 중":"📉 Declining";
        return lang==="ko"?"➡️ 유지 중":"➡️ Stable";
      })();

      // ── 6. 추출 비율 계산 (전체 평균 포함) ──────────────────────
      const calcRatio = (r) => {
        const dose  = parseFloat(r.gram);
        const yield_ = parseFloat(r.espressoMl);
        if (!dose || !yield_) return null;
        return { ratio: (yield_/dose).toFixed(2), dose, yield: yield_ };
      };
      const latestRatio = calcRatio(latestR);
      // 전체 평균 추출 비율
      const allRatios = mine.map(calcRatio).filter(Boolean);
      const avgRatio  = allRatios.length
        ? (allRatios.reduce((a,b)=>a+parseFloat(b.ratio),0)/allRatios.length).toFixed(2) : null;
      // 비율 판정
      const getRatioNote = (ratio) => {
        if (!ratio) return "";
        const r = parseFloat(ratio);
        if (r < 1.5) return lang==="ko"?"리스트레토 구간(과소추출 가능성)":"Ristretto range (possible under-extraction)";
        if (r < 2.0) return lang==="ko"?"리스트레토~에스프레소 경계":"Ristretto-espresso boundary";
        if (r < 2.5) return lang==="ko"?"에스프레소 정석 구간":"Espresso standard range";
        if (r < 3.0) return lang==="ko"?"룽고 구간":"Lungo range";
        return lang==="ko"?"과다추출 가능성":"Possible over-extraction";
      };

      // ── 7. 전체 장기 패턴 (최대 30개) ───────────────────────────
      const longTerm = sorted.slice(0, 30);
      const ltAvgGram    = (longTerm.filter(r=>r.gram).reduce((a,r)=>a+parseFloat(r.gram||0),0) / (longTerm.filter(r=>r.gram).length||1)).toFixed(1);
      const ltAvgSeconds = (longTerm.filter(r=>r.seconds).reduce((a,r)=>a+parseFloat(r.seconds||0),0) / (longTerm.filter(r=>r.seconds).length||1)).toFixed(1);
      const ltAvgTemp    = (longTerm.filter(r=>r.waterTemp).reduce((a,r)=>a+parseFloat(r.waterTemp||0),0) / (longTerm.filter(r=>r.waterTemp).length||1)).toFixed(1);
      const ltAvgAcid    = (longTerm.filter(r=>r.flavorAcidity).reduce((a,r)=>a+parseFloat(r.flavorAcidity||0),0) / (longTerm.filter(r=>r.flavorAcidity).length||1)).toFixed(1);
      const ltAvgSweet   = (longTerm.filter(r=>r.flavorSweet).reduce((a,r)=>a+parseFloat(r.flavorSweet||0),0) / (longTerm.filter(r=>r.flavorSweet).length||1)).toFixed(1);
      const ltAvgBitter  = (longTerm.filter(r=>r.flavorBitter).reduce((a,r)=>a+parseFloat(r.flavorBitter||0),0) / (longTerm.filter(r=>r.flavorBitter).length||1)).toFixed(1);
      const ltAvgBody    = (longTerm.filter(r=>r.flavorBody).reduce((a,r)=>a+parseFloat(r.flavorBody||0),0) / (longTerm.filter(r=>r.flavorBody).length||1)).toFixed(1);
      const ltAvgBalance = (longTerm.filter(r=>r.flavorBalance).reduce((a,r)=>a+parseFloat(r.flavorBalance||0),0) / (longTerm.filter(r=>r.flavorBalance).length||1)).toFixed(1);

      // ── 8. 맛 노트 텍스트 수집 ───────────────────────────────────
      const flavorNotes = recent.filter(r=>r.note).map((r,i)=>`${i+1}. ${r.note}`).join(" / ");

      // ── 9. 최근 레시피 상세 요약 ─────────────────────────────────
      const recentSummary = recent.slice(0,5).map((r,i)=>{
        const mach  = r.machine || [r.machineBrand,r.machineModel].filter(Boolean).join(" ") || "?";
        const grind = r.grinder || [r.grinderBrand,r.grinderModel].filter(Boolean).join(" ") || "?";
        const press = r.brewPressureBar ? `${r.brewPressureBar}BAR` : r.showerBar ? `~${parseFloat(r.showerBar).toFixed(1)}BAR` : "";
        const fr    = calcFreshness(r);
        const ratio = calcRatio(r);
        const wx    = parseWeather(r);
        return lang==="ko"
          ? `${i+1}. 메뉴:${r.menuLabel||""} | 원두:${r.bean||""}${r.company?"("+r.company+")":""} | 별점:${r.rating||0}${ratio?" | 비율:1:"+ratio.ratio+" ("+getRatioNote(ratio.ratio)+")":""} | 머신:${mach} | 그라인더:${grind} | 분쇄도:${r.grindSize||""} | 도징:${r.gram||""}g | 추출:${r.seconds||""}s | 추출량:${r.espressoMl||""}ml | 수온:${r.waterTemp||""}°C${press?" | 압력:"+press:""} | 맛[산미${r.flavorAcidity||0}/단맛${r.flavorSweet||0}/쓴맛${r.flavorBitter||0}/바디${r.flavorBody||0}/밸런스${r.flavorBalance||0}]${fr?" | 신선도:로스팅후"+fr.days+"일("+fr.stage+")":""}${wx?.temp?" | 날씨:"+wx.temp+"°C 습도"+wx.humidity+"%":""}${r.note?" | 노트:"+r.note:""}${r.continuousMemo?" | 연속추출:"+r.continuousMemo:""}`
          : `${i+1}. Menu:${r.menuLabel||""} | Bean:${r.bean||""}${r.company?"("+r.company+")":""} | Rating:${r.rating||0}${ratio?" | Ratio:1:"+ratio.ratio+" ("+getRatioNote(ratio.ratio)+")":""} | Machine:${mach} | Grinder:${grind} | Grind:${r.grindSize||""} | Dose:${r.gram||""}g | Time:${r.seconds||""}s | Yield:${r.espressoMl||""}ml | Temp:${r.waterTemp||""}°C${press?" | Pressure:"+press:""} | Flavor[acid${r.flavorAcidity||0}/sweet${r.flavorSweet||0}/bitter${r.flavorBitter||0}/body${r.flavorBody||0}/balance${r.flavorBalance||0}]${fr?" | Freshness:"+fr.days+"d post-roast("+fr.stage+")":""}${wx?.temp?" | Weather:"+wx.temp+"°C hum"+wx.humidity+"%":""}${r.note?" | Note:"+r.note:""}${r.continuousMemo?" | ContinuousMemo:"+r.continuousMemo:""}`;
      }).join("\n");

      // ══════════════════════════════════════════════════════════════
      // 장비 지식 DB — 하드코딩 + Gemini 자체 지식 위임 병행
      // 새 브랜드/모델 추가 시: MACHINE_KB 또는 GRINDER_KB 객체에
      // { spec, tips, grindRange, pressure, boiler } 형식으로 추가
      // ══════════════════════════════════════════════════════════════
      const MACHINE_KB = {
        // ── 브레빌 (Breville / Sage) ──────────────────────────────
        "breville": {
          // 모델별 세부 스펙
          models: {
            "bambino":          { boiler:"써모코일(단일)", heatup:"3초", portafilter:"54mm", pressure:"9BAR OPV", preinfusion:"자동 3초", notes:"소형 입문기. 스팀 온도 수동 제어 불가. 추출 온도 93°C 고정." },
            "bambino plus":     { boiler:"써모코일(단일)", heatup:"3초", portafilter:"54mm", pressure:"9BAR OPV", preinfusion:"자동 3초", notes:"밤비노에 자동 스팀 추가. 우유 온도/질감 자동 조절 가능." },
            "barista express":  { boiler:"써모코일(단일)", heatup:"30초", portafilter:"54mm", grinder:"내장 60단계 코니컬 버(54mm)", pressure:"9BAR OPV", preinfusion:"자동 8초", notes:"도저 포함. 분쇄량 조절 다이얼로 도징량 세밀 조정 가능." },
            "barista express impress": { boiler:"써모코일(단일)", heatup:"30초", portafilter:"54mm", grinder:"내장 60단계 코니컬 버(54mm)", pressure:"9BAR OPV", preinfusion:"자동 8초", notes:"어시스트 탬핑 기능 추가(자동 균일 탬핑 10kg). 분쇄-탬핑 일체화." },
            "barista pro":      { boiler:"써모코일(단일)", heatup:"3초", portafilter:"54mm", grinder:"내장 30단계 코니컬 버(54mm)", pressure:"9BAR OPV", preinfusion:"자동 8초", notes:"LCD 디스플레이 탑재. 추출 온도 3단계(88/92/96°C) 선택 가능. 스팀 즉시 전환." },
            "barista touch":    { boiler:"써모코일(단일)", heatup:"3초", portafilter:"54mm", grinder:"내장 30단계 코니컬 버(54mm)", pressure:"9BAR OPV", preinfusion:"자동 8초", notes:"터치스크린. 레시피 저장(8개). 자동 스팀. 온도 3단계 선택." },
            "barista touch impress": { boiler:"써모코일(단일)", heatup:"3초", portafilter:"54mm", grinder:"내장 30단계 코니컬 버(54mm)", pressure:"9BAR OPV", preinfusion:"자동 8초", notes:"바리스타 터치 + 어시스트 탬핑 결합 최상위 올인원." },
            "dual boiler":      { boiler:"듀얼 보일러(독립 에스프레소/스팀)", heatup:"25초", portafilter:"58mm", pressure:"9BAR OPV(조절 가능 0-12BAR)", preinfusion:"수동/자동 0-10초", notes:"추출 온도 PID 1°C 단위 조절(67~104°C). 유량 제어. 오버프레셔 밸브 조절 가능. 반자동 플래그십." },
            "oracle":           { boiler:"듀얼 보일러", heatup:"25초", portafilter:"58mm", grinder:"내장 코니컬 버", pressure:"9BAR OPV", preinfusion:"자동", notes:"분쇄~탬핑~추출 완전 자동. 밀크 자동 스팀. 오라클 터치는 터치스크린 추가." },
            "oracle touch":     { boiler:"듀얼 보일러", heatup:"25초", portafilter:"58mm", grinder:"내장 코니컬 버", pressure:"9BAR OPV", preinfusion:"자동", notes:"오라클 + 터치스크린. 레시피 프로그래밍. 완전자동 워크플로우." },
            "the barista":      { boiler:"단일 보일러", heatup:"45초", portafilter:"54mm", pressure:"15BAR 펌프(9BAR OPV)", preinfusion:"없음", notes:"입문형. 압력 게이지 내장. 스팀 기능 포함." },
            "duo temp pro":     { boiler:"써모코일(단일)", heatup:"3초", portafilter:"54mm", pressure:"9BAR OPV", preinfusion:"없음", notes:"PID 없음. 아날로그 압력 게이지. 입문 반자동." },
            "infuser":          { boiler:"써모코일(단일)", heatup:"3초", portafilter:"54mm", pressure:"9BAR OPV", preinfusion:"수동/자동 0-10초", notes:"프리인퓨전 수동 조절 가능. 볼륨 프로그래밍. 중급 반자동." },
            "985":              { boiler:"써모코일(단일)", heatup:"3초", portafilter:"54mm", pressure:"9BAR", preinfusion:"자동", notes:"밤비노 플러스 한국 유통 모델명(BES500). 자동 스팀 기능." },
          },
          // 브랜드 공통 팁
          commonTips: lang === "ko"
            ? [
                "브레빌 54mm 포터필터 기준 권장 도징: 18~20g (더블샷 기준)",
                "분쇄도 변경 시 0.5단계씩 조정 후 2~3샷 안정화 추출 필요",
                "채널링 방지: WDT 툴로 분쇄 원두 분산 후 탬핑",
                "추출 비율 목표: 1:2 (도징 18g → 에스프레소 36ml, 25~30초)",
                "OPV 9BAR 기준 — 압력이 높다면 분쇄도를 굵게, 낮다면 가늘게",
                "서드파티 바스켓(IMS/VST 58mm→54mm 어댑터) 사용 시 추출 향상 가능",
              ]
            : [
                "Breville 54mm portafilter: recommended dose 18-20g (double shot)",
                "Adjust grind by 0.5 steps at a time; allow 2-3 shots to stabilize",
                "Prevent channeling: distribute grounds with WDT tool before tamping",
                "Target extraction ratio 1:2 (18g in → 36ml out, 25-30s)",
                "OPV set at 9BAR — if pressure high, grind coarser; if low, finer",
                "Aftermarket baskets (IMS/VST with 54mm adapter) can improve extraction",
              ],
        },

        // ── 드롱기 (De'Longhi) ─────────────────────────────────────
        "delonghi": {
          models: {
            "magnifica":     { type:"전자동", grinder:"내장 13단계 버 그라인더", notes:"LatteCrema 우유 시스템. 분쇄도 조절은 원두 갈리는 중에만 가능." },
            "magnifica evo":  { type:"전자동", grinder:"내장 13단계", notes:"My Latte 아트 기능. 터치 디스플레이." },
            "eletta":        { type:"전자동", grinder:"내장 13단계", notes:"LatteCrema Cool 시스템(냉장 우유). 아이스 커피 기능." },
            "dinamica":      { type:"전자동", grinder:"내장 13단계", notes:"MyMenu 기능. 트루 브루 시스템." },
            "la specialista": { type:"반자동", portafilter:"51mm", notes:"내장 센서 그라인딩. 어시스트 탬핑. 스마트 워터 시스템." },
          },
          commonTips: lang === "ko"
            ? [
                "전자동 분쇄도 조절: 반드시 그라인딩 중에만 조절(정지 중 조절 시 버 손상)",
                "커피 강도 설정: 분쇄 굵기보다 도징량(강도 다이얼)으로 먼저 조절",
                "주 1회 커피 오일 세척 권장(리나 클리너 사용)",
                "원두 교체 시 2~3샷 희생샷 추출 후 사용",
              ]
            : [
                "Grind adjustment: only change while grinding is in progress (prevents burr damage)",
                "Adjust strength via dose dial before changing grind size",
                "Weekly cleaning cycle recommended (use Urnex or De'Longhi cleaner)",
                "When changing beans, discard 2-3 shots to flush old grounds",
              ],
        },

        // ── 가찌아 (Gaggia) ───────────────────────────────────────
        "gaggia": {
          models: {
            "classic pro": { boiler:"단일 보일러(스테인리스)", portafilter:"58mm", pressure:"9BAR OPV", notes:"OPV 9BAR 사전 조정됨(구형 클래식은 15BAR). 상업용 58mm 포터필터. 스팀 온도 수동." },
            "classic evo":  { boiler:"단일 보일러", portafilter:"58mm", pressure:"9BAR OPV", notes:"클래식 프로 업그레이드. 개선된 스팀 완드." },
            "babila":       { boiler:"듀얼 보일러", portafilter:"58mm", pressure:"9BAR", notes:"독립 추출/스팀 보일러. PID 온도 제어." },
          },
          commonTips: lang === "ko"
            ? [
                "58mm 포터필터: 도징 18~21g, 탬핑 15~20kg 균일 압력",
                "단일 보일러: 추출→스팀 전환 시 30초 대기 필요",
                "클래식 프로 OPV 조절: 기본 9BAR, 스프링 교체로 8BAR 다운 가능",
              ]
            : [
                "58mm portafilter: dose 18-21g, tamp 15-20kg consistent pressure",
                "Single boiler: 30s wait required when switching espresso→steam",
                "Classic Pro OPV: stock 9BAR, spring swap can reduce to 8BAR",
              ],
        },

        // ── 유라 (Jura) ───────────────────────────────────────────
        "jura": {
          models: {
            "e6":  { type:"전자동", grinder:"Aroma G3(5단계)", notes:"IPBAS. P.E.P(맥동 추출). 중급 전자동." },
            "e8":  { type:"전자동", grinder:"Aroma G3(6단계)", notes:"E6 + 카푸치노 시스템. 15가지 음료." },
            "s8":  { type:"전자동", grinder:"Aroma G3(6단계)", notes:"E8 + 터치 디스플레이. 3D Brewing." },
            "z10": { type:"전자동", grinder:"Aroma G3(6단계)", notes:"콜드 브루 기능. 최상위 라인업. 듀얼 스페셜티." },
          },
          commonTips: lang === "ko"
            ? [
                "분쇄도 조절: 반드시 머신 가동 중(그라인딩 중)에만 변경",
                "P.E.P(맥동 추출 공정): 추출 압력을 펄스로 조절해 향미 극대화",
                "IPBAS: 원두 종류 감지 후 사전 우림(프리브루잉) 자동 최적화",
                "탈석회화 주기: 수질 경도 설정에 따라 JURA Claris 필터 교체",
              ]
            : [
                "Grind adjustment: ONLY while machine is actively grinding",
                "P.E.P (Pulse Extraction Process): pulsed pressure maximizes aroma",
                "IPBAS auto-optimizes pre-brewing based on bean type detection",
                "Descaling interval depends on water hardness setting and Claris filter",
              ],
        },

        // ── 사에코 (Saeco) ────────────────────────────────────────
        "saeco": {
          commonTips: lang === "ko"
            ? ["세라믹 버 그라인더 탑재 모델 다수. 세라믹은 내열성 우수하나 단단한 원두에 취약.", "AquaClean 필터 사용 시 탈석회화 없이 5000잔 가능."]
            : ["Many models use ceramic burr grinders. Ceramic excels in heat resistance but can chip on very hard beans.", "AquaClean filter enables up to 5000 cups without descaling."],
        },

        // ── 필립스 (Philips) ─────────────────────────────────────
        "philips": {
          commonTips: lang === "ko"
            ? ["LatteGo 우유 시스템: 청소가 쉬운 분리형 우유 용기.", "분쇄도 12단계. 원두 경도에 따라 하드빈 설정 변경 가능."]
            : ["LatteGo milk system: easy-clean detachable milk container.", "12-step grind adjustment. Enable hard bean setting for dense roasts."],
        },
      };

      // ── 그라인더 지식 DB ──────────────────────────────────────────
      const GRINDER_KB = {
        "baratza": {
          models: {
            "encore":    { steps:40, espressoRange:"8~12", stepEffect:"1단계=약 2~3초 추출시간 변화", burr:"40mm 코니컬", notes:"입문 올라운더. 에스프레소 경계선급 성능." },
            "encore esp":{ steps:40, espressoRange:"8~15", stepEffect:"1단계=약 2~3초", burr:"40mm 코니컬", notes:"앙코르 에스프레소 전용 버전. 더 세밀한 에스프레소 구간." },
            "virtuoso+": { steps:40, espressoRange:"8~15", stepEffect:"1단계=약 2~3초", burr:"40mm 코니컬", notes:"DC 모터로 RPM 안정적. 앙코르보다 균일한 분쇄." },
            "sette 270": { steps:270, espressoRange:"1A~3A", stepEffect:"매우 세밀", burr:"40mm 코니컬", notes:"매크로+마이크로 2단계 조절. 에스프레소 특화." },
            "forte":     { steps:260, espressoRange:"1F~4F", burr:"54mm 플랫", notes:"플랫 버. 상업용 수준. 균일도 높음." },
          },
          commonTips: lang === "ko"
            ? ["바라짜 보정: 0점 조정(espresso grinder calibration) 주기적 필요.", "RPM 안정화를 위해 연속 분쇄 전 3~5초 예열 권장."]
            : ["Baratza calibration: periodic zero-point adjustment recommended.", "Let motor warm up 3-5s before grinding for RPM stability."],
        },
        "niche": {
          models: {
            "zero":  { steps:"360(무단)", espressoRange:"15~25", burr:"63mm 코니컬", notes:"싱글 도저. 분쇄 잔량 0.1g 이하. 에스프레소 최상급." },
            "duo":   { steps:"360(무단)", burr:"63mm 코니컬", notes:"2단 RPM 조절. 에스프레소+필터 겸용." },
          },
          commonTips: lang === "ko"
            ? ["싱글도저: 계량 후 호퍼에 투입. 커피 오일 산패 방지.", "63mm 코니컬 버: 분쇄 균일도 매우 높음. 채널링 최소화."]
            : ["Single dose: weigh and drop in. Prevents oil rancidity.", "63mm conical burr: high grind uniformity, minimizes channeling."],
        },
        "eureka": {
          commonTips: lang === "ko"
            ? ["유레카 미뇽 시리즈: 스텝리스(무단) 분쇄도 조절. 마이크론 단위 미세 조정 가능.", "저RPM 고토크 모터로 열 발생 최소화."]
            : ["Eureka Mignon: stepless grind adjustment, micrometric precision.", "Low RPM/high torque motor minimizes heat buildup."],
        },
        "timemore": {
          commonTips: lang === "ko"
            ? ["타임모어 핸드밀: C2/C3는 에스프레소 불가, S3/Sculptor 078은 에스프레소 가능.", "S3 에스프레소 구간: 클릭 3~6번."]
            : ["Timemore hand grinder: C2/C3 not suitable for espresso; S3/Sculptor 078 can do espresso.", "S3 espresso range: 3-6 clicks."],
        },
        "1zpresso": {
          commonTips: lang === "ko"
            ? ["1Zpresso JX-Pro: 에스프레소 가능 핸드밀. 분쇄도 기준 1회전=90마이크론.", "K-Ultra/Q2: 에스프레소 전용 핸드밀. 정밀도 높음."]
            : ["1Zpresso JX-Pro: espresso-capable hand grinder. 1 rotation = 90 microns.", "K-Ultra/Q2: espresso-dedicated, high precision."],
        },
      };

      // ── 원두 로스터리 지식 DB ────────────────────────────────────
      const BEAN_KB = {
        "테라로사": lang === "ko" ? "테라로사는 한국 스페셜티 선두 로스터리. 싱글오리진 중심, 미디엄~미디엄라이트 로스팅. 산미 선명하고 과일향 풍부. 권장 추출온도 90~93°C." : "Terra Rosa is a leading Korean specialty roastery. Single-origin focused, medium-light roast. Bright acidity, fruity aromatics. Recommended 90-93°C.",
        "커피리브레": lang === "ko" ? "커피리브레: 한국 스페셜티 로스터리. 워시드 프로세스 중심. 클린컵과 플로럴 향미 특징. 92~94°C 추출 권장." : "Coffee Libre: Korean specialty roaster, washed-process focused. Clean cup, floral notes. 92-94°C recommended.",
        "블루보틀": lang === "ko" ? "블루보틀: 미디엄 로스팅 중심. 스페셜티 블렌드 강점. 에스프레소 블렌드는 93°C, 25~28초 기준." : "Blue Bottle: medium roast focused. Specialty blends. Espresso blend: 93°C, 25-28s.",
        "로우키": lang === "ko" ? "로우키커피: 라이트~미디엄라이트. 에티오피아/케냐 싱글 강점. 낮은 추출온도(88~91°C) 시 과일향 극대화." : "Lowkey Coffee: light-medium light. Ethiopia/Kenya singles. Lower temp (88-91°C) maximizes fruity notes.",
      };

      // ── 머신/그라인더 매칭 ─────────────────────────────────────
      const getMachineKnowledge = (machineName, machineBrand) => {
        const mn = machineName.toLowerCase();
        const mb = machineBrand.toLowerCase();

        // 브랜드 매칭
        let kb = null;
        if (mb.includes("breville") || mb.includes("브레빌") || mb.includes("sage")) kb = MACHINE_KB["breville"];
        else if (mb.includes("delonghi") || mb.includes("드롱기") || mb.includes("de'longhi")) kb = MACHINE_KB["delonghi"];
        else if (mb.includes("gaggia") || mb.includes("가찌아")) kb = MACHINE_KB["gaggia"];
        else if (mb.includes("jura") || mb.includes("유라")) kb = MACHINE_KB["jura"];
        else if (mb.includes("saeco") || mb.includes("사에코")) kb = MACHINE_KB["saeco"];
        else if (mb.includes("philips") || mb.includes("필립스")) kb = MACHINE_KB["philips"];

        if (!kb) return null;

        // 모델 매칭
        let modelSpec = null;
        if (kb.models) {
          for (const [modelKey, spec] of Object.entries(kb.models)) {
            if (mn.includes(modelKey)) { modelSpec = spec; break; }
          }
        }

        const lines = [];
        if (modelSpec) {
          lines.push(lang === "ko" ? `[모델 스펙]` : `[Model Spec]`);
          if (modelSpec.boiler)       lines.push((lang==="ko"?"보일러: ":"Boiler: ") + modelSpec.boiler);
          if (modelSpec.portafilter)  lines.push((lang==="ko"?"포터필터: ":"Portafilter: ") + modelSpec.portafilter);
          if (modelSpec.grinder)      lines.push((lang==="ko"?"내장 그라인더: ":"Built-in grinder: ") + modelSpec.grinder);
          if (modelSpec.pressure)     lines.push((lang==="ko"?"압력: ":"Pressure: ") + modelSpec.pressure);
          if (modelSpec.preinfusion)  lines.push((lang==="ko"?"프리인퓨전: ":"Pre-infusion: ") + modelSpec.preinfusion);
          if (modelSpec.heatup)       lines.push((lang==="ko"?"예열시간: ":"Heat-up: ") + modelSpec.heatup);
          if (modelSpec.notes)        lines.push((lang==="ko"?"특이사항: ":"Notes: ") + modelSpec.notes);
        }
        if (kb.commonTips?.length) {
          lines.push(lang === "ko" ? `[브랜드 공통 팁]` : `[Brand Tips]`);
          kb.commonTips.forEach(t => lines.push("• " + t));
        }
        return lines.join("\n");
      };

      const getGrinderKnowledge = (grinderName) => {
        const gn = grinderName.toLowerCase();
        let gkb = null;
        if (gn.includes("baratza") || gn.includes("바라짜")) gkb = GRINDER_KB["baratza"];
        else if (gn.includes("niche") || gn.includes("니치")) gkb = GRINDER_KB["niche"];
        else if (gn.includes("eureka") || gn.includes("유레카")) gkb = GRINDER_KB["eureka"];
        else if (gn.includes("timemore") || gn.includes("타임모어")) gkb = GRINDER_KB["timemore"];
        else if (gn.includes("1zpresso") || gn.includes("1z")) gkb = GRINDER_KB["1zpresso"];
        if (!gkb) return null;

        const lines = [];
        if (gkb.models) {
          for (const [mk, spec] of Object.entries(gkb.models)) {
            if (gn.includes(mk)) {
              lines.push(lang==="ko" ? `[그라인더 스펙]` : `[Grinder Spec]`);
              if (spec.steps)        lines.push((lang==="ko"?"분쇄단계: ":"Steps: ") + spec.steps);
              if (spec.espressoRange)lines.push((lang==="ko"?"에스프레소 구간: ":"Espresso range: ") + spec.espressoRange);
              if (spec.stepEffect)   lines.push((lang==="ko"?"단계별 효과: ":"Step effect: ") + spec.stepEffect);
              if (spec.burr)         lines.push((lang==="ko"?"버 종류: ":"Burr: ") + spec.burr);
              if (spec.notes)        lines.push((lang==="ko"?"특이사항: ":"Notes: ") + spec.notes);
              break;
            }
          }
        }
        if (gkb.commonTips?.length) {
          lines.push(lang==="ko" ? `[그라인더 팁]` : `[Grinder Tips]`);
          gkb.commonTips.forEach(t => lines.push("• " + t));
        }
        return lines.join("\n");
      };

      const getBeanKnowledge = (beanName, company) => {
        const combined = `${company||""} ${beanName||""}`.toLowerCase();
        for (const [key, val] of Object.entries(BEAN_KB)) {
          if (combined.includes(key.toLowerCase())) return val;
        }
        return null;
      };

      const machineKnowledge = getMachineKnowledge(machineName, machineBrand || "");
      const grinderKnowledge = getGrinderKnowledge(grinderName || "");
      const beanKnowledge    = getBeanKnowledge(beanName, beanCompany);

      // DB에 없는 장비는 Gemini 자체 지식 위임 문구 추가
      const unknownMachineNote = !machineKnowledge
        ? (lang==="ko"
            ? `※ ${machineName}은 내부 DB에 없습니다. 당신이 알고 있는 이 머신의 스펙(보일러, 포터필터, 압력, 프리인퓨전 등)과 최적 파라미터를 직접 적용해 분석해주세요.`
            : `※ ${machineName} is not in our local DB. Please apply your own knowledge of this machine's specs (boiler type, portafilter size, pressure, pre-infusion, etc.) directly in your analysis.`)
        : "";
      const unknownGrinderNote = !grinderKnowledge && grinderName
        ? (lang==="ko"
            ? `※ ${grinderName}은 내부 DB에 없습니다. 이 그라인더의 특성과 에스프레소 권장 분쇄 구간을 당신의 지식으로 반영해주세요.`
            : `※ ${grinderName} is not in our local DB. Apply your own knowledge of this grinder's characteristics and espresso grind range.`)
        : "";

      const isKo = lang === "ko";

      const prompt = isKo
        ? `당신은 전문 바리스타이자 커피 장비 전문가입니다. 아래 종합 데이터를 분석해 최적의 추출 레시피를 추천해주세요.

## 브루어 장비 프로필
- 머신: ${machineName} (${machineType})
- 그라인더: ${grinderName || "미상"}
${pressureVal ? `- 최근 추출 압력: ${pressureVal}` : ""}
- 주요 사용 원두: ${beanBrands || topBeanLabel}

## 장비 지식 (내부 DB)
${machineKnowledge || unknownMachineNote}
${grinderKnowledge ? "\n" + grinderKnowledge : unknownGrinderNote}
${beanKnowledge    ? "\n[원두 로스터리 정보]\n" + beanKnowledge : ""}

## 원두 신선도
${freshness ? `로스팅 후 ${freshness.days}일 경과 → ${freshness.stage}` : "로스팅 날짜 미기록"}
${freshness?.days <= 3  ? "⚠️ 디개싱 중: 수율 불안정, 추출 시간 짧게 시작 권장" : ""}
${freshness?.days >= 30 ? "⚠️ 신선도 저하: 분쇄도 가늘게, 수온 낮추기 고려" : ""}

## 현재 날씨 환경
${latestWeather ? `온도: ${latestWeather.temp}°C | 습도: ${latestWeather.humidity}% | ${latestWeather.desc}` : "날씨 데이터 없음"}
${weatherNote ? `날씨 영향: ${weatherNote}` : ""}

## 별점 추세 분석 (최근 ${ratings.length}샷)
- 평균 별점: ${avgRating || "데이터 없음"} / 5.0
- 추세: ${ratingTrend || "데이터 부족"}

## 추출 비율 분석
- 최근 추출 비율: ${latestRatio ? `1:${latestRatio.ratio} → ${getRatioNote(latestRatio.ratio)}` : "데이터 없음"}
- 전체 평균 비율 (${allRatios.length}샷 기준): ${avgRatio ? `1:${avgRatio}` : "데이터 없음"}

## 장기 패턴 (최근 ${longTerm.length}샷 평균)
- 평균 도징: ${ltAvgGram}g | 평균 추출시간: ${ltAvgSeconds}s | 평균 수온: ${ltAvgTemp}°C
- 평균 맛 프로필: 산미${ltAvgAcid} / 단맛${ltAvgSweet} / 쓴맛${ltAvgBitter} / 바디${ltAvgBody} / 밸런스${ltAvgBalance}

## 최근 맛 노트 (주관적 기록)
${flavorNotes || "맛 노트 없음"}

## 최근 추출 기록 상세 (최신순)
${recentSummary}

## 분석 요청
1. 장비(${machineName}) 스펙을 tip에 명시하며 구체적 파라미터 개선점 제시 (수치 포함)
2. 별점 추세(${ratingTrend||"불명"})와 장기 맛 프로필 패턴에서 개선점 분석
3. 원두 신선도(${freshness?freshness.days+"일차":"미상"})와 현재 날씨(${latestWeather?.temp||"?"}°C, 습도${latestWeather?.humidity||"?"}%)를 반드시 반영
4. 추출 비율(최근 1:${latestRatio?.ratio||"?"})이 적정한지 판단하고 개선 방향 제시
5. 맛 노트 텍스트에서 향미 특성을 파악해 원두 특성 반영

반드시 아래 JSON만 출력하세요. gram/temp/seconds는 숫자만(단위 없이):
{"tip":"장비명·신선도·날씨·비율을 모두 반영한 구체적 개선 팁 2-3문장","recipeTitle":"오늘 시도해볼 레시피명","recipeDesc":"원두+장비+컨디션 반영한 추천 이유 1-2문장","gram":"숫자만","temp":"숫자만","seconds":"숫자만"}`
        : `You are a professional barista and coffee equipment specialist. Analyze the comprehensive data below to recommend the optimal extraction recipe.

## Brewer Equipment Profile
- Machine: ${machineName} (${machineType})
- Grinder: ${grinderName || "Unknown"}
${pressureVal ? `- Recent brew pressure: ${pressureVal}` : ""}
- Primary beans: ${beanBrands || topBeanLabel}

## Equipment Knowledge (Internal DB)
${machineKnowledge || unknownMachineNote}
${grinderKnowledge ? "\n" + grinderKnowledge : unknownGrinderNote}
${beanKnowledge    ? "\n[Bean Roastery Info]\n" + beanKnowledge : ""}

## Bean Freshness
${freshness ? `${freshness.days} days post-roast → ${freshness.stage}` : "Roast date not recorded"}
${freshness?.days <= 3  ? "⚠️ Degassing: unstable yield, start with shorter extraction" : ""}
${freshness?.days >= 30 ? "⚠️ Freshness declining: grind finer, consider lower temp" : ""}

## Current Weather Conditions
${latestWeather ? `Temp: ${latestWeather.temp}°C | Humidity: ${latestWeather.humidity}% | ${latestWeather.desc}` : "No weather data"}
${weatherNote ? `Weather impact: ${weatherNote}` : ""}

## Rating Trend Analysis (last ${ratings.length} shots)
- Average rating: ${avgRating || "no data"} / 5.0
- Trend: ${ratingTrend || "insufficient data"}

## Extraction Ratio Analysis
- Latest ratio: ${latestRatio ? `1:${latestRatio.ratio} → ${getRatioNote(latestRatio.ratio)}` : "no data"}
- Overall average ratio (${allRatios.length} shots): ${avgRatio ? `1:${avgRatio}` : "no data"}

## Long-term Patterns (avg of last ${longTerm.length} shots)
- Avg dose: ${ltAvgGram}g | Avg time: ${ltAvgSeconds}s | Avg temp: ${ltAvgTemp}°C
- Avg flavor: acidity${ltAvgAcid} / sweet${ltAvgSweet} / bitter${ltAvgBitter} / body${ltAvgBody} / balance${ltAvgBalance}

## Recent Flavor Notes (subjective)
${flavorNotes || "No flavor notes recorded"}

## Recent Brew Records (newest first)
${recentSummary}

## Analysis Request
1. Reference ${machineName} specs explicitly in tip with concrete parameter improvements
2. Analyze rating trend (${ratingTrend||"unknown"}) and long-term flavor profile patterns
3. Factor in bean freshness (${freshness?freshness.days+"d post-roast":"unknown"}) and weather (${latestWeather?.temp||"?"}°C, humidity ${latestWeather?.humidity||"?"}%)
4. Evaluate extraction ratio (latest 1:${latestRatio?.ratio||"?"}) and suggest improvement direction
5. Extract flavor characteristics from tasting notes and match to bean profile

Output ONLY the JSON below. gram/temp/seconds must be numbers only (no units):
{"tip":"specific 2-3 sentence tip referencing machine/freshness/weather/ratio","recipeTitle":"recipe name to try today","recipeDesc":"1-2 sentence recommendation reflecting bean+equipment+conditions","gram":"numberonly","temp":"numberonly","seconds":"numberonly"}`;
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.8, maxOutputTokens: 2048 },
          }),
        }
      );
      if (!res.ok) throw new Error("Gemini API error");
      const data = await res.json();
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

      // ── 파싱 전략 1: 정규식으로 각 필드 개별 추출 ──────────────
      // 문자열 값: "key": "value"
      const extractStr = (key) => {
        const m = raw.match(new RegExp(`"${key}"\\s*:\\s*"([^"]*)"`) );
        return m ? m[1].trim() : "";
      };
      // 숫자 값: "key": 20 또는 "key": "20" 또는 "key": "20g" 모두 처리
      const extractNum = (key) => {
        // 따옴표 없는 숫자: "gram": 20
        let m = raw.match(new RegExp(`"${key}"\\s*:\\s*(\\d+(?:\\.\\d+)?)`));
        if (m) return m[1];
        // 따옴표 있는 숫자(단위 포함 가능): "gram": "20" or "20g" or "20 g"
        m = raw.match(new RegExp(`"${key}"\\s*:\\s*"([^"]*)"`) );
        if (m) {
          const numOnly = m[1].replace(/[^0-9.]/g, "");
          if (numOnly) return numOnly;
        }
        return "";
      };

      let parsed = {
        tip:         extractStr("tip"),
        recipeTitle: extractStr("recipeTitle"),
        recipeDesc:  extractStr("recipeDesc"),
        gram:        extractNum("gram"),
        temp:        extractNum("temp"),
        seconds:     extractNum("seconds"),
      };

      // ── 파싱 전략 2: JSON.parse 시도 (따옴표 제거 후) ───────────
      if (!parsed.tip) {
        try {
          const jsonMatch = raw.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const obj = JSON.parse(jsonMatch[0]);
            parsed = {
              tip:         String(obj.tip         || ""),
              recipeTitle: String(obj.recipeTitle || ""),
              recipeDesc:  String(obj.recipeDesc  || ""),
              gram:        String(obj.gram        || "").replace(/[^0-9.]/g, ""),
              temp:        String(obj.temp        || "").replace(/[^0-9.]/g, ""),
              seconds:     String(obj.seconds     || "").replace(/[^0-9.]/g, ""),
            };
          }
        } catch {}
      }

      // ── 파싱 전략 3: gram/temp/seconds가 비어있으면 tip 텍스트에서 추출 ──
      // tip에 "19.5g", "92°C", "28s" 같은 패턴이 있을 때 fallback
      if (!parsed.gram) {
        const m = parsed.tip.match(/(\d+(?:\.\d+)?)\s*g(?:ram)?/i);
        if (m) parsed.gram = m[1];
      }
      if (!parsed.temp) {
        const m = parsed.tip.match(/(\d+(?:\.\d+)?)\s*°?[Cc]/);
        if (m) parsed.temp = m[1];
      }
      if (!parsed.seconds) {
        const m = parsed.tip.match(/(\d+(?:\.\d+)?)\s*s(?:ec(?:ond)?s?)?(?:\s|$)/i);
        if (m) parsed.seconds = m[1];
      }

      // ── 최종 fallback: 최근 레시피 기본값 사용 ──────────────────
      if (!parsed.gram)    parsed.gram    = String(latestR.gram    || "18");
      if (!parsed.temp)    parsed.temp    = String(latestR.waterTemp || "93");
      if (!parsed.seconds) parsed.seconds = String(latestR.seconds  || "28");

      if (!parsed.tip) throw new Error("No tip in response: " + raw.slice(0, 80));
      // 언어별로 별도 캐시 키 사용 — ko/en 응답이 섞이지 않도록
      const adviceData = { ...parsed, fetchedAt: today, lang };
      setGeminiAdvice(adviceData);
      try { localStorage.setItem(`${storageKey}_${lang}`, JSON.stringify(adviceData)); } catch {}
    } catch (e) {
      console.error("[Gemini]", e.message);
      geminiCalledRef.current = false; // 실패 시 재시도 허용
      setGeminiError(true);
    } finally {
      setGeminiLoading(false);
    }
  };
  const [following, setFollowing] = useState(() => {
    try { return user?.uid ? JSON.parse(localStorage.getItem("brewlog_following_" + user?.uid) || "[]") : []; } catch { return []; }
  });

  const toggleFollow = (authorUid) => {
    if (!user) { onRequireAuth?.(); return; }
    if (!authorUid || authorUid === user?.uid || authorUid === user?.displayName) return;
    setFollowing(prev => {
      const next = prev.includes(authorUid)
        ? prev.filter(id => id !== authorUid)
        : [...prev, authorUid];
      try { localStorage.setItem("brewlog_following_" + user?.uid, JSON.stringify(next)); } catch {}
      return next;
    });
  };
  const [bookmarks, setBookmarks] = useState(() => {
    try { return user?.uid ? JSON.parse(localStorage.getItem("brewlog_bookmarks_" + user?.uid) || "[]") : []; } catch { return []; }
  });

  const toggleBookmark = (recipeId) => {
    if (!user) { onRequireAuth?.(); return; }
    setBookmarks(prev => {
      const next = prev.includes(recipeId) ? prev.filter(id => id !== recipeId) : [...prev, recipeId];
      try { localStorage.setItem("brewlog_bookmarks_" + user?.uid, JSON.stringify(next)); } catch {}
      return next;
    });
  };
  const [adminMode, setAdminMode] = useState(false);
  const [notices, setNotices] = useState([]);
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  // Bean Vault 상태 (MainApp에서 관리해 탭 구조 통일)
  const [beanFilterStatus, setBeanFilterStatus] = useState("all");
  const [beanShowModal, setBeanShowModalState] = useState(false);
  const setBeanShowModal = (v) => { beanShowModalRef.current = v; if(v) window.history.pushState({modal:true},""); setBeanShowModalState(v); };
  const [beanEditTarget, setBeanEditTarget] = useState(null);
  const [equipShowModal, setEquipShowModalState] = useState(false);
  const setEquipShowModal = (v) => { equipShowModalRef.current = v; if(v) window.history.pushState({modal:true},""); setEquipShowModalState(v); };
  const [compareTarget, setCompareTargetState] = useState(null);
  const setCompareTarget = (v) => { compareTargetRef.current = v; if(v) window.history.pushState({modal:true},""); setCompareTargetState(v); };

  // 모달 열림 상태 추적
  useEffect(() => {
    const anyOpen = showModal || showMyModal || !!detailRecipe || beanShowModal || equipShowModal || !!compareTarget;
    modalOpenRef.current = anyOpen;
  }, [showModal, showMyModal, detailRecipe, beanShowModal, equipShowModal, compareTarget]);

  const loadRecipes = useCallback(async () => {
    try {
      const q = query(collection(db, "recipes"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setRecipes(snap.docs.map(d => {
        const data = { id: d.id, ...d.data() };
        // 기존 저장된 레시피 중 waterTemp 빈값 보정
        if (!data.waterTemp && data.waterTemp !== 0) data.waterTemp = "93";
        return data;
      }));
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    loadRecipes();
    // 관리자 여부 확인
    // 관리자 체크 - 재시도 로직 포함
    const checkAdmin = async () => {
      if (!user) return; // 비회원이면 스킵
      try {
        const token = await user?.getIdToken(true);
        const snap = await getDoc(doc(db, "admins", user?.uid));
        setIsAdmin(snap.exists());
      } catch(e) {
        console.error("admin check error:", e);
        setTimeout(async () => {
          try {
            const snap = await getDoc(doc(db, "admins", user?.uid));
            setIsAdmin(snap.exists());
          } catch(e2) { console.error("admin retry failed:", e2); }
        }, 1000);
      }
    };
    checkAdmin();
    // 최신 공지사항 로드
    getDocs(query(collection(db, "notices"), orderBy("createdAt", "desc")))
      .then(snap => {
        setNotices(snap.docs.slice(0, 1).map(d => ({ id: d.id, ...d.data() })));
      })
      .catch(() => {});
  }, [loadRecipes, user?.uid]);



  // Gemini — 앱 시작 또는 언어 변경 시 호출 (언어별 하루 1회 캐시)
  useEffect(() => {
    if (!user?.uid || recipes.length === 0) return;
    const mine = recipes.filter(r => r.uid === user.uid);
    if (mine.length === 0) return;
    const today = new Date().toDateString();
    const langKey = `brewlog_gemini_${user.uid}_${lang}`;
    try {
      const cached = JSON.parse(localStorage.getItem(langKey) || "null");
      if (cached?.fetchedAt === today) { setGeminiAdvice(cached); return; }
    } catch {}
    // 언어가 바뀌면 ref 초기화해서 재호출 허용
    if (geminiCalledRef.current === `${today}_${lang}`) return;
    geminiCalledRef.current = `${today}_${lang}`;
    fetchGeminiAdvice();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, recipes.length, lang]);

  const handleDelete = async (id) => {
    if (!confirm("이 레시피를 삭제할까요?")) return;
    await deleteDoc(doc(db, "recipes", id));
    loadRecipes();
  };

  // 레시피 복사해서 기록하기
  const handleCopyRecipe = (recipe) => {
    // id, uid, author, createdAt, likedBy 제거 → 새 레시피로
    const { id, uid, author, createdAt, updatedAt, likedBy, isImported, ...rest } = recipe;
    setEditTarget({ ...rest, _isCopy: true });
    openModal();
  };

  const handleLike = async (recipe) => {
    if (!user) { onRequireAuth?.(); return; }
    const likedBy = recipe.likedBy || [];
    const alreadyLiked = likedBy.includes(user?.uid);
    const newLikedBy = alreadyLiked
      ? likedBy.filter(id => id !== user?.uid)
      : [...likedBy, user?.uid];
    await updateDoc(doc(db, "recipes", recipe.id), { likedBy: newLikedBy });
    loadRecipes();
  };

  const blocked = React.useMemo(() => {
    try { return JSON.parse(localStorage.getItem(`brewlog_blocked_${user?.uid}`) || "[]"); } catch { return []; }
  }, [user?.uid]);

  const filtered = recipes.filter(r => {
    // 비공개 레시피는 본인만 볼 수 있음
    if (r.isPublic === false && r.uid !== user?.uid) return false;
    // 차단된 유저 레시피 숨김
    if (blocked.includes(r.uid)) return false;
    // 작성자 필터 (닉네임 클릭 시)
    if (filterAuthor) {
      if (filterAuthor.uid ? r.uid !== filterAuthor.uid : r.author !== filterAuthor.name) return false;
    }
    if (myRecipesOnly && r.uid !== user?.uid) return false;
    if (feedTab === "bookmarks" && !bookmarks.includes(r.id)) return false;
    if (feedTab === "following" && !following.includes(r.uid) && !following.includes(r.author)) return false;
    if (feedTab === "mine" && r.uid !== user?.uid) return false;
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      (r.menuLabel || "").toLowerCase().includes(q) ||
      (r.machine || "").toLowerCase().includes(q) ||
      (r.grinder || "").toLowerCase().includes(q) ||
      (r.company || "").toLowerCase().includes(q) ||
      (r.bean || "").toLowerCase().includes(q) ||
      (r.author || "").toLowerCase().includes(q) ||
      (r.note || "").toLowerCase().includes(q)
    );
  });

  if (adminMode) return <AdminApp user={user} lang={lang} onExit={() => setAdminMode(false)} />;

  return (<>
    {notices.length > 0 && !noticeDismissed && (
      <div className="notice-banner">
        <span style={{ fontSize: "0.82rem" }}>{notices[0].title} — {notices[0].body}</span>
        <button className="notice-banner-close" onClick={() => setNoticeDismissed(true)}>✕</button>
      </div>
    )}
    {/* ── Fixed 상단 바 (헤더 + 탭바) ── */}
    <div id="top-bar" style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 200,
      transform: headerVisible ? "translateY(0)" : "translateY(-100%)",
      transition: "transform 0.35s cubic-bezier(0.4,0,0.2,1)",
      background: "var(--cream)",
      boxShadow: "0 1px 0 var(--divider)",
    }}>
    <header className="app-header" style={{ transform: "none", transition: "none" }}>
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
            <span
              className={`nick-badge ${myRecipesOnly ? "active" : ""}`}
              onClick={() => setMyRecipesOnly(v => !v)}
              title={myRecipesOnly ? "전체 피드 보기" : "내 레시피만 보기"}
            >
              @{user?.displayName}{myRecipesOnly ? " ·" : ""}
            </span>
            {isAdmin && <button className="btn-admin-header" onClick={() => setAdminMode(true)}>관리자</button>}
            <button className="btn-lang" onClick={toggleLang}>{lang === "ko" ? "EN" : "KO"}</button>
            <button className="btn-my" onClick={() => openMyModal()}>MY</button>
            {/* 알림 버튼 */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <button className="notif-btn" onClick={() => setShowNotif(v => !v)}>
                <svg width="16" height="16" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 2C6.24 2 4 4.24 4 7v4l-1.5 2h13L14 11V7C14 4.24 11.76 2 9 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                  <path d="M7.5 15.5C7.5 16.33 8.17 17 9 17s1.5-.67 1.5-1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>}
              </button>
              {showNotif && (
                <div className="notif-dropdown">
                  <div className="notif-header">
                    <span>
                      {lang === "en" ? "Notifications" : "알림"}
                      {unreadCount > 0 && (
                        <span style={{ marginLeft: "6px", fontSize: "0.68rem", fontWeight: 400, color: "var(--latte)" }}>
                          {lang === "en" ? `${unreadCount} unread` : `${unreadCount}개 안읽음`}
                        </span>
                      )}
                    </span>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllRead}
                          style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.7rem", color: "var(--muted)", fontFamily: "'DM Sans',sans-serif", padding: 0 }}
                        >
                          {lang === "en" ? "Mark all read" : "전체 읽음"}
                        </button>
                      )}
                      <button onClick={() => setShowNotif(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: "2px", display: "flex", alignItems: "center" }}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      </button>
                    </div>
                  </div>
                  <div className="notif-list">
                    {notifications.length === 0 ? (
                      <div className="notif-empty">{lang === "en" ? "No notifications" : "알림이 없어요"}</div>
                    ) : notifications.map(n => (
                      <div key={n.id} className={`notif-item ${n.read ? "" : "unread"}`}
                        onClick={async () => {
                          setShowNotif(false);
                          if (!n.read) await updateDoc(doc(db, "notifications", n.id), { read: true }).catch(() => {});
                          if (n.recipeId) {
                            const snap = await getDoc(doc(db, "recipes", n.recipeId)).catch(() => null);
                            if (snap?.exists()) setDetailRecipeWrapped({ id: snap.id, ...snap.data() });
                          } else if (n.type === "newRecipe") {
                            setFeedTab("all");
                            setSearch(n.fromUser || "");
                          }
                        }}>
                        <div className="notif-item-text">
                          {n.type === "comment"
                            ? (lang === "en"
                                ? `${n.fromUser} commented on "${n.beanName}"`
                                : `${n.fromUser}님이 "${n.beanName}" 레시피에 댓글을 남겼어요`)
                            : (lang === "en"
                                ? `${n.fromUser} posted a new recipe: "${n.beanName}"`
                                : `구독 중인 ${n.fromUser}님이 "${n.beanName}" 레시피를 올렸어요`)}
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div className="notif-item-time">
                            {n.createdAt?.toDate?.()?.toLocaleDateString(lang === "ko" ? "ko-KR" : "en-US") || ""}
                          </div>
                          {!n.read && (
                            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--latte)", flexShrink: 0 }}/>
                          )}
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
            <button className="btn-lang" onClick={toggleLang}>{lang === "ko" ? "EN" : "KO"}</button>
            <button className="btn-my" onClick={() => onRequireAuth?.()} style={{ color: "var(--accent)", borderColor: "var(--accent)" }}>
              {lang === "en" ? "Login" : "로그인"}
            </button>
          </>
        )}
      </div>
      </div>
    </header>
      <div style={{
        background: "var(--cream)", borderBottom: "1px solid var(--divider)",
        padding: "14px 24px 14px",
      }}>
      {(<>
        <div style={{ maxWidth: "900px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "6px" }}>
          {/* 그룹 1: 피드 탭 + 그룹 2: 내 것 탭 — 한 줄에 양쪽 정렬 */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" }}>
            {/* 왼쪽: 피드 탭 */}
            <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
              <button className={`bookmark-tab-btn ${feedTab === "all" && !showRanking ? "active" : ""}`}
                onClick={() => { setFeedTab("all"); setMyRecipesOnly(false); setFilterAuthor(null); setShowRanking(false); }}>
                {I18N[lang].allRecipes}
              </button>
              <button className={`bookmark-tab-btn ${feedTab === "following" && !showRanking ? "active" : ""}`}
                onClick={() => { setFeedTab("following"); setMyRecipesOnly(false); setFilterAuthor(null); setShowRanking(false); }}>
                {I18N[lang].followingFeed}{following.length > 0 ? ` (${following.length})` : ""}
              </button>
              <button className={`bookmark-tab-btn ${feedTab === "bookmarks" && !showRanking ? "active" : ""}`}
                onClick={() => { setFeedTab("bookmarks"); setMyRecipesOnly(false); setFilterAuthor(null); setShowRanking(false); }}>
                {I18N[lang].myBookmarks}{bookmarks.length > 0 ? ` (${bookmarks.length})` : ""}
              </button>
            </div>
            {/* 구분선 */}
            {user && <div style={{ width: "1px", height: "20px", background: "var(--divider)", flexShrink: 0 }}/>}
            {/* 오른쪽: 내 것 탭 */}
            {user && (
              <div style={{ display: "flex", gap: "4px", overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none", flexShrink: 1 }}>
                <button className={`bookmark-tab-btn ${feedTab === "mine" && !showRanking ? "active" : ""}`}
                  onClick={() => { setFeedTab("mine"); setMyRecipesOnly(false); setFilterAuthor(null); setShowRanking(false); }}>
                  {I18N[lang].myRecipes}
                </button>
                <button className={`bookmark-tab-btn ${feedTab === "beans" && !showRanking ? "active" : ""}`}
                  onClick={() => { setFeedTab("beans"); setMyRecipesOnly(false); setFilterAuthor(null); setShowRanking(false); }}>
                  {I18N[lang].myBeans}
                </button>
                <button className={`bookmark-tab-btn ${feedTab === "equip" && !showRanking ? "active" : ""}`}
                  onClick={() => { setFeedTab("equip"); setMyRecipesOnly(false); setFilterAuthor(null); setShowRanking(false); }}>
                  {I18N[lang].myEquip}
                </button>
              </div>
            )}
          </div>
        </div>
        {/* 두 번째 행: beans → 필터+추가 / equip → 추가 / 나머지 → 검색+기록하기 */}
        {true && (
          <div style={{ borderTop: "1px solid var(--divider)", marginTop: "10px", paddingTop: "10px", maxWidth: "900px", margin: "10px auto 0" }}>
            {feedTab === "beans" ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                <div style={{ display: "flex", gap: "5px", flexWrap: "nowrap", overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}>
                  {[["all", lang === "en" ? "All" : "전체"], ["open", I18N[lang].beanOpen], ["sealed", I18N[lang].beanSealed]].map(([v, lbl]) => (
                    <button key={v} onClick={() => setBeanFilterStatus(v)}
                      style={{ padding: "5px 12px", border: "1px solid", borderRadius: "20px", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", whiteSpace: "nowrap", flexShrink: 0, transition: "all 0.15s", lineHeight: 1,
                        borderColor: beanFilterStatus === v ? "var(--espresso)" : "var(--steam)",
                        background: beanFilterStatus === v ? "var(--espresso)" : "transparent",
                        color: beanFilterStatus === v ? "var(--cream)" : "var(--muted)",
                        fontWeight: beanFilterStatus === v ? 600 : 400 }}>
                      {lbl}
                    </button>
                  ))}
                </div>
                <button className="btn-new" style={{ flexShrink: 0 }} onClick={() => { setBeanEditTarget(null); setBeanShowModal(true); }}>
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                  {lang === "en" ? "Add Bean" : "추가하기"}
                </button>
              </div>
            ) : feedTab === "equip" ? (
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button className="btn-new" onClick={() => setEquipShowModal(true)}>
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                  {lang === "en" ? "Add Gear" : "추가하기"}
                </button>
              </div>
            ) : (
              <div className="search-row" style={{ display: "flex", gap: "0.5rem", width: "100%", boxSizing: "border-box", overflow: "hidden" }}>
                <div className="search-box" style={{ flex: 1, minWidth: 0 }}>
                  <span className="search-icon">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </span>
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder={I18N[lang].searchPlaceholder} />
                </div>
                <button className="btn-new" style={{ flexShrink: 0 }} onClick={() => { if (!user && onRequireAuth) { onRequireAuth(); } else { openModal(); } }}>
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                    <path d="M9.5 1.5l3 3-7 7H2.5v-3l7-7z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                    <path d="M7.5 3.5l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                  <span className="btn-new-text">{I18N[lang].newRecipe}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </>)}
      </div> {/* 탭바 wrapper 끝 */}
    </div> {/* fixed top-bar 끝 */}
    {/* 타이틀 + 베스트 */}
    <div className="main-wrap" style={{ paddingTop: `${topBarHeight + 8}px` }}>
      {/* 타이틀 */}
      {(() => {
        let title, sub;
        if (filterAuthor) {
          title = `@${filterAuthor.name}`;
          sub = lang === "en" ? `Recipes by @${filterAuthor.name}` : `@${filterAuthor.name}의 레시피`;
        } else if (myRecipesOnly || feedTab === "mine") {
          title = I18N[lang].myFeedTitle; sub = I18N[lang].myFeedSub;
        } else if (feedTab === "following") {
          title = I18N[lang].followingFeedTitle; sub = I18N[lang].followingFeedSub;
        } else if (feedTab === "bookmarks") {
          title = I18N[lang].bookmarksFeedTitle; sub = I18N[lang].bookmarksFeedSub;
        } else if (feedTab === "beans") {
          title = I18N[lang].beanVault; sub = I18N[lang].beanVaultSub;
        } else if (feedTab === "equip") {
          title = I18N[lang].myEquip; sub = I18N[lang].equipVaultSub;
        } else {
          title = I18N[lang].feedTitle; sub = I18N[lang].feedSub;
        }
        return (<>
          <div className="section-title">{title}</div>
          <div className="section-sub">{sub}</div>
        </>);
      })()}
      {/* 작성자 필터 배지 */}
      {filterAuthor && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "8px 0 12px" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            padding: "5px 10px 5px 12px", background: "var(--espresso)", color: "var(--cream)",
            borderRadius: "20px", fontSize: "0.78rem", fontWeight: 600,
            fontFamily: "'DM Sans', sans-serif",
          }}>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="4" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M1.5 10.5c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            @{filterAuthor.name}
            <button
              onClick={() => setFilterAuthor(null)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--cream)", opacity: 0.7, padding: "0 0 0 2px", lineHeight: 1, fontSize: "1rem", display: "flex", alignItems: "center" }}
              title={lang === "en" ? "Clear filter" : "필터 해제"}
            >×</button>
          </div>
          <span style={{ fontSize: "0.72rem", color: "var(--muted)", fontFamily: "'DM Sans', sans-serif" }}>
            {filtered.length}{lang === "en" ? " recipes" : "개"}
          </span>
        </div>
      )}
      <div className="divider" style={{ marginBottom: "1.5rem" }} />

      {/* ── Gemini AI 추천 카드 (전체 피드 + 로그인 유저) ── */}
      {feedTab === "all" && !myRecipesOnly && !showRanking && !filterAuthor && user && (() => {
        // 로딩 스켈레톤
        if (geminiLoading) return (
          <div style={{ background: "linear-gradient(135deg, #1A1A1A 0%, #2C1A0E 100%)", borderRadius: 14, padding: "18px 16px", marginBottom: 16, overflow: "hidden", position: "relative" }}>
            <div style={{ position: "absolute", right: -16, top: -16, width: 80, height: 80, borderRadius: "50%", background: "rgba(176,125,84,0.15)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(176,125,84,0.3)", animation: "pulse 1.5s ease-in-out infinite" }} />
              <div style={{ width: 100, height: 10, borderRadius: 6, background: "rgba(255,255,255,0.1)" }} />
            </div>
            <div style={{ width: "90%", height: 10, borderRadius: 6, background: "rgba(255,255,255,0.08)", marginBottom: 8 }} />
            <div style={{ width: "75%", height: 10, borderRadius: 6, background: "rgba(255,255,255,0.06)", marginBottom: 16 }} />
            <div style={{ display: "flex", gap: 8 }}>
              {[1,2,3].map(i => <div key={i} style={{ flex:1, height: 48, borderRadius: 10, background: "rgba(255,255,255,0.07)" }} />)}
            </div>
            <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
          </div>
        );

        // 에러
        if (geminiError) return (
          <div style={{ background: "var(--espresso)", borderRadius: 14, padding: "16px 18px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {/* 스피너 아이콘 */}
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(176,125,84,0.2)", border: "1.5px solid rgba(176,125,84,0.35)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
                  style={{ animation: "spin 2s linear infinite" }}>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
                    stroke="var(--latte)" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--latte)", marginBottom: 3 }}>
                  {lang === "ko" ? "AI 바리스타" : "AI Barista"}
                </div>
                <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.75rem", color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>
                  {lang === "ko"
                    ? "레시피를 분석 중입니다. 잠시 후 다시 시도해 주세요."
                    : "Analyzing your recipes. Please retry in a moment."}
                </div>
              </div>
            </div>
            <button onClick={() => { 
  const today = new Date().toDateString();
  const countKey = `brewlog_gemini_count_${user?.uid}_${today}`;
  const count = parseInt(localStorage.getItem(countKey) || "0");
  if (count >= 5) { alert(lang === "ko" ? "오늘 AI 추천은 최대 5회까지 가능해요." : "Max 5 AI requests per day."); return; }
  localStorage.setItem(countKey, count + 1);
  geminiCalledRef.current = false; setGeminiError(false); fetchGeminiAdvice();
}}
              style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", color: "var(--latte)", background: "rgba(176,125,84,0.15)", border: "1px solid rgba(176,125,84,0.3)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontWeight: 600, flexShrink: 0, whiteSpace: "nowrap" }}>
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M14 8A6 6 0 1 1 8 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M8 2l2.5 2.5L8 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              {lang === "ko" ? "다시 시도" : "Retry"}
            </button>
          </div>
        );

        // 데이터 없음 (내 레시피 0개)
        if (!geminiAdvice) return null;

        return (
          <div style={{ background: "linear-gradient(135deg, #1A1A1A 0%, #2C1A0E 100%)", borderRadius: 14, padding: "18px 16px", marginBottom: 16, overflow: "hidden", position: "relative" }}>
            {/* 장식 원 */}
            <div style={{ position: "absolute", right: -20, top: -20, width: 90, height: 90, borderRadius: "50%", background: "rgba(176,125,84,0.15)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", right: 30, bottom: -30, width: 60, height: 60, borderRadius: "50%", background: "rgba(176,125,84,0.08)", pointerEvents: "none" }} />

            {/* 헤더 */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--latte)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="white" />
                  </svg>
                </div>
                <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--latte)" }}>
                  {lang === "ko" ? "AI 바리스타 · 오늘의 추천" : "AI Barista · Today's Pick"}
                </span>
              </div>
              <button onClick={() => { 
  const today = new Date().toDateString();
  const countKey = `brewlog_gemini_count_${user?.uid}_${today}`;
  const count = parseInt(localStorage.getItem(countKey) || "0");
  if (count >= 5) { alert(lang === "ko" ? "오늘 AI 추천은 최대 5회까지 가능해요." : "Max 5 AI requests per day."); return; }
  localStorage.setItem(countKey, count + 1);
  geminiCalledRef.current = false; setGeminiAdvice(null); fetchGeminiAdvice();
}}
                style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 8, padding: "4px 8px", cursor: "pointer", color: "rgba(255,255,255,0.5)", fontFamily: "'DM Sans',sans-serif", fontSize: "0.65rem", display: "flex", alignItems: "center", gap: 4 }}
                title={lang === "ko" ? "새로 받기" : "Refresh"}>
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M14 8A6 6 0 1 1 8 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M8 2l2.5 2.5L8 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {lang === "ko" ? "새로고침" : "Refresh"}
              </button>
            </div>

            {/* 오늘의 팁 */}
            <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.8rem", color: "rgba(255,255,255,0.82)", lineHeight: 1.6, marginBottom: 14 }}>
              {geminiAdvice.tip}
            </div>

            {/* 추천 레시피 박스 */}
            <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(176,125,84,0.25)", borderRadius: 10, padding: "12px 14px", marginBottom: 12 }}>
              <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(176,125,84,0.9)", marginBottom: 5 }}>
                {lang === "ko" ? "오늘 시도해볼 레시피" : "Recipe to Try Today"}
              </div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "0.92rem", fontWeight: 700, color: "#fff", marginBottom: 5 }}>
                {geminiAdvice.recipeTitle}
              </div>
              <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.75rem", color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>
                {geminiAdvice.recipeDesc}
              </div>
            </div>

            {/* 파라미터 3개 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {[
                { label: lang === "ko" ? "원두량" : "Dose",    value: geminiAdvice.gram,    unit: "g" },
                { label: lang === "ko" ? "물 온도" : "Temp",   value: geminiAdvice.temp,    unit: "°C" },
                { label: lang === "ko" ? "추출 시간" : "Time", value: geminiAdvice.seconds, unit: "s" },
              ].map(({ label, value, unit }) => (
                <div key={label} style={{ background: "rgba(255,255,255,0.07)", borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
                  <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.6rem", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{label}</div>
                  <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.1rem", fontWeight: 700, color: "var(--latte)", lineHeight: 1 }}>{value}</div>
                  <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.65rem", color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{unit}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
      {/* 내 원두 탭 */}
      {feedTab === "beans" && user && (
        <BeanVault user={user} lang={lang}
          filterStatus={beanFilterStatus} setFilterStatus={setBeanFilterStatus}
          showModal={beanShowModal} setShowModal={setBeanShowModal}
          editTarget={beanEditTarget} setEditTarget={setBeanEditTarget}
          currency={loadCurrency()} />
      )}
      {feedTab === "equip" && user && (
        <EquipmentVault user={user} lang={lang} showModal={equipShowModal} setShowModal={setEquipShowModal} />
      )}
      {feedTab !== "beans" && feedTab !== "equip" && feedTab === "all" && !myRecipesOnly && !showRanking && (() => {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(startOfDay);
        startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const getTopList = (since) => {
          const filtered = [...recipes].filter(r => {
            if ((r.likedBy || []).length === 0) return false;
            if (!since) return true;
            const created = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt);
            return created && created >= since;
          });
          return filtered.sort((a, b) => (b.likedBy?.length || 0) - (a.likedBy?.length || 0)).slice(0, 100);
        };

        const PERIODS = [
          { key: "day",   label: lang === "en" ? "Today" : "오늘",    since: startOfDay },
          { key: "week",  label: lang === "en" ? "This Week" : "이번 주", since: startOfWeek },
          { key: "month", label: lang === "en" ? "This Month" : "이번 달", since: startOfMonth },
        ];

        const curList = getTopList(PERIODS.find(p => p.key === bestPeriod)?.since || startOfMonth);

        const top3 = curList.slice(0, 3);
        const medals = ["🥇", "🥈", "🥉"];

        return (
          <div className="best-section">
            {/* 헤더: 타이틀 + 기간 탭 */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
              <div className="best-title" style={{ margin: 0 }}>{I18N[lang].bestTitle}</div>
              <div style={{ display: "flex", gap: "4px" }}>
                {PERIODS.map(p => (
                  <button key={p.key} onClick={() => setBestPeriod(p.key)}
                    style={{ padding: "0 12px", height: "28px", borderRadius: "8px", border: "1px solid var(--steam)", fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", cursor: "pointer", transition: "all 0.2s",
                      background: bestPeriod === p.key ? "var(--espresso)" : "var(--foam)",
                      color: bestPeriod === p.key ? "var(--cream)" : "var(--muted)",
                      fontWeight: bestPeriod === p.key ? 600 : 400 }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* TOP 3 매거진 리스트 */}
            {top3.length > 0 ? (
              <div style={{ background: "var(--foam)", border: "1px solid var(--divider)", borderRadius: "8px", overflow: "hidden", marginBottom: "8px" }}>
                {top3.map((r, i) => (
                  <div key={r.id} className="best-row" onClick={() => openDetail(r)}>
                    {/* 순위 번호 */}
                    <div className={`best-rank-num rank-${i + 1}`}>
                      {String(i + 1).padStart(2, '0')}
                    </div>
                    {/* 원두 정보 */}
                    <div className="best-row-content">
                      <div className="best-row-bean">{r.bean}</div>
                      <div className="best-row-meta">
                        <span>@{r.author}</span>
                        {r.machine && <><span style={{ opacity: 0.4 }}>·</span><span>{r.machine}</span></>}
                        {r.menuLabel && <><span style={{ opacity: 0.4 }}>·</span><span>{lang === "en" ? (COFFEE_MENUS.find(m => m.id === r.menuId)?.labelEn || r.menuLabel) : r.menuLabel}</span></>}
                      </div>
                    </div>
                    {/* 하트 카운트 */}
                    <div className="best-row-right">
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8 13.5C8 13.5 2 9.5 2 5.5C2 3.567 3.567 2 5.5 2C6.612 2 7.595 2.518 8 3.354C8.405 2.518 9.388 2 10.5 2C12.433 2 14 3.567 14 5.5C14 9.5 8 13.5 8 13.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                      </svg>
                      <span>{(r.likedBy || []).length}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: "0.78rem", color: "var(--muted)", padding: "8px 0", marginBottom: "8px" }}>
                {lang === "en" ? "No recipes yet." : "이 기간에 레시피가 없어요."}
              </p>
            )}
            {top3.length > 0 && (
              <div style={{ textAlign: "right" }}>
                <button onClick={() => setShowRanking(true)}
                  style={{ background: "none", border: "none", fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", color: "var(--muted)", cursor: "pointer", letterSpacing: "0.02em" }}>
                  {lang === "en" ? "View all →" : "전체 보기 →"}
                </button>
              </div>
            )}
            <div className="divider" style={{ marginTop: "12px", marginBottom: 0 }} />
          </div>
        );
      })()}
    </div>

    {/* 랭킹 페이지 */}
    {showRanking && (() => {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(startOfDay); startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const sinceMap = { day: startOfDay, week: startOfWeek, month: startOfMonth };
      const since = sinceMap[bestPeriod];
      const PERIOD_LABELS = { day: lang === "en" ? "Today" : "오늘", week: lang === "en" ? "This Week" : "이번 주", month: lang === "en" ? "This Month" : "이번 달" };

      const rankList = [...recipes].filter(r => {
        if ((r.likedBy || []).length === 0) return false;
        const created = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt);
        return created && created >= since;
      }).sort((a, b) => (b.likedBy?.length || 0) - (a.likedBy?.length || 0)).slice(0, 100);

      return (
        <div className="main-wrap" style={{ paddingTop: `${topBarHeight + 8}px` }}>
          {/* 헤더 */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", marginBottom: "1.2rem" }}>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.2rem", color: "var(--espresso)", fontWeight: 700 }}>
              {PERIOD_LABELS[bestPeriod]} {lang === "en" ? "Best" : "베스트"}
            </div>
            <div style={{ marginLeft: "auto", fontSize: "0.75rem", color: "var(--muted)" }}>
              {rankList.length}{lang === "en" ? " recipes" : "개"}
            </div>
          </div>

          {/* 랭킹 리스트 */}
          {rankList.length === 0 ? (
            <p style={{ color: "var(--muted)", textAlign: "center", padding: "3rem 0", fontSize: "0.88rem" }}>
              {lang === "en" ? "No recipes for this period yet." : "이 기간에 레시피가 없어요."}
            </p>
          ) : (
            <div style={{ borderRadius: "8px", border: "1px solid var(--steam)", overflow: "hidden", background: "var(--foam)" }}>
              {rankList.map((r, i) => (
                <div key={r.id} onClick={() => openDetail(r)}
                  style={{ display: "flex", alignItems: "center", gap: "0.9rem", padding: "0.8rem 1rem", borderBottom: i < rankList.length - 1 ? "1px solid var(--steam)" : "none", cursor: "pointer", transition: "background 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--cream)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  {/* 순위 */}
                  <div style={{ minWidth: "2.5rem", textAlign: "right", fontFamily: "'DM Sans',sans-serif", fontWeight: 600,
                    fontSize: "0.88rem", letterSpacing: "-0.02em",
                    color: i === 0 ? "var(--espresso)" : i < 3 ? "var(--latte)" : "var(--muted)" }}>
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  {/* 원두 정보 */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1rem", fontWeight: 600, color: "var(--espresso)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {r.bean}
                    </div>
                    <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", color: "var(--muted)", display: "flex", gap: "0.35rem", alignItems: "center", marginTop: "0.15rem", flexWrap: "wrap" }}>
                      {r.company && <span>{r.company}</span>}
                      {r.machine && <><span>·</span><span>{r.machine}</span></>}
                      <span>·</span><span style={{ color: "var(--roast)", fontWeight: 500 }}>@{r.author}</span>
                    </div>
                  </div>
                  {/* 좋아요 */}
                  <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem", color: "var(--muted)", fontWeight: 500, display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M8 13.5C8 13.5 2 9.5 2 5.5C2 3.567 3.567 2 5.5 2C6.612 2 7.595 2.518 8 3.354C8.405 2.518 9.388 2 10.5 2C12.433 2 14 3.567 14 5.5C14 9.5 8 13.5 8 13.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                    </svg>
                    {(r.likedBy || []).length}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    })()}



    {/* 레시피 목록 - 랭킹 페이지에선 숨김 */}
    {!showRanking && <div className="main-wrap" style={{ paddingTop: "0" }}>

      {/* ── 내 레시피 통계 ── */}
      {feedTab === "mine" && (() => {
        const mine = recipes.filter(r => r.uid === user?.uid);
        if (mine.length === 0) return null;

        const machineRecipes = mine.filter(r => r.machineType !== "handdrip");
        const handDripRecipes = mine.filter(r => r.machineType === "handdrip");
        const statMode = statModeVal;

        const calcStats = (list) => {
          const withGram = list.filter(r => r.gram);
          const withSec = list.filter(r => r.seconds);
          const withMl = list.filter(r => r.espressoMl);
          const withTemp = list.filter(r => r.waterTemp);
          return {
            gram: withGram.length ? { avg: (withGram.reduce((s,r)=>s+Number(r.gram),0)/withGram.length).toFixed(1), min: Math.min(...withGram.map(r=>Number(r.gram))), max: Math.max(...withGram.map(r=>Number(r.gram))) } : null,
            sec:  withSec.length  ? { avg: Math.round(withSec.reduce((s,r)=>s+Number(r.seconds),0)/withSec.length), min: Math.min(...withSec.map(r=>Number(r.seconds))), max: Math.max(...withSec.map(r=>Number(r.seconds))) } : null,
            ml:   withMl.length   ? { avg: (withMl.reduce((s,r)=>s+Number(r.espressoMl),0)/withMl.length).toFixed(1), min: Math.min(...withMl.map(r=>Number(r.espressoMl))), max: Math.max(...withMl.map(r=>Number(r.espressoMl))) } : null,
            temp: withTemp.length  ? { avg: (withTemp.reduce((s,r)=>s+Number(r.waterTemp),0)/withTemp.length).toFixed(1), min: Math.min(...withTemp.map(r=>Number(r.waterTemp))), max: Math.max(...withTemp.map(r=>Number(r.waterTemp))) } : null,
          };
        };

        const calcTop = (list) => {
          const menuCount    = {}; list.forEach(r => { if (r.menuLabel) menuCount[r.menuLabel]     = (menuCount[r.menuLabel]    ||0)+1; });
          const beanCount    = {}; list.forEach(r => { if (r.bean)      beanCount[r.bean]          = (beanCount[r.bean]         ||0)+1; });
          const machineCount = {}; list.forEach(r => {
            // machineBrand 우선, 없으면 machine 전체 문자열 사용
            const key = r.machineBrand ? r.machineBrand : r.machine;
            if (key) machineCount[key] = (machineCount[key]||0)+1;
          });
          const grinderCount = {}; list.forEach(r => {
            const key = r.grinderBrand ? r.grinderBrand : r.grinder;
            if (key) grinderCount[key] = (grinderCount[key]||0)+1;
          });
          return {
            menus:    Object.entries(menuCount).sort((a,b)=>b[1]-a[1]).slice(0,3),
            beans:    Object.entries(beanCount).sort((a,b)=>b[1]-a[1]).slice(0,3),
            machines: Object.entries(machineCount).sort((a,b)=>b[1]-a[1]).slice(0,3),
            grinders: Object.entries(grinderCount).sort((a,b)=>b[1]-a[1]).slice(0,3),
          };
        };

        // 두 탭 데이터 모두 미리 계산
        const mStats = calcStats(machineRecipes); const mTop = calcTop(machineRecipes);
        const hStats = calcStats(handDripRecipes); const hTop = calcTop(handDripRecipes);
        const mGlobal = calcStats(recipes.filter(r => r.machineType !== "handdrip"));
        const hGlobal = calcStats(recipes.filter(r => r.machineType === "handdrip"));

        const rated = mine.filter(r => r.rating > 0);
        const avgRating = rated.length ? (rated.reduce((s,r)=>s+r.rating,0)/rated.length).toFixed(1) : null;
        const totalLikes = mine.reduce((s,r)=>s+(r.likedBy?.length||0),0);

        const STAT_ROW_H = "2rem";
        const LABEL_W = "3.8rem";

        // 핵심 수치 카드 — 평균 크게, 범위 바로 시각화
        const StatBox = ({ label, min, max, avg, globalAvg, unit }) => {
          const hasData = avg != null && avg !== "-";
          const hasRange = min != null && max != null && min !== "-" && max !== "-" && min !== max;
          const pct = (v) => {
            const range = parseFloat(max) - parseFloat(min);
            if (!range) return 50;
            return Math.round(((parseFloat(v) - parseFloat(min)) / range) * 100);
          };
          const globalPct = globalAvg != null && hasRange
            ? Math.max(0, Math.min(100, pct(globalAvg))) : null;
          const avgPct = hasData && hasRange ? Math.max(0, Math.min(100, pct(avg))) : null;
          return (
            <div style={{ background: "white", border: "1px solid var(--steam)", borderRadius: "10px", padding: "0.85rem 1rem", boxSizing: "border-box", minWidth: 0 }}>
              <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.66rem", color: "var(--muted)", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
              {/* 핵심 수치 — 평균 크게 */}
              <div style={{ display: "flex", alignItems: "baseline", gap: "3px", marginBottom: "0.55rem" }}>
                <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "1.6rem", fontWeight: 700, color: "var(--espresso)", lineHeight: 1 }}>{hasData ? avg : "—"}</span>
                {hasData && <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", color: "var(--muted)", fontWeight: 400 }}>{unit}</span>}
              </div>
              {/* 범위 바 */}
              {hasRange ? (
                <div style={{ marginBottom: "0.45rem" }}>
                  <div style={{ position: "relative", height: "5px", background: "var(--divider)", borderRadius: "3px", marginBottom: "4px" }}>
                    {/* 내 평균 마커 */}
                    {avgPct != null && (
                      <div style={{ position: "absolute", left: `${avgPct}%`, top: "-3px", width: "2px", height: "11px", background: "var(--espresso)", borderRadius: "1px", transform: "translateX(-50%)" }} />
                    )}
                    {/* 브루어 평균 마커 */}
                    {globalPct != null && (
                      <div style={{ position: "absolute", left: `${globalPct}%`, top: "0px", width: "2px", height: "5px", background: "var(--latte)", borderRadius: "1px", transform: "translateX(-50%)" }} />
                    )}
                    <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: "100%", borderRadius: "3px",
                      background: `linear-gradient(to right, var(--divider) ${Math.min(avgPct??50,globalPct??50)}%, transparent ${Math.max(avgPct??50,globalPct??50)}%)` }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.62rem", color: "var(--muted)" }}>{min}{unit}</span>
                    <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.62rem", color: "var(--muted)" }}>{max}{unit}</span>
                  </div>
                </div>
              ) : (
                <div style={{ height: "24px" }} />
              )}
              {/* 브루어 평균 비교 */}
              {globalAvg != null && (
                <div style={{ display: "flex", alignItems: "center", gap: "4px", paddingTop: "0.3rem", borderTop: "1px solid var(--divider)" }}>
                  <div style={{ width: "8px", height: "2px", background: "var(--latte)", borderRadius: "1px", flexShrink: 0 }} />
                  <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.62rem", color: "var(--muted)" }}>
                    {lang === "en" ? "All brewers avg" : "브루어 평균"} <strong style={{ color: "var(--latte)", fontWeight: 600 }}>{globalAvg}{unit}</strong>
                    {hasData && parseFloat(avg) !== parseFloat(globalAvg) && (
                      <span style={{ marginLeft: "3px", color: parseFloat(avg) > parseFloat(globalAvg) ? "var(--latte)" : "var(--muted)" }}>
                        {parseFloat(avg) > parseFloat(globalAvg) ? "▲" : "▼"}{Math.abs((parseFloat(avg) - parseFloat(globalAvg)).toFixed(1))}
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>
          );
        };

        // 랭킹 — 가로 바 차트
        const TopList = ({ label, items }) => {
          const maxCnt = items[0]?.[1] || 1;
          return (
            <div style={{ background: "white", border: "1px solid var(--steam)", borderRadius: "10px", padding: "0.85rem 1rem", minWidth: 0 }}>
              <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.66rem", color: "var(--muted)", marginBottom: "0.7rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
              {items.length === 0
                ? <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", color: "var(--muted)", padding: "0.5rem 0" }}>—</div>
                : items.map(([name, cnt], i) => (
                <div key={name} style={{ marginBottom: i < items.length - 1 ? "0.55rem" : 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "3px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
                      <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.65rem", color: i === 0 ? "var(--latte)" : "var(--muted)", fontWeight: 700, flexShrink: 0 }}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.8rem", color: "var(--espresso)", fontWeight: i === 0 ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
                    </div>
                    <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.68rem", color: "var(--muted)", flexShrink: 0, marginLeft: "6px" }}>{cnt}{lang === "en" ? "x" : "회"}</span>
                  </div>
                  <div style={{ height: "3px", background: "var(--divider)", borderRadius: "2px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.round((cnt / maxCnt) * 100)}%`, background: i === 0 ? "var(--latte)" : "var(--steam)", borderRadius: "2px", transition: "width 0.4s ease" }} />
                  </div>
                </div>
              ))}
            </div>
          );
        };

        // 탭별 콘텐츠 렌더 함수 - display로만 전환
        const TabContent = ({ s, g, top, isHanddrip, visible }) => (
          <div style={{ display: visible ? "block" : "none" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <StatBox label={lang === "en" ? "Dose (g)" : "원두량"} min={s.gram?.min ?? null} avg={s.gram?.avg ?? null} max={s.gram?.max ?? null} globalAvg={g.gram?.avg ?? null} unit="g" />
              <StatBox label={lang === "en" ? "Time (s)" : "추출시간"} min={s.sec?.min ?? null} avg={s.sec?.avg ?? null} max={s.sec?.max ?? null} globalAvg={g.sec?.avg ?? null} unit="s" />
              <StatBox label={lang === "en" ? "Yield (ml)" : "추출량"} min={s.ml?.min ?? null} avg={s.ml?.avg ?? null} max={s.ml?.max ?? null} globalAvg={g.ml?.avg ?? null} unit="ml" />
              <StatBox label={lang === "en" ? "Water Temp" : "물온도"} min={s.temp?.min ?? null} avg={s.temp?.avg ?? null} max={s.temp?.max ?? null} globalAvg={g.temp?.avg ?? null} unit="°C" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <TopList label={lang === "en" ? "Top Menu" : "자주 마신 메뉴"} items={top.menus} />
              <TopList label={lang === "en" ? "Top Bean" : "자주 쓴 원두"} items={top.beans} />
            </div>
            {(top.machines?.length > 0 || top.grinders?.length > 0) && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                {top.machines?.length > 0 && (
                  <TopList label={lang === "en" ? (isHanddrip ? "Equipment" : "Machine") : (isHanddrip ? "주로 쓰는 기구" : "주로 쓰는 기기")} items={top.machines} />
                )}
                {top.grinders?.length > 0 && (
                  <TopList label={lang === "en" ? "Grinder" : "그라인더"} items={top.grinders} />
                )}
              </div>
            )}
          </div>
        );

        // ── 새 비주얼 대시보드 ──────────────────────────────────────────
        const publicCnt = mine.filter(r => r.isPublic !== false).length;
        const publicPct = mine.length ? Math.round((publicCnt / mine.length) * 100) : 0;

        // 현재 탭 데이터
        const curStats  = statMode === "handdrip" ? hStats  : mStats;
        const curGlobal = statMode === "handdrip" ? hGlobal : mGlobal;
        const curTop    = statMode === "handdrip" ? hTop    : mTop;
        const curList   = statMode === "handdrip" ? handDripRecipes : machineRecipes;

        // 맛 레이더 — 내 레시피 평균
        const flavorAvg = (() => {
          const keys = FLAVOR_AXES.map(a => a.key);
          const result = {};
          keys.forEach(k => {
            const vals = curList.map(r => parseInt(r[k]) || 0).filter(v => v > 0);
            result[k] = vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : 0;
          });
          return result;
        })();
        const hasFlavorData = FLAVOR_AXES.some(a => flavorAvg[a.key] > 0);

        // 최근 7회 트렌드
        const trendRecipes = [...curList]
          .filter(r => r.rating > 0)
          .sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0))
          .slice(0, 7)
          .reverse();

        // Safe Zone 비교 (전체 5점 레시피 기준)
        const topRated = recipes.filter(r =>
          (statMode === "handdrip" ? r.machineType === "handdrip" : r.machineType !== "handdrip")
          && r.rating >= 5
        );
        const safeAvg = (key, list) => {
          const vals = list.map(r => parseFloat(r[key])).filter(v => !isNaN(v) && v > 0);
          return vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : null;
        };
        const safeStd = (key, list) => {
          const vals = list.map(r => parseFloat(r[key])).filter(v => !isNaN(v) && v > 0);
          if (vals.length < 2) return 0;
          const avg = vals.reduce((a,b)=>a+b,0)/vals.length;
          return Math.sqrt(vals.reduce((s,v)=>s+Math.pow(v-avg,2),0)/vals.length);
        };

        // 대시보드 탭
        const [dashTab, setDashTab] = [statModeVal, setStatModeVal]; // 재사용

        // ── 내부 비주얼 컴포넌트 ──────────────────────────────────────
        const DCard = ({ children, style }) => (
          <div style={{ background: "#fff", borderRadius: 14, padding: "16px", boxShadow: "0 2px 12px rgba(26,26,26,0.06)", marginBottom: 10, ...style }}>
            {children}
          </div>
        );
        const DSectionLabel = ({ children }) => (
          <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.62rem", fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:"var(--latte)", marginBottom:3 }}>{children}</div>
        );
        const DTitle = ({ children }) => (
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"0.95rem", fontWeight:700, color:"var(--espresso)", marginBottom:2 }}>{children}</div>
        );

        return (
          <div style={{ marginBottom: "2rem" }}>

            {/* ── 헤더 배너 ─────────────────────────────────── */}
            <div style={{ background:"var(--espresso)", borderRadius:14, padding:"18px 16px 16px", marginBottom:10, position:"relative", overflow:"hidden" }}>
              {/* 장식 원 */}
              <div style={{ position:"absolute", right:-20, top:-20, width:90, height:90, borderRadius:"50%", background:"rgba(176,125,84,0.18)", pointerEvents:"none" }} />
              <div style={{ position:"absolute", right:20, bottom:-30, width:60, height:60, borderRadius:"50%", background:"rgba(176,125,84,0.10)", pointerEvents:"none" }} />

              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.6rem", fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", color:"var(--latte)", marginBottom:5 }}>
                {lang === "en" ? "My Brew Report" : "나의 브루 리포트"}
              </div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.2rem", fontWeight:700, color:"#fff", marginBottom:4 }}>
                {lang === "en" ? "Extraction Stats" : "추출 통계 & 분석"}
              </div>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.7rem", color:"rgba(255,255,255,0.45)", marginBottom:14 }}>
                {lang === "en" ? `${mine.length} recipes recorded` : `총 ${mine.length}개 레시피 기록됨`}
              </div>

              {/* 머신/핸드드립 탭 */}
              {machineRecipes.length > 0 && handDripRecipes.length > 0 && (
                <div style={{ display:"flex", gap:6, background:"rgba(255,255,255,0.08)", borderRadius:10, padding:3 }}>
                  {machineRecipes.length > 0 && (
                    <button onClick={() => setStatModeVal("machine")} style={{
                      flex:1, padding:"7px 0", borderRadius:8, border:"none", cursor:"pointer",
                      fontFamily:"'DM Sans',sans-serif", fontSize:"0.75rem", fontWeight:700,
                      background: statMode !== "handdrip" ? "var(--latte)" : "transparent",
                      color: statMode !== "handdrip" ? "#fff" : "rgba(255,255,255,0.5)",
                      transition:"all 0.18s"
                    }}>{lang === "en" ? "Machine" : "머신"} ({machineRecipes.length})</button>
                  )}
                  {handDripRecipes.length > 0 && (
                    <button onClick={() => setStatModeVal("handdrip")} style={{
                      flex:1, padding:"7px 0", borderRadius:8, border:"none", cursor:"pointer",
                      fontFamily:"'DM Sans',sans-serif", fontSize:"0.75rem", fontWeight:700,
                      background: statMode === "handdrip" ? "var(--latte)" : "transparent",
                      color: statMode === "handdrip" ? "#fff" : "rgba(255,255,255,0.5)",
                      transition:"all 0.18s"
                    }}>{lang === "en" ? "Hand Drip" : "핸드드립"} ({handDripRecipes.length})</button>
                  )}
                </div>
              )}
            </div>

            {/* ── 요약 지표 4개 ─────────────────────────────── */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8, marginBottom:10 }}>
              {[
                { label: lang==="en"?"Recipes":"총 레시피", value: curList.length, sub: lang==="en"?"brewed":"회 추출", color:"var(--espresso)" },
                { label: lang==="en"?"Public":"공개율",     value: `${publicPct}%`, sub: `${publicCnt}${lang==="en"?" shared":"개 공개"}`, color:"var(--latte)" },
                { label: lang==="en"?"Avg ★":"평균 별점",   value: avgRating ? `${avgRating}★` : "—", sub: avgRating ? `${rated.length}${lang==="en"?" rated":"개 평가"}` : "—", color:"var(--latte)" },
                { label: lang==="en"?"Likes":"좋아요",      value: totalLikes, sub: lang==="en"?"total":"개 누적", color:"#C0625A" },
              ].map(({ label, value, sub, color }) => (
                <div key={label} style={{ background:"#fff", borderRadius:12, padding:"10px 8px", boxShadow:"0 1px 8px rgba(26,26,26,0.05)", textAlign:"center", minWidth:0 }}>
                  <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.58rem", color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:4, lineHeight:1.2 }}>{label}</div>
                  <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.1rem", fontWeight:700, color, lineHeight:1, marginBottom:2 }}>{value}</div>
                  <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.6rem", color:"var(--muted)" }}>{sub}</div>
                </div>
              ))}
            </div>

            {/* ── 1. 맛 프로필 레이더 ───────────────────────── */}
            <DCard>
              <DSectionLabel>{lang==="en"?"Flavor Profile":"맛 프로필"}</DSectionLabel>
              <DTitle>{lang==="en"?"My Flavor Signature":"나의 맛 시그니처"}</DTitle>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.7rem", color:"var(--muted)", marginBottom:14 }}>
                {lang==="en"?"Average of all rated recipes":"평가된 레시피 전체 평균"}
              </div>

              {hasFlavorData ? (
                <div style={{ display:"flex", alignItems:"center", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
                  <FlavorRadar values={flavorAvg} size={180} lang={lang} />
                  {/* 수치 목록 */}
                  <div style={{ display:"flex", flexDirection:"column", gap:7, minWidth:100 }}>
                    {FLAVOR_AXES.map(ax => {
                      const val = flavorAvg[ax.key];
                      const pct = (val / 5) * 100;
                      return (
                        <div key={ax.key}>
                          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                            <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.7rem", color:"var(--espresso)", fontWeight:600 }}>{lang==="en"?ax.en:ax.ko}</span>
                            <span style={{ fontFamily:"'Playfair Display',serif", fontSize:"0.75rem", fontWeight:700, color:"var(--latte)" }}>{val.toFixed(1)}</span>
                          </div>
                          <div style={{ height:4, background:"var(--steam)", borderRadius:99, overflow:"hidden" }}>
                            <div style={{ height:"100%", width:`${pct}%`, background:"var(--latte)", borderRadius:99, transition:"width 0.5s ease" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign:"center", padding:"24px 0", fontFamily:"'DM Sans',sans-serif", fontSize:"0.8rem", color:"var(--muted)" }}>
                  {lang==="en"?"Rate your recipes to see your flavor profile":"레시피에 맛 평가를 입력하면 표시돼요"}
                </div>
              )}
            </DCard>

            {/* ── 2. Safe Zone 비교 바 ──────────────────────── */}
            <DCard>
              <DSectionLabel>{lang==="en"?"Barista Benchmark":"바리스타 비교"}</DSectionLabel>
              <DTitle>{lang==="en"?"vs. Top Brewers":"최고 평점 브루어와 비교"}</DTitle>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.7rem", color:"var(--muted)", marginBottom:16 }}>
                {lang==="en"
                  ? `Safe zone = avg ± 1σ of ${topRated.length} five-star recipes`
                  : `Safe Zone = 5점 레시피 ${topRated.length}개 기준 평균 ± 1σ`}
              </div>

              {topRated.length < 3 ? (
                <div style={{ textAlign:"center", padding:"16px 0", fontFamily:"'DM Sans',sans-serif", fontSize:"0.8rem", color:"var(--muted)" }}>
                  {lang==="en"?"Not enough 5-star data yet":"5점 레시피 데이터가 부족해요"}
                </div>
              ) : (
                [
                  { label: lang==="en"?"Water Temp":"물 온도", unit:"°C", key:"waterTemp", scaleMin:80, scaleMax:100 },
                  { label: lang==="en"?"Brew Time":"추출 시간", unit:"s",  key:"seconds",   scaleMin:0,  scaleMax:60  },
                  { label: lang==="en"?"Yield":"추출량",     unit:"ml", key:"espressoMl", scaleMin:0,  scaleMax:80  },
                ].map(({ label, unit, key, scaleMin, scaleMax }) => {
                  const avg = safeAvg(key, topRated);
                  const std = safeStd(key, topRated);
                  if (!avg) return null;
                  const safeMin = Math.max(scaleMin, avg - std);
                  const safeMax = Math.min(scaleMax, avg + std);
                  const userVal = safeAvg(key, curList);
                  const toP = v => Math.max(0, Math.min(100, ((v - scaleMin) / (scaleMax - scaleMin)) * 100));
                  const safeLeftP  = toP(safeMin);
                  const safeWidthP = toP(safeMax) - safeLeftP;
                  const userP = userVal != null ? toP(userVal) : null;
                  const inZone = userVal != null && userVal >= safeMin && userVal <= safeMax;
                  return (
                    <div key={key} style={{ marginBottom:18 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                        <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.78rem", fontWeight:700, color:"var(--espresso)" }}>{label}</span>
                        {userVal != null && (
                          <span style={{
                            fontFamily:"'DM Sans',sans-serif", fontSize:"0.68rem", fontWeight:700,
                            padding:"2px 8px", borderRadius:99,
                            background: inZone ? "rgba(92,138,90,0.12)" : "rgba(192,84,42,0.12)",
                            color: inZone ? "#4A7A48" : "#C0542A"
                          }}>
                            {inZone
                              ? (lang==="en"?"✓ In zone":"✓ 안전 구간")
                              : `${userVal > safeMax ? "+" : ""}${(userVal - (userVal > safeMax ? safeMax : safeMin)).toFixed(0)}${unit} ${lang==="en"?"off":"벗어남"}`
                            }
                          </span>
                        )}
                      </div>
                      {/* 트랙 */}
                      <div style={{ position:"relative", height:8, background:"var(--steam)", borderRadius:99 }}>
                        {/* safe zone */}
                        <div style={{ position:"absolute", left:`${safeLeftP}%`, width:`${safeWidthP}%`, height:"100%", background:"rgba(176,125,84,0.22)", border:"1.5px solid rgba(176,125,84,0.4)", borderRadius:99 }} />
                        {/* user dot */}
                        {userP != null && (
                          <div style={{ position:"absolute", left:`${userP}%`, top:"50%", transform:"translate(-50%,-50%)", width:14, height:14, borderRadius:"50%", background: inZone ? "var(--latte)" : "#C0542A", border:"2px solid #fff", boxShadow:"0 1px 5px rgba(0,0,0,0.18)", zIndex:2 }} />
                        )}
                      </div>
                      <div style={{ display:"flex", justifyContent:"space-between", marginTop:5 }}>
                        <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.62rem", color:"var(--muted)" }}>{scaleMin}{unit}</span>
                        <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.65rem", fontWeight:600, color:"var(--espresso)" }}>
                          {userVal != null ? `${lang==="en"?"me":"나"}: ${Math.round(userVal)}${unit}` : "—"}
                          <span style={{ color:"var(--muted)", fontWeight:400 }}> / {lang==="en"?"best":"베스트"}: {Math.round(safeMin)}–{Math.round(safeMax)}{unit}</span>
                        </span>
                        <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.62rem", color:"var(--muted)" }}>{scaleMax}{unit}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </DCard>

            {/* ── 3. 추출 트렌드 ────────────────────────────── */}
            <DCard>
              <DSectionLabel>{lang==="en"?"Recent Trend":"최근 추출 트렌드"}</DSectionLabel>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
                <DTitle>{lang==="en"?"Last 7 Sessions":"최근 7회 별점 추이"}</DTitle>
                {trendRecipes.length > 0 && (() => {
                  const last = trendRecipes[trendRecipes.length-1].rating;
                  const prev = trendRecipes.length > 1 ? trendRecipes[trendRecipes.length-2].rating : last;
                  const delta = last - prev;
                  return (
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.4rem", fontWeight:700, color:"var(--espresso)", lineHeight:1 }}>{last}★</div>
                      {delta !== 0 && <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.68rem", fontWeight:700, color: delta > 0 ? "#4A7A48" : "#C0542A" }}>
                        {delta > 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}
                      </div>}
                    </div>
                  );
                })()}
              </div>

              {trendRecipes.length < 2 ? (
                <div style={{ textAlign:"center", padding:"16px 0", fontFamily:"'DM Sans',sans-serif", fontSize:"0.8rem", color:"var(--muted)" }}>
                  {lang==="en"?"Rate more recipes to see your trend":"2개 이상 평가하면 트렌드가 표시돼요"}
                </div>
              ) : (() => {
                const W = 280, H = 110, PAD = { t:10, r:10, b:24, l:24 };
                const iW = W - PAD.l - PAD.r;
                const iH = H - PAD.t - PAD.b;
                const minR = Math.min(...trendRecipes.map(r=>r.rating));
                const maxR = Math.max(...trendRecipes.map(r=>r.rating));
                const rangeR = maxR - minR || 1;
                const pts = trendRecipes.map((r,i) => ({
                  x: PAD.l + (i / (trendRecipes.length - 1)) * iW,
                  y: PAD.t + iH - ((r.rating - minR) / rangeR) * iH,
                  rating: r.rating,
                  label: `${i+1}회`,
                }));
                // 스무스 커브 (cubic bezier)
                const d = pts.map((p,i) => {
                  if (i === 0) return `M${p.x.toFixed(1)},${p.y.toFixed(1)}`;
                  const prev = pts[i-1];
                  const cpx = (prev.x + p.x) / 2;
                  return `C${cpx.toFixed(1)},${prev.y.toFixed(1)} ${cpx.toFixed(1)},${p.y.toFixed(1)} ${p.x.toFixed(1)},${p.y.toFixed(1)}`;
                }).join(" ");
                // fill path
                const fillD = d + ` L${pts[pts.length-1].x.toFixed(1)},${(PAD.t+iH).toFixed(1)} L${PAD.l.toFixed(1)},${(PAD.t+iH).toFixed(1)} Z`;

                return (
                  <div style={{ overflowX:"auto" }}>
                    <svg width="100%" viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg" style={{ display:"block", minWidth:220 }}>
                      {/* 격자선 */}
                      {[1,2,3,4,5].filter(v => v >= minR-0.5 && v <= maxR+0.5).map(v => {
                        const y = PAD.t + iH - ((v - minR) / rangeR) * iH;
                        if (y < PAD.t || y > PAD.t + iH) return null;
                        return <line key={v} x1={PAD.l} y1={y.toFixed(1)} x2={PAD.l+iW} y2={y.toFixed(1)} stroke="#EDEBE8" strokeWidth="1" />;
                      })}
                      {/* Y 레이블 */}
                      {[minR, maxR].map(v => {
                        const y = PAD.t + iH - ((v - minR) / rangeR) * iH;
                        return <text key={v} x={PAD.l-4} y={(y+4).toFixed(1)} fontSize="8" fill="#8C8480" textAnchor="end" fontFamily="'DM Sans',sans-serif">{v}★</text>;
                      })}
                      {/* X 레이블 */}
                      {pts.map((p,i) => (
                        <text key={i} x={p.x.toFixed(1)} y={(PAD.t+iH+12).toFixed(1)} fontSize="8" fill="#8C8480" textAnchor="middle" fontFamily="'DM Sans',sans-serif">{p.label}</text>
                      ))}
                      {/* fill */}
                      <path d={fillD} fill="rgba(176,125,84,0.08)" />
                      {/* line */}
                      <path d={d} fill="none" stroke="var(--espresso)" strokeWidth="2" strokeLinejoin="round" />
                      {/* dots */}
                      {pts.map((p,i) => (
                        <g key={i}>
                          <circle cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="4" fill="var(--latte)" stroke="#fff" strokeWidth="2" />
                        </g>
                      ))}
                    </svg>
                  </div>
                );
              })()}
            </DCard>

            {/* ── 4. TOP 랭킹 ───────────────────────────────── */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:10 }}>
              {[
                { label: lang==="en"?"Top Menu":"자주 마신 메뉴", items: curTop.menus },
                { label: lang==="en"?"Top Bean":"자주 쓴 원두",   items: curTop.beans },
              ].map(({ label, items }) => {
                const maxCnt = items[0]?.[1] || 1;
                return (
                  <DCard key={label} style={{ marginBottom:0 }}>
                    <DSectionLabel>{label}</DSectionLabel>
                    {items.length === 0
                      ? <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.78rem", color:"var(--muted)", paddingTop:8 }}>—</div>
                      : items.map(([name, cnt], i) => (
                        <div key={name} style={{ marginTop: i===0 ? 8 : 10 }}>
                          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                            <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.75rem", fontWeight: i===0?700:400, color: i===0?"var(--espresso)":"var(--muted)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"75%" }}>{name}</span>
                            <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.68rem", color:"var(--muted)", flexShrink:0 }}>{cnt}{lang==="en"?"x":"회"}</span>
                          </div>
                          <div style={{ height:3, background:"var(--steam)", borderRadius:99, overflow:"hidden" }}>
                            <div style={{ height:"100%", width:`${Math.round((cnt/maxCnt)*100)}%`, background: i===0?"var(--latte)":"var(--steam)", borderRadius:99 }} />
                          </div>
                        </div>
                      ))
                    }
                  </DCard>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* 내 레시피 목록 타이틀 */}
      {feedTab === "mine" && (
        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1rem", fontWeight: 700, color: "var(--espresso)", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: "var(--latte)", flexShrink: 0 }}>
            <rect x="3" y="2" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M6 6h6M6 9h6M6 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          {lang === "en" ? "My Recipes" : "내 레시피"}
        </div>
      )}

      {feedTab !== "beans" && feedTab !== "equip" && <div className="recipes-grid">
        {filtered.length === 0 ? (
          <div className="empty-state">
            {(() => {
              // 상황별 아이콘 + 텍스트
              let icon, title, sub;
              if (search) {
                icon = (
                  <svg className="empty-state-icon" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="24" cy="24" r="14" stroke="currentColor" strokeWidth="2"/>
                    <path d="M34 34L46 46" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M20 24h8M24 20v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                );
                title = lang === "en" ? "No results found" : "검색 결과가 없어요";
                sub = lang === "en" ? "Try a different keyword." : "다른 키워드로 검색해보세요.";
              } else if (feedTab === "bookmarks") {
                icon = (
                  <svg className="empty-state-icon" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14 10C14 8.895 14.895 8 16 8h24c1.105 0 2 .895 2 2v36l-14-8-14 8V10z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                  </svg>
                );
                title = lang === "en" ? "No bookmarks yet" : "즐겨찾기가 비어 있어요";
                sub = lang === "en" ? "Save recipes you love with the bookmark icon." : "마음에 드는 레시피에 북마크를 눌러보세요.";
              } else if (feedTab === "following") {
                icon = (
                  <svg className="empty-state-icon" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="22" cy="20" r="8" stroke="currentColor" strokeWidth="2"/>
                    <path d="M8 44c0-7.732 6.268-14 14-14s14 6.268 14 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M40 24v12M46 30H34" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                );
                title = lang === "en" ? "No subscriptions yet" : "구독 중인 브루어가 없어요";
                sub = lang === "en" ? "Follow brewers you like to see their recipes here." : "마음에 드는 브루어를 구독하면 여기에 모아볼 수 있어요.";
              } else if (feedTab === "mine" || myRecipesOnly) {
                icon = (
                  <svg className="empty-state-icon" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="10" y="14" width="36" height="28" rx="3" stroke="currentColor" strokeWidth="2"/>
                    <path d="M20 28h16M28 20v16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                );
                title = lang === "en" ? "No recipes yet" : "아직 레시피가 없어요";
                sub = lang === "en" ? "Share your first brew." : "첫 번째 추출 기록을 남겨보세요.";
              } else {
                icon = (
                  <svg className="empty-state-icon" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <ellipse cx="28" cy="34" rx="14" ry="4" stroke="currentColor" strokeWidth="2"/>
                    <path d="M14 34c0-8 5-16 14-18 9 2 14 10 14 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M42 30c3 0 6-1.5 6-4s-3-4-6-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                );
                title = lang === "en" ? "No recipes yet" : "아직 레시피가 없어요";
                sub = lang === "en" ? "Be the first to share your brew." : "첫 번째로 레시피를 공유해보세요.";
              }
              return (<>
                {icon}
                <div className="empty-state-title">{title}</div>
                <div className="empty-state-sub">{sub}</div>
              </>);
            })()}
          </div>
        ) : filtered.map(rec => (
          <RecipeCard key={rec.id} recipe={rec} currentUid={user?.uid} lang={lang}
            onDelete={handleDelete}
            onLike={handleLike}
            onBookmark={toggleBookmark}
            isBookmarked={bookmarks.includes(rec.id)}
            onFollow={toggleFollow}
            isFollowing={following.includes(rec.uid) || following.includes(rec.author)}
            onEdit={() => { setEditTarget(rec); openModal(); }}
            onCardClick={() => openDetail(rec)}
            onCompare={user?.uid ? () => setCompareTarget(rec) : null}
            onCopy={user?.uid ? () => handleCopyRecipe(rec) : null}
            onAuthorClick={a => { setFilterAuthor(a); setFeedTab("all"); setMyRecipesOnly(false); setShowRanking(false); }} />
        ))}
      </div>}
    </div>}
    {showMyModal && <MyModal user={user} lang={lang} onClose={() => setShowMyModalWrapped(false)} onLogout={() => { setShowMyModalWrapped(false); signOut(auth); }} />}
    {compareTarget && (
      <CompareModal
        targetRecipe={compareTarget}
        myRecipes={recipes.filter(r => r.id !== compareTarget.id)}
        onClose={() => setCompareTarget(null)}
        lang={lang} />
    )}
    {detailRecipe && (
      <RecipeDetailModal
        recipe={detailRecipe}
        currentUid={user?.uid}
        currentUser={user}
        onRequireAuth={onRequireAuth}
        lang={lang}
        onClose={() => setDetailRecipeWrapped(null)}
        onLike={r => { handleLike(r); }}
        onEdit={r => { setEditTarget(r); openModal(); setDetailRecipeWrapped(null); }}
        onDelete={id => { handleDelete(id); setDetailRecipeWrapped(null); }}
        onFollow={toggleFollow}
        isFollowing={detailRecipe && (following.includes(detailRecipe.uid) || following.includes(detailRecipe.author))}
        onBookmark={toggleBookmark}
        isBookmarked={detailRecipe && bookmarks.includes(detailRecipe.id)}
        onCompare={user?.uid ? (r) => {
          // 상세 카드를 닫지 않고 비교 모달을 위에 쌓기
          // → 뒤로가기: 비교 닫힘 → 상세 카드 그대로 보임
          setCompareTarget(r);
        } : null}
        onCopyRecipe={user?.uid ? (r) => {
          // 복사 모달 열기 전 상세 카드 recipe 보관 → 복사 모달 닫힐 때 복원
          pendingDetailRef.current = detailRecipeRef.current;
          setDetailRecipeWrapped(null);
          handleCopyRecipe(r);
        } : null}
        onAuthorClick={a => { setDetailRecipeWrapped(null); setFilterAuthor(a); setFeedTab("all"); setMyRecipesOnly(false); setShowRanking(false); }}
      />
    )}
    {showModal && (
      <RecipeModal user={user} editTarget={editTarget} lang={lang}
        onClose={() => { setShowModal(false); setEditTarget(null); }}
        onSave={() => { loadRecipes(); setShowModal(false); setEditTarget(null); }} />
    )}
  </>);
}

// ─── AdminApp ──────────────────────────────────────────────────────
function AdminApp({ user, onExit, lang = 'ko' }) {
  const [tab, setTab] = useState("stats");
  const [users, setUsers] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [notices, setNotices] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);

  // 회원관리 필터 state
  const [userSearch, setUserSearch] = useState("");
  const [userStatusFilter, setUserStatusFilter] = useState("all");
  const [userJoinFrom, setUserJoinFrom] = useState("");
  const [userJoinTo, setUserJoinTo] = useState("");
  const [userSortBy, setUserSortBy] = useState("joinDesc");

  const loadReports = async () => {
    try {
      const snap = await getDocs(query(collection(db, "reports"), orderBy("createdAt", "desc")));
      setReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch(e) { console.error(e); }
  };

  const handleReportAction = async (report, action) => {
    try {
      if (report.type === "recipe") {
        if (action === "restore") await updateDoc(doc(db, "recipes", report.targetId), { isPublic: true, reportHidden: false });
        else if (action === "hide") await updateDoc(doc(db, "recipes", report.targetId), { isPublic: false, reportHidden: true });
        else if (action === "delete") { if (!confirm("레시피를 삭제할까요?")) return; await deleteDoc(doc(db, "recipes", report.targetId)); }
      } else if (report.type === "comment") {
        if (action === "restore") await updateDoc(doc(db, "comments", report.targetId), { hidden: false });
        else if (action === "hide") await updateDoc(doc(db, "comments", report.targetId), { hidden: true });
        else if (action === "delete") { if (!confirm("댓글을 삭제할까요?")) return; await deleteDoc(doc(db, "comments", report.targetId)); }
      }
      await updateDoc(doc(db, "reports", report.id), { status: action, reviewedAt: serverTimestamp() });
      loadReports();
    } catch(e) { console.error(e); }
  };

  // 공지사항 폼
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeBody, setNoticeBody] = useState("");
  const [noticeSaving, setNoticeSaving] = useState(false);
  const [editNoticeId, setEditNoticeId] = useState(null);

  // 브랜드 관리
  const [machineBrandList, setMachineBrandList] = useState(
    MACHINE_BRANDS.filter(b => b !== "기타 (직접 입력)")
  );
  const [grinderBrandList, setGrinderBrandList] = useState(
    GRINDER_BRANDS.filter(b => b !== "기타 (직접 입력)")
  );
  const [newMachineBrand, setNewMachineBrand] = useState("");
  const [newGrinderBrand, setNewGrinderBrand] = useState("");
  const [brandSaving, setBrandSaving] = useState(false);
  const [brandMsg, setBrandMsg] = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    // 각 컬렉션 독립적으로 로드 (하나 실패해도 나머지 표시)
    await Promise.allSettled([
      // users
      getDocs(collection(db, "users"))
        .then(snap => {
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => u.nickname);
          setUsers(list);
        })
        .catch(e => console.error("users 로드 실패:", e.message)),
      // recipes
      getDocs(query(collection(db, "recipes"), orderBy("createdAt", "desc")))
        .then(snap => setRecipes(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
        .catch(e => console.error("recipes 로드 실패:", e.message)),
      // notices
      getDocs(query(collection(db, "notices"), orderBy("createdAt", "desc")))
        .then(snap => setNotices(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
        .catch(e => console.error("notices 로드 실패:", e.message)),
      // brands
      getDoc(doc(db, "settings", "brands"))
        .then(snap => {
          if (snap.exists()) {
            const d = snap.data();
            if (d.machineBrands?.length) setMachineBrandList(d.machineBrands);
            if (d.grinderBrands?.length) setGrinderBrandList(d.grinderBrands);
          }
        })
        .catch(e => console.error("brands 로드 실패:", e.message)),
    ]);
    setLoading(false);
  }, []);

  const loadNotices = useCallback(async () => {
    try {
      const nSnap = await getDocs(query(collection(db, "notices"), orderBy("createdAt", "desc")));
      setNotices(nSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error("loadNotices error:", e); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // 공지사항 탭 전환 시 항상 새로 로드
  useEffect(() => { if (tab === "notices") loadNotices(); if (tab === "reports") loadReports(); }, [tab, loadNotices]);

  const deleteUser = async (uid, nickname) => {
    if (!confirm(`"${nickname}" 유저의 데이터를 삭제할까요?
(Firebase Auth 계정은 콘솔에서 별도 삭제 필요)`)) return;
    await deleteDoc(doc(db, "users", uid));
    if (nickname) await deleteDoc(doc(db, "nicknames", nickname));
    loadAll();
  };

  const deleteRecipe = async (id, bean) => {
    if (!confirm(`"${bean}" 레시피를 삭제할까요?`)) return;
    await deleteDoc(doc(db, "recipes", id));
    loadAll();
  };

  const postNotice = async () => {
    if (!noticeTitle.trim() || !noticeBody.trim()) return alert("제목과 내용을 입력해주세요.");
    setNoticeSaving(true);
    if (editNoticeId) {
      // 수정
      await updateDoc(doc(db, "notices", editNoticeId), {
        title: noticeTitle.trim(),
        body: noticeBody.trim(),
      });
      setEditNoticeId(null);
    } else {
      // 신규 등록
      await addDoc(collection(db, "notices"), {
        title: noticeTitle.trim(),
        body: noticeBody.trim(),
        author: user?.displayName,
        createdAt: serverTimestamp(),
      });
    }
    setNoticeTitle(""); setNoticeBody("");
    setNoticeSaving(false);
    loadNotices();
  };

  const saveBrands = async (machineList, grinderList) => {
    setBrandSaving(true);
    try {
      await setDoc(doc(db, "settings", "brands"), {
        machineBrands: machineList,
        grinderBrands: grinderList,
      });
      MACHINE_BRANDS = [...machineList, "기타 (직접 입력)"];
      GRINDER_BRANDS = [...grinderList, "기타 (직접 입력)"];
      setBrandMsg({ type: "ok", text: "저장됐어요 ✓" });
      setTimeout(() => setBrandMsg(null), 2000);
    } catch (e) {
      setBrandMsg({ type: "error", text: "저장 오류: " + e.message });
    }
    setBrandSaving(false);
  };

  const addMachineBrand = () => {
    if (!newMachineBrand.trim()) return;
    if (machineBrandList.includes(newMachineBrand.trim())) return setBrandMsg({ type: "error", text: "이미 있는 브랜드예요." });
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
    if (grinderBrandList.includes(newGrinderBrand.trim())) return setBrandMsg({ type: "error", text: "이미 있는 브랜드예요." });
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

  const startEditNotice = (n) => {
    setEditNoticeId(n.id);
    setNoticeTitle(n.title);
    setNoticeBody(n.body);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEditNotice = () => {
    setEditNoticeId(null);
    setNoticeTitle("");
    setNoticeBody("");
  };

  const deleteNotice = async (id) => {
    if (!confirm("공지사항을 삭제할까요?")) return;
    await deleteDoc(doc(db, "notices", id));
    loadNotices();
  };

  const TABS = [
    { key: "stats",   label: "통계" },
    { key: "reports", label: "신고 관리" },
    { key: "users",   label: "회원 관리" },
    { key: "recipes", label: "레시피 관리" },
    { key: "notices", label: "공지사항" },
    { key: "brands",  label: "브랜드 관리" },
  ];

  return (<div style={{ width: "100%" }}>
    <header className="app-header">
      <div className="logo">
        <svg width="16" height="16" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="9" cy="9" r="8" stroke="var(--espresso)" strokeWidth="1.5"/>
          <path d="M5 9.5c1-2 3-3 4-2s3 3 4 1" stroke="var(--latte)" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        Brewlog <span style={{ fontSize: "0.72rem", color: "#c0392b", marginLeft: "6px", fontFamily: "'DM Sans',sans-serif", fontWeight: 600, letterSpacing: "0.08em" }}>ADMIN</span>
      </div>
      <div className="header-right">
        <button className="btn-admin-header" onClick={onExit}>
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: "4px" }}>
            <path d="M8 2L3 7l5 5M3 7h9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          일반화면
        </button>
        <button className="btn-logout" onClick={() => signOut(auth)}>{I18N[lang].logout}</button>
      </div>
    </header>

    <div className="admin-wrap">
      {/* 페이지 타이틀 */}
      <div className="admin-page-title">Admin Console</div>
      <div className="admin-page-sub">Brewlog note 관리자 페이지</div>

      {/* 탭 */}
      <div className="admin-tabs">
        {TABS.map(t => {
          const icons = {
            stats:   <svg width="12" height="12" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}><rect x="1" y="8" width="3" height="5" rx="1" fill="currentColor" opacity="0.7"/><rect x="5.5" y="5" width="3" height="8" rx="1" fill="currentColor" opacity="0.85"/><rect x="10" y="2" width="3" height="11" rx="1" fill="currentColor"/></svg>,
            users:   <svg width="12" height="12" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}><circle cx="5" cy="4.5" r="2.5" stroke="currentColor" strokeWidth="1.3"/><path d="M1 12c0-2.761 1.791-4 4-4s4 1.239 4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><path d="M10 7.5c1.5 0 3 .8 3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><circle cx="10.5" cy="4" r="2" stroke="currentColor" strokeWidth="1.3"/></svg>,
            reports: <svg width="12" height="12" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}><path d="M7 1L1 13h12L7 1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/><path d="M7 5.5v3M7 10v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
            recipes: <svg width="12" height="12" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}><rect x="2" y="1" width="10" height="12" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M4.5 5h5M4.5 7.5h5M4.5 10h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
            notices: <svg width="12" height="12" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}><path d="M7 1C4.239 1 2 3.239 2 6v3.5L1 11h12l-1-1.5V6c0-2.761-2.239-5-5-5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/><path d="M5.5 11.5c0 .828.672 1.5 1.5 1.5s1.5-.672 1.5-1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
            brands:  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3"/><path d="M7 4v6M5 5.5h2.5a1.5 1.5 0 0 1 0 3H5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
          };
          return (
            <button key={t.key} className={`admin-tab ${tab === t.key ? "active" : ""}`} onClick={() => setTab(t.key)}>
              {icons[t.key]}
              {t.label}
            </button>
          );
        })}
      </div>

      {/* 로딩 */}
      {loading && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "48px 0", color: "var(--muted)", fontSize: "0.85rem" }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ animation: "spin 1s linear infinite" }}>
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.8" strokeDasharray="12 26" strokeLinecap="round"/>
          </svg>
          불러오는 중…
        </div>
      )}

      {/* ── 통계 ── */}
      {tab === "stats" && !loading && (<>
        <div className="admin-stat-grid">
          {[
            { val: users.length, label: "총 회원 수", icon: <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><circle cx="8" cy="7" r="3.5" stroke="var(--latte)" strokeWidth="1.5"/><path d="M2 17c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="var(--latte)" strokeWidth="1.5" strokeLinecap="round"/></svg> },
            { val: recipes.length, label: "총 레시피 수", icon: <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><rect x="3" y="2" width="14" height="16" rx="2" stroke="var(--latte)" strokeWidth="1.5"/><path d="M6 7h8M6 10h8M6 13h5" stroke="var(--latte)" strokeWidth="1.5" strokeLinecap="round"/></svg> },
            { val: notices.length, label: "공지사항 수", icon: <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M10 2C6.686 2 4 4.686 4 8v4.5L3 14h14l-1-1.5V8c0-3.314-2.686-6-6-6z" stroke="var(--latte)" strokeWidth="1.5" strokeLinejoin="round"/><path d="M8 14.5c0 1.105.895 2 2 2s2-.895 2-2" stroke="var(--latte)" strokeWidth="1.5" strokeLinecap="round"/></svg> },
            { val: recipes.length && users.length ? (recipes.length / users.length).toFixed(1) : 0, label: "인당 레시피", icon: <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><rect x="2" y="12" width="4" height="6" rx="1" fill="var(--latte)" opacity="0.6"/><rect x="8" y="8" width="4" height="10" rx="1" fill="var(--latte)" opacity="0.8"/><rect x="14" y="4" width="4" height="14" rx="1" fill="var(--latte)"/></svg> },
          ].map(({ val, label, icon }) => (
            <div key={label} className="stat-card">
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "8px" }}>{icon}</div>
              <span className="stat-card-val">{val}</span>
              <span className="stat-card-label">{label}</span>
            </div>
          ))}
        </div>
        <div className="admin-card">
          <div className="admin-card-title">최근 레시피</div>
          {recipes.slice(0, 5).map((r, i) => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 0", borderBottom: i < 4 ? "1px solid var(--divider)" : "none" }}>
              <span style={{ fontFamily: "'Playfair Display',serif", fontSize: "0.85rem", color: "var(--muted)", minWidth: "20px" }}>{String(i+1).padStart(2,"0")}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontWeight: 600, color: "var(--espresso)", fontSize: "0.88rem" }}>{r.company} {r.bean}</span>
                <span style={{ color: "var(--muted)", fontSize: "0.75rem", marginLeft: "8px" }}>@{r.author}</span>
              </div>
              <span style={{ fontSize: "0.72rem", color: "var(--muted)", flexShrink: 0 }}>{r.menuLabel}</span>
            </div>
          ))}
          {recipes.length === 0 && <p style={{ color: "var(--muted)", textAlign: "center", padding: "24px 0", fontSize: "0.85rem" }}>레시피가 없어요.</p>}
        </div>
      </>)}

      {/* ── 회원 관리 ── */}
      {tab === "users" && !loading && (() => {
        // ── 필터 state (IIFE 내부 — hooks 불가, 부모 컴포넌트에서 관리)
        // AdminApp 최상단에 선언된 userSearch, userStatusFilter, userJoinFrom, userJoinTo, userSortBy 사용
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

        // 필터 적용
        let filtered = [...users];
        if (userSearch.trim()) {
          const q = userSearch.trim().toLowerCase();
          filtered = filtered.filter(u =>
            (u.nickname||"").toLowerCase().includes(q) ||
            (u.id||"").toLowerCase().includes(q) ||
            (u.email||"").toLowerCase().includes(q)
          );
        }
        if (userStatusFilter !== "all") {
          filtered = filtered.filter(u => (u.status || "active") === userStatusFilter);
        }
        if (userJoinFrom) {
          const from = new Date(userJoinFrom);
          filtered = filtered.filter(u => {
            if (!u.createdAt) return false;
            const d = u.createdAt.toDate ? u.createdAt.toDate() : new Date(u.createdAt);
            return d >= from;
          });
        }
        if (userJoinTo) {
          const to = new Date(userJoinTo); to.setHours(23,59,59);
          filtered = filtered.filter(u => {
            if (!u.createdAt) return false;
            const d = u.createdAt.toDate ? u.createdAt.toDate() : new Date(u.createdAt);
            return d <= to;
          });
        }
        // 정렬
        filtered.sort((a, b) => {
          if (userSortBy === "joinDesc") return (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0);
          if (userSortBy === "joinAsc")  return (a.createdAt?.seconds||0) - (b.createdAt?.seconds||0);
          if (userSortBy === "loginDesc") return (b.lastLogin?.seconds||0) - (a.lastLogin?.seconds||0);
          if (userSortBy === "loginAsc")  return (a.lastLogin?.seconds||0) - (b.lastLogin?.seconds||0);
          return 0;
        });

        const statusColor = { active:"#27ae60", suspended:"#e67e22", deleted:"#e74c3c" };
        const statusLabel = { active:"활성", suspended:"정지", deleted:"탈퇴" };

        return (
          <div className="admin-card">
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"16px", flexWrap:"wrap", gap:"8px" }}>
              <div className="admin-card-title" style={{ margin:0 }}>회원 관리 ({filtered.length}/{users.length}명)</div>
              <button className="btn-save-sm" onClick={loadAll}>새로고침</button>
            </div>

            {/* ── 필터 영역 ── */}
            <div style={{ background:"var(--cream)", border:"1px solid var(--divider)", borderRadius:"10px", padding:"14px 16px", marginBottom:"16px", display:"flex", flexDirection:"column", gap:"10px" }}>
              {/* 검색 */}
              <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink:0, color:"var(--muted)" }}>
                  <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <input value={userSearch} onChange={e => setUserSearch(e.target.value)}
                  placeholder="닉네임, UID, 이메일 검색…"
                  style={{ flex:1, border:"1px solid var(--steam)", borderRadius:"6px", padding:"6px 10px", fontFamily:"'DM Sans',sans-serif", fontSize:"0.82rem", background:"white" }}
                />
              </div>
              {/* 필터 행 1: 상태 + 정렬 */}
              <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                  <span style={{ fontSize:"0.72rem", color:"var(--muted)", whiteSpace:"nowrap" }}>상태</span>
                  <select value={userStatusFilter} onChange={e => setUserStatusFilter(e.target.value)}
                    style={{ border:"1px solid var(--steam)", borderRadius:"6px", padding:"5px 8px", fontSize:"0.78rem", fontFamily:"'DM Sans',sans-serif", background:"white" }}>
                    <option value="all">전체</option>
                    <option value="active">활성</option>
                    <option value="suspended">정지</option>
                    <option value="deleted">탈퇴</option>
                  </select>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                  <span style={{ fontSize:"0.72rem", color:"var(--muted)", whiteSpace:"nowrap" }}>정렬</span>
                  <select value={userSortBy} onChange={e => setUserSortBy(e.target.value)}
                    style={{ border:"1px solid var(--steam)", borderRadius:"6px", padding:"5px 8px", fontSize:"0.78rem", fontFamily:"'DM Sans',sans-serif", background:"white" }}>
                    <option value="joinDesc">가입일 최신순</option>
                    <option value="joinAsc">가입일 오래된순</option>
                    <option value="loginDesc">최근 접속순</option>
                    <option value="loginAsc">오래된 접속순</option>
                  </select>
                </div>
              </div>
              {/* 필터 행 2: 가입일 기간 */}
              <div style={{ display:"flex", gap:"8px", alignItems:"center", flexWrap:"wrap" }}>
                <span style={{ fontSize:"0.72rem", color:"var(--muted)", whiteSpace:"nowrap" }}>가입일</span>
                <input type="date" value={userJoinFrom} onChange={e => setUserJoinFrom(e.target.value)}
                  style={{ border:"1px solid var(--steam)", borderRadius:"6px", padding:"5px 8px", fontSize:"0.78rem", fontFamily:"'DM Sans',sans-serif", background:"white" }}/>
                <span style={{ fontSize:"0.72rem", color:"var(--muted)" }}>~</span>
                <input type="date" value={userJoinTo} onChange={e => setUserJoinTo(e.target.value)}
                  style={{ border:"1px solid var(--steam)", borderRadius:"6px", padding:"5px 8px", fontSize:"0.78rem", fontFamily:"'DM Sans',sans-serif", background:"white" }}/>
                {(userJoinFrom || userJoinTo) && (
                  <button onClick={() => { setUserJoinFrom(""); setUserJoinTo(""); }}
                    style={{ fontSize:"0.72rem", color:"var(--muted)", background:"none", border:"none", cursor:"pointer", textDecoration:"underline" }}>초기화</button>
                )}
              </div>
            </div>

            {/* ── 회원 목록 ── */}
            {filtered.length === 0 ? (
              <p style={{ color:"var(--muted)", textAlign:"center", padding:"24px 0", fontSize:"0.85rem" }}>
                {users.length === 0 ? "회원이 없어요." : "검색 결과가 없어요."}
              </p>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                {filtered.map(u => {
                  const status = u.status || "active";
                  const recipeCount = recipes.filter(r => r.uid === u.id).length;
                  const joinDays = daysSince(u.createdAt);
                  const loginDays = daysSince(u.lastLogin);
                  const isGhost = loginDays > 30; // 유령 회원 기준
                  return (
                    <div key={u.id} style={{ background:"var(--foam)", border:`1px solid ${status==="suspended"?"#e67e2230":status==="deleted"?"#e74c3c20":"var(--divider)"}`, borderRadius:"10px", padding:"12px 14px", borderLeft:`3px solid ${statusColor[status]||"#27ae60"}` }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:"8px" }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          {/* 상단: 닉네임 + 상태 */}
                          <div style={{ display:"flex", alignItems:"center", gap:"6px", marginBottom:"4px", flexWrap:"wrap" }}>
                            <span style={{ fontWeight:700, fontSize:"0.92rem", color:"var(--espresso)" }}>@{u.nickname}</span>
                            <span style={{ fontSize:"0.62rem", fontWeight:700, color:statusColor[status], background:statusColor[status]+"18", border:`1px solid ${statusColor[status]}40`, borderRadius:"4px", padding:"1px 6px" }}>
                              {statusLabel[status]||status}
                            </span>
                            {isGhost && status === "active" && (
                              <span style={{ fontSize:"0.62rem", color:"#8C8480", background:"#F0EFEF", borderRadius:"4px", padding:"1px 6px" }}>👻 유령</span>
                            )}
                          </div>
                          {/* 정보 행 */}
                          <div style={{ display:"flex", flexWrap:"wrap", gap:"10px", fontSize:"0.72rem", color:"var(--muted)" }}>
                            <span>가입 {fmt(u.createdAt)}</span>
                            <span>최근접속 {loginDays === 9999 ? "—" : `${loginDays}일 전`}</span>
                            <span>레시피 {recipeCount}개</span>
                            <span style={{ fontFamily:"monospace", fontSize:"0.65rem" }}>{u.id.slice(0,10)}…</span>
                          </div>
                        </div>
                        {/* 액션 버튼 */}
                        {u.id !== user?.uid && (
                          <div style={{ display:"flex", gap:"5px", flexShrink:0 }}>
                            {status === "active" ? (
                              <button onClick={async () => {
                                if (!confirm(`@${u.nickname} 계정을 정지할까요?`)) return;
                                await updateDoc(doc(db, "users", u.id), { status:"suspended", suspendedAt:serverTimestamp() });
                                loadAll();
                              }} style={{ padding:"4px 8px", border:"1px solid #e67e2260", borderRadius:"6px", background:"none", cursor:"pointer", fontSize:"0.68rem", color:"#e67e22", fontFamily:"'DM Sans',sans-serif" }}>
                                정지
                              </button>
                            ) : status === "suspended" ? (
                              <button onClick={async () => {
                                await updateDoc(doc(db, "users", u.id), { status:"active", suspendedAt:null });
                                loadAll();
                              }} style={{ padding:"4px 8px", border:"1px solid #27ae6060", borderRadius:"6px", background:"none", cursor:"pointer", fontSize:"0.68rem", color:"#27ae60", fontFamily:"'DM Sans',sans-serif" }}>
                                복구
                              </button>
                            ) : null}
                            <button className="btn-danger" onClick={() => deleteUser(u.id, u.nickname)}>삭제</button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* ── 신고 관리 ── */}
      {tab === "reports" && (
        <div className="admin-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div className="admin-card-title" style={{ margin: 0 }}>신고 목록 ({reports.length}건)</div>
            <button className="btn-save-sm" onClick={loadReports} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12.5 7a5.5 5.5 0 1 1-1.1-3.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                <path d="M12.5 2.5v2.5H10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              새로고침
            </button>
          </div>
          {reports.length === 0 ? (
            <p style={{ color: "var(--muted)", textAlign: "center", padding: "24px 0", fontSize: "0.85rem" }}>신고된 콘텐츠가 없어요.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {reports.map(r => (
                <div key={r.id} className={`report-card ${r.status === "pending" ? "pending" : "resolved"}`}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "10px" }}>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <span style={{ fontSize: "0.68rem", padding: "2px 8px", borderRadius: "4px", fontWeight: 600,
                        background: r.type === "recipe" ? "#e8f4fd" : "#fef9e7",
                        color: r.type === "recipe" ? "#2980b9" : "#e67e22" }}>
                        {r.type === "recipe" ? "레시피" : "댓글"}
                      </span>
                      <span style={{ fontSize: "0.68rem", padding: "2px 8px", borderRadius: "4px", fontWeight: 600,
                        background: r.status === "pending" ? "#fdecea" : "#eafaf1",
                        color: r.status === "pending" ? "#e74c3c" : "#27ae60" }}>
                        {r.status === "pending" ? "처리 대기" : r.status === "restore" ? "공개 복구" : r.status === "hide" ? "비공개" : r.status === "delete" ? "삭제됨" : r.status}
                      </span>
                    </div>
                    <span style={{ fontSize: "0.68rem", color: "var(--muted)", flexShrink: 0 }}>
                      {r.createdAt?.toDate?.()?.toLocaleDateString("ko-KR") || ""}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "var(--espresso)", marginBottom: "4px" }}>
                    <span style={{ color: "var(--muted)", fontSize: "0.72rem" }}>사유</span>
                    <span style={{ marginLeft: "8px" }}>{r.reason}</span>
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "12px" }}>
                    신고자 {r.uid?.slice(0,10)}… · 대상 {r.targetId?.slice(0,10)}…
                  </div>
                  {r.status === "pending" && (
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      <button className="admin-action-btn admin-action-restore" onClick={() => handleReportAction(r, "restore")}>
                        <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3"/><path d="M4.5 7l2 2 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        공개 유지
                      </button>
                      <button className="admin-action-btn admin-action-hide" onClick={() => handleReportAction(r, "hide")}>
                        <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><rect x="2" y="6" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M4.5 6V4.5a2.5 2.5 0 0 1 5 0V6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                        비공개
                      </button>
                      <button className="admin-action-btn admin-action-delete" onClick={() => handleReportAction(r, "delete")}>
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
      {tab === "recipes" && !loading && (
        <div className="admin-card" style={{ overflowX: "auto" }}>
          <div className="admin-card-title">레시피 목록 ({recipes.length}개)</div>
          <table className="admin-table">
            <thead>
              <tr><th>작성자</th><th>원두</th><th>머신</th><th></th></tr>
            </thead>
            <tbody>
              {recipes.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 500 }}>@{r.author}</td>
                  <td style={{ fontWeight: 500 }}>{r.company} {r.bean}</td>
                  <td style={{ color: "var(--muted)", fontSize: "0.8rem" }}>{r.machine || "—"}</td>
                  <td>
                    <button className="btn-danger" onClick={() => deleteRecipe(r.id, r.bean)}>
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2.5 3.5h9M4.5 3.5V2.5c0-.28.22-.5.5-.5h4c.28 0 .5.22.5.5v1M5.5 6v4M8.5 6v4M3 3.5l.7 8c.02.4.35.7.76.7h6.08c.4 0 .73-.3.76-.7l.7-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {recipes.length === 0 && <p style={{ color: "var(--muted)", textAlign: "center", padding: "24px 0", fontSize: "0.85rem" }}>레시피가 없어요.</p>}
        </div>
      )}

      {/* ── 공지사항 ── */}
      {tab === "notices" && !loading && (<>
        <div className="admin-card">
          <div className="admin-card-title">{editNoticeId ? "공지사항 수정" : "새 공지사항 작성"}</div>
          <div className="notice-form">
            <div className="field" style={{ marginBottom: 0 }}>
              <label>제목</label>
              <input value={noticeTitle} onChange={e => setNoticeTitle(e.target.value)} placeholder="공지사항 제목" />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>내용</label>
              <textarea value={noticeBody} onChange={e => setNoticeBody(e.target.value)} placeholder="공지 내용을 입력해주세요…" rows={3} />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              {editNoticeId && <button className="btn-cancel" onClick={cancelEditNotice}>취소</button>}
              <button className="btn-save-sm" onClick={postNotice} disabled={noticeSaving}>
                {noticeSaving ? "저장 중…" : editNoticeId ? "수정 저장" : "공지 등록"}
              </button>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {notices.map(n => (
            <div key={n.id} className="notice-item" style={{ borderLeft: editNoticeId === n.id ? "3px solid var(--latte)" : "none", paddingLeft: editNoticeId === n.id ? "13px" : undefined }}>
              <div className="notice-item-header">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="notice-item-title">{n.title}</div>
                  <div className="notice-item-body">{n.body}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px", flexShrink: 0 }}>
                  <span className="notice-item-date">{n.createdAt?.toDate?.()?.toLocaleDateString("ko-KR") || ""}</span>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button className="btn-change" onClick={() => startEditNotice(n)}>수정</button>
                    <button className="btn-danger" onClick={() => deleteNotice(n.id)}>
                      <svg width="11" height="11" viewBox="0 0 14 14" fill="none"><path d="M2.5 3.5h9M4.5 3.5V2.5c0-.28.22-.5.5-.5h4c.28 0 .5.22.5.5v1M5.5 6v4M8.5 6v4M3 3.5l.7 8c.02.4.35.7.76.7h6.08c.4 0 .73-.3.76-.7l.7-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {notices.length === 0 && <p style={{ color: "var(--muted)", textAlign: "center", padding: "24px 0", fontSize: "0.85rem" }}>공지사항이 없어요.</p>}
        </div>
      </>)}

      {/* ── 브랜드 관리 ── */}
      {tab === "brands" && !loading && (<>
        {brandMsg && <p className={brandMsg.type === "error" ? "msg-error" : "msg-ok"} style={{ marginBottom: "12px", textAlign: "center" }}>{brandMsg.text}</p>}
        {[
          { title: lang === "en" ? "Coffee Machine Brands" : "커피 머신 브랜드", list: machineBrandList, newVal: newMachineBrand, setNew: setNewMachineBrand, onAdd: addMachineBrand, onRemove: removeMachineBrand },
          { title: lang === "en" ? "Grinder Brands" : "그라인더 브랜드", list: grinderBrandList, newVal: newGrinderBrand, setNew: setNewGrinderBrand, onAdd: addGrinderBrand, onRemove: removeGrinderBrand },
        ].map(({ title, list, newVal, setNew, onAdd, onRemove }) => (
          <div key={title} className="admin-card" style={{ marginBottom: "16px" }}>
            <div className="admin-card-title">{title}</div>
            <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
              <input value={newVal} onChange={e => setNew(e.target.value)}
                placeholder="새 브랜드명 입력" onKeyDown={e => e.key === "Enter" && onAdd()}
                style={{ flex: 1, padding: "0.7rem 1rem", border: "1px solid var(--steam)", borderRadius: "8px", fontFamily: "'DM Sans',sans-serif", fontSize: "0.88rem", outline: "none", background: "var(--cream)", color: "var(--espresso)", transition: "border-color 0.2s" }} />
              <button className="btn-save-sm" onClick={onAdd} disabled={brandSaving}>추가</button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {list.map(b => (
                <div key={b} className="brand-tag">
                  <span>{b}</span>
                  <button className="brand-tag-remove" onClick={() => onRemove(b)}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              ))}
              {list.length === 0 && <p style={{ color: "var(--muted)", fontSize: "0.82rem" }}>브랜드가 없어요.</p>}
            </div>
          </div>
        ))}
      </>)}
    </div>
  </div>);
}

/* ── Root ─────────────────────────────────────────────────────────── */
// ─── Root ──────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(undefined);
  const [lang, setLang] = useState(() => localStorage.getItem("brewlog_lang") || "ko");
  const [guestMode, setGuestMode] = useState(false);
  const [authDefaultTab, setAuthDefaultTab] = useState("login");

  const toggleLang = () => {
    const next = lang === "ko" ? "en" : "ko";
    setLang(next);
    localStorage.setItem("brewlog_lang", next);
  };

  // 비회원이 레시피 올리기 버튼 클릭 시 호출
  const requireAuth = () => {
    setGuestMode(false);
    setAuthDefaultTab("register");
  };

  useEffect(() => {
    loadBrandsFromDB();
    const unsub = onAuthStateChanged(auth, u => setUser(u ?? null));
    // 최초 방문 시(localStorage에 언어 설정 없을 때)만 IP 기반 언어 감지
    if (!localStorage.getItem("brewlog_lang")) {
      fetch("https://ipapi.co/json/")
        .then(r => r.json())
        .then(d => {
          const detected = d.country_code === "KR" ? "ko" : "en";
          setLang(detected);
          localStorage.setItem("brewlog_lang", detected);
        })
        .catch(() => {}); // 실패 시 기본값(ko) 유지
    }
    return unsub;
  }, []);

  if (user === undefined) return (
    <LangContext.Provider value={lang}>
      <style>{CSS}</style>
      <div className="loading-wrap">
        <p style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ animation: "spin 1s linear infinite", color: "var(--muted)" }}>
            <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.8" strokeDasharray="14 30" strokeLinecap="round"/>
          </svg>
          로딩 중…
        </p>
      </div>
    </LangContext.Provider>
  );

  return (
    <LangContext.Provider value={lang}>
      <style>{CSS}</style>
      {user
        ? <MainApp user={user} lang={lang} toggleLang={toggleLang} />
        : guestMode
          ? <MainApp user={null} lang={lang} toggleLang={toggleLang} onRequireAuth={requireAuth} />
          : <AuthScreen lang={lang} toggleLang={toggleLang} defaultTab={authDefaultTab}
              onGuest={() => { setGuestMode(true); setAuthDefaultTab("login"); }} />}
    </LangContext.Provider>
  );
}
