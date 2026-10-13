// NSSDCA sidereal periods; signed hours encode prograde / retrograde.
// The pole tilt already encodes retrograde motion. Mesh spin uses |period|
// to avoid applying the Venus / Uranus reversal twice.
export const ROTATION = {
  sun:{hours:360/14.37*24,tilt:7.25,label:'差异自转 · 赤道约 25.05 日'},
  mercury:{hours:1407.509,tilt:.034}, venus:{hours:-5832.5,tilt:177.36},
  earth:{hours:23.9344696,tilt:23.44}, mars:{hours:24.6229,tilt:25.19},
  jupiter:{hours:9.925,tilt:3.13}, saturn:{hours:10.656,tilt:26.73},
  uranus:{hours:-17.24,tilt:97.77}, neptune:{hours:16.11,tilt:28.32},
  moon:{hours:27.321661*24,tilt:6.68}
};
// Mean IAU pole directions (ICRS), conventional north. The signed spin period
// distinguishes retrograde rotation. We flip retrograde poles for mesh rotation.
export const POLES={sun:[286.13,63.87],mercury:[281.0103,61.4155],venus:[272.76,67.16],earth:[0,90],mars:[317.68143,52.8865],jupiter:[268.056595,64.495303],saturn:[40.589,83.537],uranus:[257.311,-15.175],neptune:[299.36,43.46],moon:[269.9949,66.5392]};
export const TAU=Math.PI*2, DEG=Math.PI/180, DAY=86400;
export const spinAngle=(id,days,phase=0)=>phase+days*24/Math.abs(ROTATION[id].hours)*TAU;
export const solarRate=latitude=>14.37-2.33*Math.sin(latitude)**2-1.56*Math.sin(latitude)**4;
export class SimulationClock {
 constructor(){this.days=0;this.speed=1;this.paused=false;this.last=null;}
 tick(now,visible=true){if(this.last!==null&&visible&&!this.paused)this.days+=Math.max(0,now-this.last)/1000*this.speed/DAY;this.last=now;return this.days;}
 setSpeed(value,now){this.tick(now);this.speed=value;}
 setPaused(value,now){this.tick(now);this.paused=value;}
 reset(){this.last=null;}
}
// JPL mean elements and secular rates, J2000 ecliptic/equinox, 1800–2050.
// Earth row is the Earth–Moon barycentre; runtime converts AU linearly.
export const ELEMENTS={
 mercury:[[.38709927,.20563593,7.00497902,252.2503235,77.45779628,48.33076593],[.00000037,.00001906,-.00594749,149472.67411175,.16047689,-.12534081]],
 venus:[[.72333566,.00677672,3.39467605,181.9790995,131.60246718,76.67984255],[.0000039,-.00004107,-.0007889,58517.81538729,.00268329,-.27769418]],
 earth:[[1.00000261,.01671123,-.00001531,100.46457166,102.93768193,0],[.00000562,-.00004392,-.01294668,35999.37244981,.32327364,0]],
 mars:[[1.52371034,.0933941,1.84969142,-4.55343205,-23.94362959,49.55953891],[.00001847,.00007882,-.00813131,19140.30268499,.44441088,-.29257343]],
 jupiter:[[5.202887,.04838624,1.30439695,34.39644051,14.72847983,100.47390909],[-.00011607,-.00013253,-.00183714,3034.74612775,.21252668,.20469106]],
 saturn:[[9.53667594,.05386179,2.48599187,49.95424423,92.59887831,113.66242448],[-.0012506,-.00050991,.00193609,1222.49362201,-.41897216,-.28867794]],
 uranus:[[19.18916464,.04725744,.77263783,313.23810451,170.9542763,74.01692503],[-.00196176,-.00004397,-.00242939,428.48202785,.40805281,.04240589]],
 neptune:[[30.06992276,.00859048,1.77004347,-55.12002969,44.96476227,131.78422574],[.00026291,.00005105,.00035372,218.45945325,-.32241464,-.00508664]]
};
export function kepler(mean,e){
 const m=((mean+Math.PI)%TAU+TAU)%TAU-Math.PI;
 let E=e>.8?(m<0?-Math.PI:Math.PI):m,lo=-Math.PI,hi=Math.PI;
 for(let i=0;i<64;i++){
  const f=E-e*Math.sin(E)-m;if(Math.abs(f)<1e-13)break;
  if(f>0)hi=E;else lo=E;
  const next=E-f/(1-e*Math.cos(E));E=next>lo&&next<hi?next:(lo+hi)/2;
 }
 return E+(mean-m);
}
export function planetMeanAnomaly(id,jd){const [base,rates]=ELEMENTS[id],t=(jd-2451545)/36525;return ((base[3]+rates[3]*t)-(base[4]+rates[4]*t))*DEG;}
export function planetPosition(id,jd,renderA,anomalyOverride=null){
 const [base,rates]=ELEMENTS[id],t=(jd-2451545)/36525;
 const [a,e,inc,L,peri,node]=base.map((v,i)=>v+rates[i]*t);
 const M=anomalyOverride??(((L-peri+180)%360+360)%360-180)*DEG;
 const E=kepler(M,e),x=(renderA??a)*(Math.cos(E)-e),y=(renderA??a)*Math.sqrt(1-e*e)*Math.sin(E);
 const w=(peri-node)*DEG,O=node*DEG,I=inc*DEG;
 const X=(Math.cos(w)*Math.cos(O)-Math.sin(w)*Math.sin(O)*Math.cos(I))*x+(-Math.sin(w)*Math.cos(O)-Math.cos(w)*Math.sin(O)*Math.cos(I))*y;
 const Y=(Math.cos(w)*Math.sin(O)+Math.sin(w)*Math.cos(O)*Math.cos(I))*x+(-Math.sin(w)*Math.sin(O)+Math.cos(w)*Math.cos(O)*Math.cos(I))*y;
 const Z=Math.sin(w)*Math.sin(I)*x+Math.cos(w)*Math.sin(I)*y;
 // Right-handed Three.js basis: x=X, y=Z, z=-Y, so prograde poles are +Y.
 return [X,Z,-Y];
}
// ICRS/J2000 equatorial -> Galactic (IAU/Hipparcos rotation matrix).
// render +X points away from Galactic centre; +Y Galactic north, +Z l=90°.
export function skyPosition(raDegrees,decDegrees,distanceLy,unitsPerLy=4.8){
 const ra=raDegrees*DEG,dec=decDegrees*DEG;
 const x=Math.cos(dec)*Math.cos(ra),y=Math.cos(dec)*Math.sin(ra),z=Math.sin(dec);
 const gx=-.0548755604*x-.8734370902*y-.4838350155*z;
 const gy=.4941094279*x-.44482963*y+.7469822445*z;
 const gz=-.867666149*x-.1980763734*y+.4559837762*z;
 // Rounded IAU matrix coefficients must not alter the supplied distance.
 const scale=distanceLy*unitsPerLy/Math.hypot(gx,gy,gz);
 return [-gx*scale,gz*scale,gy*scale];
}
