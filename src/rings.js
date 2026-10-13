import * as THREE from 'three';
const data=typeof __VOYAGER_RINGS__==='undefined'?{}:__VOYAGER_RINGS__;
export function ringBands(id){return data[id]?.bands||[];}
export function addMeasuredRings(axis,id,radius,mobile=false,texture=null){
 const record=data[id];if(!record?.bands)return;
 for(const [name,inner,outer,opacity] of record.bands){const middle=(inner+outer)/2/record.radiusKm*radius,width=(outer-inner)/record.radiusKm*radius,geometry=new THREE.RingGeometry(middle-width/2,middle+width/2,mobile?128:192),mapped=id==='saturn'&&texture&&outer<=140612;
  if(mapped){const p=geometry.attributes.position,uv=geometry.attributes.uv;for(let i=0;i<p.count;i++){const km=Math.hypot(p.getX(i),p.getY(i))/radius*record.radiusKm;uv.setXY(i,(km-66900)/(140612-66900),.5);}}
  const material=new THREE.MeshBasicMaterial({color:id==='uranus'?0x8a929a:id==='neptune'?0x849eb5:mapped?0xffffff:0xa9a294,map:mapped?texture:null,transparent:true,opacity,side:THREE.DoubleSide,depthWrite:false});const mesh=new THREE.Mesh(geometry,material);mesh.rotation.x=-Math.PI/2;mesh.userData.ringName=name;mesh.userData.sourceInnerKm=inner;mesh.userData.sourceOuterKm=outer;axis.add(mesh);}
}
