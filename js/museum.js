/* A buildless, GitHub Pages-safe museum. No cookies, storage, analytics or network APIs. */
(() => {
  'use strict';
  const data = window.MUSEUM_CATALOGUE;
  const main = document.getElementById('main');
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const typeNames = {image:'图像', '3d':'雕塑与姿态', video:'影像'};
  const creationLabel = work => ({original:'原创',adaptation:'名画改编',collection:'互联网收录'})[work.creationType || (work.tags?.some(tag => ['原创场景','原创构图'].includes(tag)) ? 'original' : '')] || '';
  let filter = 'all';
  let previousRoute = '';
  if (!data || !Array.isArray(data.works) || !data.works.length) {
    main.innerHTML = '<section class="not-found"><h1>展厅暂时没有打开</h1><p>请刷新重试，或阅读<a class="text-link" href="catalogue.html">完整文字图录</a></p></section>';
    return;
  }
  const works = data.works;
  const museum = data.museum;
  const groupMembers = data.groupMembers || [];
  const groupParents = new Map(works.flatMap(work => (work.memberIds || []).map(id => [id,work])));
  const byId = new Map([...works,...groupMembers].map(work => [work.id, work]));
  const curation = window.MUSEUM_CURATION;
  const halls = curation?.exhibition.halls || [];
  const hallById = new Map(halls.map(hall => [hall.id, hall]));
  const placements = new Map([...(curation?.workCuration || []),...(curation?.groupMemberCuration || [])].map(item => [item.workId,item]));
  const orderedWorks = curation ? curation.exhibition.orderedWorkIds.map(id => byId.get(id)) : works;
  let hallFilter = 'all';
  let galleryOrder = 'curated';
  let activePath = '';
  const research = window.MUSEUM_ESSAYS || {essays: []};
  const essays = research.essays;
  const essayBySlug = new Map(essays.map(essay => [essay.slug, essay]));
  const essayLink = essay => `#/essay/${encodeURIComponent(essay.slug)}`;
  const essayCard = essay => `<article class="essay-card"><div class="essay-kicker"><span class="essay-number">${escape(essay.id)}</span><span>${escape(essay.category)} · ${escape(essay.readingMinutes)} 分钟</span></div>${essay.recommendationCover ? `<a class="recommendation-cover" href="${essayLink(essay)}"><img src="${escape(essay.recommendationCover.image)}" width="1200" height="1500" alt="${escape(essay.recommendationCover.alt)}" loading="lazy"></a>` : ''}<h2><a href="${essayLink(essay)}">${escape(essay.title)}</a></h2><p>${escape(essay.deck)}</p><a class="text-link" href="${essayLink(essay)}">阅读全文 <span aria-hidden="true">↗</span></a></article>`;
  const relatedReading = work => {
    const placement = placements.get(work.id);
    const direct = placement ? essays.filter(essay => placement.analyzedIn.includes(essay.slug)) : essays.filter(essay => essay.relatedWorks.some(item => item.id === work.id));
    const related = placement ? essays.filter(essay => !direct.includes(essay) && (placement.relatedReading.includes(essay.slug) || essay.relatedWorks.some(item=>item.id===work.id))) : [];
    const group = (label,items) => items.length ? `<h4>${label}</h4><ul>${items.map(essay => `<li><a href="${essayLink(essay)}">${escape(essay.title)} ↗</a></li>`).join('')}</ul>` : '';
    return direct.length || related.length ? `<aside class="related-reading" aria-label="相关研究文章"><h3>继续研究</h3>${group('本文直接分析',direct)}${group('相关问题 · 延伸阅读',related)}</aside>` : '';
  };
  const link = work => `#/work/${encodeURIComponent(work.id)}`;
  const number = work => escape(String(work.number).padStart(2,'0'));
  const picture = (work, cls = '', eager = false) => `<img class="${cls}" style="aspect-ratio:${work.width}/${work.height}" src="${escape(work.image)}" srcset="${escape(work.thumbnail)} ${Math.min(work.width,600,Math.round(600*work.width/work.height))}w, ${escape(work.image)} ${work.width}w" sizes="${cls === 'hero-image' ? '(max-width:1200px) 90vw, 1100px' : cls === 'wall-picture' ? '(max-width:760px) 88vw, 82vw' : '(max-width:620px) 88vw, (max-width:1000px) 44vw, 29vw'}" width="${work.width}" height="${work.height}" alt="${escape(work.alt)}" loading="${eager ? 'eager' : 'lazy'}" decoding="async"${eager ? ' fetchpriority="high"' : ''}>`;
  const card = work => `<article class="art-card" data-work-id="${escape(work.id)}"><a href="${link(work)}"><div class="card-image">${picture(work)}${work.type !== 'image' ? `<span class="media-badge">${work.type === 'video' ? '▷ 影像' : '3D'}</span>` : ''}</div><div class="card-meta"><span>${groupParents.has(work.id) ? '组内单件 · ' : ''}NO. ${number(work)} · ${escape(typeNames[work.type])}${creationLabel(work) ? ' · '+escape(creationLabel(work)) : ''}</span><span class="year">${escape(work.year)}</span></div><h3>${escape(work.title)}</h3><p class="english-title" lang="en">${escape(work.titleEn)}</p><p class="card-excerpt">${escape(work.wallText)}</p><span class="card-read">进入作品 <span aria-hidden="true">↗</span></span></a></article>`;
  function filters() {
    return `<div class="filters"><div class="filter-buttons" role="group" aria-label="筛选作品">${[['all','全部'],['image','图像'],['3d','雕塑与姿态'],['video','影像'],['archive','旧作归档']].map(([value,label]) => `<button type="button" class="filter-button" data-filter="${value}" aria-pressed="${filter === value}">${label}</button>`).join('')}</div><span class="result-count" aria-live="polite" aria-atomic="true" id="result-count"></span></div><div class="gallery" id="gallery"></div>`;
  }
  function internetSelection() {
    const selection = window.MUSEUM_INTERNET_SELECTION;
    const entries = selection?.entries || [];
    if (!selection) { main.innerHTML='<p><a class="text-link" href="internet.html">打开互联网精选 ↗</a></p>'; return; }
    const cards = entries.map(item => `<article class="essay-card"><div class="essay-kicker"><span>互联网收录 · ${escape(item.platform)}</span><span>${escape(item.date)}</span></div>${recommendationPicture(item.recommendationCard)}<h2>${escape(item.title)}</h2><p>作者 / 发布账号：${item.authorUrl ? `<a href="${escape(item.authorUrl)}" target="_blank" rel="noopener noreferrer">${escape(item.author)} ↗</a>` : escape(item.author)}</p><p>${escape(item.format)}</p><p>${escape(item.description)}</p><p class="relationship-note">${escape(item.sourceNote)}</p><p class="relationship-note">${escape(item.rightsNote)}</p>${item.namingNote ? `<p class="relationship-note">${escape(item.namingNote)}</p>` : ''}<a class="text-link" href="${escape(item.postUrl)}" target="_blank" rel="noopener noreferrer">前往作者原帖 ↗</a>${item.guideSlug ? `<p><a class="text-link" href="#/essay/${escape(item.guideSlug)}">阅读推荐：${escape(item.guideTitle)} ↗</a></p>` : ''}</article>`).join('');
    main.innerHTML=`<section class="internet-selection"><div class="eyebrow">${entries.length} 条作者外链 / EXTERNAL LINKS</div><h1>${escape(selection.title)}</h1><p class="research-intro">${escape(selection.intro)}</p><p class="relationship-note">${escape(selection.rightsNote)}</p><div class="essay-list">${cards}</div><p><a class="text-link" href="internet.html">打开可独立阅读的外链精选 ↗</a></p></section>`;
  }
  function fillGallery() {
    const gallery = document.getElementById('gallery');
    if (!gallery) return;
    const ordered = galleryOrder === 'number' ? [...works].sort((a,b) => String(a.number).localeCompare(String(b.number),'en',{numeric:true})) : orderedWorks;
    const visible = ordered.filter(work => (filter === 'all' || (filter === 'archive' ? work.tags.includes('旧作归档') : work.type === filter)) && (hallFilter === 'all' || placements.get(work.id)?.primaryHallId === hallFilter));
    gallery.innerHTML = visible.length ? visible.map(card).join('') : '<p class="empty">这一间还没有展品</p>';
    document.getElementById('result-count').textContent = `${String(visible.length).padStart(2,'0')} 件展品`;
    document.querySelectorAll('[data-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === filter)));
  }
  const paragraphs = items => items.map(p => `<p>${escape(p)}</p>`).join('');
  const hallCard = hall => `<article class="hall-card"><a href="#/hall/${escape(hall.id)}"><div class="hall-image">${picture(byId.get(hall.anchorWorkId))}</div><div class="eyebrow">第 ${escape(hall.number)} 厅 · ${hall.workCount} 件</div><h3>${escape(hall.title)}</h3><p>${escape(hall.subtitle)}</p><span class="text-link">进入本厅 ↗</span></a></article>`;
  const pathCard = path => `<article class="path-card"><div class="eyebrow">${path.workIds.length} 个停靠点</div><h3><a href="#/path/${escape(path.id)}">${escape(path.title)}</a></h3><p>${escape(path.description)}</p><a class="text-link" href="#/path/${escape(path.id)}">沿这条路看 ↗</a></article>`;
  function home() {
    const featured = byId.get(museum.featuredId) || works[0];
    const latest = works.slice(-2).reverse();
    main.innerHTML = `<section class="home-stage" aria-labelledby="featured-title"><div class="stage-top"><span class="eyebrow">${works.length} 件作品 / 五厅常设展</span><a class="text-link" href="#/collection">看全部作品 ↗</a></div><a class="hero-art" href="${link(featured)}" aria-label="查看${escape(featured.title)}">${picture(featured,'hero-image',true)}</a><div class="stage-caption"><div><div class="eyebrow">${escape(curation.home.featuredLabel)} · ${number(featured)}</div><h2 id="featured-title">${escape(featured.title)}</h2><p class="english-title" lang="en">${escape(featured.titleEn)}</p></div><div><p class="wall-text">${escape(featured.wallText)}</p><a class="text-link" href="${link(featured)}">走近一点 ↗</a></div></div></section><section class="home-intro"><div><div class="eyebrow">${escape(curation.home.eyebrow)}</div><h1>${escape(museum.headline)}</h1></div><div class="intro-side"><p>${escape(museum.intro)}</p><a class="text-link" href="#/hall/${halls[0].id}">${escape(curation.home.primaryAction)} ↗</a></div></section><section class="latest-works"><div class="section-heading"><h2>新入馆 <small>RECENT WORKS</small></h2><a class="text-link" href="#/collection">查阅图录 ↗</a></div><div class="gallery latest-gallery">${latest.map(card).join('')}</div></section><section class="hall-overview"><div class="section-heading"><h2>沿五厅观看 <small>THE EXHIBITION</small></h2><a class="text-link" href="#/exhibition">五厅导览 ↗</a></div><div class="hall-list">${halls.map(hallCard).join('')}</div></section><section class="curatorial-preface"><div class="eyebrow">策展札记 / CURATORIAL NOTE</div><h2>${escape(curation.home.prefaceTitle)}</h2>${paragraphs(curation.home.preface)}</section><section class="viewing-paths"><div class="section-heading"><h2>也可以这样走</h2></div><div class="path-list">${curation.routes.map(pathCard).join('')}</div></section><section class="research-home"><div class="section-heading"><h2>${escape(curation.home.researchPreviewTitle)} <small>READER</small></h2><a class="text-link" href="#/research">进入研究 ↗</a></div><p class="research-intro">${escape(curation.home.researchPreviewText)}</p><div class="essay-list">${researchEssays().map(essayCard).join('')}</div></section><aside class="manifesto-strip"><div class="eyebrow">${escape(curation.home.curatorialStatementTitle)}</div><div><p>${escape(museum.statement)}</p><a class="text-link" href="#/about">阅读完整策展陈述 ↗</a></div></aside>`;
  }
  function researchEssays() { return curation.research.readingOrder.map(slug => essayBySlug.get(slug)); }
  function comparisonsFor(ids) { return curation.comparisons.filter(item => item.workIds.some(id => ids.includes(id))); }
  function comparisonLinks(items) { return `<div class="comparison-list">${items.map(item => `<article><h3><a href="#/compare/${escape(item.id)}">${escape(item.title)} ↗</a></h3><p>${escape(item.text)}</p></article>`).join('')}</div>`; }
  function exhibition() {
    main.innerHTML = `<section class="exhibition-page"><div class="eyebrow">五厅导览 / EXHIBITION</div><h1>${escape(curation.exhibition.title)}</h1><div class="curatorial-text">${paragraphs([curation.exhibition.intro,curation.exhibition.viewingTip])}</div><div class="hall-list">${halls.map(hallCard).join('')}</div><h2>选择一条观看路线</h2><div class="path-list">${curation.routes.map(pathCard).join('')}</div><h2>把作品放在一起看</h2>${comparisonLinks(curation.comparisons)}</section>`;
    document.title = '五厅导览 · '+museum.title;
  }
  function hallDetail(hall) {
    const index=halls.indexOf(hall),next=halls[(index+1)%halls.length];
    main.innerHTML = `<section class="hall-page"><div class="breadcrumbs"><a href="#/exhibition">← 返回五厅导览</a><span>第 ${escape(hall.number)} 厅 / ${hall.workCount} 件</span></div><header class="hall-header"><div class="eyebrow">${escape(hall.subtitle)}</div><h1>${escape(hall.title)}</h1><p class="hall-lead">${escape(hall.lead)}</p><div class="curatorial-text">${paragraphs(hall.paragraphs)}</div><p class="looking-question">${escape(hall.question)}</p><a class="text-link" href="${link(byId.get(hall.workIds[0]))}">从本厅第一件开始 ↗</a></header>${hall.clusters.map(cluster => `<section class="hall-cluster"><h2>${escape(cluster.title)}</h2><p>${escape(cluster.description)}</p><div class="gallery">${cluster.workIds.map(id=>card(byId.get(id))).join('')}</div></section>`).join('')}<section class="hall-connections"><h2>与这些作品对看</h2>${comparisonLinks(comparisonsFor(hall.workIds.flatMap(id => [id,...(byId.get(id).memberIds || [])])))}<h2>沿问题继续读</h2><ul>${hall.relatedResearchIds.map(slug=>`<li><a href="${essayLink(essayBySlug.get(slug))}">${escape(essayBySlug.get(slug).title)} ↗</a></li>`).join('')}</ul><p class="hall-transition">${escape(hall.nextTransition)}</p><a class="text-link" href="#/hall/${escape(next.id)}">${index===halls.length-1 ? '回到第一厅' : '进入下一厅'}：${escape(next.title)} ↗</a></section></section>`;
    document.title=hall.title+' · '+museum.title;
  }
  function comparisonDetail(comparison) {
    main.innerHTML=`<section class="comparison-page"><div class="breadcrumbs"><a href="#/exhibition">← 返回五厅导览</a><span>作品并置</span></div><h1>${escape(comparison.title)}</h1><p class="comparison-intro">${escape(comparison.text)}</p><div class="comparison-grid">${comparison.workIds.map(id=>{const work=byId.get(id);return `<figure><a href="${link(work)}">${picture(work,'comparison-image',true)}</a><figcaption><span class="eyebrow">NO. ${number(work)}</span><h2><a href="${link(work)}">${escape(work.title)} ↗</a></h2><p>${escape(work.medium)}</p>${work.video ? `<a class="text-link" href="${link(work)}">播放无声循环影像 ↗</a>` : ''}</figcaption></figure>`;}).join('')}</div>${comparison.primaryHallId ? `<a class="text-link" href="#/hall/${escape(comparison.primaryHallId)}">回到本厅 ↗</a>` : '<a class="text-link" href="#/exhibition">继续五厅导览 ↗</a>'}</section>`;
    document.title=comparison.title+' · '+museum.title;
  }
  function pathDetail(path) {
    const routeCard=work=>card(work).replaceAll(link(work),link(work)+'?path='+encodeURIComponent(path.id));
    main.innerHTML=`<section class="viewing-path-page"><div class="breadcrumbs"><a href="#/exhibition">← 返回五厅导览</a><span>${path.workIds.length} 个停靠点</span></div><h1>${escape(path.title)}</h1><p class="comparison-intro">${escape(path.description)}</p><a class="text-link" href="${link(byId.get(path.workIds[0]))}?path=${escape(path.id)}">从第一个停靠点开始 ↗</a><div class="gallery path-gallery">${path.workIds.map(id=>routeCard(byId.get(id))).join('')}</div></section>`;
    document.title=path.title+' · '+museum.title;
  }
  function collection() {
    main.innerHTML = `<section class="collection collection-head"><div class="eyebrow">THE COLLECTION / 常设展</div><h1>${escape(curation.collection.title)}</h1><p>${escape(curation.collection.intro)}</p><div class="catalogue-controls"><label>展厅 <select id="hall-filter"><option value="all">全部五厅</option>${halls.map(hall=>`<option value="${escape(hall.id)}"${hallFilter===hall.id ? ' selected' : ''}>${escape(hall.number+' · '+hall.title)}</option>`).join('')}</select></label><label>排列 <select id="gallery-order"><option value="curated"${galleryOrder==='curated' ? ' selected' : ''}>策展顺序</option><option value="number"${galleryOrder==='number' ? ' selected' : ''}>作品编号</option></select></label></div>${filters()}</section>`;
    fillGallery();
  }
  function readingIndex(recommendationsOnly=false) {
    const ordered=researchEssays().filter(essay=>!recommendationsOnly||essay.category==='作品推荐');
    main.innerHTML = `<section class="research-index"><div class="eyebrow">${recommendationsOnly?'RECOMMENDATIONS / 作品推荐':'READER / 阅读馆'}</div><h1>${recommendationsOnly?'值得再看一遍':escape(curation.research.title)}</h1><p class="research-intro">${recommendationsOnly?'原创观看导览，原作请到作者页面观看。配图为本馆原创导览封面，非作品画面。':escape(curation.research.intro)}</p><div class="essay-list">${ordered.map(essayCard).join('')}</div><p class="research-intro">${escape(curation.research.sharedBoundary)}</p><a class="text-link" href="research.html">阅读无需 JavaScript 的文章集 ↗</a></section>`;
  }
  function recommendationPicture(card,prefix='') {
    return card ? `<figure class="recommendation-cover"><img src="${prefix+escape(card.image)}" width="${card.width}" height="${card.height}" alt="${escape(card.alt)}" loading="lazy"><figcaption>${escape(card.caption)}</figcaption></figure>` : '';
  }
  function recommendedOriginals(essay) {
    const entries=window.MUSEUM_INTERNET_SELECTION?.entries||[];
    const selected=(essay.externalRecommendationIds||[]).map(id=>entries.find(item=>item.id===id)).filter(Boolean);
    return selected.length ? `<div class="recommended-originals"><h2>先去看原作</h2><p>作品作者：<a href="${escape(selected[0].authorUrl)}" target="_blank" rel="noopener noreferrer">${escape(selected[0].author)} ↗</a>。下面的原站链接按推荐观看顺序排列。</p><ol>${selected.map(item=>`<li><a href="${escape(item.postUrl)}" target="_blank" rel="noopener noreferrer">${escape(item.title)} ↗</a></li>`).join('')}</ol><a class="text-link" href="#/internet">更多作者外链与原创导览卡 ↗</a></div>` : '';
  }
  function essayDetail(essay) {
    const tocLink = section => `${essayLink(essay)}/section/${encodeURIComponent(section.id)}`;
    const refs = essay.references.map(ref => `<li id="reference-${escape(ref.id)}" tabindex="-1"><a href="${escape(ref.url)}" target="_blank" rel="noopener noreferrer">${escape(ref.title)} ↗</a><p>${escape(ref.note)}</p>${ref.accessedAt ? `<small>资料核对日期：${escape(ref.accessedAt)}</small>` : ''}</li>`).join('');
    main.innerHTML = `<article class="research-article"><div class="breadcrumbs"><a href="#/reading">← 返回阅读馆</a><span>${escape(essay.id)} / ${escape(essay.readingMinutes)} 分钟</span></div><header class="essay-header"><div class="eyebrow">${escape(essay.category)} / ${essay.category==='作品推荐'?'RECOMMENDATIONS':'RESEARCH'}</div><h1>${escape(essay.title)}</h1><p class="essay-deck">${escape(essay.deck)}</p><p class="essay-meta">${escape(essay.author)} · 发布 ${escape(essay.publishedAt)}${essay.updatedAt !== essay.publishedAt ? ` · 更新 ${escape(essay.updatedAt)}` : ''}</p><p class="essay-scope">${escape(essay.scopeNote)}</p></header>${essay.recommendationCover ? `<div class="recommendation-intro">${recommendationPicture(essay.recommendationCover)}${recommendedOriginals(essay)}</div>` : ''}<div class="essay-layout"><details class="essay-toc"><summary>本文章节</summary><nav aria-label="文章章节"><ol>${essay.sections.map(section => `<li><a href="${tocLink(section)}">${escape(section.title)}</a></li>`).join('')}<li><a href="${essayLink(essay)}/section/references">来源与阅读</a></li><li><a href="${essayLink(essay)}/section/related-works">相关馆藏</a></li></ol></nav></details><div class="essay-body">${essay.sections.map(section => `<section id="essay-${escape(section.id)}" tabindex="-1"><h2>${escape(section.title)}</h2>${section.paragraphs.map(paragraph => `<p>${escape(paragraph)}</p>`).join('')}${section.referenceIds.length ? `<p class="section-sources">本节来源：${section.referenceIds.map(id => `<button type="button" data-reference="${escape(id)}" aria-label="查看来源 ${escape(id)}">[${escape(id)}]</button>`).join(' ')}</p>` : ''}</section>`).join('')}<section id="essay-references" class="essay-references" tabindex="-1"><h2>来源与阅读</h2>${essay.recommendationMethodNote ? `<p class="relationship-note">${escape(essay.recommendationMethodNote)}</p>` : ''}<ol>${refs}</ol></section>${essayRelated(essay)}<p class="essay-static-link"><a class="text-link" href="reading/${escape(essay.slug)}.html">打开可独立阅读的全文页面 ↗</a></p></div></div></article>`;
    document.title = `${essay.title} · 奶蛙现代艺术馆`;
    document.querySelector('meta[name=description]').content = essay.deck;
  }
  function essayRelated(essay) {
    if(essay.externalRecommendationIds?.length) return `<section id="essay-related-works" class="essay-related-works" tabindex="-1"><h2>原作与推荐入口</h2>${recommendedOriginals(essay)}</section>`;
    const directIds = (curation?.workCuration || []).filter(item=>item.analyzedIn.includes(essay.slug)).map(item=>item.workId);
    const cardInfo = curation?.research.cards.find(item=>item.id===essay.slug);
    const relatedIds = [...new Set([...essay.relatedWorks.map(item=>item.id),...(cardInfo?.workIds || []),...(cardInfo?.relatedWorkIds || [])])].filter(id=>!directIds.includes(id));
    const group = (label,ids) => ids.length ? `<h3>${label}</h3><div class="gallery">${ids.map(id=>card(byId.get(id))).join('')}</div>` : '';
    return `<section id="essay-related-works" class="essay-related-works" tabindex="-1"><h2>回到作品继续看</h2>${group('本文直接分析的作品',directIds)}${group('相关作品与问题 · 延伸阅读',relatedIds)}${cardInfo ? `<p class="relationship-note">${escape(cardInfo.relationship)}</p>` : ''}</section>`;
  }
  function sources(work) {
    const source = work.source || {};
    const urls = work.sources || [];
    return `<section class="source-note" aria-label="作品关联与来源"><h3>关联与来源</h3>${source.title ? `<p>${escape(source.artist)}${source.artist ? ' · ' : ''}${escape(source.title)}${source.date ? ' · ' + escape(source.date) : ''}</p>` : ''}${source.note ? `<p>${escape(source.note)}</p>` : ''}${urls.length ? `<ul>${urls.map(item => `<li><a href="${escape(item.url)}" target="_blank" rel="noopener noreferrer">${escape(item.title)} ↗</a></li>`).join('')}</ul>` : ''}<p>${escape(work.creationNote || (work.type === 'image' ? 'AI 辅助生成的独立再创作。这里展出的图像不是原作复制品。' : '数字建模与渲染作品。图像呈现的是虚拟材料与空间。'))}</p></section>`;
  }
  function detail(work) {
    const placement=placements.get(work.id);
    const hall=placement && hallById.get(placement.primaryHallId);
    const pathContext=curation.routes.find(path=>path.id===activePath && path.workIds.includes(work.id));
    const parentGroup=groupParents.get(work.id);
    const sequence=pathContext ? pathContext.workIds.map(id=>byId.get(id)) : parentGroup ? parentGroup.memberIds.map(id=>byId.get(id)) : orderedWorks;
    const index=sequence.indexOf(work),prev=sequence[index-1],next=sequence[index+1];
    const stepLink=item=>link(item)+(pathContext ? '?path='+encodeURIComponent(pathContext.id) : '');
    const workNavigation=`<nav class="work-navigation" aria-label="相邻作品">${prev ? `<a href="${stepLink(prev)}"><small>← 沿路线看上一件</small>${escape(prev.title)}</a>` : '<a href="#/exhibition"><small>观看起点</small>返回五厅导览</a>'}${next ? `<a href="${stepLink(next)}"><small>沿路线看下一件 →</small>${escape(next.title)}</a>` : '<a href="#/exhibition"><small>这条路线已看完</small>选择另一条路线 ↗</a>'}</nav>`;
    const backLink=pathContext ? `#/path/${pathContext.id}` : parentGroup ? link(parentGroup) : hall ? `#/hall/${hall.id}` : '#/collection';
    const backLabel=pathContext ? '返回 '+pathContext.title : parentGroup ? '返回组作 · '+parentGroup.title : hall ? '返回第 '+hall.number+' 厅 · '+hall.title : '返回全部作品';
    const paired=curation.comparisons.filter(item=>item.workIds.includes(work.id));
    const looking=placement ? `<aside class="work-looking"><div class="label">先看这里</div><p>${escape(placement.lookFor)}</p><p class="placement-note">${escape(placement.placementRationale)}</p></aside>` : '';
    main.innerHTML = `<div class="breadcrumbs"><a href="${escape(backLink)}">← ${escape(backLabel)}</a><span>${parentGroup && !pathContext ? '组内 ' : ''}${String(index+1).padStart(2,'0')} / ${String(sequence.length).padStart(2,'0')}</span></div><header class="work-header"><div><div class="eyebrow">NO. ${number(work)} &nbsp; / &nbsp; ${escape(typeNames[work.type])}</div><h1>${escape(work.title)}</h1><p class="english-title" lang="en">${escape(work.titleEn)}</p>${work.epigraph ? `<p class="work-epigraph">${escape(work.epigraph)}</p>` : ''}</div><div class="work-details"><p>${escape(work.year)}</p>${creationLabel(work) ? `<p>${escape(creationLabel(work))}</p>` : ''}<p>${escape(work.medium)}</p>${work.creator ? `<p>本作作者：${escape(work.creator)}</p>` : ''}</div></header><figure class="work-figure">${work.video ? `<video controls playsinline loop preload="none" poster="${escape(work.image)}" width="${work.width}" height="${work.height}" aria-label="${escape(work.title)}，无声循环动画"><source src="${escape(work.video)}" type="video/mp4"><p>你的浏览器无法播放此影像。<a href="${escape(work.video)}">下载 MP4</a></p></video>` : `<img src="${escape(work.image)}" style="aspect-ratio:${work.width}/${work.height};--artwork-scale:${work.width/work.height}" width="${work.width}" height="${work.height}" alt="${escape(work.alt)}" fetchpriority="high" decoding="async">`}</figure><div class="figure-caption"><span>${escape(work.video ? '无声循环影像 · 点击播放，自行决定停留多久' : work.alt)}</span><a href="${escape(work.video || work.image)}" target="_blank" rel="noopener" download>${work.video ? '下载影像' : '查看展示图'} ↗</a></div>${looking}<section class="interpretation"><aside><div class="label">墙上这几句话 / WALL TEXT</div><p class="wall-text-large">${escape(work.wallText)}</p>${work.tags.length ? `<div class="tags">${work.tags.map(tag => `<span class="tag">${escape(tag)}</span>`).join('')}</div>` : ''}</aside><div class="reading"><h2>再多看一会儿</h2>${work.interpretation.map(paragraph => `<p>${escape(paragraph)}</p>`).join('')}${sources(work)}${relatedReading(work)}</div></section>${work.extraViews?.length ? `<section class="more-views"><div class="section-heading"><h2>${work.tags.includes('旧作归档') ? '版本对照 <small>EARLIER VERSIONS</small>' : '换个角度 <small>ANOTHER VIEW</small>'}</h2></div><div class="views-grid">${work.extraViews.map(view => `<figure><a href="${escape(view.image)}" target="_blank" rel="noopener" aria-label="查看${escape(view.caption)}展示图"><img src="${escape(view.image)}" alt="${escape(view.caption)}" loading="lazy" width="${view.width}" height="${view.height}"></a><figcaption>${escape(view.caption)}</figcaption></figure>`).join('')}</div></section>` : ''}${paired.length ? `<section class="work-comparisons"><h2>与这一件对看</h2>${comparisonLinks(paired)}</section>` : ''}${work.memberIds?.length ? `<section class="group-studies"><div class="section-heading"><h2>组内研究 <small>STUDIES</small></h2></div><p class="relationship-note">${work.memberIds.length} 项研究合计一件组作。原编号、解读、来源和附加角度保留，选择单件继续浏览。</p><div class="gallery">${work.memberIds.map(id=>card(byId.get(id))).join('')}</div></section>` : ''}${parentGroup ? `<p class="relationship-note">本项属于<a href="${link(parentGroup)}">${escape(parentGroup.title)}</a>，组内单件不另计主馆藏。</p>` : ''}${workNavigation}`;
    document.title = `${work.title} · 奶蛙现代艺术馆`;
    document.querySelector('meta[name=description]').content = work.wallText;
  }
  function about() {
    const info=curation.about;
    main.innerHTML=`<article class="about-page"><div class="eyebrow">ABOUT / 创作、版本与来源</div><h1>${escape(info.title)}</h1><div class="about-layout"><aside class="about-aside"><p><strong>作品目录</strong><br>${works.length} 件主展品<br>五厅 · 四篇研究 · 两篇推荐</p><p><strong>版本</strong><br>六张早期版本<br>附于对应作品页</p></aside><div class="about-text"><p>${escape(info.intro)}</p><h2>策展陈述</h2>${paragraphs(museum.manifesto)}<h2>${escape(info.productionTitle)}</h2>${info.sections.map(section=>`<section><h3>${escape(section.title)}</h3>${paragraphs(section.paragraphs)}</section>`).join('')}<h2>关于作品与引用</h2><section class="source-note"><p>${escape(info.rightsNote)}</p><p>${escape(info.identityNote)}</p></section><section class="source-note inspiration-note" aria-label="灵感致谢"><h2>${escape(info.inspiration.title)}</h2>${paragraphs(info.inspiration.paragraphs)}<p><a href="${escape(info.inspiration.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escape(info.inspiration.sourceTitle)} ↗</a></p></section><p class="about-privacy">本站没有账户、广告或追踪工具。字体随网站保存，浏览时不向第三方字体服务发出请求。</p><a class="text-link" href="#/exhibition">回到五厅导览 ↗</a></div></div></article>`;
  }
  function route() {
    let path = location.hash.replace(/^#/,'') || '/';
    const query = path.includes('?') ? path.slice(path.indexOf('?')+1) : '';
    path = path.split('?')[0];
    activePath = new URLSearchParams(query).get('path') || '';
    if (path === '/research') path = '/reading';
    if (path.startsWith('/essay/')) path = path.replace('/essay/','/reading/');
    const changed = path !== previousRoute;
    previousRoute = path;
    document.title = '奶蛙现代艺术馆 · Milk Frog Museum of Modern Art';
    document.querySelector('meta[name=description]').content = museum.intro;
    document.querySelectorAll('[data-nav]').forEach(a => {
      const active = path === '/recommendations' ? a.dataset.nav === 'recommendations' : path === '/about' ? a.dataset.nav === 'about' : path === '/internet' ? a.dataset.nav === 'internet' : path === '/reading' || path.startsWith('/reading/') ? a.dataset.nav === 'reading' : path === '/exhibition' || path.startsWith('/hall/') || path.startsWith('/compare/') || path.startsWith('/path/') ? a.dataset.nav === 'exhibition' : path !== '/' && a.dataset.nav === 'collection';
      if (active) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current');
    });
    if (path === '/' || path === '') home();
    else if (path === '/collection') collection();
    else if (path === '/internet') internetSelection();
    else if (path === '/exhibition') exhibition();
    else if (path.startsWith('/hall/')) { const hall = hallById.get(path.slice(6)); if (hall) hallDetail(hall); else notFound(); }
    else if (path.startsWith('/compare/')) { const item = curation.comparisons.find(c=>c.id===path.slice(9)); if (item) comparisonDetail(item); else notFound(); }
    else if (path.startsWith('/path/')) { const item = curation.routes.find(c=>c.id===path.slice(6)); if (item) pathDetail(item); else notFound(); }
    else if (path === '/about') about();
    else if (path === '/reading') readingIndex();
    else if (path === '/recommendations') readingIndex(true);
    else if (path.startsWith('/reading/')) {
      let slug, section; try { const parts = path.split('/'); slug = decodeURIComponent(parts[2]); section = parts.length === 5 && parts[3] === 'section' ? decodeURIComponent(parts[4]) : undefined; if (parts.length !== 3 && !section) slug = ''; } catch { slug = ''; }
      const essay = essayBySlug.get(slug);
      if (essay && (!section || ['references','related-works',...essay.sections.map(s => s.id)].includes(section))) {
        essayDetail(essay);
        if (section) { const target = document.getElementById('essay-' + section); if (target) { target.focus({preventScroll:true}); target.scrollIntoView({block:'start',behavior:'instant'}); } return; }
      } else notFound();
    }
    else if (path.startsWith('/work/')) {
      let id; try { id = decodeURIComponent(path.slice(6)); } catch { id = ''; }
      const work = byId.get(museum.workAliases?.[id] || id);
      if (work) detail(work); else notFound();
    } else if (path === 'main') { main.focus(); return; }
    else notFound();
    if (changed) { window.scrollTo({top:0,behavior:'instant'}); main.focus({preventScroll:true}); }
  }
  function notFound() { main.innerHTML = '<section class="not-found"><div class="eyebrow">ROOM 404</div><h1>这只蛙暂时不在馆内。</h1><p>也许它还在路上。</p><a class="text-link" href="#/collection">返回常设展 ↗</a></section>'; }
  main.addEventListener('click', event => { const button = event.target.closest('[data-filter]'); if (button) { filter = button.dataset.filter; fillGallery(); } const reference = event.target.closest('[data-reference]'); if (reference) { const target = document.getElementById('reference-' + reference.dataset.reference); if (target) { target.focus({preventScroll:true}); target.scrollIntoView({block:'start'}); } } });
  document.querySelector('.skip-link').addEventListener('click', event => { event.preventDefault(); main.focus(); main.scrollIntoView(); });
  main.addEventListener('change', event => { if (event.target.id === 'hall-filter') { hallFilter = event.target.value; fillGallery(); } if (event.target.id === 'gallery-order') { galleryOrder = event.target.value; fillGallery(); } });
  window.addEventListener('hashchange', route);
  route();
})();
