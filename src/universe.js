import {particleMaterial} from './particle-material.js';
import {FrameMeter} from './frame-meter.js';
import {createOrbitPath,updateOrbitPath} from './orbit-path.js';
import {resolvedOnScreen} from './render-policy.js';
import * as THREE from 'three';
import {prepareBlackHoleBackground} from './black-hole-lens.js';
import {resourceUrl,setAssetImage} from './resources.js';
import {startupFailureMessage} from './startup-errors.js';
import {addMeasuredRings} from './rings.js';
import {BackgroundMusic} from './background-music.js';
import {magnitudeStrength} from './display-photometry.js';
import {bindDestinationCarousel} from './destination-carousel.js';
import {initSceneHud,hudOccludes} from './scene-hud.js';
import {initMobileHud} from './mobile-hud.js';
let mobileHud=null;
import {loadContinentIndex,createContinentIndex,continentInfo,continentId} from './earth-continents.js';
import {geographySensitivity,geographyZoomRadius,satelliteContext,bindTouchZoomGuard} from './explorer-guards.js';
import { FreeOrbitControls } from './free-orbit.js';
import {shouldUseSolarPivot,moveOrbitAnchor} from './solar-pivot.js';
import {keepCameraOutside} from './view-safety.js';
import {explorationLevel,destinationGroup} from './exploration.js';
import {buildSky,skyInfo} from './sky.js';
import {MOONS} from './moons.js';
import {prepareSolarData,satelliteOffset,artificialOffset,planetDisplayPosition,orbitalPole} from './celestial-physics.js';
import {sphereModel} from './celestial-models.js';
import {attachObservedSurface,observedGeometry} from './extended-models.js';
import {bindSceneBack} from './scene-back.js';
import {loadCountries,CountryLayer,geographicPoint,countryInfo} from './earth-geography.js';
import {bindPlanetTaps} from './earth-gestures.js';
import {EarthRegions} from './earth-regions.js';
import {geographyData,EarthSurfaceDetail,EarthLandmarkLayer,EarthContinentLabels,countryView} from './earth-detail.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import {ROTATION,POLES,spinAngle,planetPosition,planetMeanAnomaly,SimulationClock,skyPosition,DEG} from './astronomy.js';
import {AU_UNITS,EARTH_RADIUS_KM,MAX_VIEW_DISTANCE,SOLAR_OVERVIEW_DISTANCE,SOLAR_LABEL_LIMIT,distanceText} from './physical-scale.js';
import {LY_UNITS,GALAXY_RADIUS,GALAXY_CENTER,loadCatalog,buildCatalog,getRecord,getPosition,catalogInfo,selectCatalogMarker,updateCatalogView,catalogPick,catalogSummary,backdropRecords,catalogStars,featuredCatalog,updateCatalogModels,modelEntries,modelSummary,relatedCatalog,systemCatalog,solarFamily,navigationCatalog,catalogGlowVisible,configureSolar,loadBelts,surfaceRecord} from './catalog.js';

// Replaced by build.mjs. No runtime fetch, modules or external resource requests.
const ASSETS = __VOYAGER_ASSETS__;
const musicMetadata=__VOYAGER_MUSIC__;
let backgroundMusic=null;
const frameMeter=new FrameMeter();let showPerformance=false,lastPerformanceReadout=-Infinity;
const CONFIG = window.VOYAGER_CONFIG;
const $ = id => document.getElementById(id);
const mobile = __VOYAGER_MOBILE__;
let destinationPager=null,destinationItems=[];
const TAU = Math.PI * 2;
const V = (x=0,y=0,z=0) => new THREE.Vector3(x,y,z);
const data = [
  {id:'sun',cn:'太阳',en:'Sun',type:'恒星 / G-TYPE STAR',r:12,texture:'sun',diameter:'1,392,700 km',period:'约 2.3 亿年（绕银河）',extra:['表面温度','约 5,500 °C'],desc:'太阳系的中心。一颗持续进行核聚变的恒星，将光与能量送往每一颗行星。',color:0xffb85c},
  {id:'mercury',cn:'水星',en:'Mercury',type:'岩质行星 / TERRESTRIAL PLANET',r:.42,orbit:44,periodDays:87.97,phase:2.2,diameter:'4,879 km',period:'87.97 地球日',extra:['平均日距','0.39 AU'],desc:'离太阳最近的行星。古老的陨石坑覆盖表面，薄弱的外逸层无法留住日间热量。'},
  {id:'venus',cn:'金星',en:'Venus',type:'岩质行星 / TERRESTRIAL PLANET',r:.95,orbit:99,periodDays:224.7,phase:.6,diameter:'12,104 km',period:'224.70 地球日',extra:['平均日距','0.72 AU'],desc:'被浓厚云层包裹的邻居。强烈的温室效应，使它成为太阳系表面最热的行星。'},
  {id:'earth',cn:'地球',en:'Earth',type:'岩质行星 / TERRESTRIAL PLANET',r:1,orbit:170,periodDays:365.25,phase:-.55,diameter:'12,742 km',period:'365.25 地球日',extra:['天然卫星','月球'],desc:'我们在宇宙中的家。海洋、陆地与流动的云层，在日光与星夜之间交替。'},
  {id:'mars',cn:'火星',en:'Mars',type:'岩质行星 / TERRESTRIAL PLANET',r:.53,orbit:240,periodDays:686.98,phase:2.85,diameter:'6,779 km',period:'686.98 地球日',extra:['平均日距','1.52 AU'],desc:'一颗带着铁锈色尘埃的世界。广阔峡谷、巨大火山与极地冰帽，保存着它的漫长历史。'},
  {id:'jupiter',cn:'木星',en:'Jupiter',type:'气态巨行星 / GAS GIANT',r:7.2,orbit:405,periodDays:4332.59,phase:-.1,diameter:'139,820 km',period:'11.86 地球年',extra:['标志特征','大红斑'],desc:'太阳系最大的行星。层叠的云带与巨大风暴，勾勒出这颗气态巨行星的流动表面。'},
  {id:'saturn',cn:'土星',en:'Saturn',type:'气态巨行星 / GAS GIANT',r:6,orbit:590,periodDays:10759.22,phase:1.7,diameter:'116,460 km',period:'29.46 地球年',extra:['标志特征','冰粒与岩石构成的环'],desc:'冰粒与岩石组成无数薄环，环绕这颗淡金色的行星。卡西尼缝在环带中留下暗色间隙。'},
  {id:'uranus',cn:'天王星',en:'Uranus',type:'冰巨行星 / ICE GIANT',r:3.1,orbit:805,periodDays:30688.5,phase:3.1,diameter:'50,724 km',period:'84.02 地球年',extra:['自转轴倾角','约 98°'],desc:'几乎侧躺着旋转的冰巨行星。大气中的甲烷吸收红光，让它呈现柔和的蓝绿色。'},
  {id:'neptune',cn:'海王星',en:'Neptune',type:'冰巨行星 / ICE GIANT',r:3,orbit:1100,periodDays:60182,phase:-2.1,diameter:'49,244 km',period:'164.79 地球年',extra:['平均日距','30.07 AU'],desc:'太阳系最外侧的行星。遥远而寒冷的蓝色大气中，仍有速度极高的风与不断演变的风暴。'},
  {id:'moon',cn:'月球',en:'Moon',type:'天然卫星 / NATURAL SATELLITE',r:.272,orbit:8,periodDays:27.32,phase:.4,diameter:'3,474.8 km',period:'27.32 地球日',extra:['距地球','平均 384,400 km'],desc:'地球唯一的天然卫星。深色月海与明亮高地之间，无数陨石坑记录着太阳系的早期岁月。'},
  {id:'iss',cn:'国际空间站',en:'International Space Station',type:'载人航天器 / SPACE STATION',r:.12,orbit:1.22,periodDays:90/1440,phase:1.35,diameter:'约 109 m（跨度）',period:'约 90 分钟',extra:['轨道高度','约 400 km'],desc:'在近地轨道运行的国际实验室。简化结构按约 109 m 跨度换算尺寸，400 km 高度和圆轨道为近似，不是实时轨道。'},
  {id:'satellite',cn:'探索卫星',en:'Voyager Satellite',type:'人造卫星 / DEMONSTRATION SATELLITE',r:.001/EARTH_RADIUS_KM,orbit:1.55,periodDays:120/1440,phase:3.8,diameter:'示意模型',period:'演示轨道',extra:['模型说明','太阳能板与通信天线'],desc:'一颗用于可视化的近地卫星。它与空间站一起运行，展示地球周围的轨道空间。'},
  {id:'solar',cn:'太阳系',en:'Solar System',type:'行星系统 / PLANETARY SYSTEM',r:12,diameter:'约 60 AU（海王星轨道）',period:'约 2.3 亿年（绕银河）',extra:['主要行星','8 颗'],desc:'围绕太阳运行的八大行星，沿各自的轨道缓慢前行。点击行星，继续靠近一个独特的世界。'},
  {id:'galaxy',cn:'银河系',en:'Milky Way',type:'棒旋星系 / BARRED SPIRAL GALAXY',r:1,diameter:'约 100,000 光年',period:'太阳系绕行约 2.3 亿年',extra:['太阳系位置','猎户臂附近 · 距中心约 26,000 光年'],desc:'数千亿颗恒星构成的棒旋星系。太阳系位于猎户臂附近，是这片广阔星海中的一个微小坐标。'},
];
data.find(d=>d.id==='moon').parent='earth';
for(const m of MOONS){const parent=data.find(d=>d.id===m.parent);m.extra=['所属行星',parent.cn];data.push(m);}
for(const d of data)if(ROTATION[d.id])Object.assign(d,ROTATION[d.id]);
// A fixed, stated initial epoch; no automatic online ephemeris requests.
const epochMs=Date.parse(CONFIG.epochUTC||'2026-10-07T00:00:00Z');
const epochJD=epochMs/86400000+2440587.5;
const clock=new SimulationClock();
const solarFrame=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(
 V(...skyPosition(0,0,1,1)),V(...skyPosition(270,66.56072,1,1)),V(...skyPosition(270,-23.43928,1,1)))).normalize();
prepareSolarData(data,solarFrame);
data.find(d=>d.id==='solar').r=data.find(d=>d.id==='sun').r;
Object.assign(data.find(d=>d.id==='iss'),{r:.109/2/EARTH_RADIUS_KM,orbit:(EARTH_RADIUS_KM+400)/EARTH_RADIUS_KM});
const lookup = Object.fromEntries(data.map(d=>[d.id,d]));
const bodies = new Map();
const pickables = [];
const labels = [];
const textures = {};
const sphereGeometry = new THREE.SphereGeometry(1,mobile?96:160,mobile?64:112);
let renderer,scene,root,camera,controls,composer,bloom,starBackdrop,orbitGroup,galaxyGroup;
let surfaceMode='natural',showClouds=true,catalogStats=null;
let simDays=0,speed=1,paused=false,showOrbits=true,showMarkers=true,selected='earth',tracking='earth';
let focus=V(),flight=null,zoomGoal=null,lastTime=0,frameNumber=0,ready=false,toastTimer,visualSeconds=0,hoverPoint=null,hoverDirty=false;
let solarZoomArmed=false,pivotShift=null,skyMode=false,skyLayer=null,exploreLevel='solar',dockGroup=null,infoTarget=null,dockOverride=null;
const distantLabels=[];
let landmarks=null,dockContext=null;
let earthRegions=null,countryIndex=null,continentIndex=null,countryLayer=null,planetTaps=null;
let earthSurfaceDetail=null,earthLandmarkLayer=null,geographyFlight=null,activeLandmark=null,previousGeographyCompact=null;
let earthContinentLabels=null;
const sunWorld = V();
const galaxyCenter=GALAXY_CENTER.clone();
const galaxyRadius=GALAXY_RADIUS;
const galaxyFactor=LY_UNITS/4.8;
const uniformsToUpdate=[];
const earthLighting=[];
const highDetailCache=new Map();
const highDetailPending=new Map();
async function highTexture(key){
 const image=await new THREE.TextureLoader().loadAsync(await resourceUrl(ASSETS[key]));
 const gray=['hi_earth_night','hi_earth_night_16k','hi_earth_specular'].includes(key);
 const cap=Math.min(renderer.capabilities.maxTextureSize,mobile?4096:key==='hi_earth_specular'?4096:key==='hi_earth_night_16k'?16384:8192);
 const canvas=document.createElement('canvas'),scale=Math.min(1,cap/image.image.width);canvas.width=Math.round(image.image.width*scale);canvas.height=Math.round(image.image.height*scale);canvas.getContext('2d').drawImage(image.image,0,0,canvas.width,canvas.height);
 let texture=image;
 if(gray){const red=new Uint8Array(canvas.width*canvas.height);for(let y=0;y<canvas.height;y+=128){const h=Math.min(128,canvas.height-y),rgba=canvas.getContext('2d').getImageData(0,y,canvas.width,h).data;for(let i=0;i<rgba.length/4;i++)red[y*canvas.width+i]=rgba[i*4];}texture=new THREE.DataTexture(red,canvas.width,canvas.height,THREE.RedFormat);texture.generateMipmaps=true;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;texture.flipY=true;image.dispose();}
 else if(scale<1){texture.image=canvas;}
 texture.colorSpace=gray||key==='hi_earth_clouds'?THREE.NoColorSpace:THREE.SRGBColorSpace;texture.anisotropy=Math.min(16,renderer.capabilities.getMaxAnisotropy());texture.needsUpdate=true;
 return texture;
}
let nightDetailPending=null;
async function ensureNightDetail(){
 if(mobile||renderer.capabilities.maxTextureSize<16384||!ASSETS.hi_earth_night_16k)return;
 if(highDetailCache.get('earth')?.hi_earth_night_16k)return;
 if(nightDetailPending)return nightDetailPending;
 nightDetailPending=(async()=>{await ensureHighDetail('earth');const t=await highTexture('hi_earth_night_16k');const cached=highDetailCache.get('earth');if(selected==='earth'&&surfaceMode==='night'&&cached){bodies.get('earth').globe.material.uniforms.night.value=t;cached.hi_earth_night?.dispose();delete cached.hi_earth_night;cached.hi_earth_night_16k=t;}else t.dispose();})().catch(()=>toast('使用当前可用夜灯分辨率')).finally(()=>nightDetailPending=null);return nightDetailPending;
}
function restoreBaseDetail(id){
 const b=bodies.get(id);if(id==='earth'){const u=b.globe.material.uniforms;u.day.value=textures.earth;u.night.value=textures.earth_night;u.ocean.value=textures.earth_specular;b.clouds.material.map=textures.earth_clouds;b.clouds.material.needsUpdate=true;}
 else if(b?.globe){if(id==='sun')b.globe.material.uniforms.map.value=textures.sun;else{b.globe.material.map=textures[id];b.globe.material.needsUpdate=true;}}
}
async function ensureHighDetail(id){
 if(!bodies.has(id))return;
 if(highDetailCache.has(id)){const value=highDetailCache.get(id);highDetailCache.delete(id);highDetailCache.set(id,value);return;}
 if(highDetailPending.has(id))return highDetailPending.get(id);
 const keys=id==='earth'?['hi_earth','hi_earth_night','hi_earth_specular','hi_earth_clouds']:['hi_'+id];
 const task=(async()=>{
  const loaded={};for(const key of keys)if(ASSETS[key])loaded[key]=await highTexture(key);
  if(!Object.keys(loaded).length)return;
  if(ready&&selected!==id){for(const t of Object.values(loaded))t.dispose();return;}
  const b=bodies.get(id);if(id==='earth'){const u=b.globe.material.uniforms;if(loaded.hi_earth)u.day.value=loaded.hi_earth;if(loaded.hi_earth_night)u.night.value=loaded.hi_earth_night;if(loaded.hi_earth_specular)u.ocean.value=loaded.hi_earth_specular;if(loaded.hi_earth_clouds){b.clouds.material.map=loaded.hi_earth_clouds;b.clouds.material.needsUpdate=true;}}
  else if(id==='sun')b.globe.material.uniforms.map.value=loaded['hi_'+id];else{b.globe.material.map=loaded['hi_'+id];b.globe.material.needsUpdate=true;}
  highDetailCache.set(id,loaded);
  while(highDetailCache.size>2){const oldest=highDetailCache.keys().next().value;restoreBaseDetail(oldest);for(const t of Object.values(highDetailCache.get(oldest)))t.dispose();highDetailCache.delete(oldest);}
 })().catch(error=>toast('高清层加载未完成，当前继续使用基础纹理')).finally(()=>highDetailPending.delete(id));
 highDetailPending.set(id,task);return task;
}
const radiusFor = id => getRecord(id)?.modelRadius || bodies.get(id)?.boundRadius || lookup[id]?.r || 1;
const posFor = id => id==='galaxy'?galaxyCenter.clone():id==='solar'?sunWorld.clone():(bodies.get(id)?.position.clone() || getPosition(id) || sunWorld.clone());
const minDistance = () => earthRegions?.detail&&tracking==='earth'?1.12:tracking==='galaxy' || selected==='galaxy' && !tracking ? 500*galaxyFactor : getRecord(tracking||selected)?(['galaxy','cluster','constellation'].includes(getRecord(tracking||selected).kind)?Math.max(.05,(getRecord(tracking||selected).modelExtent||1)*.002):Math.max(.0000001,(getRecord(tracking||selected).modelRadius||20)*1.24)):radiusFor(tracking || selected)*1.24;
const smooth = t => t*t*t*(t*(t*6-15)+10);
function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),2600);}
let startupStage='renderer';
function fail(error){console.error(error);$('loading').style.display='none';$('error').hidden=false;$('errorMessage').textContent=startupFailureMessage(error,startupStage);ready=false;}
window.addEventListener('error',e=>{if(!ready)fail(e.error || e.message);});
$('reload').onclick=()=>location.reload();

async function loadTextures(){
  startupStage='textures';
  const keys=Object.keys(ASSETS).filter(k=>!k.startsWith('thumb_')&&!k.startsWith('hi_')&&!k.startsWith('geo_')&&!k.startsWith('music_')&&!k.startsWith('landmark_photo_')&&!k.startsWith('surface_')&&!['earth_clouds_source','venus_surface','andromeda','triangulum'].includes(k));
  let count=0;
  for(const key of keys){
    const texture=await new THREE.TextureLoader().loadAsync(await resourceUrl(ASSETS[key]));
    const cap=Math.min(renderer.capabilities.maxTextureSize,mobile?4096:8192);
    const im=texture.image;
    if(im.width>cap||im.height>cap){const c=document.createElement('canvas'),scale=cap/Math.max(im.width,im.height);c.width=Math.round(im.width*scale);c.height=Math.round(im.height*scale);c.getContext('2d').drawImage(im,0,0,c.width,c.height);texture.image=c;texture.needsUpdate=true;}
    texture.colorSpace=['earth_clouds','saturn_ring','earth_specular','earth_bump'].includes(key)?THREE.NoColorSpace:THREE.SRGBColorSpace;
    texture.anisotropy=Math.min(16,renderer.capabilities.getMaxAnisotropy());
    textures[key]=texture;count++;
    const n=Math.round(count/keys.length*76);$('loadingPercent').textContent=n+'%';$('loadingProgress').style.width=n+'%';$('loadingText').textContent=`加载高清纹理 · ${count} / ${keys.length}`;
    await new Promise(resolve=>setTimeout(resolve,0));
  }
  startupStage='catalogs';
}

const logVertex=`#include <common>\n#include <logdepthbuf_pars_vertex>\nvarying vec3 vN;varying vec3 vW;varying vec2 vTex;\nvoid main(){vTex=uv;vN=normalize(mat3(modelMatrix)*normal);vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;\n#include <logdepthbuf_vertex>\n}`;
function makeEarth(){
  const mat=new THREE.ShaderMaterial({uniforms:{day:{value:textures.earth},night:{value:textures.earth_night},ocean:{value:textures.earth_specular},bump:{value:textures.earth_bump||textures.earth_specular},nightMode:{value:0},geographyMode:{value:0},nightSurfaceLevel:{value:.20},lightTime:{value:0},twinkleStrength:{value:matchMedia('(prefers-reduced-motion: reduce)').matches?0:.16},lightPos:{value:V()},viewPos:{value:V()}},vertexShader:logVertex,fragmentShader:`
    #include <common>
    #include <logdepthbuf_pars_fragment>
    uniform sampler2D day;uniform sampler2D night;uniform sampler2D ocean;uniform sampler2D bump;uniform float nightMode;uniform float geographyMode;uniform float nightSurfaceLevel;uniform float lightTime;uniform float twinkleStrength;uniform vec3 lightPos;uniform vec3 viewPos;
    varying vec3 vN;varying vec3 vW;varying vec2 vTex;
    void main(){
      #include <logdepthbuf_fragment>
      vec3 n=normalize(vN);vec3 l=normalize(lightPos-vW);vec3 v=normalize(viewPos-vW);
      float ndl=dot(n,l);vec3 albedo=texture2D(day,vTex).rgb;
      float daylight=smoothstep(-.13,.18,ndl);float direct=max(ndl,0.);
      // The unlit terrain remains readable, using the same high-resolution map.
      vec3 lit=albedo*(nightSurfaceLevel+(1.-nightSurfaceLevel)*pow(direct,.64));
      float sea=texture2D(ocean,vTex).r;
      float spec=pow(max(dot(reflect(-l,n),v),0.),38.)*sea*daylight;
      float lights=texture2D(night,vTex).r;
      // Stable geographic phases and gentle pulses only on bright city pixels.
      // This is a visual effect, not a live measurement of changing illumination.
      vec2 cell=floor(vTex*vec2(960.,480.));
      float phase=fract(sin(dot(cell,vec2(127.1,311.7)))*43758.5453)*6.283185;
      float pulse=.65*sin(lightTime*1.45+phase)+.35*sin(lightTime*2.15+phase*1.73);
      float shimmer=1.+twinkleStrength*smoothstep(.16,.65,lights)*pulse;
      vec3 cities=vec3(1.,.73,.40)*pow(max(0.,lights),.82)*mix(pow(1.-daylight,2.),1.,nightMode)*1.8*shimmer;
      vec3 color=mix(lit,albedo*nightSurfaceLevel,nightMode)+cities+vec3(.12,.21,.26)*spec*(1.-nightMode);
      float rim=pow(1.-max(dot(n,v),0.),4.)*daylight;
      color+=vec3(.08,.24,.46)*rim*.38;
      gl_FragColor=vec4(mix(color,albedo*.96,geographyMode),1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`});
  earthLighting.push(mat);
  const globe=new THREE.Mesh(sphereGeometry,mat);globe.rotation.y=2.79;
  const cloudMat=new THREE.MeshPhongMaterial({map:textures.earth_clouds,transparent:true,opacity:.66,depthWrite:false,blending:THREE.NormalBlending,color:0xeaf4ff});
  // Cloud texture has its own alpha; do not reuse RGB as an opaque layer.
  const clouds=new THREE.Mesh(sphereGeometry,cloudMat);clouds.scale.setScalar(1.006);clouds.rotation.copy(globe.rotation);
  const group=new THREE.Group(),axis=new THREE.Group();axis.add(globe,clouds);group.add(axis);addAtmosphere(group,1.014,0x438de0,.24);
  return {group,globe,clouds,axis};
}
function makeSunMaterial(){return new THREE.ShaderMaterial({uniforms:{map:{value:textures.sun},days:{value:0}},vertexShader:logVertex,fragmentShader:`
 #include <common>
 #include <logdepthbuf_pars_fragment>
 uniform sampler2D map;uniform float days;varying vec2 vTex;
 void main(){
 #include <logdepthbuf_fragment>
 // A single bounded phase keeps a fixed photograph coherent over long trips.
 // Differential plasma rotation cannot be represented by shearing one image.
 vec2 uv=vec2(fract(vTex.x-mod(days,25.05)/25.05),vTex.y);vec3 color=texture2D(map,uv).rgb*vec3(1.08,.96,.8);
 gl_FragColor=vec4(color,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});}
function addAtmosphere(group,r,color,intensity=.23){
  const mat=new THREE.ShaderMaterial({uniforms:{glow:{value:new THREE.Color(color)},strength:{value:intensity}},transparent:true,depthWrite:false,side:THREE.BackSide,blending:THREE.AdditiveBlending,
    vertexShader:`#include <common>\n#include <logdepthbuf_pars_vertex>\nvarying vec3 n;varying vec3 v;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;\n#include <logdepthbuf_vertex>\n}`,
    fragmentShader:`#include <common>\n#include <logdepthbuf_pars_fragment>\nuniform vec3 glow;uniform float strength;varying vec3 n;varying vec3 v;void main(){\n#include <logdepthbuf_fragment>\nfloat f=pow(clamp(1.+dot(normalize(n),normalize(v)),0.,1.),4.);gl_FragColor=vec4(glow,f*strength);}`});
  const mesh=new THREE.Mesh(sphereGeometry,mat);mesh.scale.setScalar(r);mesh.renderOrder=2;group.add(mesh);
}
function addRing(group,inner,outer,texture,tilt=.45,opacity=.85){
  const geo=new THREE.RingGeometry(inner,outer,mobile?128:192,1);const uv=geo.attributes.uv,p=geo.attributes.position;
  for(let i=0;i<p.count;i++){const r=Math.hypot(p.getX(i),p.getY(i));uv.setXY(i,(r-inner)/(outer-inner),.5);}
  const mat=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,transparent:true,opacity,depthWrite:false});
  const ring=new THREE.Mesh(geo,mat);ring.rotation.x=-Math.PI/2;group.add(ring);return ring;
}
function glowTexture(){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d'),g=x.createRadialGradient(64,64,2,64,64,64);g.addColorStop(0,'rgba(255,219,159,0.8)');g.addColorStop(.18,'rgba(255,186,99,0.5)');g.addColorStop(.45,'rgba(255,138,42,0.1)');g.addColorStop(1,'rgba(255,138,42,0)');x.fillStyle=g;x.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);}
function buildBodies(){
  startupStage='scene';
  for(const d of data.filter(d=>!['solar','galaxy','iss','satellite'].includes(d.id))){
    let group,globe,clouds,axis;
    if(d.id==='earth'){({group,globe,clouds,axis}=makeEarth());}
    else {
      group=new THREE.Group();axis=new THREE.Group();group.add(axis);
      const mat=d.id==='sun'?makeSunMaterial():d.parent&&d.id!=='moon'?null:new THREE.MeshPhongMaterial({map:textures[d.id],shininess:8,specular:0x0d151c});
      globe=d.parent&&d.id!=='moon'?sphereModel(d.id,d.r,d.appearance):new THREE.Mesh(sphereGeometry,mat);globe.scale.setScalar(d.r);globe.rotation.y=d.id==='moon'?-1.2:.4;axis.add(globe);
      if(typeof addMeasuredRings==='function'&&['jupiter','saturn','uranus','neptune'].includes(d.id))addMeasuredRings(axis,d.id,d.r,mobile,textures.saturn_ring);
      if(d.id==='uranus')addAtmosphere(group,d.r*1.035,0x76c9dc,.11);
      if(d.id==='neptune')addAtmosphere(group,d.r*1.03,0x3276c0,.12);
      if(d.id==='sun'){const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture(),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,opacity:.43}));glow.scale.set(d.r*5.8,d.r*5.8,1);group.add(glow);}
    }
    group.quaternion.copy(solarFrame);
    const [ra,dec]=POLES[d.id]||POLES[d.parent],pole=(d.parent&&d.id!=='moon'&&d.id!=='nereid'?orbitalPole(d):V(...skyPosition(ra,dec,1,1)).multiplyScalar(d.hours<0?-1:1)).applyQuaternion(solarFrame.clone().invert());
    axis.quaternion.setFromUnitVectors(V(0,1,0),pole.normalize());
    group.name=d.id;root.add(group);globe.userData.bodyId=d.id;pickables.push(globe);
    if(!globe.geometry.boundingSphere)globe.geometry.computeBoundingSphere();const boundRadius=(globe.geometry.boundingSphere.radius+globe.geometry.boundingSphere.center.length())*d.r;
    bodies.set(d.id,{...d,boundRadius,group,globe,clouds,axis,position:V()});
  }
  const station=createStation();const stationBounds=new THREE.Box3().setFromObject(station).getSize(V());station.scale.setScalar(.109/EARTH_RADIUS_KM/Math.max(stationBounds.x,stationBounds.y,stationBounds.z));root.add(station);bodies.set('iss',{...lookup.iss,group:station,position:V()});
  const sat=createSatellite(),satBounds=new THREE.Box3().setFromObject(sat).getSize(V());sat.scale.setScalar(.002/EARTH_RADIUS_KM/Math.max(satBounds.x,satBounds.y,satBounds.z));root.add(sat);bodies.set('satellite',{...lookup.satellite,group:sat,position:V()});
  station.traverse(o=>{if(o.isMesh){o.userData.bodyId='iss';pickables.push(o);}});
  sat.traverse(o=>{if(o.isMesh){o.userData.bodyId='satellite';pickables.push(o);}});
  const sunLight=new THREE.PointLight(0xfff4e1,2.4,0,0);sunLight.position.set(0,0,0);root.add(sunLight);
  scene.add(new THREE.AmbientLight(0x91aac4,.09));
}
function box(group,size,pos,material){const m=new THREE.Mesh(new THREE.BoxGeometry(...size),material);m.position.set(...pos);group.add(m);return m;}
function panelMaterial(){const c=document.createElement('canvas');c.width=128;c.height=64;const x=c.getContext('2d');x.fillStyle='#17355d';x.fillRect(0,0,128,64);x.strokeStyle='#5f86a2';x.lineWidth=.9;for(let i=0;i<128;i+=8){x.beginPath();x.moveTo(i,0);x.lineTo(i,64);x.stroke();}for(let i=0;i<64;i+=8){x.beginPath();x.moveTo(0,i);x.lineTo(128,i);x.stroke();}return new THREE.MeshPhongMaterial({map:new THREE.CanvasTexture(c),shininess:65,side:THREE.DoubleSide});}
function createStation(){
  const g=new THREE.Group(),silver=new THREE.MeshPhongMaterial({color:0xd3d9db,shininess:65}),panel=panelMaterial(),dark=new THREE.MeshPhongMaterial({color:0x708087});
  box(g,[.16,.008,.008],[0,0,0],silver);
  for(const x of [-.068,-.045,.045,.068]){box(g,[.018,.001,.067],[x,0,-.042],panel);box(g,[.018,.001,.067],[x,0,.042],panel);box(g,[.001,.002,.12],[x,0,0],silver);}
  const module=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.071,16),silver);module.rotation.x=Math.PI/2;g.add(module);box(g,[.042,.016,.02],[.015,.003,.02],silver);box(g,[.011,.011,.03],[-.018,.003,.039],dark);g.rotation.z=.25;return g;
}
function createSatellite(){
  const g=new THREE.Group(),metal=new THREE.MeshPhongMaterial({color:0xd5bb81,shininess:30});box(g,[.024,.024,.028],[0,0,0],metal);
  const pm=panelMaterial();for(const x of [-.032,.032])box(g,[.033,.001,.025],[x,0,0],pm);
  const dish=new THREE.Mesh(new THREE.SphereGeometry(.016,16,10,0,TAU,0,.6),new THREE.MeshPhongMaterial({color:0xdce2e8,side:THREE.DoubleSide}));dish.position.y=.017;g.add(dish);return g;
}
function buildOrbits(){
 orbitGroup=new THREE.Group();root.add(orbitGroup);
 for(const d of data.filter(d=>d.orbit&&!d.parent&&!['iss','satellite'].includes(d.id))){
  const line=createOrbitPath({curve:(mean,days)=>planetDisplayPosition(d.id,epochJD+days,solarFrame,mean),mean:days=>planetMeanAnomaly(d.id,epochJD+days),color:0x628d9d,opacity:.26});line.userData.bodyId=d.id;orbitGroup.add(line);
 }
 for(const m of data.filter(d=>d.parent)){
  const el=m.orbitalElements||m.displayElements;if(!satelliteOffset(m,0,epochJD,0))continue;
  const line=createOrbitPath({curve:(mean,days)=>satelliteOffset(m,days,epochJD,mean),mean:days=>el.meanAnomalyDeg*DEG+(epochJD+days-el.epochJD)/m.periodDays*TAU,base:()=>bodies.get(m.parent).position});line.name=m.id==='moon'?'lunar':m.id;line.userData.parent=m.parent;orbitGroup.add(line);
 }
 for(const id of ['iss','satellite']){const d=lookup[id],line=createOrbitPath({curve:(mean,days)=>artificialOffset(d,days,solarFrame,mean),mean:days=>d.phase-days/d.periodDays*TAU,base:()=>bodies.get('earth').position,color:0x799197,opacity:.18});line.name=id;line.userData.parent='earth';orbitGroup.add(line);}
}

function rng(seed){let s=seed;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
function buildGalaxy(){
  galaxyGroup=new THREE.Group();galaxyGroup.position.copy(galaxyCenter);root.add(galaxyGroup);
  const n=mobile?14000:36000,p=new Float32Array(n*3),c=new Float32Array(n*3),s=new Float32Array(n),random=rng(902);
  const gaussian=()=>Math.sqrt(-2*Math.log(Math.max(.00001,random())))*Math.cos(TAU*random());
  for(let i=0;i<n;i++){
    let x,y,z,r;const core=i<n*.2;
    if(core){r=Math.pow(random(),1.6)*38000*galaxyFactor;const a=random()*TAU;x=Math.cos(a)*r*1.2;z=Math.sin(a)*r*.55;y=gaussian()*5000*galaxyFactor*(1-r/(50000*galaxyFactor));}
    else {r=(.1+Math.pow(random(),.8)*.9)*galaxyRadius;const arm=Math.floor(random()*4);const a=arm*Math.PI/2+Math.log(r/(20000*galaxyFactor))*1.12+gaussian()*.12;const scatter=gaussian()*r*.055;x=Math.cos(a)*(r+scatter);z=Math.sin(a)*(r+scatter);y=gaussian()*1600*galaxyFactor*(1-r/galaxyRadius*.7);}
    p.set([x,y,z],i*3);const t=random();let col;if(core)col=new THREE.Color().setRGB(.9,.75,.51);else if(t<.07)col=new THREE.Color().setRGB(.68,.43,.41);else col=new THREE.Color().setRGB(.43+t*.35,.57+t*.27,.75+t*.21);c.set([col.r,col.g,col.b],i*3);s[i]=random()*.8+(core?.35:.05);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));g.setAttribute('color',new THREE.BufferAttribute(c,3));g.setAttribute('strength',new THREE.BufferAttribute(s,1));
  const mat=particleMaterial(mobile?2.4:2.25);uniformsToUpdate.push(mat);galaxyGroup.add(new THREE.Points(g,mat));
  const coreGlow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture(),blending:THREE.AdditiveBlending,transparent:true,opacity:.4,depthWrite:false}));coreGlow.scale.set(120000*galaxyFactor,90000*galaxyFactor,1);galaxyGroup.add(coreGlow);
}
function buildBackdrop(){
 const source=backdropRecords(),n=source.length,p=new Float32Array(n*3),c=new Float32Array(n*3),s=new Float32Array(n);
 for(let i=0;i<n;i++){const r=source[i],pos=skyPosition(r.ra,r.dec,1,1800000);p.set(pos,i*3);const v=magnitudeStrength(r.mag),ci=r.ci??.65;c.set([Math.min(1,.85+ci*.15),.9,Math.max(.4,1-ci*.3)],i*3);s[i]=v;}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));g.setAttribute('color',new THREE.BufferAttribute(c,3));g.setAttribute('strength',new THREE.BufferAttribute(s,1));const mat=particleMaterial(1.65,true);uniformsToUpdate.push(mat);starBackdrop=new THREE.Points(g,mat);scene.add(starBackdrop);starBackdrop.frustumCulled=false;
}

function buildLabels(){const e=document.createElement('button');e.id='catalogFocusLabel';e.className='body-label active';e.hidden=true;e.onclick=()=>flyTo(selected);$('labels').append(e);for(const id of [...bodies.keys(),'solar']){const d=lookup[id],el=document.createElement('button');el.className='body-label';el.textContent=id==='solar'?'太阳系 · 猎户臂':d.cn;el.setAttribute('aria-label',`飞向${d.cn}`);el.onclick=()=>flyTo(id);el.addEventListener('wheel',e=>{e.preventDefault();zoom((e.deltaY>0?1.2:.82)**(e.shiftKey?6:1));},{passive:false});el.hidden=true;$('labels').append(el);labels.push({id,el});}}
function addDestination(id,cn,en,icon){destinationItems.push({id,cn,en,icon});}
function createDestination({id,cn,en,icon}){
 const button=document.createElement('button');button.className='destination';button.dataset.destination=id;button.setAttribute('aria-label',`前往${cn}`);
 const art=document.createElement('span');art.className='destination-art';
 if(icon?.image){const image=document.createElement('img');if(typeof setAssetImage==='function')setAssetImage(image,icon.image);else image.src=icon.image;image.alt='';image.draggable=false;art.append(image);}
 else{art.classList.add('nav-orb',icon?.kind||'star');art.style.setProperty('--orb-color',icon?.color||'#bddde8');art.textContent=icon?.kind==='sky'?'✦':'';}
 const name=document.createElement('span');name.className='cn';name.textContent=cn;const sub=document.createElement('span');sub.className='en';sub.textContent=en.toUpperCase();
 button.append(art,name,sub);button.onclick=()=>flyTo(id);button.title=`${cn} · ${en} · 三维探索`;return button;
}
function buildDestinations(group='solar'){
 if(group==='galaxies'||group==='clusters')group='deep';
 const context=satelliteContext(selected,tracking,lookup);
 if(group===dockGroup&&(group==='stellar'?selected:context)===dockContext)return;dockGroup=group;dockContext=group==='stellar'?selected:context;destinationItems=[];
 $('destinationTitle').textContent={solar:'太阳系',stellar:'恒星与行星系统',deep:'深空天体',sky:'星座'}[group];
 for(const button of document.querySelectorAll('[data-dock]')){button.hidden=false;button.classList.toggle('active',button.dataset.dock===group);}
 if(group==='solar'){
  for(const d of data.slice(0,9))addDestination(d.id,d.cn,d.en,{image:ASSETS['thumb_'+d.id]});
  addExtendedSolarDestinations(context);
  for(const d of data.filter(d=>d.parent===context))addDestination(d.id,d.cn,d.en,{image:ASSETS['thumb_'+d.id],kind:'planet',color:d.appearance==='sulfur'?'#e0c66a':'#ccdce0'});
 }else if(group==='sky')for(const item of skyLayer.items)addDestination('constellation:'+item.id,item.cn,item.en,{kind:'sky'});
 else {
  const current=getRecord(selected),system=current?.kind==='planet'?current.host:current?.host||current?.name;
  const list=group==='deep'?[...landmarks.galaxies,...landmarks.clusters,...(landmarks.blackholes||[]),...navigationCatalog('deep')]:[...landmarks.stars,...(current?[current,...systemCatalog(system)]:[]),...navigationCatalog('stellar')];
  if(group==='stellar'&&current&&['star','planet'].includes(current.kind))list.push(current,...systemCatalog(system));
  const seen=new Set();for(const r of list){if(seen.has(r.id))continue;seen.add(r.id);addDestination(r.id,r.cn,r.name,{kind:r.kind,color:r.ci>1?'#ffc290':r.ci<.1?'#b9daff':'#e5e3b3'});}
 }
 destinationPager?.setItems(destinationItems,selected);
}
function buildDistantLabels(){
 for(const r of [...landmarks.stars,...landmarks.galaxies,...landmarks.clusters,...(landmarks.blackholes||[])]){
  const el=document.createElement('button');el.className='body-label distant-label';el.textContent=r.cn;el.hidden=true;el.onclick=()=>flyTo(r.id);el.addEventListener('wheel',e=>{e.preventDefault();zoom((e.deltaY>0?1.2:.82)**(e.shiftKey?6:1));},{passive:false});$('labels').append(el);distantLabels.push({record:r,el});
 }
 for(const item of skyLayer.items){const el=document.createElement('button');el.className='body-label sky-label';el.textContent=item.cn;el.hidden=true;el.onclick=()=>flyTo('constellation:'+item.id);$('labels').append(el);item.el=el;}
}
function openSky(id='Ori'){
 const item=skyLayer.items.find(c=>c.id===id);if(!item)return;
 stopFlight();pivotShift=null;solarZoomArmed=false;skyMode=true;dockOverride=null;selected='sky:'+id;tracking=null;
 controls.orbitUp.set(0,1,0);focus.copy(sunWorld);camera.position.copy(item.anchor).normalize().multiplyScalar(-100);camera.up.copy(controls.orbitUp);controls.minDistance=.03;controls.enabled=true;controls.update();
 lookup[selected]={id:selected,cn:item.cn,en:item.en,r:1};updateInfo(selected);$('trackingText').textContent='星座视图 · 太阳附近的天球方向';updateScaleUI();
}
function updateBodies(){
 for(const [id,b] of bodies){
  if(id==='sun')b.position.set(0,0,0);
  else if(['iss','satellite'].includes(id))b.position.copy(artificialOffset(b,simDays,solarFrame)).add(bodies.get('earth').position);
  else if(b.parent){const offset=satelliteOffset(b,simDays,epochJD);if(offset)b.position.copy(offset).add(bodies.get(b.parent).position);}
  else b.position.copy(planetDisplayPosition(id,epochJD+simDays,solarFrame));
  b.group.position.copy(b.position);
  if(b.globe){if(id==='sun')b.globe.material.uniforms.days.value=simDays%25.05;else if(id==='moon')b.globe.rotation.y=spinAngle(id,simDays,-b.phase);else if(b.parent){if(id!=='nereid')b.globe.rotation.y=simDays/b.periodDays*TAU-b.phase;}else b.globe.rotation.y=spinAngle(id,simDays,id==='earth'?2.79:.4);if(b.globe.material.uniforms?.light){b.globe.material.uniforms.light.value.copy(b.position).negate().applyQuaternion(b.group.quaternion.clone().invert()).applyQuaternion(b.axis.quaternion.clone().invert()).applyQuaternion(b.globe.quaternion.clone().invert()).normalize();}if(b.clouds)b.clouds.rotation.y=b.globe.rotation.y;}
  if(id==='iss'||id==='satellite')b.group.quaternion.copy(solarFrame).multiply(new THREE.Quaternion().setFromAxisAngle(V(0,1,0),b.phase+simDays/b.periodDays*TAU));
 }

}

function updateInfo(id){
 if(earthRegions?.active&&earthRegions.country&&id==='earth'){renderCountry(earthRegions.country,earthRegions.point);return;}
 infoTarget=id;
 const d=lookup[id],ci=id.startsWith('sky:')?skyInfo(skyLayer.items.find(c=>'sky:'+c.id===id)):catalogInfo(id),facts=ci?ci.facts:[['直径',d.diameter],['公转周期',d.period],[d.extra[0],d.extra[1]]];
 if(!ci&&d.hours)facts.push(['恒星自转',d.id==='sun'?d.label:`${Math.abs(d.hours).toLocaleString('zh-CN',{maximumFractionDigits:4})} 小时 · ${d.hours<0?'逆行':'顺行'}`],['轴倾角',`${d.tilt}°`]);
 $('targetName').textContent=d.cn;$('targetName').classList.toggle('long-name',d.cn.length>4);$('targetEnglish').classList.toggle('long-name',d.cn.length>4);$('targetEnglish').textContent=d.en.toUpperCase();$('targetType').textContent=d.type;$('targetDescription').textContent=d.desc;
 $('targetFacts').replaceChildren();for(const [key,value] of facts){const div=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=key;dd.textContent=value;div.append(dt,dd);$('targetFacts').append(div);}
 $('quickFacts').textContent=ci?(ci.facts[0][0]+' '+ci.facts[0][1]):d.hours?`自转 ${Math.abs(d.hours).toLocaleString('zh-CN',{maximumFractionDigits:3})} h · 轴倾角 ${d.tilt}°`:d.extra[0]+' '+d.extra[1];
 $('targetRenderNote').textContent=ci?.dataNote||'已知天体尺寸与距离采用统一物理比例（1 单位 = 6,371 km）。定位点、光晕和亮度增强为观看辅助。未知表面、部分方位 / 相位为示意；JPL 二体近似非精确星历。';if(id==='iss')$('targetRenderNote').textContent+=' 空间站结构简化，跨度约 109 m；400 km 高度、圆轨道与方向为近似，非实时星历。';if(id==='satellite')$('targetRenderNote').textContent+=' 此卫星是演示对象，采用约 2 m 跨度及演示轨道，非真实任务。';if(id==='galaxy')$('targetRenderNote').textContent+=' 银河直径和太阳位置采用约值，星系内部粒子 / 盘厚度 / 旋臂为结构近似，非逐颗观测。';$('targetSource').textContent=ci?ci.source:d.parent&&id!=='moon'?'JPL SSD 平均要素 · 固定参考面二体近似；非实时星历':'自转 / 轴向：NASA NSSDCA · IAU；轨道：JPL 近似要素';updateRelatedObjects(id);
 $('mapQualityControl').hidden=id!=='earth'||!earthRegions?.detail;$('regionBack').hidden=!earthRegions?.active;
 $('earthEntrances').hidden=!['earth','iss','satellite'].includes(id);$('earthEntrances').style.display=['earth','iss','satellite'].includes(id)?'flex':'none';$('earthDetail').hidden=id!=='earth'||!!earthRegions?.active;
 destinationPager?.select(id);$('viewLabel').textContent=`${d.cn} · ${id.startsWith('sky:')?'天球图案':ci?'实测目录':id==='galaxy'?'银河全景':['earth','moon','iss','satellite'].includes(id)?'近地空间':'太阳系'}`;
 $('targetReferences').replaceChildren();for(const source of ci?.references||[]){const a=document.createElement('a');a.href=source.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=source.title+' ↗';$('targetReferences').append(a);}
 if(typeof showSurfaceEvidence==='function')showSurfaceEvidence(id);
}
function earthDirection(lat=20,lon=108){
 const b=bodies.get('earth');if(!b)return V(.1,.7,4.2).normalize();
 const phi=(lon+180)*DEG,latitude=lat*DEG;return V(-Math.cos(phi)*Math.cos(latitude),Math.sin(latitude),Math.sin(phi)*Math.cos(latitude)).applyQuaternion(b.globe.quaternion).applyQuaternion(b.axis.quaternion).applyQuaternion(b.group.quaternion).normalize();
}
function setInfoPanelCompact(compact){
 $('infoPanel').classList.toggle('compact',compact);
 $('infoCollapse').textContent=earthRegions?.detail?(compact?'展开景点⌄':'收起景点⌃'):(compact?'详细数据⌄':'收起数据⌃');
 $('infoCollapse').setAttribute('aria-expanded',String(!compact));
}

function renderCountry(country,point){
 activeLandmark=null;earthLandmarkLayer?.select(null);$('landmarkFigure').hidden=true;$('landmarkBack').hidden=true;
 const info=country.kind==='continent'?continentInfo(country,point):countryInfo(country,point);infoTarget='country:'+country.id;$('targetReferences').replaceChildren();$('targetRenderNote').textContent='历史自然色地貌及地区边界为地理总览示意，非实时测绘。';
 $('targetName').textContent=info.cn;$('targetName').classList.toggle('long-name',info.cn.length>4);$('targetEnglish').textContent=info.en.toUpperCase();$('targetEnglish').classList.add('long-name');
 $('targetType').textContent=earthRegions?.detail?'地球 · 地貌与地标':country.kind==='continent'?'地球 · 大洲':country.parentId?'中国 · 地区':'地球 · 国家与地区';$('targetDescription').textContent=info.desc;$('quickFacts').textContent=info.region+' · '+(paused?'已暂停':'播放中');
 $('targetFacts').replaceChildren();for(const [key,value] of info.facts){const div=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=key;dd.textContent=value;div.append(dt,dd);$('targetFacts').append(div);}
 $('earthEntrances').hidden=true;$('earthEntrances').style.display='none';$('earthDetail').hidden=true;$('relatedObjects').hidden=true;
 $('targetSource').textContent=earthRegions?.detail?'NASA Blue Marble 自然色地貌 · 历史合成影像':'Natural Earth · 1:10M · 地理浏览示意';$('viewLabel').textContent=info.cn+(earthRegions?.detail?' · 球面地貌探索':' · 地球地区浏览');
 $('countrySelect').value=country.id;
 if(earthRegions?.detail)renderLandmarkList(country);
}
function regionModeChanged(){
 const active=earthRegions.active,chosen=!!earthRegions.country,detail=active&&earthRegions.detail;
 if(active)camera.clearViewOffset();else if(typeof resize==='function')resize();
 setInfoPanelCompact($('infoPanel').classList.contains('compact'));
 $('earthRegionsPanel').hidden=!active;$('infoPanel').classList.toggle('geography-active',active);$('infoPanel').classList.toggle('country-selected',active&&chosen);
 $('app').classList.toggle('geography-detail',detail);$('landmarkExplorer').hidden=!detail;$('surfaceDetailStatus').hidden=!detail;
 earthSurfaceDetail?.setActive(detail);earthLandmarkLayer?.setActive(detail);
 $('regionDetailEnter').hidden=!chosen||detail;$('regionDetailBack').hidden=!detail;
 if(!detail){activeLandmark=null;$('landmarkFigure').hidden=true;$('landmarkBack').hidden=true;}
 if(tracking==='earth'){controls.minDistance=detail?1.12:1.24;controls.rotationRate=1;}
 $('regionBack').hidden=!active;$('mapQualityControl').hidden=!detail;
 $('regionStatus').textContent=detail?'仅显示所选大洲地标 · 拖动浏览周边地貌':chosen?`${earthRegions.country.cn} · 再次点击选中大洲进入景点`:'点击大洲查看介绍，再次点击进入景点';
 $('regionResume').hidden=!chosen;$('regionResume').textContent=paused?'继续转动':'暂停转动';$('regionClear').hidden=!chosen;
 $('regionHover').hidden=true;
 if(active){$('earthDetail').hidden=true;$('trackingText').textContent=detail?'球面地貌探索 · 点击地标查看图文':'地球地区浏览 · 拖动 / 缩放仍可用';}
 if(active&&chosen&&!activeLandmark)$('quickFacts').textContent=(earthRegions.country.kind==='continent'?earthRegions.country.cn:countryInfo(earthRegions.country,earthRegions.point).region)+' · '+(paused?'已暂停':'播放中');
}
function populateCountrySelect(){
 const select=$('countrySelect');
 if(continentIndex){for(const c of continentIndex.records){const option=document.createElement('option');option.value=c.id;option.textContent=c.cn+' / '+c.en;select.append(option);}return;}
 const countries=document.createElement('optgroup');countries.label='国家与地区';
 for(const c of countryIndex.records.filter(c=>!c.parentId).sort((a,b)=>a.cn.localeCompare(b.cn,'zh-CN'))){const option=document.createElement('option');option.value=c.id;option.textContent=c.cn;countries.append(option);}
 const regions=document.createElement('optgroup');regions.label='中国 · 地区';
 for(const c of countryIndex.records.filter(c=>c.parentId==='CHN')){const option=document.createElement('option');option.value=c.id;option.textContent=c.cn;regions.append(option);}
 select.append(countries,regions);
}
function renderLandmarkList(country){
 const items=country.kind==='continent'?earthLandmarkLayer?.continentItems(country,countryIndex)||[]:earthLandmarkLayer?.countryItems(country)||[];
 earthLandmarkLayer?.setItems?.(items);
 $('landmarkCount').textContent=items.length?`${items.length} 个精选地标 · 点击名称或球面标记`:'此地区暂未收录地标，可拖动浏览周边地貌';
 $('landmarkSelect').replaceChildren();const blank=document.createElement('option');blank.value='';blank.textContent='选择一处景点';$('landmarkSelect').append(blank);
 $('landmarkList').replaceChildren();
 for(const item of items){
  const option=document.createElement('option');option.value=item.id;option.textContent=item.name+' · '+item.region;$('landmarkSelect').append(option);
  const button=document.createElement('button');button.className='landmark-card';
  const image=document.createElement('img');image.alt=item.name+'实景';image.loading='lazy';image.decoding='async';setAssetImage(image,ASSETS[item.photo.asset]);
  const title=document.createElement('span');title.textContent=item.name;const region=document.createElement('small');region.textContent=item.region;const text=document.createElement('span');text.append(title,region);button.append(image,text);button.onclick=()=>openLandmark(item,true);$('landmarkList').append(button);
 }
}
function aimGeography(point,radius){
 stopFlight();moveOrbitAnchor(camera,focus,posFor('earth'),null);tracking='earth';selected='earth';pivotShift=null;solarZoomArmed=false;root.position.copy(focus).multiplyScalar(-1);controls.enabled=true;controls.minDistance=minDistance();
 const z=V(0,0,1);geographyFlight={elapsed:0,point:{lat:point.lat,lon:point.lon},q0:new THREE.Quaternion().setFromUnitVectors(z,camera.position.clone().normalize()),q1:new THREE.Quaternion().setFromUnitVectors(z,earthDirection(point.lat,point.lon)),startRadius:camera.position.length(),endRadius:Math.max(minDistance(),radius),startUp:controls.orbitUp.clone(),upTurn:new THREE.Quaternion().setFromUnitVectors(controls.orbitUp.clone().normalize(),referenceUp('earth'))};
}
function updateGeographyFlight(dt){
 const f=geographyFlight;if(!f)return;f.elapsed=Math.min(.9,f.elapsed+Math.max(0,dt));const t=smooth(f.elapsed/.9);
 focus.copy(posFor('earth'));root.position.copy(focus).multiplyScalar(-1);
 f.q1.setFromUnitVectors(V(0,0,1),earthDirection(f.point.lat,f.point.lon));
 camera.position.copy(V(0,0,1).applyQuaternion(f.q0.clone().slerp(f.q1,t)).multiplyScalar(Math.exp(THREE.MathUtils.lerp(Math.log(f.startRadius),Math.log(f.endRadius),t))));
 controls.orbitUp.copy(f.startUp).applyQuaternion(new THREE.Quaternion().slerp(f.upTurn,t)).normalize();camera.up.copy(controls.orbitUp);controls.update();if(f.elapsed>=.9)geographyFlight=null;
}
function openCountryDetail(country=earthRegions.country,point){
 if(!earthRegions.active||!country)return;
 planetTaps?.cancel();const view=country.kind==='continent'?{point:earthRegions.index.anchor(country),radius:mobile?3.1:2.05}:countryView(country,countryIndex,camera.fov,camera.aspect);
 earthRegions.openDetail(country,point||view.point);updateBodies();aimGeography(point||view.point,point?Math.min(view.radius,camera.position.length()*.78):view.radius);
 if(mobile)setInfoPanelCompact(true);
 $('surfaceDetailStatus').textContent='正在载入球面地貌';toast('继续拖动查看周边 · 点击地标查看实景照片');
}
function closeCountryDetail(){
 geographyFlight=null;earthRegions.closeDetail();zoomGoal=Math.max(camera.position.length(),1.3);setInfoPanelCompact(false);
}
function regionBack(){
 if(activeLandmark){renderCountry(earthRegions.country,earthRegions.point);setInfoPanelCompact(false);return;}
 if(earthRegions.detail){closeCountryDetail();const c=earthRegions.country;aimGeography(earthRegions.index.anchor(c),mobile?4.6:3.3);return;}
 if(earthRegions.country){earthRegions.country=null;earthRegions.point=null;countryLayer.select(null);$('countrySelect').value='';updateInfo('earth');regionModeChanged();aimGeography({lat:20,lon:108},landing('earth').radius);return;}
 exitEarthRegions();
}
function doublePlanetTap(hit){
 if(hit.id!=='earth')return;
 if(!earthRegions.active){enterEarthRegions(hit.point);return;}
 const country=earthRegions.index.at(hit.point.lon,hit.point.lat);if(country)openCountryDetail(country,hit.point);else aimGeography(hit.point,Math.max(1.12,camera.position.length()*.88));
}
function openLandmark(item,move=false){
 if(!earthRegions.active)return;
 const national=countryIndex.byId.get(item.region==='中国台湾'?'TWN':item.region==='中国香港'?'HKG':item.region==='中国澳门'?'MAC':item.countryId);
 const country=national&&earthRegions.index.byId.get(national.id)||national&&earthRegions.index.byId.get(continentId(national,item));
 if(!country)return;
 if(!earthRegions.detail||earthRegions.country.id!==country.id)earthRegions.openDetail(country,{lat:item.lat,lon:item.lon});else earthRegions.select(country,{lat:item.lat,lon:item.lon});
 activeLandmark=item;earthLandmarkLayer.select(item.id);infoTarget='landmark:'+item.id;
 $('targetName').textContent=item.name;$('targetName').classList.add('long-name');$('targetEnglish').textContent=(item.countryId==='CHN'?item.region:item.englishName)+' · '+item.countryName;$('targetEnglish').classList.add('long-name');$('targetType').textContent='地球地标 · '+item.category;$('targetDescription').textContent=item.summary;$('quickFacts').textContent=item.highlights.join(' · ');
 $('targetFacts').replaceChildren();for(const highlight of item.highlights){const div=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent='看点';dd.textContent=highlight;div.append(dt,dd);$('targetFacts').append(div);}
 setAssetImage($('landmarkImage'),ASSETS[item.photo.asset]);$('landmarkImage').alt=item.name+'真实照片';$('landmarkCaption').textContent=`${item.photo.credit} · ${item.photo.license} · 已缩放压缩`;
 $('landmarkPhotoSource').href=item.photo.sourceUrl;$('landmarkLicense').href=item.photo.licenseUrl;$('landmarkLicense').textContent=item.photo.license;$('landmarkInfoSource').href=item.sourceUrl;$('landmarkFigure').hidden=false;$('landmarkBack').hidden=false;$('landmarkSelect').value=item.id;$('viewLabel').textContent=item.name+' · 球面实地坐标';$('targetSource').textContent=`${Math.abs(item.lat).toFixed(3)}°${item.lat<0?'S':'N'} · ${Math.abs(item.lon).toFixed(3)}°${item.lon<0?'W':'E'}`;
 setInfoPanelCompact(false);$('infoPanel').scrollTop=0;
 if(move)aimGeography({lat:item.lat,lon:item.lon},Math.max(mobile?1.25:1.16,Math.min(1.35,camera.position.length()*.88)));
}
function enterEarthRegions(point){
 if(!ready||earthRegions.active)return;
 planetTaps?.cancel();
 const nearby=!skyMode&&tracking==='earth'&&camera.position.length()<12;
 if(!nearby){flyTo('earth');if(flight){flight.endRadius=mobile?4.6:3.5;if(point){flight.geographicPoint={lat:point.lat,lon:point.lon};flight.q1=new THREE.Quaternion().setFromUnitVectors(V(0,0,1),earthDirection(point.lat,point.lon));}}}
 else {stopFlight();pivotShift=null;solarZoomArmed=false;if(point)aimGeography(point,Math.min(mobile?4.6:3.5,camera.position.length()*.78));else controls.orbitUp.copy(referenceUp('earth'));}
 previousGeographyCompact=$('infoPanel').classList.contains('compact');
 earthRegions.enter();updateInfo('earth');regionModeChanged();toast('大洲浏览已开启 · 点击介绍，再次点击进入景点');
}
function exitEarthRegions(){
 planetTaps?.cancel();geographyFlight=null;earthRegions?.exit();$('landmarkPhotoDialog').close();if(selected==='earth')updateInfo('earth');$('regionHover').hidden=true;
 if(previousGeographyCompact!==null){setInfoPanelCompact(previousGeographyCompact);previousGeographyCompact=null;}
}
function selectCountryById(id){
 const country=earthRegions.index.byId.get(id);if(!earthRegions.active||!country)return;
 if(earthRegions.detail||earthRegions.country?.id===country.id){openCountryDetail(country);return;}
 const point=earthRegions.index.anchor(country);earthRegions.select(country,point);setInfoPanelCompact(false);updateBodies();aimGeography(point,mobile?4.6:3.5);
}
function pickScene(event){
 if(skyMode)return null;
 const rect=renderer.domElement.getBoundingClientRect(),ray=new THREE.Raycaster();
 scene.updateMatrixWorld();camera.updateMatrixWorld();ray.setFromCamera(new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1),camera);
 const hits=ray.intersectObjects(pickables.filter(o=>{for(let n=o;n;n=n.parent)if(!n.visible)return false;return root.visible;}),false);
 if(hits.length){const hit=hits[0],id=hit.object.userData.bodyId,point=id==='earth'?geographicPoint(bodies.get('earth').globe,hit.point):null,country=id==='earth'&&earthRegions?.active?earthRegions.index.at(point.lon,point.lat):null;return {id,doubleEligible:id==='earth',tapKey:id==='earth'&&earthRegions?.active?'continent:'+(country?.id||'ocean'):id,point};}
 const id=catalogPick(ray,camera.position.length());return id?{id}:null;
}
function singlePlanetTap(hit){
 if(hit.id==='earth'&&earthRegions.active){if(tracking!=='earth'){zoomGoal=moveOrbitAnchor(camera,focus,posFor('earth'),zoomGoal);tracking='earth';controls.enabled=true;controls.minDistance=minDistance();}const continent=earthRegions.index.at(hit.point.lon,hit.point.lat);if(continent&&earthRegions.country?.id===continent.id){if(!earthRegions.detail)openCountryDetail(continent,hit.point);else earthRegions.select(continent,hit.point);}else if(continent){earthRegions.closeDetail();earthRegions.select(continent,hit.point);setInfoPanelCompact(false);}else toast('这里是海洋，或小岛超出边界数据精度');return;}
 flyTo(hit.id);
}
function userPause(value){if(earthRegions?.active)earthRegions.manualPause(value);else setPaused(value);}

function referenceUp(id){
 const record=getRecord(id);if(record?.solar&&record.kind==='moon'&&record.referenceFrame)return orbitalPole(record);
 if(id==='solar'||id==='sun'||record?.solar)return V(0,1,0).applyQuaternion(solarFrame).normalize();
 const body=bodies.get(id);if(body?.axis)return V(0,1,0).applyQuaternion(body.axis.quaternion).applyQuaternion(solarFrame).normalize();
 return V(0,1,0);
}
function familyExtent(parent){
 const body=bodies.get(parent);if(body?.familyExtent!==undefined)return body.familyExtent;
 let extent=(body?.r||1)*3;
 for(const d of data)if(d.parent===parent)extent=Math.max(extent,d.orbit*(1+(d.orbitalElements?.e??d.e??0)));
 for(const d of solarFamily(parent))if(!d.nativeId&&d.orbit>0)extent=Math.max(extent,d.orbit*(1+(d.orbitalElements?.e??d.e??0)));
 if(body)body.familyExtent=extent;return extent;
}
function updateRelatedObjects(id){
 const container=$('relatedObjects');container.replaceChildren();
 const parent=lookup[id]?.parent||id,related=data.filter(d=>d.parent===parent).map(d=>({id:d.id,cn:d.cn}));
 if(related.length)related.unshift({id:'family:'+parent,cn:'卫星系统全景'});
 if(lookup[id]?.parent)related.unshift({id:parent,cn:lookup[parent]?.cn||getRecord(parent)?.cn||parent});
 related.push(...relatedCatalog(id));if(typeof surfaceRecord==='function'){const key=id.startsWith('surface:')?id.slice(8):id;for(const r of surfacesForParent(key))related.push({id:r.id.startsWith('surface:')?r.id:'surface:'+r.id,cn:r.cn});}
 if(id.startsWith('constellation:')||id.startsWith('sky:'))related.unshift({id:id.startsWith('sky:')?'constellation:'+id.slice(4):'sky:'+id.slice(14),cn:id.startsWith('sky:')?'查看三维分布':'查看天球图案'});
 if(!related.some(r=>r.id==='family:'+parent)&&solarFamily(parent).some(r=>r.position))related.unshift({id:'family:'+parent,cn:'卫星系统全景'});
 for(const r of [...new Map(related.map(r=>[r.id,r])).values()]){const button=document.createElement('button');button.textContent=r.cn;button.className='related-object';button.classList.toggle('active',r.id===id);button.onclick=()=>flyTo(r.id);container.append(button);}
 container.hidden=!related.length;
}
function landing(id){
  if(getRecord(id)){const r=getRecord(id),volume=['galaxy','cluster','constellation','belt'].includes(r.kind);return {radius:volume?(r.modelExtent||r.modelRadius)*Math.max(2,1.15/(Math.tan(camera.fov*DEG/2)*camera.aspect)):Math.max(.000001,(r.modelRadius||12)*(mobile?7.9:5.5),r.kind==='black-hole'?r.horizonRadius*12*(mobile?4:2.2):0),direction:V(.15,.4,1).normalize()};}
  if(id==='galaxy')return {radius:GALAXY_RADIUS*Math.max(1.7,1.05/(Math.tan(camera.fov*DEG/2)*camera.aspect)),direction:V(.15,1,.56).normalize()};
  if(id==='solar')return {radius:SOLAR_OVERVIEW_DISTANCE,direction:V(.06,.83,1).normalize().applyQuaternion(solarFrame)};
  if(id==='iss'||id==='satellite')return {radius:radiusFor(id)*7,direction:posFor(id).sub(posFor('earth')).normalize().add(V(.07,.14,.09)).normalize()};
  if(id==='earth')return {radius:mobile?6.1:3.65,direction:earthDirection()};
  if(id==='sun')return {radius:radiusFor(id)*(mobile?7.9:5.5),direction:V(.12,.32,1).normalize()};
  if(id==='saturn')return {radius:mobile?105:58,direction:posFor(id).multiplyScalar(-1).normalize().add(V(.18,.10,0)).normalize()};
  const p=posFor(id);let direction=p.clone().multiplyScalar(-1).normalize().add(V(.4,.4,.5)).normalize();if(direction.length()<.5)direction=V(.2,.3,1).normalize();const factor=['jupiter','uranus','neptune'].includes(id)?(mobile?13:id==='jupiter'?6:id==='uranus'?12:8):(mobile?7.9:5);return {radius:radiusFor(id)*factor,direction};
}
function stopFlight(){geographyFlight=null;if(flight){flight=null;tracking=null;controls.minDistance=.00000001;controls.enabled=true;$('trackingText').textContent='自由探索 · 已接管镜头';}zoomGoal=null;}
function zoomSky(factor){camera.fov=THREE.MathUtils.clamp(camera.fov*factor,18,75);camera.updateProjectionMatrix();}
function prepareZoom(factor){const pending=zoomGoal;stopFlight();zoomGoal=pending;if(skyMode){zoomSky(factor);return false;}if(tracking)solarZoomArmed=factor>1;}
function updateReferenceFrame(dt){
  if(pivotShift){
    pivotShift.elapsed=Math.min(.9,pivotShift.elapsed+dt);
    const next=pivotShift.start.clone().lerp(posFor(pivotShift.id),smooth(pivotShift.elapsed/.9));
    zoomGoal=moveOrbitAnchor(camera,focus,next,zoomGoal);
    controls.orbitUp.copy(pivotShift.startUp).applyQuaternion(new THREE.Quaternion().slerp(pivotShift.upTurn,smooth(pivotShift.elapsed/.9))).normalize();
    if(pivotShift.elapsed===.9){tracking=pivotShift.id;pivotShift=null;controls.minDistance=minDistance();$('trackingText').textContent=tracking==='solar'?'围绕太阳旋转 · 公转轨道平面':`围绕${lookup[tracking]?.cn||getRecord(tracking)?.cn||'中心'}旋转`;}
  }else if(tracking)focus.copy(posFor(tracking));
}
function maybeSwitchToSolar(){
 if(!solarZoomArmed||flight||pivotShift||controls.isDragging||skyMode)return;
 let id;const body=bodies.get(tracking);if(body&&tracking!=='sun'&&tracking!=='solar'){const parent=body.parent?bodies.get(body.parent):bodies.get('sun');if(shouldUseSolarPivot(camera,focus,body,parent,innerHeight))id=body.parent||'solar';}
 else if(getRecord(tracking)?.kind==='planet'){const r=getRecord(tracking),parent=getRecord(r.modelHostId);if(parent&&camera.position.length()>Math.max(r.modelRadius*35,r.modelExtent*.65))id=parent.id;}
 else if(getRecord(tracking)?.solar&&getRecord(tracking).kind!=='belt'){const r=getRecord(tracking),parentId=r.parent==='sun'?'solar':r.parent,p=bodies.get(r.parent)||getRecord(r.parent.startsWith('surface:')?r.parent:'surface:'+r.parent);if(p&&shouldUseSolarPivot(camera,focus,{position:r.position,r:r.modelRadius,displayRadius:r.modelRadius},{position:p.position,r:p.r||p.modelRadius||12,displayRadius:p.displayRadius||p.modelRadius||12},innerHeight))id=parentId;}
 else if(tracking==='solar'&&camera.position.length()>GALAXY_RADIUS*.16)id='galaxy';
 if(!id)return;
 if(earthRegions?.active)exitEarthRegions();
 if(!lookup[id]&&getRecord(id)){lookup[id]={id,...catalogInfo(id),r:getRecord(id).modelRadius||20};}
 pivotShift={id,start:focus.clone(),elapsed:0,startUp:controls.orbitUp.clone(),upTurn:new THREE.Quaternion().setFromUnitVectors(controls.orbitUp,referenceUp(id))};tracking=null;
 $('trackingText').textContent=id==='solar'?'旋转中心与参考平面正在移向太阳系':`旋转中心正在移向${lookup[id]?.cn||'银河中心'}`;
}
function flyTo(id){
  if(!ready)return;
 if(id.startsWith('belt:')&&typeof loadBelts==='function'&&!window.VOYAGER_BELTS_READY){toast('正在解压小天体轨道目录…');loadBelts().then(()=>{window.VOYAGER_BELTS_READY=true;flyTo(id);}).catch(()=>toast('小天体目录未载入，可重试'));return;}
 planetTaps?.cancel();
 if(earthRegions?.active)exitEarthRegions();
  if(id.startsWith('family:')){const parent=id.slice(7);flyTo(parent);if(flight){flight.endRadius=Math.max(radiusFor(parent)*8,...data.filter(d=>d.parent===parent).concat(solarFamily(parent).filter(d=>!d.nativeId&&d.orbit>0)).map(d=>d.orbit*(1+(d.orbitalElements?.e??d.e??0))*Math.max(3,1.15/(Math.tan(camera.fov*DEG/2)*camera.aspect))));flight.q1=new THREE.Quaternion().setFromUnitVectors(V(0,0,1),V(.12,.7,1).normalize().applyQuaternion(bodies.get(parent)?.axis?.quaternion||new THREE.Quaternion()).applyQuaternion(solarFrame));}return;}
  if(id==='sky'){flyTo('constellation:Ori');return;}if(id.startsWith('sky:')){openSky(id.slice(4));return;}
  const record=getRecord(id);if(record){const info=catalogInfo(id);lookup[id]={id,...info,parent:record.solar?record.parent:undefined,r:record.kind==='galaxy'?5000:20};selected=id;updateInfo(id);if(!record.position){toast(record.solar?'该对象缺少轨道方位或相位，可查看资料，暂不虚构位置':'该对象缺少可靠距离，可查看资料，无法确定三维位置');$('trackingText').textContent='定位数据不完整 · 镜头保持原位置';return;}selectCatalogMarker(id,ASSETS);updateCatalogModels(simDays,visualSeconds);lookup[id].r=record.modelRadius||20;}
  if(!lookup[id])return;
  if(skyMode){camera.fov=42;camera.updateProjectionMatrix();}skyMode=false;dockOverride=null;
  selected=id;updateInfo(id);ensureHighDetail(id);ensureObservedNative(id);zoomGoal=null;pivotShift=null;solarZoomArmed=false;
  const end=landing(id),r0=camera.position.length(),travel=focus.distanceTo(posFor(id));
  const dir0=camera.position.clone().normalize(),axis=V(0,0,1);
  flight={id,start:performance.now(),elapsed:0,last:performance.now(),duration:Math.min(10000,2200+Math.log10(1+travel/radiusFor(id))*670),startFocus:focus.clone(),startTracking:getRecord(tracking)?null:tracking,startOffset:tracking?focus.clone().sub(posFor(tracking)):V(),startRadius:r0,endRadius:end.radius,peak:Math.max(r0,end.radius,travel*.74),startDirection:dir0.clone(),startUp:controls.orbitUp.clone(),upTurn:new THREE.Quaternion().setFromUnitVectors(controls.orbitUp,referenceUp(id)),q0:new THREE.Quaternion().setFromUnitVectors(axis,dir0),q1:new THREE.Quaternion().setFromUnitVectors(axis,end.direction)};
  tracking=null;controls.enabled=false;$('trackingText').textContent=`正在飞向${lookup[id].cn}`;
  document.querySelectorAll('.body-label').forEach(e=>e.classList.remove('active'));
}
function updateFlight(now){
  const f=flight;if(!f)return;if(f.geographicPoint)f.q1.setFromUnitVectors(V(0,0,1),earthDirection(f.geographicPoint.lat,f.geographicPoint.lon));f.elapsed+=Math.min(Math.max(0,now-f.last),65);f.last=now;const t=THREE.MathUtils.clamp(f.elapsed/f.duration,0,1),ease=smooth(t);
  // A lift/cruise/approach profile in log space prevents abrupt large-scale travel.
  const lift=.32,approach=.68;
  const radius=t<lift?Math.exp(THREE.MathUtils.lerp(Math.log(f.startRadius),Math.log(f.peak),smooth(t/lift))):t<approach?f.peak:Math.exp(THREE.MathUtils.lerp(Math.log(f.peak),Math.log(f.endRadius),smooth((t-approach)/(1-approach))));
  const dir=V(0,0,1).applyQuaternion(f.q0.clone().slerp(f.q1,ease));
  controls.orbitUp.copy(f.startUp).applyQuaternion(new THREE.Quaternion().slerp(f.upTurn,ease)).normalize();camera.up.copy(controls.orbitUp);
  const startFocus=f.startTracking?posFor(f.startTracking).add(f.startOffset):f.startFocus;
  const pan=smooth(THREE.MathUtils.clamp((t-lift)/(approach-lift),0,1));
  focus.copy(startFocus).lerp(posFor(f.id),pan);camera.position.copy(dir.multiplyScalar(radius));
  if(t===1){tracking=f.id;flight=null;controls.enabled=true;controls.minDistance=minDistance();controls.update();$('trackingText').textContent=`正在追踪${lookup[tracking].cn}`;}
}
function updateBodyDetail(){
  // Far navigation points supply visibility without inflating physical shells
  // or moving ring surfaces through the satellite system.
  for(const b of bodies.values()){b.group.scale.setScalar(1);b.displayRadius=b.boundRadius||b.r;}
}
function cameraSafety(){
  keepCameraOutside(camera,focus,bodies.values(),!!earthRegions?.detail);
}
function zoom(factor){if(prepareZoom(factor)===false)return;const base=zoomGoal??camera.position.length(),radius=earthRegions?.detail&&tracking==='earth'?geographyZoomRadius(base,factor,minDistance()):base*factor;zoomGoal=THREE.MathUtils.clamp(radius,minDistance(),MAX_VIEW_DISTANCE);}
function updateLabels(){
  const abs=camera.position.clone().add(focus),dir=V();const h=innerHeight,w=innerWidth,r=camera.position.length();
  const record=getRecord(selected),catalogLabel=$('catalogFocusLabel');
  catalogLabel.hidden=true;if(showMarkers&&record?.position){const p=posFor(selected).sub(focus).project(camera);if(p.z>-1&&p.z<1){const x=(p.x*.5+.5)*w,y=(-p.y*.5+.5)*h-23;if(x>8&&x<w-8&&y>112&&y<h-215){catalogLabel.textContent=record.cn;catalogLabel.style.left=x+'px';catalogLabel.style.top=y+'px';catalogLabel.hidden=false;}}}
  const occupied=[];
  for(const label of labels){
    const {id,el}=label,b=bodies.get(id);let visible=showMarkers;
    if(!b?.group.visible&&id!=='solar')visible=false;
    if(id==='solar')visible=visible&&r>120*AU_UNITS;
    else if(id==='iss'||id==='satellite')visible=visible&&r<7&&!(selected==='earth'&&surfaceMode==='night');
    else if(b.parent){const extent=familyExtent(b.parent);visible=visible&&r<extent*8&&focus.distanceTo(bodies.get(b.parent).position)<extent*3;}
    else visible=visible&&r<SOLAR_LABEL_LIMIT&&(r>10 || id===selected);
    if(!visible){el.hidden=true;continue;}
    const p=id==='solar'?sunWorld.clone():b.position.clone();const delta=p.clone().sub(abs),distance=delta.length();dir.copy(delta).normalize();
    // Occlusion is evaluated in double-precision logical coordinates.
    for(const other of bodies.values()){
      if(other.id===id || (id==='solar'&&other.id==='sun'))continue;
      const v=other.position.clone().sub(abs),along=v.dot(dir);
      if(along>0&&along<distance-other.r*.4&&v.lengthSq()-along*along<Math.pow(other.displayRadius||other.r,2)*.98){visible=false;break;}
    }
    if(visible){const local=p.sub(focus);if(id!=='solar')local.y+=(b.displayRadius||b.r)*1.2;local.project(camera);const x=(local.x*.5+.5)*w,y=(-local.y*.5+.5)*h-12;visible=local.z<1&&local.z>-1&&x>8&&x<w-8&&y>172&&y<h-88;
      if(visible&&hudOccludes(document,x,y))visible=false;
      if(visible&&occupied.some(o=>Math.abs(o.x-x)<67&&Math.abs(o.y-y)<24))visible=false;
      if(visible){el.style.left=`${x}px`;el.style.top=`${y}px`;occupied.push({x,y});el.classList.toggle('active',id===selected);}
    }
    el.hidden=!visible;
  }
}
function updateDistantLabels(){
 const w=innerWidth,h=innerHeight,occupied=[];
 const project=(position,el)=>{
  const p=position.project(camera),x=(p.x*.5+.5)*w,y=(-p.y*.5+.5)*h;
  let visible=showMarkers&&p.z>-1&&p.z<1&&x>20&&x<w-110&&y>125&&y<h-230;
  if(visible&&hudOccludes(document,x,y))visible=false;
  if(occupied.some(o=>Math.abs(o.x-x)<100&&Math.abs(o.y-y)<30))visible=false;
  el.hidden=!visible;if(visible){el.style.left=x+'px';el.style.top=y+'px';occupied.push({x,y});}
 };
 for(const {record,el} of distantLabels){el.hidden=true;if(skyMode||record.id===selected||exploreLevel==='solar'||record.kind==='galaxy'&&exploreLevel!=='galaxies')continue;project(record.position.clone().sub(focus),el);}
 for(const item of skyLayer.items){item.el.hidden=true;item.el.classList.toggle('active',selected==='sky:'+item.id);if(skyMode)project(item.anchor.clone().add(camera.position),item.el);}
 if(skyMode){for(const label of labels)label.el.hidden=true;$('catalogFocusLabel').hidden=true;}
}

function setPaused(value){clock.setPaused(value,performance.now());paused=value;simDays=clock.days;$('pause').setAttribute('aria-label',paused?'继续':'暂停');$('pauseIcon').innerHTML=paused?'<path d="m7 4 8 6-8 6Z"/>':'<path d="M7 5v10m6-10v10"/>';}
async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else toast('此浏览器暂不支持网页全屏');}catch{toast('全屏未能开启，请使用浏览器的全屏功能');}}
function bindUI(){
 $('surfacePhotoToggle').onclick=()=>{$('surfaceEvidence').classList.toggle('expanded');};

  const safeUrl=(url,fallback)=>{try{const u=new URL(url);return ['https:','http:'].includes(u.protocol)?u.href:fallback;}catch{return fallback;}};
  setInfoPanelCompact(mobile);$('infoCollapse').onclick=()=>setInfoPanelCompact(!$('infoPanel').classList.contains('compact'));
  $('github').href=safeUrl(CONFIG.githubUrl,'https://github.com/');
  if($('github').href==='https://github.com/')$('github').title='GitHub · 尚未配置本项目仓库地址';
  $('brandHome').onclick=e=>{e.preventDefault();flyTo('earth');};
  document.querySelectorAll('[data-scale]').forEach(b=>b.onclick=()=>flyTo(b.dataset.scale));
  document.querySelectorAll('[data-dock]').forEach(b=>b.onclick=()=>{if(b.dataset.dock==='sky'){dockOverride='sky';buildDestinations('sky');}else{dockOverride=b.dataset.dock;buildDestinations(dockOverride);}});
  document.querySelectorAll('#earthEntrances [data-destination]').forEach(b=>b.onclick=()=>flyTo(b.dataset.destination));
  $('zoomIn').onclick=e=>zoom(.72**(e.shiftKey?6:1));$('zoomOut').onclick=e=>zoom(1.4**(e.shiftKey?6:1));$('pause').onclick=()=>userPause(!paused);
  document.querySelectorAll('[data-speed]').forEach(b=>b.onclick=()=>{clock.setSpeed(Number(b.dataset.speed),performance.now());speed=clock.speed;simDays=clock.days;$('fastSpeed').value='';document.querySelectorAll('[data-speed]').forEach(e=>e.classList.toggle('active',e===b));});
  $('fastSpeed').onchange=e=>{if(!e.target.value)return;clock.setSpeed(Number(e.target.value),performance.now());speed=clock.speed;simDays=clock.days;document.querySelectorAll('[data-speed]').forEach(b=>b.classList.remove('active'));};
  $('orbits').onclick=()=>{showOrbits=!showOrbits;$('orbits').classList.toggle('active',showOrbits);$('orbits').setAttribute('aria-pressed',String(showOrbits));};
  $('markers').onclick=()=>{showMarkers=!showMarkers;$('markers').classList.toggle('active',showMarkers);$('markers').setAttribute('aria-pressed',String(showMarkers));updateLabels();updateDistantLabels();};
  $('fullscreen').onclick=fullscreen;$('help').onclick=()=>{$('helpDialog').showModal();};$('closeHelp').onclick=()=>{$('helpDialog').close();};
  $('helpDialog').addEventListener('click',e=>{if(e.target===$('helpDialog')){const r=$('helpDialog').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('helpDialog').close();}});
  const toggleUI=()=>{const hidden=$('app').classList.toggle('ui-hidden');document.querySelectorAll('.ui').forEach(element=>{element.inert=hidden;});};$('restoreUI').onclick=toggleUI;
  window.addEventListener('keydown',e=>{
    if(e.defaultPrevented)return;
    if(e.code==='F3'){e.preventDefault();showPerformance=!showPerformance;$('performanceReadout').hidden=!showPerformance;lastPerformanceReadout=-Infinity;return;}
    if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;if(($('helpDialog').open||$('catalogDialog').open||$('landmarkPhotoDialog').open)&&e.key!=='Escape')return;
    if(e.key==='Escape'&&earthRegions.active&&!$('helpDialog').open&&!$('catalogDialog').open&&!$('landmarkPhotoDialog').open){regionBack();return;}
    if(e.code==='Space'){e.preventDefault();userPause(!paused);}else if(e.key==='+'||e.key==='='){e.preventDefault();zoom(.78);}else if(e.key==='-'){e.preventDefault();zoom(1.28);}else if(e.key.toLowerCase()==='h')flyTo('earth');else if(e.key.toLowerCase()==='f')fullscreen();else if(e.key.toLowerCase()==='i')toggleUI();else if(e.key==='?')$('helpDialog').showModal();
  });
  document.querySelectorAll('[data-earth-mode]').forEach(b=>b.onclick=()=>{surfaceMode=b.dataset.earthMode;if(surfaceMode==='night')ensureNightDetail();if(mobile&&surfaceMode==='night')setInfoPanelCompact(true);document.querySelectorAll('[data-earth-mode]').forEach(e=>e.classList.toggle('active',e===b));});
  $('cloudLayer').onclick=()=>{showClouds=!showClouds;$('cloudLayer').classList.toggle('active',showClouds);};
  document.querySelectorAll('[data-region]').forEach(b=>b.onclick=()=>{flyTo('earth');const [lat,lon]=b.dataset.region.split(',').map(Number);flight.endRadius=mobile?2.8:2.15;flight.q1=new THREE.Quaternion().setFromUnitVectors(V(0,0,1),earthDirection(lat,lon));});
  $('earthRegionsEnter').onclick=()=>enterEarthRegions();$('regionExit').onclick=exitEarthRegions;$('regionResume').onclick=()=>userPause(!paused);
  $('regionClear').onclick=()=>{geographyFlight=null;earthRegions.exit();earthRegions.enter();$('countrySelect').value='';updateInfo('earth');regionModeChanged();};
  $('regionDetailEnter').onclick=()=>openCountryDetail();$('regionDetailBack').onclick=closeCountryDetail;
  $('landmarkBack').onclick=()=>renderCountry(earthRegions.country,earthRegions.point);
  $('landmarkSelect').onchange=e=>{const item=geographyData.landmarks.find(item=>item.id===e.target.value);if(item)openLandmark(item,true);};
  $('landmarkExpand').onclick=()=>{if(!activeLandmark)return;setAssetImage($('landmarkLargeImage'),ASSETS[activeLandmark.photo.asset]);$('landmarkLargeImage').alt=activeLandmark.name+'实景';$('landmarkLargeCaption').textContent=activeLandmark.name+' · '+activeLandmark.photo.credit+' · '+activeLandmark.photo.license;$('landmarkPhotoDialog').showModal();};
  $('closeLandmarkPhoto').onclick=()=>$('landmarkPhotoDialog').close();
  $('countrySelect').onchange=e=>selectCountryById(e.target.value);
  $('regionBack').onclick=regionBack;$('mapQuality').value=mobile?'standard':'fine';
  $('mapQuality').onchange=e=>{earthSurfaceDetail.setQuality(e.target.value);toast(e.target.value==='fine'?'精细地貌已开启 · 纹理内存占用增加':'标准地貌已开启 · 释放精细分块');};
  bindSceneBack(renderer.domElement,{back:regionBack,canGoBack:()=>earthRegions.active});
  bindTouchZoomGuard($('app'));
  const canvas=renderer.domElement;canvas.addEventListener('pointerdown',stopFlight,{capture:true});canvas.addEventListener('wheel',()=>{const pending=zoomGoal;stopFlight();zoomGoal=pending;},{capture:true,passive:true});
  window.addEventListener('voyager-resource-error',e=>toast(e.detail));
  planetTaps=bindPlanetTaps(canvas,{pick:pickScene,single:singlePlanetTap,double:doublePlanetTap});
  canvas.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'){hoverPoint={clientX:e.clientX,clientY:e.clientY};hoverDirty=true;}});
  canvas.addEventListener('pointerleave',()=>{hoverPoint=null;canvas.classList.remove('over-body');$('regionHover').hidden=true;});
  addEventListener('resize',resize);document.addEventListener('visibilitychange',()=>{lastTime=0;clock.reset();frameMeter.reset();});
  initSceneHud(document);if(mobile)mobileHud=initMobileHud(document);destinationPager=bindDestinationCarousel(document,{mobile,render:createDestination});destinationPager.setItems(destinationItems,selected);
}
function resize(){
  if(!renderer)return;const w=innerWidth,h=innerHeight;camera.aspect=w/h;camera.clearViewOffset();camera.updateProjectionMatrix();
  const ratio=Math.min(devicePixelRatio||1,mobile?1.4:CONFIG.maxPixelRatio||1.75);renderer.setPixelRatio(ratio);renderer.setSize(w,h);composer.setPixelRatio(ratio);composer.setSize(w,h);bloom.setSize(Math.floor(w*ratio*.85),Math.floor(h*ratio*.85));for(const mat of uniformsToUpdate)mat.uniforms.pixelRatio.value=ratio;
 countryLayer?.resize(w,h);
}
function updateScaleUI(){
 const r=camera.position.length(),oldLevel=exploreLevel;
 const scaledRadius=tracking==='galaxy'||getRecord(selected)?.kind==='galaxy'?r*Math.min(1,camera.aspect):r;
 exploreLevel=explorationLevel(scaledRadius,focus.length(),GALAXY_RADIUS,exploreLevel,skyMode);
 if(oldLevel!==exploreLevel)dockOverride=null;
 const selectedView=tracking===selected||flight?.id===selected,recordKind=getRecord(selected)?.kind;const group=dockOverride||(selectedView&&recordKind==='constellation'?'sky':selectedView&&recordKind==='cluster'?'clusters':destinationGroup(exploreLevel));buildDestinations(group);
 const context=skyMode?selected:getRecord(selected)&&(tracking===selected||flight)?selected:exploreLevel==='solar'?(tracking==='solar'?'solar':selected):'galaxy';
 if(!earthRegions?.active&&context!==infoTarget&&lookup[context])updateInfo(context);
 const near=exploreLevel==='solar'&&r<30&&focus.distanceTo(posFor('earth'))<40;
 const scale=skyMode||selectedView&&recordKind==='constellation'?'sky':exploreLevel==='solar'?(near?'earth':'solar'):'galaxy';
 document.querySelectorAll('[data-scale]').forEach(e=>e.classList.toggle('active',e.dataset.scale===scale));
 $('orbitsCaption').textContent=skyMode||recordKind==='constellation'?'连线':'轨道';
 $('infoPanel').classList.toggle('contrast',['iss','satellite'].includes(selected)||r<radiusFor(selected)*3);
 $('meterIndicator').style.top=(1-THREE.MathUtils.clamp((Math.log10(Math.max(.00001,r))+5)/25,0,1))*100+'%';
 let text;if(skyMode)text='星座与亮星 · J2000 天球方向';else if(getRecord(selected)&&tracking===selected)text=['galaxy','cluster','constellation'].includes(getRecord(selected).kind)?'三维空间结构 · 拖动环绕 / 滚轮靠近':'三维天体近景 · 表面示意';else if(exploreLevel==='stellar')text='恒星邻域 · 三维天体';else if(exploreLevel==='galaxy'||exploreLevel==='galaxies')text='银河 / 河外星系 · 结构与观测目录';else text=`视距 ${distanceText(r)} · 真实比例`;if(!skyMode)text=`${distanceText(r)} · ${exploreLevel==='solar'?'真实比例':'目录尺度'}`;
 $('distanceLabel').textContent=text;
 if(oldLevel!==exploreLevel&&infoTarget==='galaxy')updateInfo('galaxy');
 if(exploreLevel==='stellar'&&infoTarget==='galaxy'){$('viewLabel').textContent='银河系 · 恒星邻域';$('targetDescription').textContent=lookup.galaxy.desc;}
}
function updateSatelliteVisibility(r){
 const parent=satelliteContext(selected,tracking,lookup),nearEarth=earthRegions.active||tracking==='earth'&&r<7;
 for(const body of bodies.values())if(body.parent)body.group.visible=!skyMode&&body.parent===parent;
 for(const id of ['iss','satellite'])bodies.get(id).group.visible=selected===id||(!nearEarth&&selected==='earth'&&surfaceMode!=='night');
 for(const line of orbitGroup.children){const p=line.userData.parent||(['lunar','iss','satellite'].includes(line.name)?'earth':null);if(p)line.visible=line.visible&&p===parent;if(['iss','satellite'].includes(line.name)&&nearEarth)line.visible=false;}
}
function animate(now){
  if(!ready)return;requestAnimationFrame(animate);if(document.hidden)frameMeter.reset();frameMeter.begin(now,performance.now());renderer.info.reset();const dt=lastTime?Math.min((now-lastTime)/1000,.06):0;lastTime=now;
  if(!paused&&!document.hidden)simDays=clock.tick(now,!document.hidden);else {clock.tick(now,!document.hidden);simDays=clock.days;}updateBodies();if(!skyMode)updateCatalogModels(simDays,visualSeconds);
  frameMeter.mark('simulation',performance.now());
  if(!paused&&!document.hidden)visualSeconds+=dt;
  if(geographyFlight)updateGeographyFlight(dt);
  else if(flight)updateFlight(now);else {updateReferenceFrame(dt);if(zoomGoal!==null){const r=camera.position.length(),lr=THREE.MathUtils.lerp(Math.log(r),Math.log(zoomGoal),1-Math.exp(-dt*9));camera.position.setLength(Math.exp(lr));if(Math.abs(Math.log(r/zoomGoal))<.002)zoomGoal=null;}controls.update();}
  controls.rotationRate=earthRegions.detail?geographySensitivity(camera.position.length()):1;
  updateBodyDetail();cameraSafety();root.position.copy(focus).multiplyScalar(-1);starBackdrop.position.copy(camera.position);
  const r=camera.position.length();camera.near=Math.max(.00000001,Math.min(10,r*.00015));camera.far=Math.max(4500000,Math.max(r,focus.length())*8);camera.updateProjectionMatrix();camera.lookAt(0,0,0);maybeSwitchToSolar();root.visible=!skyMode;skyLayer.update(camera,skyMode,showOrbits);
  for(const m of earthLighting){m.uniforms.lightPos.value.copy(root.position);m.uniforms.viewPos.value.copy(camera.position);m.uniforms.lightTime.value=visualSeconds;}
  orbitGroup.visible=showOrbits;for(const line of orbitGroup.children){const localOrbit=!!line.userData.parent||['lunar','iss','satellite'].includes(line.name);line.visible=!line.userData.parent||r<familyExtent(line.userData.parent)*8&&focus.distanceTo(bodies.get(line.userData.parent).position)<familyExtent(line.userData.parent)*3;line.material.opacity=line.userData.baseOpacity*(line.userData.bodyId===selected?1.3:1)*(localOrbit?(selected==='earth'&&surfaceMode==='night'?0:1):THREE.MathUtils.smoothstep(r,12,90));}
  const galaxyViewDistance=Math.max(r,focus.length()>8000?30000:0);galaxyGroup.visible=galaxyViewDistance>1600*galaxyFactor;const galaxyMat=galaxyGroup.children[0].material;galaxyMat.uniforms.alpha.value=THREE.MathUtils.smoothstep(galaxyViewDistance,1600*galaxyFactor,22000*galaxyFactor)*.85;galaxyGroup.children[1].material.opacity=.4*THREE.MathUtils.smoothstep(r,30000*galaxyFactor,120000*galaxyFactor);
 const earth=bodies.get('earth');earth.clouds.visible=!earthRegions.active&&showClouds&&(surfaceMode==='natural'||selected!=='earth')&&r<70;
  for(const m of earthLighting){m.uniforms.nightMode.value=!earthRegions.active&&surfaceMode==='night'&&selected==='earth'?1:0;m.uniforms.geographyMode.value=earthRegions.detail?1:0;}
  updateSatelliteVisibility(r);
  if(showOrbits)for(const line of orbitGroup.children)if(line.visible)updateOrbitPath(line,simDays,focus,camera,innerHeight);
  if(!skyMode)updateCatalogView(r,focus,selected,showOrbits,camera);starBackdrop.material.uniforms.alpha.value=skyMode?1:1-THREE.MathUtils.smoothstep(Math.max(r,focus.length()),60*AU_UNITS,LY_UNITS*.05);
  frameMeter.mark('viewAndOrbits',performance.now());
  if(frameNumber%20===0){$('clockReadout').textContent=new Date(epochMs+simDays*86400000).toISOString().replace('T',' ').slice(0,19)+' UTC';$('clockReadout').title=`1× 为真实时间；当前 ${speed.toLocaleString()}×。影像为历史合成。`;}

  scene.updateMatrixWorld();camera.updateMatrixWorld();
  const panelRect=earthRegions.active?$('infoPanel').getBoundingClientRect():null;
  const blockedRects=earthRegions.active?(mobileHud?.blockedRects??[$('celestialNavigation').getBoundingClientRect()]):[];
  earthContinentLabels?.setActive(earthRegions.active&&!earthRegions.detail);earthContinentLabels?.update(camera,{width:innerWidth,height:innerHeight,markers:showMarkers,panelRect,blockedRects,selected:earthRegions.country?.id});
  earthSurfaceDetail?.update(camera,now);countryLayer?.syncSurface?.(earthSurfaceDetail);earthLandmarkLayer?.update(camera,{width:innerWidth,height:innerHeight,mobile,markers:showMarkers,dragging:controls.isDragging,panelRect,blockedRects});
  frameMeter.mark('geography',performance.now());
  if(hoverPoint&&(controls.isDragging||flight||zoomGoal!==null||geographyFlight))hoverDirty=true;
  if(frameNumber++%4===0){updateScaleUI();updateLabels();updateDistantLabels();if(hoverPoint&&hoverDirty&&!controls.isDragging){hoverDirty=false;$('regionHover').hidden=true;const hit=pickScene(hoverPoint);renderer.domElement.classList.toggle('over-body',!!hit);if(earthRegions.active&&hit?.id==='earth'){const country=earthRegions.index.at(hit.point.lon,hit.point.lat);if(country){const label=$('regionHover');label.textContent=country.cn;label.style.left=Math.min(innerWidth-160,hoverPoint.clientX+16)+'px';label.style.top=Math.max(10,hoverPoint.clientY-32)+'px';label.hidden=false;}}}}
  frameMeter.mark('hudAndPicking',performance.now());
  const sun=bodies.get('sun');bloom.enabled=!skyMode&&(resolvedOnScreen(sun.position,sun.r,focus,camera)||catalogGlowVisible(camera,focus));
  prepareBlackHoleBackground(renderer,scene,camera,mobile);composer.render();
  frameMeter.mark('renderSubmission',performance.now());frameMeter.end(performance.now(),renderer.info.render);
  if(showPerformance&&now-lastPerformanceReadout>500){lastPerformanceReadout=now;const s=frameMeter.snapshot();$('performanceReadout').textContent=s.measured?`${lookup[selected]?.cn||selected} · ${s.fps.toFixed(0)} FPS\n95% 帧间隔 ${s.p95FrameMs.toFixed(1)} ms · CPU ${s.cpuP95Ms.toFixed(1)} ms\n目标 120 · 最低 80 · 绘制 ${s.draw.calls}`:'正在采样帧率…';}
}
const observedNativeCache=new Map();
async function ensureObservedNative(id){
 const record=surfaceRecord(id),mesh=bodies.get(id)?.globe;
 if((!record?.texture&&!record?.mesh)||!mesh||['earth','sun','moon','mercury','mars'].includes(id))return;
 if(record.mesh&&!mesh.userData.observedShape){const geometry=observedGeometry(record);if(geometry){if(mesh.geometry!==sphereGeometry)mesh.geometry.dispose();mesh.geometry=geometry;mesh.userData.observedShape=true;bodies.get(id).boundRadius=geometry.boundingSphere.radius*bodies.get(id).r;}}
 if(!record.texture)return;
 if(observedNativeCache.has(id))return;
 const original=mesh.material.clone();const entry={mesh,original};observedNativeCache.set(id,entry);
 const ok=await attachObservedSurface(mesh,{...record,bodyKey:id},{mobile,maxTextureSize:renderer.capabilities.maxTextureSize});
 if(!ok){original.dispose();observedNativeCache.delete(id);return;}
 while(observedNativeCache.size>2){const [oldId,old]=observedNativeCache.entries().next().value;if(oldId===id)break;old.mesh.material.uniforms?.map?.value?.dispose();old.mesh.material.dispose();old.mesh.material=old.original;observedNativeCache.delete(oldId);}
}
function surfacesForParent(id){return __VOYAGER_EXTENDED__.surfaces.bodies.filter(r=>!r.native&&(r.parent===id||r.parent==='surface:'+id));}
function addExtendedSolarDestinations(context){
 addDestination('belt:main','主小行星带','Asteroid Belt',{kind:'belt'});addDestination('belt:kuiper','柯伊伯带','Kuiper Belt',{kind:'belt'});
 for(const r of __VOYAGER_EXTENDED__.surfaces.bodies.filter(r=>!r.native&&(r.parent===context||r.parent==='surface:'+context||['pluto','ceres','eris','haumea','makemake'].includes(r.key))))addDestination(r.id.startsWith('surface:')?r.id:'surface:'+r.id,r.cn,r.en,{kind:'planet'});
}
function showSurfaceEvidence(id){
 const r=surfaceRecord(id.startsWith('surface:')?id.slice(8):id),figure=$('surfaceEvidence');figure.classList.remove('expanded');
 figure.hidden=!r?.image;$('surfacePhotoToggle').hidden=!r?.image;
 if(r?.image){const credit=r.imageCredit;setAssetImage($('surfaceEvidenceImage'),ASSETS['surface_photo_'+(r.key||r.id)]);$('surfaceEvidenceImage').alt=r.en+' · '+r.coverage.description;$('surfaceEvidenceCaption').textContent=r.coverage.description+(credit?' · '+credit.credit+' · '+credit.license:'');$('surfaceEvidenceSource').href=credit?.url||r.sources.at(-1)?.url||'#';}
 if(['jupiter','saturn','uranus','neptune'].includes(id))$('targetSource').textContent+='；行星环半径：NASA PDS；环半径 / 宽度按数据换算；亮度增强示意';
 if(r){$('targetRenderNote').textContent+=(r.coverage?.description?' '+r.coverage.description:'');$('targetSource').textContent=r.sources.map(s=>s.credit).join('；')+' · 形状：'+r.shapeType;}
}
async function initBackgroundMusic(){
 $('musicTitle').textContent=musicMetadata.title+' · '+musicMetadata.artist;$('musicCredit').textContent=musicMetadata.attribution;$('musicCredit').href=musicMetadata.sourceUrl;$('musicLicense').href=musicMetadata.licenseUrl;
 backgroundMusic=new BackgroundMusic({src:await resourceUrl(ASSETS[musicMetadata.asset]),volume:musicMetadata.defaultVolume,onState:state=>{
  $('musicToggle').textContent=state.playing||state.pending?'暂停音乐':'播放音乐';$('musicToggle').setAttribute('aria-pressed',String(state.playing));$('musicIndicator').setAttribute('aria-label',state.playing?'背景音乐正在播放，打开设置':'背景音乐设置');$('musicIndicator').classList.toggle('active',state.playing);
  $('musicVolume').value=Math.round(state.volume*100);$('musicVolumeValue').textContent=Math.round(state.volume*100)+'%';$('musicStatus').textContent=state.failed?'音乐暂未载入，点击播放重试':state.blocked?'点击播放，或触摸地图开启音乐':state.playing?'轻声循环播放':state.pending?'正在开启音乐':'音乐已暂停';
 }});
 $('musicToggle').onclick=()=>backgroundMusic.toggle();$('musicVolume').oninput=e=>backgroundMusic.setVolume(Number(e.target.value)/100);backgroundMusic.play();
}
async function init(){
  try{
    $('app').classList.toggle('mobile-runtime',mobile);
    renderer=new THREE.WebGLRenderer({canvas:$('universe'),antialias:!mobile,logarithmicDepthBuffer:true,powerPreference:mobile?'default':'high-performance'});
    renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
    renderer.info.autoReset=false;
    renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();fail(new Error('WebGL 渲染上下文已丢失，尝试关闭占用显卡的程序后重新加载'));});
    scene=new THREE.Scene();scene.background=new THREE.Color(0x03080f);root=new THREE.Group();scene.add(root);
    camera=new THREE.PerspectiveCamera(42,innerWidth/innerHeight,.0005,4500000);camera.position.copy(landing('earth').direction).multiplyScalar(landing('earth').radius);
    controls=new FreeOrbitControls(camera,renderer.domElement);controls.minDistance=1.24;controls.maxDistance=MAX_VIEW_DISTANCE;controls.onZoom=zoom;controls.onZoomStart=prepareZoom;controls.radiusForZoom=(radius,factor)=>earthRegions?.detail&&tracking==='earth'?geographyZoomRadius(radius,factor,minDistance()):radius*factor;

    composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.15,.2,1.05);composer.addPass(bloom);composer.addPass(new OutputPass());
    document.title=CONFIG.title+' · 三维宇宙探索';await loadTextures();$('loadingText').textContent='解压观测目录与空间坐标';await loadCatalog();countryIndex=await loadCountries();continentIndex=await loadContinentIndex(countryIndex);buildBodies();configureSolar(data,bodies,solarFrame,epochJD);countryLayer=new CountryLayer(bodies.get('earth').globe,continentIndex);countryLayer.prepare();earthRegions=new EarthRegions({index:continentIndex,layer:countryLayer,isPaused:()=>paused,pause:setPaused,render:renderCountry,changed:regionModeChanged});populateCountrySelect();earthContinentLabels=new EarthContinentLabels(bodies.get('earth').globe,continentIndex,$('earthContinentLabels'),selectCountryById);earthSurfaceDetail=new EarthSurfaceDetail(bodies.get('earth').globe,ASSETS,{mobile,onStatus:state=>{$('surfaceDetailStatus').textContent=state.baseFailed?'全球底图暂未载入，可切换地图重试':state.quality==='standard'?'标准地貌 · 已释放精细分块':state.ready===state.total?'精细地貌已就绪 · 历史合成影像':`精细地貌 ${state.ready} / ${state.total}`;}});earthLandmarkLayer=new EarthLandmarkLayer(bodies.get('earth').globe,$('earthLandmarkLabels'),ASSETS,(item,move)=>openLandmark(item,move));buildOrbits();buildGalaxy();catalogStats=buildCatalog(root,(...args)=>{const m=particleMaterial(...args);uniformsToUpdate.push(m);m.uniforms.pixelRatio.value=renderer.getPixelRatio();m.addEventListener('dispose',()=>{const i=uniformsToUpdate.indexOf(m);if(i>=0)uniformsToUpdate.splice(i,1);});return m;},mobile,flyTo);buildBackdrop();landmarks=featuredCatalog();skyLayer=buildSky(scene,catalogStars(),(...args)=>{const m=particleMaterial(...args);uniformsToUpdate.push(m);m.uniforms.pixelRatio.value=renderer.getPixelRatio();m.addEventListener('dispose',()=>{const i=uniformsToUpdate.indexOf(m);if(i>=0)uniformsToUpdate.splice(i,1);});return m;});buildLabels();buildDistantLabels();buildDestinations();updateBodies();focus.copy(posFor('earth'));root.position.copy(focus).multiplyScalar(-1);controls.orbitUp.copy(referenceUp('earth'));updateInfo('earth');bindUI();resize();camera.position.copy(landing('earth').direction).multiplyScalar(landing('earth').radius);controls.update();
    startupStage='detail';await ensureHighDetail('earth');
    $('loadingProgress').style.width='94%';$('loadingPercent').textContent='94%';$('loadingText').textContent='准备第一束星光';
    startupStage='compile';renderer.compile(scene,camera);ready=true;initBackgroundMusic().catch(()=>{$('musicStatus').textContent='音乐暂未载入，重新打开可重试';});animate(performance.now());$('loadingProgress').style.width='100%';$('loadingPercent').textContent='100%';$('loading').classList.add('complete');setTimeout(()=>$('loading').remove(),900);
    if(mobile)$('gestureHint').querySelector('span').textContent='单指旋转 · 双指缩放';
    // Read-only diagnostics and deterministic state access for functional QA.
    window.Voyager={performance:()=>frameMeter.snapshot(),flyTo,zoom,setPaused:userPause,enterEarthRegions,exitEarthRegions,openCountryDetail:id=>openCountryDetail(countryIndex.byId.get(id)),closeCountryDetail,openLandmark:id=>{const item=geographyData.landmarks.find(item=>item.id===id);if(item)openLandmark(item,true);},snapshot:()=>({ready,backgroundMusic:backgroundMusic?.snapshot(),selected,tracking,flying:!!flight,paused,speed,simDays,showOrbits,showMarkers,surfaceMode,showClouds,earthRegions:{active:earthRegions.active,country:earthRegions.country?.id||null,count:countryIndex.records.length,detail:earthRegions.detail,landmark:activeLandmark?.id||null,landmarks:geographyData.landmarks.length,surface:earthSurfaceDetail.snapshot()},dragging:controls.isDragging,skyMode,exploreLevel,dockGroup,infoTarget,model:modelSummary(),satellites:data.filter(d=>d.parent).length,featured:landmarks.stars.map(r=>r.id),constellations:skyLayer.items.length,pivotTransition:!!pivotShift,solarZoomArmed,rotationCentre:focus.toArray(),cameraUp:camera.up.toArray(),nightSurfaceLevel:earthLighting[0].uniforms.nightSurfaceLevel.value,lightTime:visualSeconds,twinkleStrength:earthLighting[0].uniforms.twinkleStrength.value,catalog:catalogSummary(),catalogStats,rotation:[...bodies.values()].filter(b=>b.globe).map(b=>({id:b.id,angle:b.id==='sun'?simDays*14.37*DEG:b.globe.rotation.y,hours:b.hours,tilt:b.tilt,pole:b.axis.getWorldQuaternion(new THREE.Quaternion())&&V(0,1,0).applyQuaternion(b.axis.getWorldQuaternion(new THREE.Quaternion())).applyQuaternion(solarFrame.clone().invert()).toArray()})),highDetail:Object.fromEntries([...highDetailCache].map(([id,ts])=>[id,Object.fromEntries(Object.entries(ts).map(([key,t])=>[key,[t.image.width,t.image.height]]))])),textureSizes:Object.fromEntries(Object.entries(textures).map(([k,t])=>[k,[t.image.width,t.image.height]])),radius:camera.position.length(),focus:focus.toArray(),camera:camera.position.toArray(),bodies:[...bodies.values()].map(b=>({id:b.id,r:b.r,position:b.position.toArray()})),triangles:renderer.info.render.triangles,points:renderer.info.render.points,textures:Object.keys(textures),maxTextureSize:renderer.capabilities.maxTextureSize,pixelRatio:renderer.getPixelRatio()}),config:CONFIG};
  }catch(error){fail(error);}
}
init();
