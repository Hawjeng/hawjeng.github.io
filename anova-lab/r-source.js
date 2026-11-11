'use strict';
const rQuote = s => JSON.stringify(String(s));
const rVec = (xs, format = rQuote) => {
 const values = xs.map(format);
 const inline = values.join(', ');
 if(inline.length <= 60)return 'c('+inline+')';
 const lines = [];
 for(let i=0;i<values.length;i+=6)lines.push(values.slice(i,i+6).join(', '));
 return 'c(\n  '+lines.join(',\n  ')+'\n)';
};
const rFactor = xs => 'factor('+rVec(xs)+', levels = '+rVec([...new Set(xs.map(String))])+')';
function rFrame(cols){
 return 'd <- data.frame(\n'+cols.map(([name,value])=>'  '+name+' = '+value.replace(/\n/g,'\n  ')).join(',\n')+'\n)\n';
}
const rPairBlock = [
 'pair <- combn(levels(d$condition), 2, simplify = FALSE)',
 'compare <- function(g) {',
 '  delta <- with(d, y[condition == g[1]] - y[condition == g[2]])',
 '  c(difference = mean(delta), p = 2 * pt(-abs(mean(delta) / (sd(delta) / sqrt(length(delta)))), df = length(delta)-1))',
 '}',
 'post <- as.data.frame(t(vapply(pair, compare, numeric(2))))',
 'rownames(post) <- vapply(pair, paste, collapse = " - ", FUN.VALUE = "")',
 'post$holm <- p.adjust(post$p, "holm")',
 'if (tab["condition", "Pr(>F)"] < alpha) print(post)'
].join('\n');
function rCase(z,a=.05,pooled=false){
 let model=z.model, rows=z.rows, c=i=>rows.map(row=>row[i]), g=i=>rFactor(c(i)), y=i=>rVec(c(i),String);
 let start='# '+z.title+'\n# 資料來源：'+z.source+'\n# 資料已內嵌，不需額外套件或檔案。\nalpha <- '+a+'\n\n';
 if(model==='ratio'){
  return start+rFrame([['group',g(0)],['y',y(1)]])+[
   '# 依資料順序固定分子與分母，雙尾各分配 alpha / 2。',
   'values <- split(d$y, d$group)',
   'fit <- var.test(values[[1]], values[[2]], conf.level = 1-alpha)',
   'print(fit)',
   'print(qf(c(alpha/2, 1-alpha/2), length(values[[1]])-1, length(values[[2]])-1))',
   ''
  ].join('\n');
 }
 if(model==='one'){
  return start+rFrame([['group',g(0)],['y',y(1)]])+[
   'tab <- anova(lm(y ~ group, data = d))',
   'print(tab)',
   'print(qf(1-alpha, tab$Df[1], tab$Df[2]))',
   '# 若整體顯著，以共同組內均方進行逐對 t 檢定，並以 Holm 校正。',
   'if (tab["group", "Pr(>F)"] < alpha) {',
   '  print(pairwise.t.test(d$y, d$group, pool.sd = TRUE, p.adjust.method = "holm"))',
   '  print(pairwise.t.test(d$y, d$group, pool.sd = TRUE, p.adjust.method = "bonferroni"))',
   '  print(TukeyHSD(aov(y ~ group, data = d), conf.level = 1-alpha))',
   '  means <- tapply(d$y, d$group, mean); n <- table(d$group)',
   '  pairs <- combn(seq_along(means), 2, simplify = FALSE)',
   '  scheffe <- sapply(pairs, function(g) {',
   '    stat <- diff(means[g])^2 / (tab["Residuals", "Mean Sq"] * sum(1/n[g]))',
   '    pf(stat / tab$Df[1], tab$Df[1], tab$Df[2], lower.tail = FALSE)',
   '  })',
   '  names(scheffe) <- vapply(pairs, function(g) paste(names(means)[g], collapse = " - "), "")',
   '  print(scheffe)',
   '}', ''
  ].join('\n');
 }
 if(model==='repeat'){
  rows=rows.flatMap(([id,...v])=>v.map((value,j)=>[id,z.headers[j+1],value]));
  return start+rFrame([['id',g(0)],['condition',g(1)],['y',y(2)]])+[
   '# 以受試者為區組，去除受試者間變異。',
   'tab <- anova(lm(y ~ id + condition, data = d))',
   'print(tab)',
   'print(qf(1-alpha, tab["condition", "Df"], tab["Residuals", "Df"]))',
   '# 若整體顯著，依相同受試者配對，並以 Holm 校正。',
   rPairBlock,''
  ].join('\n');
 }
 if(model==='mixed')rows=rows.flatMap(([A,id,...v])=>v.map((value,j)=>[id,A,z.headers[j+2],value]));
 let setup=rFrame(model==='two'?[['A',g(0)],['B',g(1)],['y',y(2)]]:[['id',g(0)],['A',g(1)],['B',g(2)],['y',y(3)]]);
 let plot='# 各細格的平均數與未校正 95% t 信賴區間。\ncell_ci <- function(y) {\n  m <- mean(y); w <- qt(.975, length(y)-1) * sd(y)/sqrt(length(y))\n  c(mean = m, lower = m-w, upper = m+w)\n}\nprint(lapply(with(d, split(y, list(A, B))), cell_ci))\nif (interactive()) with(d, interaction.plot(B, A, y, type = "b"))\n';
 let fit={
  two:'print(anova(lm(y ~ A * B, data = d)))',
  mixed:'# A 為受試者間因子，B 為受試者內因子。\nprint(summary(aov(y ~ A * B + Error(id / B), data = d)))',
  within:pooled?'# 課本做法：A、B、A:B 使用共同殘差均方。\nprint(anova(lm(y ~ id + A * B, data = d)))':'# 各效果以對應的受試者交互作用為誤差項。\nprint(summary(aov(y ~ A * B + Error(id / (A * B)), data = d)))'
 }[model];
 let simple=[
 '# 單純主要效果：固定另一因子的水準，各切片依設計重估誤差。',
 '# 主要解讀交互作用顯著時的結果；對整組切片檢定做 Holm 校正。',
 'effect <- function(s, formula, term) {',
 '  t <- anova(lm(formula, data = s))',
 '  c(SS = t[term, "Sum Sq"], df1 = t[term, "Df"], df2 = t["Residuals", "Df"], F = t[term, "F value"], p = t[term, "Pr(>F)"])',
 '}',
 'by_A <- lapply(split(d, d$A), effect, formula = y ~ '+(model==='two'?'B':'id + B')+', term = "B")',
 'by_B <- lapply(split(d, d$B), effect, formula = y ~ '+(model==='within'?'id + A':'A')+', term = "A")',
 'names(by_A) <- paste("B |", names(by_A))',
 'names(by_B) <- paste("A |", names(by_B))',
 'simple <- as.data.frame(do.call(rbind, c(by_A, by_B)))',
 'simple$holm <- p.adjust(simple$p, "holm")',
 'print(simple)',
 '',
 '# 課本做法：共用誤差均方，對所有切片做 Bonferroni 校正。',
 'cell_model <- lm(y ~ A * B, data = d)',
 'mse <- function(model) deviance(model) / df.residual(model)',
 model==='two'?'error_B <- error_A <- cell_model':
  model==='mixed'?'error_A <- cell_model\nerror_B <- lm(y ~ id + A * B, data = d)':
  'error_B <- error_A <- lm(y ~ id + A * B, data = d)',
 'shared <- simple[c("SS", "df1")]',
 'shared$df2 <- c(rep(df.residual(error_B), length(by_A)), rep(df.residual(error_A), length(by_B)))',
 'shared$F <- shared$SS / shared$df1 / c(rep(mse(error_B), length(by_A)), rep(mse(error_A), length(by_B)))',
 'shared$p <- pf(shared$F, shared$df1, shared$df2, lower.tail = FALSE)',
 'shared$bonferroni <- p.adjust(shared$p, "bonferroni")',
 'print(shared)', ''
 ].join('\n');
 return start+setup+fit+'\n\n'+plot+'\n'+simple;
}
function rSurvey(variable,group,rows,a=.05){
 return '# '+variable+'｜依'+group+'分組\n# 來源：data3.xlsx 的公開分組摘要；不含逐筆問卷。\nalpha <- '+a+'\n\n'+
 rFrame([['group',rVec(rows.map(x=>x[0]))],['n',rVec(rows.map(x=>x[1]),String)],['mean',rVec(rows.map(x=>x[2]),String)],['variance',rVec(rows.map(x=>x[3]),String)]])+[
  '# 加權平均與平方和：只需每組樣本數、平均數、樣本變異數。',
  'stopifnot(nrow(d) >= 2, all(d$n >= 2))',
  'grand_mean <- weighted.mean(d$mean, d$n)',
  'ss <- c(sum(d$n * (d$mean - grand_mean)^2), sum((d$n - 1) * d$variance))',
  'df <- c(nrow(d) - 1, sum(d$n) - nrow(d))',
  'ms <- ss / df',
  'F_obs <- ms[1] / ms[2]',
  'p <- pf(F_obs, df[1], df[2], lower.tail = FALSE)',
  'F_critical <- qf(1-alpha, df[1], df[2])',
  'print(d)',
  'print(data.frame(row.names = c("Between", "Within", "Total"),',
  '  SS = c(ss, sum(ss)), df = c(df, sum(df)), MS = c(ms, sum(ss)/sum(df)),',
  '  F = c(F_obs, NA, NA), p = c(p, NA, NA)))',
  'print(c(F_critical = F_critical, partial_eta_sq = ss[1]/sum(ss)))',
  '# 以共同組內均方比較兩組，並校正整組比較。',
  'pairs <- combn(nrow(d), 2, simplify = FALSE)',
  'post <- as.data.frame(t(sapply(pairs, function(g) {',
  '  delta <- d$mean[g[1]] - d$mean[g[2]]',
  '  t <- delta / sqrt(ms[2] * sum(1/d$n[g]))',
  '  c(difference = delta, p = 2 * pt(-abs(t), df[2]),',
  '    scheffe = pf(t^2/df[1], df[1], df[2], lower.tail = FALSE))',
  '})))',
  'rownames(post) <- vapply(pairs, function(g) paste(d$group[g], collapse = " - "), "")',
  'post$holm <- p.adjust(post$p, "holm")',
  'post$bonferroni <- p.adjust(post$p, "bonferroni")',
  'print(post)',''
 ].join('\n');
}
if(typeof module!=='undefined')module.exports={rCase,rSurvey};
