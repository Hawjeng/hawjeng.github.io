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
function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
async function downloadPlot(button) {
  const image = button.closest('.chart-panel').querySelector('.shiny-plot-output img');
  if (!image || !image.complete || !image.naturalWidth) return;
  const label = button.textContent;
  button.disabled = true;
  try {
    const response = await fetch(image.currentSrc || image.src);
    if (!response.ok) throw new Error('無法讀取圖形');
    let blob = await response.blob();
    const overlay = button.closest('.chart-panel').querySelector('.plot-equation-label');
    if (overlay) {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d');
      context.drawImage(image, 0, 0);
      const original = image.getBoundingClientRect(), box = overlay.getBoundingClientRect();
      const style = getComputedStyle(overlay);
      context.scale(canvas.width/original.width, canvas.height/original.height);
      context.fillStyle = style.color;
      context.font = style.fontWeight+' '+style.fontSize+' '+style.fontFamily;
      context.textBaseline = 'top';
      const left = box.x-original.x;
      let top = box.y-original.y;
      const lineHeight = parseFloat(style.lineHeight) || 1.25*parseFloat(style.fontSize);
      for (const row of overlay.children) {
        let line = '';
        for (const word of row.textContent.split(' ')) {
          const next = line ? line + ' ' + word : word;
          if (line && context.measureText(next).width > box.width) {
            context.fillText(line,left,top);
            top += lineHeight;
            line = word;
          } else line = next;
        }
        context.fillText(line,left,top);
        top += lineHeight;
      }
      blob = await new Promise(resolve=>canvas.toBlob(resolve,'image/png')) || blob;
    }
    saveBlob(blob,image.closest('.shiny-plot-output').id.replace('_plot','')+'-scatterplot.png');
  } catch {
    button.textContent = '下載失敗，請再試一次';
    setTimeout(() => { button.textContent = label; }, 2000);
  } finally {
    button.disabled = false;
  }
}

function movePlotLabel(label,left,top) {
  const surface=label.closest('.plot-surface');
  const box=surface.getBoundingClientRect(), size=label.getBoundingClientRect();
  const x=Math.max(0,Math.min(box.width-size.width,left));
  const y=Math.max(0,Math.min(box.height-size.height,top));
  surface.style.setProperty('--eq-top',100*y/box.height+'%');
  surface.style.setProperty('--eq-right',100*(box.width-x-size.width)/box.width+'%');
}
let equationDrag;
document.addEventListener('pointerdown',event=>{
  const label=event.target.closest('.plot-equation-label');
  if(!label||equationDrag||event.button!==0)return;
  const box=label.getBoundingClientRect();
  equationDrag={label,id:event.pointerId,x:event.clientX-box.x,y:event.clientY-box.y};
  label.setPointerCapture(event.pointerId);
});
document.addEventListener('pointermove',event=>{
  if(!equationDrag||event.pointerId!==equationDrag.id)return;
  const {label,x,y}=equationDrag;
  const bounds=label.closest('.plot-surface').getBoundingClientRect();
  movePlotLabel(label,event.clientX-bounds.x-x,event.clientY-bounds.y-y);
});
document.addEventListener('lostpointercapture',event=>{
  if(equationDrag?.id===event.pointerId)equationDrag=null;
});
document.addEventListener('keydown',event=>{
  const label=event.target.closest('.plot-equation-label');
  const delta={ArrowLeft:[-8,0],ArrowRight:[8,0],ArrowUp:[0,-8],ArrowDown:[0,8]}[event.key];
  if(!label||!delta)return;
  const current=label.getBoundingClientRect(), bounds=label.closest('.plot-surface').getBoundingClientRect();
  event.preventDefault();
  movePlotLabel(label,current.x-bounds.x+delta[0],current.y-bounds.y+delta[1]);
});
