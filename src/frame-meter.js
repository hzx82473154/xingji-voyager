// Actual requestAnimationFrame intervals, separate from synchronous JS time.
// No synthetic FPS is inferred from CPU timings or a selected target.
export class FrameMeter{
 constructor(capacity=600){this.capacity=capacity;this.intervals=new Float64Array(capacity);this.cpu=new Float64Array(capacity);this.reset();}
 reset(){this.count=0;this.cursor=0;this.last=null;this.started=0;this.phaseStart=0;this.sectionTotals={};this.lastDraw={};this.sectionRows=null;}
 begin(now,cpuNow){
  this.pendingInterval=this.last===null?null:now-this.last;this.last=now;this.started=cpuNow;this.phaseStart=cpuNow;this.sections={};
 }
 mark(name,now){this.sections[name]=(this.sections[name]||0)+Math.max(0,now-this.phaseStart);this.phaseStart=now;}
 end(now,draw={}){
  this.lastDraw={calls:draw.calls||0,triangles:draw.triangles||0,points:draw.points||0};
  if(!(this.pendingInterval>0))return;
  if(this.count===this.capacity){const old=this.sectionRows?.[this.cursor]||{};for(const [name,ms] of Object.entries(old))this.sectionTotals[name]-=ms;}
  if(!this.sectionRows)this.sectionRows=Array(this.capacity);
  this.intervals[this.cursor]=this.pendingInterval;this.cpu[this.cursor]=Math.max(0,now-this.started);this.sectionRows[this.cursor]=this.sections;
  for(const [name,ms] of Object.entries(this.sections))this.sectionTotals[name]=(this.sectionTotals[name]||0)+ms;
  this.cursor=(this.cursor+1)%this.capacity;this.count=Math.min(this.capacity,this.count+1);
 }
 snapshot(){
  if(!this.count)return {measured:false,samples:0,targetFPS:120,minimumFPS:80};
  const intervals=Array.from(this.intervals.subarray(0,this.count)).sort((a,b)=>a-b),cpu=Array.from(this.cpu.subarray(0,this.count)).sort((a,b)=>a-b),sum=intervals.reduce((a,b)=>a+b,0),at=(a,p)=>a[Math.min(a.length-1,Math.ceil(a.length*p)-1)];
  return {measured:true,samples:this.count,windowSeconds:sum/1000,fps:1000*this.count/sum,p95FrameMs:at(intervals,.95),p99FrameMs:at(intervals,.99),worstFrameMs:intervals.at(-1),cpuMedianMs:at(cpu,.5),cpuP95Ms:at(cpu,.95),framesOver12_5Ms:intervals.filter(v=>v>12.5).length,framesOver50Ms:intervals.filter(v=>v>50).length,sections:Object.fromEntries(Object.entries(this.sectionTotals).map(([name,sum])=>[name,sum/this.count])),draw:this.lastDraw,targetFPS:120,minimumFPS:80,metric:'Observed animation callback intervals; CPU timings exclude GPU execution. Display/compositor FPS and GPU timings are not measured here.'};
 }
}
