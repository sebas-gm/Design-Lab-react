
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Home from './pages/Home';
import Negocios from './pages/Negocios';
import DetalleNegocio from './pages/DetalleNegocio';
import Register from './pages/Register';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import RegistrarNegocio from './pages/RegistrarNegocio';
import RegistrarProducto from './pages/RegistrarProducto';
import AdministrarProductos from './pages/AdministrarProductos';
import AdministrarNegocios from './pages/AdministrarNegocios';
import AdministrarPromociones from './pages/AdministrarPromociones';

import Navbar from './components/Navbar';
import Footer from './components/Footer';

function App() {
  return (
    <BrowserRouter>
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/negocios" element={<Negocios />} />
        <Route path="/negocios/:id" element={<DetalleNegocio />} />
        <Route path="/registro" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/registrar-negocio" element={<RegistrarNegocio />} />
        <Route path="/registrar-producto" element={<RegistrarProducto />} />
        <Route path="/administrar-productos" element={<AdministrarProductos />} />
        <Route path="/administrar-negocios" element={<AdministrarNegocios />} />
        <Route path="/administrar-promociones" element={<AdministrarPromociones />} />
      </Routes>

      <Footer />
    </BrowserRouter>
  );
}

export default App;
