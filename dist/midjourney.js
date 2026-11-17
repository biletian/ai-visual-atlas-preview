'use strict';
const styles=window.ATLAS_STYLES||[], $=s=>document.querySelector(s);
let category='全部',lastFocus=null,timer;
const forms=['全部','摄影','插画','平面','3D','动漫'];
function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
function anchor(text,url){const a=el('a','',text);a.href=url;a.target='_blank';a.rel='noopener';return a;}
function code(s){return '--sref '+s.codes.join(' ');}
function notify(t){$('#toast').textContent=t;$('#toast').classList.add('show');clearTimeout(timer);timer=setTimeout(()=>$('#toast').classList.remove('show'),2500);}
async function copy(s){try{await navigator.clipboard.writeText(code(s));notify('已复制完整风格代码');}catch{notify('复制不可用，请选中代码手动复制');}}
$('#totalCount').textContent=styles.length;
for(const target of ['#filters','#categoryNav'])for(const form of forms){const b=el('button','filter',form);b.type='button';b.dataset.category=form;b.setAttribute('aria-pressed',form==='全部');if(target==='#categoryNav')b.append(el('span','',styles.filter(s=>form==='全部'||s.category===form).length));b.addEventListener('click',()=>{category=form;document.querySelectorAll('[data-category]').forEach(n=>n.setAttribute('aria-pressed',n.dataset.category===form));render();});$(target).append(b);}
function image(p,s){const i=el('img');i.src=p.url;i.alt=s.name+' · '+p.caption;i.loading='lazy';i.decoding='async';return i;}
function card(s){
 const b=el('button','style-card');b.type='button';b.setAttribute('aria-label','查看 '+s.name+' 风格详情');
 const media=el('div','card-media');media.append(image(s.previews[0],s));const count=Math.min(4,s.previews.length);
 if(count>1){const multi=el('div','hover-grid count-'+count);s.previews.slice(0,4).forEach(p=>multi.append(image(p,s)));media.append(multi);}
 media.append(el('span','image-count',s.previews.length+' 张示例'));
 const meta=el('div','card-meta');meta.append(el('h3','',s.name),el('span','model',s.modelVersion));
 const tags=el('div','tags');s.tags.slice(0,3).forEach(t=>tags.append(el('span','',t)));
 b.append(media,meta,tags);b.addEventListener('click',()=>openDetail(s));return b;
}
function render(){const q=$('#search').value.trim().toLowerCase().replace(/^--sref\s+/,'');const rows=styles.filter(s=>(category==='全部'||s.category===category)&&[s.name,s.codes.join(' '),...s.tags].join(' ').toLowerCase().includes(q));const visual=rows.filter(s=>s.previews?.length),index=rows.filter(s=>!s.previews?.length);$('#cards').replaceChildren(...visual.map(card));$('#indexCards').replaceChildren();for(const s of index){const b=el('button','index-card');b.type='button';b.append(el('strong','',s.name),el('code','',code(s)),el('span','','查看资料 ↗'));b.addEventListener('click',()=>openDetail(s));$('#indexCards').append(b);}$('#indexSection').hidden=!index.length;$('#empty').hidden=!!visual.length;$('#resultCount').textContent=visual.length+' 个有图风格 / '+rows.length+' 组代码';}
function closeDetail(){$('#detail').hidden=true;$('#backdrop').hidden=true;document.body.classList.remove('detail-open');lastFocus?.focus();}
function openDetail(s){
 lastFocus=document.activeElement;const body=$('#detailBody');body.replaceChildren();const gallery=el('div','detail-gallery');
 if(s.previews?.length){const main=el('a','detail-main');main.href=s.previews[0].url;main.target='_blank';main.rel='noopener';main.append(image(s.previews[0],s));gallery.append(main);
 if(s.previews.length>1){const thumbs=el('div','thumbs');s.previews.slice(0,4).forEach((p,i)=>{const b=el('button');b.type='button';b.setAttribute('aria-label','查看示例 '+(i+1));b.append(image(p,s));b.addEventListener('click',()=>{main.href=p.url;main.replaceChildren(image(p,s));});thumbs.append(b);});gallery.append(thumbs);}gallery.append(el('p','image-note',s.previews.length+' 张真实示例 · 未重复补图'));body.append(gallery);
 }else body.append(el('div','no-preview','暂无获许可的对应示例图'));
 const title=el('h2','',s.name);title.id='detailTitle';body.append(title);const tags=el('div','tags');[s.category,...s.tags].forEach(t=>tags.append(el('span','',t)));body.append(tags);
 const row=el('div','copy-row');row.append(el('code','',code(s)));const cp=el('button','','复制');cp.type='button';cp.addEventListener('click',()=>copy(s));row.append(cp);body.append(row);
 const dl=el('dl','facts');for(const [k,v] of [['模型',s.modelVersion],['风格版本 --sv',s.styleVersion??'未记录'],['风格权重 --sw',s.styleWeight??'未记录'],['个性化参数',s.personalizationCode??'未记录']])dl.append(el('dt','',k),el('dd','',v));body.append(dl);
 if(s.textPrompt){const block=el('section','prompt');block.append(el('h3','','原始提示词'),el('pre','',s.textPrompt));body.append(block);}
 const credits=el('div','credits');if(s.author)credits.append(el('p','',s.author+' · 作者原始生成示例'));credits.append(anchor('来源：'+s.source+' ↗',s.sourceUrl));if(s.license)credits.append(anchor(s.license+' 许可 ↗',s.licenseUrl));credits.append(el('p','','参数按来源保留，未记录项不填默认值；非本站重新实测。'));body.append(credits);
 $('#detail').hidden=false;$('#backdrop').hidden=false;document.body.classList.add('detail-open');$('#detail').scrollTop=0;$('#closeDetail').focus();
}
$('#closeDetail').addEventListener('click',closeDetail);$('#backdrop').addEventListener('click',closeDetail);$('#search').addEventListener('input',render);
document.addEventListener('keydown',e=>{if($('#detail').hidden)return;if(e.key==='Escape')closeDetail();if(e.key==='Tab'){const items=[...$('#detail').querySelectorAll('a,button,input')].filter(n=>n.getClientRects().length);const first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});render();
