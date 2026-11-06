"use client";

import React from 'react';
import Icon from '../assets/icons.jsx';
export default function VistasPendientes({ title, description }) { return <><div className="g-h"><h1>{title}</h1><p>{description}</p></div><div className="g-card placeholder-panel"><span className="g-dot" style={{width:48,height:48,background:'#10284C'}}><Icon name="info" size={23}/></span><h3>Próximamente</h3><p>Esta sección reunirá relatos y experiencias de quienes visitan los espacios gastronómicos de Puebla.</p></div></>; }
