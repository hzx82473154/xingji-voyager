// Phone presentation only. Move original nodes so existing scene handlers survive.
export function initMobileHud(doc,win=window){
 const get=id=>doc.getElementById(id),app=get('app'),header=doc.querySelector('.topbar'),nav=doc.querySelector('.top-navigation'),footer=doc.querySelector('.bottom-dock'),panel=get('infoPanel');
 const back=get('regionBack');back.classList.add('ui','mobile-region-back');app.append(back);
 const navigationToggle=get('hudDestinationsToggle');navigationToggle.innerHTML='天体 ▾';navigationToggle.setAttribute('aria-label','展开或收起天体选择');
 nav.classList.remove('hud-directory-open');navigationToggle.setAttribute('aria-expanded','false');
 panel.insertBefore(doc.querySelector('.coordinate'),get('hudExplore'));
 const makeMenu=(id,label)=>{const menu=doc.createElement('details');menu.id=id;menu.className='mobile-menu';const summary=doc.createElement('summary');summary.className='mobile-menu-toggle';summary.textContent=label;summary.setAttribute('aria-label',id==='mobileTools'?'展开工具与设置':'展开时间控制');menu.append(summary);return menu;};
 const tools=makeMenu('mobileTools','⋯'),actions=doc.querySelector('.top-actions');
 header.append(get('catalog'),tools);tools.append(actions);
 actions.append(doc.querySelector('.meter-labels'),get('hudImmersive'));
 const time=makeMenu('mobileTime','时间 ▴'),timeControls=doc.querySelector('.time-controls');
 doc.querySelector('.controlbar').append(get('pause'),time);time.append(timeControls);
 const notes=get('targetData'),music=doc.querySelector('.music-controls');
 let pending=0,blockedRects=[];
 const measure=()=>{
  pending=0;const top=app.getBoundingClientRect().top;
  app.style.setProperty('--mobile-header-bottom',Math.ceil(header.getBoundingClientRect().bottom-top)+'px');
  app.style.setProperty('--mobile-nav-bottom',Math.ceil(nav.getBoundingClientRect().bottom-top)+'px');
  app.style.setProperty('--mobile-controls-height',Math.ceil(footer.getBoundingClientRect().height)+'px');
  const nodes=[header,nav,footer,panel,doc.querySelector('.scale-meter'),back];
  if(tools.open)nodes.push(actions);if(time.open)nodes.push(timeControls);
  if(notes.open)nodes.push(doc.querySelector('.tool-popover'));if(music.open)nodes.push(doc.querySelector('.music-popover'));
  blockedRects=nodes.filter(n=>n&&!n.hidden).map(n=>n.getBoundingClientRect()).filter(r=>r.width>0&&r.height>0).map(r=>({left:r.left,right:r.right,top:r.top,bottom:r.bottom}));
 };
 const schedule=()=>{if(!pending)pending=win.requestAnimationFrame(measure);};
 const resize=new ResizeObserver(schedule);[header,nav,footer,panel,actions,timeControls,back].forEach(n=>resize.observe(n));
 const mutation=new MutationObserver(schedule);mutation.observe(app,{subtree:true,attributes:true,attributeFilter:['open','hidden','class']});
 const closeDirectory=()=>{nav.classList.remove('hud-directory-open');navigationToggle.setAttribute('aria-expanded','false');};
 for(const menu of [tools,time])menu.addEventListener('toggle',()=>{menu.firstElementChild.setAttribute('aria-expanded',String(menu.open));if(menu.open){(menu===tools?time:tools).open=false;closeDirectory();}else if(menu===tools){notes.open=false;music.open=false;}schedule();});
 navigationToggle.addEventListener('click',()=>{if(nav.classList.contains('hud-directory-open')){tools.open=false;time.open=false;}schedule();});
 // The information control must not resemble a second zoom-in control.
 const cardToggle=get('hudCardToggle'),syncCard=()=>{cardToggle.textContent=panel.classList.contains('hud-expanded')?'⌄':'ⓘ';};
 const panelObserver=new MutationObserver(syncCard);panelObserver.observe(panel,{attributes:true,attributeFilter:['class']});syncCard();
 win.addEventListener('resize',schedule);win.visualViewport?.addEventListener('resize',schedule);doc.fonts?.ready.then(schedule);schedule();
 app.addEventListener('pointerdown',e=>{if(!e.target.closest('#mobileTools')){tools.open=false;notes.open=false;music.open=false;}if(!e.target.closest('#mobileTime'))time.open=false;});
 doc.addEventListener('keydown',e=>{if(e.key==='Escape'){tools.open=false;time.open=false;schedule();}});
 return {schedule,get blockedRects(){return app.classList.contains('ui-hidden')?[]:blockedRects;},dispose(){resize.disconnect();mutation.disconnect();panelObserver.disconnect();win.removeEventListener('resize',schedule);win.visualViewport?.removeEventListener('resize',schedule);if(pending)win.cancelAnimationFrame(pending);}};
}
