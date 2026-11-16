exercise_answers <- function(id, raw) {
 if(id=='ex13'){
  fields<-c('性別','辯手次序','經驗','網路票選','個人成績')
  d<-raw[fields]
  a<-cor.test(d[['網路票選']],d[['個人成績']])
  z<-scale(d[c('經驗','個人成績')])
  quadrants<-ifelse(z[,1]>=0,ifelse(z[,2]>=0,'I','IV'),ifelse(z[,2]>=0,'II','III'))
  return(tagList(
   h4('變異數、共變數與相關矩陣'),
   p('變異數在共變數矩陣的對角線，非對角線是共變數。'),
   tags$pre(paste(capture.output(print(round(cov(d),4))),collapse='\n')),
   tags$pre(paste(capture.output(print(round(cor(d),4))),collapse='\n')),
   h4('網路票選與個人成績'),
   p('r = ',num(a$estimate),'；t(',a$parameter,') = ',num(a$statistic),'；雙尾 p = ',format.pval(a$p.value,digits=4),'。'),
   p('在上方選「網路票選」與 Pearson 相關可查看散布圖。'),
   h4('經驗與個人成績的象限'),
   tags$pre(paste(capture.output(print(data.frame(觀測=seq_len(nrow(d)),經驗=d[['經驗']],成績=d[['個人成績']],
    zX=num(z[,1]),zY=num(z[,2]),象限=quadrants),row.names=FALSE)),collapse='\n')),
   p('同方向的配對位於 I、III 象限；反方向的配對位於 II、IV。表中的 zX、zY 可定位配對離各自平均的距離。')))
 }
 xs<-head(names(raw),-1)
 a<-prepare_design(raw,'lm',xs,tail(names(raw),1))
 fit<-fit_design(a$data)
 b<-coef(fit)
 standardized<-b[-1]*vapply(a$data[-1],sd,numeric(1))/sd(a$data$y)
 coefficients<-summary(fit)$coefficients[-1,,drop=FALSE]
 formula<-paste0('ŷ = ',num(b[1]),paste(sprintf(' %+.4f × %s',b[-1],xs),collapse=''))
 basic<-tagList(h4('迴歸方程式與 ANOVA'),p(formula),
  tags$pre(paste(capture.output(print(anova(fit))),collapse='\n')),
  p('標準化係數 β = b × SD(X) / SD(Y)。',paste(paste(xs,num(standardized),sep=' = '),collapse='；')))
 if(id=='ex14'){
  perfect<-which(raw[['個人成績']]==10)
  return(tagList(basic,
   p('截距是零年經驗時的預測成績。每多一年經驗，預測成績增加 ',num(b[2]),' 分。斜率 t = ',num(coefficients[1,3]),'，p = ',format.pval(coefficients[1,4],digits=4),'。'),
   p('滿分者可能有不同經驗，因此預測值與殘差不同。'),
   tags$pre(paste(capture.output(print(data.frame(題表列=perfect,經驗=raw[['經驗']][perfect],
    預測=num(fitted(fit)[perfect]),殘差=num(residuals(fit)[perfect])),row.names=FALSE)),collapse='\n')),
   p('經驗 2.5 年時，預測成績 = ',num(predict(fit,newdata=data.frame(x1=2.5))),'。')))
 }
 if(id=='ex15a'){
  residual<-residuals(fit)
  diag<-vif_table(fit)
  strongest<-which.max(abs(standardized))
  weakest<-which.min(abs(standardized))
  significant<-xs[coefficients[,4]<.05]
  return(tagList(basic,
   p('依 |β| 比較，條件關聯最強的是',xs[strongest],'，最弱的是',xs[weakest],'。在 α = .05 下達顯著的係數：',paste(significant,collapse='、'),'。'),
   p('模型有四個預測欄，殘差 df = 9 − 4 − 1 = 4。R² 是樣本內解釋比例，調整後 R² 有欄數懲罰。'),
   p('有號殘差最小是第 ',which.min(residual),' 筆（',num(min(residual)),'），最大是第 ',which.max(residual),' 筆（',num(max(residual)),'）。絕對殘差最小是第 ',which.min(abs(residual)),' 筆。'),
   p('VIF 最大的欄位是',xs[which.max(diag$VIF)],'（',num(max(diag$VIF)),'）。'),
   p('女生、結辯（辯次 3）、經驗 0 年、網路票選 10 分時，預測成績 = ',
    num(predict(fit,newdata=data.frame(x1=0,x2=3,x3=0,x4=10))),'。')))
 }
 tagList(basic,
  p('模型一納入性別與經驗；模型二再加入辯手次序與網路票選。增量 F 考驗新增兩欄能否改善同一批樣本的擬合。'),
  p('兩模型的性別與經驗係數各以該模型其餘變數為控制條件。因此係數及標準誤可能隨加入新變數而改變。'),
  p('縮減模型依 9 筆、2 個預測欄計算，殘差 df = 6。習題工作簿的摘要文字有一處 df 誤植，教材依章末題目與實際模型自由度呈現。'))
}
