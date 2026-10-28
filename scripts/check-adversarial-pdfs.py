from pathlib import Path
from pypdf import PdfReader
from pypdf.generic import IndirectObject
import pymupdf,json,re
results={}
private=['EXCLUDED_SENSORY_TOKEN','EXCLUDED_MOBILITY_TOKEN','EXCLUDED_SOURCE_TOKEN','EXCLUDED_SCOPE_TOKEN','Ask for a visual or written call in the quieter space.']
for p in Path('evidence').glob('adversarial-*.pdf'):
 r=PdfReader(p);text='\n'.join(x.extract_text() for x in r.pages);meta=repr(r.metadata);streams=b'\n'.join(x.get_contents().get_data() if x.get_contents() is not None else b'' for x in r.pages)
 for generation, offsets in r.xref.items():
  for number in offsets:
   if number:
    try: r.get_object(IndirectObject(number,generation,r))
    except Exception: pass
 serialized=[]
 for obj in r.resolved_objects.values():
  try: serialized.append(repr(obj))
  except Exception: pass
 structure='\n'.join(serialized)
 for value in private:
  assert value not in structure,(p,'structure',value)
  assert all(value.encode(enc) not in streams for enc in ['utf-8','utf-16-be','utf-16-le']),(p,'stream',value)
 assert len(r.pages)==1,(p,len(r.pages))
 for value in private:assert value not in text and value not in meta,(p,value)
 assert 'SELECTED_REQUEST_TOKEN' not in meta and 'SELECTED_SOURCE_TOKEN' not in meta
 assert not r.attachments
 if p.stem in ['adversarial-print-Preferences','adversarial-print-Confirmation-ledger','adversarial-print-no-preview']:assert not text.strip(),(p,text)
 if p.stem in ['adversarial-selected','adversarial-print-modal']:assert 'SELECTED_REQUEST_TOKEN' in text and 'SELECTED_SOURCE_TOKEN' in text;assert 'Reset this demo?' not in text
 # Chrome may encode glyphs as CIDs in content streams; extraction, metadata,
 # attachment enumeration and rendered inspection are the primary checks.
 results[p.name]={'pages':len(r.pages),'extracted_characters':len(text),'metadata':{str(k):str(v) for k,v in (r.metadata or {}).items()},'attachments':len(r.attachments),'excluded_marker_matches':0,'stream_bytes':len(streams)}
 d=pymupdf.open(str(p));d[0].get_pixmap(matrix=pymupdf.Matrix(1.3,1.3)).save(str(p.with_suffix('.png')))
Path('evidence/adversarial-pdf-validation.json').write_text(json.dumps(results,indent=2),encoding='utf-8');print(json.dumps(results,indent=2))
