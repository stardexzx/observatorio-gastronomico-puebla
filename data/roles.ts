// Configuración de interfaz. La autorización real se aplicará desde el backend.
export const applicationRoles = [
  {id:"administrador",name:"Administrador"},
  {id:"capturista",name:"Capturista"},
  {id:"revisor",name:"Revisor"},
] as const;
export type RoleId = typeof applicationRoles[number]["id"];
export const accessSections = [
  {id:"resumen",name:"Resumen",description:"Indicadores generales del observatorio"},
  {id:"mapa",name:"Mapa",description:"Cobertura municipal y distribución territorial"},
  {id:"red",name:"Red de conocimiento",description:"Relaciones entre registros del acervo"},
  {id:"recetas",name:"Recetas",description:"Preparaciones y recetas documentadas"},
  {id:"ingredientes",name:"Ingredientes",description:"Ingredientes y variedades"},
  {id:"mercados",name:"Mercados y tianguis",description:"Establecimientos y espacios de intercambio"},
  {id:"cocineras",name:"Cocineras y cocineros",description:"Personas y saberes gastronómicos"},
  {id:"legal",name:"Protección legal",description:"Expedientes e instrumentos legales"},
  {id:"podcast",name:"Podcast",description:"Episodios, entrevistas y videos"},
  {id:"reportes",name:"Reportes",description:"Consulta y generación de reportes"},
  {id:"roles",name:"Roles y permisos",description:"Administración de accesos del equipo"},
] as const;
export type SectionId = typeof accessSections[number]["id"];
export type AccessMatrix = Record<SectionId,Record<RoleId,boolean>>;
export const accessStorageKey = "observatorio-role-access-v1";
export const isFixedAccess = (section:SectionId) => section === "roles";
export function defaultAccess():AccessMatrix {
  return Object.fromEntries(accessSections.map(section=>[section.id,{
    administrador:true,capturista:section.id!=="roles",revisor:section.id!=="roles",
  }])) as AccessMatrix;
}
export function normalizeAccess(value:unknown):AccessMatrix {
  const result=defaultAccess();
  if(!value||typeof value!=="object"||Array.isArray(value))throw new Error("La configuración de accesos no es válida.");
  for(const section of accessSections){
    const row=(value as Record<string,unknown>)[section.id];
    if(!row||typeof row!=="object"||Array.isArray(row))continue;
    for(const role of applicationRoles){
      const setting=(row as Record<string,unknown>)[role.id];
      if(typeof setting==="boolean")result[section.id][role.id]=setting;
    }
  }
  // Mantener la administración del panel en el único rol que la gestiona.
  result.roles={administrador:true,capturista:false,revisor:false};
  return result;
}
export function readAccess():AccessMatrix {
  const saved=window.localStorage.getItem(accessStorageKey);
  return saved?normalizeAccess(JSON.parse(saved)):defaultAccess();
}
export function saveAccess(matrix:AccessMatrix):AccessMatrix {
  const saved=normalizeAccess(matrix);
  window.localStorage.setItem(accessStorageKey,JSON.stringify(saved));
  return saved;
}
