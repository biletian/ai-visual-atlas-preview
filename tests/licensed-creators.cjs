const fs=require('fs'),vm=require('vm'),assert=require('assert');
const app=fs.readFileSync('dist/app.js','utf8'),ctx={window:{AtlasUI:{}},document:{}};vm.createContext(ctx);
for(const f of ['data.js','curation.js'])vm.runInContext(fs.readFileSync('dist/'+f,'utf8'),ctx);
vm.runInContext(app.split('const previewURL=')[0]+'\nglobalThis.visibleCases=cases;globalThis.testStill=still;',ctx);
const additions=JSON.parse(fs.readFileSync('scripts/content-batch13.json'));
for(const c of additions){assert(ctx.visibleCases.some(x=>x.id===c.id));assert(c.prompt_note&&c.license_url&&c.media_sha256);assert(c.author_avatar_source_url);assert(!c.prompt_full_verified,'do not claim independent reproduction');}
for(const license of ['cc0-1.0','cc-by-4.0'])assert(ctx.testStill({media_authorized:license,image_url:'assets/test.webp',width:10,height:10}));
assert(!ctx.testStill({media_authorized:'embed_only',image_url:'assets/test.webp',width:10,height:10}));
const v=additions.find(c=>c.id==='vcl-house-cutaway');assert.equal(v.model,'模型未注明');assert(v.reference_url.endsWith('before.png'));assert(v.prompt_note.includes('不是已验证的纯文生图'));assert(v.description.includes('并非严格同一建筑'));assert.equal(v.width,1400);assert.equal(v.height,933);
assert(!app.includes('完整 MIT 许可与版权声明'));assert(app.includes("c.source_kind==='website'?'原始网站'"));
console.log('PASS: 3 licensed works, attribution, reproduction limits, CC admission, embed exclusion, accurate source/license labels');
