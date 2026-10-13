/* One owned timer per mounted carousel; no dependencies or persistent storage. */
(() => {
  'use strict';
  const esc = text => String(text ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const saved = {index: 0, paused: false, reducedConsent: false};
  let cleanup = () => {};
  const selection = () => window.MUSEUM_CURATOR_SELECTION || {workIds: []};
  function render({byId,heading='h2'}) {
    const config = selection();
    const items = [...new Set(config.workIds || [])].map(id => byId.get(id)).filter(w => w?.image && w.type !== 'video');
    const intro = config.intro || '由馆长选出的作品，沿着图像慢慢看。';
    const tag = heading === 'h1' ? 'h1' : 'h2';
    const header = `<header class="curator-heading"><div><div class="eyebrow">CURATOR'S CHOICE</div><${tag} id="curator-title">${esc(config.title || '馆长推荐')}</${tag}><p>${esc(intro)}</p></div><a class="text-link" href="#/curator">打开推荐展墙 ↗</a></header>`;
    if (!items.length) return `<section class="curator-carousel curator-empty" aria-labelledby="curator-title">${header}<p>推荐清单正在核对，确认后再放入作品。</p></section>`;
    const index = saved.index % items.length;
    const slide = (work, clone = false, i = -1) => `<figure class="curator-slide"${clone ? ' aria-hidden="true" inert' : ` data-curator-index="${i}" aria-hidden="${i !== index}"${i !== index ? ' inert' : ''}`}><a class="curator-art" href="#/work/${encodeURIComponent(work.id)}"${clone ? ' tabindex="-1"' : ''}><img src="${esc(work.image)}" width="${work.width}" height="${work.height}" alt="${esc(work.alt)}" loading="lazy" decoding="async"></a><figcaption><span>NO. ${esc(work.number)}</span><h3>${esc(work.title)}</h3><p>${esc(work.wallText)}</p><a class="text-link" href="#/work/${encodeURIComponent(work.id)}"${clone ? ' tabindex="-1"' : ''}>走近这件作品 ↗</a></figcaption></figure>`;
    const slides = items.length > 1 ? slide(items.at(-1),true) + items.map((w,i) => slide(w,false,i)).join('') + slide(items[0],true) : slide(items[0],false,0);
    return `<section class="curator-carousel" aria-labelledby="curator-title" aria-roledescription="轮播" data-curator-count="${items.length}" data-curator-current="${index}">${header}<div class="curator-controls"><button type="button" data-curator-step="-1" aria-label="上一件推荐作品"${items.length===1?' disabled':''}>←</button><span class="curator-position">${index+1} / ${items.length}</span><button type="button" data-curator-step="1" aria-label="下一件推荐作品"${items.length===1?' disabled':''}>→</button><button type="button" class="curator-toggle"${items.length===1?' disabled':''}>暂停循环</button><span class="curator-state" role="status"></span></div><div class="curator-viewport"><div class="curator-track" style="transform:translateX(-${items.length>1?index+1:index}00%)">${slides}</div></div><div class="curator-announcement sr-only" aria-live="polite" aria-atomic="true"></div></section>`;
  }
  function mount() {
    cleanup();
    const root = document.querySelector('.curator-carousel[data-curator-count]');
    if (!root) {cleanup = () => {}; return;}
    const controller = new AbortController(), config = selection();
    const listen = (node,event,fn) => node.addEventListener(event,fn,{signal:controller.signal});
    const track = root.querySelector('.curator-track'), viewport = root.querySelector('.curator-viewport');
    const originals = [...root.querySelectorAll('[data-curator-index]')];
    const count = originals.length, reduced = matchMedia('(prefers-reduced-motion: reduce)'), hover = matchMedia('(hover: hover)');
    const controls = [...root.querySelectorAll('[data-curator-step]')], toggle = root.querySelector('.curator-toggle');
    const interval = Math.max(1000,Number(config.intervalMs) || 6000);
    let index = saved.index % count, position = count>1 ? index+1 : index;
    let timer = null, transitionTimer = null, moving = false, destroyed = false, restoreFocus = false;
    const reasons = new Set();
    if (document.hidden) reasons.add('hidden');
    const wanted = () => count>1 && !saved.paused && (!reduced.matches || saved.reducedConsent);
    const cancel = () => {if(timer!==null){clearTimeout(timer);timer=null;}};
    function sync() {
      cancel();
      const playing = wanted() && !reasons.size && !moving && !destroyed;
      root.dataset.curatorPlaying = String(playing);
      root.dataset.curatorTimer = '0';
      toggle.textContent = wanted() ? '暂停循环' : '开始循环';
      root.querySelector('.curator-state').textContent = count===1 ? '仅一件作品' : !wanted() ? '已暂停' : reasons.size ? '互动或离开视野时暂停' : '循环观看中';
      if(playing){timer=setTimeout(()=>{timer=null;advance(1,false);},interval);root.dataset.curatorTimer='1';}
    }
    function update(manual) {
      root.dataset.curatorCurrent = String(index);
      root.querySelector('.curator-position').textContent = `${index+1} / ${count}`;
      originals.forEach((slide,i)=>{slide.inert=i!==index;slide.setAttribute('aria-hidden',String(i!==index));});
      if(manual) root.querySelector('.curator-announcement').textContent = `${index+1} / ${count}，${originals[index].querySelector('h3').textContent}`;
      saved.index = index;
    }
    function settle() {
      if(!moving || destroyed) return;
      clearTimeout(transitionTimer);transitionTimer=null;
      position = count>1 ? index+1 : index;
      track.style.transition = 'none';track.style.transform=`translateX(-${position*100}%)`;
      moving=false;root.dataset.curatorMoving='false';controls.forEach(b=>b.disabled=count<2);
      if(restoreFocus){restoreFocus=false;originals[index].querySelector('a').focus({preventScroll:true});}
      sync();
    }
    function advance(direction,manual) {
      if(count<2 || moving || destroyed) return;
      cancel();restoreFocus=manual&&viewport.contains(document.activeElement);moving=true;root.dataset.curatorMoving='true';controls.forEach(b=>b.disabled=true);
      // Flush the clone-boundary reset before starting the next movement.
      track.getBoundingClientRect();
      track.style.transition = reduced.matches ? 'none' : 'transform 320ms ease';
      position += direction;index=(index+direction+count)%count;
      track.style.transform=`translateX(-${position*100}%)`;update(manual);
      if(reduced.matches) settle();
      else transitionTimer=setTimeout(settle,420);
      sync();
    }
    listen(track,'transitionend',event=>{if(event.target===track&&event.propertyName==='transform')settle();});
    controls.forEach(button=>listen(button,'click',()=>advance(Number(button.dataset.curatorStep),true)));
    listen(toggle,'click',()=>{
      if(wanted()) saved.paused=true;
      else {saved.paused=false;saved.reducedConsent=true;reasons.delete('focus');}
      sync();
    });
    listen(viewport,'pointerenter',()=>{if(hover.matches){reasons.add('hover');sync();}});
    listen(viewport,'pointerleave',()=>{reasons.delete('hover');sync();});
    listen(root,'focusin',event=>{if(event.target!==toggle){reasons.add('focus');sync();}});
    listen(root,'focusout',event=>{if(!root.contains(event.relatedTarget)){reasons.delete('focus');sync();}});
    listen(document,'visibilitychange',()=>{document.hidden?reasons.add('hidden'):reasons.delete('hidden');sync();});
    listen(reduced,'change',()=>{saved.reducedConsent=false;sync();});
    listen(viewport,'keydown',event=>{
      if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();advance(event.key==='ArrowLeft'?-1:1,true);}
    });
    let start = null;
    listen(viewport,'touchstart',event=>{const t=event.touches[0];start=t?{x:t.clientX,y:t.clientY}:null;});
    listen(viewport,'touchend',event=>{
      if(!start)return;const t=event.changedTouches[0],dx=t.clientX-start.x,dy=t.clientY-start.y;start=null;
      if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)){if(event.cancelable)event.preventDefault();advance(dx<0?1:-1,true);}
    });
    listen(viewport,'touchcancel',()=>{start=null;});
    const observer = new IntersectionObserver(entries=>{entries[0].isIntersecting?reasons.delete('offscreen'):reasons.add('offscreen');sync();},{threshold:0.1});
    observer.observe(root);
    update(false);sync();
    cleanup = () => {destroyed=true;cancel();clearTimeout(transitionTimer);controller.abort();observer.disconnect();root.dataset.curatorTimer='0';};
  }
  window.MuseumCurator = {render,mount,unmount(){cleanup();cleanup=()=>{};}};
})();
