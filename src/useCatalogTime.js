import { useEffect, useState } from 'react';
import { catalogTime } from './catalogOrder';
export function useCatalogTime() {
  const [time, setTime] = useState(() => catalogTime());
  useEffect(() => {
    const update = () => setTime(catalogTime());
    const timer = window.setInterval(update, 60000);
    window.addEventListener('focus', update);
    return () => { clearInterval(timer); window.removeEventListener('focus', update); };
  }, []);
  return time;
}
