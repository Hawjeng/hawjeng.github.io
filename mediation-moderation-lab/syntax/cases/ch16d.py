# python syntax/cases/ch16d.py (from the project root)
# pip install numpy pandas scipy statsmodels
import numpy as np
import pandas as pd
import statsmodels.formula.api as smf
from scipy.stats import t
d=pd.read_csv('data/ch16d.csv')
fit=smf.ols('y ~ x*w',d).fit()
print(fit.params);print('Deterministic y=30-5*x*w. No inferential tests.')
