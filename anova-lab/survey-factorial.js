'use strict';
function factorialSummary(cells,names,alpha){
 const as=unique(cells.map(r=>r[0])),bs=unique(cells.map(r=>r[1]));
 const A=as.length,B=bs.length;
 check(A>=2&&B>=2&&cells.length===A*B,'每個因子至少選兩個水準，且須保留完整交叉細格。');
 const M=as.map(a=>bs.map(b=>cells.find(r=>r[0]===a&&r[1]===b)[3]));
 const error=term('細格內誤差',total(cells.map(r=>(r[2]-1)*r[4])),total(cells.map(r=>r[2]))-A*B);
 const effectCode=(i,k)=>Array.from({length:k-1},(_,j)=>i===k-1?-1:+(j===i));
 const blocks=cells.map(([a,b])=>{
  const x=effectCode(as.indexOf(a),A),y=effectCode(bs.indexOf(b),B);
  return [[1],x,y,x.flatMap(v=>y.map(w=>v*w))];
 });
 // Weighted least squares on cell means; within-cell sums of squares
 // provide the residual variance for the full A×B model.
 function reducedSS(omit){
  const residual=cells.map(r=>Math.sqrt(r[2])*r[3]);
  const design=blocks.map((g,i)=>g.flatMap((xs,k)=>k===omit?[]:xs.map(x=>x*Math.sqrt(cells[i][2]))));
  const dot=(v,w)=>total(v.map((x,i)=>x*w[i]));
  const basis=[];
  for(let j=0;j<design[0].length;j++){
   let v=design.map(row=>row[j]);
   for(const u of basis){const c=dot(u,v);v=v.map((x,i)=>x-c*u[i]);}
   const len=Math.sqrt(dot(v,v)),u=v.map(x=>x/len),c=dot(u,residual);
   basis.push(u);u.forEach((x,i)=>residual[i]-=c*x);
  }
  return dot(residual,residual);
 }
 const terms=[...names,'A × B'].map((name,i)=>test(term(name,reducedSS(i+1),[A-1,B-1,(A-1)*(B-1)][i]),error,alpha));
 const ci=as.map(a=>bs.map(b=>{
  const [, ,n,m,v]=cells.find(r=>r[0]===a&&r[1]===b);
  const w=Math.sqrt(critical(1,n-1,.05)*v/n);return [m-w,m+w];
 }));
 return {methodNote:'<p class="note"><strong>二因子 ANOVA：Type III 平方和。</strong>適用於細格人數不同的完整交叉設計。主效果比較等權邊際平均，交互作用檢驗一個因子的效果是否隨另一個因子的水準而變。Type III 效果平方和一般不可相加為模型總平方和。</p>',terms:[...terms,error],desc:cells.map(([a,b,n,m,v])=>[a+' × '+b,n,m,v]),profile:{as,bs,M,ci}};
}
function factorialScripts(cells,names,a){
 const col=i=>cells.map(r=>r[i]);
 const rvec=i=>'c('+col(i).map(JSON.stringify).join(', ')+')';
 const title='# '+names.join(' × ')+'：以公開細格摘要計算 Type III ANOVA\n';
 const r=title+'alpha <- '+a+'\nA <- factor('+rvec(0)+')\nB <- factor('+rvec(1)+')\nn <- '+rvec(2)+'\ny <- '+rvec(3)+'\nv <- '+rvec(4)+'\n'+
 'X <- model.matrix(~ A * B, contrasts.arg=list(A=contr.sum, B=contr.sum))\n'+
 'ss_error <- sum((n - 1) * v)\ndf_error <- sum(n) - nrow(X)\n'+
 'for (i in 1:3) {\n  keep <- attr(X, "assign") != i\n  ss <- sum(lm.wfit(X[, keep, drop=FALSE], y, n)$residuals^2 * n)\n  df <- sum(!keep)\n  F <- (ss / df) / (ss_error / df_error)\n  print(c(effect=i, SS=ss, df=df, df_error=df_error, F=F,\n    p=pf(F, df, df_error, lower.tail=FALSE), Fcv=qf(1-alpha, df, df_error)))\n}\n';
 const py=title+'# python -m pip install numpy scipy\nimport numpy as np\nfrom scipy import stats\nalpha = '+a+'\ncells = '+JSON.stringify(cells)+'\n'+
 'a = list(dict.fromkeys(r[0] for r in cells))\nb = list(dict.fromkeys(r[1] for r in cells))\n'+
 'def contrasts(k):\n    return np.vstack((np.eye(k - 1), -np.ones(k - 1)))\n'+
 'u = contrasts(len(a))[[a.index(r[0]) for r in cells]]\nw = contrasts(len(b))[[b.index(r[1]) for r in cells]]\n'+
 'blocks = [np.ones((len(cells), 1)), u, w, (u[:, :, None] * w[:, None, :]).reshape(len(cells), -1)]\n'+
 'n, y, v = np.array([r[2:] for r in cells]).T\nss_error = sum((n - 1) * v)\ndf_error = sum(n) - len(cells)\n'+
 'for i in (1, 2, 3):\n    X = np.column_stack([block for j, block in enumerate(blocks) if j != i])\n    beta = np.linalg.lstsq(X * np.sqrt(n[:, None]), y * np.sqrt(n), rcond=None)[0]\n    ss = sum(n * (y - X @ beta)**2)\n    df = blocks[i].shape[1]\n    F = (ss / df) / (ss_error / df_error)\n    print(dict(effect=i, SS=ss, df=df, df_error=df_error, F=F,\n               p=stats.f.sf(F, df, df_error), Fcv=stats.f.isf(alpha, df, df_error)))\n';
 return {r,py};
}
