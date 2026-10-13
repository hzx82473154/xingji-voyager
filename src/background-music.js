// A single lazily created player. Browser autoplay restrictions become a
// pending gesture request; a deliberate pause always cancels that request.
export class BackgroundMusic {
 constructor({src,onState=()=>{},AudioClass=globalThis.Audio,eventTarget=globalThis.document,volume=.12}){
  Object.assign(this,{src,onState,AudioClass,eventTarget});this.volume=Math.max(0,Math.min(1,volume));this.audio=null;this.desired=false;this.playing=false;this.pending=false;this.blocked=false;this.failed=false;this.generation=0;
  this.gesture=e=>{if(e.target?.closest?.('.music-controls'))return;if(e.type==='keydown'&&!['Enter',' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;if(this.desired&&!this.playing&&!this.pending&&!this.failed)this.play();};
  eventTarget?.addEventListener('pointerdown',this.gesture);eventTarget?.addEventListener('keydown',this.gesture);
 }
 ensure(){if(!this.audio){this.audio=new this.AudioClass();this.audio.preload='none';this.audio.src=this.src;this.audio.loop=true;this.audio.volume=this.volume;this.audio.addEventListener?.('error',()=>{this.playing=false;this.failed=true;this.pending=false;this.report();});}return this.audio;}
 async play(){this.desired=true;this.failed=false;if(this.pending||this.playing)return;const generation=++this.generation;this.pending=true;this.blocked=false;this.report();try{const player=this.ensure();await player.play();if(generation!==this.generation){if(!this.desired)player.pause();return;}this.playing=true;this.blocked=false;}catch(error){if(generation!==this.generation)return;this.playing=false;this.blocked=error?.name==='NotAllowedError';this.failed=!this.blocked;}finally{if(generation===this.generation){this.pending=false;this.report();}}}
 pause(){this.desired=false;this.generation++;this.pending=false;this.playing=false;this.blocked=false;this.audio?.pause();this.report();}
 toggle(){if(this.desired&&!this.blocked&&!this.failed)this.pause();else return this.play();}
 setVolume(value){if(!Number.isFinite(value))return;this.volume=Math.max(0,Math.min(1,value));if(this.audio)this.audio.volume=this.volume;this.report();}
 snapshot(){return {playing:this.playing,pending:this.pending,blocked:this.blocked,failed:this.failed,desired:this.desired,volume:this.volume,loop:true};}
 report(){this.onState(this.snapshot());}
 dispose(){this.pause();this.eventTarget?.removeEventListener('pointerdown',this.gesture);this.eventTarget?.removeEventListener('keydown',this.gesture);if(this.audio){this.audio.removeAttribute?.('src');this.audio.load?.();}this.audio=null;}
}
