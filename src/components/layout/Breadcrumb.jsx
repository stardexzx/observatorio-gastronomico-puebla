import React from 'react';
import { Link, useLocation } from 'react-router-dom';
const labels = [
  ['/buscar', 'Consulta', 'Resultados de búsqueda'], ['/registro', 'Explorar', 'Ficha pública'],
  ['/mapa', 'Explorar', 'Mapa'], ['/recetas', 'Explorar', 'Recetas'], ['/mercados', 'Explorar', 'Mercados'],
  ['/cocineras', 'Explorar', 'Cocineras y Cocineros'], ['/proteccion-legal', 'Explorar', 'Protección legal'],
  ['/red-conocimiento', 'Datos y Análisis', 'Red de conocimiento'], ['/reportes', 'Datos y Análisis', 'Reportes'],
  ['/acerca', 'Conocer el Observatorio', 'Acerca del Observatorio'], ['/memoria', 'Conocer el Observatorio', 'Memoria histórica'],
  ['/podcast', 'Comunidad', 'Podcast'], ['/experiencias', 'Comunidad', 'Experiencias de turistas'], ['/admin', 'Administración', 'Administración'],
];
export default function Breadcrumb() {
  const { pathname } = useLocation();
  if (pathname === '/') return null;
  const base = labels.find(([path]) => pathname === path || pathname.startsWith(`${path}/`));
  if (!base) return null;
  return <div className="route-crumb"><Link to="/">Inicio</Link><span> › </span><span>{base[1]}</span><span> › </span><b>{base[2]}</b></div>;
}
