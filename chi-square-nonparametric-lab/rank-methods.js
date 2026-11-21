"use strict";

const rankMethods={
  sign:{name:"符號檢定",books:["paired_scores"],exercises:["e3","e4"],
    design:"單一樣本對照指定中位數，或兩次成對測量。配對彼此獨立。略去零差，統計正號數 S⁺。",
    h0:"在非零差中，正差機率為 .5。",h1:"雙尾考驗正差機率是否異於 .5。事先指定方向時可作單尾考驗。",
    math:"S⁺ ∼ Binomial(n, .5)，n 為非零差的配對數。",
    code:"binom.test 與 binomtest 以正號數和非零差筆數輸入精確二項檢定。將 alternative 改為 greater 可檢驗事先設定的正向假設。"},
  signed:{name:"Wilcoxon 符號等級檢定",books:["paired_scores"],exercises:["e4"],
    design:"兩次成對測量。配對間獨立。以位置差解讀時，差值分布應近似對稱。略去零差並排 |差值|，同值取平均等級。",
    h0:"配對差值的分布以 0 為對稱中心。",h1:"配對差值的分布中心偏離 0。",
    math:"T = min(R⁺, R⁻)。T 越小，正負兩側秩和越不平衡。",
    code:"兩語言以非零配對差檢定。R 另顯示正秩和 V，SciPy 雙尾檢定顯示兩側秩和中較小的 T。範例採無連續性修正的常態近似。"},
  kendall:{name:"Kendall’s W 一致性檢定",books:["judges"],exercises:["e5"],
    design:"多位評分者評定同一批對象。先在每位評分者內排序，同分用平均等級，再加總每名對象的等級。",
    h0:"評分者的等級排序沒有系統性的一致性。",h1:"評分者的等級排序有正向一致性。",
    math:"以同級修正的 W 衡量一致性。χ² ≈ m(n−1)W，自由度 n−1，m 為評分者數、n 為對象數。",
    code:"將評分者當區集、受評者當比較對象。Friedman 的同級修正 χ² 除以 m(n−1) 就是 Kendall’s W。"},
  ranksum:{name:"Wilcoxon 等級和檢定",books:["two_scores"],exercises:["e6two"],
    design:"兩組獨立樣本。合併排序並取平均同級，求第一組的原始秩和 R₁。",
    h0:"兩組母體的分布相同。",h1:"兩組母體的分布不同。",
    math:"R₁ = Σ 第一組的等級，U₁ = R₁ − n₁(n₁+1)/2。",
    code:"手算第一組原始秩和 R₁。R 的雙樣本 wilcox.test 與 Python 的 mannwhitneyu 回傳的是扣除基準秩和的 U₁。兩者以同級修正的常態近似計算 p 值。"},
  mann:{name:"Mann–Whitney U 檢定",books:["two_scores"],exercises:["e6two"],
    design:"兩組獨立樣本。對每個跨組比較，第一組觀察值較大計 1，兩者同值計 0.5，合計得到 U₁。",
    h0:"兩組母體的分布相同。",h1:"兩組母體的分布不同。",
    math:"U₂ = n₁n₂ − U₁，雙尾查表使用 Umin = min(U₁,U₂)。",
    code:"使用第一組的 U₁，並由 n₁n₂−U₁ 求互補的 U₂。範例採同級修正的常態近似，關閉連續性修正。"},
  kruskal:{name:"Kruskal–Wallis 等級變異數分析",books:["three_scores","two_scores"],exercises:["e6two","e6three"],
    design:"比較兩組以上的獨立樣本。合併排序後比較各組秩和並做同級修正。整體顯著後，可再作校正過的成對比較。",
    h0:"所有組的母體分布相同。",h1:"至少有一組的母體分布不同。",
    math:"H = [12 Σ(Rⱼ²/nⱼ) / (N(N+1)) − 3(N+1)] ÷ 同級修正因子，df = 組數−1。",
    code:"kruskal.test 與 kruskal 以各組獨立樣本為輸入，回傳同級修正的 H 和右尾卡方近似 p 值。"}
};

function rankCritical(distribution,alpha) {
  const n=total(distribution);
  let mass=0, cutoff=null;
  for(let i=0;i<distribution.length;i++) {
    mass+=distribution[i];
    if (2*mass/n>alpha+1e-12) break;
    cutoff=i;
  }
  return cutoff;
}

function signedDistribution(n) {
  const mass=Array(n*(n+1)/2+1).fill(0);
  mass[0]=1;
  for(let rank=1;rank<=n;rank++) {
    for(let i=mass.length-1;i>=rank;i--) mass[i]+=mass[i-rank];
  }
  return mass;
}

function uDistribution(n1,n2) {
  const grid=Array.from({length:n1+1},()=>Array(n2+1));
  for(let a=0;a<=n1;a++) for(let b=0;b<=n2;b++) {
    grid[a][b]=a*b===0?[1]:Array.from({length:a*b+1},(_,u)=>
      (grid[a-1][b][u-b]??0)+(grid[a][b-1][u]??0));
  }
  return grid[n1][n2];
}

function rankGroups(d) {
  return d.values.map(row=>row.filter(Number.isFinite));
}
function rankLookupForm(method,key,m,alpha) {
  const d=CH17[key];
  const input=(label,name,value,max)=>'<label>'+label+' <input type="number" name="'+name+'" min="1" max="'
    +max+'" step="1" required value="'+value+'"></label>';
  let fields;
  if(method==="sign"||method==="signed") fields=input("有效 n","n",m.n,method==="sign"?100:30);
  else if(method==="ranksum"||method==="mann") fields=rankGroups(d).map((row,i)=>input("n"+(i===0?"₁":"₂"),"n"+(i+1),row.length,20)).join("");
  else fields=input("自由度","df",m.df,100);
  return '<form class="toolbar analysis-toolbar rank-lookup" data-method-key="'+method+'" data-case-key="'+key+'" data-alpha="'+alpha+'">'
    +fields+'<button type="submit">查表</button></form><div class="rank-lookup-result" aria-live="polite">'
    +rankLookup(method,d,m,alpha)+'</div>';
}
function rankLookup(method,d,m,alpha,reference={}) {
  const levels=[.10,.05,.01];
  const headers=["查表索引",...levels.map(a=>"α = "+fx(a,2))];
  const exactRows=(index,mass,offset=0)=>[index,...levels.map(a=>{
    const critical=rankCritical(mass,a);
    return critical===null?"無拒絕值":critical+offset;
  })];
  if(method==="sign") {
    const n=reference.n??m.n;
    const same=n===m.n;
    let p=2**(-n);
    const probabilities=Array.from({length:n+1},(_,k)=>{
      const out=p;
      p*= (n-k)/(k+1);
      return out;
    });
    const low=Math.min(m.plus,m.n-m.plus);
    return '<p>依附錄 E 的二項分配查表方式，固定 n = '+n+'、p₀ = .5。雙尾機率可將較小一端的機率（含觀察值）加總再乘 2，最多為 1。</p>'
      +table(["正號數 x","P(X = x)","P(X ≤ x)","P(X ≥ x)"],probabilities.map((v,i)=>[
        i+(same&&i===m.plus?"（觀察值）":""),fx(v,5),fx(total(probabilities.slice(0,i+1)),5),fx(total(probabilities.slice(i)),5)
      ]))+(same?'<p>本例對稱尾端為 X ≤ '+low+' 與 X ≥ '+(m.n-low)+'，雙尾精確 '+apaP(m.p_two)+'。</p>':"");
  }
  if(method==="signed") {
    const n=reference.n??m.n;
    const differences=d.values[1].map((x,i)=>Math.abs(x-d.values[0][i])).filter(x=>x>0);
    const ties=new Set(differences).size!==differences.length;
    return '<p>按表 17.7 的方式，以無同級的精確分配計算雙尾 T 臨界值。用非零差數 n 查表，T ≤ 臨界值時拒絕 H₀。'
      +(n===m.n?'本例 T = '+fx(m.wilcoxon_t,2)+'。':'')+'</p>'
      +table(headers,[exactRows("n = "+n,signedDistribution(n))])
      +(ties?'<p class="flag">本例有等級同級，以上精確表供查表練習。本例的判定使用同級修正常態近似。</p>':"");
  }
  if(method==="ranksum"||method==="mann") {
    const [x,y]=rankGroups(d);
    const n1=reference.n1??x.length,n2=reference.n2??y.length;
    const same=n1===x.length&&n2===y.length;
    const ties=new Set([...x,...y]).size!==x.length+y.length;
    const shift=n1*(n1+1)/2;
    const mass=uDistribution(n1,n2);
    let grid=table(headers,[exactRows("n₁ = "+n1+"，n₂ = "+n2,mass)]);
    if(method==="ranksum") {
      grid=table(["第一組秩和 R₁",...headers.slice(1)],[
        exactRows("下限",mass,shift),
        ["上限",...levels.map(a=>{
          const cut=rankCritical(mass,a);
          return cut===null?"無拒絕值":shift+n1*n2-cut;
        })]
      ]);
    }
    return '<p>以 n₁、n₂ 查無同級的雙尾精確分配。'+(method==="mann"
      ?"較小的 U ≤ 臨界值時拒絕 H₀。"+(same?"本例 Umin = "+fx(Math.min(m.u1,m.u2),2)+"。":"")
      :"第一組秩和位於下限或之下、上限或之上時拒絕 H₀。"+(same?"本例 R₁ = "+fx(m.rank_sum,2)+"。":""))+'</p>'+grid
      +(ties?'<p class="flag">本例有同級，以上精確表供查表練習。本例的判定使用同級修正常態近似。</p>':"");
  }
  const selectedDf=reference.df??m.df;
  return '<p>附錄 D 卡方右尾臨界值，使用 df = '+selectedDf+'、α = '+fx(alpha,2)
    +'。統計量達到對應臨界值時拒絕 H₀。</p>'
    +table(headers,Array.from({length:5},(_,i)=>Math.max(1,selectedDf-2)+i).map(df=>[
      df+(df===selectedDf?"（查詢值）":""),...levels.map(a=>fx(chiCritical(df,a)))
    ]))
    +(method==="kruskal"&&rankGroups(d).some(row=>row.length<=5)
      ?'<p class="flag">本例至少一組只有 5 筆或更少。卡方尾機率為近似值，小樣本可用置換分配。</p>':"");
}

function rankSyntax(method,d) {
  const rows=rankGroups(d);
  const r=row=>"c("+row.join(", ")+")";
  const py=row=>JSON.stringify(row);
  if(method==="kendall") {
    return [
      "scores <- rbind("+rows.map(r).join(",\n                ")+")\n"
        +"fit <- friedman.test(t(scores))\nW <- unname(fit$statistic) / (ncol(scores) * (nrow(scores) - 1))\nprint(c(W = W, p = fit$p.value))",
      "from scipy.stats import friedmanchisquare\nscores = "+py(rows)+"\n"
        +"fit = friedmanchisquare(*scores)\nW = fit.statistic / (len(scores[0]) * (len(scores) - 1))\nprint(W, fit.pvalue)"
    ];
  }
  if(method==="kruskal") {
    return [
      "groups <- list("+rows.map(r).join(",\n               ")+")\nkruskal.test(groups)",
      "from scipy.stats import kruskal\ngroups = "+py(rows)+"\nprint(kruskal(*groups))"
    ];
  }
  const [x,y]=rows;
  const pairR=y?"x <- "+r(x)+"\ny <- "+r(y)+"\n":"";
  const pairPy=y?"x = "+py(x)+"\ny = "+py(y)+"\n":"";
  if(method==="sign"||method==="signed") {
    const diffR=d.method==="sign"?"d <- "+r(x)+"\n":pairR+"d <- y - x\n";
    const diffPy=d.method==="sign"?"d = "+py(x)+"\n":pairPy+"d = [b - a for a, b in zip(x, y)]\n";
    if(method==="sign") return [
      diffR+"d <- d[d != 0]\nbinom.test(sum(d > 0), length(d), p = .5, alternative = \"two.sided\")",
      "from scipy.stats import binomtest\n"+diffPy+"d = [v for v in d if v != 0]\nprint(binomtest(sum(v > 0 for v in d), len(d), p=.5))"
    ];
    return [
      diffR+"d <- d[d != 0]\nfit <- wilcox.test(d, exact = FALSE, correct = FALSE)\n"
        +"T <- min(fit$statistic, length(d) * (length(d) + 1)/2 - fit$statistic)\nprint(c(T = T, p = fit$p.value))",
      "from scipy.stats import wilcoxon\n"+diffPy+"d = [v for v in d if v != 0]\n"
        +"print(wilcoxon(d, alternative=\"two-sided\", correction=False, method=\"asymptotic\"))"
    ];
  }
  const finalR=method==="ranksum"?"R1 <- sum(rank(c(x, y))[seq_along(x)])\nprint(c(R1 = R1, p = fit$p.value))"
    :"U1 <- unname(fit$statistic)\nU2 <- length(x)*length(y) - U1\nprint(c(U1 = U1, U2 = U2, p = fit$p.value))";
  const finalPy=method==="ranksum"?"R1 = sum(rankdata(x + y)[:len(x)])\nprint(R1, fit.pvalue)"
    :"U1 = fit.statistic\nU2 = len(x)*len(y) - U1\nprint(U1, U2, fit.pvalue)";
  return [
    pairR+"fit <- wilcox.test(x, y, exact = FALSE, correct = FALSE)\n"+finalR,
    "from scipy.stats import mannwhitneyu"+(method==="ranksum"?", rankdata":"")+"\n"+pairPy
      +"fit = mannwhitneyu(x, y, alternative=\"two-sided\", method=\"asymptotic\", use_continuity=False)\n"+finalPy
  ];
}
