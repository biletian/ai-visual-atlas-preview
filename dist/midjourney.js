'use strict';
const styles=window.ATLAS_STYLES||[], $=s=>document.querySelector(s);
let category='全部',view='discover',selected=null,lastFocus=null,timer,closeTimer,openFrame;
const reduced=()=>matchMedia('(prefers-reduced-motion:reduce)').matches;
const mobile=()=>matchMedia('(max-width:760px)').matches;
const forms=['全部','摄影','插画','平面','3D','动漫'];
function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
function anchor(text,url){const a=el('a','',text);a.href=url;a.target='_blank';a.rel='noopener';return a;}
function code(s){return '--sref '+s.codes.join(' ');}
function notify(t){$('#toast').textContent=t;$('#toast').classList.add('show');clearTimeout(timer);timer=setTimeout(()=>$('#toast').classList.remove('show'),2500);}
async function copy(s,button){try{await navigator.clipboard.writeText(code(s));if(button){button.textContent='已复制';button.classList.add('copied');setTimeout(()=>{if(button.isConnected){button.textContent='复制';button.classList.remove('copied');}},1800);}notify('已复制完整风格代码');}catch{notify('复制不可用，请选中代码手动复制');}}
const select=$('#formSelect');select.replaceChildren();for(const form of forms){const option=el('option','',form==='全部'?'全部形式':form);option.value=form;select.append(option);}select.addEventListener('change',()=>{category=select.value;render();});
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{view=b.dataset.view;document.querySelectorAll('[data-view]').forEach(n=>n.setAttribute('aria-pressed',n===b));render();}));
function image(p,s){const i=el('img');i.src=p.url;i.alt=s.name+' · '+p.caption;i.loading='lazy';i.decoding='async';return i;}
function card(s){
 const b=el('button','style-card');b.dataset.code=code(s);b.setAttribute('aria-pressed',selected===s);b.type='button';b.setAttribute('aria-label','查看 '+s.name+' 风格详情');
 const media=el('div','card-media');media.append(image(s.previews[0],s));const count=Math.min(4,s.previews.length);
 if(count>1){const multi=el('div','hover-grid count-'+count);s.previews.slice(0,4).forEach(p=>multi.append(image(p,s)));media.append(multi);}
 media.append(el('span','image-count',s.previews.length+' 张示例'));
 const meta=el('div','card-meta');meta.append(el('h3','',s.name),el('span','model',s.modelVersion));
 const tags=el('div','tags');s.tags.slice(0,3).forEach(t=>tags.append(el('span','',t)));
 b.append(media,meta,tags);b.addEventListener('click',()=>openDetail(s));return b;
}
function render(){const q=$('#search').value.trim().toLowerCase().replace(/^--sref\s+/,'');const rows=styles.filter(s=>(category==='全部'||s.category===category)&&[s.name,s.codes.join(' '),...s.tags].join(' ').toLowerCase().includes(q));const visual=rows.filter(s=>s.previews?.length),index=rows.filter(s=>!s.previews?.length);$('#cards').replaceChildren(...visual.map(card));$('#indexCards').replaceChildren();for(const s of index){const b=el('button','index-card');b.type='button';b.append(el('strong','',s.name),el('code','',code(s)),el('span','','查看资料 ↗'));b.addEventListener('click',()=>openDetail(s));$('#indexCards').append(b);}$('#visualSection').hidden=view!=='discover';$('#indexSection').hidden=view!=='index';$('#empty').hidden=!!visual.length;$('#resultCount').textContent=view==='discover'?visual.length+' 个风格':index.length+' 组代码';}
function closeDetail(){cancelAnimationFrame(openFrame);clearTimeout(closeTimer);selected=null;document.querySelectorAll('.style-card').forEach(b=>b.setAttribute('aria-pressed','false'));document.body.classList.remove('detail-open');$('.page').inert=false;$('#detail').inert=true;$('#detail').removeAttribute('aria-modal');$('#detail').removeAttribute('role');lastFocus?.focus();if(reduced())$('#detail').hidden=true;else closeTimer=setTimeout(()=>{$('#detail').hidden=true;},420);}
function openDetail(s){
 clearTimeout(closeTimer);cancelAnimationFrame(openFrame);$('#detail').inert=false;
 selected=s;document.querySelectorAll('.style-card').forEach(b=>b.setAttribute('aria-pressed',b.dataset.code===code(s)));const identity=$('#detailIdentity');identity.replaceChildren();if(s.previews?.length)identity.append(image(s.previews[0],s));const heading=el('h2','',s.name);heading.id='detailTitle';identity.append(heading);
 lastFocus=document.activeElement;const body=$('#detailBody');body.replaceChildren();const gallery=el('div','detail-gallery');
 if(s.previews?.length){const main=el('a','detail-main');main.href=s.previews[0].url;main.target='_blank';main.rel='noopener';main.append(image(s.previews[0],s));gallery.append(main);
 if(s.previews.length){const thumbs=el('div','thumbs');s.previews.slice(0,4).forEach((p,i)=>{const b=el('button');b.type='button';b.setAttribute('aria-label','查看示例 '+(i+1));b.append(image(p,s));b.addEventListener('click',()=>{main.href=p.url;main.replaceChildren(image(p,s));});thumbs.append(b);});gallery.append(thumbs);}gallery.append(el('p','image-note',s.previews.length+' 张原始示例'));body.append(gallery);
 }else body.append(el('div','no-preview','暂无获许可的对应示例图'));
 const tags=el('div','tags');[s.category,...s.tags].forEach(t=>tags.append(el('span','',t)));body.append(tags);
 const row=el('div','copy-row');row.append(el('code','',code(s)));const cp=el('button','','复制');cp.type='button';cp.addEventListener('click',()=>copy(s,cp));row.append(cp);body.append(row);
 const dl=el('dl','facts');for(const [k,v] of [['模型',s.modelVersion],['风格版本 --sv',s.styleVersion??'未记录'],['风格权重 --sw',s.styleWeight??'未记录'],['个性化参数',s.personalizationCode??'未记录']])dl.append(el('dt','',k),el('dd','',v));body.append(dl);
 if(s.textPrompt){const block=el('details','prompt');block.append(el('summary','','原始提示词'),el('pre','',s.textPrompt));body.append(block);}
 const credits=el('div','credits');if(s.author)credits.append(el('p','',s.author+' · 作者原始生成示例'));credits.append(anchor('来源：'+s.source+' ↗',s.sourceUrl));if(s.license)credits.append(anchor(s.license+' 许可 ↗',s.licenseUrl));credits.append(el('p','','参数按来源保留，未记录项不填默认值；非本站重新实测。'));body.append(credits);
 $('#detail').hidden=false;$('#detail').scrollTop=0;const reveal=()=>{document.body.classList.add('detail-open');if(mobile()){$('.page').inert=true;$('#detail').setAttribute('role','dialog');$('#detail').setAttribute('aria-modal','true');$('#closeDetail').focus();}};if(reduced()||document.body.classList.contains('detail-open'))reveal();else openFrame=requestAnimationFrame(()=>{openFrame=requestAnimationFrame(reveal);});
}
$('#closeDetail').addEventListener('click',closeDetail);$('#backdrop').addEventListener('click',closeDetail);$('#search').addEventListener('input',render);
document.addEventListener('keydown',e=>{if(!document.body.classList.contains('detail-open'))return;if(e.key==='Escape')closeDetail();if(e.key==='Tab'&&mobile()){const items=[...$('#detail').querySelectorAll('a,button,input,summary')].filter(n=>n.getClientRects().length);const first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});render();


