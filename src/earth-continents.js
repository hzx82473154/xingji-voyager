import {createCountryIndex} from './earth-geography.js';

export const CONTINENTS=[
 {id:'AS',cn:'亚洲',en:'Asia',point:[105,32],desc:'亚洲的地域从北冰洋沿岸延伸到印度洋，东侧面向太平洋。高原、内陆盆地与沿海平原提供了不同的地貌背景；本洲地标包括中国及南亚、东南亚、西亚的精选地点。'},
 {id:'EU',cn:'欧洲',en:'Europe',point:[12,48],desc:'欧洲的海岸十分曲折，内部有阿尔卑斯等山地以及众多历史城市。选择本洲后，可在连贯的地表上浏览建筑、遗址和自然地标。'},
 {id:'AF',cn:'非洲',en:'Africa',point:[20,2],desc:'非洲横跨赤道，北部有撒哈拉，东部有高原，赤道附近有热带雨林。本洲地标把历史遗迹与瀑布、山地和生态景观放在同一地理背景中。'},
 {id:'NA',cn:'北美洲',en:'North America',point:[-100,38],desc:'北美洲从北极附近连接至中美洲和加勒比海地区。山脉、平原及峡谷与城市并存，可继续查看自然保护地和文化建筑的地图位置。'},
 {id:'SA',cn:'南美洲',en:'South America',point:[-60,-18],desc:'南美洲西部沿安第斯山脉展开，亚马孙流域占据大陆的重要部分。这里收录的精选地标涵盖雨林、冰川、盐沼、瀑布和历史遗址。'},
 {id:'OC',cn:'大洋洲',en:'Oceania',point:[135,-25],desc:'大洋洲包括澳大利亚、新西兰和太平洋岛屿。大陆内陆、温带山地与海岛环境各不相同，选择后仍可拖动球面查看相邻地区。'},
 {id:'AN',cn:'南极洲',en:'Antarctica',point:[0,-82],desc:'南极洲以大面积冰盖为主要特征，山地和冰架也构成地表。地图使用历史合成影像，不代表实时冰况；即使没有精选景点，连续地貌仍可浏览。'}
];
const ids={'Asia':'AS','Europe':'EU','Africa':'AF','North America':'NA','South America':'SA','Oceania':'OC','Antarctica':'AN'};
const partIndexes=new WeakMap();
// Picking and highlighted geometry share the same imported land partitions.
export function continentId(country,point){
 if(!country)return null;
 if(country.continentParts){
  let index=partIndexes.get(country);if(!index){index=createCountryIndex(country.continentParts.map(part=>({...part,label:country.label})));partIndexes.set(country,index);}
  return index.at(point.lon,point.lat)?.id||null;
 }
 return ids[country.continent]||(point.lat< -60?'AN':point.lon>110||point.lon< -140?'OC':null);
}
export async function loadContinentIndex(countryIndex){
 const bytes=Uint8Array.from(atob(__VOYAGER_CONTINENTS__),c=>c.charCodeAt(0));
 const records=JSON.parse(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text());
 return createContinentIndex(countryIndex,records);
}
export function createContinentIndex(countryIndex,sourceOutlines=null){
 const records=CONTINENTS.map(c=>({...c,kind:'continent',continent:c.en,region:c.en,label:c.point,polygons:[]}));
 const byId=new Map(records.map(c=>[c.id,c]));
 for(const country of countryIndex.records.filter(c=>!c.parentId)){
  if(country.continentParts){for(const part of country.continentParts)byId.get(part.id).polygons.push(...part.polygons);continue;}
  for(const poly of country.polygons){
    const first=poly[0][0],id=continentId(country,{lon:first[0],lat:first[1]});if(id)byId.get(id).polygons.push(poly);
  }
 }
 if(sourceOutlines)for(const source of sourceOutlines){const record=byId.get(source.id);record.polygons=source.polygons;record.mergedOutline=true;}
 const index=createCountryIndex(records);
 return {...index,at(lon,lat){const country=countryIndex.at(lon,lat);return country?index.byId.get(continentId(country,{lon,lat}))||null:null;}};
}
export function continentInfo(continent,point){
 const p=point||{lon:continent.label[0],lat:continent.label[1]};
 return {cn:continent.cn,en:continent.en,desc:continent.desc,region:continent.cn,continent:continent.cn,facts:[['探索层级','大洲总览'],['选中位置',`${Math.abs(p.lat).toFixed(1)}°${p.lat<0?'S':'N'} · ${Math.abs(p.lon).toFixed(1)}°${p.lon<0?'W':'E'}`]]};
}
