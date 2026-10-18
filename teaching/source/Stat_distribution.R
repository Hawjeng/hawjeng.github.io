# ============================================================================
# 機率分配教學 shiny 套件；機率函數皆使用 R 內建 stats 套件
# ============================================================================
if (.Platform$OS.type == "windows") {
  invisible(Sys.setlocale("LC_CTYPE", "Chinese (Traditional)_Taiwan.utf8"))
  grDevices::windowsFonts(Teaching = grDevices::windowsFont("Microsoft JhengHei"))
}
if (!requireNamespace("shiny", quietly = TRUE)) stop('請先執行 install.packages("shiny")')
library(shiny)
fmt <- function(x) formatC(x, digits = 4, format = "fg", flag = "#")
prob_label <- function(p) ifelse(p==0,"0",ifelse(p<.00005,formatC(p,format="e",digits=1),sprintf("%.4f",p)))
integer_axis <- function(values) {
  values <- sort(unique(values))
  step <- max(1L,ceiling(length(values)/40))
  marked <- unique(c(seq.int(1L,length(values),by=step),length(values)))
  axis(1,at=values,labels=FALSE,tcl=-.2)
  axis(1,at=values[marked],labels=values[marked],tick=FALSE,
       cex.axis=if(length(values)<=20) .75 else .59,
       las=if(length(values)<=20) 1 else 2,gap.axis=-1)
}
draw_point_labels <- function(x,y,color) {
  lift<-if(length(x)>15) rep(c(0,.065),length.out=length(x))*max(y) else 0
  labels<-prob_label(y)
  label_y<-y+lift+.055*max(y)
  half_width<-strwidth(labels,cex=.57)*.54
  half_height<-strheight(labels,cex=.57)*.65
  rect(x-half_width,label_y-half_height,x+half_width,label_y+half_height,col="white",border=NA)
  text(x,label_y,labels=labels,cex=.57,col=color)
}

# 1. 集中管理理論公式，介面數字、圖形和機率查詢均使用同一份設定。
# n 在二項分配是試驗次數，在超幾何分配是抽取個數，不是樣本平均數的樣本數。
# m = E(X)；v = Var(X)；標準差統一由 sqrt(v) 計算，避免混淆 σ 和 σ²。
make_distribution <- function(kind, n = 10, p = .5, N = 50, S = 20,
                              lambda = 4, mu = 0, sigma = 1, a = 0, b = 10) {
  switch(kind,
    binomial = {
      stopifnot(is.finite(n), n >= 1, n == floor(n), p >= 0, p <= 1)
      list(kind = kind, title = "二項分配", discrete = TRUE,
        label = sprintf("B(n=%s, π=%s)", n, fmt(p)), m = n*p, v = n*p*(1-p),
        domain = c(0, n), d = function(x) dbinom(x, n, p), cdf = function(x) pbinom(x, n, p),
        formula = "μ = nπ；σ² = nπ(1−π)；σ = √[nπ(1−π)]",
        substitution = sprintf("μ = %s × %s = %s；σ = √(%s × %s × %s) = %s", n, fmt(p), fmt(n*p), n, fmt(p), fmt(1-p), fmt(sqrt(n*p*(1-p)))),
        mechanism = "固定 n 次互相獨立的試驗，每次成功機率 π 相同；X 為成功次數。",
        effect = "固定 n 時，π 從小到大，分配由右偏轉為對稱再轉為左偏；π=0.5 時變異數最大。π=0 或 1 時，分配集中在單一點，σ=0。")
    },
    hyper = {
      stopifnot(N >= 2, N == floor(N), S >= 0, S <= N, S == floor(S), n >= 1, n <= N, n == floor(n))
      prob <- S/N
      # 不放回抽取：變異數需乘上 (N−n)/(N−1)，標準差則乘其平方根。
      v <- n*prob*(1-prob)*(N-n)/(N-1)
      list(kind = kind, title = "超幾何分配", discrete = TRUE,
        label = sprintf("HG(S=%s, N=%s, n=%s)", S, N, n), m = n*prob, v = v,
        domain = c(max(0, n-(N-S)), min(n, S)),
        # R 的 dhyper(x,m,n,k)：m=成功總數，n=失敗總數，k=抽取個數。
        d = function(x) dhyper(x, m = S, n = N-S, k = n),
        cdf = function(x) phyper(x, m = S, n = N-S, k = n),
        formula = "μ = n(S/N)；σ² = n(S/N)(1−S/N)(N−n)/(N−1)；σ = √σ²",
        substitution = sprintf("μ = %s × (%s/%s) = %s；σ = √[%s × %s × %s × (%s−%s)/(%s−1)] = %s", n,S,N,fmt(n*prob),n,fmt(prob),fmt(1-prob),N,n,N,fmt(sqrt(v))),
        mechanism = "母體 N 個，其中 S 個為成功類別；不放回抽取 n 個，X 為抽到的成功個數。",
        effect = "相同 n 與成功比例下，不放回抽取的變異數小於或等於二項分配。抽完全部母體（n=N）時，X=S，σ=0。")
    },
    poisson = {
      stopifnot(is.finite(lambda), lambda > 0)
      list(kind = kind, title = "卜瓦松分配（Poisson）", discrete = TRUE,
        label = sprintf("Poisson(λ=%s)", fmt(lambda)), m = lambda, v = lambda,
        domain = c(0, qpois(.9999, lambda)), d = function(x) dpois(x, lambda), cdf = function(x) ppois(x, lambda),
        formula = "μ = λ；σ² = λ；σ = √λ",
        substitution = sprintf("μ = %s；σ² = %s；σ = √%s = %s", fmt(lambda),fmt(lambda),fmt(lambda),fmt(sqrt(lambda))),
        mechanism = "在固定時間或空間內計算事件次數；典型模型假設事件獨立且平均發生率固定。X=0,1,2,…。",
        effect = "λ 增加時，平均數與變異數都增加；相對於平均數的分散程度下降，形狀逐漸接近對稱。圖形右端涵蓋至少 99.99% 機率，並非分配的上界。")
    },
    normal = {
      stopifnot(is.finite(mu), is.finite(sigma), sigma > 0)
      list(kind = kind, title = "常態分配", discrete = FALSE,
        label = sprintf("N(μ=%s, σ²=%s)",fmt(mu),fmt(sigma^2)), m = mu, v = sigma^2,
        domain = mu + c(-4,4)*sigma, d = function(x) dnorm(x,mu,sigma), cdf = function(x) pnorm(x,mu,sigma),
        formula = "μ = 位置參數 μ；σ² = 尺度參數 σ 的平方；σ = 標準差參數 σ",
        substitution = sprintf("μ = %s；σ² = %s² = %s；σ = %s",fmt(mu),fmt(sigma),fmt(sigma^2),fmt(sigma)),
        mechanism = "連續且左右對稱的鐘形分配。記號 N(μ,σ²) 的第二項是變異數；本介面直接輸入標準差 σ。",
        effect = "改變 μ 只平移曲線；增加 σ 會使曲線更寬、峰值更低。圖形顯示 μ±4σ，完整範圍為所有實數。")
    },
    uniform = {
      stopifnot(is.finite(a), is.finite(b), a < b)
      list(kind = kind, title = "均勻分配", discrete = FALSE,
        label = sprintf("U(a=%s, b=%s)",fmt(a),fmt(b)), m = (a+b)/2, v = (b-a)^2/12,
        domain = c(a,b) + c(-.15,.15)*(b-a), d = function(x) dunif(x,a,b), cdf = function(x) punif(x,a,b),
        a = a, b = b, formula = "μ = (a+b)/2；σ² = (b−a)²/12；σ = (b−a)/√12",
        substitution = sprintf("μ = (%s + %s)/2 = %s；σ = (%s − %s)/√12 = %s",fmt(a),fmt(b),fmt((a+b)/2),fmt(b),fmt(a),fmt((b-a)/sqrt(12))),
        mechanism = "X 落在 [a,b]，區間內密度固定為 1/(b−a)；等長子區間的機率相等。",
        effect = "整個區間平移時 σ 不變；區間寬度加倍時 σ 加倍、密度高度減半。所有連續分配的單點機率都為 0。")
    },
    exponential = {
      stopifnot(is.finite(lambda), lambda > 0)
      list(kind = kind, title = "指數分配", discrete = FALSE,
        label = sprintf("Exp(rate λ=%s)",fmt(lambda)), m = 1/lambda, v = 1/lambda^2,
        domain = c(0,qexp(.9999,rate=lambda)),
        d = function(x) dexp(x,rate=lambda), cdf = function(x) pexp(x,rate=lambda),
        formula = "μ = 1/λ；σ² = 1/λ²；σ = 1/λ（λ 為速率 rate）",
        substitution = sprintf("μ = 1/%s = %s；σ² = 1/%s² = %s；σ = 1/%s = %s",fmt(lambda),fmt(1/lambda),fmt(lambda),fmt(1/lambda^2),fmt(lambda),fmt(1/lambda)),
        mechanism = "X≥0，常用來描述固定速率事件的等待時間。R 的 dexp/pexp 使用 rate=λ，不是尺度參數。",
        effect = "λ 越大，等待時間越短，μ 與 σ 同時變小。分配始終右偏，偏態係數為 2。圖形右端涵蓋 99.99% 機率，完整右尾延伸到無限大。")
    })
}

# 本檔可直接按 Source 執行，不需要 app.R；調查範例程式已合併在本檔。
# data 與 www 資料夾請與本檔放在一起。
.source_files <- Filter(Negate(is.null), lapply(sys.frames(), function(f) f$ofile))
app_dir <- if(length(.source_files)) dirname(normalizePath(tail(.source_files,1)[[1]],winslash="/")) else getwd()

# 調查研究教學模組：由 app.R 載入，沿用 make_distribution 與 integer_axis。
# 這裡的星座只作為分組標籤，不以分組差異推論星座造成行為或人格差異。
# 使用資料檔僅含星座編碼、CT、每週外送次數與每週搭車次數。
zodiac_labels <- c("水瓶座","雙魚座","牡羊座","金牛座","雙子座","巨蟹座",
                   "獅子座","處女座","天秤座","天蠍座","射手座","摩羯座")
survey_choices <- list("離散分配"=c("二項：CT 達門檻的人數"="binomial",
  "超幾何：現有名單不放回抽取"="hyper","卜瓦松：每週行為次數"="poisson"),
  "連續分配"=c("常態：CT 的近似模型"="normal","均勻：安排問卷回訪時間"="uniform",
               "指數：下一次行為的等待時間"="exponential"))
survey_ui <- tagList(
  p(style="margin:20px 0;font-size:14px","以 data2.xlsx 的 Cleaned_Data 為例，依 12 星座分組，連結實際調查、機率模型與研究設計。"),
  sidebarLayout(sidebarPanel(width=3,
    selectInput("survey_zodiac","選擇星座",setNames(1:12,zodiac_labels)),
    selectInput("survey_kind","選擇應用模型",survey_choices),
    numericInput("survey_cutoff","CT 達門檻的定義：CT ≥",10,step=1),
    conditionalPanel("input.survey_kind == 'binomial' || input.survey_kind == 'hyper'",
      uiOutput("survey_draw_control")),
    conditionalPanel("input.survey_kind == 'poisson' || input.survey_kind == 'exponential'",
      selectInput("survey_count","每週次數變數",c("每週外送次數"="FoodOrders","每週搭車次數"="TaxiRides"))),
    conditionalPanel("input.survey_kind == 'uniform'",
      numericInput("survey_a","假設回訪時段下界 a（分鐘）",0),
      numericInput("survey_b","假設回訪時段上界 b（分鐘）",60)),
    hr(),selectInput("survey_event","計算模型機率",c("至少門檻 c：P(X≥c)"="ge","至多門檻 c：P(X≤c)"="le","恰為 c：P(X=c)"="eq")),
    numericInput("survey_threshold","機率門檻 c（單位見右側情境）",3),
    helpText("本頁的分布量數由各組有效資料或明示假設決定；不會改動原始 Excel。")
  ),mainPanel(width=9,
    uiOutput("survey_group_info"),
    tabsetPanel(
      tabPanel("應用情境與圖形",uiOutput("survey_explanation"),
        tableOutput("survey_model_stats"),uiOutput("survey_probability"),
        plotOutput("survey_plot",height="420px"),uiOutput("survey_diagnostic"),
        h4("取值與模型機率／密度"),
        div(style="max-height:280px;overflow:auto",tableOutput("survey_values"))),
      tabPanel("12 星座資料摘要",p("各列分別使用該變數的有效資料；CT 達門檻比例會隨左側門檻更新。次數資料以週為單位。"),
        div(style="overflow:auto",tableOutput("survey_summary"))),
      tabPanel("研究設計與資料",h4("觀察資料與機率模型"),
        p("各組的 CT 平均數、樣本標準差與每週次數平均數是觀察資料的摘要；把這些數值代入理論分配，是參數估計與建模。調查資料本身並不會因為代入公式，就自動服從該分配。"),
        h4("六種模型的資料依據"),
        p("二項模型將 CT 是否達門檻轉為二分事件，使用該組有效樣本比例作為 π 的估計。超幾何模型則把目前可用的問卷名單視為有限抽取池，不放回抽取。卜瓦松模型使用每週外送或搭車次數的平均數估計 λ，並將觀察頻率與理論機率並列。常態模型以 CT 的平均數和樣本標準差估計參數，檢視其近似程度。"),
        p("均勻分配用於替選定星座安排後續回訪的假設情境：若每位受訪者的預定回訪時間均勻配置於指定時段，才可使用 U(a,b)。這些回訪時間並未出現在原始資料中。指數模型是假設每位受訪者的行為形成相同固定速率的卜瓦松過程，再由每週平均次數除以 7 換算每日速率；原資料沒有事件發生時間，無法直接檢驗等待時間是否為指數分配。"),
        h4("資料清理與推論範圍"),
        p("來源工作表已清理，外送或搭車次數的高值可能已被改成缺失值，因而影響平均數、變異數及模型尾端。這些示範以現有有效資料計算，不會再次刪除離群值。未經確認的截尾或刪除機制，不適合直接用來判定原始母體是否服從某分配。"),
        p("星座在本例僅作為分組變數。各組人數不同，樣本比例、平均數與標準差也有估計誤差；不能僅憑圖形或數值差異，就推論星座具有因果影響，或將樣本結果直接視為各星座母體的真實參數。"),
        p("資料來源：data2.xlsx，Cleaned_Data 工作表。外送與搭車為每週次數，依教師確認的問卷定義。重新匯入資料請執行 prepare_survey_data.R。")
      )
    )
  ))
)

# 純函數集中計算各組摘要，避免不同圖表使用不一致的有效分母。
survey_group_stats <- function(d,code,cutoff,count_col) {
  group<-d[d$zodiac==code,,drop=FALSE]
  ct<-group$CT[is.finite(group$CT)]
  counts<-group[[count_col]][is.finite(group[[count_col]])]
  list(total=nrow(group),ct=ct,counts=counts,N=length(ct),S=sum(ct>=cutoff),
       proportion=if(length(ct)) mean(ct>=cutoff) else NA_real_,
       mean=if(length(ct)) mean(ct) else NA_real_,sd=if(length(ct)>1) sd(ct) else NA_real_,
       rate_week=if(length(counts)) mean(counts) else NA_real_,
       variance_count=if(length(counts)>1) var(counts) else NA_real_)
}

survey_server <- function(input,output,session) {
  dataset <- reactive({
    path<-file.path(app_dir,"data","survey_data.rds")
    validate(need(file.exists(path),"找不到教學資料，請先執行 prepare_survey_data.R。"))
    readRDS(path)$data
  })
  group_stats <- reactive({
    req(input$survey_zodiac,input$survey_count)
    validate(need(length(input$survey_cutoff)==1 && is.finite(input$survey_cutoff),"請輸入有效的 CT 門檻。"))
    survey_group_stats(dataset(),as.integer(input$survey_zodiac),input$survey_cutoff,input$survey_count)
  })
  output$survey_draw_control <- renderUI({
    g<-group_stats();validate(need(g$N>=1,"此組沒有 CT 有效資料。"))
    old<-isolate(input$survey_n)
    numericInput("survey_n","抽取／獨立嘗試人數 n",if(is.null(old)) min(10,g$N) else min(old,g$N),min=1,max=g$N,step=1)
  })
  observeEvent(input$survey_kind,{
    value<-switch(input$survey_kind,normal=input$survey_cutoff,uniform=15,exponential=3,3)
    updateNumericInput(session,"survey_threshold",value=value)
  })
  model <- reactive({
    g<-group_stats();req(input$survey_kind)
    kind<-input$survey_kind
    if(kind %in% c("binomial","hyper")) {
      req(input$survey_n)
      validate(need(is.finite(input$survey_n) && input$survey_n==floor(input$survey_n) && input$survey_n>=1 && input$survey_n<=g$N,"抽取人數須為 1 到 CT 有效人數之間的整數。"))
    }
    if(kind %in% c("poisson","exponential")) validate(need(is.finite(g$rate_week) && g$rate_week>0,"此組的有效次數平均值為 0 或無資料，無法估計正速率模型。"))
    if(kind=="normal") validate(need(is.finite(g$sd) && g$sd>0,"CT 有效資料不足，或標準差為 0，無法使用一般常態模型。"))
    if(kind=="uniform") validate(need(length(input$survey_a)==1 && length(input$survey_b)==1 && is.finite(input$survey_a) && is.finite(input$survey_b) && input$survey_a<input$survey_b,"請確認回訪時段 a < b。"))
    switch(kind,
      binomial=make_distribution(kind,n=input$survey_n,p=g$proportion),
      hyper=make_distribution(kind,N=g$N,S=g$S,n=input$survey_n),
      poisson=make_distribution(kind,lambda=g$rate_week),
      normal=make_distribution(kind,mu=g$mean,sigma=g$sd),
      uniform=make_distribution(kind,a=input$survey_a,b=input$survey_b),
      exponential=make_distribution(kind,lambda=g$rate_week/7))
  })
  output$survey_group_info <- renderUI({
    g<-group_stats()
    tagList(h3(paste(zodiac_labels[as.integer(input$survey_zodiac)],"調查研究範例")),
      p(sprintf("本組問卷 %d 筆；CT 有效 %d 筆、缺失 %d 筆；所選每週次數變數有效 %d 筆、缺失 %d 筆。",g$total,g$N,g$total-g$N,length(g$counts),g$total-length(g$counts))))
  })
  output$survey_explanation <- renderUI({
    g<-group_stats();z<-model()
    name<-if(input$survey_count=="FoodOrders") "外送" else "搭車"
    text<-switch(input$survey_kind,
      binomial=sprintf("將 CT≥%s 定義為達門檻。本組 %d 位 CT 有效受訪者中，有 %d 位達門檻，樣本比例為 %.4f。若後續獨立接觸 %d 位同類對象，並假設每次達門檻機率相同，可用二項分配討論達門檻總人數 X。這裡以樣本比例估計 π，不表示母體參數已知。",fmt(input$survey_cutoff),g$N,g$S,g$proportion,input$survey_n),
      hyper=sprintf("把本組 %d 位 CT 有效受訪者視為目前可抽取的有限名單，其中 %d 位 CT 達門檻。若不放回抽取 %d 位，抽到的達門檻人數 X 服從超幾何分配。此處的母體只指現有名單，不是所有該星座的人。",g$N,g$S,input$survey_n),
      poisson=sprintf("X 為每位受訪者一週的%s次數，以本組有效資料的平均數 %.4f 估計 λ。藍色為候選卜瓦松模型，橘色為觀察相對次數；可比較各次數的機率是否接近。須假設每人的觀察期間相同、發生率穩定，且沒有不可忽略的個體異質性。",name,g$rate_week),
      normal=sprintf("以本組 CT 平均數 %.4f 與樣本標準差 %.4f 作為常態參數的估計。CT 是整數分數，圖中比較實測分數與各整數 ±0.5 區間的常態機率。這是近似模型，不是把分數視為真正連續且無界的母體。",g$mean,g$sd),
      uniform=sprintf("延伸研究設計：安排本組 %d 位受訪者的後續回訪。若每位的預定回訪時間 X 在 %.2f 至 %.2f 分鐘之間均勻配置，可用 U(a,b) 計算時段機率。a、b 由研究者指定；原資料沒有回訪時間，這不是從 CT 或星座資料估計出的均勻分配。",g$total,input$survey_a,input$survey_b),
      exponential=sprintf("延伸模型：本組平均每週%s %.4f 次，換算每日速率 λ=%.4f/7=%.4f。若假設每位受訪者具有相同且固定的卜瓦松發生率，下一次行為的等待天數 X 才可用指數分配描述。原資料沒有事件日期，故無法直接檢驗等待時間分配。",name,g$rate_week,g$rate_week,g$rate_week/7))
    tagList(h4(z$label),p(text),p(class="home-formula-note",z$formula))
  })
  output$survey_model_stats <- renderTable({
    z<-model()
    # Poisson 的 X 是固定一週內的計數，量數單位為「次」；不是等待時間。
    unit<-switch(input$survey_kind,binomial="人",hyper="人",poisson="次",normal="CT 分數",uniform="分鐘",exponential="天")
    data.frame(量數=c("模型平均數 μ","模型標準差 σ","模型變異數 σ²"),
      數值=c(z$m,sqrt(z$v),z$v),單位=c(unit,unit,paste0("(",unit,")²")),check.names=FALSE)
  },digits=4,bordered=TRUE,striped=TRUE,spacing="s")
  probability_result <- reactive({
    z<-model();c<-input$survey_threshold;req(input$survey_event)
    validate(need(length(c)==1 && is.finite(c),"請輸入有效的機率門檻。"))
    # CT 為整數分數，常態近似使用連續性修正；連續分配本身的單點機率仍為 0。
    boundary<-c
    if(input$survey_kind=="normal") boundary<-switch(input$survey_event,ge=ceiling(c)-.5,le=floor(c)+.5,eq=c)
    p<-switch(input$survey_event,
      ge=1-z$cdf(if(z$discrete) ceiling(c)-1 else boundary),
      le=z$cdf(if(z$discrete) floor(c) else boundary),
      eq=if(z$discrete) {if(c==floor(c)) z$d(c) else 0} else if(input$survey_kind=="normal" && c==floor(c)) z$cdf(c+.5)-z$cdf(c-.5) else 0)
    list(p=p,boundary=boundary,c=c)
  })
  output$survey_probability <- renderUI({
    r<-probability_result();g<-group_stats()
    event<-switch(input$survey_event,ge="≥",le="≤",eq="=")
    message<-sprintf("模型機率 P(X%s%s) = %.7g（%.5g%%）",event,fmt(r$c),r$p,100*r$p)
    if(input$survey_kind=="normal") message<-paste0("CT 整數分數的常態近似：",message)
    observed<-NULL
    if(input$survey_kind %in% c("normal","poisson")) {
      x<-if(input$survey_kind=="normal") g$ct else g$counts
      observed_rate<-mean(switch(input$survey_event,ge=x>=r$c,le=x<=r$c,eq=x==r$c))
      observed<-p(paste0("實測有效資料中的對應比率：",sprintf("%.5f（%.3f%%）",observed_rate,100*observed_rate)))
    }
    tagList(h4(message),observed,
      if(input$survey_kind=="normal") p(class="home-formula-note","常態曲線以 ±0.5 連續性修正近似整數分數。恰為整數 c 的近似值使用 c−0.5 至 c+0.5 的區間機率，並非連續分配的單點機率。"))
  })
  output$survey_diagnostic <- renderUI({
    g<-group_stats()
    if(input$survey_kind=="poisson") return(p(sprintf("觀察平均數=%.4f；觀察樣本變異數=%.4f；變異數／平均數=%.4f。卜瓦松理論要求 μ=σ²；此處只供檢視差異，不能僅憑比值認定模型適配。",g$rate_week,g$variance_count,g$variance_count/g$rate_week)))
    if(input$survey_kind=="normal") return(p("CT 具有離散取值與範圍限制，常態曲線的尾端仍可能超出實測分數範圍。請將模型機率與觀察比率對照。"))
    p("討論：此例哪些參數來自資料，哪些來自研究者的設定？若抽取方式或發生機制改變，原模型還適用嗎？")
  })
  output$survey_values <- renderTable({
    z<-model();g<-group_stats();kind<-input$survey_kind
    x<-if(kind=="normal") seq(min(g$ct),max(g$ct)) else if(z$discrete)
      seq(z$domain[1],max(z$domain[2],if(kind=="poisson") max(g$counts) else z$domain[2])) else
      if(kind=="uniform") seq(z$a,z$b,length.out=21) else seq(z$domain[1],z$domain[2],length.out=21)
    theoretical<-if(kind=="normal") z$cdf(x+.5)-z$cdf(x-.5) else z$d(x)
    value<-if(z$discrete || kind=="normal") prob_label(theoretical) else sprintf("%.6f",theoretical)
    ans<-data.frame(x=x,value=value,cumulative=sprintf("%.6f",if(kind=="normal") z$cdf(x+.5) else z$cdf(x)))
    names(ans)[2:3]<-c(if(kind=="normal") "模型 P(x−0.5≤X≤x+0.5)" else if(z$discrete) "模型 P(X=x)" else "模型密度 f(x)",
      if(kind=="normal") "模型 F(x+0.5)" else "模型 F(x)")
    if(kind %in% c("normal","poisson")) {
      obs<-if(kind=="normal") g$ct else g$counts
      ans$觀察比率<-sprintf("%.6f",vapply(x,function(k) mean(obs==k),numeric(1)))
    }
    ans
  },striped=TRUE,bordered=TRUE,spacing="s",digits=4)
  output$survey_summary <- renderTable({
    rows<-lapply(1:12,function(code){
      g<-survey_group_stats(dataset(),code,input$survey_cutoff,input$survey_count)
      data.frame(星座=zodiac_labels[code],問卷數=g$total,CT有效數=g$N,CT平均=g$mean,CT標準差=g$sd,
        達門檻人數=g$S,達門檻比例=g$proportion,次數有效數=length(g$counts),每週平均次數=g$rate_week,次數樣本變異數=g$variance_count,check.names=FALSE)
    })
    do.call(rbind,rows)
  },digits=4,bordered=TRUE,striped=TRUE,spacing="s")
  output$survey_plot <- renderPlot({
    z<-model();g<-group_stats();r<-probability_result();kind<-input$survey_kind
    par(mar=c(4.5,4.5,3,1),family=if(.Platform$OS.type=="windows") "Teaching" else "sans")
    if(z$discrete || kind=="normal") {
      x<-if(kind=="normal") seq(min(g$ct),max(g$ct)) else seq(z$domain[1],max(z$domain[2],if(kind=="poisson") max(g$counts) else z$domain[2]))
      theoretical<-if(kind=="normal") z$cdf(x+.5)-z$cdf(x-.5) else z$d(x)
      empirical<-if(kind %in% c("poisson","normal")) vapply(x,function(k)mean((if(kind=="normal") g$ct else g$counts)==k),numeric(1)) else NULL
      plot(x,theoretical,type="n",xlim=range(x)+c(-.6,.6),ylim=c(0,max(theoretical,empirical)*1.32),xaxt="n",xlab=if(kind=="normal") "CT 分數" else if(kind=="poisson") "每週次數" else "達門檻人數",ylab="機率／觀察相對次數",main=paste(zodiac_labels[as.integer(input$survey_zodiac)],z$title),cex.main=.95)
      integer_axis(x)
      selected<-switch(input$survey_event,ge=x>=r$c,le=x<=r$c,eq=x==r$c)
      if(!is.null(empirical)) {
        segments(x-.12,0,x-.12,empirical,col="#d28a4a",lwd=4)
        segments(x+.12,0,x+.12,theoretical,col="#147da0",lwd=3)
        legend("topright",c("觀察相對次數","模型機率"),col=c("#d28a4a","#147da0"),lwd=3,bty="n",cex=.75)
      } else {
        color<-ifelse(selected,"#147da0","#a8beca")
        segments(x,0,x,theoretical,col=color,lwd=4);points(x,theoretical,pch=16,col=color)
        if(length(x)<=30) draw_point_labels(x,theoretical,"#31556b")
      }
    } else {
      xr<-z$domain;x<-seq(xr[1],xr[2],length.out=2000);y<-z$d(x)
      plot(x,y,type="n",ylim=c(0,max(y)*1.15),xlab=if(kind=="uniform") "假設回訪時間（分鐘）" else "假設等待時間（天）",ylab="模型密度 f(x)",main=z$title)
      selected<-switch(input$survey_event,ge=x>=r$c,le=x<=r$c,eq=rep(FALSE,length(x)))
      if(kind=="uniform") selected<-selected & x>=z$a & x<=z$b
      xx<-x[selected]
      if(length(xx)>1) polygon(c(xx[1],xx,tail(xx,1)),c(0,z$d(xx),0),col="#c4dde8",border=NA)
      if(kind=="uniform") lines(c(xr[1],z$a,z$a,z$b,z$b,xr[2]),c(0,0,1/(z$b-z$a),1/(z$b-z$a),0,0),lwd=2,col="#147da0") else lines(x,y,lwd=2,col="#147da0")
      abline(v=z$m,lty=2,col="#bc5669")
      legend("topright",c("假設模型","模型平均數 μ"),col=c("#147da0","#bc5669"),lty=c(1,2),lwd=2,bty="n",cex=.75)
    }
  },res=110)
}

# 2. 六種分配公式總表，便於課堂隨時對照。
formula_table <- data.frame(
  類型 = c(rep("離散分配",3),rep("連續分配",3)),
  分配 = c("二項 B(n,π)","超幾何 HG(S,N,n)","卜瓦松 Poisson(λ)","常態 N(μ,σ²)","均勻 U(a,b)","指數 Exp(rate=λ)"),
  平均數μ = c("nπ","n(S/N)","λ","μ","(a+b)/2","1/λ"),
  `變異數σ²` = c("nπ(1−π)","n(S/N)(1−S/N)(N−n)/(N−1)","λ","σ²","(b−a)²/12","1/λ²"),
  標準差σ = c("√[nπ(1−π)]","√[n(S/N)(1−S/N)(N−n)/(N−1)]","√λ","σ","(b−a)/√12","1/λ"), check.names=FALSE)

# 3. 首頁分為基本概念、離散分配、連續分配與管理實務四頁。
# 預設僅展開基本概念；管理應用為配合教材概念新增的教學說明。
# 保留段落文字；各分配列出 f(x)、F(x)、μ、σ 四式。
# 文字依作者提供的 1H90V5_Ch07.docx 第 7.1–7.4 節及 STATCh07.pptx 整理。
# 採書稿由隨機實驗、形成條件、參數意義推進至公式的段落敘述方式。
# LaTeX 使用 R 的原始字串 r"(...)"，避免反斜線被當作 R 跳脫字元。
# withMathJax 將公式排成分式、根號與求和符號；CDF 為 F(x)=P(X≤x)。
home_equation <- function(label, tex) {
  p(class="home-equation",strong(paste0(label,"：")),
    span(paste0("\\(",tex,"\\)")))
}
home_distribution <- function(title, definition, fx, Fx, mean, sd, note=NULL) {
  # Match distribution names: numbering restarts at 1 on the continuous tab.
  distribution_names <- c("二項分配", "超幾何分配", "卜瓦松分配",
                          "常態分配", "均勻分配", "指數分配")
  index <- which(vapply(distribution_names, function(name) grepl(name, title, fixed=TRUE), logical(1)))
  stopifnot(length(index) == 1L)
  tags$section(class="distribution-intro",
    div(class="distribution-reading",h4(title),p(definition),
    div(class="equation-set",
    home_equation("機率函數 f(x)",fx),
    home_equation("累積分配函數 F(x)",Fx),
    home_equation("平均數 μ",mean),
    home_equation("標準差 σ",sd)),
    if(!is.null(note)) p(class="home-formula-note",note)),
    tags$figure(class="distribution-figure",
      div(class=paste("textbook-mini",paste0("textbook-mini-",index)),
        role="img",`aria-label`=paste(title,"教材分配示意圖")),
      tags$figcaption("教材原圖｜形狀示意")))
}
home_ui <- withMathJax(div(class="intro-home",
  tabsetPanel(id="home_section",selected="concepts",
  tabPanel("基本概念",value="concepts",
  h2("機率分配的基本概念"),
  p("如果將某隨機實驗的所有事件機率加以彙整，將會得到一個由機率所形成的分配，稱為機率分配（probability distribution）。機率的變化規律以機率函數 f(x) 表示，用以描繪分配的數學輪廓。此時，變數 X 不再只是描述事物或現象的代名詞，而是被賦予了具體的數學意義與機率意涵，因此稱為隨機變數（random variable）。累積分配函數以大寫 F(x) 表示，其數值為隨機變數不超過特定觀察值 x 的機率，亦即 F(x)=P(X≤x)。"),
  p("由於隨機實驗的樣本空間有離散與連續之別，機率分配也有兩種不同形式。在離散分配中，f(x)=P(X=x) 表示特定數值的發生機率，稱為機率質量函數（PMF），各數值機率加總為 1。相對之下，連續分配的 f(x) 描述曲線的高度，稱為機率密度函數（PDF），區間機率須由曲線下面積求得，整條曲線下的總面積為 1。值得注意的是，機率密度並非機率數值，其高度可以大於 1，而任一特定數值的單點機率則為 0。"),
  p("對於任一隨機變數，不論是離散或連續，所形成的機率分配皆具有數量性質，可以計算期望值（平均數）μ 與變異數 σ²，藉以說明分配的集中趨勢與變異情形。標準差 σ 為變異數的平方根，與原變數具有相同單位。以下介紹三種離散機率分配與三種連續機率分配，分別列出 f(x)、F(x)、μ 與 σ 四項公式。"),
  tags$figure(class="textbook-overview",
    tags$img(src="six_distributions_textbook.png",alt="教材圖7.1：上排為二項、超幾何、卜瓦松三種離散分配；下排為常態、均勻、指數三種連續分配。"),
    tags$figcaption("圖 7.1　六種常用的機率分配（教材原圖）")),
  ),
  tabPanel("離散機率分配",value="discrete",
  h3("離散機率分配"),
  home_distribution("1. 二項分配 B(n,π)",
    "在離散機率分配中，最簡單且最常見的是二項機率分配（binomial distribution），是一種基於柏努利試驗所獲得的機率分配。所謂柏努利試驗，是指單一獨立嘗試具有成功（1）或失敗（0）兩種結果的隨機實驗；成功的機率若為 π，失敗的機率則為 1−π。若進行 n 次獨立試驗，且各次成功機率維持固定，成功的總次數 X 即為二項隨機變數，以 X~B(n,π) 表示。",
    r"(f(x)=\binom{n}{x}\pi^x(1-\pi)^{n-x},\quad x=0,1,\ldots,n)",
    r"(F(x)=\begin{cases}0,&x<0\\ \displaystyle\sum_{k=0}^{\lfloor x\rfloor}\binom{n}{k}\pi^k(1-\pi)^{n-k},&0\le x<n\\1,&x\ge n\end{cases})",
    r"(\mu=n\pi)",r"(\sigma=\sqrt{n\pi(1-\pi)})",
    "f(x) 在其餘取值為 0；π=0 或 1 時，以退化分配解讀：X 分別固定為 0 或 n。"),
  home_distribution("2. 超幾何分配 HG(S,N,n)",
    "二項分配的各次實驗嘗試相互獨立，個別嘗試的發生機率維持固定。如果母體有限，而且實施取出不放回的實驗，各次嘗試的成功機率會隨先前結果改變，此時需以超幾何分配（hypergeometric distribution）描述。分配以 X~HG(S,N,n) 表示，其中 N 為母體規模，S 為母體中成功類別的總數，n 為抽取個數，X 則是抽到的成功個數。令 ℓ=max(0,n−(N−S))、u=min(n,S)，分別表示 X 的最小與最大可能值。",
    r"(f(x)=\frac{\binom{S}{x}\binom{N-S}{n-x}}{\binom{N}{n}},\quad x=\ell,\ell+1,\ldots,u)",
    r"(F(x)=\begin{cases}0,&x<\ell\\\displaystyle\sum_{k=\ell}^{\lfloor x\rfloor}\frac{\binom{S}{k}\binom{N-S}{n-k}}{\binom{N}{n}},&\ell\le x<u\\1,&x\ge u\end{cases})",
    r"(\mu=n\frac{S}{N})",
    r"(\sigma=\sqrt{n\frac{S}{N}\left(1-\frac{S}{N}\right)\frac{N-n}{N-1}})",
    "f(x) 在其餘取值為 0；(N−n)/(N−1) 為變異數的有限母體修正項。"),
  home_distribution("3. 卜瓦松分配 Poisson(λ)",
    "二項分配是針對反覆進行的柏努利試驗之機率分配進行描述，與時間並無必然關聯。如果關心的是一定連續區間內，包括時間、長度或空間，某事件發生的次數，則可用卜瓦松分配（Poisson distribution）描述，以 X~Poisson(λ) 表示。其中 λ>0 為特定區間內事件的平均發生次數，也是分配的唯一參數。例如每小時飛機起飛架次、每公里加油站數目，皆可在符合模型條件下以此分配描述。",
    r"(f(x)=\frac{\lambda^x e^{-\lambda}}{x!},\quad x=0,1,2,\ldots)",
    r"(F(x)=\begin{cases}0,&x<0\\\displaystyle\sum_{k=0}^{\lfloor x\rfloor}\frac{\lambda^k e^{-\lambda}}{k!},&x\ge0\end{cases})",
    r"(\mu=\lambda)",r"(\sigma=\sqrt{\lambda})",
    "f(x) 在其餘取值為 0。以上三種離散分配的 ⌊x⌋ 表示不大於 x 的最大整數。"),
  ),
  tabPanel("連續機率分配",value="continuous",
  h3("連續機率分配"),
  home_distribution("1. 常態分配 N(μ,σ²)",
    "統計最常用到的連續機率分配是常態分配（normal distribution），又稱高斯分配。服從常態分配的隨機變數，其機率密度呈現左右對稱的鐘形曲線。μ 與 σ² 兩個參數決定分配的中心點與變異程度，因此以 X~N(μ,σ²) 表示。當 x=μ 時，密度達到最高點；當 x 趨近正負無限大時，密度趨近 0。如果將 X 轉換成 z 分數，則得到平均數為 0、標準差為 1 的標準常態分配。",
    r"(f(x)=\frac{1}{\sigma\sqrt{2\pi}}\exp\left[-\frac{(x-\mu)^2}{2\sigma^2}\right],\quad -\infty<x<\infty)",
    r"(F(x)=\int_{-\infty}^{x}f(t)\,dt=\Phi\!\left(\frac{x-\mu}{\sigma}\right))",
    r"(\operatorname{E}(X)=\mu)",r"(\operatorname{SD}(X)=\sigma)",
    "Φ 為標準常態分配的累積分配函數；N(μ,σ²) 的第二項是變異數。此處公式中的 π 為圓周率。"),
  home_distribution("2. 均勻分配 U(a,b)",
    "另一種常見的連續機率分配為均勻分配（uniform distribution）。隨機變數在某一段連續區間內具有相同的機率密度，因其密度函數呈現長方形狀，因此又稱矩形分配，以 X~U(a,b) 表示。其中 a 與 b 為固定區間的兩端點，且 a<b。由於矩形面積為 1，而 b−a 為矩形的長度，因此高度恰為區間長度的倒數；區間內等長的範圍，具有相同的發生機率。",
    r"(f(x)=\begin{cases}\frac{1}{b-a},&a\le x\le b\\0,&\text{otherwise}\end{cases})",
    r"(F(x)=\begin{cases}0,&x<a\\\frac{x-a}{b-a},&a\le x\le b\\1,&x>b\end{cases})",
    r"(\mu=\frac{a+b}{2})",r"(\sigma=\frac{b-a}{\sqrt{12}})"),
  home_distribution("3. 指數分配 Exp(λ)",
    "指數分配（exponential distribution）所涉及的隨機實驗也與時間或間隔有關，例如燈泡的壽命、面對下一位顧客的等待時間，或機器發生故障的時間。分配僅有一個速率參數 λ>0，表示單位時間下的平均發生次數，以 X~Exp(λ) 表示，其平均數為 λ 的倒數，亦即發生一次事件的平均等待時間。當 x=0 時密度最大，隨著 x 增加而降低，形成右側長尾的正偏態分配；λ 愈大，平均等待時間愈短，分配的變異程度也愈小。",
    r"(f(x)=\begin{cases}\lambda e^{-\lambda x},&x\ge0\\0,&x<0\end{cases})",
    r"(F(x)=\begin{cases}1-e^{-\lambda x},&x\ge0\\0,&x<0\end{cases})",
    r"(\mu=\frac{1}{\lambda})",r"(\sigma=\frac{1}{\lambda})")
  ),
  tabPanel("管理實務意義",value="management",
    h3("機率分配在管理實務上的意義"),
    p("管理活動經常面對不確定的結果，例如接觸顧客是否成交、抽查商品是否發現不良品，以及下一位顧客何時到來。如果將這些結果以隨機變數表示，便可透過適當的機率分配，估計特定事件的發生機率。換言之，機率分配提供了描述不確定性的數學工具，使管理者能夠根據事件發生的可能性，進行規劃與決策。"),
    h4("六種分配所對應的管理問題"),
    div(class="management-table-wrap",tags$table(class="management-table",
      tags$thead(tags$tr(tags$th("分配"),tags$th("關心的問題"),tags$th("管理情境與用途"),tags$th("適用條件"))),
      tags$tbody(
        tags$tr(tags$td("二項分配",tags$small("離散")),tags$td("固定 n 次嘗試，成功幾次？"),
          tags$td("例如接觸 20 位潛在顧客，估計成交人數及達到業績目標的機率；也可描述一批獨立生產商品中的不良品個數。"),
          tags$td("次數固定、各次結果只有成功或失敗、彼此獨立，而且成功機率 π 相同。")),
        tags$tr(tags$td("超幾何分配",tags$small("離散")),tags$td("有限母體不放回抽取，抽到幾個特定類別？"),
          tags$td("例如 100 件商品中有 5 件不良品，抽查 10 件，估計至少發現一件不良品的機率，用以了解抽查方案的檢出能力。"),
          tags$td("母體規模 N 與成功總數 S 已知，隨機抽取 n 個且不放回。若 S 未知，可比較不同假設下的結果。")),
        tags$tr(tags$td("卜瓦松分配",tags$small("離散")),tags$td("固定時間或空間內，事件發生幾次？"),
          tags$td("例如估計每小時客服來電數、每日報修件數，以及需求超過處理量的機率，作為人力與服務容量規劃的依據。"),
          tags$td("在觀察期間內平均發生率穩定，不重疊區間的事件次數獨立。若尖峰、離峰差異明顯，應分時段建模。")),
        tags$tr(tags$td("常態分配",tags$small("連續")),tags$td("連續量測值如何圍繞中心波動？"),
          tags$td("例如穩定製程下的產品重量或尺寸，估計超出規格上下限的比率，據以評估製程的品質風險。"),
          tags$td("資料須近似對稱鐘形，並確認製程穩定。銷售額、等待時間等資料不一定服從常態分配。")),
        tags$tr(tags$td("均勻分配",tags$small("連續")),tags$td("已知範圍內，各等長區間是否同樣可能？"),
          tags$td("例如接駁車固定每 10 分鐘一班，乘客在班距內隨機抵站，其等待時間可用 U(0,10) 描述，計算等待超過 5 分鐘的比率。"),
          tags$td("區間內密度相同。僅知道最小與最大值，尚不足以認定為均勻分配。")),
        tags$tr(tags$td("指數分配",tags$small("連續")),tags$td("下一次事件發生前，還要等多久？"),
          tags$td("例如固定到達率下等候下一位顧客的時間，或固定故障率假設下的設備壽命，可估計等待或持續運作超過某段時間的機率。"),
          tags$td("事件以固定速率發生，等待時間具有無記憶性；若設備會老化，或到達率隨時間改變，就須另選模型。"))
      ))),
    h4("平均數與標準差的管理意涵"),
    p("分配平均數 μ 提供平均需求、平均成功次數或平均等待時間，可作為基本規劃的起點。標準差 σ 則反映結果偏離平均數的程度；即使兩種情況具有相同平均數，標準差不同，超出容量或規格的風險仍可能不同。因此，管理規劃除了掌握平均水準，也須評估變異情形，並利用分配計算達標、超載或等待過久的機率。"),
    h4("從事件形成的條件選擇分配"),
    p("二項與超幾何分配皆計算成功個數，主要差別在於各次嘗試是否獨立，以及有限母體抽取後是否放回。卜瓦松分配計算固定區間內的發生次數，指數分配則描述事件之間的等待時間；在固定速率的卜瓦松過程中，這兩者可用來描述同一個到達機制的不同面向。實際應用時，仍須依據資料與事件條件檢查模型是否適合。"),
    p(class="home-formula-note","本頁管理情境為配合教材概念延伸的教學說明。")
  )
  ),
  br(),actionButton("start_exploring","開始探索六種分配",class="btn-primary btn-lg"),
  hr(),p(class="intro-source","出自：邱皓政、林碧芳(2022)。統計學：原理與應用(第四版)。五南。"),
  p(tags$a("文獻連結",href="https://www.wunan.com.tw/bookdetail?NO=12266",target="_blank",rel="noopener noreferrer"))
))

# 4. 操作介面：首頁為預設頁；探索頁保留原有控制項與統計量卡片。
ui <- fluidPage(
  tags$head(tags$meta(charset="utf-8"), tags$style(HTML('
    body{font-family:"Microsoft JhengHei","Noto Sans TC",sans-serif;background:#f5f7fa;color:#334155;font-size:14px;-webkit-font-smoothing:antialiased}
    .container-fluid>h2{font-size:27px;font-weight:500;letter-spacing:.08em;margin:24px 0 20px}
    .nav-tabs>li>a{font-size:14px;padding:11px 18px;color:#687c8c}
    .nav-tabs>li.active>a,.nav-tabs>li.active>a:focus{color:#215f7a;font-weight:600;background:white;border-top:2px solid #39788f}
    .well{background:white;border-radius:10px}.metric{background:white;border:1px solid #dce4ed;border-radius:10px;padding:16px;margin:8px 0}
    .metric strong{font-size:25px;color:#146d92}.note{background:#eaf3fa;padding:12px;border-left:3px solid #6792a5;margin:12px 0}
    .formula{font-size:16px;line-height:1.8;background:white;padding:14px;border-radius:6px;overflow-wrap:anywhere}
    .help-block{line-height:1.7}.tab-content{padding-top:14px}
    .intro-home{max-width:1120px;margin:20px auto 36px;padding:22px 38px 26px;line-height:1.85;font-size:14px;background:#fff;border:1px solid #e4e9ef;border-radius:7px}
    .intro-home>.tabbable>.nav-tabs{margin-bottom:22px}
    .intro-home h2{font-size:22px;font-weight:500;letter-spacing:.04em;color:#245f77;margin:4px 0 20px}
    .intro-home h3{font-size:19px;font-weight:500;color:#245f77;margin:4px 0 14px}
    .intro-home h4{font-size:17px;font-weight:600;color:#304d60;margin:0 0 12px}
    .intro-home p{margin-bottom:15px;text-align:justify}
    .distribution-intro{display:grid;grid-template-columns:minmax(0,1fr) 235px;column-gap:32px;padding:22px 0;border-bottom:1px solid #e8edf2}
    .distribution-intro:last-child{border-bottom:0;padding-bottom:10px}
    .distribution-reading{min-width:0}.distribution-figure{margin:28px 0 0;align-self:start}
    .textbook-mini{width:100%;aspect-ratio:1.326;background-image:url("six_distributions_textbook.png");background-size:300% 200%;background-repeat:no-repeat;background-color:white}
    .textbook-mini-1{background-position:0 0}.textbook-mini-2{background-position:50% 0}.textbook-mini-3{background-position:100% 0}
    .textbook-mini-4{background-position:0 100%}.textbook-mini-5{background-position:50% 100%}.textbook-mini-6{background-position:100% 100%}
    .distribution-figure figcaption{font-size:11px;color:#81909e;text-align:center;letter-spacing:.04em;margin-top:7px}
    .equation-set{border-top:1px solid #edf1f5;padding-top:8px;margin-top:10px}
    .intro-home .home-equation{margin:7px 0;overflow:visible;padding:2px 0 8px;text-align:left;line-height:1.65;font-size:13px}
    .home-equation>strong{font-weight:500;color:#6c7e8e;font-size:12px;display:block;margin-bottom:4px}
    .home-equation .MathJax{font-size:100%!important}
    .intro-home .home-formula-note,.intro-home .intro-source{font-size:12px;color:#7b8794;line-height:1.75;margin-top:12px}
    .textbook-overview{max-width:730px;margin:24px auto 8px}.textbook-overview img{width:100%;height:auto;display:block}
    .textbook-overview figcaption{font-size:12px;text-align:center;color:#7b8794;margin-top:10px}
    .intro-home .btn-lg{font-size:14px;padding:10px 18px;border-radius:4px;background:#316e88;border-color:#316e88}
    .intro-home hr{border-color:#e8edf2;margin:22px 0 12px}.intro-home a{color:#39788f}
    .management-table-wrap{overflow-x:auto;margin:16px 0 26px}
    .management-table{width:100%;min-width:650px;border-collapse:collapse;font-size:13px;line-height:1.85}
    .management-table th{font-size:12px;font-weight:600;background:#f1f5f8;color:#526a7c;padding:11px 13px;text-align:left;border-bottom:1px solid #d8e1e9}
    .management-table td{padding:15px 13px;vertical-align:top;border-bottom:1px solid #e6ecf1}
    .management-table td:first-child{width:13%;font-weight:600;color:#31576c;white-space:nowrap}
    .management-table td:nth-child(2){width:22%}.management-table td:nth-child(3){width:37%}
    .management-table small{display:block;font-size:11px;font-weight:400;color:#8997a3;margin-top:4px}
    @media(max-width:850px){.intro-home{padding:20px}.distribution-intro{grid-template-columns:minmax(0,1fr) 190px;column-gap:20px}}
    @media(max-width:600px){.intro-home{padding:16px;font-size:14px}.distribution-intro{display:block}.distribution-figure{max-width:235px;margin:15px auto}.nav-tabs>li>a{padding:10px 11px;font-size:13px}.intro-home .home-equation{overflow-x:auto;padding-bottom:12px}}
    /* 緊湊版：以視窗高度控制圖形，字體和控制項同步縮小。 */
    body{font-size:13px}
    .container-fluid{padding-left:16px;padding-right:16px}
    .container-fluid>h2{font-size:22px;letter-spacing:.025em;margin:12px 0 10px}
    .nav-tabs>li>a{font-size:13px;padding:8px 12px}
    .tab-content{padding-top:9px}
    .well{padding:12px;margin-bottom:12px}
    .well .form-group{margin-bottom:10px}
    .control-label,.checkbox label,.help-block,.btn,.form-control,.selectize-input{font-size:12px}
    .form-control{height:30px}
    .well .note{font-size:11px;line-height:1.55;padding:8px;margin:8px 0}
    .well hr{margin:10px 0}
    .well .btn{padding:6px 8px}
    .metric{padding:9px 12px;margin:0 0 8px;font-size:12px;border-radius:7px}
    .metric strong{font-size:22px}
    #distribution_plot{height:clamp(190px,calc(100vh - 245px),360px)!important;width:100%!important}
    #exercise_plot{height:clamp(190px,45vh,340px)!important}
    .intro-home{margin:10px auto 20px;padding:18px 26px;font-size:13px}
    @media(min-width:768px){.well{max-height:calc(100vh - 135px);overflow-y:auto}}
    @media(max-width:767px){.container-fluid>h2{font-size:19px}.metric{padding:6px}.metric strong{font-size:19px}#distribution_plot{height:280px!important}}
'))),
  titlePanel("機率分配 Probability Distribution"),
  tabsetPanel(id="main_page",selected="home",
    tabPanel("首頁｜基本概念",value="home",home_ui),
    tabPanel("探索各分配",value="explore",
  sidebarLayout(sidebarPanel(width=3,
    selectInput("kind","選擇分配", list(
      "離散分配"=c("二項分配"="binomial","超幾何分配"="hyper","卜瓦松分配"="poisson"),
      "連續分配"=c("常態分配"="normal","均勻分配"="uniform","指數分配"="exponential"))),
    uiOutput("type_note"),
    conditionalPanel("input.kind == 'binomial'",
      sliderInput("bn","試驗次數 n",min=1,max=200,value=10,step=1),sliderInput("bp","每次成功機率 π",0,1,.5,.01)),
    conditionalPanel("input.kind == 'hyper'",
      sliderInput("hN","母體總數 N",2,500,50,1),
      uiOutput("hyper_controls"), helpText("S、n 的上限隨 N 更新；採不放回抽取。")),
    conditionalPanel("input.kind == 'poisson'", sliderInput("pl","平均發生次數 λ",.1,100,4,.1)),
    conditionalPanel("input.kind == 'normal'", numericInput("nm","平均數 μ",0),sliderInput("ns","標準差 σ",.1,10,1,.1)),
    conditionalPanel("input.kind == 'uniform'", numericInput("ua","下界 a",0),numericInput("ub","上界 b",10),helpText("必須 a < b。")),
    conditionalPanel("input.kind == 'exponential'",sliderInput("el","速率 λ（rate）",.01,5,1,.01)),
    hr(), checkboxInput("marks","標示 μ 與 μ±σ",TRUE),
    actionButton("keep","保留目前曲線供比較",class="btn-primary",width="100%"),br(),br(),
    actionButton("clear","清除比較曲線",width="100%"),
    helpText("同一分配可保留一組參數。切換分配會清除比較；有保留曲線時，兩組使用共同座標。"),
    div(class="note","觀察：μ 決定分配的中心；σ 描述 X 的分散程度。圖上的 μ±σ 是位置標記，不一定是可能取值，也不是信賴區間。")
  ), mainPanel(width=9,
    fluidRow(column(4,div(class="metric","理論平均數 μ",br(),strong(textOutput("mean",inline=TRUE)))),
             column(4,div(class="metric","理論標準差 σ",br(),strong(textOutput("sd",inline=TRUE)))),
             column(4,div(class="metric","理論變異數 σ²",br(),strong(textOutput("variance",inline=TRUE))))),
    tabsetPanel(
      tabPanel("分配探索",
        checkboxInput("point_labels","在離散圖上標示各取值的 P(X=x)",TRUE),
        plotOutput("distribution_plot",height="460px",hover=hoverOpts("distribution_hover",delay=60,delayType="throttle")),
        uiOutput("point_readout"),
        helpText("離散圖在 40 個取值以內逐一列出整數標籤；取值更多時保留逐一刻度並間隔標示。30 個取值以內顯示各點機率；更密集時可用滑鼠指讀或查下方完整表格。"),
        uiOutput("explanation"),tableOutput("comparison"),
        h4("取值與機率數值表"),uiOutput("value_table_note"),
        div(style="max-height:320px;overflow:auto",tableOutput("value_table"))),
      tabPanel("公式與代入",uiOutput("calculation"),h4("六種分配的 μ、σ²、σ"),tableOutput("formulas")),
      tabPanel("區間機率",helpText("輸入 L、U，計算 P(L ≤ X ≤ U)。離散分配只計整數點；連續分配計算密度曲線下的面積。"),
        fluidRow(column(4,numericInput("lower","下界 L",0)),column(4,numericInput("upper","上界 U",5))),
        h3(textOutput("probability")),helpText("此處使用完整分配的累積機率函數計算，不受圖形顯示範圍截尾影響。")),
      tabPanel("習題練習",p("依序提供課本三組課後習作與 HWCH07 活動單。先判斷分配與參數，再手算及畫圖，最後勾選核對。"),
        selectInput("exercise","練習情境",list(
          "課本課後習作"=c("第一題：捷運票價意見"="textbook_transit","第二題：手機銷售"="textbook_phones","第三題：列車間距"="textbook_trains"),
          "活動單"=c("班機誤點（二項／離散）"="flights","CD 選曲（超幾何／離散）"="songs",
          "email 封數（卜瓦松／離散）"="email","信用卡消費（均勻／連續）"="credit","候診時間（指數／連續）"="waiting")),selected="textbook_transit"),
        uiOutput("exercise_case_selector"),uiOutput("exercise_question"),uiOutput("exercise_events"),
        checkboxInput("reveal","顯示解答與機率區域圖（完成作答後核對）",FALSE),
        conditionalPanel("input.reveal",uiOutput("exercise_answer"),plotOutput("exercise_plot",height="400px"),
          div(style="max-height:260px;overflow:auto",tableOutput("exercise_values"))),
        helpText("課本列車題可比較三種連續分配。解答顯示 μ、σ 與 σ²；離散圖逐一標示取值與機率。")),
      tabPanel("教學建議",h4("建議操作順序"),
        tags$ol(tags$li("二項：n=20，先保留 π=0.5，再改成 0.1、0.9，比較偏斜方向與 σ。"),
          tags$li("超幾何：N=50、S=20，改變 n，觀察 n=N 時 σ=0；對照不放回抽取的修正項。"),
          tags$li("卜瓦松：比較 λ=1、4、20，強調 μ=σ²，並非 μ=σ。"),
          tags$li("常態：先只改 μ 觀察平移，再保留曲線並只改 σ 觀察寬度。"),
          tags$li("均勻：比較 U(0,10)、U(5,15) 與 U(0,20)，分辨位置和區間寬度的效果。"),
          tags$li("指數：比較 λ=0.5、1、2，強調速率增加，μ 與 σ 反而下降。")),
        div(class="note","離散圖縱軸是單點機率 P(X=x)；連續圖縱軸是密度 f(x)，高度可能超過 1。連續分配的機率須用面積計算。"))
    )
  ))),
  tabPanel("調查研究範例",value="survey",survey_ui)
  )
)

# 4. Server：reactive 會在參數改變後自動重算理論值，不必按模擬按鈕。
server <- function(input, output, session) {
  survey_server(input,output,session)
  # 按首頁按鈕切換頁籤；隨時可點首頁返回閱讀，探索參數仍保留。
  observeEvent(input$start_exploring, {
    updateTabsetPanel(session,"main_page",selected="explore")
  })
  output$type_note <- renderUI({
    discrete<-input$kind %in% c("binomial","hyper","poisson")
    div(class="note",strong(if(discrete) "離散分配" else "連續分配"),br(),
      if(discrete) "X 取可數的值；每根機率棒表示 P(X=x)，所有可能取值的機率總和為 1。" else
        "X 在區間上連續取值；曲線高度是密度，機率是曲線下面積，單點機率 P(X=x)=0。")
  })
  # 活動單採獨立參數，不改變探索頁已設定的分配。
  # 每個事件以 L/U 表示；離散的「少於2」必須寫成 X≤1。
  exercises <- list(
    flights=list(z=make_distribution("binomial",n=10,p=.1),
      question="每天 10 班飛機，每班誤點機率 0.10。令 X 為當天誤點班數（假設各班是否誤點互相獨立）。求各事件機率，以及平均數與變異數。",
      events=c("沒有任何班機誤點：P(X=0)","至少一班誤點：P(X≥1)","只有一班誤點：P(X=1)"),
      L=c(0,1,1),U=c(0,Inf,1),work=c("dbinom(0, size=10, prob=0.1)","pbinom(0, size=10, prob=0.1, lower.tail=FALSE)","dbinom(1, size=10, prob=0.1)")),
    songs=list(z=make_distribution("hyper",N=10,S=6,n=3),
      question="10 首歌中有 6 首古典、4 首搖滾，隨機選 3 首，不放回。令 X 為選到的古典歌曲數。求各事件機率，以及平均數與變異數。",
      events=c("恰有兩首古典：P(X=2)","少於兩首古典：P(X<2)=P(X≤1)"),L=c(2,-Inf),U=c(2,1),
      work=c("dhyper(2, m=6, n=4, k=3)","phyper(1, m=6, n=4, k=3)")),
    email=list(z=make_distribution("poisson",lambda=5),
      question="教授每天平均收到 5 封學生 email，假設每日封數服從卜瓦松分配。令 X 為一天收到的封數。求各事件機率，以及平均數與變異數。",
      events=c("沒有 email：P(X=0)","恰有五封：P(X=5)"),L=c(0,5),U=c(0,5),work=c("dpois(0, lambda=5)","dpois(5, lambda=5)")),
    credit=list(z=make_distribution("uniform",a=100,b=1100),
      question="每月消費金額 X 服從 U(100,1100)。求平均數、標準差，以及消費金額介於 600 與 889 的比率。",
      events="P(600≤X≤889)",L=600,U=889,work="punif(889, 100, 1100) - punif(600, 100, 1100)"),
    waiting=list(z=make_distribution("exponential",lambda=.1),
      question="候診時間 X（分鐘）服從指數分配，平均 10 分鐘。求速率換算，以及少於 6 分鐘、超過 12 分鐘、介於 8–12 分鐘的機率。",
      events=c("少於六分鐘：P(X<6)","超過十二分鐘：P(X>12)","八至十二分鐘：P(8≤X≤12)"),
      L=c(0,12,8),U=c(6,Inf,12),work=c("pexp(6, rate=0.1)","pexp(12, rate=0.1, lower.tail=FALSE)","pexp(12, rate=0.1) - pexp(8, rate=0.1)"))
  )
  # 課本新增三組大題；每組含模型或條件分支，避免把不同分配混在同一參數下。
  # 「shape」表示判斷分配、畫圖與求母體量數，不把整個分配的機率 1 當作小題答案。
  opinion_case <- function(hyper=FALSE,ratio=.5) {
    list(z=if(hyper) make_distribution("hyper",N=100,S=100*ratio,n=10) else make_distribution("binomial",n=10,p=ratio),
      question=if(hyper) sprintf("課本第一題（4）–（5）：100 名市府員工中，%d 名反對票價調整，隨機不放回訪問 10 名。令 X 為反對人數。判斷分配、繪圖，並求平均數與變異數。",100*ratio) else
        sprintf("課本第一題（1）–（3）：訪問 10 位市民，假設每位反對票價調整的機率同為 %.1f，且彼此獨立。令 X 為反對人數。判斷分配、繪圖，並求平均數與變異數。",ratio),
      events="判斷分配、繪製各取值機率並求 μ、σ²",L=-Inf,U=Inf,mode="shape",
      work=if(hyper) sprintf("x <- 0:10\np <- dhyper(x, m=%.0f, n=%.0f, k=10)",100*ratio,100*(1-ratio)) else sprintf("x <- 0:10\np <- dbinom(x, size=10, prob=%.1f)",ratio),
      note=if(hyper) "有限母體、不放回抽取，各次結果不獨立，故採超幾何分配。80% 反對表示 S=80；若改把贊成視為成功，才是 S=20，兩者圖形互為鏡像。" else
        "每位受訪者的結果可視為一次柏努利試驗；在獨立且成功機率固定的假設下，反對總人數服從二項分配。")
  }
  exercises$textbook_transit <- list(cases=list(
    "市民：50% 反對"=opinion_case(FALSE,.5),"市民：80% 反對"=opinion_case(FALSE,.8),
    "員工：50% 反對，不放回抽取"=opinion_case(TRUE,.5),"員工：80% 反對，不放回抽取"=opinion_case(TRUE,.8)))
  exercises$textbook_phones <- list(cases=list(
    "（1）直營店：每日平均 3 支"=list(z=make_distribution("poisson",lambda=3),
      question="課本第二題（1）：直營店每天平均賣出 3 支手機。假設銷售次數形成固定速率的卜瓦松過程，分別求下列機率，並說明各模型的平均數與變異數。",
      events=c("一天恰賣出 1 支：P(X=1)","一天沒有賣出：P(X=0)","連續七天都未賣出：P(X₇天=0)","一週恰賣出 10 支：P(X₇天=10)"),
      L=c(1,0,0,10),U=c(1,0,0,10),
      event_z=list(make_distribution("poisson",lambda=3),make_distribution("poisson",lambda=3),make_distribution("poisson",lambda=21),make_distribution("poisson",lambda=21)),
      work=c("dpois(1, lambda=3)","dpois(0, lambda=3)","dpois(0, lambda=3*7)","dpois(10, lambda=3*7)"),
      note="以一天為區間時 λ=3；以七天為區間時 λ=21。平均數與變異數須跟著觀察區間一起換算。"),
    "（2）加盟店：等待下一筆銷售"=list(z=make_distribution("exponential",lambda=1/3),
      question="課本第二題（2）：加盟店平均每 3 天賣出 1 支手機。令 T 為從觀察起點等到下一筆銷售的天數，在固定速率模型下 T~Exp(1/3)。求各事件機率及平均數與變異數。",
      events=c("一天內賣出：P(T≤1)","三天內賣出：P(T≤3)","要等 1 至 5 天：P(1≤T≤5)"),
      L=c(0,0,1),U=c(1,3,5),work=c("pexp(1, rate=1/3)","pexp(3, rate=1/3)","pexp(5, rate=1/3)-pexp(1, rate=1/3)"),
      note="這裡把『三天有賣出』解讀為三天內至少有一筆銷售。若『連續三天』指每天都有賣出，請選下一個分支，兩種事件的機率不同。"),
    "（2）語意比較：連續三天，每天都有銷售"=list(z=make_distribution("binomial",n=3,p=1-exp(-1/3)),
      question="若原題『連續三天有賣出』是指三天中每天都至少賣出 1 支，則單日有銷售的機率 q=1−exp(−1/3)。假設不重疊各日銷售獨立，令 Y 為三天中有銷售的天數。",
      events="每天都有銷售：P(Y=3)",L=3,U=3,work="(1-exp(-1/3))^3",
      note="此處 Y 計算有銷售的天數，服從 B(3,q)；與等待時間 T 或三天內售出總支數為不同隨機變數。")))
  train_case <- function(kind) {
    z<-switch(kind,uniform=make_distribution("uniform",a=3,b=15),normal=make_distribution("normal",mu=9,sigma=2),exponential=make_distribution("exponential",lambda=1/9))
    list(z=z,question=paste0("課本第三題：令 X 為兩列車通過的間隔（分鐘）。",switch(kind,
      uniform="（1）假設間隔服從 U(3,15)。",normal="（2）另假設間隔服從 N(9,2²)。",exponential="（3）另假設間隔服從指數分配，平均每 9 分鐘通過一列車，故 λ=1/9。"),"求 5 分鐘以內與 5 分鐘以上的機率，並作圖比較。"),
      events=c("五分鐘以內：P(X≤5)","五分鐘以上：P(X≥5)"),L=c(-Inf,5),U=c(5,Inf),
      work=switch(kind,uniform=c("punif(5, min=3, max=15)","punif(5, min=3, max=15, lower.tail=FALSE)"),normal=c("pnorm(5, mean=9, sd=2)","pnorm(5, mean=9, sd=2, lower.tail=FALSE)"),exponential=c("pexp(5, rate=1/9)","pexp(5, rate=1/9, lower.tail=FALSE)")),
      note="三個小題是不同模型假設。3–15 分鐘只作為均勻分配的界限；常態與指數模型不截斷至此區間。常態模型含極小的負值機率，是時間資料的近似模型。連續分配的單點機率為 0，因此此處 ≥ 與 > 的答案相同。")
  }
  exercises$textbook_trains <- list(cases=list("（1）均勻 U(3,15)"=train_case("uniform"),"（2）常態 N(9,2²)"=train_case("normal"),"（3）指數 Exp(1/9)"=train_case("exponential")))
  output$exercise_case_selector <- renderUI({
    e<-exercises[[input$exercise]];if(is.null(e$cases)) return(NULL)
    selectInput("exercise_case","選擇條件／模型",setNames(seq_along(e$cases),names(e$cases)))
  })
  exercise <- reactive({
    e<-exercises[[input$exercise]];req(e)
    if(!is.null(e$cases)) {
      i<-suppressWarnings(as.integer(input$exercise_case));req(length(i)==1,!is.na(i),i>=1,i<=length(e$cases))
      e<-e$cases[[i]]
    }
    e
  })
  output$exercise_question <- renderUI(div(class="note",exercise()$question))
  output$exercise_events <- renderUI(selectInput("event","選擇子題",setNames(seq_along(exercise()$events),exercise()$events)))
  observeEvent(input$exercise,updateCheckboxInput(session,"reveal",value=FALSE),ignoreInit=TRUE)
  observeEvent(input$exercise_case,updateCheckboxInput(session,"reveal",value=FALSE),ignoreInit=TRUE)
  exercise_result <- reactive({
    e<-exercise();i<-as.integer(input$event);req(length(i)==1,i>=1,i<=length(e$events))
    z<-if(is.null(e$event_z)) e$z else e$event_z[[i]];L<-e$L[i];U<-e$U[i]
    probability<-if(z$discrete) z$cdf(floor(U))-z$cdf(ceiling(L)-1) else z$cdf(U)-z$cdf(L)
    list(e=e,z=z,i=i,L=L,U=U,probability=probability)
  })
  output$exercise_answer <- renderUI({
    req(input$reveal);s<-exercise_result();z<-s$z
    tagList(h4(z$label),div(class="formula",z$formula),p(z$substitution),
      p(sprintf("μ = %s；σ = %s；σ² = %s",fmt(z$m),fmt(sqrt(z$v)),fmt(z$v))),
      if(!identical(s$e$mode,"shape")) h4(sprintf("%s = %.7g（%.5g%%）",s$e$events[s$i],s$probability,100*s$probability)),
      tags$pre(s$e$work[s$i]),
      if(!is.null(s$e$note)) p(s$e$note),
      if(input$exercise=="textbook_trains") tagList(h4("同一個 5 分鐘門檻，三種模型的比較"),tableOutput("train_comparison")),
      if(input$exercise=="waiting") div(class="note","速率 λ=1/10=0.1 次／分鐘，換算為每小時 6 次。若把這個等待時間模型解讀為平均每小時服務 6 人，需要另假設等待時間代表相鄰服務事件間隔；僅由平均候診時間，無法確定醫院實際每小時看診人數。"))
  })
  output$train_comparison <- renderTable({
    req(input$reveal,input$exercise=="textbook_trains")
    models<-lapply(exercises$textbook_trains$cases,function(e)e$z)
    data.frame(模型=c("均勻 U(3,15)","常態 N(9,2²)","指數 Exp(1/9)"),
      μ=vapply(models,function(z)z$m,numeric(1)),σ=vapply(models,function(z)sqrt(z$v),numeric(1)),
      `P(X≤5)`=vapply(models,function(z)z$cdf(5),numeric(1)),
      `P(X≥5)`=vapply(models,function(z)1-z$cdf(5),numeric(1)),check.names=FALSE)
  },striped=TRUE,bordered=TRUE,digits=6,spacing="s")
  output$exercise_values <- renderTable({
    req(input$reveal);z<-exercise_result()$z
    if(!z$discrete) return(NULL)
    x<-seq(z$domain[1],z$domain[2])
    data.frame(x=x,`P(X=x)`=prob_label(z$d(x)),`F(x)`=sprintf("%.6f",z$cdf(x)),check.names=FALSE)
  },striped=TRUE,bordered=TRUE,spacing="s")
  output$exercise_plot <- renderPlot({
    req(input$reveal);s<-exercise_result();z<-s$z
    par(mar=c(3.7,4,2.2,.7),mgp=c(2.3,.7,0),cex.main=.95,cex.lab=.85,cex.axis=.75,family=if(.Platform$OS.type=="windows") "Teaching" else "sans")
    xr<-z$domain
    if(diff(xr)==0) xr<-xr+c(-.5,.5)
    x<-if(z$discrete) seq(ceiling(xr[1]),floor(xr[2])) else seq(xr[1],xr[2],length.out=2000)
    y<-z$d(x)
    plot(x,y,type="n",ylim=c(0,max(y)*1.32),xlab="X",ylab=if(z$discrete) "機率 P(X=x)" else "機率密度 f(x)",main=s$e$events[s$i],cex.main=.95,xaxt=if(z$discrete) "n" else "s")
    abline(v=z$m,col="#c23c50",lty=2,lwd=2)
    abline(v=z$m+sqrt(z$v),col="#748397",lty=3,lwd=2)
    if(z$discrete) {
      color<-ifelse(x>=s$L & x<=s$U,"#d67421","#b8cad5")
      segments(x,0,x,y,col=color,lwd=6);points(x,y,pch=16,col=color)
      integer_axis(x)
      if(length(x)<=30) draw_point_labels(x,y,"#31556b")
    } else {
      left<-max(xr[1],s$L);right<-min(xr[2],s$U)
      if(z$kind=="uniform") {left<-max(left,z$a);right<-min(right,z$b)}
      xx<-seq(left,right,length.out=1000)
      polygon(c(left,xx,right),c(0,z$d(xx),0),col="#f4bc80",border=NA)
      if(z$kind=="uniform") lines(c(xr[1],z$a,z$a,z$b,z$b,xr[2]),c(0,0,1/(z$b-z$a),1/(z$b-z$a),0,0),lwd=2,col="#147da0")
      else lines(x,y,lwd=2,col="#147da0")
    }
    if(!z$discrete) {
      abline(v=z$m,col="#c23c50",lty=2,lwd=2)
      abline(v=z$m+sqrt(z$v),col="#748397",lty=3,lwd=2)
    }
    legend("topright",c("題目機率區域","μ","μ+σ"),col=c("#d67421","#c23c50","#748397"),lty=c(1,2,3),lwd=c(5,2,2),bty="n",cex=.72)
    mtext(sprintf("μ=%.4f；σ=%.4f；σ²=%.4f",z$m,sqrt(z$v),z$v),side=3,line=.2,cex=.7)
  },res=110)
  output$hyper_controls <- renderUI({
    N <- input$hN
    oldS <- isolate(input$hS); oldn <- isolate(input$hn)
    tagList(sliderInput("hS","母體成功總數 S",0,N,if(is.null(oldS)) min(20,N) else min(oldS,N),1),
            sliderInput("hn","抽取個數 n",1,N,if(is.null(oldn)) min(10,N) else min(oldn,N),1))
  })
  current <- reactive({
    # validate/need 使非法輸入顯示中文提示，而不是讓整個程式停止。
    if(input$kind=="uniform") validate(need(length(input$ua)==1 && length(input$ub)==1 &&
      is.finite(input$ua) && is.finite(input$ub) && input$ua<input$ub,"請輸入有限數值，並確認下界 a 小於上界 b。"))
    if(input$kind=="normal") validate(need(length(input$nm)==1 && is.finite(input$nm),"請輸入有效的平均數 μ。"))
    if(input$kind=="hyper") {
      req(input$hS,input$hn)
      validate(need(input$hS<=input$hN && input$hn<=input$hN,"請等待 S 與 n 的範圍更新。"))
    }
    switch(input$kind,
      binomial=make_distribution("binomial",n=input$bn,p=input$bp),
      hyper=make_distribution("hyper",N=input$hN,S=input$hS,n=input$hn),
      poisson=make_distribution("poisson",lambda=input$pl),
      normal=make_distribution("normal",mu=input$nm,sigma=input$ns),
      uniform=make_distribution("uniform",a=input$ua,b=input$ub),
      exponential=make_distribution("exponential",lambda=input$el))
  })
  reference <- reactiveVal(NULL)
  observeEvent(input$kind,reference(NULL),ignoreInit=TRUE)
  observeEvent(input$keep, reference(current()))
  observeEvent(input$clear, reference(NULL))
  output$point_readout <- renderUI({
    z<-current();h<-input$distribution_hover
    if(is.null(h)) return(p(class="home-formula-note","將滑鼠移到圖上，可讀取該位置的數值。"))
    x<-if(z$discrete) round(h$x) else h$x
    r<-reference()
    text<-if(z$discrete) sprintf("X=%d：P(X=x)=%s；F(x)=%.6f",x,prob_label(z$d(x)),z$cdf(x)) else
      sprintf("x=%.4f：密度 f(x)=%.6f；F(x)=%.6f；單點機率 P(X=x)=0",x,z$d(x),z$cdf(x))
    if(!is.null(r) && r$kind==z$kind) text<-paste0(text,sprintf("；保留參數 %s=%.6f",if(z$discrete) "P(X=x)" else "f(x)",r$d(x)))
    p(style="color:#315f77;font-size:13px",text)
  })
  value_data <- reactive({
    z<-current();r<-reference();if(!is.null(r) && r$kind!=z$kind) r<-NULL
    domain<-range(z$domain,if(!is.null(r)) r$domain)
    x<-if(z$discrete) seq(domain[1],domain[2]) else
      if(z$kind=="uniform") seq(z$a,z$b,length.out=21) else seq(domain[1],domain[2],length.out=21)
    data<-data.frame(x=x,value=z$d(x),cumulative=z$cdf(x))
    if(!is.null(r)) {data$reference_value<-r$d(x);data$reference_cumulative<-r$cdf(x)}
    data
  })
  output$value_table_note <- renderUI({
    z<-current()
    p(class="home-formula-note",if(z$discrete) {
      if(z$kind=="poisson") "逐一列出圖示範圍內的整數 x、P(X=x) 與 F(x)。卜瓦松分配的右尾無上限，表格與圖形顯示至至少涵蓋 99.99% 機率的位置。" else
        "逐一列出所有可能的整數取值、P(X=x) 與 F(x)。可上下捲動查閱完整表格。"
    } else "下表選列 21 個位置的密度 f(x) 與累積機率 F(x)。密度並非單點機率，連續分配的 P(X=x)=0。")
  })
  output$value_table <- renderTable({
    z<-current();data<-value_data()
    data[[2]]<-if(z$discrete) prob_label(data[[2]]) else sprintf("%.6f",data[[2]])
    data[[3]]<-sprintf("%.6f",data[[3]])
    names(data)[1:3]<-c("x",if(z$discrete) "P(X=x)" else "密度 f(x)","F(x)=P(X≤x)")
    if(ncol(data)>3) {
      data[[4]]<-if(z$discrete) prob_label(data[[4]]) else sprintf("%.6f",data[[4]])
      data[[5]]<-sprintf("%.6f",data[[5]])
      names(data)[4:5]<-c(if(z$discrete) "保留：P(X=x)" else "保留：f(x)","保留：F(x)")
    }
    data
  },striped=TRUE,bordered=TRUE,spacing="s",digits=4)
  output$mean <- renderText(fmt(current()$m))
  output$sd <- renderText(fmt(sqrt(current()$v)))
  output$variance <- renderText(fmt(current()$v))
  output$formulas <- renderTable(formula_table,striped=TRUE,bordered=TRUE)
  output$calculation <- renderUI({
    z<-current()
    tagList(h3(z$label),div(class="formula",z$formula),h4("目前參數代入"),
            div(class="formula",z$substitution),p("所有數值為理論值；畫面顯示約四位有效數字，計算使用完整精度。"))
  })
  output$explanation <- renderUI({z<-current();tagList(h4(z$label),p(z$mechanism),div(class="note",z$effect))})
  output$comparison <- renderTable({
    z<-current();r<-reference()
    row <- function(x,tag) data.frame(組別=tag,參數=x$label,平均數μ=fmt(x$m),標準差σ=fmt(sqrt(x$v)),`變異數σ²`=fmt(x$v),check.names=FALSE)
    if(is.null(r) || r$kind!=z$kind) row(z,"目前") else rbind(row(z,"目前"),row(r,"保留"))
  },striped=TRUE,bordered=TRUE)
  output$probability <- renderText({
    z<-current();L<-input$lower;U<-input$upper
    validate(need(length(L)==1 && length(U)==1 && is.finite(L) && is.finite(U) && L<=U,"請輸入有限數值並確認 L ≤ U。"))
    # 離散下界需用 ceil(L)−1；例如 L=2 時必須保留 X=2 的機率。
    prob <- if(z$discrete) z$cdf(floor(U))-z$cdf(ceiling(L)-1) else z$cdf(U)-z$cdf(L)
    sprintf("P(%s ≤ X ≤ %s) = %.6f（%.3f%%）",fmt(L),fmt(U),max(0,min(1,prob)),100*max(0,min(1,prob)))
  })
  output$distribution_plot <- renderPlot({
    z<-current();r<-reference();if(!is.null(r) && r$kind!=z$kind) r<-NULL
    par(mar=c(2.4,4,2.2,2.2),mgp=c(2.3,.7,0),cex.main=.95,cex.lab=.85,cex.axis=.75,family=if(.Platform$OS.type=="windows") "Teaching" else "sans")
    # 比較曲線共用 X/Y 範圍，避免自動縮放讓寬窄變化不易辨認。
    xr<-range(z$domain,if(!is.null(r)) r$domain)
    if(isTRUE(input$marks)) xr<-range(xr,z$m+c(-1,1)*sqrt(z$v))
    if(diff(xr)==0) xr<-xr+c(-.5,.5)
    else xr<-xr+c(-.03,.03)*diff(xr)
    x<-if(z$discrete) seq(floor(xr[1]),ceiling(xr[2])) else seq(xr[1],xr[2],length.out=2400)
    y<-z$d(x);yr<-if(!is.null(r)) r$d(x) else 0
    plot(x,y,type="n",ylim=c(0,max(y,yr)*1.32),xlim=xr,xlab="",
      ylab=if(z$discrete) "機率 P(X=x)" else "機率密度 f(x)",main=z$title,xaxt=if(z$discrete) "n" else "s")
    if(z$discrete) integer_axis(seq(min(0,z$domain[1],if(!is.null(r)) r$domain[1]),max(z$domain[2],if(!is.null(r)) r$domain[2])))
    # X 放在座標軸右端、最後刻度數字右側；不再另占下方一行。
    mtext("X",side=1,line=.7,at=par("usr")[2]+strwidth("X",cex=.85)*.5,adj=0,cex=.85,xpd=NA)
    abline(h=axTicks(2),col="#edf0f4",lty=1)
    draw <- function(obj,color,old=FALSE) {
      yy<-obj$d(x)
      if(obj$discrete) {
        shift<-if(is.null(r)) 0 else if(old) .12 else -.12
        segments(x+shift,0,x+shift,yy,col=color,lwd=if(old) 2 else 3,lty=if(old) 2 else 1)
        points(x+shift,yy,pch=if(old) 1 else 16,col=color,cex=.65)
        valid<-x>=obj$domain[1] & x<=obj$domain[2]
        if(!old && isTRUE(input$point_labels) && sum(valid)<=30)
          draw_point_labels(x[valid]+shift,yy[valid],color)
      } else if(obj$kind=="uniform") {
        # 明確畫出邊界跳躍，避免把均勻分配畫成斜邊。
        lines(c(xr[1],obj$a,obj$a,obj$b,obj$b,xr[2]),c(0,0,1/(obj$b-obj$a),1/(obj$b-obj$a),0,0),col=color,lwd=3,lty=if(old) 2 else 1)
      } else lines(x,yy,col=color,lwd=3,lty=if(old) 2 else 1)
    }
    if(isTRUE(input$marks)) {
      abline(v=z$m,col="#c23c50",lwd=2,lty=2)
      if(z$v>0) abline(v=z$m+c(-1,1)*sqrt(z$v),col="#748397",lty=3,lwd=2)
    }
    if(!is.null(r)) draw(r,"#bb6b26",TRUE)
    draw(z,"#147da0")
    labs<-"目前參數";cols<-"#147da0";types<-1
    if(!is.null(r)){labs<-c(labs,"保留參數");cols<-c(cols,"#bb6b26");types<-c(types,2)}
    if(isTRUE(input$marks)){labs<-c(labs,"目前 μ","目前 μ±σ");cols<-c(cols,"#c23c50","#748397");types<-c(types,2,3)}
    legend("topright",legend=labs,col=cols,lty=types,lwd=1.5,bty="n",cex=.62,seg.len=1.5,x.intersp=.6,y.intersp=.85,inset=.015)
    if(z$discrete && !is.null(r)) mtext("比較時兩組機率棒略為左右錯開；實際取值仍為整數。",side=3,line=.25,cex=.65)
  },res=110)
}

# 5. 啟動 Shiny。Source 或 Run App 即可開啟互動介面。
shinyApp(ui,server)
