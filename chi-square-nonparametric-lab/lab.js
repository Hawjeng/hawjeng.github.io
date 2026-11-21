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
function chiChart(stat,df,cut,tail="critical") {
  const xmax=Math.max(df+5*Math.sqrt(2*df),cut*1.2, Math.min(stat*1.04,cut*2.5));
  const start=xmax/350, mode=Math.max(start,df-2), peak=chiDensity(mode,df)*1.08;
  const x=n=>45+n/xmax*540;
  const y=n=>147-Math.min(1,n/peak)*116;
  const curve=(a,b)=>Array.from({length:121},(_,i)=> {
    const n=a+(b-a)*i/120;
    return x(n).toFixed(2)+","+y(chiDensity(Math.max(start,n),df)).toFixed(2);
  }).join("L");
  const seen=Math.min(stat,xmax);
  const shade=tail==="p"?seen:cut;
  const shadedText=tail==="p"?"觀察值右尾 p 值":"臨界值右尾拒絕域";
  return '<svg class="chi-plot" viewBox="0 0 620 182" role="img" aria-label="卡方機率密度，橘色區域為'+shadedText+'">'
    +'<path d="M'+x(shade)+',147L'+curve(shade,xmax)+'L585,147Z" fill="#f3c8ae"/><path d="M'+curve(0,xmax)+'" fill="none" stroke="#286d79" stroke-width="3"/>'
    +'<path d="M45 147H585 M'+x(cut)+' 40V147" stroke="#a24a14" stroke-dasharray="4 4"/><path d="M'+x(seen)+' 20V147" stroke="#173b44" stroke-width="2"/>'
    +'<text x="45" y="169">0</text><text x="585" y="169" text-anchor="end">'+fx(xmax,1)+'</text></svg>'
    +'<p class="distribution-key">深色線為觀察 χ²'+(stat>xmax?"（超出圖示範圍）":"")+'，橘色區域為'+shadedText+'。虛線為臨界值 '+fx(cut)+'</p>';
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
    +'<p class="note">原始殘差 Δ = O−E。正值表示觀察次數高於期望，負值表示低於期望。</p>'
    +table(["細格","觀察 O","期望 E","原始殘差 Δ = O−E","Pearson 殘差","調整殘差","χ² 貢獻"],cells)+comparisons+'</details>';
}

function rankReport(d,result,alpha,method) {
  const m=result.stats, rows=[];
  const add=(label,stat,p)=>rows.push([label,stat,pfx(p),status(p,alpha)]);
  const parts=[];
  if (method==="sign"||(!method&&(d.method==="sign"||d.method==="paired"))) {
    add("符號檢定｜雙尾精確","正號 "+m.plus+"／"+m.n,m.p_two);
    add("符號檢定｜正向單尾精確","正號 "+m.plus+"／"+m.n,m.p_greater);
    add("符號檢定｜雙尾常態近似","連續性修正",m.normal_two);
    add("符號檢定｜正向單尾常態近似","連續性修正",m.normal_greater);
    parts.push("先排除 "+m.zeros+" 筆零差或無偏好，再以 Binomial(n, .5) 比較正號次數。正向單尾須由研究問題事先指定。");
  }
  if(method==="signed"||(!method&&d.method==="paired")) {
    add("Wilcoxon 符號等級","T = "+fx(m.wilcoxon_t),m.p_signed_rank);
    parts.push("將非零差值的絕對值由小到大排名，同值用平均等級，再加回正負號。R⁺ = "+m.rank_plus+"，R⁻ = "+m.rank_minus+"。這裡使用含同級校正、未加連續性修正的常態近似。");
  }
  if (d.method==="kendall") {
    add("Kendall W","W = "+fx(m.kendall_w)+"，χ²("+m.df+") = "+fx(m.chi2),m.p);
    parts.push("對每位評分者的排序取平均同級，按受評對象加總等級。以同級修正計算 W，0 表示低一致性，1 表示完全一致。此處以 χ² 近似評估整體一致性。");
    if (d.source.startsWith("t17.9")) parts.push("工作簿列出的 W 約為 .895。本頁使用原始分數及同級修正重算，W 約為 .913。");
  }
  if (d.method==="groups"||d.method==="frequency") {
    if("u1" in m && method!=="kruskal") {
      if (method!=="mann") add("Wilcoxon 等級和","第一組秩和 R₁ = "+m.rank_sum,m.p_rank_sum);
      if (method!=="ranksum") add("Mann–Whitney U","U₁ = "+m.u1+"，U₂ = "+m.u2,m.p_rank_sum);
      parts.push("合併兩組觀察後排行。第一組 U₁ = W−n₁(n₁+1)/2。兩法用相同的等級資訊，這裡使用同級修正的常態近似，不使用連續性修正。");
    }
    if (!method||method==="kruskal") {
      add("Kruskal–Wallis H","H("+m.df+") = "+fx(m.h),m.p_kruskal);
      parts.push("將所有組別的觀察一起排序，再用各組秩和衡量差異，H 採同級修正。顯著時可再做經多重比較校正的成對分析。");
      if (d.source === "表 17.11") parts.push("工作簿摘要的 H 約為 2.296。本頁從原始成績重算並進行同級校正，因此 H 約為 2.304。");
    }
  }
  let steps="";
  if(d.method==="paired") {
    const diff=d.values[1].map((x,i)=>x-d.values[0][i]);
    const ranked=midranks(diff.filter(x=>x!==0).map(Math.abs));
    let at=0;
    const signed=method!=="sign";
    steps=table(["配對","前","後","差值",signed?"絕對差等級":"符號"],diff.map((x,i)=>
      [i+1,d.values[0][i],d.values[1][i],x,x?(signed?ranked[at++]:x>0?"+":"−"):"排除"]));
  } else if(d.method==="kendall") {
    const ranks=d.cols.map((_,j)=>midranks(d.values.map(row=>row[j])));
    steps=table(["對象",...d.cols,"秩和"],d.rows.map((r,i)=>[r,...ranks.map(c=>c[i]),total(ranks.map(c=>c[i]))]));
  } else if(d.method==="sign") {
    steps=table(["受訪順序","偏好"],d.values[0].map((x,i)=>[i+1,x===1?"H":x===-1?"S":"無偏好"]));
  } else if (method && d.method==="groups") {
    const groups=rankGroups(d), ranks=midranks(groups.flat());
    let start=0;
    steps=table(["組別","觀察值","各觀察值的合併等級","秩和"],groups.map((row,i)=>{
      const groupRanks=ranks.slice(start,start+row.length);
      start+=row.length;
      return [d.rows[i],row.join("、"),groupRanks.join("、"),total(groupRanks)];
    }));
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
const methodOptions=Object.entries(rankMethods).map(([key,d])=>'<option value="'+key+'">'+safe(d.name)+'</option>').join("");
const chiMethodOption='<option value="chi">Pearson 卡方檢定</option>';
function rankLesson(method,key,alpha) {
  const lesson=rankMethods[method], d=CH17[key], result=PROGRAMS.results[key];
  return '<article class="card report-card"><h3>'+safe(lesson.name)+'</h3><p>'+safe(lesson.design)
    +'</p><p class="formula">'+safe(lesson.math)+'</p></article>'
    +surveyHypotheses(lesson.h0,lesson.h1)+rankReport(d,result,alpha,method)
    +'<article class="card report-card"><h3>查表與判定</h3>'+rankLookupForm(method,key,result.stats,alpha)+'</article>'
    +'<p class="inline-links"><a href="#syntax" data-rank-code="'+method+'" data-rank-case="'+key+'">查看本方法的 R 與 Python 語法</a></p>';
}
function setupExercise() {
  const method=value("exercise-method");
  choose("exercise-case",method==="chi"?["e1","e2"]:rankMethods[method].exercises);
  renderExercise();
}
function renderExercise() {
  const k=value("exercise-case"),d=CH17[k];
  const method=value("exercise-method");
  put("exercise-panel",'<article class="card"><h3>'+safe(d.title)+'</h3><p>'+interpretations[k]+'</p></article>'
    +(method==="chi"?chiReport(d,d.values,d.weights,.05)+jumpCode(k):rankLesson(method,k,.05)));
}
function setupRank() {
  choose("rank-case",rankMethods[value("rank-method")].books);
  renderRank();
}
function renderRank() {
  put("rank-panel",rankLesson(value("rank-method"),value("rank-case"),Number(value("rank-alpha"))));
}
const surveySelectors=["survey-first","survey-second","survey-third"].map($);
const surveyFactors=SURVEY_COUNTS.factors;
const surveyCodeCases={"0,1":"s_phone","0,2":"s_plan","3":"s_zodiac","1,4":"s_score_phone","2,4":"s_score_plan"};
let surveyStratumFactor, surveyStratumIndex=0;

function surveyTable(rows,cols,counts,first,second,max,stratum,stratumControl) {
  const n=total(counts.flat());
  const title=second?"二因子列聯表":"次數分配表";
  const context=[first,second,stratum].filter(Boolean).join("｜")+"（N = "+n+"）";
  let headers,body;
  if (!second) {
    headers=[first,"次數","百分比"];
    body=rows.map((name,i)=>[name,counts[i][0],fx(100*counts[i][0]/n,1)+"%"]);
    body.push(["合計",n,"100%"]);
  } else {
    headers=[first,...cols,"合計"];
    body=rows.map((name,i)=>[name,...counts[i],total(counts[i])]);
    body.push(["合計",...cols.map((_,j)=>total(counts.map(row=>row[j]))),n]);
  }
  return '<div class="survey-results" data-context="'+safe(context)+'" data-max="'+max+'" data-series="'+cols.length+'">'
    +'<div><div class="survey-result-head"><h3>'+title+'</h3><button type="button" data-survey-png="table">下載表格 PNG</button></div>'
    +stratumControl
    +(second?'<p>列為 '+safe(first)+'，欄為 '+safe(second)+'。</p>':"")+table(headers,body)+'</div>'
    +'<div><div class="survey-result-head"><h3>次數長條圖</h3><button type="button" data-survey-png="chart">下載圖表 PNG</button></div>'
    +'<div class="scroll"><canvas class="survey-chart" role="img" aria-label="'+safe(context+' 次數長條圖，數值見表格')+'"></canvas></div></div></div>';
}
function surveyHypotheses(h0,h1) {
  return '<article class="card report-card"><h3>檢定假設</h3><p><strong>H<sub>0</sub>（虛無假設）</strong>　'
    +safe(h0)+'</p><p><strong>H<sub>1</sub>（對立假設）</strong>　'+safe(h1)+'</p></article>';
}
function surveyAssociations(m,counts,first,second) {
  const prediction=(groups,margins)=>{
    const modal=Math.max(...margins);
    const lambda=(total(groups.map(group=>Math.max(...group)))-modal)/(m.N-modal);
    const prior=total(margins.map(n=>n*n))/(m.N*m.N);
    const informed=total(groups.map(group=>total(group.map(n=>n*n))/total(group)))/m.N;
    return [lambda,Math.max(0,(informed-prior)/(1-prior))];
  };
  const forward=prediction(counts,m.byCol);
  const reverse=prediction(m.byCol.map((_,j)=>counts.map(row=>row[j])),m.byRow);
  const phi=counts.length===2&&counts[0].length===2?Math.sqrt(m.statistic/m.N):null;
  const symmetric=[
    ["Phi 係數 φ",phi===null?"適用於 2 × 2 表":fx(phi)],
    ["Pearson 列聯係數 C",fx(Math.sqrt(m.statistic/(m.statistic+m.N)))],
    ["Cramér V",fx(m.v)]
  ];
  const directional=["Goodman–Kruskal λ","Goodman–Kruskal τ"].map((name,i)=>[name,fx(forward[i]),fx(reverse[i])]);
  return '<article class="card report-card"><h3>列聯表關聯係數</h3>'
    +table(["係數","估計值"],symmetric)+table(["係數","用 "+first+" 預測 "+second,"用 "+second+" 預測 "+first],directional)
    +'<p>φ 顯示關聯強度。λ 衡量依最常見類別預測時的相對錯誤減少比例，τ 依各類別機率衡量相對錯誤減少比例。預測方向交換時，λ 與 τ 可能改變。</p></article>';
}
function apaP(p) {
  return '<i>p</i> '+(p<.001?'&lt; .001':'= '+fx(p,3).replace(/^0/,""));
}
function surveyTest(a,b,rows,cols,counts,legacy,alpha) {
  const first="「"+a.label+"」";
  const pair=b?first+"與「"+b.label+"」":"";
  const hypotheses=b?surveyHypotheses(pair+"相互獨立。",pair+"存在關聯。")
    :surveyHypotheses(first+"的各類別在母體中的比例相同。",first+"的各類別在母體中的比例並非全部相同。");
  if (rows.length<2 || (b && cols.length<2)) {
    return hypotheses+'<p class="flag">所選資料的有效類別不足，無法計算卡方檢定。</p>';
  }
  const values=b?counts:[counts.flat()];
  const weights=b?null:rows.map(()=>1);
  const m=pearson(values,weights);
  const significant=m.p<=alpha;
  const conclusion=b
    ? (significant?pair+"有顯著關聯。":"資料未提供足夠證據顯示"+pair+"有關聯。")
    : (significant?first+"的分布顯著偏離均等比例。":"資料未提供足夠證據顯示"+first+"的分布偏離均等比例。");
  const expected=m.expected.flat();
  const caution=expected.some(v=>v<1)||expected.filter(v=>v<5).length/expected.length>.2;
  let supplement="", rankAPA="";
  if (legacy && !isChi(CH17[legacy])) {
    const result=PROGRAMS.results[legacy], rank=result.stats;
    const group=a.label==="CT 量表得分"?b.label:a.label;
    supplement=surveyHypotheses("依「"+group+"」分組後，各組的 CT 量表得分分布相同。",
      "依「"+group+"」分組後，至少一組的 CT 量表得分分布不同。")+rankReport(CH17[legacy],result,alpha);
    const finding=rank.p_kruskal<=alpha?"各組得分分布有顯著差異。":"資料未提供足夠證據顯示各組得分分布不同。";
    rankAPA='<p>Kruskal–Wallis 檢定比較依「'+safe(group)+'」分組的 CT 得分。'+finding
      +' <i>H</i>('+rank.df+') = '+fx(rank.h,2)+'，'+apaP(rank.p_kruskal)+'，<i>N</i> = '+rank.n+'。</p>';
  }
  return hypotheses+chiReport({method:b?"ind":"gof",rows,cols:b?cols:rows},values,weights,alpha)
    +(b?surveyAssociations(m,counts,a.label,b.label):"")+supplement+(legacy?jumpCode(legacy):"")
    +'<article class="card report-card"><h3>APA 格式解釋</h3><p>Pearson 卡方'+(b?"獨立性":"適合度")+'檢定顯示，'
    +safe(conclusion)+' χ²('+m.df+', <i>N</i> = '+m.N+') = '+fx(m.statistic,2)+'，'+apaP(m.p)
    +(m.v===null?"":"，Cramér <i>V</i> = "+fx(m.v,2).replace(/^0/,""))+'。</p>'
    +(caution?'<p>部分期望次數偏低，以上 <i>p</i> 值為卡方近似，解讀時須保留。</p>':"")+rankAPA+'</article>';
}
function renderSurvey() {
  const [first,second,third]=surveySelectors.map(select=>select.value);
  surveySelectors[2].disabled=second==="";
  if (second==="") surveySelectors[2].value="";
  const selected=[first,second,second===""?"":third].filter(v=>v!=="").map(Number);
  surveySelectors.forEach(select=>{
    for (const option of select.options) {
      option.disabled=option.value!=="" && option.value!==select.value && selected.includes(Number(option.value));
    }
  });
  const ordered=[...selected].sort((a,b)=>a-b);
  const key=ordered.join(",");
  const positions=selected.map(id=>ordered.indexOf(id));
  const entries=SURVEY_COUNTS.tables[key].map(cell=>[...positions.map(i=>cell[i]),cell.at(-1)]);
  const [a,b,c]=selected.map(i=>surveyFactors[i]);
  const max=Math.max(...entries.map(cell=>cell.at(-1)));
  const n=total(entries.map(cell=>cell.at(-1)));
  const legacy=surveyCodeCases[key];
  const alpha=Number(value("survey-alpha"));
  if (third!==surveyStratumFactor) {
    surveyStratumFactor=third;
    surveyStratumIndex=0;
  }
  const strata=c?c.levels.map((label,i)=>[label,entries.filter(cell=>cell[2]===i)]).filter(([,cells])=>cells.length):[["",entries]];
  surveyStratumIndex=Math.min(surveyStratumIndex,strata.length-1);
  const [label,cells]=strata[surveyStratumIndex];
  const stratumControl=c?'<div class="toolbar survey-stratum"><label>'+safe(c.label)+' <select id="survey-stratum">'
    +strata.map(([name,group],i)=>'<option value="'+i+'"'+(i===surveyStratumIndex?' selected':'')+'>'
      +safe(name)+'（N = '+total(group.map(cell=>cell.at(-1)))+'）</option>').join("")
    +'</select></label></div>':"";
  put("survey-sample","有效樣本數 N = "+n+(c?"，目前分層 n = "+total(cells.map(cell=>cell.at(-1))):""));
  const note=c?'<p class="note">各層檢定使用所選顯著水準，未做多重比較校正。</p>':"";
  const rowIds=a.levels.map((_,i)=>i).filter(i=>!b||cells.some(cell=>cell[0]===i));
  const colIds=b ? b.levels.map((_,j)=>j).filter(j=>cells.some(cell=>cell[1]===j)) : [0];
  const rows=rowIds.map(i=>a.levels[i]);
  const cols=b ? colIds.map(j=>b.levels[j]) : [];
  const countsByCell=new Map(cells.map(cell=>[cell[0]+","+(b?cell[1]:0),cell.at(-1)]));
  const counts=rowIds.map(i=>colIds.map(j=>countsByCell.get(i+","+j)??0));
  const summary=surveyTable(rows,cols,counts,a.label,b?.label,max,c?c.label+"："+label:"",stratumControl);
  const report=surveyTest(a,b,rows,cols,counts,legacy,alpha);
  put("survey-panel",'<article class="card">'+summary+'</article>'+note+report);
  drawSurveyChart($("survey-panel").querySelector(".survey-results"));
}

function setupSurvey() {
  surveySelectors.forEach((select,i)=>{
    put(select.id,(i===0?"":'<option value="">不選</option>')
      +surveyFactors.map(({label},id)=>'<option value="'+id+'">'+safe(label)+'</option>').join(""));
    select.addEventListener("change",renderSurvey);
  });
  $("survey-panel").addEventListener("click",event=>{
    const button=event.target.closest("[data-survey-png]");
    if (button) downloadSurveyImage(button);
  });
  $("survey-panel").addEventListener("change",event=>{
    if (event.target.id!=="survey-stratum") return;
    surveyStratumIndex=Number(event.target.value);
    renderSurvey();
    $("survey-stratum").focus({preventScroll:true});
  });
  renderSurvey();
}

const languages=[["R","R","Rscript chapter17.R "],["py","Python","python chapter17.py "]];
function chiSyntax(d) {
  if (d.method==="gof") {
    const observed=d.values[0];
    return [
      "observed <- c("+observed.join(", ")+")\nweights <- c("+d.weights.join(", ")+")\n"
        +"fit <- chisq.test(observed, p = weights / sum(weights))\nfit\nfit$expected",
      "import numpy as np\nfrom scipy.stats import chisquare\n\nobserved = "+JSON.stringify(observed)
        +"\nweights = np.array("+JSON.stringify(d.weights)+")\nexpected = sum(observed) * weights / weights.sum()\n"
        +"print(chisquare(observed, f_exp=expected))\nprint(expected)"
    ];
  }
  return [
    "observed <- rbind("+d.values.map(row=>"c("+row.join(", ")+")").join(",\n                  ")+")\n"
      +"fit <- chisq.test(observed, correct = FALSE)\nfit\nfit$expected",
    "from scipy.stats import chi2_contingency\n\nobserved = "+JSON.stringify(d.values)
      +"\nstat, p, df, expected = chi2_contingency(observed, correction=False)\nprint(stat, df, p)\nprint(expected)"
  ];
}
function setupCode(preferred,key) {
  const methods=value("code-type")==="methods";
  $("code-rank-control").hidden=!methods;
  $("code-case-label").textContent=methods?"檢定方法":"案例";
  if (methods) {
    put("code-case",chiMethodOption+methodOptions);
    if (preferred==="chi"||rankMethods[preferred]) $("code-case").value=preferred;
    setupMethodCode(key);
    return;
  }
  const bag={books,survey,exercises}[value("code-type")];
  choose("code-case",bag);
  if (bag.includes(preferred)) $("code-case").value=preferred;
  renderCode();
}
function setupMethodCode(key) {
  const method=value("code-case");
  const lesson=rankMethods[method];
  const items=method==="chi"?books.filter(k=>isChi(CH17[k])):[...lesson.books,...lesson.exercises];
  choose("code-rank-data",items);
  if (items.includes(key)) $("code-rank-data").value=key;
  renderCode();
}
function codeWithResult(code,name,result,expanded=false) {
  return '<div class="syntax-pair"><div>'+code+'</div><div><details'+(expanded?' open':'')+'><summary>查看 '+name
    +' 執行結果</summary><h4>主控台原始輸出</h4><pre class="syntax-console" tabindex="0">'
    +safe(result)+'</pre></details></div></div>';
}
function renderCode() {
  const key=value("code-case");
  if (value("code-type")==="methods") {
    const lesson=rankMethods[key], caseKey=value("code-rank-data"), d=CH17[caseKey];
    const chi=key==="chi";
    const name=chi?"Pearson 卡方"+chiTheory[d.method][0]:lesson.name;
    const description=chi?chiTheory[d.method][1]+" "+(d.method==="gof"
      ?"R 的 chisq.test 輸入虛無假設的比例。Python 的 chisquare 輸入依該比例換算的期望次數。"
      :"R 的 chisq.test 與 Python 的 chi2_contingency 都輸入觀察次數表，並關閉連續性修正，以重現教材的 Pearson χ²。")
      :lesson.code;
    const snippets=chi?chiSyntax(d):rankSyntax(key,d);
    const results=chi?PROGRAMS.results[caseKey]:RANK_RESULTS[key][caseKey];
    put("code-panels",'<article class="card"><h3>'+safe(name)+'</h3><p>'+safe(description)+'</p></article>'
      +languages.map(([lang,name],i)=>{
        const code='<button type="button" class="syntax-copy" data-copy="'+lang+'">複製 '+name+' 語法</button>'
          +'<pre id="code-source-'+lang+'" class="syntax-console" tabindex="0">'+safe(snippets[i])+'</pre>';
        return '<article class="card syntax-language"><h3>'+name+'</h3>'
          +codeWithResult(code,name,results[lang],true)+'</article>';
      }).join("")
      +'<p id="copy-status" class="note" role="status"></p>');
    return;
  }
  put("code-panels",languages.map(([lang,name,command])=>{
    const code='<div class="toolbar"><button type="button" class="syntax-copy" data-copy="'+lang+'">複製 '+name+' 語法</button>'
      +'<a class="syntax-download" href="downloads/chapter17.'+lang+'" download>下載 .'+lang+'</a></div><h4>可執行程式</h4>'
      +'<pre class="syntax-command">'+command+key+'</pre><pre id="code-source-'+lang+'" class="syntax-console" tabindex="0">'+safe(PROGRAMS.source[lang])+'</pre>';
    return '<article class="card syntax-language"><h3>'+name+'</h3>'+codeWithResult(code,name,PROGRAMS.results[key][lang])+'</article>';
  }).join("")+'<p id="copy-status" class="note" role="status"></p>');
}
const units=[...document.querySelectorAll(".unit")], mainLinks=[...document.querySelectorAll(".unit-nav a")];
const principleNav=document.querySelector(".principle-nav");
const principleLinks=[...principleNav.querySelectorAll("a")];
function route() {
  const id=units.some(u=>"#"+u.id===location.hash)?location.hash:"#intro";
  units.forEach(u=>{u.hidden="#"+u.id!==id;});
  const inPrinciples=principleLinks.some(link=>link.hash===id);
  principleNav.hidden=!inPrinciples;
  mainLinks.forEach(link=>link.hash===(inPrinciples?"#intro":id)?link.setAttribute("aria-current","location"):link.removeAttribute("aria-current"));
  principleLinks.forEach(link=>link.hash===id?link.setAttribute("aria-current","location"):link.removeAttribute("aria-current"));
}
document.addEventListener("click",async e=>{
  const link=e.target.closest('a[href^="#"]');
  if(link && units.some(u=>"#"+u.id===link.hash) && !e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey) {
    const key=link.dataset.codeCase;
    if(key) {
      $("code-type").value=survey.includes(key)?"survey":exercises.includes(key)?"exercises":"books";
      setupCode(key);
    }
    if (link.dataset.rankCode) {
      $("code-type").value="methods";
      setupCode(link.dataset.rankCode,link.dataset.rankCase);
    }
    e.preventDefault();
    if(link.hash!==location.hash) history.pushState(null,"",link.hash);
    route();
    if(!link.closest(".unit-nav, .principle-nav")) document.querySelector(".unit-nav").scrollIntoView({block:"start"});
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
document.addEventListener("submit",event=>{
  const form=event.target;
  if (!form.matches(".rank-lookup")) return;
  event.preventDefault();
  const {methodKey,caseKey,alpha}=form.dataset;
  const reference=Object.fromEntries(Array.from(new FormData(form),([key,value])=>[key,Number(value)]));
  form.nextElementSibling.innerHTML=rankLookup(methodKey,CH17[caseKey],PROGRAMS.results[caseKey].stats,Number(alpha),reference);
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
for(const [id,fn] of Object.entries({"chi-case":setupChi,"chi-alpha":renderChi,"rank-method":setupRank,"rank-case":renderRank,"rank-alpha":renderRank,
  "survey-alpha":renderSurvey,"exercise-method":setupExercise,"exercise-case":renderExercise,"code-type":()=>setupCode(),
  "code-case":()=>value("code-type")==="methods"?setupMethodCode():renderCode(),"code-rank-data":renderCode})) {
  $(id).addEventListener("change",fn);
}
$("chi-reset").addEventListener("click",setupChi);
put("rank-method",methodOptions);
put("exercise-method",chiMethodOption+methodOptions);
setupSurvey();
chooseChi("gof");
setupRank();
setupExercise();
setupCode();
const distributionAlphas=[...$("dist-alpha").options].map(option=>option.value);
const distributionRows=Array.from({length:30},(_,i)=>i+1);
const distributionCritical=distributionRows.map(df=>distributionAlphas.map(alpha=>chiCritical(df,Number(alpha))));
function buildDistributionTable() {
  put("dist-table",'<table class="distribution-table"><caption>右尾機率 P(χ² ≥ 臨界值)</caption><thead><tr><th scope="col">自由度</th>'
    +distributionAlphas.map(alpha=>'<th scope="col">'+fx(alpha,3)+'</th>').join("")+'</tr></thead><tbody>'
    +distributionRows.map(df=>'<tr><th scope="row">'+df+'</th>'+distributionAlphas.map((alpha,j)=>{
      const cutoff=fx(distributionCritical[df-1][j]);
      return '<td><button type="button" data-df="'+df+'" data-alpha="'+alpha+'" aria-pressed="false" aria-label="自由度 '+df
        +'，右尾 α '+alpha+'，臨界值 '+cutoff+'">'+cutoff+'</button></td>';
    }).join("")+'</tr>').join("")+'</tbody></table>');
}
function renderDistribution() {
  const df=Number(value("dist-df"));
  const alpha=value("dist-alpha");
  const stat=$("dist-stat").valueAsNumber;
  const cutoff=distributionCritical[df-1][distributionAlphas.indexOf(alpha)];
  $("dist-df-value").textContent=df;
  document.querySelectorAll("#dist-table button").forEach(button=>button.setAttribute("aria-pressed",
    String(Number(button.dataset.df)===df && button.dataset.alpha===alpha)));
  if (!Number.isFinite(stat) || stat<0 || stat>300) {
    put("dist-chart","");
    put("dist-metrics",'<p class="flag">請輸入 0 至 300 的觀察統計量。</p>');
    return;
  }
  const p=chiUpper(stat,df);
  const tail=value("dist-tail");
  put("dist-chart",chiChart(stat,df,cutoff,tail));
  put("dist-metrics",'<div class="metric-grid">'+metric("自由度 ν",df)+metric("右尾 α",fx(alpha,3))
    +metric("臨界值",fx(cutoff))+metric("右尾 p 值",pfx(p))+'</div><p><strong>'
    +status(p,Number(alpha))+'</strong>。以目前 α 評估，觀察值 '+fx(stat,2)
    +(stat>=cutoff?'位於臨界值右側或等於臨界值。':'小於臨界值。')+'</p>');
}
buildDistributionTable();
for(const id of ["dist-df","dist-alpha","dist-stat","dist-tail"]) $(id).addEventListener("input",renderDistribution);
$("dist-table").addEventListener("click",event=>{
  const cell=event.target.closest("[data-df]");
  if(!cell) return;
  $("dist-df").value=cell.dataset.df;
  $("dist-alpha").value=cell.dataset.alpha;
  renderDistribution();
});
renderDistribution();

route();
