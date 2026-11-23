# Rscript syntax/cases/mediation.R (from the project root)
d <- read.csv("data/salary.csv")
set.seed(20261123); B <- 5000
fa <- lm(m~x,d); fb <- lm(y~x+m,d); fc <- lm(y~x,d)
print(summary(fa));print(summary(fb))
print(c(a=coef(fa)["x"],b=coef(fb)["m"],direct=coef(fb)["x"],indirect=coef(fa)["x"]*coef(fb)["m"],total=coef(fc)["x"]))
boot <- replicate(B,{
 s <- d[sample.int(nrow(d),replace=TRUE),]
 unname(coef(lm(m~x,s))["x"]*coef(lm(y~x+m,s))["m"])
})
cat("Percentile bootstrap 95% CI; B=5000\n");print(quantile(boot,c(.025,.975)))
