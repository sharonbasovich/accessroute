from pathlib import Path
from pypdf import PdfReader
import pymupdf,json
result={}
for f in Path('output/pdf').glob('*.pdf'):
 r=PdfReader(f);assert len(r.pages)==1,(f,len(r.pages));text='\n'.join(p.extract_text() for p in r.pages);result[f.name]={'pages':len(r.pages),'characters':len(text)}
 if f.name=='selected-note.pdf':
  assert 'Communication' in text and 'Sensory' not in text and 'Mobility' not in text
  assert 'Private rehearsal' not in text and 'Your preferences guide' not in text
 d=pymupdf.open(str(f));d[0].get_pixmap(matrix=pymupdf.Matrix(1.4,1.4)).save('evidence/'+f.stem+'-pdf.png')
Path('evidence/pdf-validation.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
