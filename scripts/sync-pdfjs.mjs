import {existsSync,readFileSync,mkdirSync,copyFileSync,cpSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const source=join(root,'node_modules/pdfjs-dist');
const {version}=JSON.parse(readFileSync(join(source,'package.json'),'utf8'));
const target=join(root,'public/pdfjs',version);
if(!existsSync(join(target,'pdf.worker.min.mjs'))){
 mkdirSync(target,{recursive:true});
 for(const file of ['pdf.worker.min.mjs','pdf.renderer.min.mjs'])copyFileSync(join(source,'build',file),join(target,file));
 for(const dir of ['cmaps','standard_fonts','wasm'])cpSync(join(source,dir),join(target,dir),{recursive:true});
 copyFileSync(join(source,'LICENSE'),join(target,'LICENSE'));
}
