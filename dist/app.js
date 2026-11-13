const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeURL=u=>{try{const v=new URL(u);return v.protocol==='https:'?v.href:''}catch{return ''}};
const mediaURL=u=>/^assets\/[a-zA-Z0-9_./-]+$/.test(u||'')?u:safeURL(u);
const icon=n=>window.AtlasUI.icon(n),avatar=c=>window.AtlasUI.avatar(c);
const archivedCases=window.ATLAS.cases.filter(c=>c.publish_ready),byID=new Map(archivedCases.map(c=>[c.id,c]));
const cases=window.ATLAS_CURATION.featured_ids.map(id=>byID.get(id)).filter(Boolean);
const local=c=>!!(c.image_url&&c.media_authorized==='cc-by-4.0'&&c.image_url.endsWith('.gif'));
const still=c=>c.media_authorized==='mit'&&c.image_url?.endsWith('.png');
const hasMedia=c=>local(c)||still(c);
const previewURL=c=>still(c)?mediaURL(c.thumbnail_url||c.image_url):posterURL(c);
const videoURL=c=>mediaURL(c.image_url).replace(/\.gif$/,'.mp4'),posterURL=c=>mediaURL(c.image_url).replace(/\.gif$/,'.webp');
const dimensions=c=>mediaDimensions[(c.image_url||'').split('/').pop()]||[4,3];
const authorURL=c=>c.author_url?safeURL(c.author_url):c.author==='ailingqu'?'https://github.com/ailingqu':safeURL(c.source_url);
const searchIndex=new Map(cases.map(c=>[c.id,[c.title,c.author,c.model,c.model_family,c.category,c.prompt,c.description].join(' ').toLowerCase()]));
let saved;try{saved=new Set(JSON.parse(localStorage.getItem('visual-atlas-saved')||'[]'))}catch{saved=new Set()}
let type='all',model='',category='',limit=24,filtered=[],current=null,detailList=[],gridScroll=0,returnFocus=null,ownedHistory=false;
const positions=new Map(),visibleCards=new Set(),userPaused=new Set();
let reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;const saveData=navigator.connection?.saveData;
let layoutFrame=0,playFrame=0;
function toast(text){$('#toast').innerHTML=icon('check')+'<span>'+esc(text)+'</span>';$('#toast').classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('visible'),2300)}
function setMenu(open){const wasOpen=document.body.classList.contains('menu-open');document.body.classList.toggle('menu-open',open);$('#menuToggle').setAttribute('aria-expanded',String(open));$('#menuToggle').setAttribute('aria-label',open?'关闭导航':'打开导航');$('#menuToggle').innerHTML=icon(open?'x':'menu');if(open&&!wasOpen)AtlasMotion.enter($('#sidebar'),{x:-8});}
function syncNav(){
 $$('[data-type]').forEach(b=>{const on=b.dataset.type===type;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on))});
 $$('[data-model]').forEach(b=>{const on=b.dataset.model===model;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on))});
 $$('[data-category]').forEach(b=>{const on=b.dataset.category===category;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on))});
 $('#savedCount').textContent=saved.size||'';$('#pageTitle').textContent=type==='saved'?'收藏的作品':model||'精选作品';
}
function persistSaved(){try{localStorage.setItem('visual-atlas-saved',JSON.stringify([...saved]))}catch{toast('收藏仅在本次浏览中保存')}}
function save(id){saved.has(id)?saved.delete(id):saved.add(id);persistSaved();$$('[data-save]').filter(b=>b.dataset.save===id).forEach(b=>{b.classList.toggle('saved',saved.has(id));b.setAttribute('aria-pressed',String(saved.has(id)));b.setAttribute('aria-label',saved.has(id)?'取消收藏':'收藏作品')});syncNav();$$('[data-save]').filter(b=>b.dataset.save===id).forEach(b=>AtlasMotion.pulse(b));if(type==='saved'&&!current)render()}
function card(c){
 const el=document.createElement('article');el.className='work';el.dataset.caseId=c.id;el.setAttribute('aria-label',c.title);
 const [w,h]=still(c)?[c.width,c.height]:local(c)?dimensions(c):[4,3];el.dataset.ratio=String(w/h);el.dataset.enter='true';
 el.innerHTML=`<div class="media-stage">${hasMedia(c)?`<img class="work-image" src="${esc(previewURL(c))}" alt="${esc(c.title)}" width="${w}" height="${h}" loading="lazy" decoding="async">`:`<div class="x-card"><span class="x-mark">𝕏</span><h2>${esc(c.title)}</h2><p>${esc(c.author)} · ${esc(c.model_family||c.model)}</p></div>`}<button class="open-work" data-open="${esc(c.id)}" aria-label="查看 ${esc(c.title)}">查看作品</button></div><a class="corner author-corner" href="${esc(authorURL(c))}" target="_blank" rel="noopener" title="${esc(c.author)}">${avatar(c)}</a><a class="corner round-action source-corner" href="${esc(safeURL(c.source_url))}" target="_blank" rel="noopener" aria-label="查看作品原始来源">${icon('arrow-up-right')}</a><button class="corner round-action save-corner ${saved.has(c.id)?'saved':''}" data-save="${esc(c.id)}" aria-label="${saved.has(c.id)?'取消收藏':'收藏作品'}" aria-pressed="${saved.has(c.id)}">${icon('bookmark')}</button>${local(c)?`<button class="corner round-action play-corner" data-play="${esc(c.id)}" aria-label="播放动画">${icon('play')}</button>`:''}`;
 return el;
}
function layout(){cancelAnimationFrame(layoutFrame);layoutFrame=requestAnimationFrame(()=>{
 const grid=$('#grid'),width=grid.clientWidth,gap=12;
 const cols=innerWidth<=700?1:Math.max(1,Math.min(6,Math.floor((width+gap)/280)));
 const cw=(width-gap*(cols-1))/cols,heights=Array(cols).fill(0);
 for(const el of grid.children){const col=heights.indexOf(Math.min(...heights)),height=cw/Number(el.dataset.ratio);el.style.width=cw+'px';el.style.height=height+'px';el.style.transform=`translate(${col*(cw+gap)}px,${heights[col]}px)`;heights[col]+=height+gap;if(el.dataset.enter){delete el.dataset.enter;AtlasMotion.enter(el.querySelector('.media-stage'),{y:6,duration:220})}}
 grid.style.height=Math.max(0,Math.max(...heights)-gap)+'px';
})}
function teardownCard(el){nearObserver.unobserve(el);visibleObserver.unobserve(el);visibleCards.delete(el);const v=el.querySelector('video');if(v){positions.set(el.dataset.caseId,v.currentTime);v.pause();v.removeAttribute('src');v.load()}}
function render(reset=true){
 if(reset)limit=24;
 const q=$('#search').value.trim().toLowerCase();
 filtered=cases.filter(c=>(type==='all'||type==='saved'&&saved.has(c.id)||c.type===type)&&(!model||(c.model_family||c.model)===model)&&(!category||c.category===category)&&(!$('#promptOnly').checked||c.prompt||c.prompt_reply_url)&&(!q||searchIndex.get(c.id).includes(q)));
 if($('#sort').value==='recent')filtered.sort((a,b)=>String(b.checked_at||'').localeCompare(String(a.checked_at||'')));
 const grid=$('#grid');if(reset){[...grid.children].forEach(teardownCard);grid.replaceChildren()}
 const from=grid.children.length;
 for(const c of filtered.slice(from,limit)){const el=card(c);grid.append(el);if(local(c)){nearObserver.observe(el);visibleObserver.observe(el)}}
 $('#empty').hidden=filtered.length>0;$('#count').textContent=`${filtered.length} 件作品`;$('#loadMore').hidden=limit>=filtered.length;
 syncNav();layout();setMenu(false);$('#clearSearch').hidden=!q;
}
function attachVideo(el){
 let v=el.querySelector('video');if(v)return v;
 const c=byID.get(el.dataset.caseId);if(!local(c))return null;
 v=document.createElement('video');v.className='work-video';v.dataset.caseId=c.id;v.src=videoURL(c);v.poster=posterURL(c);v.muted=true;v.loop=true;v.playsInline=true;v.preload='metadata';
 v.addEventListener('loadedmetadata',()=>{const t=positions.get(c.id);if(t&&Number.isFinite(v.duration))v.currentTime=Math.min(t,Math.max(0,v.duration-.02))});
 v.addEventListener('playing',()=>{if('requestVideoFrameCallback'in v)v.requestVideoFrameCallback(()=>v.classList.add('ready'));else v.classList.add('ready');updatePlay(el,true)});
 v.addEventListener('pause',()=>updatePlay(el,false));v.addEventListener('error',()=>{v.classList.remove('ready');updatePlay(el,false)});
 el.querySelector('.media-stage').prepend(v);return v;
}
function updatePlay(el,playing){const b=el.querySelector('[data-play]');if(b){b.innerHTML=icon(playing?'pause':'play');b.setAttribute('aria-label',playing?'暂停动画':'播放动画')}}
function pauseGrid(){ $$('#grid video').forEach(v=>{positions.set(v.dataset.caseId,v.currentTime);v.pause()}) }
function schedulePlayback(){cancelAnimationFrame(playFrame);playFrame=requestAnimationFrame(()=>{
 if(!$('#detail').hidden||document.hidden||document.body.classList.contains('menu-open')){pauseGrid();return}
 const candidates=[...visibleCards].filter(el=>el.isConnected&&!userPaused.has(el.dataset.caseId)).sort((a,b)=>Math.abs(a.getBoundingClientRect().top-innerHeight*.25)-Math.abs(b.getBoundingClientRect().top-innerHeight*.25));
 const active=new Set(candidates.slice(0,innerWidth<=700?1:3));
 $$('#grid video').forEach(v=>{const el=v.closest('.work');if(!active.has(el))v.pause()});
 if(!reduceMotion&&!saveData)active.forEach(el=>{const v=attachVideo(el);if(v?.paused)v.play().catch(()=>{})});
})}
const nearObserver=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting&&!saveData&&!reduceMotion)attachVideo(e.target);else if(!e.isIntersecting){const v=e.target.querySelector('video');if(v){positions.set(e.target.dataset.caseId,v.currentTime);v.pause();v.removeAttribute('src');v.load();v.remove()}}}),{rootMargin:'350px 0px'});
const visibleObserver=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting)visibleCards.add(e.target);else visibleCards.delete(e.target)});schedulePlayback()},{threshold:.35});
function togglePlay(id){const el=[...$('#grid').children].find(e=>e.dataset.caseId===id),v=el&&attachVideo(el);if(!v)return;if(!v.paused){v.pause();userPaused.add(id)}else{userPaused.delete(id);v.play().catch(()=>toast('暂时无法播放，请重试'))}}
let twitterPromise;
function timeout(p,ms=12000){return new Promise((res,rej)=>{const timer=setTimeout(()=>rej(Error('timeout')),ms);Promise.resolve(p).then(v=>{clearTimeout(timer);res(v)},e=>{clearTimeout(timer);rej(e)})})}
function ensureTwitter(){if(window.twttr?.widgets)return Promise.resolve(window.twttr);if(twitterPromise)return twitterPromise;const script=document.createElement('script');script.src='https://platform.twitter.com/widgets.js';script.async=true;twitterPromise=timeout(new Promise((res,rej)=>{script.onload=()=>window.twttr?.ready(res);script.onerror=()=>rej(Error());document.head.append(script)})).catch(e=>{twitterPromise=null;script.remove();throw e});return twitterPromise}
async function loadTweet(c,shell){
 const button=shell.querySelector('button');if(button.disabled)return;button.disabled=true;button.textContent='正在加载…';const status=shell.querySelector('.tweet-status');status.textContent='正在连接 X 官方作品…';shell.querySelector('.tweet-host')?.remove();const host=document.createElement('div');host.className='tweet-host';shell.prepend(host);
 try{const t=await ensureTwitter();if(!shell.isConnected)return;const id=c.source_url.match(/status\/(\d+)/)?.[1];if(!id)throw Error();const result=await timeout(t.widgets.createTweet(id,host,{dnt:true,conversation:'none'}));if(!result)throw Error();if(!shell.isConnected)return;button.remove();status.remove()}
 catch{host.remove();if(!shell.isConnected)return;button.disabled=false;button.textContent='重试加载';status.textContent='X 暂时无法加载，你仍可打开原帖查看。'}
}
function navHTML(c,index){return `<button class="icon-button" data-close aria-label="关闭详情">${icon('x')}</button><span class="spacer"></span><button class="icon-button ${saved.has(c.id)?'saved':''}" data-save="${esc(c.id)}" aria-label="收藏作品" aria-pressed="${saved.has(c.id)}">${icon('bookmark')}</button><button class="icon-button" data-step="-1" aria-label="上一件作品" ${index<=0?'disabled':''}>${icon('arrow-left')}</button><button class="icon-button" data-step="1" aria-label="下一件作品" ${index>=detailList.length-1?'disabled':''}>${icon('arrow-right')}</button>`}
function rememberDetail(){const v=$('#detail video');if(v&&current){positions.set(current,v.currentTime);v.pause();v.removeAttribute('src');v.load()}}
function detailMedia(c){return still(c)?`<img src="${esc(mediaURL(c.image_url))}" alt="${esc(c.title)}" width="${c.width}" height="${c.height}" decoding="async">`:local(c)?`<video id="detailVideo" src="${esc(videoURL(c))}" poster="${esc(posterURL(c))}" controls playsinline loop muted preload="metadata"></video>`:`<div class="detail-tweet"><p class="tweet-status" role="status">通过 X 官方嵌入查看作品</p><button id="loadTweet">加载 X 原作</button><a href="${esc(safeURL(c.source_url))}" target="_blank" rel="noopener">在 X 查看原作 ↗</a></div>`}
function neighborHTML(c,step){return c&&hasMedia(c)?`<button class="neighbor ${step<0?'prev':'next'}" data-step="${step}" aria-label="${step<0?'上一件':'下一件'}作品"><img src="${esc(previewURL(c))}" alt="${esc(c.title)}" loading="lazy"></button>`:''}
function openDetail(id,{historyMode='push'}={}){
 const c=byID.get(id);if(!c)return;
 AtlasMotion.cancelShared();const sourceCard=[...$('#grid').children].find(el=>el.dataset.caseId===id);const origin=sourceCard?.getBoundingClientRect();const first=!current;if(first){gridScroll=scrollY;returnFocus=document.activeElement;detailList=filtered.some(x=>x.id===id)?filtered.slice():cases.slice()}
 pauseGrid();rememberDetail();current=id;setMenu(false);document.body.classList.add('detail-open');$('#page').inert=true;$('#detail').hidden=false;
 const index=detailList.findIndex(x=>x.id===id),nav=navHTML(c,index),prev=detailList[index-1],next=detailList[index+1];
 $('#detailBody').innerHTML=`<div class="mobile-detail-bar">${nav}</div><div class="detail-layout"><section class="detail-info"><div class="detail-nav">${nav}</div><div class="detail-author">${avatar(c)}<h2 class="detail-title">${esc(c.title)}</h2><a class="author-name" href="${esc(authorURL(c))}" target="_blank" rel="noopener">${esc(c.author)} ↗</a></div><p class="description">${esc(c.description)}</p><dl class="metadata"><div class="meta-row"><dt>模型</dt><dd>${esc(c.model)}</dd></div><div class="meta-row"><dt>分类</dt><dd>${esc(c.category)}</dd></div><div class="meta-row"><dt>来源</dt><dd><a href="${esc(safeURL(c.source_url))}" target="_blank" rel="noopener">${c.source_kind==='github'?'GitHub 原作':'X 原帖'} ↗</a></dd></div></dl><section class="prompt-section"><h3>提示词${c.prompt&&!c.prompt_license?' · 摘录':''}</h3>${c.prompt?`<pre>${esc(c.prompt)}</pre><button class="copy-button" id="copyPrompt">${icon('copy')}${c.prompt_license?'复制提示词':'复制摘录'}</button>`:`<p class="description">${esc(c.prompt_status||'未找到作者公开的提示词。')}</p>`}${c.prompt_reply_url?`<p><a class="copy-button" href="${esc(safeURL(c.prompt_reply_url))}" target="_blank" rel="noopener">作者提示词原文 ↗</a></p>`:''}</section><details><summary>来源与使用说明</summary><p>${esc(c.attribution)}</p><p>${esc(c.license)}</p>${c.license_file?`<p><a href="${esc(c.license_file)}" target="_blank" rel="noopener">完整 MIT 许可与版权声明 ↗</a></p>`:''}<p>${esc(c.prompt_status||'')}</p><p>核查日期：${esc(c.checked_at)}。${still(c)?'原始静态图片，未重绘。模型版本未注明，本站未独立复现。':local(c)?'GIF 转为 MP4 并提取封面以优化加载，未重绘作品。模型由源仓库声明，本站未独立复现。':'通过 X 官方嵌入展示；本站未重新生成或替换作品。'}</p></details></section><section class="detail-media" aria-label="作品媒体"><div class="media-rail">${neighborHTML(prev,-1)}<div class="hero-media">${detailMedia(c)}</div>${neighborHTML(next,1)}</div></section></div>`;
 const v=$('#detailVideo');if(v){v.addEventListener('loadedmetadata',()=>{const t=positions.get(id)||0;if(Number.isFinite(v.duration))v.currentTime=Math.min(t,Math.max(0,v.duration-.02));if(!reduceMotion)v.play().catch(()=>{})},{once:true})}
 const load=$('#loadTweet');if(load)load.onclick=()=>loadTweet(c,load.closest('.detail-tweet'));
 const copy=$('#copyPrompt');if(copy)copy.onclick=async()=>{try{await navigator.clipboard.writeText(c.prompt);toast('已复制提示词');copy.innerHTML=icon('check')+'已复制';copy.classList.add('copied');AtlasMotion.pulse(copy)}catch{toast('复制失败，请选择文字复制')}};
 if(historyMode==='push'){history.pushState({...history.state,atlasDetail:true},'',urlFor(id));ownedHistory=true}else if(historyMode==='replace')history.replaceState(history.state,'',urlFor(id));
 $('#detail').scrollTop=0;AtlasMotion.enter($('.detail-info'),{y:6,duration:220});if(first&&origin&&local(c))AtlasMotion.shared(posterURL(c),origin,$('#detailVideo'));else AtlasMotion.enter($('.hero-media'),{x:AtlasMotion.direction*14,duration:180});$$('#detail [data-close]').find(el=>el.offsetParent!==null)?.focus({preventScroll:true});
}
function urlFor(id){return location.pathname+location.search+(id?'#work='+encodeURIComponent(id):'')}
function idFromURL(){return new URLSearchParams(location.hash.slice(1)).get('work')}
function closeDetail({navigate=true}={}){if($('#detail').hidden)return;AtlasMotion.cancelShared();const closing=current&&byID.get(current),from=$('#detailVideo')?.getBoundingClientRect();rememberDetail();const returnedID=current;const gridVideo=$$('#grid video').find(v=>v.dataset.caseId===returnedID);if(gridVideo&&positions.has(returnedID)){try{gridVideo.currentTime=positions.get(returnedID)}catch{}}current=null;$('#detail').hidden=true;$('#detailBody').replaceChildren();document.body.classList.remove('detail-open');$('#page').inert=false;if(closing&&from&&local(closing)){const target=[...$('#grid').children].find(el=>el.dataset.caseId===closing.id);AtlasMotion.shared(posterURL(closing),from,target,220)}if(navigate){if(ownedHistory){ownedHistory=false;history.back()}else history.replaceState(history.state,'',urlFor(null))}requestAnimationFrame(()=>{if(!$('#detail').hidden)return;scrollTo(0,gridScroll);if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});schedulePlayback()});if(type==='saved')render()}
function moveDetail(step){const i=detailList.findIndex(c=>c.id===current),c=detailList[i+step];if(c){AtlasMotion.direction=step;openDetail(c.id,{historyMode:'replace'});AtlasMotion.direction=1}}
function syncHistory(){const id=idFromURL();if(id&&byID.has(id)){if(current!==id)openDetail(id,{historyMode:'none'})}else {ownedHistory=false;closeDetail({navigate:false})}}
$('#detail').onclick=e=>{const close=e.target.closest('[data-close]'),step=e.target.closest('[data-step]'),saveButton=e.target.closest('[data-save]');if(close)closeDetail();else if(step)moveDetail(Number(step.dataset.step));else if(saveButton)save(saveButton.dataset.save)};
$('#grid').onclick=e=>{const open=e.target.closest('[data-open]'),saveButton=e.target.closest('[data-save]'),play=e.target.closest('[data-play]');if(open)openDetail(open.dataset.open);else if(saveButton)save(saveButton.dataset.save);else if(play)togglePlay(play.dataset.play)};
$('#sidebar').onclick=e=>{const b=e.target.closest('[data-type],[data-model]');if(!b)return;if(current)closeDetail();if(b.dataset.type){type=b.dataset.type;model=''}else model=model===b.dataset.model?'':b.dataset.model;render()};
$('#categories').onclick=e=>{const b=e.target.closest('[data-category]');if(b){category=b.dataset.category;render()}};
$('#clearSearch').onclick=()=>{$('#search').value='';render();$('#search').focus()};
let searchTimer;$('#search').oninput=()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>render(),160)};
$('#promptOnly').onchange=()=>render();
function closeSort(){$('#sortMenu').hidden=true;$('#sortTrigger').setAttribute('aria-expanded','false')}
$('#sortTrigger').onclick=()=>{const open=$('#sortMenu').hidden;$('#sortMenu').hidden=!open;$('#sortTrigger').setAttribute('aria-expanded',String(open));if(open)AtlasMotion.enter($('#sortMenu'),{y:-4,duration:170})};
$('#sortMenu').onclick=e=>{const b=e.target.closest('[data-sort]');if(!b)return;$('#sort').value=b.dataset.sort;$$('[data-sort]').forEach(el=>el.setAttribute('aria-pressed',String(el===b)));$('#sortTrigger').innerHTML=(b.dataset.sort==='curated'?'编辑排序':'最近核实')+' <span aria-hidden="true">⌄</span>';closeSort();render();$('#sortTrigger').focus()};
document.addEventListener('click',e=>{if(!e.target.closest('.sort'))closeSort()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#sortMenu').hidden){e.stopImmediatePropagation();closeSort();$('#sortTrigger').focus()}},true);
$('#sort').onchange=()=>render();$('#loadMore').onclick=()=>{limit+=24;render(false)};
$('#reset').onclick=()=>{type='all';model='';category='';$('#search').value='';$('#promptOnly').checked=false;render()};
$('#menuToggle').onclick=()=>{setMenu(!document.body.classList.contains('menu-open'));schedulePlayback()};
$('#repo').href=safeURL(window.ATLAS.repository)||'https://github.com/biletian/ai-visual-atlas';$('#totalCount').textContent=cases.length;
$('#searchIcon').innerHTML=icon('search');setMenu(false);
for(const m of [...new Set(cases.map(c=>c.model_family||c.model))]){const b=document.createElement('button');b.dataset.model=m;b.textContent=m==='ChatGPT Images 2.6'?'Images 2.6':m;$('#modelLinks').append(b)}
for(const cat of ['',...new Set(cases.map(c=>c.category))]){const b=document.createElement('button');b.dataset.category=cat;b.textContent=cat||'全部';$('#categories').append(b)}
$('#aboutButton').onclick=()=>{if(current){closeDetail({navigate:false});ownedHistory=false;history.replaceState(history.state,'',urlFor(null))}gridScroll=scrollY;returnFocus=document.activeElement;pauseGrid();document.body.classList.add('detail-open');$('#page').inert=true;$('#detail').hidden=false;setMenu(false);$('#detailBody').innerHTML=`<div class="about-layout"><button class="icon-button" data-close aria-label="关闭">${icon('x')}</button><h2>作品属于创作者。</h2><p>Atlas 展示经视觉筛选的 AI 影像案例。当前展示 12 条动态案例及 5 张新收录的静态作品，其他记录与素材保留归档，不在发现页展示。</p><p>使用作者明确授权的媒体或 X 官方嵌入。收藏仅保存在当前浏览器。收录不代表所有作品都可以自由商用，请查看各作品的许可。</p><p>本轮按画面完成度、创意、用途和重复度筛选。动态素材采用抽帧检查，新增静态作品按全尺寸检查；不代表行业最佳或生成效果保证。GPT Image 案例未注明版本，不归入 Images 2.6。没有公开的提示词，不以推测补齐。</p></div>`;$('#detail [data-close]').focus()};
window.addEventListener('resize',layout);new ResizeObserver(layout).observe($('#grid'));
window.addEventListener('popstate',syncHistory);window.addEventListener('hashchange',syncHistory);
document.addEventListener('visibilitychange',()=>{if(document.hidden){pauseGrid();$('#detailVideo')?.pause()}else schedulePlayback()});
document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();if(current)closeDetail();$('#search').focus()}if(e.key==='Escape'){setMenu(false);closeDetail()}if(!$('#detail').hidden&&e.key==='Tab'){const focusables=$$('#detail button:not(:disabled),#detail a[href],#detail video[controls],#detail summary').filter(el=>el.offsetParent!==null);if(!focusables.length)return;const first=focusables[0],last=focusables.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}if(current&&!['INPUT','TEXTAREA','SELECT','VIDEO'].includes(document.activeElement.tagName)){if(e.key==='ArrowRight')moveDetail(1);if(e.key==='ArrowLeft')moveDetail(-1)}});
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',e=>{reduceMotion=e.matches;if(reduceMotion){pauseGrid();$('#detailVideo')?.pause()}else schedulePlayback()});
render();syncHistory();
