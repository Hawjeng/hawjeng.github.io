* SPSS: set the working directory to the unzipped project root first.
* Four strategies: R, Python, SPSS (native regression + PROCESS), Mplus.
* Run each block after loading its matching dataset; do not change variable order.
SET PRINTBACK=ON.
GET DATA /TYPE=TXT /FILE='data/ch16b.csv'
 /ENCODING='UTF8' /DELCASE=LINE /DELIMITERS="," /ARRANGEMENT=DELIMITED
 /FIRSTCASE=2 /VARIABLES=x F16.8 w F16.8 y F16.8.
EXECUTE.
* Native hierarchical regression; x is D, w is X in the original book.
COMPUTE xw=x*w.
REGRESSION /STATISTICS COEFF R ANOVA CHANGE CI(95)
 /DEPENDENT y /METHOD=ENTER x w /METHOD=ENTER xw.
* Simple effect of x at w=60 via re-centering the moderator.
COMPUTE wc=w-60.
COMPUTE xwc=x*wc.
REGRESSION /STATISTICS COEFF R ANOVA CI(95)
 /DEPENDENT y /METHOD=ENTER x wc xwc.
GET DATA /TYPE=TXT /FILE='data/salary.csv'
 /ENCODING='UTF8' /DELCASE=LINE /DELIMITERS="," /ARRANGEMENT=DELIMITED
 /FIRSTCASE=2 /VARIABLES=x F16.8 m F16.8 y F16.8 w F16.8.
EXECUTE.
* Native regressions provide a, b, c and c-prime, not the bootstrap CI of a*b.
REGRESSION /DEPENDENT m /METHOD=ENTER x.
REGRESSION /DEPENDENT y /METHOD=ENTER x.
REGRESSION /DEPENDENT y /METHOD=ENTER x m.
* Activate the official macro separately (edit this local path).
* Download from https://www.afhayes.com/download.html ; macro not redistributed.
INSERT FILE='C:/macros/process51.sps'.
* Model 4: simple mediation, percentile bootstrap (default).
PROCESS y=y /x=x /m=m /model=4 /boot=5000
 /seed=20261123 /total=1 /conf=95.
* Model 59: a, b and direct paths moderated by binary w (0=female,1=male).
PROCESS y=y /x=x /m=m /w=w /model=59 /boot=5000
 /seed=20261123 /conf=95.
GET DATA /TYPE=TXT /FILE='data/ch16b.csv'
 /ENCODING='UTF8' /DELCASE=LINE /DELIMITERS="," /ARRANGEMENT=DELIMITED
 /FIRSTCASE=2 /VARIABLES=x F16.8 w F16.8 y F16.8.
EXECUTE.
* Model 1: x is the binary focal predictor; w is continuous.
PROCESS y=y /x=x /w=w /model=1 /jn=1 /conf=95.
