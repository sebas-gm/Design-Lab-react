export default function VideoPlatformIcon({ platform }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{platform === 'TikTok' ? <path d="M14 3h3c0 3 2 4 4 4v3c-2 0-4-1-4-2v8a5 5 0 1 1-5-5v3a2 2 0 1 0 2 2V3Z"/> : <><rect x="2" y="5" width="20" height="14" rx="4"/><path d="m10 9 6 3-6 3V9Z"/></>}</svg>;
}
