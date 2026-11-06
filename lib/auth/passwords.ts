import { randomBytes, scrypt, timingSafeEqual, createHash } from "node:crypto";
const options={N:32768,r:8,p:1,maxmem:64*1024*1024};
const derive=(password:string,salt:string)=>new Promise<Buffer>((resolve,reject)=>scrypt(password,salt,64,options,(error,key)=>error?reject(error):resolve(key)));
export const tokenHash=(token:string)=>createHash("sha256").update(token).digest("hex");
export const newToken=()=>randomBytes(32).toString("base64url");
export function validPassword(password:string){return password.length>=12&&password.length<=128;}
export async function hashPassword(password:string){
 if(!validPassword(password))throw new Error("La contraseña debe tener entre 12 y 128 caracteres.");
 const salt=randomBytes(16).toString("hex");
 return `scrypt$${salt}$${(await derive(password,salt)).toString("hex")}`;
}
export async function verifyPassword(password:string,encoded:string){
 const match=/^scrypt\$([a-f0-9]{32})\$([a-f0-9]{128})$/.exec(encoded);
 const salt=match?.[1]??"00000000000000000000000000000000";
 const actual=await derive(password,salt);
 const expected=match?Buffer.from(match[2],"hex"):Buffer.alloc(64);
 return timingSafeEqual(actual,expected)&&!!match;
}
