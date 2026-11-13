import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
p=root/'dist/data.js'
old=json.loads(p.read_text()[len('window.ATLAS='):].strip().rstrip(';'))
old['cases']=json.loads((root/'dist/cases.json').read_text())
p.write_text('window.ATLAS='+json.dumps(old,ensure_ascii=False)+';')
