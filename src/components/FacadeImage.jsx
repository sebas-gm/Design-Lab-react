import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "../styles/imageViewer.css";

function ImageViewer({ src, alt, onClose }) {
  const dialog = useRef(null);
  const title = useId();
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    const element = dialog.current;
    document.body.style.overflow = "hidden";
    element.showModal();
    return () => {
      element.close();
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return <dialog ref={dialog} className="facade-viewer" aria-labelledby={title}
    onCancel={(e) => { e.preventDefault(); onClose(); }}
    onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="facade-viewer-content">
      <header><h2 id={title}>{alt}</h2><button type="button" autoFocus onClick={onClose} aria-label="Cerrar imagen">✕</button></header>
      <img src={src} alt={alt} />
      <p>Imagen completa guardada · Escape para cerrar</p>
    </div>
  </dialog>;
}

export default function FacadeImage({ src, alt }) {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  return <>
    <button type="button" className="facade-image-trigger" disabled={failed} aria-label={`Ver imagen completa: ${alt}`} onClick={() => setOpen(true)}>
      <img src={src} alt={alt} onError={() => setFailed(true)} hidden={failed} />
      <span className="facade-image-hint">{failed ? "Imagen no disponible" : "Ver imagen completa ⤢"}</span>
    </button>
    {open && createPortal(<ImageViewer src={src} alt={alt} onClose={() => setOpen(false)} />, document.body)}
  </>;
}
