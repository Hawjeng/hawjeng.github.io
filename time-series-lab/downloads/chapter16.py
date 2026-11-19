"""Run: python chapter16.py CASE  (requires numpy and scipy)."""
import argparse
import csv
from pathlib import Path
import numpy as np
from scipy.stats import chi2, f


def load(case):
    with Path(__file__).with_name("chapter16.csv").open(encoding="utf8", newline="") as source:
        rows = [r for r in csv.DictReader(source) if r["case"] == case]
    if not rows:
        raise ValueError(f"Unknown case: {case}")
    return np.array([float(r["t"]) for r in rows]), [r["period"] for r in rows], np.array([float(r["y"]) for r in rows])


def fit(x, y):
    beta = np.linalg.lstsq(x, y, rcond=None)[0]
    e = y - x @ beta
    rss = e @ e
    r2 = 1 - rss / np.sum((y-y.mean())**2)
    dw = np.sum(np.diff(e)**2) / rss
    return beta, e, r2, dw


def design(t, degree):
    return np.column_stack([t**d for d in range(degree+1)])


def moving(y, weights):
    out = np.full(len(y), np.nan)
    half = len(weights)//2
    out[half:-half] = np.convolve(y, np.asarray(weights)[::-1], mode="valid")
    return out


def ses(y, alpha):
    # Column t is the one-step forecast made using observations through t-1.
    forecast = [np.nan, y[0]]
    for value in y[1:]:
        forecast.append(alpha*value + (1-alpha)*forecast[-1])
    return np.array(forecast)


def seasonal(y):
    cma = moving(y, [1/8, 2/8, 2/8, 2/8, 1/8])
    specific = y / cma
    raw = np.array([np.nanmean(specific[q::4]) for q in range(4)])
    indices = raw/raw.mean()
    adjusted = y / np.resize(indices, len(y))
    return cma, specific, indices, adjusted


def bg(x, e, q):
    lag = np.column_stack([np.r_[np.zeros(j), e[:-j]] for j in range(1,q+1)])
    _, aux, _, _ = fit(np.column_stack([x,lag]), e)
    restricted, full = e @ e, aux @ aux
    lm = len(e) * (1-full/restricted)
    df2 = len(e) - x.shape[1] - q
    stat = ((restricted-full)/q)/(full/df2)
    return lm, chi2.sf(lm,q), stat, f.sf(stat,q,df2)


def number(x):
    return "—" if np.isnan(x) else f"{x:.3f}"


def print_rows(labels, *columns):
    for label, row in zip(labels, zip(*columns)):
        print(f"{label:<8}", " ".join(f"{number(x):>9}" for x in row))


def trend(t, y, kind):
    degree = 2 if kind == "quadratic" else 1
    transformed = np.log(y) if kind == "exponential" else y
    x = design(t, degree)
    beta, _, r2, dw = fit(x, transformed)
    predicted = design(np.array([t[-1]+1]), degree) @ beta
    if kind == "exponential":
        predicted = np.exp(predicted)
    print(f"{kind:<12} beta = {', '.join(f'{b:.5f}' for b in beta)}")
    print(f"             R2 = {r2:.4f}   DW = {dw:.4f}   next = {predicted[0]:.4f}")
    return beta, r2, dw, predicted[0]


def analyze(case):
    t, labels, y = load(case)
    if case == "population":
        idx = np.flatnonzero(y < 0)[0]
        print_rows([labels[i] for i in [idx-1, idx, len(y)-1]], y[[idx-1, idx, len(y)-1]])
    if case in ("ma","exercise1"):
        a, b = ses(y,.2), ses(y,.5)
        third, fifth = moving(y,[1/3]*3), moving(y,[1/5]*5)
        if case == "ma":
            weighted = moving(y,[.2,.3,.5])
            print("Period       Observed       MA3       MA5      WMA3    SES.20    SES.50")
            print_rows(labels,y,third,fifth,weighted,a[:-1],b[:-1])
        else:
            print("Period       Observed       MA3       MA5    SES.20    SES.50")
            print_rows(labels,y,third,fifth,a[:-1],b[:-1])
            print("2014 forecast: MA3, MA5, SES.20, SES.50")
            print_rows(["2014"], [y[-3:].mean()], [y[-5:].mean()], [a[-1]], [b[-1]])
            trend(t,y,"linear")
            trend(t,y,"quadratic")
    if case in ("season","exercise2"):
        cma,specific,indices,adj = seasonal(y)
        print("Seasonal index Q1–Q4:", " ".join(number(x) for x in indices))
        print("Period       Observed      CMA4     Ratio     Adjusted")
        print_rows(labels,y,cma,specific,adj)
    if case in ("trend","revenue"):
        for kind in ["linear","quadratic","exponential"]:
            trend(t,y,kind)
    if case == "residual":
        x = design(t,1)
        _,e,r2,dw = fit(x,y)
        lm,p,f_stat,pf = bg(x,e,1)
        print(f"n={len(y)}, k=1   R2={r2:.4f}   DW={dw:.6f}")
        print(f"BG(1) LM={lm:.6f}   p={p:.8g}   F={f_stat:.6f}   p(F)={pf:.8g}")
        print("DW upper/lower bounds at alpha=.05: dL=1.201, dU=1.411")
    if case == "revenue":
        for p in (1,2,3):
            lags = [y[p-j:len(y)-j] for j in range(1,p+1)]
            x = np.column_stack([np.ones(len(y)-p), *lags])
            beta, e, r2, _ = fit(x,y[p:])
            prediction = np.r_[1,y[-p:][::-1]] @ beta
            lm, prob, _, _ = bg(x,e,1)
            print(f"AR({p})  n={len(e)}  R2={r2:.4f}  next={prediction:.4f}  BG(1)={lm:.4f}  p={prob:.6f}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("case", nargs="?", default="residual",
                        choices=["population","ma","season","trend","residual","revenue","exercise1","exercise2"])
    analyze(parser.parse_args().case)
