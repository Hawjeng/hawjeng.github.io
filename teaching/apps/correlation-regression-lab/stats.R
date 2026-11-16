# All analytic designs use an intercept. VIF is reported per design column.
fit_design <- function(d) {
  x <- as.matrix(d[-1])
  n <- nrow(d)
  p <- ncol(x)
  if(n <= p+1L) stop("有效資料筆數須大於模型參數個數。")
  if(!is.finite(sd(d[[1]])) || sd(d[[1]])==0) stop("結果變數沒有變異。")
  if(any(vapply(d[-1],sd,numeric(1))==0)) stop("預測變數有常數欄，請調整變數或組別。")
  fit <- lm(y ~ .,data=d)
  if(fit$rank != p+1L) stop("模型有完全共線性，請移除重複或線性依賴的預測變數。")
  fit
}
vif_table <- function(fit) {
  x <- model.matrix(fit)[,-1,drop=FALSE]
  if(ncol(x)<2) return(NULL)
  tolerance <- vapply(seq_len(ncol(x)),function(i){
    y <- x[,i]
    aux <- lm.fit(cbind(1,x[,-i,drop=FALSE]),y)
    sum(aux$residuals^2)/sum((y-mean(y))^2)
  },numeric(1))
  data.frame(變數=colnames(x),允差=tolerance,VIF=1/tolerance,check.names=FALSE)
}
prepare_design <- function(d, kind, xs, y, levels=NULL, degree=2L) {
  if(!length(xs)||y %in% xs) stop("請選擇彼此不同的結果與預測變數。")
  if(!is.numeric(d[[y]])) stop("結果變數須為數值。")
  cols <- d[c(xs,y)]
  keep <- complete.cases(cols)
  for(nm in names(cols)) if(is.numeric(cols[[nm]]))keep <- keep & is.finite(cols[[nm]]) else keep <- keep & nzchar(trimws(cols[[nm]]))
  d <- d[keep,,drop=FALSE]
  if(kind=='pb'){
    if(length(levels)!=2L||length(unique(levels))!=2L)stop("請選擇兩個不同類別。")
    d <- d[as.character(d[[xs[1]]]) %in% levels,,drop=FALSE]
    x <- as.integer(as.character(d[[xs[1]]])==levels[2])
    design <- data.frame(y=d[[y]], x=x)
    labels <- c('y'=y,'x'=paste0(xs[1],'（0 = ',levels[1],'，1 = ',levels[2],'）'))
  }else if(kind=='dummy'){
    g <- as.character(d[[xs[1]]])
    base <- if(length(levels))levels[1] else sort(unique(g))[1]
    if(!length(base)||!base %in% g) stop("參照組沒有有效觀測。")
    others <- setdiff(sort(unique(g)),base)
    if(!length(others))stop("虛擬迴歸至少需要兩組。")
    x <- outer(g,others,'==')*1
    colnames(x)<-paste0('d',seq_along(others))
    design <- data.frame(y=d[[y]],x)
    labels <- setNames(c(y,paste0(others,' 相對於 ',base)),names(design))
  }else{
    if(!all(vapply(d[xs],is.numeric,logical(1))))stop("請選擇數值預測變數。")
    x <- d[xs]
    if(kind=='poly'){
      degree <- as.integer(degree)
      x <- as.data.frame(lapply(seq_len(degree),function(i)x[[1]]^i))
      xs <- c(xs,paste0(xs,'^',2:degree))
    }
    names(x)<-paste0('x',seq_along(x))
    design<-data.frame(y=d[[y]],x)
    labels<-setNames(c(y,xs),names(design))
  }
  if(nrow(design)<3)stop("配對有效資料至少須有 3 筆。")
  list(data=design,labels=labels,kind=kind)
}
cor_fit <- function(d) {
 if(nrow(d)<4||sd(d[[2]])==0||sd(d[[1]])==0) stop("相關分析需至少四筆有變異的配對資料。")
 cor.test(d[[2]],d[[1]],method='pearson')
}
