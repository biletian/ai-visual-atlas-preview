'use strict';
const styles = window.ATLAS_STYLES || [];
let category = '全部';
const $ = s => document.querySelector(s);
function el(tag, className, text) { const n=document.createElement(tag); if(className)n.className=className; if(text!==undefined)n.textContent=text; return n; }
function link(text,url) { const a=el('a','',text); a.href=url; a.target='_blank'; a.rel='noopener'; return a; }
$('#publishedCount').textContent=styles.filter(s=>s.status==='indexed').length;
$('#candidateCount').textContent=styles.filter(s=>s.previews?.length).length;
$('#sourceCount').textContent=new Set(styles.map(s=>s.source)).size;
const categories=['全部',...new Set(styles.map(s=>s.category))];
for(const name of categories){const b=el('button','filter',name); b.type='button';b.setAttribute('aria-pressed',name===category); b.addEventListener('click',()=>{category=name;document.querySelectorAll('.filter').forEach(x=>x.setAttribute('aria-pressed',x.textContent===name));render();});$('#filters').append(b);}
let timer;
function notify(t){$('#toast').textContent=t;$('#toast').classList.add('show');clearTimeout(timer);timer=setTimeout(()=>$('#toast').classList.remove('show'),3000);}
function preview(s){
 const figure=el('figure','style-preview');
 const a=link('',s.previews[0].url);
 const img=el('img');img.src=s.previews[0].url;img.alt=s.name+' · '+s.previews[0].caption;img.loading='lazy';img.decoding='async';
 a.append(img);figure.append(a);
 const caption=el('figcaption','',s.previews[0].caption+' · '+s.author+' · ');
 caption.append(link(s.license,s.licenseUrl));figure.append(caption);
 if(s.previews.length>1){const thumbs=el('div','preview-thumbs');s.previews.forEach((p,i)=>{const b=el('button');b.type='button';b.setAttribute('aria-label','查看示例 '+(i+1));const thumb=el('img');thumb.src=p.url;thumb.alt='';thumb.loading='lazy';b.append(thumb);b.addEventListener('click',()=>{img.src=p.url;img.alt=s.name+' · '+p.caption;a.href=p.url;});thumbs.append(b);});figure.append(thumbs);}
 return figure;
}
function render(){
 const q=$('#search').value.trim().toLowerCase().replace(/^--sref\s+/,'');
 const result=styles.filter(s=>(category==='全部'||s.category===category)&&[s.name,s.codes.join(' '),...s.tags].join(' ').toLowerCase().includes(q)).sort((a,b)=>Number(!!b.previews?.length)-Number(!!a.previews?.length));
 $('#cards').replaceChildren();$('#resultCount').textContent='显示 '+result.length+' 组代码 · 图片与生成参数按来源核验';$('#empty').hidden=!!result.length;
 for(const s of result){
  const card=el('article','style-card');
  if(s.previews?.length)card.append(preview(s));
  const top=el('div','card-top');top.append(el('span','status',s.previews?.length?'原始生成图 · 参数有据可查':'代码索引 · 暂无获许可示例'),el('span','category',s.category));card.append(top,el('h3','',s.name));
  const code='--sref '+s.codes.join(' ');card.append(el('code','code',code));
  const tags=el('div','tags');s.tags.forEach(t=>tags.append(el('span','',t)));card.append(tags);
  const dl=el('dl','facts');
  for(const [label,value] of [['来源标注模型',s.modelVersion],['风格版本 --sv',s.styleVersion??'未显式记录'],['风格权重 --sw',s.styleWeight??'未显式记录'],['个性化参数 --p',s.personalizationCode??'未显式记录'],['来源',s.source],['示例对应',s.previews?.length?'对应本组代码 · 非本站实测':'前往来源查看 · 未转载']]){dl.append(el('dt','',label),el('dd','',value));}
  card.append(dl);
  if(s.textPrompt){const details=el('details','prompt-details');details.append(el('summary','','完整原始生成提示词'),el('pre','',s.textPrompt));if(s.jobId)details.append(el('p','','原始 Job ID: '+s.jobId));card.append(details);}
  const actions=el('div','actions');actions.append(link('查看来源 ↗',s.sourceUrl));const copy=el('button','','复制代码');copy.type='button';copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(code);notify('已复制完整 sref 代码；参数以来源为准');}catch{notify('复制不可用，请选中代码手动复制');}});actions.append(copy);card.append(actions);$('#cards').append(card);
 }
}
$('#search').addEventListener('input',render);render();
