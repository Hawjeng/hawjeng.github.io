"use strict";

function setupCriticalCurve() {
  const host = document.getElementById("critical-curve");
  const slider = document.getElementById("critical_n");
  if (!host || !slider || !window.jQuery) return false;
  if (host.querySelector("svg")) return true;

  const series = JSON.parse(host.dataset.values);
  const min = Number(slider.dataset.min);
  const max = Number(slider.dataset.max);
  const width = 840, height = 380;
  const left = 65, right = 819, top = 18, bottom = 319;
  const colors = ["#7958a4", "#176f7a", "#ac512e"];
  const alphas = [".01", ".05", ".10"];
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
  svg.setAttribute("aria-label", "配對樣本數 N");
  svg.setAttribute("aria-valuemin", min);
  svg.setAttribute("aria-valuemax", max);
  svg.setAttribute("font-family", "system-ui, sans-serif");
  svg.style.cssText = "display:block;width:100%;max-width:940px;margin-inline:auto;touch-action:none;cursor:ew-resize";
  const ink = "#244c55";
  for (const r of [0, .2, .4, .6, .8, 1]) {
    draw("line", {x1:left, x2:right, y1:y(r), y2:y(r), stroke:"#e0ebed"});
    draw("text", {x:left-9, y:y(r)+5, "text-anchor":"end", fill:ink, "font-size":16}, r.toFixed(1));
  }
  draw("path", {d:`M${left},${top}V${bottom}H${right}`, fill:"none", stroke:"#9bb1b5"});
  for (const df of [1, 500, 1000, 1500, max-2]) {
    const cx = x(df + 2);
    draw("line", {x1:cx, x2:cx, y1:bottom, y2:bottom+7, stroke:"#9bb1b5"});
    draw("text", {x:cx, y:bottom+25, "text-anchor":"middle", fill:ink, "font-size":16}, df);
  }
  draw("text", {x:(left+right)/2, y:367, "text-anchor":"middle", fill:ink}, "自由度（N − 2）");
  draw("text", {x:19, y:169, transform:"rotate(-90 19 169)", "text-anchor":"middle", fill:ink}, "臨界 |r|");
  series.forEach((values, i) => {
    const path = values.map((r, j) => [x(min+j).toFixed(2), y(r).toFixed(2)].join(",")).join("L");
    draw("path", {d:"M"+path, fill:"none", stroke:colors[i], "stroke-width":2.5});
  });
  const guide = draw("line", {y1:top, y2:bottom, stroke:"#526f75", "stroke-width":2, "stroke-dasharray":"5 4"});
  const dots = colors.map(fill => draw("circle", {r:5, fill, stroke:"white", "stroke-width":1.5}));

  draw("rect", {x:609, y:27, width:192, height:112, rx:8, fill:"white", stroke:"#b9ced1"});
  const sample = draw("text", {x:624, y:52, fill:ink, "font-size":17, "font-weight":700});
  const readings = colors.map((fill, i) => {
    const row = 73 + 24*i;
    draw("line", {x1:624,x2:642,y1:row-5,y2:row-5,stroke:fill,"stroke-width":3});
    return draw("text", {x:652,y:row,fill,"font-size":16});
  });

  let n, activePointer = null;
  function show(value) {
    if (!Number.isFinite(value)) return;
    n = Math.max(min, Math.min(max, Math.round(value)));
    const cx = x(n);
    guide.setAttribute("x1", cx);
    guide.setAttribute("x2", cx);
    sample.textContent = `N = ${n} ｜ df = ${n-2}`;
    svg.setAttribute("aria-valuenow", n);
    const description = [];
    series.forEach((values, i) => {
      const r = values[n-min];
      dots[i].setAttribute("cx", cx);
      dots[i].setAttribute("cy", y(r));
    readings[i].textContent = `α = ${alphas[i]}　${r.toFixed(4)}`;
      description.push(`α ${alphas[i]} 的臨界值 ${r.toFixed(4)}`);
    });
    svg.setAttribute("aria-valuetext", `N = ${n}，自由度 ${n-2}，${description.join("，")}`);
  }
  const commit = () => window.Shiny?.setInputValue("critical_curve_n", n, {priority:"event"});
  function follow(event) {
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const localX = point.matrixTransform(svg.getScreenCTM().inverse()).x;
    show(min + (localX-left) / (right-left) * (max-min));
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
    commit();
  };
  svg.addEventListener("pointerup", finish);
  svg.addEventListener("pointercancel", finish);
  svg.addEventListener("keydown", event => {
    const targets = {ArrowLeft:n-1, ArrowDown:n-1, ArrowRight:n+1, ArrowUp:n+1,
      PageDown:n-10, PageUp:n+10, Home:min, End:max};
    if (!Object.hasOwn(targets, event.key)) return;
    event.preventDefault();
    show(targets[event.key]);
    commit();
  });
  window.jQuery(document).on("shiny:inputchanged", event => {
    if (event.name === "critical_n" && activePointer === null) show(Number(event.value));
  });
  show(Number(slider.dataset.from));
  host.append(svg);
  return true;
}

function startCriticalCurve() {
  if (setupCriticalCurve()) return;
  const observer = new MutationObserver(() => {
    if (setupCriticalCurve()) observer.disconnect();
  });
  observer.observe(document.body, {childList:true, subtree:true});
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startCriticalCurve);
else startCriticalCurve();
