const fs=require('fs'),vm=require('vm'),assert=require('assert');
const ctx={window:{}};vm.createContext(ctx);vm.runInContext(fs.readFileSync('dist/ui.js','utf8'),ctx);
const avatar=ctx.window.AtlasUI.avatar;
for(const url of ['assets/authors/a.jpg','assets/candidates7/N1-avatar.jpg','assets/selected43/123-avatar.png']) assert(avatar({author:'Name',author_avatar_url:url}).includes('<img'));
for(const url of ['assets/selected43/../secret.jpg','assets/selected43/x.svg','https://evil.example/x.jpg','assets/selected43/a\".jpg']) assert(!avatar({author:'Name',author_avatar_url:url}).includes('<img'));
const selected=JSON.parse(fs.readFileSync('dist/curation.json')).featured_ids;
const cases=JSON.parse(fs.readFileSync('dist/cases.json')).filter(c=>selected.includes(c.id));
for(const c of cases) assert(avatar(c).includes('<img'),c.id+' avatar rejected');
console.log('PASS: '+cases.length+' real author avatars; unsafe paths rejected');
