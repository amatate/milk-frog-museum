/* Original procedural drawing and native scrolling. No tracking or external assets. */
(() => {
  'use strict';
  let cleanup = () => {};
  window.MuseumExperience = {
    unmount() { cleanup(); cleanup = () => {}; },
    mount() {
      const canvas = document.getElementById('gravity-canvas');
      const visual = canvas?.parentElement;
      const wall = document.querySelector('.hall-wall');
      if (!visual || !wall) return;
      const controller = new AbortController();
      const listen = (node,event,fn,options={}) => node.addEventListener(event,fn,{...options,signal:controller.signal});
      const motion = matchMedia('(prefers-reduced-motion: reduce)');
      const mobile = matchMedia('(max-width: 760px)');
      const lowDevice = navigator.connection?.saveData || (navigator.deviceMemory && navigator.deviceMemory<=2) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency<=2);
      let staticMode = motion.matches || !!lowDevice, visible = true, frame = 0, mode = 'frog', width=0,height=0,last=0,slow=0,draws=0;
      const context = canvas.getContext('2d',{alpha:true});
      const pointer = {x:-10000,y:-10000};
      const points=[];
      const ellipse=(x,y,cx,cy,rx,ry)=>((x-cx)/rx)**2+((y-cy)/ry)**2<1;
      for(let y=-.68;y<.77;y+=.05) for(let x=-.5;x<.5;x+=.05){
        if(ellipse(x,y,0,.10,.34,.48)||ellipse(x,y,0,-.36,.24,.29)||ellipse(x,y,-.32,.17,.085,.28)||ellipse(x,y,.32,.17,.085,.28)||ellipse(x,y,-.13,.59,.09,.15)||ellipse(x,y,.13,.59,.09,.15)){
          let color='#ffe39a';
          if(ellipse(x,y,0,.2,.19,.23))color='#fff2c9';
          const left=ellipse(x,y,-.105,-.32,.068,.068),right=ellipse(x,y,.105,-.32,.068,.068);
          if(left||right)color='#628557';
          if(ellipse(x,y,-.105,-.32,.03,.04)||ellipse(x,y,.105,-.32,.03,.04))color='#102719';
          if(y>.62 || (Math.abs(x)>.30 && y>.3))color='#668261';
          points.push({x:0,y:0,tx:0,ty:0,bx:x,by:y,color,phase:points.length*.81});
        }
      }
      const centers=[[.25,.23],[.73,.23],[.5,.5],[.25,.78],[.74,.78]];
      function targets(reset=false){
        const scale=Math.min(width,height)*.68;
        points.forEach((p,i)=>{
          if(mode==='frog'){p.tx=width*.5+p.bx*scale;p.ty=height*.46+p.by*scale;}
          else {const c=centers[i%5],a=i*2.39996,r=(16+Math.sqrt(i/5)*8)*Math.min(1,width/650);p.tx=width*c[0]+Math.cos(a)*r;p.ty=height*c[1]+Math.sin(a)*r;}
          if(reset||staticMode){p.x=p.tx;p.y=p.ty;}
        });
      }
      function onScreen(){const r=visual.getBoundingClientRect();return !document.hidden&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth;}
      function draw(time=0){
        if(!context||!visible||!onScreen())return;
        context.clearRect(0,0,width,height);
        for(const p of points){
          if(staticMode){p.x=p.tx;p.y=p.ty;}
          else {let dx=p.x-pointer.x,dy=p.y-pointer.y,d=Math.hypot(dx,dy);let force=d>0&&d<95?(95-d)*.07:0;p.x+=(p.tx-p.x)*.045+(d?dx/d*force:0);p.y+=(p.ty-p.y)*.045+(d?dy/d*force:0);}
          context.beginPath();context.fillStyle=p.color;
          context.arc(p.x,p.y,Math.max(1.25,Math.min(width,height)/240),0,Math.PI*2);context.fill();
        }
        draws++;canvas.dataset.draws=String(draws);
      }
      function stop(){cancelAnimationFrame(frame);frame=0;last=0;canvas.dataset.motion=staticMode?'static':'paused';}
      function tick(time){
        frame=0;visible=onScreen();if(!visible||document.hidden||staticMode){stop();return;}
        if(last&&time-last<32){frame=requestAnimationFrame(tick);return;}
        if(last&&time-last>85)slow++;else slow=Math.max(0,slow-1);
        last=time;if(slow>18){staticMode=true;targets(true);draw();stop();return;}
        draw(time);canvas.dataset.motion='running';frame=requestAnimationFrame(tick);
      }
      function update(){
        stop();if(staticMode){targets(true);draw();}else if(visible&&!document.hidden){canvas.dataset.motion='running';frame=requestAnimationFrame(tick);}
      }
      function resize(){
        const r=visual.getBoundingClientRect();width=r.width;height=r.height;visible=onScreen();
        const dpi=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(width*dpi);canvas.height=Math.round(height*dpi);context?.setTransform(dpi,0,0,dpi,0,0);targets(true);draw();update();
      }
      if(!context)visual.classList.add('no-canvas');
      listen(canvas,'pointermove',event=>{if(staticMode)return;const r=canvas.getBoundingClientRect();pointer.x=event.clientX-r.left;pointer.y=event.clientY-r.top;},{passive:true});
      listen(canvas,'pointerleave',()=>{pointer.x=pointer.y=-10000;},{passive:true});
      listen(document,'visibilitychange',()=>{visible=onScreen();update();});
      listen(window,'scroll',()=>{const next=onScreen();if(next!==visible){visible=next;update();}},{passive:true});
      listen(motion,'change',()=>{staticMode=motion.matches||!!lowDevice;targets(true);update();});
      const enter=document.querySelector('[data-enter-halls]');
      listen(enter,'click',()=>{mode=mode==='frog'?'halls':'frog';visual.classList.toggle('halls-open',mode==='halls');document.getElementById('gravity-hall-zones').hidden=mode!=='halls';enter.setAttribute('aria-expanded',String(mode==='halls'));enter.textContent=mode==='halls'?'回到轮廓 ↗':'展开五厅 ↗';canvas.dataset.mode=mode;targets(staticMode);draw();});
      const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting&&onScreen();update();},{threshold:.01});intersection.observe(visual);
      const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(visual);resize();canvas.dataset.mode=mode;canvas.dataset.particles=String(points.length);canvas.dataset.lowDevice=String(!!lowDevice);
      let active=0,origin=null,dragged=false,suppressClick=false;
      const panels=[...wall.querySelectorAll('.wall-panel')];
      const index=()=>{if(mobile.matches)return 0;let best=0,min=Infinity;panels.forEach((p,i)=>{const d=Math.abs(p.offsetLeft-panels[0].offsetLeft-wall.scrollLeft);if(d<min){min=d;best=i;}});return best;};
      function position(){active=index();document.querySelector('.wall-position').textContent=`${String(active+1).padStart(2,'0')} / 05`;document.querySelector('[data-wall-step="-1"]').disabled=active===0;document.querySelector('[data-wall-step="1"]').disabled=active===panels.length-1;}
      document.querySelectorAll('[data-wall-step]').forEach(button=>listen(button,'click',()=>{const next=Math.min(panels.length-1,Math.max(0,index()+Number(button.dataset.wallStep)));wall.scrollTo({left:panels[next].offsetLeft-panels[0].offsetLeft,behavior:motion.matches?'instant':'smooth'});}));
      listen(wall,'scroll',position,{passive:true});
      listen(wall,'keydown',event=>{if(event.target!==wall||mobile.matches)return;if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();document.querySelector(`[data-wall-step="${event.key==='ArrowLeft'?-1:1}"]`).click();}});
      listen(wall,'pointerdown',event=>{if(event.pointerType!=='mouse'||event.button!==0||mobile.matches||event.target.closest('button'))return;origin={x:event.clientX,y:event.clientY,scroll:wall.scrollLeft};dragged=false;});
      listen(window,'pointermove',event=>{if(!origin)return;const dx=event.clientX-origin.x,dy=event.clientY-origin.y;if(Math.abs(dx)>8&&Math.abs(dx)>Math.abs(dy)){dragged=true;wall.classList.add('is-dragging');wall.style.scrollSnapType='none';wall.scrollLeft=origin.scroll-dx;}});
      listen(window,'pointerup',()=>{if(!origin)return;origin=null;if(dragged){suppressClick=true;wall.classList.remove('is-dragging');wall.style.scrollSnapType='';position();setTimeout(()=>{suppressClick=false;},0);}});
      listen(wall,'click',event=>{if(suppressClick){event.preventDefault();event.stopPropagation();}}, {capture:true});
      listen(wall,'dragstart',event=>event.preventDefault());
      listen(mobile,'change',()=>{wall.scrollLeft=0;position();});position();
      cleanup=()=>{stop();controller.abort();intersection.disconnect();resizeObserver.disconnect();};
    }
  };
})();
