"use strict";
const total = a => a.reduce((x,y) => x+y,0);
const matrix = (a,fn) => a.map((row,i) => row.map((x,j) => fn(x,i,j)));
const logGamma = x => {
  const coefficients=[676.5203681218851,-1259.1392167224028,771.3234287776531,-176.6150291621406,
    12.507343278686905,-.13857109526572012,9.984369578019572e-6,1.5056327351493116e-7];
  const z=x-1, t=z+7.5;
  const sum=coefficients.reduce((a,b,i)=>a+b/(z+i+1),.9999999999998099);
  return .5*Math.log(2*Math.PI)+(z+.5)*Math.log(t)-t+Math.log(sum);
};

function chiUpper(stat,df) {
  if (stat<=0) return 1;
  const x=stat/2, a=df/2, factor=Math.exp(-x+a*Math.log(x)-logGamma(a));
  if (x<a+1) {
    let term=1/a, sum=term;
    for (let j=1;j<=300;j++) {
      term*=x/(a+j);
      sum+=term;
      if (term<Math.abs(sum)*1e-14) break;
    }
    return Math.max(0,1-factor*sum);
  }
  const safe=n=>Math.abs(n)<1e-30?1e-30:n;
  let b=x+1-a, c=1e30, d=1/safe(b), h=d;
  for (let j=1;j<=300;j++) {
    const step=-j*(j-a);
    b+=2;
    d=1/safe(step*d+b);
    c=safe(b+step/c);
    const delta=d*c;
    h*=delta;
    if (Math.abs(delta-1)<1e-14) break;
  }
  return Math.min(1,factor*h);
}

function chiCritical(df,alpha) {
  let lo=0, hi=df+5;
  while (chiUpper(hi,df)>alpha) hi*=2;
  for(let i=0;i<55;i++) {
    const mid=(lo+hi)/2;
    if (chiUpper(mid,df)>alpha) lo=mid;
    else hi=mid;
  }
  return (lo+hi)/2;
}

function chiDensity(x,df) {
  const shape=df/2;
  return Math.exp((shape-1)*Math.log(x/2)-x/2-logGamma(shape))/2;
}

function pearson(values,weights) {
  const N=total(values.flat());
  const byRow=values.map(total);
  const byCol=values[0].map((_,i)=>total(values.map(r=>r[i])));
  if (!N || (weights ? weights.some(v=>v<=0) : [...byRow,...byCol].includes(0))) return null;
  const probs=weights?.map(v=>v/total(weights));
  const expected=matrix(values,(_,i,j)=>weights?N*probs[j]:byRow[i]*byCol[j]/N);
  const residual=matrix(values,(v,i,j)=>(v-expected[i][j])/Math.sqrt(expected[i][j]));
  const adjusted=matrix(residual,(v,i,j)=>v/Math.sqrt(weights?1-probs[j]:(1-byRow[i]/N)*(1-byCol[j]/N)));
  const contribution=matrix(residual,v=>v*v);
  const statistic=total(contribution.flat());
  const df=(values[0].length-1)*(weights?1:values.length-1);
  const p=chiUpper(statistic,df);
  const v=weights?null:Math.sqrt(statistic/(N*Math.min(values.length-1,values[0].length-1)));
  return {N,df,statistic,p,v,expected,residual,adjusted,contribution,byCol,byRow,probs};
}

function midranks(values) {
  const order=values.map((v,i)=>[v,i]).sort((a,b)=>a[0]-b[0]);
  const ranks=[];
  for(let start=0;start<order.length;) {
    let end=start+1;
    while(end<order.length && order[end][0]===order[start][0]) end++;
    for(let i=start;i<end;i++) ranks[order[i][1]]=(start+1+end)/2;
    start=end;
  }
  return ranks;
}

if(typeof module!=="undefined") module.exports={chiUpper,chiCritical,pearson,midranks};
