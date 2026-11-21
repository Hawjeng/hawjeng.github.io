"use strict";

const surveyImageFont='"Microsoft JhengHei","PingFang TC","Noto Sans CJK TC",sans-serif';
const surveyColors=["#187887","#c45e30","#5759a2","#28834f","#9d4574","#8e681c",
  "#3276b9","#99443e","#63752b","#664487","#147c69","#5b6471"];

function surveyImageRows(result) {
  return Array.from(result.querySelector("table").rows,row=>Array.from(row.cells,cell=>cell.textContent));
}

function surveyImageContext(canvas,width,height) {
  canvas.width=width*2;
  canvas.height=height*2;
  const ctx=canvas.getContext("2d");
  ctx.scale(2,2);
  ctx.fillStyle="#fff";
  ctx.fillRect(0,0,width,height);
  ctx.fillStyle="#17343f";
  ctx.font="15px "+surveyImageFont;
  return ctx;
}

function drawSurveyChart(result) {
  const [header,...body]=surveyImageRows(result);
  const series=Number(result.dataset.series);
  const labels=header.slice(1,1+series);
  const groups=body.slice(0,-1);
  const width=Math.max(540,68+groups.length*Math.max(70,series*13));
  const legendColumns=Math.floor((width-48)/115);
  const legendHeight=series?25*Math.ceil(series/legendColumns):0;
  const height=308+legendHeight;
  const canvas=result.querySelector("canvas");
  canvas.style.minWidth=Math.max(320,width*.72)+"px";
  const ctx=surveyImageContext(canvas,width,height);
  ctx.fillText(result.dataset.context,20,26);
  const left=56, top=59, bottom=249, plotWidth=width-left-18;
  const tickSize=Math.ceil(Number(result.dataset.max)/4);
  const axisMax=4*tickSize;
  ctx.fillText("次數",20,49);
  ctx.textAlign="right";
  for(let i=0;i<=4;i++) {
    const y=bottom-i*(bottom-top)/4;
    ctx.fillStyle=i===0?"#78929b":"#dce8ec";
    ctx.fillRect(left,y,plotWidth,1);
    ctx.fillStyle="#17343f";
    ctx.fillText(i*tickSize,left-7,y+4);
  }
  const groupWidth=plotWidth/groups.length;
  const barsPerGroup=Math.max(1,series);
  const barGap=Math.min(60,groupWidth*.82/barsPerGroup);
  const barWidth=barGap*.78;
  ctx.textAlign="center";
  groups.forEach(([category,...values],i)=>{
    const center=left+(i+.5)*groupWidth;
    values.slice(0,barsPerGroup).forEach((value,j)=>{
      const barHeight=Number(value)/axisMax*(bottom-top);
      const x=center+(j-(barsPerGroup-1)/2)*barGap;
      ctx.fillStyle=surveyColors[j];
      ctx.fillRect(x-barWidth/2,bottom-barHeight,barWidth,barHeight);
      if (barGap>=28) {
        ctx.fillStyle="#17343f";
        ctx.fillText(value,x,bottom-barHeight-6);
      }
    });
    ctx.fillStyle="#17343f";
    ctx.fillText(category,center,bottom+23);
  });
  ctx.fillText(header[0],left+plotWidth/2,bottom+47);
  ctx.textAlign="left";
  labels.forEach((label,i)=>{
    const x=24+(i%legendColumns)*115, y=313+Math.floor(i/legendColumns)*25;
    ctx.fillStyle=surveyColors[i];
    ctx.fillRect(x,y-11,13,13);
    ctx.fillStyle="#17343f";
    ctx.fillText(label,x+19,y);
  });
}

function drawSurveyTable(result) {
  const canvas=document.createElement("canvas");
  const rows=surveyImageRows(result);
  const measure=canvas.getContext("2d");
  measure.font="bold 15px "+surveyImageFont;
  const widths=rows[0].map((_,i)=>Math.max(56,...rows.map(row=>Math.ceil(measure.measureText(row[i]).width)+28)));
  const context=result.dataset.context;
  const width=Math.max(410,total(widths)+40,Math.ceil(measure.measureText(context).width)+40);
  const scale=(width-40)/total(widths);
  const ctx=surveyImageContext(canvas,width,96+rows.length*34);
  const title=result.querySelector("h3").textContent;
  ctx.font="bold 19px "+surveyImageFont;
  ctx.fillText(title,20,29);
  ctx.font="15px "+surveyImageFont;
  ctx.fillText(context,20,53);
  rows.forEach((row,i)=>{
    let x=20;
    const y=72+i*34;
    const emphasized=i===0||i===rows.length-1;
    ctx.fillStyle=emphasized?"#e1eef1":i%2===0?"#f4f8f9":"#fff";
    ctx.fillRect(x,y,width-40,34);
    ctx.fillStyle="#17343f";
    ctx.font=(emphasized?"bold ":"")+"15px "+surveyImageFont;
    row.forEach((value,j)=>{
      ctx.fillText(value,x+14,y+22);
      x+=widths[j]*scale;
    });
  });
  return canvas;
}

function downloadSurveyImage(button) {
  const result=button.closest(".survey-results");
  const chart=button.dataset.surveyPng==="chart";
  const canvas=chart?result.querySelector("canvas"):drawSurveyTable(result);
  const title=chart?"次數長條圖":result.querySelector("h3").textContent;
  canvas.toBlob(blob=>{
    if (!blob) {
      $("survey-sample").textContent="圖片下載失敗，請再試一次。";
      return;
    }
    const url=URL.createObjectURL(blob);
    const link=document.createElement("a");
    link.href=url;
    link.download=title+"-"+result.dataset.context.replaceAll("｜","-")+".png";
    link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  },"image/png");
}
