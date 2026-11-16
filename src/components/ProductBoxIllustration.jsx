import { useId } from 'react';

export default function ProductBoxIllustration() {
  const id = useId();
  return <svg className="owner-products-box" viewBox="0 0 230 150" fill="none" aria-hidden="true">
    <defs><linearGradient id={`${id}-box`} x1="60" y1="65" x2="165" y2="140" gradientUnits="userSpaceOnUse"><stop stopColor="#b87bea"/><stop offset="1" stopColor="#8140c8"/></linearGradient><linearGradient id={`${id}-lid`} x1="60" y1="35" x2="173" y2="78" gradientUnits="userSpaceOnUse"><stop stopColor="#9b5ed7"/><stop offset="1" stopColor="#6530a4"/></linearGradient></defs>
    <path d="M21 105c-9-27 45-30 65-59s56-40 87-13 37 71 16 91-154 13-168-19Z" fill="#eee2fc"/>
    <ellipse cx="118" cy="133" rx="65" ry="8" fill="#dcc5f3"/>
    <path d="m61 66 54-17 58 18-1 60-57 12-54-16V66Z" fill={`url(#${id}-box)`}/>
    <path d="m115 79 57-12v60l-57 12V79Z" fill="#9658d3"/>
    <path d="m61 66 54-17 58 18-58 14-54-15Z" fill="#592b94"/>
    <path d="m61 66-18 19 51 18 21-22-54-15Z" fill="#c39aec"/>
    <path d="m115 81 58-14 21 18-57 17-22-21Z" fill="#b987e2"/>
    <path d="m61 66 10-27 47-3 55 31-58-16-54 15Z" fill={`url(#${id}-lid)`}/>
    <path d="m115 51 13-24 56 3-11 37-58-16Z" fill="#aa79de"/>
    <path d="m111 99 16-5 13 18-12 11-17-14V99Z" fill="#ffda69"/><circle cx="118" cy="102" r="2" fill="white"/>
    <path d="m44 52-12-7m23-7-5-14m-14 39-14 1" stroke="#f4c344" strokeWidth="5" strokeLinecap="round"/>
  </svg>;
}
