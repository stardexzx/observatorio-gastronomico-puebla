"use client";
import {useEffect,useRef,useState,type FormEvent} from 'react';
import type {PDFDocumentProxy,RenderTask} from 'pdfjs-dist';
import {BookOpen,ChevronLeft,ChevronRight,ZoomIn,ZoomOut,Maximize,Minimize,Columns2,File,LoaderCircle,RotateCcw} from 'lucide-react';
import {ObservatorySidebar} from '@/components/dashboard/observatory-sidebar';
import {recipeBooks} from '@/data/recipe-books';
import type {RecipeBookFile} from '@/lib/recipe-book-files';
import {bookPages,bookSpread,turnBook} from '@/lib/book-navigation';
import styles from './recipe-book-reader.module.css';
export function RecipeBookReader({books=recipeBooks}:{books?:readonly RecipeBookFile[]}){
 const [bookId,setBookId]=useState<string>(books[0].id);
 const [pdf,setPdf]=useState<PDFDocumentProxy|null>(null);
 const [error,setError]=useState('');const [attempt,setAttempt]=useState(0);const [progress,setProgress]=useState(0);
 const [page,setPage]=useState(1);const [pageInput,setPageInput]=useState('1');
 const [zoom,setZoom]=useState(1);const [spread,setSpread]=useState(true);const [narrow,setNarrow]=useState(false);const [full,setFull]=useState(false);
 const [direction,setDirection]=useState(1);const [size,setSize]=useState({width:900,height:580});
 const root=useRef<HTMLDivElement>(null);const stage=useRef<HTMLDivElement>(null);
 const book=books.find(item=>item.id===bookId)??books[0];
 const total=pdf?.numPages??0;const double=spread&&!narrow;
 const visible=bookPages(page,total,double);const current=bookSpread(page,total,double);
 useEffect(()=>{
  let cancelled=false;let destroy:(()=>void)|undefined;
  async function open(){
   setPdf(null);setError('');setProgress(0);setPage(1);setPageInput('1');
   try{
    const library=await import('pdfjs-dist');if(cancelled)return;
    const assets=`/pdfjs/${library.version}/`;
    library.GlobalWorkerOptions.workerSrc=`${assets}pdf.worker.min.mjs`;
    library.GlobalWorkerOptions.rendererSrc=`${assets}pdf.renderer.min.mjs`;
    const task=library.getDocument({url:`/api/recetarios/${book.id}`,cMapUrl:`${assets}cmaps/`,cMapPacked:true,standardFontDataUrl:`${assets}standard_fonts/`,wasmUrl:`${assets}wasm/`,disableAutoFetch:true,disableStream:true,rangeChunkSize:262144});
    destroy=()=>{void task.destroy();};task.onProgress=({loaded,total:bytes}:{loaded:number;total:number})=>{if(!cancelled&&bytes)setProgress(Math.min(100,Math.round(loaded/bytes*100)));};
    const document=await task.promise;if(cancelled)return;setPdf(document);
   }catch{if(!cancelled)setError('No se pudo abrir el PDF. Vuelve a intentarlo.');}
  }
  void open();return()=>{cancelled=true;destroy?.();};
 },[book.id,attempt]);
 useEffect(()=>{
  const media=window.matchMedia('(max-width: 800px)');const update=()=>setNarrow(media.matches);update();media.addEventListener('change',update);return()=>media.removeEventListener('change',update);
 },[]);
 useEffect(()=>{
  const element=stage.current;if(!element)return;
  const measure=()=>setSize({width:Math.max(240,element.clientWidth-48),height:Math.max(360,window.innerHeight-(document.fullscreenElement?170:300))});
  const observer=new ResizeObserver(measure);observer.observe(element);window.addEventListener('resize',measure);measure();
  return()=>{observer.disconnect();window.removeEventListener('resize',measure);};
 },[]);
 useEffect(()=>{const update=()=>setFull(document.fullscreenElement===root.current);document.addEventListener('fullscreenchange',update);return()=>document.removeEventListener('fullscreenchange',update);},[]);
 const move=(way:1|-1)=>{if(!total)return;setDirection(way);const next=turnBook(page,total,double,way);setPage(next);setPageInput(String(next));};
 const jump=(event:FormEvent)=>{event.preventDefault();if(!total)return;const next=Math.min(total,Math.max(1,Number(pageInput)||1));setDirection(next>=page?1:-1);setPage(Math.trunc(next));setPageInput(String(Math.trunc(next)));};
 const fullscreen=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await root.current?.requestFullscreen();}catch{setError('La pantalla completa no está disponible en este navegador.');}};
 return <div className={styles.shell}><ObservatorySidebar activeItem="Recetario"/><main className="admin-main"><div ref={root} className={`${styles.reader} ${full?styles.fullscreen:''}`} onKeyDown={event=>{if(event.target instanceof HTMLElement&&event.target.closest('input,select,textarea,button,a'))return;if(event.key==='ArrowRight'){event.preventDefault();move(1);}if(event.key==='ArrowLeft'){event.preventDefault();move(-1);}}} tabIndex={-1}>
 <header className={styles.heading}><div><span className={styles.eyebrow}>BIBLIOTECA GASTRONÓMICA</span><h1>Recetario</h1><p>Historias y sabores, página a página.</p></div><span className={styles.readOnly}><BookOpen size={14}/>Modo lectura</span></header>
 <div className={styles.toolbar}><div className={styles.bookTitle}><BookOpen size={18}/><div><label className="sr-only" htmlFor="reader-book">Elegir recetario</label><select id="reader-book" value={bookId} onChange={event=>setBookId(event.target.value)}>{books.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}</select><span>{book.subtitle}{total?` · ${total} páginas`:''}</span></div></div><div className={styles.tools}><button type="button" disabled={!pdf||narrow} aria-label={double?'Ver una página':'Ver dos páginas'} aria-pressed={double} onClick={()=>setSpread(value=>!value)}>{double?<Columns2 size={17}/>:<File size={17}/>}<span>{double?'Dos páginas':'Una página'}</span></button><i/><button type="button" disabled={!pdf||zoom<=.75} aria-label="Reducir zoom" onClick={()=>setZoom(value=>Math.max(.75,Math.round((value-.25)*100)/100))}><ZoomOut size={17}/></button><button type="button" disabled={!pdf} aria-label="Ajustar páginas a la pantalla" onClick={()=>setZoom(1)}>{Math.round(zoom*100)}%</button><button type="button" disabled={!pdf||zoom>=2} aria-label="Ampliar zoom" onClick={()=>setZoom(value=>Math.min(2,value+.25))}><ZoomIn size={17}/></button><i/><button type="button" aria-label={full?'Salir de pantalla completa':'Pantalla completa'} onClick={()=>void fullscreen()}>{full?<Minimize size={17}/>:<Maximize size={17}/>}</button></div></div>
 <div ref={stage} className={styles.stage} tabIndex={0} aria-label="Libro de recetas. Usa las flechas izquierda y derecha para pasar las páginas.">
 {error?<div className={styles.empty} role="alert"><BookOpen size={32}/><h2>No pudimos abrir el recetario</h2><p>{error}</p><button type="button" onClick={()=>setAttempt(value=>value+1)}><RotateCcw size={14}/>Reintentar</button></div>:!pdf?<div className={styles.empty} role="status"><LoaderCircle className="animate-spin" size={28}/><h2>Abriendo el libro…</h2><p>{progress>0?`${progress}% cargado`:'Preparando las páginas del recetario.'}</p></div>:<div className={styles.bookScroller}><div key={`${book.id}-${current}-${double}`} className={`${styles.openBook} ${visible.length===1?styles.single:''} ${direction<0?styles.backwards:''}`} role="group" aria-label={`Páginas ${visible.join(' y ')} de ${total}`}>
 {visible.map((number,index)=><div key={`${number}-${size.width}-${size.height}-${zoom}`} className={`${styles.paper} ${visible.length>1?(index===0?styles.left:styles.right):''}`}><PdfSheet pdf={pdf} number={number} maxWidth={Math.min(visible.length>1?(size.width-12)/2:size.width,650)} maxHeight={size.height} zoom={zoom}/><span className={styles.pageNumber}>{number}</span></div>)}
 </div></div>}
 </div>
 <footer className={styles.footer}><div className={styles.pageControls}><button type="button" disabled={!pdf||current===1} aria-label="Página anterior" onClick={()=>move(-1)}><ChevronLeft size={18}/><span>Anterior</span></button><form onSubmit={jump}><label htmlFor="reader-page">Página</label><input id="reader-page" type="number" min={1} max={total||1} value={pageInput} disabled={!pdf} onChange={event=>setPageInput(event.target.value)}/><span>de {total||'—'}</span><button type="submit" disabled={!pdf}>Ir</button></form><button type="button" disabled={!pdf||visible.at(-1)===total} aria-label="Página siguiente" onClick={()=>move(1)}><span>Siguiente</span><ChevronRight size={18}/></button></div><div className={styles.readingProgress}><div><span style={{width:total?`${((visible.at(-1)??1)/total)*100}%`:'0%'}}/></div><p role="status">{total?`Página${visible.length>1?'s':''} ${visible.join('–')} de ${total}`:'Cargando recetario'}<span> · Usa las flechas para pasar las hojas</span></p></div></footer>
 </div></main></div>;
}
function PdfSheet({pdf,number,maxWidth,maxHeight,zoom}:{pdf:PDFDocumentProxy;number:number;maxWidth:number;maxHeight:number;zoom:number}){
 const canvas=useRef<HTMLCanvasElement>(null);const [loading,setLoading]=useState(true);const [error,setError]=useState(false);const [text,setText]=useState('');const [dimensions,setDimensions]=useState({width:maxWidth,height:maxHeight});
 useEffect(()=>{
  let cancelled=false;let task:RenderTask|undefined;
  async function render(){try{
   const page=await pdf.getPage(number);if(cancelled||!canvas.current)return;
   const base=page.getViewport({scale:1});const scale=Math.min(maxWidth/base.width,maxHeight/base.height)*zoom;const viewport=page.getViewport({scale});const ratio=Math.min(window.devicePixelRatio||1,2);
   const element=canvas.current;element.width=Math.floor(viewport.width*ratio);element.height=Math.floor(viewport.height*ratio);setDimensions({width:viewport.width,height:viewport.height});
   task=page.render({canvas:element,viewport,transform:ratio!==1?[ratio,0,0,ratio,0,0]:undefined});await task.promise;if(cancelled)return;setLoading(false);
   const content=await page.getTextContent();if(!cancelled)setText(content.items.map(item=>'str' in item?item.str:'').join(' '));
  }catch{if(!cancelled){setError(true);setLoading(false);}}}
  void render();return()=>{cancelled=true;task?.cancel();};
 },[pdf,number,maxWidth,maxHeight,zoom]);
 return <div className={styles.sheet} style={{width:dimensions.width,height:dimensions.height}} aria-busy={loading}><canvas ref={canvas} role="img" aria-label={`Página ${number} del recetario`} style={{width:dimensions.width,height:dimensions.height,opacity:loading?0:1}}/>{loading&&<span className={styles.sheetLoading}><LoaderCircle size={22} className="animate-spin"/></span>}{error&&<p className={styles.sheetLoading}>No se pudo mostrar la página {number}.</p>}<p className="sr-only">{text}</p></div>;
}
