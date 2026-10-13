// Yield between catalogue batches; the complete dataset remains available.
export const yieldToFrame=()=>new Promise(resolve=>setTimeout(resolve,0));
export function batchYield(milliseconds=4){
 let start=performance.now();
 return async()=>{if(performance.now()-start>=milliseconds){await yieldToFrame();start=performance.now();}};
}
