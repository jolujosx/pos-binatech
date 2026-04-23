import { useEffect, useRef, useState, useCallback } from 'react';

export function useBarcodeScanner(timeout = 120) {
  const buffer = useRef('');
  const timer = useRef(null);
  const [scannedCode, setScannedCode] = useState(null);

  const handleKeyDown = useCallback((e) => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || e.ctrlKey || e.metaKey) return;
    
    if (e.key === 'Enter') {
      e.preventDefault();
      if (buffer.current.length > 2) {
        setScannedCode(buffer.current);
      }
      buffer.current = '';
      clearTimeout(timer.current);
      return;
    }
    
    buffer.current += e.key;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { 
      buffer.current = ''; 
    }, timeout);
  }, [timeout]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return { 
    scannedCode, 
    reset: () => setScannedCode(null) 
  };
}