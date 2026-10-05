/* 傷病名・ICD-10：傷病名マスター（読みがな付き）で病名を探し、ICD-10 と DPC 分類へつなぐ */
"use strict";
S.byomei={q:"",tab:"search",limit:60,ch:""};
COLORS.byomei="#9dff6f";
const ICD_CH=[["A","感染症・寄生虫症（A00-B99）"],["C","新生物（C00-D48）"],["D","血液・免疫（D50-D89）"],["E","内分泌・栄養・代謝（E00-E90）"],["F","精神・行動（F00-F99）"],["G","神経系（G00-G99）"],["H","眼・耳（H00-H95）"],["I","循環器系（I00-I99）"],["J","呼吸器系（J00-J99）"],["K","消化器系（K00-K93）"],["L","皮膚（L00-L99）"],["M","筋骨格系（M00-M99）"],["N","腎尿路生殖器系（N00-N99）"],["O","妊娠・分娩（O00-O99）"],["P","周産期（P00-P96）"],["Q","先天奇形（Q00-Q99）"],["R","症状・所見（R00-R99）"],["S","損傷（S00-T98）"],["V","外因（V01-Y98）"],["Z","保健サービス（Z00-Z99）"],["U","特殊目的（U00-U99）"]];

PREP.byomei=d=>{
  const rows=d.rows.map((a,id)=>({id,c:a[0],n:nk(a[1]),y:nk(a[2]),icd1:a[3],icd2:a[4],hn:norm(a[1]),h:norm(a[1]+"|"+a[2]+"|"+a[3]+"|"+a[4]+"|"+a[0])}));
  const byIcd=new Map();for(const r of rows)for(const c of [r.icd1,r.icd2])if(c){if(!byIcd.has(c))byIcd.set(c,[]);byIcd.get(c).push(r)}
  D.byomei={rows,byIcd,icdn:d.icdn||{},src:d.src};
};
const icdName=c=>D.byomei.icdn[c]||"";
function icdChapter(c){if(!c)return"";const L=c[0];if(L==="D"&&+c.slice(1,3)<=48)return ICD_CH[1][1];if(L==="B")return ICD_CH[0][1];if(L==="T")return ICD_CH[17][1];if(L==="W"||L==="X"||L==="Y")return ICD_CH[18][1];const f=ICD_CH.find(x=>x[0]===L);return f?f[1]:""}
function byomeiSearch(terms){
  if(!terms.length)return[];
  const icdQ=terms.length===1&&/^[a-z][0-9]{1,3}$/i.test(terms[0][0].replace(".",""))?terms[0][0].replace(".","").toUpperCase():null;
  const res=[];
  for(const r of D.byomei.rows){
    let sc=-1;
    if(icdQ&&(r.icd1.startsWith(icdQ)||r.icd2.startsWith(icdQ)))sc=r.icd1===icdQ?0:2;
    else if(terms.every(vs=>vs.some(v=>has(r.h,v)))){const w=terms[0];sc=w.some(v=>r.hn===v)?0:w.some(v=>r.hn.startsWith(v))?1:w.some(v=>norm(r.y).startsWith(v))?2:3}
    if(sc>=0)res.push([sc,r]);
  }
  return res.sort((a,b)=>a[0]-b[0]||a[1].n.length-b[1].n.length).map(a=>a[1]);
}
function dpcForIcd(icd){
  if(!D.dpc||D.dpc.error||!icd)return[];
  let l=D.dpc.icdCode.get(icd)||[];
  if(!l.length)for(const [k,v] of D.dpc.icdCode)if(k.startsWith(icd)||icd.startsWith(k)){l=l.concat(v)}
  return[...new Set(l.map(x=>x.b6))];
}
function byomeiCard(r,terms){
  const b6s=dpcForIcd(r.icd1);
  return`<div class="card" tabindex="0" role="button" data-open="byomei:${r.id}" style="--c:var(--byomei)">
    <div class="nm">${markText(r.n,terms)}</div>
    <div class="val"><span class="v icd">${esc(fmtIcd(r.icd1)||"—")}</span></div>
    <div class="sub">${markText(r.y,terms)}${r.icd1?`｜${esc(icdName(r.icd1)||icdChapter(r.icd1))}`:""}</div>
    <div class="tags">${r.icd2?`<span class="tag">ICD(2) ${esc(fmtIcd(r.icd2))}</span>`:""}${b6s.length?`<span class="tag" style="border-color:var(--dpc);color:var(--dpc)">DPC ${b6s.length}分類</span>`:""}<span class="tag">${esc(icdChapter(r.icd1))}</span></div>
  </div>`;
}
function renderByomei(){
  const v=$("#view"),st=S.byomei,d=D.byomei;
  if(!d){v.innerHTML=head("byomei")+loadingHtml("RECEIVING DISEASE MASTER");return}
  if(d.error){v.innerHTML=head("byomei")+`<div class="empty">傷病名データを読み込めませんでした（${esc(d.error)}）</div>`;return}
  v.innerHTML=head("byomei")+`<div class="tabs2" role="tablist">${[["search","病名・ICDで検索"],["icd","ICD-10の章から探す"]].map(([k,l])=>`<button role="tab" data-t="${k}" aria-selected="${st.tab===k}">${l}</button>`).join("")}</div><div id="bbody"></div>`;
  v.querySelectorAll("[data-t]").forEach(b=>b.onclick=()=>{st.tab=b.dataset.t;renderByomei()});
  const b=$("#bbody");
  if(st.tab==="icd"){
    const counts=new Map();for(const r of d.rows){const ch=icdChapter(r.icd1);counts.set(ch,(counts.get(ch)||0)+1)}
    b.innerHTML=`<p class="note" style="margin-top:14px">ICD-10 の章ごとの傷病名の数です。章を開くと3桁分類ごとに一覧できます。</p>`+ICD_CH.filter(([,n])=>counts.get(n)).map(([L,n])=>`<div class="part"><button data-ch="${esc(n)}"><span><span style="font-family:var(--f-tech);color:var(--byomei)">${L}</span>　${esc(n)}</span><span class="n">${(counts.get(n)||0).toLocaleString()}</span></button><div class="body" hidden></div></div>`).join("");
    b.querySelectorAll(".part>button").forEach(x=>x.onclick=()=>{const bd=x.nextElementSibling;
      if(bd.hidden&&!bd.innerHTML){const g=new Map();for(const r of d.rows)if(icdChapter(r.icd1)===x.dataset.ch){const k=r.icd1.slice(0,3);if(!g.has(k))g.set(k,[]);g.get(k).push(r)}
        bd.innerHTML=[...g].sort().map(([k,l])=>`<button class="sec-link" data-q="${k}"><span class="code" style="color:var(--byomei)">${k}</span><span style="flex:1">${esc(icdName(k)||icdName(l[0].icd1)||l[0].n)}</span><span class="note">${l.length}</span></button>`).join("");
        bd.querySelectorAll("[data-q]").forEach(y=>y.onclick=()=>{st.q=y.dataset.q;st.tab="search";renderByomei()})}
      bd.hidden=!bd.hidden});
    return;
  }
  const box=searchBox("bq","傷病名・読み・ICD-10（例：しんきんこうそく、2型糖尿病、I21、J18.9）",st.q,q=>{st.q=q;st.limit=60;res()});
  b.innerHTML=box.html+`<div id="bres"></div>`;box.bind();
  function res(){
    const r=$("#bres"),terms=queryTerms(st.q);
    if(!terms.length){r.innerHTML=`<div class="panel" style="padding:16px;margin-top:14px"><p class="lead" style="margin:0 0 10px">傷病名マスター（${d.rows.length.toLocaleString()}件）から、病名・ひらがなの読み・ICD-10コードで探せます。病名を開くと、ICD-10 と該当するDPC分類に進めます。</p>
      <div class="chips">${["しんきんこうそく","2型糖尿病","I21","肺炎","だいたいこつけいぶこっせつ"].map(x=>`<button class="chip ex">${x}</button>`).join("")}</div></div>`;
      r.querySelectorAll(".ex").forEach(x=>x.onclick=()=>{st.q=x.textContent;$("#bq").value=st.q;res()});return}
    const rows=byomeiSearch(terms);
    DL.byomei=()=>({name:`傷病名_${st.q}`,header:["傷病名コード","傷病名","読み","ICD-10","ICD-10の名称","ICD-10(2)","DPC分類"],rows:rows.map(x=>[x.c,x.n,x.y,x.icd1,icdName(x.icd1),x.icd2,dpcForIcd(x.icd1).map(b=>b+" "+dpcName(b)).join(" / ")])});
    r.innerHTML=`<div class="meta"><span>${rows.length.toLocaleString()} 件</span><span>ICD-10／DPC分類 ${rows.length?dlBtn("byomei"):""}</span></div>
      ${rows.length?`<div class="list">${rows.slice(0,st.limit).map(x=>byomeiCard(x,terms)).join("")}</div>`:`<div class="empty">該当する傷病名がありません。</div>`}
      ${rows.length>st.limit?`<button class="more" id="bmore">さらに表示（残り ${(rows.length-st.limit).toLocaleString()} 件）</button>`:""}`;
    const m=$("#bmore");if(m)m.onclick=()=>{st.limit+=100;res()};
  }
  res();
}
function openByomei(id){
  const d=D.byomei,r=d.rows[id];
  const b6s=dpcForIcd(r.icd1);
  const same=(d.byIcd.get(r.icd1)||[]).filter(x=>x!==r);
  sheet("byomei",`<div class="eyebrow">ICD-10 ${esc(fmtIcd(r.icd1))} · ${esc(icdChapter(r.icd1))}</div><h2>${esc(r.n)}</h2><div class="sub" style="margin-top:4px">${esc(r.y)}</div>`,
  `<div class="blk"><h3>PROFILE</h3><dl class="kv"><dt>ICD-10</dt><dd><b class="icdb">${esc(fmtIcd(r.icd1)||"—")}</b> ${esc(icdName(r.icd1))}</dd>${r.icd2?`<dt>ICD-10(2)</dt><dd><b class="icdb">${esc(fmtIcd(r.icd2))}</b> ${esc(icdName(r.icd2))}</dd>`:""}<dt>傷病名コード</dt><dd style="font-family:var(--f-tech)">${esc(r.c)}</dd><dt>章</dt><dd>${esc(icdChapter(r.icd1))}</dd></dl></div>
   ${b6s.length?`<div class="blk" style="--mod:var(--dpc)"><h3>DPC ／ この ICD が属する診断群分類 ${b6s.length}件</h3><p class="note">分類を選ぶと、手術・処置を選びながら14桁の番号を確定できます。</p><div class="list">${b6s.map(b6=>`<button class="sec-link" data-open="dpc:B${b6}"><span class="code" style="color:var(--dpc)">${b6}</span><span style="flex:1">${esc(dpcName(b6))}</span></button>`).join("")}</div></div>`:`<div class="blk"><div class="empty">このICDに対応するDPC分類は電子点数表にありません（他の分類や「その他」に含まれる可能性があります）。</div></div>`}
   ${same.length?`<div class="blk"><h3>SAME ICD ／ 同じICD-10の傷病名 ${same.length}件</h3><div class="list">${same.slice(0,40).map(x=>`<button class="sec-link" data-open="byomei:${x.id}"><span style="flex:1">${esc(x.n)}</span><span class="note">${esc(x.y)}</span></button>`).join("")}</div></div>`:""}
   <p class="note">出典：社会保険診療報酬支払基金・厚生労働省「傷病名マスター」（${esc(d.src)}）、厚生労働省「診断群分類（DPC）電子点数表」。</p>`);
}
MODS.push({key:"byomei",label:"傷病名・ICD",en:"DISEASE / ICD-10",title:"傷病名・ICD-10",
  lead:()=>D.byomei&&!D.byomei.error?`傷病名マスター ${D.byomei.rows.length.toLocaleString()}件（読みがな・ICD-10付き）`:"",
  count:()=>D.byomei.rows.length,
  sat:label=>`<button class="sat" data-go="byomei" style="--c:var(--byomei)"><div><div class="k">${label}</div><div class="s">病名・読み・ICD-10 → DPC分類</div></div><div class="v">${D.byomei.rows.length.toLocaleString()}<span class="note"> 病名</span></div></button>`,
  search:byomeiSearch,card:byomeiCard,render:renderByomei,open:openByomei});
