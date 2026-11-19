"use strict";

const chapterExamples = {
  population: {
    title: "圖 16.1｜臺灣少子化",
    method: "以粗出生率減粗死亡率計算每千人的自然增加率。依年度尋找由正轉負的第一期，再比較 2019、2020、2025 年。",
    reading: "2020 年首次轉負。序列的先後順序讓我們定位交會，並觀察交會後的差距是否持續擴大。",
    demo: "#population"
  },
  ma: {
    title: "表 16.1、16.3、16.4｜豪宅銷售",
    method: "以觀察期左右的資料計算三年、五年中心化移動平均。加權三年平均按從舊到新的順序給 .2、.3、.5。指數平滑輸出則將 α=.20、.50 的一期前預測列在目標年。",
    reading: "2002 年三年平均為 4，加權平均為 4.4。較長視窗壓低短期起伏。指數平滑的 α 越大，預測越快回應新觀測。",
    demo: "#smooth"
  },
  season: {
    title: "圖 16.5｜化妝品季度銷售",
    method: "先算中心化四季移動平均。原值除以移動平均得到特定季節指數，再依季度求平均，除以四季平均完成標準化。",
    reading: "第 4 季的指數約 1.468，第 2 季約 0.616。原值除以所屬季度的指數即可比較去季節後的銷售量。",
    demo: "#smooth"
  },
  trend: {
    title: "表 16.9｜電子產品銷售",
    method: "令 t=1 代表 2006 年，分別對 Y 配適線性與二次模型，對 ln(Y) 配適線性模型並將預測轉回原尺度。",
    reading: "輸出中的指數模型 R² 和 DW 在對數尺度計算。互動圖的 R² 在原尺度計算，可直接比較各曲線擬合原始觀測的程度。",
    demo: "#trend"
  },
  residual: {
    title: "表 16.10｜相鄰期殘差",
    method: "對 20 期資料擬合線性趨勢，計算殘差的 DW，再用原解釋變數和一期落後殘差計算 BG。",
    reading: "DW 約 0.188，低於 dL=1.201。BG(1) 的 LM 約 16.492，超過自由度 1 的卡方臨界值 3.841。兩種檢定都指出殘差仍有時間相依性。",
    demo: "#dw"
  },
  revenue: {
    title: "範例 16.1｜公司營收與自我迴歸",
    method: "使用 2000–2018 年營收預測 2019 年。依序配適線性、二次、指數及 AR(1) 至 AR(3)，後三種以先前一期至三期營收作為解釋變數。",
    reading: "以未四捨五入的係數估計，AR(2) 預測約 30.90，樣本內 R² 約 .894。各 AR 模型可用的樣本起點不同，應以共同樣本或樣本外誤差比較預測表現。含落後依變數時改看 BG。指數模型的課本手算值使用先行四捨五入的係數，程式保留完整精度。"
  }
};
const exampleLabels = {
  population:"圖 16.1 臺灣少子化", ma:"豪宅銷售與平滑法", season:"化妝品銷售與去季節化",
  trend:"電子產品銷售與趨勢", residual:"表 16.10 DW 與 BG", revenue:"範例 16.1 營收與 AR",
  exercise1:"習作 16.1 人員增加率", exercise2:"習作 16.2 季度銷售"
};

function renderExample() {
  const key = val("example-case");
  const item = chapterExamples[key];
  set("example-result", '<h3>' + item.title + '</h3><p>' + item.method + '</p><p class="note">' + item.reading
    + '</p><div class="toolbar example-actions">'
    + (item.demo ? '<a href="' + item.demo + '">開啟互動示範</a>' : '')
    + '<a href="#syntax" id="example-to-code">查看 R 與 Python 語法</a></div>'
    + '<details open><summary>逐期計算與分析結果</summary><pre class="example-output" tabindex="0"></pre></details>');
  $("example-result").querySelector("pre").textContent = LESSON_DATA.results[key].R;
  $("example-to-code").addEventListener("click", () => {
    $("run-case").value = key;
    renderSyntax();
  });
}

function renderSyntax() {
  const key = val("run-case");
  const language = val("run-language");
  $("run-command").textContent = (language === "R" ? "Rscript chapter16.R " : "python chapter16.py ") + key;
  $("run-output").textContent = LESSON_DATA.results[key][language];
  $("run-source").textContent = LESSON_DATA.source[language];
}

function lessonTable(headers, rows, digits = 3) {
  return '<table><thead><tr>' + headers.map(h => '<th scope="col">' + h + '</th>').join("")
    + '</tr></thead><tbody>' + rows.map(([period, ...cells]) => '<tr><th scope="row">' + period + '</th>'
      + cells.map(v => '<td>' + (v === null ? "—" : typeof v === "number" ? fixed(v, digits) : escapeText(v))
        + '</td>').join("") + '</tr>').join("") + '</tbody></table>';
}
const {one, two, indices} = LESSON_DATA.exercise;
set("exercise-one-data", lessonTable(["年度","人員增加率"], one.map(row => row.slice(0,2)), 2));
const quarterly = Array.from({length:7}, (_, i) => [2007+i,...two.slice(4*i,4*i+4).map(row => row[1])]);
set("exercise-two-data", lessonTable(["年度","第 1 季","第 2 季","第 3 季","第 4 季"], quarterly, 0));

set("exercise-one-answer",
  '<ol><li>五年移動平均使用較長的視窗，短期起伏較小。兩端無足夠觀測的年度留空。</li>'
  + '<li>α=.50 對新資料的權重較大，曲線波動比 α=.20 明顯。表中指數平滑值是使用前一期以前的資料對該年作出的預測。</li>'
  + '<li>令 t=1 代表 2004 年。線性 Ŷ = 0.94733 + 0.03339t（R²=.511）。二次 Ŷ = 1.16900 − 0.07744t + 0.01008t²（R²=.809）。二次模型在這組資料上解釋力較強。</li>'
  + '<li>預測 2014 年時，移動平均取最後 3 或 5 筆原值平均。趨勢模型代入 t=11，計算時保留係數的完整精度。</li>'
  + '<li>線性 DW=.829，低於附錄 H 的 dL=.879，拒絕無正向自我相關的虛無假設。二次 DW=1.967，高於 dU=1.641，在 α=.05 的正向單尾檢定下不拒絕虛無假設。</li></ol>'
  + '<h4>2014 年預測</h4><div class="scroll">'
  + lessonTable(["方法","預測"], [["末三年平均",1.303],["末五年平均",1.218],["指數平滑 α=.20",1.180],["指數平滑 α=.50",1.309],["線性趨勢",1.315],["二次趨勢",1.536]])
  + '</div><h4>逐年計算</h4><div class="scroll">'
  + lessonTable(["年度","原值","三年中心化","五年中心化","指數 α=.20","指數 α=.50"],one) + '</div>');

set("exercise-two-answer",
  '<ol><li>以連續四季為一組，將相鄰兩組的平均再平均，使數值對準特定季度。第一筆可算的中心化平均在 2007Q3，為 70.750。</li>'
  + '<li>在折線圖比較原始銷售、中心化移動平均與去季節銷售。原始系列每年第三季明顯較低，去季節後仍看得到前期增加及末期放緩。</li>'
  + '<li>特定季節指數為原始銷售 ÷ 中心化移動平均。2007Q3 約為 0.396；頭尾無移動平均的期別留空。</li>'
  + '<li>分別平均各季的特定指數，再以四季平均標準化，得到下表的一般季節指數。</li>'
  + '<li>各期原值除以所屬季的一般季節指數，即得去季節銷售。四個一般指數也適用於頭尾季度。</li></ol>'
  + '<div class="scroll">' + lessonTable(["季度","一般季節指數"],indices.map((v,i)=>["Q"+(i+1),v]))
  + '</div><h4>逐季計算</h4><div class="scroll">'
  + lessonTable(["期別","原值","中心化四季移動平均","特定季節指數","去季節銷售"],two) + '</div>');

function renderExerciseChart(id, rows, series, y, label, quarter = false) {
  if (!$(id).clientWidth) return;
  const x = rows.map((_, i) => i);
  chart(id, {title: label, x: [0, x.at(-1)], y, xLabel: quarter ? "年／季" : "西元年", yLabel: label,
    ticks: quarter ? x.filter(i => i % 4 === 0).map(i => [i, rows[i][0].slice(0,4)]) : numericTicks(x, 5, i => rows[i][0]),
    legend: series.map(([,name, color]) => [name,color]),
    draw: g => g.series(series.map(([index,name,color]) => [rows.map(row => row[index]),name,color]),x,i=>rows[i][0])});
}
const exerciseCharts = {
  "exercise-one": () => renderExerciseChart("exercise-one-chart",one,
    [[1,"原值",C.grey],[2,"三年平均",C.teal],[3,"五年平均",C.blue]], [.9,1.5],"人員增加率"),
  "exercise-two": () => renderExerciseChart("exercise-two-chart",two,
    [[1,"原始銷售",C.grey],[2,"中心化四季移動平均",C.blue],[4,"去季節銷售",C.teal]], [0,240],"銷售量",true)
};
for (const [id, draw] of Object.entries(exerciseCharts)) {
  $(id).querySelector("details").addEventListener("toggle", e => { if (e.target.open) draw(); });
}
document.addEventListener("lessonchange", e => exerciseCharts[e.detail.topic]?.());

set("run-case", Object.entries(exampleLabels).map(([key,label]) => '<option value="' + key + '">' + label + '</option>').join(""));
$("run-case").value = "residual";
observe(["example-case"],renderExample);
observe(["run-case","run-language"],renderSyntax);
renderExample();
renderSyntax();
