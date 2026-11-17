/* Native motion layer informed by HeroUI v3 state/animation guidance.
   No animation framework, no video clones, no persistent RAF loop. */
window.AtlasMotion=(()=>{
 const preference=matchMedia('(prefers-reduced-motion: reduce)');
 const ease='cubic-bezier(.22,1,.36,1)',animations=new Set();let sharedNode=null,sharedAnimation=null;
 function run(el,keyframes,options){if(!el||preference.matches||!el.animate)return;const a=el.animate(keyframes,{easing:ease,fill:'none',...options});animations.add(a);a.finished.catch(()=>{}).finally(()=>animations.delete(a));return a}
 function enter(el,{x=0,y=0,duration=200}={}){return run(el,[{opacity:0,transform:`translate(${x}px,${y}px)`},{opacity:1,transform:'translate(0,0)'}],{duration:Math.min(360,duration+80),easing:'cubic-bezier(.2,1.08,.38,1)'})}
 function leave(el){return run(el,[{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(7px)'}],{duration:180,easing:'cubic-bezier(.4,0,.8,.4)'})}
 function cancelShared(){sharedAnimation?.cancel();sharedNode?.remove();sharedAnimation=null;sharedNode=null}
 function shared(url,from,target,duration=280){
  cancelShared();if(preference.matches||!target||!from||from.width<1)return;
  const box=target.getBoundingClientRect();if(box.width<1||box.height<1||box.bottom<0||box.top>innerHeight)return;
  // Contain the poster exactly as the final media does, rather than stretching it.
  const image=new Image();image.src=url;image.className='shared-poster';image.alt='';image.setAttribute('aria-hidden','true');
  Object.assign(image.style,{left:box.left+'px',top:box.top+'px',width:box.width+'px',height:box.height+'px'});document.body.append(image);sharedNode=image;
  const dx=from.left-box.left,dy=from.top-box.top,sx=from.width/box.width,sy=from.height/box.height;
  sharedAnimation=run(image,[{transform:`translate(${dx}px,${dy}px) scale(${sx},${sy})`,opacity:.9},{transform:'translate(0,0) scale(1)',opacity:0}],{duration});
  sharedAnimation?.finished.catch(()=>{}).finally(()=>{image.remove();if(sharedNode===image)sharedNode=null});
 }
 function pulse(el){return run(el,[{transform:'scale(1)'},{transform:'scale(.96)',offset:.3},{transform:'scale(1)'}],{duration:300})}
 preference.addEventListener('change',()=>{if(preference.matches){animations.forEach(a=>a.cancel());cancelShared()}});
 // One tooltip for all icon controls; delayed pointer reveal and immediate keyboard reveal.
 const tip=document.querySelector('#tooltip');let timer,owner=null;
 function hide(){clearTimeout(timer);tip.hidden=true;owner=null}
 function show(el){const label=el.getAttribute('aria-label');if(!label)return;owner=el;tip.textContent=label;tip.hidden=false;const r=el.getBoundingClientRect(),t=tip.getBoundingClientRect();tip.style.left=Math.min(innerWidth-t.width-10,Math.max(10,r.left+r.width/2-t.width/2))+'px';tip.style.top=(r.top>t.height+14?r.top-t.height-8:r.bottom+8)+'px';enter(tip,{y:3,duration:130})}
 document.addEventListener('pointerover',e=>{if(e.pointerType==='touch')return;const el=e.target.closest('.round-action,.icon-button');if(el&&el!==owner){hide();timer=setTimeout(()=>show(el),450)}});
 document.addEventListener('pointerout',e=>{if(e.target.closest('.round-action,.icon-button')&&!e.target.closest('.round-action,.icon-button')?.contains(e.relatedTarget))hide()});
 document.addEventListener('focusin',e=>{if(e.target.matches('.round-action,.icon-button')&&e.target.matches(':focus-visible'))show(e.target)});
 document.addEventListener('focusout',hide);document.addEventListener('pointerdown',hide);document.addEventListener('scroll',hide,true);document.addEventListener('keydown',e=>{if(e.key==='Escape')hide()});
 return {enter,leave,shared,cancelShared,pulse,direction:1};
})();
