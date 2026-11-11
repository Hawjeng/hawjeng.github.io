'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const f=v=>v===null||Number.isNaN(v)||v===undefined?'—':v===Infinity?'∞':Math.abs(v)>=10000?v.toExponential(3):Number(v.toFixed(4)).toString();
const p=v=>v==null?'—':v<.0001?'< 0.0001':f(v);
const data=globalThis.LAB_DATA;
const tabs=[['theory','原理說明'],['book','課本範例'],['survey','調查研究'],['exercise','習作詳解'],['manual','自行輸入'],['downloads','下載與來源']];
const options=(xs)=>xs.map(([v,n])=>'<option value="'+esc(v)+'">'+esc(n)+'</option>').join('');
const field=(id,title,inner)=>'<label>'+title+'<select id="'+id+'">'+inner+'</select></label>';
const alpha=()=>field('alpha','顯著水準 α',options([['.05','0.05'],['.01','0.01'],['.10','0.10']]));
const table=(heads,rows,cap='',hit=()=>false)=>'<div class="table"><table>'+(cap?'<caption>'+esc(cap)+'</caption>':'')+'<thead><tr>'+heads.map(x=>'<th scope="col">'+esc(x)+'</th>').join('')+'</tr></thead><tbody>'+rows.map((r,i)=>'<tr>'+r.map((x,j)=>'<td'+(hit(i,j)?' class="hit"':'')+'>'+esc(x)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
const card=(s)=>'<div class="card">'+s+'</div>';
const heading=s=>'<h2 id="section-title">'+s+'</h2>';
const csv=(h,r)=>[h,...r].map(row=>row.map(x=>'"'+String(x).replace(/"/g,'""')+'"').join(',')).join('\n');
function save(name,body,type){
 let u=URL.createObjectURL(new Blob(['\ufeff',body],{type})),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);
}
function fchart(d,e,obs,lo,hi,tail='right'){
 const X=Math.max(hi*1.24,critical(d,e,.015),obs===Infinity?0:Math.min(obs*1.06,hi*4));
 const x=v=>48+v/X*598, dx=X/260;
 const grid=Array.from({length:260},(_,i)=>(i+.35)*dx);
 const max=Math.max(...grid.map(v=>density(v,d,e)))*1.07;
 const y=v=>143-111*density(Math.max(dx*.35,v),d,e)/max;
 const path=(a,b)=>{
  a=Math.max(0,a);b=Math.min(X,b);if(a>=b)return '';
  return 'M'+x(a)+',143 '+[a,...grid.filter(v=>v>a&&v<b),b].map(v=>'L'+x(v)+','+y(v)).join(' ')+' L'+x(b)+',143Z';
 };
 const line=(v,color)=>v<=X&&v>=0?'<path d="M'+x(v)+' 143V27" stroke="'+color+'" stroke-dasharray="5 4" stroke-width="2"/>':'';
 let rr=tail==='both'?[[0,lo],[hi,X]]:[[hi,X]],pp;
 if(tail==='both'){
   let left=lower(obs,d,e)<=upper(obs,d,e);
   pp=left?[[0,obs],[critical(d,e,lower(obs,d,e)),X]]:[[0,1/critical(e,d,upper(obs,d,e))],[obs,X]];
 }else pp=[[obs,X]];
 const draw=(regions,color,name)=>'<figure><svg viewBox="0 0 680 175" role="img" aria-label="'+esc(name)+'"><path d="M48 143H646" stroke="#657f82"/>'+regions.map(([a,b])=>'<path d="'+path(a,b)+'" fill="'+color+'" opacity=".28"/>').join('')+'<polyline fill="none" stroke="#255661" stroke-width="2" points="'+grid.map(v=>x(v)+','+y(v)).join(' ')+'"/>'+line(hi,'#a24a14')+(lo>0?line(lo,'#a24a14'):'')+line(obs,'#4c3c86')+Array.from({length:6},(_,i)=>'<text x="'+x(i*X/5)+'" y="163" text-anchor="middle" font-size="12">'+f(i*X/5)+'</text>').join('')+'</svg><figcaption>'+name+'｜橙虛線：臨界值；紫虛線：觀察 F'+(obs>X?'（超出圖域）':'')+'</figcaption></figure>';
 return '<div class="pair">'+draw(rr,'#cf7030','α 拒絕域')+draw(pp,'#397dcc','p 值尾域')+'</div>';
}
function profile({as,bs,M}){
 let min=Math.min(...M.flat()),max=Math.max(...M.flat()),pad=(max-min||1)*.14;
 let x=j=>64+j*544/(bs.length-1),y=v=>174-(v-min+pad)/(max-min+2*pad)*143;
 const col=['#266b80','#a44827','#5c518f','#367343','#81651a','#a04271'];
 return '<h3>細格平均數圖</h3><figure><svg viewBox="0 0 670 220" role="img" aria-label="各因子水準的平均數折線圖">'+
 Array.from({length:5},(_,i)=>{let v=min-pad+(max-min+2*pad)*i/4;return '<path d="M64 '+y(v)+'H608" stroke="#d5e3e1"/><text x="58" y="'+(y(v)+4)+'" text-anchor="end" font-size="11">'+f(v)+'</text>';}).join('')+
 bs.map((v,j)=>'<text x="'+x(j)+'" y="199" text-anchor="middle" font-size="12">'+esc(v)+'</text>').join('')+
 M.map((r,i)=>'<polyline fill="none" stroke="'+col[i%6]+'" stroke-width="3" stroke-dasharray="'+(i%2?'6 3':'none')+'" points="'+r.map((v,j)=>x(j)+','+y(v)).join(' ')+'"/>'+r.map((v,j)=>'<circle cx="'+x(j)+'" cy="'+y(v)+'" r="4" fill="'+col[i%6]+'"/>').join('')).join('')+
 '</svg><figcaption>'+as.map((v,i)=>'<strong style="color:'+col[i%6]+'">● '+esc(v)+'</strong>').join('　')+'。線條不平行是交互作用的線索，是否顯著仍以 F 檢定為準。</figcaption></figure>';
}
function show(res,a){
 const desc=table(['組別／細格','n','平均數','樣本變異數'],res.desc.map(([n,k,m,v])=>[n,k,f(m),f(v)]),'敘述統計');
 if(res.ratio){
  let z=res.ratio;
  return '<p class="note">F('+z.d+', '+z.e+') = '+f(z.f)+'，雙尾 p '+(z.p<.0001?'':'= ')+esc(p(z.p))+'；'+(z.p<a?'拒絕':'未拒絕')+'兩母體變異數相等。雙尾臨界值：'+f(z.lo)+'、'+f(z.hi)+'。</p>'+fchart(z.d,z.e,z.f,z.lo,z.hi,'both')+desc;
 }
 const tested=res.terms.filter(t=>t.err),t=tested.at(-1);
 const conclusion=tested.map(x=>'<li>'+esc(x.name)+'：F('+x.df+', '+x.df2+') = '+f(x.f)+'，p '+(x.p!==null&&x.p<.0001?'':'= ')+esc(p(x.p))+'；'+(x.p===null?'無法檢定（誤差與效果均為零）':x.p<a?'<strong class="sig">達顯著</strong>':'未達顯著')+'。</li>').join('');
 let html='<ul class="note">'+conclusion+'</ul>'+table(['變異來源','SS','df','MS','分母誤差項','F','p','F 臨界值','偏 η²'],
  res.terms.map(z=>[z.name,f(z.s),z.df,f(z.ms),z.err??'—',f(z.f),p(z.p),f(z.crit),f(z.eta)]),'變異數分析摘要表');
 if(res.profile)html+=profile(res.profile)+table(['A 水準',...res.profile.bs,'A 邊際平均'],[...res.profile.M.map((r,i)=>[res.profile.as[i],...r.map(f),f(avg(r))]),['B 邊際平均',...res.profile.bs.map((_,j)=>f(avg(res.profile.M.map(r=>r[j])))),f(avg(res.profile.M.flat()))]],'細格與邊際平均');
 if(t.p!==null)html+='<details><summary>查看 '+esc(t.name)+' 的 F 分配與兩種尾域</summary>'+fchart(t.df,t.df2,t.f,0,t.crit)+'</details>';
 html+=desc;
 if(res.pairs?.length&&tested[0].p<a)html+=table(['比較','平均差','df','原始 p','Holm p'],res.pairs.map(z=>[z.name,f(z.delta),z.df,p(z.p),p(z.adj)]),'事後比較｜'+(res.terms.some(z=>z.name==='受試者／區組')?'配對 t':'以組內 MS 為共用誤差的 t')+'，Holm 校正');
 if(res.slices?.length&&t.p<a)html+=table(['固定條件下的效果','df₁','df₂','F','原始 p','Holm p'],res.slices.map(z=>[z.name,z.df,z.df2,f(z.f),p(z.p),p(z.adj)]),'單純主要效果｜各切片依其設計重估誤差，Holm 校正');
 return html;
}
function safe(out,fn){try{out.innerHTML=fn();}catch(e){out.innerHTML='<p class="warning" role="alert">'+esc(e.message)+'</p>';}}
const sketches=[[[5,3,2],[1,2,5]],[[5,4.5,2],[4.5,1.5,1]],[[5,4,3],[1,2,2.5]]];
const concepts=[
 ['F 分配與查表','F 是兩個獨立的卡方量各除以其自由度後的比值，取值非負，分配形狀取決於分子 df₁ 與分母 df₂。下方表格的欄是 df₁，列是 df₂，交會處為右尾面積 α 對應的 F 臨界值。ANOVA 只看右尾；檢驗兩母體變異數是否相等時，雙尾各用 α／2，左尾臨界值可交換自由度後取倒數。','F = MS效果 ÷ MS誤差'],
 ['單因子｜獨立組','不同受試者各屬一組。虛無假設為各組母體平均相等。把總變異拆成組間與組內，按組樣本數計算加權平均。拒絕虛無假設只能說至少有一組不同。假設為觀測獨立、殘差近似常態且各組等變異。','SS全體 = SS組間 + SS組內；df = (k−1, N−k)'],
 ['單因子｜相依／區組','同一人接受所有條件，或在每個區組內配對。先拆出受試者或區組差異，再用剩下的受試者 × 條件變異作分母。三個以上條件的未校正 F 需考慮球面性；兩條件時 F 等於配對 t 的平方。','SS全體 = SS條件 + SS受試者 + SS殘差'],
 ['二因子｜完全獨立','每位受試者只屬一個 A×B 細格。A、B 與 A×B 共用細格內誤差。交互作用檢驗的是 A 的差異會不會隨 B 的水準而改變；交互作用顯著時，優先解讀細格平均與單純主要效果。','SS全體 = SSA + SSB + SSA×B + SS細格內'],
 ['二因子｜混合','A 是受試者間因子，B 是同一受試者反覆測量的條件。A 用組內受試者差異當分母；B 與 A×B 用 B×受試者（A 內）當分母。重複條件多於兩個時須評估球面性。','A：MS受試者（A 內）；B、A×B：MSB×受試者（A 內）'],
 ['二因子｜完全相依','每位受試者完成全部 A×B 組合。可用各效果對應的受試者交互作用作分母；課本另示範把三項殘差合併，需額外假定它們可共用同一誤差均方。兩法可能得出不同結論。','A：MSA×受試者；B：MSB×受試者；A×B：MSA×B×受試者']
];
function theory(){
 return heading('原理說明')+card(concepts.map(([t,b,m],i)=>'<details'+(!i?' open':'')+'><summary>'+t+'</summary><p>'+b+'</p><span class="math">'+m+'</span></details>').join('')+
 card('<details><summary>圖 12.2｜比較交互作用的型態</summary><p>切換課本示意平均數，觀察線條交叉、差距改變或逐漸收斂。只有細格平均數，沒有個別觀測值，不能用這張圖作 F 檢定。</p><label for="sketch">示意圖：</label><select id="sketch">'+options(sketches.map((_,i)=>[i,'圖 12.2（'+(i+1)+'）']))+'</select><div id="sketch-out"></div></details>')+
 '<p class="muted">本教材使用傳統未校正 F，不代做球面性或等變異檢查。實際研究應先檢查設計及殘差；違反球面性時，可考慮 Greenhouse–Geisser 校正或混合模型。</p>')+
 '<div class="grid"><div class="card controls"><h3>F 分配與查表</h3>'+alpha()+'<label>分子自由度 df₁<input id="d1" type="number" value="3" min="1" max="1000" step="1"></label><label>分母自由度 df₂<input id="d2" type="number" value="18" min="1" max="10000" step="1"></label><label>觀察 F<input id="obs" type="number" value="8.99" min="0" max="10000000" step="any"></label>'+field('tail','用途',options([['right','右尾｜ANOVA'],['both','雙尾｜變異數比']]))+'</div><div class="card" id="f-out" aria-live="polite"></div></div>';
}
function theoryUpdate(){safe($('f-out'),()=>{
 let d=+$('d1').value,e=+$('d2').value,obs=+$('obs').value,a=+$('alpha').value,tail=$('tail').value;
 check($('obs').value!==''&&Number.isFinite(obs)&&obs>=0&&obs<=1e7&&Number.isInteger(d)&&d>=1&&d<=1000&&Number.isInteger(e)&&e>=1&&e<=10000,'請輸入有效的非負 F 和正整數自由度。');
 let q=tail==='both'?a/2:a,hi=critical(d,e,q),lo=tail==='both'?1/critical(e,d,q):0,pv=tail==='both'?Math.min(1,2*Math.min(lower(obs,d,e),upper(obs,d,e))):upper(obs,d,e);
 let ds=unique([1,2,3,4,5,6,8,10,d]).sort((a,b)=>a-b),es=unique([1,2,3,4,5,6,8,10,12,15,20,30,60,120,e]).sort((a,b)=>a-b);
 return '<p class="note">F('+d+', '+e+')：觀察值 '+f(obs)+'，p '+(pv<.0001?'':'= ')+esc(p(pv))+'；'+(lo?'左界 '+f(lo)+'，':'')+'右界 '+f(hi)+'。</p>'+fchart(d,e,obs,lo,hi,tail)+table(['df₂ ＼ df₁',...ds],es.map(y=>[y,...ds.map(x=>f(critical(x,y,q)))]),'F 右尾臨界值表｜右尾面積 '+q,(i,j)=>es[i]===e&&ds[j-1]===d);
 });}
const exercises='<details><summary>習作 11.1｜辨識獨立與相依設計</summary>'+table(['情境','因子 → 依變數','設計與樣本數','事後比較'],[
 ['直營與加盟','店別 → 口味好感','獨立；每組 50，100 人','兩組不需'],
 ['三種婚育狀態','婚育狀態 → 食安重視','獨立；每組 8，24 人','三組整體顯著後比較'],
 ['大一至大四','年級 → 簡報能力','相依；每年 50，50 人、200 筆','四條件整體顯著後比較'],
 ['訓練前後','時間 → 顧客抱怨','相依；每次 25，25 人、50 筆','兩條件不需']])+'</details>'+
 '<details><summary>習作 12.1｜辨識二因子設計</summary><p>四題均檢驗 A、B 與 A×B。細格數是兩因子水準的乘積；邊際平均數的個數是兩因子水準數的總和。</p>'+table(['情境','水準與設計','細格數與每格 n','邊際平均數個數與觀測數'],[
 ['婚育 × 性別（個別訪問）','3×2，完全獨立','6 格，各 10','5 個：婚育各 20；性別各 30'],
 ['婚育 × 性別（成對訪問）','3×2，混合；以對為區組','6 格，各 10','5 個：婚育各 20 筆；性別各 30 筆'],
 ['性別 × 年級','2×4，混合；年級相依','8 格：男每格 20、女每格 30','6 個：性別 80／120 筆；年級各 50 筆'],
 ['片型 × 片長','2×2，完全相依','4 格，各 10','4 個，各 20 筆；同一批 10 人']])+'<p>性別 × 年級的樣本數不平衡；本教材的二因子計算器只支援平衡設計。</p></details>';
function examples(kind){
 let items=data.items.filter(x=>x.kind===kind);
 return heading(kind==='book'?'課本範例':'習作詳解')+(kind==='exercise'?card(exercises+'<p>下方可查看計算題的完整摘要表、判讀及事後比較。</p>'):'')+
 '<div class="grid"><div class="card controls">'+field('case','選擇案例',options(items.map((x,i)=>[i,x.title])))+alpha()+'<div id="case-notes"></div><div id="pool-control"></div></div><div class="card" id="results" aria-live="polite"></div></div>';
}
function exampleUpdate(kind,change=true){
 let z=data.items.filter(x=>x.kind===kind)[+$('case').value],a=+$('alpha').value;
 if(change){
  $('case-notes').innerHTML='<p class="note">'+esc(labels[z.model])+'</p><p>'+esc(z.note)+'</p><p class="muted">資料：'+esc(z.source)+'</p><a href="downloads/'+z.file+'" download>下載案例 CSV</a>';
  $('pool-control').innerHTML=z.model==='within'?'<div class="check"><label><input type="checkbox" id="pool" '+(kind==='book'?'checked':'')+'> 採用課本的合併殘差</label></div>':'';
  $('pool')?.addEventListener('change',()=>exampleUpdate(kind,false));
 }
 safe($('results'),()=>{
  let r=compute(z.model,z.headers,z.rows,a,$('pool')?.checked),extra='';
  if(kind==='exercise'&&z.title.includes('辯論')){
    let models=data.items.filter(x=>x.kind==='exercise'&&x.title.includes('辯論'));
    extra='<h3>比較獨立與區組分析</h3>'+table(['設計','F','df₁','df₂','p'],models.map(x=>{let t=compute(x.model,x.headers,x.rows,a).terms[0];return [labels[x.model],f(t.f),t.df,t.df2,p(t.p)]}))+'<p>校別平均不變；相依模型把辯次差異拆出，誤差均方和自由度都會改變。是否配對應依競賽安排決定。</p>';
  }
  if(kind==='exercise'&&z.title.includes('咖啡')){
    let models=data.items.filter(x=>x.kind==='exercise'&&x.title.includes('咖啡'));
    extra='<h3>比較三種咖啡實驗安排</h3>'+table(['設計','效果','F','df₁','df₂','p'],models.flatMap(x=>compute(x.model,x.headers,x.rows,a,$('pool')?.checked).terms.slice(0,3).map(t=>[labels[x.model],t.name,f(t.f),t.df,t.df2,p(t.p)])))+'<p>完全獨立用了 20 人；混合用了 10 人，各人只在一種溫度下評兩種容量；完全相依用了 5 人，每人評四種組合。分數雖相同，三種安排的誤差項不同。</p>';
  }
  return '<h3>'+esc(z.title)+'</h3>'+show(r,a)+extra+'<details><summary>展開原始觀測值</summary>'+table(z.headers,z.rows)+'</details>';
 });
}
function survey(){
 const vars=Object.keys(data.survey);
 return heading('調查研究')+'<p>以 '+data.surveyN+' 筆問卷的公開分組摘要，探索星座、性別、手機或上網方案與數值變項的關係。</p><div class="grid"><div class="card controls">'+
 field('variable','結果變項',options(vars.map(v=>[v,v])))+field('group','分組因子',options(Object.keys(data.survey[vars[0]]).map(v=>[v,v])))+alpha()+'<h3>納入組別</h3><div id="survey-groups" class="check"></div></div><div class="card" id="results" aria-live="polite"></div></div><p class="note">這是觀察性調查，組別沒有隨機分派。分析按變項排除缺失、保留 0；傳統 ANOVA 的等變異假設對偏態或組別不均的資料尤其重要。跨結果變項反覆探索時，不應將個別顯著結果視為驗證性證據。</p>';
}
function surveyUpdate(rebuild=false){
 let rows=data.survey[$('variable').value][$('group').value];
 if(rebuild){
  $('survey-groups').innerHTML=rows.map(([k,n],i)=>'<label><input type="checkbox" value="'+i+'" checked> '+esc(k)+'（n='+n+'）</label>').join('');
  $('survey-groups').onchange=()=>surveyUpdate();
 }
 safe($('results'),()=>show(oneSummary(rows.filter((_,i)=>$('survey-groups').querySelectorAll('input')[i].checked),+$('alpha').value),+$('alpha').value));
}
function parse(s){
 let lines=s.trim().split(/\r?\n/).filter(x=>x.trim()),sep=lines[0]?.includes('\t')?'\t':',';
 function split(l){if(sep==='\t')return l.split(sep).map(x=>x.trim());
  let out=[],x='',quoted=false;for(let i=0;i<l.length;i++){let c=l[i];if(c==='"'){if(quoted&&l[i+1]==='"'){x+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){out.push(x.trim());x='';}else x+=c;}check(!quoted,'CSV 引號未閉合。');out.push(x.trim());return out;
 }
 check(lines.length>=3&&lines.length<=5001,'請輸入欄名及 2–5,000 筆資料。');
 return lines.map(split);
}
function manual(){
 return heading('自行輸入')+'<div class="grid"><div class="card controls">'+field('model','選擇設計',options(Object.entries(labels)))+alpha()+
 '<div class="check" id="pool-control" hidden><label><input id="pool" type="checkbox"> 採用課本的合併殘差</label></div><p id="format" class="note"></p><button id="sample" type="button">帶入可編輯範例</button>'+
 '</div><div class="card"><label for="paste"><strong>貼上 CSV 或 Excel 的表格</strong></label><textarea id="paste" spellcheck="false"></textarea><div class="inline"><button class="primary" id="run">計算 ANOVA／F 檢定</button><button id="export">下載目前資料</button></div><p class="muted">資料在此瀏覽器計算，不會上傳。相依資料不得缺格；二因子計算限平衡設計。</p></div></div><div id="results" class="card" aria-live="polite"></div>';
}
const formats={ratio:'組別,數值。第一個出現的組別作分子，只能有兩組。',one:'組別,數值。每列是一筆獨立觀測。',repeat:'受試者,條件1,條件2,…。每人一列。',two:'A 因子,B 因子,數值。每列一位獨立受試者。',mixed:'A 組別,受試者,B 條件1,B 條件2,…。每人一列，ID 必須唯一。',within:'受試者,A 因子,B 因子,數值。每人每個細格各一列。'};
function readManual(){
 let m=$('model').value,[h,...rows]=parse($('paste').value),len={ratio:2,one:2,two:3,within:4}[m],start={ratio:1,one:1,two:2,within:3,repeat:1,mixed:2}[m];
 check(h.length<=24&&h.every(Boolean)&&unique(h).length===h.length&&(len?h.length===len:h.length>=start+2),'欄位數或欄名不合規則，請參考該設計的範例。');
 rows=rows.map((r,i)=>{check(r.length===h.length&&r.every(Boolean),'第 '+(i+2)+' 列欄數不符或有空白。');
 return r.map((v,j)=>{if(j<start)return v;let n=Number(v);check(Number.isFinite(n)&&Math.abs(n)<=1e100,'第 '+(i+2)+' 列有無效數值。');return n;});});
 return {m,h,rows};
}
function runManual(){safe($('results'),()=>{let {m,h,rows}=readManual(),a=+$('alpha').value;return show(compute(m,h,rows,a,$('pool').checked),a);});}
function sample(){let m=$('model').value,z=data.items.find(x=>x.model===m);$('paste').value=csv(z.headers,z.rows);runManual();}
function downloads(){
 return heading('下載與來源')+card('<h3>可重現資料與程式</h3><ul><li><a href="downloads/survey-summary.csv" download>調查研究分組摘要 CSV</a>（每組 n、平均數、樣本變異數）</li><li><a href="stats.js" download>下載計算程式 JavaScript</a></li><li><a href="https://github.com/Hawjeng/hawjeng.github.io/tree/main/anova-lab">網站原始碼</a></li></ul><p>課本來源：邱皓政《統計學》第五版第 11、12 章與同章資料檔。案例 CSV 僅摘錄計算使用的欄列，欄名依教材用途整理。調查來源為 data3.xlsx 的 Cleaned_Data；只發布彙總資料，不提供逐筆問卷或 Word 校稿。圖 12.2 取自 Ch12p330t12.2.xlsx。二因子計算採用正式表格中的 Excel 觀測值，不混用其他工作表或 SPSS 版本。</p>'+
 table(['案例','原始資料檔','資料下載'],data.items.map((z,i)=>[z.title,z.source,'CSV '+(i+1)]))+'<ol>'+data.items.map(z=>'<li><a href="downloads/'+z.file+'" download>'+esc(z.title)+' CSV</a></li>').join('')+'</ol>');
}
function mount(id){
 if(!tabs.some(t=>t[0]===id))id='theory';
 $('tabs').innerHTML=tabs.map(([k,t])=>'<button type="button" data-tab="'+k+'"'+(k===id?' aria-current="page"':'')+'>'+t+'</button>').join('');
 $('tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>{if(location.hash==='#'+b.dataset.tab)mount(b.dataset.tab);else location.hash=b.dataset.tab;});
 $('panel').innerHTML=id==='theory'?theory():id==='book'||id==='exercise'?examples(id):id==='survey'?survey():id==='manual'?manual():downloads();
 if(id==='theory'){
  for(let x of ['d1','d2','obs','alpha','tail'])$(x).oninput=theoryUpdate;
  const sketch=()=>$('sketch-out').innerHTML=profile({as:['a1','a2'],bs:['b1','b2','b3'],M:sketches[+$('sketch').value]});
  $('sketch').onchange=sketch;sketch();theoryUpdate();
 }else if(id==='book'||id==='exercise'){
  $('case').onchange=()=>exampleUpdate(id);$('alpha').onchange=()=>exampleUpdate(id,false);exampleUpdate(id);
 }else if(id==='survey'){
  for(let x of ['variable','group'])$(x).onchange=()=>surveyUpdate(true);
  $('alpha').onchange=()=>surveyUpdate();surveyUpdate(true);
 }else if(id==='manual'){
  const m=()=>{$('format').textContent=formats[$('model').value];$('pool-control').hidden=$('model').value!=='within';$('pool').checked=false;};
  $('model').value='one';m();sample();
  $('model').onchange=()=>{m();$('results').innerHTML='<p>已切換設計。請貼上符合格式的資料，或帶入範例後再計算。</p>';};
  $('sample').onclick=sample;$('run').onclick=runManual;$('alpha').onchange=runManual;$('pool').onchange=runManual;
  $('export').onclick=()=>save('anova-input.csv',$('paste').value,'text/csv;charset=utf-8');
 }
}
window.addEventListener('hashchange',()=>mount(location.hash.slice(1)));
mount(location.hash.slice(1));
