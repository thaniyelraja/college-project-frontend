import React, { useState, useEffect } from 'react';
import { WifiOff, AlertTriangle } from 'lucide-react';

const NetworkStatusIndicator = () => {
  const [status, setStatus] = useState('online');

  useEffect(() => {
    const checkConnection = () => {
      if (!navigator.onLine) {
        setStatus('offline');
        return;
      }
      
      // Experimental Network Information API
      const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (conn) {
        if (conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g' || conn.downlink < 0.5) {
          setStatus('slow');
          return;
        }
      }
      
      setStatus('online');
    };

    window.addEventListener('online', checkConnection);
    window.addEventListener('offline', () => setStatus('offline'));

    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn) {
      conn.addEventListener('change', checkConnection);
    }

    checkConnection();

    return () => {
      window.removeEventListener('online', checkConnection);
      window.removeEventListener('offline', () => setStatus('offline'));
      if (conn) {
        conn.removeEventListener('change', checkConnection);
      }
    };
  }, []);

  if (status === 'online') return null;

  return (
    <div className={`fixed top-0 left-0 w-full z-[99999] px-4 py-2.5 flex items-center justify-center gap-3 text-sm font-sans tracking-wide shadow-md transform transition-all duration-500 ${
      status === 'offline' ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'
    }`}>
      {status === 'offline' ? (
        <>
          <WifiOff className="w-4 h-4 animate-pulse" />
          <span><strong className="font-bold uppercase tracking-widest text-[11px] mr-1">You're Offline</strong> Check your internet connection.</span>
        </>
      ) : (
        <>
          <AlertTriangle className="w-4 h-4 animate-pulse" />
          <span><strong className="font-bold uppercase tracking-widest text-[11px] mr-1">Slow Network Detected</strong> Some features may respond slowly.</span>
        </>
      )}
    </div>
  );
};

export default NetworkStatusIndicator;
