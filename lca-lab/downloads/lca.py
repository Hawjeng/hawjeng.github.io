"""Fit locally independent binary latent class models using grouped counts."""

import argparse
import math
import random
from pathlib import Path


def read_patterns(name):
    path = Path(__file__).with_name(f"{name}-patterns.dat")
    patterns = []
    width = None
    for line in path.read_text(encoding="ascii").splitlines():
        *values, count = map(int, line.split())
        width = len(values) if width is None else width
        if len(values) != width or count < 1 or any(x not in (-9, 0, 1) for x in values):
            raise ValueError("Expected binary indicators, -9 for missing, and a positive count.")
        observed = [(j, x) for j, x in enumerate(values) if x != -9]
        if observed:
            patterns.append((observed, count))
    if not patterns:
        raise ValueError("No patterns with observed responses.")
    return patterns, width


def expectation(patterns, shares, probabilities):
    log_share = [math.log(x) for x in shares]
    log_prob = [[(math.log1p(-p), math.log(p)) for p in row] for row in probabilities]
    ll, posterior = 0.0, []
    for observed, count in patterns:
        log_terms = [
            base + sum(item[j][value] for j, value in observed)
            for base, item in zip(log_share, log_prob)
        ]
        peak = max(log_terms)
        masses = [math.exp(x - peak) for x in log_terms]
        total = sum(masses)
        ll += count * (peak + math.log(total))
        posterior.append([mass / total for mass in masses])
    return ll, posterior


def fit(patterns, width, classes, starts, iterations):
    rng = random.Random(1234)
    n = sum(count for _, count in patterns)
    epsilon = 1e-10
    best = None
    for _ in range(starts):
        shares = [1 / classes] * classes
        probabilities = [[rng.uniform(.1, .9) for _ in range(width)] for _ in shares]
        prior_ll = -math.inf
        for _ in range(iterations):
            ll, posterior = expectation(patterns, shares, probabilities)
            if abs(ll - prior_ll) < 1e-7:
                break
            prior_ll = ll
            class_sizes = [0.0] * classes
            totals = [[0.0] * width for _ in shares]
            successes = [[0.0] * width for _ in shares]
            for (observed, count), memberships in zip(patterns, posterior):
                for k, membership in enumerate(memberships):
                    weight = count * membership
                    class_sizes[k] += weight
                    for j, value in observed:
                        totals[k][j] += weight
                        successes[k][j] += weight * value
            adjusted = [max(epsilon, size / n) for size in class_sizes]
            shares = [share / sum(adjusted) for share in adjusted]
            for k in range(classes):
                for j in range(width):
                    if totals[k][j]:
                        probabilities[k][j] = min(
                            1 - epsilon, max(epsilon, successes[k][j] / totals[k][j])
                        )
        else:
            ll, posterior = expectation(patterns, shares, probabilities)
        converged = abs(ll - prior_ll) < 1e-7
        if best is None or ll > best[0]:
            best = ll, shares, probabilities, posterior, converged
    return best


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("example", choices=("patient", "tcs-demo", "tcs"))
    parser.add_argument("classes", type=int, nargs="?")
    parser.add_argument("--starts", type=int, default=24)
    parser.add_argument("--iterations", type=int, default=5000)
    args = parser.parse_args()
    classes = args.classes if args.classes is not None else (3 if args.example == "patient" else 5)
    if min(classes, args.starts, args.iterations) < 1:
        parser.error("Classes, starts, and iterations must be positive.")
    patterns, width = read_patterns(args.example)
    n = sum(count for _, count in patterns)
    ll, shares, probabilities, posterior, converged = fit(
        patterns, width, classes, args.starts, args.iterations
    )
    npar = classes * width + classes - 1
    h = -sum(
        count * p * math.log(p)
        for (_, count), membership in zip(patterns, posterior)
        for p in membership
        if p > 0
    )
    print(f"N={n}  K={classes}  parameters={npar}  converged={converged}")
    print(f"LL={ll:.4f}  AIC={-2*ll + 2*npar:.4f}  BIC={-2*ll + npar*math.log(n):.4f}")
    print(f"saBIC={-2*ll + npar*math.log((n+2)/24):.4f}")
    if classes > 1:
        print(f"Entropy={1 - h / (n * math.log(classes)):.4f}")
    if npar > 2**width - 1:
        print("Identification warning: free parameters exceed observed response-table degrees of freedom.")
    print("Class  Share   " + "     ".join(f"Y{i+1}" for i in range(width)))
    order = sorted(range(classes), key=lambda k: -shares[k])
    for i, k in enumerate(order, 1):
        print(f"{i:>5}  {shares[k]:.4f}  " + "  ".join(f"{p:.4f}" for p in probabilities[k]))


if __name__ == "__main__":
    main()
