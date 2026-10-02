"""Check generated pages, internal links, anchors, assets and preface coverage."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import argparse, json, sys

ROOT = Path(__file__).resolve().parents[1]

class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids=[]; self.links=[]; self.images=[]; self.h1=0; self.lang=None
        self.titles=0; self.description=False; self.label_refs=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if 'id' in a: self.ids.append(a['id'])
        for attribute in ('aria-labelledby','aria-describedby','aria-controls'):
            if a.get(attribute): self.label_refs.extend(a[attribute].split())
        if tag=='html': self.lang=a.get('lang')
        if tag=='h1': self.h1+=1
        if tag=='title': self.titles+=1
        if tag=='meta' and a.get('name')=='description': self.description=True
        if tag in ('a','link') and a.get('href'): self.links.append(a['href'])
        if tag in ('img','script') and a.get('src'): self.links.append(a['src'])
        if tag=='img': self.images.append(a)

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--site',default='.')
    args=parser.parse_args()
    folder=(ROOT/args.site).resolve()
    books=json.loads((ROOT/'data/books.json').read_text(encoding='utf-8-sig'))
    source_books={b['id']:b for b in books}
    pages={}; errors=[]; links=0
    for path in folder.rglob('*.html'):
        if path.parts[-2:] and '_site' in path.relative_to(folder).parts: continue
        p=Page(); p.feed(path.read_text(encoding='utf-8')); pages[path.resolve()]=p
        if p.lang!='zh-Hant': errors.append(f'{path.name}: language missing')
        if p.h1!=1: errors.append(f'{path.name}: expected one h1, got {p.h1}')
        if p.titles!=1 or not p.description: errors.append(f'{path.name}: metadata missing')
        if len(p.ids)!=len(set(p.ids)): errors.append(f'{path.name}: duplicate IDs')
        for ref in p.label_refs:
            if ref not in p.ids: errors.append(f'{path.name}: missing accessible label/control {ref}')
        for im in p.images:
            if not im.get('alt'): errors.append(f'{path.name}: missing image alt')
    for path,p in pages.items():
        for href in p.links:
            u=urlsplit(href)
            if u.scheme or u.netloc: continue
            links+=1
            target=(path.parent/unquote(u.path)).resolve() if u.path else path
            if not target.exists(): errors.append(f'{path.name}: missing {href}')
            elif u.fragment and target in pages and unquote(u.fragment) not in pages[target].ids:
                errors.append(f'{path.name}: missing anchor {href}')
    for bid,b in source_books.items():
        path=folder/'books'/f'{bid}.html'
        if not path.exists(): errors.append(f'{bid}: missing detail page'); continue
        raw=path.read_text(encoding='utf-8')
        pre=b.get('preface') or {}
        prefs=b.get('prefaces') or [pre]
        if not all(x.get('paragraphs') or x.get('url') for x in prefs): errors.append(f'{bid}: missing preface')
        # Recover text with the standard parser to verify all original paragraphs survived escaping.
        class Text(HTMLParser):
            def __init__(self): super().__init__(); self.parts=[]
            def handle_data(self,data): self.parts.append(data)
        text=Text(); text.feed(raw)
        content=' '.join(text.parts)
        for pref in prefs:
            for paragraph in pref.get('paragraphs',[]):
                if paragraph not in content: errors.append(f'{bid}: preface paragraph missing')
    if len(pages)!=7+len(books): errors.append(f'Expected {7+len(books)} pages, found {len(pages)}')
    if errors:
        print('\n'.join(errors)); sys.exit(1)
    print(f'PASS: {len(pages)} pages, {links} internal links/assets, {len(books)} complete book prefaces, metadata and image alt text.')

if __name__=='__main__': main()
