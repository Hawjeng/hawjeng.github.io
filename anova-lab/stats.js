'use strict';
const total = a => a.reduce((s,x)=>s+x,0), avg = a => total(a)/a.length;
const sq = x => x*x, ss = (a,m=avg(a)) => total(a.map(v=>sq(v-m)));
const unique = a => [...new Set(a)];
const check = (ok,msg) => {if(!ok) throw Error(msg)};
function lg(z){
  const c=[676.5203681218851,-1259.1392167224028,771.3234287776531,-176.6150291621406,12.507343278686905,-.13857109526572012,9.984369578019572e-6,1.5056327351493116e-7];
  if(z<.5)return Math.log(Math.PI/Math.sin(Math.PI*z))-lg(1-z);
  z--;let x=.99999999999980993;c.forEach((v,i)=>x+=v/(z+i+1));let t=z+7.5;return .5*Math.log(2*Math.PI)+(z+.5)*Math.log(t)-t+Math.log(x);
}
function frac(a,b,x){
 let c=1,d=1-(a+b)*x/(a+1),h;const nz=v=>Math.abs(v)<1e-300?1e-300:v;
 d=1/nz(d);h=d;
 for(let m=1;m<=400;m++){
  let k=2*m,t=m*(b-m)*x/((a+k-1)*(a+k));d=1/nz(1+t*d);c=nz(1+t/c);h*=d*c;
  t=-(a+m)*(a+b+m)*x/((a+k)*(a+k+1));d=1/nz(1+t*d);c=nz(1+t/c);
  let delta=d*c;h*=delta;if(Math.abs(delta-1)<2e-14)break;
 }return h;
}
function beta(x,a,b){
 if(x<=0)return 0;if(x>=1)return 1;
 let front=Math.exp(lg(a+b)-lg(a)-lg(b)+a*Math.log(x)+b*Math.log1p(-x));
 return Math.max(0,Math.min(1,x<(a+1)/(a+b+2)?front*frac(a,b,x)/a:1-front*frac(b,a,1-x)/b));
}
function upper(f,d,e){return f<=0?1:beta(e/(e+d*f),e/2,d/2)}
function lower(f,d,e){return f<=0?0:beta(d*f/(e+d*f),d/2,e/2)}
function critical(d,e,a){
 let lo=0,hi=1;while(upper(hi,d,e)>a&&hi<1e20)hi*=2;
 for(let i=0;i<80;i++){let m=(lo+hi)/2;if(upper(m,d,e)>a)lo=m;else hi=m;}return (lo+hi)/2;
}
function density(f,d,e){
 const a=d/2,b=e/2,t=d/e;
 return Math.exp(a*Math.log(t)+(a-1)*Math.log(f)-(a+b)*Math.log1p(f*t)+lg(a+b)-lg(a)-lg(b));
}
function term(name,s,df){
 s=Math.max(0,s);return {name,s,df,ms:df?s/df:null};
}
function test(t,err,a){
 check(err.df>0,'誤差自由度必須大於 0。');
 const f=err.ms===0?(t.ms===0?NaN:Infinity):t.ms/err.ms;
 return {...t,err:err.name,df2:err.df,f,p:Number.isNaN(f)?null:upper(f,t.df,err.df),crit:critical(t.df,err.df,a),eta:t.s+err.s?t.s/(t.s+err.s):null};
}
function stats(a){return {n:a.length,m:avg(a),v:a.length>1?ss(a)/(a.length-1):null}}
const labels = {
 ratio:'兩母體變異數比 F 檢定',one:'單因子｜獨立組',repeat:'單因子｜相依／區組',
 two:'二因子｜完全獨立',mixed:'二因子｜混合（A 獨立、B 相依）',within:'二因子｜完全相依'
};
function groups(rows){const g=new Map;for(const [k,v] of rows){if(!g.has(k))g.set(k,[]);g.get(k).push(v);}return g;}
function oneSummary(desc,a){
 check(desc.length>=2&&desc.every(r=>r[1]>=2),'請保留至少兩組，每組至少兩筆。');
 let n=total(desc.map(r=>r[1])),m=total(desc.map(r=>r[1]*r[2]))/n;
 let effect=term('組間',total(desc.map(r=>r[1]*sq(r[2]-m))),desc.length-1);
 let err=term('組內誤差',total(desc.map(r=>(r[1]-1)*r[3])),n-desc.length);
 return {terms:[test(effect,err,a),err,term('全體',effect.s+err.s,n-1)],desc};
}
function posthoc(pairs){
 const ordered=pairs.filter(x=>x.p!==null).sort((a,b)=>a.p-b.p);let last=0;
 ordered.forEach((x,i)=>x.adj=last=Math.min(1,Math.max(last,x.p*(ordered.length-i))));
 return pairs;
}
function pairwise(names,means,calc){
 return posthoc(names.flatMap((x,i)=>names.slice(i+1).map((y,k)=>{
  let j=i+k+1,[se,df]=calc(i,j),delta=means[i]-means[j];
  return {name:x+' − '+y,delta,df,p:se?upper(sq(delta/se),1,df):delta===0?null:0};
 })));
}
function compute(model,h,r,a,pooled=false){
 const numericStart={ratio:1,one:1,repeat:1,two:2,mixed:2,within:3}[model];
 check(r.length>0&&r.every(row=>row.length===h.length&&row.slice(numericStart).every(Number.isFinite)),'資料欄位不完整，或有遺漏／非數值觀測。');
 if(model==='ratio'||model==='one'){
  let g=groups(r),names=[...g.keys()],vs=[...g.values()],desc=names.map((x,i)=>{let s=stats(vs[i]);return [x,s.n,s.m,s.v]});
  if(model==='one'){
   let result=oneSummary(desc,a),err=result.terms[1];
   result.pairs=pairwise(names,desc.map(x=>x[2]),(i,j)=>[Math.sqrt(err.ms*(1/desc[i][1]+1/desc[j][1])),err.df]);return result;
  }
  check(desc.length===2&&desc.every(x=>x[1]>=2&&x[3]>0),'變異數比需要兩組、每組至少兩筆，且樣本變異數皆須大於零。');
  let d=desc[0][1]-1,e=desc[1][1]-1,f=desc[0][3]/desc[1][3],hi=critical(d,e,a/2),lo=1/critical(e,d,a/2);
  return {desc,ratio:{f,d,e,lo,hi,p:Math.min(1,2*Math.min(upper(f,d,e),lower(f,d,e)))}};
 }
 if(model==='repeat'){
  let ids=r.map(x=>x[0]),v=r.map(x=>x.slice(1)),n=v.length,k=h.length-1;
  check(n>=2&&k>=2&&unique(ids).length===n,'需要至少兩位受試者、兩個條件，且每人只有一列。');
  const all=v.flat(),m=avg(all),cm=h.slice(1).map((_,j)=>avg(v.map(x=>x[j]))),cs=n*ss(cm,m),ps=k*ss(v.map(avg),m),ts=ss(all,m);
  let err=term('受試者 × 條件誤差',ts-cs-ps,(n-1)*(k-1));
  return {terms:[test(term('條件',cs,k-1),err,a),term('受試者／區組',ps,n-1),err,term('全體',ts,n*k-1)],
   desc:h.slice(1).map((x,j)=>[x,n,cm[j],stats(v.map(y=>y[j])).v]),
   pairs:pairwise(h.slice(1),cm,(i,j)=>[Math.sqrt(stats(v.map(row=>row[i]-row[j])).v/n),n-1])};
 }
 let long=model==='mixed'?r.flatMap(([g,id,...vals])=>vals.map((y,j)=>[id,g,h[j+2],y])):model==='two'?r.map(([g,b,y],i)=>[String(i),g,b,y]):r;
 let as=unique(long.map(x=>x[1])),bs=unique(long.map(x=>x[2])),A=as.length,B=bs.length;
 check(A>=2&&B>=2,'A、B 因子均須至少兩個水準。');
 let cells=as.map(g=>bs.map(b=>long.filter(x=>x[1]===g&&x[2]===b)));
 let counts=cells.flat().map(x=>x.length),n=counts[0];
 check(n>=2&&counts.every(x=>x===n),'此二因子實作須為平衡設計，每個細格至少兩筆，且筆數相同。');
 let M=cells.map(row=>row.map(c=>avg(c.map(x=>x[3])))),ma=M.map(avg),mb=bs.map((_,j)=>avg(M.map(row=>row[j]))),m=avg(ma);
 let ta=term(h[model==='within'?1:0],n*B*ss(ma,m),A-1);
 let tb=term(model==='mixed'?'條件（B）':h[model==='within'?2:1],n*A*ss(mb,m),B-1);
 let ti=term('A × B',n*total(M.flatMap((row,i)=>row.map((v,j)=>sq(v-ma[i]-mb[j]+m)))),(A-1)*(B-1));
 let resid=total(cells.flatMap((row,i)=>row.map((c,j)=>ss(c.map(x=>x[3]),M[i][j]))));
 let ea,eb,ei,errs;
 if(model==='two'){
  ea=eb=ei=term('細格內誤差',resid,A*B*(n-1));errs=[ea];
 }else if(model==='mixed'){
  check(unique(r.map(x=>x[1])).length===r.length,'混合設計的受試者 ID 不得重複。');
  let nested=total(as.map((g,i)=>B*ss(r.filter(x=>x[0]===g).map(x=>avg(x.slice(2))),ma[i])));
  ea=term('受試者（A 內）',nested,A*(n-1));
  eb=ei=term('B × 受試者（A 內）',resid-nested,A*(n-1)*(B-1));errs=[ea,eb];
 }else{
  const ids=unique(long.map(x=>x[0]));
  check(ids.length===n&&cells.flat().every(c=>unique(c.map(x=>x[0])).length===n),'每位受試者必須在每個 A×B 組合各有一筆；不能有缺格或重複。');
  const subject=ids.map(id=>cells.map(row=>row.map(c=>c.find(x=>x[0]===id)[3])));
  let sP=0,sA=0,sB=0,sI=0;
  for(const U of subject){
   const um=avg(U.flat()),ua=U.map(avg),ub=bs.map((_,j)=>avg(U.map(row=>row[j])));
   sP+=A*B*sq(um-m);
   sA+=B*total(ua.map((v,i)=>sq(v-um-ma[i]+m)));
   sB+=A*total(ub.map((v,j)=>sq(v-um-mb[j]+m)));
   sI+=total(U.flatMap((row,i)=>row.map((v,j)=>sq(v-ua[i]-ub[j]+um-M[i][j]+ma[i]+mb[j]-m))));
  }
  ea=term('A × 受試者',sA,(A-1)*(n-1));eb=term('B × 受試者',sB,(B-1)*(n-1));ei=term('A × B × 受試者',sI,(A-1)*(B-1)*(n-1));
  let person=term('受試者',sP,n-1);
  if(pooled){ea=eb=ei=term('合併殘差（課本）',sA+sB+sI,(A*B-1)*(n-1));errs=[person,ea];}
  else errs=[person,ea,eb,ei];
 }
 let terms=[test(ta,ea,a),test(tb,eb,a),test(ti,ei,a),...errs,term('全體',ss(long.map(x=>x[3]),m),long.length-1)];
 let desc=cells.flatMap((row,i)=>row.map((c,j)=>[as[i]+' × '+bs[j],n,M[i][j],stats(c.map(x=>x[3])).v]));
 // Simple effects use the design implied by each slice; adjust across the displayed family.
 let slices=[];
 if(A+B<=20){
  for(let i=0;i<A;i++){
   let z=model==='two'?compute('one',['B','分數'],cells[i].flat().map(x=>[x[2],x[3]]),a):
    compute('repeat',['ID',...bs],unique(cells[i][0].map(x=>x[0])).map(id=>[id,...cells[i].map(c=>c.find(x=>x[0]===id)[3])]),a);
   slices.push({...z.terms[0],name:'B｜'+as[i]});
  }
  for(let j=0;j<B;j++){
   let c=cells.map(row=>row[j]);
   let z=model==='within'?compute('repeat',['ID',...as],unique(c[0].map(x=>x[0])).map(id=>[id,...c.map(q=>q.find(x=>x[0]===id)[3])]),a):
    compute('one',['A','分數'],c.flat().map(x=>[x[1],x[3]]),a);
   slices.push({...z.terms[0],name:'A｜'+bs[j]});
  }
 }
 return {terms,desc,profile:{as,bs,M},slices:posthoc(slices)};
}
if(typeof module!=='undefined')module.exports={compute,oneSummary,upper,lower,critical,labels,density};
