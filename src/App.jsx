import { Navigate, Route, Routes } from 'react-router-dom';
import { IconSprite } from './assets/icons.jsx';
import Logo from './assets/logo.jsx';
import Breadcrumb from './components/layout/Breadcrumb.jsx';
import MainNav from './components/layout/MainNav.jsx';
import Topbar from './components/layout/Topbar.jsx';
import AcercaDe from './pages/AcercaDe.jsx';
import CocineraDetalle from './pages/CocineraDetalle.jsx';
import Cocineras from './pages/Cocineras.jsx';
import DeclaratoriaDetalle from './pages/DeclaratoriaDetalle.jsx';
import Inicio from './pages/Inicio.jsx';
import Mapa from './pages/Mapa.jsx';
import MercadoDetalle from './pages/MercadoDetalle.jsx';
import Mercados from './pages/Mercados.jsx';
import ProteccionLegal from './pages/ProteccionLegal.jsx';
import RecetaDetalle from './pages/RecetaDetalle.jsx';
import Recetas from './pages/Recetas.jsx';
import RedConocimiento from './pages/RedConocimiento.jsx';
import Reportes from './pages/Reportes.jsx';
import VistasPendientes from './pages/VistasPendientes.jsx';
import { sourceLabel, usesDatabase } from './services/api.js';
import Buscar from './pages/Buscar.jsx';
import FichaPublica from './pages/FichaPublica.jsx';
import Podcast from './pages/Podcast.jsx';
import InicioPublico from './pages/InicioPublico.jsx';
import ReportesPublicos from './pages/ReportesPublicos.jsx';
import MapaPublico from './pages/MapaPublico.jsx';

export default function App() {
  return (
    <>
      <IconSprite />
      <div className="shell">
        <div className="logo-cell"><Logo /></div>
        <Topbar />
        <MainNav />
        <main className="app-main">
          <Breadcrumb />
          <div className={`data-source ${usesDatabase ? 'published' : ''}`}>{sourceLabel}</div>
          <Routes>
            <Route path="/" element={usesDatabase ? <InicioPublico/> : <Inicio />} />
            <Route path="/mapa" element={usesDatabase ? <MapaPublico/> : <Mapa />} />
            <Route path="/red-conocimiento" element={<RedConocimiento />} />
            <Route path="/recetas" element={<Recetas />} />
            <Route path="/recetas/:id" element={<RecetaDetalle />} />
            <Route path="/mercados" element={<Mercados />} />
            <Route path="/mercados/:id" element={<MercadoDetalle />} />
            <Route path="/cocineras" element={<Cocineras />} />
            <Route path="/cocineras/:id" element={<CocineraDetalle />} />
            <Route path="/proteccion-legal" element={<ProteccionLegal />} />
            <Route path="/proteccion-legal/:id" element={<DeclaratoriaDetalle />} />
            <Route path="/reportes" element={usesDatabase ? <ReportesPublicos/> : <Reportes />} />
            <Route path="/acerca" element={<AcercaDe />} />
            <Route path="/memoria" element={<VistasPendientes title="Memoria histórica" description="El archivo histórico reunirá fuentes, recetarios y testimonios vinculados con la cocina poblana." />} />
            <Route path="/podcast" element={<Podcast />} />
            <Route path="/buscar" element={<Buscar />} />
            <Route path="/registro/:id" element={<FichaPublica />} />
            <Route path="/experiencias" element={<VistasPendientes title="Experiencias de turistas" description="Una sección para documentar experiencias de visitantes y sus vínculos con el patrimonio gastronómico poblano." />} />
            <Route path="/admin" element={<VistasPendientes title="Administración" description="La gestión de usuarios, revisión y permisos se habilitará en una iteración posterior." />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </>
  );
}
