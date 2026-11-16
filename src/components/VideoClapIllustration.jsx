import { useId } from 'react';

export default function VideoClapIllustration() {
  const id = useId();
  return <svg className="owner-video-art" viewBox="0 0 215 140" fill="none" aria-hidden="true"><defs><linearGradient id={`${id}-clap`} x1="70" y1="45" x2="170" y2="125" gradientUnits="userSpaceOnUse"><stop stopColor="#af6be4"/><stop offset="1" stopColor="#7831bd"/></linearGradient></defs><ellipse cx="122" cy="125" rx="63" ry="8" fill="#e0caf3"/><rect x="63" y="51" width="119" height="74" rx="10" fill="#7131ad"/><rect x="61" y="49" width="119" height="73" rx="10" fill={`url(#${id}-clap)`}/><path d="m108 68 29 17-29 18V68Z" fill="#fff9ff"/><g transform="rotate(-12 61 50)"><rect x="61" y="31" width="119" height="20" rx="5" fill="#a071cf"/><path d="m72 31 12 20h15L87 31H72Zm36 0 12 20h15l-12-20h-15Zm36 0 12 20h15l-12-20h-15Z" fill="#f9f3ff"/></g><path d="m44 46-13-9m24-8L50 14M34 63l-15-2" stroke="#f9d15e" strokeWidth="6" strokeLinecap="round"/></svg>;
}
