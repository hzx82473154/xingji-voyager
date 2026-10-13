import * as THREE from 'three';
import {kepler,DEG,TAU} from './astronomy.js';

// JPL SSD mean satellite elements and mean radii, retrieved 2026-10-07.
// Simplified fixed ellipses; no precession or precision ephemeris claim.
// id, Chinese name, parent, radius km, a km, period d, e, i deg, appearance.
const rows=[
 ['phobos','火卫一','mars',11.08,9375,.3187,.015,1.1,'rock'],
 ['deimos','火卫二','mars',6.2,23457,1.2625,0,1.8,'rock'],
 ['io','木卫一','jupiter',1821.49,421800,1.762732,.004,0,'sulfur'],
 ['europa','木卫二','jupiter',1560.8,671100,3.525463,.009,.5,'ice'],
 ['ganymede','木卫三','jupiter',2631.2,1070400,7.155588,.001,.2,'rock'],
 ['callisto','木卫四','jupiter',2410.3,1882700,16.69044,.007,.3,'dark'],
 ['mimas','土卫一','saturn',198.2,186000,.942422,.020,1.6,'ice'],
 ['enceladus','土卫二','saturn',252.1,238400,1.370218,.005,0,'ice'],
 ['tethys','土卫三','saturn',531.1,295000,1.887802,.001,1.1,'ice'],
 ['dione','土卫四','saturn',561.4,377700,2.736916,.002,0,'ice'],
 ['rhea','土卫五','saturn',763.5,527200,4.517503,.001,.3,'ice'],
 ['titan','土卫六','saturn',2574.76,1221900,15.945448,.029,.3,'haze'],
 ['iapetus','土卫八','saturn',734.3,3561700,79.331002,.028,7.6,'dark'],
 ['miranda','天卫五','uranus',235.8,129846,1.413479,.001,4.4,'ice'],
 ['ariel','天卫一','uranus',578.9,190929,2.520379,.001,0,'ice'],
 ['umbriel','天卫二','uranus',584.7,265986,4.144177,.004,.1,'dark'],
 ['titania','天卫三','uranus',788.9,436298,8.705869,.002,.1,'rock'],
 ['oberon','天卫四','uranus',761.4,583511,13.463237,.002,.1,'rock'],
 ['triton','海卫一','neptune',1352.6,354800,5.876994,0,157.3,'ice'],
 ['nereid','海卫二','neptune',170,5513900,360.133039,.751,5.1,'dark']
];
export const MOONS=rows.map(([id,cn,parent,radiusKm,aKm,periodDays,e,incl,appearance],i)=>({
 id,cn,en:id[0].toUpperCase()+id.slice(1),parent,radiusKm,aKm,periodDays,e,incl,appearance,
 r:radiusKm/6371,phase:i*2.39996,orbit:0,
 type:'天然卫星 / NATURAL SATELLITE',diameter:(radiusKm*2).toLocaleString('zh-CN')+' km',
 period:periodDays+' 地球日（平均轨道）',extra:['所属行星',parent],
 desc:'可独立靠近、环绕观察的天然卫星。半径与平均轨道参数来自 JPL；已知尺寸和距离使用统一物理比例，表面为程序绘制示意，按 JPL 历元与平均要素传播，简化轨道不代表精确星历。'
}));
export function moonOffset(m,days,anomaly=null){
 const E=kepler(anomaly??(m.phase+days/m.periodDays*TAU),m.e),x=m.orbit*(Math.cos(E)-m.e),z=-m.orbit*Math.sqrt(1-m.e*m.e)*Math.sin(E);
 return new THREE.Vector3(x,-z*Math.sin(m.incl*DEG),z*Math.cos(m.incl*DEG));
}
