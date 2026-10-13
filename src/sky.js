import * as THREE from 'three';
import {skyPosition} from './astronomy.js';
import {resolveConstellations} from './exploration.js';
const RADIUS=1800000;
export function buildSky(scene,stars,makeMaterial){
 const group=new THREE.Group();scene.add(group);group.visible=false;
 const items=resolveConstellations(stars).map(c=>{
  const directions=new Map(c.members.map(r=>[r.id,new THREE.Vector3(...skyPosition(r.ra,r.dec,1,1)).normalize()]));
  const anchor=new THREE.Vector3();for(const d of directions.values())anchor.add(d);anchor.normalize();
  const p=[];
  for(const path of c.paths)for(let i=1;i<path.length;i++){
   const a=directions.get(path[i-1].id),b=directions.get(path[i].id),turn=new THREE.Quaternion().setFromUnitVectors(a,b);
   for(let j=0;j<12;j++)for(const t of [j/12,(j+1)/12])p.push(...a.clone().applyQuaternion(new THREE.Quaternion().slerp(turn,t)).multiplyScalar(RADIUS).toArray());
  }
  const line=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(Array.from({length:p.length/3},(_,i)=>new THREE.Vector3(...p.slice(i*3,i*3+3)))),new THREE.LineBasicMaterial({color:0x699eae,transparent:true,opacity:.38,depthWrite:false}));line.frustumCulled=false;group.add(line);
  return {...c,anchor:anchor.multiplyScalar(RADIUS),line};
 });
 const members=[...new Map(items.flatMap(c=>c.members).map(r=>[r.id,r])).values()],p=[],colors=[],strength=[];
 for(const r of members){p.push(...skyPosition(r.ra,r.dec,1,RADIUS));colors.push(.78,.88,1);strength.push(.95);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setAttribute('strength',new THREE.Float32BufferAttribute(strength,1));
 const points=new THREE.Points(g,makeMaterial(3.5));points.frustumCulled=false;group.add(points);
 return {group,items,update(camera,visible,lines=true){group.position.copy(camera.position);group.visible=visible;for(const item of items)item.line.visible=lines;}};
}

export function skyInfo(item){
 return {cn:item.cn,en:item.en,type:'星空图案 / SKY PATTERN',desc:item.note+'。以太阳附近为观察点，按 J2000 天球方向绘制亮星和简化连线；组成图案的恒星距离各不相同，线条不是实体结构或星座边界。',facts:[['图案亮星',item.members.length+' 颗'],['观察基准','太阳附近 · J2000'],['视图类型','天球方向投影']],source:'亮星位置：HYG 4.1；简化图案：Voyager'};
}
