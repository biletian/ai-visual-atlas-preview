import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
p=root/'dist/data.js'
source=p.read_text()
assert source.split('=',1)[0].strip() == 'window.ATLAS', 'Unexpected data assignment'
old=json.loads(source.split('=',1)[1].strip().rstrip(';'))
old['cases']=json.loads((root/'dist/cases.json').read_text())
p.write_text('window.ATLAS='+json.dumps(old,ensure_ascii=False)+';')
