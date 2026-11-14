import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import CatalogStatus from "./CatalogStatus";
import { useLab } from "../context";
import "../styles/welcome.css";

export default function AppLayout() {
  const { pathname } = useLocation();
  const { user } = useLab();
  if (["/", "/login", "/registro"].includes(pathname)) {
    return (
      <div className="entry-layout">
        <Outlet />
      </div>
    );
  }
  return (
    <>
      <Navbar />
      <div
        className={`app-content ${user?.tipo_cuenta === "negocios" ? "business-content" : "personal-content"}`}
      >
        <CatalogStatus />
        <Outlet />
        <Footer />
      </div>
    </>
  );
}
