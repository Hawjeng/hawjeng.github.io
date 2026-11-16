# Build both browser-based teaching apps with shared Shinylive assets.
options(repos = c(CRAN = "https://cloud.r-project.org"))
if (!requireNamespace("shinylive", quietly = TRUE)) {
  stop("Install the shinylive package before running this script.")
}
dir.create("_site/teaching/source", recursive = TRUE, showWarnings = FALSE)
file.copy(list.files("teaching/source", full.names = TRUE), "_site/teaching/source", overwrite = TRUE)
dir.create("_site/teaching/fonts", recursive = TRUE, showWarnings = FALSE)
file.copy(list.files("teaching/fonts", full.names = TRUE), "_site/teaching/fonts", overwrite = TRUE)
for (app in c("probability-distributions", "central-limit-theorem")) {
  shinylive::export(file.path("teaching/apps", app), "_site/teaching", subdir = app)
  index <- file.path("_site/teaching", app, "index.html")
  html <- paste(readLines(index, warn = FALSE), collapse = "\n")
  title <- if (app == "probability-distributions") "機率分配" else "抽樣與估計"
  html <- sub('lang="en"', 'lang="zh-Hant"', html, fixed = TRUE)
  html <- sub("<title>Shiny App</title>", paste0("<title>", title, "｜邱皓政統計互動教材</title>"), html, fixed = TRUE)
  writeLines(enc2utf8(html), index, useBytes = TRUE)
}
cat("Exported probability distributions and sampling/estimation apps.\n")

# The regression app is published at its own top-level URL.
regression <- "correlation-regression-lab"
output <- file.path("_site", regression)
shinylive::export(file.path("teaching/apps", regression), output,
                  template_params = list(title = "相關與迴歸｜邱皓政統計互動教材"))
index <- file.path(output, "index.html")
html <- paste(readLines(index, encoding = "UTF-8", warn = FALSE), collapse = "\n")
version <- substr(Sys.getenv("GITHUB_SHA"), 1, 12)
if (nzchar(version)) {
  loader_path <- file.path(output, "shinylive", "shinylive.js")
  loader <- rawToChar(readBin(loader_path, "raw", n = file.info(loader_path)$size))
  Encoding(loader) <- "UTF-8"
  loader <- sub('fetch("./app.json")', paste0('fetch("./app.json?v=', version,
    '", {cache: "no-store"})'), loader, fixed = TRUE)
  writeLines(enc2utf8(loader), loader_path, useBytes = TRUE)
  html <- sub('"./shinylive/shinylive.js"', paste0('"./shinylive/shinylive.js?v=', version, '"'), html, fixed = TRUE)
  html <- sub("</head>", paste0('<meta name="app-build" content="', version, '"/></head>'), html, fixed = TRUE)
}
html <- sub('lang="en"', 'lang="zh-Hant"', html, fixed = TRUE)
writeLines(enc2utf8(html), index, useBytes = TRUE)
