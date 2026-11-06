export function bookSpread(page:number,total:number,double:boolean){
 const safe=Math.min(Math.max(1,Math.trunc(page)||1),Math.max(1,total));
 return double&&safe>1?safe-safe%2:safe;
}
export function bookPages(page:number,total:number,double:boolean){
 if(total<1)return [];
 const start=bookSpread(page,total,double);
 return double&&start>1&&start<total?[start,start+1]:[start];
}
export function turnBook(page:number,total:number,double:boolean,direction:1|-1){
 const start=bookSpread(page,total,double);
 const next=double?(direction===1?(start===1?2:start+2):(start===2?1:start-2)):start+direction;
 return bookSpread(next,total,double);
}
export function parseByteRange(header:string,size:number):{start:number;end:number}|null{
 const match=/^bytes=(\d*)-(\d*)$/.exec(header);
 if(!match||(!match[1]&&!match[2]))return null;
 let start=match[1]?Number(match[1]):Math.max(0,size-Number(match[2]));
 const end=match[1]?(match[2]?Math.min(Number(match[2]),size-1):size-1):size-1;
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=size||end<start)return null;
 start=Math.max(0,start);return {start,end};
}
