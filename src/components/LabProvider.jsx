import { useCallback, useEffect, useRef, useState } from "react";
import { LabContext } from "../context";
import { api } from "../api";

export default function LabProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [negocios, setNegocios] = useState([]);
  const [productos, setProductos] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [moderation, setModeration] = useState(null);
  const [publication, setPublication] = useState(null);
  const [moderationError, setModerationError] = useState("");
  const [notificationCount, setNotificationCount] = useState(0);
  const generation = useRef(0);
  const userId = user?.id;

  const changeUser = useCallback((value) => {
    generation.current++;
    setUser(value);
    setLoading(false);
    if (!value) {
      setModeration(null);
      setPublication(null);
      setModerationError("");
      setNotificationCount(0);
      setNegocios([]);
      setProductos([]);
      setError("");
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true);
    try {
      const [businesses, products, account, application] = await Promise.all([
        api("/negocios"),
        api("/productos"),
        api("/auth/me"),
        api("/mi-publicacion"),
      ]);
      if (request !== generation.current) return;
      setNegocios(businesses);
      setProductos(products);
      setUser(account);
      setPublication(application);
      setError("");
      window.dispatchEvent(new Event("navishop:moderation-changed"));
    } catch (e) {
      if (request === generation.current) setError(e.message);
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    api("/auth/me")
      .then((account) => {
        if (active) changeUser(account);
      })
      .catch(() => {
        if (active) changeUser(null);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    const expired = () => changeUser(null);
    window.addEventListener("designlab:unauthorized", expired);
    return () => {
      active = false;
      window.removeEventListener("designlab:unauthorized", expired);
    };
  }, [changeUser]);

  useEffect(() => {
    if (userId) Promise.resolve().then(refresh);
  }, [userId, refresh]);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    const update = () => {
      const token = generation.current;
      return Promise.all([
        api("/mi-moderacion"),
        api("/notificaciones"),
        api("/auth/me"),
        api("/mi-publicacion"),
      ])
        .then(([state, notices, account, application]) => {
          if (!active || token !== generation.current) return;
          setModerationError("");
          setModeration(state);
          setPublication(application);
          setNotificationCount(notices.no_leidas);
          setUser(account);
          setNegocios((previous) => {
            const others = previous.filter((b) => b.owner_id !== userId);
            return state.negocio ? [state.negocio, ...others] : others;
          });
        })
        .catch((e) => {
          if (active && token === generation.current)
            setModerationError(e.message);
        });
    };
    Promise.resolve().then(update);
    const timer = window.setInterval(update, 30000);
    window.addEventListener("focus", update);
    window.addEventListener("navishop:moderation-changed", update);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", update);
      window.removeEventListener("navishop:moderation-changed", update);
    };
  }, [userId]);

  useEffect(() => {
    document.documentElement.classList.toggle(
      "reduce-motion",
      Boolean(user?.reducir_movimiento),
    );
    return () => document.documentElement.classList.remove("reduce-motion");
  }, [user?.reducir_movimiento]);

  return (
    <LabContext.Provider
      value={{
        user,
        setUser: changeUser,
        ready,
        negocios,
        productos,
        refresh,
        error,
        loading,
        moderation,
        publication,
        moderationError,
        notificationCount,
      }}
    >
      {children}
    </LabContext.Provider>
  );
}
