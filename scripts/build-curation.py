import json,hashlib,urllib.request,urllib.parse,time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from PIL import Image
root=Path(__file__).resolve().parents[1]
def download(item):
 assert item['path'].startswith('dist/assets/') and '..' not in Path(item['path']).parts
 assert urllib.parse.urlparse(item['url']).scheme=='https' and urllib.parse.urlparse(item['url']).hostname=='wsrv.nl'
 p=root/item['path'];p.parent.mkdir(parents=True,exist_ok=True)
 if p.exists() and hashlib.sha256(p.read_bytes()).hexdigest()==item['sha256']:return
 for attempt in range(3):
  try:
   data=urllib.request.urlopen(item['url'],timeout=60).read()
   assert hashlib.sha256(data).hexdigest()==item['sha256'], 'Media hash mismatch: '+item['path']
   p.write_bytes(data);return
  except Exception:
   if attempt==2:raise
   time.sleep(2)
for manifest in sorted((root/'scripts').glob('media-batch*.json')):
 with ThreadPoolExecutor(max_workers=4) as pool:list(pool.map(download,json.load(open(manifest))))
cases=json.load(open(root/'dist/cases.json'));seen={c['id'] for c in cases}
for batch in sorted((root/'scripts').glob('content-batch*.json')):
 for c in json.load(open(batch)):
  if c['id'] not in seen:cases.append(c);seen.add(c['id'])
  image=Image.open(root/'dist'/c['image_url']);image.thumbnail((640,900));image.convert('RGB').save(root/'dist'/c['thumbnail_url'],'WEBP',quality=84)
for c in cases:c['category']={'广告与品牌':'品牌与广告','信息图与知识可视化':'信息图'}.get(c.get('category'),c.get('category'))
(root/'dist/cases.json').write_text(json.dumps(cases,ensure_ascii=False,indent=2))
