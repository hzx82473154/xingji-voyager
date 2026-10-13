// Original program logic: MIT; see LICENSE.
// CONSTELLATIONS below: adapted sky-pattern data, CC BY-SA 4.0.
// Credit: Stellarium Modern skyculture contributors and Voyager adaptation.
// Source: https://github.com/Stellarium/stellarium/tree/d4a1322b6a81bf15dc4ef65c267b2fc846c5f3ca/skycultures/modern
// Licence: https://creativecommons.org/licenses/by-sa/4.0/
// HYG-derived member coordinates retain their separate CC BY-SA 4.0 terms.
// Scale gates have hysteresis to avoid rebuilding the destination dock while
// a user hovers near a boundary. Stellar coordinates remain in catalog units.
import {AU_UNITS} from './physical-scale.js';
export function explorationLevel(radius,focusDistance,galaxyRadius,previous='solar',sky=false){
  if(sky)return 'sky';
  const extent=Math.max(radius,focusDistance);
  if(extent>galaxyRadius*(previous==='galaxies'?2.5:3))return 'galaxies';
  if(extent>galaxyRadius*(previous==='galaxy'?.18:.22))return 'galaxy';
  if(extent>(previous==='stellar'?120:160)*AU_UNITS)return 'stellar';
  return 'solar';
}

export function destinationGroup(level){return level==='sky'?'sky':level==='galaxies'?'galaxies':level==='stellar'||level==='galaxy'?'stellar':'solar';}

export const CONSTELLATIONS=[
 {id:'Ori',cn:'猎户座',en:'Orion',paths:[[27989,25336,25930,26311,26727,27366,24436,25930],[27989,26727]],note:'参宿四、参宿七与腰带三星'},
 {id:'UMa',cn:'北斗七星',en:'Big Dipper',paths:[[67301,65378,62956,59774,54061,53910,58001,59774]],note:'大熊座中的著名星群'},
 {id:'Cas',cn:'仙后座',en:'Cassiopeia',paths:[[8886,6686,4427,3179,746]],note:'五颗亮星组成的 W 形轮廓'},
 {id:'Cyg',cn:'天鹅座',en:'Cygnus',paths:[[102098,100453,98110,95947],[102488,100453,97165]],note:'天津四与北十字轮廓'},
 {id:'Cru',cn:'南十字座',en:'Crux',paths:[[61084,60718],[62434,59747]],note:'南天的十字形亮星组合'},
 {id:'Lyr',cn:'天琴座',en:'Lyra',paths:[[91262,91971,92420,93194,92791,91971]],note:'织女星与小四边形'},
];

// Resolve HIP aliases explicitly; HYG row IDs are not Hipparcos IDs.
export function resolveConstellations(stars){
 const byHip=new Map();for(const r of stars){const hip=/\bHIP (\d+)\b/.exec(r.aliases||'');if(hip)byHip.set(Number(hip[1]),r);}
 return CONSTELLATIONS.map(c=>{
  const paths=c.paths.map(path=>path.map(hip=>byHip.get(hip)));
  if(paths.some(path=>path.some(r=>!r)))throw new Error('Missing constellation HIP mapping: '+c.id);
  const members=[...new Map(paths.flat().map(r=>[r.id,r])).values()];
  return {...c,paths,members};
 });
}
