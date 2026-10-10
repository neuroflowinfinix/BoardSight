import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Suppress benign ResizeObserver errors that can crash the dev overlay during layout transitions
window.addEventListener('error', e => {
  if (e.message === 'ResizeObserver loop limit exceeded' || e.message === 'ResizeObserver loop completed with undelivered notifications.') {
    e.stopImmediatePropagation();
  }
});

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', background: '#fee2e2', color: '#991b1b', minHeight: '100vh', fontFamily: 'monospace' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Something went wrong.</h1>
          <p style={{ marginTop: '10px' }}>{this.state.error?.toString()}</p>
          <pre style={{ marginTop: '20px', whiteSpace: 'pre-wrap', fontSize: '12px' }}>
            {this.state.errorInfo?.componentStack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}



ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// --- Silent Auto-Update Polling ---
if (import.meta.env.PROD) {
  const checkVersion = async () => {
    try {
      // Force network request bypassing all browser/SW caches
      const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      
      const storedVersion = localStorage.getItem('boardsight_version') || localStorage.getItem('chess_review_version');

      if (!storedVersion) {
        // First visit ever: just save the current version
        localStorage.setItem('boardsight_version', data.version);
        localStorage.removeItem('chess_review_version');
      } else if (storedVersion !== data.version) {
        console.log(`[Auto-Update] Version change detected (${storedVersion} -> ${data.version}). Wiping caches for a clean slate...`);
        // Update stored version immediately to prevent infinite reload loops
        localStorage.setItem('boardsight_version', data.version);
        localStorage.removeItem('chess_review_version');

        // Unregister the service worker completely to prevent COOP/COEP header drops during reload
        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          for (let reg of regs) {
            await reg.unregister();
          }
        }
        
        // Explicitly wipe all CacheStorage to ensure a perfect clean slate (including cached engines)
        if ('caches' in window) {
          const keys = await caches.keys();
          for (const key of keys) {
            await caches.delete(key);
          }
        }
        
        // Execute a clean reload to pull fresh assets
        window.location.reload();
      }
    } catch (e) {
      // Fail silently if offline
    }
  };

  // Check 2 seconds after initial load, then every 2 minutes
  setTimeout(checkVersion, 2000);
  setInterval(checkVersion, 120 * 1000);
  
  // Immediately check when user switches back to the tab
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkVersion();
    }
  });
}