"""Build display-only WebP variants for explicitly reusable licensed images.
Original bytes, metadata, credit, licenses and canonical records remain unchanged.
"""
import hashlib,json
from pathlib import Path
from PIL import Image,ImageOps,ImageChops,ImageStat
import math
root=Path(__file__).resolve().parents[1]/'dist'
records=json.loads((root/'data.js').read_text().split('=',1)[1].strip().rstrip(';'))['cases']
allowed={'mit','cc0-1.0','cc-by-4.0'}
out=root/'assets'/'display';out.mkdir(parents=True,exist_ok=True)
manifest={}
for c in records:
    url=c.get('image_url','')
    if c.get('media_authorized') not in allowed or not url.startswith('assets/') or Path(url).suffix.lower() not in {'.png','.jpg','.jpeg','.webp'}:continue
    source=root/url
    if not source.is_file():continue
    raw=source.read_bytes()
    if len(raw)<100000:continue
    with Image.open(source) as im:
        if getattr(im,'is_animated',False):continue
        im=ImageOps.exif_transpose(im);im.load()
        if im.mode not in ('RGB','RGBA'):im=im.convert('RGBA' if 'transparency' in im.info else 'RGB')
        variants=[];seen=set()
        for edge in (960,1600):
            image=im.copy();image.thumbnail((edge,edge),Image.Resampling.LANCZOS)
            if image.size in seen:continue
            seen.add(image.size)
            key=hashlib.sha256(raw+f'webp-q92-{edge}-v2'.encode()).hexdigest()[:20]
            target=out/(key+'.webp')
            image.save(target,format='WEBP',quality=92,method=6,icc_profile=im.info.get('icc_profile',b''))
            # Avoid visibly degrading fine textures: use lossless encoding when
            # the lossy rendition has high per-pixel error against the resized reference.
            with Image.open(target) as check:
                rms=ImageStat.Stat(ImageChops.difference(image.convert('RGB'),check.convert('RGB'))).rms
                error=math.sqrt(sum(v*v for v in rms)/3)
            if error and 20*math.log10(255/error)<35:
                image.save(target,format='WEBP',lossless=True,method=6,icc_profile=im.info.get('icc_profile',b''))
            size=target.stat().st_size
            if size>=len(raw)*.85:target.unlink();continue
            variants.append({'url':str(target.relative_to(root)),'width':image.width,'height':image.height,'bytes':size})
        if variants:manifest[url]={'originalBytes':len(raw),'variants':variants,'license':c['media_authorized'],'credit':c.get('attribution','')}
(root/'display-media.js').write_text('window.ATLAS_DISPLAY='+json.dumps(manifest,ensure_ascii=False,separators=(',',':'))+';')
(root/'display-media-report.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
print(f'Display variants: {len(manifest)} licensed original images; originals untouched')
for k,v in manifest.items():print(k,v['originalBytes'],[x['bytes'] for x in v['variants']])

# Content-versioned manifest; variant filenames already include their source hash.
import re
version=hashlib.sha256((root/'display-media.js').read_bytes()).hexdigest()[:12]
index=root/'index.html'
index.write_text(re.sub(r'display-media[.]js[?]v=[^" ]+', 'display-media.js?v='+version,index.read_text()))
