import React, { useId } from 'react';
import Icon from '../../assets/icons.jsx';

const POLY = '232,14 262,34 292,62 306,96 318,124 332,150 326,178 338,206 322,232 300,250 272,276 240,290 208,282 176,292 140,284 108,290 72,268 46,246 34,214 52,190 84,176 96,150 128,140 140,116 176,104 190,78 210,50';
const HOT = [[172,188,1,38],[150,205,.8,26],[128,232,.6,26],[288,246,.7,30],[284,86,.5,28],[222,62,.55,26],[112,178,.45,22],[232,196,.4,24]];
const COLORS = ['#EFEADC','#F6E2B4','#F1BD66','#D9772B','#B23A1F'];
const POINT_COLORS = { ing:'#4F7A4A', rec:'#C1531E', mer:'#D89A2E', coc:'#10284C', leg:'#B23A1F' };
const MARKERS = [[108,196,'ing'],[150,205,'rec'],[182,180,'mer'],[128,232,'coc'],[204,168,'leg'],[222,66,'mer'],[284,88,'coc'],[288,246,'ing']];
const rnd = (i, j) => { const s = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453; return s - Math.floor(s); };

function makeCells(mode = 'heat') {
  const R = 11; const w = R * 1.732; const h = R * 1.5; const cells = [];
  for (let j = 0, y = -4; y < 330; j++, y += h) {
    for (let i = 0, x = (j % 2 ? w / 2 : 0) - 4; x < 410; i++, x += w) {
      let value = 0;
      HOT.forEach(([hx, hy, weight, radius]) => { value += weight * Math.exp(-((x-hx)**2 + (y-hy)**2) / (2*radius*radius)); });
      let fill = '#EFEADC'; let opacity = 1;
      if (mode === 'heat') { value += (rnd(i,j)-.5)*.2; fill = COLORS[Math.max(0, Math.min(4, Math.floor(value*4.2)))]; }
      else if (mode === 'legal') { fill = rnd(i,j) > .15 ? '#D9772B' : '#EFEADC'; opacity = fill === '#D9772B' ? (.55 + rnd(j,i)*.35) : 1; }
      const points = Array.from({length:6}, (_, k) => { const a = Math.PI/180*(60*k+30); return `${(x+R*Math.cos(a)).toFixed(1)},${(y+R*Math.sin(a)).toFixed(1)}`; }).join(' ');
      cells.push({ key:`${i}-${j}`, points, fill, opacity });
    }
  }
  return cells;
}

export default function PueblaHexMap({ mode = 'heat', markers = MARKERS, showLabels = true, onSelect }) {
  const rawId = useId();
  const clipId = `puebla-clip-${rawId.replace(/:/g, '')}`;
  const cells = makeCells(mode);
  return (
    <svg className="g-map" viewBox="0 0 400 320" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Mapa esquemático hexagonal de Puebla">
      <defs><clipPath id={clipId}><polygon points={POLY} /></clipPath></defs>
      <rect width="400" height="320" fill="#E9EEE6" />
      <path d="M0 250C70 230 120 270 200 240S330 210 400 240M300 0C290 60 330 120 300 190" fill="none" stroke="#C6DAEA" strokeWidth="2.5" />
      {showLabels && <g fontSize="8" fill="#9AA596" letterSpacing="1.2" fontWeight="700"><text x="112" y="36">HIDALGO</text><text x="10" y="118">TLAXCALA</text><text x="346" y="100">VERACRUZ</text><text x="188" y="312">OAXACA</text><text x="8" y="266">GUERRERO</text><text x="12" y="176">MORELOS</text></g>}
      <g clipPath={`url(#${clipId})`}>{cells.map(cell => <polygon key={cell.key} points={cell.points} fill={cell.fill} fillOpacity={cell.opacity} stroke="#fff" strokeOpacity=".75" strokeWidth=".8" />)}</g>
      <polygon points={POLY} fill="none" stroke="#7E8B6E" strokeWidth="1.6" />
      {markers.map((marker, idx) => {
        const x = Array.isArray(marker) ? marker[0] : marker.x;
        const y = Array.isArray(marker) ? marker[1] : marker.y;
        const type = Array.isArray(marker) ? marker[2] : marker.t;
        return <g key={marker.id || idx} transform={`translate(${x},${y})`} role={onSelect ? 'button' : undefined} tabIndex={onSelect ? 0 : undefined} aria-label={marker.n} style={onSelect ? {cursor:'pointer'} : undefined} onClick={() => onSelect?.(marker.id)} onKeyDown={event => { if(onSelect && ['Enter',' '].includes(event.key)) {event.preventDefault();onSelect(marker.id);} }}><title>{marker.n || 'Registro ilustrativo'}</title><circle r="7" fill={POINT_COLORS[type] || '#10284C'} stroke="#fff" strokeWidth="2" /><circle cy="-1" r="1.7" fill="#fff" /></g>;
      })}
    </svg>
  );
}
