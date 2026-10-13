import profiles from '../catalogs/body-profiles.json' with {type:'json'};
import {planetCategory} from './navigation.js';
const format=n=>Number(n).toLocaleString('zh-CN',{maximumFractionDigits:2});
const alias={'smbh-mw':'Sgr A*','smbh-ngc4486':'M87*','cygnus-x1':'Cygnus X-1','gaia-bh1':'Gaia BH1','gaia-bh2':'Gaia BH2','gaia-bh3':'Gaia BH3','ton-618':'TON 618','ngc:NGC0224':'M31','ngc:NGC0598':'M33','cluster:M45':'M45','cluster:NGC5139':'Omega Centauri'};
function profile(r){return profiles[r.bodyKey]||profiles[r.key]||profiles[alias[r.id]]||profiles[r.name]||profiles[String(r.id||'').replace(/^surface:/,'')];}
export function describeBody(r){
 const p=profile(r);if(p)return {description:p.description,references:p.sources};
 const name=r.cn||r.name,where=r.distanceLy>0?`距太阳系约${format(r.distanceLy)}光年。`:`它在天球上的位置为赤经${format(r.ra)}°、赤纬${format(r.dec)}°，尚未收录可靠距离。`;
 let description;
 if(r.kind==='belt')description=r.id==='belt:main'?'主小行星带位于火星与木星轨道之间，包含大量绕太阳运行的岩质天体。谷神星、灶神星等天体位于其中，带内仍保留着早期太阳系形成时的物质。':'柯伊伯带位于海王星轨道以外，包含许多由冰与岩石构成的小天体。冥王星等矮行星属于这片遥远区域，它也是许多短周期彗星的来源。';
 else if(r.kind==='planet')description=`${name}围绕宿主恒星${r.host}运行，是一颗${planetCategory(r)}。${r.period>0?`公转一周约需${format(r.period)}个地球日。`:''}${r.radiusEarth>0?`半径约为地球的${format(r.radiusEarth)}倍。`:''}`;
 else if(r.kind==='star')description=`${name}是一颗${r.spect?`光谱类型为${r.spect}的`:'目录中收录的'}恒星。${where}${r.teff>0?`有效温度约${format(r.teff)} K。`:''}${r.radiusSolar>0?`半径约为太阳的${format(r.radiusSolar)}倍。`:''}${r.rotationDays>0?`已收录的自转周期约${format(r.rotationDays)}日。`:''}`;
 else if(r.kind==='black-hole'){const type=({stellar:'恒星质量',intermediate:'中等质量',supermassive:'超大质量'}[r.blackHoleClass]||'');description=`${name}${r.status==='confirmed'?`是已确认的${type}黑洞。`:`被目录列为${type}黑洞候选对象，尚不能视为已确认黑洞。`}${where}${r.massSolar>0?`目录给出的质量约为太阳的${format(r.massSolar)}倍。`:r.massUpperLimitSolar>0?`目前只有质量上限，约为${format(r.massUpperLimitSolar)}个太阳质量。`:''}${r.orbitalPeriodDays>0?`所在双星系统的公转周期约为${format(r.orbitalPeriodDays)}日。`:''}`;}
 else if(r.kind==='galaxy'&&r.galaxyType&&r.galaxyType!=='G')description=`${name}是 OpenNGC 收录的${({GPair:'星系对',GTrpl:'三重星系',GGroup:'星系群'})[r.galaxyType]}，并非单独一座星系。成员在天球上相邻；没有成员距离与动力学证据时，不把视觉接近直接当作确定的相互绕转。${where}`;
 else if(r.kind==='galaxy')description=`${name}是一座${/^E/.test(r.morph||'')?'椭圆星系':/^S0/.test(r.morph||'')?'透镜状星系':/^SB/.test(r.morph||'')?'棒旋星系':/^S/.test(r.morph||'')?'螺旋星系':'河外星系'}，由恒星及其周围的星际物质组成。${where}${r.major>0?`在天球上的长轴角尺寸约${format(r.major)}角分。`:''}`;
 else if(r.kind==='cluster')description=`${name}是一座${r.clusterType==='globular'?'恒星向中心密集聚集的球状星团':'由恒星组成的疏散星团'}。${where}${r.major>0?`天球上可见的范围约${format(r.major)}角分。`:''}`;
 else if(r.kind==='nebula')description=`${name}是一片星际气体与尘埃构成的星云。${where}${r.major>0?`它在天球上的范围约为${format(r.major)}角分。`:''}`;
 else if(r.kind==='constellation')description=`${name}是从地球观察天空时辨认的一组恒星图案。${r.note||''}这些恒星处于不同距离，通常并不组成同一个物理系统。`;
 else {const parent=r.parent==='sun'?'太阳':r.parent;description=`${name}是一颗${({moon:'天然卫星',dwarf:'矮行星',asteroid:'小行星',comet:'彗星',tno:'海王星外天体','solar-planet':'行星'}[r.kind]||'太阳系天体')}，围绕${parent}运行。${r.diameterKm>0?`直径约${format(r.diameterKm)}千米。`:''}${r.period>0?`公转周期约${format(r.period)}个地球日。`:''}`;}
 return {description,references:[]};
}
