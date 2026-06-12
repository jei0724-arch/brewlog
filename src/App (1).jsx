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
  body { font-family: 'DM Sans', sans-serif; background: var(--cream); color: var(--espresso); min-height: 100vh; -webkit-font-smoothing: antialiased; overflow-x: hidden; overscroll-behavior-x: none; }
  html { overflow-x: hidden; overscroll-behavior-x: none; }

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
    padding: 7px 14px;
    border: 1px solid var(--steam); border-radius: 8px; background: var(--foam);
    font-family: 'DM Sans', sans-serif; font-size: 0.8rem; color: var(--muted);
    cursor: pointer; transition: all 0.2s; white-space: nowrap;
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
    cursor: pointer; transition: background 0.15s;
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
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .modal {
    background: var(--foam); border: 1px solid var(--steam); border-radius: 8px;
    padding: 32px 28px; width: 100%; max-width: 500px; max-height: 90vh;
    overflow-y: auto; overflow-x: hidden; position: relative; animation: slideUp 0.2s ease;
    text-align: left; box-shadow: 0 24px 48px #1A1A1A10;
    touch-action: pan-y; overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
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
          {lang === "en" ? PRIVACY_POLICY_EN : PRIVACY_POLIC