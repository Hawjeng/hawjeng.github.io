"use strict";

const mean = values => values.reduce((sum, x) => sum + x, 0) / values.length;
const dot = (a, b) => a.reduce((sum, v, i) => sum + v * b[i], 0);
const norm = values => Math.sqrt(dot(values, values));

// Orthogonalize the columns before projecting onto the regression space.
function leastSquares(rows, values) {
  const width = rows[0].length;
  const basis = [];
  const upper = Array.from({length: width}, () => Array(width).fill(0));
  for (let column = 0; column < width; column++) {
    let vector = rows.map(row => row[column]);
    const reference = norm(vector);
    for (let pass = 0; pass < 2; pass++) {
      for (let j = 0; j < column; j++) {
        const weight = dot(vector, basis[j]);
        upper[j][column] += weight;
        vector = vector.map((v, i) => v - weight * basis[j][i]);
      }
    }
    const length = norm(vector);
    if (length <= 1e-10 * Math.max(1, reference)) return null;
    upper[column][column] = length;
    basis.push(vector.map(v => v / length));
  }
  const projected = basis.map(vec => dot(vec, values));
  const coefficients = Array(width).fill(0);
  for (let i = width - 1; i >= 0; i--) {
    coefficients[i] = (projected[i] - dot(upper[i], coefficients)) / upper[i][i];
  }
  const predict = row => dot(row, coefficients);
  const fitted = rows.map(predict);
  const residuals = values.map((y, i) => y - fitted[i]);
  const sse = dot(residuals, residuals);
  return {predict, fitted, residuals, sse};
}

function polynomialRow(x, degree, center, scale) {
  return Array.from({length: degree + 1}, (_, i) => ((x - center) / scale) ** i);
}

function fitTrend(points, type) {
  const isExp = type === "exp";
  const degree = type === "quadratic" ? 2 : 1;
  const values = points.map(p => p[1]);
  if (isExp && values.some(y => y <= 0)) return null;
  const getRow = x => polynomialRow(x, degree, 2013, 7);
  const model = leastSquares(points.map(p => getRow(p[0])), isExp ? values.map(Math.log) : values);
  const predict = x => isExp ? Math.exp(model.predict(getRow(x))) : model.predict(getRow(x));
  const residuals = points.map(([x, y]) => y - predict(x));
  const sse = dot(residuals, residuals);
  const center = mean(values);
  const sst = values.reduce((sum, y) => sum + (y - center) ** 2, 0);
  return {predict, r2: sst ? 1 - sse / sst : NaN, rmse: Math.sqrt(sse / points.length)};
}

function fitDiagnostic(points, type) {
  const lagged = type === "ar";
  const selected = lagged ? points.slice(1) : points;
  const center = mean(points.map(p => p[0]));
  const scale = (points.at(-1)[0] - points[0][0]) / 2;
  const rows = selected.map(([x], i) => {
    const row = polynomialRow(x, lagged ? 1 : Number(type), center, scale);
    if (lagged) row.push(points[i][1]);
    return row;
  });
  const model = leastSquares(rows, selected.map(p => p[1]));
  const {residuals, sse} = model;
  const dw = residuals.slice(1).reduce((total, e, i) => total + (e - residuals[i]) ** 2, 0) / sse;
  const r1 = dot(residuals.slice(1), residuals) / sse;
  return {...model, times: selected.map(p => p[0]), rows, n: rows.length, k: rows[0].length - 1, dw, r1, lagged};
}

function bgTest(model, q) {
  const {residuals, rows, n, k, sse} = model;
  const df2 = n - k - 1 - q;
  if (df2 <= 0 || sse <= 1e-20) return null;
  const auxiliary = rows.map((row, i) => [...row,
    ...Array.from({length: q}, (_, j) => residuals[i - j - 1] ?? 0)]);
  const fit = leastSquares(auxiliary, residuals);
  if (!fit) return null;
  const r2 = Math.max(0, Math.min(1, 1 - fit.sse / sse));
  return {r2, lm: n * r2, f: ((sse - fit.sse) / q) / (fit.sse / df2), df2};
}

function logGamma(x) {
  const coefficients = [
    676.5203681218851, -1259.1392167224028, 771.3234287776531, -176.6150291621406,
    12.507343278686905, -.13857109526572012, 9.984369578019572e-6, 1.5056327351493116e-7
  ];
  const z = x - 1;
  const sum = coefficients.reduce((s, c, i) => s + c / (z + i + 1), .9999999999998099);
  const t = z + 7.5;
  return .5 * Math.log(2 * Math.PI) + (z + .5) * Math.log(t) - t + Math.log(sum);
}

function chiTail(value, df) {
  if (value <= 0) return 1;
  const x = value / 2;
  if (df === 1) {
    const z = Math.sqrt(x);
    const t = 1 / (1 + .3275911 * z);
    const factor = (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t
      - .284496736) * t + .254829592) * t;
    return factor * Math.exp(-x);
  }
  if (df === 2) return Math.exp(-x);
  if (df === 3) return chiTail(value, 1) + 2 * Math.sqrt(x / Math.PI) * Math.exp(-x);
  return (1 + x) * Math.exp(-x); // The lab allows q = 1,…,4.
}

function betaFraction(a, b, x) {
  const guard = n => Math.abs(n) < 1e-30 ? 1e-30 : n;
  let c = 1;
  let d = 1 / guard(1 - (a + b) * x / (a + 1));
  let h = d;
  for (let i = 1; i <= 200; i++) {
    const twice = 2 * i;
    let step = i * (b - i) * x / ((a + twice - 1) * (a + twice));
    d = 1 / guard(1 + step * d);
    c = guard(1 + step / c);
    h *= d * c;
    step = -(a + i) * (a + b + i) * x / ((a + twice) * (a + twice + 1));
    d = 1 / guard(1 + step * d);
    c = guard(1 + step / c);
    const change = d * c;
    h *= change;
    if (Math.abs(change - 1) < 1e-13) break;
  }
  return h;
}

function betaCdf(x, a, b) {
  if (x <= 0 || x >= 1) return x <= 0 ? 0 : 1;
  const front = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b)
    + a * Math.log(x) + b * Math.log1p(-x));
  return x < (a + 1) / (a + b + 2)
    ? front * betaFraction(a, b, x) / a
    : 1 - front * betaFraction(b, a, 1 - x) / b;
}

function fTail(value, df1, df2) {
  if (value <= 0) return 1;
  return betaCdf(df2 / (df2 + df1 * value), df2 / 2, df1 / 2);
}

function criticalValue(tail, alpha) {
  let lo = 0;
  let hi = 1;
  while (tail(hi) > alpha) hi *= 2;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (tail(mid) > alpha) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

if (typeof module !== "undefined") {
  module.exports = {fitTrend, fitDiagnostic, bgTest, chiTail, fTail, criticalValue};
}
