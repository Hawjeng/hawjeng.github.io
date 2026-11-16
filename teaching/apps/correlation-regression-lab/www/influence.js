'use strict';
const original = [[4.0, 66.0], [27.0, 87.0], [18.0, 83.0], [7.0, 73.0], [30.0, 84.0], [12.0, 82.0], [18.0, 74.0], [23.0, 79.0], [19.0, 76.0], [12.0, 76.0]];
const chart = document.getElementById('scatter');
const selectPoint = document.getElementById('point');
const metrics = document.getElementById('metrics');
const originalBounds = {x0: 62, y0: 22, width: 766, height: 390, xmin: -5, xmax: 40, ymin: 48, ymax: 112};
let bounds = {...originalBounds};
let points = original.map(point => [...point]);
let selected = 1;
let pointer = null;
const rightEdge = () => bounds.x0+bounds.width;
const bottomEdge = () => bounds.y0+bounds.height;
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
  return {mx,my,xx,yy,slope,intercept,predict,mse,r:xy/Math.sqrt(xx*yy)};
}
const axis = document.getElementById('axis');
const zx = document.getElementById('zx');
const zy = document.getElementById('zy');
const equationOption = document.getElementById('equation');
const equationText = document.getElementById('equation-text');
const equationOverlay = document.getElementById('equation-overlay');
function configureBounds(model,sx,sy) {
  bounds={...originalBounds};
  if(zx.checked&&zy.checked&&sx>0&&sy>0){
    const range=points.flatMap(([x,y])=>[(x-model.mx)/sx,(y-model.my)/sy]);
    const min=Math.min(...range,0), max=Math.max(...range,0), pad=(max-min)*.15;
    bounds.x0=250;
    bounds.width=bounds.height;
    bounds.xmin=model.mx+(min-pad)*sx;
    bounds.xmax=model.mx+(max+pad)*sx;
    bounds.ymin=model.my+(min-pad)*sy;
    bounds.ymax=model.my+(max+pad)*sy;
  }
  const clip=chart.querySelector('#plot-area rect');
  for(const [key,value] of Object.entries({x:bounds.x0,y:bounds.y0,width:bounds.width,height:bounds.height}))clip.setAttribute(key,value);
}
function placeEquation(label,r2){
  const texts=[...equationOverlay.querySelectorAll('text')];
  const rect=equationOverlay.querySelector('rect');
  texts[0].textContent=label;
  texts[1].textContent=r2;
  const w=Math.max(...texts.map(text=>text.getComputedTextLength()))+22, h=49;
  const [left,right,top,bottom]=[bounds.x0+36,rightEdge()-24-w,bounds.y0+32,bottomEdge()-27-h];
  const candidates=[[right,top],[left,top],[right,bottom],[left,bottom]];
  const count=([x,y])=>points.filter(([px,py])=>xScale(px)>=x-9&&xScale(px)<=x+w+9&&yScale(py)>=y-9&&yScale(py)<=y+h+9).length;
  const [x,y]=candidates.reduce((best,next)=>count(next)<count(best)?next:best);
  for(const [key,value] of Object.entries({x,y,width:w,height:h}))rect.setAttribute(key,value);
  texts.forEach((text,i)=>{text.setAttribute('x',x+11);text.setAttribute('y',y+19+20*i);});
}

function zTicks(min,max,center,spread){
  if(!Number.isFinite(spread)||spread<=0)return [];
  const ticks=[];
  const first=Math.ceil(2*(min-center)/spread), last=Math.floor(2*(max-center)/spread);
  const stride=Math.max(1,Math.ceil((last-first+1)/80));
  if(!Number.isFinite(stride))return [];
  for(let half=Math.ceil(first/stride)*stride;half<=last;half+=stride)ticks.push([center+spread*half/2,half/2]);
  return ticks;
}
function renderAxes(model, sx, sy) {
  axis.replaceChildren();
  const xticks=zx.checked?zTicks(bounds.xmin,bounds.xmax,model.mx,sx):Array.from({length:9},(_,i)=>[5*i,5*i]);
  const yticks=zy.checked?zTicks(bounds.ymin,bounds.ymax,model.my,sy):Array.from({length:7},(_,i)=>[50+10*i,50+10*i]);
  xticks.forEach(([x,tick])=>{
    axis.append(svg('line',{x1:xScale(x),x2:xScale(x),y1:bounds.y0,y2:bottomEdge(),stroke:'#d4e4e6'}));
    label(axis,xScale(x),435,tick);
  });
  yticks.forEach(([y,tick])=>{
    axis.append(svg('line',{x1:bounds.x0,x2:rightEdge(),y1:yScale(y),y2:yScale(y),stroke:'#d4e4e6'}));
    if(yticks.length<=19||Number.isInteger(tick))label(axis,bounds.x0-11,yScale(y)+5,tick,'end');
  });
  label(axis,445,469,zx.checked ? '認真程度 zₓ' : '認真程度 X');
  label(axis,bounds.x0+4,17,zy.checked ? '考試成績 zᵧ' : '考試成績 Y','start');
}
const circles = original.map((_,i)=>{
  const node = svg('circle',{r:8,tabindex:0,class:'point','data-index':i,role:'button'});
  const option = new Option('第 '+(i+1)+' 筆',i);
  selectPoint.add(option);
  document.getElementById('points').append(node);
  return node;
});
const quadrantOption = document.getElementById('quadrants');
const quadrantLines = document.getElementById('quadrant-lines');
const quadrantShading = document.getElementById('quadrant-shading');
const quadrantCounts = document.getElementById('quadrant-counts');
const meanIntersection = document.getElementById('mean-intersection');
const meanPair = document.getElementById('mean-pair');
const meanLabel = document.getElementById('mean-label');
const meanOption = document.getElementById('show-mean');
function drawMean(model) {
  const visibility=meanOption.checked?'visible':'hidden';
  meanPair.hidden=!meanOption.checked;
  meanIntersection.setAttribute('visibility',visibility);
  meanLabel.setAttribute('visibility',visibility);
  if(!meanOption.checked)return;
  const x=xScale(model.mx), y=yScale(model.my);
  const pair='('+(zx.checked?'0':fmt(model.mx))+', '+(zy.checked?'0':fmt(model.my))+')';
  meanIntersection.setAttribute('cx',x);
  meanIntersection.setAttribute('cy',y);
  meanLabel.setAttribute('x',x+11);
  meanLabel.setAttribute('y',y-9);
  meanLabel.textContent=pair;
  meanPair.textContent='平均線交點 '+pair+
    (zx.checked||zy.checked?'｜原始平均數 ('+fmt(model.mx)+', '+fmt(model.my)+')':'');
}
const pointPalette=['#147684','#a64b22','#6953a0','#35663d','#626d77'];
function quadrantOf(px,py,model){
  const dx=px-model.mx,dy=py-model.my;
  if(Math.abs(dx)<=1e-10*Math.max(1,Math.abs(px),Math.abs(model.mx)) ||
     Math.abs(dy)<=1e-10*Math.max(1,Math.abs(py),Math.abs(model.my)))return 4;
  return dx>0?(dy>0?0:3):(dy>0?1:2);
}
function drawQuadrants(model){
  quadrantLines.replaceChildren();
  quadrantShading.replaceChildren();
  quadrantCounts.hidden=!quadrantOption.checked;
  if(!quadrantOption.checked)return;
  const x=xScale(model.mx), y=yScale(model.my);
  const mint='#e8f4f1', sand='#f6f0e7';
  quadrantShading.append(
    svg('rect',{x,y:bounds.y0,width:rightEdge()-x,height:y-bounds.y0,fill:mint}),
    svg('rect',{x:bounds.x0,y:bounds.y0,width:x-bounds.x0,height:y-bounds.y0,fill:sand}),
    svg('rect',{x:bounds.x0,y,width:x-bounds.x0,height:bottomEdge()-y,fill:mint}),
    svg('rect',{x,y,width:rightEdge()-x,height:bottomEdge()-y,fill:sand}));
  const style={stroke:'#687e83','stroke-dasharray':'5 5','stroke-width':2};
  quadrantLines.append(
    svg('line',{x1:x,x2:x,y1:bounds.y0,y2:bottomEdge(),...style}),
    svg('line',{x1:bounds.x0,x2:rightEdge(),y1:y,y2:y,...style}));
  label(quadrantLines,x,452,'X̄');
  label(quadrantLines,bounds.x0-27,y+5,'Ȳ','end');
  [[rightEdge()-19,45],[bounds.x0+19,45],[bounds.x0+19,398],[rightEdge()-19,398]].forEach(([cornerX,cornerY],i)=>{
    label(quadrantLines,cornerX,cornerY,'Q'+(i+1));
  });
  const n=[0,0,0,0,0];
  points.forEach(([px,py])=>n[quadrantOf(px,py,model)]++);
  const text=n.map((count,i)=>(i===4?'落在平均線上':'第 '+(i+1)+' 象限')+' '+count+' 筆');
  quadrantCounts.replaceChildren(...text.map((label,i)=>{
    const item=document.createElement('span');
    item.textContent='● '+label;
    item.style.color=pointPalette[i];
    return item;
  }));
}
const fmt = number => Number.isFinite(number) ? (Math.abs(number)<.00005?0:number).toFixed(4) : '—';
function render(){
  const full = fit(points);
  const sx=Math.sqrt(full.xx/(points.length-1));
  const sy=Math.sqrt(full.yy/(points.length-1));
  configureBounds(full,sx,sy);
  renderAxes(full,sx,sy);
  drawQuadrants(full);
  drawMean(full);
  equationText.hidden=!equationOption.checked;
  equationOverlay.setAttribute('visibility',equationOption.checked?'visible':'hidden');
  if(equationOption.checked){
    const slope=full.slope*(zx.checked?sx:1)/(zy.checked?sy:1);
    const intercept=(full.intercept+(zx.checked?full.slope*full.mx:0)-(zy.checked?full.my:0))/(zy.checked?sy:1);
    const label=(zy.checked?'ẑᵧ':'ŷ')+' = '+fmt(intercept)+
      (slope<0?' − ':' + ')+fmt(Math.abs(slope))+' × '+(zx.checked?'zₓ':'X');
    const r2='R² = '+fmt(full.r**2);
    equationText.textContent='迴歸方程式｜'+label+'｜'+r2;
    placeEquation(label,r2);
  }
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
    node.setAttribute('fill',quadrantOption.checked?pointPalette[quadrantOf(...points[i],full)]:'#147684');
    node.setAttribute('stroke',i===selected?'#17283c':'#fff');
    node.setAttribute('stroke-width',i===selected?3:1);
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
    Math.max(originalBounds.xmin,Math.min(originalBounds.xmax,x)),
    Math.max(originalBounds.ymin,Math.min(originalBounds.ymax,y))
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
meanOption.onchange=quadrantOption.onchange=equationOption.onchange=zx.onchange=zy.onchange=render;
selectPoint.onchange=()=>{selected=Number(selectPoint.value);render();};
document.getElementById('download-chart').onclick=()=>{
  const copy=chart.cloneNode(true);
  copy.setAttribute('xmlns','http://www.w3.org/2000/svg');
  copy.setAttribute('width','860');
  copy.setAttribute('height','485');
  copy.setAttribute('font-family','Microsoft JhengHei, Arial, sans-serif');
  copy.setAttribute('font-size','15');
  copy.setAttribute('fill','#173b44');
  copy.prepend(svg('rect',{x:0,y:0,width:860,height:485,fill:'#f5f9f9',rx:8}));
  const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copy)],{type:'image/svg+xml'}));
  const link=document.createElement('a');
  link.href=url;
  link.download='regression-influence.svg';
  link.click();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
};
document.getElementById('reset').onclick=()=>{points=original.map(p=>[...p]);selected=1;render();};
render();
