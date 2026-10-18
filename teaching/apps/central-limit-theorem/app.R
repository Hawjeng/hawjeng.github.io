# Browser-only font setup: keep the downloadable original R sources unchanged.
if (grepl("emscripten", R.version$os)) {
  .font_dir <- "/home/web_user/fonts"
  dir.create(.font_dir, recursive = TRUE, showWarnings = FALSE)
  .font_file <- file.path(.font_dir, "NotoSansCJKtc-Regular.otf")
  .font_origin <- as.character(get("eval_js", envir=asNamespace(paste0("web", "r")))("self.location.origin"))
  download.file(paste0(.font_origin, "/teaching/fonts/NotoSansCJKtc-Regular.otf"),
                .font_file, mode = "wb", quiet = TRUE)
}

library(shiny)

demo_ui <- fluidPage(
  tags$head(tags$style(HTML("
    body { font-family: 'Microsoft JhengHei', 'Noto Sans TC', sans-serif; }
    .well { background-color: #f7f7f7; }
    .value-box { border:1px solid #ddd; border-radius:8px; padding:12px; margin-bottom:10px; background:white; }
    .value-title { font-size:12px; color:#666; }
    .value-number { font-size:19px; font-weight:700; }
    .note-box { background:#fff8dc; border-left:5px solid #d8a600; padding:12px; margin-top:12px; }
  "))),
  
  sidebarLayout(
    sidebarPanel(
      width = 3,
      selectInput("population", "母體分配",
                  choices = c(
                    "常態分布"="normal",

                    "Gamma 分布（可調 α、θ）"="gamma",
                    "雙峰分布"="bimodal",


                    "Beta 分布（0–1）"="beta"
                  )),
      sliderInput("n", "每次抽樣樣本數 n", min=1, max=1200, value=30, step=1),
      sliderInput("reps", "重複抽樣次數 k", min=2, max=1200, value=1000, step=1),

      conditionalPanel(
        condition = "input.population == 'gamma'",
        sliderInput("gamma_shape", "Gamma 形狀參數 α（shape）", min=0.2, max=25, value=2, step=0.2),
        sliderInput("gamma_scale", "Gamma 尺度參數 θ（scale）", min=0.2, max=10, value=5, step=0.2),
        helpText("偏態係數 = 2/√α；α 越大，右偏程度越低。α=1 時為指數分配，速率 λ=1/θ。")
      ),

      conditionalPanel(
        condition = "input.population == 'beta'",
        sliderInput("beta_alpha", "Beta 形狀參數 α", min=0.1, max=10, value=2, step=0.1),
        sliderInput("beta_beta", "Beta 形狀參數 β", min=0.1, max=10, value=5, step=0.1),
        helpText("α=β=1 時為 U(0,1)；α<β 時右偏，α>β 時左偏；α=β 時對稱，形狀仍取決於參數大小。")
      ),

      numericInput("seed", "隨機種子", value=1234, min=1, step=1),
      actionButton("simulate", "重新抽樣", class="btn-primary", width="100%"),
      hr(),
      checkboxInput("show_normal", "常態近似曲線", TRUE),
      div(class="note-box", HTML("<b>教學重點</b><br>樣本數增加時，樣本平均數的抽樣分配會更集中。虛線為模擬抽樣分配的核密度曲線，實線為理論常態曲線；下方單次樣本改以彩色魚肚圖呈現樣本密度，並保留散點。X 軸固定後，可清楚看到分配逐漸收縮。理論標準誤為 σ/√n。"))
    ),
    mainPanel(
      width = 9,
      fluidRow(
        column(3, div(class="value-box", div(class="value-title","母體平均數 μ"), div(class="value-number", textOutput("pop_mean", inline=TRUE)))),
        column(3, div(class="value-box", div(class="value-title","母體標準差 σ"), div(class="value-number", textOutput("pop_sd", inline=TRUE)))),
        column(3, div(class="value-box", div(class="value-title","理論標準誤 σ/√n"), div(class="value-number", textOutput("theoretical_se", inline=TRUE)))),
        column(3, div(class="value-box", div(class="value-title","模擬標準誤 SD(x̄)"), div(class="value-number", textOutput("simulated_se", inline=TRUE))))
      ),
      tabsetPanel(
        tabPanel("抽樣分配", br(), plotOutput("sampling_plot", height="480px"), verbatimTextOutput("interpretation")),
        tabPanel("母體分配疊加抽樣分配與單次樣本", br(),
                 plotOutput("population_plot", height="420px"),
                 plotOutput("sample_plot", height="280px")),
        tabPanel("標準誤與樣本數", br(),
          p("滑鼠指向曲線可讀取 n 與 SE；點選圖形可設定目前樣本數。拖動左側 n，或按下方按鈕比較。"),
          fluidRow(column(4,selectInput("se_range","顯示範圍",c("n = 1–100"=100,"n = 1–300"=300,"n = 1–1200"=1200),selected=1200)),
            column(4,checkboxInput("se_log","X 軸採對數刻度",TRUE)),
            column(4,numericInput("se_target","目標標準誤",1,min=.0001,step=.1))),
          actionButton("se_double","n 加倍"),actionButton("se_quad","n 變為 4 倍"),actionButton("se_apply","套用目標 SE 所需 n"),
          uiOutput("se_status"),
          plotOutput("se_curve",height="430px",click="se_click",hover=hoverOpts("se_hover",delay=60,delayType="throttle")),
          textOutput("se_readout"),uiOutput("se_target_note"),
          helpText("SE = σ/√n；n 增至 4 倍，SE 減半。k 不改變理論曲線。對數 X 軸讓小樣本區域較容易操作。")) ,
        tabPanel("不同 n 並列比較",br(),p("固定母體與 k，比較四種樣本數。各圖共用 X 軸與密度刻度；藍線為模擬密度，橘色虛線為常態參考。"),plotOutput("compare_n",height="560px")),
        tabPanel("數值摘要", br(), tableOutput("summary_table"))
      )
    )
  )
)

# 區間估計與教材習題模組。
ci_mean <- function(xbar,n,spread,level=.95,method="z") {
  critical<-if(method=="t") qt((1+level)/2,n-1) else qnorm((1+level)/2)
  se<-spread/sqrt(n); c(lower=xbar-critical*se,upper=xbar+critical*se,SE=se,critical=critical)
}
ci_prop <- function(phat,n,level=.95) {
  z<-qnorm((1+level)/2);se<-sqrt(phat*(1-phat)/n)
  c(lower=phat-z*se,upper=phat+z*se,SE=se,critical=z)
}
source_ui <- tagList(hr(),p(class="intro-source","出自：邱皓政、林碧芳(2022)。統計學：原理與應用(第四版)。五南。"),
  p(tags$a("文獻連結",href="https://www.wunan.com.tw/bookdetail?NO=12266",target="_blank",rel="noopener noreferrer")),
  p(class="intro-source","本示範亦參照所提供之第五版第八章校稿，涵蓋 8.3–8.6；互動圖與解答為教學補充。"))

ci_ui<-sidebarLayout(sidebarPanel(width=3,
  selectInput("ci_method","估計方式",c("平均數：σ 已知（z）"="z","平均數：σ 未知（t）"="t")),
  sliderInput("ci_level","信心水準",.80,.99,.95,.01),
  numericInput("ci_n","樣本數 n",16,min=2,max=10000,step=1),
  conditionalPanel("input.ci_method != 'p'",numericInput("ci_xbar","樣本平均數",54),numericInput("ci_spread","標準差（z 用 σ；t 用 s）",6,min=.01)),
  conditionalPanel("input.ci_method == 'p'",numericInput("ci_success","成功人數",128,min=0,step=1)),
  conditionalPanel("input.ci_method == 'p'",sliderInput("ci_width","規劃的區間全寬（比例，百分點）",2,30,10,1)),
  hr(),h4("重複抽樣示範"),
  p("本頁平均數區間以常態母體模擬；母體真值與單次樣本摘要分開設定。"),
  conditionalPanel("input.ci_method != 'p'",numericInput("ci_mu","模擬母體 μ",50),numericInput("ci_sigma","模擬母體 σ",6,min=.01)),
  conditionalPanel("input.ci_method == 'p'",sliderInput("ci_pi","模擬母體比例 π",.01,.99,.8,.01)),
  sliderInput("ci_k","模擬次數 k",20,500,100,10),
  sliderInput("ci_frame","逐次顯示區間",1,500,1,1,animate=animationOptions(interval=120,loop=FALSE)),
  numericInput("ci_seed","模擬種子",2026,min=1,max=2000000000,step=1),
  actionButton("ci_resample","重新產生模擬",class="btn-primary")
),mainPanel(width=9,
  tabsetPanel(tabPanel("公式與單次區間",h3("估計值 ± 臨界值 × 標準誤"),uiOutput("ci_result"),plotOutput("ci_single",height="260px"),
    h4("讀懂信心水準"),p("95% 指以相同抽樣與建構方法重複進行，長期約有 95% 的區間涵蓋固定的母體參數；不是 95% 的個別病患落在此區間，也不是已算出區間後參數具有 95% 的隨機機率。"),
    p("z、t 平均數區間在獨立常態樣本下成立；大樣本可作近似。σ 未知即使用 t，並非只在 n<30 才使用。比例 Wald 區間屬大樣本近似；成功與失敗數過少時應考慮 Wilson 或精確二項區間。")),
    tabPanel("信賴區間涵蓋率動畫",p("按『逐次顯示區間』的播放鍵。藍色區間涵蓋真值，紅色區間未涵蓋。調整信心水準時保留同一批樣本，便於比較。圖中呈現最近100次，涵蓋率累計全部已播放樣本。"),plotOutput("ci_coverage",height="520px"),textOutput("ci_coverage_text")),
    tabPanel("文獻與公式",div(class="formula",p("σ 已知：x̄ ± z(1−α/2) σ/√n"),p("σ 未知：x̄ ± t(1−α/2,n−1) s/√n"),p("樣本數規劃（σ 已知）：n ≥ (zσ/E)²；區間全寬 W=2E")),source_ui,
      p(tags$a("NIST：信賴區間的意義與 z 區間",href="https://www.itl.nist.gov/div898/handbook/prc/section1/prc14.htm",target="_blank")),
      p(tags$a("NIST：平均數 t 信賴區間",href="https://www.itl.nist.gov/div898/handbook/eda/section3/eda352.htm",target="_blank")),
      p(tags$a("OpenStax：平均數與比例區間公式",href="https://openstax.org/books/introductory-business-statistics-2e/pages/8-formula-review",target="_blank"))))))
exercise_questions<-list(
  list(title="一、點名與抽樣方式",context="統計老師喜歡用不同的點名方式來問問題，請回答下列問題：",q=c(
    "老師用亂數表隨機抽出學生來問問題，這是何種抽樣方式？",
    "老師以上課當天的日期個位數來出發，每隔5號抽一位來問問題，這是何種抽樣方式？",
    "由於班上男女比例不均（1比4），老師隨機抽到一個男生後就會隨機抽四個女生來問問題，這是何種抽樣方式？",
    "由於班上同學分成10組做作業，老師隨機抽出一組後從中隨機抽一位來問問題，這是何種抽樣方式？",
    "前述各種抽樣方式在何種情況下會發生不隨機的狀況？試討論之。")),
  list(title="二、母體、樣本與抽樣分配",context="全民健康保險的業務資料顯示，臺灣民眾使用某種特殊醫療資源的年齡平均數為50歲，標準差6歲。某大型醫院某個月使用該項醫療資源共有16名病患，平均年齡為54歲，標準差為9歲。",q=c(
    "母體分配為何？其平均數與標準差為何？","樣本分配為何？其平均數與標準差為何？","抽樣分配為何？其平均數與標準差為何？","這三種分配有何關係？哪一個最可能符合常態分配？","中央極限定理與哪一種分配有關？")),
  list(title="三、平均數的區間估計",context="某大型醫院所服務的社區民眾年齡偏高，被地方政府視為高齡社區，某個月使用某特殊醫療資源共有16名病患，平均年齡為54歲，標準差為9歲。",q=c(
    "假設母體的標準差6歲。以該院該月的病患的年齡數據，推論高齡社區民眾使用該醫療資源的年齡的95%信賴區間為何？",
    "假設院長認為母體資料不能作為『高齡社區』的母體資訊，亦即母體狀態不明，此時前一題的95%信賴區間為何？",
    "如果該院累積了一年得到160名病患的年齡資料，平均仍為54歲，標準差亦為9歲。那麼前兩題95%信賴區間各為何？",
    "請討論前述四個信賴區間的異同。")),
  list(title="四、比例估計與樣本數",context="某醫院院長仔細察看使用某特殊醫療資源的160名病患的資料發現，男性占了80%，性別比例似乎非常不均衡。",q=c(
    "以該院資料推論高齡社區民眾使用該醫療資源的性別比例的95%信賴區間為何？",
    "如果想要讓八成為男性的95%信賴區間的範圍控制在10%以內，那麼樣本數需至少為多少？")))
exercise_ui<-div(class="intro-home",h2("第八章習題練習"),p("先判斷抽樣設計、估計對象與公式，再展開解答。"),
  selectInput("exercise_id","選擇習題",setNames(1:4,vapply(exercise_questions,`[[`,character(1),"title"))),
  uiOutput("exercise_question"),checkboxInput("exercise_reveal","顯示參考解答與計算",FALSE),conditionalPanel("input.exercise_reveal",uiOutput("exercise_answer")),source_ui)
ci_server<-function(input,output,session) {
  observeEvent(input$ci_method,{if(input$ci_method=="p" && isTRUE(input$ci_n<input$ci_success)) updateNumericInput(session,"ci_n",value=160)})
  observeEvent(input$ci_k,updateSliderInput(session,"ci_frame",max=input$ci_k,value=min(isolate(input$ci_frame),input$ci_k)))
  ci_current<-reactive({
    req(input$ci_method,input$ci_level,input$ci_n)
    validate(need(is.finite(input$ci_n)&&input$ci_n>=2&&input$ci_n<=10000&&input$ci_n==floor(input$ci_n),"n 須為 2–10000 的整數。"))
    if(input$ci_method=="p") {
      req(input$ci_success);validate(need(is.finite(input$ci_success)&&input$ci_success>=0&&input$ci_success<=input$ci_n&&input$ci_success==floor(input$ci_success),"成功人數須為 0 到 n 的整數；第四題請先設 n=160、成功人數=128。"))
      center<-input$ci_success/input$ci_n;v<-ci_prop(center,input$ci_n,input$ci_level)
    } else {
      req(input$ci_xbar,input$ci_spread);validate(need(is.finite(input$ci_xbar)&&is.finite(input$ci_spread)&&input$ci_spread>0,"請輸入有限平均數與正標準差。"))
      center<-input$ci_xbar;v<-ci_mean(center,input$ci_n,input$ci_spread,input$ci_level,input$ci_method)
    };list(center=center,v=v)
  })
  output$ci_result<-renderUI({r<-ci_current();v<-r$v
    tagList(p(sprintf("%.0f%% CI = %.4f ± %.4f × %.4f = [%.4f, %.4f]",100*input$ci_level,r$center,v[4],v[3],v[1],v[2])),
      p(sprintf("半寬 E=%.4f；全寬 W=%.4f",(v[2]-v[1])/2,v[2]-v[1])),
      if(input$ci_method=="p") tagList(p(sprintf("以 p₀=%.3f 規劃，全寬 ≤ %d 百分點：n ≥ %d（向上取整）",r$center,input$ci_width,ceiling(v[4]^2*r$center*(1-r$center)/(input$ci_width/200)^2))),
        p("以先驗比例規劃是近似設計；若比例未知，p₀=0.5 得到保守樣本數。"),
        if(min(input$ci_success,input$ci_n-input$ci_success)<10) p("成功或失敗數小於 10，Wald 近似可能不佳。")))})
  output$ci_single<-renderPlot({r<-ci_current();v<-r$v;op<-par(mar=c(2.5,2,2,2));on.exit(par(op))
    plot(NA,xlim=range(v[1:2])+c(-1,1)*max(diff(v[1:2])*.2,.01),ylim=c(0,2),yaxt="n",ylab="",xlab="",main="單次樣本所建立的信賴區間")
    segments(v[1],1,v[2],1,lwd=4,col="#147da0");points(r$center,1,pch=19);text(v[1:2],1.3,sprintf("%.4f",v[1:2]));text(r$center,.65,"點估計")})
  ci_samples<-reactive({
    req(input$ci_n,input$ci_seed,input$ci_k,input$ci_method)
    validate(need(is.finite(input$ci_n)&&input$ci_n>=2&&input$ci_n<=10000&&input$ci_n==floor(input$ci_n),"請輸入有效樣本數。"),need(is.finite(input$ci_seed)&&input$ci_seed>=1&&input$ci_seed<=2000000000&&input$ci_seed==floor(input$ci_seed),"請輸入有效整數種子。"))
    input$ci_resample;set.seed(input$ci_seed+if(is.null(input$ci_resample)) 0 else input$ci_resample)
    if(input$ci_method=="p") {req(input$ci_pi);ph<-rbinom(input$ci_k,input$ci_n,input$ci_pi)/input$ci_n;list(center=ph,se=sqrt(ph*(1-ph)/input$ci_n),truth=input$ci_pi)}
    else {req(input$ci_sigma,input$ci_mu);validate(need(is.finite(input$ci_sigma)&&input$ci_sigma>0&&is.finite(input$ci_mu),"模擬母體須有有限平均數與正標準差。"))
      m<-matrix(rnorm(input$ci_n*input$ci_k,input$ci_mu,input$ci_sigma),nrow=input$ci_n)
      list(center=colMeans(m),se=if(input$ci_method=="t") apply(m,2,sd)/sqrt(input$ci_n) else rep(input$ci_sigma/sqrt(input$ci_n),input$ci_k),truth=input$ci_mu)}
  })
  ci_intervals<-reactive({s<-ci_samples();q<-if(input$ci_method=="t") qt((1+input$ci_level)/2,input$ci_n-1) else qnorm((1+input$ci_level)/2);lo<-s$center-q*s$se;hi<-s$center+q*s$se;list(lo=lo,hi=hi,center=s$center,truth=s$truth,hit=lo<=s$truth&hi>=s$truth)})
  output$ci_coverage<-renderPlot({
    s<-ci_intervals();shown<-seq_len(min(input$ci_frame,length(s$lo)));j<-tail(shown,100)
    op<-par(mar=c(3.5,4,2.5,1),mgp=c(2.1,.65,0),cex=.88);on.exit(par(op))
    cols<-ifelse(s$hit[j],"#147da0","#c23c50")
    plot(NA,xlim=range(s$lo,s$hi,s$truth),ylim=range(j)+c(-1,1),xlab="母體平均數 μ 的信賴區間",ylab="抽樣次序",
      main=sprintf("%.0f%% 信賴區間：第 %d–%d 次",100*input$ci_level,min(j),max(j)),bty="l")
    abline(h=pretty(range(j)),col="#eff2f5",lwd=.7)
    abline(v=s$truth,lty=2,lwd=1.2,col="#475569")
    segments(s$lo[j],j,s$hi[j],j,col=cols,lwd=1.2)
    points(s$center[j],j,pch=16,cex=.35,col=cols)
  },res=110)
  output$ci_coverage_text<-renderText({s<-ci_intervals();j<-seq_len(min(input$ci_frame,length(s$lo)));sprintf("真值 = %.3f；目前 %d/%d 個區間涵蓋真值（%.1f%%）。有限次模擬不一定恰等於設定的信心水準。",s$truth,sum(s$hit[j]),length(j),100*mean(s$hit[j]))})
  output$exercise_question<-renderUI({req(input$exercise_id);e<-exercise_questions[[as.integer(input$exercise_id)]];tagList(h3(e$title),p(e$context),tags$ol(lapply(e$q,tags$li)))})
  output$exercise_answer<-renderUI({req(input$exercise_id);switch(input$exercise_id,
    `1`=tagList(h3("抽樣設計的判斷"),tags$ol(
      tags$li("簡單隨機抽樣：以完整名冊為抽樣框，亂數等機率選取，並事先約定是否排除重複。"),
      tags$li("系統抽樣（等距抽樣）的做法；但日期個位數不是隨機起點，不能直接保證機率抽樣。應由 1–5 等機率抽取起點，並檢查名冊是否有每 5 人的週期。"),
      tags$li("按性別比例的分層隨機抽樣，前提是男女各層內均真正隨機抽取。若只是湊足 1:4 且方便找人，則成為配額抽樣。"),
      tags$li("二階段抽樣：先隨機抽組，再於組內抽一人。可歸入多階段集群抽樣；若只抽組並訪問整組，才是單階段集群抽樣。組大小不等而各組等機率時，每名學生未必等機率，需按組大小抽組或使用權重。"),
      tags$li("名冊漏列、亂數後任意換人、非隨機起點、排序週期、層內方便取樣、非回應或僅抽到場者，都可能影響隨機性或代表性。"))),
    `2`=tagList(h3("三種分配的層次"),tags$ol(
      tags$li("母體是全臺使用該醫療資源者的年齡分配；μ=50、σ=6。僅憑這兩個量數不能判定分配形狀。"),
      tags$li("樣本是該院該月 16 名病患的年齡分配；x̄=54、s=9。形狀仍未知。"),
      tags$li("若由相同全臺母體獨立抽取 n=16，平均數抽樣分配的 E(X̄)=50、SE=6/√16=1.5。若目標是該高齡社區，不能直接套用全臺母體量數。"),
      tags$li("每次從母體抽出一個樣本，再將各次平均數彙整為抽樣分配。平均數抽樣分配隨 n 增大可趨近常態，但 n=16 無法在未知母體形狀下保證；若母體常態，則抽樣分配精確常態。"),
      tags$li("中央極限定理描述標準化後樣本平均數的抽樣分配，不是單次樣本或母體本身。"))),
    `3`={rows<-do.call(rbind,lapply(c(16,160),function(n) do.call(rbind,lapply(c("z","t"),function(m){v<-ci_mean(54,n,if(m=="z") 6 else 9,.95,m);data.frame(n=n,方法=if(m=="z") "σ=6，z" else "s=9，t",SE=sprintf("%.4f",v[3]),臨界值=sprintf("%.4f",v[4]),下限=sprintf("%.4f",v[1]),上限=sprintf("%.4f",v[2]),全寬=sprintf("%.4f",v[2]-v[1]),check.names=FALSE)}))))
      tagList(h3("四個平均數信賴區間"),HTML(as.character(tags$table(class="table table-striped table-bordered",tags$thead(tags$tr(lapply(names(rows),tags$th))),tags$tbody(lapply(seq_len(nrow(rows)),function(i) tags$tr(lapply(rows[i,],tags$td))))))),
        p("第1題用 z×6/√16；第2題用 t(0.975,15)×9/√16；第3題分別改為 n=160 與 df=159。四者中心都是54歲。n 增加會縮小區間；本題 t 區間較寬，同時受到 s=9 大於 σ=6 與 t 臨界值較大的影響，不能全歸因於 t。"),
        p("n=16 的精確 z、t 推論需獨立常態母體假設；若年齡強烈偏態，僅有摘要資料無法驗證其適切性。全臺 σ=6 是否適用社區是額外假設。n=160 也不能修正該院病患對社區可能存在的選樣偏差。"))},
    `4`={v<-ci_prop(.8,160);nn<-ceiling(qnorm(.975)^2*.8*.2/.05^2)
      tagList(h3("比例區間與樣本數"),p(sprintf("1. p̂=128/160=0.8；SE=√(0.8×0.2/160)=%.5f。95%% Wald CI = [%.4f, %.4f]，約 [%.2f%%, %.2f%%]。",v[3],v[1],v[2],100*v[1],100*v[2])),
        p(sprintf("2. 將『範圍10%%』解讀為全寬10個百分點，因此 E=0.05。n ≥ 1.96²×0.8×0.2/0.05²，向上取整至少 %d 人。",nn)),
        p(sprintf("若題意是正負10個百分點（半寬0.10），則至少 %d 人；若事前比例未知，用 p₀=0.5 保守規劃，全寬10個百分點需 %d 人。",ceiling(qnorm(.975)^2*.8*.2/.1^2),ceiling(qnorm(.975)^2*.25/.05^2))),
        p("此處依教材使用大樣本 Wald 公式，樣本數為先驗比例0.8下的近似規劃；比例區間不因樣本數小便改用 t。社區推論仍須有適當抽樣設計。"))})})
}

# 比例抽樣分配與三種二項比例區間。所有圖表共用以下計算函數。
binomial_intervals <- function(x,n,level=.95,method="wald") {
  stopifnot(n>=1,n==floor(n),all(is.finite(x)),all(x>=0 & x<=n & x==floor(x)),level>0,level<1)
  p<-x/n;z<-qnorm((1+level)/2);a<-1-level
  if(method=="wald") {h<-z*sqrt(p*(1-p)/n);lo<-p-h;hi<-p+h}
  else if(method=="wilson") {d<-1+z^2/n;c0<-(p+z^2/(2*n))/d;h<-z*sqrt(p*(1-p)/n+z^2/(4*n^2))/d;lo<-pmax(0,c0-h);hi<-pmin(1,c0+h)}
  else if(method=="exact") {
    lo<-numeric(length(x));hi<-rep(1,length(x));i<-x>0;j<-x<n
    lo[i]<-qbeta(a/2,x[i],n-x[i]+1);hi[j]<-qbeta(1-a/2,x[j]+1,n-x[j])
  } else stop("未知比例區間方法")
  data.frame(lower=lo,upper=hi,estimate=p,width=hi-lo)
}
prop_methods<-c("Wald 常態近似"="wald","Wilson 分數區間"="wilson","Clopper–Pearson 精確區間"="exact")
eq<-function(latex) div(class="home-equation",paste0("\\[",latex,"\\]"))
mean_theory<-tagList(h2("平均數的抽樣分配"),p("Sampling distribution of the mean"),
  p("母體分配（population distribution）描述個別觀察值 X；樣本分配（sample distribution）描述某一次抽出的 n 筆觀察值；抽樣分配（sampling distribution）描述同一抽樣設計下，某個樣本統計量在重複抽樣間的變化。每次抽出 n 筆資料得到一個平均數，重複 k 次就得到 k 個平均數。"),
  h3("平均數的中心與標準誤"),
  p("在前述獨立同分配且有限變異數的條件下，平均數的期望值（expected value）、變異數（variance）及標準誤（standard error, SE）為："),
  eq(r"(\bar X=\frac{1}{n}\sum_{i=1}^{n}X_i,\qquad E(\bar X)=\mu,\qquad \operatorname{Var}(\bar X)=\frac{\sigma^2}{n})"),
  eq(r"(\sigma_{\bar X}=\operatorname{SE}(\bar X)=\frac{\sigma}{\sqrt n},\qquad \widehat{\operatorname{SE}}(\bar X)=\frac{s}{\sqrt n})"),
  eq(r"(\bar X\ \dot\sim\ N\!\left(\mu,\frac{\sigma^2}{n}\right))"),
  p("期望值、變異數與標準誤是精確量數關係；常態近似（normal approximation）則由前述 CLT 提供依據。請區分抽樣分配的中心、離散程度與形狀三個面向。"),
  h3("每次樣本數 n 與重複次數 k"),p("增加 n 會縮小理論 SE；n 變成 4 倍，SE 減半。增加 k 只改善模擬精度，不改變理論抽樣分配。"),
  actionButton("go_demo","探索平均數抽樣分配 →",class="btn-primary"))
prop_theory<-tagList(h2("比例的抽樣分配"),p("Sampling distribution of the proportion"),
  p("把某一類反應編為成功 1，其他反應編為失敗 0。母體成功比例為 π，每筆資料為柏努利隨機變數（Bernoulli random variable）。獨立抽取 n 人，成功人數 Y 服從二項分配（binomial distribution）；樣本比例 p=Y/n 就是 0、1 資料的樣本平均數。本頁沿用教材以 p 表示樣本比例，亦常記為 p̂。"),
  eq(r"(X_i\sim\operatorname{Bernoulli}(\pi),\qquad Y=\sum X_i\sim B(n,\pi),\qquad p=\hat p=\frac{Y}{n})"),
  eq(r"(P\!\left(p=\frac{y}{n}\right)=\binom{n}{y}\pi^y(1-\pi)^{n-y},\quad y=0,1,\ldots,n)"),
  h3("中心、變異數與標準誤"),
  eq(r"(\mu_p=E(p)=\pi\tag{8-27})"),eq(r"(\sigma_p^2=\operatorname{Var}(p)=\frac{\pi(1-\pi)}{n}\tag{8-28})"),
  eq(r"(\sigma_p=\sqrt{\frac{\pi(1-\pi)}{n}},\qquad s_p=\sqrt{\frac{p(1-p)}{n}}\tag{8-29})"),
  p("σₚ 是由真實母體比例計算的理論標準誤；sₚ 是以樣本比例代入的估計標準誤（estimated standard error）。二者不可混為同一個固定值。"),
  eq(r"(p\ \dot\sim\ N\!\left(\pi,\frac{\pi(1-\pi)}{n}\right),\qquad Z=\frac{p-\pi}{\sqrt{\pi(1-\pi)/n}}\ \dot\sim\ N(0,1))"),
  p("常態近似除了 n，也取決於 π。常見檢核是 nπ 與 n(1−π) 均至少 10；這是經驗判準，不是定理的硬性界線。π 接近 0 或 1 時，即使 n=30 也可能近似不佳。π=0 或1時是退化分配（degenerate distribution），標準化公式不適用。"),
  p("對照：平均數以 μ、σ 描述母體；比例以 π 描述母體，而其柏努利母體變異數為 π(1−π)。兩者都由重複抽樣形成統計量的抽樣分配。"),
  actionButton("go_prop","探索比例抽樣分配 →",class="btn-primary"))
prop_ci_theory<-tagList(h2("比例的三種信賴區間"),
  p("Confidence interval（CI）以樣本資料估計母體比例 π。令 x 為成功人數，p=x/n，α=1−信心水準，z=z₁₋α/₂。區間寫成 LL≤π≤UL；π 是待估參數，不是區間端點公式的左側單邊不等式。"),
  h3("Wald interval 常態近似區間"),p("以樣本比例為中心，將估計標準誤代入常態近似。公式簡單；在小樣本或極端比例下，涵蓋率可能明顯不足，端點也可能超出 [0,1]。p=0 或1時會退化為零寬區間。示範保留原始端點，便於觀察此問題。"),
  eq(r"([LL,UL]=p\pm z\sqrt{\frac{p(1-p)}{n}})"),
  h3("Wilson score interval 分數區間"),p("反解二項比例的分數檢定（score test），使標準誤中的待估母體比例也納入計算。端點落在 [0,1]，通常比 Wald 有更穩定的涵蓋表現，但仍不保證每個 π 下均達名目信心水準。"),
  eq(r"([LL,UL]=\frac{p+\frac{z^2}{2n}\ \pm\ z\sqrt{\frac{p(1-p)}{n}+\frac{z^2}{4n^2}}}{1+\frac{z^2}{n}})"),
  h3("Clopper–Pearson exact interval 精確二項區間"),p("由等尾二項檢定反演得到，可用 Beta 分配分位數（beta quantile）計算。在二項抽樣模型下，涵蓋率至少達名目水準，通常較保守；可用於任何樣本數，並非只適用 n<30。『精確』指計算基於二項模型，並非區間一定較窄或涵蓋率恰好等於95%。"),
  eq(r"(LL=\begin{cases}0,&x=0\\B^{-1}(\alpha/2;x,n-x+1),&x>0\end{cases})"),
  eq(r"(UL=\begin{cases}1,&x=n\\B^{-1}(1-\alpha/2;x+1,n-x),&x<n\end{cases})"),
  p("信心水準（confidence level）描述方法的長期涵蓋率（coverage probability）；不是已算出區間內參數的隨機機率。區間全寬（interval width）為 UL−LL；誤差界限（margin of error）只在對稱區間時可直接用半寬解讀。"),
  h3("三種方法的應用時機與優缺點"),
  div(style="overflow-x:auto",tags$table(class="table table-striped table-bordered ci-method-guide",
    tags$thead(tags$tr(tags$th("方法 Method"),tags$th("適用情境"),tags$th("優點"),tags$th("限制與代價"))),
    tags$tbody(
      tags$tr(tags$td("Wald"),tags$td("基礎教學、手算與大樣本近似比較；比例遠離0、1且成功與失敗數均充足時較合理。"),tags$td("計算簡單、以樣本比例為中心，容易看出估計值 ± 誤差界限的結構。"),tags$td("涵蓋率可能不足；小樣本及極端比例較差，可能超界；x=0或n時零寬。直接截斷端點無法解決涵蓋率問題。")),
      tags$tr(tags$td("Wilson score"),tags$td("獨立二項資料的單一比例，如盛行率、陽性率、成功率；診斷研究可用於敏感度與特異度。"),tags$td("端點位於[0,1]；相較 Wald，通常兼顧涵蓋率與區間長度，邊界情況仍可計算。"),tags$td("通常不以樣本比例為對稱中心；仍是近似方法，不保證每個真實比例都達名目涵蓋率。")),
      tags$tr(tags$td("Clopper–Pearson exact"),tags$td("稀少事件、小樣本、零事件，以及重視不低於名目涵蓋率的二項資料；醫藥與診斷研究可見此法。"),tags$td("依二項模型推論，不依賴常態近似；端點位於[0,1]，零事件也有非零的上界。"),tags$td("通常較保守、區間較寬，精確不代表估計更精密；仍須滿足獨立且成功機率相同的二項模型。"))))),
  h3("公衛與醫藥研究如何選擇"),
  p(tags$strong("一般單一比例研究："),"在獨立二項抽樣條件下，Wilson 可作為兼顧區間長度與涵蓋表現的選擇；這是依方法性質提出的選用建議，不表示所有公衛研究都慣用同一種方法。",tags$a("［NIST］",href="https://www.itl.nist.gov/div898/handbook/prc/section2/prc241.htm",target="_blank",rel="noopener noreferrer")),
  p(tags$strong("診斷試驗 Diagnostic accuracy study："),"敏感度（sensitivity）與特異度（specificity）的分母分別是有病與無病的人數。FDA 診斷試驗指引討論 score 區間與精確 Clopper–Pearson 區間兩種選擇，因此不能簡化成『醫藥研究一律用精確法』。選法應與研究計畫及分析目的相符。",tags$a("［FDA 指引］",href="https://www.fda.gov/regulatory-information/search-fda-guidance-documents/statistical-guidance-reporting-results-studies-evaluating-diagnostic-tests-guidance-industry-and-fda",target="_blank",rel="noopener noreferrer")),
  p(tags$strong("臨床療效與安全性 Clinical efficacy and safety："),"單組反應率（response rate）、稀少不良事件（rare adverse event）等情境，可採 Clopper–Pearson 保守呈現二項比例的不確定性；FDA 的藥品審查資料也有反應率採此法的實例。這是使用實例，並非所有臨床試驗的統一規定。",tags$a("［FDA 統計審查實例］",href="https://www.fda.gov/media/113637/download",target="_blank",rel="noopener noreferrer")),
  p(tags$strong("大型公衛調查 Complex health survey："),"若有分層、集群與抽樣權重，不能把加權比例與原始 n 直接代入本頁三種簡單二項公式。CDC/NCHS 的健康統計採用考慮複雜設計與有效樣本數的 Korn–Graubard 方法；應先處理抽樣設計，再選擇適合的區間方法。",tags$a("［CDC/NCHS］",href="https://www.cdc.gov/nchs/hus/sources-definitions/statistical-reliability.htm",target="_blank",rel="noopener noreferrer")),
  h3("用例與判斷練習"),
  tags$ol(tags$li("20人中1人出現不良事件：比較三種區間的下限、上限及全寬。Wald 可超出0；Wilson 與精確法的差別在計算原理與涵蓋性質，不只是端點是否超界。"),
    tags$li("30人中未出現任何不良事件：觀察 Wald 的 [0,0]。零事件不表示母體風險為零；Wilson 與 Clopper–Pearson 仍提供正的上界。"),
    tags$li("診斷工具在有病者中檢出95/100：以敏感度為估計目標，比較 score 與精確區間，再說明採用方法。"),
    tags$li("全國健康調查報告的加權盛行率：先確認分層、集群與權重，不直接套用獨立二項公式。")),
  p("本頁三種 CI 估計的是單一比例。兩組風險差（risk difference）、相對風險（risk ratio）與勝算比（odds ratio）有各自的區間方法，不能直接套用本頁公式。"),


  p(tags$a("NIST：Wilson 與二項比例區間",href="https://www.itl.nist.gov/div898/handbook/prc/section2/prc241.htm",target="_blank")),
  p(tags$a("R stats：Clopper–Pearson 區間與原始文獻",href="https://stat.ethz.ch/R-manual/R-devel/library/stats/html/binom.test.html",target="_blank")))
clt_theory<-tagList(
  h2("中央極限定理"),p("Central limit theorem（CLT）"),
  p("中央極限定理說明：在適當條件下，許多隨機變數之和或平均數經過標準化後，其分配趨近標準常態。它連結抽樣分配與常態機率，讓我們能量化抽樣波動，進而建構近似的檢定與信賴區間。"),
  h3("從二項近似到一般定理"),
  tags$ol(
    tags$li(tags$strong("1733年　棣美弗 Abraham de Moivre（1667–1754）："),"研究大量柏努利試驗的二項機率，得到常態曲線近似的早期成果，尤其是成功機率為1/2的情形。這是現代 CLT 的重要前身，而非一次完成今日所有版本。"),
    tags$li(tags$strong("1810至1812年　拉普拉斯 Pierre-Simon Laplace（1749–1827）："),"擴展極限近似的研究，並在1812年的《機率分析理論》（Théorie analytique des probabilités）中系統呈現相關成果。二項分配的常態近似因此常稱為棣美弗–拉普拉斯定理（de Moivre–Laplace theorem），是 CLT 的特例。"),
    tags$li(tags$strong("約1901年　李雅普諾夫 Aleksandr Lyapunov（1857–1918）："),"提出較一般的充分條件並推進嚴格證明，使極限定理可處理更廣泛的獨立隨機變數。之後仍發展出許多不同條件下的 CLT。")),
  p("歷史重點：CLT 由多位學者逐步發展，並非『樣本超過30便一定常態』的單一規則，也不是說原始母體會因抽樣而改變形狀。"),
  h3("本課程使用的版本與條件"),
  p("設 X₁,…,Xₙ 獨立同分配（independent and identically distributed, i.i.d.），母體平均數 μ 有限，且0<σ²<∞。則："),
  eq(r"(\frac{\sum_{i=1}^{n}X_i-n\mu}{\sigma\sqrt n}=\frac{\bar X-\mu}{\sigma/\sqrt n}\xrightarrow{d}N(0,1))"),
  p("這裡的收斂是分配收斂（convergence in distribution）。有限 n 的常態近似程度取決於母體偏態與尾端；若母體原本常態，樣本平均數在任何 n 都精確常態。對相依資料或無限變異數母體，不能直接套用這個版本。"),
  h3("與大數法則的差別"),
  p("大數法則（law of large numbers）說明樣本平均數會接近母體平均數；CLT 描述經適當放大及標準化後，剩餘抽樣波動的分配形狀。前者談集中，後者談波動的極限分配。"),
  hr(),mean_theory,hr(),prop_theory,
  p(class="intro-source","歷史參考：MacTutor 的棣美弗傳記；Hald《A History of Mathematical Statistics from 1750 to 1930》；Durham University 機率論講義。"),
  p(tags$a("MacTutor：Abraham de Moivre",href="https://mathshistory.st-andrews.ac.uk/Biographies/De_Moivre/",target="_blank",rel="noopener noreferrer"),"；",tags$a("Hald：歷史著作目錄與年代",href="https://www.york.ac.uk/depts/maths/histstat/haldcontents.htm",target="_blank",rel="noopener noreferrer"),"；",tags$a("Durham：CLT 與歷史簡介",href="https://www.maths.dur.ac.uk/users/clare.wallace/Prob1/Probability-1-lecture-notes.pdf",target="_blank",rel="noopener noreferrer")))
point_theory<-tagList(
  h2("點估計"),p("Point estimation"),
  p("點估計以樣本資料計算一個數值，作為未知母體參數的估計。例如用16名病患的平均年齡54歲估計社區使用者的平均年齡，用160人中的128名男性估計男性比例為0.8。點估計提供一個中心值，本身未交代抽樣不確定性有多大。"),
  h3("母體參數、估計量與估計值"),
  p("母體參數（population parameter）θ 是欲推知的固定未知數；估計量（estimator）θ̂=T(X₁,…,Xₙ) 是一個計算規則，在抽樣前為隨機變數；估計值（estimate）是實際觀察資料後算出的數字。例如 X̄ 是估計量，54歲是這次的估計值。"),
  eq(r"(\hat\mu=\bar X=\frac{1}{n}\sum X_i,\qquad\hat\pi=p=\frac{x}{n},\qquad\hat\sigma^2=s^2=\frac{\sum(X_i-\bar X)^2}{n-1})"),
  h3("如何評估估計量"),
  tags$ul(
    tags$li(tags$strong("不偏性 Unbiasedness："),"重複抽樣下估計量的期望值等於參數，即 E(θ̂)=θ。不偏是長期性質，不表示每次估計都剛好正確。獨立同分配且相關動差存在時，X̄、p與s²分別為μ、π與σ²的不偏估計量；s不因此自動成為σ的不偏估計量。"),
    tags$li(tags$strong("一致性 Consistency："),"當 n 增加時，估計量以機率收斂至真實參數。不偏與一致是不同性質；增加樣本數也不能自行消除抽樣框漏列等系統偏差。"),
    tags$li(tags$strong("效率 Efficiency："),"在相同模型與比較條件下，抽樣變異較小的估計量通常更精確；不能只比較某一次樣本的數字是否接近真值。")),
  eq(r"(\operatorname{Bias}(\hat\theta)=E(\hat\theta)-\theta,\qquad\operatorname{MSE}(\hat\theta)=\operatorname{Var}(\hat\theta)+\operatorname{Bias}(\hat\theta)^2)"),
  p("均方誤差（mean squared error, MSE）同時考慮偏差與變異；因此不能只憑不偏性就斷定估計量最好。標準誤（standard error, SE）則是估計量抽樣分配的標準差，量化重複抽樣的波動。"),
  h3("點估計範例與限制"),
  p("年齡資料 n=16、x̄=54、s=9：μ的點估計為54歲，估計 SE=9/√16=2.25歲。男性人數128/160：π的點估計為0.8，估計 SE=√(0.8×0.2/160)≈0.03162。SE 是不確定性的量數，並不是母體參數的估計誤差已知恰等於該數字。"),
  p("點估計要能推論到目標母體，仍依賴抽樣設計、資料品質與模型條件。單一醫院的病患是否代表整個社區，不能只由樣本數或公式判斷。"))
interval_theory<-tagList(
  h2("區間估計"),p("Interval estimation and confidence interval（CI）"),
  p("區間估計用樣本資料建立下限 LL（lower limit）與上限 UL（upper limit），以區間 [LL,UL] 表達未知參數的合理範圍及估計精確度。LL與UL在抽樣前是隨機的，母體參數θ在頻率學派的設定中固定；抽樣完成後，這次區間是否涵蓋θ已是確定事實。"),
  h3("信心水準與涵蓋率"),
  eq(r"(P_{\theta}\{LL(X)\leq\theta\leq UL(X)\}=1-\alpha)"),
  p("上式表示精確涵蓋機率為1−α的理想情形；近似區間通常只近似達到它，保守區間可能高於它。95%信心水準（confidence level）是指：依同一方法重複抽樣並建構區間，長期約95%的區間涵蓋固定真值。α稱為不涵蓋機率；對應雙尾檢定時亦稱顯著水準（significance level）。"),
  p("正確解讀：『以此方法建立母體平均數的95%信賴區間為[51.06,56.94]歲。』它不表示95%的病患年齡落在區間內，也不表示已知這個固定區間後，μ有95%的隨機機率在其中。單次區間不保證涵蓋真值。"),
  h3("建構區間的步驟"),
  tags$ol(tags$li("界定目標母體與待估參數，確認樣本設計及模型條件。"),tags$li("計算點估計與適合的標準誤，選定信心水準及區間方法。"),tags$li("使用相應的抽樣分配、檢定反演或精確機率求上下限。"),tags$li("報告估計值、信心水準、上下限與使用方法，並說明推論範圍。")),
  h3("對稱區間的結構"),
  eq(r"([LL,UL]=\hat\theta\pm c\operatorname{SE}(\hat\theta),\qquad E=c\operatorname{SE}(\hat\theta),\qquad W=UL-LL=2E)"),
  p("c為臨界值（critical value），E為誤差界限（margin of error），W為區間全寬（interval width）。這個『估計值±誤差界限』結構適用於此類對稱區間；Wilson與Clopper–Pearson一般不以樣本比例為對稱中心，不能全部寫成 p±同一個E。"),
  h3("平均數與比例採用不同方法"),
  eq(r"(\text{已知 }\sigma:\quad\bar x\pm z_{1-\alpha/2}\frac{\sigma}{\sqrt n},\qquad\text{未知 }\sigma:\quad\bar x\pm t_{1-\alpha/2,n-1}\frac{s}{\sqrt n})"),
  p("平均數的z與t區間在獨立常態樣本下有精確性質；一般母體的大樣本可考慮近似。σ未知時使用t，不限於n<30。比例則可用Wald、Wilson或Clopper–Pearson；其原理、公式、適用時機及公衛醫藥例子列在『比例的三種信賴區間』頁。"),
  h3("年齡範例"),
  p("同樣 n=16、x̄=54：若σ=6已知，95% CI=54±1.960×1.5=[51.06,56.94]歲；若σ未知、s=9，使用df=15的t臨界值2.131，95% CI=54±2.131×2.25=[49.20,58.80]歲。兩例同時改變標準差來源及臨界值，不能把寬度差全歸因於t分配。"),
  h3("什麼會影響區間寬度"),
  p("其他條件相同時，信心水準越高，臨界值越大、區間越寬；母體或資料變異越大，SE越大；n增加則SE通常下降。已知σ的z區間中，n變成4倍會使全寬減半；t與部分比例方法的臨界值或結構也隨n改變，宜看完整公式。"),
  p("信賴區間描述參數估計的不確定性；預測區間（prediction interval）描述未來個別觀察值的變動，兩者不同。縮窄CI也不能修補便利取樣、非回應或測量偏差。"),
  p(tags$a("NIST：信賴區間的意義",href="https://www.itl.nist.gov/div898/handbook/prc/section1/prc14.htm",target="_blank",rel="noopener noreferrer"),"；",tags$a("NIST：平均數的信賴界限",href="https://www.itl.nist.gov/div898/handbook/eda/section3/eda352.htm",target="_blank",rel="noopener noreferrer")))

home_ui<-withMathJax(div(class="intro-home",tabsetPanel(
  tabPanel("基本概念",h2("抽樣分配與估計"),p("Sampling Distribution and Estimation"),
    p("抽樣（sampling）從目標母體選取樣本；估計（estimation）用樣本資料推知未知母體參數。隨機抽樣與合適的抽樣框（sampling frame）是推論的基礎；本章依序介紹抽樣分配、中央極限定理、點估計與區間估計。"),
    h3("從母體到樣本"),
    p("母體（population）是研究希望了解的全體對象；樣本（sample）是實際觀察的一部分。母體參數（population parameter）描述母體特性，例如平均數 μ 與比例 π；樣本統計量（sample statistic）由樣本資料計算，例如平均數 x̄ 與比例 p。估計的目的，就是用可觀察的樣本統計量推知未知的母體參數。"),
    h3("抽樣如何支持推論"),
    p("先界定目標母體，再建立抽樣框（sampling frame）並選擇抽樣方法。機率抽樣（probability sampling）使每個單位具有已知的入樣機率，讓抽樣變異可以依設計評估；也要留意抽樣框涵蓋、非回應與測量品質。樣本數大並不自動保證具有代表性。"),
    p("即使抽樣方式相同，換一批樣本也會得到不同的統計量，這就是抽樣波動。估計值與真實參數的差異稱為估計誤差（estimation error）；其中由隨機抽樣造成的部分稱為抽樣誤差（sampling error）。抽樣分配（sampling distribution）描述統計量在重複抽樣間如何變動，標準誤（standard error, SE）則量化這種變動的大小。"),
    h3("從樣本到參數估計"),
    p("估計有兩種基本表達方式：點估計（point estimation）提供一個數值；區間估計（interval estimation）以一組上下限表達不確定性。以下先介紹兩者的概念與解讀，再於『中央極限定理』說明抽樣分配的理論依據，並在後續原理頁介紹不同區間方法。"),
    hr(),point_theory,hr(),interval_theory),
  tabPanel("中央極限定理",clt_theory),


  tabPanel("平均數的區間估計",h2("平均數的區間估計 Interval estimation for the mean"),
    p("點估計（point estimation）以 x̄ 估計 μ；區間估計（interval estimation）進一步描述估計的不確定性。"),
    h3("σ 已知　z confidence interval"),eq(r"([LL,UL]=\bar x\pm z_{1-\alpha/2}\frac{\sigma}{\sqrt n})"),
    h3("σ 未知　Student’s t confidence interval"),eq(r"([LL,UL]=\bar x\pm t_{1-\alpha/2,n-1}\frac{s}{\sqrt n},\qquad df=n-1)"),
    p("df 為自由度（degrees of freedom）。在獨立常態樣本下，上述區間有精確涵蓋性質；大樣本時可作近似。σ 未知時使用 t，不限於 n<30。小樣本且強烈非常態時，改用 t 並不自動解決問題。"),
    p("其他條件相同時，提高信心水準或增加標準差會使區間變寬；增加 n 會縮小區間。母體平均數的 CI 與個別觀察值的預測區間（prediction interval）不同。")),
  tabPanel("比例的三種信賴區間",prop_ci_theory)),source_ui))
prop_demo_ui<-sidebarLayout(sidebarPanel(width=3,
  sliderInput("ps_pi","母體比例 π（population proportion）",0,1,.5,.01),
  sliderInput("ps_n","每次樣本數 n（sample size）",1,1200,30,1),
  sliderInput("ps_k","重複抽樣次數 k",100,5000,1000,100),
  numericInput("ps_seed","隨機種子",1234,min=1,max=2000000000,step=1),actionButton("ps_again","重新抽樣",class="btn-primary"),
  checkboxInput("ps_normal","顯示常態近似",TRUE),
  p("每次抽出 n 筆 0/1 資料，只保留一個比例 p；獨立重複 k 次。")),mainPanel(width=9,
  uiOutput("ps_stats"),tabsetPanel(tabPanel("比例抽樣分配",plotOutput("ps_plot",height="420px"),uiOutput("ps_note")),
    tabPanel("單次樣本與公式代入",uiOutput("ps_sample")),tabPanel("不同 n 比較",plotOutput("ps_compare",height="520px"))),
  actionButton("go_prop_ci","前往比例區間估計：三種 CI 動態比較 →",class="btn-primary"),p("藍線：精確二項機率；圓點：模擬相對次數；橘色虛線：常態近似在各比例格點對應小區間的機率（連續性修正 continuity correction）。縱軸為機率，並非密度。")))
prop_ci_ui<-sidebarLayout(sidebarPanel(width=3,
  numericInput("pc_n","每次樣本數 n",10,min=1,max=2000,step=1),
  sliderInput("pc_level","信心水準（confidence level）",.8,.99,.95,.01),
  hr(),h4("動態重複抽樣"),
  sliderInput("pc_pi","母體比例 π",.001,.999,.1,.001),
  sliderInput("pc_k","重複次數 k",20,500,100,10),
  sliderInput("pc_frame","逐次顯示三種 CI（按播放鍵）",1,100,1,1,animate=animationOptions(interval=350,loop=FALSE)),
  numericInput("pc_seed","隨機種子",2026,min=1,max=2000000000,step=1),actionButton("pc_again","重新產生樣本",class="btn-primary"),
  hr(),h4("單次區間與樣本數規劃"),numericInput("pc_x","單次成功人數 x",1,min=0,max=10,step=1),
  checkboxInput("pc_clip","另畫 Wald 直接截斷至 [0,1] 的參考",TRUE),
  sliderInput("pc_width","規劃區間全寬（百分點）",2,30,10,1)),
  mainPanel(width=9,tabsetPanel(id="prop_ci_view",selected="animation",
    tabPanel("動態示範｜三種 CI 同時比較",value="animation",
      p("每一列是同一次抽樣，三欄分別用三種方法建構 CI。淡橘區域超出 [0,1]，橘色粗線標出超界部分；藍色涵蓋真值、紅色未涵蓋，黑色虛線為母體 π。"),
      plotOutput("pc_animation",height="420px"),textOutput("pc_animation_note"),
      h4("目前這一次抽樣的三種區間"),tableOutput("pc_current_table"),
      h4("三種方法的涵蓋率與超界比較"),tableOutput("pc_coverage_table"),
      p("模擬統計只累計至目前播放次序；精確涵蓋率以所有 x=0,…,n 的二項機率加權計算。圖中顯示最近100次，統計則累計全部已播放樣本。")),
    tabPanel("單次區間並列比較",value="single",uiOutput("pc_substitution"),tableOutput("pc_table"),plotOutput("pc_plot",height="300px"),
      p("Wilson 與 Clopper–Pearson 依各自原理重新計算端點，並非將 Wald 超出的部分直接截斷。灰色虛線僅為直接截斷 Wald 的參考，不能解決其涵蓋率或零寬區間問題。"),uiOutput("pc_plan")),
    tabPanel("原理與公式",value="theory",withMathJax(div(class="intro-home",prop_ci_theory,source_ui))))))

sampling_parts_server<-function(input,output,session) {
  for(id in c("go_prop")) local({button<-id;observeEvent(input[[button]],updateTabsetPanel(session,"main_page",selected="proportion"))})
  observeEvent(input$go_prop_ci,{updateTabsetPanel(session,"main_page",selected="ci");updateTabsetPanel(session,"ci_section",selected="prop")})

  ps<-reactive({req(input$ps_n,input$ps_k,input$ps_pi,input$ps_seed);validate(need(is.finite(input$ps_seed)&&input$ps_seed>=1&&input$ps_seed<=2000000000&&input$ps_seed==floor(input$ps_seed),"請輸入有效整數種子。"));input$ps_again
    set.seed(input$ps_seed+if(is.null(input$ps_again)) 0 else input$ps_again)
    y<-rbinom(input$ps_k,input$ps_n,input$ps_pi);list(y=y,p=y/input$ps_n,n=input$ps_n,pi=input$ps_pi)
  })
  output$ps_stats<-renderUI({s<-ps();div(class="formula",sprintf("π=%.3f　n=%d　E(p)=%.3f　理論 SE=%.5f　模擬 SD(p)=%.5f",s$pi,s$n,s$pi,sqrt(s$pi*(1-s$pi)/s$n),sd(s$p)))})
  draw_prop<-function(n,pi,sim,normal,main) {
    y<-0:n;p<-y/n;prob<-dbinom(y,n,pi);freq<-tabulate(sim+1,nbins=n+1)/length(sim)
    approx<-if(pi>0&&pi<1) pnorm((y+.5)/n,pi,sqrt(pi*(1-pi)/n))-pnorm((y-.5)/n,pi,sqrt(pi*(1-pi)/n)) else rep(0,n+1)
    plot(p,prob,type=if(n<=80) "h" else "l",lwd=2,col="#147da0",xlim=c(0,1),ylim=c(0,max(prob,freq,if(normal) approx else 0)*1.15),xlab="",ylab="機率 P(p=y/n)",main=main)
    points(p,freq,pch=16,cex=.45,col="#475569");if(normal&&pi>0&&pi<1) lines(p,approx,col="#bb6b26",lty=2,lwd=2)
    abline(v=pi,col="#c23c50",lty=3);mtext("p",side=1,line=.7,at=1.05,adj=0,xpd=NA)
  }
  output$ps_plot<-renderPlot({s<-ps();op<-par(mar=c(2.7,4.5,3,2));on.exit(par(op));draw_prop(s$n,s$pi,s$y,isTRUE(input$ps_normal),"比例的抽樣分配 Sampling distribution of the proportion")})
  output$ps_note<-renderUI({s<-ps();if(s$pi %in% c(0,1)) p("母體比例為0或1，所有樣本比例固定，SE=0；無法進行 Z 標準化。") else p(sprintf("常態近似檢核：nπ=%.2f，n(1−π)=%.2f。%s",s$n*s$pi,s$n*(1-s$pi),if(min(s$n*s$pi,s$n*(1-s$pi))<10) "至少一項低於10，可觀察與精確二項機率的差異。" else "兩項均達10，通常有較好的常態近似。"))})
  output$ps_sample<-renderUI({s<-ps();x<-s$y[1];p<-x/s$n;tagList(h3("其中一次樣本"),p(sprintf("成功 x=%d；失敗 n−x=%d；樣本比例 p=x/n=%.5f。",x,s$n-x,p)),p(sprintf("理論 SE=√[π(1−π)/n]=%.5f；本次估計 SE=√[p(1−p)/n]=%.5f。",sqrt(s$pi*(1-s$pi)/s$n),sqrt(p*(1-p)/s$n))),p("k 個樣本比例的平均與標準差，是抽樣分配中心及 SE 的模擬估計。"))})
  output$ps_compare<-renderPlot({s<-ps();set.seed(input$ps_seed);op<-par(mfrow=c(2,2),mar=c(3,4,3,2));on.exit(par(op));for(n in c(5,30,100,500)) draw_prop(n,s$pi,rbinom(input$ps_k,n,s$pi),isTRUE(input$ps_normal),sprintf("n=%d；SE=%.4f",n,sqrt(s$pi*(1-s$pi)/n)))})
  observeEvent(input$pc_n,{if(is.finite(input$pc_n)&&input$pc_n>=1) {updateNumericInput(session,"pc_x",max=input$pc_n);if(isTRUE(isolate(input$pc_x)>input$pc_n)) updateNumericInput(session,"pc_x",value=input$pc_n)}})
  observeEvent(input$pc_k,updateSliderInput(session,"pc_frame",max=input$pc_k,value=min(isolate(input$pc_frame),input$pc_k)))
  pc_valid<-reactive({req(input$pc_n,input$pc_x,input$pc_level);validate(need(is.finite(input$pc_n)&&input$pc_n>=1&&input$pc_n<=2000&&input$pc_n==floor(input$pc_n),"n 須為1–2000整數。"),need(is.finite(input$pc_x)&&input$pc_x>=0&&input$pc_x<=input$pc_n&&input$pc_x==floor(input$pc_x),"x 須為0–n整數。"));TRUE})
  pc_comparison<-reactive({pc_valid();do.call(rbind,lapply(unname(prop_methods),function(m) binomial_intervals(input$pc_x,input$pc_n,input$pc_level,m)))})
  output$pc_plan<-renderUI({pc_valid();req(input$pc_width);p0<-input$pc_x/input$pc_n;extreme<-p0 %in% c(0,1);if(extreme) p0<-.5;nn<-ceiling(qnorm((1+input$pc_level)/2)^2*p0*(1-p0)/(input$pc_width/200)^2);tagList(h4("樣本數規劃 Sample size planning"),p(sprintf("以 p₀=%.3f、全寬 W=%d 個百分點（E=W/2）規劃：n ≥ z²p₀(1−p₀)/E²，向上取整至少 %d 人。",p0,input$pc_width,nn)),p("此為 Wald 大樣本近似規劃，不保證 Wilson 或精確區間恰好達到該全寬；若先驗比例未知可用 p₀=0.5 保守規劃。"),if(extreme) p("本次樣本比例為0或1，不能據此規劃零樣本；此處改採 p₀=0.5。"))})
  output$pc_substitution<-renderUI({pc_valid();p(sprintf("x=%d，n=%d，p=x/n=%.5f，α=%.3f，z=%.5f。下列三種方法使用完全相同的資料。",input$pc_x,input$pc_n,input$pc_x/input$pc_n,1-input$pc_level,qnorm((1+input$pc_level)/2)))})
  output$pc_table<-renderTable({d<-pc_comparison();data.frame(方法=names(prop_methods),樣本比例=d$estimate,下限=d$lower,上限=d$upper,全寬=d$width,超出0或1=ifelse(d$lower<0|d$upper>1,"是","否"),check.names=FALSE)},digits=5,striped=TRUE,bordered=TRUE,rownames=FALSE)
  shade_bounds<-function(xr,yr) {
    if(xr[1]<0) rect(xr[1],yr[1],0,yr[2],col="#fff0df",border=NA)
    if(xr[2]>1) rect(1,yr[1],xr[2],yr[2],col="#fff0df",border=NA)
    abline(v=c(0,1),col="#bd7c35",lty=3)
  }
  outside_segments<-function(lo,hi,y,lwd=3) {
    a<-lo<0;if(any(a)) segments(lo[a],y[a],pmin(0,hi[a]),y[a],col="#dc871b",lwd=lwd)
    a<-hi>1;if(any(a)) segments(pmax(1,lo[a]),y[a],hi[a],y[a],col="#dc871b",lwd=lwd)
  }
  output$pc_plot<-renderPlot({d<-pc_comparison();op<-par(mar=c(4,9,2.5,1));on.exit(par(op));cols<-c("#748397","#147da0","#bb6b26");xr<-range(-.08,1.08,d$lower-.04,d$upper+.04)
    plot(NA,xlim=xr,ylim=c(.5,3.5),yaxt="n",ylab="",xlab="母體比例 π 的信賴區間",main="相同成功人數：三種比例 CI")
    shade_bounds(xr,c(.5,3.5));axis(2,at=3:1,labels=c("Wald","Wilson","Clopper–Pearson"),las=1,cex.axis=.8)
    segments(d$lower,3:1,d$upper,3:1,col=cols,lwd=4);outside_segments(d$lower,d$upper,3:1,lwd=5)
    points(d$estimate,3:1,pch=19,col=cols)
    text(d$lower,3:1+.22,sprintf("%.3f",d$lower),cex=.7);text(d$upper,3:1+.22,sprintf("%.3f",d$upper),cex=.7)
    if(isTRUE(input$pc_clip)) segments(max(0,d$lower[1]),2.83,min(1,d$upper[1]),2.83,lty=2,col="#475569",lwd=2)
  })
  pc_samples<-reactive({pc_valid();req(input$pc_pi,input$pc_seed,input$pc_k);validate(need(is.finite(input$pc_seed)&&input$pc_seed>=1&&input$pc_seed<=2000000000&&input$pc_seed==floor(input$pc_seed),"請輸入有效種子。"));input$pc_again;set.seed(input$pc_seed+if(is.null(input$pc_again)) 0 else input$pc_again);rbinom(input$pc_k,input$pc_n,input$pc_pi)})
  pc_all<-reactive({x<-pc_samples();lapply(unname(prop_methods),function(m){d<-binomial_intervals(x,input$pc_n,input$pc_level,m);d$hit<-d$lower<=input$pc_pi & d$upper>=input$pc_pi;d$outside<-d$lower<0|d$upper>1;d})})
  pc_shown<-reactive({req(input$pc_frame);seq_len(min(input$pc_frame,length(pc_samples())))})
  output$pc_animation<-renderPlot({ds<-pc_all();shown<-pc_shown();j<-tail(shown,100);xr<-range(-.08,1.08,unlist(lapply(ds,function(d)c(d$lower,d$upper))))
    op<-par(mfrow=c(1,3),mar=c(3.5,2.8,3,1),mgp=c(1.9,.55,0),cex=.82);on.exit(par(op))
    yr<-range(j)+c(-.7,.7)
    for(i in seq_along(ds)) {d<-ds[[i]];cols<-ifelse(d$hit[j],"#147da0","#c23c50")
      plot(NA,xlim=xr,ylim=yr,xlab="母體比例 π",ylab=if(i==1) "相同抽樣次序" else "",main=c("Wald","Wilson","Clopper–Pearson")[i],yaxt=if(i==1) "s" else "n")
      shade_bounds(xr,yr);abline(v=input$pc_pi,lty=2,lwd=1.5)
      segments(d$lower[j],j,d$upper[j],j,col=cols,lwd=1.7);outside_segments(d$lower[j],d$upper[j],j,lwd=3)
      points(d$estimate[j],j,pch=16,cex=.35,col=cols)
      k<-tail(j,1);segments(d$lower[k],k,d$upper[k],k,col=if(d$hit[k]) "#147da0" else "#c23c50",lwd=3)
    }
  },res=110)
  output$pc_animation_note<-renderText({j<-pc_shown();k<-tail(j,1);x<-pc_samples()[k];sprintf("第 %d 次：成功 x=%d，n=%d，p=x/n=%.4f；三欄共用此樣本，母體真值 π=%.3f。",k,x,input$pc_n,x/input$pc_n,input$pc_pi)})
  output$pc_current_table<-renderTable({ds<-pc_all();k<-tail(pc_shown(),1);do.call(rbind,lapply(seq_along(ds),function(i){d<-ds[[i]][k,];data.frame(方法=names(prop_methods)[i],成功人數=pc_samples()[k],樣本比例=d$estimate,下限=d$lower,上限=d$upper,全寬=d$width,超界=if(d$outside) "超出 [0,1]" else "位於 [0,1]",涵蓋真值=if(d$hit) "是" else "否",check.names=FALSE)}))},digits=4,striped=TRUE,bordered=TRUE)
  output$pc_coverage_table<-renderTable({ds<-pc_all();j<-pc_shown();do.call(rbind,lapply(seq_along(prop_methods),function(i){d<-ds[[i]];all<-binomial_intervals(0:input$pc_n,input$pc_n,input$pc_level,unname(prop_methods[i]));hit<-all$lower<=input$pc_pi & all$upper>=input$pc_pi;data.frame(方法=names(prop_methods)[i],已播放次數=length(j),模擬涵蓋率=mean(d$hit[j]),精確涵蓋率=sum(dbinom(0:input$pc_n,input$pc_n,input$pc_pi)*hit),超界次數=sum(d$outside[j]),模擬平均全寬=mean(d$width[j]),check.names=FALSE)}))},digits=4,striped=TRUE,bordered=TRUE)


}

ci_ui <- tabsetPanel(id="ci_section",selected="prop",tabPanel("平均數區間估計",value="mean",ci_ui),tabPanel("比例區間估計｜三種 CI 動態比較",value="prop",prop_ci_ui))

ui <- fluidPage(
  tags$head(tags$meta(charset="utf-8"),tags$style(HTML('body{font-family:"Microsoft JhengHei","Noto Sans TC",sans-serif;background:#f5f7fa;color:#334155}.nav-tabs>li>a{padding:11px 18px;color:#687c8c}.nav-tabs>li.active>a{color:#215f7a;border-top:2px solid #39788f}.tab-content{padding-top:14px}.intro-home{max-width:1120px;margin:20px auto 36px;padding:26px 38px;line-height:1.85;background:white;border:1px solid #e4e9ef;border-radius:7px}.intro-home h2{font-size:22px;color:#245f77}.intro-home h3{font-size:19px;color:#245f77;margin-top:24px}.intro-home p{margin-bottom:15px}.home-equation{overflow-x:auto;padding:8px 0;font-size:16px}.formula{font-size:17px;color:#245f77;padding:12px 0}.formula p{margin:4px 0}.intro-source{font-size:12px;color:#7b8794}.well{background:white!important}.value-number{color:#146d92}.note-box{background:#eaf3fa!important;border-left:3px solid #6792a5!important}@media(max-width:767px){.intro-home{padding:18px;margin:8px 0}.nav-tabs>li>a{padding:9px}}'))),
  titlePanel("抽樣與估計 Sampling and estimation"),
  # 隨可用視窗高度調整圖形容器，tab 切換後重新量測。
  tags$head(tags$style(HTML('
    .container-fluid>h2{margin-top:15px;margin-bottom:13px}
    .value-box{margin-bottom:8px!important;padding:9px 12px!important}
    .tab-content{padding-top:9px}
    .tab-pane>br:first-child{display:none}
    #sampling_plot,#se_curve,#ps_plot{height:clamp(230px,calc(100vh - 310px),520px)!important}
    #compare_n,#ps_compare{height:clamp(350px,calc(100vh - 300px),560px)!important}
    .shiny-plot-output{width:100%;max-width:100%}
    #ci_coverage{max-width:900px;margin-left:auto;margin-right:auto}
    @media(min-width:768px){.row>.col-sm-3>.well{max-height:calc(100vh - 145px);overflow-y:auto;scrollbar-width:thin}}
    @media(max-width:767px){#sampling_plot,#se_curve,#ps_plot{height:340px!important}}
  ')),tags$script(HTML('
    (function(){
      var pending;
      function visible(el){return el && el.getClientRects().length>0;}
      function setHeight(el,h){
        h=Math.round(h);
        if(Math.abs(parseFloat(el.style.height)-h)>1 || el.style.getPropertyPriority("height")!=="important")
          el.style.setProperty("height",h+"px","important");
      }
      function fitPlots(){
        var vh=window.innerHeight, narrow=window.innerWidth<768;
        var ids=["sampling_plot","se_curve","compare_n","ps_plot","ps_compare","ci_single","ci_coverage","pc_plot","pc_animation"];
        ids.forEach(function(id){
          var el=document.getElementById(id);if(!visible(el))return;
          var top=el.getBoundingClientRect().top;
          var grid=id==="compare_n"||id==="ps_compare";
          var small=id==="ci_single"||id==="pc_plot";
          var min=grid?350:(small?210:230), max=grid?560:(small?300:520);
          var reserve=id==="sampling_plot"?65:45;
          var available=vh-top-reserve;
          if(top>vh*.7 || narrow)available=vh*(grid?.72:.55);
          setHeight(el,Math.max(min,Math.min(max,available)));
        });
        var pop=document.getElementById("population_plot"),sample=document.getElementById("sample_plot");
        if(visible(pop)&&visible(sample)){
          var room=Math.max(390,Math.min(650,vh-pop.getBoundingClientRect().top-35));
          setHeight(pop,Math.round(room*.61));setHeight(sample,Math.round(room*.39));
        }
        window.dispatchEvent(new Event("resize.shiny"));
        if(window.jQuery)window.jQuery(window).trigger("resize");
      }
      function schedule(){clearTimeout(pending);pending=setTimeout(fitPlots,100);}
      // 避免程式發出的 resize 事件再次排程。
      window.addEventListener("resize",function(e){if(e.isTrusted)schedule();});
      document.addEventListener("DOMContentLoaded",function(){schedule();setTimeout(fitPlots,700);});
      if(window.jQuery){window.jQuery(document).on("shown.bs.tab shiny:connected",schedule);}
    })();
  '))),
  # 精簡字級與公式比例，避免 MathJax 自動放大破壞正文層次。
  tags$head(tags$style(HTML('
    body{font-size:13px;line-height:1.65}
    .container-fluid>h2{font-size:24px;font-weight:500;letter-spacing:.035em;margin:20px 0 17px}
    h3{font-size:17px}h4{font-size:15px}
    .nav-tabs>li>a{font-size:13px;padding:9px 15px}
    .tab-content{padding-top:11px}
    .intro-home{font-size:13px;line-height:1.8;max-width:1060px;padding:23px 32px;margin:16px auto 28px}
    .intro-home h2{font-size:20px;font-weight:500;margin:4px 0 15px}
    .intro-home h3{font-size:16px;font-weight:600;margin:20px 0 10px}
    .intro-home p{margin-bottom:12px}
    .home-equation{font-size:13px;line-height:1.6;padding:3px 0;margin:3px 0;text-align:left}
    .home-equation .MathJax,.home-equation .MathJax_SVG,.home-equation mjx-container{font-size:100%!important}
    .home-equation .MathJax_Display,.home-equation mjx-container[display="true"]{margin:.65em 0!important}
    .formula{font-size:14px;padding:9px 0;line-height:1.75}
    .intro-source{font-size:11px}
    .value-box{padding:10px!important}.value-title{font-size:11px!important}.value-number{font-size:17px!important}
    .well{font-size:13px}.control-label{font-size:13px}.form-control{font-size:13px}
    .btn{font-size:13px}.help-block{font-size:12px;line-height:1.65}
    .table{font-size:12px}.ci-method-guide{font-size:12px;line-height:1.65}.ci-method-guide th{background:#eaf1f5;color:#304d60}.ci-method-guide td,.ci-method-guide th{padding:10px!important;vertical-align:top;border-color:#d9e1e8!important}.ci-method-guide th:first-child{width:15%}.ci-method-guide th:nth-child(2){width:30%}.ci-method-guide th:nth-child(3){width:26%}details>summary{font-size:13px}
    @media(max-width:767px){.intro-home{padding:17px;margin:8px 0}.nav-tabs>li>a{font-size:12px;padding:8px 10px}.home-equation{font-size:12px}}
  '))),
  tabsetPanel(id="main_page",selected="home",tabPanel("首頁｜原理介紹",value="home",home_ui),tabPanel("平均數抽樣分配動態示範",value="demo",demo_ui),tabPanel("比例抽樣分配動態示範",value="proportion",prop_demo_ui),tabPanel("區間估計動態示範",value="ci",ci_ui),tabPanel("習題練習",value="exercises",exercise_ui)))

server <- function(input, output, session) {
  ci_server(input,output,session)
  sampling_parts_server(input,output,session)
  observeEvent(input$go_demo,updateTabsetPanel(session,"main_page",selected="demo"))
  sample_skewness <- function(x) {
    m <- mean(x)
    s <- sd(x)
    if (is.na(s) || s == 0) return(NA_real_)
    mean((x - m)^3) / s^3
  }

  sample_excess_kurtosis <- function(x) {
    m <- mean(x)
    s <- sd(x)
    if (is.na(s) || s == 0) return(NA_real_)
    mean((x - m)^4) / s^4 - 3
  }

  annotate_stats <- function(lines, col = "black", cex = 0.95) {
    usr <- par("usr")
    x <- usr[1] + 0.02 * diff(usr[1:2])
    y <- usr[4] - 0.04 * diff(usr[3:4])
    text(x, y, labels = paste(lines, collapse = "
"), adj = c(0, 1), cex = cex, col = col, xpd = NA)
  }

  population_parameters <- reactive({
    switch(input$population,
      normal = list(
        mean = 50,
        sd = 10,
        skew = 0,
        ex_kurt = 0,
        generator = function(size) rnorm(size, 50, 10),
        xlim = c(10, 90),
        label = "常態分布：N(50, 10²)"
      ),

      gamma = {
        alpha <- input$gamma_shape
        theta <- input$gamma_scale
        list(
          mean = alpha * theta,
          sd = sqrt(alpha) * theta,
          skew = 2 / sqrt(alpha),
          ex_kurt = 6 / alpha,
          generator = function(size) rgamma(size, shape = alpha, scale = theta),
          xlim = c(0, qgamma(0.995, shape = alpha, scale = theta)),
          label = sprintf(
            "Gamma 分布：Gamma(α = %.1f, θ = %.1f；偏態 = %.2f)",
            alpha, theta, 2 / sqrt(alpha)
          )
        )
      },

      bimodal = list(
        mean = 50,
        sd = sqrt(125),
        skew = 0,
        ex_kurt = 26875 / (125^2) - 3,
        generator = function(size) {
          g <- rbinom(size, 1, .5)
          rnorm(size, ifelse(g == 0, 40, 60), 5)
        },
        xlim = c(15, 85),
        label = "雙峰分布：0.5N(40,5²)+0.5N(60,5²)"
      ),

      beta = {
        a <- input$beta_alpha
        b <- input$beta_beta
        list(
          mean = a / (a + b),
          sd = sqrt(a * b / ((a + b)^2 * (a + b + 1))),
          skew = 2 * (b - a) * sqrt(a + b + 1) / ((a + b + 2) * sqrt(a * b)),
          ex_kurt = 6 * (((a - b)^2 * (a + b + 1)) - a * b * (a + b + 2)) / (a * b * (a + b + 2) * (a + b + 3)),
          generator = function(size) rbeta(size, shape1 = a, shape2 = b),
          xlim = c(0, 1),
          label = sprintf("Beta 分布：Beta(α = %.1f, β = %.1f)", a, b)
        )
      }
    )
  })

  simulation <- eventReactive(list(
    input$simulate, input$n, input$reps, input$population, input$seed,
    input$gamma_shape, input$gamma_scale,
    input$beta_alpha, input$beta_beta
  ), {
    req(length(input$seed)==1, is.finite(input$seed),input$seed>=1,input$seed<=2147480000,input$seed==floor(input$seed))
    set.seed(input$seed)
    p <- population_parameters()
    one_sample <- p$generator(input$n)
    sample_means <- replicate(input$reps, mean(p$generator(input$n)))
    list(sample=one_sample, sample_means=sample_means,
         theoretical_se=p$sd/sqrt(input$n), simulated_se=sd(sample_means), pars=p)
  }, ignoreNULL=FALSE)

  output$compare_n <- renderPlot({
    s<-simulation();p<-s$pars;ns<-c(1,5,30,100)
    set.seed(input$seed+3000)
    xs<-lapply(ns,function(n) replicate(input$reps,mean(p$generator(n))))
    ds<-lapply(xs,function(x) density(x,from=p$xlim[1],to=p$xlim[2],n=2048))
    ymax<-max(vapply(ds,function(d) max(d$y),numeric(1)),dnorm(p$mean,p$mean,p$sd/10))*1.08
    op<-par(mfrow=c(2,2),mar=c(4,4,3,1));on.exit(par(op))
    for(i in seq_along(ns)) {
      plot(ds[[i]],xlim=p$xlim,ylim=c(0,ymax),main=sprintf("n=%d；SE=%.3f",ns[i],p$sd/sqrt(ns[i])),xlab="樣本平均數",ylab="密度",col="#147da0",lwd=2)
      if(isTRUE(input$show_normal)) curve(dnorm(x,p$mean,p$sd/sqrt(ns[i])),add=TRUE,col="#bb6b26",lty=2,lwd=2,n=2000)
      abline(v=p$mean,col="#c23c50",lty=3)
    }
  },res=110)
  output$pop_mean <- renderText(sprintf("%.2f", population_parameters()$mean))
  output$pop_sd <- renderText(sprintf("%.2f", population_parameters()$sd))
  output$theoretical_se <- renderText(sprintf("%.3f", simulation()$theoretical_se))
  output$simulated_se <- renderText(sprintf("%.3f", simulation()$simulated_se))

  output$sampling_plot <- renderPlot({
    op <- par(mar=c(2.5,4.1,3.1,4.1)); on.exit(par(op))
    s <- simulation(); xbar <- s$sample_means; p <- s$pars
    xlim <- p$xlim

    d_sim <- density(
      xbar,
      n = 2048,
      from = xlim[1],
      to = xlim[2],
      adjust = 1
    )

    x_theory <- seq(xlim[1], xlim[2], length.out = 2000)
    y_theory <- dnorm(
      x_theory,
      mean = p$mean,
      sd = s$theoretical_se
    )

    skew_xbar <- sample_skewness(xbar)
    kurt_xbar <- sample_excess_kurtosis(xbar)
    y_max <- max(d_sim$y, y_theory, na.rm = TRUE) * 1.18

    plot(
      d_sim$x,
      d_sim$y,
      type = "l",
      lwd = 2,
      lty = 2,
      xlim = xlim,
      ylim = c(0, y_max),
      main = paste0(
        "樣本平均數的抽樣分配變化〔固定 X 軸、平滑曲線〕",
        "（n = ", input$n, "，重複抽樣 ", input$reps, " 次）"
      ),
      xlab = "",
      ylab = "",
      yaxt = "n",
      xaxs = "i",
      yaxs = "i"
    )
    mtext(expression(bar(x)), side=1, line=.7, at=par("usr")[2], adj=0, cex=.9, xpd=NA)
    axis(4)
    mtext("密度", side = 4, line = 2)

    if (isTRUE(input$show_normal)) {
      lines(x_theory, y_theory, lwd = 3, lty = 1)
    }
    abline(v = p$mean, lwd = 3, lty = 2)
    abline(v = mean(xbar), lwd = 2, lty = 3)

    annotate_stats(c(
      sprintf("母體：偏態 = %.3f；峰度 = %.3f", p$skew, p$ex_kurt),
      sprintf("抽樣分配：偏態 = %.3f；峰度 = %.3f", skew_xbar, kurt_xbar)
    ), cex = 0.95)

    legend("topright",
           legend = c(
             sprintf("母體平均數 μ = %.2f", p$mean),
             sprintf("模擬平均數 = %.2f", mean(xbar)),
             sprintf("理論 SE = %.3f", s$theoretical_se)
           ),
           lty = c(2, 3, 1), lwd = c(3, 2, 3), bty = "n", cex = 0.85)
  })


  output$population_plot <- renderPlot({
    set.seed(input$seed + 999)
    s <- simulation()
    p <- s$pars
    v <- p$generator(50000)
    xbar <- s$sample_means

    pop_breaks <- if (identical(p$xlim, c(0,1))) seq(0,1,length.out=61) else 60
    h <- hist(v, breaks = pop_breaks, plot = FALSE)
    d_sim <- density(xbar, n = 2048, from = p$xlim[1], to = p$xlim[2], adjust = 1)
    x_theory <- seq(p$xlim[1], p$xlim[2], length.out = 2000)
    y_theory <- dnorm(x_theory, mean = p$mean, sd = s$theoretical_se)
    sim_ylim <- c(0, max(d_sim$y, y_theory, na.rm = TRUE) * 1.12)
    pop_ylim <- c(0, max(h$density, na.rm = TRUE) * 1.18)
    skew_xbar <- sample_skewness(xbar)
    kurt_xbar <- sample_excess_kurtosis(xbar)

    hist(v,
         breaks = pop_breaks,
         probability = TRUE,
         xlim = p$xlim,
         ylim = pop_ylim,
         main = paste("母體分配疊加抽樣分配：", p$label),
         xaxs="i", yaxs="i", xlab = "X",
         ylab = "母體密度",
         col = "white",
         border = "grey60")
    abline(v = p$mean, lwd = 3, lty = 2)

    annotate_stats(c(
      sprintf("母體：偏態 = %.3f；峰度 = %.3f", p$skew, p$ex_kurt),
      sprintf("抽樣分配：偏態 = %.3f；峰度 = %.3f", skew_xbar, kurt_xbar)
    ), cex = 0.95)

    par(new = TRUE)
    plot(d_sim$x, d_sim$y,
         type = "l",
         lwd = 2,
         lty = 2,
         col = "firebrick",
         xlim = p$xlim,
         ylim = sim_ylim,
         axes = FALSE,
         xlab = "",
         ylab = "",
         xaxs = "i",
         yaxs = "i")

    if (isTRUE(input$show_normal)) {
      lines(x_theory, y_theory, lwd = 3, lty = 1, col = "firebrick")
    }

    abline(v = mean(xbar), lwd = 2, lty = 3, col = "firebrick")
    axis(4, col.axis = "firebrick", col = "firebrick")
    mtext("抽樣分配密度", side = 4, line = 2, col = "firebrick")

    legend(
      "topright",
      legend = c(
        "左軸：母體密度（長條圖）",
        "右軸：抽樣分配密度（虛線）",
        sprintf("母體平均數 μ = %.2f", p$mean),
        sprintf("模擬平均數 = %.2f", mean(xbar))
      ),
      pch = c(15, NA, NA, NA),
      pt.cex = c(1.3, NA, NA, NA),
      col = c("grey70", "firebrick", "black", "firebrick"),
      lty = c(NA, 2, 2, 3),
      lwd = c(NA, 2, 3, 2),
      bty = "n",
      cex = 0.85
    )
  })

  output$sample_plot <- renderPlot({
    s <- simulation()
    p <- s$pars
    x <- s$sample

    if(length(x)<2 || sd(x)==0) {
      plot(x,0,xlim=p$xlim,ylim=c(-.5,.5),yaxt="n",ylab="",xlab="觀察值 X",main="單次樣本僅有一筆觀察值，無法估計密度",pch=19,col="#147da0")
      abline(v=mean(x),lty=2)
      return(invisible(NULL))
    }
    d <- density(x, n = 512)
    max_half_width <- 0.42
    y_scaled <- d$y / max(d$y) * max_half_width
    skew_sample <- sample_skewness(x)
    kurt_sample <- sample_excess_kurtosis(x)

    plot(
      NA,
      xlim = p$xlim,
      ylim = c(-0.5, 0.5),
      main = paste0("其中一次隨機樣本（ n = ", input$n, " ）"),
      xlab = "觀察值",
      ylab = "",
      yaxt = "n",
      bty = "l"
    )

    polygon(
      c(d$x, rev(d$x)),
      c(y_scaled, -rev(y_scaled)),
      col = "#9ecae1AA",
      border = "#3182bd",
      lwd = 2
    )

    set.seed(input$seed + 2026)
    y_jitter <- runif(length(x), min = -0.08, max = 0.08)
    points(x, y_jitter, pch = 16, cex = 0.7)
    abline(v = mean(x), lwd = 3, lty = 2)

    annotate_stats(c(
      sprintf("母體：偏態 = %.3f；峰度 = %.3f", p$skew, p$ex_kurt),
      sprintf("本次樣本：偏態 = %.3f；峰度 = %.3f", skew_sample, kurt_sample)
    ), cex = 0.95)

    legend(
      "topright",
      legend = c(
        "魚肚圖（樣本密度）",
        sprintf("本次樣本平均數 = %.2f", mean(x))
      ),
      pch = c(15, NA),
      pt.cex = c(1.4, NA),
      col = c("#3182bd", "black"),
      lty = c(NA, 2),
      lwd = c(NA, 3),
      bty = "n",
      cex = 0.85
    )
  })

  se_needed <- reactive({
    req(input$se_target)
    validate(need(is.finite(input$se_target)&&input$se_target>0,"目標 SE 須大於 0。"))
    max(1,ceiling((population_parameters()$sd/input$se_target)^2))
  })
  observeEvent(input$se_click,{
    req(input$se_click$x)
    updateSliderInput(session,"n",value=max(1,min(1200,round(input$se_click$x))))
  })
  observeEvent(input$se_double,updateSliderInput(session,"n",value=min(1200,input$n*2)))
  observeEvent(input$se_quad,updateSliderInput(session,"n",value=min(1200,input$n*4)))
  observeEvent(input$se_apply,{
    if(se_needed()<=1200) updateSliderInput(session,"n",value=se_needed())
    else showNotification("所需 n 超過目前模擬上限 1200；計算值顯示於圖下方。",type="message")
  })
  output$se_status<-renderUI({p<-population_parameters();s<-simulation()
    div(class="formula",sprintf("目前 n=%d　σ=%.3f　理論 SE=%.4f　模擬 SE=%.4f",input$n,p$sd,p$sd/sqrt(input$n),s$simulated_se))
  })
  output$se_readout<-renderText({
    if(is.null(input$se_hover)) return("將滑鼠移入圖中，查看指定樣本數的理論標準誤。")
    nn<-max(1,min(as.numeric(input$se_range),round(input$se_hover$x)))
    sprintf("指向：n=%d → SE=%.4f；點選即可套用此 n。",nn,population_parameters()$sd/sqrt(nn))
  })
  output$se_target_note<-renderUI({
    need_n<-se_needed();p<-population_parameters()
    tagList(p(sprintf("目標 SE ≤ %.4f：n ≥ (σ/SE)² = (%.4f/%.4f)²，向上取整至少需 %.0f 筆。",input$se_target,p$sd,input$se_target,need_n)),
      if(need_n>1200) p("此結果超過模擬上限 1200，仍可用公式進行規劃。"),
      if(input$n>as.numeric(input$se_range)) p("目前 n 超出所選圖形範圍；請將顯示範圍調大。"))
  })
  output$se_curve <- renderPlot({
    req(input$se_range);p<-population_parameters();nv<-seq_len(as.integer(input$se_range));sev<-p$sd/sqrt(nv)
    op<-par(mar=c(2.7,4.5,2.5,2.5));on.exit(par(op))
    plot(nv,sev,type="l",lwd=3,col="#147da0",log=if(isTRUE(input$se_log)) "x" else "",
      xlab="",ylab="理論標準誤 σ/√n",main="點選曲線，探索樣本數與標準誤",ylim=c(0,p$sd*1.07),xlim=c(1,max(nv)),xaxt="n")
    ticks<-if(isTRUE(input$se_log)) c(1,2,5,10,20,50,100,200,500,1200) else pretty(c(1,max(nv)))
    ticks<-ticks[ticks>=1 & ticks<=max(nv)];axis(1,at=ticks,labels=ticks)
    abline(h=axTicks(2),col="#edf0f4")
    lines(nv,sev,col="#147da0",lwd=3)
    mtext("n",side=1,line=.7,at=if(isTRUE(input$se_log)) 10^(par("usr")[2]+.06) else par("usr")[2]+.025*diff(par("usr")[1:2]),adj=0,xpd=NA)
    # 對數軸的 mtext at 需使用原始資料座標。
    if(input$n<=max(nv)) {
      abline(v=input$n,h=p$sd/sqrt(input$n),col="#94a3b8",lty=3)
      points(input$n,p$sd/sqrt(input$n),pch=19,cex=1.4,col="#c23c50")
    }
    if(!is.null(input$se_target)&&is.finite(input$se_target)&&input$se_target>0) {
      abline(h=input$se_target,col="#bb6b26",lty=2)
      nn<-se_needed();if(nn<=max(nv)) points(nn,p$sd/sqrt(nn),pch=17,col="#bb6b26",cex=1.2)
    }
    legend("topright",c("理論 SE 曲線","目前 n","目標 SE"),col=c("#147da0","#c23c50","#bb6b26"),lty=c(1,NA,2),pch=c(NA,19,17),bty="n",cex=.85)
  },res=110)

  output$summary_table <- renderTable({
    s<-simulation(); p<-s$pars; xb<-s$sample_means
    data.frame(指標=c("母體平均數","母體標準差","樣本數","重複抽樣次數 k","樣本平均數的平均","理論標準誤","模擬標準誤","模擬與理論標準誤之差"),
               數值=c(sprintf("%.4f",p$mean),sprintf("%.4f",p$sd),input$n,input$reps,sprintf("%.4f",mean(xb)),sprintf("%.4f",s$theoretical_se),sprintf("%.4f",s$simulated_se),sprintf("%.4f",s$simulated_se-s$theoretical_se)), check.names=FALSE)
  }, striped=TRUE,bordered=TRUE,spacing="m")

  output$interpretation <- renderText({
    s<-simulation(); ratio<-s$simulated_se/s$theoretical_se
    paste0("解讀：目前每次抽樣 n = ",input$n,"。理論標準誤為 ",sprintf("%.3f",s$theoretical_se),
           "，模擬標準誤為 ",sprintf("%.3f",s$simulated_se),"。模擬值約為理論值的 ",sprintf("%.1f%%",ratio*100),
           "。將 n 增加為原來的 4 倍時，標準誤約縮小為原來的 1/2。")
  })
}

shinyApp(ui, server)
