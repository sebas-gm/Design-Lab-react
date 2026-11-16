import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import '../styles/formModal.css';

export default function FormModal({ title, children, onClose, initialField }) {
  const dialog = useRef(null);
  const content = useRef(null);
  const titleId = useId();
  const [dirty, setDirty] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [busyNotice, setBusyNotice] = useState('');
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    const element = dialog.current;
    document.body.style.overflow = 'hidden';
    element.showModal();
    const frame = requestAnimationFrame(() => {
      const target = initialField && (content.current?.querySelector(`[data-time-name="${initialField}"] select`) || content.current?.querySelector(`[name="${initialField}"]:not([type="hidden"])`));
      (target || content.current?.querySelector('input:not([type="hidden"]):not(:disabled), select:not(:disabled), textarea:not(:disabled)'))?.focus({ preventScroll: true });
    });
    return () => {
      cancelAnimationFrame(frame);
      element.close();
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [initialField]);
  function requestClose() {
    if (content.current?.querySelector('fieldset:disabled, button[type="submit"]:disabled, button:not([type]):disabled')) {
      setBusyNotice('Espera a que termine la operación antes de cerrar.');
      return;
    }
    if (dirty) setDiscard(true);
    else onClose();
  }
  // The render prop receives a close event handler; it never reads the DOM during render.
  // eslint-disable-next-line react-hooks/refs
  const formContent = typeof children === 'function' ? children(requestClose) : children;
  return createPortal(
    <dialog ref={dialog} className="form-modal" aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); requestClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) requestClose(); }}>
      <div className="form-modal-panel">
        <header className="form-modal-heading"><div><span>NAVISHOP</span><h2 id={titleId}>{title}</h2></div><button type="button" className="form-modal-close" aria-label="Cerrar formulario" onClick={requestClose}>✕</button></header>
        {discard && <section className="form-modal-discard" role="alert"><strong>¿Descartar los cambios sin guardar?</strong><p>Si cierras, se perderán los cambios de este formulario.</p><div><button type="button" onClick={() => setDiscard(false)}>Seguir editando</button><button type="button" onClick={onClose}>Descartar y cerrar</button></div></section>}
        {busyNotice && <p className="form-modal-busy" role="status">{busyNotice}</p>}
        <div ref={content} className="form-modal-content" onChangeCapture={() => { setDirty(true); setBusyNotice(''); }}>
          {formContent}
        </div>
      </div>
    </dialog>, document.body,
  );
}
