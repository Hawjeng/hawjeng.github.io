GET DATA /TYPE=TXT /FILE='data/salary.csv'
 /ENCODING='UTF8' /DELCASE=LINE /DELIMITERS=","
 /ARRANGEMENT=DELIMITED /FIRSTCASE=2
 /VARIABLES=x F16.8 m F16.8 y F16.8 w F16.8.
EXECUTE.
INSERT FILE='C:/macros/process51.sps'.
PROCESS y=y /x=x /m=m /w=w /model=59 /boot=5000 /seed=20261123 /conf=95.
