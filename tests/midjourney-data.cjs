const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={window:{}};vm.runInNewContext(fs.readFileSync('dist/midjourney-data.js','utf8'),c);
const rows=c.window.ATLAS_STYLES;assert.equal(rows.length,8);assert.equal(new Set(rows.map(r=>r.id)).size,8);
const illustrated=rows.filter(r=>r.previews?.length);assert.equal(illustrated.length,4);
for(const row of rows){
 assert(row.codes.every(code=>/^\d+(::\d+(\.\d+)?)?$/.test(code)));assert.equal(row.independentlyTested,false);
 if(row.previews?.length){assert.equal(row.previewRights,'CC0-1.0');assert.equal(row.license,'CC0-1.0');assert(row.textPrompt.includes('--sref '+row.codes.join(' ')));assert(row.jobId);assert.equal(row.originalSha256.length,64);for(const image of row.previews)assert(fs.existsSync('dist/'+image.url));}
 else {assert.equal(row.styleWeight,null);assert.equal(row.textPrompt,null);assert.equal(row.previewRights,'unconfirmed');}
}
const combined=illustrated.find(r=>r.codes.length>1);assert.equal(combined.modelVersion,'Niji 6');assert.equal(combined.personalizationCode,'up4rlxn');assert.equal(combined.styleWeight,'50');assert.equal(combined.codes.join(' '),'1752248457::1.8 30::1.8 952556048 74000021 3684016348 83000021');
console.log('PASS: 8 code groups, 4 licensed original images; exact weighted combination preserved');
