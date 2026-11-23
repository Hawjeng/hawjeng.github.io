# Rscript syntax/cases/conditional.R (from the project root)
d <- read.csv("data/salary.csv")
set.seed(20261123); B <- 5000
fa <- lm(m~x*w,d); fb <- lm(y~x+m+w+x:w+m:w,d)
print(summary(fa));print(summary(fb))
effect <- function(s){
 a <- coef(lm(m~x*w,s)); b <- coef(lm(y~x+m+w+x:w+m:w,s))
 i0 <- a["x"]*b["m"];i1 <- (a["x"]+a["x:w"])*(b["m"]+b["m:w"])
 c(w0=unname(i0),w1=unname(i1),difference=unname(i1-i0))
}
print(effect(d))
boot <- replicate(B,effect(d[sample.int(nrow(d),replace=TRUE),]))
cat("Percentile bootstrap 95% CI; B=5000\n");print(t(apply(boot,1,quantile,c(.025,.975))))
