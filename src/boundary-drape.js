import * as THREE from 'three';

// Match raster UV interpolation on its actual triangles, without a lifted
// sphere (parallax) or raycasts/rebuilt line buffers during a drag.
export function drapeSurfacePoint(lat,lon,{width=160,height=112,radius=1.0015,tile=false}={}){
 const u=((lon+180)/360%1+1)%1,v=THREE.MathUtils.clamp((90-lat)/180,0,1-1e-10);
 const x=u*width,y=v*height,ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
 const corner=(dx,dy)=>{const p=(ix+dx)/width*2*Math.PI-Math.PI,t=(iy+dy)/height*Math.PI;return new THREE.Vector3(Math.cos(p)*Math.sin(t),Math.cos(t),-Math.sin(p)*Math.sin(t)).multiplyScalar(radius);};
 const a=corner(0,0),b=corner(1,0),c=corner(0,1),d=corner(1,1);
 if(tile)return fx+fy<=1?a.multiplyScalar(1-fx-fy).addScaledVector(b,fx).addScaledVector(c,fy):b.multiplyScalar(1-fy).addScaledVector(c,1-fx).addScaledVector(d,fx+fy-1);
 return fy<=fx?a.multiplyScalar(1-fx).addScaledVector(b,fx-fy).addScaledVector(d,fy):a.multiplyScalar(1-fy).addScaledVector(c,fy-fx).addScaledVector(d,fx);
}

const vertexHeader=`
uniform sampler2D borderSurfaceLod;
uniform vec2 borderBaseGrid;
uniform float borderBaseRadius;
varying vec3 vBorderWorldPosition;
varying vec3 vBorderWorldNormal;
vec3 borderCorner(vec2 uv,float r){
 float lon=uv.x*6.28318530718-3.14159265359,theta=uv.y*3.14159265359;
 return vec3(cos(lon)*sin(theta),cos(theta),-sin(lon)*sin(theta))*r;
}
vec3 borderDrape(vec3 point){
 vec3 dir=normalize(point);
 vec2 uv=vec2(fract((atan(-dir.z,dir.x)+3.14159265359)/6.28318530718),clamp((1.57079632679-asin(clamp(dir.y,-1.0,1.0)))/3.14159265359,0.0,0.9999999));
 float lod=floor(texture2D(borderSurfaceLod,uv).r*255.0+0.5);
 bool tile=lod>=5.0;vec2 grid=tile?vec2(15.0*exp2(lod),7.5*exp2(lod)):borderBaseGrid;
 float radius=tile?1.0022:borderBaseRadius;vec2 cell=uv*grid,base=floor(cell)/grid,f=fract(cell),stepUv=1.0/grid;
 vec3 a=borderCorner(base,radius),b=borderCorner(base+vec2(stepUv.x,0.0),radius),c=borderCorner(base+vec2(0.0,stepUv.y),radius),d=borderCorner(base+stepUv,radius);
 if(tile)return f.x+f.y<=1.0?a*(1.0-f.x-f.y)+b*f.x+c*f.y:b*(1.0-f.y)+c*(1.0-f.x)+d*(f.x+f.y-1.0);
 return f.y<=f.x?a*(1.0-f.x)+b*(f.x-f.y)+d*f.y:a*(1.0-f.y)+c*(f.y-f.x)+d*f.x;
}
void borderVaryings(vec3 point){
 vBorderWorldPosition=(modelMatrix*vec4(point,1.0)).xyz;
 vBorderWorldNormal=normalize(mat3(modelMatrix)*point);
}
`;
const fragmentHeader='varying vec3 vBorderWorldPosition;\nvarying vec3 vBorderWorldNormal;\n';
const backClip='if(dot(vBorderWorldNormal,cameraPosition-vBorderWorldPosition)<=0.0)discard;';

export class BoundaryDrape{
 constructor(globe){
  const p=globe.geometry.parameters;this.base={width:p.widthSegments,height:p.heightSegments,radius:p.radius};
  this.data=new Uint8Array(160*80*4);this.texture=new THREE.DataTexture(this.data,160,80);this.texture.minFilter=this.texture.magFilter=THREE.NearestFilter;this.texture.generateMipmaps=false;this.texture.needsUpdate=true;
  this.uniforms={borderSurfaceLod:{value:this.texture},borderBaseGrid:{value:new THREE.Vector2(this.base.width,this.base.height)},borderBaseRadius:{value:this.base.radius}};
  this.source=null;this.revision=-1;
 }
 attach(material,fat=false){
  // Explicit back-hemisphere clipping permits coincident positions and avoids
  // z-fighting against the independently fading, non-depth-writing tiles.
  material.depthTest=false;material.depthWrite=false;
  material.onBeforeCompile=shader=>{
   Object.assign(shader.uniforms,this.uniforms);shader.vertexShader=vertexHeader+shader.vertexShader;shader.fragmentShader=fragmentHeader+shader.fragmentShader;
   if(fat){
    shader.vertexShader=shader.vertexShader.replace('vec4 start = modelViewMatrix * vec4( instanceStart, 1.0 );','vec3 borderStart=borderDrape(instanceStart),borderEnd=borderDrape(instanceEnd);\n borderVaryings(position.y<0.5?borderStart:borderEnd);\n vec4 start = modelViewMatrix * vec4( borderStart, 1.0 );').replace('vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );','vec4 end = modelViewMatrix * vec4( borderEnd, 1.0 );');
   }else shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','vec3 transformed=borderDrape(position);\nborderVaryings(transformed);');
   shader.fragmentShader=shader.fragmentShader.replace('void main() {','void main() {\n'+backClip);
  };
  material.customProgramCacheKey=()=>fat?'voyager-boundary-drape-fat-v29':'voyager-boundary-drape-thin-v29';
  return material;
 }
 sync(surface){
  const revision=surface?.surfaceRevision??0;if(this.source===surface&&this.revision===revision)return false;
  this.source=surface;this.revision=revision;this.data.fill(0);
  const p=surface?.active&&surface.base?surface.base.geometry.parameters:null;
  this.uniforms.borderBaseGrid.value.set(p?.widthSegments??this.base.width,p?.heightSegments??this.base.height);this.uniforms.borderBaseRadius.value=p?.radius??this.base.radius;
  if(p&&surface.quality==='fine')for(const entry of surface.entries.values()){
   if(!entry.mesh?.visible||entry.mesh.material.opacity<1)continue;
   const tile=entry.tile;if(!tile)continue;
   const x0=Math.round((tile.west+180)/2.25),x1=Math.round((tile.east+180)/2.25),y0=Math.round((90-tile.north)/2.25),y1=Math.round((90-tile.south)/2.25);
   for(let y=Math.max(0,y0);y<Math.min(80,y1);y++)for(let x=Math.max(0,x0);x<Math.min(160,x1);x++){const i=(y*160+x)*4;this.data[i]=Math.max(this.data[i],tile.level);}
  }
  this.texture.needsUpdate=true;return true;
 }
}
