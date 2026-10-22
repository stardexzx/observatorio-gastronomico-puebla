import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Icon from '../../assets/icons.jsx';
import { getReportData, usesDatabase } from '../../services/api.js';

const groups = [
  { id: 'explorar', label: 'Explorar', links: [
    { to: '/mapa', label: 'Mapa', icon: 'pin', tag: 'Público', tagClass: 'tag-pub' },
    { to: '/recetas', label: 'Recetas', icon: 'book', tag: 'Graduado', tagClass: 'tag-grad' },
    { to: '/mercados', label: 'Mercados', icon: 'stall', tag: 'Consent.', tagClass: 'tag-grad' },
    { to: '/cocineras', label: 'Cocineras y Cocineros', icon: 'person', tag: 'CLPI', tagClass: 'tag-restr' },
    { to: '/proteccion-legal', label: 'Protección legal', icon: 'shield', tag: 'Público', tagClass: 'tag-pub' },
  ]},
  { id: 'conocer', label: 'Conocer el Observatorio', links: [
    { to: '/memoria', label: 'Memoria histórica', icon: 'history', tag: 'Por definir', tagClass: 'tag-tech' },
    { to: '/acerca', label: 'Acerca del Observatorio', icon: 'info', tag: 'Público', tagClass: 'tag-pub' },
  ]},
  { id: 'comunidad', label: 'Comunidad', links: [
    { to: '/podcast', label: 'Podcast', icon: 'mic', tag: 'Nuevo', tagClass: 'tag-pub' },
    { to: '/experiencias', label: 'Experiencias de turistas', icon: 'chat', tag: 'Nuevo', tagClass: 'tag-pub' },
  ]},
  { id: 'datos', label: 'Datos y Análisis', links: [
    { to: '/reportes', label: 'Reportes', icon: 'chart', tag: 'Agregados', tagClass: 'tag-tech' },
    { to: '/red-conocimiento', label: 'Red de conocimiento', icon: 'network', tag: 'Avanzado', tagClass: 'tag-tech' },
  ]},
];

export default function MainNav() {
  const location = useLocation();
  const [openGroup, setOpenGroup] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const activePath = location.pathname;
  const pathMatches = (to) => activePath === to || activePath.startsWith(`${to}/`);

  useEffect(() => { setOpenGroup(''); setMobileOpen(false); }, [location.pathname]);
  useEffect(() => {
    const close = (event) => { if (!event.target.closest('.mainnav')) setOpenGroup(''); };
    const toggle = () => setMobileOpen((open) => !open);
    document.addEventListener('click', close);
    window.addEventListener('ogp:toggle-menu', toggle);
    return () => {
      document.removeEventListener('click', close);
      window.removeEventListener('ogp:toggle-menu', toggle);
    };
  }, []);
  const downloadMock = async (event) => {
    event.preventDefault();
    setDownloadError('');
    try {
    const data = await getReportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = usesDatabase ? 'ogp-indicadores-publicos.json' : 'ogp-analitica-mock.json'; anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setDownloadError('No fue posible descargar los datos. Intenta de nuevo.'); }
  };

  return (
    <nav className={`mainnav ${mobileOpen ? 'open' : ''}`} aria-label="Navegación principal">
      <div className="mn-list">
        <div className={`mn-group ${activePath === '/' ? 'active' : ''}`}><Link className="mn-btn" to="/">Inicio</Link></div>
        {groups.map((group) => {
          const active = group.links.some((item) => pathMatches(item.to));
          const open = openGroup === group.id;
          return (
            <div className={`mn-group ${active ? 'active' : ''} ${open ? 'open' : ''}`} key={group.id}>
              <button type="button" className="mn-btn" aria-haspopup="true" aria-expanded={open} onClick={() => setOpenGroup((current) => current === group.id ? '' : group.id)}>
                {group.label}<Icon name="chev" size={12} className="chev" />
              </button>
              <ul className="mn-menu">{group.links.map((item) => <li key={item.to}><Link to={item.to} className={pathMatches(item.to) ? 'current' : ''}><span className="lbl"><Icon name={item.icon} size={16} />{item.label}</span><span className={`tag ${item.tagClass}`}>{item.tag}</span></Link></li>)}</ul>
            </div>
          );
        })}
      </div>
      <div className="mn-aux">
        <a href="#descargar-datos" onClick={downloadMock}><Icon name="download" size={15} /> Descargar datos</a>
        {downloadError && <span className="download-error" role="alert">{downloadError}</span>}
        <Link to="/admin" className={pathMatches('/admin') ? 'current' : ''}><Icon name="lock" size={14} /> Administración</Link>
      </div>
    </nav>
  );
}
