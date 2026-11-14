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
  const generation = useRef(0);
  const userId = user?.id;

  const changeUser = useCallback((value) => {
    generation.current++;
    setUser(value);
    setLoading(false);
    if (!value) {
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
      const [businesses, products, account] = await Promise.all([
        api("/negocios"),
        api("/productos"),
        api("/auth/me"),
      ]);
      if (request !== generation.current) return;
      setNegocios(businesses);
      setProductos(products);
      setUser(account);
      setError("");
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
      }}
    >
      {children}
    </LabContext.Provider>
  );
}
