# python syntax/cases/conditional.py (from the project root)
# pip install numpy pandas scipy statsmodels
import numpy as np
import pandas as pd
import statsmodels.formula.api as smf
d=pd.read_csv('data/salary.csv')
rng=np.random.default_rng(20261123); B=5000
fa=smf.ols('m~x*w',d).fit();fb=smf.ols('y~x+m+w+x:w+m:w',d).fit()
print(fa.summary());print(fb.summary())
A=np.column_stack([np.ones(len(d)),d.x,d.w,d.x*d.w])
Y=np.column_stack([np.ones(len(d)),d.x,d.m,d.w,d.x*d.w,d.m*d.w])
def effect(i):
 a=np.linalg.lstsq(A[i],d.m.to_numpy()[i],rcond=None)[0]
 b=np.linalg.lstsq(Y[i],d.y.to_numpy()[i],rcond=None)[0]
 i0=a[1]*b[2];i1=(a[1]+a[3])*(b[2]+b[5])
 return [i0,i1,i1-i0]
print('IE(0), IE(1), difference:',effect(np.arange(len(d))))
boot=[effect(rng.integers(0,len(d),len(d))) for _ in range(B)]
print('Percentile bootstrap 95% CI; columns IE(0), IE(1), difference:')
print(np.quantile(boot,[.025,.975],axis=0))
