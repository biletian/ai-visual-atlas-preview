"""Build derived fast-loading catalog; never modify canonical case records."""
import json, hashlib, re
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'dist'
src=(root/'data.js').read_text()
data=json.loads(src.split('=',1)[1].strip().rstrip(';'))
records=data['cases']; version=hashlib.sha256(src.encode()).hexdigest()[:12]
out=root/'catalog'/version; out.mkdir(parents=True,exist_ok=True)
keys='id title author author_url author_avatar_url model model_family category type publish_ready media_authorized image_url thumbnail_url poster_url width height checked_at source_url source_kind'.split()
compact=[]; search=[]
for i,c in enumerate(records):
    d={k:c[k] for k in keys if k in c}
    d['has_prompt']=bool(c.get('prompt') or c.get('prompt_reply_url'))
    d['detail_path']=f'catalog/{version}/{i//16}.json';compact.append(d)
    search.append([c['id'],' '.join(str(c.get(k) or '') for k in ['title','author','model','model_family','category','prompt','description']).lower()])
for i in range(0,len(records),16):
    (out/f'{i//16}.json').write_text(json.dumps(records[i:i+16],ensure_ascii=False,separators=(',',':')))
(out/'search.json').write_text(json.dumps(search,ensure_ascii=False,separators=(',',':')))
bootstrap={k:v for k,v in data.items() if k!='cases'}
bootstrap.update(cases=compact,search_path=f'catalog/{version}/search.json')
(root/'catalog.js').write_text('window.ATLAS='+json.dumps(bootstrap,ensure_ascii=False,separators=(',',':'))+';')
print(f'Catalog: {len(records)} records; {(root/"catalog.js").stat().st_size:,} bytes, original {len(src.encode()):,} bytes')

index=root/"index.html"
index.write_text(re.sub(r"catalog\.js\?v=[^\"]+", "catalog.js?v="+version,index.read_text()))
