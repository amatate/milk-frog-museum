/* Manual artwork selection and native scrolling. No animation loop or dependencies. */
(() => {
  'use strict';
  const header = document.querySelector('.masthead');
  const menuButton = header?.querySelector('.mobile-menu-toggle');
  const menu = document.getElementById('museum-mobile-menu');
  if (header && menuButton && menu) {
    const mobile = matchMedia('(max-width: 760px)');
    let opened = false;
    const setMenu = (open, returnFocus = false) => {
      opened = mobile.matches && open;
      header.dataset.menuOpen = String(opened);
      menuButton.setAttribute('aria-expanded', String(opened));
      menu.hidden = mobile.matches && !opened;
      menu.inert = mobile.matches && !opened;
      if (returnFocus && mobile.matches) menuButton.focus({preventScroll:true});
    };
    menuButton.addEventListener('click', () => setMenu(!opened));
    header.addEventListener('click', event => {
      const anchor = event.target.closest('a');
      if (anchor && opened) setMenu(false, anchor.getAttribute('href') === location.hash);
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && opened) {
        event.preventDefault();setMenu(false, true);
      }
    });
    document.addEventListener('click', event => {
      if (opened && !header.contains(event.target)) setMenu(false);
    });
    window.addEventListener('hashchange', () => setMenu(false));
    mobile.addEventListener('change', () => setMenu(false));
    setMenu(false);
  }
  let cleanup = () => {};
  window.MuseumExperience = {
    unmount() { cleanup(); cleanup = () => {}; },
    mount({halls, byId, initialHall, initialWork}) {
      const cover = document.querySelector('.exhibition-cover');
      const wall = document.querySelector('.hall-wall');
      if (!cover || !wall) return;
      const controller = new AbortController();
      const listen = (node,event,fn,options={}) => node.addEventListener(event,fn,{...options,signal:controller.signal});
      const motion = matchMedia('(prefers-reduced-motion: reduce)');
      const mobile = matchMedia('(max-width: 760px)');
      const art = cover.querySelector('.cover-art');
      const image = art.querySelector('img');
      const buttons = [...cover.querySelectorAll('[data-cover-hall]')];
      const select = id => {
        const hall = halls.find(h => h.id === id);
        if (!hall) return;
        const work = byId.get(id === initialHall ? initialWork : hall.anchorWorkId);
        if (!work) return;
        const workUrl = '#/work/' + encodeURIComponent(work.id);
        image.alt = work.alt;
        image.width = work.width;
        image.height = work.height;
        image.style.aspectRatio = work.width + '/' + work.height;
        image.srcset = work.thumbnail + ' ' + Math.min(work.width,600,Math.round(600*work.width/work.height)) + 'w, ' + work.image + ' ' + work.width + 'w';
        image.src = work.image;
        art.href = workUrl;
        art.setAttribute('aria-label', '观看' + work.title);
        cover.querySelector('.cover-hall-number').textContent = '第 ' + hall.number + ' 厅 · ' + hall.workCount + ' 件';
        cover.querySelector('.cover-work-title').textContent = work.title;
        cover.querySelector('.english-title').textContent = work.titleEn;
        cover.querySelector('.cover-question').textContent = hall.question;
        cover.querySelector('.cover-work-link').href = workUrl;
        const hallLink = cover.querySelector('.cover-hall-link');
        hallLink.href = '#/hall/' + encodeURIComponent(hall.id);
        hallLink.textContent = '进入' + hall.title + ' ↗';
        cover.querySelector('.cover-status').textContent = '第 ' + hall.number + ' 厅：' + hall.title + '。当前作品：' + work.title + '。';
        buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.coverHall === id)));
      };
      buttons.forEach(button => listen(button,'click',()=>select(button.dataset.coverHall)));
      let origin = null, dragged = false, suppressClick = false, clickTimer = 0;
      const panels = [...wall.querySelectorAll('.wall-panel')];
      const index = () => {
        if (mobile.matches) return 0;
        let best=0,min=Infinity;
        panels.forEach((panel,i)=>{const distance=Math.abs(panel.offsetLeft-panels[0].offsetLeft-wall.scrollLeft);if(distance<min){min=distance;best=i;}});
        return best;
      };
      const previous = document.querySelector('[data-wall-step="-1"]');
      const next = document.querySelector('[data-wall-step="1"]');
      function position() {
        const active = index();
        document.querySelector('.wall-position').textContent = String(active+1).padStart(2,'0') + ' / 05';
        previous.disabled = active === 0;
        next.disabled = active === panels.length-1;
      }
      document.querySelectorAll('[data-wall-step]').forEach(button=>listen(button,'click',()=>{
        const target = Math.min(panels.length-1,Math.max(0,index()+Number(button.dataset.wallStep)));
        wall.scrollTo({left:panels[target].offsetLeft-panels[0].offsetLeft,behavior:motion.matches?'instant':'smooth'});
      }));
      listen(wall,'scroll',position,{passive:true});
      listen(wall,'keydown',event=>{
        if(event.target!==wall||mobile.matches)return;
        if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
          event.preventDefault();(event.key==='ArrowLeft'?previous:next).click();
        }
      });
      listen(wall,'pointerdown',event=>{
        if(event.pointerType!=='mouse'||event.button!==0||mobile.matches||event.target.closest('button'))return;
        origin={x:event.clientX,y:event.clientY,scroll:wall.scrollLeft};dragged=false;
      });
      listen(window,'pointermove',event=>{
        if(!origin)return;
        const dx=event.clientX-origin.x,dy=event.clientY-origin.y;
        if(Math.abs(dx)>8&&Math.abs(dx)>Math.abs(dy)){
          dragged=true;wall.classList.add('is-dragging');wall.style.scrollSnapType='none';wall.scrollLeft=origin.scroll-dx;
        }
      });
      const endDrag = () => {
        if(!origin)return;
        origin=null;
        if(dragged){
          suppressClick=true;wall.classList.remove('is-dragging');wall.style.scrollSnapType='';position();
          clearTimeout(clickTimer);clickTimer=setTimeout(()=>{suppressClick=false;},0);
        }
      };
      listen(window,'pointerup',endDrag);
      listen(window,'pointercancel',endDrag);
      listen(wall,'click',event=>{if(suppressClick){event.preventDefault();event.stopPropagation();}},{capture:true});
      listen(wall,'dragstart',event=>event.preventDefault());
      listen(mobile,'change',()=>{wall.scrollLeft=0;position();});
      position();
      cleanup=()=>{controller.abort();clearTimeout(clickTimer);};
    }
  };
})();
