import * as THREE from 'three';
import {kepler,skyPosition,planetPosition,POLES,ROTATION,ELEMENTS,DEG,TAU} from './astronomy.js';
import {EARTH_RADIUS_KM,AU_UNITS,SOLAR_RADIUS_EARTH} from './physical-scale.js';
export {EARTH_RADIUS_KM,AU_UNITS,SOLAR_RADIUS_EARTH} from './physical-scale.js';

export const DEFAULT_EPOCH_JD=2461320.5;
// Bodies, orbits and catalogue positions share one Earth-mean-radius unit.
export const DISPLAY_RADII={sun:696350/EARTH_RADIUS_KM,...Object.fromEntries(Object.entries({mercury:4879.4,venus:12103.6,earth:12742,mars:6779,jupiter:139820,saturn:116460,uranus:50724,neptune:49244}).map(([id,diameter])=>[id,diameter/(2*EARTH_RADIUS_KM)]))};
const database=typeof __VOYAGER_EXTENDED__==='undefined'?[]:__VOYAGER_EXTENDED__.surfaces?.bodies||[];
const physical=new Map(database.flatMap(r=>[[r.id,r],[r.key||r.id,r]]));
let epoch=DEFAULT_EPOCH_JD;
export const orbitEpoch=()=>epoch;
export function setOrbitEpoch(value){if(Number.isFinite(value))epoch=value;}
export const physicalRecord=id=>physical.get(id)||physical.get(String(id).replace(/^surface:/,''));
export function naturalRadius(r){
 const km=r.radiusKm||r.diameterKm/2;
 if(!(km>0))return null;
 if(r.parent&&r.parent!=='sun'){
  const p=physicalRecord(r.parent),parentKm=p?.radiusKm||p?.diameterKm/2;
  if(parentKm>0)return km/parentKm*(DISPLAY_RADII[r.parent]||parentKm/EARTH_RADIUS_KM);
 }
 return km/EARTH_RADIUS_KM;
}
// No satellite compression: its physical distance uses the same unit as AU/ly.
export function satelliteDistance(aKm,parentRadiusKm,parentRenderRadius){
 if(!(aKm>0&&parentRadiusKm>0&&parentRenderRadius>0))return null;
 return aKm/parentRadiusKm*parentRenderRadius;
}
export function compressedAU(a){
 // Compatibility export for old consumers; this is now strictly linear.
 return a*AU_UNITS;
}
export function planetDisplayPosition(id,jd,solarFrame,anomaly=null){
 const p=new THREE.Vector3(...planetPosition(id,jd,null,anomaly)),r=p.length();
 return p.multiplyScalar(compressedAU(r)/r).applyQuaternion(solarFrame.clone().normalize());
}
export function referencePlane(el,parent,solarFrame){
 if(/ecliptic/i.test(el.frame||''))return solarFrame.clone();
 const angles=Number.isFinite(el.poleRaDeg)&&Number.isFinite(el.poleDecDeg)?[el.poleRaDeg,el.poleDecDeg]:POLES[String(parent).replace(/^surface:/,'')]||(/pluto/.test(parent)?[132.993,-6.163]:null);
 if(!angles)return solarFrame.clone();
 const pole=new THREE.Vector3(...skyPosition(...angles,1,1)).normalize();
 // Equatorial elements of Uranus' regular moons are prograde relative to
 // its retrograde spin. IAU conventional north is opposite angular momentum.
 if(el.frame==='equatorial'&&ROTATION[String(parent).replace(/^surface:/,'')]?.hours<0)pole.negate();
 const north=new THREE.Vector3(...skyPosition(0,90,1,1)).normalize();
 // JPL node zero is the ascending intersection of this plane with ICRF's
 // equator. A generic shortest-rotation quaternion loses that longitude.
 const x=north.cross(pole).normalize();
 if(x.lengthSq()<.5)x.set(...skyPosition(0,0,1,1)).normalize();
 const z=x.clone().cross(pole).normalize();
 return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,pole,z));
}
export function hasOrbitPhase(el){return !!el&&['e','iDeg','nodeDeg','periDeg','meanAnomalyDeg','epochJD'].every(k=>Number.isFinite(el[k]))&&el.e>=0&&el.e<1;}
export function orbitalOffset(a,el,mean){
 const e=el.e??0,E=kepler(mean,e),x=a*(Math.cos(E)-e),y=a*Math.sqrt(1-e*e)*Math.sin(E),w=(el.periDeg??0)*DEG,O=(el.nodeDeg??0)*DEG,I=(el.iDeg??0)*DEG;
 return new THREE.Vector3((Math.cos(w)*Math.cos(O)-Math.sin(w)*Math.sin(O)*Math.cos(I))*x+(-Math.sin(w)*Math.cos(O)-Math.cos(w)*Math.sin(O)*Math.cos(I))*y,(Math.sin(w)*x+Math.cos(w)*y)*Math.sin(I),-((Math.cos(w)*Math.sin(O)+Math.sin(w)*Math.cos(O)*Math.cos(I))*x+(-Math.sin(w)*Math.sin(O)+Math.cos(w)*Math.cos(O)*Math.cos(I))*y));
}
export function prepareSolarData(data,solarFrame){
 for(const r of data){const source=physicalRecord(r.id);if(source){r.radiusKm=source.radiusKm;r.diameterKm=source.diameterKm;const radius=naturalRadius(source);if(radius!=null)r.r=radius;}else if(DISPLAY_RADII[r.id])r.r=DISPLAY_RADII[r.id];}
 for(const r of data)if(ELEMENTS[r.id])r.orbit=ELEMENTS[r.id][0][0]*AU_UNITS;
 for(const r of data)if(r.parent&&r.parent!=='sun')prepareSatellite(r,data.find(p=>p.id===r.parent),solarFrame);
}
export function prepareSatellite(r,parent,solarFrame){
 const source=physicalRecord(r.bodyKey||r.id);
 if(source)Object.assign(r,{radiusKm:source.radiusKm,diameterKm:source.diameterKm,aKm:source.aKm,periodDays:source.orbitalPeriodDays,orbitalElements:source.orbitalElements});
 const parentSource=physicalRecord(r.parent),parentKm=parentSource?.radiusKm||parentSource?.diameterKm/2;
 r.parentRadiusKm=parentKm;r.parentRenderRadius=parent.r||naturalRadius(parentSource)||1;
 r.orbit=satelliteDistance(r.aKm,parentKm,r.parentRenderRadius);
 r.orbitQuality=hasOrbitPhase(r.orbitalElements)?'JPL 平均要素 · 固定参考面二体近似':'方位 / 相位未测定 · 轨道展示约定';
 r.displayElements=null;
 if(!r.orbitalElements&&r.aKm>0&&r.periodDays>0)r.displayElements={e:0,iDeg:0,nodeDeg:0,periDeg:0,meanAnomalyDeg:[...r.id].reduce((a,c)=>a+c.charCodeAt(0),0)%360,epochJD:DEFAULT_EPOCH_JD};
 r.referenceFrame=r.orbitalElements?referencePlane(r.orbitalElements,r.parent,solarFrame):solarFrame.clone();
 const measured=naturalRadius(r);if(measured!=null)r.r=measured;
 return r;
}
export function satelliteOffset(r,days,epochJD=orbitEpoch(),anomaly=null){
 const el=r.orbitalElements||r.displayElements;
 if(!(r.orbit>0)||!hasOrbitPhase(el))return null;
 const mean=anomaly??el.meanAnomalyDeg*DEG+(r.periodDays>0?(epochJD+days-el.epochJD)/r.periodDays*TAU:0);
 const p=orbitalOffset(r.aKm,el,mean),distance=p.length();
 return p.multiplyScalar(satelliteDistance(distance,r.parentRadiusKm,r.parentRenderRadius)/distance).applyQuaternion(r.referenceFrame);
}
export function orbitalPole(r){
 const a=satelliteOffset(r,0,orbitEpoch(),0),b=satelliteOffset(r,0,orbitEpoch(),Math.PI/2);
 return a&&b?a.cross(b).normalize():new THREE.Vector3(0,1,0).applyQuaternion(r.referenceFrame||new THREE.Quaternion());
}
export function artificialOffset(r,days,solarFrame,anomaly=null){
 const phase=anomaly??r.phase-days/r.periodDays*TAU,inc=r.id==='iss'?.9:-.5;
 return new THREE.Vector3(Math.cos(phase)*r.orbit,0,Math.sin(phase)*r.orbit).applyAxisAngle(new THREE.Vector3(1,0,0),inc).applyQuaternion(solarFrame);
}
export function estimatedStellarRadiusSolar(r){
 if(r.radiusApproxSolar>0)return r.radiusApproxSolar;
 const bv=r.ci,temp=r.teff>0?r.teff:Number.isFinite(bv)&&bv>-.4&&bv<2.5?4600*(1/(.92*bv+1.7)+1/(.92*bv+.62)):5772;
 if(Number.isFinite(r.mag)&&r.distanceLy>0){
  const absoluteV=r.mag-5*Math.log10(r.distanceLy/3.261563777/10);
  // Ballesteros B-V temperature plus a monochromatic 550 nm blackbody
  // brightness ratio, solar M_V=4.83. No extinction/atmosphere correction.
  const radius=Math.sqrt(10**(.4*(4.83-absoluteV))*Math.expm1(26159.5776/temp)/Math.expm1(26159.5776/5772));
  r.radiusApproxSolar=THREE.MathUtils.clamp(radius,.005,5000);
  r.sizeEstimateNote='尺寸粗估：V 星等、距离与 B−V / 温度的 550 nm 黑体近似；忽略消光和谱线，不是实测半径'+(!(r.teff>0)&&!(Number.isFinite(bv)&&bv>-.4&&bv<2.5)?'；温度缺测，假定 5772 K':'')+'；极端估算限制在 0.005–5000 R☉';
 }else{r.radiusApproxSolar=1;r.sizeEstimateNote='半径缺测：采用 1 R☉ 外观近似，不能用于真实大小比较';}
 return r.radiusApproxSolar;
}
export function stellarRadius(r){
 const measured=naturalRadius(r);
 if(measured!=null)return measured;
 return (r.radiusSolar>0?r.radiusSolar:estimatedStellarRadiusSolar(r))*SOLAR_RADIUS_EARTH;
}
