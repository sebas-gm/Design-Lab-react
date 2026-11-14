import { useNavigate } from "react-router-dom";
import EntityForm from "./EntityForm";
import { useLab } from "../context";
export default function RegisterEntity({ kind }) {
  const navigate = useNavigate();
  const { user } = useLab();
  return (
    <main className="registrar-negocio">
      <h1>Registrar {kind === "negocios" ? "negocio" : "producto"}</h1>
      {kind === "negocios" && user.tipo_cuenta === "personal" && (
        <p>
          Al guardar tu primer negocio se activará tu cuenta de negocios. Podrás
          seguir explorando Design Lab como siempre.
        </p>
      )}
      <p>
        {kind === "negocios"
          ? "Haz que más personas descubran tu negocio cerca de TECBA."
          : "Agrega un producto a tu catálogo."}
      </p>
      <EntityForm kind={kind} onSaved={() => navigate("/dashboard")} />
    </main>
  );
}
