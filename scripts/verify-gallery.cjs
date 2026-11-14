// Validate the actual application's gallery admission rules, not just JSON counts.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const context = {window: {AtlasUI: {}}, document: {}};
vm.createContext(context);
for (const file of ['data.js', 'curation.js']) vm.runInContext(fs.readFileSync(path.join(dist, file), 'utf8'), context);
const app = fs.readFileSync(path.join(dist, 'app.js'), 'utf8');
assert(app.includes('const previewURL='), 'gallery initialization boundary changed');
vm.runInContext(app.split('const previewURL=')[0] + '\nglobalThis.visibleCases = cases;', context);
const selected = context.window.ATLAS_CURATION.featured_ids;
const visible = context.visibleCases;
assert.equal(new Set(selected).size, selected.length, 'duplicate selected IDs');
assert.equal(visible.length, selected.length, 'selected works silently excluded by actual media predicate');
const caseJSON = JSON.parse(fs.readFileSync(path.join(dist, 'cases.json'), 'utf8'));
assert.equal(JSON.stringify(context.window.ATLAS.cases), JSON.stringify(caseJSON), 'data.js not synchronized');
let images = 0;
for (const c of visible) {
 assert(c.author && c.source_url && c.author_url, 'missing attribution for ' + c.id);
 const media = c.image_set_verified ? c.images : [{url: c.image_url}];
 assert(media && media.length, 'empty image set for ' + c.id);
 images += media.length;
 for (const url of [c.image_url, c.thumbnail_url, c.author_avatar_url, ...media.flatMap(m=>[m.url,m.thumbnail_url])].filter(Boolean)) {
  if (url.startsWith('assets/')) assert(fs.existsSync(path.join(dist, url)), 'missing asset ' + url);
 }
}
console.log(JSON.stringify({selected: selected.length, rendered: visible.length, authors: new Set(visible.map(c=>c.author_handle || c.author)).size, images, prompts: visible.filter(c=>c.prompt).length}));
