# Run: Rscript chapter17.R CASE. Base R only.
args <- commandArgs(trailingOnly=TRUE)
key <- if (length(args)) args[1] else "brand_gender"
script <- sub("^--file=", "", grep("^--file=", commandArgs(), value=TRUE)[1])
csv <- read.csv(file.path(dirname(script),"chapter17.csv"), encoding="UTF-8")
d <- csv[csv$case == key,]
if (!nrow(d)) stop("Unknown case: ", key)
method <- d$method[1]
x <- matrix(NA_real_, max(d$row), max(d$column))
x[cbind(d$row,d$column)] <- d$value
sign_result <- function(z) {
  n <- sum(z != 0)
  plus <- sum(z > 0)
  adj <- max(0, abs(plus-n/2)-.5)/(sqrt(n)/2)
  zg <- (plus-n/2-.5)/(sqrt(n)/2)
  c(n=n, plus=plus, minus=n-plus, zeros=length(z)-n,
    p_two=binom.test(plus,n)$p.value,
    p_greater=binom.test(plus,n,alternative="greater")$p.value,
    normal_two=2*pnorm(adj,lower.tail=FALSE), normal_greater=pnorm(zg,lower.tail=FALSE))
}
if (method == "gof") {
  fit <- suppressWarnings(chisq.test(x[1,],p=d$probability[d$row==1]))
  out <- c(n=sum(x),chi2=unname(fit$statistic),df=unname(fit$parameter),
           p=fit$p.value,min_expected=min(fit$expected))
}
if (method %in% c("ind","hom")) {
  fit <- suppressWarnings(chisq.test(x,correct=FALSE))
  out <- c(n=sum(x),chi2=unname(fit$statistic),df=unname(fit$parameter),p=fit$p.value,
           min_expected=min(fit$expected),cramer_v=sqrt(as.numeric(fit$statistic)/(sum(x)*min(dim(x)-1))))
}
if (method == "sign") out <- sign_result(x[1,])
if (method == "paired") {
  z <- x[2,]-x[1,]
  out <- sign_result(z)
  z <- z[z!=0]
  ranks <- rank(abs(z))
  plus <- sum(ranks[z>0])
  minus <- sum(ranks[z<0])
  signed <- wilcox.test(z,exact=FALSE,correct=FALSE)
  out <- c(out,rank_plus=plus,rank_minus=minus,wilcoxon_t=min(plus,minus),p_signed_rank=signed$p.value)
}
if (method == "kendall") {
  n <- nrow(x)
  m <- ncol(x)
  ranks <- rowSums(apply(x,2,rank))
  ties <- sum(apply(x,2,function(col) sum(table(col)^3-table(col))))
  w <- 12*sum((ranks-mean(ranks))^2)/(m^2*(n^3-n)-m*ties)
  stat <- m*(n-1)*w
  out <- c(n=n,judges=m,tie_sum=ties,kendall_w=w,chi2=stat,df=n-1,p=pchisq(stat,n-1,lower.tail=FALSE))
}
if (method %in% c("groups","frequency")) {
  cols <- suppressWarnings(as.numeric(d$column_label[d$row==1]))
  groups <- lapply(seq_len(nrow(x)),function(i) {
    if (method=="frequency") rep(cols,x[i,]) else x[i,!is.na(x[i,])]
  })
  kw <- kruskal.test(groups)
  out <- c(n=sum(lengths(groups)),h=unname(kw$statistic),df=unname(kw$parameter),p_kruskal=kw$p.value)
  if (length(groups)==2) {
    test <- wilcox.test(groups[[1]],groups[[2]],exact=FALSE,correct=FALSE)
    nx <- length(groups[[1]])
    ny <- length(groups[[2]])
    u <- as.numeric(test$statistic)
    out <- c(out,rank_sum=u+nx*(nx+1)/2,u1=u,u2=nx*ny-u,p_rank_sum=test$p.value)
  }
}
for (i in seq_along(out)) cat(sprintf("%-16s = %.9g\n", names(out)[i],out[i]))
