import {z} from 'zod';
import {
 legalClassificationOptions,legalThemeOptions,LEGAL_MAX_DOCUMENTS,
 type LegalInput,
} from '@/data/legal';

const text=z.string().trim().max(20000);
const short=z.string().trim().max(500);
const emptyText=text.default('');
const date=z.string().trim().refine(value=>{
 if(value==='')return true;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const parsed=new Date(value+'T00:00:00Z');
 return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===value;
},'La fecha debe ser válida y usar el formato AAAA-MM-DD.').default('');
const sourceId=z.string().trim().max(100);
export const legalIdentifierSchema=z.string().uuid('El identificador no es válido.');
const https=z.string().trim().max(2000).refine(value=>{
 if(value==='')return true;
 try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password;}
 catch{return false;}
},'Las fuentes en línea deben usar una URL HTTPS válida.').default('');
export const legalVisibilitySchema=z.enum(['publico','restringido']);
const source=z.object({
 id:sourceId.default(''),title:short.min(1,'La fuente necesita un título.'),
 reference:text.default(''),authority:short.default(''),url:https,
 publicationDate:date,consultedAt:date,publicCitation:text.default(''),
 claim:emptyText,section:short.default(''),visibility:legalVisibilitySchema.default('restringido'),
}).strict().superRefine((value,ctx)=>{
 if(!value.reference&&!value.url&&!value.publicCitation)ctx.addIssue({code:z.ZodIssueCode.custom,path:['reference'],message:'Agrega una referencia, URL o cita proporcionada de la fuente.'});
});
const link=z.object({
 kind:z.enum(['recipes','ingredients','markets','cooks','producers','establishments','municipalities']),
 origin:z.enum(['ogp','panel']),id:z.string().trim().min(1).max(120),
 name:short.default(''),scope:text.min(1,'Describe el alcance documentado del vínculo.'),
 sourceId:sourceId.min(1,'Selecciona una fuente del instrumento.'),
 href:z.string().max(2000).optional(),
 municipalityCode:z.string().regex(/^\d{5}$/).optional(),
}).strict();
const dossier=z.object({
 id:legalIdentifierSchema.optional(),title:short.min(1,'El expediente necesita un título.'),
 folio:short.default(''),requestDate:date,
 state:z.enum(['solicitado','evaluacion','requerimientos','favorable','rechazado','desistido','no_documentado']).default('no_documentado'),
}).strict();
const classificationValues=legalClassificationOptions.map(option=>option.value) as [typeof legalClassificationOptions[number]['value'],...typeof legalClassificationOptions[number]['value'][]];
const themeValues=legalThemeOptions.map(option=>option.value) as [typeof legalThemeOptions[number]['value'],...typeof legalThemeOptions[number]['value'][]];
export const legalInputSchema:z.ZodType<LegalInput,z.ZodTypeDef,unknown>=z.object({
 name:short.min(1,'Escribe el nombre del instrumento.'),classification:z.enum(classificationValues),
 thematicAxes:z.array(z.enum(themeValues)).max(legalThemeOptions.length).default([]),
 jurisdiction:z.enum(['federal','estatal','municipal','otro']).default('estatal'),
 authority:short.default(''),officialReference:text.default(''),
 publicationDate:date,validFrom:date,validUntil:date,reviewDate:date,
 situation:z.enum(['vigente_documentada','vencido','revocado','no_determinada']).default('no_determinada'),
 description:emptyText,scope:emptyText,regulatedMatter:emptyText,beneficiaries:emptyText,
 territorialScope:emptyText,responsibleAgency:emptyText,budget:emptyText,operatingRules:emptyText,
 safeguardingPlan:emptyText,complianceIndicators:emptyText,effectiveness:emptyText,
 operationalChallenges:emptyText,legalGaps:emptyText,linkedPolicies:emptyText,
 specificFields:z.record(z.string().min(1).max(100),text).refine(value=>Object.keys(value).length<=50,'Hay demasiados campos específicos.').default({}),
 sources:z.array(source).max(100).default([]),links:z.array(link).max(500).default([]),
 documentIds:z.array(legalIdentifierSchema).max(LEGAL_MAX_DOCUMENTS).default([]),
 dossier:dossier.nullable().default(null),privateNotes:emptyText,
}).strict().superRefine((value,ctx)=>{
 if(value.validFrom&&value.validUntil&&value.validUntil<value.validFrom)ctx.addIssue({code:z.ZodIssueCode.custom,path:['validUntil'],message:'La fecha de término debe ser posterior al inicio.'});
 const ids=value.sources.map(item=>item.id).filter(Boolean);
 if(new Set(ids).size!==ids.length)ctx.addIssue({code:z.ZodIssueCode.custom,path:['sources'],message:'No repitas identificadores de fuentes.'});
 if(new Set(value.documentIds).size!==value.documentIds.length)ctx.addIssue({code:z.ZodIssueCode.custom,path:['documentIds'],message:'No repitas documentos.'});
 if(new Set(value.thematicAxes).size!==value.thematicAxes.length)ctx.addIssue({code:z.ZodIssueCode.custom,path:['thematicAxes'],message:'No repitas ejes temáticos.'});
});
export const legalWorkflowSchema=z.object({
 action:z.enum(['submit','validate','corrections','publish','withdraw']),
 notes:z.string().trim().max(10000).optional(),revisionId:legalIdentifierSchema.optional(),
}).strict().superRefine((value,ctx)=>{
 if(value.action==='corrections'&&!value.notes)ctx.addIssue({code:z.ZodIssueCode.custom,path:['notes'],message:'Describe las correcciones solicitadas.'});
});
export const legalUploadMetadataSchema=z.object({
 visibility:legalVisibilitySchema,license:z.string().trim().max(2000),
 sourceId:sourceId.min(1).optional(),
}).strict().superRefine((value,ctx)=>{
 if(value.visibility==='publico'&&!value.license)ctx.addIssue({code:z.ZodIssueCode.custom,path:['license'],message:'Indica la licencia o condición de uso para publicar el PDF.'});
});
