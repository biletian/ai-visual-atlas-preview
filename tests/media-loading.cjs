const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const src=fs.readFileSync(process.argv[2]||path.join(__dirname,'../dist/app.js'),'utf8');
const planCode=src.slice(src.indexOf('function thumbnailPlan'),src.indexOf('function scheduleThumbnails'));
const planContext={};vm.createContext(planContext);vm.runInContext(planCode,planContext);
for(const height of [393,900]){
 const p=planContext.thumbnailPlan([{id:'far',top:height+4000,bottom:height+4400},{id:'next',top:height+300,bottom:height+600},{id:'visible',top:50,bottom:250}],height);
 assert.deepEqual(Array.from(p,x=>x.id),['visible','next']);
 const conserve=planContext.thumbnailPlan([{id:'next',top:height+10,bottom:height+300},{id:'visible',top:20,bottom:100}],height,true);
 assert.deepEqual(Array.from(conserve,x=>x.id),['visible']);
}
assert(src.includes('class="work-image" data-src='));
assert(src.includes('scheduleThumbnails();scheduleFeedLoad();'));
const imageCode=src.slice(src.indexOf('let imageLoadToken=0'),src.indexOf('function selectWorkImage'));
let requests=[],status={},img={isConnected:true,dataset:{},getBoundingClientRect:()=>({width:350,height:250})};
class Image{constructor(){requests.push(this)}decode(){return Promise.resolve()}}
const ctx={Image,current:'a',devicePixelRatio:2,window:{ATLAS_DISPLAY:{'original.png':{variants:[{url:'small.webp',width:960,height:640},{url:'large.webp',width:1600,height:1067}]}}},esc:x=>x,$:s=>s==='#activeWorkImage'?img:status,mediaURL:x=>x,workImages:c=>c.images};
vm.createContext(ctx);vm.runInContext(imageCode,ctx);
const c={id:'a',thumbnail_url:'thumb.webp',images:[{url:'original.png',width:1400,height:933}]};
(async()=>{
 ctx.loadWorkImage(c);assert.equal(img.src,'thumb.webp');assert.equal(requests[0].src,'small.webp');await requests[0].onload();assert.equal(img.dataset.quality,'display');assert(status.innerHTML.includes('original.png'));
 img.getBoundingClientRect=()=>({width:900,height:600});ctx.loadWorkImage(c);assert.equal(requests[1].src,'large.webp');
 requests[1].onerror();assert.equal(requests[1].src,'original.png');requests[1].onerror();assert.equal(img.src,'thumb.webp');assert.equal(img.dataset.quality,'fallback');
 ctx.loadWorkImage(c);const old=requests.at(-1);ctx.loadWorkImage(c);const newest=requests.at(-1);await newest.onload();const visible=img.src;await old.onload();assert.equal(img.src,visible);
 ctx.loadWorkImage(c);ctx.current='b';await requests.at(-1).onload();assert.equal(img.src,'thumb.webp');
 ctx.current='a';ctx.window.ATLAS_DISPLAY={};ctx.loadWorkImage(c);assert.equal(requests.at(-1).src,'original.png');await requests.at(-1).onload();assert.equal(img.dataset.quality,'original');
 console.log('PASS mobile/desktop lookahead, conserve-data, responsive target, original access, two-stage offline fallback, stale request/navigation guard, no-manifest original');
})().catch(e=>{console.error(e);process.exit(1)});
