import { Link } from 'react-router-dom';
import { useLab } from '../context';
import '../styles/reports.css';

export default function ReportLink({ tipo, id, negocioId, showIcon = false }) {
  const { user, negocios } = useLab();
  const business = negocios.find((b) => b.id === (tipo === 'negocio' ? id : negocioId));
  if (!user || user.is_admin || !id || business?.owner_id === user.id || business?.estado !== 'activo') return null;
  return <Link className="report-link" to={`/reportar?tipo=${tipo}&id=${id}`}>{showIcon && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 21V3m0 1c5-4 9 4 15 0v11c-6 4-10-4-15 0" /></svg>}Reportar {tipo}</Link>;
}
