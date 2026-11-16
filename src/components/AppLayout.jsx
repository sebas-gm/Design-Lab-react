import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import CatalogStatus from "./CatalogStatus";
import BusinessNotice from "./BusinessNotice";
import PublicationNotice from "./PublicationNotice";
import { useLab } from "../context";
import { isClientView } from "../navigation";
import "../styles/welcome.css";

export default function AppLayout() {
  const { pathname } = useLocation();
  const { user } = useLab();
  const workspace =
    (user?.is_admin || user?.tipo_cuenta === "negocios") &&
    !isClientView(user, pathname);
  if (["/", "/login", "/registro"].includes(pathname)) {
    return (
      <div
        className={`entry-layout ${pathname === "/" ? "welcome-layout" : ""}`}
      >
        <Outlet />
      </div>
    );
  }
  return (
    <div
      className={`app-frame ${workspace ? "workspace-mode" : "explore-mode"} ${workspace && user?.is_admin ? "superadmin-mode" : ""}`}
    >
      <Navbar />
      <div
        className={`app-content ${workspace ? "business-content" : "personal-content"}`}
      >
        <CatalogStatus />
        {workspace && <BusinessNotice />}
        {workspace && <PublicationNotice />}
        <Outlet />
        <Footer />
      </div>
    </div>
  );
}
