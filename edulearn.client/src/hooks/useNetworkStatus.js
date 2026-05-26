import { useEffect, useState } from 'react';
export function useNetworkStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  const [since, setSince] = useState(Date.now());
  useEffect(() => {
    const up   = () => { setOnline(true);  setSince(Date.now()); };
    const down = () => { setOnline(false); setSince(Date.now()); };
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);
  return { online, since };
}
