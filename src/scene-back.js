// A right click matches the existing geographic Back action. A right drag,
// cancelled pointer or unrelated UI context menu never navigates backwards.
export function bindSceneBack(element,{back,canGoBack=()=>true}={}){
 let press=null;
 element.addEventListener('contextmenu',event=>event.preventDefault());
 element.addEventListener('pointerleave',()=>{press=null;});
 element.addEventListener('pointerdown',event=>{
  if(event.pointerType==='mouse'&&event.button===2)press={id:event.pointerId,x:event.clientX,y:event.clientY,moved:false};
 });
 element.addEventListener('pointermove',event=>{if(press&&press.id===event.pointerId&&Math.hypot(event.clientX-press.x,event.clientY-press.y)>6)press.moved=true;});
 const end=event=>{
  if(!press||press.id!==event.pointerId)return;
  const click=event.type==='pointerup'&&event.button===2&&!press.moved&&Math.hypot(event.clientX-press.x,event.clientY-press.y)<=6;press=null;
  if(click&&canGoBack()){event.preventDefault();back();}
 };
 for(const type of ['pointerup','pointercancel','lostpointercapture'])element.addEventListener(type,end);
}
