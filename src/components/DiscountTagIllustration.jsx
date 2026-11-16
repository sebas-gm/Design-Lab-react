import { useId } from 'react';

export default function DiscountTagIllustration() {
  const id = useId();
  return <svg className="owner-promotion-art" viewBox="0 0 210 140" fill="none" aria-hidden="true"><defs><linearGradient id={`${id}-tag`} x1="75" y1="20" x2="150" y2="128" gradientUnits="userSpaceOnUse"><stop stopColor="#b56eea"/><stop offset="1" stopColor="#782cc5"/></linearGradient></defs><ellipse cx="119" cy="126" rx="58" ry="8" fill="#e2cef5"/><path d="m91 26 48-10 25 28-4 44-49 43-47-51 27-54Z" fill="#6627a9"/><path d="m89 22 47-10 25 28-4 44-48 43-47-51 27-54Z" fill={`url(#${id}-tag)`}/><circle cx="138" cy="35" r="7" fill="#f4e5ff"/><path d="M139 31c-9-43 45-35 36 0-5 17-21 21-17 2" stroke="#d3b4f1" strokeWidth="4" strokeLinecap="round"/><path d="m89 97 41-33" stroke="#f8f0ff" strokeWidth="6" strokeLinecap="round"/><circle cx="99" cy="67" r="7" stroke="#f8f0ff" strokeWidth="5"/><circle cx="123" cy="98" r="7" stroke="#f8f0ff" strokeWidth="5"/><path d="m57 34-11-9m23-4-4-14M47 49l-15-2" stroke="#f8ce50" strokeWidth="6" strokeLinecap="round"/></svg>;
}
