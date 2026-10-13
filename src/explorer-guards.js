export function geographySensitivity(radius){return Math.max(.025,Math.min(.65,(radius-1)*.55));}
export function geographyZoomRadius(radius,factor,min=1.12){
 const altitude=Math.max(min-1,radius-1);return 1+Math.max(min-1,altitude*Math.pow(factor,.55));
}
export function satelliteContext(selected,tracking,lookup){return lookup[selected]?.parent||lookup[tracking]?.parent||(['earth','mars','jupiter','saturn','uranus','neptune'].includes(tracking)?tracking:selected);}
// Limit browser double-tap zoom across the explorer while leaving scrolling,
// native controls and the canvas's independent pinch recognizer intact.
export function bindTouchZoomGuard(element){
 let tap=null,start=null,multi=false;
 element.addEventListener('touchstart',event=>{
  // Native buttons, fields and scrollable cards rely on touch-action rather
  // than cancelling their synthesized click or selection events.
  if(event.target.closest&&!event.target.closest('#universe,.landmark-pin,.continent-pin')){tap=null;start=null;return;}
  multi=event.touches.length!==1;if(multi){tap=null;start=null;return;}const p=event.touches[0];start={x:p.clientX,y:p.clientY,time:event.timeStamp};
 },{passive:true});
 element.addEventListener('touchend',event=>{
  if(multi||!start||event.touches.length){tap=null;start=null;return;}
  const p=event.changedTouches[0],s=start;start=null;
  if(!p||Math.hypot(p.clientX-s.x,p.clientY-s.y)>10||event.timeStamp-s.time>400){tap=null;return;}
  if(tap&&event.timeStamp-tap.time<350&&Math.hypot(p.clientX-tap.x,p.clientY-tap.y)<28){if(event.cancelable)event.preventDefault();tap=null;}
  else tap={x:p.clientX,y:p.clientY,time:event.timeStamp};
 },{passive:false});
 element.addEventListener('touchcancel',()=>{tap=null;start=null;},{passive:true});
}
