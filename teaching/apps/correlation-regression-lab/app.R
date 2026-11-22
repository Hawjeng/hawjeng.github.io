library(shiny)
source("stats.R",encoding="UTF-8",local=TRUE)
source("exercises.R",encoding="UTF-8",local=TRUE)
cases <- jsonlite::fromJSON("data/cases.json",simplifyVector=FALSE)
read_data <- function(file) read.csv(file,fileEncoding="UTF-8-BOM",check.names=FALSE,stringsAsFactors=FALSE)
survey_labels <- c(Zname='星座',學院別='學院',性別='性別',性格='自評人格',社團='課外活動',
 手機='手機品牌',方案='上網方案',Age='年齡',CT='手機遊戲成癮',A1='Facebook 好友數',
 A2='LINE 好友數',A3='LINE 群組數',A4='Instagram 追蹤者數',A5='Instagram 追蹤數',
 B1='玩手遊時間',B2='影片時間',B3='外送次數',B4='搭車次數',B5='電量焦慮',
 出生年='出生年',Iphone='是否為 iPhone',吃到飽='是否吃到飽')
case_data <- function(id) read_data(file.path("data",paste0(id,".csv")))
case_choices <- function(exercise) {
 ids <- names(Filter(function(z)identical(z$exercise,exercise),cases))
 setNames(ids,vapply(cases[ids],function(x)x$title,character(1)))
}
methods <- c('Pearson 積差相關'='cor','點二系列相關'='pb','線性／多元迴歸'='lm','虛擬迴歸'='dummy','多項式迴歸'='poly')
card <- function(...) div(class="card",...)
row_controls <- function(...) div(class="controls",...)
select <- function(...) selectInput(...,selectize=FALSE)
num <- function(x,digits=4){
 x[!is.na(x)&abs(x)<.5*10^-digits]<-0
 sub('[.]$','',sub('0+$','',formatC(x,format='f',digits=digits)))
}
chart_num <- function(x)num(x,3)
checks <- function(expr) tryCatch(expr,error=function(e){
 if(inherits(e,"shiny.silent.error"))stop(e)
 validate(need(FALSE,conditionMessage(e)))
})
show_table <- function(t) HTML(paste0('<div class="table-scroll"><table><thead><tr>',
  paste0('<th>',htmltools::htmlEscape(names(t)),'</th>',collapse=''),'</tr></thead><tbody>',
  paste(apply(t,1,function(row)paste0('<tr>',paste0('<td>',htmltools::htmlEscape(row),'</td>',collapse=''),'</tr>')),collapse=''),'</tbody></table></div>'))
diagnostic_data <- function(a){
 fit<-fit_design(a$data)
 external<-suppressWarnings(rstudent(fit))
 df<-df.residual(fit)-1L
 p<-rep(NA_real_,nrow(a$data))
 if(df>0){
  valid<-!is.na(external)
  p[valid]<-2*pt(-abs(external[valid]),df)
 }
 adjusted<-p.adjust(p,method='bonferroni')
 data.frame(編號=a$observation,觀察值=a$data$y,預測值=unname(fitted(fit)),
  殘差=unname(residuals(fit)),標準化殘差=unname(rstandard(fit)),
  外部學生化殘差=unname(external),自由度=if(df>0L)df else NA_integer_,
  p=unname(p),校正後p=unname(adjusted),
  顯著異常=ifelse(is.na(adjusted),'—',ifelse(adjusted<.05,'是','否')),check.names=FALSE)
}
display_result <- function(analysis, extra=NULL) {
 d <- analysis$data
 kind <- analysis$kind
 labels <- analysis$labels
 if(kind %in% c('cor','pb')){
  r <- cor_fit(d)
  return(tagList(
   h3(paste0(if(kind=='pb')analysis$x_name else labels[2]," × ",labels[1])),
   p('配對有效 n = ',nrow(d),'｜r = ',num(r$estimate),'｜t = ',num(r$statistic),'｜df = ',r$parameter),
   p('雙尾 p = ',format.pval(r$p.value,digits=4),'｜95% Fisher z 信賴區間 [',paste(num(r$conf.int),collapse=', '),']'),
   p('r = SP / √(SSₓ × SSᵧ)；t = r × √[(n − 2)/(1 − r²)]。'),
   if(kind=='pb')p('正相關表示編碼 1 組的平均數較高。')))
 }
 fit <- fit_design(d)
 s <- summary(fit)
 f <- s$fstatistic
 coef <- s$coefficients
 ci <- confint(fit)
 diag <- vif_table(fit)
 t <- data.frame(變數=c('截距',unname(labels[-1])),b=num(coef[,1]),SE=num(coef[,2]),t=num(coef[,3]),
  p=format.pval(coef[,4],digits=4),下限=num(ci[,1]),上限=num(ci[,2]),
  顯著不為零=ifelse(is.na(coef[,4]),'—',ifelse(coef[,4]<.05,'是','否')))
 tagList(h3(paste0('結果變數｜',labels[1])),
  p('有效 n = ',nrow(d),'｜R² = ',num(s$r.squared),'｜調整後 R² = ',num(s$adj.r.squared),'｜殘差 SE = ',num(s$sigma)),
  p('F(',f[2],', ',f[3],') = ',num(f[1]),'｜p = ',format.pval(pf(f[1],f[2],f[3],lower.tail=FALSE),digits=4)),
  show_table(t),
  if(!is.null(diag))tagList(h4('共線性診斷'),p('允差 = 1 − R²ⱼ；VIF = 1 / 允差。每欄都用其他設計欄來預測。'),
   show_table(transform(diag,變數=unname(labels[colnames(d)[-1]]),允差=num(允差),VIF=num(VIF)))),
  if(!is.null(extra))extra)
}
shade_quadrants <- function(x,y,limits){
 mx<-mean(x);my<-mean(y)
 rect(c(mx,limits[1],limits[1],mx),c(my,my,limits[3],limits[3]),
      c(limits[2],mx,mx,limits[2]),c(limits[4],limits[4],my,my),
      col=c('#e8f4f1','#f6f0e7','#e8f4f1','#f6f0e7'),border=NA)
}
quadrant_colors <- c('#147684','#a64b22','#6953a0','#35663d','#626d77')
quadrant_index <- function(x,y,mx=mean(x),my=mean(y)){
 dx<-x-mx;dy<-y-my
 on_axis<-abs(dx)<=1e-10*pmax(1,abs(x),abs(mx)) | abs(dy)<=1e-10*pmax(1,abs(y),abs(my))
 q<-ifelse(dx>0,ifelse(dy>0,1L,4L),ifelse(dy>0,2L,3L))
 q[on_axis]<-5L
 q
}
add_quadrants <- function(x,y) {
 center_x<-mean(x);center_y<-mean(y)
 limits<-par('usr')
 abline(v=center_x,h=center_y,col='#687e83',lty=2,lwd=1.5)
 mtext(expression(bar(X)),side=1,at=center_x,line=1.5,col='#465e63')
 mtext(expression(bar(Y)),side=2,at=center_y,line=2.35,col='#465e63',las=1)
 margin_x<-diff(limits[1:2])*.03; margin_y<-diff(limits[3:4])*.04
 text(limits[c(2,1,1,2)]+c(-1,1,1,-1)*margin_x,
      c(rep(limits[4]-margin_y,2),rep(limits[3]+margin_y,2)),
      paste0('Q',1:4),col='#465e63',font=2,cex=.87)
 counts<-tabulate(quadrant_index(x,y,mx=center_x,my=center_y),nbins=5)
 caption<-paste0(paste0('Q',1:4,': ',counts[1:4],collapse='   |   '),'   |   On mean lines: ',counts[5])
 mtext(caption,side=1,line=4.35,cex=.82,col='#465e63')
}
axis_scale <- function(values, limits, standardize, discrete=NULL) {
 center<-mean(values);spread<-sd(values)
 if(standardize&&is.finite(spread)&&spread>0){
  bound<-(limits-center)/spread
  first<-ceiling(2*bound[1]);last<-floor(2*bound[2])
  ticks<-if(first<=last)seq.int(first,last)/2 else numeric()
  # Keep half-step grid lines. On unusually long axes, label a subset to avoid overlap.
  step<-if(length(ticks)>30)2 else if(length(ticks)>17)1 else .5
  labels<-ifelse(abs(ticks/step-round(ticks/step))<1e-10,as.character(ticks),'')
  return(list(at=center+spread*ticks,labels=labels))
 }
 list(at=discrete,labels=TRUE)
}
plot_controls <- function(prefix) {
 div(class='plot-controls',
  checkboxInput(paste0(prefix,'_quadrants'),'四象限'),
  checkboxInput(paste0(prefix,'_mean'),'平均交點'),
  checkboxInput(paste0(prefix,'_equation'),'方程式'),
  checkboxInput(paste0(prefix,'_zx'),'X 軸 z'),
  checkboxInput(paste0(prefix,'_zy'),'Y 軸 z'))
}
equation_label <- function(a,zx,zy,plot_label=FALSE,model=NULL){
 d<-a$data;kind<-a$kind
 if(kind %in% c('cor','pb'))cor_fit(d)
 if(is.null(model))model<-fit_design(d)
 x<-d[[2]];y<-d$y
 mult<-kind=='lm'&&ncol(d)>2
 named_design<-mult||kind=='dummy'
 center_y<-if(zy)mean(y) else 0
 scale_y<-if(zy)sd(y) else 1
 target<-if(plot_label){if(zy)'zY_hat' else 'Y_hat'} else if(zy)'ẑᵧ' else 'ŷ'
 beta<-unname(coef(model))
 if(named_design){
  coefs<-c((beta[1]-center_y)/scale_y,beta[-1]/scale_y)
  terms<-if(plot_label){if(mult)paste0('X',seq_len(ncol(d)-1L)) else paste0('D',seq_len(ncol(d)-1L))}else unname(a$labels[-1])
 }else{
  center_x<-if(zx)mean(x) else 0
  scale_x<-if(zx)sd(x) else 1
  # Substitute X = mean(X) + SD(X) × zX into the fitted polynomial.
  degrees<-seq_along(beta)-1L
  coefs<-vapply(degrees,function(j){
   k<-degrees[degrees>=j]
   sum(beta[k+1L]*choose(k,j)*center_x^(k-j)*scale_x^j)/scale_y
  },numeric(1))
  coefs[1]<-coefs[1]-center_y/scale_y
  term<-if(zx){if(plot_label)'zX' else 'zₓ'} else 'X'
  powers<-if(plot_label)c('^2','^3') else c('²','³')
  terms<-c(term,if(length(beta)>2)paste0(term,powers[seq_len(length(beta)-2L)]))
 }
 coefs[abs(coefs)<.00005]<-0
 paste0(target,' = ',chart_num(coefs[1]),paste(sprintf(' %s %s %s %s',
  ifelse(coefs[-1]<0,if(plot_label)'-' else '−','+'),chart_num(abs(coefs[-1])),if(plot_label)'*' else '×',terms),collapse=''))
}
plot_equation <- function(a,zx,zy){
 d<-a$data;kind<-a$kind
 mult<-kind=='lm'&&ncol(d)>2
 named_design<-mult||kind=='dummy'
 div(class='equation-box',span(class='sr-only','迴歸方程式 ',equation_label(a,zx,zy)),
  if(kind=='pb')p('方程式中的 X 為 0／1 組別編碼。'),
  if(named_design)p(paste(paste0(if(mult)'X' else 'D',seq_len(ncol(d)-1L),' = ',unname(a$labels[-1])),collapse='｜')),
  if(mult)p('圖的 X 軸是模型預測值；方程式列的是完整模型的原始預測變數。'),
  if(named_design&&zx)p('X 軸的 z 分數只套用到圖上的橫軸。'))
}
plot_x <- function(a,fit=NULL){
 d<-a$data
 if(a$kind=='lm'&&ncol(d)>2)return(fitted(if(is.null(fit))fit_design(d) else fit))
 if(a$kind=='dummy'&&ncol(d)>2)return(max.col(cbind(1-rowSums(d[-1]),d[-1]))-1L)
 d[[2]]
}
plot_offsets <- function(x) {
 offset<-numeric(length(x))
 for(group in unique(x)){
  rows<-which(x==group)
  if(length(rows)>1L)offset[rows]<-.16*sin(seq_along(rows)*2.399963)
 }
 offset
}
pair_label <- function(x,y,zx,zy)paste0('(',paste(ifelse(c(zx,zy),'0',chart_num(c(x,y))),collapse=', '),')')
plot_analysis <- function(a,quadrants=FALSE,zx=FALSE,zy=FALSE,show_mean=FALSE){
 d<-a$data;kind<-a$kind
 model_plot<-kind=='lm'&&ncol(d)>2
 group_plot<-kind %in% c('dummy','pb')
 fit<-if(kind %in% c('cor','pb'))NULL else fit_design(d)
 palette<-c('#176f7a','#ac512e','#7465a1','#567537','#a15378')
 x_plot<-plot_x(a,fit)
 groups<-sort(unique(x_plot))
 point_colors<-if(quadrants)quadrant_colors[quadrant_index(x_plot,d$y)] else rep('#176f7a',nrow(d))
 xlim<-if(group_plot)range(groups)+c(-.62,.62) else range(x_plot)
 ylim<-extendrange(d$y,f=.11)
 sx<-sd(x_plot);sy<-sd(d$y)
 equal_z<-zx&&zy&&is.finite(sx)&&sx>0&&is.finite(sy)&&sy>0
 if(equal_z){
  mx<-mean(x_plot);my<-mean(d$y)
  zlim<-extendrange(c((xlim-mx)/sx,(range(d$y)-my)/sy,0),f=.07)
  xlim<-mx+sx*zlim
  ylim<-my+sy*zlim
 }
 par(mar=c(if(quadrants)5.3 else 3.8,4.2,.7,1.1),family='sans',las=1,
  pty='s',
  cex.axis=1.0,cex.lab=1.03,col.axis='#456168',col.lab='#244c55',fg='#9bb1b5')
 plot(x_plot,d$y,type='n',xlim=xlim,ylim=ylim,axes=FALSE,
  asp=if(equal_z)sx/sy else NA_real_,
  xlab=paste0(if(group_plot)'Group' else if(model_plot)'Fitted Y' else 'X',if(zx)' (z)'),
  ylab=paste0(if(model_plot)'Observed Y' else 'Y',if(zy)' (z)'))
 limits<-par('usr')
 if(quadrants)shade_quadrants(x_plot,d$y,limits)
 else rect(limits[1],limits[3],limits[2],limits[4],col='#f7fafb',border=NA)
 ticks_x<-axis_scale(x_plot,limits[1:2],zx,if(group_plot)groups else NULL)
 ticks_y<-axis_scale(d$y,limits[3:4],zy)
 abline(h=if(is.null(ticks_y$at))axTicks(2) else ticks_y$at,col='#dce8ea')
 if(!group_plot)abline(v=if(is.null(ticks_x$at))axTicks(1) else ticks_x$at,col='#e5eef0')
 axis(1,at=ticks_x$at,labels=ticks_x$labels,col='#a1b6b9',col.ticks='#a1b6b9')
 axis(2,at=ticks_y$at,labels=ticks_y$labels,col='#a1b6b9',col.ticks='#a1b6b9')
 if(quadrants)add_quadrants(x_plot,d$y)
 plot_locations<-x_plot
 if(group_plot){
  for(i in seq_along(groups)){
   x<-groups[i]
   y<-d$y[x_plot==x]
   # Deterministic offsets prevent point movement when toggling overlays.
   offset<-plot_offsets(x_plot)[x_plot==x]
   color<-palette[(i-1L)%%length(palette)+1L]
   plot_locations[x_plot==x]<-x+offset
   dot_color<-if(quadrants)point_colors[x_plot==x] else color
   points(x+offset,y,pch=21,cex=if(length(y)>60).85 else 1.18,
    col=adjustcolor(dot_color,.83),bg=adjustcolor(dot_color,.52),lwd=.8)
   segments(x-.22,mean(y),x+.22,mean(y),col=color,lwd=3)
   points(x,mean(y),pch=23,bg=color,col='white',cex=1.42,lwd=1)
  }
 }else{
  if(model_plot)abline(0,1,col='#284e85',lwd=2,lty=2)
  else if(kind=='poly'){
   x<-seq(min(x_plot),max(x_plot),length.out=150)
   nd<-as.data.frame(lapply(seq_len(ncol(d)-1),function(i)x^i))
   names(nd)<-names(d)[-1]
   lines(x,predict(fit,nd),col='#284e85',lwd=2.6)
  }else abline(lm(y~x1,d),col='#284e85',lwd=2.6)
  points(x_plot,d$y,pch=21,cex=if(nrow(d)>100).82 else 1.16,lwd=.8,
   col=adjustcolor(point_colors,.8),bg=adjustcolor(point_colors,if(nrow(d)>100).38 else .66))
 }
 if(show_mean){
  mx<-mean(x_plot);my<-mean(d$y)
  points(mx,my,pch=21,col='#244c55',bg='white',cex=1.27,lwd=1.6)
  label<-pair_label(mx,my,zx,zy)
  px<-diff(limits[1:2])*.016;py<-diff(limits[3:4])*.025
  w<-strwidth(label,cex=.86);h<-strheight(label,cex=.86)
  candidates<-rbind(c(mx+px,my+py),c(mx-px-w,my+py),c(mx+px,my-py-h),c(mx-px-w,my-py-h))
  overlap<-apply(candidates,1,function(pos){
   if(pos[1]<limits[1]||pos[1]+w>limits[2]||pos[2]<limits[3]||pos[2]+h>limits[4])return(Inf)
   sum(plot_locations>=pos[1]-px & plot_locations<=pos[1]+w+px &
       d$y>=pos[2]-py & d$y<=pos[2]+h+py)
  })
  location<-candidates[which.min(overlap),]
  text(location[1],location[2],label,adj=c(0,0),cex=.86,font=2,col='#244c55')
 }

}
plot_key <- function(a){
 labels<-a$labels
 if(a$kind %in% c('pb','dummy')){
  return(div(class='plot-key',
   span(paste0('Y｜',labels[1])),
   lapply(seq_along(a$groups),function(i)span(paste0(i-1L,'｜',a$groups[i]))),
   span('◆ 組別平均')))
 }
 if(a$kind=='lm'&&ncol(a$data)>2)return(div(class='plot-key',span(paste0('Y｜',labels[1])),span('橫軸為預測值；藍色虛線為預測等於觀測')))
 div(class='plot-key',span(paste0('X｜',labels[2])),span(paste0('Y｜',labels[1])),span('藍色線｜擬合值'))
}
data_controls <- function(prefix,d,kind,current_x=NULL,current_y=NULL){
 numeric_names <- names(d)[vapply(d,is.numeric,logical(1))]
 category_names <- setdiff(names(d),numeric_names)
 groups <- if(length(category_names))unique(c(category_names,numeric_names[vapply(d[numeric_names],function(x)length(unique(na.omit(x)))<=15,logical(1))])) else numeric_names
 x_choices <- if(kind %in% c('pb','dummy'))groups else numeric_names
 default_y <- if(prefix=='survey' && '手機遊戲成癮' %in% numeric_names)'手機遊戲成癮' else tail(numeric_names,1)
 y <- if(length(current_y)==1L && current_y %in% numeric_names) current_y else default_y
 x <- setdiff(intersect(current_x,x_choices),y)
 if(!length(x))x <- if(prefix=='survey' && '玩手遊時間' %in% x_choices && !kind %in% c('pb','dummy'))'玩手遊時間' else head(setdiff(x_choices,y),1)
 if(kind!='lm')x<-head(x,1)
 row_controls(
  select(paste0(prefix,'_y'),'Y 結果變數',numeric_names,selected=y),
  selectInput(paste0(prefix,'_x'),'X 預測／分組變數',x_choices,multiple=kind=='lm',
   selected=x,
   selectize=kind=='lm'),
  if(kind=='poly')select(paste0(prefix,'_degree'),'多項式次數',2:3))
}
cor_critical <- function(n,alpha,tails){
 df<-n-2L
 t<-qt(1-alpha/tails,df)
 data.frame(N=n,df=df,t=t,r=t/sqrt(t^2+df))
}
critical_controls <- function(){
 card(h3('樣本數與相關係數臨界值'),
  p('檢定 H₀：ρ = 0 時，df = N − 2。點選任一張圖或拖曳它的垂直虛線，兩張圖會一起更新樣本數 N。'),
  row_controls(select('critical_tails','檢定方向',c('雙尾'='2','右尾'='right','左尾'='left')),
   select('critical_alpha','顯著水準 α',c('0.10'='.10','0.05'='.05','0.02'='.02','0.01'='.01'),selected='.05')),
  sliderInput('critical_n','配對樣本數 N',min=3,max=2000,value=10,step=1,width='100%',sep=''),
  sliderInput('critical_r','觀察相關 |r|',min=.01,max=.99,value=.10,step=.01,width='100%',sep=''),
  div(class='paired-curves',
   div(h4('圖 13.6｜自由度與相關係數臨界值'),critical_curve_svg(),
    uiOutput('critical_lookup'),tags$details(tags$summary('查看臨界值對照表'),uiOutput('critical_table'))),
   div(h4('圖 13.7｜樣本數與雙尾 p 值'),uiOutput('p_curve'),uiOutput('p_lookup'))))
}
critical_curve_svg <- function(){
 n<-3:2000
 values<-lapply(c(.01,.05,.10),function(alpha)cor_critical(n,alpha,2)$r)
 values_json<-jsonlite::toJSON(values,digits=9)
 tags$div(id='critical-curve',class='interactive-correlation-curve',`data-kind`='critical',`data-values`=as.character(values_json))
}
ui <- fluidPage(
 tags$head(tags$link(rel="stylesheet", href="https://hawjeng.github.io/assets/lab-return.css")),
 tags$head(tags$title('相關與迴歸｜統計互動教材'),tags$link(rel='stylesheet',href='style.css?v=correlation-formula-size'),
  tags$script(src='console.js?v=analysis-files'),tags$script(src='critical-curve.js?v=paired-curves')),
 div(class='mast',tags$a(class='lab-return',href='https://hawjeng.github.io/resources.html#statistics-apps','← 返回教學與專案'),
  p(class='eyebrow',lang='en','STATISTICS LAB · CORRELATION AND REGRESSION'),
  h1('相關與迴歸'),p('從兩個變數的散布圖，到多元模型與個案診斷。')),
 tabsetPanel(id='unit',
  tabPanel('原理說明',tabsetPanel(id='theory_topic',
   tabPanel('相關分析',value='critical',
    div(class='correlation-layout',
     div(includeHTML('www/correlation-story.html'),includeHTML('www/correlation-formulas.html')),
     card(h3('操作散布圖的四象限'),
      p('拖動觀測點，看看各點落在哪個象限，以及 Pearson r 如何改變。'),
      tags$iframe(class='diag-frame correlation-frame',title='可拖曳的四象限散布圖',src='influence.html?mode=correlation&v=pearson-overlay'))),
    includeHTML('www/correlation.html'),
    critical_controls()),
   tabPanel('迴歸分析',value='basics',
    includeHTML('www/theory.html'),
    div(class='correlation-layout',div(includeHTML('www/simple-regression.html')),includeHTML('www/diagnostics.html'))),
   tabPanel('多元迴歸',value='multiple',
    div(class='correlation-layout',div(includeHTML('www/multiple-intro.html')),
     card(h3('比較預測值與實際值'),
      select('multiple_example','課本案例',c('家庭開銷｜人口數與社經地位'='house','體重｜年齡與身高'='weight')),
      div(class='chart-panel',plotOutput('multiple_fit_plot',height=420)),
      uiOutput('multiple_fit_summary'))),
    includeHTML('www/multiple.html')))),
  tabPanel('課本範例',card(select('case','課本案例',case_choices(FALSE)),uiOutput('case_options'),uiOutput('case_source'),downloadButton('case_csv','下載案例原始 CSV')),
   card(plot_controls('book'),div(class='chart-panel',uiOutput('book_plot_key'),div(class='plot-surface',plotOutput('book_plot',height=520,hover=hoverOpts('book_hover',delay=75,nullOutside=TRUE)),uiOutput('book_point_tip',class='plot-label-layer'),uiOutput('book_plot_label',class='plot-label-layer')),uiOutput('book_equation_text'),tags$button(type='button',class='btn btn-default',onclick='downloadPlot(this)','下載圖形 PNG')),div(class='chart-results',uiOutput('book_result'),uiOutput('book_diagnostics')))),
  tabPanel('習題解答',card(select('exercise','習題',case_choices(TRUE)),uiOutput('exercise_options'),uiOutput('exercise_source'),downloadButton('exercise_csv','下載習題原始 CSV')),
   card(plot_controls('exercise'),div(class='chart-panel',uiOutput('exercise_plot_key'),div(class='plot-surface',plotOutput('exercise_plot',height=520,hover=hoverOpts('exercise_hover',delay=75,nullOutside=TRUE)),uiOutput('exercise_point_tip',class='plot-label-layer'),uiOutput('exercise_plot_label',class='plot-label-layer')),uiOutput('exercise_equation_text'),tags$button(type='button',class='btn btn-default',onclick='downloadPlot(this)','下載圖形 PNG')),div(class='chart-results',uiOutput('exercise_result'),uiOutput('exercise_diagnostics')),uiOutput('worked_answers'))),
  tabPanel('調查習作',
   card(h3('手機使用行為調查'),p('預設案例為玩手遊時間與手機遊戲成癮的 Pearson 相關。可切換全體或單一星座，也可改選變數。'),
    tags$details(tags$summary('載入其他調查資料'),
     p('將 data3.xlsx 的 Cleaned_Data 工作表另存為 CSV UTF-8，再選取 CSV。'),
     fileInput('survey_file','選擇調查逐筆資料 CSV',accept='.csv')),
    row_controls(uiOutput('survey_group'),select('survey_method','分析方法',methods)),uiOutput('survey_options'),uiOutput('survey_levels'),
    downloadButton('raw_survey','下載逐筆分析資料 CSV')),
   card(plot_controls('survey'),div(class='chart-panel',uiOutput('survey_plot_key'),div(class='plot-surface',plotOutput('survey_plot',height=520,hover=hoverOpts('survey_hover',delay=75,nullOutside=TRUE)),uiOutput('survey_point_tip',class='plot-label-layer'),uiOutput('survey_plot_label',class='plot-label-layer')),uiOutput('survey_equation_text'),tags$button(type='button',class='btn btn-default',onclick='downloadPlot(this)','下載圖形 PNG')),div(class='chart-results',uiOutput('survey_result'),uiOutput('survey_diagnostics'))),
   includeHTML('www/survey-practice.html')),
  tabPanel('R 與 Python 語法',
   card(h3('語法與執行結果'),
    row_controls(select('code_scope','分析來源',c('課本範例'='book','習題解答'='exercise','調查習作'='survey','自行輸入'='manual')),
     select('lang','語言',c('R','Python'))),
    p('沿用各單元目前的設定。下載語法與 analysis.csv，放在同一資料夾後依畫面指令執行。'),
    div(class='console-grid',
     div(uiOutput('script_text')),
     div(h4('主控台原始輸出'),uiOutput('console'))))),
  tabPanel('自行輸入',
   card(h3('輸入逐筆資料'),p('第一列填變數名稱，欄位以逗號分隔。類別可填文字，缺失值留空。'),
    textAreaInput('manual_csv','CSV 資料','學習時間,練習次數,成績\n2,3,61\n4,4,68\n5,8,75\n7,5,77\n8,7,83\n9,10,88\n10,8,91',rows=8,width='100%'),
    select('manual_method','分析方法',methods),uiOutput('manual_options'),uiOutput('manual_levels')),
   card(plot_controls('manual'),div(class='chart-panel',uiOutput('manual_plot_key'),div(class='plot-surface',plotOutput('manual_plot',height=520,hover=hoverOpts('manual_hover',delay=75,nullOutside=TRUE)),uiOutput('manual_point_tip',class='plot-label-layer'),uiOutput('manual_plot_label',class='plot-label-layer')),uiOutput('manual_equation_text'),tags$button(type='button',class='btn btn-default',onclick='downloadPlot(this)','下載圖形 PNG')),div(class='chart-results',uiOutput('manual_result'),uiOutput('manual_diagnostics'))))))
server <- function(input,output,session){
 multiple_example<-reactive({
  d<-case_data(req(input$multiple_example))
  prepare_design(d,'lm',head(names(d),-1),tail(names(d),1))
 })
 output$multiple_fit_plot<-renderPlot(plot_analysis(multiple_example()))
 output$multiple_fit_summary<-renderUI({
  a<-multiple_example()
  fit<-fit_design(a$data)
  m<-summary(fit)
  v<-vif_table(fit)
  v$變數<-unname(a$labels[-1])
  v$允差<-num(v$允差)
  v$VIF<-num(v$VIF)
  tagList(p(paste0('有效 N = ',nobs(fit),'｜R² = ',num(m$r.squared),'｜調整後 R² = ',num(m$adj.r.squared))),
   h4('各預測變數的允差與 VIF'),show_table(v))
 })
 critical_settings<-reactive({
  req(input$critical_n,input$critical_alpha,input$critical_tails)
  direction<-input$critical_tails
  list(n=input$critical_n,alpha=as.numeric(input$critical_alpha),tails=if(direction=='2')2L else 1L,
       sign=if(direction=='2')'±' else if(direction=='left')'−' else '')
 })
 observeEvent(input$critical_curve_n,{
  n<-input$critical_curve_n
  if(is.numeric(n)&&length(n)==1L&&is.finite(n)&&n>=3&&n<=2000)
   updateSliderInput(session,'critical_n',value=round(n))
 })
 p_for_r<-function(n,r)2*pt(-r*sqrt((n-2)/(1-r^2)),df=n-2)
 output$p_curve<-renderUI({
  r<-req(input$critical_r)
  alpha<-as.numeric(req(input$critical_alpha))
  n<-3:2000
  values<-c(.05,.10,.30,r)
  tags$div(class='interactive-correlation-curve',`data-kind`='p',
   `data-alpha`=alpha,`data-r`=r,
   `data-values`=as.character(jsonlite::toJSON(lapply(values,function(v)p_for_r(n,v)),digits=14)))
 })
 output$p_lookup<-renderUI({
  q<-critical_settings();r<-req(input$critical_r)
  p<-p_for_r(q$n,r)
  candidates<-3:2000
  minimum<-candidates[which(p_for_r(candidates,r)<q$alpha)[1]]
  div(class='equation-box',
   p(paste0('N = ',q$n,'｜|r| = ',num(r),'｜雙尾 p = ',format.pval(p,digits=4),
    if(p<q$alpha)' < ' else ' ≥ ','α = ',num(q$alpha))),
   p(if(is.na(minimum))'在 N ≤ 2,000 的範圍內，雙尾 p 仍未低於所選 α。'
    else paste0('在這個 |r| 下，雙尾 p 首次低於 α 的樣本數是 N = ',minimum,'。')),
   p('灰色水平線是所選的 α。'))
 })
 output$critical_lookup<-renderUI({
  q<-critical_settings();v<-cor_critical(q$n,q$alpha,q$tails)
  div(class='equation-box',p(strong('目前 N = ',v$N),'｜df = ',v$df,
   '｜t 臨界值 = ',paste0(q$sign,num(v$t)),'｜r 臨界值 = ',paste0(q$sign,num(v$r))),
   p('|r 臨界值| = |t 臨界值| / √(t 臨界值² + df)。'))
 })
 output$critical_table<-renderUI({
  q<-critical_settings()
  n<-sort(unique(c(3:12,15,20,25,30,40,50,52,75,100,102,200,385,500,1000,1538,2000,q$n)))
  d<-cor_critical(n,q$alpha,q$tails)
  row<-function(i)tags$tr(class=if(d$N[i]==q$n)'active-critical',
   tags$td(d$N[i]),tags$td(d$df[i]),tags$td(paste0(q$sign,num(d$t[i]))),tags$td(paste0(q$sign,num(d$r[i]))))
  div(class='table-scroll critical-table',tags$table(
   tags$thead(tags$tr(tags$th('配對樣本數 N'),tags$th('自由度 df'),tags$th('t 臨界值'),tags$th('r 臨界值'))),
   tags$tbody(lapply(seq_len(nrow(d)),row))))
 })
 survey_raw <- reactive({
  default_file<-if(file.exists('../private/survey.csv'))'../private/survey.csv' else 'data/survey-teaching.csv'
  f <- if(is.null(input$survey_file))default_file else input$survey_file$datapath
  validate(need(file.exists(f),'請選擇調查逐筆 CSV。'))
  d<-read_data(f)
  if('Zname' %in% names(d)){
   fields<-intersect(names(survey_labels),names(d))
   d<-d[fields]
   names(d)<-unname(survey_labels[fields])
  }
  if('遊戲時間' %in% names(d) && !'玩手遊時間' %in% names(d))names(d)[names(d)=='遊戲時間']<-'玩手遊時間'
  d<-d[!tolower(names(d)) %in% c('id','姓名','學號','email','電子郵件')]
  d[]<-lapply(d,function(column)if(is.character(column))trimws(column) else column)
  validate(need(ncol(d)>=2&&!anyDuplicated(names(d)),'CSV 須含至少兩個不同名稱的變數欄。'))
  d
 })
 output$survey_group <- renderUI({
  d<-survey_raw();z<-sort(unique(na.omit(d[['星座']])))
  select('survey_zodiac','選擇星座',c('全體樣本'='',z))
 })
 outputOptions(output,'survey_group',suspendWhenHidden=FALSE)
 survey <- reactive({
  d<-survey_raw()
  observation<-seq_len(nrow(d))
  if(length(input$survey_zodiac)&&nzchar(input$survey_zodiac)){
   take<-which(d[['星座']]==input$survey_zodiac)
   d<-d[take,,drop=FALSE]
   observation<-observation[take]
  }
  attr(d,'observation_numbers')<-observation
  d
 })
 manual <- reactive(checks({
  d<-read.csv(text=input$manual_csv,check.names=FALSE,stringsAsFactors=FALSE)
  if(any(!nzchar(names(d)))||anyDuplicated(names(d))||ncol(d)<2)stop('至少需要兩欄不重複的欄名。')
  d
 }))
 configure <- function(prefix,get_data){
  output[[paste0(prefix,'_options')]] <- renderUI(data_controls(prefix,get_data(),input[[paste0(prefix,'_method')]],
   isolate(input[[paste0(prefix,'_x')]]),isolate(input[[paste0(prefix,'_y')]])))
  output[[paste0(prefix,'_levels')]] <- renderUI({
   method<-input[[paste0(prefix,'_method')]]
   if(!method %in% c('pb','dummy'))return(NULL)
   x<-input[[paste0(prefix,'_x')]];req(length(x)==1)
   d<-get_data();req(x %in% names(d))
   g<-sort(unique(as.character(na.omit(d[[x]]))));g<-g[nzchar(g)]
   row_controls(select(paste0(prefix,'_g0'),if(method=='pb')'第 1 類（0）' else '參照組',g),
    if(method=='pb')select(paste0(prefix,'_g1'),'第 2 類（1）',g,selected=g[2]))
  })
  outputOptions(output,paste0(prefix,'_options'),suspendWhenHidden=FALSE)
  outputOptions(output,paste0(prefix,'_levels'),suspendWhenHidden=FALSE)
  reactive(checks({
   method<-input[[paste0(prefix,'_method')]];d<-get_data()
   x<-input[[paste0(prefix,'_x')]];y<-input[[paste0(prefix,'_y')]]
   req(length(x),length(y),all(c(x,y) %in% names(d)))
   g<-if(method=='pb')c(input[[paste0(prefix,'_g0')]],input[[paste0(prefix,'_g1')]]) else input[[paste0(prefix,'_g0')]]
   degree<-if(method=='poly')req(input[[paste0(prefix,'_degree')]]) else 2L
   prepare_design(d,method,x,y,g,degree)
  }))
 }
 survey_analysis<-configure('survey',survey)
 manual_analysis<-configure('manual',manual)
 register_case<-function(id_prefix){
  get_id<-reactive(req(input[[id_prefix]]))
  output[[paste0(id_prefix,'_source')]]<-renderUI({
   id<-get_id();z<-cases[[id]]
   tagList(p(paste0('來源｜',z$source,' · ',z$sheet)),
    if(id=='ex15b')p('與習題 15.2 的工作簿報表核對。兩個模型都使用同一批 9 筆資料。'))
  })
  output[[paste0(id_prefix,'_options')]]<-renderUI({
   id<-get_id()
   if(id=='ex13')row_controls(
    select('ex13_x','X 變數',head(names(case_data(id)),-1),selected='經驗'),
    select('ex13_kind','方法',methods[1:2]))
   else if(id=='contest')select('contest_model','模型區組',c('區組一 D1、D2'='1','區組二 加入 X1–X4'='2','區組三 加入 X5、X6'='3'),selected='3')
  })
  outputOptions(output,paste0(id_prefix,'_options'),suspendWhenHidden=FALSE)
  output[[paste0(id_prefix,'_csv')]]<-downloadHandler(function()paste0(get_id(),'.csv'),
   function(file)write.csv(case_data(get_id()),file,row.names=FALSE,fileEncoding='UTF-8'))
  reactive(checks({
   id<-get_id();raw<-case_data(id);kind<-cases[[id]]$method
   xs<-head(names(raw),-1);y<-tail(names(raw),1)
   if(id=='contest')xs<-head(xs,c(2,6,8)[as.integer(req(input$contest_model))])
   if(id=='ex13'){xs<-req(input$ex13_x);kind<-req(input$ex13_kind)}
   a<-prepare_design(raw,kind,xs,y,if(kind=='pb')sort(unique(as.character(raw[[xs[1]]])))[1:2] else NULL)
   if(id=='ex15b'||id=='contest'){
    full<-fit_design(a$data)
    base_x<-if(id=='ex15b')c('性別','經驗') else if(length(xs)==8)head(xs,6) else if(length(xs)==6)head(xs,2) else NULL
    if(length(base_x)){
     reduced_design<-prepare_design(raw,'lm',base_x,y)
     reduced<-fit_design(reduced_design$data)
     a$reduced<-reduced_design
     cmp<-anova(reduced,full)
     a$comparison<-p('縮減模型 R² = ',num(summary(reduced)$r.squared),
      '｜ΔR² = ',num(summary(full)$r.squared-summary(reduced)$r.squared),
      '｜F(',cmp$Df[2],', ',df.residual(full),') = ',num(cmp$F[2]),'｜p = ',format.pval(cmp$'Pr(>F)'[2],digits=4))
    }
   }
   a
  }))
 }
 book_analysis<-register_case('case')
 exercise_analysis<-register_case('exercise')
 output$worked_answers<-renderUI({
  id<-req(input$exercise)
  tags$details(open=NA,tags$summary('逐題解答'),exercise_answers(id,case_data(id)))
 })
 analyses<-list(book=book_analysis,exercise=exercise_analysis,survey=survey_analysis,manual=manual_analysis)
 for(key in names(analyses))local({
  id<-key;get_analysis<-analyses[[id]]
  output[[paste0(id,'_result')]]<-renderUI(checks({
   a<-get_analysis()
   tagList(if(!is.null(a$reduced))tags$details(tags$summary('查看縮減模型與共線性診斷'),display_result(a$reduced)),
    display_result(a,a$comparison))
  }))
  diagnostics<-reactive(checks(diagnostic_data(get_analysis())))
  output[[paste0(id,'_diagnostics')]]<-renderUI({
   if(get_analysis()$kind %in% c('cor','pb'))return(NULL)
   d<-diagnostics()
   for(column in c('觀察值','預測值','殘差','標準化殘差','外部學生化殘差'))d[[column]]<-num(d[[column]])
   for(column in c('p','校正後p'))d[[column]]<-ifelse(is.na(d[[column]]),'—',format.pval(d[[column]],digits=4))
   tags$details(tags$summary('逐筆殘差診斷'),
    p('逐筆雙尾檢定使用外部學生化殘差。Bonferroni 校正後 p < .05 標為顯著異常。'),
    downloadButton(paste0(id,'_residual_csv'),'下載殘差 CSV'),
    show_table(d))
  })
  output[[paste0(id,'_residual_csv')]]<-downloadHandler(
   function()paste0(id,'-regression-residuals.csv'),
   function(file)write.csv(diagnostics(),file,row.names=FALSE,fileEncoding='UTF-8',na=''))
  output[[paste0(id,'_plot_key')]]<-renderUI(checks(plot_key(get_analysis())))
  selected_option<-function(name)isTRUE(input[[paste0(id,'_',name)]])
  draw_current_plot<-function()plot_analysis(get_analysis(),selected_option('quadrants'),
   selected_option('zx'),selected_option('zy'),selected_option('mean'))
  output[[paste0(id,'_plot')]]<-renderPlot(checks(draw_current_plot()))
  hover_model<-reactive({
   a<-get_analysis();d<-a$data;fit<-fit_design(d);x<-plot_x(a,fit)
   locations<-if(a$kind %in% c('pb','dummy'))x+plot_offsets(x) else x
   list(a=a,x=x,locations=data.frame(x=locations,y=d$y,index=seq_len(nrow(d))),
    residual=residuals(fit),standardized=rstandard(fit))
  })
  output[[paste0(id,'_point_tip')]]<-renderUI({
   hover<-input[[paste0(id,'_hover')]]
   req(hover,hover$coords_css)
   h<-hover_model()
   point<-nearPoints(h$locations,hover,xvar='x',yvar='y',threshold=13,maxpoints=1)
   if(!nrow(point))return(NULL)
   i<-point$index;y<-h$a$data$y
   zx<-selected_option('zx');zy<-selected_option('zy')
   xval<-if(zx)(h$x[i]-mean(h$x))/sd(h$x) else h$x[i]
   yval<-if(zy)(y[i]-mean(y))/sd(y) else y[i]
   e<-if(zy)h$residual[i]/sd(y) else h$residual[i]
   width<-session$clientData[[paste0('output_',id,'_plot_width')]]
   flip<-isTRUE(hover$coords_css$x>(if(is.null(width))600 else width)*.67)
   div(class=paste('point-tip',if(flip)'tip-left'),
    style=sprintf('left:%dpx;top:%dpx',round(hover$coords_css$x),round(hover$coords_css$y)),
    strong(paste('第',h$a$observation[i],'筆')),
    div(paste0(if(zx)'zX' else 'X',' = ',chart_num(xval),'，',if(zy)'zY' else 'Y',' = ',chart_num(yval))),
    div(paste0(if(zy)'z 尺度殘差' else '殘差',' = ',chart_num(e))),
    div(paste0('標準化殘差 = ',chart_num(h$standardized[i]))))
  })
  output[[paste0(id,'_plot_label')]]<-renderUI({
   if(selected_option('equation'))checks({
    a<-get_analysis()
    model<-fit_design(a$data)
    div(class='plot-equation-label',tabindex=0,title='拖曳或使用方向鍵移動方程式',
     span(equation_label(a,selected_option('zx'),selected_option('zy'),plot_label=TRUE,model=model)),
     span(paste0('R² = ',chart_num(summary(model)$r.squared))))
   })
  })
  output[[paste0(id,'_equation_text')]]<-renderUI({
   if(selected_option('equation'))checks({
    a<-get_analysis()
    details<-plot_equation(a,selected_option('zx'),selected_option('zy'))
    if(a$kind %in% c('pb','dummy')||(a$kind=='lm'&&ncol(a$data)>2))details
    else span(class='sr-only','迴歸方程式 ',equation_label(a,selected_option('zx'),selected_option('zy')))
   })
  })

 })
 output$raw_survey<-downloadHandler(function()'survey-observations.csv',function(file){
  d<-survey_raw();d<-d[!tolower(names(d)) %in% c('id','姓名','學號','email','電子郵件')]
  write.csv(d,file,row.names=FALSE,fileEncoding='UTF-8',na='')
 })
 current<-reactive(analyses[[req(input$code_scope)]]())
 r_body<-paste(readLines('r-script.txt',encoding='UTF-8'),collapse='\n')
 py_body<-paste(readLines('python.txt',encoding='UTF-8'),collapse='\n')
 script<-reactive({
  a<-current()
  header<-paste(paste0('# ',names(a$labels),' = ',unname(a$labels)),collapse='\n')
  if(input$lang=='R'){
   fit_code<-paste(deparse(fit_design),collapse='\n')
   vif_code<-paste(deparse(vif_table),collapse='\n')
   paste(header,'# 將此檔與 analysis.csv 放在同一個資料夾。',paste0('method <- "',a$kind,'"'),
    paste('fit_design <-',fit_code),paste('vif_table <-',vif_code),r_body,sep='\n')
  }else paste(header,'# python -m pip install numpy scipy',paste0('method = "',a$kind,'"'),py_body,sep='\n')
 })
 output$script_text<-renderUI(checks({
  a<-current()
  filename<-if(req(input$lang)=='R')'analysis.R' else 'analysis.py'
  source_code<-script()
  csv_data<-paste(capture.output(write.csv(a$data,row.names=FALSE)),collapse='\n')
  file_link<-function(label,name,content,mime){
   encoded<-jsonlite::base64_enc(charToRaw(enc2utf8(paste0(content,'\n'))))
   encoded<-gsub('[\r\n]','',encoded)
   tags$a(class='btn btn-default',download=name,href=paste0('data:',mime,';charset=utf-8;base64,',encoded),label)
  }
  tagList(
   div(class='toolbar',
    tags$button(type='button',class='btn btn-default',onclick='copyCode(this)','複製語法'),
    file_link('下載語法',filename,source_code,'text/plain'),
    file_link('下載 analysis.csv','analysis.csv',csv_data,'text/csv')),
   p(code(paste(if(input$lang=='R')'Rscript' else 'python',filename))),
   tags$pre(class='source-code',tags$code(source_code)),
   tags$pre(class='console-csv',hidden=NA,csv_data))
 }))
 output$console<-renderUI(checks({
  a<-current()
  if(input$lang=='Python')return(tagList(
   tags$button(type='button',class='btn btn-default',onclick='runPython(this)','執行 Python'),
   tags$pre(class='console',role='status','首次執行會下載 Python 與 SciPy。')))
  env<-new.env()
  env$read.csv<-function(file,...)a$data
  connection<-textConnection(script())
  on.exit(close(connection))
  tags$pre(class='console',paste(capture.output(source(connection,local=env,echo=TRUE,print.eval=TRUE,max.deparse.length=Inf)),collapse='\n'))
 }))
}
shinyApp(ui,server)
