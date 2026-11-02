import {ALL,BODIES,BY_ID,REGIONS} from './data.js';
import {createSolarScene} from './scene.js';

const $=(id)=>document.getElementById(id);
const info={
  title:$('info-title'),subtitle:$('info-subtitle'),about:$('info-about'),fact:$('info-fact'),type:$('object-type'),
  diameter:$('stat-diameter'),year:$('stat-year'),day:$('stat-day'),temp:$('stat-temp')
};
const ordered=ALL.map(o=>o.id);
const groups=[['star','OUR STAR'],['planet','THE EIGHT PLANETS'],['dwarf','DWARF PLANETS'],['moon','SELECTED MOONS'],['region','COSMIC REGIONS']];
const layers=[['orbits','Orbit paths'],['asteroids','Asteroid Belt'],['kuiper','Kuiper Belt'],['oort','Oort Cloud'],['dwarfs','Dwarf planets'],['moons','Moons']];
let scene=null,active='saturn',previousSelection='saturn',paused=false;
const titleCase=s=>s.toUpperCase();

function renderNav(){
  const q=$('search').value.trim().toLowerCase(),list=$('object-list');list.replaceChildren();
  let total=0;
  for(const [group,label] of groups){
    const items=ALL.filter(v=>v.group===group&&(!q||`${v.name} ${v.kind} ${v.about}`.toLowerCase().includes(q)));
    if(!items.length)continue;
    const header=document.createElement('div');header.className='nav-category';header.textContent=label;list.appendChild(header);
    items.forEach(d=>{
      total++;
      const btn=document.createElement('button');btn.type='button';btn.className=`nav-row ${d.id===active?'active':''}`;
      btn.setAttribute('aria-label',`Explore ${d.name}`);btn.dataset.id=d.id;
      const dot=document.createElement('span');dot.className='planet-dot';dot.style.setProperty('--planet-color',d.color);
      const name=document.createElement('span');name.className='nav-name';name.textContent=d.name;
      const tail=document.createElement('span');tail.className=d.id===active?'nav-arrow':'nav-kind';tail.textContent=d.id===active?'↗':d.group==='moon'?'MOON':d.group==='dwarf'?'DWARF':'';
      btn.append(dot,name,tail);btn.addEventListener('click',()=>navigate(d.id));list.appendChild(btn);
    });
  }
  if(!total){const empty=document.createElement('div');empty.className='empty-search';empty.textContent='No worlds found. Try another search.';list.appendChild(empty)}
}
function renderLayers(){
 const root=$('layer-toggles');
 for(const [id,label] of layers){
   const wrapper=document.createElement('label');wrapper.className='toggle-row';const text=document.createElement('span');text.textContent=label;
   const check=document.createElement('input');check.type='checkbox';check.checked=true;check.setAttribute('aria-label',label);
   check.addEventListener('change',()=>scene?.setLayer(id,check.checked));wrapper.append(text,check);root.appendChild(wrapper);
 }
}
function updateInfo(id){
 const d=BY_ID[id];if(!d)return;
 const num=ordered.indexOf(id)+1,total=ordered.length;
 $('hero-name').innerHTML=`${d.name.replaceAll('&','&amp;').replaceAll('<','&lt;')}<span class="hero-period">.</span>`;
 $('hero-subtitle').textContent=d.subtitle;
 $('focus-category').textContent=d.kind.toUpperCase();
 info.title.textContent=d.name;info.subtitle.textContent=d.subtitle;info.about.textContent=d.about;info.fact.textContent=d.fact;info.type.textContent=d.kind.toUpperCase();
 info.diameter.textContent=d.diameter||d.distance||'—';info.year.textContent=d.year||'—';info.day.textContent=d.day||'—';info.temp.textContent=d.temp||'—';
 $('object-serial').textContent=`${String(num).padStart(2,'0')} / ${String(total).padStart(2,'0')}`;
 $('sequence-text').textContent=`${String(num).padStart(2,'0')} / ${String(total).padStart(2,'0')}`;
 $('focus-action').textContent=d.group==='region'?'SURVEY THIS REGION ↗':'VIEW FROM ORBIT ↗';
 document.querySelectorAll('#view-tabs button').forEach(b=>{
    b.classList.toggle('active',(id==='oort'&&b.dataset.preset==='edge')||(id==='kuiper'&&b.dataset.preset==='outer'));
 });
 renderNav();
}
function navigate(id,{skipHash=false}={}){
 if(!BY_ID[id])return;
 previousSelection=active;active=id;
 scene?.select(id);
 updateInfo(id);
 if(!skipHash)history.replaceState(null,'','#'+id);
 document.querySelectorAll('.mobile-open').forEach(e=>e.classList.remove('mobile-open'));
}
function step(n){const next=ordered[(ordered.indexOf(active)+n+ordered.length)%ordered.length];navigate(next)}
renderLayers();updateInfo(active);
$('search').addEventListener('input',renderNav);
$('search').addEventListener('keydown',e=>{if(e.key==='Enter'){const b=$('object-list').querySelector('.nav-row');if(b)navigate(b.dataset.id);$('search').blur()}});
$('next-btn').addEventListener('click',()=>step(1));$('prev-btn').addEventListener('click',()=>step(-1));
$('focus-action').addEventListener('click',()=>{
 if(!scene)return;scene.select(active);
 document.querySelectorAll('.mobile-open').forEach(x=>x.classList.remove('mobile-open'));
});
$('view-tabs').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{
 if(!scene)return;
 scene.preset(b.dataset.preset);
 const selected={inner:'earth',system:'sun',outer:'kuiper',edge:'oort'}[b.dataset.preset];
 active=selected;updateInfo(selected);
 history.replaceState(null,'','#'+selected);
 document.querySelectorAll('#view-tabs button').forEach(el=>el.classList.toggle('active',el===b));
}));
function setPause(next){paused=next;scene?.pause(paused);$('play-symbol').textContent=paused?'▶':'Ⅱ';$('play-btn').setAttribute('aria-label',paused?'Play simulation':'Pause simulation')}
$('play-btn').addEventListener('click',()=>setPause(!paused));
function setSpeed(raw){
 const speed=Math.pow(10,(raw-31)/29);scene?.setSpeed(speed);
 $('speed-label').textContent=`${speed>=10?Math.round(speed):speed>=1?speed.toFixed(1):speed.toFixed(2)}× SIM SPEED`;
}
$('speed-slider').addEventListener('input',e=>setSpeed(Number(e.target.value)));
$('speed-reset').addEventListener('click',()=>{$('speed-slider').value=31;setSpeed(31)});
$('toggle-info').addEventListener('click',()=>{$('info-panel').style.display='none';$('restore-info').classList.add('visible');$('mobile-info-toggle').textContent='ⓘ  DETAILS'});
$('restore-info').addEventListener('click',()=>{$('info-panel').style.display='flex';$('restore-info').classList.remove('visible')});
$('mobile-nav-toggle').addEventListener('click',()=>{$('sidebar').classList.toggle('mobile-open');$('info-panel').classList.remove('mobile-open')});
$('mobile-info-toggle').addEventListener('click',()=>{$('info-panel').style.display='flex';$('info-panel').classList.toggle('mobile-open');$('sidebar').classList.remove('mobile-open')});
let toastTimer;
function showToast(message){const el=$('toast');el.textContent=message;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),3000)}
$('fullscreen-btn').addEventListener('click',()=>{if(document.fullscreenElement)document.exitFullscreen();else document.documentElement.requestFullscreen?.().catch(()=>showToast('Fullscreen is unavailable in this browser.'))});
$('help-btn').addEventListener('click',()=>$('help-dialog').showModal());
$('close-help').addEventListener('click',()=>$('help-dialog').close());
$('start-exploring').addEventListener('click',()=>$('help-dialog').close());
window.addEventListener('hashchange',()=>{const id=location.hash.slice(1).toLowerCase();if(BY_ID[id])navigate(id,{skipHash:true})});
window.addEventListener('keydown',e=>{
 const editing=['INPUT','TEXTAREA'].includes(document.activeElement?.tagName);
 if(e.key==='Escape'){document.querySelectorAll('.mobile-open').forEach(el=>el.classList.remove('mobile-open'));document.activeElement.blur();return}
 if(e.key==='/'&&!editing){e.preventDefault();$('search').focus();return}
 if(editing||$('help-dialog').open)return;
 if(e.code==='Space'){e.preventDefault();setPause(!paused)}
 if(e.key==='ArrowRight')step(1);
 if(e.key==='ArrowLeft')step(-1);
 if(e.key.toLowerCase()==='r'){scene?.reset();navigate('saturn')}
});
// Labels are DOM so they remain sharp on high-density screens.
const labelMap=new Map();
for(const d of BODIES.filter(v=>v.group!=='moon')){
 const el=document.createElement('div');el.className='world-label';el.textContent=d.name;el.style.display='none';$('world-labels').appendChild(el);labelMap.set(d.id,el);
}
let lastLabels=0;
function tickLabels(now){
 requestAnimationFrame(tickLabels);
 if(!scene||now-lastLabels<85)return;lastLabels=now;
 for(const [id,el] of labelMap){
  const selected=id===active;
  if(scene.state.distance>290&&id!=='sun'){el.style.display='none';continue}
  const position=scene.getScreenPosition(id);
  if(!position){el.style.display='none';continue}
  const isFar=position.depth>120&&scene.state.distance<120;
  if(isFar){el.style.display='none';continue}
  el.style.display='flex';el.style.left=position.x+'px';el.style.top=position.y+'px';el.classList.toggle('selected',selected);
 }
}
requestAnimationFrame(tickLabels);

try{
 scene=await createSolarScene($('application'),id=>{active=id;updateInfo(id);history.replaceState(null,'','#'+id)});
 window.HELIOS_READY=true;
 setSpeed(31);
 const hash=location.hash.slice(1).toLowerCase();if(BY_ID[hash])navigate(hash,{skipHash:true});
 const loader=$('loading-screen');loader.classList.add('done');setTimeout(()=>loader.remove(),1300);
}catch(error){
 console.error('Helios Atlas boot failed:',error);
 $('loading-message').textContent='UNABLE TO START PLAYCANVAS: '+(error?.message||String(error));
 $('loading-message').style.color='#ffb5a8';
 const link=document.createElement('a');link.href='https://developer.playcanvas.com/user-manual/engine/standalone/';link.target='_blank';link.textContent='PLAYCANVAS SETUP GUIDE ↗';link.style='font-size:12px;color:#e6bf97;margin-top:14px';$('loading-screen').appendChild(link);
}
