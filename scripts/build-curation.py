import base64,json,hashlib,urllib.request,urllib.parse,time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from PIL import Image
root=Path(__file__).resolve().parents[1]
def download(item):
 assert item['path'].startswith('dist/assets/') and '..' not in Path(item['path']).parts
 assert urllib.parse.urlparse(item['url']).scheme=='https' and (urllib.parse.urlparse(item['url']).hostname in {'wsrv.nl','pbs.twimg.com','video.twimg.com'} or item['url'] in {'https://raw.githubusercontent.com/zenlee123/awesome-ai-image-prompts/main/images/ukiyoe-astronaut.webp', 'https://raw.githubusercontent.com/kondasviktor/vcl-ai-image-prompts/main/examples/cutaway/demo.png', 'https://cgaihtvcmbgprwgvltsf.supabase.co/storage/v1/object/public/gallery/ai-191.jpg'})
 p=root/item['path'];p.parent.mkdir(parents=True,exist_ok=True)
 if p.exists() and hashlib.sha256(p.read_bytes()).hexdigest()==item['sha256']:return
 if item.get('chunks'):
  assert all(c.startswith('scripts/media-chunks/') and '..' not in Path(c).parts for c in item['chunks'])
  data=base64.b64decode(''.join((root/c).read_text() for c in item['chunks']),validate=True)
  assert hashlib.sha256(data).hexdigest()==item['sha256'], 'Stored media hash mismatch'
  p.write_bytes(data);return
 urls=[item['url']]
 parsed=urllib.parse.urlparse(item['url'])
 if parsed.hostname=='pbs.twimg.com':
  urls=[item['url']+('&' if parsed.query else '?')+'format=jpg',item['url'],'https://wsrv.nl/?url='+urllib.parse.quote(item['url'],safe='')]
 elif parsed.hostname=='wsrv.nl':
  original=urllib.parse.parse_qs(parsed.query).get('url',[''])[0]
  if urllib.parse.urlparse(original).hostname=='pbs.twimg.com':urls.extend([original+('&' if '?' in original else '?')+'format=jpg',original])
 urls.insert(0,'https://biletian.github.io/ai-visual-atlas-preview/'+item['path'].removeprefix('dist/'))
 errors=[]
 for url in urls:
  for attempt in range(2):
   try:
    data=urllib.request.urlopen(url,timeout=30).read()
    assert hashlib.sha256(data).hexdigest()==item['sha256'], 'Media hash mismatch'
    p.write_bytes(data);print('verified',item['path'],flush=True);return
   except Exception as e:
    errors.append(str(e));time.sleep(1)
 raise RuntimeError('Media unavailable: '+item['path']+'; '+str(errors))

for manifest in sorted((root/'scripts').glob('media-batch*.json')):
 with ThreadPoolExecutor(max_workers=4) as pool:list(pool.map(download,json.load(open(manifest))))
cases=json.load(open(root/'dist/cases.json'));seen={c['id'] for c in cases}
for batch in sorted((root/'scripts').glob('content-batch*.json')):
 for c in json.load(open(batch)):
  if c['id'] in seen:cases=[c if old['id']==c['id'] else old for old in cases]
  else:cases.append(c);seen.add(c['id'])
  if c.get('type')=='video':continue
  media=[{'url':c['image_url'],'thumbnail_url':c['thumbnail_url']}]+c.get('images',[])
  for m in media:
   if m.get('thumbnail_url'):
    image=Image.open(root/'dist'/m['url']);image.thumbnail((640,900));image.convert('RGB').save(root/'dist'/m['thumbnail_url'],'WEBP',quality=84)
for c in cases:c['category']={'广告与品牌':'品牌与广告','信息图与知识可视化':'信息图','海报与字体':'海报与排版','插画与艺术':'插画与角色','绘画与插画':'插画与角色','产品摄影':'产品与电商','品牌与排版':'品牌与平面设计'}.get(c.get('category'),c.get('category'))
(root/'dist/cases.json').write_text(json.dumps(cases,ensure_ascii=False,indent=2))
