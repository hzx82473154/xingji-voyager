// Browsing hierarchy: exploration area -> type -> host or parent -> object.
export const SCOPES={solar:'太阳系',stellar:'恒星与行星系统',deep:'深空天体',sky:'星座'};
export const TYPES={solar:[['all','全部'],['solar-planet','行星'],['dwarf','矮行星'],['moon','卫星（按所属天体）'],['asteroid','小行星'],['comet','彗星'],['tno','海王星外天体'],['belt','小行星带与柯伊伯带']],stellar:[['all','全部'],['star','恒星与宿主星'],['planet','系外行星（按宿主星）']],deep:[['all','全部'],['black-hole','黑洞'],['cluster','星团'],['nebula','星云'],['galaxy','星系']],sky:[['all','全部星座']]};
export function scopeOf(r){return r.solar?'solar':r.kind==='constellation'?'sky':['star','planet'].includes(r.kind)?'stellar':'deep';}
export function inScope(r,scope){return scope==='all'||scopeOf(r)===scope;}
export function belongsTo(r,parent){if(!parent)return true;return r.host===parent||r.name===parent||r.parent===parent||r.nativeId===parent||r.bodyKey===parent;}
export function planetCategory(r){const n=r.radiusEarth;if(!(n>0))return '半径尚未收录的系外行星';return n<1.25?'与地球半径相近的系外行星':n<2?'超级地球大小的系外行星':n<6?'海王星大小的系外行星':'气态巨行星大小的系外行星';}
