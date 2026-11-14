import LabProvider from "./components/LabProvider";
import ProtectedRoute from "./components/ProtectedRoute";

import { BrowserRouter, Routes, Route } from "react-router-dom";

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

function App() {
  return (
    <LabProvider>
      <BrowserRouter>
        <Navbar />
        <div className="app-content">
          <CatalogStatus />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/negocios" element={<Negocios />} />
            <Route path="/negocios/:id" element={<DetalleNegocio />} />
            <Route path="/registro" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/videos" element={<Videos key="public-videos" />} />
            <Route path="/promociones" element={<Promociones />} />
            <Route
              path="/administrar-videos"
              element={
                <ProtectedRoute>
                  <Videos key="manage-videos" manage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
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
                <ProtectedRoute>
                  <RegistrarProducto />
                </ProtectedRoute>
              }
            />
            <Route
              path="/administrar-productos"
              element={
                <ProtectedRoute>
                  <AdministrarProductos />
                </ProtectedRoute>
              }
            />
            <Route
              path="/administrar-negocios"
              element={
                <ProtectedRoute>
                  <AdministrarNegocios />
                </ProtectedRoute>
              }
            />
            <Route
              path="/administrar-promociones"
              element={
                <ProtectedRoute>
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
          </Routes>

          <Footer />
        </div>
      </BrowserRouter>
    </LabProvider>
  );
}

export default App;
