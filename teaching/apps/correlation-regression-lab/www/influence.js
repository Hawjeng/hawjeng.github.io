'use strict';
const original = [[4.0, 66.0], [27.0, 87.0], [18.0, 83.0], [7.0, 73.0], [30.0, 84.0], [12.0, 82.0], [18.0, 74.0], [23.0, 79.0], [19.0, 76.0], [12.0, 76.0]];
const chart = document.getElementById('scatter');
const selectPoint = document.getElementById('point');
const metrics = document.getElementById('metrics');
const bounds = {x0: 62, y0: 22, width: 766, height: 390, xmin: -5, xmax: 40, ymin: 48, ymax: 112};
let points = original.map(point => [...point]);
let selected = 1;
let pointer = null;
const xScale = x => bounds.x0 + (x-bounds.xmin)/(bounds.xmax-bounds.xmin)*bounds.width;
const yScale = y => bounds.y0 + (bounds.ymax-y)/(bounds.ymax-bounds.ymin)*bounds.height;
const svg = (name, properties) => {
  const element = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const [key,value] of Object.entries(properties)) element.setAttribute(key,value);
  return element;
};
function line(element, x1, y1, x2, y2) {
  for (const [key, value] of Object.entries({x1,y1,x2,y2})) element.setAttribute(key,value);
}
function label(parent, x, y, value, anchor='middle') {
  const element = svg('text',{x,y,'text-anchor':anchor});
  element.textContent = value;
  parent.append(element);
}
function fit(data) {
  const n = data.length;
  const average = j => data.reduce((sum,p) => sum+p[j],0)/n;
  const mx = average(0), my = average(1);
  const xx = data.reduce((sum,[x]) => sum+(x-mx)**2,0);
  const yy = data.reduce((sum,[,y]) => sum+(y-my)**2,0);
  const xy = data.reduce((sum,[x,y]) => sum+(x-mx)*(y-my),0);
  const slope = xy/xx, intercept = my-slope*mx;
  const predict = x => intercept+slope*x;
  const mse = data.reduce((sum,[x,y]) => sum+(y-predict(x))**2,0)/(n-2);
  return {mx,my,xx,slope,predict,mse,r:xy/Math.sqrt(xx*yy)};
}
const axis = document.getElementById('axis');
for(let x=0;x<=40;x+=5){
  axis.append(svg('line',{x1:xScale(x),x2:xScale(x),y1:22,y2:412,stroke:'#d4e4e6'}));
  label(axis,xScale(x),435,x);
}
for(let y=50;y<=110;y+=10){
  axis.append(svg('line',{x1:62,x2:828,y1:yScale(y),y2:yScale(y),stroke:'#d4e4e6'}));
  label(axis,51,yScale(y)+5,y,'end');
}
label(axis,445,457,'認真程度 X');
label(axis,66,17,'考試成績 Y','start');
const circles = original.map((_,i)=>{
  const node = svg('circle',{r:8,tabindex:0,class:'point','data-index':i,role:'button'});
  const option = new Option('第 '+(i+1)+' 筆',i);
  selectPoint.add(option);
  document.getElementById('points').append(node);
  return node;
});
const quadrantOption = document.getElementById('quadrants');
const quadrantLines = document.getElementById('quadrant-lines');
const quadrantCounts = document.getElementById('quadrant-counts');
function drawQuadrants(model){
  quadrantLines.replaceChildren();
  quadrantCounts.hidden=!quadrantOption.checked;
  if(!quadrantOption.checked)return;
  const x=xScale(model.mx), y=yScale(model.my);
  const style={stroke:'#687e83','stroke-dasharray':'5 5','stroke-width':2};
  quadrantLines.append(
    svg('line',{x1:x,x2:x,y1:22,y2:412,...style}),
    svg('line',{x1:62,x2:828,y1:y,y2:y,...style}));
  label(quadrantLines,x,452,'X̄');
  label(quadrantLines,55,y+5,'Ȳ','end');
  [[828,22],[62,22],[62,412],[828,412]].forEach(([edgeX,edgeY],i)=>{
    label(quadrantLines,(edgeX+x)/2,(edgeY+y)/2,i+1);
  });
  const n=[0,0,0,0];
  let onLines=0;
  for(const [px,py] of points){
    const dx=px-model.mx, dy=py-model.my;
    if(Math.abs(dx)<=1e-10*Math.max(1,Math.abs(px),Math.abs(model.mx)) ||
       Math.abs(dy)<=1e-10*Math.max(1,Math.abs(py),Math.abs(model.my)))onLines++;
    else n[dx>0?(dy>0?0:3):(dy>0?1:2)]++;
  }
  quadrantCounts.textContent=n.map((count,i)=>'第 '+(i+1)+' 象限 '+count+' 筆').join('｜')+'｜落在平均線上 '+onLines+' 筆';

}
const fmt = number => Number.isFinite(number) ? number.toFixed(4) : '—';
function render(){
  const full = fit(points);
  drawQuadrants(full);
  const removed = fit(points.filter((_,i)=>i!==selected));
  const [x,y] = points[selected], yhat = full.predict(x), e=y-yhat;
  const h=1/points.length+(x-full.mx)**2/full.xx;
  const cook=e**2*h/(2*full.mse*(1-h)**2);
  for(const [id,model] of [['line',full],['without',removed]]){
    const el=document.getElementById(id);
    line(el,xScale(bounds.xmin),yScale(model.predict(bounds.xmin)),xScale(bounds.xmax),yScale(model.predict(bounds.xmax)));
  }
  line(document.getElementById('residual'),xScale(x),yScale(y),xScale(x),yScale(yhat));
  circles.forEach((node,i)=>{
    node.setAttribute('cx',xScale(points[i][0]));
    node.setAttribute('cy',yScale(points[i][1]));
    node.setAttribute('fill',i===selected?'#b94723':'#286d79');
    node.setAttribute('aria-label','第 '+(i+1)+' 筆，X '+points[i][0].toFixed(1)+'，Y '+points[i][1].toFixed(1));
  });
  selectPoint.value=selected;
  metrics.replaceChildren(...[
    ['Pearson r',full.r],['全部點斜率',full.slope],['刪除該點後斜率',removed.slope],
    ['預測值 ŷ',yhat],['殘差 e',e],['槓桿值 h',h],['Cook 距離',cook]
  ].map(([key,value])=>{
    const node=document.createElement('div'), strong=document.createElement('strong');
    strong.textContent=fmt(value);
    node.append(key,strong);
    return node;
  }));
}
function move(x,y){
  points[selected]=[
    Math.max(bounds.xmin,Math.min(bounds.xmax,x)),
    Math.max(bounds.ymin,Math.min(bounds.ymax,y))
  ];
  render();
}
chart.addEventListener('pointerdown',event=>{
  if(!event.target.matches('.point')||pointer!==null)return;
  selected=Number(event.target.dataset.index);
  pointer=event.pointerId;
  chart.setPointerCapture(pointer);
  render();
});
chart.addEventListener('pointermove',event=>{
  if(event.pointerId!==pointer)return;
  const p=new DOMPoint(event.clientX,event.clientY).matrixTransform(chart.getScreenCTM().inverse());
  move(bounds.xmin+(p.x-bounds.x0)/bounds.width*(bounds.xmax-bounds.xmin),
    bounds.ymax-(p.y-bounds.y0)/bounds.height*(bounds.ymax-bounds.ymin));
});
chart.addEventListener('lostpointercapture',()=>{pointer=null;});
chart.addEventListener('keydown',event=>{
  const delta={ArrowLeft:[-0.5,0],ArrowRight:[0.5,0],ArrowDown:[0,-0.5],ArrowUp:[0,0.5]}[event.key];
  if(!delta||!event.target.matches('.point'))return;
  event.preventDefault();
  selected=Number(event.target.dataset.index);
  move(points[selected][0]+delta[0],points[selected][1]+delta[1]);
});
quadrantOption.onchange=render;
selectPoint.onchange=()=>{selected=Number(selectPoint.value);render();};
document.getElementById('reset').onclick=()=>{points=original.map(p=>[...p]);selected=1;render();};
render();
