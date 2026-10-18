# 統計互動教材

- `source/Stat_distribution.R`：機率分配原始 R 程式。
- `source/Central_Limit_Theorem.R`：抽樣與估計原始 R 程式。
- `apps/`：供 Shinylive 匯出的應用程式；機率分配附執行所需教材圖及匿名範例資料。

網站：

- [機率分配](https://hawjeng.github.io/teaching/probability-distributions/)
- [抽樣與估計](https://hawjeng.github.io/teaching/central-limit-theorem/)

GitHub Pages 使用 Shinylive/webR 在讀者瀏覽器中執行 R。首次開啟需下載執行環境；實際載入及計算速度取決於網路與裝置。程式及所附資料會下載到瀏覽器，請勿在此加入密碼、部署憑證或未去識別的研究資料。

原始版本保留於 `source/`；瀏覽器相容性調整僅套用於 `apps/`。更新時先同步兩處程式，再執行下列流程。

中文圖形使用 `fonts/NotoSansCJKtc-Regular.otf`，來源為 [Noto CJK 官方專案](https://github.com/notofonts/noto-cjk)，依 SIL Open Font License 1.1 散布，授權文字見 `fonts/OFL.txt`。應用程式啟動時將同站字型放入 webR 的使用者字型目錄，避免圖內中文字顯示成方框。

```sh
python scripts/build.py --out _site
Rscript scripts/export-shinylive.R
python scripts/verify.py --site _site
```

R 套件需求：`shinylive`。匯出會下載官方 Shinylive 資源與所需的 WebAssembly 套件。
