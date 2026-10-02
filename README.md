# 邱皓政｜學術個人網站

以專書、研究與學經歷為主的繁體中文學術網站。採亮色日系配色、緊湊的內容版面與漸進式揭露。首頁參考 Wenyu Chiou 網站「專業定位 → 具體成果 → 研究背景 → 聯繫」的資訊順序，內容與視覺重新設計。

網站已包含 12 本書目與原文序言（含校閱作品）、10 篇精選期刊研究、學經歷、9 組專書配套資料連結，以及可新增的公開專案區。

正式網站：[https://hawjeng.github.io/](https://hawjeng.github.io/)；來源 repository：[Hawjeng/hawjeng.github.io](https://github.com/Hawjeng/hawjeng.github.io)。GitHub Pages 已使用 GitHub Actions 發布，HTTPS 已開啟，[首次部署工作流](https://github.com/Hawjeng/hawjeng.github.io/actions/runs/36966136424)成功完成。

## 先看網頁

可直接瀏覽[正式網站](https://hawjeng.github.io/)。若要本機瀏覽，解壓縮後開啟 `index.html`；圖片、樣式、程式與序言都在檔案內，不需安裝套件。外部出版社與論文連結需要網路。

本機預覽也可在這個資料夾執行：

```sh
python -m http.server 8765
```

再開啟 `http://localhost:8765`。

## 在其他 repository 部署

目前的 [Hawjeng/hawjeng.github.io](https://github.com/Hawjeng/hawjeng.github.io) 已完成部署；只有另外建立網站副本時，才需要以下設定。

1. 在 GitHub 建立公開 repository。若希望網址是 `https://hawjeng.github.io/`，repository 名稱使用小寫的 `hawjeng.github.io`；若使用其他名稱，網址會多一段 repository 名稱。
2. 上傳**這個資料夾裡的檔案與資料夾**至 repository 根目錄。保留 `.github/workflows/pages.yml`，不要把整包再包進第二層資料夾。
3. 預設分支使用 `main`。進入 **Settings → Pages → Build and deployment → Source**，選擇 **GitHub Actions**。
4. 到 **Actions → Publish academic website → Run workflow**，或推送一次變更。成功後，Pages 設定頁會顯示正式網址。

部署工作流會使用 Python 標準庫生成 `_site`、核對連結，再發布。GitHub Actions 會自動帶入正式網址，產生 canonical、sitemap 與正確的 404 頁連結。使用一般 repository 路徑也能部署，不需改網站內連結。

可參閱 [GitHub 官方 Pages 工作流說明](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。

## 日後如何更新

所有內容集中在 `data/`。在 GitHub 修改 JSON 並 commit，工作流就會重建與發布；不需要手動編輯 19 個 HTML。

| 檔案 | 用途 |
| --- | --- |
| `data/site.json` | 個人簡介、聯絡資料、GitHub 與正式網址 |
| `data/books.json` | 書目、版次、出版年、出版社、書封與序言 |
| `data/profile.json` | 學經歷、論文、講座與資料來源 |
| `data/resources.json` | 專書配套資料下載 |
| `data/projects.json` | 未來公開的 GitHub 與研究專案 |
| `assets/style.css` | 配色與版面 |

本機修改後執行：

```sh
python scripts/build.py
python scripts/verify.py
```

### 新增一個 GitHub 專案

在目前為空陣列的 `data/projects.json` 加入實際內容，例如以下格式。請把範例值換成自己的真實專案；尚未公開的專案不要填入虛構網址。

```json
[
  {
    "title": "實際專案名稱",
    "description": "專案回答的研究問題、資料與分析方法。",
    "url": "https://github.com/實際帳號/實際專案",
    "status": "公開專案",
    "tags": ["R", "縱貫分析"]
  }
]
```

重建後，教學與專案頁會自動以專案卡片替換目前的整理中狀態。

### 新增一本書

複製 `data/books.json` 的一筆書目，修改 `id`（使用小寫英數字與連字號）、書名、版次、出版年、ISBN、出版社與來源。把真實封面放在 `assets/images/`，`cover` 填檔名。`preface.paragraphs` 一段一個字串；有多篇序言時可使用 `prefaces` 陣列。依版本出版年排序，`latestPrinting` 只放重印資訊。

生成器會為每本書建立獨立閱讀頁；缺少原文序言時會中止，避免發布無序言的書籍頁。若只找到舊版序，請保留明確的版本標題與 `note`。

## 內容與圖片

內容核對於 2026-10-02。學經歷以本人 2026-09-15 修訂履歷與師大官方頁為主；論文依原出版資訊、DOI 核對。專書以原網站與出版社核對。

2021《量化研究法（二）》使用原站公開的 2019「第二版序」，閱讀頁已明示。2026《量化研究與統計分析》資訊是第六版重印，未列為 2026 新版。較舊書籍找不到仍有效的出版社商品頁時，改連本人原書籍頁，並標「書籍原頁」。

照片、書封與序言為作者原網站／出版社提供的既有素材；素材來源記錄在 `data/image-sources.json`。這些素材及著作文字的權利仍屬原權利人，沒有宣稱開放授權。

## GitHub 個人首頁與照片

GitHub 個人首頁 README 已提交至 [Hawjeng/Hawjeng](https://github.com/Hawjeng/Hawjeng)，遠端內容與本機檔案逐位元組比對一致；交付包中另附 `github-profile/README.md`。它是給訪客看的個人介紹，與此網站維護說明分開；專書序言及配套資料連結指向新站。

使用者已取消更換 GitHub 頭貼，頭貼未修改。`github-avatar-original.jpg` 另附作為原站演講照片素材，未改造人像。

## 發布後核對

正式站 19 個 HTML、首頁 10 個圖片／CSS／JavaScript 等資源均可存取；canonical 指向正式網址；全部 12 本書的 106 段原文序言與來源資料一致；404 頁可正確回首頁。

桌面 1280 × 900 首頁與書籍資訊展開已檢查；手機 375 像素寬度未出現橫向溢位，選單展開及點選專書後收起已通過。手機瀏覽器連線中斷，後續截圖、專書搜尋與序言展開操作未完成。

