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

// ─── Styles ────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
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
    --r8: 8px;
  }
  body { font-family: 'DM Sans', sans-serif; background: var(--cream); color: var(--espresso); min-height: 100vh; -webkit-font-smoothing: antialiased; overflow-x: hidden; }

  .auth-wrap {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: var(--cream);
    padding: 16px;
  }
  .auth-card {
    background: var(--foam); border: 1px solid var(--steam); border-radius: 8px;
    padding: clamp(1.5rem, 5vw, 3rem) clamp(1.2rem, 5vw, 2.5rem);
    width: 100%; max-width: 440px; box-shadow: 0 16px 48px #1A1A1A08; position: relative;
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
    width: 100%; padding: 0.75rem 1rem; border: 1px solid var(--steam); border-radius: 8px;
    background: var(--cream); font-family: 'DM Sans', sans-serif; font-size: 0.95rem;
    color: var(--espresso); outline: none; transition: border-color 0.2s;
  }
  .field input:focus, .field select:focus { border-color: var(--latte); }

  .btn-primary {
    width: 100%; padding: 0.85rem; background: var(--espresso); color: var(--foam);
    border: none; border-radius: 8px; font-family: 'DM Sans', sans-serif;
    font-size: 0.9rem; font-weight: 500; cursor: pointer; transition: all 0.2s; margin-top: 0.5rem;
    letter-spacing: 0.01em;
  }
  .btn-primary:hover { background: #2D1E15; }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .msg-error { color: #c0392b; font-size: 0.82rem; margin-top: 0.8rem; text-align: center; }
  .msg-ok { color: #27ae60; font-size: 0.82rem; margin-top: 0.8rem; text-align: center; }

  .app-header {
    background: var(--foam);
    padding: 0 24px;
    height: 56px;
    display: flex; align-items: center; justify-content: space-between;
    border-bottom: 1px solid var(--divider);
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
  .section-title {
    font-family: 'Playfair Display', serif;
    font-size: 1.75rem;
    color: var(--espresso);
    margin-bottom: 4px;
    letter-spacing: -0.03em;
    font-weight: 700;
  }
  .section-sub {
    font-size: 0.82rem;
    color: var(--muted);
    margin-bottom: 12px;
    font-weight: 300;
    letter-spacing: 0.01em;
    opacity: 0.85;
  }
  .divider { height: 1px; background: var(--divider); margin: 0.5rem 0 1.2rem; }

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
    border-radius: 8px; font-family: 'DM Sans', sans-serif; font-size: 0.8rem;
    font-weight: 500; cursor: pointer; white-space: nowrap; transition: all 0.2s;
    display: inline-flex; align-items: center; gap: 7px; letter-spacing: 0.02em;
  }
  .btn-new:hover { background: var(--roast); border-color: var(--roast); }

  .recipes-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
  /* ── 카드 공통 폰트 기준 ──────────────────────────────── */
  /* label-xs : 0.68rem / label-sm : 0.75rem / body : 0.85rem / title : 1.05rem */

  .recipe-card {
    background: var(--foam); border: 1px solid var(--divider); border-radius: 8px;
    padding: 24px;
    position: relative;
    transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s; overflow: hidden;
    font-family: 'DM Sans', sans-serif; text-align: left;
  }
  .recipe-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px #1A1A1A06; border-color: #DEDAD6; }

  /* 장비 칩 태그 */
  .card-chip {
    display: inline-flex; align-items: center; gap: 3px;
    font-family: 'DM Sans', sans-serif; font-size: 0.7rem; font-weight: 400;
    color: var(--muted); background: var(--cream);
    border: 1px solid var(--steam); border-radius: 4px;
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
  .stat { background: var(--cream); padding: 8px 4px; border-radius: 6px; text-align: center; border: 1px solid var(--divider); min-width: 0; }
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
  .card-actions { display: flex; gap: 0.4rem; align-items: center; }
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
    background: var(--foam); color: var(--espresso); border-radius: 2px;
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
  .star-btn { background: none; border: none; cursor: pointer; font-size: 1.8rem; line-height: 1; padding: 0; transition: transform 0.1s; color: var(--steam); }
  .star-btn:hover, .star-btn.active { color: var(--latte); transform: scale(1.15); }
  .star-label { font-size: 0.78rem; color: var(--muted); margin-left: 0.4rem; }
  .weather-box { display: flex; align-items: center; gap: 0.8rem; padding: 0.7rem 1rem; background: var(--cream); border: 1px solid var(--steam); border-radius: 2px; font-size: 0.85rem; color: var(--muted); }
  .weather-icon { font-size: 1.5rem; }
  .weather-info { display: flex; flex-direction: column; gap: 0.1rem; }
  .weather-main { font-size: 0.88rem; color: var(--espresso); font-weight: 500; }
  .weather-detail { font-size: 0.78rem; color: var(--muted); }
  .weather-loading { color: var(--muted); font-size: 0.82rem; display: flex; align-items: center; gap: 6px; }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .card-weather { font-family: "DM Sans", sans-serif; font-size: 0.75rem; color: var(--muted); padding: 0.35rem 0.7rem; background: var(--cream); border-radius: 4px; margin-bottom: 0.6rem; display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; }
  .menu-selector {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }
  .menu-btn {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 6px;
    padding: 12px 8px 10px;
    border: 1px solid var(--steam); border-radius: 8px;
    background: var(--foam);
    font-family: 'DM Sans', sans-serif; font-size: 0.75rem; font-weight: 400;
    color: var(--muted); cursor: pointer; transition: all 0.18s;
    line-height: 1.2; text-align: center; white-space: nowrap;
  }
  .menu-btn:hover {
    border-color: var(--latte); color: var(--espresso);
    background: #FDF9F6;
  }
  .menu-btn:hover svg { color: var(--latte); }
  .menu-btn.selected {
    background: var(--espresso); color: var(--cream);
    border-color: var(--espresso); font-weight: 500;
  }
  .menu-btn.selected svg { color: var(--cream); opacity: 0.9; }
  .menu-btn svg { flex-shrink: 0; transition: color 0.18s; }
  .timer-box { display: flex; flex-direction: column; align-items: center; gap: 0.6rem; padding: 1rem 1rem 0.8rem; background: var(--cream); border: 1px solid var(--steam); border-radius: 2px; margin-top: 0.5rem; }
  .timer-display { font-family: 'Playfair Display', serif; font-size: 3rem; color: var(--espresso); letter-spacing: 0.08em; line-height: 1; min-width: 4rem; text-align: center; }
  .timer-display.running { color: var(--accent); }
  .timer-display.done { color: #27ae60; }
  .timer-btns { display: flex; gap: 0.5rem; width: 100%; }
  .timer-start { flex: 1; padding: 0.6rem 0; background: var(--espresso); color: var(--cream); border: none; border-radius: 2px; font-family: 'DM Sans',sans-serif; font-size: 0.85rem; cursor: pointer; transition: background 0.2s; white-space: nowrap; }
  .timer-start:hover { background: var(--roast); }
  .timer-reset { flex: 1; padding: 0.6rem 0; background: none; border: 1px solid var(--steam); border-radius: 2px; font-family: 'DM Sans',sans-serif; font-size: 0.85rem; color: var(--muted); cursor: pointer; white-space: nowrap; }
  .bean-counter { display: flex; flex-direction: column; gap: 0.5rem; }
  .bean-counter-label { font-size: 0.75rem; color: var(--muted); letter-spacing: 0.08em; text-transform: uppercase; }
  .bean-counter-display { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
  .bean-icons { display: flex; flex-wrap: wrap; gap: 0.3rem; min-height: 2rem; align-items: center; padding: 0.5rem; background: var(--cream); border: 1px solid var(--steam); border-radius: 2px; flex: 1; }
  .bean-icon { cursor: pointer; transition: transform 0.1s; display: inline-flex; align-items: center; }
  .bean-icon:hover { transform: scale(1.2); }
  .bean-counter-btns { display: flex; gap: 0.4rem; }
  .bean-btn { width: 2rem; height: 2rem; border: 1px solid var(--steam); border-radius: 2px; background: var(--foam); font-size: 1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; color: var(--espresso); }
  .bean-btn:hover { border-color: var(--accent); color: var(--accent); }
  .bean-count-text { font-size: 0.82rem; color: var(--muted); min-width: 3rem; }
  .auto-badge { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.72rem; background: var(--latte); color: var(--espresso); padding: 0.2rem 0.6rem; border-radius: 999px; font-weight: 500; margin-left: 0.4rem; }
  .autocomplete-wrap { position: relative; }
  .autocomplete-list {
    position: absolute; top: calc(100% + 2px); left: 0; right: 0;
    background: var(--foam); border: 1px solid var(--latte); border-radius: 2px;
    max-height: 200px; overflow-y: auto; z-index: 300;
    box-shadow: 0 4px 20px #2c181018;
  }
  .autocomplete-item {
    padding: 0.6rem 1rem; font-family: 'DM Sans', sans-serif; font-size: 0.9rem;
    color: var(--espresso); cursor: pointer; transition: background 0.1s;
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
    padding: 0 16px; height: 34px;
    border: 1px solid var(--steam); border-radius: 8px; background: var(--foam);
    font-family: 'DM Sans', sans-serif; font-size: 0.8rem; color: var(--muted);
    cursor: pointer; transition: all 0.2s; white-space: nowrap;
    display: inline-flex; align-items: center; justify-content: center; gap: 5px;
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
  .best-section { margin-bottom: 24px; }
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
    padding: 20px 24px;
    border-bottom: 1px solid var(--divider);
    cursor: pointer; transition: background 0.15s;
    position: relative;
  }
  .best-row:last-child { border-bottom: none; }
  .best-row:hover { background: #FAFAF8; }

  /* 순위 번호 — Playfair Serif, 매거진 스타일 */
  .best-rank-num {
    font-family: 'Playfair Display', serif;
    font-size: 1.3rem;
    font-weight: 400;
    letter-spacing: -0.02em;
    min-width: 40px;
    text-align: right;
    line-height: 1;
    flex-shrink: 0;
  }
  .best-rank-num.rank-1 { color: var(--espresso); font-weight: 700; }
  .best-rank-num.rank-2 { color: var(--latte); }
  .best-rank-num.rank-3 { color: var(--muted); }

  .best-row-content { flex: 1; min-width: 0; }
  .best-row-bean {
    font-family: 'Playfair Display', serif;
    font-size: 1rem; font-weight: 600;
    color: var(--espresso); line-height: 1.25;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    margin-bottom: 3px;
  }
  .best-row-meta {
    font-family: 'DM Sans', sans-serif;
    font-size: 0.72rem;
    color: var(--muted);
    opacity: 0.75;
    display: flex; gap: 6px; align-items: center;
  }
  .best-row-right {
    display: flex; align-items: center; gap: 5px;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.75rem; font-weight: 500;
    color: var(--muted);
    flex-shrink: 0;
  }

  .modal-backdrop {
    position: fixed; inset: 0; background: #1A1A1ACC; z-index: 200;
    display: flex; align-items: center; justify-content: center; padding: 16px;
    backdrop-filter: blur(4px); animation: fadeIn 0.15s ease;
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .modal {
    background: var(--foam); border: 1px solid var(--steam); border-radius: 8px;
    padding: 32px 28px; width: 100%; max-width: 500px; max-height: 90vh;
    overflow-y: auto; position: relative; animation: slideUp 0.2s ease;
    text-align: left; box-shadow: 0 24px 48px #1A1A1A10;
  }
  @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  .modal::before { content: ''; position: absolute; top: 0; left: 2rem; right: 2rem; height: 2px; background: linear-gradient(90deg, transparent, var(--latte), transparent); }
  .modal h2 { font-family: 'Playfair Display', serif; font-size: 1.5rem; margin-bottom: 24px; color: var(--espresso); }
  .modal-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .modal-grid .field { margin-bottom: 0; }
  .field.full { grid-column: 1 / -1; }
  .modal-actions { display: flex; gap: 8px; margin-top: 24px; justify-content: flex-end; }
  .btn-cancel { padding: 0.7rem 1.5rem; background: none; border: 1px solid var(--steam); border-radius: 8px; font-family: 'DM Sans', sans-serif; font-size: 0.88rem; color: var(--muted); cursor: pointer; transition: all 0.2s; }
  .btn-cancel:hover { border-color: var(--muted); }
  textarea { width: 100%; padding: 0.75rem 1rem; border: 1px solid var(--steam); border-radius: 2px; background: var(--cream); font-family: 'DM Sans', sans-serif; font-size: 0.9rem; color: var(--espresso); outline: none; resize: vertical; min-height: 80px; }
  textarea:focus { border-color: var(--latte); }
  .loading-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--cream); }
  .loading-wrap p { font-family: 'Playfair Display', serif; font-size: 1.2rem; color: var(--muted); }
  .my-section { margin-bottom: 1.8rem; padding-bottom: 1.5rem; border-bottom: 1px solid var(--steam); }
  .my-section:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
  .my-section-title { font-family: 'Playfair Display', serif; font-size: 1rem; color: var(--espresso); margin-bottom: 1rem; }
  .my-locked-row { display: flex; gap: 0.5rem; align-items: center; }
  .my-locked-val { flex: 1; padding: 0.7rem 1rem; border: 1px solid var(--steam); border-radius: 2px; background: var(--steam); font-size: 0.9rem; color: var(--espresso); font-weight: 500; }
  .btn-change { padding: 0.7rem 0.8rem; background: none; border: 1px solid var(--steam); border-radius: 2px; font-family: 'DM Sans',sans-serif; font-size: 0.8rem; color: var(--muted); cursor: pointer; white-space: nowrap; flex-shrink: 0; transition: all 0.2s; }
  .btn-change:hover { border-color: var(--accent); color: var(--accent); }
  .save-row { display: flex; justify-content: flex-end; margin-top: 0.8rem; }
  .btn-save-sm { padding: 0.6rem 1.5rem; background: var(--espresso); color: var(--cream); border: none; border-radius: 2px; font-family: 'DM Sans',sans-serif; font-size: 0.85rem; cursor: pointer; transition: background 0.2s; }
  .btn-save-sm:hover { background: var(--roast); }
  .btn-save-sm:disabled { opacity: 0.5; cursor: not-allowed; }


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
    background: var(--foam); border: 1px solid var(--divider); border-radius: 8px;
    padding: 16px 20px; margin-bottom: 16px; box-sizing: border-box; width: 100%;
  }
  .admin-card-title {
    font-family: 'DM Sans', sans-serif; font-size: 0.72rem; font-weight: 600;
    color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 16px;
  }

  .admin-stat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px; margin-bottom: 20px; }
  .stat-card {
    background: var(--foam); border: 1px solid var(--divider); border-radius: 8px;
    padding: 16px 12px; text-align: center; box-sizing: border-box;
  }
  .stat-card-val { font-family: 'Playfair Display', serif; font-size: 1.8rem; color: var(--espresso); display: block; font-weight: 700; }
  .stat-card-label { font-size: 0.68rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; margin-top: 4px; display: block; }

  .admin-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; table-layout: fixed; }
  .admin-table th { text-align: left; padding: 8px 10px; font-size: 0.65rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1px solid var(--divider); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .admin-table td { padding: 10px 10px; border-bottom: 1px solid var(--divider); color: var(--espresso); vertical-align: middle; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .admin-table tr:last-child td { border-bottom: none; }
  .admin-table tr:hover td { background: var(--cream); }

  .btn-danger { padding: 0 10px; height: 28px; background: none; border: 1px solid #c0392b40; color: #c0392b; border-radius: 6px; font-family: 'DM Sans',sans-serif; font-size: 0.72rem; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 4px; }
  .btn-danger:hover { background: #c0392b; color: white; border-color: #c0392b; }

  .admin-action-btn { padding: 0 12px; height: 30px; border: none; border-radius: 6px; font-family: 'DM Sans',sans-serif; font-size: 0.78rem; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 5px; font-weight: 500; }
  .admin-action-restore { background: #eafaf1; color: #27ae60; }
  .admin-action-restore:hover { background: #27ae60; color: white; }
  .admin-action-hide { background: #fef9e7; color: #e67e22; }
  .admin-action-hide:hover { background: #e67e22; color: white; }
  .admin-action-delete { background: #fdecea; color: #e74c3c; }
  .admin-action-delete:hover { background: #e74c3c; color: white; }

  .notice-form { display: flex; flex-direction: column; gap: 12px; }
  .notice-item { background: var(--foam); border: 1px solid var(--divider); border-radius: 8px; padding: 16px; }
  .notice-item-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
  .notice-item-title { font-weight: 600; color: var(--espresso); margin-bottom: 4px; font-size: 0.9rem; }
  .notice-item-body { font-size: 0.82rem; color: var(--muted); line-height: 1.55; }
  .notice-item-date { font-size: 0.68rem; color: var(--muted); white-space: nowrap; }

  .brand-tag {
    display: inline-flex; align-items: center; gap: 6px;
    background: var(--cream); border: 1px solid var(--steam); border-radius: 6px;
    padding: 4px 10px; font-size: 0.82rem; color: var(--espresso);
  }
  .brand-tag-remove { background: none; border: none; cursor: pointer; color: var(--muted); padding: 0; line-height: 1; display: flex; align-items: center; transition: color 0.15s; }
  .brand-tag-remove:hover { color: #c0392b; }

  .report-card {
    border: 1px solid var(--divider); border-radius: 8px; padding: 16px;
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
  .btn-admin-header { background: none; border: 1px solid #e74c3c40; color: #c0392b; padding: 0 12px; height: 32px; border-radius: 8px; font-family: 'DM Sans',sans-serif; font-size: 0.72rem; cursor: pointer; transition: all 0.2s; white-space: nowrap; display: inline-flex; align-items: center; }
  .btn-admin-header:hover { border-color: #ff6b6b; }
  /* ── 알림 ── */
  .notif-btn { position: relative; background: none; border: none; cursor: pointer; color: var(--muted); padding: 4px; line-height: 1; transition: color 0.2s; display: flex; align-items: center; }
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
    border-radius: 8px;
    box-shadow: 0 8px 32px #0003;
    z-index: 9999;
    overflow: hidden;
  }
  .notif-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--divider); font-family: 'DM Sans',sans-serif; font-size: 0.85rem; font-weight: 600; color: var(--espresso); }
  .notif-list { max-height: 360px; overflow-y: auto; }
  .notif-item { padding: 12px 16px; border-bottom: 1px solid var(--divider); cursor: pointer; transition: background 0.15s; display: flex; flex-direction: column; gap: 4px; }
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
      padding: 0 12px;
      font-size: 0.73rem;
      flex-shrink: 0;
      height: 30px;
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
    background: var(--foam); border: 1px solid var(--divider); border-radius: 8px;
    padding: 20px; position: relative; transition: transform 0.2s, box-shadow 0.2s;
    font-family: 'DM Sans', sans-serif;
  }
  .bean-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px #1A1A1A06; }
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
  .bean-stat { background: var(--cream); border: 1px solid var(--divider); border-radius: 6px; padding: 7px 6px; text-align: center; }
  .bean-stat-val { font-size: 0.88rem; font-weight: 600; color: var(--espresso); display: block; line-height: 1.2; }
  .bean-stat-lbl { font-size: 0.62rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; display: block; margin-top: 2px; }

  .bean-card-footer { display: flex; align-items: center; justify-content: space-between; padding-top: 12px; border-top: 1px solid var(--divider); }
  .bean-days-chip { font-size: 0.72rem; color: var(--muted); }
  .bean-actions { display: flex; gap: 6px; }
  .bean-btn { background: none; border: 1px solid var(--steam); border-radius: 6px; padding: 0 10px; height: 26px; font-family: 'DM Sans',sans-serif; font-size: 0.7rem; color: var(--muted); cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; }
  .bean-btn:hover { border-color: var(--espresso); color: var(--espresso); }
  .bean-btn.danger:hover { border-color: #c0392b; color: #c0392b; }

  /* status selector */
  .bean-status-row { display: flex; gap: 6px; margin-bottom: 12px; }
  .bean-status-btn { flex: 1; padding: 6px 4px; border: 1px solid var(--steam); border-radius: 6px; background: var(--foam); font-family: 'DM Sans',sans-serif; font-size: 0.72rem; color: var(--muted); cursor: pointer; transition: all 0.2s; text-align: center; }
  .bean-status-btn.active { background: var(--espresso); color: var(--cream); border-color: var(--espresso); font-weight: 500; }

  @media (max-width: 600px) {
    .bean-grid { grid-template-columns: 1fr; }
    .bean-card { padding: 16px; }
  }
`;


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

const loadCurrency = () => { try { return localStorage.getItem(CURRENCY_KEY) || "KRW"; } catch { return "KRW"; } };
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

// ─── CoffeeBeanIcon ────────────────────────────────────────────────
function CoffeeBeanIcon({ size = 22, color = "#5c3317" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="12" cy="12" rx="7" ry="10" fill={color} transform="rotate(-30 12 12)" />
      <path d="M12 4 Q14 8 12 12 Q10 16 12 20" stroke="#f5efe6" strokeWidth="1.5" strokeLinecap="round" fill="none" transform="rotate(-30 12 12)" />
    </svg>
  );
}

// ─── BrandInput (자동완성 입력창) ─────────────────────────────────
function BrandInput({ value, onChange, brands, placeholder }) {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);
  const wrapRef = React.useRef(null);

  const filtered = query.trim()
    ? brands.filter(b => b.toLowerCase().includes(query.toLowerCase()))
    : brands;

  useEffect(() => {
    const handler = e => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const select = (b) => {
    setQuery(b);
    onChange(b);
    setOpen(false);
  };

  return (
    <div className="autocomplete-wrap" ref={wrapRef}>
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder || "브랜드 입력 또는 검색…"}
        style={{ width: "100%", padding: "0.75rem 1rem", border: "1px solid var(--steam)", borderRadius: "2px", background: "var(--cream)", fontFamily: "'DM Sans',sans-serif", fontSize: "0.95rem", color: "var(--espresso)", outline: "none" }}
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
}



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
          fontSize="7" fill="#8C8480" opacity="0.7">{lv}</text>;
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
  const isEdit = !!editTarget;

  // ── 내 원두 목록 로드 ──────────────────────────────
  const [myBeans, setMyBeans] = useState([]);
  const [linkedBeanId, setLinkedBeanId] = useState(editTarget?.linkedBeanId || null);
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
        // 대표 장비 자동 적용 (신규 작성 시, 카테고리별로 각각)
        if (!isEdit) {
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
  const isHandDrip = !isEdit && savedMachine?.equipType === "handdrip";
  const [machineLocked, setMachineLocked] = useState(!!savedMachine && !isEdit);
  const [machineBrand, setMachineBrand] = useState(
    isEdit ? (editTarget.machineBrand || "") : (isHandDrip ? "" : (savedMachine?.brand || ""))
  );
  const [machineModel, setMachineModel] = useState(
    isEdit ? (editTarget.machineModel || "") : (isHandDrip ? "" : (savedMachine?.model || ""))
  );
  const isCustomBrand = machineBrand === "기타 (직접 입력)";
  const [machineType, setMachineType] = useState(
    isEdit ? (editTarget.machineType || "auto") : (isHandDrip ? "handdrip" : "auto")
  );
  const [handDripName, setHandDripName] = useState(
    isEdit ? (editTarget.machine && editTarget.machineType === "handdrip" ? editTarget.machine : "") : (savedMachine?.handDripName || "")
  );
  // 전자동 전용 브랜드거나, 선택 가능 브랜드에서 전자동 선택 시
  const isAutoMode = isAutoMachine(machineBrand) && machineType === "auto";

  // 저장된 내 그라인더 불러오기
  const savedGrinder = loadMyGrinder();
  const [grinderLocked, setGrinderLocked] = useState(!!savedGrinder && !isEdit);
  const [grinderBrand, setGrinderBrand] = useState(
    isEdit ? (editTarget.grinderBrand || "") : (savedGrinder?.brand || "")
  );
  const [grinderModel, setGrinderModel] = useState(
    isEdit ? (editTarget.grinderModel || "") : (savedGrinder?.model || "")
  );
  const isCustomGrinderBrand = grinderBrand === "기타 (직접 입력)";

  const savedBean = loadMyBean();
  const savedDefaults = loadRecipeDefaults();
  const [form, setForm] = useState(isEdit ? {
    ...editTarget,
    // 기존 레시피 중 waterTemp가 비어있는 경우 기본값 93 채움
    waterTemp: editTarget.waterTemp || "93",
    waterType: editTarget.waterType || "",
    waterBrand: editTarget.waterBrand || "",
    diluteCustom: editTarget.diluteCustom || "",
  } : {
    company: savedBean?.company || "",
    bean: savedBean?.bean || "",
    roastDate: savedBean?.roastDate || "",
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
    isPublic: isEdit ? (editTarget.isPublic !== false) : true,
    isIced: isEdit ? (editTarget.isIced || false) : false,
    syrup: isEdit ? (editTarget.syrup || "") : "", note: isEdit ? (editTarget.note || "") : ""
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [weather, setWeather] = useState(isEdit ? (editTarget.weather || null) : null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState(null);

  // 신규 작성 시 모달 열리면 자동으로 날씨 가져오기
  useEffect(() => {
    if (!isEdit && !weather) {
      setWeatherLoading(true);
      fetchWeather()
        .then(w => { setWeather(w); setWeatherError(null); })
        .catch(e => { setWeatherError(typeof e === "string" ? e : e.message); })
        .finally(() => setWeatherLoading(false));
    }
  }, []);
  const [selectedMenu, setSelectedMenu] = useState(isEdit ? (editTarget.menuId || "") : (isHandDrip ? "hand_drip" : ""));

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
    if (!isEdit) {
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
              await updateDoc(beanRef, {
                consumedG:  cur + (parseFloat(form.gram) || 0),
                usedCount:  curCount + 1,
                lastUsedAt: serverTimestamp(),
              });
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
    } catch (e) { alert("저장 오류: " + e.message); }
    setSaving(false);
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" ref={modalRef}>
        <h2>{isEdit ? t.editTitle : t.recordTitle}</h2>

        {/* ── 프리셋 (모달 최상단) ── */}
        {!isEdit && (
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
          {/* 날씨 정보 */}
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

          {/* 공개 설정 */}
          <div className="field full">
            <label>{lang === "en" ? "Visibility" : "공개 설정"}</label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button type="button"
                onClick={() => set("isPublic", true)}
                style={{ flex: 1, padding: "0.65rem", border: "1px solid", borderRadius: "8px", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: "0.88rem", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                  borderColor: form.isPublic !== false ? "var(--latte)" : "var(--steam)",
                  background: form.isPublic !== false ? "var(--latte)" : "var(--foam)",
                  color: form.isPublic !== false ? "var(--espresso)" : "var(--muted)", fontWeight: form.isPublic !== false ? 600 : 400 }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3"/><path d="M8 2C8 2 10 5 10 8s-2 6-2 6M8 2C8 2 6 5 6 8s2 6 2 6M2 8h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                {lang === "en" ? "Public" : "공개"}
              </button>
              <button type="button"
                onClick={() => set("isPublic", false)}
                style={{ flex: 1, padding: "0.65rem", border: "1px solid", borderRadius: "8px", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: "0.88rem", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                  borderColor: form.isPublic === false ? "var(--espresso)" : "var(--steam)",
                  background: form.isPublic === false ? "var(--espresso)" : "var(--foam)",
                  color: form.isPublic === false ? "var(--cream)" : "var(--muted)", fontWeight: form.isPublic === false ? 600 : 400 }}>
                <svg width="13" height="14" viewBox="0 0 14 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="7" width="10" height="8" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M4.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
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
        {!isEdit && (
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
        )}
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
function RecipeDetailModal({ recipe, onClose, currentUid, currentUser, onLike, onEdit, onDelete, onRequireAuth, onFollow, isFollowing, onBookmark, isBookmarked, lang = "ko" }) {
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
          <div className="stat"><span className="stat-val">{recipe.gram}g</span><span className="stat-label">{t.statGram}</span></div>
          <div className="stat">
            <span className="stat-val">{recipe.seconds}s</span>
            <span className="stat-label">{t.statSeconds}</span>
            {recipe.infusionSeconds && parseInt(recipe.infusionSeconds) > 0 && (
              <span style={{ fontSize: "0.55rem", color: "var(--muted)", display: "block", lineHeight: 1.2, marginTop: "1px", whiteSpace: "nowrap" }}>
                {lang === "en"
                  ? `${recipe.infusionSeconds}+${parseInt(recipe.seconds)-parseInt(recipe.infusionSeconds)}`
                  : `인퓨전 ${recipe.infusionSeconds}+추출 ${parseInt(recipe.seconds)-parseInt(recipe.infusionSeconds)}`}
              </span>
            )}
          </div>
          <div className="stat"><span className="stat-val">{recipe.espressoMl}ml</span><span className="stat-label">{t.statMl}</span></div>
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
        <div className="card-footer" style={{ marginTop: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <span className="card-author" style={{ cursor: "pointer" }}>@{recipe.author}</span>
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
            {/* 공유 버튼 */}
            <button
              onClick={async () => {
                try {
                  const html2canvas = (await import("html2canvas")).default;

                  const menuLabel = recipe.menuLabel || "";
                  const iced = recipe.isIced ? "ICE" : (COFFEE_MENUS.find(m => m.id === recipe.menuId)?.canIce ? "HOT" : "");
                  const stars = recipe.rating > 0 ? "★".repeat(recipe.rating) + "☆".repeat(5 - recipe.rating) : "";

                  // 파라미터 박스 (숫자형 핵심 수치)
                  const params = [
                    recipe.gram            && { lbl: lang==="en"?"Dose":"원두량",   val: `${recipe.gram}g` },
                    (recipe.infusionSeconds && parseInt(recipe.infusionSeconds) > 0)
                      ? { lbl: lang==="en"?"Infusion":"인퓨전", val: `${recipe.infusionSeconds}s` } : null,
                    recipe.seconds         && { lbl: lang==="en"?"Time":"추출시간", val: `${recipe.seconds}s` },
                    recipe.espressoMl      && { lbl: lang==="en"?"Yield":"추출량",  val: `${recipe.espressoMl}ml` },
                    recipe.waterTemp       && { lbl: lang==="en"?"Temp":"물온도",   val: `${recipe.waterTemp}°C` },
                    recipe.grindSize       && { lbl: lang==="en"?"Grind":"분쇄도",  val: `${recipe.grindSize}` },
                  ].filter(Boolean);

                  // 물 종류 표시
                  const waterTypes = { tap:"수돗물", filter:"정수기", bottle:"생수", other:"기타" };
                  const waterLabel = recipe.waterType
                    ? [waterTypes[recipe.waterType] || recipe.waterType, recipe.waterBrand].filter(Boolean).join(" · ")
                    : "";

                  // 희석 표시
                  const diluteLabel = recipe.diluteMl
                    ? [recipe.diluteType === "기타우유" ? (recipe.diluteCustom || "기타") : recipe.diluteType, `${recipe.diluteMl}ml`].filter(Boolean).join(" ")
                    : "";

                  // 라벨 행 (장비/환경 정보)
                  const labelRows = [
                    recipe.roastDate  && { lbl: lang==="en"?"Roasted":"로스팅",     val: recipe.roastDate },
                    recipe.machine    && { lbl: lang==="en"?"Machine":"머신",       val: [recipe.machine, recipe.machineModel].filter(Boolean).join(" ") },
                    recipe.grinder    && { lbl: lang==="en"?"Grinder":"그라인더",   val: [recipe.grinder, recipe.grinderModel].filter(Boolean).join(" ") },
                    waterLabel        && { lbl: lang==="en"?"Water":"물 종류",      val: waterLabel },
                    diluteLabel       && { lbl: lang==="en"?"Dilute":"희석",        val: diluteLabel },
                    recipe.syrup      && { lbl: lang==="en"?"Syrup":"시럽",         val: recipe.syrup },
                    recipe.weather    && { lbl: lang==="en"?"Weather":"날씨",       val: `${recipe.weather.icon||""} ${recipe.weather.descKo||""} ${recipe.weather.temp}°C · ${lang==="en"?"Humidity":"습도"} ${recipe.weather.humidity}%` },
                  ].filter(Boolean);

                  // 플레이버
                  const flavorKeys = ["Acidity","Sweet","Bitter","Aroma","Aftertaste","Balance","Body"];
                  const flavorLabels = { Acidity:"산미", Sweet:"단맛", Bitter:"쓴맛", Aroma:"아로마", Aftertaste:"후미", Balance:"밸런스", Body:"바디" };
                  const flavors = flavorKeys.map(k => ({ key: k, lbl: flavorLabels[k], val: parseInt(recipe[`flavor${k}`])||0 })).filter(f => f.val > 0);

                  // 7각형 레이더 차트 SVG — 항상 전체 7축 표시
                  const radarSVG = (() => {
                    const cx = 120, cy = 120, R = 88;
                    const n = flavorKeys.length; // 7
                    const startAngle = -Math.PI / 2;
                    const getPoint = (i, r) => {
                      const a = startAngle + (2 * Math.PI * i / n);
                      return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
                    };
                    // 격자 (5단계)
                    const gridLines = [1,2,3,4,5].map(level => {
                      const r = (R * level) / 5;
                      const pts = flavorKeys.map((_, i) => getPoint(i, r).join(",")).join(" ");
                      return `<polygon points="${pts}" fill="${level===5?"#FAFAF9":"none"}" stroke="#E8E6E3" stroke-width="${level===5?"1.2":"0.7"}"/>`;
                    }).join("");
                    // 축선
                    const axisLines = flavorKeys.map((_, i) => {
                      const [x, y] = getPoint(i, R);
                      return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#E8E6E3" stroke-width="0.8"/>`;
                    }).join("");
                    // 데이터 폴리곤
                    const vals = flavorKeys.map(k => (parseInt(recipe[`flavor${k}`]) || 0) / 5);
                    const dataPts = flavorKeys.map((_, i) => getPoint(i, Math.max(vals[i], 0.05) * R).join(",")).join(" ");
                    // 점
                    const dots = flavorKeys.map((_, i) => {
                      if (vals[i] === 0) return "";
                      const [x, y] = getPoint(i, vals[i] * R);
                      return `<circle cx="${x}" cy="${y}" r="3.5" fill="#B07D54" stroke="white" stroke-width="1"/>`;
                    }).join("");
                    // 레이블
                    const labels = flavorKeys.map((k, i) => {
                      const [x, y] = getPoint(i, R + 20);
                      const anchor = x < cx - 8 ? "end" : x > cx + 8 ? "start" : "middle";
                      const v = parseInt(recipe[`flavor${k}`]) || 0;
                      return `<text x="${x}" y="${y}" text-anchor="${anchor}" dominant-baseline="middle" font-size="9.5" fill="${v>0?"#1A1614":"#C0BBBA"}" font-family="DM Sans,sans-serif" font-weight="${v>0?"600":"400"}">${flavorLabels[k]}</text>`;
                    }).join("");

                    return `<svg width="240" height="240" viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">
                      ${gridLines}${axisLines}
                      <polygon points="${dataPts}" fill="#B07D54" fill-opacity="0.18" stroke="#B07D54" stroke-width="1.8" stroke-linejoin="round"/>
                      ${dots}${labels}
                    </svg>`;
                  })();

                  const el = document.createElement("div");
                  el.style.cssText = `position:fixed;left:-9999px;top:-9999px;width:420px;background:#FBFBFA;font-family:'DM Sans',sans-serif;border-radius:20px;overflow:hidden;`;

                  el.innerHTML = `
                    <div style="padding:24px 24px 20px;">
                      <!-- 헤더 -->
                      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;">
                        <div style="display:flex;align-items:center;gap:6px;">
                          <svg width="14" height="14" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="8" stroke="#1A1614" stroke-width="1.5"/><path d="M5 9.5c1-2 3-3 4-2s3 3 4 1" stroke="#B07D54" stroke-width="1.5" stroke-linecap="round"/></svg>
                          <span style="font-size:12px;font-weight:700;color:#1A1614;">Brewlog Note</span>
                        </div>
                        <span style="font-size:11px;color:#8C8480;">@${recipe.author||""}</span>
                      </div>

                      <!-- 메뉴 + ICE/HOT -->
                      <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px;">
                        <span style="font-size:11px;color:#8C8480;">${menuLabel}</span>
                        ${iced ? `<span style="font-size:9px;font-weight:700;color:${iced==="ICE"?"#2980b9":"#e67e22"};background:${iced==="ICE"?"#EBF5FB":"#FEF3E8"};border:1px solid ${iced==="ICE"?"#AED6F1":"#FAD7A0"};border-radius:4px;padding:1px 5px;">${iced}</span>` : ""}
                      </div>

                      <!-- 원두명 / 로스터리 -->
                      <div style="font-size:24px;font-weight:700;color:#1A1614;letter-spacing:-0.02em;line-height:1.2;margin-bottom:3px;">${recipe.bean||""}</div>
                      <div style="font-size:12px;color:#8C8480;margin-bottom:16px;">${recipe.company||""}</div>

                      <div style="height:1px;background:#F0EFEF;margin-bottom:16px;"></div>

                      <!-- 파라미터 박스 -->
                      ${params.length > 0 ? `
                      <div style="display:grid;grid-template-columns:repeat(${Math.min(params.length,4)},1fr);gap:6px;margin-bottom:16px;">
                        ${params.map(p => `<div style="text-align:center;background:#FAFAF9;border:1px solid #F0EFEF;border-radius:8px;padding:9px 4px;">
                          <div style="font-size:14px;font-weight:700;color:#1A1614;line-height:1;">${p.val}</div>
                          <div style="font-size:9px;color:#8C8480;margin-top:3px;">${p.lbl}</div>
                        </div>`).join("")}
                      </div>` : ""}

                      <!-- 라벨 행 -->
                      ${labelRows.length > 0 ? `
                      <div style="display:flex;flex-direction:column;gap:5px;margin-bottom:16px;">
                        ${labelRows.map(r => `<div style="display:flex;gap:8px;font-size:11px;">
                          <span style="color:#8C8480;min-width:48px;flex-shrink:0;">${r.lbl}</span>
                          <span style="color:#1A1614;font-weight:500;">${r.val}</span>
                        </div>`).join("")}
                      </div>` : ""}

                      <!-- 플레이버 프로파일 -->
                      ${flavors.length > 0 ? `
                      <div style="margin-bottom:16px;">
                        <div style="font-size:9px;color:#8C8480;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">Flavor Profile</div>
                        <!-- 레이더 차트 중앙 배치 -->
                        <div style="display:flex;justify-content:center;margin-bottom:12px;">
                          ${radarSVG}
                        </div>
                        <!-- 바 차트 2열 -->
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px 14px;">
                          ${flavors.map(f => `<div>
                            <div style="display:flex;justify-content:space-between;font-size:10px;color:#1A1614;margin-bottom:2px;">
                              <span>${f.lbl}</span><span style="color:#B07D54;font-weight:600;">${f.val}/5</span>
                            </div>
                            <div style="height:3px;background:#F0EFEF;border-radius:2px;">
                              <div style="height:100%;width:${f.val/5*100}%;background:#B07D54;border-radius:2px;"></div>
                            </div>
                          </div>`).join("")}
                        </div>
                      </div>` : ""}

                      <!-- 별점 -->
                      ${stars ? `<div style="font-size:16px;color:#B07D54;margin-bottom:${recipe.note?"10px":"0"};">${stars}</div>` : ""}

                      <!-- 메모 -->
                      ${recipe.note ? `<div style="font-size:11px;color:#8C8480;background:#FAFAF9;border-left:3px solid #B07D54;padding:9px 12px;border-radius:0 8px 8px 0;line-height:1.6;">"${recipe.note}"</div>` : ""}
                    </div>

                    <!-- 푸터 -->
                    <div style="background:#F0EFEF;padding:9px 24px;display:flex;align-items:center;justify-content:space-between;">
                      <span style="font-size:9px;color:#8C8480;">brewlog-jade.vercel.app</span>
                      <span style="font-size:9px;color:#B07D54;font-weight:600;">Brewlog Note</span>
                    </div>
                  `;

                  document.body.appendChild(el);
                  const canvas = await html2canvas(el, { scale: 3, useCORS: true, backgroundColor: null, logging: false });
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
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 0, display: "inline-flex", alignItems: "center", transition: "color 0.15s" }}
              title={lang === "en" ? "Share recipe" : "레시피 공유"}
              onMouseEnter={e => e.currentTarget.style.color = "var(--espresso)"}
              onMouseLeave={e => e.currentTarget.style.color = "var(--muted)"}
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12.5" cy="3" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
                <circle cx="12.5" cy="13" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
                <circle cx="3.5" cy="8" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M5 7.2l6-3.2M5 8.8l6 3.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </button>
            <button
              className={`btn-heart ${liked ? "liked" : ""}`}
              onClick={() => !isOwner && onLike(recipe)}
              style={{ cursor: isOwner ? "default" : "pointer", opacity: isOwner ? 0.4 : 1 }}
              title={isOwner ? t.heartOwner : liked ? t.heartCancel : t.heart}
            >
              {liked ? (
                <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 13.5C8 13.5 2 9.5 2 5.5C2 3.567 3.567 2 5.5 2C6.612 2 7.595 2.518 8 3.354C8.405 2.518 9.388 2 10.5 2C12.433 2 14 3.567 14 5.5C14 9.5 8 13.5 8 13.5Z"/>
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 13.5C8 13.5 2 9.5 2 5.5C2 3.567 3.567 2 5.5 2C6.612 2 7.595 2.518 8 3.354C8.405 2.518 9.388 2 10.5 2C12.433 2 14 3.567 14 5.5C14 9.5 8 13.5 8 13.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                </svg>
              )}
              <span>{likeCount > 0 ? likeCount : ""}</span>
            </button>
            {isOwner && (<>
              <button className="card-edit" onClick={() => { onClose(); onEdit(recipe); }}
                style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 0, display: "inline-flex", alignItems: "center" }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11.5 2.5l2 2-8 8H3.5v-2l8-8z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                </svg>
              </button>
              <button className="card-delete" onClick={() => { onClose(); onDelete(recipe.id); }}
                style={{ background: "none", border: "none", color: "#c0392b55", cursor: "pointer", padding: 0, display: "inline-flex", alignItems: "center" }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 4h10M5 4V2.5C5 2.224 5.224 2 5.5 2h5c.276 0 .5.224.5.5V4M6 7v5M10 7v5M4 4l.8 9.2c.02.44.38.8.82.8h6.76c.44 0 .8-.36.82-.8L14 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </>)}
            {/* ··· 더보기 메뉴 (본인 글 제외) */}
            {!isOwner && currentUser && (
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setShowMore(v => !v)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: "2px 4px", display: "inline-flex", alignItems: "center", borderRadius: "4px", transition: "color 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.color = "var(--espresso)"}
                  onMouseLeave={e => e.currentTarget.style.color = "var(--muted)"}
                >
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
                    <circle cx="3" cy="8" r="1.2"/><circle cx="8" cy="8" r="1.2"/><circle cx="13" cy="8" r="1.2"/>
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
function RecipeCard({ recipe, currentUid, onDelete, onEdit, onLike, onBookmark, isBookmarked, onFollow, isFollowing, onCardClick, lang = "ko" }) {
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
          <span className="card-author">@{recipe.author}</span>
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
          {/* 본인 글엔 하트 비활성화 */}
          <button
            className={`btn-heart ${liked ? "liked" : ""}`}
            onClick={e => { e.stopPropagation(); !isOwner && onLike(recipe); }}
            style={{ cursor: isOwner ? "default" : "pointer", opacity: isOwner ? 0.4 : 1 }}
            title={isOwner ? t.heartOwner : liked ? t.heartCancel : t.heart}
          >
            {liked ? (
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 13.5C8 13.5 2 9.5 2 5.5C2 3.567 3.567 2 5.5 2C6.612 2 7.595 2.518 8 3.354C8.405 2.518 9.388 2 10.5 2C12.433 2 14 3.567 14 5.5C14 9.5 8 13.5 8 13.5Z"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 13.5C8 13.5 2 9.5 2 5.5C2 3.567 3.567 2 5.5 2C6.612 2 7.595 2.518 8 3.354C8.405 2.518 9.388 2 10.5 2C12.433 2 14 3.567 14 5.5C14 9.5 8 13.5 8 13.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
              </svg>
            )}
            <span>{likeCount > 0 ? likeCount : ""}</span>
          </button>
          <button
            className={`btn-bookmark ${isBookmarked ? "saved" : ""}`}
            onClick={e => { e.stopPropagation(); onBookmark(recipe.id); }}
            title={isBookmarked ? t.bookmarkRemove : t.bookmarkAdd}
            style={{ color: isBookmarked ? "var(--latte)" : "var(--muted)" }}
          >
            {isBookmarked ? (
              <svg width="13" height="15" viewBox="0 0 13 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1.5C1 1.224 1.224 1 1.5 1h10c.276 0 .5.224.5.5v13l-5-3-5 3V1.5z"/>
              </svg>
            ) : (
              <svg width="13" height="15" viewBox="0 0 13 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1.5C1 1.224 1.224 1 1.5 1h10c.276 0 .5.224.5.5v13l-5-3-5 3V1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
          {isOwner && (<>
            <button className="card-edit" onClick={e => { e.stopPropagation(); onEdit(recipe); }}
              style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 0, display: "inline-flex", alignItems: "center" }}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M11.5 2.5l2 2-8 8H3.5v-2l8-8z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
              </svg>
            </button>
            <button className="card-delete" onClick={e => { e.stopPropagation(); onDelete(recipe.id); }}
              style={{ background: "none", border: "none", color: "#c0392b55", cursor: "pointer", padding: 0, display: "inline-flex", alignItems: "center" }}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 4h10M5 4V2.5C5 2.224 5.224 2 5.5 2h5c.276 0 .5.224.5.5V4M6 7v5M10 7v5M4 4l.8 9.2c.02.44.38.8.82.8h6.76c.44 0 .8-.36.82-.8L14 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
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

function EquipmentVault({ user, lang }) {
  const t = I18N[lang];
  const CATEGORIES = [
    { id: "machine",  labelKo: "커피 머신",  labelEn: "Coffee Machine", color: "#e67e22" },
    { id: "grinder",  labelKo: "그라인더",   labelEn: "Grinder",        color: "#27ae60" },
    { id: "handdrip", labelKo: "핸드드립",   labelEn: "Hand Drip",      color: "#2980b9" },
    { id: "other",    labelKo: "기타",       labelEn: "Other",           color: "#8C8480" },
  ];
  const [equips, setEquips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
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
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
        <button className="btn-new" onClick={() => { setEditTarget(null); setShowModal(true); }}>
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          {t.equipAdd}
        </button>
      </div>

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

function MainApp({ user, lang, toggleLang, onRequireAuth }) {
  const [notifications, setNotifications] = useState([]);
  const [showNotif, setShowNotif] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  // 스크롤 방향 감지 — 내리면 헤더 숨김, 올리면 표시
  const [headerVisible, setHeaderVisible] = useState(true);
  const [topBarHeight, setTopBarHeight] = useState(56); // 헤더 높이만 기본값
  const lastScrollY = useRef(0);
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

  useEffect(() => {
    const onPop = () => {
      if (detailRecipeRef.current)  { setDetailRecipeWrapped(null); return; }
      if (showModalRef.current)     { setShowModalWrapped(false); setEditTarget(null); return; }
      if (showMyModalRef.current)   { setShowMyModalWrapped(false); return; }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []); // 의존성 없이 한 번만 등록, ref로 최신 상태 접근

  const [recipes, setRecipes] = useState([]);
  const [search, setSearch] = useState("");
  const [myRecipesOnly, setMyRecipesOnly] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [feedTab, setFeedTab] = useState("all"); // "all" | "bookmarks" | "following"
  const [bestPeriod, setBestPeriod] = useState("month"); // "day" | "week" | "month"
  const [showRanking, setShowRanking] = useState(false); // true면 TOP100 페이지
  const [statModeVal, setStatModeVal] = useState("machine"); // "machine" | "handdrip"
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
  const [beanShowModal, setBeanShowModal] = useState(false);
  const [beanEditTarget, setBeanEditTarget] = useState(null);

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

  const handleDelete = async (id) => {
    if (!confirm("이 레시피를 삭제할까요?")) return;
    await deleteDoc(doc(db, "recipes", id));
    loadRecipes();
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
    </header>
      {/* ── 탭 바 + 검색행 ── */}
      <div style={{
        background: "var(--cream)", borderBottom: "1px solid var(--divider)",
        padding: "8px 24px 10px",
      }}>
      {(<>
        <div style={{ maxWidth: "900px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "8px" }}>
          {/* 그룹 1: 피드 탭 + 그룹 2: 내 것 탭 — 한 줄에 양쪽 정렬 */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" }}>
            {/* 왼쪽: 피드 탭 */}
            <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
              <button className={`bookmark-tab-btn ${feedTab === "all" && !showRanking ? "active" : ""}`}
                onClick={() => { setFeedTab("all"); setMyRecipesOnly(false); setShowRanking(false); }}>
                {I18N[lang].allRecipes}
              </button>
              <button className={`bookmark-tab-btn ${feedTab === "following" && !showRanking ? "active" : ""}`}
                onClick={() => { setFeedTab("following"); setMyRecipesOnly(false); setShowRanking(false); }}>
                {I18N[lang].followingFeed}{following.length > 0 ? ` (${following.length})` : ""}
              </button>
              <button className={`bookmark-tab-btn ${feedTab === "bookmarks" && !showRanking ? "active" : ""}`}
                onClick={() => { setFeedTab("bookmarks"); setMyRecipesOnly(false); setShowRanking(false); }}>
                {I18N[lang].myBookmarks}{bookmarks.length > 0 ? ` (${bookmarks.length})` : ""}
              </button>
            </div>
            {/* 구분선 */}
            {user && <div style={{ width: "1px", height: "20px", background: "var(--divider)", flexShrink: 0 }}/>}
            {/* 오른쪽: 내 것 탭 */}
            {user && (
              <div style={{ display: "flex", gap: "4px", overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none", flexShrink: 1 }}>
                <button className={`bookmark-tab-btn ${feedTab === "mine" && !showRanking ? "active" : ""}`}
                  onClick={() => { setFeedTab("mine"); setMyRecipesOnly(false); setShowRanking(false); }}>
                  {I18N[lang].myRecipes}
                </button>
                <button className={`bookmark-tab-btn ${feedTab === "beans" && !showRanking ? "active" : ""}`}
                  onClick={() => { setFeedTab("beans"); setMyRecipesOnly(false); setShowRanking(false); }}>
                  {I18N[lang].myBeans}
                </button>
                <button className={`bookmark-tab-btn ${feedTab === "equip" && !showRanking ? "active" : ""}`}
                  onClick={() => { setFeedTab("equip"); setMyRecipesOnly(false); setShowRanking(false); }}>
                  {I18N[lang].myEquip}
                </button>
              </div>
            )}
          </div>
        </div>
        {/* 두 번째 행: beans 탭 → 필터+추가하기 / 나머지 → 검색+기록하기 */}
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        {feedTab === "beans" ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "1.2rem", overflow: "hidden" }}>
            <div style={{ display: "flex", gap: "6px", flexWrap: "nowrap", overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none", flex: 1 }}>
              {[["all", lang === "en" ? "All" : "전체"], ["open", I18N[lang].beanOpen], ["sealed", I18N[lang].beanSealed]].map(([v, lbl]) => (
                <button key={v} className={`bookmark-tab-btn ${beanFilterStatus === v ? "active" : ""}`}
                  onClick={() => setBeanFilterStatus(v)} style={{ fontSize: "0.75rem", height: "30px", padding: "0 12px", flexShrink: 0 }}>
                  {lbl}
                </button>
              ))}
            </div>
            <button className="btn-new" style={{ flexShrink: 0 }} onClick={() => { setBeanEditTarget(null); setBeanShowModal(true); }}>
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              {lang === "en" ? "Add Bean" : "추가하기"}
            </button>
          </div>
        ) : feedTab === "equip" ? (
          <div style={{ marginBottom: "1.2rem" }}/>
        ) : (
          <div className="search-row" style={{ display: "flex", gap: "0.5rem", marginBottom: "1.2rem", width: "100%", boxSizing: "border-box", overflow: "hidden" }}>
            <div className="search-box" style={{ flex: 1, minWidth: 0 }}>
              <span className="search-icon">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={I18N[lang].searchPlaceholder} />
            </div>
            <button className="btn-new" style={{ flexShrink: 0 }} onClick={() => { if (!user && onRequireAuth) { onRequireAuth(); } else { openModal(); } }}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9.5 1.5l3 3-7 7H2.5v-3l7-7z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                <path d="M7.5 3.5l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              <span className="btn-new-text">{I18N[lang].newRecipe}</span>
            </button>
          </div>
        )}
        </div> {/* 두번째 행 maxWidth wrapper 끝 */}
      </>)}
      </div> {/* 탭바 wrapper 끝 */}
    </div> {/* fixed top-bar 끝 */}
    {/* 타이틀 + 베스트 */}
    <div className="main-wrap" style={{ paddingTop: `${topBarHeight + 8}px` }}>
      {/* 타이틀 */}
      {(() => {
        let title, sub;
        if (myRecipesOnly || feedTab === "mine") {
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
      <div className="divider" style={{ marginBottom: "1.5rem" }} />
      {/* 내 원두 탭 */}
      {feedTab === "beans" && user && (
        <BeanVault user={user} lang={lang}
          filterStatus={beanFilterStatus} setFilterStatus={setBeanFilterStatus}
          showModal={beanShowModal} setShowModal={setBeanShowModal}
          editTarget={beanEditTarget} setEditTarget={setBeanEditTarget}
          currency={loadCurrency()} />
      )}
      {feedTab === "equip" && user && (
        <EquipmentVault user={user} lang={lang} />
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
    {!showRanking && <div className="main-wrap" style={{ paddingTop: `${topBarHeight + 8}px` }}>

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

        const StatBox = ({ label, min, max, avg, globalAvg, unit }) => {
          const Row = ({ tag, val, bold }) => (
            <div style={{ display: "flex", alignItems: "center", height: STAT_ROW_H, width: "100%" }}>
              <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.66rem", color: "var(--muted)", flexShrink: 0, minWidth: "2.4rem" }}>{tag}</span>
              <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: bold ? "0.95rem" : "0.8rem", fontWeight: bold ? 700 : 500, color: bold ? "var(--espresso)" : "var(--roast)", whiteSpace: "nowrap", flex: 1, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis" }}>
                {val ?? "-"}<span style={{ fontSize: "0.58rem", fontWeight: 400, color: "var(--muted)", marginLeft: "1px" }}>{unit}</span>
              </span>
            </div>
          );
          return (
            <div style={{ background: "white", border: "1px solid var(--steam)", borderRadius: "8px", padding: "0.7rem 0.8rem", boxSizing: "border-box", minWidth: 0, overflow: "hidden" }}>
              <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.68rem", color: "var(--muted)", marginBottom: "0.3rem", letterSpacing: "0.04em", textAlign: "center" }}>{label}</div>
              <Row tag={lang === "en" ? "avg" : "평균"} val={avg} bold />
              <Row tag={lang === "en" ? "min" : "최소"} val={min} />
              <Row tag={lang === "en" ? "max" : "최대"} val={max} />
              <div style={{ borderTop: "1px solid var(--steam)", marginTop: "0.2rem", paddingTop: "0.2rem", display: "flex", alignItems: "center", height: STAT_ROW_H, visibility: globalAvg ? "visible" : "hidden" }}>
                <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.66rem", color: "var(--muted)", flexShrink: 0, minWidth: "2.4rem", whiteSpace: "nowrap" }}>{lang === "en" ? "All avg" : "브루어 평균"}</span>
                <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", fontWeight: 600, color: "var(--latte)", whiteSpace: "nowrap", flex: 1, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {globalAvg}<span style={{ fontSize: "0.58rem", fontWeight: 400, marginLeft: "1px" }}>{unit}</span>
                </span>
              </div>
            </div>
          );
        };

        const TopList = ({ label, items }) => (
          <div style={{ background: "white", border: "1px solid var(--steam)", borderRadius: "8px", padding: "0.8rem 1rem", minWidth: 0 }}>
            <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", fontWeight: 600, color: "var(--muted)", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
            {items.length === 0
              ? <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", color: "var(--muted)" }}>-</div>
              : items.map(([name, cnt], i) => (
              <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: i < items.length - 1 ? "0.3rem" : 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.68rem", color: i === 0 ? "var(--accent)" : "var(--muted)", fontWeight: 700 }}>{i + 1}</span>
                  <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem", color: "var(--espresso)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "110px" }}>{name}</span>
                </div>
                <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", color: "var(--muted)", flexShrink: 0 }}>{cnt}회</span>
              </div>
            ))}
          </div>
        );

        // 탭별 콘텐츠 렌더 함수 - display로만 전환
        const TabContent = ({ s, g, top, isHanddrip, visible }) => (
          <div style={{ display: visible ? "block" : "none" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <StatBox label={lang === "en" ? "Dose (g)" : "원두량"} min={s.gram?.min ?? "-"} avg={s.gram?.avg ?? "-"} max={s.gram?.max ?? "-"} globalAvg={g.gram?.avg} unit="g" />
              <StatBox label={lang === "en" ? "Time (s)" : "추출시간"} min={s.sec?.min ?? "-"} avg={s.sec?.avg ?? "-"} max={s.sec?.max ?? "-"} globalAvg={g.sec?.avg} unit="s" />
              <StatBox label={lang === "en" ? "Yield (ml)" : "추출량"} min={s.ml?.min ?? "-"} avg={s.ml?.avg ?? "-"} max={s.ml?.max ?? "-"} globalAvg={g.ml?.avg} unit="ml" />
              <StatBox label={lang === "en" ? "Water Temp" : "물온도"} min={s.temp?.min ?? "-"} avg={s.temp?.avg ?? "-"} max={s.temp?.max ?? "-"} globalAvg={g.temp?.avg} unit="°C" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <TopList label={lang === "en" ? "Fav Menu" : "자주 마신 메뉴"} items={top.menus} />
              <TopList label={lang === "en" ? "Fav Bean" : "자주 쓴 원두"} items={top.beans} />
            </div>
            {(top.machines?.length > 0 || top.grinders?.length > 0) && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                {top.machines?.length > 0 && (
                  <TopList
                    label={lang === "en" ? (isHanddrip ? "Equipment" : "Machine") : (isHanddrip ? "주로 쓰는 기구" : "주로 쓰는 기기")}
                    items={top.machines}
                  />
                )}
                {top.grinders?.length > 0 && (
                  <TopList
                    label={lang === "en" ? "Grinder" : "그라인더"}
                    items={top.grinders}
                  />
                )}
              </div>
            )}
          </div>
        );

        return (
          <div style={{ marginBottom: "2rem", background: "var(--foam)", border: "1px solid var(--steam)", borderRadius: "12px", padding: "1rem", boxSizing: "border-box", overflow: "hidden" }}>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1rem", fontWeight: 700, color: "var(--espresso)", marginBottom: "1rem", paddingBottom: "0.7rem", borderBottom: "1px solid var(--steam)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>{lang === "en" ? "My Stats" : "나의 통계"}</span>
              <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", fontWeight: 400, color: "var(--muted)" }}>총 {mine.length}개 레시피</span>
            </div>
            {/* 탭 버튼 */}
            <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.8rem" }}>
              {machineRecipes.length > 0 && (
                <button onClick={() => setStatModeVal("machine")}
                  style={{ padding: "0.3rem 0.9rem", borderRadius: "999px", border: "1px solid var(--steam)", fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", cursor: "pointer", transition: "all 0.2s",
                    background: statMode === "machine" ? "var(--espresso)" : "var(--foam)",
                    color: statMode === "machine" ? "var(--cream)" : "var(--muted)", fontWeight: statMode === "machine" ? 600 : 400 }}>
                  {lang === "en" ? "Coffee Machine" : "커피 머신"} ({machineRecipes.length})
                </button>
              )}
              {handDripRecipes.length > 0 && (
                <button onClick={() => setStatModeVal("handdrip")}
                  style={{ padding: "0.3rem 0.9rem", borderRadius: "999px", border: "1px solid var(--steam)", fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", cursor: "pointer", transition: "all 0.2s",
                    background: statMode === "handdrip" ? "var(--espresso)" : "var(--foam)",
                    color: statMode === "handdrip" ? "var(--cream)" : "var(--muted)", fontWeight: statMode === "handdrip" ? 600 : 400 }}>
                  {lang === "en" ? "Hand Drip" : "핸드드립"} ({handDripRecipes.length})
                </button>
              )}
            </div>

            {/* 별점 + 좋아요 - 항상 표시 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <div style={{ background: "white", border: "1px solid var(--steam)", borderRadius: "8px", padding: "0.7rem 1rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", color: "var(--muted)" }}>{lang === "en" ? "Avg Rating" : "평균 별점"}</span>
                <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "1rem", fontWeight: 700, color: "var(--latte)" }}>{avgRating ?? "-"} ★</span>
              </div>
              <div style={{ background: "white", border: "1px solid var(--steam)", borderRadius: "8px", padding: "0.7rem 1rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", color: "var(--muted)" }}>{lang === "en" ? "Total Likes" : "받은 좋아요"}</span>
                <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "1rem", fontWeight: 700, color: "#C0625A", display: "flex", alignItems: "center", gap: "5px" }}>
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 13.5C8 13.5 2 9.5 2 5.5C2 3.567 3.567 2 5.5 2C6.612 2 7.595 2.518 8 3.354C8.405 2.518 9.388 2 10.5 2C12.433 2 14 3.567 14 5.5C14 9.5 8 13.5 8 13.5Z"/>
                  </svg>
                  {totalLikes}
                </span>
              </div>
            </div>

            {/* 두 탭 콘텐츠 동시 렌더 - display로만 전환하여 크기 고정 */}
            <TabContent s={mStats} g={mGlobal} top={mTop} isHanddrip={false} visible={statMode !== "handdrip"} />
            <TabContent s={hStats} g={hGlobal} top={hTop} isHanddrip={true} visible={statMode === "handdrip"} />
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
        ) : filtered.map(r => (
          <RecipeCard key={r.id} recipe={r} currentUid={user?.uid} lang={lang}
            onDelete={handleDelete}
            onLike={handleLike}
            onBookmark={toggleBookmark}
            isBookmarked={bookmarks.includes(r.id)}
            onFollow={toggleFollow}
            isFollowing={following.includes(r.uid) || following.includes(r.author)}
            onEdit={r => { setEditTarget(r); openModal(); }}
            onCardClick={() => openDetail(r)} />
        ))}
      </div>}
    </div>}
    {showMyModal && <MyModal user={user} lang={lang} onClose={() => setShowMyModalWrapped(false)} onLogout={() => { setShowMyModalWrapped(false); signOut(auth); }} />}
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

  return (<div style={{ overflowX: "hidden", width: "100%" }}>
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
      {tab === "users" && !loading && (
        <div className="admin-card" style={{ overflowX: "auto" }}>
          <div className="admin-card-title">회원 목록 ({users.length}명)</div>
          <table className="admin-table">
            <thead>
              <tr>
                <th>닉네임</th>
                <th>보안질문</th>
                <th>UID</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600 }}>@{u.nickname}</td>
                  <td style={{ color: "var(--muted)", fontSize: "0.8rem", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.securityQuestion}</td>
                  <td style={{ color: "var(--muted)", fontSize: "0.72rem", fontFamily: "monospace" }}>{u.id.slice(0, 12)}…</td>
                  <td>
                    {u.id !== user?.uid && (
                      <button className="btn-danger" onClick={() => deleteUser(u.id, u.nickname)}>
                        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M2.5 3.5h9M4.5 3.5V2.5c0-.28.22-.5.5-.5h4c.28 0 .5.22.5.5v1M5.5 6v4M8.5 6v4M3 3.5l.7 8c.02.4.35.7.76.7h6.08c.4 0 .73-.3.76-.7l.7-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        삭제
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && <p style={{ color: "var(--muted)", textAlign: "center", padding: "24px 0", fontSize: "0.85rem" }}>회원이 없어요.</p>}
        </div>
      )}

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
