import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Apply saved theme immediately before render
(function applyTheme() {
  const theme = localStorage.getItem('hexis_theme') || 'green';
  if (theme === 'blue') {
    document.documentElement.style.setProperty('--color-primary', '#3b82f6');
    document.documentElement.style.setProperty('--color-bg', '#0a0f1a');
    document.documentElement.style.setProperty('--color-surface', '#0d1829');
    document.documentElement.style.setProperty('--color-border', '#1e3a5f');
    document.documentElement.style.setProperty('--color-accent', '#60a5fa');
    document.documentElement.style.setProperty('--color-text', '#e2e8f0');
    document.documentElement.style.setProperty('--color-muted', '#94a3b8');
  } else if (theme === 'purple') {
    document.documentElement.style.setProperty('--color-primary', '#a78bfa');
    document.documentElement.style.setProperty('--color-bg', '#0d0a1a');
    document.documentElement.style.setProperty('--color-surface', '#150d2b');
    document.documentElement.style.setProperty('--color-border', '#2d1f4e');
    document.documentElement.style.setProperty('--color-accent', '#c4b5fd');
    document.documentElement.style.setProperty('--color-text', '#ede9fe');
    document.documentElement.style.setProperty('--color-muted', '#9f7aea');
  } else {
    document.documentElement.style.setProperty('--color-primary', '#52b788');
    document.documentElement.style.setProperty('--color-bg', '#0a1a0f');
    document.documentElement.style.setProperty('--color-surface', '#0d2818');
    document.documentElement.style.setProperty('--color-border', '#1b4332');
    document.documentElement.style.setProperty('--color-accent', '#74c69d');
    document.documentElement.style.setProperty('--color-text', '#d8f3dc');
    document.documentElement.style.setProperty('--color-muted', '#95d5b2');
  }
})();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
