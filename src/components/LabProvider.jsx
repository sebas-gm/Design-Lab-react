import { useEffect, useState } from "react";
import { LabContext } from "../context";
import { api } from "../api";

export default function LabProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [negocios, setNegocios] = useState([]);
  const [productos, setProductos] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const [businesses, products] = await Promise.all([
        api("/negocios"),
        api("/productos"),
      ]);
      setNegocios(businesses);
      setProductos(products);
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    Promise.resolve().then(refresh);
    api("/auth/me")
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setReady(true));
  }, []);

  return (
    <LabContext.Provider
      value={{
        user,
        setUser,
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
