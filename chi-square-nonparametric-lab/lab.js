"use strict";
const $ = id => document.getElementById(id);
const value = id => $(id).value;
const put=(id,html)=>{$(id).innerHTML=html;};
const safe=x=>String(x??"—").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"','&quot;');
const fx=(x,d=3)=>Number(x).toFixed(d);
const pfx=p=>p<.0001?"< 0.0001":fx(p,4);
const isChi=d=>["gof","ind","hom"].includes(d.method);
const keys=Object.keys(CH17);
const exercises=keys.filter(k=>k.startsWith("e") && /^e\d/.test(k));
const survey=keys.filter(k=>k.startsWith("s_"));
const books=keys.filter(k=>!exercises.includes(k)&&!survey.includes(k));
const choose=(id,items)=>put(id,items.map(k=>'<option value="'+k+'">'+safe(CH17[k].title)+'</option>').join(""));
const table=(headers,rows)=>'<div class="scroll"><table><thead><tr>'+headers.map(x=>'<th scope="col">'+safe(x)+'</th>').join("")
  +'</tr></thead><tbody>'+rows.map(([head,...cells])=>'<tr><th scope="row">'+safe(head)+'</th>'+cells.map(x=>'<td>'+safe(x)+'</td>').join("")+'</tr>').join("")+'</tbody></table></div>';
const rawTable=d=>table(["資料",...d.cols],d.values.map((row,i)=>[d.rows[i],...row]));
const metric=(name,result)=>'<div class="metric"><span>'+safe(name)+'</span><strong>'+safe(result)+'</strong></div>';
const status=(p,alpha)=>p<=alpha?"拒絕 H₀":"不拒絕 H₀";
const source=d=>'<p class="source">資料來源 '+safe(d.source)+'</p>';
const jumpCode=key=>'<p class="inline-links"><a href="#syntax" data-code-case="'+key+'">以 R 與 Python 重現這組資料</a></p>';

const chiTheory={
  gof:["適合度檢定","虛無假設是各類別機率符合事先指定的分布。每格期望次數 Eᵢ=Npᵢ。固定機率時，若有 k 類，自由度為 k−1。若從同一資料估計了分布參數，還須按適用理論扣除相應自由度。","同一份圖書館資料可以檢驗「各年級等比例」或「符合全校年級比例」。更換假設會改變期望次數和 p 值。"],
  ind:["獨立性檢定","同一樣本的每位受訪者同時按兩個類別變數分類。虛無假設下，細格期望次數為列合計 × 欄合計 ÷ N。自由度為（列數−1）×（欄數−1）。","整體檢定回答兩變數是否有關聯。可用調整標準化殘差辨認哪些組合較常或較少出現，再用 Cramér V 描述強度。"],
  hom:["同質性檢定","分別從數個群體取樣，再比較同一類別結果的分布。以相同的 Pearson 統計量與列聯表期望值計算，虛無假設是各群體的結果分布相同。","整體顯著後，可用 Marascuilo 程序比較二元結果的組別比例，並同時考慮多組比較。"]
};
let chiKey, chiValues, chiWeights;
function chooseChi(method) {
  document.querySelectorAll("[data-method]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.method===method)));
  const [name,theory,context]=chiTheory[method];
  put("chi-principle",'<h3>'+name+'</h3><p>'+theory+'</p><p>'+context+'</p><p class="formula">χ² = Σ (O − E)² / E</p>');
  choose("chi-case",books.filter(k=>CH17[k].method===method));
  setupChi();
}
function setupChi() {
  chiKey=value("chi-case");
  const d=CH17[chiKey];
  chiValues=d.values.map(r=>[...r]);
  chiWeights=d.weights?.slice();
  const field=(n,label,attr)=>'<input class="chi-cell" type="number" min="0" max="1000000" step="any" value="'+n+'" aria-label="'+safe(label)+'" '+attr+'>';
  put("chi-input",'<table><thead><tr><th scope="col">類別</th>'+d.cols.map(c=>'<th scope="col">'+safe(c)+'</th>').join("")
    +'</tr></thead><tbody>'+d.values.map((r,i)=>'<tr><th scope="row">'+safe(d.rows[i])+'</th>'+r.map((n,j)=>'<td>'+field(n,d.rows[i]+" "+d.cols[j],"data-count="+i+":"+j)+'</td>').join("")+'</tr>').join("")
    +(chiWeights?'<tr><th scope="row">假設機率權重</th>'+chiWeights.map((n,j)=>'<td>'+field(fx(n,4),d.cols[j]+" 期望權重","data-weight="+j)+'</td>').join("")+'</tr>':"")
    +'</tbody></table>');
  renderChi();
}
function renderChi() {
  const d=CH17[chiKey];
  if (chiValues.flat().some(n=>!Number.isSafeInteger(n)||n<0||n>1000000)
      || chiWeights?.some(n=>!Number.isFinite(n)||n<=0||n>1000000)) {
    put("chi-result",'<p class="flag">次數須為 0 至 1,000,000 的整數。各類假設權重須大於 0。</p>');
    return;
  }
  put("chi-result",chiReport(d,chiValues,chiWeights,Number(value("chi-alpha")))+source(d)+jumpCode(chiKey)
    +'<p class="note">下載程式使用課本原值。自訂數值會更新目前網頁分析。</p>');
}
function chiChart(stat,df,cut) {
  const xmax=Math.max(df+5*Math.sqrt(2*df),cut*1.2, Math.min(stat*1.04,cut*2.5));
  const start=xmax/350, mode=Math.max(start,df-2), peak=chiDensity(mode,df)*1.08;
  const x=n=>45+n/xmax*540;
  const y=n=>147-Math.min(1,n/peak)*116;
  const curve=(a,b)=>Array.from({length:121},(_,i)=> {
    const n=a+(b-a)*i/120;
    return x(n).toFixed(2)+","+y(chiDensity(Math.max(start,n),df)).toFixed(2);
  }).join("L");
  const seen=Math.min(stat,xmax);
  return '<svg class="chi-plot" viewBox="0 0 620 182" role="img" aria-label="卡方機率密度，橘色區域為右尾拒絕域">'
    +'<path d="M'+x(cut)+',147L'+curve(cut,xmax)+'L585,147Z" fill="#f3c8ae"/><path d="M'+curve(0,xmax)+'" fill="none" stroke="#286d79" stroke-width="3"/>'
    +'<path d="M45 147H585 M'+x(cut)+' 40V147" stroke="#a24a14" stroke-dasharray="4 4"/><path d="M'+x(seen)+' 20V147" stroke="#173b44" stroke-width="2"/>'
    +'<text x="45" y="169">0</text><text x="585" y="169" text-anchor="end">'+fx(xmax,1)+'</text></svg>'
    +'<p class="distribution-key">深色線為觀察 χ²'+(stat>xmax?"（超出圖示範圍）":"")+'，橘色區域為拒絕域。虛線為臨界值 '+fx(cut)+'</p>';
}
function chiReport(d,counts,weights,alpha) {
  const m=pearson(counts,weights);
  if (!m) return '<p class="flag">請讓總觀察次數大於 0。列聯表每一列及每一欄都須至少有一筆觀察。</p>';
  const cut=chiCritical(m.df,alpha);
  const sparse=m.expected.flat().filter(n=>n<5).length;
  const caution=sparse ? '<p class="flag">期望次數低於 5 的細格有 '+sparse+'／'+m.expected.flat().length+' 個。'
    +(m.expected.flat().some(n=>n<1)||sparse/m.expected.flat().length>.2
      ? "卡方近似可能不穩定。2×2 表可用 Fisher 精確檢定，較大列聯表可考慮條件式模擬。適合度檢定可用精確或模擬方法。"
      : "請配合樣本設計評估近似。")+'</p>' : "";
  const cells=counts.flatMap((r,i)=>r.map((n,j)=>[
    weights?d.cols[j]:d.rows[i]+" × "+d.cols[j],n,fx(m.expected[i][j]),fx(n-m.expected[i][j]),fx(m.residual[i][j]),
    fx(m.adjusted[i][j]),fx(m.contribution[i][j])
  ]));
  const chart=chiChart(m.statistic,m.df,cut);
  let comparisons="";
  if (d.method==="hom") {
    const proportions=counts[0].map((n,j)=>n/m.byCol[j]);
    const pairs=[];
    proportions.forEach((a,i)=>proportions.slice(i+1).forEach((b,o)=>{
      const j=i+1+o;
      const limit=Math.sqrt(cut*(a*(1-a)/m.byCol[i]+b*(1-b)/m.byCol[j]));
      const diff=Math.abs(a-b);
      pairs.push([d.cols[i]+" vs "+d.cols[j],fx(diff),fx(limit),diff>limit?"超過臨界差":"未超過"]);
    }));
    comparisons='<details><summary>Marascuilo 比例成對比較</summary><p>先評估整體檢定與期望次數條件，再解讀成對差距。</p>'
      +table(["組別","比例絕對差","臨界差","比較"],pairs)+'</details>';
  }
  const lookup=[.10,.05,.01];
  const rows=Array.from({length:Math.max(12,m.df)},(_,i)=>[i+1,...lookup.map(a=>fx(chiCritical(i+1,a)))]);
  return '<div class="analysis-grid"><article class="card"><h3>Pearson 卡方結果</h3><div class="metric-grid">'
    +metric("樣本數 N",m.N)+metric("χ²",fx(m.statistic))+metric("自由度",m.df)+metric("右尾 p",pfx(m.p))
    +(m.v===null?"":metric("Cramér V",fx(m.v)))+'</div><p><strong>'+status(m.p,alpha)+'</strong>（α = '+fx(alpha,2)+'）。</p>'+caution
    +'<p class="note">殘差方向用 O−E 判斷，Pearson 殘差平方是細格對 χ² 的貢獻。調整殘差的 |z| 約達 1.96 可作探索線索，多格判讀須考慮重複比較。</p></article>'
    +'<article class="card"><h3>右尾拒絕域</h3>'+chart+'<details><summary>查右尾卡方臨界值表</summary><p>依自由度 '+m.df+' 及 α = '+fx(alpha,2)+' 交叉讀取。</p>'
    +table(["自由度","α = .10","α = .05","α = .01"],rows)+'</details></article></div>'
    +'<details class="card report-card" open><summary>期望值與逐格殘差</summary>'
    +table(["細格","觀察 O","期望 E","O−E","Pearson 殘差","調整殘差","χ² 貢獻"],cells)+comparisons+'</details>';
}

function rankReport(d,result,alpha) {
  const m=result.stats, rows=[];
  const add=(label,stat,p)=>rows.push([label,stat,pfx(p),status(p,alpha)]);
  const parts=[];
  if (d.method==="sign"||d.method==="paired") {
    add("符號檢定｜雙尾精確","正號 "+m.plus+"／"+m.n,m.p_two);
    add("符號檢定｜正向單尾精確","正號 "+m.plus+"／"+m.n,m.p_greater);
    add("符號檢定｜雙尾常態近似","連續性修正",m.normal_two);
    add("符號檢定｜正向單尾常態近似","連續性修正",m.normal_greater);
    parts.push("先排除 "+m.zeros+" 筆零差或無偏好，再以 Binomial(n, .5) 比較正號次數。正向單尾須由研究問題事先指定。");
  }
  if(d.method==="paired") {
    add("Wilcoxon 符號等級","T = "+fx(m.wilcoxon_t),m.p_signed_rank);
    parts.push("將非零差值的絕對值由小到大排名，同值用平均等級，再加回正負號。R⁺ = "+m.rank_plus+"，R⁻ = "+m.rank_minus+"。這裡使用含同級校正、未加連續性修正的常態近似。");
  }
  if (d.method==="kendall") {
    add("Kendall W","W = "+fx(m.kendall_w)+"，χ²("+m.df+") = "+fx(m.chi2),m.p);
    parts.push("對每位評分者的排序取平均同級，按受評對象加總等級。以同級修正計算 W，0 表示低一致性，1 表示完全一致。此處以 χ² 近似評估整體一致性。");
    if (d.source.startsWith("t17.9")) parts.push("工作簿列出的 W 約為 .895。本頁使用原始分數及同級修正重算，W 約為 .913。");
  }
  if (d.method==="groups"||d.method==="frequency") {
    if("u1" in m) {
      add("Wilcoxon 等級和","第一組秩和 W = "+m.rank_sum,m.p_rank_sum);
      add("Mann–Whitney U","U₁ = "+m.u1+"，U₂ = "+m.u2,m.p_rank_sum);
      parts.push("合併兩組觀察後排行。第一組 U₁ = W−n₁(n₁+1)/2。兩法用相同的等級資訊，這裡使用同級修正的常態近似，不使用連續性修正。");
    }
    add("Kruskal–Wallis H","H("+m.df+") = "+fx(m.h),m.p_kruskal);
    parts.push("將所有組別的觀察一起排序，再用各組秩和衡量差異，H 採同級修正。顯著時可再做經多重比較校正的成對分析。");
    if (d.source === "表 17.11") parts.push("工作簿摘要的 H 約為 2.296。本頁從原始成績重算並進行同級校正，因此 H 約為 2.304。");
  }
  let steps="";
  if(d.method==="paired") {
    const diff=d.values[1].map((x,i)=>x-d.values[0][i]);
    const ranked=midranks(diff.filter(x=>x!==0).map(Math.abs));
    let at=0;
    steps=table(["配對","前","後","差值","絕對差等級"],diff.map((x,i)=>[i+1,d.values[0][i],d.values[1][i],x,x?ranked[at++]:"排除"]));
  } else if(d.method==="kendall") {
    const ranks=d.cols.map((_,j)=>midranks(d.values.map(row=>row[j])));
    steps=table(["對象",...d.cols,"秩和"],d.rows.map((r,i)=>[r,...ranks.map(c=>c[i]),total(ranks.map(c=>c[i]))]));
  } else if(d.method==="sign") {
    steps=table(["受訪順序","偏好"],d.values[0].map((x,i)=>[i+1,x===1?"H":x===-1?"S":"無偏好"]));
  } else {
    steps=rawTable(d);
  }
  return '<article class="card report-card rank-result"><h3>'+safe(d.title)+'</h3><p>有效 N = '+m.n+'，α = '+fx(alpha,2)+'。</p>'
    +table(["檢定","統計量","p 值","判定"],rows)
    +parts.map(p=>'<p>'+p+'</p>').join("")
    +'<details><summary>展開原始資料或排序步驟</summary>'+steps+'</details>'+source(d)+'</article>';
}

const interpretations={
  e1:"在相同銷售機率的假設下，每色期望 20 本。比較逐格殘差，紅色比期望少 9 本，綠色比期望多 8 本。兩者對 χ² 的貢獻最大。請將這些細格線索與整體結論一起解讀。",
  e2:"女生與男生各 65 人，冷色總數 40、暖色總數 90，因此兩列的期望都是 20 與 45。女生的冷色觀察較多、男生較少，但整體 p 約 .057，未達 .05。",
  e3:"H 有 9 票、S 有 6 票，第 8 位排除。精確雙尾與正向單尾結果都未達 .05。也可對照附連續性修正的常態近似。",
  e4:"用婚後減婚前。去除兩個零差後有 6 正、2 負。符號及符號等級檢定皆未達 .05。後者同時利用差距的排序。",
  e5:"四位老師各評同一批 10 人，C 老師的第九名同級用平均秩 9.5，再進行同級修正。",
  e6two:"未婚對已婚的秩和與 U 檢定相同。兩組 H 檢定的卡方近似與無連續性修正的 U 常態近似給出相同的雙尾 p 值。再切換三組比較可評估婚育組別的整體差異。",
  e6three:"將已婚者按有無子女分開，H 檢定使用 df=2 同時比較三組。兩組及三組分析均未達 .05。"
};
function renderExercise() {
  const k=value("exercise-case"),d=CH17[k];
  put("exercise-panel",'<article class="card"><h3>'+safe(d.title)+'</h3><details><summary>展開解答與判讀</summary><p>'+interpretations[k]+'</p>'
    +(isChi(d)?chiReport(d,d.values,d.weights,.05):rankReport(d,PROGRAMS.results[k],.05))
    +jumpCode(k)+'</details></article>');
}
function renderRank() {
  const k=value("rank-case"), d=CH17[k];
  put("rank-panel",rankReport(d,PROGRAMS.results[k],Number(value("rank-alpha")))+jumpCode(k));
}
function surveyBars(d) {
  if(d.method==="frequency") return '<p class="note">CT 為資料中的量表得分。結果比較兩組的得分排序。逐分數次數可在結果下方展開。</p>';
  const lines=d.weights?d.values[0].map((x,i)=>[d.cols[i],x/total(d.values[0])]):d.values.map((r,i)=>[d.rows[i]+"｜"+d.cols[1],r[1]/total(r)]);
  return '<article class="card"><h3>樣本中的觀察比例</h3><div class="survey-bars">'+lines.map(([name,p])=>
    '<div><span>'+safe(name)+'</span><meter min="0" max="1" value="'+p+'" aria-label="'+safe(name)+'"></meter><strong>'+fx(p*100,1)+'%</strong></div>').join("")+'</div></article>';
}
function renderSurvey() {
  const k=value("survey-case"),d=CH17[k], alpha=Number(value("survey-alpha"));
  put("survey-panel",surveyBars(d)+(isChi(d)?chiReport(d,d.values,d.weights,alpha):rankReport(d,PROGRAMS.results[k],alpha))+jumpCode(k));
}

const languages=[["R","R","Rscript chapter17.R "],["py","Python","python chapter17.py "]];
function setupCode(preferred) {
  const bag={books,survey,exercises}[value("code-type")];
  choose("code-case",bag);
  if (bag.includes(preferred)) $("code-case").value=preferred;
  renderCode();
}
function renderCode() {
  const key=value("code-case");
  put("code-panels",languages.map(([lang,name,command])=>'<article class="card syntax-language"><h3>'+name+'</h3>'
    +'<div class="syntax-pair"><div><div class="toolbar"><button type="button" class="syntax-copy" data-copy="'+lang+'">複製 '+name+' 語法</button>'
    +'<a class="syntax-download" href="downloads/chapter17.'+lang+'" download>下載 .'+lang+'</a></div><h4>可執行程式</h4>'
    +'<pre class="syntax-command">'+command+key+'</pre><pre id="code-source-'+lang+'" class="syntax-console" tabindex="0">'+safe(PROGRAMS.source[lang])+'</pre></div>'
    +'<div><details><summary>查看 '+name+' 執行結果</summary><h4>主控台原始輸出</h4><pre class="syntax-console" tabindex="0">'
    +safe(PROGRAMS.results[key][lang])+'</pre></details></div></div></article>').join("")+'<p id="copy-status" class="note" role="status"></p>');
}
const units=[...document.querySelectorAll(".unit")], mainLinks=[...document.querySelectorAll(".unit-nav a")];
function route() {
  const id=units.some(u=>"#"+u.id===location.hash)?location.hash:"#intro";
  units.forEach(u=>{u.hidden="#"+u.id!==id;});
  mainLinks.forEach(link=>link.hash===id?link.setAttribute("aria-current","location"):link.removeAttribute("aria-current"));
}
document.addEventListener("click",async e=>{
  const link=e.target.closest('a[href^="#"]');
  if(link && units.some(u=>"#"+u.id===link.hash) && !e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey) {
    const key=link.dataset.codeCase;
    if(key) {
      $("code-type").value=survey.includes(key)?"survey":exercises.includes(key)?"exercises":"books";
      setupCode(key);
    }
    e.preventDefault();
    if(link.hash!==location.hash) history.pushState(null,"",link.hash);
    route();
    if(!link.closest(".unit-nav")) document.querySelector(".unit-nav").scrollIntoView({block:"start"});
  }
  const copy=e.target.closest("[data-copy]");
  if(copy) {
    const el=$("code-source-"+copy.dataset.copy);
    try {
      await navigator.clipboard.writeText(el.textContent);
      $("copy-status").textContent="已複製語法。";
    } catch {
      const range=document.createRange();
      range.selectNodeContents(el);
      el.focus();
      getSelection().removeAllRanges();
      getSelection().addRange(range);
      $("copy-status").textContent="已選取程式碼，可使用 Ctrl+C 或 ⌘C 複製。";
    }
  }
});
window.addEventListener("hashchange",route);
document.querySelectorAll("[data-method]").forEach(button=>button.addEventListener("click",()=>chooseChi(button.dataset.method)));
$("chi-input").addEventListener("input", e=>{
  if(e.target.dataset.count) {
    const [i,j]=e.target.dataset.count.split(":").map(Number);
    chiValues[i][j]=e.target.valueAsNumber;
  } else if (e.target.dataset.weight!==undefined) {
    chiWeights[Number(e.target.dataset.weight)]=e.target.valueAsNumber;
  }
  renderChi();
});
for(const [id,fn] of Object.entries({"chi-case":setupChi,"chi-alpha":renderChi,"rank-case":renderRank,"rank-alpha":renderRank,
  "survey-case":renderSurvey,"survey-alpha":renderSurvey,"exercise-case":renderExercise,"code-type":()=>setupCode(),"code-case":renderCode})) {
  $(id).addEventListener("change",fn);
}
$("chi-reset").addEventListener("click",setupChi);
choose("rank-case",books.filter(k=>!isChi(CH17[k])));
choose("survey-case",survey);
choose("exercise-case",exercises);
chooseChi("gof");
renderRank();
renderSurvey();
renderExercise();
setupCode("brand_gender");
route();
