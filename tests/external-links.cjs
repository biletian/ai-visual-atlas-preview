const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const app=fs.readFileSync('dist/app.js','utf8'),ui=fs.readFileSync('dist/ui.js','utf8'),ctx={window:{}};vm.runInNewContext(ui,ctx);
assert(!app.includes('↗'));assert(app.includes('class="author-name"'));assert(app.includes('class="external-mark"'));const mark=ctx.window.AtlasUI.icon('arrow-up-right');assert(mark.includes('<svg'));assert(mark.includes('aria-hidden="true"'));assert(mark.includes('<path'));console.log('PASS: external links use aria-hidden SVG instead of font glyphs');
