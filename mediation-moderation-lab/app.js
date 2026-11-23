'use strict';
const D=window.LAB_DATA,$=id=>document.getElementById(id);
const fmt=(n,k=3)=>Number.isFinite(n)?n.toFixed(k):'—';
const pval=n=>n<.001?'< .001':fmt(n);
const CI=a=>`[${fmt(a[0])}, ${fmt(a[1])}]`;
const sig=a=>a[0]>0||a[1]<0;
let alpha=.05,selected=D.moderation[0];
function table(head,rows){return `<table><thead><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(v=>`<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table>`}
function stats(id,items){$(id).innerHTML=items.map(([label,value])=>`<div class="stat"><span>${label}</span><strong>${value}</strong></div>`).join('')}
function plot(target,{series=[],bands=[],vlines=[],hlines=[],dots=[],xrange,yrange,xlabel='',ylabel='',title='',bars=[]}){
 const W=560,H=340,L=66,R=20,T=28,B=64;
 const xx=x=>L+(x-xrange[0])/(xrange[1]-xrange[0])*(W-L-R),yy=y=>H-B-(y-yrange[0])/(yrange[1]-yrange[0])*(H-T-B);
 let s=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${title}"><title>${title}</title>`;
 for(let i=0;i<=4;i++){const x=xrange[0]+i*(xrange[1]-xrange[0])/4,y=yrange[0]+i*(yrange[1]-yrange[0])/4;s+=`<line x1="${L}" y1="${yy(y)}" x2="${W-R}" y2="${yy(y)}" stroke="#e2e9eb"/><text x="${L-10}" y="${yy(y)+5}" font-size="14" text-anchor="end" fill="#526b77">${fmt(y,Math.abs(y)<2?2:1)}</text><text x="${xx(x)}" y="${H-B+25}" font-size="14" text-anchor="middle" fill="#526b77">${fmt(x,Math.abs(x)<2?2:1)}</text>`}
 for(const b of bands){s+=`<polygon points="${b.points.map(([x,y])=>`${xx(x)},${yy(y)}`).join(' ')}" fill="${b.color||'#bbe6e2'}" opacity=".7"/>`}
 for(const b of bars)s+=`<rect x="${xx(b.x0)}" y="${yy(b.y)}" width="${Math.max(1,xx(b.x1)-xx(b.x0)-1)}" height="${yy(0)-yy(b.y)}" fill="#4aa3a5"/>`;
 for(const y of hlines)if(y>=yrange[0]&&y<=yrange[1])s+=`<line x1="${L}" y1="${yy(y)}" x2="${W-R}" y2="${yy(y)}" stroke="#243b46" stroke-width="1.2"/>`;
 for(const x of vlines)if(x>=xrange[0]&&x<=xrange[1])s+=`<line x1="${xx(x)}" y1="${T}" x2="${xx(x)}" y2="${H-B}" stroke="#b44c25" stroke-dasharray="5 4"/>`;
 for(const c of series)s+=`<polyline points="${c.points.map(([x,y])=>`${xx(x)},${yy(y)}`).join(' ')}" fill="none" stroke="${c.color||'#087e85'}" stroke-width="2.5" ${c.dash?'stroke-dasharray="6 4"':''}/>`;
 for(const d of dots)s+=`<circle cx="${xx(d[0])}" cy="${yy(d[1])}" r="4" fill="#b44c25"/>`;
 s+=`<line x1="${L}" y1="${H-B}" x2="${W-R}" y2="${H-B}" stroke="#667d85"/><text x="${(L+W-R)/2}" y="${H-10}" font-size="16" text-anchor="middle" fill="#243b46">${xlabel}</text><text transform="translate(18 ${(T+H-B)/2}) rotate(-90)" font-size="15" text-anchor="middle" fill="#243b46">${ylabel}</text></svg>`;$(target).innerHTML=s;
}
function padRange(values){let min=Math.min(...values),max=Math.max(...values);const p=Math.max((max-min)*.12,.01);return [min-p,max+p]}
function roots(A,B,C){if(Math.abs(A)<1e-12)return Math.abs(B)>1e-12?[-C/B]:[];const d=B*B-4*A*C;if(d<0)return [];return [(-B-Math.sqrt(d))/(2*A),(-B+Math.sqrt(d))/(2*A)].sort((a,b)=>a-b)}
function moderation(reset=false){
 const d=selected,f=d.fit,b=f.b,V=f.cov,t=f.critical[String(alpha)],lo=d.wRange[0],hi=d.wRange[1];
 if(reset){$('w-slider').min=lo;$('w-slider').max=hi;$('w-slider').step=(hi-lo)/600;$('w-slider').value=d.wMean}
 const w=+$('w-slider').value,estimate=b[1]+b[3]*w,se=Math.sqrt(Math.max(0,V[1][1]+2*w*V[1][3]+w*w*V[3][3])),interval=[estimate-t*se,estimate+t*se];
 $('w-value').value=fmt(w,2);$('mapping').textContent=`${d.mapping}；焦點：${d.xlabel}；調節：${d.wlabel}。樣本 n = ${f.n}；w 的觀察範圍 ${fmt(lo,2)} 至 ${fmt(hi,2)}。`;
 stats('mod-stats',[['交互作用 β₃',fmt(b[3])],['模型 R²',fmt(f.r2)],['增加交乘項 ΔR²',fmt(d.deltaR2)],['目前條件效果',fmt(estimate)]]);
 const points=Array.from({length:161},(_,i)=>{let x=lo+(hi-lo)*i/160,y=b[1]+b[3]*x,s=Math.sqrt(Math.max(0,V[1][1]+2*x*V[1][3]+x*x*V[3][3]));return {x,y,l:y-t*s,h:y+t*s}});
 const jn=roots(b[3]**2-t*t*V[3][3],2*(b[1]*b[3]-t*t*V[1][3]),b[1]**2-t*t*V[1][1]);
 const groups=[];
 for(let i=0;i<points.length-1;i++){const p=points[i],q=points[i+1],color=p.l>0||p.h<0?'#92d8d4':'#f0c5b3';if(!groups.length||groups.at(-1).color!==color)groups.push({color,values:[p,q]});else groups.at(-1).values.push(q)}
 const bands=groups.map(g=>({color:g.color,points:[...g.values.map(p=>[p.x,p.l]),...g.values.slice().reverse().map(p=>[p.x,p.h])]}));
 plot('jn-chart',{title:'條件效果與信賴區間',xrange:[lo,hi],yrange:padRange([0,...points.flatMap(p=>[p.l,p.h])]),xlabel:`w：${d.wlabel}`,ylabel:d.binaryX?'預測組間差':'x 的條件斜率',bands:d.deterministic?[]:bands,series:[{points:points.map(p=>[p.x,p.y])}],hlines:[0],vlines:[w,...(d.deterministic?[]:jn)],dots:[[w,estimate]]});
 const ws=[Math.max(lo,d.wMean-d.wSD),d.wMean,Math.min(hi,d.wMean+d.wSD)],colors=['#176b91','#087e85','#b36b27'];
 const pred=(x,w)=>b[0]+b[1]*x+b[2]*w+b[3]*x*w;
 const lines=[...ws.map((a,i)=>({points:d.xRange.map(x=>[x,pred(x,a)]),color:colors[i]})),{points:d.xRange.map(x=>[x,pred(x,w)]),color:'#243b46',dash:true}];
 plot('prediction-chart',{title:'低中高調節值的預測線',xrange:d.xRange,yrange:padRange(lines.flatMap(l=>l.points.map(p=>p[1]))),xlabel:`x：${d.xlabel}`,ylabel:'預測 y',series:lines});
 $('coefficient-table').innerHTML=table(['參數','B','SE','p'],['截距 β₀','x：β₁','w：β₂','xw：β₃'].map((n,i)=>[n,fmt(b[i]),d.deterministic?'不適用':fmt(f.se[i]),d.deterministic?'不適用':pval(f.p[i])]));
 if(d.deterministic){$('jn-summary').textContent='此資料精確符合 y = 30 − 5xw，殘差近乎 0。僅用於說明條件斜率，不呈現 J–N 顯著性推論。';$('mod-interpretation').textContent=`目前 w = ${fmt(w,2)}，x 的斜率為 −5w = ${fmt(estimate)}。`;return}
 const inrange=jn.filter(v=>v>=lo&&v<=hi);
 const bounds=[lo,...inrange,hi],segments=[];
 for(let i=0;i<bounds.length-1;i++){const z=(bounds[i]+bounds[i+1])/2,s=b[1]+b[3]*z,v=Math.sqrt(Math.max(0,V[1][1]+2*z*V[1][3]+z*z*V[3][3]));segments.push(`${fmt(bounds[i],2)}–${fmt(bounds[i+1],2)}：${Math.abs(s)>t*v?'區間不含 0':'區間含 0'}`)}
 $('jn-summary').textContent=`觀察範圍內的 J–N 邊界：${inrange.length?inrange.map(v=>fmt(v,3)).join('、'):'無'}。${segments.join('；')}。邊界點的區間恰好碰到 0。`;
 $('mod-interpretation').textContent=`在 w = ${fmt(w,2)} 時，${d.binaryX?'x=1 相對於 x=0 的預測差':'x 每增加一單位的條件斜率'}為 ${fmt(estimate)}，${Math.round((1-alpha)*100)}% CI ${CI(interval)}，${sig(interval)?'不含':'包含'} 0。交互作用係數的 p ${pval(f.p[3])}；請同時檢查資料範圍與研究意義。`;
}
function mediation(){
 const m=D.mediation,c=D.conditional,level=Math.round((1-alpha)*100),ci=m.intervals[String(alpha)];
 $('path-a').textContent=`a = ${fmt(m.a.b[1])}`;$('path-b').textContent=`b = ${fmt(m.b.b[2])}`;$('path-direct').textContent=`教育到目前薪資的直接路徑 c′ = ${fmt(m.direct)}`;
 stats('med-stats',[['直接效果 c′',fmt(m.direct)],['間接效果 ab',fmt(m.indirect)],['總效果 c',fmt(m.total)],['拔靴樣本數',m.bootN.toLocaleString()]]);
 const h=m.histogram,bars=h.counts.map((y,i)=>({x0:h.edges[i],x1:h.edges[i+1],y}));
 plot('bootstrap-chart',{title:'間接效果的個案拔靴分配',xrange:[h.edges[0],h.edges.at(-1)],yrange:[0,Math.max(...h.counts)*1.1],xlabel:'未標準化間接效果 ab',ylabel:'次數',bars,vlines:[...ci,m.indirect]});
 $('boot-summary').textContent=`${level}% 百分位數拔靴區間 ${CI(ci)}。虛線為區間兩端及原始估計；NumPy 種子 ${m.seed}，5,000 次同一批個案置回抽樣。`;
 $('med-table').innerHTML=table(['效果／檢定','估計'],[['a',fmt(m.a.b[1])],['b（控制 x）',fmt(m.b.b[2])],['ab',fmt(m.indirect)],[`${level}% 拔靴 CI`,CI(ci)],['Sobel z',fmt(m.sobelZ)],['Sobel p',pval(m.sobelP)]]);
 $('med-interpretation').textContent=`間接效果區間${sig(ci)?'不含':'包含'} 0，${sig(ci)?'支持非零的間接關聯':'尚無足夠證據支持非零的間接關聯'}。直接效果 c′ 仍為正值；總效果 ${fmt(m.total)} = ${fmt(m.direct)} + ${fmt(m.indirect)}。`;
 $('report').textContent=`以 474 名員工資料分析，教育經由起薪連結目前薪資的未標準化間接效果為 ${fmt(m.indirect)}，5,000 次個案拔靴的 ${level}% 百分位數區間為 ${CI(ci)}；直接效果為 ${fmt(m.direct)}。薪資以萬元計，結果反映此線性模型下的間接關聯。`;
 const cc=c.intervals[String(alpha)],labels=['w=0（女性）','w=1（男性）','IE(1)−IE(0)'];
 $('conditional-table').innerHTML=table(['條件／比較','IE',`${level}% CI`],c.estimates.map((v,i)=>[labels[i],fmt(v),CI(cc[i])]));
 const g=+$('gender').value;$('conditional-highlight').textContent=`${labels[g]}：IE = ${fmt(c.estimates[g])}；${level}% CI ${CI(cc[g])}`;
 $('conditional-summary').textContent=`兩組間接效果差為 ${fmt(c.estimates[2])}，${level}% 拔靴 CI ${CI(cc[2])}，${sig(cc[2])?'不含':'包含'} 0。請勿將此結果解讀成性別的因果效果。`;
 plot('conditional-chart',{title:'兩組條件間接效果及拔靴區間',xrange:[-.3,1.3],yrange:padRange([0,...cc.slice(0,2).flat()]),xlabel:'w：0 女性；1 男性',ylabel:'條件間接效果',hlines:[0],series:cc.slice(0,2).map((a,i)=>({points:[[i,a[0]],[i,a[1]]],color:i===g?'#b44c25':'#087e85'})),dots:c.estimates.slice(0,2).map((v,i)=>[i,v])});
}
function software(name){$('code').textContent=window.LAB_CODES[name];$('code-title').textContent=name==='SPSS'?'SPSS：原生迴歸與 PROCESS':name;const path={R:'analysis.R',Python:'analysis.py',SPSS:'analysis.sps',Mplus:'moderation.inp'};$('code-download').href='syntax/'+path[name];$('code-download').textContent=name==='Mplus'?'下載調節 .inp（其餘見完整教材）':'下載語法';document.querySelectorAll('[data-software]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.software===name)));$('copy-status').textContent=''}
document.querySelectorAll('[data-software]').forEach(b=>b.addEventListener('click',()=>software(b.dataset.software)));
$('dataset').addEventListener('change',()=>{selected=D.moderation.find(d=>d.id===$('dataset').value);moderation(true)});
$('w-slider').addEventListener('input',()=>moderation());$('confidence').addEventListener('change',()=>{alpha=+$('confidence').value;moderation();mediation()});$('gender').addEventListener('change',mediation);
$('copy-code').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('code').textContent);$('copy-status').textContent='已複製'}catch{$('copy-status').textContent='請選取語法複製，或使用下載'}});
document.querySelectorAll('.quiz').forEach(b=>b.addEventListener('click',()=>{const p=b.parentElement.querySelector('.feedback');p.textContent=(b.dataset.answer==='true'?'答對了。':'再想一想。')+p.dataset.explanation}));
moderation(true);mediation();software('R');
