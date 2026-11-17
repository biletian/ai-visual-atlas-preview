const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeURL=u=>{try{const v=new URL(u);return v.protocol==='https:'?v.href:''}catch{return ''}};
const mediaURL=u=>/^assets\/[a-zA-Z0-9_./-]+$/.test(u||'')?u:safeURL(u);
const icon=n=>window.AtlasUI.icon(n),avatar=c=>window.AtlasUI.avatar(c);
const archivedCases=window.ATLAS.cases.filter(c=>c.publish_ready),byID=new Map(archivedCases.map(c=>[c.id,c]));
const selectedCases=window.ATLAS_CURATION.featured_ids.map(id=>byID.get(id)).filter(Boolean);
const local=c=>!!(c.image_url&&((c.media_authorized==='cc-by-4.0'&&c.image_url.endsWith('.gif'))||(c.type==='video'&&c.media_authorized==='owner-directed-display'&&/^assets\/[a-zA-Z0-9_./-]+\.mp4$/.test(c.image_url)&&/^assets\/[a-zA-Z0-9_./-]+\.(png|webp|jpe?g)$/.test(c.poster_url||'')&&c.width>0&&c.height>0)));
const still=c=>['mit','cc0-1.0','cc-by-4.0','user-confirmed-display','owner-directed-display'].includes(c.media_authorized)&&/\.(png|webp|jpe?g)$/.test(c.image_url||'')&&c.width>0&&c.height>0;
const hasMedia=c=>local(c)||still(c);
// Discovery is media-first. Embed-only records stay accessible by their source/deep links.
const cases=selectedCases.filter(hasMedia);
const previewURL=c=>still(c)?mediaURL(c.thumbnail_url||c.image_url):posterURL(c);
const videoURL=c=>mediaURL(c.image_url).replace(/\.gif$/,'.mp4'),posterURL=c=>mediaURL(c.poster_url||c.image_url.replace(/\.gif$/,'.webp'));
const dimensions=c=>c.width>0&&c.height>0?[c.width,c.height]:mediaDimensions[(c.image_url||'').split('/').pop()]||[4,3];
const authorURL=c=>c.author_url?safeURL(c.author_url):c.author==='ailingqu'?'https://github.com/ailingqu':safeURL(c.source_url);
const searchIndex=new Map(cases.map(c=>[c.id,[c.title,c.author,c.model,c.model_family,c.category,c.prompt,c.description].join(' ').toLowerCase()]));
// Full prompts and galleries are fetched only when used; source objects remain authoritative.
const detailRequests=new Map();let searchRequest=null,detailRequestToken=0;
async function loadDetails(c){
 if(!c.detail_path||c.detail_loaded)return;
 let request=detailRequests.get(c.detail_path);
 if(!request){request=fetch(c.detail_path).then(r=>{if(!r.ok)throw Error('detail');return r.json()}).then(records=>{for(const record of records){const target=byID.get(record.id);if(target)Object.assign(target,record,{detail_loaded:true})}}).catch(e=>{detailRequests.delete(c.detail_path);throw e});detailRequests.set(c.detail_path,request)}
 await request;
}
function loadSearch(){
 if(!window.ATLAS.search_path)return Promise.resolve();
 if(!searchRequest)searchRequest=fetch(window.ATLAS.search_path).then(r=>{if(!r.ok)throw Error('search');return r.json()}).then(rows=>{for(const [id,text] of rows)searchIndex.set(id,text)}).catch(e=>{searchRequest=null;throw e});
 return searchRequest;
}
// Group model families without silently upgrading unknown versions.
function modelFamily(name){
 if(/GPT Image|ChatGPT Images/i.test(name))return 'GPT Image';
 if(/Nano Banana/i.test(name))return 'Nano Banana';
 if(/^Veo/i.test(name))return 'Veo';
 if(/^Midjourney/i.test(name))return 'Midjourney';
 if(/^Seedance(?=\s|\d|[（(]|$)/i.test(name))return 'Seedance';
 if(/^Kling(?=\s|\d|[（(]|$)/i.test(name))return 'Kling';
 if(/^(?:MiniMax|Hailuo)(?=\s|\d|[（(]|$)/i.test(name))return 'MiniMax';
 if(/^Sora(?=\s|\d|[（(]|$)/i.test(name))return 'Sora';
 if(/^Wan(?=\s|\d|[（(]|$)/i.test(name))return 'Wan';
 return '其他 / 待确认';
}
function modelKey(name){return name==='Gemini Nano Banana Pro'?'Nano Banana Pro':name}
function modelMatches(c,key){const name=c.model_family||c.model;return key.startsWith('family:')?modelFamily(name)===key.slice(7):modelKey(name)===key}
function modelLabel(key){return key.startsWith('family:')?key.slice(7):key}
let saved;try{saved=new Set(JSON.parse(localStorage.getItem('visual-atlas-saved')||'[]'))}catch{saved=new Set()}
let type='all',model='',category='',limit=24,filtered=[],current=null,detailList=[],gridScroll=0,returnFocus=null,ownedHistory=false;
const positions=new Map(),visibleCards=new Set(),userPaused=new Set();
let reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;const saveData=navigator.connection?.saveData;
let layoutFrame=0,playFrame=0,feedFrame=0,feedLoading=false;
function toast(text){$('#toast').innerHTML=icon('check')+'<span>'+esc(text)+'</span>';$('#toast').classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('visible'),2300)}
function setMenu(open){const wasOpen=document.body.classList.contains('menu-open');document.body.classList.toggle('menu-open',open);$('#menuToggle').setAttribute('aria-expanded',String(open));$('#menuToggle').setAttribute('aria-label',open?'关闭导航':'打开导航');$('#menuToggle').innerHTML=icon(open?'x':'menu');if(open&&!wasOpen)AtlasMotion.enter($('#sidebar'),{x:-8});}
function syncNav(){
 $$('[data-type]').forEach(b=>{const on=b.dataset.type===type;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on))});
 $$('[data-model]').forEach(b=>{const on=b.dataset.model===model;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on))});
 $$('[data-category]').forEach(b=>{const on=b.dataset.category===category;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on))});
 $$('[data-model-group]').forEach(b=>{const selected=!!model&&(model.startsWith('family:')?model.slice(7):modelFamily(model))===b.dataset.modelGroup;b.classList.toggle('has-selection',selected)});
 $('#savedCount').textContent=cases.filter(c=>saved.has(c.id)).length||'';$('#pageTitle').textContent=type==='saved'?'收藏的作品':modelLabel(model)||(type==='image'?'图像与动图':type==='video'?'视频作品':'精选作品');
}
function persistSaved(){try{localStorage.setItem('visual-atlas-saved',JSON.stringify([...saved]))}catch{toast('收藏仅在本次浏览中保存')}}
function save(id){saved.has(id)?saved.delete(id):saved.add(id);persistSaved();$$('[data-save]').filter(b=>b.dataset.save===id).forEach(b=>{b.classList.toggle('saved',saved.has(id));b.setAttribute('aria-pressed',String(saved.has(id)));b.setAttribute('aria-label',saved.has(id)?'取消收藏':'收藏作品')});syncNav();$$('[data-save]').filter(b=>b.dataset.save===id).forEach(b=>AtlasMotion.pulse(b));if(type==='saved'&&!current)render()}
function card(c){
 const el=document.createElement('article');el.className='work';el.dataset.caseId=c.id;el.setAttribute('aria-label',c.title);
 const [w,h]=still(c)?[c.width,c.height]:local(c)?dimensions(c):[4,3];el.dataset.ratio=String(w/h);el.dataset.enter='true';
 el.innerHTML=`<div class="media-stage">${hasMedia(c)?`<img class="work-image" src="${esc(previewURL(c))}" alt="${esc(c.title)}" width="${w}" height="${h}" loading="lazy" decoding="async">`:`<div class="x-card"><span class="x-mark">𝕏</span><h2>${esc(c.title)}</h2><p>${esc(c.author)} · ${esc(c.model_family||c.model)}</p></div>`}<button class="open-work" data-open="${esc(c.id)}" aria-label="查看 ${esc(c.title)}">查看作品</button></div><div class="hover-caption"><strong>${esc(c.title)}</strong><span>${esc(c.author)}</span></div><a class="corner author-corner" href="${esc(authorURL(c))}" target="_blank" rel="noopener" title="${esc(c.author)}">${avatar(c)}</a><a class="corner round-action source-corner" href="${esc(safeURL(c.source_url))}" target="_blank" rel="noopener" aria-label="查看作品原始来源">${icon('arrow-up-right')}</a><button class="corner round-action save-corner ${saved.has(c.id)?'saved':''}" data-save="${esc(c.id)}" aria-label="${saved.has(c.id)?'取消收藏':'收藏作品'}" aria-pressed="${saved.has(c.id)}">${icon('bookmark')}</button>${local(c)?`<button class="corner round-action play-corner" data-play="${esc(c.id)}" aria-label="播放动画">${icon('play')}</button>`:''}`;
 const img=el.querySelector('.work-image');if(img)img.addEventListener('error',()=>{const status=document.createElement('span');status.className='media-error';status.textContent='图片暂时无法加载 · 点击查看来源';img.hidden=true;el.querySelector('.media-stage').prepend(status);},{once:true});
 return el;
}
let masonry=null;
function layout(){cancelAnimationFrame(layoutFrame);layoutFrame=requestAnimationFrame(()=>{
 const grid=$('#grid'),width=grid.clientWidth,gap=innerWidth<=700?12:16;
 const cols=innerWidth<=700?1:Math.max(1,Math.min(6,Math.floor((width+gap)/280)));
 const cw=(width-gap*(cols-1))/cols,reuse=masonry&&masonry.width===width&&masonry.cols===cols&&masonry.first===grid.firstElementChild&&masonry.count<=grid.children.length,heights=reuse?masonry.heights.slice():Array(cols).fill(0);
 for(const el of [...grid.children].slice(reuse?masonry.count:0)){const col=heights.indexOf(Math.min(...heights)),height=el.classList.contains('embedded-work')?Math.max(420,el.querySelector('.grid-tweet').scrollHeight+64):cw/Number(el.dataset.ratio);el.style.width=cw+'px';el.style.height=height+'px';el.style.transform=`translate(${col*(cw+gap)}px,${heights[col]}px)`;heights[col]+=height+gap;if(el.dataset.enter){delete el.dataset.enter;AtlasMotion.enter(el.querySelector('.media-stage'),{y:18,duration:340,delay:Math.min(col*35,105)})}}
 masonry={width,cols,first:grid.firstElementChild,count:grid.children.length,heights};
 grid.style.height=Math.max(0,Math.max(...heights)-gap)+'px';
 scheduleFeedLoad();
})}
function teardownCard(el){nearObserver.unobserve(el);visibleObserver.unobserve(el);visibleCards.delete(el);const v=el.querySelector('video');if(v){positions.set(el.dataset.caseId,v.currentTime);v.pause();v.removeAttribute('src');v.load()}}
function render(reset=true){
 if(reset)limit=24;
 const q=$('#search').value.trim().toLowerCase();
 filtered=cases.filter(c=>(type==='all'||type==='saved'&&saved.has(c.id)||c.type===type)&&(!model||modelMatches(c,model))&&(!category||c.category===category)&&(!$('#promptOnly').checked||c.has_prompt||c.prompt||c.prompt_reply_url)&&(!q||searchIndex.get(c.id).includes(q)));
 if($('#sort').value==='recent')filtered.sort((a,b)=>String(b.checked_at||'').localeCompare(String(a.checked_at||'')));
 const grid=$('#grid');if(reset){[...grid.children].forEach(teardownCard);grid.replaceChildren()}
 const from=grid.children.length;
 for(const c of filtered.slice(from,limit)){const el=card(c);grid.append(el);if(local(c)){nearObserver.observe(el);visibleObserver.observe(el)}}
 grid.hidden=!grid.children.length;
 $('#empty').hidden=filtered.length>0;if(!filtered.length){$('#empty h2').textContent=type==='saved'?'还没有符合筛选的收藏':type==='video'?'精选视频正在整理':'没有找到相关作品';$('#empty p').textContent=type==='video'?'先看看图像与动图，或清除筛选。':'换个关键词，或清除筛选再看看。'}$('#count').textContent=`${filtered.length} 件作品`;$('#feedSentinel').hidden=!filtered.length;$('#feedStatus').textContent=limit>=filtered.length&&filtered.length?'已显示全部作品':'';
 syncNav();layout();setMenu(false);$('#clearSearch').hidden=!q;
}
// Append one batch near the bottom; existing cards, playback and scroll stay intact.
function scheduleFeedLoad(){
 cancelAnimationFrame(feedFrame);feedFrame=requestAnimationFrame(()=>{
  if(feedLoading||document.hidden||!$('#detail').hidden||document.body.classList.contains('menu-open')||limit>=filtered.length)return;
  const marker=$('#feedSentinel');if(marker.hidden||marker.getBoundingClientRect().top>innerHeight+800)return;
  feedLoading=true;$('#feedStatus').textContent='正在加载更多作品…';
  limit=Math.min(limit+24,filtered.length);render(false);feedLoading=false;
 });
}
const feedObserver=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting))scheduleFeedLoad()},{rootMargin:'800px 0px'});
feedObserver.observe($('#feedSentinel'));
window.addEventListener('scroll',scheduleFeedLoad,{passive:true});
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
 const candidates=[...visibleCards].filter(el=>el.isConnected&&!userPaused.has(el.dataset.caseId)).map(el=>({el,distance:Math.abs(el.getBoundingClientRect().top-innerHeight*.25)})).sort((a,b)=>a.distance-b.distance).map(x=>x.el);
 const active=new Set(candidates.slice(0,innerWidth<=700?1:3));
 $$('#grid video').forEach(v=>{const el=v.closest('.work');if(!active.has(el))v.pause()});
 if(!reduceMotion&&!saveData)active.forEach(el=>{const v=attachVideo(el);if(v?.paused)v.play().catch(()=>{})});
})}
const nearObserver=new IntersectionObserver(entries=>entries.forEach(e=>{if(!e.isIntersecting){const v=e.target.querySelector('video');if(v){positions.set(e.target.dataset.caseId,v.currentTime);v.pause();v.removeAttribute('src');v.load();v.remove()}}}),{rootMargin:'350px 0px'});
const visibleObserver=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting)visibleCards.add(e.target);else visibleCards.delete(e.target)});schedulePlayback()},{threshold:.35});
function togglePlay(id){const el=[...$('#grid').children].find(e=>e.dataset.caseId===id),v=el&&attachVideo(el);if(!v)return;if(!v.paused){v.pause();userPaused.add(id)}else{userPaused.delete(id);v.play().catch(()=>toast('暂时无法播放，请重试'))}}
let twitterPromise;
function timeout(p,ms=12000){return new Promise((res,rej)=>{const timer=setTimeout(()=>rej(Error('timeout')),ms);Promise.resolve(p).then(v=>{clearTimeout(timer);res(v)},e=>{clearTimeout(timer);rej(e)})})}
function ensureTwitter(){if(window.twttr?.widgets)return Promise.resolve(window.twttr);if(twitterPromise)return twitterPromise;const script=document.createElement('script');script.src='https://platform.twitter.com/widgets.js';script.async=true;twitterPromise=timeout(new Promise((res,rej)=>{script.onload=()=>window.twttr?.ready(res);script.onerror=()=>rej(Error());document.head.append(script)})).catch(e=>{twitterPromise=null;script.remove();throw e});return twitterPromise}
async function loadTweet(c,shell){
 const button=shell.querySelector('button');if(button.disabled)return;button.disabled=true;button.textContent='正在加载…';const status=shell.querySelector('.tweet-status');status.textContent='正在连接 X 官方作品…';shell.querySelector('.tweet-host')?.remove();const host=document.createElement('div');host.className='tweet-host';shell.prepend(host);
 try{const t=await ensureTwitter();if(!shell.isConnected)return;const id=c.source_url.match(/status\/(\d+)/)?.[1];if(!id)throw Error();const result=await timeout(t.widgets.createTweet(id,host,{dnt:true,conversation:'none',width:550}));if(!result)throw Error();if(!shell.isConnected)return;button.remove();status.remove()}
 catch{host.remove();if(!shell.isConnected)return;button.disabled=false;button.textContent='重试加载';status.textContent='X 暂时无法加载，你仍可打开原帖查看。'}
}
function navHTML(c,index){return `<button class="icon-button" data-close aria-label="关闭详情">${icon('x')}</button><span class="spacer"></span><button class="icon-button ${saved.has(c.id)?'saved':''}" data-save="${esc(c.id)}" aria-label="收藏作品" aria-pressed="${saved.has(c.id)}">${icon('bookmark')}</button><button class="icon-button" data-step="-1" aria-label="上一件作品" ${index<=0?'disabled':''}>${icon('arrow-left')}</button><button class="icon-button" data-step="1" aria-label="下一件作品" ${index>=detailList.length-1?'disabled':''}>${icon('arrow-right')}</button>`}
function rememberDetail(){const v=$('#detail video');if(v&&current){positions.set(detailPositionKey(),v.currentTime);v.pause();v.removeAttribute('src');v.load()}}
function detailMedia(c){const first=workImages(c)[0],video=local(c)?workVideos(c)[0]:null;return still(c)?`<img id="activeWorkImage" src="${esc(mediaURL(first.url))}" alt="${esc(first.alt||c.title)}" width="${first.width||c.width}" height="${first.height||c.height}" decoding="async">`:local(c)?`<video id="detailVideo" src="${esc(mediaURL(video.url))}" poster="${esc(mediaURL(video.poster_url))}" controls playsinline loop muted preload="metadata"></video>`:`<div class="detail-tweet"><p class="tweet-status" role="status">通过 X 官方嵌入查看作品</p><button id="loadTweet">加载 X 原作</button><a href="${esc(safeURL(c.source_url))}" target="_blank" rel="noopener">在 X 查看原作 <span class="external-mark">${icon('arrow-up-right')}</span></a></div>`}
// A gallery is one author's verified prompt set, never a list of neighboring cases.
let activeImageIndex=0,activeVideoIndex=0;
function detailPositionKey(){return activeVideoIndex?current+':video:'+activeVideoIndex:current}

function workImages(c){
 const fallback={url:c.image_url,width:c.width,height:c.height,alt:c.title};
 if(!still(c)||!c.image_set_verified||!Array.isArray(c.images))return [fallback];
 const seen=new Set();const images=c.images.filter(x=>x&&mediaURL(x.url)&&!seen.has(x.url)&&(seen.add(x.url),true));
 return images.length?images:[fallback];
}
function imageRail(c){const images=workImages(c);if(images.length<2)return '';
 return `<div class="image-set" aria-label="这组作品的图片"><div class="image-thumbnails">${images.map((m,i)=>`<button class="image-thumbnail" data-image-index="${i}" aria-label="查看组图第 ${i+1} 张" aria-pressed="${i===0}"><img src="${esc(mediaURL(m.thumbnail_url||m.url))}" alt="" loading="lazy"></button>`).join('')}</div><span class="image-counter" aria-live="polite">1 / ${images.length}</span></div>`;
}
function selectWorkImage(index){const c=byID.get(current);if(!c)return;const images=workImages(c);if(index<0||index>=images.length)return;
 activeImageIndex=index;const m=images[index],img=$('#activeWorkImage');if(!img)return;
 img.src=mediaURL(m.url);img.alt=m.alt||`${c.title} · 第 ${index+1} 张`;if(m.width)img.width=m.width;if(m.height)img.height=m.height;
 $$('#detail [data-image-index]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.imageIndex)===index)));
 const counter=$('#detail .image-counter');if(counter)counter.textContent=`${index+1} / ${images.length}`;
}

function workVideos(c){
 const fallback={url:videoURL(c),poster_url:posterURL(c),width:c.width,height:c.height,alt:c.title};
 if(!local(c)||!c.video_set_verified||!Array.isArray(c.videos))return [fallback];
 const seen=new Set();const videos=c.videos.filter(m=>m&&/^assets\/[a-zA-Z0-9_./-]+\.mp4$/.test(m.url||'')&&/^assets\/[a-zA-Z0-9_./-]+\.(?:png|webp|jpe?g)$/.test(m.poster_url||'')&&!seen.has(m.url)&&(seen.add(m.url),true));
 return videos.length?videos:[fallback];
}
function videoRail(c){if(!local(c))return '';const videos=workVideos(c);if(videos.length<2)return '';
 return `<div class="image-set" aria-label="这组作品的视频"><div class="image-thumbnails">${videos.map((m,i)=>`<button class="image-thumbnail" data-video-index="${i}" aria-label="查看视频第 ${i+1} 段" aria-pressed="${i===0}"><img src="${esc(mediaURL(m.poster_url))}" alt="" loading="lazy"></button>`).join('')}</div><span class="image-counter" aria-live="polite">1 / ${videos.length}</span></div>`;
}
function prepareDetailVideo(v,key,autoplay){
 v.addEventListener('loadedmetadata',()=>{if(v!==$('#detailVideo')||$('#detail').hidden||key!==detailPositionKey())return;const t=positions.get(key)||0;if(Number.isFinite(v.duration))v.currentTime=Math.min(t,Math.max(0,v.duration-.02));if(autoplay&&!reduceMotion)v.play().catch(()=>{})},{once:true});
}
function selectWorkVideo(index){const c=byID.get(current),v=$('#detailVideo');if(!c||!v)return;const videos=workVideos(c);if(!Number.isInteger(index)||index<0||index>=videos.length||index===activeVideoIndex)return;
 rememberDetail();activeVideoIndex=index;const m=videos[index];v.poster=mediaURL(m.poster_url);v.setAttribute('aria-label',m.alt||`${c.title} · 第 ${index+1} 段`);prepareDetailVideo(v,detailPositionKey(),false);v.src=mediaURL(m.url);v.load();
 $$('#detail [data-video-index]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.videoIndex)===index)));
 const counter=$('#detail .image-counter');if(counter)counter.textContent=`${index+1} / ${videos.length}`;
}

function neighborHTML(c,step){return c&&hasMedia(c)?`<button class="neighbor ${step<0?'prev':'next'}" data-step="${step}" aria-label="${step<0?'上一件':'下一件'}作品"><img src="${esc(previewURL(c))}" alt="${esc(c.title)}" loading="lazy"></button>`:''}
async function openDetail(id,{historyMode='push'}={}){
 if(closeMotion){const pending=closeMotion;closeMotion=null;pending.cancel();$('#detail').style.pointerEvents='';}
 const c=byID.get(id);if(!c)return;
 const requestToken=++detailRequestToken;
 if(c.detail_path&&!c.detail_loaded){
  const indicator=setTimeout(()=>{if(requestToken===detailRequestToken)toast('正在加载作品…')},350);
  try{await loadDetails(c)}catch{if(requestToken===detailRequestToken)toast('作品加载失败，请重试');return}finally{clearTimeout(indicator)}
  if(requestToken!==detailRequestToken)return;
 }

 AtlasMotion.cancelShared();const sourceCard=[...$('#grid').children].find(el=>el.dataset.caseId===id);const origin=sourceCard?.getBoundingClientRect();const first=!current;if(first){gridScroll=scrollY;returnFocus=document.activeElement;detailList=filtered.some(x=>x.id===id)?filtered.slice():cases.slice()}
 pauseGrid();rememberDetail();current=id;activeImageIndex=0;activeVideoIndex=0;setMenu(false);document.body.classList.add('detail-open');$('#page').inert=true;$('#detail').hidden=false;
 const index=detailList.findIndex(x=>x.id===id),nav=navHTML(c,index),prev=detailList[index-1],next=detailList[index+1];
 $('#detailBody').innerHTML=`<div class="persistent-detail-bar">${nav}</div><div class="detail-layout"><section class="detail-info"><div class="detail-author">${avatar(c)}<h2 class="detail-title">${esc(c.title)}</h2><a class="author-name" href="${esc(authorURL(c))}" target="_blank" rel="noopener">${esc(c.author)} <span class="external-mark">${icon('arrow-up-right')}</span></a></div><p class="description">${esc(c.description)}</p><dl class="metadata"><div class="meta-row"><dt>模型</dt><dd>${esc(c.model)}</dd></div><div class="meta-row"><dt>分类</dt><dd>${esc(c.category)}</dd></div><div class="meta-row"><dt>来源</dt><dd><a href="${esc(safeURL(c.source_url))}" target="_blank" rel="noopener">${c.source_kind==='github'?'GitHub 原作':c.source_kind==='official'?'官方来源':c.source_kind==='website'?'原始网站':'X 原帖'} <span class="external-mark">${icon('arrow-up-right')}</span></a></dd></div></dl><section class="prompt-section"><h3>提示词${c.prompt&&!c.prompt_license&&!c.prompt_full_verified?' · 摘录':''}</h3>${c.prompt_note?`<p class="description">${esc(c.prompt_note)}</p>`:''}${c.prompt?`<pre>${esc(c.prompt)}</pre><button class="copy-button" id="copyPrompt">${icon('copy')}${(c.prompt_license||c.prompt_full_verified)?'复制提示词':'复制摘录'}</button>`:`<p class="description">${esc(c.prompt_status||'未找到作者公开的提示词。')}</p>`}${c.prompt_reply_url?`<p><a class="copy-button" href="${esc(safeURL(c.prompt_reply_url))}" target="_blank" rel="noopener">作者提示词原文 <span class="external-mark">${icon('arrow-up-right')}</span></a></p>`:''}</section><details><summary>来源与使用说明</summary><p>${esc(c.attribution)}</p><p>${esc(c.license)}</p>${c.license_file?`<p><a href="${esc(c.license_file)}" target="_blank" rel="noopener">完整许可与版权声明 <span class="external-mark">${icon('arrow-up-right')}</span></a></p>`:''}<p>${esc(c.prompt_status||'')}</p><p>核查日期：${esc(c.checked_at)}。${still(c)?'原始静态作品，未重绘。模型信息以作者来源及本页标注为准，本站未独立复现。':c.type==='video'?'原帖动画由 X 以 MP4 提供，保留原始视频及封面，未重绘。模型信息按作者原帖标注，本站未独立复现。':local(c)?'GIF 转为 MP4 并提取封面以优化加载，未重绘作品。模型由源仓库声明，本站未独立复现。':'通过 X 官方嵌入展示；本站未重新生成或替换作品。'}</p></details></section><section class="detail-media" aria-label="作品媒体"><div class="media-rail">${neighborHTML(prev,-1)}<div class="hero-media">${detailMedia(c)}</div>${neighborHTML(next,1)}</div>${local(c)?videoRail(c):imageRail(c)}</section></div>`;
 const v=$('#detailVideo');if(v)prepareDetailVideo(v,detailPositionKey(),true);
 const load=$('#loadTweet');if(load)load.onclick=()=>loadTweet(c,load.closest('.detail-tweet'));
 const copy=$('#copyPrompt');if(copy)copy.onclick=async()=>{try{await navigator.clipboard.writeText(c.prompt);toast('已复制提示词');copy.innerHTML=icon('check')+'已复制';copy.classList.add('copied');AtlasMotion.pulse(copy)}catch{toast('复制失败，请选择文字复制')}};
 if(historyMode==='push'){history.pushState({...history.state,atlasDetail:true},'',urlFor(id));ownedHistory=true}else if(historyMode==='replace')history.replaceState(history.state,'',urlFor(id));
 $('#detail').scrollTop=0;if(first)AtlasMotion.reveal($('#detail'));AtlasMotion.enter($('.detail-info'),{x:24,duration:360});if(first&&origin&&local(c))AtlasMotion.shared(posterURL(c),origin,$('#detailVideo'));else AtlasMotion.enter($('.hero-media'),{x:AtlasMotion.direction*28,duration:300});$$('#detail [data-close]').find(el=>el.offsetParent!==null)?.focus({preventScroll:true});
}
function urlFor(id){return location.pathname+location.search+(id?'#work='+encodeURIComponent(id):'')}
function idFromURL(){return new URLSearchParams(location.hash.slice(1)).get('work')}
let closeMotion=null;
function closeDetail(options={}){if($('#detail').hidden||closeMotion)return;const a=AtlasMotion.leave($('#detail'));if(!a){finishCloseDetail(options);return}closeMotion=a;$('#detail').style.pointerEvents='none';a.finished.catch(()=>{}).then(()=>{if(closeMotion!==a)return;closeMotion=null;$('#detail').style.pointerEvents='';finishCloseDetail(options)});}
function finishCloseDetail({navigate=true}={}){++detailRequestToken;if($('#detail').hidden)return;AtlasMotion.cancelShared();const closing=current&&byID.get(current),from=$('#detailVideo')?.getBoundingClientRect();rememberDetail();const returnedID=current;const gridVideo=$$('#grid video').find(v=>v.dataset.caseId===returnedID);if(gridVideo&&positions.has(returnedID)){try{gridVideo.currentTime=positions.get(returnedID)}catch{}}current=null;$('#detail').hidden=true;$('#detailBody').replaceChildren();document.body.classList.remove('detail-open');$('#page').inert=false;if(closing&&from&&local(closing)){const target=[...$('#grid').children].find(el=>el.dataset.caseId===closing.id);AtlasMotion.shared(posterURL(closing),from,target,220)}if(navigate){if(ownedHistory){ownedHistory=false;history.back()}else history.replaceState(history.state,'',urlFor(null))}requestAnimationFrame(()=>{if(!$('#detail').hidden)return;scrollTo(0,gridScroll);if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});schedulePlayback();scheduleFeedLoad()});if(type==='saved')render()}
function moveDetail(step){const i=detailList.findIndex(c=>c.id===current),c=detailList[i+step];if(c){AtlasMotion.direction=step;openDetail(c.id,{historyMode:'replace'});AtlasMotion.direction=1}}
function syncHistory(){const id=idFromURL();if(id&&byID.has(id)){if(current!==id)openDetail(id,{historyMode:'none'})}else {ownedHistory=false;closeDetail({navigate:false})}}
$('#detail').onclick=e=>{const videoButton=e.target.closest('[data-video-index]'),imageButton=e.target.closest('[data-image-index]'),close=e.target.closest('[data-close]'),step=e.target.closest('[data-step]'),saveButton=e.target.closest('[data-save]');if(videoButton)selectWorkVideo(Number(videoButton.dataset.videoIndex));else if(imageButton)selectWorkImage(Number(imageButton.dataset.imageIndex));else if(close)closeDetail();else if(step)moveDetail(Number(step.dataset.step));else if(saveButton)save(saveButton.dataset.save)};
$('#page').onclick=e=>{const open=e.target.closest('[data-open]'),saveButton=e.target.closest('[data-save]'),play=e.target.closest('[data-play]');if(open)openDetail(open.dataset.open);else if(saveButton)save(saveButton.dataset.save);else if(play)togglePlay(play.dataset.play)};
$('#sidebar').onclick=e=>{const group=e.target.closest('[data-model-group]');if(group){const panel=document.getElementById(group.getAttribute('aria-controls'));const open=group.getAttribute('aria-expanded')!=='true';group.setAttribute('aria-expanded',String(open));panel.hidden=!open;return}const b=e.target.closest('[data-type],[data-model]');if(!b)return;if(current)closeDetail();if(b.dataset.type){type=b.dataset.type;model=''}else model=model===b.dataset.model?'':b.dataset.model;render()};
$('#categories').onclick=e=>{const b=e.target.closest('[data-category]');if(b){category=b.dataset.category;render()}};
$('#clearSearch').onclick=()=>{$('#search').value='';render();$('#search').focus()};
$('#search').addEventListener('focus',()=>{loadSearch().catch(()=>{})},{once:true});
let searchTimer,searchToken=0;$('#search').oninput=()=>{clearTimeout(searchTimer);const token=++searchToken;searchTimer=setTimeout(async()=>{if($('#search').value.trim()){try{await loadSearch()}catch{if(token===searchToken)toast('完整搜索加载失败，请重试');return}}if(token===searchToken)render()},160)};
$('#promptOnly').onchange=()=>render();
function closeSort(){$('#sortMenu').hidden=true;$('#sortTrigger').setAttribute('aria-expanded','false')}
$('#sortTrigger').onclick=()=>{const open=$('#sortMenu').hidden;$('#sortMenu').hidden=!open;$('#sortTrigger').setAttribute('aria-expanded',String(open));if(open)AtlasMotion.enter($('#sortMenu'),{y:-4,duration:170})};
$('#sortMenu').onclick=e=>{const b=e.target.closest('[data-sort]');if(!b)return;$('#sort').value=b.dataset.sort;$$('[data-sort]').forEach(el=>el.setAttribute('aria-pressed',String(el===b)));$('#sortTrigger').innerHTML=(b.dataset.sort==='curated'?'编辑排序':'最近核实')+' <span aria-hidden="true">⌄</span>';closeSort();render();$('#sortTrigger').focus()};
document.addEventListener('click',e=>{if(!e.target.closest('.sort'))closeSort()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#sortMenu').hidden){e.stopImmediatePropagation();closeSort();$('#sortTrigger').focus()}},true);
$('#sort').onchange=()=>render();
$('#reset').onclick=()=>{type='all';model='';category='';$('#search').value='';$('#promptOnly').checked=false;render()};
$('#menuToggle').onclick=()=>{setMenu(!document.body.classList.contains('menu-open'));schedulePlayback()};
$('#repo').href=safeURL(window.ATLAS.repository)||'https://github.com/biletian/ai-visual-atlas';$('#totalCount').textContent=cases.length;
$('#searchIcon').innerHTML=icon('search');setMenu(false);
const modelGroups=new Map();
for(const c of cases){const name=c.model_family||c.model,family=modelFamily(name);if(!modelGroups.has(family))modelGroups.set(family,new Set());modelGroups.get(family).add(modelKey(name))}
let modelGroupIndex=0;
for(const [family,versions] of modelGroups){
 const id='model-group-'+modelGroupIndex++,section=document.createElement('div');section.className='model-group';
 section.innerHTML=`<button class="model-group-toggle" data-model-group="${esc(family)}" aria-expanded="false" aria-controls="${id}"><span>${esc(family)}</span><svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="m6 3 5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg></button><div id="${id}" class="model-versions" hidden></div>`;
 const panel=section.lastElementChild;
 for(const value of ['family:'+family,...versions]){const b=document.createElement('button');b.dataset.model=value;b.setAttribute('aria-pressed','false');b.textContent=value.startsWith('family:')?'全部系列':value==='ChatGPT Images 2.6'?'Images 2.6':value;b.title=b.textContent;panel.append(b)}
 $('#modelLinks').append(section);
}
for(const cat of ['',...new Set(cases.map(c=>c.category))]){const b=document.createElement('button');b.dataset.category=cat;b.textContent=cat||'全部';$('#categories').append(b)}
$('#aboutButton').onclick=()=>{if(current){closeDetail({navigate:false});ownedHistory=false;history.replaceState(history.state,'',urlFor(null))}gridScroll=scrollY;returnFocus=document.activeElement;pauseGrid();document.body.classList.add('detail-open');$('#page').inert=true;$('#detail').hidden=false;setMenu(false);$('#detailBody').innerHTML=`<div class="about-layout"><button class="icon-button" data-close aria-label="关闭">${icon('x')}</button><h2>作品属于创作者。</h2><p>Atlas 展示经视觉筛选的 AI 影像案例。首页只展示可独立呈现的授权作品。点击图片后查看提示词、作者和来源；其他记录与素材保留归档。</p><p>首页使用作者明确授权的媒体。仅支持整帖嵌入的作品暂不展示在首页，原记录仍可通过旧链接访问。收藏仅保存在当前浏览器。收录不代表所有作品都可以自由商用，请查看各作品的许可。</p><p>本轮按画面完成度、创意、用途和重复度筛选。动态素材采用抽帧检查，新增静态作品按全尺寸检查；不代表行业最佳或生成效果保证。GPT Image 案例未注明版本，不归入 Images 2.6。没有公开的提示词，不以推测补齐。</p></div>`;$('#detail [data-close]').focus()};
window.addEventListener('resize',layout);new ResizeObserver(layout).observe($('#grid'));
window.addEventListener('popstate',syncHistory);window.addEventListener('hashchange',syncHistory);
document.addEventListener('visibilitychange',()=>{if(document.hidden){pauseGrid();$('#detailVideo')?.pause()}else {schedulePlayback();scheduleFeedLoad()}});
document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();if(current)closeDetail();$('#search').focus()}if(e.key==='Escape'){setMenu(false);closeDetail()}if(!$('#detail').hidden&&e.key==='Tab'){const focusables=$$('#detail button:not(:disabled),#detail a[href],#detail video[controls],#detail summary').filter(el=>el.offsetParent!==null);if(!focusables.length)return;const first=focusables[0],last=focusables.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}if(current&&!['INPUT','TEXTAREA','SELECT','VIDEO'].includes(document.activeElement.tagName)){if(e.key==='ArrowRight')moveDetail(1);if(e.key==='ArrowLeft')moveDetail(-1);if(e.key==='ArrowDown'&&workImages(byID.get(current)).length>1){e.preventDefault();selectWorkImage(activeImageIndex+1)}if(e.key==='ArrowUp'&&workImages(byID.get(current)).length>1){e.preventDefault();selectWorkImage(activeImageIndex-1)}}});
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',e=>{reduceMotion=e.matches;if(reduceMotion){pauseGrid();$('#detailVideo')?.pause()}else schedulePlayback()});
render();syncHistory();
