import { useState } from 'react';
import { api } from '../api';
import { useLab } from '../context';
import { negocios as ejemplosNegocios } from '../data/negocios';
import { productos as ejemplosProductos } from '../data/productos';

export default function LegacyImport() {
  const { refresh } = useLab();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function importar(ejemplos) {
    setBusy(true);
    try {
      const negocios = ejemplos ? ejemplosNegocios.map(n => ({ ...n, direccion: 'Dirección pendiente de verificar' })) : JSON.parse(localStorage.getItem('negociosRegistrados') || '[]');
      const productos = ejemplos ? ejemplosProductos : JSON.parse(localStorage.getItem('productosRegistrados') || '[]');
      if (!negocios.length && !productos.length) throw new Error('No hay datos locales para importar.');
      if (!window.confirm(`Se importarán ${negocios.length} negocios y ${productos.length} productos a tu cuenta. ¿Continuar?`)) return;
      const result = await api('/importar', { method: 'POST', body: { negocios, productos } });
      setMessage(result.message);
      await refresh();
    } catch (e) { setMessage(e.message); }
    finally { setBusy(false); }
  }
  return <section className="migration-panel"><h2>Conservar datos anteriores</h2>
    <p>Importa los registros de este navegador a tu cuenta. No se eliminan ni modifican los originales. Repetir la importación no duplica registros.</p>
    <button disabled={busy} onClick={() => importar(false)}>Importar mis datos locales</button>{' '}
    <button disabled={busy} onClick={() => importar(true)}>Importar catálogo de ejemplo</button>
    <p role="status">{message}</p></section>;
}
