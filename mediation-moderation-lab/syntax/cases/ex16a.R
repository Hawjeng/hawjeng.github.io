# Rscript syntax/cases/ex16a.R (from the project root)
d <- read.csv("data/ex16a.csv")
fit <- lm(y ~ x*w, d)
print(summary(fit))
b <- coef(fit); V <- vcov(fit); crit <- qt(.975,df.residual(fit))
for (w0 in c(min(d$w),mean(d$w),max(d$w))) {
 theta <- b["x"]+b["x:w"]*w0
 se <- sqrt(V["x","x"]+2*w0*V["x","x:w"]+w0^2*V["x:w","x:w"])
 print(c(w=w0,effect=theta,lo=theta-crit*se,hi=theta+crit*se))
}
A <- b["x:w"]^2-crit^2*V["x:w","x:w"]
B <- 2*(b["x"]*b["x:w"]-crit^2*V["x","x:w"])
C <- b["x"]^2-crit^2*V["x","x"]
if (B^2-4*A*C>=0) print(sort(c((-B-sqrt(B^2-4*A*C))/(2*A),(-B+sqrt(B^2-4*A*C))/(2*A))))
cat("Interpret J-N roots only within the observed moderator range:",range(d$w),"\n")
