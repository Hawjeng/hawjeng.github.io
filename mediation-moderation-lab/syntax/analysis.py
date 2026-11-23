"""Python: run python syntax/analysis.py from the unzipped project root.
Dependencies: pip install numpy pandas scipy statsmodels
Percentile case bootstrap, B=5000, NumPy seed 20261123.
"""
import json
import numpy as np
import pandas as pd
import statsmodels.formula.api as smf
from scipy.stats import t, norm
rng=np.random.default_rng(20261123)
B=5000
for name in ['ch16b','ex16a','ex16b','ch16d']:
    d=pd.read_csv('data/'+name+'.csv')
    model=smf.ols('y ~ x*w',d).fit()
    print('\nMODERATION',name); print(model.summary())
    if name=='ch16d':
        print('Deterministic illustration: no inferential p-values.'); continue
    b=model.params; V=model.cov_params(); crit=t.ppf(.975,model.df_resid)
    for w0 in [d.w.mean()-d.w.std(),d.w.mean(),d.w.mean()+d.w.std()]:
        if not d.w.min() <= w0 <= d.w.max(): continue
        slope=b['x']+b['x:w']*w0
        se=np.sqrt(V.loc['x','x']+2*w0*V.loc['x','x:w']+w0*w0*V.loc['x:w','x:w'])
        print(dict(w=w0,slope=slope,se=se,lo=slope-crit*se,hi=slope+crit*se))
    poly=[b['x:w']**2-crit**2*V.loc['x:w','x:w'],
          2*(b['x']*b['x:w']-crit**2*V.loc['x','x:w']),
          b['x']**2-crit**2*V.loc['x','x']]
    roots=np.roots(np.trim_zeros(np.array(poly),'f'))
    print('J-N real roots:',np.sort(roots[np.isreal(roots)].real),'Observed w:',[d.w.min(),d.w.max()])
s=pd.read_csv('data/salary.csv')
fa=smf.ols('m~x',s).fit();fb=smf.ols('y~x+m',s).fit();fc=smf.ols('y~x',s).fit()
a=fa.params['x'];b=fb.params['m']; indirect=a*b
sobelSE=np.sqrt(b*b*fa.bse['x']**2+a*a*fb.bse['m']**2)
print('MEDIATION',dict(a=a,b=b,direct=fb.params['x'],indirect=indirect,total=fc.params['x'],SobelZ=indirect/sobelSE))
am=smf.ols('m~x*w',s).fit();bm=smf.ols('y~x+m+w+x:w+m:w',s).fit()
print('MODEL 59');print(am.summary());print(bm.summary())
# The same case indices are used for every equation within a bootstrap draw.
def mat(cols): return np.column_stack([np.ones(len(s))]+[np.asarray(c) for c in cols])
AX=mat([s.x]);BX=mat([s.x,s.m]);AM=mat([s.x,s.w,s.x*s.w]);BM=mat([s.x,s.m,s.w,s.x*s.w,s.m*s.w])
samples=[]
for _ in range(B):
    i=rng.integers(0,len(s),len(s))
    aa=np.linalg.lstsq(AX[i],s.m.to_numpy()[i],rcond=None)[0]
    bb=np.linalg.lstsq(BX[i],s.y.to_numpy()[i],rcond=None)[0]
    aaa=np.linalg.lstsq(AM[i],s.m.to_numpy()[i],rcond=None)[0]
    bbb=np.linalg.lstsq(BM[i],s.y.to_numpy()[i],rcond=None)[0]
    i0=aaa[1]*bbb[2];i1=(aaa[1]+aaa[3])*(bbb[2]+bbb[5])
    samples.append([aa[1]*bb[2],i0,i1,i1-i0])
boot=pd.DataFrame(samples,columns=['indirect','w0','w1','difference'])
print('Percentile bootstrap 95% CIs:');print(boot.quantile([.025,.975]).T)
boot.to_csv('bootstrap-Python.csv',index=False)
