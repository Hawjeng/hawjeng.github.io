潛在類別分析｜課堂下載說明

同一個資料夾保留語法及對應的 .dat 檔。每列是一個反應組型，
前 3 或 6 欄為 Y 指標，最後一欄是該組型人數，無標題列。
0／1 是二元反應，-9 是缺失。估計使用各組型的個案數作頻數權重。

一、病患模擬例
  patient-patterns.dat 為授課資料 patient1000.csv 的三題組型頻數。
  1000 筆模擬資料、8 個組型。各軟體可用同一資料比較概似。
  三類模型的 11 個自由參數超過 8 個完整組型可提供的 7 個自由度。
  此例可觀察到相同對數概似對應不同參數與 entropy。請勿將三類
  參數視為可唯一辨識的實質群體。

二、六題模擬練習
  tcs-demo-patterns.dat 是獨立產生的六題模擬資料，樣本數 1857。
  可練習五類模型與不同類數，結果會和 TCS 課堂研究例不同。

三、Mplus
  開啟 patient.inp 或 tcs-demo.inp，在 Mplus 執行。
  欲比較不同類數，另存輸入檔並修改 CLASSES = c(類數)。
  FREQWEIGHT 指定人數欄。TECH8 可檢查估計及最佳概似是否重現。
  Mplus 的編號可能和 R、Python 不同。比較類別剖面及比例時，
  請先配對類別。病患三類例應以整體概似重現為準。

四、R
  使用 base R，不需安裝套件。在終端機執行：
    Rscript lca.R patient 3
    Rscript lca.R tcs-demo 5
  第三個引數可指定隨機起始值組數，預設 24。

五、Python
  使用 Python 3 標準函式庫，不需安裝套件。執行：
    python lca.py patient 3
    python lca.py tcs-demo 5
  可用 --starts 增加起始值組數，用 --iterations 增加迭代上限。
  R 和 Python 都以 EM 估計、保留最佳對數概似，並列印類別比例、
  P(Y=1 | 類別)、AIC、BIC、樣本數調整 BIC 與標準化 entropy。
  固定種子便於重跑。收斂仍可能停在局部最佳解。

六、用獲准的 TCS 課堂資料重現
  如已獲准使用課堂的 TCS_mplus.csv，可在本機執行：
    python prepare-tcs.py TCS_mplus.csv
  將產生 tcs-patterns.dat。來源欄序為 ID、Y1–Y6、其餘 8 欄，
  共 15 欄且無標題列。程式只讀 Y1–Y6，排除六題皆缺失者，
  保留部分缺失。授課版本共 2016 筆，1857 筆納入、159 筆排除。
  產出放在程式同一資料夾後，可執行 tcs.inp，或執行：
    Rscript lca.R tcs 5
    python lca.py tcs 5
  教材的原始 TCS 五類 Mplus 輸出，最佳對數概似約 -5992.090。
  TCS 原始個案與原始組型頻數請依資料提供方的使用條件管理。
  資料使用條件：
  https://srda.sinica.edu.tw/file/b529c126-da90-4e74-a151-7c03d2489938
