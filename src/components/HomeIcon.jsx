export default function HomeIcon({ name }) {
  const paths = {
    shop: 'M4 10v11h16V10M2 10l3-7h14l3 7H2ZM9 21v-7h6v7',
    tag: 'M3 3h8l10 10-8 8L3 11V3Zm4 4h.01',
    video: 'M3 4h18v16H3V4Zm6 4v8l7-4-7-4Z',
    grid: 'M3 3h7v7H3V3Zm11 0h7v7h-7V3ZM3 14h7v7H3v-7Zm11 0h7v7h-7v-7Z',
    Comida: 'M4 3v6m3-6v6m-6-6v6h6m-3 0v12M16 3c-4 4-4 10 0 10V3Zm0 10v8',
    Servicios: 'm14 6 4-4 4 4-4 4-4-4ZM3 20l11-11m-6 5 3 3M3 3l5 5M2 2l3 1-2 2-1-3Z',
    Tienda: 'M4 7h16v14H4V7Zm4 0V5a4 4 0 0 1 8 0v2',
    Librería: 'M12 5C8 2 4 3 2 4v15c4-2 7-1 10 1m0-15c4-3 8-2 10-1v15c-4-2-7-1-10 1V5Z',
    Otros: 'M4 12h.01M12 12h.01M20 12h.01',
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.shop} /></svg>;
}
