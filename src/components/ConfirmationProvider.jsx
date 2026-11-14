import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ConfirmationContext } from "../confirmation";
import { createConfirmationController } from "../confirmationController";
import "../styles/confirmation.css";

function ConfirmationDialog({ message, action, onAnswer }) {
  const dialog = useRef(null);
  const cancel = useRef(null);
  const titleId = useId();
  const messageId = useId();
  const titles = {
    logout: '¿Quieres cerrar tu sesión?',
    edit: "¿Editar esta información?",
    save: "¿Guardar los cambios?",
    delete: "¿Eliminar este registro?",
  };
  const labels = {
    logout: 'Sí, cerrar sesión',
    edit: "Sí, editar",
    save: "Sí, guardar",
    delete: "Sí, eliminar",
  };
  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const element = dialog.current;
    element.showModal();
    cancel.current.focus();
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  return (
    <dialog
      ref={dialog}
      className={`confirmation-dialog ${action === "delete" ? "is-destructive" : ""}`}
      aria-labelledby={titleId}
      aria-describedby={messageId}
      onCancel={(event) => {
        event.preventDefault();
        onAnswer(false);
      }}
    >
      <div className="confirmation-decoration" aria-hidden="true" />
      <span className="confirmation-brand">DESIGN LAB</span>
      <div className="confirmation-icon" aria-hidden="true">
        {action === "delete" ? "!" : "?"}
      </div>
      <h2 id={titleId}>{titles[action]}</h2>
      <p id={messageId}>{message}</p>
      <div className="confirmation-buttons">
        <button
          ref={cancel}
          className="confirmation-no"
          onClick={() => onAnswer(false)}
        >
          No, cancelar
        </button>
        <button className="confirmation-yes" onClick={() => onAnswer(true)}>
          {labels[action]}
        </button>
      </div>
      <small>Tú decides. Solo continuaremos si confirmas.</small>
    </dialog>
  );
}

export default function ConfirmationProvider({ children }) {
  const [pending, setPending] = useState(null);
  const [controller] = useState(() => createConfirmationController(setPending));
  useEffect(() => {
    const cancel = () => controller.cancel();
    window.addEventListener("popstate", cancel);
    return () => {
      window.removeEventListener("popstate", cancel);
      controller.cancel();
    };
  }, [controller]);
  return (
    <ConfirmationContext.Provider value={controller.request}>
      {children}
      {pending &&
        createPortal(
          <ConfirmationDialog {...pending} onAnswer={controller.answer} />,
          document.body,
        )}
    </ConfirmationContext.Provider>
  );
}
