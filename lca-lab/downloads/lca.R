# Fit locally independent binary latent class models with base R.
# Rscript lca.R patient 3
# Rscript lca.R tcs-demo 5

read_patterns <- function(path) {
  data <- as.matrix(read.table(path, header = FALSE))
  counts <- data[, ncol(data)]
  responses <- data[, -ncol(data), drop = FALSE]
  stopifnot(all(responses %in% c(-9, 0, 1)), all(counts > 0), all(counts == floor(counts)))
  observed <- 1 * (responses != -9)
  keep <- rowSums(observed) > 0
  stopifnot(any(keep))
  list(yes = 1 * (responses[keep, , drop = FALSE] == 1),
       observed = observed[keep, , drop = FALSE], counts = counts[keep])
}

expectation <- function(patterns, share, probability) {
  yes <- patterns$yes
  no <- patterns$observed - yes
  log_mass <- sweep(yes %*% t(log(probability)) + no %*% t(log1p(-probability)),
                    2, log(share), "+")
  peak <- apply(log_mass, 1, max)
  mass <- exp(log_mass - peak)
  total <- rowSums(mass)
  list(ll = sum(patterns$counts * (peak + log(total))), posterior = mass / total)
}

fit_lca <- function(patterns, classes, starts = 24, iterations = 5000) {
  n <- sum(patterns$counts)
  items <- ncol(patterns$yes)
  eps <- 1e-10
  best <- NULL
  set.seed(1234)
  for (start in seq_len(starts)) {
    share <- rep(1 / classes, classes)
    probability <- matrix(runif(classes * items, .1, .9), nrow = classes)
    previous <- -Inf
    for (iteration in seq_len(iterations)) {
      current <- expectation(patterns, share, probability)
      if (abs(current$ll - previous) < 1e-7) break
      previous <- current$ll
      weighted <- current$posterior * patterns$counts
      share <- pmax(colSums(weighted) / n, eps)
      share <- share / sum(share)
      totals <- crossprod(weighted, patterns$observed)
      successes <- crossprod(weighted, patterns$yes)
      update <- totals > 0
      probability[update] <- pmin(1 - eps, pmax(eps, successes[update] / totals[update]))
    }
    current <- expectation(patterns, share, probability)
    if (is.null(best) || current$ll > best$ll) {
      best <- c(current, list(share = share, probability = probability,
                              converged = abs(current$ll - previous) < 1e-7))
    }
  }
  best
}

args <- commandArgs(trailingOnly = TRUE)
if (length(args) < 1 || length(args) > 3 || !args[1] %in% c("patient", "tcs-demo", "tcs")) {
  stop("Usage: Rscript lca.R patient|tcs-demo|tcs [classes] [starts]")
}
classes <- if (length(args) >= 2) as.numeric(args[2]) else if (args[1] == "patient") 3 else 5
starts <- if (length(args) == 3) as.numeric(args[3]) else 24
stopifnot(all(is.finite(c(classes, starts))), all(c(classes, starts) >= 1),
          all(c(classes, starts) == floor(c(classes, starts))))
file_arg <- grep("^--file=", commandArgs(), value = TRUE)
folder <- if (length(file_arg)) dirname(sub("^--file=", "", file_arg[1])) else "."
patterns <- read_patterns(file.path(folder, paste0(args[1], "-patterns.dat")))
fit <- fit_lca(patterns, classes, starts)
n <- sum(patterns$counts)
items <- ncol(patterns$yes)
p <- classes * items + classes - 1
cat("N=", n, " K=", classes, " parameters=", p, " converged=", fit$converged, "\n", sep = "")
print(c(LL = fit$ll, AIC = -2 * fit$ll + 2 * p, BIC = -2 * fit$ll + log(n) * p,
        saBIC = -2 * fit$ll + log((n + 2) / 24) * p))
if (classes > 1) {
  h <- -sum(patterns$counts * rowSums(fit$posterior * log(pmax(fit$posterior, 1e-300))))
  print(c(Entropy = 1 - h / (n * log(classes))))
}
if (p > 2^items - 1) {
  cat("Identification warning: free parameters exceed observed response-table degrees of freedom.\n")
}
table <- cbind(Share = fit$share, fit$probability)
colnames(table) <- c("Share", paste0("Y", seq_len(items)))
print(round(table[order(fit$share, decreasing = TRUE), , drop = FALSE], 4))
