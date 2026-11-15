import { Link } from 'react-router-dom';
import { useLab } from '../context';
import '../styles/reports.css';

export default function ReportLink({ tipo, id, negocioId }) {
  const { user, negocios } = useLab();
  const business = negocios.find((b) => b.id === (tipo === 'negocio' ? id : negocioId));
  if (!user || user.is_admin || !id || business?.owner_id === user.id || business?.estado !== 'activo') return null;
  return <Link className="report-link" to={`/reportar?tipo=${tipo}&id=${id}`}>Reportar {tipo}</Link>;
}
