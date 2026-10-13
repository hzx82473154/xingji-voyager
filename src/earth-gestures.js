// Pointer-only taps also work on phones. Dragging stays immediate in orbit controls.
export function bindPlanetTaps(element,{pick,single,double,now=()=>performance.now(),schedule=setTimeout,unschedule=clearTimeout}){
 const pointers=new Map();let start=null,multi=false,pending=null;
 const clearPending=()=>{if(pending)unschedule(pending.timer);pending=null;};
 const finishPending=()=>{const tap=pending;clearPending();if(tap)single(tap.hit);};
 element.addEventListener('pointerdown',e=>{
  if(e.pointerType==='mouse'&&e.button!==0)return;
  pointers.set(e.pointerId,true);multi=multi||pointers.size>1;
  start={x:e.clientX,y:e.clientY,id:e.pointerId,time:now(),moved:false};
  if(multi)clearPending();
  else if(pending&&now()-pending.time<=330&&Math.hypot(e.clientX-pending.x,e.clientY-pending.y)<26)unschedule(pending.timer);
 });
 element.addEventListener('pointermove',e=>{
  if(start&&start.id===e.pointerId&&Math.hypot(e.clientX-start.x,e.clientY-start.y)>=6){start.moved=true;clearPending();}
 });
 element.addEventListener('pointerup',e=>{
  const tap=start,valid=!multi&&tap&&tap.id===e.pointerId&&!tap.moved&&Math.hypot(e.clientX-tap.x,e.clientY-tap.y)<6&&now()-tap.time<400;
  pointers.delete(e.pointerId);if(!pointers.size){start=null;multi=false;}
  if(!valid){clearPending();return;}
  const hit=pick(e);if(!hit){clearPending();return;}
  const eligible=h=>h.doubleEligible===true||h.id==='earth'&&h.doubleEligible!==false;
  if(pending&&eligible(hit)&&eligible(pending.hit)&&hit.id===pending.hit.id&&(hit.tapKey||hit.id)===(pending.hit.tapKey||pending.hit.id)&&tap.time-pending.time<=330&&Math.hypot(e.clientX-pending.x,e.clientY-pending.y)<26){clearPending();double(hit);return;}
  finishPending();
  if(!eligible(hit)){single(hit);return;}
  pending={hit,x:e.clientX,y:e.clientY,time:now(),timer:schedule(finishPending,330)};
 });
 const cancel=e=>{if(!pointers.has(e.pointerId))return;pointers.delete(e.pointerId);start=null;clearPending();if(!pointers.size)multi=false;};
 element.addEventListener('pointercancel',cancel);element.addEventListener('lostpointercapture',cancel);
 element.addEventListener('wheel',clearPending,{passive:true});
 return {cancel:clearPending};
}
