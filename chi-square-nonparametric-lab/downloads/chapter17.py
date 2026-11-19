"""Run: python chapter17.py CASE. Dependencies: numpy, scipy."""
import argparse
import csv
from pathlib import Path
import numpy as np
from scipy import stats


def load(case):
    with Path(__file__).with_name("chapter17.csv").open(encoding="utf-8-sig", newline="") as source:
        rows = [r for r in csv.DictReader(source) if r["case"] == case]
    if not rows:
        raise ValueError(f"Unknown case: {case}")
    data = np.full((max(int(r["row"]) for r in rows), max(int(r["column"]) for r in rows)), np.nan)
    for r in rows:
        if r["value"]:
            data[int(r["row"])-1, int(r["column"])-1] = float(r["value"])
    weights = [float(r["probability"]) for r in rows if r["row"] == "1" and r["probability"]]
    return rows[0]["method"], data, weights, np.array([r["column_label"] for r in rows if r["row"] == "1"])


def sign(d):
    n = np.count_nonzero(d)
    plus = np.count_nonzero(d > 0)
    z = max(0, abs(plus - n/2) - .5) / (np.sqrt(n)/2)
    zg = (plus - n/2 - .5) / (np.sqrt(n)/2)
    return dict(n=n, plus=plus, minus=n-plus, zeros=len(d)-n,
                p_two=stats.binomtest(int(plus), n).pvalue,
                p_greater=stats.binomtest(int(plus), n, alternative="greater").pvalue,
                normal_two=2*stats.norm.sf(z), normal_greater=stats.norm.sf(zg))


def analyze(case):
    method, data, weights, columns = load(case)
    if method == "gof":
        expected = np.sum(data)*np.array(weights)
        stat,p = stats.chisquare(data[0], expected)
        return dict(n=data.sum(), chi2=stat, df=data.shape[1]-1, p=p, min_expected=min(expected))
    if method in ("ind", "hom"):
        stat,p,df,e = stats.chi2_contingency(data, correction=False)
        return dict(n=data.sum(), chi2=stat, df=df, p=p, min_expected=e.min(),
                    cramer_v=np.sqrt(stat/(data.sum()*min(np.array(data.shape)-1))))
    if method == "sign":
        return sign(data[0])
    if method == "paired":
        d = data[1]-data[0]
        out = sign(d)
        d = d[d != 0]
        ranks = stats.rankdata(abs(d))
        result = stats.wilcoxon(d, method="asymptotic", correction=False)
        return dict(**out, rank_plus=ranks[d > 0].sum(), rank_minus=ranks[d < 0].sum(),
                    wilcoxon_t=result.statistic, p_signed_rank=result.pvalue)
    if method == "kendall":
        n,m = data.shape
        rank_sums = stats.rankdata(data, axis=0).sum(axis=1)
        tie = sum(sum(c**3-c for c in np.unique(col, return_counts=True)[1]) for col in data.T)
        w = 12*sum((rank_sums-rank_sums.mean())**2)/(m*m*(n**3-n)-m*tie)
        chi = m*(n-1)*w
        return dict(n=n, judges=m, tie_sum=tie, kendall_w=w, chi2=chi, df=n-1, p=stats.chi2.sf(chi,n-1))
    groups = ([np.repeat(columns.astype(float),r.astype(int)) for r in data] if method == "frequency"
              else [r[np.isfinite(r)] for r in data])
    h,ph = stats.kruskal(*groups)
    out = dict(n=sum(map(len,groups)), h=h, df=len(groups)-1, p_kruskal=ph)
    if len(groups) == 2:
        x,y = groups
        u,p = stats.mannwhitneyu(x,y,method="asymptotic",use_continuity=False)
        out.update(rank_sum=u+len(x)*(len(x)+1)/2, u1=u, u2=len(x)*len(y)-u, p_rank_sum=p)
    return out


if __name__ == "__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("case", nargs="?", default="brand_gender")
    result = analyze(parser.parse_args().case)
    for name, value in result.items():
        print(f"{name:16s} = {value:.9g}")
