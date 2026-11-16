import '../styles/navishopIcon.css';

export default function NavishopIcon({ className = '', alt = '' }) {
  return <img className={`navishop-icon ${className}`} src="/icon-navishop.png" alt={alt} decoding="async"/>;
}
