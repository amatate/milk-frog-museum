/* A buildless, GitHub Pages-safe museum. No cookies, storage, analytics or network APIs. */
(() => {
  'use strict';
  const data = window.MUSEUM_CATALOGUE;
  const main = document.getElementById('main');
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const typeNames = {image:'图像', '3d':'雕塑与姿态', video:'影像'};
  let filter = 'all';
  let previousRoute = '';
  if (!data || !Array.isArray(data.works) || !data.works.length) {
    main.innerHTML = '<section class="not-found"><h1>展厅暂时没有打开</h1><p>请刷新重试，或阅读<a class="text-link" href="catalogue.html">完整文字图录</a></p></section>';
    return;
  }
  const works = data.works;
  const museum = data.museum;
  const byId = new Map(works.map(work => [work.id, work]));
  const link = work => `#/work/${encodeURIComponent(work.id)}`;
  const number = work => escape(String(work.number).padStart(2,'0'));
  const picture = (work, cls = '', eager = false) => `<img class="${cls}" src="${escape(work.image)}" srcset="${escape(work.thumbnail)} 600w, ${escape(work.image)} ${work.width}w" sizes="${cls === 'hero-image' ? '(max-width:700px) 88vw, 58vw' : '(max-width:700px) 42vw, 29vw'}" width="${work.width}" height="${work.height}" alt="${escape(work.alt)}" loading="${eager ? 'eager' : 'lazy'}" decoding="async"${eager ? ' fetchpriority="high"' : ''}>`;
  const card = work => `<article class="art-card" data-work-id="${escape(work.id)}"><a href="${link(work)}"><div class="card-image">${picture(work)}${work.type !== 'image' ? `<span class="media-badge">${work.type === 'video' ? '▷ 影像' : '3D'}</span>` : ''}</div><div class="card-meta"><span>NO. ${number(work)} · ${escape(typeNames[work.type])}</span><span class="year">${escape(work.year)}</span></div><h3>${escape(work.title)}</h3><p class="english-title" lang="en">${escape(work.titleEn)}</p><p class="card-excerpt">${escape(work.wallText)}</p><span class="card-read">进入作品 <span aria-hidden="true">↗</span></span></a></article>`;
  function filters() {
    return `<div class="filters"><div class="filter-buttons" role="group" aria-label="按媒介筛选作品">${[['all','全部'],['image','图像'],['3d','雕塑与姿态'],['video','影像']].map(([value,label]) => `<button type="button" class="filter-button" data-filter="${value}" aria-pressed="${filter === value}">${label}</button>`).join('')}</div><span class="result-count" aria-live="polite" aria-atomic="true" id="result-count"></span></div><div class="gallery" id="gallery"></div>`;
  }
  function fillGallery() {
    const gallery = document.getElementById('gallery');
    if (!gallery) return;
    const visible = filter === 'all' ? works : works.filter(work => work.type === filter);
    gallery.innerHTML = visible.length ? visible.map(card).join('') : '<p class="empty">这一间还没有展品</p>';
    document.getElementById('result-count').textContent = `${String(visible.length).padStart(2,'0')} 件展品`;
    document.querySelectorAll('[data-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === filter)));
  }
  function home() {
    const featured = byId.get(museum.featuredId) || works.find(work => work.id.includes('forbidden')) || works[0];
    main.innerHTML = `<section class="home-intro"><div><div class="eyebrow">EST. 2026 &nbsp; / &nbsp; 常设展 · 永久营业</div><h1>${escape(museum.headline || '认真生活，偶尔像蛙。')}</h1></div><div class="intro-side"><p>${escape(museum.intro)}</p><a class="text-link" href="#/collection">浏览全部作品 <span class="arrow" aria-hidden="true">↓</span></a></div></section><section class="hero" aria-labelledby="featured-title"><a class="hero-art" href="${link(featured)}" aria-label="查看${escape(featured.title)}">${picture(featured,'hero-image',true)}</a><div class="hero-label"><div><div class="eyebrow hero-count">本日驻馆 &nbsp; / &nbsp; NO. ${number(featured)}</div><h2 id="featured-title">${escape(featured.title)}</h2><p class="english-title" lang="en">${escape(featured.titleEn)}</p><p class="wall-text">${escape(featured.wallText)}</p></div><a class="text-link" href="${link(featured)}">走近一点 <span class="arrow" aria-hidden="true">↗</span></a></div></section><section class="collection" aria-labelledby="collection-title"><div class="section-heading"><h2 id="collection-title">馆藏作品 <small>THE COLLECTION</small></h2><span class="eyebrow muted">图像 / 雕塑 / 影像</span></div>${filters()}</section><aside class="manifesto-strip"><div class="eyebrow">A NOTE FROM THE MUSEUM<br>本馆不负责解释宇宙</div><div><p>${escape(museum.statement || '当一个不太合时宜的身体，认真地站进一幅名画，意义就开始松动了。')}</p><a class="text-link" href="#/about">阅读本馆宣言 <span class="arrow" aria-hidden="true">↗</span></a></div></aside>`;
    fillGallery();
  }
  function collection() {
    main.innerHTML = `<section class="collection collection-head"><div class="eyebrow">THE COLLECTION / 常设展</div><h1>所有蛙，都在这里。</h1><p>沿着媒介走，也可以随便走。每一件作品都有自己的胡思乱想。</p>${filters()}</section>`;
    fillGallery();
  }
  function sources(work) {
    const source = work.source || {};
    const urls = work.sources || [];
    return `<section class="source-note" aria-label="作品关联与来源"><h3>关联与来源</h3>${source.title ? `<p>${escape(source.artist)}${source.artist ? ' · ' : ''}${escape(source.title)}${source.date ? ' · ' + escape(source.date) : ''}</p>` : ''}${source.note ? `<p>${escape(source.note)}</p>` : ''}${urls.length ? `<ul>${urls.map(item => `<li><a href="${escape(item.url)}" target="_blank" rel="noopener noreferrer">${escape(item.title)} ↗</a></li>`).join('')}</ul>` : ''}<p>${escape(work.creationNote || (work.type === 'image' ? 'AI 辅助生成的独立再创作。这里展出的图像不是原作复制品。' : '数字建模与渲染作品。图像呈现的是虚拟材料与空间。'))}</p></section>`;
  }
  function detail(work) {
    const index = works.indexOf(work);
    const prev = works[(index - 1 + works.length) % works.length];
    const next = works[(index + 1) % works.length];
    main.innerHTML = `<div class="breadcrumbs"><a href="#/collection">← 返回常设展</a><span>${String(index+1).padStart(2,'0')} / ${String(works.length).padStart(2,'0')}</span></div><header class="work-header"><div><div class="eyebrow">NO. ${number(work)} &nbsp; / &nbsp; ${escape(typeNames[work.type])}</div><h1>${escape(work.title)}</h1><p class="english-title" lang="en">${escape(work.titleEn)}</p></div><div class="work-details"><p>${escape(work.year)}</p><p>${escape(work.medium)}</p></div></header><figure class="work-figure">${work.video ? `<video controls playsinline loop preload="none" poster="${escape(work.image)}" width="${work.width}" height="${work.height}" aria-label="${escape(work.title)}，无声循环动画"><source src="${escape(work.video)}" type="video/mp4"><p>你的浏览器无法播放此影像。<a href="${escape(work.video)}">下载 MP4</a></p></video>` : `<img src="${escape(work.image)}" width="${work.width}" height="${work.height}" alt="${escape(work.alt)}" fetchpriority="high" decoding="async">`}</figure><div class="figure-caption"><span>${escape(work.video ? '无声循环影像 · 点击播放，自行决定停留多久' : work.alt)}</span><a href="${escape(work.video || work.image)}" target="_blank" rel="noopener" download>${work.video ? '下载影像' : '查看展示图'} ↗</a></div><section class="interpretation"><aside><div class="label">墙上这几句话 / WALL TEXT</div><p class="wall-text-large">${escape(work.wallText)}</p>${work.tags.length ? `<div class="tags">${work.tags.map(tag => `<span class="tag">${escape(tag)}</span>`).join('')}</div>` : ''}</aside><div class="reading"><h2>再多看一会儿</h2>${work.interpretation.map(paragraph => `<p>${escape(paragraph)}</p>`).join('')}${sources(work)}</div></section>${work.extraViews?.length ? `<section class="more-views"><div class="section-heading"><h2>换个角度 <small>ANOTHER VIEW</small></h2></div><div class="views-grid">${work.extraViews.map(view => `<figure><a href="${escape(view.image)}" target="_blank" rel="noopener" aria-label="查看${escape(view.caption)}展示图"><img src="${escape(view.image)}" alt="${escape(view.caption)}" loading="lazy" width="${view.width}" height="${view.height}"></a><figcaption>${escape(view.caption)}</figcaption></figure>`).join('')}</div></section>` : ''}<nav class="work-navigation" aria-label="相邻作品"><a href="${link(prev)}"><small>← 上一件</small>${escape(prev.title)}</a><a href="${link(next)}"><small>下一件 →</small>${escape(next.title)}</a></nav>`;
    document.title = `${work.title} · 奶蛙博物馆`;
    document.querySelector('meta[name=description]').content = work.wallText;
  }
  function about() {
    main.innerHTML = `<article class="about-page"><div class="eyebrow">ABOUT THE MUSEUM / 本馆宣言</div><h1>${escape(museum.manifestoTitle || '欢迎来到意义的休息室。')}</h1><div class="about-layout"><aside class="about-aside"><p><strong>馆藏</strong><br>${works.length} 件作品<br>图像 · 雕塑 · 影像</p><p><strong>参观须知</strong><br>不必懂艺术史<br>请保留一点怀疑</p></aside><div class="about-text">${museum.manifesto.map(paragraph => `<p>${escape(paragraph)}</p>`).join('')}<h2>关于作品与引用</h2><section class="source-note"><p>${escape(museum.rightsNote || '本馆呈现以奶蛙形象展开的独立艺术实验。图像为 AI 辅助生成的再创作，雕塑与影像为数字建模及渲染。角色及被引用原作的相关权利归各自权利人。本馆不主张这些第三方权利，不代表原作者或收藏机构，也不为第三方形象提供再授权。')}</p><p>每件作品的关联资料均列在作品页面。解读是本馆提出的一种读法，并不替原作或艺术家发言。本站仅展示创作成品，未收录参考原图。</p><p>本馆没有账户、广告或追踪工具。字体随馆收藏，浏览时不向第三方字体服务发出请求。</p></section><a class="text-link" href="#/collection">回到展厅 <span class="arrow" aria-hidden="true">↗</span></a></div></div></article>`;
  }
  function route() {
    const path = location.hash.replace(/^#/,'') || '/';
    const changed = path !== previousRoute;
    previousRoute = path;
    document.title = '奶蛙博物馆 · Milk Frog Museum';
    document.querySelector('meta[name=description]').content = museum.intro;
    document.querySelectorAll('[data-nav]').forEach(a => {
      const active = path === '/about' ? a.dataset.nav === 'about' : path !== '/' && a.dataset.nav === 'collection';
      if (active) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current');
    });
    if (path === '/' || path === '') home();
    else if (path === '/collection') collection();
    else if (path === '/about') about();
    else if (path.startsWith('/work/')) {
      let id; try { id = decodeURIComponent(path.slice(6)); } catch { id = ''; }
      const work = byId.get(id);
      if (work) detail(work); else notFound();
    } else if (path === 'main') { main.focus(); return; }
    else notFound();
    if (changed) { window.scrollTo({top:0,behavior:'instant'}); main.focus({preventScroll:true}); }
  }
  function notFound() { main.innerHTML = '<section class="not-found"><div class="eyebrow">ROOM 404</div><h1>这只蛙暂时不在馆内。</h1><p>也许它还在路上。</p><a class="text-link" href="#/collection">返回常设展 ↗</a></section>'; }
  main.addEventListener('click', event => { const button = event.target.closest('[data-filter]'); if (button) { filter = button.dataset.filter; fillGallery(); } });
  document.querySelector('.skip-link').addEventListener('click', event => { event.preventDefault(); main.focus(); main.scrollIntoView(); });
  window.addEventListener('hashchange', route);
  route();
})();
