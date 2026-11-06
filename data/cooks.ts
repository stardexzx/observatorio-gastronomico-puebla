export type CookStatus="verified"|"in-review"|"draft";
export type CookMedia={id:string;name:string;url:string;type:string;size:number};
export type CookOralHistory={id:string;title:string;date:string;duration:string;url:string};
export type CookRecord={id:string;name:string;role:string;municipality:string;municipalityCode:string;region:string;community:string;status:CookStatus;yearsExperience:string;languages:string[];specialties:string[];linkedRecipes:string[];biography:string;recognitions:string;source:string;sourceReference:string;consultationDate:string;consent:boolean;photos:CookMedia[];quote:string;studentCount:number;collective:string;establishments:string[];linkedMarkets:string[];culinaryLineage:string[];oralHistories:CookOralHistory[];verifiedAt:string;verifiedBy:string;sourceReferences:string[];completeness:number;updatedAt:string};

export const cookRoles=["Cocinera tradicional","Cocinero tradicional","Portadora o portador de saberes","Colectivo comunitario"];
export const cookSpecialties=["Moles y pipianes","Tamales","Antojitos","Panadería tradicional","Dulces y conservas","Bebidas tradicionales","Cocina festiva","Cocina de temporada"];
export const cookSources=["Entrevista de campo","Trabajo de campo","Archivo histórico","Publicación","Recetario comunitario"];
export const cookStatusLabels:Record<CookStatus,string>={verified:"Verificada/o","in-review":"En revisión",draft:"Borrador"};
export const createBlankCook=():CookRecord=>({id:"",name:"",role:"",municipality:"",municipalityCode:"",region:"",community:"",status:"draft",yearsExperience:"",languages:[],specialties:[],linkedRecipes:[],biography:"",recognitions:"",source:"",sourceReference:"",consultationDate:"",consent:false,photos:[],quote:"",studentCount:0,collective:"",establishments:[],linkedMarkets:[],culinaryLineage:[],oralHistories:[],verifiedAt:"",verifiedBy:"",sourceReferences:[],completeness:0,updatedAt:""});
const strings=(value:unknown):string[]=>Array.isArray(value)?value.filter((item):item is string=>typeof item==="string"):[];
const text=(value:unknown)=>typeof value==="string"?value:"";
export const normalizeCook=(record:Partial<CookRecord>):CookRecord=>({
  ...createBlankCook(),...record,
  languages:strings(record.languages),specialties:strings(record.specialties),linkedRecipes:strings(record.linkedRecipes),
  photos:Array.isArray(record.photos)?[...record.photos]:[],
  quote:text(record.quote),collective:text(record.collective),
  studentCount:typeof record.studentCount==="number"&&Number.isFinite(record.studentCount)?Math.max(0,Math.floor(record.studentCount)):0,
  establishments:strings(record.establishments),linkedMarkets:strings(record.linkedMarkets),culinaryLineage:strings(record.culinaryLineage),
  verifiedAt:text(record.verifiedAt),verifiedBy:text(record.verifiedBy),sourceReferences:strings(record.sourceReferences),
  oralHistories:Array.isArray(record.oralHistories)?record.oralHistories.filter(history=>history&&typeof history==="object").map((history,index)=>({
    id:text(history.id)||`ORAL-${index+1}`,title:text(history.title),date:text(history.date),duration:text(history.duration),url:text(history.url),
  })):[],
});

const seeds:Partial<CookRecord>[]=[
  {id:"COC-001",name:"María Hernández",role:"Cocinera tradicional",municipality:"Puebla",municipalityCode:"21114",region:"Angelópolis",community:"San Baltazar Campeche",status:"verified",yearsExperience:"38",languages:["Español"],specialties:["Moles y pipianes","Cocina festiva"],linkedRecipes:["Mole poblano","Chalupas poblanas"],biography:"Cocinera tradicional dedicada a preservar preparaciones familiares y festivas de la ciudad de Puebla.",source:"Entrevista de campo",sourceReference:"Entrevista realizada por el equipo del observatorio.",consent:true,completeness:92,updatedAt:"22 sep 2026"},
  {id:"COC-002",name:"Josefina Méndez",role:"Portadora o portador de saberes",municipality:"Chila de la Sal",municipalityCode:"21056",region:"Mixteca",community:"Cabecera municipal",status:"verified",yearsExperience:"45",languages:["Español","Mixteco"],specialties:["Tamales","Cocina de temporada"],linkedRecipes:["Pozole"],biography:"Portadora de conocimientos culinarios transmitidos entre generaciones en la Mixteca poblana.",source:"Trabajo de campo",sourceReference:"Registro de jornada comunitaria.",consent:true,completeness:88,updatedAt:"19 sep 2026"},
  {id:"COC-003",name:"Teresa Luna",role:"Cocinera tradicional",municipality:"San Andrés Cholula",municipalityCode:"21119",region:"Angelópolis",community:"San Rafael Comac",status:"in-review",yearsExperience:"27",languages:["Español"],specialties:["Cocina festiva"],linkedRecipes:["Chiles en nogada"],biography:"",source:"Entrevista de campo",sourceReference:"Entrevista en revisión.",consent:true,completeness:72,updatedAt:"15 sep 2026"},
  {id:"COC-004",name:"Miguel Xochipa",role:"Cocinero tradicional",municipality:"Zacatlán",municipalityCode:"21208",region:"Sierra Norte",community:"Jicolapa",status:"in-review",yearsExperience:"20",languages:["Español","Náhuatl"],specialties:["Antojitos","Bebidas tradicionales"],linkedRecipes:["Tlayoyos de alberjón"],source:"Trabajo de campo",sourceReference:"Registro de muestra gastronómica.",consent:true,completeness:68,updatedAt:"11 sep 2026"},
  {id:"COC-005",name:"Rosa Cordero",role:"Cocinera tradicional",municipality:"Tehuacán",municipalityCode:"21156",region:"Tehuacán y Sierra Negra",community:"Santa María Coapan",status:"draft",yearsExperience:"",languages:["Español"],specialties:["Moles y pipianes"],linkedRecipes:["Pipián verde"],completeness:42,updatedAt:"07 sep 2026"},
  {id:"COC-006",name:"Colectivo Mujeres del Maíz",role:"Colectivo comunitario",municipality:"Cuetzalan del Progreso",municipalityCode:"21043",region:"Sierra Norte",community:"San Miguel Tzinacapan",status:"draft",yearsExperience:"",languages:["Español","Náhuatl"],specialties:["Tamales","Bebidas tradicionales"],linkedRecipes:[],completeness:35,updatedAt:"02 sep 2026"},
];
export const initialCooks=seeds.map(normalizeCook);
