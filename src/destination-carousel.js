// Only one page enters the DOM. The backing catalog stays complete on phones.
export class DestinationPages {
 constructor(size=6){this.size=size;this.page=0;this.items=[];this.selected=null;}
 get pages(){return Math.max(1,Math.ceil(this.items.length/this.size));}
 get visible(){return this.items.slice(this.page*this.size,(this.page+1)*this.size);}
 setItems(items,selected){this.items=items;this.page=0;this.selected=null;this.select(selected);}
 select(id){if(id===this.selected)return;this.selected=id;const i=this.items.findIndex(r=>r.id===id);if(i>=0)this.page=Math.floor(i/this.size);}
 move(delta){this.page=Math.max(0,Math.min(this.pages-1,this.page+delta));}
 resize(size){const first=this.page*this.size;this.size=Math.max(1,size);this.page=Math.min(this.pages-1,Math.floor(first/this.size));}
}
export const destinationPageSize=(width,mobile)=>mobile?(width<300?2:3):(width<640?5:6);
export function bindDestinationCarousel(doc,{mobile=false,render}={}){
 const list=doc.getElementById('destinations'),prev=doc.getElementById('destinationPrev'),next=doc.getElementById('destinationNext'),indicator=doc.getElementById('destinationPage');
 const state=new DestinationPages(destinationPageSize(list.clientWidth,mobile));
 const paint=()=>{
  list.style.setProperty('--page-size',state.size);
  list.replaceChildren(...state.visible.map(item=>{const node=render(item);node.classList.toggle('active',item.id===state.selected);node.setAttribute('aria-current',item.id===state.selected?'true':'false');return node;}));
  prev.disabled=state.page===0;next.disabled=state.page===state.pages-1;prev.setAttribute('aria-disabled',String(prev.disabled));next.setAttribute('aria-disabled',String(next.disabled));
  indicator.textContent=`${state.page+1} / ${state.pages}`;
  indicator.setAttribute('aria-label',`第 ${state.page+1} 页，共 ${state.pages} 页，${state.items.length} 个天体`);
 };
 const move=delta=>{state.move(delta);paint();};prev.onclick=()=>move(-1);next.onclick=()=>move(1);
 list.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();move(e.key==='ArrowRight'?1:-1);(e.key==='ArrowRight'?list.firstElementChild:list.lastElementChild)?.focus();}});
 let wheelTime=0;
 list.addEventListener('wheel',e=>{if(state.pages<2)return;e.preventDefault();const now=Date.now(),delta=Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY;if(Math.abs(delta)>8&&now-wheelTime>280){move(delta>0?1:-1);wheelTime=now;}},{passive:false});
 let drag=null,suppress=false;const touches=new Set();
 list.addEventListener('pointerdown',e=>{if(e.button!==0)return;if(mobile&&e.pointerType==='touch'){touches.add(e.pointerId);if(touches.size>1){drag=null;list.classList.remove('dragging');return;}}drag={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};});
 list.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)>10&&Math.abs(dx)>Math.abs(dy)){drag.moved=true;list.setPointerCapture(e.pointerId);list.classList.add('dragging');e.preventDefault();}});
 const end=e=>{touches.delete(e.pointerId);if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x;suppress=drag.moved;if(e.type==='pointerup'&&drag.moved&&Math.abs(dx)>35)move(dx<0?1:-1);drag=null;list.classList.remove('dragging');if(list.hasPointerCapture(e.pointerId))list.releasePointerCapture(e.pointerId);if(suppress)setTimeout(()=>suppress=false,0);};
 list.addEventListener('pointerup',end);list.addEventListener('pointercancel',end);list.addEventListener('lostpointercapture',end);
 list.addEventListener('click',e=>{if(suppress){e.preventDefault();e.stopImmediatePropagation();}},{capture:true});
 new ResizeObserver(()=>{const size=destinationPageSize(list.clientWidth,mobile);if(size!==state.size){state.resize(size);paint();}}).observe(list);
 return {state,setItems(items,selected){state.setItems(items,selected);paint();},select(id){if(id!==state.selected){state.select(id);paint();}}};
}
