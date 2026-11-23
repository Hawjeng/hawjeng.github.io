# 中介與調節效果分析

邱皓政高階統計互動教材，依《量化研究法（二）：統計原理與分析技術》2021 二版增修版第 16、17 章與作者提供的範例資料整理。書籍來源：https://hawjeng.github.io/books/quantitative-ii-2021.html

## 開啟教材

正式頁面：https://hawjeng.github.io/mediation-moderation-lab/

解壓完整教材後，直接開啟 index.html；互動頁面不需要外部 JavaScript 套件。數值來自實際原始資料的 OLS 估計及 5,000 次個案拔靴；調整滑桿時以已估計係數、共變數及 t 臨界值計算條件斜率和信賴區間，網頁不在背景啟動四套軟體。

## 四種策略的執行

請先將工作目錄設為解壓後的教材根目錄（內含 data、syntax、results）。

- R：`Rscript syntax/analysis.R`。核心分析只使用 base R；程式註解另附 interactions 與 lavaan 延伸。
- Python：先 `pip install numpy pandas scipy statsmodels`，再 `python syntax/analysis.py`。
- SPSS：設定工作目錄後，逐段執行 `syntax/analysis.sps`。將 `C:/macros/process51.sps` 改成從 Hayes 官方網站下載的本機巨集位置。PROCESS 模型 1、4、59 已用 5.1 版實際執行；舊的 `vars=` 語法不適用，故未使用。巨集程式未納入本教材。
- Mplus：建議將教材解壓至純英文路徑，以教材根目錄為目前工作目錄，執行 `mplus syntax/moderation.inp`、`mplus syntax/mediation.inp`、`mplus syntax/conditional.inp`；或在編輯器內開啟並依工作目錄調整 DATA FILE 路徑。三個輸入檔分開執行，請勿把頁面顯示的三段語法當成單一輸入檔。

## 原始資料與變數對照

- ch16b：x=D，w=X，y=Y，n=40。
- ex16a：x=X1，w=X2，y=Y，n=350。
- ex16b：x=Z，w=X，y=Y，n=20。
- ch16d：x=X1，w=X2，y=Y，n=25。此為 y=30−5xw 的確定性資料，殘差為 0，不進行顯著性解讀。原 R 檔的 math/agg/att 欄名未與提供的 CSV 對應，新版使用實際欄名。
- salary：由 Ch17a.sav 選取原 X、Z、Y、M，依序改名 x、m、y、w；n=474，無缺失，未刪離群值或標準化。教育為年，起薪／薪資為萬元，w=0 女性、1 男性。

原始資料包另保留全部提供的第 16 章 R/SPSS/CSV/SAV 檔及第 17 章 XLSX/SAV 檔。Word 原章節未公開散布。

## 數值核對

2026-11-23 以 R 4.5.3、Python 3.12、SPSS Statistics 32／PROCESS 5.1、Mplus 9.1 實際試跑。輸出檔在 results/，Mplus 輸出在 syntax/*.out。

- 簡單中介：a=0.172753，b=1.672631，c′=0.102039，ab=0.288952，c=0.390991。
- Model 59：IE(0)=0.100737，IE(1)=0.306307，差=0.205570。
- Ch16b 一般 OLS 95% J–N 邊界為 56.1654、59.7219，與 SPSS PROCESS 輸出一致。
- Python 百分位數拔靴 95% CI：ab [0.246197,0.335203]；兩組間接效果差 [0.141046,0.275984]。種子 20261123，5,000 次，同一批重抽個案用於所有方程式。

R、Python、PROCESS、Mplus 使用不同亂數產生器，拔靴上下界不會逐位數相同。Mplus 使用預設 ML 與 z 推論；一般 OLS 使用殘差自由度的 t 推論。網頁與新版語法採百分位數區間，原書部分表格採偏誤校正區間，不應混為同一種 CI。

Mplus 的二元 Model 59 使用兩群組迴歸，放開兩組斜率及截距，限制殘差變異相等以對照 pooled OLS；組內拔靴固定各組樣本數。此範例用於係數與間接效果比較，不以全模型適配度宣稱理論得到證實。

本教材屬觀察變數線性模型示範；間接效果不是因果識別的替代。a、b 皆被調節時 IE(w) 為二次函數，本例用二元組間差，未誤稱為通用線性調節中介指標。

## 參考與權利

- 原理：作者提供之第 16、17 章，與上述書籍頁。
- https://www.afhayes.com/download.html
- https://www.afhayes.com/faq.html
- https://interactions.jacob-long.com/reference/johnson_neyman.html
- https://lavaan.ugent.be/tutorial/mediation.html
- https://www.statmodel.com/HTML_UG/chapter17V8.htm

原始書籍、資料及附圖權利屬原權利人。PROCESS 請從官方下載，不重新散布其程式。
