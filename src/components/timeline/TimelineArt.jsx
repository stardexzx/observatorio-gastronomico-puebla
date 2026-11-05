import { useId } from 'react';

// Ilustraciones vectoriales locales: no requieren imágenes ni servicios externos.
export default function TimelineArt({ era, compact = false }) {
  const grain = useId().replace(/:/g, '');
  return <svg className={`tl-art ${compact ? 'is-compact' : ''}`} viewBox="0 0 320 200" aria-hidden="true">
    <defs><pattern id={grain} width="12" height="12" patternUnits="userSpaceOnUse"><circle cx="2" cy="3" r=".7" fill="#806540" opacity=".15"/><circle cx="9" cy="10" r=".6" fill="#806540" opacity=".1"/></pattern></defs>
    <rect width="320" height="200" fill="currentColor" opacity=".06"/><rect width="320" height="200" fill={`url(#${grain})`}/>
    <path d="M0 153Q72 127 148 152T320 145V200H0Z" fill="currentColor" opacity=".08"/>
    {era === 'prehispanica' && <>
      <path d="M41 99Q83 116 121 166Q74 168 49 136Z" fill="#64805b"/><path d="M106 50Q137 88 121 167Q83 136 85 95Z" fill="#8b9b62"/>
      <g transform="rotate(-18 102 107)"><rect x="85" y="44" width="36" height="105" rx="18" fill="#d2a34a"/>{Array.from({length:9},(_,i)=><g key={i}><ellipse cx="95" cy={55+i*10} rx="4" ry="4" fill="#f0cc74"/><ellipse cx="107" cy={55+i*10} rx="4" ry="4" fill="#f8d889"/></g>)}</g>
      <ellipse cx="208" cy="145" rx="65" ry="17" fill="#72452b"/><path d="M144 144Q150 186 208 186T273 144Z" fill="#a75f35"/><ellipse cx="208" cy="142" rx="60" ry="13" fill="#d9b898"/><ellipse cx="208" cy="144" rx="49" ry="8" fill="#f0dbb2"/>
      <path d="M194 117Q184 101 198 86M217 113Q229 96 217 75" stroke="#9a8b73" strokeWidth="3" fill="none" strokeLinecap="round"/>
      <g fill="#7f3130"><ellipse cx="74" cy="178" rx="9" ry="6"/><ellipse cx="95" cy="184" rx="9" ry="6"/></g><path d="M27 169Q39 147 57 156Q59 170 34 177Z" fill="#9a3b2d"/><path d="M52 157l8-10" stroke="#54724e" strokeWidth="3"/>
    </>}
    {era === 'virreinal' && <>
      <g fill="#b59a79" opacity=".6"><path d="M26 139V57h81v82H91V92a25 25 0 0 0-50 0v47Z"/><path d="M112 139V44h82v95h-16V80a25 25 0 0 0-50 0v59Z"/><path d="M199 139V57h92v82h-17V92a29 29 0 0 0-58 0v47Z"/></g>
      <path d="M128 136q-34-44 0-45m65 45q35-44 0-45" fill="none" stroke="#8d4e30" strokeWidth="11"/>
      <path d="M116 105Q160 80 204 105l-8 59q-36 29-72 0Z" fill="#b66b3e"/><ellipse cx="160" cy="105" rx="44" ry="13" fill="#71412d"/><ellipse cx="160" cy="105" rx="33" ry="8" fill="#50392a"/>
      <path d="M133 135q27 12 54 0M133 147q27 12 54 0" fill="none" stroke="#d99666" strokeWidth="3"/>
      <path d="M146 77q-13-17 0-30M170 78q15-20 1-39" stroke="#b6a491" strokeWidth="3" fill="none" strokeLinecap="round"/>
      <path d="M217 168l62-28 4 8-62 28Z" fill="#8a5735"/><path d="M217 177l65-17 3 8-65 17Z" fill="#a8764b"/><g fill="#47372a"><rect x="54" y="155" width="21" height="26" rx="3" transform="rotate(-14 54 155)"/><rect x="80" y="157" width="21" height="26" rx="3"/></g>
    </>}
    {era === 'siglo-xix' && <>
      <g fill="#ad9274" opacity=".55"><path d="M46 130V55h22V34h6v21h22v75ZM224 130V55h22V34h6v21h22v75Z"/><path d="M100 130V88q60-67 120 0v42Z"/></g>
      <ellipse cx="159" cy="153" rx="124" ry="32" fill="#d2bda2"/><ellipse cx="159" cy="146" rx="119" ry="32" fill="#fffaf0"/><ellipse cx="159" cy="145" rx="104" ry="23" fill="none" stroke="#b9ada0"/>
      <path d="M80 140Q105 103 203 124l48 18q-105 29-171-2Z" fill="#50704d"/><path d="M92 136Q139 109 216 134l21 11q-87 22-145-9Z" fill="#f2e7cf"/><path d="M80 140l-22-9" stroke="#53764b" strokeWidth="6"/>
      {[[109,132],[132,143],[145,127],[162,147],[179,130],[194,143],[213,137],[150,152]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="3.5" fill="#a83e44"/>)}
      <g fill="#517b4f"><path d="M106 145l8 2-3 5-7-1Z"/><path d="M183 148l8-4 3 5-9 4Z"/></g>
    </>}
    {era === 'siglo-xx' && <>
      <path d="M44 60h232l-18 24H61Z" fill="#a05b3c" opacity=".85"/><path d="M54 60v76M266 60v76" stroke="#8e6745" strokeWidth="5"/><path d="M44 60h232" stroke="#d3b074" strokeWidth="5"/>
      <ellipse cx="162" cy="164" rx="117" ry="25" fill="#e1cfb1"/><ellipse cx="162" cy="157" rx="112" ry="26" fill="#fff8e8"/>
      <path d="M74 141Q96 84 143 137L120 171q-21 2-46-30Z" fill="#dba956"/><path d="M127 141Q163 80 206 136l-28 38q-31-4-51-33Z" fill="#e6ba70"/><path d="M189 138q39-42 69 2l-25 27q-32-5-44-29Z" fill="#dbac63"/>
      <path d="M82 138q26-31 48 0l-13 17Z M140 136q26-29 50 0l-17 18Z M202 136q22-20 43 3l-15 12Z" fill="#8f4c30"/>
      {[[103,129],[118,139],[159,126],[173,142],[214,133],[229,143]].map(([x,y],i)=><g key={i}><path d={`M${x-4} ${y}l8-3 3 4-8 3Z`} fill="#5c7841"/><path d={`M${x-3} ${y+5}q5-8 10-1`} fill="none" stroke="#fff0cf" strokeWidth="2.5"/></g>)}
    </>}
    {era === 'siglo-xxi' && <>
      <g fill="#ac9275" opacity=".65"><path d="M36 133V62h24V40h6v22h24v71ZM231 133V62h24V40h6v22h24v71Z"/><path d="M96 133V90h129v43ZM124 88q37-67 74 0Z"/></g>
      <ellipse cx="160" cy="151" rx="125" ry="32" fill="#315f71"/><ellipse cx="160" cy="145" rx="123" ry="31" fill="#1e3846"/><ellipse cx="160" cy="142" rx="110" ry="22" fill="#274755"/>
      <path d="M119 144q2-28 48-24l38 23-47 17Z" fill="#c68642"/><path d="M125 137q25-18 57 2l15 9-47 5Z" fill="#f0dba8"/><path d="M145 130q20-34 21-39M145 129q-26-25-27-30M149 131q35-20 49-14" stroke="#71a057" fill="none" strokeWidth="3"/>
      {[[102,141],[115,151],[202,143],[216,149],[171,158]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="3" fill="#cc6944"/>)}
    </>}
  </svg>;
}

export function PueblaLandscape() {
  return <svg className="tl-landscape" viewBox="0 0 1200 250" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <path d="M0 200L80 149l59 18L260 19l130 132 95 54H0Z" fill="#b8c1bd"/><path d="M260 19l-53 65 39-12 18 18 21-13 34 11Z" fill="#fffdf6"/><path d="M0 227l118-46 99 30 84-43 145 66Z" fill="#9ba692" opacity=".6"/>
    <g fill="#b39b80" stroke="#8f7a63" strokeWidth="2" opacity=".8"><path d="M901 250V110h28V68h7v42h26v140ZM1115 250V110h28V68h7v42h26v140Z"/><path d="M970 250v-90h137v90ZM992 158q46-80 93 0Z"/><path d="M1028 113V94h18v19"/><path d="M915 81V57m-6 6h12M1147 81V57m-6 6h12"/><path d="M1003 250v-44q33-35 65 0v44Z" fill="#8f7a63"/></g>
    <path d="M0 242q190-25 370 3t400-1 430-1v7H0Z" fill="#9f8e71"/>
  </svg>;
}
