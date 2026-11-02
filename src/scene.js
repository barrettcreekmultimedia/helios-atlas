import * as pc from 'playcanvas';
import { BODIES, BY_ID } from './data.js';

const TAU=Math.PI*2;
const rand=(a,b)=>a+Math.random()*(b-a);
const rad=n=>n*Math.PI/180;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function color(hex){let s=hex.replace('#','');return new pc.Color(parseInt(s.slice(0,2),16)/255,parseInt(s.slice(2,4),16)/255,parseInt(s.slice(4,6),16)/255)}
function mat(hex,opacity=1){
 const m=new pc.StandardMaterial();m.diffuse=color(hex);m.emissive=color(hex);m.emissiveIntensity=.85;
 m.useLighting=false;m.opacity=opacity;
 if(opacity<1){m.blendType=pc.BLEND_NORMAL;m.depthWrite=false;m.cull=pc.CULLFACE_NONE;}
 m.update();return m;
}
function createLineCloud(app, name, positions, hex, opacity=1, primitive=pc.PRIMITIVE_POINTS){
 const mesh=new pc.Mesh(app.graphicsDevice);mesh.setPositions(positions);mesh.update(primitive);
 const ent=new pc.Entity(name);const mi=new pc.MeshInstance(mesh,mat(hex,opacity),ent);
 ent.addComponent('render',{meshInstances:[mi]});app.root.addChild(ent);return ent;
}
function makeOrbit(app, radius, tilt, hex, opacity){
 const pts=[],N=240;
 for(let i=0;i<N;i++){
  for(const f of [i/N,(i+1)/N]){
   const a=f*TAU;pts.push(radius*Math.cos(a),Math.sin(a*1.33)*Math.sin(rad(tilt||0))*radius*.33,radius*Math.sin(a));
  }
 }
 return createLineCloud(app,'Orbit / '+radius.toFixed(1),pts,hex,opacity,pc.PRIMITIVE_LINES);
}
function makeAnnulus(app,parent,r0,r1,hex,alpha){
 const n=128, pos=[],norm=[],uv=[],idx=[];
 for(let i=0;i<=n;i++){
  const a=i/n*TAU,cs=Math.cos(a),sn=Math.sin(a);
  for(const r of [r0,r1]){pos.push(cs*r,0,sn*r);norm.push(0,1,0);uv.push(i/n,(r-r0)/(r1-r0))}
  if(i<n){let j=i*2;idx.push(j,j+1,j+2,j+1,j+3,j+2)}
 }
 const mesh=new pc.Mesh(app.graphicsDevice);mesh.setPositions(pos);mesh.setNormals(norm);mesh.setUvs(0,uv);mesh.setIndices(idx);mesh.update();
 const ent=new pc.Entity('Ring');const material=mat(hex,alpha);material.cull=pc.CULLFACE_NONE;material.update();
 const mi=new pc.MeshInstance(mesh,material,ent);ent.addComponent('render',{meshInstances:[mi]});parent.addChild(ent);return ent;
}
function cloud(app, count, mode, radii, colors, opacity=1){
 const packs=colors.map(()=>[]);
 for(let i=0;i<count;i++){
   const a=rand(0,TAU),r=rand(radii[0],radii[1]);let xx,yy,zz;
   if(mode==='shell'){
     const u=rand(-1,1),t=Math.sqrt(1-u*u);const rr=Math.cbrt(rand(radii[0]**3,radii[1]**3));
     xx=Math.cos(a)*t*rr;yy=u*rr;zz=Math.sin(a)*t*rr;
   }else{
     const radial=r+rand(-1,1)*.4;
     xx=Math.cos(a)*radial;zz=Math.sin(a)*radial;yy=rand(-1,1)*(mode==='disk'?.9:3.8)*(radial/radii[1])+.3*Math.sin(a*2);
   }
   packs[i%packs.length].push(xx,yy,zz);
 }
 return packs.map((points,i)=>createLineCloud(app,mode+' '+i,points,colors[i],opacity));
}
function loadTexture(device,file,onDone){
 const image=new Image();image.onload=()=>{
   try{const tex=new pc.Texture(device,{format:pc.PIXELFORMAT_RGBA8,magFilter:pc.FILTER_LINEAR,minFilter:pc.FILTER_LINEAR_MIPMAP_LINEAR,mipmaps:true});tex.setSource(image);onDone(tex)}catch(e){console.warn('Texture error:',file,e)}
 };image.onerror=()=>console.warn('Missing local texture:',file);image.src=`assets/${file}.jpg`;
}

export async function createSolarScene(canvas, status){
 const device=await pc.createGraphicsDevice(canvas,{deviceTypes:[pc.DEVICETYPE_WEBGL2],antialias:true});
 device.maxPixelRatio=Math.min(window.devicePixelRatio||1,1.8);
 const options=new pc.AppOptions();options.graphicsDevice=device;
 options.componentSystems=[pc.RenderComponentSystem,pc.CameraComponentSystem,pc.LightComponentSystem];
 const app=new pc.AppBase(canvas);app.init(options);app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);app.setCanvasResolution(pc.RESOLUTION_AUTO);
 app.scene.ambientLight=new pc.Color(.27,.29,.34);
 const cam=new pc.Entity('Explorer Camera');cam.addComponent('camera',{clearColor:new pc.Color(.005,.008,.019),nearClip:.06,farClip:4200,fov:51});app.root.addChild(cam);
 const sunlight=new pc.Entity('Sun Light');sunlight.addComponent('light',{type:'point',color:new pc.Color(1,.82,.64),intensity:18,range:350,castShadows:false});app.root.addChild(sunlight);
 // A randomized stellar backdrop, deliberately centered around the solar system.
 const stars=cloud(app,8200,'shell',[1450,1640],['#8b9fbb','#d8e6f2','#cbb2a4','#ffffff'],1);
 const asteroids=cloud(app,2600,'disk',[36.0,44.2],['#9c7a60','#d6b58b','#746f74'],.67);
 const kuiper=cloud(app,3800,'thickdisk',[106,139],['#638eb8','#a5c5da','#73819e'],.64);
 const oort=cloud(app,9500,'shell',[186,330],['#55749d','#869bb6','#b4cee2'],.52);
 let showOrbits=true,showAsteroids=true,showKuiper=true,showOort=true,showDwarfs=true,showMoons=true;
 const objects=new Map(),orbits=[];
 for(const d of BODIES){
   const entity=new pc.Entity(d.name);app.root.addChild(entity);
   const visual=new pc.Entity(d.name+' surface');entity.addChild(visual);
   const material=new pc.StandardMaterial();
   material.diffuse=new pc.Color(1,1,1);
   material.emissive=new pc.Color(d.id==='sun'?1:.13,d.id==='sun'?.62:.13,d.id==='sun'?.26:.16);
   material.emissiveIntensity=d.id==='sun'?2.6:.55;
   material.gloss=.25;material.metalness=0;
   material.update();
   visual.addComponent('render',{type:'sphere',material});
   // PlayCanvas built-in sphere primitive has radius 0.5.
   visual.setLocalScale(d.size*2,d.size*2,d.size*2);
   if(d.id==='haumea')visual.setLocalScale(d.size*2*1.45,d.size*2*.74,d.size*2*.92);
   loadTexture(device,d.texture,tex=>{material.diffuseMap=tex;if(d.id==='sun')material.emissiveMap=tex;material.update()});
   if(d.id==='sun'){
      for(const [s,a] of [[1.18,.08],[1.37,.035],[1.66,.013]]){
       const shell=new pc.Entity('Solar halo');shell.addComponent('render',{type:'sphere',material:mat('#ff9f40',a)});
       shell.setLocalScale(d.size*2*s,d.size*2*s,d.size*2*s);entity.addChild(shell);
      }
   }
   if(d.id==='saturn'){
      const tilt=new pc.Entity('Ring plane');tilt.setLocalEulerAngles(23,0,17);entity.addChild(tilt);
      for(const band of [[4.3,4.8,'#977e60',.48],[4.86,5.44,'#e1c69f',.72],[5.5,6.18,'#cfb897',.54],[6.28,7.3,'#e0cba4',.69],[7.42,8.5,'#9b8670',.38]])makeAnnulus(app,tilt,...band);
   }
   if(d.id==='uranus'){
     const tilt=new pc.Entity('Uranus rings');tilt.setLocalEulerAngles(76,0,25);entity.addChild(tilt);
     makeAnnulus(app,tilt,2.55,2.72,'#a0d9de',.24);makeAnnulus(app,tilt,2.91,3.04,'#a0d9de',.18);
   }
   const body={data:d,entity,visual,angle:rad(d.angle||0),position:new pc.Vec3()};objects.set(d.id,body);
   if(d.group!=='moon'&&d.radius>0){const orbit=makeOrbit(app,d.radius,d.tilt,d.group==='dwarf'?'#607695':'#657997',d.group==='dwarf'?.17:.24);orbits.push({entity:orbit,data:d})}
 }
 // In-world region visibility is handled by the UI switches.
 const visibility=()=>{
  orbits.forEach(o=>o.entity.enabled=showOrbits && (o.data.group!=='dwarf'||showDwarfs));
  asteroids.forEach(e=>e.enabled=showAsteroids);
  kuiper.forEach(e=>e.enabled=showKuiper);
  oort.forEach(e=>e.enabled=showOort);
  for(const b of objects.values())if(b.data.group==='dwarf'||b.data.group==='moon')b.entity.enabled=b.data.group==='dwarf'?showDwarfs:showMoons;
 };
 visibility();
 let time=0,speed=1,paused=false;
 let yaw=-.63,pitch=.33,distance=26,desiredDistance=26;
 const target=new pc.Vec3(),desiredTarget=new pc.Vec3();
 let selectedId='saturn',mode='focus',currentId='saturn',transition=0;
 const setFocus=(id,instant=false)=>{
  const d=BY_ID[id];if(!d)return;
  selectedId=id;currentId=id;
  if(d.group==='region'){
    desiredTarget.set(0,0,0);
    if(id==='asteroids'){desiredDistance=117;pitch=.87;yaw=-.45;}
    if(id==='kuiper'){desiredDistance=275;pitch=.7;yaw=-.45;}
    if(id==='oort'){desiredDistance=680;pitch=.42;yaw=-.6;}
    mode='region';
  }else{
    const obj=objects.get(id);
    if(obj)desiredTarget.copy(obj.position);
    desiredDistance=d.id==='sun'?31:Math.max(d.group==='moon'?6.8:8.3,d.size*(d.id==='saturn'?9.8:7.4));
    if(d.id==='saturn'){pitch=.32;yaw=-.65;}
    mode='focus';
  }
  if(instant){distance=desiredDistance;target.copy(desiredTarget)}
  transition=1;
 };
 const presets={
  system(){selectedId='sun';mode='overview';desiredTarget.set(0,0,0);desiredDistance=205;yaw=-.64;pitch=1.0;transition=1;},
  inner(){selectedId='earth';mode='overview';desiredTarget.set(0,0,0);desiredDistance=78;yaw=-.62;pitch=.94;transition=1;},
  outer(){setFocus('kuiper')},
  edge(){setFocus('oort')},
 };
 function updatePositions(dt){
  if(!paused)time+=dt*speed;
  for(const d of BODIES){
   const o=objects.get(d.id);
   if(d.group==='star'){o.entity.setPosition(0,0,0)}
   else if(d.group==='moon'){
     const p=objects.get(d.parent);const a=o.angle+time*(.19/Math.sqrt(d.orbitRadius));
     o.entity.setPosition(p.position.x+Math.cos(a)*d.orbitRadius,p.position.y+Math.sin(a*1.25)*d.orbitRadius*.24,p.position.z+Math.sin(a)*d.orbitRadius);
   }else{
     const a=o.angle+time*(.055/Math.sqrt(Math.max(.25,d.au)));
     const y=Math.sin(a*1.33)*Math.sin(rad(d.tilt||0))*d.radius*.33;
     o.entity.setPosition(d.radius*Math.cos(a),y,d.radius*Math.sin(a));
   }
   o.position.copy(o.entity.getPosition());
   if(d.group!=='moon')o.visual.rotateLocal(0,dt*speed*(d.group==='star'?1.8:6.5),0);
   else o.visual.rotateLocal(0,dt*speed*5,0);
  }
 }
 updatePositions(0);
 setFocus('saturn',true);
 app.on('update',dt=>{
   dt=Math.min(dt,.05);
   updatePositions(dt);
   const sel=objects.get(selectedId);
   if(mode==='focus'&&sel)desiredTarget.copy(sel.position);
   const f=1-Math.exp(-dt*(transition?3.5:5.5));
   target.lerp(target,desiredTarget,f);
   distance+=(desiredDistance-distance)*f;
   if(Math.abs(distance-desiredDistance)<.08)transition=0;
   // Camera around a moving target (spherical coordinates).
   const horizontal=Math.cos(pitch)*distance;
   const cx=target.x+Math.cos(yaw)*horizontal;
   const cy=target.y+Math.sin(pitch)*distance;
   const cz=target.z+Math.sin(yaw)*horizontal;
   cam.setPosition(cx,cy,cz);cam.lookAt(target);
   // Keep Oort particles out of closeups; render when the view reaches outer space.
   oort.forEach(e=>e.enabled=showOort && (distance>115||selectedId==='oort'));
 });
 app.start();
 const c=canvas;
 let down=null,dragged=false;
 c.addEventListener('pointerdown',e=>{if(e.button!==0)return;down={x:e.clientX,y:e.clientY,yaw,pitch};dragged=false;c.setPointerCapture(e.pointerId)});
 c.addEventListener('pointermove',e=>{
    if(!down)return;
    const dx=e.clientX-down.x,dy=e.clientY-down.y;
    if(Math.hypot(dx,dy)>4)dragged=true;
    yaw=down.yaw-dx*.006;pitch=clamp(down.pitch+dy*.005,.045,1.50);
 });
 c.addEventListener('pointerup',e=>{
   if(!down)return;const click=!dragged;down=null;
   if(!click)return;
   const bounds=c.getBoundingClientRect();const x=e.clientX-bounds.left,y=e.clientY-bounds.top;
   let chosen=null,best=90;
   for(const body of objects.values()){
     if(body.data.group==='moon'&&!showMoons)continue;
     if(body.data.group==='dwarf'&&!showDwarfs)continue;
     const p=cam.camera.worldToScreen(body.position);const distPx=Math.hypot(x-p.x,y-p.y);
     // Screen-space click radius includes the apparent sphere size.
     const apparent=clamp(100*body.data.size/Math.max(3,body.position.distance(cam.getPosition())),10,65);
     if(cam.forward.dot(new pc.Vec3().sub2(body.position,cam.getPosition()).normalize())>0 && distPx<Math.max(24,apparent)&&distPx<best){chosen=body.data.id;best=distPx}
   }
   if(chosen){setFocus(chosen);status?.(chosen)}
 });
 c.addEventListener('wheel',e=>{e.preventDefault();desiredDistance=clamp(desiredDistance*Math.exp(e.deltaY*.0013),4.3,1500);transition=1},{passive:false});
 // Touch pinch zoom without a separate mobile dependency.
 const touches=new Map();let pinch=null;
 c.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')touches.set(e.pointerId,[e.clientX,e.clientY])});
 c.addEventListener('pointermove',e=>{if(!touches.has(e.pointerId))return;touches.set(e.pointerId,[e.clientX,e.clientY]);if(touches.size===2){const v=[...touches.values()];const d=Math.hypot(v[0][0]-v[1][0],v[0][1]-v[1][1]);if(pinch)desiredDistance=clamp(desiredDistance*(pinch/d),4.3,1500);pinch=d}});
 const clearTouch=e=>{touches.delete(e.pointerId);pinch=null};c.addEventListener('pointerup',clearTouch);c.addEventListener('pointercancel',clearTouch);
 window.addEventListener('resize',()=>app.resizeCanvas());
 return {
  app,camera:cam,objects,
  get state(){return {selectedId,mode,paused,speed,distance}},
  select:setFocus,
  preset(name){presets[name]?.()},
  setSpeed(value){speed=Number(value)},
  pause(value){paused=!!value},
  setLayer(name,value){
   if(name==='orbits')showOrbits=value;
   if(name==='asteroids')showAsteroids=value;
   if(name==='kuiper')showKuiper=value;
   if(name==='oort')showOort=value;
   if(name==='dwarfs')showDwarfs=value;
   if(name==='moons')showMoons=value;
   visibility();
  },
  reset(){setFocus('saturn')},
  getScreenPosition(id){
   const b=objects.get(id);if(!b)return null;
   const p=cam.camera.worldToScreen(b.position);
   const viewport=canvas.getBoundingClientRect();
   const forward=new pc.Vec3().sub2(b.position,cam.getPosition()).normalize();
   const looking=cam.forward.dot(forward)>0;
   if(!looking||p.x<4||p.y<4||p.x>viewport.width-4||p.y>viewport.height-4)return null;
   return {x:p.x,y:p.y,depth:b.position.distance(cam.getPosition())};
  }
 };
}
