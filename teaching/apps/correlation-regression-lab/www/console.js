function runPython(button) {
  const grid = button.closest('.console-grid');
  const output = grid.querySelector('.console');
  button.disabled = true;
  output.textContent = '正在下載執行環境並執行…';
  let worker, timer;
  function finish(message, ok) {
    clearTimeout(timer);
    worker?.terminate();
    output.textContent = message + (ok ? '' : '\n可將 .py 和 CSV 下載至同一資料夾，安裝 NumPy、SciPy 後在本機執行。');
    button.disabled = false;
  }
  try {
    worker = new Worker('python-console.js', {type: 'module'});
    worker.onmessage = ({data}) => finish(data.output, data.ok);
    worker.onerror = () => finish('瀏覽器無法載入 Python。',false);
    timer = setTimeout(() => finish('Python 載入逾時。', false),120000);
    worker.postMessage({filename:'analysis.csv',csv:grid.querySelector('.console-csv').textContent,
      code:grid.querySelector('.source-code code').textContent});
  } catch(error) { finish(error.message, false); }
}
async function copyCode(button) {
  const code = button.closest('.console-grid').querySelector('.source-code code');
  if (!code) return;
  try {
    await navigator.clipboard.writeText(code.textContent);
    button.textContent = '已複製';
    setTimeout(() => { button.textContent = '複製語法'; }, 1800);
  } catch {
    const range = document.createRange();
    range.selectNodeContents(code);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }
}
async function downloadPlot(button) {
  const image = button.closest('.chart-panel').querySelector('.shiny-plot-output img');
  if (!image || !image.complete || !image.naturalWidth) return;
  const label = button.textContent;
  button.disabled = true;
  try {
    const response = await fetch(image.currentSrc || image.src);
    if (!response.ok) throw new Error('無法讀取圖形');
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = image.closest('.shiny-plot-output').id.replace('_plot','') + '-scatterplot.png';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  } catch {
    button.textContent = '下載失敗，請再試一次';
    setTimeout(() => { button.textContent = label; }, 2000);
  } finally {
    button.disabled = false;
  }
}
