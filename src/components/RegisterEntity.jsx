import { useNavigate } from "react-router-dom";
import EntityForm from "./EntityForm";
export default function RegisterEntity({ kind }) {
  const navigate = useNavigate();
  return (
    <main className="registrar-negocio">
      <h1>Registrar {kind === "negocios" ? "negocio" : "producto"}</h1>
      <p>
        {kind === "negocios"
          ? "Haz que más personas descubran tu negocio cerca de TECBA."
          : "Agrega un producto a tu catálogo."}
      </p>
      <EntityForm kind={kind} onSaved={() => navigate("/dashboard")} />
    </main>
  );
}
