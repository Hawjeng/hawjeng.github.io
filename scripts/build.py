"""Build the research website with Python 3.10+; no external dependencies."""
from pathlib import Path
from html import escape
from urllib.parse import urlsplit, quote
import argparse
import json
import shutil
import re
import os

ROOT = Path(__file__).resolve().parents[1]
S = json.loads((ROOT / 'data/site.json').read_text(encoding='utf-8-sig'))
S['siteUrl'] = os.environ.get('SITE_URL') or S['siteUrl']
P = json.loads((ROOT / 'data/profile.json').read_text(encoding='utf-8-sig'))
BOOKS = json.loads((ROOT / 'data/books.json').read_text(encoding='utf-8-sig'))
PROJECTS = json.loads((ROOT / 'data/projects.json').read_text(encoding='utf-8-sig'))
RESOURCES = json.loads((ROOT / 'data/resources.json').read_text(encoding='utf-8-sig'))
E = lambda value: escape(str(value or ''), quote=True)

def url(value):
    value = str(value or '')
    if urlsplit(value).scheme not in ('https', 'http', 'mailto', 'tel', ''):
        raise ValueError(f'Unsupported URL: {value}')
    return E(value)

def ext(href, text, css='text-link'):
    return f'<a class="{css}" href="{url(href)}" target="_blank" rel="noopener noreferrer">{E(text)}<span class="sr-only">（另開分頁）</span></a>'

FOCI = [
    ('心理計量與統計方法', 'Psychometrics & statistical modeling', '結構方程模式、多層次分析、量表與測驗。從理論構念到模型估計，關注測量與推論的依據。'),
    ('發展軌跡與潛在異質性', 'Longitudinal & mixture modeling', '縱貫資料、潛在成長、潛在轉移與混合模式。理解個體如何改變，也辨識群體之間的差異。'),
    ('教育與兒童發展', 'Education & child development', '以教育與發展資料，研究認知、語言、動作、閱讀與學習，連結方法與實際問題。'),
    ('人力資源與組織行為', 'Human resources & organizational behavior', '關注工作、職涯與組織，也將量化方法應用於校務研究、教育評估與管理議題。'),
]

def header(active, prefix):
    links = [('index.html','首頁'),('books.html','專書著作'),('research.html','研究'),('about.html','學經歷'),('resources.html','教學與專案')]
    nav = ''.join(f'<a href="{prefix}{path}"'+(' aria-current="page"' if path == active else '')+f'>{title}</a>' for path,title in links)
    return f'''<a class="skip-link" href="#main">跳到主要內容</a>
<header class="site-header"><div class="container header-inner">
<a class="brand" href="{prefix}index.html" aria-label="邱皓政，回首頁"><span class="brand-mark" aria-hidden="true">Hc</span><span class="brand-name">邱皓政<span class="brand-en">HAWJENG CHIOU</span></span></a>
<button class="menu-toggle" type="button" aria-controls="primary-nav" aria-expanded="false" aria-label="開啟導覽選單">選單</button>
<nav id="primary-nav" class="primary-nav" aria-label="主要導覽">{nav}<a class="nav-contact" href="#contact">聯繫</a></nav></div></header>'''

def footer(prefix):
    return f'''<section class="contact-band" id="contact" aria-labelledby="contact-title"><div class="container contact-inner">
<div><div class="eyebrow">Contact</div><h2 id="contact-title">研究、教學與學術交流</h2><p>課程、研究方法或學術合作相關事宜，歡迎透過 Email 聯繫。</p></div>
<div class="contact-details"><a href="mailto:{url(S['email'])}">{E(S['email'])}</a><div class="contact-meta">國立臺灣師範大學管理學院 · <a class="phone-link" href="tel:{url(S['telephone'])}">02-7749-3312</a></div><div class="copy-row"><button type="button" data-copy="{E(S['email'])}" hidden>複製 Email</button><span role="status" aria-live="polite"></span></div></div>
</div></section><footer class="site-footer"><div class="container footer-inner"><div>© 2026 邱皓政 Hawjeng Chiou <span class="footer-date">· 資料核對 {E(S['updated'])}</span></div><div class="footer-links">{ext(S['github'],'GitHub','')}{ext(S['oldSite'],'師大原網站','')}<a href="{prefix}sources.html">資料來源</a><a href="#top">回到頂端</a></div></div></footer>'''

def page(path, title, description, body, active=None):
    prefix = '../' if path.startswith('books/') else ''
    if path == '404.html' and S['siteUrl']:
        prefix = S['siteUrl'].rstrip('/')+'/'
    canonical = ''
    if S['siteUrl']:
        canonical = f'<link rel="canonical" href="{url(S["siteUrl"].rstrip("/")+"/"+path)}"><meta property="og:url" content="{url(S["siteUrl"].rstrip("/")+"/"+path)}">'
    schema = {'@context':'https://schema.org','@type':'ProfilePage','dateModified':S['updated'],'mainEntity':{'@type':'Person','name':'邱皓政','alternateName':'Hawjeng Chiou','jobTitle':'特聘教授','affiliation':{'@type':'CollegeOrUniversity','name':'國立臺灣師範大學'},'alumniOf':{'@type':'CollegeOrUniversity','name':'University of Southern California'},'email':S['email'],'knowsAbout':['Psychometrics','Structural Equation Modeling','Multilevel Modeling','Latent Class Analysis','Bayesian Statistics']}}
    schema_json = json.dumps(schema,ensure_ascii=False).replace('</','<\\/')
    return f'''<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{E(title)}｜邱皓政 Hawjeng Chiou</title><meta name="description" content="{E(description)}"><meta name="theme-color" content="#163b44"><meta property="og:type" content="website"><meta property="og:locale" content="zh_TW"><meta property="og:title" content="{E(title)}｜邱皓政"><meta property="og:description" content="{E(description)}">{canonical}<link rel="icon" type="image/svg+xml" href="{prefix}assets/favicon.svg"><link rel="stylesheet" href="{prefix}assets/style.css"><noscript><style>.menu-toggle,.catalog-toolbar{{display:none}}@media(max-width:760px){{.header-inner{{flex-wrap:wrap;padding-block:14px}}.primary-nav{{display:grid;position:static;width:100%;padding:0;box-shadow:none;border:0}}}}</style></noscript><script defer src="{prefix}assets/site.js"></script><script type="application/ld+json">{schema_json}</script></head>
<body id="top">{header(active or path,prefix)}<main id="main">{body}</main>{footer(prefix)}</body></html>'''

def heading(label, title, en, intro):
    return f'<div class="page-heading"><div class="container"><div class="eyebrow">{E(label)}</div><h1>{E(title)}</h1><p class="heading-en" lang="en">{E(en)}</p><p class="intro">{E(intro)}</p></div></div>'

def section_heading(label, title, href='', link='', subtitle='', heading_id=''):
    hid = f' id="{E(heading_id)}"' if heading_id else ''
    return f'<div class="section-heading"><div><div class="eyebrow">{E(label)}</div><h2{hid}>{E(title)}</h2>'+(f'<p>{E(subtitle)}</p>' if subtitle else '')+'</div>'+(f'<a class="text-link" href="{url(href)}">{E(link)}</a>' if href else '')+'</div>'

def prefaces(b):
    result = b.get('prefaces', [])
    if not result and b.get('preface'):
        result = [b['preface']]
    return result

def book_card(b):
    preface_link = f'books/{E(b["id"])}.html#preface'
    image = f'assets/images/{E(Path(b["cover"]).name)}'
    printing = f'<p class="book-printing">最新印刷：{E(b["latestPrinting"])}（重印）</p>' if b.get('latestPrinting') else ''
    subtitle = f'<p class="book-subtitle">{E(b["subtitle"])}</p>' if b.get('subtitle') else ''
    role = f'<p class="book-role">{E(b["contribution"])}：邱皓政</p>' if b.get('contribution') else ''
    return f'''<article class="book-card" data-category="{E(b['category'])}"><a class="book-art" href="books/{E(b['id'])}.html" aria-label="閱讀《{E(b['title'])}》書籍介紹"><span class="book-year">{E(b['year'])}</span><img src="{image}" alt="《{E(b['title'])}》原書封面" loading="lazy" width="230" height="320"></a><div class="book-info"><div class="book-meta"><span>{E(b['publisher'])}</span><span>{E(b['edition'])}</span></div><h3><a href="books/{E(b['id'])}.html">{E(b['title'])}</a></h3>{role}<p class="book-summary">{E(b['summary'])}</p><details class="book-disclosure"><summary>展開書籍資訊</summary><div>{subtitle}<p class="book-author">作者：{E(b['authors'])}</p><p class="book-author">ISBN：{E(b.get('isbn',''))}</p>{printing}<p class="book-author">{E(prefaces(b)[0].get('title','作者序'))}</p></div></details><div class="book-links"><a href="{preface_link}">閱讀序言</a>{ext(b['url'],b.get('publisherLabel','出版社'),'')}</div></div></article>'''

def paper_row(p, full=True):
    authors = p['authors'] if full else re.split('[,、;]',p['authors'])[0]+'等 · 邱皓政共同作者' if not p['authors'].startswith('邱皓政') else p['authors']
    doi = f'<p class="paper-citation">DOI: {E(p["doi"])}</p>' if full else ''
    return f'''<article class="paper-row" data-category="{E(p['topic'])}"><div class="paper-year">{p['year']}</div><div><h3><a href="{url(p['url'])}" target="_blank" rel="noopener noreferrer">{E(p['title'])}</a></h3><p class="paper-authors">{E(authors)}</p><p class="paper-journal">{E(p['journal'])}</p><p class="paper-topic">{E(p['summary'])}</p>{doi}</div>{ext('https://doi.org/'+p['doi'],'閱讀論文')}</article>'''

def focus_cards():
    return ''.join(f'<article class="research-card"><span class="number">0{i}</span><h3>{E(t)}</h3><span class="research-en" lang="en">{E(en)}</span><p>{E(text)}</p></article>' for i,(t,en,text) in enumerate(FOCI,1))

def timeline(items):
    return '<div class="timeline">'+''.join(f'<div class="timeline-row"><div class="period">{E(i["period"])}</div><div><h3>{E(i["institution"])} · {E(i["title"])}</h3>'+(f'<p>{E(i["detail"])}</p>' if i.get('detail') else '')+'</div></div>' for i in items)+'</div>'

def home():
    body = f'''<div class="container"><section class="hero" aria-labelledby="home-title"><div><div class="eyebrow">Psychometrics · Research · Books</div><h1 id="home-title">邱皓政</h1><p class="english-name" lang="en">Hawjeng Chiou, Ph.D.</p><p class="hero-role">國立臺灣師範大學企業管理學系 特聘教授<br>教育心理與輔導學系 合聘教授</p><p class="hero-description">{E(S['intro'])}</p><div class="hero-specialty"><span class="tag">心理計量</span><span class="tag">統計建模</span><span class="tag">量化研究</span><span class="tag">專書寫作</span></div><div class="hero-actions"><a class="button" href="books.html">專書與序言</a><a class="button secondary" href="research.html">近期研究</a></div></div><div class="hero-visual"><div class="hero-visual-top"><span>RESEARCH & TEACHING</span><span>NTNU</span></div><figure><img class="portrait" src="assets/images/hawjeng4.jpg" width="542" height="747" alt="邱皓政在統計方法講座中，手持麥克風說明投影片" fetchpriority="high"><figcaption><span>從統計原理，到研究實作。</span><span>研究・教學・專書</span></figcaption></figure><div class="hero-stamp" aria-hidden="true">心理計量<br>與量化方法</div></div></section><div class="credentials"><div class="credential"><span class="credential-label">學術背景</span><strong>南加州大學 心理計量學博士</strong><small>University of Southern California</small></div><div class="credential"><span class="credential-label">研究方法</span><strong>SEM · Multilevel · Mixture · Bayes</strong><small>測量、層次、異質性與縱貫分析</small></div><div class="credential"><span class="credential-label">專書寫作</span><strong>統計原理與模型應用</strong><small>雙葉書廊・五南圖書出版</small></div></div><section class="section" aria-labelledby="recent-books">{section_heading('Books & prefaces','近期專書','books.html','全部書目與序言',S['bookIntro'],heading_id='recent-books')}<div class="books-grid">{''.join(book_card(b) for b in BOOKS[:6])}</div><p class="section-note">依版本出版年排列；最新印刷與版次分列。序言保留作者原文。</p></section></div>
<section class="section research-band"><div class="container research-layout"><div class="research-intro"><div class="eyebrow">Research focus</div><h2>理解人的差異，<br>也理解人的改變。</h2><p>以心理計量與統計建模為基礎，研究教育、發展、工作與組織中的問題。</p><a class="text-link" href="research.html">研究領域與論文</a></div><div class="research-grid">{focus_cards()}</div></div></section>
<div class="container"><section class="section">{section_heading('Recent publications','近期研究','research.html#publications','精選論文完整資訊','2025–2026 年精選期刊論文。')}<div class="papers-list">{''.join(paper_row(p,False) for p in P['papers'][:4])}</div></section><section class="section split-section"><div>{section_heading('Academic background','學術歷程','about.html','完整學經歷')}{timeline([P['career'][0],P['career'][4],P['career'][5],P['education'][0]])}</div><div>{section_heading('For students','從問題開始，選擇方法','resources.html','教學與分析資源')}<div class="learning-list"><article class="learning-item"><span class="learning-number">1</span><div><h3>統計與量化研究的基礎</h3><p>從資料、測量、研究設計與推論開始。</p><a href="books.html">統計與量化研究書目</a></div></article><article class="learning-item"><span class="learning-number">2</span><div><h3>模型的原理與應用</h3><p>結構方程、多層次、潛在異質性與貝氏分析。</p><a href="books.html">進階模型專書與序言</a></div></article><article class="learning-item"><span class="learning-number">3</span><div><h3>範例資料與分析實作</h3><p>透過專書配套資料，練習模型設定與結果解讀。</p><a href="resources.html">取得教材與範例資料</a></div></article></div></div></section></div>'''
    return page('index.html','心理計量、量化研究與專書','邱皓政教授的研究、統計方法專書與原文序言。國立臺灣師範大學特聘教授，南加州大學心理計量學博士。',body)

def toolbar(categories, unit, placeholder):
    buttons = '<button type="button" data-filter="all" aria-pressed="true">全部</button>'+''.join(f'<button type="button" data-filter="{E(c)}" aria-pressed="false">{E(c)}</button>' for c in categories)
    return f'<div class="catalog-toolbar"><div class="filter-row" data-filters data-unit="{E(unit)}" role="group" aria-label="依主題篩選">{buttons}</div><div class="search-row"><div class="search-field"><label for="catalog-search" class="search-label">搜尋</label><input id="catalog-search" type="search" placeholder="{E(placeholder)}" autocomplete="off"></div><p id="result-count" class="result-count" role="status" aria-live="polite"></p></div></div><noscript><p class="no-js-note">以下列出完整內容。搜尋與主題篩選需啟用 JavaScript。</p></noscript>'

def books_page():
    cats = list(dict.fromkeys(b['category'] for b in BOOKS))
    body = heading('Books & prefaces','專書著作','Books, methods & the stories behind them',S['bookIntro'])
    body += f'<div class="container">{toolbar(cats,"本書","書名、出版社、作者或分析方法")}<div class="catalog-content"><div class="books-grid">'+''.join(book_card(b) for b in BOOKS)+f'</div><p id="empty-results" class="empty-results" hidden>沒有符合的書目，請更換關鍵字或選擇「全部」。</p><aside class="reading-guide"><h2>怎麼選一本適合自己的書？</h2><p>初次接觸量化研究，可從統計學與量化研究法開始；已有分析經驗，則依研究問題選擇結構方程、多層次、潛在異質性或貝氏統計。各書序言說明了寫作緣起、內容安排與讀者對象，可先讀序言再決定。</p></aside><p class="source-note">書目依版本出版年排列。重印日期另列，避免與新版混淆。來源：{ext(S["oldSite"]+"books.htm","原網站專書清單","")}、各出版社產品頁。資料核對：{E(S["updated"])}。</p></div></div>'
    return page('books.html','專書著作與序言','邱皓政統計學、量化研究法、結構方程、多層次、潛在異質性與貝氏統計專書，附出版社、版次與原文序言。',body)

def research_page():
    body = heading('Research','研究','Psychometrics & quantitative methods','關注測量、模型與推論，也關注它們如何回答教育、發展與組織中的實際問題。')
    body += '<section class="section research-band"><div class="container"><div class="research-grid">'+focus_cards()+'</div></div></section>'
    body += '<div class="container"><section class="section" id="publications">'+section_heading('Selected publications','精選期刊論文',subtitle='依刊行年份排列，保留完整題名、作者與 DOI。')+toolbar(list(dict.fromkeys(p['topic'] for p in P['papers'])),'篇論文','題名、作者、年份或研究主題')+'<div class="papers-list">'+''.join(paper_row(p) for p in P['papers'])+'</div><p id="empty-results" class="empty-results" hidden>沒有符合的論文，請更換關鍵字或選擇「全部」。</p><p class="source-note">這是精選研究清單；更完整的論文與研究計畫紀錄，請參閱 '+ext(S['cv'],'完整履歷','')+'。作者順序依原出版資訊保留。</p></section>'
    body += '<section class="section">'+section_heading('Academic exchange','近期交流主題',subtitle='2026 年履歷所列的講座與工作坊。')+'<div class="talks-grid">'+''.join(f'<article class="talk-card"><p class="talk-date">{E(t["date"])}</p><h3>{E(t["title"])}</h3><p>{E(t["event"])}</p>{ext(t["url"],"履歷紀錄","")}</article>' for t in P['talks'])+'</div></section></div>'
    return page('research.html','研究領域與近期論文','心理計量、結構方程、多層次、縱貫與混合模式研究。精選2025–2026近期論文、DOI與學術交流紀錄。',body)

def about_page():
    body = heading('About','學經歷','Hawjeng Chiou, Ph.D.','國立臺灣師範大學企業管理學系特聘教授、教育心理與輔導學系合聘教授。美國南加州大學心理計量學博士。')
    body += f'<div class="container about-layout"><aside class="about-sidebar"><img src="assets/images/hawjeng4.jpg" width="542" height="747" alt="邱皓政在統計方法講座中演講"><div><h2>邱皓政</h2><p lang="en">Hawjeng Chiou, Ph.D.</p><p>研究、教學與專書寫作</p></div>{ext(S["cv"],"完整履歷 PDF","button")}</aside><div><section class="about-section"><div class="eyebrow">Research, teaching & books</div><h2>把統計方法寫清楚，也教清楚。</h2><p>{E(S["bookIntro"])}</p><p>我的研究以心理計量和量化方法為主，涵蓋結構方程模式、多層次模式、潛在類別與混合模式、縱貫資料分析，以及貝氏統計。應用領域包括教育與兒童發展、人力資源管理、組織行為與校務研究。</p><div class="hero-actions"><a class="button" href="books.html">閱讀專書與序言</a><a class="button secondary" href="research.html">研究與論文</a></div></section><section class="about-section"><h2>教育背景</h2>{timeline(P["education"])}</section><section class="about-section"><h2>主要學術經歷</h2>{timeline(P["career"])}</section><section class="about-section"><h2>學術與行政服務</h2>{timeline(P["service"])}</section><p class="source-note">學經歷依本人 2026.09.15 修訂履歷與師大官方教師介紹核對。{ext(S["cv"],"查看完整紀錄","")}</p></div></div>'
    return page('about.html','個人介紹與學經歷','邱皓政教授的心理計量學背景、統計方法專書、教育背景、學術經歷與學術服務。',body)

def resources_page():
    body = heading('Learning & projects','教學與專案','Learning materials & research projects','專書範例、分析資料與教學資源，依主題集中於此。')
    body += '<div class="container"><section class="section">'+section_heading('Book resources','專書配套資源',subtitle='對照手邊書籍的版本，再下載所需範例。')+'<div class="resource-grid">'+''.join(f'<article class="resource-card"><div class="eyebrow">{E(r.get("category","Book materials"))}</div><h3>{E(r["title"])}</h3><p>{E(r["description"])}</p>{ext(r["url"],r.get("label","專書資料頁"))}</article>' for r in RESOURCES)+'</div><p class="source-note">外部教材與配套檔案由原網站或出版社提供；使用範例時，請依書籍說明核對軟體與版本。</p></section>'
    body += '<section class="section" id="projects">'+section_heading('Research projects','研究與開放專案')
    if PROJECTS:
        body += '<div class="projects-grid">'+''.join(f'<article class="project-card"><span class="tag">{E(p.get("status","公開專案"))}</span><h3>{E(p["title"])}</h3><p>{E(p["description"])}</p><div class="hero-specialty">'+''.join(f'<span class="tag">{E(t)}</span>' for t in p.get('tags',[]))+f'</div>{ext(p["url"],"查看專案")}</article>' for p in PROJECTS)+'</div>'
    else:
        body += f'<div class="project-empty"><h3>專案陸續整理中</h3><p>公開的分析範例、程式與研究專案，將集中放在這裡。現有專書配套資料可由上方資源取得。</p><div class="hero-actions">{ext(S["github"],"GitHub 個人頁","button secondary")}</div></div>'
    body += '</section></div>'
    return page('resources.html','教學資源與專案','統計方法專書範例、分析資料與教學資源；後續公開研究程式與GitHub專案的入口。',body)

def detail_page(b):
    prefix = '../'
    preface_sections = ''
    for idx, pre in enumerate(prefaces(b)):
        if not pre.get('paragraphs') and not pre.get('url'):
            raise ValueError(f'Book {b["id"]} has an empty preface')
        paragraphs = ''.join(f'<p>{E(p)}</p>' for p in pre.get('paragraphs',[]))
        if not paragraphs and pre.get('url'):
            paragraphs = '<p>'+ext(pre['url'],'閱讀完整序言 PDF','')+'</p>'
        note = f'<p class="preface-note">{E(pre["note"])}</p>' if pre.get('note') else ''
        preface_sections += f'<details class="preface-section" id="preface-{idx+1}"><summary><h2>{E(pre.get("title","序言"))}<span>展開閱讀完整原文</span></h2></summary><div class="preface-body">{note}{paragraphs}<p class="preface-source">原文來源：{ext(pre.get("source",b["source"]),"邱皓政原網站","")}</p></div></details>'
    if not preface_sections:
        raise ValueError(f'Book {b["id"]} lacks a verified preface')
    jump = ''.join(f'<a href="#preface-{i+1}">{E(pre.get("title","作者序"))}</a>' for i,pre in enumerate(prefaces(b)))
    body = f'''<div class="container"><div class="book-breadcrumb"><a href="../books.html">專書著作</a><span aria-hidden="true">／</span><span>{E(b['title'])}</span></div><div class="book-detail"><aside class="book-detail-aside"><div class="detail-cover"><img src="../assets/images/{E(Path(b['cover']).name)}" width="230" height="320" alt="《{E(b['title'])}》封面"></div><dl class="book-facts"><div><dt>出版社</dt><dd>{E(b['publisher'])}</dd></div><div><dt>出版</dt><dd>{E(b.get('date') or b['year'])}</dd></div><div><dt>版次</dt><dd>{E(b['edition'])}</dd></div><div><dt>作者</dt><dd>{E(b['authors'])}</dd></div>'''
    if b.get('isbn'):
        body += f'<div><dt>ISBN</dt><dd>{E(b["isbn"])}</dd></div>'
    if b.get('latestPrinting'):
        body += f'<div><dt>最新印刷</dt><dd>{E(b["latestPrinting"])}（重印）</dd></div>'
    body += f'''</dl>{ext(b['url'],'作者書籍原頁' if b.get('publisherLabel')=='書籍原頁' else '出版社書籍頁','button')}<nav class="preface-nav" aria-label="序言段落">{jump}</nav></aside><article class="book-detail-text"><div class="eyebrow">Book & preface · {E(b['year'])}</div><h1>{E(b['title'])}</h1><p class="detail-subtitle">{E(b.get('subtitle',''))}</p><p class="detail-summary">{E(b['summary'])}</p><div class="preface-intro" id="preface">序言<span>保留原文，僅調整網頁段落與排版。</span></div>{preface_sections}<div class="reading-end"><a class="button secondary" href="../books.html">回到全部書目</a><a class="back-top" href="#top">回到書籍資訊</a></div></article></div></div>'''
    return page('books/'+b['id']+'.html',b['title']+'：序言',b['summary']+' 附原文序言、出版社、版次與書籍資訊。',body,'books.html')

def sources_page():
    body = heading('Sources','資料來源','A traceable academic record','個人資料以本人履歷及師大官方介紹為依據；書目與論文另核對出版社及期刊來源。')
    sources = P['profileSources'] + [{'title':'專書著作與原文序言','url':S['oldSite']+'books.htm'}]
    body += '<div class="container"><section class="section"><h2>個人資料與學經歷</h2><ul class="source-list">'+''.join(f'<li>{ext(s["url"],s["title"],"")}</li>' for s in sources)+'</ul></section><section class="section"><h2>專書與序言</h2><ul class="source-list">'+''.join(f'<li>{E(b["title"])} · {E(b["edition"])}<small>{ext(b["url"],b["publisher"],"")} · {ext(b["source"],"作者書籍原頁","")}</small></li>' for b in BOOKS)+'</ul></section><section class="section"><h2>資料編排說明</h2><p class="body-note">書籍依版本出版年排序，重印資訊另列。研究頁列出精選已刊行論文，保留原出版題名與作者順序；尚未能核對正式出版頁的研究不混入已刊行清單。講座與工作坊資料依履歷所列。研究領域分類為本網站的編排方式。</p><p class="body-note">照片與書封取自作者原網站及出版社書籍頁。序言取自邱皓政原網站公開原文。資料核對日期：'+E(S['updated'])+'</p></section></div>'
    return page('sources.html','資料來源','邱皓政個人網站的履歷、書目、序言與論文資料來源。',body)

def build():
    parser = argparse.ArgumentParser()
    parser.add_argument('--out',default='.',help='Output folder relative to repository root')
    args = parser.parse_args()
    target = (ROOT / args.out).resolve()
    if target != ROOT and ROOT not in target.parents:
        raise ValueError('Output must remain inside this repository')
    target.mkdir(parents=True,exist_ok=True)
    if target != ROOT:
        shutil.copytree(ROOT/'assets',target/'assets',dirs_exist_ok=True)
    (target/'books').mkdir(exist_ok=True)
    pages = {'index.html':home(),'books.html':books_page(),'research.html':research_page(),'about.html':about_page(),'resources.html':resources_page(),'sources.html':sources_page()}
    for b in BOOKS:
        if not re.fullmatch(r'[a-z0-9-]+',b['id']):
            raise ValueError('Invalid book id')
        pages['books/'+b['id']+'.html'] = detail_page(b)
    notfound_prefix = S['siteUrl'].rstrip('/')+'/' if S['siteUrl'] else ''
    pages['404.html'] = page('404.html','找不到這個頁面','請從邱皓政網站首頁或專書清單繼續瀏覽。',f'<div class="container section"><div class="eyebrow">404</div><h1>找不到這個頁面</h1><p class="body-note">網址可能已經變更，請由首頁或專書清單繼續瀏覽。</p><div class="hero-actions"><a class="button" href="{url(notfound_prefix)}index.html">回首頁</a><a class="button secondary" href="{url(notfound_prefix)}books.html">專書著作</a></div></div>')
    for path,html in pages.items():
        (target/path).write_text(html,encoding='utf-8')
    (target/'.nojekyll').write_text('',encoding='utf-8')
    if S['siteUrl']:
        base = S['siteUrl'].rstrip('/')
        xml = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+''.join(f'<url><loc>{E(base+"/"+p)}</loc><lastmod>{S["updated"]}</lastmod></url>' for p in pages if p != '404.html')+'</urlset>'
        (target/'sitemap.xml').write_text(xml,encoding='utf-8')
        (target/'robots.txt').write_text('User-agent: *\nAllow: /\nSitemap: '+base+'/sitemap.xml\n',encoding='utf-8')
    print(f'Built {len(pages)} pages; {len(BOOKS)} books, {sum(len(prefaces(b)) for b in BOOKS)} prefaces, {len(P["papers"])} papers. Output: {target}')

if __name__ == '__main__':
    build()



