const indexURL = 'https://cdn.jsdelivr.net/pyodide/v314.0.8/full/';
self.onmessage = async ({ data }) => {
  let stage = "載入 Python 執行環境或套件";
  try {
    const { loadPyodide } = await import(indexURL + 'pyodide.mjs');
    const runtime = await loadPyodide({ indexURL });
    await runtime.loadPackagesFromImports(data.code);
    stage = "執行分析語法";
    runtime.FS.writeFile(data.filename, data.csv, { encoding: 'utf8' });
    const lines = [];
    runtime.setStdout({ batched: line => lines.push(line) });
    runtime.setStderr({ batched: line => lines.push(line) });
    await runtime.runPythonAsync(data.code);
    self.postMessage({ ok: true, output: lines.join('\n') });
  } catch (error) {
    self.postMessage({ ok: false, output: stage + '失敗\n' + error.message });
  }
};
