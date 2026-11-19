"use strict";

const $ = id => document.getElementById(id);
const val = id => $(id).value;
const checked = id => $(id).checked;
const set = (id, html) => { $(id).innerHTML = html; };
const fixed = (value, digits = 2) => Number.isFinite(value) ? value.toFixed(digits) : "—";
const signed = (value, digits = 2) => (value > 0 ? "+" : "") + fixed(value, digits);
const escapeText = value => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const C = {teal: "#087b76", orange: "#ba5927", blue: "#4b60a7", grey: "#546b7b", ink: "#172b43"};
const metric = (name, value) => '<div class="metric"><span>' + name + '</span><strong>' + value + '</strong></div>';
const legend = entries => '<div class="legend">' + entries.map(([name, color]) =>
  '<span><i style="--key:' + color + '"></i>' + escapeText(name) + '</span>').join("") + '</div>';
const options = values => values.map(v => '<option>' + v + '</option>').join("");

function chart(id, config) {
  const {x: xDomain, y: yDomain, title, xLabel, yLabel} = config;
  const width = $(id).clientWidth < 520 ? 520 : 740;
  const height = config.compact ? 218 : 342;
  const left = 59, right = width - 19, top = 24, bottom = height - 45;
  const x = n => left + (n - xDomain[0]) / (xDomain[1] - xDomain[0]) * (right - left);
  const y = n => bottom - (n - yDomain[0]) / (yDomain[1] - yDomain[0]) * (bottom - top);
  const text = (a, b, label, extra = "") =>
    '<text x="' + a + '" y="' + b + '" font-size="15" ' + extra + '>' + escapeText(label) + '</text>';
  const ln = (a, b, c, d, color, extra = "") =>
    '<line x1="' + a + '" y1="' + b + '" x2="' + c + '" y2="' + d + '" stroke="' + color + '" ' + extra + '/>';
  const line = (pairs, color, dashed = false) => {
    let last = false;
    const path = pairs.map(([a, b]) => {
      if (b === null || !Number.isFinite(b)) { last = false; return ""; }
      const command = (last ? "L" : "M") + x(a).toFixed(2) + "," + y(b).toFixed(2);
      last = true;
      return command;
    }).join(" ");
    return '<path d="' + path + '" fill="none" stroke="' + color + '" stroke-width="2.7" '
      + (dashed ? 'stroke-dasharray="6 5" opacity=".60"' : "") + '/>';
  };
  const horizontal = (n, color = "#d9e5eb", extra = "") => ln(left, y(n), right, y(n), color, extra);
  const vertical = (n, color = "#d9e5eb", extra = "") => ln(x(n), top, x(n), bottom, color, extra);
  const rect = (x0, x1, y0, y1, fill) => '<rect x="' + x(x0) + '" y="' + y(y1) + '" width="'
    + (x(x1) - x(x0)) + '" height="' + (y(y0) - y(y1)) + '" fill="' + fill + '" opacity=".10"/>';
  const point = (a, b, color, r, extra = "", label = "") =>
    '<circle cx="' + x(a) + '" cy="' + y(b) + '" r="' + r + '" fill="' + color
    + '" stroke="white" stroke-width="1.3" ' + extra + '>'
    + (label ? '<title>' + escapeText(label) + '</title>' : '') + '</circle>';
  const ticks = Array.from({length: 5}, (_, i) => yDomain[0] + (yDomain[1] - yDomain[0]) * i / 4);
  const grid = ticks.map(n => horizontal(n) + text(left - 8, y(n) + 5,
    Math.abs(n) >= 10 || Number.isInteger(n) ? fixed(n, 0) : fixed(n, 1),
    'class="minor" text-anchor="end"')).join("");
  const axes = ln(left, bottom, right, bottom, "#a4b7c3") + ln(left, top, left, bottom, "#a4b7c3")
    + config.ticks.map(([n, label]) => ln(x(n), bottom, x(n), bottom + 5, "#a4b7c3")
      + text(x(n), bottom + 21, label, 'class="minor" text-anchor="middle"')).join("")
    + text(right, height - 3, xLabel, 'class="minor" text-anchor="end"')
    + text(left, top - 9, yLabel, 'class="minor"');
  const api = {x, y, text, ln, line, horizontal, vertical, rect, point, left, right, top, bottom};
  set(id, '<svg class="chart" viewBox="0 0 ' + width + ' ' + height + '" role="'
    + (config.touch ? "group" : "img") + '" aria-label="' + escapeText(title) + '">'
    + (config.background?.(api) ?? "") + grid + axes + config.draw(api)
    + '</svg>' + (config.legend ? legend(config.legend) : ""));
  return {...api, yDomain};
}

function numericTicks(values, count = 6, heading = v => v) {
  const step = Math.max(1, Math.round((values.length - 1) / (count - 1)));
  return values.flatMap((v, i) =>
    (i % step === 0 && values.length - i > step / 2) || i === values.length - 1 ? [[v, heading(v)]] : []);
}

function renderPopulation() {
  const mode = document.querySelector('[name="pop-view"]:checked').value;
  const year = Number(val("pop-year"));
  const rows = DATA.population;
  const current = rows.find(row => row[0] === year);
  const data = {
    rates: {series: [[1, "粗出生率", C.teal], [2, "粗死亡率", C.orange]], y: [0, 28], unit: "每千人（‰）"},
    net: {series: [[4, "自然增加率", C.teal]], y: [-8, 24], unit: "每千人（‰）"},
    total: {series: [[3, "人口數", C.blue]], y: [14, 26], unit: "百萬人"}
  }[mode];
  const value = (row, i) => i === 4 ? row[1] - row[2] : row[i];
  chart("population-chart", {
    title: "臺灣人口年度趨勢圖", x: [1974, 2025], y: data.y, xLabel: "西元年", yLabel: data.unit,
    ticks: [1974, 1985, 1995, 2005, 2015, 2025].map(n => [n, n]),
    legend: data.series.map(([, name, color]) => [name, color]),
    draw: g => (mode === "net" ? g.horizontal(0, C.grey, 'stroke-dasharray="5 4"') : "")
      + g.vertical(2020, "#809ba5", 'stroke-dasharray="4 5"')
      + (year === 2020 ? "" : g.vertical(year, C.ink, 'stroke-dasharray="4 4"'))
      + data.series.map(([i, name, color]) => g.line(rows.map(row => [row[0], value(row, i)]), color)
        + g.point(year, value(current, i), color, 5, "", name + " " + fixed(value(current, i)))).join("")
      + g.text(g.x(2020) - 5, g.top + 14, "2020", 'text-anchor="end"')
  });
  $("pop-year-value").textContent = year;
  set("population-values", metric("粗出生率", fixed(current[1]) + "‰") + metric("粗死亡率", fixed(current[2]) + "‰")
    + metric("自然增加率", signed(value(current, 4)) + "‰") + metric("人口數", fixed(current[3], 3) + " 百萬"));
}

function centered(values, width) {
  const half = Math.floor(width / 2);
  return values.map((_, i) => i >= half && i < values.length - half ? mean(values.slice(i - half, i + half + 1)) : null);
}

function renderSmooth() {
  const mode = val("smooth-method");
  $("window-control").hidden = mode !== "ma";
  $("weight-control").hidden = mode !== "exp";
  let series, x, ticks, y, yearLabel;
  if (mode === "season") {
    const values = DATA.season.flatMap(row => row[1]);
    x = values.map((_, i) => i);
    const average = values.map((_, i) => i >= 2 && i < values.length - 2
      ? (values[i - 2] + 2 * values[i - 1] + 2 * values[i] + 2 * values[i + 1] + values[i + 2]) / 8 : null);
    const factors = Array.from({length: 4}, (_, q) => mean(values.flatMap((v, i) =>
      i % 4 === q && average[i] !== null ? [v / average[i]] : [])));
    const normalized = factors.map(factor => factor / mean(factors));
    series = [[values, "原始銷售", C.grey], [average, "中心化四季移動平均", C.blue],
      [values.map((v, i) => v / normalized[i % 4]), "去季節銷售", C.teal]];
    ticks = DATA.season.map(([year], i) => [i * 4, year + "Q1"]);
    y = [4, 18];
    yearLabel = "年／季";
    $("smooth-note").textContent = "先用原始值 ÷ 中心化四季移動平均，再按季平均並標準化，得到季節指數。將原值除以指數，即得去季節值。"
      + normalized.map((v, i) => " Q" + (i + 1) + " " + fixed(v, 3)).join(" · ");
  } else {
    const values = DATA.smoothing.map(row => row[1]);
    x = DATA.smoothing.map(row => row[0]);
    const alpha = Number(val("smooth-alpha"));
    const width = Number(val("ma-window"));
    let filtered;
    if (mode === "ma") {
      filtered = centered(values, width);
      $("smooth-note").textContent = "以當期及左右各 " + Math.floor(width / 2) + " 期平均，兩端資料不足的期間留空。視窗越長，短期起伏越小。";
    } else {
      filtered = [values[0]];
      for (let i = 1; i < values.length; i++) filtered.push(alpha * values[i] + (1 - alpha) * filtered[i - 1]);
      $("smooth-alpha-value").textContent = fixed(alpha);
      $("smooth-note").textContent = "S₁ = Y₁，Sₜ = αYₜ + (1 − α)Sₜ₋₁。圖以同一期的 Sₜ 顯示平滑值，預測下一期則使用當期 Sₜ。α 越大，曲線越快回應新資料。";
    }
    series = [[values, "原始銷售", C.grey], [filtered, mode === "ma" ? width + " 年中心化移動平均" : "指數平滑", C.teal]];
    ticks = numericTicks(x);
    y = [0, 24];
    yearLabel = "西元年";
  }
  chart("smooth-chart", {
    title: "原始資料與平滑或去季節後的資料", x: [x[0], x.at(-1)], y, xLabel: yearLabel, yLabel: "銷售量",
    ticks, legend: series.map(([, name, color]) => [name, color]),
    draw: g => series.map(([values, , color]) => g.line(x.map((n, i) => [n, values[i]]), color)).join("")
  });
}

const trendTypes = [["linear", "線性", C.grey], ["quadratic", "二次", C.teal], ["exp", "指數", C.blue]];
const baseline = Object.fromEntries(trendTypes.map(([key]) => [key, fitTrend(DATA.sales, key)]));
const changes = new Map();
const quadColors = [C.teal, "#a65727", "#7355a2", "#397045", C.grey];
const quadDefaults = ["Ⅰ 晚期・高值", "Ⅱ 早期・高值", "Ⅲ 早期・低值", "Ⅳ 晚期・低值"];
const median = values => {
  const sorted = [...values].sort((a, b) => a - b);
  return (sorted[Math.floor((sorted.length - 1) / 2)] + sorted[Math.floor(sorted.length / 2)]) / 2;
};
let trendGeometry;
let drag = null;

function renderTrend() {
  const year = Number(val("trend-year"));
  const impact = changes.get(year) ?? 0;
  $("impact").value = impact;
  $("impact-value").textContent = year + " 年 " + fixed(DATA.sales.find(row => row[0] === year)[1] + impact)
    + "（變動 " + signed(impact) + "）";
  const points = DATA.sales.map(([x, y]) => [x, y + (changes.get(x) ?? 0)]);
  const fits = Object.fromEntries(trendTypes.map(([key]) => [key, fitTrend(points, key)]));
  const on = trendTypes.filter(([key]) => checked("line-" + key));
  const of = val("quadrants");
  const labels = checked("quad-labels");
  const shade = checked("quad-shade");
  $("custom-cut").hidden = of !== "custom";
  const dataset = of === "original" ? DATA.sales : points;
  const aggregate = of === "median" ? median : mean;
  const [cx, cy] = of === "custom"
    ? [clamp($("cut-x").valueAsNumber || 2013, 2006.1, 2019.9),
      clamp(Number.isFinite($("cut-y").valueAsNumber) ? $("cut-y").valueAsNumber : 50, -200, 400)]
    : [aggregate(dataset.map(p => p[0])), aggregate(dataset.map(p => p[1]))];
  const names = quadDefaults.map((name, i) => val("quad-name-" + i).trim() || name);
  const quadrant = (x, y) => x === cx || Math.abs(y - cy) < 1e-9 ? 4
    : y > cy ? (x > cx ? 0 : 1) : (x < cx ? 2 : 3);
  const tally = [0, 0, 0, 0, 0];
  points.forEach(p => tally[quadrant(...p)]++);
  const visible = on.filter(([key]) => fits[key]);
  const years = Array.from({length: 81}, (_, i) => 2006 + i * 14 / 80);
  const yValues = points.map(p => p[1]);
  if (of !== "off") yValues.push(cy);
  for (const [key] of visible) yValues.push(...years.map(x => fits[key].predict(x)));
  if (checked("show-baseline")) {
    for (const [key] of on) yValues.push(...years.map(x => baseline[key].predict(x)));
  }
  const computed = [Math.floor((Math.min(-12, ...yValues) - 5) / 40) * 40,
    Math.ceil((Math.max(180, ...yValues) + 5) / 40) * 40];
  const [y0, y1] = drag?.domain ?? computed;
  const show = of !== "off";
  const graphLegend = visible.map(([, name, color]) => [name, color]);
  if (checked("show-baseline")) graphLegend.push(["虛線為原始擬合", C.grey]);
  graphLegend.push(["目前選取的觀察點", C.orange]);
  trendGeometry = chart("trend-chart", {
    title: "電子產品銷售散佈圖，可選取觀察點並拖曳調整", x: [2006, 2020], y: [y0, y1],
    xLabel: "西元年", yLabel: "銷售金額", ticks: numericTicks(DATA.sales.map(p => p[0])),
    touch: true, legend: graphLegend,
    background: g => show && shade ? g.rect(cx, 2020, cy, y1, quadColors[0])
      + g.rect(2006, cx, cy, y1, quadColors[1]) + g.rect(2006, cx, y0, cy, quadColors[2])
      + g.rect(cx, 2020, y0, cy, quadColors[3]) : "",
    draw: g => (show ? g.horizontal(cy, "#607c8a", 'stroke-dasharray="4 4"')
      + g.vertical(cx, "#607c8a", 'stroke-dasharray="4 4"') : "")
      + (show && labels ? g.text(clamp((g.x(cx) + g.right) / 2, g.left, g.right), g.top + 17, "Ⅰ", 'text-anchor="middle"')
        + g.text((g.left + g.x(cx)) / 2, g.top + 17, "Ⅱ", 'text-anchor="middle"')
        + g.text((g.left + g.x(cx)) / 2, g.bottom - 8, "Ⅲ", 'text-anchor="middle"')
        + g.text((g.x(cx) + g.right) / 2, g.bottom - 8, "Ⅳ", 'text-anchor="middle"') : "")
      + (checked("show-baseline") ? on.map(([key, , color]) => g.line(years.map(x => [x, baseline[key].predict(x)]), color, true)).join("") : "")
      + visible.map(([key, , color]) => g.line(years.map(x => [x, fits[key].predict(x)]), color)).join("")
      + points.map(([x, y]) => g.point(x, y, x === year ? C.orange : (show && shade ? quadColors[quadrant(x, y)] : C.ink),
        x === year ? 7 : 5, 'data-index="' + x + '" tabindex="0" role="button" aria-label="' + x + ' 年 ' + fixed(y) + '"',
        x + " 年 " + fixed(y))).join("")
  });
  set("quadrant-counts", show && labels ? names.map((name, i) => '<span><i style="--key:' + quadColors[i] + '"></i>'
    + escapeText(name) + ' ' + tally[i] + ' 點</span>').join("") + '<span>分界線上 ' + tally[4] + ' 點</span>' : "");
  set("trend-stats", trendTypes.map(([key, name]) => {
    const fit = fits[key];
    if (!fit) return '<tr><th scope="row">' + name + '</th><td colspan="4">需所有銷售值大於 0</td></tr>';
    return '<tr><th scope="row">' + name + '</th><td>' + fixed(fit.r2, 3) + '</td><td>' + fixed(fit.rmse)
      + '</td><td>' + fixed(fit.predict(2021)) + '</td><td>' + signed(fit.predict(2021) - baseline[key].predict(2021))
      + '</td></tr>';
  }).join(""));
}

function moveImpact(year, change) {
  const value = clamp(Math.round(change * 4) / 4, -200, 200);
  if (value === 0) changes.delete(year);
  else changes.set(year, value);
  renderTrend();
}

const diagnosticModels = {
  diagnostic: DATA.diagnostic,
  ...Object.fromEntries(Object.entries({positive: [.85, 1], weak: [0, 1], negative: [-.84, 1], lag2: [.89, 2]})
    .map(([name, [phi, lag]]) => {
      let state = 1648;
      const errors = [];
      const rows = [];
      for (let i = 0; i < 70; i++) {
        state = (Math.imul(1664525, state) + 1013904223) >>> 0;
        const innovation = (state / 4294967296 - .5) * 5;
        errors.push(phi * (errors[i - lag] ?? 0) + innovation);
        if (i >= 20) rows.push([i - 19, 5 + .13 * (i - 19) + errors[i]]);
      }
      return [name, rows];
    }))
};
let diag;
function renderDiagnostics() {
  diag = fitDiagnostic(diagnosticModels[val("diag-data")], val("diag-model"));
  const times = diag.times;
  const radius = Math.ceil(Math.max(...diag.residuals.map(Math.abs)) / 2) * 2;
  chart("residuals", {
    title: "依時間排列的迴歸殘差", x: [times[0], times.at(-1)], y: [-radius, radius],
    xLabel: "期數 t", yLabel: "殘差 eₜ", ticks: numericTicks(times), compact: true,
    draw: g => g.horizontal(0, "#6f8897") + g.line(times.map((t, i) => [t, diag.residuals[i]]), "#688496")
      + times.map((t, i) => {
        const e = diag.residuals[i];
        const color = e >= 0 ? C.teal : C.orange;
        return g.ln(g.x(t), g.y(0), g.x(t), g.y(e), color, 'stroke-width="2" opacity=".65"')
          + g.point(t, e, color, 4.5, "", "第 " + t + " 期，殘差 " + fixed(e));
      }).join("")
  });
  set("diag-summary", metric("有效樣本 n", diag.n) + metric("解釋變數 k", diag.k)
    + metric("一階殘差自我相關 r₁", fixed(diag.r1, 3)));
  selectDWModel();
  renderBG();
}

function numberScale({max, bands, marker, marks, title}) {
  const px = n => 21 + 478 * clamp(n / max, 0, 1);
  const texts = marks.map(([n, label]) => '<text x="' + px(n) + '" y="55" font-size="15" text-anchor="middle">'
    + escapeText(label) + '</text>').join("");
  const bars = bands.map(([start, end, color]) => '<rect x="' + px(start) + '" y="15" width="'
    + Math.max(0, px(end) - px(start)) + '" height="23" fill="' + color + '"/>').join("");
  return '<svg class="chart" viewBox="0 0 520 61" role="img" aria-label="' + escapeText(title) + '">'
    + bars + '<line x1="' + px(marker) + '" x2="' + px(marker) + '" y1="8" y2="43" stroke="#172b43" stroke-width="3"/>'
    + texts + '</svg>';
}

function selectDWModel() {
  $("dw-n").value = diag.n;
  $("dw-k").value = diag.k;
  renderDW();
}

function renderDW() {
  const alpha = val("dw-alpha");
  const side = val("dw-side");
  const table = DATA.dw[alpha];
  const bounds = table[diag.n]?.[diag.k];
  const d = diag.dw;
  if (diag.lagged || !bounds || !Number.isFinite(d)) {
    const reason = diag.lagged ? "模型含落後依變數，傳統 DW 界限檢定不適用。請看 BG 結果。" : "附錄 H 未列目前樣本與模型的臨界值。";
    set("dw-result", "<strong>d = " + fixed(d, 3) + "</strong><small>" + reason + "</small>");
    set("dw-scale", "");
  } else {
    const [lo, hi] = bounds;
    const statistic = side === "negative" ? 4 - d : d;
    const verb = statistic < lo ? "拒絕 H₀" : statistic > hi ? "不拒絕 H₀" : "界限內，無法判定";
    const direction = side === "positive" ? "正向" : "負向";
    const conclusion = statistic < lo ? "有顯著" + direction + "一階殘差相關。"
      : statistic > hi ? "未達顯著" + direction + "一階殘差相關。" : "依上下界無法決定是否拒絕 H₀。";
    set("dw-result", "<strong>d = " + fixed(d, 3) + "　" + verb + "</strong><small>"
      + (side === "negative" ? "4 − d = " + fixed(statistic, 3) + "。 " : "") + conclusion
      + " n = " + diag.n + "，k = " + diag.k + "，d<sub>L</sub> = " + fixed(lo, 3)
      + "，d<sub>U</sub> = " + fixed(hi, 3) + "</small>");
    set("dw-scale", numberScale({max: 4, bands: [[0, lo, "#f1b99c"], [lo, hi, "#f6e4a9"], [hi, 4, "#bde3de"]],
      marker: statistic, marks: [[0, "0"], [lo, "dL"], [hi, "dU"], [4, "4"]],
      title: "比較值 " + fixed(statistic, 3) + "，分區依序為拒絕、無法判定與不拒絕"}));
  }
  const n = Number(val("dw-n"));
  const k = Number(val("dw-k"));
  const row = table[n] ?? {};
  set("dw-table", '<table><caption>附錄 H　n = ' + n + '，單尾 α = ' + alpha
    + '</caption><thead><tr><th scope="col">k</th><th scope="col">dL</th><th scope="col">dU</th></tr></thead><tbody>'
    + Object.keys(table[200]).map(key => '<tr' + (Number(key) === k ? ' class="selected"' : "")
      + '><th scope="row">' + key + '</th><td>' + fixed(row[key]?.[0], 3) + '</td><td>'
      + fixed(row[key]?.[1], 3) + '</td></tr>').join("") + '</tbody></table>');
}

function renderBG() {
  const q = Number(val("bg-order"));
  const useF = val("bg-type") === "f";
  const alpha = Number(val("bg-alpha"));
  const test = bgTest(diag, q);
  if (!test) {
    set("bg-result", "輔助迴歸無法估計。");
    set("bg-scale", "");
    set("bg-table", "");
    $("bg-code").textContent = "";
    return;
  }
  const tail = useF ? v => fTail(v, q, test.df2) : v => chiTail(v, q);
  const cutoff = criticalValue(tail, alpha);
  const value = useF ? test.f : test.lm;
  const p = clamp(tail(value), 0, 1);
  set("bg-result", "<strong>" + (useF ? "F" : "LM") + " = " + fixed(value, 3) + "　"
    + (p <= alpha ? "拒絕 H₀" : "不拒絕 H₀") + "</strong><small>p "
    + (p < .0001 ? "&lt; .0001" : "= " + fixed(p, 4)) + "，臨界值 " + fixed(cutoff, 3)
    + "，R²<sub>aux</sub> = " + fixed(test.r2, 3) + "，n<sub>aux</sub> = " + diag.n + "</small>");
  const max = Math.max(cutoff, value, 1) * 1.14;
  set("bg-scale", numberScale({max, bands: [[0, cutoff, "#bde3de"], [cutoff, max, "#f1b99c"]],
    marker: value, marks: [[0, "0"], [cutoff, fixed(cutoff, 2)]],
    title: "BG 觀察值與右尾拒絕域，臨界值 " + fixed(cutoff, 3)}));
  const alphas = [.10, .05, .01];
  set("bg-table", '<table><caption>' + (useF ? '右尾 F 分配臨界值' : '右尾 χ² 分配臨界值')
    + '</caption><thead><tr><th scope="col">' + (useF ? 'df₁, df₂' : 'df') + '</th>'
    + alphas.map(a => '<th scope="col">α = ' + fixed(a) + '</th>').join("") + '</tr></thead><tbody>'
    + [1, 2, 3, 4].map(order => {
      const df2 = diag.n - diag.k - 1 - order;
      const distribution = useF ? v => fTail(v, order, df2) : v => chiTail(v, order);
      return '<tr' + (order === q ? ' class="selected"' : '') + '><th scope="row">' + order
        + (useF ? ", " + df2 : "") + '</th>' + alphas.map(a => '<td'
          + (order === q && a === alpha ? ' class="selected"' : "") + '>'
          + fixed(criticalValue(distribution, a), 3) + '</td>').join("") + '</tr>';
    }).join("") + '</tbody></table>');
  $("bg-code").textContent = 'lmtest::bgtest(model, order = ' + q + ', type = "' + (useF ? "F" : "Chisq") + '", fill = 0)';
}

function observe(ids, handler, event = "input") {
  ids.forEach(id => $(id).addEventListener(event, handler));
}
document.querySelectorAll('[name="pop-view"]').forEach(input => input.addEventListener("change", renderPopulation));
$("pop-year").addEventListener("input", renderPopulation);
document.querySelectorAll("[data-year]").forEach(button => button.addEventListener("click", () => {
  $("pop-year").value = button.dataset.year;
  renderPopulation();
}));
observe(["smooth-method", "ma-window", "smooth-alpha"], renderSmooth);
set("trend-year", options(DATA.sales.map(p => p[0])));
$("trend-year").value = "2020";
set("quad-names", quadDefaults.map((label, i) => '<label>' + label[0] + '<input id="quad-name-' + i
  + '" type="text" maxlength="28" value="' + label + '" aria-label="第 ' + (i + 1) + ' 象限名稱"></label>').join(""));
observe(["trend-year", "line-linear", "line-quadratic", "line-exp", "show-baseline", "quadrants",
  "cut-x", "cut-y", "quad-labels", "quad-shade", ...quadDefaults.map((_, i) => "quad-name-" + i)], renderTrend);
$("impact").addEventListener("input", () => moveImpact(Number(val("trend-year")), Number(val("impact"))));
$("reset-impact").addEventListener("click", () => { changes.clear(); renderTrend(); });
const graph = $("trend-chart");
graph.addEventListener("pointerdown", event => {
  const point = event.target.closest("[data-index]");
  if (!point || event.button !== 0) return;
  const year = Number(point.dataset.index);
  $("trend-year").value = year;
  drag = {id: event.pointerId, year, domain: trendGeometry.yDomain, start: event.clientY, moved: false};
  graph.setPointerCapture(event.pointerId);
  renderTrend();
});
graph.addEventListener("pointermove", event => {
  if (!drag || drag.id !== event.pointerId) return;
  if (!drag.moved && Math.abs(event.clientY - drag.start) < 3) return;
  drag.moved = true;
  const svg = graph.querySelector("svg");
  const local = svg.createSVGPoint();
  local.x = event.clientX;
  local.y = event.clientY;
  const p = local.matrixTransform(svg.getScreenCTM().inverse());
  const {top, bottom} = trendGeometry;
  const [lo, hi] = drag.domain;
  const y = lo + clamp((bottom - p.y) / (bottom - top), 0, 1) * (hi - lo);
  moveImpact(drag.year, y - DATA.sales.find(row => row[0] === drag.year)[1]);
});
function stopDrag(event) {
  if (!drag || drag.id !== event.pointerId) return;
  drag = null;
  renderTrend();
}
["pointerup", "pointercancel", "lostpointercapture"].forEach(type => graph.addEventListener(type, stopDrag));
graph.addEventListener("keydown", event => {
  const point = event.target.closest("[data-index]");
  if (!point || !["Enter", " ", "ArrowUp", "ArrowDown"].includes(event.key)) return;
  event.preventDefault();
  const year = Number(point.dataset.index);
  $("trend-year").value = year;
  if (event.key.startsWith("Arrow")) moveImpact(year, (changes.get(year) ?? 0) + (event.key === "ArrowUp" ? 1 : -1));
  else renderTrend();
  graph.querySelector('[data-index="' + year + '"]').focus({preventScroll: true});
});
set("dw-n", options(Object.keys(DATA.dw[".05"])));
set("dw-k", options(Object.keys(DATA.dw[".05"][200])));
observe(["diag-data", "diag-model"], renderDiagnostics);
observe(["dw-alpha", "dw-side", "dw-n", "dw-k"], renderDW);
observe(["bg-order", "bg-type", "bg-alpha"], renderBG);
$("dw-use-model").addEventListener("click", selectDWModel);

function markSection() {
  const active = location.hash || "#intro";
  document.querySelectorAll("nav a").forEach(a => {
    if (a.hash === active) a.setAttribute("aria-current", "location");
    else a.removeAttribute("aria-current");
  });
}
function drawAll() {
  renderPopulation();
  renderSmooth();
  renderTrend();
  renderDiagnostics();
}
window.addEventListener("hashchange", markSection);
let pendingResize;
window.addEventListener("resize", () => {
  cancelAnimationFrame(pendingResize);
  pendingResize = requestAnimationFrame(() => {
    renderPopulation(); renderSmooth(); renderTrend(); renderDiagnosticsChartOnResize();
  });
});
function renderDiagnosticsChartOnResize() {
  const lookup = [val("dw-n"), val("dw-k")];
  renderDiagnostics();
  [$("dw-n").value, $("dw-k").value] = lookup;
  renderDW();
}
markSection();
drawAll();
