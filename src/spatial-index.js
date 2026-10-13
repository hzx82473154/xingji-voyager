// Double-precision local coordinates. Midpoint BVH avoids sorting huge catalogues.
export class PointIndex {
 constructor(positions,leafSize=32){
  this.positions=positions;this.order=Uint32Array.from({length:positions.length/3},(_,i)=>i);this.nodes=[];this.visited=0;
  const build=(start,end)=>{
   const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
   for(let j=start;j<end;j++){const i=this.order[j]*3;for(let a=0;a<3;a++){min[a]=Math.min(min[a],positions[i+a]);max[a]=Math.max(max[a],positions[i+a]);}}
   const node={min,max,start,end,left:null,right:null};this.nodes.push(node);
   if(end-start>leafSize){let axis=0;for(let a=1;a<3;a++)if(max[a]-min[a]>max[axis]-min[axis])axis=a;
    const split=(min[axis]+max[axis])/2;let lo=start,hi=end-1;
    while(lo<=hi){if(positions[this.order[lo]*3+axis]<split)lo++;else {const swap=this.order[lo];this.order[lo]=this.order[hi];this.order[hi--]=swap;}}
    if(lo>start&&lo<end){node.left=build(start,lo);node.right=build(lo,end);}
   }return node;
  };this.root=positions.length?build(0,this.order.length):null;
 }
 sphere(centre,radius){
  const out=[],r2=radius*radius,p=this.positions,c=[centre.x,centre.y,centre.z];this.visited=0;
  const walk=n=>{if(!n)return;this.visited++;let d2=0;for(let a=0;a<3;a++)d2+=Math.max(n.min[a]-c[a],0,c[a]-n.max[a])**2;if(d2>r2)return;
   if(n.left){walk(n.left);walk(n.right);return;}
   for(let j=n.start;j<n.end;j++){const i=this.order[j],o=i*3;if((p[o]-c[0])**2+(p[o+1]-c[1])**2+(p[o+2]-c[2])**2<=r2)out.push(i);}
  };walk(this.root);return out;
 }
 ray(origin,direction,threshold,nearestOnly=false){
  const out=[],p=this.positions,o=[origin.x,origin.y,origin.z],d=[direction.x,direction.y,direction.z],r2=threshold*threshold;let nearest=null;this.visited=0;
  const walk=n=>{if(!n)return;this.visited++;let near=0,far=Infinity;
   for(let a=0;a<3;a++){const min=n.min[a]-threshold,max=n.max[a]+threshold;if(Math.abs(d[a])<1e-15){if(o[a]<min||o[a]>max)return;}else {let t0=(min-o[a])/d[a],t1=(max-o[a])/d[a];if(t0>t1)[t0,t1]=[t1,t0];near=Math.max(near,t0);far=Math.min(far,t1);if(far<near)return;}}
   if(nearestOnly&&nearest&&near>nearest.distance)return;
   if(n.left){const axis=d.findIndex(v=>Math.abs(v)>.5),first=axis>=0&&d[axis]>0?n.left:n.right;walk(first);walk(first===n.left?n.right:n.left);return;}
   for(let j=n.start;j<n.end;j++){const i=this.order[j],k=i*3,x=p[k]-o[0],y=p[k+1]-o[1],z=p[k+2]-o[2],t=x*d[0]+y*d[1]+z*d[2];if(t<0)continue;
    const error=(x-t*d[0])**2+(y-t*d[1])**2+(z-t*d[2])**2;if(error<=r2){const hit={index:i,distance:t,error};if(nearestOnly){if(!nearest||t<nearest.distance)nearest=hit;}else out.push(hit);}}
  };walk(this.root);return nearestOnly?(nearest?[nearest]:[]):out;
 }
}
