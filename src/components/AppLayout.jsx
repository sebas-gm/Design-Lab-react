import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import CatalogStatus from "./CatalogStatus";
import "../styles/welcome.css";

export default function AppLayout() {
  const { pathname } = useLocation();
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
      <div className="app-content">
        <CatalogStatus />
        <Outlet />
        <Footer />
      </div>
    </>
  );
}
