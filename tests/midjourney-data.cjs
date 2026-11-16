const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const context={window:{}};
vm.runInNewContext(fs.readFileSync('dist/midjourney-data.js','utf8'),context);
const rows=context.window.ATLAS_STYLES;
assert.equal(rows.length,4);
assert.equal(new Set(rows.map(r=>r.id)).size,4);
for(const row of rows){
 assert(row.codes.every(code=>/^\d+$/.test(code)));
 assert.equal(row.modelVersion,'v8.2');
 assert.equal(row.styleVersion,'SV6');
 assert.equal(row.styleWeight,null);
 assert.equal(row.textPrompt,null);
 assert.equal(row.personalizationCode,null);
 assert.equal(row.independentlyTested,false);
 assert.equal(row.previewRights,'unconfirmed');
 assert(row.sourceUrl.startsWith('https://promptsref.com/srefcodedetail/'));
}
const html=fs.readFileSync('dist/midjourney.html','utf8');
assert(!/<img\b/i.test(html));
assert(html.includes('仅复制 sref 代码'));
console.log('PASS: 4 source-verified code groups; unknown parameters retained');
