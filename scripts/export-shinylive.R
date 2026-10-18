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
