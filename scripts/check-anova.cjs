'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {compute,critical,upper,oneSummary}=require('../anova-lab/stats.js');
require('../anova-lab/data.js');
const near=(a,b,t=1e-7)=>assert.ok(Math.abs(a-b)<=t, a+' vs '+b);
near(critical(3,18,.05),3.159907597632742);
near(upper(6.588235294117647,2,8),.02036787075141);
const expected=[
 [4.3184079602],[4.8156656093],[8.9906433017],[11.0025715956],[6.5882352941],
 [48.4160191273,12.786909743,4.6040047818],
 [8.3936324168,21.4313689267,6.7112506928],
 [2.2325581395,9.5968992248,10.3720930233],
 [9],[15.75],[10/11,250/11,90/11],[.5,125,45],[10/11,250/3,90]
];
assert.equal(LAB_DATA.items.length,expected.length);
LAB_DATA.items.forEach((z,i)=>{
 assert.ok(fs.existsSync('anova-lab/downloads/'+z.file));
 const r=compute(z.model,z.headers,z.rows,.05,i===7);
 if(r.ratio){near(r.ratio.f,expected[i][0]);near(r.ratio.p,.0766582687257);return;}
 const terms=r.terms.filter(t=>t.err);
 assert.equal(terms.length,expected[i].length);
 terms.forEach((x,j)=>{near(x.f,expected[i][j]);assert.ok(x.p>=0&&x.p<=1);});
 const whole=r.terms.at(-1);
 near(r.terms.slice(0,-1).reduce((s,x)=>s+x.s,0),whole.s);
 assert.equal(r.terms.slice(0,-1).reduce((s,x)=>s+x.df,0),whole.df);
});
for(const groups of Object.values(LAB_DATA.survey)){
 for(const rows of Object.values(groups))assert.ok(Number.isFinite(oneSummary(rows,.05).terms[0].f));
}
const run = i => {const z=LAB_DATA.items[i];return compute(z.model,z.headers,z.rows,.05);};
const exercise=run(1);
near(exercise.pairs[1].p,.005204981068142);
near(exercise.pairs[1].adj,.015614943204426);
near(exercise.pairs[1].scheffe,.019029421758132);
const independent=run(5), mixed=run(6), repeated=run(7);
assert.equal(independent.sharedSlices.length,5);
assert.equal(independent.sharedSlices[1].df2,30);
near(independent.sharedSlices[1].f,16.08786610878658);
assert.equal(mixed.sharedSlices[0].df2,24);
assert.equal(mixed.sharedSlices[2].df2,32);
near(repeated.sharedSlices[2].f,10.465116279069768);
assert.equal(repeated.sharedSlices[2].df2,20);
const [lo,hi]=independent.profile.ci[0][0], n=6, mean=independent.profile.M[0][0];
near(mean-lo,2.570581835636314*Math.sqrt(independent.desc[0][3]/n));
near(hi-mean,mean-lo);
const coffee=LAB_DATA.items.slice(-3).map(z=>compute(z.model,z.headers,z.rows,.05).desc.map(x=>x[2]));
coffee.forEach(m=>assert.deepEqual(m,[7,6,9,5]));
let z=LAB_DATA.items.at(-1),bad=z.rows.map(r=>r.slice());bad[0][0]='missing pair';
assert.throws(()=>compute(z.model,z.headers,bad,.05),/每位受試者/);
bad=z.rows.map(r=>r.slice());bad[0][3]=null;
assert.throws(()=>compute(z.model,z.headers,bad,.05),/非數值/);
console.log('PASS: F distribution, 13 chapter datasets, decomposition, 48 survey analyses and missing-pair validation.');
