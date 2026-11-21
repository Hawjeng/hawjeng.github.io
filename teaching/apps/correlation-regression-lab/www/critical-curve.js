"use strict";

function createCorrelationCurve(host, min, max, select, commit) {
  const pCurve = host.dataset.kind === "p";
  const series = JSON.parse(host.dataset.values);
  const width = 840, height = 380;
  const left = 65, right = 819, top = 18, bottom = 319;
  const colors = ["#7958a4", "#176f7a", "#ac512e", "#284e85"].slice(0, series.length);
  const labels = pCurve ? ["|r| = .05", "|r| = .10", "|r| = .30", "選定 |r| = " + host.dataset.r]
    : ["α = .01", "α = .05", "α = .10"];
  const svgNS = "http://www.w3.org/2000/svg";
  const x = n => left + (n - min) / (max - min) * (right - left);
  const y = r => bottom - r * (bottom - top);
  const svg = document.createElementNS(svgNS, "svg");
  function draw(tag, attrs, label) {
    const node = document.createElementNS(svgNS, tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    if (label !== undefined) node.textContent = label;
    svg.append(node);
    return node;
  }
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("role", "slider");
  svg.setAttribute("tabindex", "0");
  svg.setAttribute("aria-label", pCurve ? "雙尾 p 值圖的樣本數 N" : "相關臨界值圖的樣本數 N");
  svg.setAttribute("aria-valuemin", min);
  svg.setAttribute("aria-valuemax", max);
  svg.setAttribute("font-family", "system-ui, sans-serif");
  svg.style.cssText = "display:block;width:100%;max-width:940px;margin-inline:auto;touch-action:none;user-select:none;cursor:ew-resize";
  const ink = "#244c55";
  for (const r of [0, .2, .4, .6, .8, 1]) {
    draw("line", {x1:left, x2:right, y1:y(r), y2:y(r), stroke:"#e0ebed"});
    draw("text", {x:left-9, y:y(r)+5, "text-anchor":"end", fill:ink, "font-size":16}, r.toFixed(1));
  }
  draw("path", {d:`M${left},${top}V${bottom}H${right}`, fill:"none", stroke:"#9bb1b5"});
  for (const tick of pCurve ? [min, 500, 1000, 1500, max] : [1, 500, 1000, 1500, max-2]) {
    const cx = x(pCurve ? tick : tick+2);
    draw("line", {x1:cx, x2:cx, y1:bottom, y2:bottom+7, stroke:"#9bb1b5"});
    draw("text", {x:cx, y:bottom+25, "text-anchor":"middle", fill:ink, "font-size":16}, tick);
  }
  draw("text", {x:(left+right)/2, y:367, "text-anchor":"middle", fill:ink}, pCurve ? "配對樣本數 N" : "自由度（N − 2）");
  draw("text", {x:19, y:169, transform:"rotate(-90 19 169)", "text-anchor":"middle", fill:ink}, pCurve ? "雙尾 p 值" : "臨界 |r|");
  if (pCurve) {
    const cutoff = y(Number(host.dataset.alpha));
    draw("line", {x1:left, x2:right, y1:cutoff, y2:cutoff, stroke:"#687e83", "stroke-dasharray":"3 4"});
  }
  series.forEach((values, i) => {
    const path = values.map((r, j) => [x(min+j).toFixed(2), y(r).toFixed(2)].join(",")).join("L");
    draw("path", {d:"M"+path, fill:"none", stroke:colors[i], "stroke-width":i===3?3:2.5,
      "stroke-dasharray":i===3?"7 4":"none"});
  });
  const guide = draw("line", {y1:top, y2:bottom, stroke:"#526f75", "stroke-width":2, "stroke-dasharray":"5 4"});
  const dots = colors.map(fill => draw("circle", {r:5, fill, stroke:"white", "stroke-width":1.5}));

  draw("rect", {x:585, y:27, width:216, height:40+24*series.length, rx:8, fill:"white", stroke:"#b9ced1"});
  const sample = draw("text", {x:600, y:52, fill:ink, "font-size":17, "font-weight":700});
  const readings = colors.map((fill, i) => {
    const row = 73 + 24*i;
    draw("line", {x1:600,x2:618,y1:row-5,y2:row-5,stroke:fill,"stroke-width":3,"stroke-dasharray":i===3?"6 3":"none"});
    return draw("text", {x:628,y:row,fill,"font-size":16});
  });

  let n, activePointer = null;
  function show(value) {
    if (!Number.isFinite(value)) return;
    n = Math.max(min, Math.min(max, Math.round(value)));
    const cx = x(n);
    guide.setAttribute("x1", cx);
    guide.setAttribute("x2", cx);
    sample.textContent = pCurve ? `N = ${n} ｜ 雙尾 p` : `N = ${n} ｜ df = ${n-2}`;
    svg.setAttribute("aria-valuenow", n);
    const description = [];
    series.forEach((values, i) => {
      const r = values[n-min];
      dots[i].setAttribute("cx", cx);
      dots[i].setAttribute("cy", y(r));
      const number = pCurve && r < .0001 ? "< .0001" : r.toFixed(4);
      readings[i].textContent = `${labels[i]}　${number}`;
      description.push(`${labels[i]} 的${pCurve?"雙尾 p 值":"臨界值"} ${number}`);
    });
    svg.setAttribute("aria-valuetext", `N = ${n}，自由度 ${n-2}，${description.join("，")}`);
  }
  function follow(event) {
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const localX = point.matrixTransform(svg.getScreenCTM().inverse()).x;
    select(min + (localX-left) / (right-left) * (max-min));
  }
  svg.addEventListener("pointerdown", event => {
    if (activePointer !== null || event.button !== 0) return;
    svg.focus({preventScroll:true});
    activePointer = event.pointerId;
    svg.setPointerCapture(activePointer);
    follow(event);
  });
  svg.addEventListener("pointermove", event => {
    if (event.pointerId === activePointer) follow(event);
  });
  const finish = event => {
    if (event.pointerId !== activePointer) return;
    if (event.type === "pointerup") follow(event);
    activePointer = null;
    commit(n);
  };
  svg.addEventListener("pointerup", finish);
  svg.addEventListener("pointercancel", finish);
  svg.addEventListener("keydown", event => {
    const targets = {ArrowLeft:n-1, ArrowDown:n-1, ArrowRight:n+1, ArrowUp:n+1,
      PageDown:n-10, PageUp:n+10, Home:min, End:max};
    if (!Object.hasOwn(targets, event.key)) return;
    event.preventDefault();
    select(targets[event.key]);
    commit(n);
  });
  host.append(svg);
  return {host, show, isDragging:()=>activePointer!==null};
}

function startCorrelationCurves() {
  const slider = document.getElementById("critical_n");
  const outputs = document.getElementById("p_curve");
  const fixed = document.getElementById("critical-curve");
  if (!slider || !outputs || !fixed || !window.jQuery) return false;
  const min = Number(slider.dataset.min), max = Number(slider.dataset.max);
  let n = Number(slider.dataset.from);
  const graphs = new Map();
  function select(value) {
    if (!Number.isFinite(value)) return;
    n = Math.max(min, Math.min(max, Math.round(value)));
    for (const graph of graphs.values()) graph.show(n);
  }
  const commit = value => window.Shiny?.setInputValue("critical_curve_n", value, {priority:"event"});
  function attach(host) {
    if (!host || graphs.get(host.dataset.kind)?.host === host) return;
    const graph = createCorrelationCurve(host,min,max,select,commit);
    graphs.set(host.dataset.kind,graph);
    graph.show(n);
  }
  attach(fixed);
  const attachP = () => attach(outputs.querySelector(".interactive-correlation-curve"));
  attachP();
  new MutationObserver(attachP).observe(outputs,{childList:true});
  window.jQuery(document).on("shiny:inputchanged", event => {
    if (event.name === "critical_n" && ![...graphs.values()].some(graph=>graph.isDragging()))
      select(Number(event.value));
  });
  return true;
}

function bootCorrelationCurves() {
  if (startCorrelationCurves()) return;
  const observer = new MutationObserver(() => {
    if (startCorrelationCurves()) observer.disconnect();
  });
  observer.observe(document.body,{childList:true,subtree:true});
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bootCorrelationCurves);
else bootCorrelationCurves();
