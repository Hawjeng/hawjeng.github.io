# python syntax/cases/mediation.py (from the project root)
# pip install numpy pandas scipy statsmodels
import numpy as np
import pandas as pd
import statsmodels.formula.api as smf
d=pd.read_csv('data/salary.csv')
rng=np.random.default_rng(20261123); B=5000
fa=smf.ols('m~x',d).fit();fb=smf.ols('y~x+m',d).fit();fc=smf.ols('y~x',d).fit()
print(fa.summary());print(fb.summary())
print(dict(a=fa.params['x'],b=fb.params['m'],direct=fb.params['x'],indirect=fa.params['x']*fb.params['m'],total=fc.params['x']))
A=np.column_stack([np.ones(len(d)),d.x]);Y=np.column_stack([np.ones(len(d)),d.x,d.m]);boot=[]
for _ in range(B):
 i=rng.integers(0,len(d),len(d))
 a=np.linalg.lstsq(A[i],d.m.to_numpy()[i],rcond=None)[0][1]
 b=np.linalg.lstsq(Y[i],d.y.to_numpy()[i],rcond=None)[0][2]
 boot.append(a*b)
print('Percentile bootstrap 95% CI; B=5000',np.quantile(boot,[.025,.975]))
