(() => {
  'use strict';
  const data=window.MUSEUM_CREATION_RECORDS;
  const records=new Map((data?.works||[]).map(w=>[w.id,w]));
  const e=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const stamp=x=>x?new Intl.DateTimeFormat('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false,timeZone:'UTC'}).format(new Date(x))+' UTC':'尚待真实记录';
  const kinds={artwork:'参考作品',single_work:'单件作品资料',artist_research:'艺术家研究文章',series:'系列资料',interview:'访谈',official_reference:'官方资料',series_or_thematic_research:'系列或主题研究',series_reference:'系列资料',project_documentation:'项目资料',museum_research_article:'馆方研究文章'};
  const lines=x=>Array.isArray(x)?x.join('、'):x||'';
  function sourceList(w){return '<details><summary>出处、作者与来源范围</summary><ul>'+w.sources.map(s=>`<li><h4><a href="${e(s.url)}" target="_blank" rel="noopener noreferrer">${e(s.title)} ↗</a></h4><p>${e(s.kind_label||kinds[s.kind]||'参考资料')}</p>${s.artist_or_creator||s.artist?`<p>参考作者／协作者：${e(s.artist_or_creator||s.artist)}</p>`:''}${s.author?`<p>文章作者：${e(s.author)}</p>`:''}${s.interviewees?`<p>受访者：${e(lines(s.interviewees))}</p>`:''}${s.publisher?`<p>资料发布方：${e(s.publisher)}</p>`:''}${s.discussed_creator?`<p>讨论的创作者：${e(s.discussed_creator)}</p>`:''}<p>${e(s.scope_note)}</p>${s.source_record_stage?`<p>${e(s.source_record_stage)}</p>`:''}${s.verification_basis?`<small>${e(s.verification_basis)}</small>`:''}</li>`).join('')+'</ul></details>'}
  function workRecord(id){
    const w=records.get(id);if(!w)return '';
    const p=w.process,label=p.next_question_origin==='creation_record'?'创作时留下的下一问题':'入馆整理时提出的下一问题';
    const unused=p.non_adopted_versions.map(v=>`<li>${e(v.version)}：${e(v.reason)}</li>`).join('');
    const next=w.future_work_ids.length? w.future_work_ids.map(id=>`<a href="#/work/${e(id)}">继续看后续作品 ↗</a>`).join(' · '):'等待新的作品继续这个问题。';
    const prompt=w.batch_work_id==='D1'?'木箱让够鞋动作更可信吗？你最想保留或继续改哪一处？':w.batch_work_id==='LB2'?'网门开口以后，照料与隔绝哪一种关系先被你看见？':w.batch_work_id==='A3'?'门口这一步，怎样改变你对等候者与入口的关系的读法？':'这张图里，哪一个关系值得保留，哪一处仍读不清？请指出图上的位置。';
    return `<section class="creation-record" data-creation-record="${e(id)}"><h2>从问题到采用</h2><p>${e(w.batch_work_id)} · 采用版本 ${e(w.selected_version)} · ${e(w.classification)}</p><p>${e(w.media_status)}</p><dl><dt>创作日期</dt><dd>${e(w.creation_date)}（日期）</dd><dt>首次入图录</dt><dd class="catalogued-at">${e(stamp(w.catalogued_at))}</dd><dt>首次公开部署核验</dt><dd class="published-at">${e(stamp(w.published_at))}</dd></dl><h3>创作前的问题</h3><p class="original-question">${e(w.original_art_question)}</p><h3>最初意图</h3><p>${e(p.initial_intent_summary)}</p><h3>实际看图与采用</h3><p>${e(p.observed_result_and_revision)}</p>${unused?`<details><summary>未采用版本与理由（不计成品）</summary><ul>${unused}</ul></details>`:''}${p.unused_ideas.length?`<details><summary>未生成或未使用的设想</summary><ul>${p.unused_ideas.map(t=>`<li>${e(t)}</li>`).join('')}</ul></details>`:''}<h3>${e(label)}</h3><p class="next-question" data-question-origin="${e(p.next_question_origin)}">${e(p.next_question)}</p><h3>等待具体反馈</h3><p>${e(prompt)}</p><p>当前尚未记录对这件作品的具体用户反馈。可以在下一次对话中按作品题名回答，不补写尚未得到的回答。</p><h3>后续作品回链</h3><p>${next}</p><p><a class="text-link" href="${e(w.image.path)}" download>查看已获准公开的生成原PNG ↗</a></p>${sourceList(w)}<p><a class="text-link" href="#/creation-loop">查看创作闭环说明 ↗</a> · <a class="text-link" href="#/essay/${e(w.journal_slug)}">回到10月13日阶段手记 ↗</a></p></section>`;
  }
  function processHTML(){
    if(!data)return '<p>创作记录尚未载入。</p>';
    const m=data.method;
    const cases=m.cases.map(c=>{const w=data.works.find(w=>w.batch_work_id===c.key);return `<section><h2>${e(c.title)}</h2><p>${e(c.text)}</p>${w?`<figure class="article-figure"><a href="#/work/${e(w.id)}"><img src="${e((window.MUSEUM_CATALOGUE.works.find(a=>a.id===w.id)).thumbnail)}" width="${w.image.width}" height="${w.image.height}" loading="lazy" alt="${e(w.wall_text)}"></a><figcaption>《${e(w.title)}》 · 采用版本${e(w.selected_version)} · AI辅助图像</figcaption></figure><a class="text-link" href="#/work/${e(w.id)}">看实际版本记录 ↗</a>`:''}</section>`}).join('');
    return `<article class="creation-loop"><div class="eyebrow">CREATION LOOP / 可查可调整</div><h1>${e(m.title)}</h1><p class="research-intro">${e(m.deck)}</p><p>${e(m.conceptNote)}</p>${m.steps.map((s,i)=>`<section><h2>${i+1} · ${e(s.title)}</h2><p>${e(s.text)}</p></section>`).join('')}<h2>在这三处核对实际记录</h2>${cases}<section><h2>三种时间分别记录</h2><p>${e(m.timeNote)}</p><a class="text-link" href="#/recent">最新入馆：按首次入图录的Git时间看 ↗</a></section><section><h2>具体反馈仍在等待</h2><p>发布许可与对图像的具体艺术反馈分别处理。下一次反馈可以先围绕D1的支点、LB2的网门或A3的等待关系回答；本页不虚构已经得到的评价。</p></section></article>`;
  }
  function journalUpdate(slug){if(slug!=='journal-2026-10-13-hands-before-glass'||!data.works.every(w=>w.catalogued_at))return '';return '<aside class="creation-record"><p>后续入馆：文中两批共60件采用作品已列入正式图录。这里保留当时的阶段观察与未采用稿，过程图版不重复计为成品。</p><a class="text-link" href="#/recent">查看最新入馆 ↗</a> · <a class="text-link" href="#/creation-loop">创作闭环说明 ↗</a></aside>'}
  window.MuseumCreation={workRecord,processHTML,journalUpdate,records};
})();
