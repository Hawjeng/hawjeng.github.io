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
num <- function(x) formatC(x,format='f',digits=4)
checks <- function(expr) tryCatch(expr,error=function(e){
 if(inherits(e,"shiny.silent.error"))stop(e)
 validate(need(FALSE,conditionMessage(e)))
})
display_result <- function(analysis, extra=NULL) {
 d <- analysis$data
 kind <- analysis$kind
 labels <- analysis$labels
 if(kind %in% c('cor','pb')){
  r <- cor_fit(d)
  return(tagList(
   h3(paste0(labels[2]," × ",labels[1])),
   p('配對有效 n = ',nrow(d),'｜r = ',num(r$estimate),'｜t = ',num(r$statistic),'｜df = ',r$parameter),
   p('雙尾 p = ',format.pval(r$p.value,digits=4),'｜95% Fisher z 信賴區間 [',paste(num(r$conf.int),collapse=', '),']'),
   p('r = SP / √(SSₓ × SSᵧ)；t = r × √[(n − 2)/(1 − r²)]。'),
   if(kind=='pb')p('第一類編為 0，第二類編為 1。正相關表示第二類的平均數較高。組別人數：',paste(as.vector(table(d$x)),collapse=' / '))))
 }
 fit <- fit_design(d)
 s <- summary(fit)
 f <- s$fstatistic
 coef <- s$coefficients
 ci <- confint(fit)
 diag <- vif_table(fit)
 show_table <- function(t) HTML(paste0('<div class="table-scroll"><table><thead><tr>',
  paste0('<th>',htmltools::htmlEscape(names(t)),'</th>',collapse=''),'</tr></thead><tbody>',
  paste(apply(t,1,function(row)paste0('<tr>',paste0('<td>',htmltools::htmlEscape(row),'</td>',collapse=''),'</tr>')),collapse=''),'</tbody></table></div>'))
 t <- data.frame(變數=c('截距',unname(labels[-1])),b=num(coef[,1]),SE=num(coef[,2]),t=num(coef[,3]),
  p=format.pval(coef[,4],digits=4),下限=num(ci[,1]),上限=num(ci[,2]))
 tagList(h3(paste0('結果變數｜',labels[1])),
  p('有效 n = ',nrow(d),'｜R² = ',num(s$r.squared),'｜調整後 R² = ',num(s$adj.r.squared),'｜殘差 SE = ',num(s$sigma)),
  p('F(',f[2],', ',f[3],') = ',num(f[1]),'｜p = ',format.pval(pf(f[1],f[2],f[3],lower.tail=FALSE),digits=4)),
  show_table(t),
  if(!is.null(diag))tagList(h4('共線性診斷'),p('允差 = 1 − R²ⱼ；VIF = 1 / 允差。每欄都用其他設計欄來預測。'),
   show_table(transform(diag,變數=unname(labels[colnames(d)[-1]]),允差=num(允差),VIF=num(VIF)))),
  if(!is.null(extra))extra)
}
plot_analysis <- function(a){
 d<-a$data;kind<-a$kind
 fit<-if(kind %in% c('cor','pb'))NULL else fit_design(d)
 par(mar=c(4.5,4.5,1,1),family='sans',las=1)
 if(kind=='dummy'){
  group <- if(ncol(d)==2)d[[2]] else max.col(cbind(1-rowSums(d[-1]),d[-1]))-1L
  boxplot(d$y~group,xlab='Group code (0 = reference)',ylab='Observed Y',col='#dbefee',outline=FALSE)
  points(jitter(group+1,.18),d$y,pch=19,col=adjustcolor('#245d69',.45))
 }else if(kind=='pb'){
  plot(jitter(d[[2]],.2),d$y,pch=19,col=adjustcolor('#245d69',.45),xlab='Group code',ylab='Y',xaxt='n')
  axis(1,0:1)
  points(0:1,as.numeric(tapply(d$y,d[[2]],mean)),pch=18,col='#b94723',cex=1.7)
 }else if(kind=='lm'&&ncol(d)>2){
  plot(fitted(fit),d$y,pch=19,col=adjustcolor('#245d69',.55),xlab='Fitted Y',ylab='Observed Y')
  abline(0,1,col='#b94723',lwd=2)
 }else{
  plot(d[[2]],d$y,pch=19,col=adjustcolor('#245d69',.55),xlab='X',ylab='Y')
  if(kind=='poly'){
   x<-seq(min(d[[2]]),max(d[[2]]),length.out=150)
   nd<-as.data.frame(lapply(seq_len(ncol(d)-1),function(i)x^i))
   names(nd)<-names(d)[-1]
   lines(x,predict(fit,nd),col='#b94723',lwd=2)
  }else abline(lm(y~x1,d),col='#b94723',lwd=2)
 }
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
ui <- fluidPage(
 tags$head(tags$title('相關與迴歸｜統計互動教材'),tags$link(rel='stylesheet',href='style.css'),tags$script(src='console.js')),
 div(class='mast',p(class='eyebrow','STATISTICS LAB'),
  h1('相關與迴歸'),p('從兩個變數的散布圖，到多元模型與個案診斷。')),
 tabsetPanel(id='unit',
  tabPanel('原理說明',includeHTML('www/theory.html')),
  tabPanel('課本範例',card(select('case','課本案例',case_choices(FALSE)),uiOutput('case_options'),uiOutput('case_source'),downloadButton('case_csv','下載案例原始 CSV')),
   card(uiOutput('book_result'),plotOutput('book_plot',height=360),uiOutput('critical_demo'))),
  tabPanel('習題解答',card(select('exercise','習題',case_choices(TRUE)),uiOutput('exercise_options'),uiOutput('exercise_source'),downloadButton('exercise_csv','下載習題原始 CSV')),
   card(uiOutput('exercise_result'),plotOutput('exercise_plot',height=360),uiOutput('worked_answers'))),
  tabPanel('調查習作',
   card(h3('手機使用行為調查'),p('預設案例為玩手遊時間與手機遊戲成癮的 Pearson 相關。可切換全體或單一星座，也可改選變數。'),
    p('若未載入資料，請在 Excel 開啟 data3.xlsx，切到 Cleaned_Data 工作表，另存為 CSV UTF-8，再選取該檔案。'),
    fileInput('survey_file','載入調查逐筆資料 CSV',accept='.csv'),
    row_controls(uiOutput('survey_group'),select('survey_method','分析方法',methods)),uiOutput('survey_options'),uiOutput('survey_levels'),
    downloadButton('raw_survey','下載調查逐筆 CSV')),
   card(uiOutput('survey_result'),plotOutput('survey_plot',height=360)),
   includeHTML('www/survey-practice.html')),
  tabPanel('殘差與影響點',includeHTML('www/diagnostics.html')),
  tabPanel('R 與 Python 語法',
   card(h3('語法與執行結果'),
    row_controls(select('code_scope','分析來源',c('課本範例'='book','習題解答'='exercise','調查習作'='survey','自行輸入'='manual')),
     select('lang','語言',c('R','Python'))),
    p('沿用各單元目前的設定。下載語法與 analysis.csv，放在同一資料夾後依畫面指令執行。'),
    div(class='console-grid',
     div(tags$button(type='button',class='btn btn-default',onclick='copyCode(this)','複製語法'),
      downloadButton('script','下載語法'),downloadButton('analytic','下載 analysis.csv'),uiOutput('script_text')),
     div(h4('主控台原始輸出'),uiOutput('console'))))),
  tabPanel('自行輸入',
   card(h3('輸入逐筆資料'),p('第一列填變數名稱，欄位以逗號分隔。類別可填文字，缺失值留空。'),
    textAreaInput('manual_csv','CSV 資料','學習時間,練習次數,成績\n2,3,61\n4,4,68\n5,8,75\n7,5,77\n8,7,83\n9,10,88\n10,8,91',rows=8,width='100%'),
    select('manual_method','分析方法',methods),uiOutput('manual_options'),uiOutput('manual_levels')),
   card(uiOutput('manual_result'),plotOutput('manual_plot',height=360)))))
server <- function(input,output,session){
 survey_raw <- reactive({
  f <- if(is.null(input$survey_file))'../private/survey.csv' else input$survey_file$datapath
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
  if(length(input$survey_zodiac)&&nzchar(input$survey_zodiac))d<-d[which(d[['星座']]==input$survey_zodiac),,drop=FALSE]
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
 output$critical_demo<-renderUI({
  if(!identical(input$case,'pearson'))return(NULL)
  df<-nrow(case_data('pearson'))-2
  tcv<-qt(.975,df)
  rcv<-tcv/sqrt(tcv^2+df)
  tags$details(tags$summary('圖 13.6｜由 t 臨界值換算 r 臨界值'),
   p('α = .05，雙尾；df = ',df,'；t 臨界值 = ±',num(tcv),'；r 臨界值 = ±',num(rcv)),
   p('r 臨界值 = t 臨界值 / √(t 臨界值² + df)。'))
 })
 analyses<-list(book=book_analysis,exercise=exercise_analysis,survey=survey_analysis,manual=manual_analysis)
 for(key in names(analyses))local({
  id<-key;get_analysis<-analyses[[id]]
  output[[paste0(id,'_result')]]<-renderUI(checks({
   a<-get_analysis()
   tagList(if(!is.null(a$reduced))tags$details(tags$summary('查看縮減模型與共線性診斷'),display_result(a$reduced)),
    display_result(a,a$comparison))
  }))
  output[[paste0(id,'_plot')]]<-renderPlot(checks(plot_analysis(get_analysis())))
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
 output$script_text<-renderUI(tagList(p(code(if(input$lang=='R')'Rscript analysis.R' else 'python analysis.py')),
  tags$pre(class='source-code',tags$code(script()))))
 output$console<-renderUI(checks({
  a<-current()
  if(input$lang=='Python')return(tagList(
   tags$button(type='button',class='btn btn-default',onclick='runPython(this)','執行 Python'),
   tags$pre(class='console',role='status','首次執行會下載 Python 與 SciPy。'),
   tags$pre(class='console-csv',hidden=NA,paste(capture.output(write.csv(a$data,row.names=FALSE)),collapse='\n'))))
  env<-new.env()
  env$read.csv<-function(file,...)a$data
  connection<-textConnection(script())
  on.exit(close(connection))
  tags$pre(class='console',paste(capture.output(source(connection,local=env,echo=TRUE,print.eval=TRUE,max.deparse.length=Inf)),collapse='\n'))
 }))
 output$analytic<-downloadHandler(function()'analysis.csv',function(file)write.csv(current()$data,file,row.names=FALSE))
 output$script<-downloadHandler(function()if(input$lang=='R')'analysis.R' else 'analysis.py',
  function(file)writeLines(enc2utf8(script()),file,useBytes=TRUE))
}
shinyApp(ui,server)
