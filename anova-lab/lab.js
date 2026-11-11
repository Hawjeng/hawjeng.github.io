'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const f=v=>v===null||Number.isNaN(v)||v===undefined?'—':v===Infinity?'∞':Math.abs(v)>=10000?v.toExponential(3):Number(v.toFixed(4)).toString();
const p=v=>v==null?'—':v<.0001?'< .0001':v.toFixed(4).replace(/^0/,'');
const data=globalThis.LAB_DATA;
const tabs=[['theory','原理說明'],['book','課本範例'],['survey','調查研究'],['exercise','習作詳解'],['manual','自行輸入'],['r-code','R 與 Python 語法'],['downloads','下載與來源']];
const options=(xs)=>xs.map(([v,n])=>'<option value="'+esc(v)+'">'+esc(n)+'</option>').join('');
const field=(id,title,inner)=>'<label>'+title+'<select id="'+id+'">'+inner+'</select></label>';
const alpha=()=>field('alpha','顯著水準 α',options([['.05','0.05'],['.01','0.01'],['.10','0.10']]));
const table=(heads,rows,cap='',hit=()=>false)=>'<div class="table"><table>'+(cap?'<caption>'+esc(cap)+'</caption>':'')+'<thead><tr>'+heads.map(x=>'<th scope="col">'+esc(x)+'</th>').join('')+'</tr></thead><tbody>'+rows.map((r,i)=>'<tr>'+r.map((x,j)=>'<td'+(hit(i,j)?' class="hit"':'')+'>'+esc(x)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
const card=(s)=>'<div class="card">'+s+'</div>';
const heading=s=>'<h2 id="section-title">'+s+'</h2>';
const csv=(h,r)=>[h,...r].map(row=>row.map(x=>'"'+String(x).replace(/"/g,'""')+'"').join(',')).join('\n');
function save(name,body,type,bom=true){
 let u=URL.createObjectURL(new Blob([bom?'\ufeff':'',body],{type})),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);
}
let fChartSerial=0;
function fchart(d,e,obs,lo,hi,tail='right',a=upper(hi,d,e)*(tail==='both'?2:1)){
 const X=Math.max(hi*1.24,critical(d,e,.015),obs===Infinity?0:Math.min(obs*1.06,hi*4));
 const x=v=>48+v/X*598, dx=X/260;
 const grid=Array.from({length:260},(_,i)=>(i+.35)*dx);
 const max=Math.max(...grid.map(v=>density(v,d,e)))*1.07;
 const y=v=>143-111*density(Math.max(dx*.35,v),d,e)/max;
 const path=(a,b)=>{
  a=Math.max(0,a);b=Math.min(X,b);if(a>=b)return '';
  return 'M'+x(a)+',143 '+[a,...grid.filter(v=>v>a&&v<b),b].map(v=>'L'+x(v)+','+y(v)).join(' ')+' L'+x(b)+',143Z';
 };
 const line=(v,color)=>v<=X&&v>=0?'<path d="M'+x(v)+' 143V27" stroke="'+color+'" stroke-dasharray="5 4" stroke-width="2"/>':'';
 let rr=tail==='both'?[[0,lo],[hi,X]]:[[hi,X]],pp;
 if(tail==='both'){
   let left=lower(obs,d,e)<=upper(obs,d,e);
   pp=left?[[0,obs],[critical(d,e,lower(obs,d,e)),X]]:[[0,1/critical(e,d,upper(obs,d,e))],[obs,X]];
 }else pp=[[obs,X]];
 const hatch='f-p-tail-'+(++fChartSerial);
 const fill=(regions,color,opacity)=>regions.map(([a,b])=>'<path d="'+path(a,b)+'" fill="'+color+'" opacity="'+opacity+'"/>').join('');
 const mode=d<=2?0:((d-2)/d)*(e/(e+2));
 const peakX=x(mode), peakY=y(mode);
 // Keep the entire label between the critical boundaries and below the curve.
 const labelHalf=Math.min(46,(x(hi)-x(lo))*.43);
 const labelX=Math.max(x(lo)+labelHalf,Math.min(x(hi)-labelHalf,peakX));
 const labelTop=Math.max(y((labelX-labelHalf-48)*X/598),y((labelX+labelHalf-48)*X/598));
 const labelY=143-Math.max(3,(143-labelTop)*.33);
 const labelSize=Math.min(13,labelHalf/3.5,Math.max(5,(143-labelTop)*.6));
 const pValue=tail==='both'?Math.min(1,2*Math.min(lower(obs,d,e),upper(obs,d,e))):upper(obs,d,e);
 return '<figure><svg viewBox="0 0 680 207" role="img" aria-label="H₀ 下的 F 分配、α 拒絕域與 p 值尾域">'+
  '<defs><pattern id="'+hatch+'" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><path d="M0 0V5" stroke="#2265a5" stroke-width="2"/></pattern></defs>'+
  fill(rr,'#eb9b43',.52)+fill(pp,'#397dcc',.20)+fill(pp,'url(#'+hatch+')',1)+
  '<path d="M48 143H646" stroke="#657f82"/><polyline fill="none" stroke="#255661" stroke-width="2" points="'+grid.map(v=>x(v)+','+y(v)).join(' ')+'"/>'+
  line(hi,'#a24a14')+(lo>0?line(lo,'#a24a14'):'')+line(obs,'#4c3c86')+
  '<text x="'+peakX+'" y="'+(peakY-7)+'" text-anchor="'+(mode===0?'start':'middle')+'" font-size="14" font-weight="bold" fill="#255661">H₀</text>'+
  Array.from({length:6},(_,i)=>'<text x="'+x(i*X/5)+'" y="163" text-anchor="middle" font-size="12">'+f(i*X/5)+'</text>').join('')+
  '<text x="'+labelX+'" y="'+labelY+'" text-anchor="middle" font-size="'+labelSize+'" font-weight="bold" fill="#255661">1 − α = '+f(1-a)+'</text>'+
  '<text x="'+((x(hi)+646)/2)+'" y="16" text-anchor="middle" font-size="13" fill="#a24a14">'+(lo?'每尾 α/2 = '+f(a/2):'α = '+f(a))+'</text>'+
  '<text x="48" y="190" font-size="13" fill="#a24a14">Fcv('+d+', '+e+') = '+(lo?f(lo)+' / ':'')+f(hi)+'</text>'+
  '<text x="646" y="190" text-anchor="end" font-size="13" fill="#4c3c86">Fobt = '+f(obs)+'</text></svg>'+
  '<figcaption>H₀ 下的 F('+d+', '+e+') 分配。<strong style="color:#a24a14">橙色底：α 拒絕域</strong>；<strong style="color:#2265a5">藍色斜線：p 值尾域（p '+(pValue<.0001?'':'= ')+esc(p(pValue))+'）</strong>。'+(obs>X?' Fobt 超出圖域。':'')+'</figcaption></figure>';
}
const formatCI=value=>Number.isFinite(value)?value.toFixed(2):f(value);
function profile({as,bs,M,ci,groups=false}){
 let extent=ci?[...M.flat(),...ci.flat(2)]:M.flat();
 let min=Math.min(...extent),max=Math.max(...extent),pad=(max-min||1)*.17;
 const width=groups?Math.max(320,64+bs.length*72):670;
 const bottom=groups?174:206, right=groups?width-12:620;
 const axisSize=groups?14:11, groupSize=groups?15:12, meanSize=groups?15:11;
 let x=j=>groups?55+(j+.5)*(right-55)/bs.length:78+j*514/Math.max(1,bs.length-1);
 const step=Math.max(1,Math.ceil((max-min+2*pad)/4));
 const lower=Math.floor((min-pad)/step)*step;
 const upper=Math.ceil((max+pad)/step)*step;
 const ticks=Array.from({length:Math.round((upper-lower)/step)+1},(_,i)=>lower+i*step);
 let y=v=>bottom-(v-lower)/(upper-lower)*(groups?150:163);
 const col=['#266b80','#a44827','#5c518f','#367343','#81651a','#a04271'];
 const point=(i,j)=>x(j)+(ci&&as.length>1?((i/(as.length-1))-.5)*Math.min(24,200/(bs.length-1)):0);
 return '<h3>'+(groups?'各組平均數圖':'細格平均數圖')+(ci?'｜95% 信賴區間':'')+'</h3><figure><div class="profile-chart"><svg '+(groups?'style="width:'+width+'px" ':'')+'viewBox="0 0 '+width+' '+(bottom+44)+'" role="img" aria-label="'+(ci?'各細格平均數與 95% 信賴區間':'各細格平均數示意圖，無信賴區間')+'">'+
 ticks.map(v=>{return '<path d="M55 '+y(v)+'H'+right+'" stroke="#d5e3e1"/><text x="50" y="'+(y(v)+4)+'" text-anchor="end" font-size="'+axisSize+'">'+f(v)+'</text>';}).join('')+
 bs.map((v,j)=>'<text x="'+x(j)+'" y="'+(bottom+24)+'" text-anchor="middle" font-size="'+groupSize+'">'+esc(v)+'</text>').join('')+
 M.map((r,i)=>{
  const color=col[i%6];
  return (groups?'':'<polyline fill="none" stroke="'+color+'" stroke-width="2.5" stroke-dasharray="'+(i%2?'6 3':'none')+'" points="'+r.map((v,j)=>point(i,j)+','+y(v)).join(' ')+'"/>')+
   r.map((v,j)=>{
    const X=point(i,j),Y=y(v),lim=ci?.[i]?.[j],tip=(groups?'':as[i]+' × ')+bs[j]+'：平均數 '+f(v)+(lim?'；95% CI ['+lim.map(formatCI).join(', ')+']':'');
    const near=M.some((other,k)=>k!==i&&Math.abs(y(other[j])-Y)<18);
    const offset=near?(i%2?15:-9):-9;
    const bars=lim?'<path d="M'+X+' '+y(lim[0])+'V'+y(lim[1])+' M'+(X-4)+' '+y(lim[0])+'h8 M'+(X-4)+' '+y(lim[1])+'h8" fill="none" stroke="'+color+'" stroke-width="1.5"/>':'';
    return '<g><title>'+esc(tip)+'</title>'+bars+'<circle cx="'+X+'" cy="'+Y+'" r="4" fill="'+color+'"/><text class="plot-label" x="'+X+'" y="'+(Y+offset)+'" fill="'+color+'" text-anchor="middle" font-size="'+meanSize+'" font-weight="700">'+f(v)+'</text></g>';
   }).join('');
 }).join('')+
 '</svg></div><figcaption>'+(groups?'點旁數字為各組平均數；誤差線是未校正的 95% t 信賴區間。相依資料的區間描述各條件平均，並非配對差值的區間。</figcaption></figure>':as.map((v,i)=>'<strong style="color:'+col[i%6]+'">● '+esc(v)+'</strong>').join('　')+
 (ci?'。點旁數字為細格平均數，誤差線為各細格未校正的 95% t 信賴區間：平均數 ± t × s／√n。相依設計的誤差線不是配對差值的區間；不可依區間是否重疊判定交互作用。':'。點旁數字為示意平均數；原資料未提供細格樣本數與變異，無法估計 95% CI。')+'</figcaption></figure>')+
 (ci?'<details><summary>查看平均數與 95% CI 數值</summary>'+table([...(groups?['組別']:['A 水準','B 水準']),'平均數','95% CI 下限','95% CI 上限'],M.flatMap((row,i)=>row.map((v,j)=>[...(groups?[bs[j]]:[as[i],bs[j]]),f(v),...ci[i][j].map(formatCI)])))+'</details>':'');
}
const decision=(pv,a)=>pv==null?'無法檢定':pv<a?'達顯著':'未達顯著';
function apaResult(zh,en,stat,pv,alpha,adjustment='',effectSize=null){
 if(pv==null)return '<p>'+esc(zh)+'無法檢定。</p><p lang="en">'+esc(en)+' could not be tested.</p>';
 const decimal=value=>value.toFixed(3).replace(/^0/,'');
 const significant=pv<alpha;
 const statistics=stat+', <i>p</i> '+(pv<.0001?'&lt; .0001':'= '+p(pv))+
  (effectSize==null?'':', η<sub>p</sub>² = '+decimal(effectSize));
 const method=adjustment?'（'+adjustment+' 校正）':'';
 const methodEn=adjustment?' ('+adjustment+'-adjusted <i>p</i>)':'';
 return '<p>'+esc(zh)+(significant?'達統計顯著':'未達統計顯著')+'，'+statistics+method+'。</p>'+
  '<p lang="en">'+esc(en)+(significant?' was statistically significant, ':' was not statistically significant, ')+statistics+methodEn+'.</p>';
}
function apaF(df1,df2,value){
 return '<i>F</i>('+df1+', '+df2+') = '+(Number.isFinite(value)?value.toFixed(2):f(value));
}
const englishGroups={
 水瓶座:'Aquarius',雙魚座:'Pisces',牡羊座:'Aries',金牛座:'Taurus',
 雙子座:'Gemini',巨蟹座:'Cancer',獅子座:'Leo',處女座:'Virgo',
 天秤座:'Libra',天蠍座:'Scorpio',射手座:'Sagittarius',摩羯座:'Capricorn',
 日常:'usual activity',慢跑:'jogging',有氧:'aerobic exercise',男性:'men',女性:'women'
};
function comparisons(res,a){
 if(!res.pairs?.length)return '';
 const effect=res.terms.find(z=>z.err);
 const paired=res.terms.some(z=>z.name==='受試者／區組');
 const comparisonP=pair=>paired?pair.adj:pair.scheffe;
 const pMethod=paired?'Holm 校正後':'Scheffé 檢定的';
 const labels=res.desc.map(([name])=>name);
 const englishLabels=labels.map((label,i)=>Object.hasOwn(englishGroups,label)?englishGroups[label]:
  /\p{Script=Han}/u.test(label)?(paired?'Condition ':'Group ')+(i+1):label);
 const englishPairs=englishLabels.flatMap((first,i)=>englishLabels.slice(i+1).map(second=>first+' and '+second));
 const rows=labels.map((label,i)=>[label,...labels.map((_,j)=>{
  if(j>=i)return j===i?'—':'';
  const pairIndex=j*(2*labels.length-j-1)/2+i-j-1;
  const pair=res.pairs[pairIndex];
  const pv=comparisonP(pair);
  return f(-pair.delta)+(pv!=null&&pv<a?'*':'')+' ('+p(pv)+')';
 })]);
 const df=res.pairs[0].df;
 const method=paired?'採配對 t 檢定。df = 配對數 − 1 = '+df+'。':
  '採 Scheffé 檢定。分母自由度 = 總樣本數 − 組數 = '+df+'。';
 return '<h3>'+(res.pairs.length===1?'兩組平均數比較':'多重比較｜平均差矩陣')+'</h3>'+
  table(['組/格',...labels],rows)+
  '<p class="note">平均差為列組平均數減欄組平均數。括號內為 '+pMethod+' p 值。* 表示該 p 值 &lt; '+f(a)+'。'+method+'</p>'+
  (effect.p==null||effect.p>=a?'<p class="note">整體 F 未達顯著或無法檢定。矩陣結果供教學或探索。</p>':'')
  +'<details><summary>各組比較的中英文 APA 報告</summary>'+res.pairs.map((pair,i)=>{
   const magnitude=Math.sqrt(pair.f);
   const t=pair.delta<0?-magnitude:magnitude;
   return apaResult(pair.name+' 的平均數差異','The mean difference between '+englishPairs[i],
    paired?'<i>t</i>('+pair.df+') = '+(Number.isFinite(t)?t.toFixed(2):f(t)):apaF(effect.df,pair.df,pair.f/effect.df),comparisonP(pair),a,paired?'Holm':'Scheffé');
  }).join('')+'</details>';
}
function simpleEffects(res,a){
 if(!res.slices?.length)return '';
 let t=res.terms.filter(z=>z.err).at(-1),m=res.slices.length;
 let rows=(zs,adjust)=>zs.map(z=>{
  let pv=adjust==='holm'?z.adj:z.p==null?null:Math.min(1,z.p*m);
  return [z.name,z.design,f(z.delta),f(z.s),z.err,z.df,z.df2,f(z.f),p(z.p),p(pv),decision(pv,a)];
 });
 let heads=['固定條件下的效果','設計','平均差（兩水準）','SS','誤差項','df₁','df₂','F','原始 p'];
 return '<h3>單純主要效果</h3><p>固定 A 的每個水準檢驗 B，再固定 B 的每個水準檢驗 A。兩水準時列出前者減後者的平均差；三個以上水準的 F 只回答是否至少一組不同。</p>'+
 (t.p==null||t.p>=a?'<p class="note">整體交互作用未達顯著或無法檢定；以下結果供教學或探索，不能因一個切片顯著而另一個不顯著就斷言存在交互作用。</p>':'')+
 '<p><strong>課本做法：</strong>使用整體設計相應的共用誤差項；將 '+m+' 項切片檢定當成同一族系，單次顯著水準為 α／'+m+' = '+f(a/m)+'（等價於用校正 p 與 α 比較）。</p>'+
 table([...heads,'Bonferroni p','判定'],rows(res.sharedSlices,'bonf'),'共用誤差項｜Bonferroni 校正')+
 '<details><summary>單純主要效果的中英文 APA 報告</summary>'+res.sharedSlices.map(z=>apaResult(z.name+' 的單純主要效果','The simple main effect ('+z.name+')',apaF(z.df,z.df2,z.f),z.p==null?null:Math.min(1,z.p*m),a,'Bonferroni')).join('')+'</details>'+
 '<details><summary>對照：各切片重估誤差與 Holm 校正</summary><p>此方法在各切片內重估誤差均方，因此與課本共用誤差的 F 值可能不同。</p>'+
 table([...heads,'Holm p','判定'],rows(res.slices,'holm'),'各切片重估誤差｜Holm 校正')+res.slices.map(z=>apaResult(z.name+' 的單純主要效果','The simple main effect ('+z.name+')',apaF(z.df,z.df2,z.f),z.adj,a,'Holm')).join('')+'</details>';
}
function sumsOfSquares(res){
 const tests=res.terms.filter(z=>z.err);
 let ssDetail='';
 if(tests.length===1&&tests[0].name==='組間'){
  const N=res.desc.reduce((acc,r)=>acc+r[1],0),k=res.desc.length;
  const grand=res.desc.reduce((acc,r)=>acc+r[1]*r[2],0)/N;
  const groups=res.desc.map(([name,n,mean,v])=>[name,n,f(mean),f(v),f(n*(mean-grand)**2),f((n-1)*v)]);
  ssDetail='<p>加權總平均 Ȳ = Σ(nᵢ × Ȳᵢ)／N = '+f(grand)+'；N = '+N+'，k = '+k+'。各組對平方和的貢獻如下：</p>'+
   table(['組別','nᵢ','Ȳᵢ','sᵢ²','nᵢ(Ȳᵢ − Ȳ)²','(nᵢ − 1)sᵢ²'],groups,'組間與組內平方和的計算')+
   '<p>逐欄加總：SS 組間 = '+f(tests[0].s)+'，SS 組內 = '+f(res.terms[1].s)+'。SS<sub>t</sub> = SS<sub>b</sub> + SS<sub>w</sub> ≈ '+f(tests[0].s)+' + '+f(res.terms[1].s)+' ≈ '+f(res.terms.at(-1).s)+'。</p>'+
   '<h4>自由度（df）的計算</h4><ul><li>組間 df₁ = k − 1 = '+k+' − 1 = '+(k-1)+'。</li>'+
   '<li>組內 df₂ = N − k = '+N+' − '+k+' = '+(N-k)+'。</li>'+
   '<li>全體 df = N − 1 = '+N+' − 1 = '+(N-1)+'。</li></ul><p>df<sub>t</sub> = df<sub>b</sub> + df<sub>w</sub> = '+(k-1)+' + '+(N-k)+' = '+(N-1)+'。</p>';
 }else{
  ssDetail=table(['變異來源','平方和（SS）','自由度（df）'],res.terms.map(z=>[z.name,f(z.s),z.df]));
 }
 return '<h3>平方和（SS）與自由度（df）</h3>'+ssDetail;
}
function fSteps(res,a){
 return res.terms.filter(z=>z.err).map((z,i)=>{
  let err=res.terms.find(x=>x.name===z.err);
  let h0=res.profile?(i===2?'A × B 無交互作用':esc(z.name)+'各水準的母體邊際平均數相等'):'各組／條件的母體平均數相等';
  let calc='<p><strong>H₀：</strong>'+h0+'。在 H₀ 下，使用 F('+z.df+', '+z.df2+') 分配。</p>'+
   '<ol><li>效果均方 = SS／df₁ = '+f(z.s)+'／'+z.df+' ≈ '+f(z.ms)+'。</li>'+
   '<li>'+esc(z.err)+'均方 = SS／df₂ = '+f(err.s)+'／'+z.df2+' ≈ '+f(err.ms)+'。</li>'+
   '<li>F<sub>obt</sub> = MS<sub>效果</sub>／MS<sub>誤差</sub> ≈ '+f(z.ms)+'／'+f(err.ms)+' → '+f(z.f)+'（以未四捨五入的均方計算）。</li>'+
   '<li>右尾臨界值 F<sub>CV</sub>('+z.df+', '+z.df2+') = '+f(z.crit)+'，α = '+f(a)+'；p '+(z.p!=null&&z.p<.0001?'':'= ')+esc(p(z.p))+'。'+(z.p==null?'無法判定。':z.p<a?'拒絕 H₀。':'不拒絕 H₀。')+'</li></ol>';
  return '<details'+(i===0?' open':'')+'><summary>'+esc(z.name)+'｜計算步驟</summary>'+calc+'</details>';
 }).join('');
}
function show(res,a){
 const summaries=res.desc.map(([name,n,mean,variance])=>{
  const sd=Math.sqrt(variance),se=sd/Math.sqrt(n);
  const margin=Math.sqrt(critical(1,n-1,.05))*se;
  return {name,n,mean,sd,se,ci:[mean-margin,mean+margin]};
 });
 const desc=table(['組/格','n','平均數','SD','SE','95% CI'],
  summaries.map(({name,n,mean,sd,se,ci})=>[name,n,f(mean),f(sd),f(se),'['+ci.map(formatCI).join(', ')+']']),'敘述統計');
 const plot=res.profile?profile(res.profile):profile({groups:true,as:[''],bs:summaries.map(r=>r.name),M:[summaries.map(r=>r.mean)],ci:[summaries.map(r=>r.ci)]});
 const overview='<div class="descriptive-layout"><div class="descriptive-summary">'+desc+'</div><div class="descriptive-plot">'+plot+'</div></div>';
 if(res.ratio){
  let z=res.ratio;
  const [first,second]=res.desc.map(([name])=>name);
  const ratioCases=[
   ['A／B','右尾',z.f,z.d,z.e,upper(z.f,z.d,z.e),q=>critical(z.d,z.e,q)],
   ['B／A','左尾',1/z.f,z.e,z.d,lower(1/z.f,z.e,z.d),q=>1/critical(z.d,z.e,q)]
  ];
  const caseRows=ratioCases.flatMap(([order,tail,obs,df1,df2,prob,cutoff])=>[a,a/2].map(q=>
   [order,tail,f(q),df1,df2,f(obs),p(prob),f(cutoff(q)),prob<q?'拒絕 H₀':'不拒絕 H₀']));
  const caseTable=table(['變異數比','尾端','每尾水準','df₁','df₂','F','單尾 p','臨界值','判定'],caseRows,'課本的四欄比較')+
   '<p>每尾水準 α 用於方向性單尾檢定。每尾水準 α／2 用於雙尾檢定，表中的 B／A 左尾臨界值取倒數後，即為 A／B 雙尾檢定的左尾臨界值。</p>';
  return overview+'<h3>F 檢定</h3>'+caseTable+'<h4>A／B 的雙尾檢定</h4><p class="note">F('+z.d+', '+z.e+') = '+f(z.f)+'，雙尾 p '+(z.p<.0001?'':'= ')+esc(p(z.p))+'；'+(z.p<a?'拒絕':'未拒絕')+'兩母體變異數相等。雙尾臨界值：'+f(z.lo)+'、'+f(z.hi)+'。</p>'+fchart(z.d,z.e,z.f,z.lo,z.hi,'both')+
   apaResult(first+' 與 '+second+' 的變異數差異（雙尾）','The difference in variances between '+first+' and '+second+' (two-tailed)',apaF(z.d,z.e,z.f),z.p,a)+
   apaResult(first+' 的變異數大於 '+second+' 的方向性檢定','The one-tailed test for greater variance in '+first+' than in '+second,apaF(z.d,z.e,z.f),upper(z.f,z.d,z.e),a);
 }
 const tested=res.terms.filter(t=>t.err);
 const interpretation=tested.map((z,i)=>{
  const zh=res.profile?(i===2?'A × B 交互作用':z.name+' 的主要效果'):'各組或條件的平均數差異';
  const en=res.profile?(i===2?'The A × B interaction':'The main effect of factor '+(i===0?'A':'B')):'The overall difference among the means';
  return apaResult(zh,en,apaF(z.df,z.df2,z.f),z.p,a,'',z.eta);
 }).join('');
 const summary=table(['變異來源','SS','df','MS','F','p','F 臨界值','偏 η²'],
  res.terms.map(z=>[z.name==='組內誤差'?'組內（誤差）':z.name,f(z.s),z.df,f(z.ms),f(z.f),p(z.p),f(z.crit),f(z.eta)]),'變異數分析摘要表');
 let html=overview;
 if(res.profile)html+=table(['A 水準',...res.profile.bs,'A 邊際平均'],[...res.profile.M.map((r,i)=>[res.profile.as[i],...r.map(f),f(avg(r))]),['B 邊際平均',...res.profile.bs.map((_,j)=>f(avg(res.profile.M.map(r=>r[j])))),f(avg(res.profile.M.flat()))]],'細格與邊際平均');
 html+=(res.methodNote??'')+sumsOfSquares(res)+'<h3>F 檢定</h3>'+fSteps(res,a)+interpretation+summary;
 const plottable=tested.filter(z=>z.p!=null);
 if(plottable.length)html+='<h3>F 分配圖</h3>'+plottable.map((z,i)=>
  '<details'+(i===0?' open':'')+'><summary>'+esc(z.name)+'｜F 分配圖</summary>'+
  fchart(z.df,z.df2,z.f,0,z.crit,'right',a)+'</details>').join('');
 html+=comparisons(res,a)+simpleEffects(res,a);
 return html;
}
function safe(out,fn){try{out.innerHTML=fn();}catch(e){out.innerHTML='<p class="warning" role="alert">'+esc(e.message)+'</p>';}}
const sketches=[[[5,3,2],[1,2,5]],[[5,4.5,2],[4.5,1.5,1]],[[5,4,3],[1,2,2.5]]];
const concepts=[
 ['F 分配與查表','F 是兩個獨立的卡方量各除以其自由度後的比值，取值非負，分配形狀取決於分子 df₁ 與分母 df₂。下方表格的欄是 df₁，列是 df₂，交會處為右尾面積 α 對應的 F 臨界值。ANOVA 只看右尾；檢驗兩母體變異數是否相等時，雙尾各用 α／2，左尾臨界值可交換自由度後取倒數。','F = MS效果 ÷ MS誤差'],
 ['單因子｜獨立組','不同受試者各屬一組。虛無假設為各組母體平均相等。把總變異拆成組間與組內，按組樣本數計算加權平均。拒絕虛無假設只能說至少有一組不同。假設為觀測獨立、殘差近似常態且各組等變異。','SS全體 = SS組間 + SS組內；df = (k−1, N−k)'],
 ['單因子｜相依／區組','同一人接受所有條件，或在每個區組內配對。先拆出受試者或區組差異，再用剩下的受試者 × 條件變異作分母。三個以上條件的未校正 F 需考慮球面性；兩條件時 F 等於配對 t 的平方。','SS全體 = SS條件 + SS受試者 + SS殘差'],
 ['二因子｜完全獨立','每位受試者只屬一個 A×B 細格。A、B 與 A×B 共用細格內誤差。交互作用檢驗的是 A 的差異會不會隨 B 的水準而改變；交互作用顯著時，優先解讀細格平均與單純主要效果。','SS全體 = SSA + SSB + SSA×B + SS細格內'],
 ['二因子｜混合','A 是受試者間因子，B 是同一受試者反覆測量的條件。A 用組內受試者差異當分母；B 與 A×B 用 B×受試者（A 內）當分母。重複條件多於兩個時須評估球面性。','A：MS受試者（A 內）；B、A×B：MSB×受試者（A 內）'],
 ['二因子｜完全相依','每位受試者完成全部 A×B 組合。可用各效果對應的受試者交互作用作分母；課本另示範把三項殘差合併，需額外假定它們可共用同一誤差均方。兩法可能得出不同結論。','A：MSA×受試者；B：MSB×受試者；A×B：MSA×B×受試者']
];
const models=[
 null,
 ['Y<sub>ij</sub> = μ + α<sub>i</sub> + ε<sub>ij</sub>','i 是組別，j 是組內觀測。μ 是總體截距，αᵢ 是第 i 組的固定效果，εᵢⱼ 是組內誤差。H₀：μ₁＝⋯＝μₖ。','SS<sub>A</sub> = ∑ n<sub>i</sub>(Ȳ<sub>i·</sub> − Ȳ<sub>··</sub>)²；SS<sub>W</sub> = ∑∑(Y<sub>ij</sub> − Ȳ<sub>i·</sub>)²','F = MS<sub>A</sub> / MS<sub>W</sub>；df = (k−1, N−k)。'],
 ['Y<sub>ij</sub> = μ + α<sub>i</sub> + π<sub>j</sub> + ε<sub>ij</sub>','i 是條件，j 是受試者或區組；πⱼ 是受試者或區組效果。從觀測值扣掉條件平均與個人平均，再加回總平均，即為殘差。','SS<sub>T</sub> = SS<sub>A</sub> + SS<sub>P</sub> + SS<sub>R</sub>','F = MS<sub>A</sub> / MS<sub>R</sub>；df = (k−1, (k−1)(n−1))。同一人重複測量不能當成獨立觀測。'],
 ['Y<sub>ijk</sub> = μ + α<sub>i</sub> + β<sub>j</sub> + (αβ)<sub>ij</sub> + ε<sub>ijk</sub>','i、j 是 A、B 的水準，k 是細格內觀測。αᵢ 和 βⱼ 表示邊際平均的偏差；(αβ)ᵢⱼ 是細格平均扣除兩個邊際平均後加回總平均的偏差。','SS<sub>T</sub> = SS<sub>A</sub> + SS<sub>B</sub> + SS<sub>A×B</sub> + SS<sub>W</sub>','三項效果各用自己的 MS 作分子，細格內 MS 作共同分母。平衡設計有 a×b 個細格，每格 n 人，誤差 df = ab(n−1)。'],
 ['Y<sub>ijk</sub> = μ + α<sub>i</sub> + β<sub>j</sub> + (αβ)<sub>ij</sub> + π<sub>k(i)</sub> + ε<sub>ijk</sub>','A 是獨立因子，B 是重複因子；πₖ₍ᵢ₎ 是巢套在 A 組內的受試者效果。εᵢⱼₖ 是受試者在 B 各條件中的剩餘變異，即 B×受試者（A 內）。','SS<sub>T</sub> = SS<sub>A</sub> + SS<sub>P(A)</sub> + SS<sub>B</sub> + SS<sub>A×B</sub> + SS<sub>B×P(A)</sub>','A 的分母是 MS<sub>P(A)</sub>；B 與 A×B 的分母是 MS<sub>B×P(A)</sub>。若每個 A 組有 n 人，兩種誤差 df 分別為 a(n−1) 與 a(n−1)(b−1)。'],
 ['Y<sub>ijk</sub> = μ + α<sub>i</sub> + β<sub>j</sub> + (αβ)<sub>ij</sub> + π<sub>k</sub> + (απ)<sub>ik</sub> + (βπ)<sub>jk</sub> + (αβπ)<sub>ijk</sub>','所有受試者都接受 A×B 的全部組合。πₖ 是受試者效果；最後三項表示各效果在受試者之間的變異。','SS<sub>R</sub> = SS<sub>A×P</sub> + SS<sub>B×P</sub> + SS<sub>A×B×P</sub>','分開估計時，A、B、A×B 各用對應受試者交互作用的 MS；課本的合併法使用 MS<sub>R</sub> = SS<sub>R</sub> / [(ab−1)(n−1)]。須能合理假定三項誤差可合併。']
];
const tutorialExamples=()=>'<div class="card"><h3>多重比較：整體顯著後，找出哪些平均數不同</h3><p>整體 F 的 H₀ 是所有母體平均相等。拒絕 H₀ 後，還要靠對比或兩兩比較找出差異。若有 k 組，所有兩兩比較共有 k(k−1)/2 項；重複使用 .05 會提高至少犯一次第一類錯誤的機率。</p>'+
 '<p><strong>事前比較：</strong>先依研究假設指定對比 L = ∑ cᵢμᵢ，且 ∑ cᵢ = 0，例如有氧組對照其他兩組的平均。若一族有 m 個檢定，Bonferroni 將單次 α 設為 α/m；Holm 按 p 值由小到大，依序比較 α/m、α/(m−1)⋯，首次未通過就停止拒絕。</p>'+
 '<p><strong>事後比較：</strong>Fisher LSD 在整體 F 顯著後，以共同組內均方比較兩組，但不另校正每一對；Tukey HSD 以學生化全距控制所有兩兩比較，不等樣本數用 Tukey–Kramer；Scheffé 可同時檢定所有線性對比，不限兩兩比較。相依資料應用配對差值或符合設計的誤差項。</p>'+
 '<span class="math model">t<sub>ij</sub> = (Ȳ<sub>i</sub> − Ȳ<sub>j</sub>) / √[MS<sub>W</sub>(1/n<sub>i</sub> + 1/n<sub>j</sub>)]；F<sub>Scheffé</sub> = t<sub>ij</sub>² / (k−1)</span>'+
 '<div id="theory-pairs"></div></div>'+
 '<div class="card"><h3>單純主要效果：在特定條件下比較</h3><p>主要效果比較的是跨另一因子水準的<strong>邊際平均數</strong>。交互作用檢驗一個因子的效果是否隨另一因子的水準改變。若 A×B 達顯著，先看細格平均與平均數圖，再考驗單純主要效果。例如固定 B 在 b₁，比較 μₐ₁ᵦ₁、μₐ₂ᵦ₁；再固定 A 在 a₁，檢驗 B 的各水準。</p>'+
 '<span class="math model">SS<sub>A∣B=j</sub> = n ∑<sub>i</sub>(Ȳ<sub>ij·</sub> − Ȳ<sub>·j·</sub>)²；F<sub>A∣B=j</sub> = [SS<sub>A∣B=j</sub>/(a−1)] / MS<sub>誤差</sub></span>'+
 '<p>若 A 有 a 個水準、B 有 b 個水準，兩個方向全部檢驗共 a+b 項。課本以相應的整體誤差均方作分母：完全獨立用細格內均方；混合設計中，獨立因子的切片用細格內均方，相依因子的切片用受試者內殘差；完全相依用合併殘差。三個以上水準的單純效果達顯著後，可再對該切片內的水準作多重比較，並事先界定校正族系。</p>'+
 '<p class="note">判讀順序：整體交互作用 → 觀察平均數與方向 → 單純主要效果 → 必要時才做切片內的兩兩比較。某切片顯著、另一切片不顯著，不能取代對交互作用本身的檢定。</p>'+
 '<div id="theory-slices"></div></div>';
function updateTutorial(a){
 let one=data.items.find(z=>z.title==='運動型態（獨立分組）');
 let ro=compute(one.model,one.headers,one.rows,a),F=ro.terms[0];
 let tw=data.items.find(z=>z.title==='時段 × 運動型態');
 let rt=compute(tw.model,tw.headers,tw.rows,a),interaction=rt.terms[2];
 let summary=(r)=>'F('+r.df+', '+r.df2+') = '+f(r.f)+'，p = '+esc(p(r.p))+'。';
 $('theory-pairs').innerHTML='<h4>課本範例｜運動型態與睡眠時數</h4><p>整體 '+summary(F)+' 以 α = .05 比較，LSD 將有氧與日常、有氧與慢跑兩對判為顯著；Holm 與 Scheffé 都只保留有氧與日常的差異。</p>'+
 comparisons(ro,a)+table(['兩兩比較','Tukey HSD p'],[['日常 − 慢跑','0.7151'],['日常 − 有氧','0.0140'],['慢跑 − 有氧','0.0846']],'同一範例的 Tukey HSD（R 計算）');
 $('theory-slices').innerHTML='<h4>課本範例｜時段 × 運動型態</h4><p>整體交互作用 '+summary(interaction)+' 在 α = .05 下，五項切片各以 .01 為門檻：夜晚的運動型態差異顯著，白天不顯著；日常與有氧組的白天與夜晚有差異，慢跑組未通過校正門檻。</p>'+
 simpleEffects(rt,a);
}
function theory(){
 const overview='<h3>變異數分析的原理</h3>'+
  '<p>變異數分析（ANOVA）要回答的是：各組平均數的差距，相對於同組觀測值的波動，是否大到難以用隨機誤差解釋？以運動型態與睡眠時數為例，日常、慢跑、有氧三組的平均睡眠時數可能不同，但每組內的人也不會睡一樣久。因此，我們比較組間的變異與組內的變異。</p>'+
  '<p>先將總變異拆成模型效果與誤差，再把各項平方和（SS）除以對應自由度（df），得到均方（MS）。F 是效果均方除以對應的誤差均方。在虛無假設成立時，兩個均方估計同一個誤差量；若 F 大到超過右尾臨界值，就拒絕虛無假設。整體 F 顯著只表示至少有一組平均數不同，仍須用多重比較找出差異。</p>'+
  '<h3>一般線性模型（GLM）公式與解讀</h3>'+
  '<p>等號左邊的 Y 是一次觀測值；右邊的 μ 是整體基準，αᵢ、βⱼ 分別是因子 A、B 的水準效果，(αβ)ᵢⱼ 是交互作用，π 是受試者或區組效果，ε 是該設計的剩餘誤差。αᵢ 的下標表示因子水準，與顯著水準 α 不同。</p>'+
  '<dl class="glm-overview">'+models.slice(1).map(([formula,notation,decomp,denom],i)=>{
   const notes=[
    '例如每人只參加一種運動，εᵢⱼ 是該人的睡眠時數與所屬組平均的差。',
    '例如同一人接受多種運動條件，πⱼ 表示這個人平時睡得較長或較短；扣除這個差異後，才比較條件。',
    '例如運動與時段各自分派給不同人；交互作用問的是「運動組之間的差距，是否因時段而改變？」',
    '例如每人只屬於一個運動組，但同一人測量白天和夜晚。πₖ₍ᵢ₎ 的括號表示第 k 位受試者隸屬於 A 的第 i 組。',
    '例如每人都體驗所有運動與時段的組合。三個含 π 的交互作用項，分別描述 A、B、A×B 的效果在人與人之間如何變動。'
   ];
   return '<dt>'+concepts[i+1][0]+'</dt><dd><span class="math model">'+formula+'</span><p>'+notation+'</p><p>'+notes[i]+'</p><span class="math model">'+decomp+'</span><p><strong>F 檢定：</strong>'+denom+'</p></dd>';
  }).join('')+'</dl>';
 return heading('原理說明')+card(overview+'<h3>各設計的判讀重點</h3>'+concepts.map(([t,b,m],i)=>'<details'+(!i?' open':'')+'><summary>'+t+'</summary><p>'+b+'</p><span class="math">'+m+'</span></details>').join('')+
 card('<details><summary>比較交互作用的型態</summary><p>切換課本示意圖或有原始觀測值的實際案例，觀察線條交叉或差距改變。示意圖只顯示平均數；實際案例也顯示 95% CI。</p><label for="sketch">示意圖：</label><select id="sketch">'+options([['actual','實際案例｜時段 × 運動型態（含 95% CI）'],...sketches.map((_,i)=>[i,'示意圖 '+(i+1)])])+'</select><div id="sketch-out"></div></details>')+
 '<p class="muted">本教材使用傳統未校正 F，不代做球面性或等變異檢查。實際研究應先檢查設計及殘差；違反球面性時，可考慮 Greenhouse–Geisser 校正或混合模型。</p>')+
 '<div class="grid"><div class="card controls"><h3>F 分配與查表</h3>'+alpha()+'<label>分子自由度 df₁<input id="d1" type="number" value="3" min="1" max="1000" step="1"></label><label>分母自由度 df₂<input id="d2" type="number" value="18" min="1" max="10000" step="1"></label><label>觀察 F<input id="obs" type="number" value="8.99" min="0" max="10000000" step="any"></label>'+field('tail','用途',options([['right','右尾｜ANOVA'],['both','雙尾｜變異數比']]))+'</div><div class="card" id="f-out" aria-live="polite"></div></div>'+tutorialExamples();
}
function theoryUpdate(){safe($('f-out'),()=>{
 let d=+$('d1').value,e=+$('d2').value,obs=+$('obs').value,a=+$('alpha').value,tail=$('tail').value;
 check($('obs').value!==''&&Number.isFinite(obs)&&obs>=0&&obs<=1e7&&Number.isInteger(d)&&d>=1&&d<=1000&&Number.isInteger(e)&&e>=1&&e<=10000,'請輸入有效的非負 F 和正整數自由度。');
 let q=tail==='both'?a/2:a,hi=critical(d,e,q),lo=tail==='both'?1/critical(e,d,q):0,pv=tail==='both'?Math.min(1,2*Math.min(lower(obs,d,e),upper(obs,d,e))):upper(obs,d,e);
 let ds=unique([1,2,3,4,5,6,8,10,d]).sort((a,b)=>a-b),es=unique([1,2,3,4,5,6,8,10,12,15,20,30,60,120,e]).sort((a,b)=>a-b);
 return '<p class="note">F('+d+', '+e+')：觀察值 '+f(obs)+'，p '+(pv<.0001?'':'= ')+esc(p(pv))+'；'+(lo?'左界 '+f(lo)+'，':'')+'右界 '+f(hi)+'。</p>'+fchart(d,e,obs,lo,hi,tail)+table(['df₂ ＼ df₁',...ds],es.map(y=>[y,...ds.map(x=>f(critical(x,y,q)))]),'F 右尾臨界值表｜右尾面積 '+q,(i,j)=>es[i]===e&&ds[j-1]===d);
 });}
const exercises='<details><summary>辨識獨立與相依設計</summary>'+table(['情境','因子 → 依變數','設計與樣本數','事後比較'],[
 ['直營與加盟','店別 → 口味好感','獨立；每組 50，100 人','兩組不需'],
 ['三種婚育狀態','婚育狀態 → 食安重視','獨立；每組 8，24 人','三組整體顯著後比較'],
 ['大一至大四','年級 → 簡報能力','相依；每年 50，50 人、200 筆','四條件整體顯著後比較'],
 ['訓練前後','時間 → 顧客抱怨','相依；每次 25，25 人、50 筆','兩條件不需']])+'</details>'+
 '<details><summary>辨識二因子設計</summary><p>四題均檢驗 A、B 與 A×B。細格數是兩因子水準的乘積；邊際平均數的個數是兩因子水準數的總和。</p>'+table(['情境','水準與設計','細格數與每格 n','邊際平均數個數與觀測數'],[
 ['婚育 × 性別（個別訪問）','3×2，完全獨立','6 格，各 10','5 個：婚育各 20；性別各 30'],
 ['婚育 × 性別（成對訪問）','3×2，混合；以對為區組','6 格，各 10','5 個：婚育各 20 筆；性別各 30 筆'],
 ['性別 × 年級','2×4，混合；年級相依','8 格：男每格 20、女每格 30','6 個：性別 80／120 筆；年級各 50 筆'],
 ['片型 × 片長','2×2，完全相依','4 格，各 10','4 個，各 20 筆；同一批 10 人']])+'<p>性別 × 年級的樣本數不平衡；本教材的二因子計算器只支援平衡設計。</p></details>';
function examples(kind){
 let items=data.items.filter(x=>x.kind===kind);
 return heading(kind==='book'?'課本範例':'習作詳解')+(kind==='exercise'?card(exercises+'<p>下方可查看計算題的完整摘要表、判讀及事後比較。</p>'):'')+
 '<div class="grid"><div class="card controls">'+field('case','選擇案例',options(items.map((x,i)=>[i,x.title])))+alpha()+'<div id="case-notes"></div><div id="pool-control"></div></div><div class="card" id="results" aria-live="polite"></div></div>';
}
function exampleUpdate(kind,change=true){
 let z=data.items.filter(x=>x.kind===kind)[+$('case').value],a=+$('alpha').value;
 if(change){
  $('case-notes').innerHTML='<p class="note">'+esc(labels[z.model])+'</p><p>'+esc(z.note)+'</p><p class="muted">資料：'+esc(z.source)+'</p><a href="downloads/'+z.file+'" download>下載案例 CSV</a> · <a href="#r-code/'+data.items.indexOf(z)+'">查看此案例的 R 與 Python 語法</a>';
  $('pool-control').innerHTML=z.model==='within'?'<div class="check"><label><input type="checkbox" id="pool" '+(kind==='book'?'checked':'')+'> 採用課本的合併殘差</label></div>':'';
  $('pool')?.addEventListener('change',()=>exampleUpdate(kind,false));
 }
 safe($('results'),()=>{
  let r=compute(z.model,z.headers,z.rows,a,$('pool')?.checked),extra='';
  if(kind==='exercise'&&z.title.includes('辯論')){
    let models=data.items.filter(x=>x.kind==='exercise'&&x.title.includes('辯論'));
    extra='<h3>比較獨立與區組分析</h3>'+table(['設計','F','df₁','df₂','p'],models.map(x=>{let t=compute(x.model,x.headers,x.rows,a).terms[0];return [labels[x.model],f(t.f),t.df,t.df2,p(t.p)]}))+'<p>校別平均不變；相依模型把辯次差異拆出，誤差均方和自由度都會改變。是否配對應依競賽安排決定。</p>';
  }
  if(kind==='exercise'&&z.title.includes('咖啡')){
    let models=data.items.filter(x=>x.kind==='exercise'&&x.title.includes('咖啡'));
    extra='<h3>比較三種咖啡實驗安排</h3>'+table(['設計','效果','F','df₁','df₂','p'],models.flatMap(x=>compute(x.model,x.headers,x.rows,a,$('pool')?.checked).terms.slice(0,3).map(t=>[labels[x.model],t.name,f(t.f),t.df,t.df2,p(t.p)])))+'<p>完全獨立用了 20 人；混合用了 10 人，各人只在一種溫度下評兩種容量；完全相依用了 5 人，每人評四種組合。分數雖相同，三種安排的誤差項不同。</p>';
  }
  return '<h3>'+esc(z.title)+'</h3>'+show(r,a)+extra+'<details><summary>展開原始觀測值</summary>'+table(z.headers,z.rows)+'</details>';
 });
}
function refreshSurveyGroups(variable,first,second,container,rebuildOptions=true){
 const prior=second.value;
 if(rebuildOptions){
  const alternatives=(globalThis.SURVEY_FACTORIAL[variable]??[]).filter(z=>z.factors.includes(first)).map(z=>z.factors.find(x=>x!==first));
  second.innerHTML=options([['','無（單因子）'],...alternatives.map(x=>[x,x])]);
  if(alternatives.includes(prior))second.value=prior;
 }
 const factors=second.value?[first,second.value]:[first];
 container.innerHTML=factors.map((factor,i)=>'<fieldset><legend>'+esc(factor)+'</legend>'+
  data.survey[variable][factor].map(([name,n])=>'<label><input type="checkbox" data-axis="'+i+'" value="'+esc(name)+'" checked> '+esc(name)+(factors.length===1?'（n='+n+'）':'')+'</label>').join('')+'</fieldset>').join('');
}
function selectedSurvey(variable,first,second,container){
 const selected=i=>new Set([...container.querySelectorAll('input[data-axis="'+i+'"]:checked')].map(el=>el.value));
 const a=selected(0), b=selected(1);
 if(!second)return {rows:data.survey[variable][first].filter(([g])=>a.has(g))};
 const z=globalThis.SURVEY_FACTORIAL[variable].find(z=>z.factors.includes(first)&&z.factors.includes(second));
 const cells=(z.factors[0]===first?z.cells:z.cells.map(([x,y,...r])=>[y,x,...r])).filter(([x,y])=>a.has(x)&&b.has(y));
 return {cells,names:[first,second]};
}
function survey(){
 const vars=Object.keys(data.survey);
 return heading('調查研究')+'<p>以 '+data.surveyN+' 筆問卷的公開分組摘要，探索星座、性別、手機或上網方案與數值變項的關係。</p><div class="grid survey-layout"><details class="card controls survey-controls" open><summary>分析設定</summary><div class="survey-fields">'+
 field('variable','結果變項',options(vars.map(v=>[v,v])))+field('group','分組因子 A',options(Object.keys(data.survey[vars[0]]).map(v=>[v,v])))+field('group-b','分組因子 B（選填）','')+alpha()+
 '<p>第二因子只列出交叉細格皆至少 5 人的組合。</p><h3>納入組別</h3><div id="survey-groups" class="check"></div><p><a href="#r-code/survey">前往調查研究 R 與 Python 語法</a></p></div></details><div class="card" id="results" aria-live="polite"></div></div><p class="note">這是觀察性調查。分析排除所選變項或因子缺失的資料，保留 0；群組差異不能解釋為因果效果。</p>';
}
function surveyUpdate(rebuild=false,rebuildOptions=true){
 const variable=$('variable').value,first=$('group').value, second=$('group-b'),groups=$('survey-groups'), a=+$('alpha').value;
 if(rebuild)refreshSurveyGroups(variable,first,second,groups,rebuildOptions);
 safe($('results'),()=>{
  const z=selectedSurvey(variable,first,second.value,groups);
  return z.cells?show(factorialSummary(z.cells,z.names,a),a):show(oneSummary(z.rows,a),a);
 });
}
function parse(s){
 let lines=s.trim().split(/\r?\n/).filter(x=>x.trim()),sep=lines[0]?.includes('\t')?'\t':',';
 function split(l){if(sep==='\t')return l.split(sep).map(x=>x.trim());
  let out=[],x='',quoted=false;for(let i=0;i<l.length;i++){let c=l[i];if(c==='"'){if(quoted&&l[i+1]==='"'){x+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){out.push(x.trim());x='';}else x+=c;}check(!quoted,'CSV 引號未閉合。');out.push(x.trim());return out;
 }
 check(lines.length>=3&&lines.length<=5001,'請輸入欄名及 2–5,000 筆資料。');
 return lines.map(split);
}
function manual(){
 return heading('自行輸入')+'<div class="grid"><div class="card controls">'+field('model','選擇設計',options(Object.entries(labels)))+alpha()+
 '<div class="check" id="pool-control" hidden><label><input id="pool" type="checkbox"> 採用課本的合併殘差</label></div><p id="format" class="note"></p><button id="sample" type="button">帶入可編輯範例</button>'+
 '</div><div class="card"><label for="paste"><strong>貼上 CSV 或 Excel 的表格</strong></label><textarea id="paste" spellcheck="false"></textarea><div class="inline"><button class="primary" id="run">計算 ANOVA／F 檢定</button><button id="export">下載目前資料</button></div><p class="muted">資料在此瀏覽器計算，不會上傳。相依資料不得缺格；二因子計算限平衡設計。</p></div></div><div id="results" class="card" aria-live="polite"></div>';
}
const formats={ratio:'組別,數值。第一個出現的組別作分子，只能有兩組。',one:'組別,數值。每列是一筆獨立觀測。',repeat:'受試者,條件1,條件2,…。每人一列。',two:'A 因子,B 因子,數值。每列一位獨立受試者。',mixed:'A 組別,受試者,B 條件1,B 條件2,…。每人一列，ID 必須唯一。',within:'受試者,A 因子,B 因子,數值。每人每個細格各一列。'};
function readManual(){
 let m=$('model').value,[h,...rows]=parse($('paste').value),len={ratio:2,one:2,two:3,within:4}[m],start={ratio:1,one:1,two:2,within:3,repeat:1,mixed:2}[m];
 check(h.length<=24&&h.every(Boolean)&&unique(h).length===h.length&&(len?h.length===len:h.length>=start+2),'欄位數或欄名不合規則，請參考該設計的範例。');
 rows=rows.map((r,i)=>{check(r.length===h.length&&r.every(Boolean),'第 '+(i+2)+' 列欄數不符或有空白。');
 return r.map((v,j)=>{if(j<start)return v;let n=Number(v);check(Number.isFinite(n)&&Math.abs(n)<=1e100,'第 '+(i+2)+' 列有無效數值。');return n;});});
 return {m,h,rows};
}
function runManual(){safe($('results'),()=>{let {m,h,rows}=readManual(),a=+$('alpha').value;return show(compute(m,h,rows,a,$('pool').checked),a);});}
function sample(){let m=$('model').value,z=data.items.find(x=>x.model===m);$('paste').value=csv(z.headers,z.rows);runManual();}
function rCode(){
 let vars=Object.keys(data.survey), groups=Object.keys(data.survey[vars[0]]);
 return heading('R 與 Python 語法')+'<p>選擇案例或調查組別，即可用同一份資料執行兩種語法。先列 R（不需安裝套件），再列 Python（需安裝 NumPy 和 SciPy）。</p>'+
 '<div class="grid"><div class="card controls">'+field('r-type','資料類型',options([['book','課本範例'],['exercise','習作計算題'],['survey','調查研究']]))+
 '<div id="r-cases">'+field('r-case','案例',options(data.items.map((z,i)=>[i,z.title])))+'</div>'+
 '<div id="r-survey" hidden>'+field('r-variable','結果變項',options(vars.map(x=>[x,x])))+
 field('r-group','分組因子 A',options(groups.map(x=>[x,x])))+field('r-group-b','分組因子 B（選填）','')+'<h3>納入組別</h3><div id="r-groups" class="check"></div></div>'+
 alpha()+'<div class="check" id="r-pool-control" hidden><label><input id="r-pool" type="checkbox"> 採用課本的合併殘差</label></div></div>'+
 '<div><section class="card"><h3>R</h3><div class="inline"><button class="primary" id="r-copy" type="button">複製 R 語法</button><button id="r-download" type="button">下載 .R</button></div><p id="r-status" role="status"></p><label for="r-output"><strong>可執行的 R 程式</strong></label><textarea id="r-output" rows="20" readonly spellcheck="false"></textarea></section><section class="card"><h3>Python</h3><div class="inline"><button class="primary" id="py-copy" type="button">複製 Python 語法</button><button id="py-download" type="button">下載 .py</button></div><p id="py-status" role="status"></p><label for="py-output"><strong>可執行的 Python 程式</strong></label><textarea id="py-output" rows="20" readonly spellcheck="false"></textarea></section></div></div>';
}
function mountR(caseIndex){
 const kind=$('r-type'), index=$('r-case'), out=$('r-output'), status=$('r-status'), pick=$('r-groups');
 const py=$('py-output'), pyStatus=$('py-status');
 function update(){
  let a=+$('alpha').value, z=data.items[+index.value];
  pyStatus.textContent='';
  status.textContent='';
  if(kind.value==='survey'){
   let variable=$('r-variable').value, group=$('r-group').value;
   const z=selectedSurvey(variable,group,$('r-group-b').value,pick);
   if(z.cells){
    const valid=unique(z.cells.map(r=>r[0])).length>=2&&unique(z.cells.map(r=>r[1])).length>=2;
    const scripts=valid?factorialScripts(z.cells,z.names,a):{r:'',py:''};
    out.value=scripts.r;py.value=scripts.py;
   }else{
    out.value=z.rows.length<2?'':rSurvey(variable,group,z.rows,a);
    py.value=z.rows.length<2?'':pythonSurvey(variable,group,z.rows,a);
   }
   if(!out.value)status.textContent='請為每個因子至少選擇兩個水準。';
  }else{
   $('r-pool-control').hidden=z.model!=='within';
   out.value=rCase(z,a,$('r-pool').checked);
   py.value=pythonCase(z,a,$('r-pool').checked);
  }
  $('r-copy').disabled=$('r-download').disabled=!out.value;
  $('py-copy').disabled=$('py-download').disabled=!py.value;
 }
 function surveyGroups(rebuildOptions=true){
  refreshSurveyGroups($('r-variable').value,$('r-group').value,$('r-group-b'),pick,rebuildOptions);
  update();
 }
 function changeCase(){
  const z=data.items[+index.value];
  $('r-pool').checked=z.model==='within'&&z.kind==='book';update();
 }
 function changeType(preselect){
  const survey=kind.value==='survey';
  $('r-cases').hidden=survey;
  $('r-survey').hidden=!survey;
  if(survey){$('r-pool-control').hidden=true;surveyGroups();return;}
  index.innerHTML=options(data.items.flatMap((z,i)=>z.kind===kind.value?[[i,z.title]]:[]));
  if(data.items[preselect]?.kind===kind.value)index.value=preselect;
  changeCase();
 }
$('r-variable').value='手機遊戲成癮';
 if(caseIndex==='survey')kind.value='survey';
 else if(caseIndex!==undefined&&data.items[+caseIndex])kind.value=data.items[+caseIndex].kind;
 changeType(caseIndex);
 kind.onchange=()=>changeType();
 index.onchange=changeCase;
 $('r-variable').onchange=$('r-group').onchange=()=>surveyGroups();
 $('r-group-b').onchange=()=>surveyGroups(false);
 pick.onchange=$('alpha').onchange=$('r-pool').onchange=update;
 $('r-copy').onclick=async()=>{
  try{await navigator.clipboard.writeText(out.value);status.textContent='已複製 R 語法。';}
  catch{out.select();status.textContent='已選取語法，請按 Ctrl+C（Mac 為 Command+C）複製。';}
 };
 $('py-copy').onclick=async()=>{
  try{await navigator.clipboard.writeText(py.value);pyStatus.textContent='已複製 Python 語法。';}
  catch{py.select();pyStatus.textContent='已選取語法，請按 Ctrl+C（Mac 為 Command+C）複製。';}
 };
 $('py-download').onclick=()=>save(kind.value==='survey'?'anova-survey.py':data.items[+index.value].file.replace('.csv','.py'),py.value,'text/plain;charset=utf-8',false);
 $('r-download').onclick=()=>save(kind.value==='survey'?'anova-survey.R':data.items[+index.value].file.replace('.csv','.R'),out.value,'text/plain;charset=utf-8',false);
}
function downloads(){
 return heading('下載與來源')+card('<h3>可重現資料與程式</h3><ul><li><a href="#r-code">查看、複製或下載 R 與 Python 語法</a></li><li><a href="downloads/survey-summary.csv" download>調查研究分組摘要 CSV</a>（每組 n、平均數、樣本變異數）</li><li><a href="stats.js" download>下載計算程式 JavaScript</a></li><li><a href="https://github.com/Hawjeng/hawjeng.github.io/tree/main/anova-lab">網站原始碼</a></li></ul><p>課本來源：邱皓政《統計學》第五版及其配套資料檔。案例 CSV 僅摘錄計算使用的欄列，欄名依教材用途整理。調查來源為 data3.xlsx 的 Cleaned_Data；只發布彙總資料，不提供逐筆問卷或 Word 校稿。交互作用示意圖取自 Ch12p330t12.2.xlsx。二因子計算採用正式表格中的 Excel 觀測值，不混用其他工作表或 SPSS 版本。</p>'+
 table(['案例','原始資料檔','資料下載'],data.items.map((z,i)=>[z.title,z.source,'CSV '+(i+1)]))+'<ol>'+data.items.map(z=>'<li><a href="downloads/'+z.file+'" download>'+esc(z.title)+' CSV</a></li>').join('')+'</ol>');
}
function mount(route){
 let [id,caseIndex]=route.split('/');
 if(!tabs.some(t=>t[0]===id))id='theory';
 $('tabs').innerHTML=tabs.map(([k,t])=>'<button type="button" data-tab="'+k+'"'+(k===id?' aria-current="page"':'')+'>'+t+'</button>').join('');
 $('tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>{if(location.hash==='#'+b.dataset.tab)mount(b.dataset.tab);else location.hash=b.dataset.tab;});
 $('panel').innerHTML=id==='theory'?theory():id==='book'||id==='exercise'?examples(id):id==='survey'?survey():id==='manual'?manual():id==='r-code'?rCode():downloads();
 if(id==='theory'){
  for(let x of ['d1','d2','obs','tail'])$(x).oninput=theoryUpdate;
  $('alpha').onchange=()=>{theoryUpdate();updateTutorial(+$('alpha').value);};
  const sketch=()=>{const value=$('sketch').value,z=data.items.find(x=>x.title==='時段 × 運動型態');$('sketch-out').innerHTML=profile(value==='actual'?compute(z.model,z.headers,z.rows,.05).profile:{as:['a1','a2'],bs:['b1','b2','b3'],M:sketches[+value]});};
  $('sketch').onchange=sketch;sketch();theoryUpdate();updateTutorial(+$('alpha').value);
 }else if(id==='book'||id==='exercise'){
  $('case').onchange=()=>exampleUpdate(id);$('alpha').onchange=()=>exampleUpdate(id,false);exampleUpdate(id);
 }else if(id==='survey'){
  $('variable').value='手機遊戲成癮';
  for(let x of ['variable','group'])$(x).onchange=()=>surveyUpdate(true);
  $('group-b').onchange=()=>surveyUpdate(true,false);
  $('survey-groups').onchange=()=>surveyUpdate();
  $('alpha').onchange=()=>surveyUpdate();surveyUpdate(true);
 }else if(id==='r-code'){
  mountR(caseIndex);
 }else if(id==='manual'){
  const m=()=>{$('format').textContent=formats[$('model').value];$('pool-control').hidden=$('model').value!=='within';$('pool').checked=false;};
  $('model').value='one';m();sample();
  $('model').onchange=()=>{m();$('results').innerHTML='<p>已切換設計。請貼上符合格式的資料，或帶入範例後再計算。</p>';};
  $('sample').onclick=sample;$('run').onclick=runManual;$('alpha').onchange=runManual;$('pool').onchange=runManual;
  $('export').onclick=()=>save('anova-input.csv',$('paste').value,'text/csv;charset=utf-8');
 }
}
window.addEventListener('hashchange',()=>mount(location.hash.slice(1)));
mount(location.hash.slice(1));
