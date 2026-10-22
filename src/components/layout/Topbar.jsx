import React, { useState } from 'react';
import Icon from '../../assets/icons.jsx';
import { useNavigate } from 'react-router-dom';

export default function Topbar() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  return (
    <header className="topbar">
      <button type="button" className="menu-toggle" aria-label="Abrir o cerrar navegación" onClick={() => window.dispatchEvent(new Event('ogp:toggle-menu'))}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
      </button>
      <div className="utils">
        <form className="search" role="search" aria-label="Buscar en el observatorio" onSubmit={event => { event.preventDefault(); if (query.trim()) navigate(`/buscar?q=${encodeURIComponent(query.trim())}`); }}>
          <Icon name="search" size={16} />
          <input aria-label="Buscar en el observatorio" type="search" maxLength={200} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar en el observatorio…" />
          <button className="search-submit" type="submit" aria-label="Realizar búsqueda">↵</button>
        </form>
        <button type="button" className="iconbtn" aria-label="Notificaciones" title="Notificaciones"><Icon name="bell" size={18} /><span className="dot" /></button>
        <button type="button" className="iconbtn" aria-label="Ayuda" title="Ayuda"><Icon name="help" size={18} /></button>
        <div className="avatar" aria-label="Cuenta del Observatorio">OG</div>
      </div>
    </header>
  );
}
