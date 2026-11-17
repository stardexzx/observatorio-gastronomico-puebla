/** Shared contract for the existing PostgreSQL legal workflow and its public projection. */
export const legalClassificationOptions = [
  {value:'do',label:'Denominación de origen',short:'DO',icon:'star',color:'#7A5EA8'},
  {value:'ig',label:'Indicación geográfica',short:'IG',icon:'shield',color:'#B23A1F'},
  {value:'declaratoria',label:'Declaratoria patrimonial',short:'DP',icon:'building',color:'#10284C'},
  {value:'platillo_tipico',label:'Platillo típico',short:'PT',icon:'recipe',color:'#D89A2E'},
  {value:'ley',label:'Ley',short:'LEY',icon:'book',color:'#3E6FA8'},
  {value:'reglamento',label:'Reglamento',short:'REG',icon:'doc',color:'#2E8A82'},
  {value:'decreto',label:'Decreto',short:'DEC',icon:'doc',color:'#C1531E'},
  {value:'marca_colectiva',label:'Marca colectiva',short:'MC',icon:'shield',color:'#4F7A4A'},
  {value:'programa_gubernamental',label:'Programa gubernamental',short:'PG',icon:'folder',color:'#2E8A82'},
  {value:'otro',label:'Otro instrumento',short:'OT',icon:'folder',color:'#7A5EA8'},
] as const;
export type LegalClassification = typeof legalClassificationOptions[number]['value'];
export const legalThemeOptions = [
  {value:'instrumentos_normativos',label:'Instrumentos normativos'},
  {value:'declaratorias_patrimoniales',label:'Declaratorias patrimoniales'},
  {value:'propiedad_intelectual',label:'Propiedad intelectual y derechos colectivos'},
  {value:'brechas_legales',label:'Vacíos y brechas legales'},
  {value:'politicas_publicas',label:'Políticas públicas vinculadas'},
] as const;
export type LegalTheme = typeof legalThemeOptions[number]['value'];
export const legalJurisdictionLabels = {federal:'Federal',estatal:'Estatal',municipal:'Municipal',otro:'Otro ámbito'} as const;
export type LegalJurisdiction = keyof typeof legalJurisdictionLabels;
export const legalSituationLabels = {vigente_documentada:'Vigente documentada',vencido:'Vencido',revocado:'Revocado',no_determinada:'No determinada'} as const;
export type LegalSituation = keyof typeof legalSituationLabels;
export const legalEditorialLabels = {borrador:'Borrador',en_revision:'En revisión',correcciones:'Correcciones',validado:'Validada',publicado:'Publicada',archivado:'Archivada'} as const;
export type LegalEditorialStatus = keyof typeof legalEditorialLabels;
export const legalDossierLabels = {solicitado:'Solicitado',evaluacion:'En evaluación',requerimientos:'Requerimientos',favorable:'Favorable',rechazado:'Rechazado',desistido:'Desistido',no_documentado:'No documentado'} as const;
export type LegalDossierState = keyof typeof legalDossierLabels;
export const legalLinkLabels = {recipes:'Recetas',ingredients:'Ingredientes',markets:'Mercados',cooks:'Cocineras y cocineros',producers:'Productores',establishments:'Establecimientos',municipalities:'Municipios'} as const;
export type LegalLinkKind = keyof typeof legalLinkLabels;
export type LegalVisibility = 'publico'|'restringido';
export interface LegalSource {
  id:string; title:string; reference:string; authority:string; url:string;
  publicationDate:string; consultedAt:string; publicCitation:string;
  claim:string; section:string; visibility:LegalVisibility;
}
export interface LegalLink {
  kind:LegalLinkKind; origin:'ogp'|'panel'; id:string; name:string;
  scope:string; sourceId:string; href?:string; municipalityCode?:string;
}
export type LegalOption = Omit<LegalLink,'scope'|'sourceId'>;
export interface LegalDocument {
  id:string; name:string; size:number|null; sha256:string; uploadedAt:string;
  visibility:LegalVisibility; license:string; sourceId?:string; url:string;
}
export interface LegalDossier {
  id?:string; title:string; folio:string; requestDate:string; state:LegalDossierState;
}
export interface LegalCapabilities {
  edit:boolean; submit:boolean; review:boolean; publish:boolean; withdraw:boolean; archive:boolean;
}
export type LegalWorkflowAction = 'submit'|'validate'|'corrections'|'publish'|'withdraw';
export interface LegalTrace {id:string; action:string; date:string; actor?:string; notes?:string;}
export interface LegalInput {
  name:string; classification:LegalClassification; thematicAxes:LegalTheme[];
  jurisdiction:LegalJurisdiction; authority:string; officialReference:string;
  publicationDate:string; validFrom:string; validUntil:string; reviewDate:string;
  situation:LegalSituation; description:string; scope:string; regulatedMatter:string;
  beneficiaries:string; territorialScope:string; responsibleAgency:string; budget:string;
  operatingRules:string; safeguardingPlan:string; complianceIndicators:string;
  effectiveness:string; operationalChallenges:string; legalGaps:string; linkedPolicies:string;
  specificFields:Record<string,string>; sources:LegalSource[]; links:LegalLink[];
  documentIds:string[]; dossier:LegalDossier|null; privateNotes:string;
}
export interface LegalRecord extends Omit<LegalInput,'privateNotes'> {
  privateNotes?:string;
  id:string; documents:LegalDocument[]; status:LegalEditorialStatus;
  published:boolean; publishedAt:string|null; latestRevisionId:string|null;
  hasUnsubmittedChanges?:boolean; updatedAt:string; createdBy?:string; trace:LegalTrace[]; capabilities:LegalCapabilities;
}
export interface LegalSummary {
  active:number; inProgress:number; protectedRecipes:number; coveredMunicipalities:number;
  municipalityTotal:number; total:number; granted:number; evaluation:number; rejected:number;
  lastUpdates:{id:string;name:string;date:string}[];
}
export interface LegalCatalog {records:LegalRecord[]; summary:LegalSummary;}
export interface LegalOptions {options:LegalOption[];}
export interface LegalPublicTargets {
  recipes:{id:string;name:string;publicOrigin?:'ogp'|'panel'}[]; ingredients:{id:string;name:string;publicOrigin?:'ogp'|'panel'}[];
  cooks:{id:string;name:string;publicOrigin?:'ogp'|'panel'}[]; markets:{id:string;name:string;publicOrigin?:'ogp'|'panel'}[];
}
export const LEGAL_MAX_PDF_BYTES = 20 * 1024 * 1024;
export const LEGAL_MAX_DOCUMENTS = 12;
export const emptyLegalSummary:LegalSummary = {active:0,inProgress:0,protectedRecipes:0,coveredMunicipalities:0,municipalityTotal:0,total:0,granted:0,evaluation:0,rejected:0,lastUpdates:[]};
export const noLegalCapabilities:LegalCapabilities = {edit:false,submit:false,review:false,publish:false,withdraw:false,archive:false};
export function createBlankLegalInput():LegalInput {
  return {name:'',classification:'otro',thematicAxes:[],jurisdiction:'estatal',authority:'',officialReference:'',
    publicationDate:'',validFrom:'',validUntil:'',reviewDate:'',situation:'no_determinada',
    description:'',scope:'',regulatedMatter:'',beneficiaries:'',territorialScope:'',responsibleAgency:'',
    budget:'',operatingRules:'',safeguardingPlan:'',complianceIndicators:'',effectiveness:'',
    operationalChallenges:'',legalGaps:'',linkedPolicies:'',specificFields:{},sources:[],links:[],
    documentIds:[],dossier:null,privateNotes:''};
}
export function legalInputFromRecord(record:Partial<LegalInput>):LegalInput {
  const input=createBlankLegalInput();
  for(const key of Object.keys(input) as (keyof LegalInput)[]) {
    if(record[key]!==undefined)Object.assign(input,{[key]:record[key]});
  }
  return input;
}
export function legalClassification(value:LegalClassification) {
  return legalClassificationOptions.find(option=>option.value===value) ?? legalClassificationOptions[9];
}
export function legalLinkKey(link:Pick<LegalLink,'kind'|'origin'|'id'>):string {
  const kind=link.kind==='cooks'||link.kind==='producers'?'people':link.kind;
  return kind+':'+link.origin+':'+link.id;
}
export function legalDisplayStatus(record:Pick<LegalRecord,'status'|'published'>):string {
  return record.published?'Publicada':legalEditorialLabels[record.status];
}
export interface LegalSpecificField {key:string; label:string; multiline?:boolean;}
export const legalSpecificFields:Record<LegalClassification,LegalSpecificField[]> = {
  do:[{key:'protectedName',label:'Nombre protegido'},{key:'productSpecification',label:'Características y método de producción',multiline:true},{key:'registrationNumber',label:'Número de declaración o registro'},{key:'authorizedUsers',label:'Usuarios autorizados y condiciones de uso',multiline:true}],
  ig:[{key:'protectedName',label:'Indicación protegida'},{key:'geographicalLink',label:'Vínculo documentado con el territorio',multiline:true},{key:'productSpecification',label:'Características del producto',multiline:true},{key:'registrationNumber',label:'Número de declaración o registro'}],
  declaratoria:[{key:'heritageCategory',label:'Patrimonio reconocido'},{key:'recognitionScope',label:'Contenido de la declaratoria',multiline:true}],
  platillo_tipico:[{key:'recognizedDish',label:'Platillo reconocido'},{key:'recognitionScope',label:'Alcance del reconocimiento',multiline:true}],
  ley:[{key:'publicationGazette',label:'Diario o periódico oficial'},{key:'articles',label:'Artículos y disposiciones aplicables',multiline:true}],
  reglamento:[{key:'publicationGazette',label:'Diario o periódico oficial'},{key:'enablingLaw',label:'Ley que reglamenta'},{key:'articles',label:'Disposiciones aplicables',multiline:true}],
  decreto:[{key:'publicationGazette',label:'Diario o periódico oficial'},{key:'decreeNumber',label:'Número de decreto'},{key:'articles',label:'Disposiciones aplicables',multiline:true}],
  marca_colectiva:[{key:'registrationNumber',label:'Número de registro'},{key:'holder',label:'Titular colectivo'},{key:'classes',label:'Clases de productos o servicios'},{key:'useRules',label:'Reglas de uso y participación',multiline:true}],
  programa_gubernamental:[{key:'programPeriod',label:'Periodo del programa'},{key:'eligibility',label:'Criterios de acceso',multiline:true},{key:'callReference',label:'Convocatoria o acuerdo de creación'}],
  otro:[{key:'instrumentDescription',label:'Tipo y características del instrumento',multiline:true}],
};
