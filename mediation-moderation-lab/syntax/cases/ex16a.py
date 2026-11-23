# python syntax/cases/ex16a.py (from the project root)
# pip install numpy pandas scipy statsmodels
import numpy as np
import pandas as pd
import statsmodels.formula.api as smf
from scipy.stats import t
d=pd.read_csv('data/ex16a.csv')
fit=smf.ols('y ~ x*w',d).fit()
print(fit.summary())
b=fit.params; V=fit.cov_params(); crit=t.ppf(.975,fit.df_resid)
for w0 in [d.w.min(),d.w.mean(),d.w.max()]:
 theta=b['x']+b['x:w']*w0
 se=np.sqrt(V.loc['x','x']+2*w0*V.loc['x','x:w']+w0*w0*V.loc['x:w','x:w'])
 print(dict(w=w0,effect=theta,lo=theta-crit*se,hi=theta+crit*se))
poly=[b['x:w']**2-crit**2*V.loc['x:w','x:w'],2*(b['x']*b['x:w']-crit**2*V.loc['x','x:w']),b['x']**2-crit**2*V.loc['x','x']]
roots=np.roots(poly)
print('Real J-N roots:',np.sort(roots[np.isreal(roots)].real))
print('Observed moderator range:',d.w.min(),d.w.max())
