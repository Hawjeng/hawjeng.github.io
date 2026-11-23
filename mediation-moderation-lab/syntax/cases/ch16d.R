# Rscript syntax/cases/ch16d.R (from the project root)
d <- read.csv("data/ch16d.csv")
fit <- lm(y ~ x*w, d)
print(coef(fit));cat("Deterministic y=30-5*x*w. No inferential tests.\n")
