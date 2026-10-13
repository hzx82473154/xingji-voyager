import * as THREE from 'three';
import {resourceUrl} from './resources.js';
import {bindPlanetTaps} from './earth-gestures.js';
import {localDirection} from './earth-geography.js';
import {continentId} from './earth-continents.js';

export const geographyData = __VOYAGER_GEOGRAPHY__;
const DEG = Math.PI / 180;
const hidePin=button=>{if(!button.hidden)button.hidden=true;};
function placePin(button,x,y){
 const left=x+'px',top=y+'px';if(button.style.left!==left)button.style.left=left;if(button.style.top!==top)button.style.top=top;if(button.hidden)button.hidden=false;
}

// EPSG:4326 imagery is tessellated on the same sphere as the original Earth.
// Tile UVs preserve north at the top; triangles face outwards.
export function surfaceTileGeometry(tile, radius=1.002, segments=12){
 const positions=[],uv=[],indices=[];
 for(let y=0;y<=segments;y++)for(let x=0;x<=segments;x++){
  const lon=THREE.MathUtils.lerp(tile.west,tile.east,x/segments),lat=THREE.MathUtils.lerp(tile.north,tile.south,y/segments);
  positions.push(...localDirection(lat,lon).multiplyScalar(radius).toArray());uv.push(x/segments,1-y/segments);
 }
 for(let y=0;y<segments;y++)for(let x=0;x<segments;x++){
  const a=y*(segments+1)+x,b=a+1,c=a+segments+1,d=c+1;indices.push(a,c,b,b,c,d);
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingSphere();return geometry;
}

export function countryView(country,index,fov,aspect){
 const anchor=index.anchor(country),centre=localDirection(anchor.lat,anchor.lon);
 const ringArea=ring=>Math.abs(ring.reduce((sum,p,i)=>{const q=ring[(i+1)%ring.length];return sum+p[0]*q[1]-q[0]*p[1];},0));
 const polygons=[...country.polygons].sort((a,b)=>ringArea(b[0])-ringArea(a[0])),largest=ringArea(polygons[0][0]);
 let extent=2*DEG;
 // Distant overseas possessions do not pull the mainland view across the globe.
 for(const poly of polygons){if(ringArea(poly[0])<largest*.002)continue;for(const [lon,lat] of poly[0]){
  const angle=centre.angleTo(localDirection(lat,lon));if(angle<80*DEG)extent=Math.max(extent,angle);
 }}
 const half=Math.min(fov*DEG/2,Math.atan(Math.tan(fov*DEG/2)*Math.max(.45,aspect))),padded=Math.min(80*DEG,extent*1.2+1.5*DEG);
 return {point:anchor,radius:THREE.MathUtils.clamp(Math.cos(padded)+Math.sin(padded)/Math.tan(half),1.12,3.4),extent:extent/DEG};
}

export function visibleSurfaceAngle(radius,fov,aspect){
 const beta=Math.atan(Math.tan(fov*DEG/2)*Math.sqrt(1+aspect*aspect));
 return radius*Math.sin(beta)>=1?Math.acos(1/Math.max(1.001,radius)):Math.asin(radius*Math.sin(beta))-beta;
}

// Green is Three.js alphaMap's opacity channel. The coarse atlas remains
// underneath every edge, so neighbouring LODs blend without blue rectangles.
export function tileEdgeMask(size=64){
 const data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const d=Math.min(x,y,size-1-x,size-1-y)/(size-1),a=THREE.MathUtils.smoothstep(d,0,.045),i=(y*size+x)*4;data[i]=data[i+1]=data[i+2]=Math.round(a*255);data[i+3]=255;
 }
 const texture=new THREE.DataTexture(data,size,size);texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=false;texture.needsUpdate=true;return texture;
}
export class EarthSurfaceDetail{
 constructor(globe,assets,{mobile=false,quality=mobile?'standard':'fine',onStatus=()=>{},loader=new THREE.TextureLoader()}={}){
  Object.assign(this,{globe,assets,mobile,quality,onStatus,loader});this.active=false;this.entries=new Map();this.inflight=0;this.wanted=new Set();this.lastUpdate=-1;this.generation=0;this.base=null;this.basePending=null;this.edgeMask=null;
  this.surfaceRevision=0;this.root=new THREE.Group();this.root.name='earth-natural-colour-detail';this.root.visible=false;globe.add(this.root);
  this.tiles=geographyData.tiles.map(tile=>({...tile,centre:localDirection((tile.north+tile.south)/2,(tile.west+tile.east)/2),margin:(tile.east-tile.west)*DEG*.75}));
 }
 setActive(active){if(this.active===active)return;this.active=active;this.lastUpdate=-1;if(active){this.root.visible=false;this.basePending=this.loadBase();}else this.clear();}
 setQuality(quality){if(!['standard','fine'].includes(quality)||this.quality===quality)return;const active=this.active;if(active)this.setActive(false);this.quality=quality;if(active)this.setActive(true);}
 clear(){this.generation++;this.surfaceRevision++;this.root.visible=false;this.wanted.clear();if(this.base){this.root.remove(this.base);this.base.geometry.dispose();this.base.material.map.dispose();this.base.material.dispose();this.base=null;}this.basePending=null;this.edgeMask?.dispose();this.edgeMask=null;for(const entry of this.entries.values()){if(entry.mesh){this.root.remove(entry.mesh);entry.mesh.geometry.dispose();entry.mesh.material.dispose();entry.texture.dispose();}}this.entries.clear();}
 async loadBase(){
  const generation=this.generation;
  try{
   const asset=this.quality==='fine'?(this.mobile?'geo_base_fine_mobile':'geo_base_fine'):'geo_base';
   const texture=await this.loader.loadAsync(await resourceUrl(this.assets[asset]||this.assets.geo_base));if(generation!==this.generation||!this.active){texture.dispose();return;}
   const cap=this.quality==='standard'?(this.mobile?2048:4096):(this.mobile?4096:8192);
   if(texture.image?.width>cap){const canvas=document.createElement('canvas');canvas.width=cap;canvas.height=cap/2;canvas.getContext('2d').drawImage(texture.image,0,0,cap,cap/2);texture.image=canvas;texture.needsUpdate=true;}
   texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=THREE.RepeatWrapping;texture.anisotropy=this.mobile?4:8;
   this.base=new THREE.Mesh(new THREE.SphereGeometry(1.0015,this.mobile?96:160,this.mobile?64:112),new THREE.MeshBasicMaterial({map:texture,toneMapped:false}));this.base.name='global-natural-colour-atlas';this.surfaceRevision++;this.base.renderOrder=1;this.root.add(this.base);this.root.visible=true;this.lastUpdate=-1;this.onStatus({ready:0,total:0,globalReady:true});
  }catch{if(generation===this.generation&&this.active)this.onStatus({ready:0,total:0,baseFailed:true});}
 }
 update(camera,now=performance.now()){
  if(!this.active||!this.base)return;
  if(this.quality==='standard'){this.onStatus({ready:0,total:0,globalReady:true,quality:this.quality});return;}
  for(const entry of this.entries.values())if(entry.mesh?.visible&&entry.mesh.material.transparent){if(entry.fadeStart===null)entry.fadeStart=now;const material=entry.mesh.material;material.opacity=THREE.MathUtils.smoothstep(now-entry.fadeStart,0,320);if(material.opacity===1){material.transparent=false;this.surfaceRevision++;}}
  if(now-this.lastUpdate<220)return;this.lastUpdate=now;
  const local=this.globe.worldToLocal(camera.position.clone()),radius=local.length(),direction=local.normalize();
  const desired=radius>1.55?5:radius>1.2?6:7,angle=visibleSurfaceAngle(radius,camera.fov,camera.aspect);
  const target=[];
  for(const tile of this.tiles){if(tile.level>desired)continue;const distance=tile.centre.angleTo(direction);if(distance<=angle+tile.margin+2*DEG)target.push({tile,distance});}
  target.sort((a,b)=>b.tile.level-a.tile.level||a.distance-b.distance);
  const capacity=this.mobile?64:144,chosen=target.slice(0,capacity),parents=[];
  for(const {tile} of chosen)if(tile.level>5){const lon=(tile.west+tile.east)/2,lat=(tile.north+tile.south)/2;const parent=this.tiles.find(t=>t.level===5&&lon>=t.west&&lon<t.east&&lat>=t.south&&lat<t.north);if(parent&&!parents.some(p=>p.tile.asset===parent.asset))parents.push({tile:parent,distance:0});}
  const visible=[...parents.slice(0,32),...chosen];this.wanted=new Set(visible.map(t=>t.tile.asset));
  for(const [key,entry] of this.entries)if(entry.mesh){const visible=this.wanted.has(key);if(visible!==entry.mesh.visible)this.surfaceRevision++;entry.mesh.visible=visible;if(entry.mesh.visible)entry.lastSeen=now;}
  for(const {tile} of visible){if(this.inflight>=3)break;if(this.entries.has(tile.asset))continue;this.load(tile,now);}
  const maximum=capacity+40;
  if(this.entries.size>maximum){const unused=[...this.entries].filter(([key,e])=>e.mesh&&!this.wanted.has(key)).sort((a,b)=>a[1].lastSeen-b[1].lastSeen);for(const [key,e] of unused){if(this.entries.size<=maximum)break;this.root.remove(e.mesh);e.mesh.geometry.dispose();e.mesh.material.dispose();e.texture.dispose();this.entries.delete(key);}}
  const ready=visible.filter(({tile})=>this.entries.get(tile.asset)?.mesh).length;this.onStatus({ready,total:visible.length,level:desired,cached:this.entries.size,globalReady:true});
 }
 async load(tile,now){
  const generation=this.generation;this.entries.set(tile.asset,{pending:true,lastSeen:now});this.inflight++;
  try{
   const texture=await this.loader.loadAsync(await resourceUrl(this.assets[tile.asset]));if(generation!==this.generation||!this.active){texture.dispose();return;}
   texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=this.mobile?4:8;
   // Shared spherical elevation and opaque tile interiors prevent broad strips
   // of coarse atlas from bleeding into otherwise sharp detail.
   const geometry=surfaceTileGeometry(tile,1.0022),material=new THREE.MeshBasicMaterial({map:texture,transparent:true,opacity:0,depthWrite:false,toneMapped:false});
   const mesh=new THREE.Mesh(geometry,material);mesh.name=tile.asset;mesh.renderOrder=tile.level+1;mesh.visible=this.wanted.has(tile.asset);this.root.add(mesh);this.entries.set(tile.asset,{tile,mesh,texture,lastSeen:now,fadeStart:null});this.surfaceRevision++;
  }catch{if(generation===this.generation)this.entries.set(tile.asset,{failed:true,lastSeen:now});}
  finally{this.inflight--;this.lastUpdate=-1;}
 }
 snapshot(){return {active:this.active,globalReady:!!this.base,cached:this.entries.size,visible:[...this.entries.values()].filter(e=>e.mesh?.visible).length,available:this.tiles.length};}
}

// A few globe-anchored labels make the new continent overview discoverable on
// touch screens. Far-side, HUD-covered and detail-view labels stay hidden.
export class EarthContinentLabels{
 constructor(globe,index,container,onSelect){
  Object.assign(this,{globe,index,container});this.active=false;
  this.entries=index.records.map(item=>{
   const button=document.createElement('button');button.className='continent-pin';button.hidden=true;
   const title=document.createElement('span'),subtitle=document.createElement('small');title.textContent=item.cn;subtitle.textContent=item.en;button.append(title,subtitle);
   button.setAttribute('aria-label',`选择${item.cn}，再次点击进入景点`);
   // Pointer taps run before the touchend browser-zoom guard; a suppressed
   // native click must not swallow the second intentional continent tap.
   bindPlanetTaps(button,{pick:()=>({id:'continent',doubleEligible:false,tapKey:item.id}),single:()=>onSelect(item.id),double:()=>onSelect(item.id)});
   button.onclick=event=>{if(event.detail===0)onSelect(item.id);};container.append(button);
   const point=index.anchor(item);return {item,button,local:localDirection(point.lat,point.lon).multiplyScalar(1.008)};
  });
 }
 setActive(active){this.active=active;if(!active)for(const entry of this.entries)entry.button.hidden=true;}
 update(camera,{width,height,markers=true,panelRect=null,blockedRects=[],selected=null}){
  if(!this.active)return;this.globe.updateWorldMatrix(true,false);const eye=camera.position.clone().applyMatrix4(new THREE.Matrix4().copy(this.globe.matrixWorld).invert()),occupied=[];
  for(const {item,button,local} of this.entries){
   if(!markers||local.dot(eye)<1.015||eye.length()>9){hidePin(button);continue;}
   const p=local.clone().applyMatrix4(this.globe.matrixWorld).project(camera),x=(p.x*.5+.5)*width,y=(-p.y*.5+.5)*height;
   if(blockedRects.some(r=>x>r.left-18&&x<r.right+18&&y>r.top-18&&y<r.bottom+18)||p.z< -1||p.z>1||x<40||x>width-65||y<112||y>height-112||panelRect&&x>panelRect.left-45&&x<panelRect.right+45&&y>panelRect.top-30&&y<panelRect.bottom+30||occupied.some(point=>Math.abs(point.x-x)<90&&Math.abs(point.y-y)<45)){hidePin(button);continue;}
   button.classList.toggle('selected',selected===item.id);placePin(button,x,y);occupied.push({x,y});
  }
 }
}

export class EarthLandmarkLayer{
 constructor(globe,container,assets,onSelect){
  Object.assign(this,{globe,container,assets,onSelect});this.active=false;this.selected=null;this.allowedIds=null;
  this.entries=geographyData.landmarks.map(item=>{
   const button=document.createElement('button');button.className='landmark-pin';button.hidden=true;button.title=item.name+' · '+item.region;button.setAttribute('aria-label','查看'+item.name+'介绍与照片');
   const icon=document.createElement('span');icon.className='landmark-pin-dot';icon.textContent=item.category==='自然景观'?'◇':'⌂';const text=document.createElement('span');text.className='landmark-pin-name';text.textContent=item.name;button.append(icon,text);
   const taps=bindPlanetTaps(button,{pick:()=>({id:'landmark',doubleEligible:true,tapKey:item.id}),single:()=>this.onSelect(item,false),double:()=>this.onSelect(item,true)});button.onclick=e=>{if(e.detail===0)this.onSelect(item,false);};button.onpointerdown=e=>e.stopPropagation();container.append(button);return {item,button,taps,local:localDirection(item.lat,item.lon).multiplyScalar(1.006)};
  });
  this.allowedEntries=this.entries;
 }
 setActive(active){this.active=active;if(!active){this.selected=null;for(const e of this.entries){e.button.hidden=true;e.taps.cancel();}}}
 setItems(items){this.allowedIds=new Set(items.map(item=>item.id));this.allowedEntries=this.entries.filter(e=>this.allowedIds.has(e.item.id));for(const e of this.entries)if(!this.allowedIds.has(e.item.id)){hidePin(e.button);e.taps.cancel();}}
 select(id){this.selected=id;for(const e of this.entries)e.button.classList.toggle('selected',e.item.id===id);}
 update(camera,{width,height,mobile=false,markers=true,dragging=false,panelRect=null,blockedRects=[]}){
  if(!this.active)return;this.globe.updateWorldMatrix(true,false);const eye=camera.position.clone().applyMatrix4(new THREE.Matrix4().copy(this.globe.matrixWorld).invert()),occupied=[],distance=eye.length();
  const ordered=[...this.allowedEntries].sort((a,b)=>(b.item.id===this.selected)-(a.item.id===this.selected)||a.local.distanceToSquared(eye)-b.local.distanceToSquared(eye));
  for(const entry of ordered){const {item,button,local}=entry;
   // Dot(normal, eye - surface) rejects labels on the back of the sphere.
   if(!markers||distance>5||local.dot(eye)<1.008){hidePin(button);continue;}
   const p=local.clone().applyMatrix4(this.globe.matrixWorld).project(camera),x=(p.x*.5+.5)*width,y=(-p.y*.5+.5)*height;
   if(blockedRects.some(r=>mobile?x+65>r.left-6&&x-65<r.right+6&&y>r.top-6&&y-34<r.bottom+6:x>r.left-18&&x<r.right+18&&y>r.top-18&&y<r.bottom+18)||p.z< -1||p.z>1||x<15||x>width-48||y<105||y>height-100||panelRect&&x>panelRect.left-12&&x<panelRect.right+12&&y>panelRect.top-18&&y<panelRect.bottom+18){hidePin(button);continue;}
   const isSelected=item.id===this.selected,collides=occupied.some(o=>Math.abs(o.x-x)<(mobile?93:112)&&Math.abs(o.y-y)<33);
   if((collides||mobile&&occupied.length>=5)&&!isSelected){hidePin(button);continue;}
   placePin(button,x,y);if(entry.dragging!==dragging){button.classList.toggle('during-drag',dragging);entry.dragging=dragging;}occupied.push({x,y});
  }
 }
 countryItems(country){const parent=country.parentId||country.id;return geographyData.landmarks.filter(l=>l.countryId===parent&&(!country.parentId||l.region===country.cn));}
 continentItems(continent,index){return geographyData.landmarks.filter(l=>continentId(index.byId.get(l.countryId),l)===continent.id);}
}
