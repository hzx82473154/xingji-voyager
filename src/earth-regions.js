// Mode state owns only temporary changes; manual pause choices survive exit.
export class EarthRegions{
 constructor({index,layer,isPaused,pause,render,changed}){Object.assign(this,{index,layer,isPaused,pause,render,changed});this.active=false;this.detail=false;this.country=null;this.previousPaused=null;this.ownsPause=false;}
 enter(){if(this.active)return;this.active=true;this.country=null;this.previousPaused=this.isPaused();this.ownsPause=false;this.layer.setVisible(true);this.changed(this);}
 select(country,point){if(!this.active||!country)return false;this.country=country;this.point=point;this.layer.select(country);this.pause(true);this.ownsPause=true;this.render(country,point);this.changed(this);return true;}
 selectAt(point){return this.select(this.index.at(point.lon,point.lat),point);}
 openDetail(country=this.country,point=this.point){if(!this.select(country,point))return false;this.detail=true;this.render(country,point);this.changed(this);return true;}
 closeDetail(){if(!this.detail)return;this.detail=false;this.render(this.country,this.point);this.changed(this);}
 manualPause(value){this.ownsPause=false;this.previousPaused=value;this.pause(value);this.changed(this);}
 exit(){if(!this.active)return;this.active=false;this.detail=false;this.country=null;this.layer.setVisible(false);this.layer.select(null);if(this.ownsPause)this.pause(this.previousPaused);this.ownsPause=false;this.changed(this);}
}
