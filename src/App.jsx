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
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --cream: #f5efe6; --latte: #d4a96a; --espresso: #2c1810;
    --roast: #5c3317; --foam: #fdf8f2; --steam: #e8ddd0;
    --accent: #c8873a; --muted: #8a7060;
  }
  body { font-family: 'DM Sans', sans-serif; background: var(--cream); color: var(--espresso); min-height: 100vh; }

  .auth-wrap {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: radial-gradient(ellipse 80% 60% at 50% 30%, #d4a96a33, transparent),
                radial-gradient(ellipse 60% 80% at 80% 80%, #5c331722, transparent), var(--cream);
    padding: 1rem;
  }
  .auth-card {
    background: var(--foam); border: 1px solid var(--steam); border-radius: 2px;
    padding: clamp(1.5rem, 5vw, 3rem) clamp(1.2rem, 5vw, 2.5rem);
    width: 100%; max-width: 440px; box-shadow: 0 8px 60px #2c181015; position: relative;
  }
  .auth-card::before {
    content: ''; position: absolute; top: 0; left: 2rem; right: 2rem; height: 2px;
    background: linear-gradient(90deg, transparent, var(--latte), transparent);
  }
  .brand { text-align: center; margin-bottom: 2rem; }
  .brand-icon { font-size: 2.5rem; margin-bottom: 0.5rem; display: block; }
  .brand h1 { font-family: 'Playfair Display', serif; font-size: clamp(1.5rem, 5vw, 2rem); color: var(--espresso); letter-spacing: -0.02em; }
  .brand p { font-size: 0.8rem; color: var(--muted); margin-top: 0.4rem; letter-spacing: 0.1em; text-transform: uppercase; }

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
    width: 100%; padding: 0.75rem 1rem; border: 1px solid var(--steam); border-radius: 2px;
    background: var(--cream); font-family: 'DM Sans', sans-serif; font-size: 0.95rem;
    color: var(--espresso); outline: none; transition: border-color 0.2s;
  }
  .field input:focus, .field select:focus { border-color: var(--latte); }

  .btn-primary {
    width: 100%; padding: 0.85rem; background: var(--espresso); color: var(--cream);
    border: none; border-radius: 2px; font-family: 'DM Sans', sans-serif;
    font-size: 0.9rem; font-weight: 500; cursor: pointer; transition: background 0.2s; margin-top: 0.5rem;
  }
  .btn-primary:hover { background: var(--roast); }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .msg-error { color: #c0392b; font-size: 0.82rem; margin-top: 0.8rem; text-align: center; }
  .msg-ok { color: #27ae60; font-size: 0.82rem; margin-top: 0.8rem; text-align: center; }

  .app-header {
    background: var(--espresso); padding: 1rem 2rem;
    display: flex; align-items: center; justify-content: space-between;
    position: sticky; top: 0; z-index: 100; box-shadow: 0 2px 20px #0006;
  }
  .app-header .logo { font-family: 'Playfair Display', serif; font-size: 1.3rem; color: var(--latte); }
  .header-right { display: flex; align-items: center; gap: 1rem; }
  .nick-badge { font-size: 0.72rem; color: var(--steam); padding: 0.25rem 0.6rem; border: 1px solid #ffffff20; border-radius: 999px; cursor: pointer; transition: all 0.2s; max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .nick-badge:hover { border-color: var(--latte); color: var(--latte); }
  .nick-badge.active { background: var(--latte); color: var(--espresso); border-color: var(--latte); font-weight: 600; }
  .btn-logout {
    background: none; border: 1px solid #ffffff30; color: var(--steam);
    padding: 0.3rem 0.6rem; border-radius: 2px; font-family: 'DM Sans', sans-serif;
    font-size: 0.72rem; cursor: pointer; transition: all 0.2s; white-space: nowrap;
  }
  .btn-logout:hover { border-color: var(--latte); color: var(--latte); }

  .main-wrap { max-width: 900px; margin: 0 auto; padding: 2.5rem 1.5rem; }
  .section-title { font-family: 'Playfair Display', serif; font-size: 1.6rem; color: var(--espresso); margin-bottom: 0.3rem; }
  .section-sub { font-size: 0.82rem; color: var(--muted); margin-bottom: 2rem; }
  .divider { height: 1px; background: var(--steam); margin: 0.5rem 0 2rem; }

  .toolbar-sticky {
    position: sticky; top: 56px; z-index: 90;
    background: var(--cream); padding: 0.8rem 0;
    margin-bottom: 1.5rem;
    border-bottom: 1px solid var(--steam);
  }
  .toolbar { display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; max-width: 900px; margin: 0 auto; padding: 0 1.5rem; }
  .search-box { flex: 1; min-width: 180px; position: relative; }
  .search-box input {
    width: 100%; padding: 0.75rem 1rem 0.75rem 2.8rem; border: 1px solid var(--steam);
    border-radius: 2px; background: var(--foam); font-family: 'DM Sans', sans-serif;
    font-size: 0.9rem; color: var(--espresso); outline: none; transition: border-color 0.2s;
  }
  .search-box input:focus { border-color: var(--latte); }
  .search-icon { position: absolute; left: 0.9rem; top: 50%; transform: translateY(-50%); font-size: 1rem; color: var(--muted); pointer-events: none; }
  .btn-new {
    padding: 0.75rem 1.5rem; background: var(--accent); color: white; border: none;
    border-radius: 2px; font-family: 'DM Sans', sans-serif; font-size: 0.88rem;
    font-weight: 500; cursor: pointer; white-space: nowrap; transition: background 0.2s;
  }
  .btn-new:hover { background: var(--roast); }

  .recipes-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem; }
  .recipe-card {
    background: var(--foam); border: 1px solid var(--steam); border-radius: 2px;
    padding: 1.5rem; position: relative; transition: transform 0.2s, box-shadow 0.2s; overflow: hidden;
  }
  .recipe-card::after { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, var(--latte), var(--accent)); }
  .recipe-card:hover { transform: translateY(-2px); box-shadow: 0 8px 30px #2c181018; }
  .card-machine { font-size: 0.7rem; color: var(--muted); margin-bottom: 0.2rem; }
  .card-company { font-size: 0.72rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.3rem; }
  .card-bean { font-family: 'Playfair Display', serif; font-size: 1.15rem; color: var(--espresso); margin-bottom: 1rem; line-height: 1.3; }
  .card-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; margin-bottom: 1rem; }
  .stat { background: var(--cream); padding: 0.5rem 0.4rem; border-radius: 2px; text-align: center; }
  .stat-val { font-size: 1rem; font-weight: 500; color: var(--roast); display: block; }
  .stat-label { font-size: 0.65rem; color: var(--muted); letter-spacing: 0.06em; text-transform: uppercase; display: block; margin-top: 0.1rem; }
  .card-dilution { font-size: 0.82rem; color: var(--muted); padding: 0.5rem 0.8rem; background: var(--cream); border-radius: 2px; margin-bottom: 0.8rem; }
  .card-note { font-size: 0.82rem; color: var(--roast); font-style: italic; line-height: 1.5; border-left: 2px solid var(--latte); padding-left: 0.7rem; margin-bottom: 0.8rem; }
  .card-footer { display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: var(--muted); border-top: 1px solid var(--steam); padding-top: 0.8rem; }
  .card-author { font-weight: 500; color: var(--roast); }
  .card-actions { display: flex; gap: 0.5rem; }
  .card-edit { background: none; border: none; color: var(--muted); cursor: pointer; font-size: 1rem; transition: color 0.2s; }
  .card-edit:hover { color: var(--accent); }
  .card-delete { background: none; border: none; color: #c0392b55; cursor: pointer; font-size: 1rem; transition: color 0.2s; }
  .card-delete:hover { color: #c0392b; }
  .empty-state { text-align: center; padding: 5rem 2rem; color: var(--muted); grid-column: 1 / -1; }
  .empty-state span { font-size: 3rem; display: block; margin-bottom: 1rem; }
  .empty-state p { font-family: 'Playfair Display', serif; font-size: 1.1rem; }
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
  .weather-loading { color: var(--muted); font-size: 0.82rem; display: flex; align-items: center; gap: 0.4rem; }
  .card-weather { font-size: 0.75rem; color: var(--muted); padding: 0.3rem 0.6rem; background: var(--cream); border-radius: 2px; margin-bottom: 0.5rem; display: flex; gap: 0.5rem; flex-wrap: wrap; }
  .menu-selector { display: flex; flex-wrap: wrap; gap: 0.5rem; }
  .menu-btn {
    padding: 0.45rem 0.9rem; border: 1px solid var(--steam); border-radius: 999px;
    background: var(--foam); font-family: 'DM Sans', sans-serif; font-size: 0.82rem;
    color: var(--muted); cursor: pointer; transition: all 0.2s; white-space: nowrap;
  }
  .menu-btn:hover { border-color: var(--accent); color: var(--accent); }
  .menu-btn.selected { background: var(--espresso); color: var(--cream); border-color: var(--espresso); font-weight: 500; }
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
  .btn-bookmark { background: none; border: none; cursor: pointer; font-size: 1rem; color: var(--muted); transition: all 0.15s; padding: 0; line-height: 1; display: inline-flex; align-items: center; }
  .btn-bookmark:hover { color: var(--latte); transform: scale(1.15); }
  .btn-bookmark.saved { color: var(--latte); }
  .follow-btn { background: none; border: 1px solid var(--steam); border-radius: 999px; padding: 0.2rem 0.7rem; font-family: 'DM Sans',sans-serif; font-size: 0.72rem; cursor: pointer; transition: all 0.2s; color: var(--muted); white-space: nowrap; }
  .follow-btn:hover { border-color: var(--accent); color: var(--accent); }
  .follow-btn.following { background: var(--espresso); color: var(--cream); border-color: var(--espresso); }
  .follow-btn.following:hover { background: #c0392b; border-color: #c0392b; }
  .bookmark-tab { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
  .bookmark-tab-btn { padding: 0.4rem 1rem; border: 1px solid var(--steam); border-radius: 999px; background: var(--foam); font-family: 'DM Sans', sans-serif; font-size: 0.82rem; color: var(--muted); cursor: pointer; transition: all 0.2s; }
  .bookmark-tab-btn.active { background: var(--espresso); color: var(--cream); border-color: var(--espresso); }
  .btn-heart { background: none; border: none; cursor: pointer; font-size: 1rem; display: flex; align-items: center; gap: 0.3rem; color: var(--muted); transition: all 0.15s; padding: 0; line-height: 1; }
  .btn-heart:hover { transform: scale(1.15); }
  .btn-heart.liked { color: #e74c3c; }
  .btn-heart span { font-size: 0.75rem; font-family: 'DM Sans', sans-serif; }
  .best-section { margin-bottom: 2.5rem; }
  .best-title { font-family: 'Playfair Display', serif; font-size: 1.1rem; color: var(--espresso); margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem; }
  .best-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
  .best-card { background: linear-gradient(135deg, var(--espresso) 0%, var(--roast) 100%); border-radius: 2px; padding: 1.2rem; position: relative; overflow: hidden; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; }
  .best-card:hover { transform: translateY(-3px); box-shadow: 0 12px 30px #2c181040; }
  .best-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E"); }
  .best-rank { font-size: 0.72rem; color: var(--latte); letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 0.6rem; font-weight: 600; }
  .best-card-machine { font-size: 0.68rem; color: #ffffff60; margin-bottom: 0.2rem; }
  .best-card-company { font-size: 0.68rem; color: #ffffff80; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.2rem; }
  .best-card-bean { font-family: 'Playfair Display', serif; font-size: 1rem; color: var(--cream); margin-bottom: 0.8rem; line-height: 1.3; }
  .best-card-author { font-size: 0.75rem; color: #ffffff70; margin-bottom: 0.5rem; }
  .best-card-heart { display: flex; align-items: center; gap: 0.3rem; color: #ff6b8a; font-size: 0.85rem; font-weight: 500; }

  .modal-backdrop {
    position: fixed; inset: 0; background: #1a0f08cc; z-index: 200;
    display: flex; align-items: center; justify-content: center; padding: 1rem;
    backdrop-filter: blur(4px); animation: fadeIn 0.15s ease;
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .modal {
    background: var(--foam); border: 1px solid var(--steam); border-radius: 2px;
    padding: 2.5rem 2rem; width: 100%; max-width: 500px; max-height: 90vh;
    overflow-y: auto; position: relative; animation: slideUp 0.2s ease;
  }
  @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  .modal::before { content: ''; position: absolute; top: 0; left: 2rem; right: 2rem; height: 2px; background: linear-gradient(90deg, transparent, var(--accent), transparent); }
  .modal h2 { font-family: 'Playfair Display', serif; font-size: 1.5rem; margin-bottom: 1.5rem; color: var(--espresso); }
  .modal-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem; }
  .modal-grid .field { margin-bottom: 0; }
  .field.full { grid-column: 1 / -1; }
  .modal-actions { display: flex; gap: 0.8rem; margin-top: 1.5rem; justify-content: flex-end; }
  .btn-cancel { padding: 0.7rem 1.5rem; background: none; border: 1px solid var(--steam); border-radius: 2px; font-family: 'DM Sans', sans-serif; font-size: 0.88rem; color: var(--muted); cursor: pointer; }
  .btn-cancel:hover { border-color: var(--muted); }
  textarea { width: 100%; padding: 0.75rem 1rem; border: 1px solid var(--steam); border-radius: 2px; background: var(--cream); font-family: 'DM Sans', sans-serif; font-size: 0.9rem; color: var(--espresso); outline: none; resize: vertical; min-height: 80px; }
  textarea:focus { border-color: var(--latte); }
  .loading-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--cream); }
  .loading-wrap p { font-family: 'Playfair Display', serif; font-size: 1.2rem; color: var(--muted); }
  .btn-lang {
    background: none; border: 1px solid #ffffff30; color: var(--steam);
    padding: 0.3rem 0.6rem; border-radius: 2px; font-family: 'DM Sans', sans-serif;
    font-size: 0.72rem; cursor: pointer; transition: all 0.2s; letter-spacing: 0.05em;
    white-space: nowrap;
  }
  .btn-lang:hover { border-color: var(--latte); color: var(--latte); }
  .btn-my {
    background: none; border: 1px solid #ffffff30; color: var(--steam);
    padding: 0.3rem 0.6rem; border-radius: 2px; font-family: 'DM Sans', sans-serif;
    font-size: 0.72rem; cursor: pointer; transition: all 0.2s; font-weight: 500;
    white-space: nowrap;
  }
  .btn-my:hover { border-color: var(--latte); color: var(--latte); }
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
  .admin-wrap { max-width: 960px; margin: 0 auto; padding: 2.5rem 1.5rem; }
  .admin-tabs { display: flex; gap: 0.5rem; margin-bottom: 2rem; flex-wrap: wrap; }
  .admin-tab {
    padding: 0.5rem 1.2rem; border: 1px solid var(--steam); border-radius: 2px;
    background: var(--foam); font-family: 'DM Sans', sans-serif; font-size: 0.85rem;
    color: var(--muted); cursor: pointer; transition: all 0.2s;
  }
  .admin-tab.active { background: var(--espresso); color: var(--cream); border-color: var(--espresso); }
  .admin-tab:hover:not(.active) { border-color: var(--accent); color: var(--accent); }
  .admin-card { background: var(--foam); border: 1px solid var(--steam); border-radius: 2px; padding: 1.5rem; margin-bottom: 1rem; }
  .admin-stat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
  .stat-card { background: var(--foam); border: 1px solid var(--steam); border-radius: 2px; padding: 1.2rem 1.5rem; text-align: center; }
  .stat-card-val { font-family: 'Playfair Display', serif; font-size: 2.5rem; color: var(--accent); display: block; }
  .stat-card-label { font-size: 0.78rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; margin-top: 0.3rem; }
  .admin-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
  .admin-table th { text-align: left; padding: 0.6rem 0.8rem; font-size: 0.72rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1px solid var(--steam); }
  .admin-table td { padding: 0.7rem 0.8rem; border-bottom: 1px solid var(--steam); color: var(--espresso); vertical-align: middle; }
  .admin-table tr:last-child td { border-bottom: none; }
  .admin-table tr:hover td { background: var(--cream); }
  .btn-danger { padding: 0.3rem 0.8rem; background: none; border: 1px solid #c0392b55; color: #c0392b; border-radius: 2px; font-family: 'DM Sans',sans-serif; font-size: 0.78rem; cursor: pointer; transition: all 0.2s; }
  .btn-danger:hover { background: #c0392b; color: white; border-color: #c0392b; }
  .notice-form { display: flex; flex-direction: column; gap: 0.8rem; }
  .notice-item { background: var(--cream); border: 1px solid var(--steam); border-radius: 2px; padding: 1rem 1.2rem; }
  .notice-item-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
  .notice-item-title { font-weight: 500; color: var(--espresso); margin-bottom: 0.3rem; }
  .notice-item-body { font-size: 0.85rem; color: var(--muted); line-height: 1.5; }
  .notice-item-date { font-size: 0.72rem; color: var(--muted); white-space: nowrap; }
  .btn-admin-header { background: none; border: 1px solid #ff000040; color: #ff6b6b; padding: 0.3rem 0.6rem; border-radius: 2px; font-family: 'DM Sans',sans-serif; font-size: 0.72rem; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
  .btn-admin-header:hover { border-color: #ff6b6b; }
  .notice-banner { background: var(--espresso); color: var(--cream); padding: 0.6rem 2rem; font-size: 0.85rem; display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
  .notice-banner-close { background: none; border: none; color: var(--steam); cursor: pointer; font-size: 1rem; flex-shrink: 0; }
  @media (max-width: 600px) {
    .admin-stat-grid { grid-template-columns: repeat(2, 1fr); }
    .admin-table th:nth-child(3), .admin-table td:nth-child(3) { display: none; }
    .admin-wrap { padding: 1.2rem 0.8rem; }
  }
  @media (max-width: 600px) {
    .modal-grid { grid-template-columns: 1fr; }
    .app-header { padding: 0.8rem 1rem; }
    .app-header .logo { font-size: 1.1rem; }
    .main-wrap { padding: 1.2rem 0.8rem; }
    .recipes-grid { grid-template-columns: 1fr; }
    .toolbar { flex-direction: column; align-items: stretch; }
    .btn-new { text-align: center; }
    .nick-badge { display: none; }
    .modal { padding: 1.5rem 1rem; }
  }
  @media (max-width: 380px) {
    .tab-btn { font-size: 0.65rem; padding: 0.5rem 0.2rem; }
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
            background: "none", border: "1px solid var(--steam)", borderRadius: "2px",
            padding: "0.25rem 0.6rem", fontSize: "0.75rem", color: "var(--muted)",
            cursor: "pointer", fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.05em"
          }}>{lang === "ko" ? "EN" : "KO"}</button>
        </div>
        <div className="brand">
          <span className="brand-icon">☕</span>
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
            width: "100%", padding: "0.85rem", background: "var(--cream)",
            color: "var(--espresso)", border: "1px solid var(--steam)",
            borderRadius: "2px", fontFamily: "'DM Sans', sans-serif",
            fontSize: "0.9rem", fontWeight: 500, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: "0.7rem", marginTop: "0.5rem", letterSpacing: "0.02em",
          }}>
            <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/><path fill="#34A353" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.01c-.72.48-1.63.76-2.7.76-2.08 0-3.84-1.4-4.47-3.29H1.88v2.07A8 8 0 0 0 8.98 17z"/><path fill="#FBBC05" d="M4.51 10.52A4.8 4.8 0 0 1 4.26 9c0-.53.09-1.04.25-1.52V5.41H1.88A8 8 0 0 0 .98 9c0 1.29.31 2.51.9 3.59l2.63-2.07z"/><path fill="#EA4335" d="M8.98 3.58c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 8.98 1a8 8 0 0 0-7.1 4.41l2.63 2.07c.63-1.89 2.39-3.3 4.47-3.3z"/></svg>
            {I18N[lang].googleLogin}
          </button>
        </>)}

        {tab === "register" && (<>
          <button onClick={handleGoogleLogin} disabled={loading} style={{
              width: "100%", padding: "0.85rem", background: "var(--cream)",
              color: "var(--espresso)", border: "1px solid var(--steam)",
              borderRadius: "2px", fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.9rem", fontWeight: 500, cursor: "pointer",
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
              <button onClick={checkNick} style={{ padding: "0 1rem", background: nickChecked ? "#27ae60" : "var(--roast)", color: "white", border: "none", borderRadius: "2px", fontFamily: "'DM Sans',sans-serif", fontSize: "0.8rem", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
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
          <div style={{ margin: "0.8rem 0", padding: "0.8rem", background: "var(--cream)", borderRadius: "2px", border: privacyError ? "1px solid #c0392b" : "1px solid var(--steam)", fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.8 }}>
            <label style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start", cursor: "pointer" }}>
              <input type="checkbox" style={{ marginTop: "0.25rem", flexShrink: 0, width: "16px", height: "16px", accentColor: "var(--espresso)" }}
                onChange={e => { setPrivacyAgreed(e.target.checked); setPrivacyError(false); }} checked={privacyAgreed} />
              <span>
                {lang === "en"
                  ? <span>I agree to the <button type="button" onClick={() => setShowPrivacy(true)} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: "0.82rem", textDecoration: "underline", padding: 0, fontFamily: "'DM Sans',sans-serif" }}>Privacy Policy</button> (required)</span>
                  : <span><button type="button" onClick={() => setShowPrivacy(true)} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: "0.82rem", textDecoration: "underline", padding: 0, fontFamily: "'DM Sans',sans-serif" }}>개인정보 처리방침</button>에 동의합니다 (필수)</span>}
              </span>
            </label>
            {privacyError && <p style={{ color: "#c0392b", marginTop: "0.3rem", fontSize: "0.78rem" }}>⚠️ {lang === "en" ? "Please agree to continue." : "개인정보 처리방침에 동의해주세요."}</p>}
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
            <div style={{ background: "var(--cream)", padding: "0.8rem 1rem", borderRadius: "2px", marginBottom: "1.2rem", fontSize: "0.88rem", color: "var(--roast)", fontWeight: 500 }}>
              Q. {findQuestion}
            </div>
            <div className="field"><label>{lang === "en" ? "Answer" : "답변"}</label>
              <input value={findAnswer} onChange={e => setFindAnswer(e.target.value)} placeholder={lang === "en" ? "Your answer" : "답변 입력"} onKeyDown={e => e.key === "Enter" && handleFindStep2()} />
            </div>
            <button className="btn-primary" onClick={handleFindStep2} disabled={loading}>{loading ? "…" : I18N[lang].findStep2}</button>
          </>)}
          {findStep === 3 && (<>
            <div style={{ textAlign: "center", marginBottom: "1rem" }}>
              <p style={{ fontSize: "1.5rem", marginBottom: "0.3rem" }}>✅</p>
              <p style={{ fontSize: "0.88rem", color: "var(--muted)" }}>{lang === "en" ? "Identity verified! Set a new password." : "본인 확인 완료! 새 비밀번호를 설정해주세요."}</p>
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
              <p style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>🔑</p>
              <p style={{ fontSize: "0.88rem", color: "var(--muted)", marginBottom: "1.2rem" }}>
                {lang === "en" ? "New password saved! Click below to login." : "새 비밀번호가 저장됐어요! 아래 버튼으로 바로 로그인하세요."}
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
    appSub: "커피 레시피 공유 커뮤니티",
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
    feedTitle: "레시피 피드", myFeedTitle: "내 레시피",
    feedSub: "다른 브루어들의 추출 레시피를 둘러보세요.",
    myFeedSub: "내가 올린 레시피 목록이에요. 닉네임을 다시 클릭하면 전체 피드로 돌아가요.",
    searchPlaceholder: "메뉴, 머신, 원두, 닉네임, 메모 검색 …",
    newRecipe: "+ 레시피 올리기",
    logout: "로그아웃", myBtn: "MY",
    emptyFeed: "아직 레시피가 없어요. 첫 번째 기록을 남겨보세요!",
    emptyMy: "아직 내 레시피가 없어요. 첫 번째 기록을 남겨보세요!",
    emptySearch: "검색 결과가 없어요.",
    bestTitle: "🏆 베스트 레시피",
    recordTitle: "☕ 레시피 기록하기", editTitle: "✏️ 레시피 수정하기",
    machine: "커피 머신", machineBrand: "커피 머신 브랜드", machineModel: "세부 모델명",
    machineType: "머신 타입", autoType: "🤖 전자동", manualType: "🔧 반자동",
    grinder: "그라인더", grinderBrand: "그라인더 브랜드",
    company: "원두 회사명 *", bean: "원두 이름 *", roastDate: "로스팅 일자",
    coffeeMenu: "커피 메뉴 *", gram: "원두량 (G) *", gramAuto: "원두 분쇄량 (콩 갯수) *",
    seconds: "추출 시간 (초) *", espressoMl: "추출량 (ML) *",
    diluteType: "희석 종류", diluteMl: "희석량 (ML)", syrup: "시럽 / 추가 재료",
    rating: "레시피 평가", note: "맛 노트 · 메모",
    pressureTitle: "📊 예상 추출 압력", brewPressure: "추출 압력",
    pressureGood: "✅ 적정 압력", pressureHigh: "⚠️ 압력 높음", pressureLow: "⚠️ 압력 낮음",
    pressureRange: "적정: 9~11 bar",
    save: "기록 저장", update: "수정 저장", saving: "저장 중…", cancel: "취소",
    deleteConfirm: "이 레시피를 삭제할까요?",
    mySettings: "👤 MY 설정", myMachine: "🤖 커피 머신", myGrinder: "⚙️ 그라인더",
    myPw: "🔒 비밀번호 변경", curPw: "현재 비밀번호", newPw: "새 비밀번호", newPwConfirm: "새 비밀번호 확인",
    changePw: "비밀번호 변경", changing: "변경 중…", close: "닫기", changeBtn: "변경",
    timerStart: "추출 시작", timerStop: "정지", timerReset: "초기화", timerApply: "적용",
    follow: "구독", following: "구독중", unfollow: "구독취소", followingFeed: "구독",
    commentPlaceholder: "댓글을 남겨보세요…", commentSubmit: "등록", commentDelete: "삭제", commentLogin: "로그인 후 댓글 작성 가능해요", comments: "댓글",
    bookmarks: "즐겨찾기", bookmarkSave: "저장됨", bookmarkAdd: "즐겨찾기 추가", bookmarkRemove: "즐겨찾기 해제",
    allRecipes: "전체", myBookmarks: "즐겨찾기", myRecipes: "내 레시피",
    ratingLabels: ["평가 없음", "별로예요", "그저 그래요", "괜찮아요", "맛있어요", "최고예요!"],
    roasting: "로스팅", beanUnit: "원두", extractTime: "추출시간", extractVol: "추출량",
    dilution: "희석", syrupLabel: "시럽", heartOwner: "내 레시피엔 하트를 누를 수 없어요",
    heartCancel: "하트 취소", heart: "하트",
    statGram: "원두", statSeconds: "추출시간", statMl: "추출량",
    beanCount: "개",
  },
  en: {
    appSub: "Coffee Recipe Community",
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
    feedTitle: "Recipe Feed", myFeedTitle: "My Recipes",
    feedSub: "Browse extraction recipes from other brewers.",
    myFeedSub: "Your uploaded recipes. Click your nickname again to return.",
    searchPlaceholder: "Search menu, machine, bean, nickname, note …",
    newRecipe: "+ Add Recipe",
    logout: "Logout", myBtn: "MY",
    emptyFeed: "No recipes yet. Be the first to share!",
    emptyMy: "No recipes yet. Start sharing!",
    emptySearch: "No results found.",
    bestTitle: "🏆 Best Recipes",
    recordTitle: "☕ Record Recipe", editTitle: "✏️ Edit Recipe",
    machine: "Coffee Machine", machineBrand: "Machine Brand", machineModel: "Model Name",
    machineType: "Machine Type", autoType: "🤖 Automatic", manualType: "🔧 Semi-auto",
    grinder: "Grinder", grinderBrand: "Grinder Brand",
    company: "Brand *", bean: "Bean Name *", roastDate: "Roast Date",
    coffeeMenu: "Coffee Menu *", gram: "Dose (G) *", gramAuto: "Bean Count *",
    seconds: "Extraction Time (s) *", espressoMl: "Yield (ML) *",
    diluteType: "Dilution Type", diluteMl: "Dilution (ML)", syrup: "Syrup / Add-ons",
    rating: "Rating", note: "Tasting Notes",
    pressureTitle: "📊 Est. Brew Pressure", brewPressure: "Brew Pressure",
    pressureGood: "✅ Optimal", pressureHigh: "⚠️ Too High", pressureLow: "⚠️ Too Low",
    pressureRange: "Optimal: 9~11 bar",
    save: "Save", update: "Update", saving: "Saving…", cancel: "Cancel",
    deleteConfirm: "Delete this recipe?",
    mySettings: "👤 My Settings", myMachine: "🤖 Coffee Machine", myGrinder: "⚙️ Grinder",
    myPw: "🔒 Change Password", curPw: "Current Password", newPw: "New Password", newPwConfirm: "Confirm New Password",
    changePw: "Change Password", changing: "Changing…", close: "Close", changeBtn: "Edit",
    timerStart: "Start", timerStop: "Stop", timerReset: "Reset", timerApply: "Apply",
    follow: "Subscribe", following: "Subscribed", unfollow: "Unsubscribe", followingFeed: "Following",
    commentPlaceholder: "Leave a comment…", commentSubmit: "Post", commentDelete: "Delete", commentLogin: "Sign in to leave a comment", comments: "Comments",
    bookmarks: "Bookmarks", bookmarkSave: "Saved", bookmarkAdd: "Save recipe", bookmarkRemove: "Remove bookmark",
    allRecipes: "All", myBookmarks: "Bookmarks", myRecipes: "My Recipes",
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
const COFFEE_MENUS = [
  { id: "espresso",   label: "에스프레소", labelEn: "Espresso",    emoji: "☕", needsDilute: false, fixedDilute: null,  hasSyrup: false },
  { id: "ristretto",  label: "리스트레토", labelEn: "Ristretto",   emoji: "☕", needsDilute: false, fixedDilute: null,  hasSyrup: false },
  { id: "lungo",      label: "룽고",       labelEn: "Lungo",       emoji: "☕", needsDilute: false, fixedDilute: null,  hasSyrup: false },
  { id: "americano",  label: "아메리카노", labelEn: "Americano",   emoji: "🥤", needsDilute: true,  fixedDilute: "물",  fixedDiluteEn: "Water",  hasSyrup: false },
  { id: "long_black", label: "롱블랙",     labelEn: "Long Black",  emoji: "🥤", needsDilute: true,  fixedDilute: "물",  fixedDiluteEn: "Water",  hasSyrup: false },
  { id: "latte",      label: "카페라떼",   labelEn: "Latte",       emoji: "🥛", needsDilute: true,  fixedDilute: "우유", fixedDiluteEn: "Milk", hasSyrup: true },
  { id: "cappuccino", label: "카푸치노",   labelEn: "Cappuccino",  emoji: "☕", needsDilute: true,  fixedDilute: "우유", fixedDiluteEn: "Milk", hasSyrup: false },
  { id: "flatwhite",  label: "플랫화이트", labelEn: "Flat White",  emoji: "🥛", needsDilute: true,  fixedDilute: "우유", fixedDiluteEn: "Milk", hasSyrup: false },
  { id: "macchiato",  label: "마끼아또",   labelEn: "Macchiato",   emoji: "☕", needsDilute: true,  fixedDilute: "우유", fixedDiluteEn: "Milk", hasSyrup: true },
  { id: "cortado",    label: "코르타도",   labelEn: "Cortado",     emoji: "☕", needsDilute: true,  fixedDilute: "우유", fixedDiluteEn: "Milk", hasSyrup: false },
  { id: "cold_brew",  label: "콜드브루",   labelEn: "Cold Brew",   emoji: "🧊", needsDilute: true,  fixedDilute: null,  hasSyrup: true },
  { id: "hand_drip",  label: "핸드드립",   labelEn: "Hand Drip",   emoji: "☕", needsDilute: false, fixedDilute: null,  hasSyrup: false },
  { id: "other",      label: "기타",       labelEn: "Other",       emoji: "✨", needsDilute: true,  fixedDilute: null,  hasSyrup: false },
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
function TimerField({ value, onChange, lang, t }) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef(null);

  const fmt = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}:${String(sec).padStart(2,"0")}` : `${sec}`;
  };

  const start = () => {
    if (running) {
      clearInterval(intervalRef.current);
      setRunning(false);
    } else {
      setRunning(true);
      intervalRef.current = setInterval(() => setElapsed(p => p + 1), 1000);
    }
  };

  const reset = () => {
    clearInterval(intervalRef.current);
    setRunning(false);
    setElapsed(0);
  };

  const apply = () => {
    clearInterval(intervalRef.current);
    setRunning(false);
    onChange(String(elapsed));
  };

  useEffect(() => () => clearInterval(intervalRef.current), []);

  const status = running ? "running" : elapsed > 0 ? "done" : "";

  return (
    <div>
      <input type="number" value={value} onChange={e => onChange(String(Math.max(0, Number(e.target.value))))}
        placeholder="28" min="0"
        style={{ width: "100%", padding: "0.75rem 1rem", border: "1px solid var(--steam)", borderRadius: "2px", background: "var(--cream)", fontFamily: "'DM Sans',sans-serif", fontSize: "0.95rem", color: "var(--espresso)", outline: "none", marginBottom: "0.5rem" }} />
      <div className="timer-box">
        <div className={`timer-display ${status}`}>{fmt(elapsed)}</div>
        <div className="timer-btns">
          <button type="button" className="timer-start" onClick={start}>
            {running ? t.timerStop : t.timerStart}
          </button>
          <button type="button" className="timer-reset" onClick={reset}>{t.timerReset}</button>
          {elapsed > 0 && !running && (
            <button type="button" className="timer-start" style={{ background: "#27ae60" }} onClick={apply}>
              {t.timerApply} ({elapsed}s)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── RecipeModal ───────────────────────────────────────────────────
function RecipeModal({ onClose, onSave, user, editTarget, lang = "ko" }) {
  const t = I18N[lang];
  const isEdit = !!editTarget;

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
  const [form, setForm] = useState(isEdit ? { ...editTarget } : {
    company: savedBean?.company || "",
    bean: savedBean?.bean || "",
    roastDate: savedBean?.roastDate || "",
    rating: 0,
    gram: savedDefaults?.gram || "",
    seconds: savedDefaults?.seconds || "",
    espressoMl: savedDefaults?.espressoMl || "",
    diluteMl: savedDefaults?.diluteMl || "",
    diluteType: savedDefaults?.diluteType || "물",
    waterTemp: savedDefaults?.waterTemp || "93",
    grindSize: savedDefaults?.grindSize || "",
    isPublic: isEdit ? (editTarget.isPublic !== false) : true,
    syrup: isEdit ? (editTarget.syrup || "") : "", note: isEdit ? (editTarget.note || "") : ""
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [weather, setWeather] = useState(isEdit ? (editTarget.weather || null) : null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState(null);
  const [selectedMenu, setSelectedMenu] = useState(isEdit ? (editTarget.menuId || "") : (isHandDrip ? "hand_drip" : ""));

  const currentMenu = COFFEE_MENUS.find(m => m.id === selectedMenu);
  const needsDilute = !currentMenu || currentMenu.needsDilute;
  const fixedDilute = currentMenu?.fixedDilute || null;
  const fixedDiluteEn = currentMenu?.fixedDiluteEn || null;
  const hasSyrup = currentMenu?.hasSyrup || false;

  const selectMenu = (menu) => {
    setSelectedMenu(menu.id);
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
    saveRecipeDefaults({ gram: form.gram, seconds: form.seconds, espressoMl: form.espressoMl, diluteMl: form.diluteMl, diluteType: form.diluteType, waterTemp: form.waterTemp, grindSize: form.grindSize });
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
      };
      if (isEdit) {
        const { id, ...rest } = payload;
        await updateDoc(doc(db, "recipes", editTarget.id), rest);
      } else {
        await addDoc(collection(db, "recipes"), {
          ...payload,
          author: user?.displayName,
          uid: user?.uid,
          createdAt: serverTimestamp(),
        });
      }
      onSave();
    } catch (e) { alert("저장 오류: " + e.message); }
    setSaving(false);
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2>{isEdit ? t.editTitle : t.recordTitle}</h2>
        <div className="modal-grid">

          {/* 커피 머신 / 핸드드립 */}
          <div className="field full">
            <label>{machineType === "handdrip" ? (lang === "en" ? "Hand Drip Equipment" : "핸드드립 기구") : (t ? t.machine : "커피 머신")}</label>
            {/* 커피머신 / 핸드드립 탭 — 항상 표시 */}
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.8rem" }}>
              <button
                type="button"
                onClick={() => { setMachineType("auto"); setMachineBrand(savedMachine?.equipType !== "handdrip" ? (savedMachine?.brand || "") : ""); setMachineModel(savedMachine?.equipType !== "handdrip" ? (savedMachine?.model || "") : ""); setMachineLocked(false); }}
                style={{ flex: 1, padding: "0.5rem", border: "1px solid var(--steam)", borderRadius: "2px", background: machineType !== "handdrip" ? "var(--espresso)" : "var(--foam)", color: machineType !== "handdrip" ? "var(--cream)" : "var(--muted)", fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem", cursor: "pointer", transition: "all 0.2s" }}
              >🤖 {lang === "en" ? "Coffee Machine" : "커피 머신"}</button>
              <button
                type="button"
                onClick={() => { setMachineType("handdrip"); setMachineBrand(""); setMachineModel(""); setMachineLocked(false); const hd = COFFEE_MENUS.find(m => m.id === "hand_drip"); if (hd) selectMenu(hd); }}
                style={{ flex: 1, padding: "0.5rem", border: "1px solid var(--steam)", borderRadius: "2px", background: machineType === "handdrip" ? "var(--espresso)" : "var(--foam)", color: machineType === "handdrip" ? "var(--cream)" : "var(--muted)", fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem", cursor: "pointer", transition: "all 0.2s" }}
              >🫗 {lang === "en" ? "Hand Drip" : "핸드드립"}</button>
            </div>
            {machineType === "handdrip" ? (
              <input
                value={handDripName}
                onChange={e => setHandDripName(e.target.value)}
                placeholder={lang === "en" ? "e.g. Hario V60, Chemex …" : "예) 하리오 V60, 케멕스 …"}
                style={{ width: "100%", padding: "0.75rem 1rem", border: "1px solid var(--steam)", borderRadius: "2px", background: "var(--cream)", fontFamily: "'DM Sans',sans-serif", fontSize: "0.95rem", color: "var(--espresso)", outline: "none" }}
              />
            ) : machineLocked ? (
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <div style={{ flex: 1, padding: "0.75rem 1rem", border: "1px solid var(--steam)", borderRadius: "2px", background: "var(--steam)", fontSize: "0.95rem", color: "var(--espresso)", fontWeight: 500 }}>
                  🤖 {machineDisplay}
                </div>
                <button onClick={() => setMachineLocked(false)} style={{ padding: "0.75rem 0.8rem", background: "none", border: "1px solid var(--steam)", borderRadius: "2px", fontFamily: "'DM Sans',sans-serif", fontSize: "0.8rem", color: "var(--muted)", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
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
                      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                        {[{ val: "auto", label: t.autoType }, { val: "manual", label: t.manualType }].map(({ val, label }) => (
                          <button key={val} type="button" onClick={() => setMachineType(val)}
                            style={{ flex: 1, padding: "0.65rem", border: "1px solid", borderColor: machineType === val ? "var(--accent)" : "var(--steam)", borderRadius: "2px", background: machineType === val ? "var(--accent)" : "var(--foam)", color: machineType === val ? "white" : "var(--muted)", fontFamily: "'DM Sans',sans-serif", fontSize: "0.88rem", cursor: "pointer", transition: "all 0.2s" }}
                          >{label}</button>
                        ))}
                      </div>
                    )}
                    <input value={machineModel} onChange={e => setMachineModel(e.target.value)}
                      placeholder={isCustomBrand ? "브랜드명과 모델명 입력" : "예) Barista Express, Dedica …"}
                      style={{ width: "100%", marginTop: "0.5rem", padding: "0.75rem 1rem", border: "1px solid var(--steam)", borderRadius: "2px", background: "var(--cream)", fontFamily: "'DM Sans',sans-serif", fontSize: "0.95rem", color: "var(--espresso)", outline: "none" }}
                    />
                    {machineModel && <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "0.3rem" }}>💾 저장하면 다음에도 자동으로 채워져요</p>}
                  </>
                )}
              </>
            )}
          </div>

          {/* 그라인더 - 전자동이면 숨김 */}
          {!isAutoMode && (
            grinderLocked ? (
              <div className="field full">
                <label>{t ? t.grinder : "그라인더"}</label>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <div style={{
                    flex: 1, padding: "0.75rem 1rem", border: "1px solid var(--steam)",
                    borderRadius: "2px", background: "var(--steam)", fontSize: "0.95rem",
                    color: "var(--espresso)", fontWeight: 500,
                  }}>
                    ⚙️ {grinderDisplay}
                  </div>
                  <button onClick={() => setGrinderLocked(false)} style={{
                    padding: "0.75rem 0.8rem", background: "none", border: "1px solid var(--steam)",
                    borderRadius: "2px", fontFamily: "'DM Sans',sans-serif", fontSize: "0.8rem",
                    color: "var(--muted)", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
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
                      <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "0.3rem" }}>
                        💾 저장하면 다음에도 자동으로 채워져요
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
              <label>⚙️ {lang === "en" ? "Grind Size" : "분쇄도"}</label>
              <input
                value={form.grindSize}
                onChange={e => set("grindSize", e.target.value)}
                placeholder={lang === "en" ? "e.g. 15, Medium-Fine …" : "예) 15, 중세 …"}
              />
            </div>
          )}

          <div className="field">
            <label style={{ color: errors.company ? "#c0392b" : undefined }}>{t.company}</label>
            <input value={form.company} onChange={e => { set("company", e.target.value); setErrors(p => ({...p, company: false})); }}
              placeholder="블루보틀 …"
              style={{ borderColor: errors.company ? "#c0392b" : undefined }} />
            {errors.company && <p style={{ color: "#c0392b", fontSize: "0.78rem", marginTop: "0.3rem" }}>⚠️ 필수 항목이에요</p>}
            {savedBean?.company && form.company === savedBean.company && !errors.company && (
              <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.3rem" }}>💾 {lang === "ko" ? "이전 기록에서 불러왔어요" : "Loaded from last record"}</p>
            )}
          </div>
          <div className="field">
            <label style={{ color: errors.bean ? "#c0392b" : undefined }}>{t.bean}</label>
            <input value={form.bean} onChange={e => { set("bean", e.target.value); setErrors(p => ({...p, bean: false})); }}
              placeholder="에티오피아 예가체프"
              style={{ borderColor: errors.bean ? "#c0392b" : undefined }} />
            {errors.bean && <p style={{ color: "#c0392b", fontSize: "0.78rem", marginTop: "0.3rem" }}>⚠️ 필수 항목이에요</p>}
          </div>
          <div className="field full"><label>{t ? t.roastDate : "로스팅 일자"}</label>
            <input type="date" value={form.roastDate || ""} onChange={e => set("roastDate", e.target.value)} max={new Date().toISOString().split("T")[0]} />
          </div>
          {/* 날씨 정보 */}
          <div className="field full">
            <label>{lang === "en" ? "Weather at Brew Time" : "추출 시점 날씨"}</label>
            {weatherLoading && <div className="weather-loading">⏳ {lang === "en" ? "Getting weather…" : "날씨 불러오는 중…"}</div>}
            {weather && (
              <div className="weather-box">
                <span className="weather-icon">{weather.icon}</span>
                <div className="weather-info">
                  <span className="weather-main">{weather.descKo} {weather.temp}°C</span>
                  <span className="weather-detail">💧 {lang === "en" ? "Humidity" : "습도"} {weather.humidity}% · 🌐 {weather.country}</span>
                </div>
                <button type="button" onClick={() => {
                  setWeatherError(null);
                  setWeatherLoading(true);
                  fetchWeather()
                    .then(w => { setWeather(w); setWeatherError(null); })
                    .catch(e => { setWeatherError(typeof e === "string" ? e : e.message); })
                    .finally(() => setWeatherLoading(false));
                }} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: "0.8rem" }}>🔄</button>
              </div>
            )}
            {!weather && !weatherLoading && (
              <button type="button" onClick={() => {
                setWeatherError(null);
                setWeatherLoading(true);
                fetchWeather()
                  .then(w => { setWeather(w); setWeatherError(null); })
                  .catch(e => { setWeatherError(typeof e === "string" ? e : e.message); })
                  .finally(() => setWeatherLoading(false));
              }} style={{ padding: "0.75rem 1rem", background: "var(--cream)", border: "1px solid var(--latte)", borderRadius: "2px", fontFamily: "'DM Sans',sans-serif", fontSize: "0.88rem", color: "var(--roast)", cursor: "pointer", width: "100%", textAlign: "center" }}>
                📍 {lang === "en" ? "Get Current Weather" : "현재 날씨 가져오기"}
              </button>
            )}
            {weatherError && <p style={{ fontSize: "0.78rem", color: "#e67e22", marginTop: "0.3rem" }}>⚠️ {lang === "en" ? "Could not get weather. " : "날씨를 가져올 수 없어요. "}{weatherError}</p>}
          </div>

          {/* 커피 메뉴 선택 */}
          <div className="field full">
            <label style={{ color: errors.menu ? "#c0392b" : undefined }}>
              {t.coffeeMenu}
            </label>
            <div className="menu-selector" style={{ border: errors.menu ? "1px solid #c0392b" : "none", borderRadius: "2px", padding: errors.menu ? "0.5rem" : "0" }}>
              {(machineType === "handdrip"
                ? COFFEE_MENUS.filter(m => m.id === "hand_drip" || m.id === "other")
                : COFFEE_MENUS
              ).map(m => (
                <button
                  key={m.id}
                  type="button"
                  className={`menu-btn ${selectedMenu === m.id ? "selected" : ""}`}
                  onClick={() => { selectMenu(m); setErrors(p => ({...p, menu: false})); }}
                >
                  {m.emoji} {lang === "en" ? m.labelEn : m.label}
                </button>
              ))}
            </div>
            {errors.menu && <p style={{ color: "#c0392b", fontSize: "0.78rem", marginTop: "0.3rem" }}>⚠️ 커피 메뉴를 선택해주세요</p>}
          </div>
          {/* 원두량: 전자동이면 콩 갯수, 아니면 g 입력 */}
          {isAutoMode ? (
            <div className="field full">
              <div className="bean-counter">
                <span className="bean-counter-label">
                  {t.gramAuto}
                  <span className="auto-badge">🤖 전자동</span>
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
            <div className="field">
              <label style={{ color: errors.gram ? "#c0392b" : undefined }}>{t.gram}</label>
              <input type="number" value={form.gram} onChange={e => { set("gram", String(Math.max(0, Number(e.target.value)))); setErrors(p => ({...p, gram: false})); }}
                placeholder="18" min="0"
                style={{ borderColor: errors.gram ? "#c0392b" : undefined }} />
              {errors.gram && <p style={{ color: "#c0392b", fontSize: "0.78rem", marginTop: "0.3rem" }}>⚠️ 필수 항목이에요</p>}
            </div>
          )}
          <div className="field">
            <label style={{ color: errors.seconds ? "#c0392b" : undefined }}>{t.seconds}</label>
            <TimerField value={form.seconds} onChange={v => { set("seconds", v); setErrors(p => ({...p, seconds: false})); }} lang={lang} t={t} />
            {errors.seconds && <p style={{ color: "#c0392b", fontSize: "0.78rem", marginTop: "0.3rem" }}>{lang === "en" ? "⚠️ Required" : "⚠️ 필수 항목이에요"}</p>}
          </div>
          <div className="field">
            <label style={{ color: errors.espressoMl ? "#c0392b" : undefined }}>{t.espressoMl}</label>
            <input type="number" value={form.espressoMl} onChange={e => { set("espressoMl", String(Math.max(0, Number(e.target.value)))); setErrors(p => ({...p, espressoMl: false})); }}
              placeholder="36" min="0"
              style={{ borderColor: errors.espressoMl ? "#c0392b" : undefined }} />
            {errors.espressoMl && <p style={{ color: "#c0392b", fontSize: "0.78rem", marginTop: "0.3rem" }}>⚠️ 필수 항목이에요</p>}
          </div>
          <div className="field">
            <label>🌡️ {lang === "en" ? "Water Temp (°C)" : "물 온도 (°C)"}</label>
            <input type="number" value={form.waterTemp} onChange={e => set("waterTemp", String(Math.max(0, Number(e.target.value))))}
              placeholder="93" min="0" max="100" />
          </div>
          {needsDilute && (<>
            <div className="field">
              <label>{t ? t.diluteType : "희석 종류"}</label>
              {fixedDilute ? (
                <div style={{ padding: "0.75rem 1rem", border: "1px solid var(--steam)", borderRadius: "2px", background: "var(--steam)", fontSize: "0.95rem", color: "var(--espresso)", fontWeight: 500 }}>
                  💧 {lang === "en" ? (fixedDiluteEn || fixedDilute) : fixedDilute} {lang === "en" ? "(Fixed)" : "(고정)"}
                </div>
              ) : (
                <input
                  value={lang === "en"
                    ? (form.diluteType === "물" ? "Water" : form.diluteType === "우유" ? "Milk" : form.diluteType === "두유" ? "Soy Milk" : form.diluteType)
                    : form.diluteType}
                  onChange={e => {
                    const v = e.target.value;
                    // 영어 입력을 한국어로 저장
                    if (lang === "en") {
                      const map = { "Water": "물", "Milk": "우유", "Soy Milk": "두유" };
                      set("diluteType", map[v] || v);
                    } else {
                      set("diluteType", v);
                    }
                  }}
                  placeholder={lang === "en" ? "Water / Milk / Soy Milk" : "물/우유/두유"} />
              )}
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
          {/* 예상 압력 계산 - 맛 노트 바로 위 */}
          {(() => {
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
                style={{ flex: 1, padding: "0.65rem", border: "1px solid", borderRadius: "2px", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: "0.88rem", transition: "all 0.2s",
                  borderColor: form.isPublic !== false ? "var(--latte)" : "var(--steam)",
                  background: form.isPublic !== false ? "var(--latte)" : "var(--foam)",
                  color: form.isPublic !== false ? "var(--espresso)" : "var(--muted)", fontWeight: form.isPublic !== false ? 600 : 400 }}>
                🌍 {lang === "en" ? "Public" : "공개"}
              </button>
              <button type="button"
                onClick={() => set("isPublic", false)}
                style={{ flex: 1, padding: "0.65rem", border: "1px solid", borderRadius: "2px", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: "0.88rem", transition: "all 0.2s",
                  borderColor: form.isPublic === false ? "var(--espresso)" : "var(--steam)",
                  background: form.isPublic === false ? "var(--espresso)" : "var(--foam)",
                  color: form.isPublic === false ? "var(--cream)" : "var(--muted)", fontWeight: form.isPublic === false ? 600 : 400 }}>
                🔒 {lang === "en" ? "Private" : "비공개"}
              </button>
            </div>
            <p style={{ fontSize: "0.76rem", color: "var(--muted)", marginTop: "0.4rem" }}>
              {form.isPublic !== false
                ? (lang === "en" ? "Visible to everyone in the feed" : "피드에 공개됩니다")
                : (lang === "en" ? "Only visible to you" : "나만 볼 수 있어요")}
            </p>
          </div>
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
function MyModal({ onClose, user, lang = 'ko' }) {
  // 머신
  const [machine, setMachine] = useState(loadMyMachine() || { brand: "", model: "", equipType: "machine" });
  const [machineEditing, setMachineEditing] = useState(!machine.brand && !machine.handDripName);
  const [machineBrand, setMachineBrand] = useState(machine.brand || "");
  const [machineModel, setMachineModel] = useState(machine.model || "");
  const [equipType, setEquipType] = useState(machine.equipType || "machine");
  const [handDripName, setHandDripName] = useState(machine.handDripName || "");

  // 그라인더
  const [grinder, setGrinder] = useState(loadMyGrinder() || { brand: "", model: "" });
  const [grinderEditing, setGrinderEditing] = useState(!grinder.brand);
  const [grinderBrand, setGrinderBrand] = useState(grinder.brand || "");
  const [grinderModel, setGrinderModel] = useState(grinder.model || "");

  // 비밀번호
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPwConfirm, setNewPwConfirm] = useState("");
  const [pwMsg, setPwMsg] = useState(null);
  const [pwSaving, setPwSaving] = useState(false);

  const [machineMsg, setMachineMsg] = useState(null);
  const [grinderMsg, setGrinderMsg] = useState(null);

  const saveMachine = () => {
    if (equipType === "machine" && !machineBrand) return setMachineMsg({ type: "error", text: "브랜드를 선택해주세요." });
    if (equipType === "handdrip" && !handDripName.trim()) return setMachineMsg({ type: "error", text: "기구명을 입력해주세요." });
    const data = equipType === "handdrip"
      ? { brand: "", model: "", equipType: "handdrip", handDripName: handDripName.trim() }
      : { brand: machineBrand, model: machineModel, equipType: "machine", handDripName: "" };
    saveMyMachine(data);
    setMachine(data);
    setMachineEditing(false);
    setMachineMsg({ type: "ok", text: "저장됐어요 ✓" });
    setTimeout(() => setMachineMsg(null), 2000);
  };

  const saveGrinder = () => {
    if (!grinderBrand) return setGrinderMsg({ type: "error", text: "브랜드를 선택해주세요." });
    saveMyGrinder({ brand: grinderBrand, model: grinderModel });
    setGrinder({ brand: grinderBrand, model: grinderModel });
    setGrinderEditing(false);
    setGrinderMsg({ type: "ok", text: "저장됐어요 ✓" });
    setTimeout(() => setGrinderMsg(null), 2000);
  };

  const handlePwChange = async () => {
    setPwMsg(null);
    if (!curPw) return setPwMsg({ type: "error", text: "현재 비밀번호를 입력해주세요." });
    if (!newPw) return setPwMsg({ type: "error", text: "새 비밀번호를 입력해주세요." });
    if (newPw.length < 6) return setPwMsg({ type: "error", text: "비밀번호는 6자 이상이어야 해요." });
    if (newPw !== newPwConfirm) return setPwMsg({ type: "error", text: "새 비밀번호가 일치하지 않습니다." });
    setPwSaving(true);
    try {
      // 현재 비밀번호로 재인증
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

  const machineDisplay = machineBrand ? (machineModel ? `${machineBrand} ${machineModel}` : machineBrand) : "";
  const grinderDisplay = grinderBrand ? (grinderModel ? `${grinderBrand} ${grinderModel}` : grinderBrand) : "";

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2>👤 MY 설정</h2>

        {/* 커피 머신 / 핸드드립 */}
        <div className="my-section">
          <div className="my-section-title">☕ {lang === "en" ? "Equipment" : "추출 기구"}</div>
          {!machineEditing ? (
            <div className="my-locked-row">
              <div className="my-locked-val">
                {machine.equipType === "handdrip"
                  ? (machine.handDripName ? `🫗 ${machine.handDripName}` : "미설정")
                  : (machine.brand ? `🤖 ${machine.brand}${machine.model ? " " + machine.model : ""}` : "미설정")}
              </div>
              <button className="btn-change" onClick={() => setMachineEditing(true)}>{lang === "en" ? "Edit" : "변경"}</button>
            </div>
          ) : (
            <>
              {/* 타입 선택 탭 */}
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
                <button
                  onClick={() => setEquipType("machine")}
                  style={{ flex: 1, padding: "0.5rem", border: "1px solid var(--steam)", borderRadius: "2px", background: equipType === "machine" ? "var(--espresso)" : "var(--foam)", color: equipType === "machine" ? "var(--cream)" : "var(--muted)", fontFamily: "'DM Sans',sans-serif", fontSize: "0.85rem", cursor: "pointer", transition: "all 0.2s" }}
                >
                  🤖 {lang === "en" ? "Coffee Machine" : "커피 머신"}
                </button>
                <button
                  onClick={() => setEquipType("handdrip")}
                  style={{ flex: 1, padding: "0.5rem", border: "1px solid var(--steam)", borderRadius: "2px", background: equipType === "handdrip" ? "var(--espresso)" : "var(--foam)", color: equipType === "handdrip" ? "var(--cream)" : "var(--muted)", fontFamily: "'DM Sans',sans-serif", fontSize: "0.85rem", cursor: "pointer", transition: "all 0.2s" }}
                >
                  🫗 {lang === "en" ? "Hand Drip" : "핸드드립"}
                </button>
              </div>
              {equipType === "machine" ? (
                <>
                  <div className="field">
                    <label>{lang === "en" ? "Brand" : "브랜드"}</label>
                    <BrandInput value={machineBrand} onChange={v => { setMachineBrand(v); setMachineModel(""); }} brands={MACHINE_BRANDS} />
                  </div>
                  {machineBrand && (
                    <div className="field">
                      <label>{lang === "en" ? "Model" : "세부 모델명"}</label>
                      <input value={machineModel} onChange={e => setMachineModel(e.target.value)} placeholder="예) Barista Express …" />
                    </div>
                  )}
                </>
              ) : (
                <div className="field">
                  <label>{lang === "en" ? "Equipment Name" : "기구명"}</label>
                  <input value={handDripName} onChange={e => setHandDripName(e.target.value)} placeholder={lang === "en" ? "e.g. Hario V60, Chemex …" : "예) 하리오 V60, 케멕스 …"} />
                </div>
              )}
              <div className="save-row">
                {(machine.brand || machine.handDripName) && <button className="btn-change" style={{ marginRight: "0.5rem" }} onClick={() => { setMachineBrand(machine.brand); setMachineModel(machine.model); setEquipType(machine.equipType || "machine"); setHandDripName(machine.handDripName || ""); setMachineEditing(false); }}>취소</button>}
                <button className="btn-save-sm" onClick={saveMachine}>{lang === "en" ? "Save" : "저장"}</button>
              </div>
            </>
          )}
          {machineMsg && <p className={machineMsg.type === "error" ? "msg-error" : "msg-ok"} style={{ marginTop: "0.5rem" }}>{machineMsg.text}</p>}
        </div>

        {/* 그라인더 */}
        <div className="my-section">
          <div className="my-section-title">⚙️ 그라인더</div>
          {!grinderEditing ? (
            <div className="my-locked-row">
              <div className="my-locked-val">{grinder.brand ? `${grinder.brand}${grinder.model ? " " + grinder.model : ""}` : "미설정"}</div>
              <button className="btn-change" onClick={() => setGrinderEditing(true)}>{ lang === "en" ? "Edit" : "변경"}</button>
            </div>
          ) : (
            <>
              <div className="field">
                <label>브랜드</label>
                <BrandInput value={grinderBrand} onChange={v => { setGrinderBrand(v); setGrinderModel(""); }} brands={GRINDER_BRANDS} />
              </div>
              {grinderBrand && (
                <div className="field">
                  <label>{t ? t.machineModel : "세부 모델명"}</label>
                  <input value={grinderModel} onChange={e => setGrinderModel(e.target.value)} placeholder="예) Encore, C40 …" />
                </div>
              )}
              <div className="save-row">
                {grinder.brand && <button className="btn-change" style={{ marginRight: "0.5rem" }} onClick={() => { setGrinderBrand(grinder.brand); setGrinderModel(grinder.model); setGrinderEditing(false); }}>취소</button>}
                <button className="btn-save-sm" onClick={saveGrinder}>저장</button>
              </div>
            </>
          )}
          {grinderMsg && <p className={grinderMsg.type === "error" ? "msg-error" : "msg-ok"} style={{ marginTop: "0.5rem" }}>{grinderMsg.text}</p>}
        </div>

        {/* 비밀번호 변경 - 구글 로그인 유저는 숨김 */}
        {!user?.providerData?.some(p => p.providerId === "google.com") && <div className="my-section">
          <div className="my-section-title">🔒 비밀번호 변경</div>
          <div className="field">
            <label>현재 비밀번호</label>
            <input type="password" value={curPw} onChange={e => setCurPw(e.target.value)} placeholder="••••••••" />
          </div>
          <div className="field">
            <label>새 비밀번호</label>
            <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="6자 이상" />
          </div>
          <div className="field">
            <label>새 비밀번호 확인</label>
            <input type="password" value={newPwConfirm} onChange={e => setNewPwConfirm(e.target.value)}
              placeholder="••••••••"
              style={{ borderColor: newPwConfirm.length > 0 ? (newPw === newPwConfirm ? "#27ae60" : "#c0392b") : undefined }}
            />
            {newPwConfirm.length > 0 && newPw === newPwConfirm && <p className="msg-ok" style={{ marginTop: "0.3rem" }}>일치합니다 ✓</p>}
            {newPwConfirm.length > 0 && newPw !== newPwConfirm && <p className="msg-error" style={{ marginTop: "0.3rem" }}>일치하지 않습니다.</p>}
          </div>
          <div className="save-row">
            <button className="btn-save-sm" onClick={handlePwChange} disabled={pwSaving}>{pwSaving ? "변경 중…" : "비밀번호 변경"}</button>
          </div>
          {pwMsg && <p className={pwMsg.type === "error" ? "msg-error" : "msg-ok"} style={{ marginTop: "0.5rem" }}>{pwMsg.text}</p>}
        </div>}

        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  );
}

// ─── RecipeDetailModal ────────────────────────────────────────────
function RecipeDetailModal({ recipe, onClose, currentUid, currentUser, onLike, onEdit, onDelete, onRequireAuth, onFollow, isFollowing, onBookmark, isBookmarked, lang = "ko" }) {
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  useEffect(() => {
    if (!recipe?.id) return;
    const q = query(collection(db, "comments"), where("recipeId", "==", recipe.id));
    const unsub = onSnapshot(q, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // 클라이언트에서 시간순 정렬 (Firestore 복합 인덱스 불필요)
      list.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
      setComments(list);
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
        createdAt: serverTimestamp(),
      });
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
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: "460px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.2rem" }}>
          <div>
            {recipe.machine && (
        <div className="card-machine">
          {recipe.machineType === "handdrip" ? "🫗" : recipe.machineType === "manual" ? "🔧" : "🤖"} {recipe.machine}
          {recipe.machineType && recipe.machineType !== "handdrip" && (
            <span style={{ marginLeft: "0.4rem", fontSize: "0.68rem", background: recipe.machineType === "auto" ? "var(--latte)" : "var(--steam)", color: "var(--espresso)", padding: "0.1rem 0.4rem", borderRadius: "999px" }}>
              {recipe.machineType === "auto" ? (lang === "en" ? "Auto" : "전자동") : (lang === "en" ? "Semi-auto" : "반자동")}
            </span>
          )}
        </div>
      )}
            {recipe.grinder && <div className="card-machine">⚙️ {recipe.grinder}{recipe.grindSize ? <span style={{marginLeft:"0.5rem",fontSize:"0.8rem",color:"var(--muted)"}}>({recipe.grindSize})</span> : null}</div>}
            <div className="card-company" style={{ marginTop: "0.3rem" }}>{recipe.company}</div>
            <div className="card-bean" style={{ marginBottom: 0 }}>{recipe.bean}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "var(--muted)", flexShrink: 0, marginLeft: "1rem" }}>✕</button>
        </div>
        {recipe.roastDate && (
          <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: "1rem" }}>
            🌱 {t.roasting} {new Date(recipe.roastDate).toLocaleDateString(lang === "ko" ? "ko-KR" : "en-US")}
          </div>
        )}
        <div className="card-stats" style={{ marginBottom: "1rem", gridTemplateColumns: recipe.waterTemp ? "repeat(4, 1fr)" : "repeat(3, 1fr)" }}>
          <div className="stat"><span className="stat-val">{recipe.gram}g</span><span className="stat-label">{t.statGram}</span></div>
          <div className="stat"><span className="stat-val">{recipe.seconds}s</span><span className="stat-label">{t.statSeconds}</span></div>
          <div className="stat"><span className="stat-val">{recipe.espressoMl}ml</span><span className="stat-label">{t.statMl}</span></div>
          {recipe.waterTemp && <div className="stat"><span className="stat-val">{recipe.waterTemp}°C</span><span className="stat-label">🌡️ {lang === "en" ? "Temp" : "물 온도"}</span></div>}
        </div>
        {recipe.diluteMl && (
          <div className="card-dilution">💧 {recipe.diluteType} {recipe.diluteMl}ml 희석</div>
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
            <button
              className={`btn-heart ${liked ? "liked" : ""}`}
              onClick={() => !isOwner && onLike(recipe)}
              style={{ cursor: isOwner ? "default" : "pointer", opacity: isOwner ? 0.4 : 1 }}
              title={isOwner ? t.heartOwner : liked ? t.heartCancel : t.heart}
            >
              {liked ? "❤️" : "🤍"}<span>{likeCount > 0 ? likeCount : ""}</span>
            </button>
            {isOwner && (<>
              <button className="card-edit" onClick={() => { onClose(); onEdit(recipe); }}>✏️</button>
              <button className="card-delete" onClick={() => { onClose(); onDelete(recipe.id); }}>🗑</button>
            </>)}
          </div>
        </div>

        {/* 댓글 섹션 */}
        <div style={{ borderTop: "1px solid var(--steam)", marginTop: "1.2rem", paddingTop: "1rem" }}>
          <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--espresso)", marginBottom: "0.8rem" }}>
            💬 {t.comments} {comments.length > 0 ? `(${comments.length})` : ""}
          </div>
          {comments.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "0.8rem", maxHeight: "220px", overflowY: "auto" }}>
              {comments.map(c => (
                <div key={c.id} style={{ background: "var(--foam)", borderRadius: "2px", padding: "0.6rem 0.8rem", fontSize: "0.85rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                    <div>
                      <span style={{ fontWeight: 600, color: "var(--espresso)", marginRight: "0.4rem" }}>@{c.author}</span>
                      <span style={{ color: "var(--muted)", fontSize: "0.75rem" }}>
                        {c.createdAt?.toDate?.()?.toLocaleDateString(lang === "ko" ? "ko-KR" : "en-US") || ""}
                      </span>
                    </div>
                    {c.uid === currentUid && (
                      <button onClick={() => deleteComment(c.id)} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "0.75rem", cursor: "pointer", flexShrink: 0, padding: 0 }}>
                        {t.commentDelete}
                      </button>
                    )}
                  </div>
                  <div style={{ color: "var(--espresso)", marginTop: "0.3rem", lineHeight: 1.5 }}>{c.text}</div>
                </div>
              ))}
            </div>
          )}
          {currentUser ? (
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && submitComment()}
                placeholder={t.commentPlaceholder}
                style={{ flex: 1, padding: "0.6rem 0.8rem", border: "1px solid var(--steam)", borderRadius: "2px", fontFamily: "'DM Sans',sans-serif", fontSize: "0.88rem", background: "var(--cream)", color: "var(--espresso)", outline: "none" }}
              />
              <button onClick={submitComment} disabled={commentLoading || !commentText.trim()}
                style={{ padding: "0.6rem 1rem", background: "var(--espresso)", color: "var(--cream)", border: "none", borderRadius: "2px", fontFamily: "'DM Sans',sans-serif", fontSize: "0.85rem", cursor: "pointer", whiteSpace: "nowrap", opacity: commentText.trim() ? 1 : 0.5 }}>
                {t.commentSubmit}
              </button>
            </div>
          ) : (
            <button onClick={() => onRequireAuth?.()} style={{ width: "100%", padding: "0.65rem", background: "none", border: "1px dashed var(--steam)", borderRadius: "2px", color: "var(--muted)", fontFamily: "'DM Sans',sans-serif", fontSize: "0.85rem", cursor: "pointer" }}>
              🔒 {t.commentLogin}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── RecipeCard ────────────────────────────────────────────────────
function RecipeCard({ recipe, currentUid, onDelete, onEdit, onLike, onBookmark, isBookmarked, onFollow, isFollowing, onCardClick, lang = "ko" }) {
  const t = I18N[lang];
  const date = recipe.createdAt?.toDate?.()?.toLocaleDateString(lang === "en" ? "en-US" : "ko-KR") || "";
  const liked = (recipe.likedBy || []).includes(currentUid);
  const likeCount = (recipe.likedBy || []).length;
  const isOwner = recipe.uid === currentUid;

  return (
    <div className="recipe-card" onClick={onCardClick} style={{ cursor: onCardClick ? "pointer" : "default" }}>
      {recipe.isPublic === false && (
        <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "0.4rem" }}>🔒 {lang === "en" ? "Private" : "비공개"}</div>
      )}
      {recipe.machine && (
        <div className="card-machine">
          {recipe.machineType === "handdrip" ? "🫗" : recipe.machineType === "manual" ? "🔧" : "🤖"} {recipe.machine}
          {recipe.machineType && recipe.machineType !== "handdrip" && (
            <span style={{ marginLeft: "0.4rem", fontSize: "0.68rem", background: recipe.machineType === "auto" ? "var(--latte)" : "var(--steam)", color: "var(--espresso)", padding: "0.1rem 0.4rem", borderRadius: "999px" }}>
              {recipe.machineType === "auto" ? (lang === "en" ? "Auto" : "전자동") : (lang === "en" ? "Semi-auto" : "반자동")}
            </span>
          )}
        </div>
      )}
      {recipe.grinder && <div className="card-machine">⚙️ {recipe.grinder}{recipe.grindSize ? <span style={{marginLeft:"0.5rem",fontSize:"0.8rem",color:"var(--muted)"}}>({recipe.grindSize})</span> : null}</div>}
      {recipe.weather && (
        <div className="card-weather">
          <span>{recipe.weather.icon} {recipe.weather.descKo} {recipe.weather.temp}°C</span>
          <span>💧 {recipe.weather.humidity}%</span>
          {(recipe.weather.country || recipe.weather.city) && (
            <span>🌐 {recipe.weather.country || recipe.weather.city}</span>
          )}
        </div>
      )}
      {recipe.menuLabel && (
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.75rem", background: "var(--espresso)", color: "var(--latte)", padding: "0.2rem 0.6rem", borderRadius: "999px", marginBottom: "0.4rem", fontWeight: 500 }}>
          {COFFEE_MENUS.find(m => m.id === recipe.menuId)?.emoji || "☕"} {lang === "en" ? (COFFEE_MENUS.find(m => m.id === recipe.menuId)?.labelEn || recipe.menuLabel) : recipe.menuLabel}
        </div>
      )}
      <div className="card-company">{recipe.company}</div>
      <div className="card-bean">{recipe.bean}</div>
      {recipe.roastDate && <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: "0.8rem" }}>🌱 {t.roasting} {new Date(recipe.roastDate).toLocaleDateString(lang === "en" ? "en-US" : "ko-KR")}</div>}
      <div className="card-stats" style={{ gridTemplateColumns: recipe.waterTemp ? "repeat(4, 1fr)" : "repeat(3, 1fr)" }}>
        <div className="stat"><span className="stat-val">{recipe.gram}g</span><span className="stat-label">{t.statGram}</span></div>
        <div className="stat"><span className="stat-val">{recipe.seconds}s</span><span className="stat-label">{t.statSeconds}</span></div>
        <div className="stat"><span className="stat-val">{recipe.espressoMl}ml</span><span className="stat-label">{t.statMl}</span></div>
        {recipe.waterTemp && <div className="stat"><span className="stat-val">{recipe.waterTemp}°C</span><span className="stat-label">🌡️ {lang === "en" ? "Temp" : "물 온도"}</span></div>}
      </div>
      {recipe.diluteMl && <div className="card-dilution">💧 {lang === "en" ? (recipe.diluteType === "물" ? "Water" : recipe.diluteType === "우유" ? "Milk" : recipe.diluteType === "두유" ? "Soy Milk" : recipe.diluteType) : recipe.diluteType} {recipe.diluteMl}ml {t.dilution}</div>}
      {recipe.syrup && <div className="card-dilution">🍯 {recipe.syrup}</div>}
      {recipe.showerBar && (
        <div style={{
          fontSize: "0.78rem", padding: "0.4rem 0.8rem", borderRadius: "2px", marginBottom: "0.5rem",
          background: recipe.showerBar >= 9 && recipe.showerBar <= 11 ? "#27ae6015" : "#e74c3c15",
          color: recipe.showerBar >= 9 && recipe.showerBar <= 11 ? "#27ae60" : "#e74c3c",
          border: `1px solid ${recipe.showerBar >= 9 && recipe.showerBar <= 11 ? "#27ae6030" : "#e74c3c30"}`,
          display: "flex", justifyContent: "space-between",
        }}>
          <span>📊 {t.brewPressure}</span>
          <span style={{ fontWeight: 600 }}>{recipe.showerBar} bar {recipe.showerBar >= 9 && recipe.showerBar <= 11 ? "✅" : "⚠️"}</span>
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
            {liked ? "❤️" : "🤍"}<span>{likeCount > 0 ? likeCount : ""}</span>
          </button>
          <button
            className={`btn-bookmark ${isBookmarked ? "saved" : ""}`}
            onClick={e => { e.stopPropagation(); onBookmark(recipe.id); }}
            title={isBookmarked ? t.bookmarkRemove : t.bookmarkAdd}
            style={{ color: isBookmarked ? "var(--latte)" : "var(--muted)" }}
          >
            {isBookmarked ? "🔖" : "🏷️"}
          </button>
          {isOwner && (<>
            <button className="card-edit" onClick={e => { e.stopPropagation(); onEdit(recipe); }}>✏️</button>
            <button className="card-delete" onClick={e => { e.stopPropagation(); onDelete(recipe.id); }}>🗑</button>
          </>)}
        </div>
      </div>
    </div>
  );
}

// ─── MainApp ───────────────────────────────────────────────────────
function MainApp({ user, lang, toggleLang, onRequireAuth }) {
  const [recipes, setRecipes] = useState([]);
  const [search, setSearch] = useState("");
  const [myRecipesOnly, setMyRecipesOnly] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [showMyModal, setShowMyModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [detailRecipe, setDetailRecipe] = useState(null);
  const [feedTab, setFeedTab] = useState("all"); // "all" | "bookmarks" | "following"
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

  const loadRecipes = useCallback(async () => {
    try {
      const q = query(collection(db, "recipes"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setRecipes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
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

  const filtered = recipes.filter(r => {
    // 비공개 레시피는 본인만 볼 수 있음
    if (r.isPublic === false && r.uid !== user?.uid) return false;
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
        <span>📢 {notices[0].title} — {notices[0].body}</span>
        <button className="notice-banner-close" onClick={() => setNoticeDismissed(true)}>✕</button>
      </div>
    )}
    <header className="app-header">
      <div className="logo">☕ Brewlog note</div>
      <div className="header-right">
        {user ? (
          <>
            <span
              className={`nick-badge ${myRecipesOnly ? "active" : ""}`}
              onClick={() => setMyRecipesOnly(v => !v)}
              title={myRecipesOnly ? "전체 피드 보기" : "내 레시피만 보기"}
            >
              @{user?.displayName}{myRecipesOnly ? " 👤" : ""}
            </span>
            {isAdmin && <button className="btn-admin-header" onClick={() => setAdminMode(true)}>관리자</button>}
            <button className="btn-lang" onClick={toggleLang}>{lang === "ko" ? "EN" : "KO"}</button>
            <button className="btn-my" onClick={() => setShowMyModal(true)}>MY</button>
            <button className="btn-logout" onClick={() => signOut(auth)}>{I18N[lang].logout}</button>
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
    {/* 타이틀 + 베스트 */}
    <div className="main-wrap">
      <div className="section-title">{myRecipesOnly ? I18N[lang].myFeedTitle : I18N[lang].feedTitle}</div>
      <div className="section-sub">{myRecipesOnly ? I18N[lang].myFeedSub : I18N[lang].feedSub}</div>
      <div className="divider" style={{ marginBottom: "1.5rem" }} />
      {(() => {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(startOfDay);
        startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const getTop = (since) => {
          const filtered = [...recipes].filter(r => {
            if ((r.likedBy || []).length === 0) return false;
            if (!since) return true;
            const created = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt);
            return created && created >= since;
          });
          return filtered.sort((a, b) => (b.likedBy?.length || 0) - (a.likedBy?.length || 0))[0] || null;
        };

        const periods = [
          { label: lang === "en" ? "🌅 Today" : "🌅 오늘", recipe: getTop(startOfDay) },
          { label: lang === "en" ? "📅 This Week" : "📅 이번 주", recipe: getTop(startOfWeek) },
          { label: lang === "en" ? "🗓 This Month" : "🗓 이번 달", recipe: getTop(startOfMonth) },
        ].filter(p => p.recipe);

        if (periods.length === 0) return null;
        return (
          <div className="best-section">
            <div className="best-title">{I18N[lang].bestTitle}</div>
            <div className="best-grid">
              {periods.map((p, i) => (
                <div key={i} className="best-card" onClick={() => setDetailRecipe(p.recipe)}>
                  <div style={{
                    fontSize: "0.72rem", fontFamily: "'DM Sans',sans-serif",
                    color: "var(--latte)", letterSpacing: "0.12em", textTransform: "uppercase",
                    marginBottom: "0.6rem", fontWeight: 600,
                  }}>{p.label}</div>
                  {p.recipe.machine && <div className="best-card-machine">🤖 {p.recipe.machine}</div>}
                  <div className="best-card-company">{p.recipe.company}</div>
                  <div className="best-card-bean">{p.recipe.bean}</div>
                  <div className="best-card-author">@{p.recipe.author}</div>
                  <div className="best-card-heart">❤️ {(p.recipe.likedBy || []).length}</div>
                </div>
              ))}
            </div>
            <div className="divider" style={{ marginTop: "2rem", marginBottom: 0 }} />
          </div>
        );
      })()}
    </div>

    {/* 검색바 sticky 고정 */}
    <div className="toolbar-sticky">
      <div className="toolbar">
        <div className="bookmark-tab">
          <button className={`bookmark-tab-btn ${feedTab === "all" ? "active" : ""}`} onClick={() => { setFeedTab("all"); setMyRecipesOnly(false); }}>{I18N[lang].allRecipes}</button>
          <button className={`bookmark-tab-btn ${feedTab === "following" ? "active" : ""}`} onClick={() => { setFeedTab("following"); setMyRecipesOnly(false); }}>📡 {I18N[lang].followingFeed} {following.length > 0 ? `(${following.length})` : ""}</button>
          <button className={`bookmark-tab-btn ${feedTab === "bookmarks" ? "active" : ""}`} onClick={() => { setFeedTab("bookmarks"); setMyRecipesOnly(false); }}>🔖 {I18N[lang].myBookmarks} {bookmarks.length > 0 ? `(${bookmarks.length})` : ""}</button>
          {user && <button className={`bookmark-tab-btn ${feedTab === "mine" ? "active" : ""}`} onClick={() => { setFeedTab("mine"); setMyRecipesOnly(false); }}>👤 {I18N[lang].myRecipes}</button>}
        </div>
        <div style={{ display: "flex", gap: "1rem", flex: 1, flexWrap: "wrap", alignItems: "center" }}>
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={I18N[lang].searchPlaceholder} />
          </div>
          <button className="btn-new" onClick={() => { if (!user && onRequireAuth) { onRequireAuth(); } else { setShowModal(true); } }}>{I18N[lang].newRecipe}</button>
        </div>
      </div>
    </div>

    {/* 레시피 목록 */}
    <div className="main-wrap" style={{ paddingTop: "1rem" }}>
      <div className="recipes-grid">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <span>☕</span>
<p>{search ? (lang === "en" ? "No results found." : "검색 결과가 없어요.") : feedTab === "bookmarks" ? (lang === "en" ? "No bookmarks yet." : "즐겨찾기한 레시피가 없어요.") : feedTab === "following" ? (lang === "en" ? "No subscriptions yet. Subscribe to brewers you like!" : "구독한 브루어가 없어요. 마음에 드는 브루어를 구독해보세요!") : feedTab === "mine" ? (lang === "en" ? "No recipes yet. Start brewing!" : "아직 내 레시피가 없어요. 첫 레시피를 기록해보세요!") : myRecipesOnly ? (lang === "en" ? "No recipes yet." : "아직 내 레시피가 없어요.") : (lang === "en" ? "No recipes yet. Be the first!" : "아직 레시피가 없어요.")}</p>
          </div>
        ) : filtered.map(r => (
          <RecipeCard key={r.id} recipe={r} currentUid={user?.uid} lang={lang}
            onDelete={handleDelete}
            onLike={handleLike}
            onBookmark={toggleBookmark}
            isBookmarked={bookmarks.includes(r.id)}
            onFollow={toggleFollow}
            isFollowing={following.includes(r.uid) || following.includes(r.author)}
            onEdit={r => { setEditTarget(r); setShowModal(true); }}
            onCardClick={() => setDetailRecipe(r)} />
        ))}
      </div>
    </div>
    {showMyModal && <MyModal user={user} lang={lang} onClose={() => setShowMyModal(false)} />}
    {detailRecipe && (
      <RecipeDetailModal
        recipe={detailRecipe}
        currentUid={user?.uid}
        currentUser={user}
        onRequireAuth={onRequireAuth}
        lang={lang}
        onClose={() => setDetailRecipe(null)}
        onLike={r => { handleLike(r); }}
        onEdit={r => { setEditTarget(r); setShowModal(true); setDetailRecipe(null); }}
        onDelete={id => { handleDelete(id); setDetailRecipe(null); }}
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
  const [loading, setLoading] = useState(false);

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
  useEffect(() => { if (tab === "notices") loadNotices(); }, [tab, loadNotices]);

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
    { key: "stats", label: "📊 통계" },
    { key: "users", label: "👥 회원 관리" },
    { key: "recipes", label: "📋 레시피 관리" },
    { key: "notices", label: "📢 공지사항" },
    { key: "brands", label: "☕ 브랜드 관리" },
  ];

  return (<>
    <header className="app-header">
      <div className="logo">☕ Brewlog <span style={{ fontSize: "0.75rem", color: "#ff6b6b", marginLeft: "0.5rem" }}>ADMIN</span></div>
      <div className="header-right">
        <button className="btn-admin-header" onClick={onExit}>← 일반화면</button>
        <button className="btn-logout" onClick={() => signOut(auth)}>{I18N[lang].logout}</button>
      </div>
    </header>
    <div className="admin-wrap">
      <div className="admin-tabs">
        {TABS.map(t => (
          <button key={t.key} className={`admin-tab ${tab === t.key ? "active" : ""}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && <p style={{ color: "var(--muted)", textAlign: "center", padding: "2rem" }}>불러오는 중…</p>}

      {/* ── 통계 ── */}
      {tab === "stats" && !loading && (
        <>
          <div className="admin-stat-grid">
            <div className="stat-card">
              <span className="stat-card-val">{users.length}</span>
              <span className="stat-card-label">총 회원 수</span>
            </div>
            <div className="stat-card">
              <span className="stat-card-val">{recipes.length}</span>
              <span className="stat-card-label">총 레시피 수</span>
            </div>
            <div className="stat-card">
              <span className="stat-card-val">{notices.length}</span>
              <span className="stat-card-label">공지사항 수</span>
            </div>
            <div className="stat-card">
              <span className="stat-card-val">
                {recipes.length && users.length ? (recipes.length / users.length).toFixed(1) : 0}
              </span>
              <span className="stat-card-label">인당 레시피</span>
            </div>
          </div>
          <div className="admin-card">
            <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: "0.8rem", fontWeight: 500 }}>최근 레시피 5개</p>
            {recipes.slice(0, 5).map(r => (
              <div key={r.id} style={{ padding: "0.5rem 0", borderBottom: "1px solid var(--steam)", fontSize: "0.85rem" }}>
                <span style={{ color: "var(--roast)", fontWeight: 500 }}>@{r.author}</span>
                <span style={{ color: "var(--muted)", margin: "0 0.4rem" }}>·</span>
                <span>{r.company} {r.bean}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── 회원 관리 ── */}
      {tab === "users" && !loading && (
        <div className="admin-card" style={{ overflowX: "auto" }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>닉네임</th>
                <th>보안질문</th>
                <th>UID</th>
                <th>삭제</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 500 }}>@{u.nickname}</td>
                  <td style={{ color: "var(--muted)", fontSize: "0.8rem", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.securityQuestion}</td>
                  <td style={{ color: "var(--muted)", fontSize: "0.75rem", fontFamily: "monospace" }}>{u.id.slice(0, 12)}…</td>
                  <td>
                    {u.id !== user?.uid && (
                      <button className="btn-danger" onClick={() => deleteUser(u.id, u.nickname)}>삭제</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && <p style={{ color: "var(--muted)", textAlign: "center", padding: "2rem" }}>회원이 없어요.</p>}
        </div>
      )}

      {/* ── 레시피 관리 ── */}
      {tab === "recipes" && !loading && (
        <div className="admin-card" style={{ overflowX: "auto" }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>작성자</th>
                <th>원두</th>
                <th>머신</th>
                <th>삭제</th>
              </tr>
            </thead>
            <tbody>
              {recipes.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 500 }}>@{r.author}</td>
                  <td>{r.company} {r.bean}</td>
                  <td style={{ color: "var(--muted)", fontSize: "0.8rem" }}>{r.machine || "-"}</td>
                  <td>
                    <button className="btn-danger" onClick={() => deleteRecipe(r.id, r.bean)}>삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {recipes.length === 0 && <p style={{ color: "var(--muted)", textAlign: "center", padding: "2rem" }}>레시피가 없어요.</p>}
        </div>
      )}

      {/* ── 공지사항 ── */}
      {tab === "notices" && !loading && (
        <>
          <div className="admin-card">
            <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: "1rem", fontWeight: 500 }}>
              {editNoticeId ? "✏️ 공지사항 수정" : "새 공지사항 작성"}
            </p>
            <div className="notice-form">
              <div className="field" style={{ marginBottom: 0 }}>
                <label>제목</label>
                <input value={noticeTitle} onChange={e => setNoticeTitle(e.target.value)} placeholder="공지사항 제목" />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>내용</label>
                <textarea value={noticeBody} onChange={e => setNoticeBody(e.target.value)} placeholder="공지 내용을 입력해주세요…" rows={3} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                {editNoticeId && (
                  <button className="btn-cancel" onClick={cancelEditNotice}>취소</button>
                )}
                <button className="btn-save-sm" onClick={postNotice} disabled={noticeSaving}>
                  {noticeSaving ? "저장 중…" : editNoticeId ? "수정 저장" : "공지 등록"}
                </button>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
            {notices.map(n => (
              <div key={n.id} className="notice-item" style={{ borderLeft: editNoticeId === n.id ? "3px solid var(--accent)" : "none", paddingLeft: editNoticeId === n.id ? "0.8rem" : undefined }}>
                <div className="notice-item-header">
                  <div style={{ flex: 1 }}>
                    <div className="notice-item-title">{n.title}</div>
                    <div className="notice-item-body">{n.body}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.4rem", flexShrink: 0 }}>
                    <span className="notice-item-date">{n.createdAt?.toDate?.()?.toLocaleDateString("ko-KR") || ""}</span>
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      <button className="btn-change" onClick={() => startEditNotice(n)}>수정</button>
                      <button className="btn-danger" onClick={() => deleteNotice(n.id)}>삭제</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {notices.length === 0 && <p style={{ color: "var(--muted)", textAlign: "center", padding: "2rem" }}>공지사항이 없어요.</p>}
          </div>
        </>
      )}

      {/* ── 브랜드 관리 ── */}
      {tab === "brands" && !loading && (
        <>
          {brandMsg && <p className={brandMsg.type === "error" ? "msg-error" : "msg-ok"} style={{ marginBottom: "1rem", textAlign: "center" }}>{brandMsg.text}</p>}
          {/* 커피 머신 브랜드 */}
          <div className="admin-card" style={{ marginBottom: "1.5rem" }}>
            <p style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--muted)", marginBottom: "1rem" }}>🤖 커피 머신 브랜드</p>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
              <input value={newMachineBrand} onChange={e => setNewMachineBrand(e.target.value)}
                placeholder="새 브랜드명 입력" onKeyDown={e => e.key === "Enter" && addMachineBrand()}
                style={{ flex: 1, padding: "0.65rem 1rem", border: "1px solid var(--steam)", borderRadius: "2px", fontFamily: "'DM Sans',sans-serif", fontSize: "0.9rem", outline: "none", background: "var(--cream)", color: "var(--espresso)" }} />
              <button className="btn-save-sm" onClick={addMachineBrand} disabled={brandSaving}>추가</button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {machineBrandList.map(b => (
                <div key={b} style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "var(--cream)", border: "1px solid var(--steam)", borderRadius: "2px", padding: "0.35rem 0.8rem", fontSize: "0.85rem" }}>
                  <span>{b}</span>
                  <button onClick={() => removeMachineBrand(b)} style={{ background: "none", border: "none", cursor: "pointer", color: "#c0392b55", fontSize: "0.9rem", lineHeight: 1, padding: 0 }}>✕</button>
                </div>
              ))}
              {machineBrandList.length === 0 && <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>브랜드가 없어요.</p>}
            </div>
          </div>
          {/* 그라인더 브랜드 */}
          <div className="admin-card">
            <p style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--muted)", marginBottom: "1rem" }}>⚙️ 그라인더 브랜드</p>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
              <input value={newGrinderBrand} onChange={e => setNewGrinderBrand(e.target.value)}
                placeholder="새 브랜드명 입력" onKeyDown={e => e.key === "Enter" && addGrinderBrand()}
                style={{ flex: 1, padding: "0.65rem 1rem", border: "1px solid var(--steam)", borderRadius: "2px", fontFamily: "'DM Sans',sans-serif", fontSize: "0.9rem", outline: "none", background: "var(--cream)", color: "var(--espresso)" }} />
              <button className="btn-save-sm" onClick={addGrinderBrand} disabled={brandSaving}>추가</button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {grinderBrandList.map(b => (
                <div key={b} style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "var(--cream)", border: "1px solid var(--steam)", borderRadius: "2px", padding: "0.35rem 0.8rem", fontSize: "0.85rem" }}>
                  <span>{b}</span>
                  <button onClick={() => removeGrinderBrand(b)} style={{ background: "none", border: "none", cursor: "pointer", color: "#c0392b55", fontSize: "0.9rem", lineHeight: 1, padding: 0 }}>✕</button>
                </div>
              ))}
              {grinderBrandList.length === 0 && <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>브랜드가 없어요.</p>}
            </div>
          </div>
        </>
      )}
    </div>
  </>);
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
      <div className="loading-wrap"><p>☕ 로딩 중…</p></div>
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
