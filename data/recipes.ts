export type RecipeStatus = "verified" | "in-review" | "draft" | "published";
export type RecipeMedia = { id:string; name:string; url:string; caption:string; type:string; size:number };
export type RecipeInformant = { name:string; role:string; municipality:string; municipalityCode:string; interviewDate:string };

export type RecipeRecord = {
  id:string; name:string; category:string; municipality:string; municipalityCode:string; region:string; status:RecipeStatus; updatedAt:string;
  source:string; sourceReference:string; sourceUrl:string; consultationDate:string; description:string; vigency:string; ingredients:string[]; techniques:string[];
  preparation:string; steps:string[]; occasion:string; months:string[]; occasions:string[]; informant:RecipeInformant; photos:RecipeMedia[]; audio:RecipeMedia[]; completeness:number;
};

export const pueblaRegions = ["Sierra Norte", "Sierra Nororiental", "Valle de Serdán", "Angelópolis", "Valle de Atlixco y Matamoros", "Mixteca", "Tehuacán y Sierra Negra"];
export const recipeCategories = ["Mole", "Antojito", "Guiso", "Sopa", "Dulce", "Pan", "Bebida", "Salsa", "Otro"];
export const recipeSources = ["Entrevista de campo", "Documento histórico", "Publicación", "Portal oficial (SIC u otro)", "Recetario comunitario"];
export const recipeVigencies = ["Se prepara actualmente", "Poco frecuente", "En desuso"];
export const traditionalTechniques = ["Nixtamalización", "Molienda en metate", "Cocción en comal", "Tatemado", "Cocción en olla de barro", "Asado", "Hervido", "Frito", "Horneado en horno de leña", "Otra"];
export const recipeMonths = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
export const recipeOccasions = ["Día de Muertos", "Semana Santa", "Fiestas patronales", "Bodas", "Navidad", "Uso cotidiano", "Otra"];
export const informantRoles = ["Cocinera o cocinero tradicional", "Productor o productora", "Integrante de la familia", "Mayordomo o mayordoma", "Otro"];
export const ingredientCatalog = ["Chile ancho", "Chile mulato", "Chocolate", "Ajonjolí", "Maíz", "Masa de maíz", "Chile poblano", "Nuez de Castilla", "Granada", "Pepita de calabaza", "Tomate verde", "Frijol", "Alberjón", "Quesillo", "Pápalo"];
export const emptyInformant:RecipeInformant={name:"",role:"",municipality:"",municipalityCode:"",interviewDate:""};

export const createBlankRecipe=():RecipeRecord=>({id:"",name:"",category:"",municipality:"",municipalityCode:"",region:"",status:"draft",updatedAt:"",source:"",sourceReference:"",sourceUrl:"",consultationDate:"",description:"",vigency:"",ingredients:[],techniques:[],preparation:"",steps:[],occasion:"",months:[],occasions:[],informant:{...emptyInformant},photos:[],audio:[],completeness:0});

export function normalizeRecipe(record:Partial<RecipeRecord>):RecipeRecord{
  const blank=createBlankRecipe();
  return {...blank,...record,informant:{...blank.informant,...record.informant},photos:record.photos??[],audio:record.audio??[],steps:record.steps?.length?record.steps:(record.preparation?[record.preparation]:[]),occasions:record.occasions?.length?record.occasions:(record.occasion?[record.occasion]:[])};
}
const legacy=(record:Partial<RecipeRecord>)=>normalizeRecipe(record);

export const initialRecipes:RecipeRecord[]=[
  legacy({id:"REC-001",name:"Mole poblano",category:"Mole",municipality:"Puebla",municipalityCode:"21114",region:"Angelópolis",status:"verified",updatedAt:"18 sep 2026",source:"Documento histórico",sourceReference:"Archivo gastronómico del estado",description:"Preparación festiva elaborada con chiles secos, especias, semillas y chocolate.",vigency:"Se prepara actualmente",ingredients:["Chile ancho","Chile mulato","Chocolate","Ajonjolí"],techniques:["Tatemado","Molienda en metate"],steps:["Tostar los ingredientes.","Moler y cocinar lentamente hasta obtener una salsa espesa."],occasions:["Fiestas patronales"],completeness:83}),
  legacy({id:"REC-002",name:"Chiles en nogada",category:"Guiso",municipality:"San Andrés Cholula",municipalityCode:"21119",region:"Angelópolis",status:"verified",updatedAt:"15 sep 2026",source:"Entrevista de campo",sourceReference:"Entrevista con cocinera tradicional",description:"Chile poblano relleno de picadillo frutal, cubierto con nogada y granada.",vigency:"Se prepara actualmente",ingredients:["Chile poblano","Nuez de Castilla","Granada"],techniques:["Asado"],steps:["Asar y limpiar los chiles.","Rellenar, cubrir con nogada y terminar con granada."],months:["Agosto","Septiembre"],completeness:83}),
  legacy({id:"REC-003",name:"Chalupas poblanas",category:"Antojito",municipality:"Puebla",municipalityCode:"21114",region:"Angelópolis",status:"in-review",updatedAt:"12 sep 2026",source:"Entrevista de campo",description:"Tortillas pequeñas fritas con salsa, carne deshebrada y cebolla.",vigency:"Se prepara actualmente",ingredients:["Masa de maíz"],techniques:["Frito"],steps:["Freír las tortillas y terminar con salsa y carne."],occasions:["Uso cotidiano"],completeness:67}),
  legacy({id:"REC-004",name:"Cemita poblana",category:"Antojito",municipality:"Puebla",municipalityCode:"21114",region:"Angelópolis",status:"verified",updatedAt:"08 sep 2026",source:"Publicación",description:"Pan de cemita relleno de milanesa, quesillo, pápalo, aguacate y chipotle.",vigency:"Se prepara actualmente",ingredients:["Quesillo","Pápalo"],techniques:["Frito"],steps:["Abrir el pan y colocar los ingredientes en capas."],occasions:["Uso cotidiano"],completeness:67}),
  legacy({id:"REC-005",name:"Pipián verde",category:"Guiso",municipality:"Tehuacán",municipalityCode:"21156",region:"Tehuacán y Sierra Negra",status:"draft",updatedAt:"03 sep 2026",source:"Entrevista de campo",description:"Salsa de semillas y hierbas verdes que acompaña carnes o vegetales.",ingredients:["Pepita de calabaza","Tomate verde"],techniques:["Tatemado"],steps:["Tostar y moler las semillas antes de incorporarlas a la salsa."],completeness:50}),
  legacy({id:"REC-006",name:"Tlayoyos de alberjón",category:"Antojito",municipality:"Zacatlán",municipalityCode:"21208",region:"Sierra Norte",status:"in-review",updatedAt:"29 ago 2026",source:"Entrevista de campo",description:"Masa de maíz rellena de alberjón, cocida en comal y servida con salsa.",ingredients:["Maíz","Alberjón"],techniques:["Cocción en comal"],steps:["Rellenar la masa, formar una pieza alargada y cocer en comal."],completeness:50}),
];
export const recipeStatusLabels:Record<RecipeStatus,string>={verified:"Verificada","in-review":"En revisión",draft:"Borrador",published:"Publicada"};

export function recipeSourceComplete(recipe:Pick<RecipeRecord,"source"|"sourceReference"> & {informant?: Partial<RecipeInformant>}):boolean {
  if (recipe.source === "Entrevista de campo") return !!(recipe.informant?.name?.trim() && recipe.informant?.interviewDate);
  return !!(recipe.source && recipe.sourceReference.trim());
}
