# Run: Rscript chapter16.R CASE. Uses base R only.
args <- commandArgs(trailingOnly = TRUE)
case <- if (length(args)) args[1] else "residual"
script <- sub("^--file=", "", grep("^--file=", commandArgs(), value = TRUE)[1])
data <- read.csv(file.path(dirname(script), "chapter16.csv"))
d <- data[data$case == case, ]
if (!nrow(d)) stop("Unknown case: ", case)
t <- d$t
y <- d$y

fit <- function(x, y) {
  model <- lm.fit(x, y)
  e <- model$residuals
  rss <- sum(e^2)
  list(beta = model$coefficients, e = e, r2 = 1 - rss/sum((y - mean(y))^2),
       dw = sum(diff(e)^2)/rss)
}
design <- function(t, degree) outer(t, 0:degree, "^")
moving <- function(y, weights) as.numeric(filter(y, rev(weights), sides = 2))
ses <- function(y, alpha) {
  forecast <- c(NA, y[1], rep(NA, length(y) - 1))
  for (i in 2:length(y)) forecast[i+1] <- alpha*y[i] + (1-alpha)*forecast[i]
  forecast
}
seasonal <- function(y) {
  cma <- moving(y, c(1,2,2,2,1)/8)
  ratio <- y/cma
  q <- rep(1:4, length.out = length(y))
  raw <- tapply(ratio, q, mean, na.rm = TRUE)
  index <- raw/mean(raw)
  list(cma = cma, ratio = ratio, index = index, adjusted = y/index[q])
}
bg <- function(x, e, q) {
  lags <- sapply(seq_len(q), function(j) c(rep(0, j), head(e, -j)))
  auxiliary <- lm.fit(cbind(x, lags), e)
  restricted <- sum(e^2)
  full <- sum(auxiliary$residuals^2)
  lm <- length(e)*(1-full/restricted)
  df2 <- length(e)-ncol(x)-q
  Fstat <- ((restricted-full)/q)/(full/df2)
  c(lm = lm, p = pchisq(lm,q,lower.tail=FALSE),
    Fstat = Fstat, pF = pf(Fstat,q,df2,lower.tail=FALSE))
}
print_rows <- function(period, ...) {
  columns <- cbind(...)
  for (i in seq_along(period)) {
    values <- ifelse(is.na(columns[i,]), "-", sprintf("%.3f",columns[i,]))
    cat(sprintf("%-8s", period[i]), paste(sprintf("%9s", values), collapse=" "), "\n")
  }
}
trend <- function(kind) {
  degree <- if (kind == "quadratic") 2 else 1
  transform <- kind == "exponential"
  model <- fit(design(t, degree), if (transform) log(y) else y)
  prediction <- as.numeric(design(tail(t,1)+1, degree) %*% model$beta)
  if (transform) prediction <- exp(prediction)
  cat(sprintf("%-12s beta = %s\n",kind,paste(sprintf("%.5f",model$beta),collapse=", ")))
  cat(sprintf("             R2 = %.4f   DW = %.4f   next = %.4f\n",model$r2,model$dw,prediction))
}
if (case == "population") {
  i <- which(y < 0)[1]
  keep <- c(i-1,i,length(y))
  print_rows(d$period[keep],y[keep])
}
if (case %in% c("ma","exercise1")) {
  a <- ses(y,.2)
  b <- ses(y,.5)
  third <- moving(y,rep(1/3,3))
  fifth <- moving(y,rep(1/5,5))
  if (case == "ma") {
    cat("Period       Observed       MA3       MA5      WMA3    SES.20    SES.50\n")
    print_rows(d$period,y,third,fifth,moving(y,c(.2,.3,.5)),head(a,-1),head(b,-1))
  } else {
    cat("Period       Observed       MA3       MA5    SES.20    SES.50\n")
    print_rows(d$period,y,third,fifth,head(a,-1),head(b,-1))
    cat("2014 forecast: MA3, MA5, SES.20, SES.50\n")
    print_rows("2014",mean(tail(y,3)),mean(tail(y,5)),tail(a,1),tail(b,1))
    trend("linear")
    trend("quadratic")
  }
}
if (case %in% c("season","exercise2")) {
  s <- seasonal(y)
  cat("Seasonal index Q1-Q4:",sprintf("%.3f",s$index),"\n")
  cat("Period       Observed      CMA4     Ratio     Adjusted\n")
  print_rows(d$period,y,s$cma,s$ratio,s$adjusted)
}
if (case %in% c("trend","revenue")) {
  for (kind in c("linear","quadratic","exponential")) trend(kind)
}
if (case == "residual") {
  x <- design(t,1)
  model <- fit(x,y)
  out <- bg(x,model$e,1)
  cat(sprintf("n=%d, k=1   R2=%.4f   DW=%.6f\n",length(y),model$r2,model$dw))
  cat(sprintf("BG(1) LM=%.6f   p=%.8g   F=%.6f   p(F)=%.8g\n",out[1],out[2],out[3],out[4]))
  cat("DW upper/lower bounds at alpha=.05: dL=1.201, dU=1.411\n")
}
if (case == "revenue") {
  for (p in 1:3) {
    lags <- sapply(1:p, function(j) y[(p-j+1):(length(y)-j)])
    x <- cbind(1,lags)
    model <- fit(x,y[(p+1):length(y)])
    prediction <- sum(c(1,rev(tail(y,p)))*model$beta)
    out <- bg(x,model$e,1)
    cat(sprintf("AR(%d)  n=%d  R2=%.4f  next=%.4f  BG(1)=%.4f  p=%.6f\n",
                p,length(model$e),model$r2,prediction,out[1],out[2]))
  }
}
