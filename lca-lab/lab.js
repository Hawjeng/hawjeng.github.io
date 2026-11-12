'use strict';

const models = {
  patient: {
    title: '病患症狀示例',
    indicators: ['發燒', '咳嗽', '流鼻水'],
    classes: ['第 1 類（非感冒）', '第 2 類（重感冒）', '第 3 類（小感冒）'],
    prior: [.16508, .53498, .29995],
    theta: [[.578,.384,.022],[.947,.804,.843],[.137,.566,.554]],
    pattern: ['1','1','0'],
    metrics: ['1,000', '−1896.578', '3815.157', '3869.142', '3834.205', '.567'],
    reading: '這組資料為 1,000 筆模擬病患反應。依症狀剖面暫定類名。「非感冒」類約六成發燒，咳嗽較少，流鼻水罕見。「重感冒」類三種症狀的機率都超過八成。「小感冒」類較少發燒，咳嗽與流鼻水的機率都略高於五成。把「流鼻水」切換為有或無，觀察後驗類別機率如何改變。',
    diagnosis: '三個二元指標只有 7 個獨立反應型態機率，三類無限制模型需要 11 個參數。Mplus 報告負自由度，並因資訊矩陣奇異固定部分閾值。這個輸出用於練習判讀和說明識別問題。'
  },
  tcs: {
    title: 'TCS 傳播調查',
    indicators: ['維繫友誼', '娛樂消遣', '新聞資訊', '生活資訊', '理財購物', '工作學習'],
    classes: ['全方位', '生活消遣', '工作學習', '友誼關係', '消遣娛樂'],
    prior: [.37371,.33754,.12883,.12311,.03681],
    theta: [[.993,.979,.970,.976,.865,.811],[.740,.677,.716,.605,.275,.195],[.761,.514,.449,.231,.192,1],[1,.439,.081,.151,.003,.014],[.039,1,0,.036,.040,.083]],
    pattern: ['1','1','1','0','0','0'],
    metrics: ['1,857', '−5992.090', '12052.180', '12240.089', '12132.071', '.740'],
    reading: '五類模型以六個二元使用目的指標描繪不同的使用型態。全方位類在六個指標的反應機率普遍較高。可比較工作學習與友誼關係兩類，找出最能區分兩類的題目。',
    diagnosis: '原始輸入共 2,016 筆，其中 159 筆六題皆缺失。Mplus 五類輸出的調整後 LMR p = .1474，且 BLRT 多數重抽樣未重現最佳概似。第五類估計比例約 3.7%，部分條件機率到達邊界，類別數仍需綜合診斷。'
  }
};

const fits = [
  [1, 6, -6819.36, 13650.73, 13683.89, 13664.83, '—', '100.00%', '—', '—', '—'],
  [2, 13, -6076.55, 12179.10, 12250.95, 12209.65, '.757', '42.90%', '1485.63', '<.0001', '<.0001'],
  [3, 20, -6035.32, 12110.64, 12221.17, 12157.64, '.688', '20.34%', '82.46', '<.0001', '<.0001'],
  [4, 27, -6025.28, 12104.57, 12253.79, 12168.01, '.715', '15.48%', '20.07', '.0144', '<.0001'],
  [5, 34, -5992.09, 12052.18, 12240.09, 12132.07, '.739', '3.68%', '35.86', '.1474', '<.0001'],
  [6, 41, -5984.91, 12051.82, 12278.42, 12148.16, '.631', '7.85%', '14.36', '.2641', '.2273']
];

const byId = id => document.getElementById(id);
const percent = value => (100 * value).toFixed(1) + '%';
const colors = ['#097d77','#9b592e','#44549a','#8b447b','#567031'];
let current = 'patient';

function renderFit() {
  const maxClasses = byId('fit-classes').valueAsNumber;
  const metric = Number(byId('fit-metric').value);
  const visibleFits = fits.slice(0, maxClasses);
  const best = Math.min(...visibleFits.map(row => row[metric]));
  const bestClasses = visibleFits.find(row => row[metric] === best)[0];
  const metricName = byId('fit-metric').selectedOptions[0].textContent;

  byId('fit-count').textContent = maxClasses + ' 類';
  byId('fit-result').textContent = '目前比較 1 至 ' + maxClasses + ' 類，' +
    metricName + ' 最低的是 ' + bestClasses + ' 類模型（' + best.toFixed(2) + '）。';
  byId('fit-table').innerHTML = '<table><thead><tr>' +
    ['類別數 K','參數數 P','對數概似 LL','AIC','BIC','SaBIC','Entropy','最小組 %','ΔG²','LMR p','BLRT p']
      .map(label => '<th scope="col">'+label+'</th>').join('') +
    '</tr></thead><tbody>' + visibleFits.map(row => '<tr>' + row.map((value,i) => {
      if (i === 0) return '<th scope="row">'+value+'</th>';
      const display = i >= 2 && i <= 5 ? value.toFixed(2) : String(value).replace('<', '&lt;');
      return '<td'+(i === metric && value === best ? ' class="best"':'')+'>'+display+'</td>';
    }).join('') + '</tr>').join('') + '</tbody></table>';
}

function renderProfile(container, model) {
  container.innerHTML = '<label>配對檢視類別 <select><option value="all">全部類別</option>' +
    model.classes.map((name,k) => '<option value="'+k+'">'+name+'</option>').join('') +
    '</select></label><div class="profile-charts"></div><div class="profile-values"></div>';
  const selector = container.querySelector('select');
  selector.addEventListener('change', () => renderProfileSelection(container, model, selector.value));
  renderProfileSelection(container, model, selector.value);
}

function renderProfileSelection(container, model, selected) {
  const visible = model.theta.map((row,k) => ({row,k}))
    .filter(({k}) => selected === 'all' || k === Number(selected));
  const x = j => 56 + 224 * j / (model.indicators.length - 1);
  const y = probability => 124 - 108 * probability;
  const grid = [0, .25, .5, .75, 1].map(probability =>
    '<path d="M45 '+y(probability)+'H290" stroke="var(--line)"/>'+
    '<text x="41" y="'+(y(probability)+4)+'" text-anchor="end">'+Math.round(probability*100)+'%</text>'
  ).join('');
  container.querySelector('.profile-charts').innerHTML = visible.map(({row,k}) => {
    const coordinates = row.map((probability,j) => x(j)+','+y(probability)).join(' ');
    const points = row.map((probability,j) =>
      '<circle cx="'+x(j)+'" cy="'+y(probability)+'" r="4" fill="'+colors[k]+'"/>'+
      '<text x="'+x(j)+'" y="145" text-anchor="middle">Y'+(j+1)+'</text>'
    ).join('');
    const description = row.map((probability,j) => model.indicators[j]+' '+percent(probability)).join('，');
    return '<figure class="profile-chart"><figcaption>'+model.classes[k]+' · '+percent(model.prior[k])+'</figcaption>'+
      '<svg viewBox="0 0 300 153" role="img" aria-label="'+model.classes[k]+'：'+description+'">'+
      grid+'<polyline points="'+coordinates+'" fill="none" stroke="'+colors[k]+'" stroke-width="2.5"/>'+
      points+'</svg></figure>';
  }).join('');
  container.querySelector('.profile-values').innerHTML = '<div class="table"><table><thead><tr><th scope="col">類別</th><th scope="col">比例 π</th>'+
    model.indicators.map(label => '<th scope="col">'+label+'</th>').join('')+'</tr></thead><tbody>'+
    visible.map(({row,k}) => '<tr><th scope="row">'+model.classes[k]+'</th><td>'+percent(model.prior[k])+'</td>'+
      row.map(value => '<td><div class="mini"><span style="--value:'+100*value+'%;--ink:'+colors[k]+'"></span>'+
      value.toFixed(3)+'</div></td>').join('')+'</tr>').join('')+'</tbody></table></div>';
}

function renderCase() {
  const model = models[current];
  const names = ['有效 N','對數概似','AIC','BIC','saBIC','Entropy'];
  byId('case-description').innerHTML = '<h3>'+model.title+'</h3><p>'+model.reading+'</p>'+
    '<dl class="metrics">'+model.metrics.map((value,i) => '<div><dt>'+names[i]+'</dt><dd>'+value+'</dd></div>').join('')+
    '</dl><p class="note">'+model.diagnosis+'</p>';
  if (current === 'tcs') {
    byId('case-description').insertAdjacentHTML('beforeend','<details open><summary>逐步比較 TCS 的 1–6 類模型</summary>'+
      '<p>拖曳滑桿，從 1 類開始逐一加入模型。數值來自課堂的 Mplus 輸出。</p>'+
      '<label for="fit-classes">最多比較到 <output id="fit-count" for="fit-classes">1 類</output></label> '+
      '<input id="fit-classes" type="range" min="1" max="6" step="1" value="1" style="accent-color:var(--accent)"> '+
      '<label for="fit-metric">標示最小值 <select id="fit-metric"><option value="3">AIC</option><option value="4" selected>BIC</option><option value="5">SaBIC</option></select></label>'+
      '<p id="fit-result" role="status"></p><div class="table" role="region" aria-label="TCS 模型適配度" tabindex="0" id="fit-table"></div>'+
      '<p>ΔG² 是相鄰模型的兩倍對數概似差。LMR 與 BLRT 的 p 值沿用 Mplus 輸出，兩者比較 K 類與 K − 1 類。四類的獨立估計與五類輸出中 TECH11／14 的基準概似不同，應檢查隨機起始值與最佳解的重現。</p>'+
      '<p>展開到 6 類後，BIC 偏好 3 類，SaBIC 偏好 5 類，AIC 偏好 6 類。選擇類別數時也要看分類品質、最小組比例與各類能否解釋。</p></details>');
    byId('fit-classes').addEventListener('input', renderFit);
    byId('fit-metric').addEventListener('change', renderFit);
    renderFit();
  }
  byId('pattern').innerHTML = model.indicators.map((label,i) => '<label for="item-'+i+'">'+
    (label === 'Y'+(i+1) ? label : 'Y'+(i+1)+'｜'+label)+
    '<select id="item-'+i+'"><option value="1">1（有）</option><option value="0">0（無）</option>'+
    '<option value="">未觀察</option></select></label>').join('');
  model.pattern.forEach((value,i) => byId('item-'+i).value = value);
  renderProfile(byId('profile'), model);
  renderPosterior();
}

function renderPosterior() {
  const model = models[current];
  const pattern = model.indicators.map((_,i) => byId('item-'+i).value);
  const scores = model.theta.map((row,k) => row.reduce((weight,theta,j) => {
    if (pattern[j] === '') return weight;
    return weight * (pattern[j] === '1' ? theta : 1-theta);
  }, model.prior[k]));
  const total = scores.reduce((sum,value) => sum+value,0);
  if (total === 0) {
    byId('posterior-note').textContent = '依目前顯示的估計值，此反應型態的機率為 0，無法計算後驗機率。';
    byId('posterior').replaceChildren();
    return;
  }
  const posterior = scores.map(value => value/total);
  const highest = Math.max(...posterior);
  const names = model.classes.filter((_,k) => posterior[k] === highest);
  byId('posterior-note').textContent = pattern.every(value => value === '')
    ? '沒有觀察到的指標，後驗機率等於模型估計的類別比例。'
    : '最可能類別為「'+names.join('、')+'」（'+percent(highest)+'）。以輸出表的四捨五入參數計算。';
  byId('posterior').innerHTML = posterior.map((value,k) =>
    '<div class="posterior-row"><div><strong>'+model.classes[k]+'</strong><span>'+percent(value)+'</span></div>'+
    '<div class="track" aria-hidden="true"><span style="--value:'+100*value+'%;--ink:'+colors[k]+'"></span></div></div>'
  ).join('');
}

document.querySelectorAll('[data-example]').forEach(button => {
  button.addEventListener('click', () => {
    current = button.dataset.example;
    document.querySelectorAll('[data-example]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    renderCase();
  });
});
byId('pattern').addEventListener('change',renderPosterior);
byId('pattern').addEventListener('submit',event => event.preventDefault());
byId('reset').addEventListener('click',() => {
  byId('pattern').querySelectorAll('select').forEach(select => select.value = '');
  renderPosterior();
});
renderCase();


const syntaxCases = {
  patient: {classes: 3, items: 3, dataLabel: '下載病患反應型態資料'},
  'tcs-demo': {classes: 5, items: 6, dataLabel: '下載 TCS 模擬反應型態資料'},
  tcs: {classes: 5, items: 6}
};
const syntaxExample = byId('syntax-example');
const syntaxClasses = byId('syntax-classes');
const syntaxStatus = byId('syntax-status');
const syntaxButtons = document.querySelectorAll('[data-copy], [data-save]');
const syntaxCache = new Map();
const syntaxFiles = {mplus: '', r: 'lca.R', python: 'lca.py'};
let syntaxRevision = 0;

function loadSyntaxFile(file) {
  if (!syntaxCache.has(file)) {
    const request = fetch('downloads/' + file).then(response => {
      if (!response.ok) throw new Error(file);
      return response.text();
    }).catch(error => {
      syntaxCache.delete(file);
      throw error;
    });
    syntaxCache.set(file, request);
  }
  return syntaxCache.get(file);
}

function setCommand(language, command) {
  const code = document.createElement('code');
  code.textContent = command;
  byId(language+'-command').replaceChildren(code);
}

async function renderSyntax() {
  const revision = ++syntaxRevision;
  const example = syntaxExample.value;
  const classes = Number(syntaxClasses.value);
  const selected = syntaxCases[example];
  const mplusFile = example + '.inp';
  const data = byId('syntax-data');
  const link = document.createElement('a');
  link.href = 'downloads/' + (selected.dataLabel ? example+'-patterns.dat' : 'prepare-tcs.py');
  link.download = '';
  link.textContent = selected.dataLabel || '下載 TCS 資料整理程式';
  data.replaceChildren(link);
  if (!selected.dataLabel) data.append('。先用已獲准的課堂檔在本機產生 tcs-patterns.dat。');
  const free = (selected.items+1)*classes-1;
  const available = 2**selected.items-1;
  const identification = byId('syntax-identification');
  identification.hidden = free <= available;
  identification.textContent = '此設定有 '+free+' 個自由參數，超過反應型態可提供的 '+available+' 個獨立機率。';
  syntaxButtons.forEach(button => button.disabled = true);
  for (const language of Object.keys(syntaxFiles)) byId(language+'-source').value = '';
  setCommand('mplus','在 Mplus 開啟 '+mplusFile+'，與資料檔放在同一資料夾。');
  setCommand('r','Rscript lca.R '+example+' '+classes);
  setCommand('python','python lca.py '+example+' '+classes);
  syntaxStatus.textContent = '載入語法中…';
  try {
    const [mplus, r, python] = await Promise.all([mplusFile, 'lca.R', 'lca.py'].map(loadSyntaxFile));
    if (revision !== syntaxRevision) return;
    syntaxFiles.mplus = mplusFile;
    byId('mplus-source').value = mplus.replace(/(CLASSES\s*=\s*c\()\d+(\))/i, (_, prefix, suffix) => prefix + classes + suffix);
    byId('r-source').value = '# Rscript lca.R '+example+' '+classes+'\n\n'+r;
    byId('python-source').value = '# python lca.py '+example+' '+classes+'\n\n'+python;
    syntaxButtons.forEach(button => button.disabled = false);
    syntaxStatus.textContent = '';
  } catch {
    if (revision === syntaxRevision) syntaxStatus.textContent = '載入語法失敗。請重新選擇設定，或從下方「下載與來源」取得檔案。';
  }
}

syntaxExample.addEventListener('change', () => {
  syntaxClasses.value = String(syntaxCases[syntaxExample.value].classes);
  renderSyntax();
});
syntaxClasses.addEventListener('change',renderSyntax);

syntaxButtons.forEach(button => button.addEventListener('click',async () => {
  const language = button.dataset.copy || button.dataset.save;
  const source = byId(language+'-source');
  if (!source.value) return;
  if (button.dataset.copy) {
    const revision = syntaxRevision;
    try {
      await navigator.clipboard.writeText(source.value);
      if (revision === syntaxRevision) syntaxStatus.textContent = '已複製語法。';
    } catch {
      if (revision !== syntaxRevision) return;
      source.focus();
      source.select();
      syntaxStatus.textContent = '已選取語法，可按 Ctrl+C 或 ⌘C 複製。';
    }
    return;
  }
  const url = URL.createObjectURL(new Blob([source.value],{type:'text/plain;charset=utf-8'}));
  const link = document.createElement('a');
  link.href = url;
  link.download = syntaxFiles[language];
  link.click();
  setTimeout(() => URL.revokeObjectURL(url),1000);
}));

renderSyntax();

renderProfile(byId('principles-profile'), models.patient);

const thresholdSlider = byId('threshold-slider');

function renderThreshold() {
  const t = thresholdSlider.valueAsNumber;
  const probabilityZero = 1 / (1 + Math.exp(-t));
  const x = 307 + 42 * t;
  const thresholdText = 'τ = ' + t.toFixed(3).replace('-', '−');

  byId('threshold-guide').setAttribute('d', 'M' + x + ' 37V242');
  byId('threshold-value').setAttribute('x', Math.min(510, Math.max(165, x)));
  byId('threshold-value').textContent = thresholdText;

  for (const [name, probability, side] of [
    ['zero', probabilityZero, 1],
    ['one', 1 - probabilityZero, -1]
  ]) {
    const y = 242 - 205 * probability;
    const point = byId('threshold-point-' + name);
    const label = byId('threshold-label-' + name);
    const labelSide = x < 115 ? 1 : x > 499 ? -1 : side;
    point.setAttribute('cx', x);
    point.setAttribute('cy', y);
    label.setAttribute('x', x + 12 * labelSide);
    label.setAttribute('y', Math.min(238, Math.max(52, y + 10 * side)));
    label.setAttribute('text-anchor', labelSide === 1 ? 'start' : 'end');
    label.textContent = percent(probability);
  }

  byId('threshold-result').textContent = thresholdText +
    '，P(Y = 0) = ' + percent(probabilityZero) +
    '，P(Y = 1) = ' + percent(1 - probabilityZero);
}

thresholdSlider.addEventListener('input', renderThreshold);
document.querySelectorAll('[data-threshold]').forEach(button => {
  button.addEventListener('click', () => {
    thresholdSlider.value = button.dataset.threshold;
    renderThreshold();
  });
});
renderThreshold();
