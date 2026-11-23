# R: run from the unzipped project root: Rscript syntax/analysis.R
# No add-on packages are required for the core analysis.
set.seed(20261123)
B <- 5000
out <- list()
for (id in c("ch16b", "ex16a", "ex16b", "ch16d")) {
  d <- read.csv(paste0("data/", id, ".csv"))
  fit <- lm(y ~ x*w, d)
  cat("\nMODERATION:", id, "\n"); print(summary(fit))
  if (id == "ch16d") {cat("Deterministic illustration: do not interpret p-values.\n"); next}
  # Simple slopes at the observed mean +/- one SD of w.
  V <- vcov(fit); b <- coef(fit); crit <- qt(.975, df.residual(fit))
  for (w0 in mean(d$w) + c(-1, 0, 1)*sd(d$w)) {
    if (w0 < min(d$w) || w0 > max(d$w)) next
    slope <- b["x"] + b["x:w"]*w0
    se <- sqrt(V["x","x"] + 2*w0*V["x","x:w"] + w0^2*V["x:w","x:w"])
    print(c(w=w0, slope=slope, se=se, lo=slope-crit*se, hi=slope+crit*se))
  }
  # Solve slope(w)^2 - tcrit^2*Var(slope(w)) = 0.
  A <- b["x:w"]^2-crit^2*V["x:w","x:w"]
  C <- b["x"]^2-crit^2*V["x","x"]
  D <- 2*(b["x"]*b["x:w"]-crit^2*V["x","x:w"])
  if (D^2-4*A*C >= 0 && abs(A)>1e-12) {
    roots <- sort(c((-D-sqrt(D^2-4*A*C))/(2*A),(-D+sqrt(D^2-4*A*C))/(2*A)))
    cat("Johnson-Neyman roots:", roots, "; observed w:", range(d$w), "\n")
  } else cat("No two finite J-N roots; inspect slope intervals across observed range.\n")
  # Optional plotting package: install.packages("interactions")
  # interactions::johnson_neyman(fit, pred=x, modx=w, df="residual",
  #                            mod.range=range(d$w))
}
s <- read.csv("data/salary.csv") # x=education, m=starting salary, y=current salary, w=gender
fa <- lm(m~x,s); fb <- lm(y~x+m,s); fc <- lm(y~x,s)
a <- coef(fa)["x"]; b <- coef(fb)["m"]
cat("\nMEDIATION: a, b, direct, indirect, total\n")
print(c(a=a,b=b,direct=coef(fb)["x"],indirect=a*b,total=coef(fc)["x"]))
sobelSE <- sqrt(b^2*vcov(fa)["x","x"] + a^2*vcov(fb)["m","m"])
print(c(SobelZ=a*b/sobelSE, p=2*pnorm(-abs(a*b/sobelSE))))
boot <- replicate(B, {
  d <- s[sample.int(nrow(s),replace=TRUE),]
  aa <- coef(lm(m~x,d)); bb <- coef(lm(y~x+m,d))
  am <- coef(lm(m~x*w,d)); bm <- coef(lm(y~x+m+w+x:w+m:w,d))
  i0 <- am["x"]*bm["m"]
  i1 <- (am["x"]+am["x:w"])*(bm["m"]+bm["m:w"])
  c(indirect=unname(aa["x"]*bb["m"]),w0=unname(i0),w1=unname(i1),difference=unname(i1-i0))
})
cat("Percentile bootstrap 95% CIs (R RNG; may differ from Python):\n")
print(t(apply(boot,1,quantile,c(.025,.975))))
write.csv(t(boot),"bootstrap-R.csv",row.names=FALSE)
cat("\nMODEL 59 equations:\n"); print(summary(lm(m~x*w,s)));print(summary(lm(y~x+m+w+x:w+m:w,s)))
# Optional SEM mediation (requires lavaan):
# install.packages("lavaan")
# model <- 'm ~ a*x; y ~ cp*x + b*m; indirect := a*b; total := cp+a*b'
# fit <- lavaan::sem(model,data=s,se="bootstrap",bootstrap=5000)
# lavaan::parameterEstimates(fit,boot.ci.type="perc")
