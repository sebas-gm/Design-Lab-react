import LabProvider from "./components/LabProvider";
import ProtectedRoute from "./components/ProtectedRoute";

import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";

import Home from "./pages/Home";
import Negocios from "./pages/Negocios";
import DetalleNegocio from "./pages/DetalleNegocio";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import RegistrarNegocio from "./pages/RegistrarNegocio";
import RegistrarProducto from "./pages/RegistrarProducto";
import AdministrarProductos from "./pages/AdministrarProductos";
import AdministrarNegocios from "./pages/AdministrarNegocios";
import AdministrarPromociones from "./pages/AdministrarPromociones";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Videos from "./pages/Videos";
import Promociones from "./pages/Promociones";
import CatalogStatus from "./components/CatalogStatus";
import MiCuenta from "./pages/MiCuenta";
import ActivarNegocio from "./pages/ActivarNegocio";
import GuestRoute from "./components/GuestRoute";

function App() {
  return (
    <LabProvider>
      <BrowserRouter>
        <Navbar />
        <div className="app-content">
          <CatalogStatus />
          <Routes>
            <Route
              path="/registro"
              element={
                <GuestRoute>
                  <Register />
                </GuestRoute>
              }
            />
            <Route
              path="/login"
              element={
                <GuestRoute>
                  <Login />
                </GuestRoute>
              }
            />
            <Route
              element={
                <ProtectedRoute>
                  <Outlet />
                </ProtectedRoute>
              }
            >
              <Route path="/mi-cuenta" element={<MiCuenta />} />
              <Route path="/activar-negocio" element={<ActivarNegocio />} />
              <Route path="/" element={<Home />} />
              <Route path="/negocios" element={<Negocios />} />
              <Route path="/negocios/:id" element={<DetalleNegocio />} />
              <Route path="/videos" element={<Videos key="public-videos" />} />
              <Route path="/promociones" element={<Promociones />} />
              <Route
                path="/administrar-videos"
                element={
                  <ProtectedRoute business>
                    <Videos key="manage-videos" manage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute business>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/registrar-negocio"
                element={
                  <ProtectedRoute>
                    <RegistrarNegocio />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/registrar-producto"
                element={
                  <ProtectedRoute business>
                    <RegistrarProducto />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/administrar-productos"
                element={
                  <ProtectedRoute business>
                    <AdministrarProductos />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/administrar-negocios"
                element={
                  <ProtectedRoute business>
                    <AdministrarNegocios />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/administrar-promociones"
                element={
                  <ProtectedRoute business>
                    <AdministrarPromociones />
                  </ProtectedRoute>
                }
              />
              <Route
                path="*"
                element={
                  <main>
                    <h1>Página no encontrada</h1>
                    <a href="/">Volver al inicio</a>
                  </main>
                }
              />
            </Route>
          </Routes>

          <Footer />
        </div>
      </BrowserRouter>
    </LabProvider>
  );
}

export default App;
