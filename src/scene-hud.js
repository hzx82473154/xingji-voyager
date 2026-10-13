// Presentation only: all exploration, geographic and simulation actions remain
// owned by the existing application. This controller never mutates scene data.
export function initSceneHud(doc) {
  const get=id=>doc.getElementById(id), panel=get('infoPanel'), dock=doc.querySelector('.top-navigation');
  const toggle=get('hudCardToggle'), directory=get('hudDestinationsToggle');
  const notes=get('targetData'),music=doc.querySelector('.music-controls');
  notes.addEventListener('toggle',()=>{get('dataNotesIndicator').setAttribute('aria-expanded',String(notes.open));if(notes.open)music.open=false;});
  music.addEventListener('toggle',()=>{get('musicIndicator').setAttribute('aria-expanded',String(music.open));if(music.open)notes.open=false;});
  let expanded=false;
  const setExpanded=value=>{
    expanded=Boolean(value);panel.classList.toggle('hud-expanded',expanded);
    panel.classList.toggle('compact',!expanded);
    toggle.textContent=expanded?'−':'＋';toggle.setAttribute('aria-expanded',String(expanded));
    toggle.setAttribute('aria-label',expanded?'收起天体资料':'展开天体资料');
    get('infoCollapse').setAttribute('aria-expanded',String(expanded));
  };
  toggle.onclick=()=>setExpanded(!expanded);
  get('infoCollapse').onclick=()=>setExpanded(!expanded);
  directory.onclick=()=>{
    const open=!dock.classList.contains('hud-directory-open');
    dock.classList.toggle('hud-directory-open',open);directory.setAttribute('aria-expanded',String(open));
  };
  get('destinations').addEventListener('click',event=>{
    if(event.target.closest('[data-destination]')){
      dock.classList.remove('hud-directory-open');directory.setAttribute('aria-expanded','false');
    }
  });
  get('hudExplore').onclick=()=>{
    setExpanded(true);
    if(!get('regionDetailEnter').hidden)get('regionDetailEnter').click();
    else if(!get('earthDetail').hidden&&get('earthDetail').style.display!=='none')get('earthRegionsEnter').click();
    else if(!get('landmarkBack').hidden)get('landmarkExpand').click();
    // Other bodies retain their related-object controls and source information.
  };
  get('hudImmersive').onclick=()=>get('restoreUI').click();
  doc.addEventListener('keydown',event=>{
    if(event.key==='Escape'){
      if(notes.open||music.open){notes.open=false;music.open=false;event.preventDefault();}
      dock.classList.remove('hud-directory-open');directory.setAttribute('aria-expanded','false');
    }
  });
  // Existing geography navigation sometimes updates the legacy compact state.
  // Reflect that state instead of fighting it; never auto-open a large panel.
  const observer=new MutationObserver(()=>{
    const compact=panel.classList.contains('compact');
    if(compact===expanded)setExpanded(!compact);
    const geography=panel.classList.contains('geography-active');
    get('hudExplore').innerHTML=geography?'继续深入探索 <small>EXPLORE DEEPER ↗</small>':'进入深入探索 <small>EXPLORE DEEPER ↗</small>';
  });
  observer.observe(panel,{attributes:true,attributeFilter:['class']});
  setExpanded(false);
  return {setExpanded};
}

export function hudOccludes(doc,x,y) {
  if(doc.getElementById('app').classList.contains('ui-hidden'))return false;
  return ['.brand','.top-actions','.top-navigation','.info-panel','.bottom-dock','.scale-meter','.mobile-region-back:not([hidden])','#targetData[open] .tool-popover','.music-controls[open] .music-popover'].some(selector=>{
    const node=doc.querySelector(selector);if(!node)return false;
    const r=node.getBoundingClientRect();
    return r.width>0&&r.height>0&&x>r.left-18&&x<r.right+18&&y>r.top-12&&y<r.bottom+12;
  });
}
