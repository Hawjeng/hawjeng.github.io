'use strict';
const pyBase = `# 安裝：python -m pip install numpy scipy
import numpy as np
from scipy import stats
from itertools import combinations

def f_test(name, ss, df, error_ss, error_df):
    ms, mse = ss / df, error_ss / error_df
    F = ms / mse if mse > 0 else (np.inf if ms > 0 else np.nan)
    p = stats.f.sf(F, df, error_df)
    cv = stats.f.isf(alpha, df, error_df)
    print(f"{name}: SS={ss:.6g}, MS={ms:.6g}, MSerror={mse:.6g}")
    print(f"  F({df}, {error_df})={F:.6g}, p={p:.6g}, Fcv={cv:.6g}")
    return p

def pairs(names, means, se, df, scheffe=False):
    comparisons = list(combinations(range(len(names)), 2))
    results = []
    for i, j in comparisons:
        delta = means[i] - means[j]
        t = np.divide(delta, se(i, j))
        results.append((i, j, delta, t, 2 * stats.t.sf(abs(t), df)))
    m = len(results)
    holm = np.full(m, np.nan)
    valid = sorted((i for i in range(m) if np.isfinite(results[i][4])),
                   key=lambda i: results[i][4])
    running = 0
    for rank, i in enumerate(valid):
        running = min(1, max(running, (len(valid) - rank) * results[i][4]))
        holm[i] = running
    for q, (i, j, delta, t, p) in enumerate(results):
        extra = f", Scheffe={stats.f.sf(t*t/(len(names)-1), len(names)-1, df):.6g}" if scheffe else ""
        print(f"{names[i]} - {names[j]}: diff={delta:.6g}, p={p:.6g}, "
              f"Bonferroni={np.minimum(1, m*p):.6g}, Holm={holm[q]:.6g}{extra}")

def independent(names, n, means, variances):
    n, means, variances = map(np.asarray, (n, means, variances))
    ss = np.sum(n * (means - np.average(means, weights=n))**2)
    err = np.sum((n - 1) * variances)
    df, edf = len(n)-1, int(sum(n)-len(n))
    f_test("組間", ss, df, err, edf)
    pairs(names, means, lambda i, j: np.sqrt(err/edf * (1/n[i]+1/n[j])), edf, True)

`;
const pyTwo = `# y 的維度：A 水準 × B 水準 × 細格觀測（或同一受試者）。
A, B, n = y.shape
cell = y.mean(axis=2)
ma, mb, grand = cell.mean(axis=1), cell.mean(axis=0), cell.mean()
ss = [n*B*np.sum((ma-grand)**2), n*A*np.sum((mb-grand)**2),
      n*np.sum((cell-ma[:,None]-mb[None,:]+grand)**2)]
dfs = [A-1, B-1, (A-1)*(B-1)]
resid = np.sum((y-cell[:,:,None])**2)
within = (resid, A*B*(n-1))
if model == "two":
    ea = eb = ei = shared_a = shared_b = within
elif model == "mixed":
    # A 使用組內受試者誤差；B 與交互作用使用重複測量誤差。
    subject = B*np.sum((y.mean(axis=1)-ma[:,None])**2)
    ea = (subject, A*(n-1))
    eb = ei = shared_b = (resid-subject, A*(n-1)*(B-1))
    shared_a = within
else:
    # 受試者交互作用誤差分別對應 A、B、A×B。
    z = y-cell[:,:,None]
    subj = z.mean(axis=(0,1))
    za, zb = z.mean(axis=1), z.mean(axis=0)
    ea = (B*np.sum((za-subj)**2), (A-1)*(n-1))
    eb = (A*np.sum((zb-subj)**2), (B-1)*(n-1))
    ei = (np.sum((z-za[:,None,:]-zb[None,:,:]+subj)**2), dfs[2]*(n-1))
    shared_a = shared_b = (ea[0]+eb[0]+ei[0], (A*B-1)*(n-1))
    if pooled:
        ea = eb = ei = shared_a
for name, s, df, err in zip(effect_names, ss, dfs, (ea, eb, ei)):
    f_test(name, s, df, *err)

print("\\n細格平均數與各自的 95% t 信賴區間")
for i, a in enumerate(levels_a):
    for j, b in enumerate(levels_b):
        w = stats.t.isf(.025, n-1) * y[i,j].std(ddof=1)/np.sqrt(n)
        print(f"{a} × {b}: {cell[i,j]:.6g} [{cell[i,j]-w:.6g}, {cell[i,j]+w:.6g}]")

print("\\n單純主要效果：共用誤差、Bonferroni 校正")
for i, a in enumerate(levels_a):
    p = f_test(f"B | {a}", n*np.sum((cell[i]-ma[i])**2), B-1, *shared_b)
    print(f"  Bonferroni p={min(1,(A+B)*p):.6g}")
for j, b in enumerate(levels_b):
    p = f_test(f"A | {b}", n*np.sum((cell[:,j]-mb[j])**2), A-1, *shared_a)
    print(f"  Bonferroni p={min(1,(A+B)*p):.6g}")
`;
function pythonLiteral(value, indent=''){
 const inline=JSON.stringify(value);
 if(!Array.isArray(value)||inline.length<=65)return inline;
 const inner=indent+'    ';
 return '[\n'+value.map(item=>inner+pythonLiteral(item,inner)).join(',\n')+'\n'+indent+']';
}
function pythonCase(z,alpha,pooled){
 const literal=pythonLiteral;
 const put=(name,value)=>name+' = '+literal(value)+'\n';
 const array=(name,value)=>name+' = np.array('+literal(value)+', dtype=float)\n';
 const keys=(rows,i)=>[...new Set(rows.map(r=>r[i]))];
 const {model,rows,headers}=z;
 let code='# '+z.title+'\n# 資料來源：'+z.source+'\n'+pyBase+put('alpha',alpha);
 if(model==='ratio'||model==='one'){
  let names=keys(rows,0),groups=names.map(g=>rows.filter(r=>r[0]===g).map(r=>r[1]));
  code+=put('names',names)+put('groups',groups);
  if(model==='one')return code+'independent(names, [len(g) for g in groups],\n            [np.mean(g) for g in groups], [np.var(g, ddof=1) for g in groups])\n';
  return code+`x, y = groups
df1, df2 = len(x)-1, len(y)-1
F = np.var(x, ddof=1)/np.var(y, ddof=1)
p = min(1, 2*min(stats.f.cdf(F, df1, df2), stats.f.sf(F, df1, df2)))
low, high = stats.f.ppf(alpha/2, df1, df2), stats.f.isf(alpha/2, df1, df2)
print(f"F({df1}, {df2})={F:.6g}, p={p:.6g}, Fcv=[{low:.6g}, {high:.6g}]")
`;
 }
 if(model==='repeat')return code+put('names',headers.slice(1))+array('y',rows.map(r=>r.slice(1)))+`n, k = y.shape
means = y.mean(axis=0)
ss = n*np.sum((means-y.mean())**2)
residual = y-y.mean(axis=0)-y.mean(axis=1, keepdims=True)+y.mean()
f_test("條件", ss, k-1, np.sum(residual**2), (n-1)*(k-1))
pairs(names, means, lambda i,j: np.std(y[:,i]-y[:,j], ddof=1)/np.sqrt(n), n-1)
`;
 let a,b,cube;
 if(model==='mixed'){
  a=keys(rows,0);b=headers.slice(2);
  cube=a.map(g=>b.map((_,j)=>rows.filter(r=>r[0]===g).map(r=>r[j+2])));
 }else if(model==='within'){
  a=keys(rows,1);b=keys(rows,2);const ids=keys(rows,0);
  cube=a.map(g=>b.map(h=>ids.map(id=>rows.find(r=>r[0]===id&&r[1]===g&&r[2]===h)[3])));
 }else{
  a=keys(rows,0);b=keys(rows,1);
  cube=a.map(g=>b.map(h=>rows.filter(r=>r[0]===g&&r[1]===h).map(r=>r[2])));
 }
 return code+put('model',model)+'pooled = '+(pooled?'True':'False')+'\n'+
  put('levels_a',a)+put('levels_b',b)+put('effect_names',model==='within'?[headers[1],headers[2],'A × B']:[headers[0],model==='mixed'?'條件（B）':headers[1],'A × B'])+array('y',cube)+pyTwo;
}
function pythonSurvey(variable,group,rows,alpha){
 return '# '+variable+'｜依'+group+'分組\n# 僅使用公開摘要：組別、樣本數、平均數、樣本變異數。\n'+
  pyBase+'alpha = '+alpha+'\nrows = '+pythonLiteral(rows)+'\nindependent(*zip(*rows))\n';
}
if(typeof module!=='undefined')module.exports={pythonCase,pythonSurvey};
