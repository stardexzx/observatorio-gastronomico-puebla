"use client";

import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from '../next-router.jsx';
import TimelineArt, { PueblaLandscape } from '../components/timeline/TimelineArt.jsx';
import { usePublicCatalog } from '@/components/public/public-catalog-provider';
import { BookOpen, CalendarDays, Compass, ExternalLink, History, Search } from 'lucide-react';
import '../styles/timeline.css';

const eraColors = ['#001B62', '#033AA5', '#1684A5', '#527FA4', '#68849E'];
const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default function LineaDeTiempo() {
  const { timeline, recipes, loading, error, reload } = usePublicCatalog();
  if (loading) return <p role="status" className="rounded-xl border bg-white p-12 text-center text-sm text-slate-500">Cargando memoria histórica…</p>;
  if (error) return <div role="alert" className="rounded-xl border bg-white p-10 text-center"><p className="text-sm">No pudimos cargar la memoria histórica.</p><button type="button" onClick={() => void reload()} className="mt-4 rounded-lg border bg-white px-4 py-2 text-xs text-[#033AA5]">Reintentar</button></div>;
  const eras = timeline.filter(era => era.events?.length).map((era, index) => ({ ...era, color: eraColors[index % eraColors.length] }));
  if (!eras.length) return <p className="rounded-xl border bg-white p-12 text-center text-sm text-slate-500">La memoria histórica estará disponible cuando se publique su contenido.</p>;
  return <TimelineContent timelineEras={eras} recipes={recipes}/>;
}

function TimelineContent({ timelineEras, recipes }) {
  const allEvents = timelineEras.flatMap((era, eraIndex) => era.events.map(event => ({ ...event, era, eraIndex })));
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [linkStatus, setLinkStatus] = useState({ id: '', text: '' });
  const tabs = useRef([]);
  const milestones = useRef([]);
  const pendingFocusEvent = useRef(null);
  const eraIndex = Math.max(0, timelineEras.findIndex(era => era.id === params.get('epoca')));
  const era = timelineEras[eraIndex];
  const eventIndex = Math.max(0, era.events.findIndex(event => event.id === params.get('hito')));
  const event = era.events[eventIndex];
  const globalIndex = allEvents.findIndex(item => item.id === event.id);
  const sources = event.sources || [];
  const results = query.trim() ? allEvents.filter(item => normalize([item.date, item.title, item.summary, item.era.title, ...item.tags, ...item.details].join(' ')).includes(normalize(query.trim()))) : [];

  useEffect(() => {
    const tab = tabs.current[eraIndex];
    const parent = tab?.parentElement;
    if (tab && parent && parent.scrollWidth > parent.clientWidth) {
      const left = tab.offsetLeft - parent.offsetLeft - (parent.clientWidth - tab.clientWidth) / 2;
      parent.scrollTo({ left, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    }
    const activeMilestone = milestones.current[eventIndex];
    const eventList = activeMilestone?.closest('ol');
    if (activeMilestone && eventList && eventList.scrollWidth > eventList.clientWidth) {
      const left = eventList.scrollLeft + activeMilestone.getBoundingClientRect().left - eventList.getBoundingClientRect().left - (eventList.clientWidth - activeMilestone.clientWidth) / 2;
      eventList.scrollTo({left, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
    }
    if (pendingFocusEvent.current === event.id) {
      focusSelectedEvent();
      pendingFocusEvent.current = null;
    }
  }, [eraIndex, eventIndex, event.id]);

  function focusSelectedEvent() {
    document.getElementById('tl-era-panel')?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    document.getElementById('tl-event-title')?.focus({ preventScroll: true });
  }
  function selectSearchResult(item) {
    // Next actualiza los parámetros después de completar la navegación.
    // Esperar el hito elegido evita enfocar el título de la selección anterior.
    if (item.id === event.id) focusSelectedEvent();
    else pendingFocusEvent.current = item.id;
    select(item.era.id, item.id);
  }
  function select(eraId, eventId) {
    const nextEra = timelineEras.find(item => item.id === eraId);
    setParams({ epoca: eraId, hito: eventId || nextEra.events[0].id }, { preventScrollReset: true });
  }
  function move(delta) {
    const next = allEvents[globalIndex + delta];
    if (next) select(next.era.id, next.id);
  }
  function tabKey(event, index) {
    const keys = { ArrowRight: (index + 1) % timelineEras.length, ArrowLeft: (index + timelineEras.length - 1) % timelineEras.length, Home: 0, End: timelineEras.length - 1 };
    if (!(event.key in keys)) return;
    event.preventDefault();
    const next = keys[event.key];
    select(timelineEras[next].id);
    tabs.current[next]?.focus({ preventScroll: true });
  }
  async function copyLink() {
    try {
      const url = new URL(window.location.href);
      url.search = new URLSearchParams({epoca:era.id,hito:event.id}).toString();
      await navigator.clipboard.writeText(url.toString());
      setLinkStatus({ id: event.id, text: 'Enlace copiado' });
    } catch { setLinkStatus({ id: event.id, text: 'Puedes copiar la dirección de esta página desde el navegador.' }); }
  }

  return <div className="gastronomy-timeline" style={{ '--era-color': era.color }}>
    <header className="tl-hero">
      <PueblaLandscape/>
      <div className="tl-hero-copy"><p className="tl-eyebrow">Memoria histórica · Puebla, México</p><h1><span>Línea de tiempo</span>Gastronomía poblana</h1><p>Un recorrido por los ingredientes, encuentros y saberes que dan vida a nuestra cocina.</p><span className="tl-hero-label"><History size={14} aria-hidden="true"/> {timelineEras.length} épocas. Una historia que sigue viva.</span></div>
      <div className="tl-talavera" aria-hidden="true"/>
    </header>

    <section className="tl-explore" aria-label="Explorar la historia gastronómica">
      <div className="tl-section-heading"><div><p className="tl-eyebrow">Elige una época</p><h2>Del maíz al patrimonio vivo</h2></div><p><Compass size={16} aria-hidden="true"/> Selecciona una época y descubre sus momentos clave.</p></div>
      <div className="tl-mobile-select"><label htmlFor="tl-era-select">Ir a una época</label><select id="tl-era-select" value={era.id} onChange={e => select(e.target.value)}>{timelineEras.map(item => <option key={item.id} value={item.id}>{item.title} · {item.period}</option>)}</select></div>
      <div className="tl-era-track" role="tablist" aria-label="Épocas de la gastronomía poblana">
        {timelineEras.map((item, index) => <button type="button" role="tab" id={`tl-tab-${item.id}`} aria-controls="tl-era-panel" aria-selected={eraIndex === index} tabIndex={eraIndex === index ? 0 : -1} aria-label={`${item.title} · ${item.period}`} ref={node => {tabs.current[index] = node;}} key={item.id} className={`tl-era-card ${eraIndex === index ? 'is-active' : ''}`} style={{ '--card-color': item.color }} onKeyDown={e => tabKey(e, index)} onClick={() => select(item.id)}>
          <span className="tl-card-heading"><span className="tl-card-number">0{index + 1}</span><strong>{item.title}</strong><small>{item.period}</small></span>
          <TimelineArt era={item.id} compact/>
          <span className="tl-card-caption">{item.subtitle}</span>
          <span className="tl-card-axis" aria-hidden="true"><i/></span>
          <span className="tl-card-action">{eraIndex === index ? 'Explorando esta época' : 'Explorar época'} <span aria-hidden="true"><ExternalLink size={12} aria-hidden="true"/></span></span>
        </button>)}
      </div>
      <p className="tl-axis-caption"><span>Raíces y saberes originarios</span><span>Una cocina en constante transformación →</span></p>
    </section>

    <section className="tl-era-panel" id="tl-era-panel" role="tabpanel" aria-labelledby={`tl-tab-${era.id}`}>
      <header className="tl-era-intro"><div className="tl-era-kicker"><span>0{eraIndex + 1} / {String(timelineEras.length).padStart(2, '0')}</span><span>{era.period}</span></div><div className="tl-intro-columns"><div><h2>{era.title}</h2><p className="tl-era-subtitle">{era.subtitle}</p></div><p>{era.intro}</p></div></header>
      <div className="tl-detail-layout">
        <aside className="tl-milestones" aria-label={`Hitos de ${era.title}`}><h3>Momentos para explorar</h3><ol>{era.events.map((item,index) => <li key={item.id}><button ref={node => {milestones.current[index] = node;}} className={index === eventIndex ? 'is-active' : ''} type="button" aria-pressed={index === eventIndex} onClick={() => select(era.id,item.id)}><span className="tl-event-dot" aria-hidden="true"/><span><small>{item.date}</small><strong>{item.title}</strong></span><span className="tl-event-arrow" aria-hidden="true">→</span></button></li>)}</ol>
          <div className="tl-era-ingredients"><h3>En esta época</h3><ul>{era.highlights.map(item => <li key={item}>{item}</li>)}</ul></div>
        </aside>
        <article className="tl-event-detail" aria-labelledby="tl-event-title" key={event.id}>
          <div className="tl-event-visual"><TimelineArt era={era.id}/><span>{era.period}</span></div>
          <div className="tl-event-copy"><p className="tl-event-date"><CalendarDays size={15} aria-hidden="true"/>{event.date}</p><h3 id="tl-event-title" tabIndex={-1}>{event.title}</h3><p className="tl-event-summary">{event.summary}</p>
            <ul className="tl-event-notes">{event.details.map(text => <li key={text}>{text}</li>)}</ul>
            {!!sources.length && <div className="tl-event-sources"><h4>Para saber más</h4>{sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">{source.label} <span aria-hidden="true"><ExternalLink size={12} aria-hidden="true"/></span></a>)}</div>}
            {recipes.some(recipe => era.recipes.some(name => normalize(name) === normalize(recipe.name))) && <div className="tl-linked-recipes"><h4>Explora en el acervo</h4>{recipes.filter(recipe => era.recipes.some(name => normalize(name) === normalize(recipe.name))).map(recipe => <Link key={recipe.id} to={`/recetas/${encodeURIComponent(recipe.id)}`}><BookOpen size={14} aria-hidden="true"/>{recipe.name}<ExternalLink size={12} aria-hidden="true"/></Link>)}</div>}
          </div>
        </article>
      </div>
      <nav className="tl-step-nav" aria-label="Recorrer todos los hitos"><button type="button" disabled={globalIndex === 0} onClick={() => move(-1)}><span aria-hidden="true">←</span> Hito anterior</button><p aria-live="polite" aria-atomic="true">Hito {globalIndex + 1} de {allEvents.length}<span>{event.date} · {event.title}</span></p><button type="button" disabled={globalIndex === allEvents.length - 1} onClick={() => move(1)}>Siguiente hito <span aria-hidden="true">→</span></button></nav>
    </section>

    <section className="tl-find-section" aria-labelledby="tl-find-title"><div><p className="tl-eyebrow">Encuentra una historia</p><h2 id="tl-find-title">¿Qué quieres descubrir?</h2><p>Busca un año, un platillo o un ingrediente en toda la línea de tiempo.</p></div><form role="search" aria-label="Buscar en la línea de tiempo" onSubmit={e=>e.preventDefault()}><label htmlFor="tl-search">Buscar un hito</label><div className="tl-search-box"><Search size={18} aria-hidden="true"/><input type="search" id="tl-search" placeholder="Por ejemplo: maíz, 1531, tacos…" value={query} onChange={e=>setQuery(e.target.value)} maxLength={150}/></div></form>
      {query.trim() && <div className="tl-search-results"><p role="status">{results.length ? `${results.length} ${results.length === 1 ? 'hito encontrado' : 'hitos encontrados'}` : 'No hay hitos para esta búsqueda. Prueba con otro año o ingrediente.'}</p>{results.map(item => <button type="button" key={item.id} onClick={() => selectSearchResult(item)} aria-pressed={event.id === item.id}><span>{item.era.title} · {item.date}</span><strong>{item.title}</strong><span aria-hidden="true"><ExternalLink size={12} aria-hidden="true"/></span></button>)}</div>}
    </section>
    <footer className="tl-footer"><div><BookOpen size={20} aria-hidden="true"/><p>La historia continúa en nuestras cocinas.<Link to="/recetas">Explorar el recetario del Observatorio →</Link></p></div><div className="tl-share"><button type="button" onClick={copyLink}>Copiar enlace de este hito <span aria-hidden="true"><ExternalLink size={12} aria-hidden="true"/></span></button><span role="status">{linkStatus.id === event.id ? linkStatus.text : ''}</span></div></footer>
    <p className="tl-editorial-note">Las ilustraciones son representativas. Los relatos tradicionales de origen se distinguen de los hechos documentados.</p>
  </div>;
}
