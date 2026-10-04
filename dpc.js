/* DPC（診断群分類）：分類検索・逆引き・コーディング（選んでいくと番号が確定）・3回分の比較
   データ：厚生労働省「診断群分類（DPC）電子点数表」。14桁の番号の桁の意味:
   1-6 分類 / 7 病態等 / 8 年齢・出生時体重等 / 9-10 手術 / 11 手術・処置等1 / 12 手術・処置等2 / 13 定義副傷病 / 14 重症度等 */
"use strict";
S.dpc={q:"",tab:"search",b6:null,sel:{},limit:40,rev:0,dq:"",dsub:"s2"};
COLORS.dpc="#ff6fae";
const DPC_POS=[ /* [開始位置, 長さ, 名前, 点数表の説明列] */
  [6,1,"病態等",null],[7,1,"年齢・出生時体重等",5],[8,2,"手術",1],[10,1,"手術・処置等1",2],[11,1,"手術・処置等2",3],[12,1,"定義副傷病",4],[13,1,"重症度等",5]];

PREP.dpc=d=>{
  const codes=d.codes.map(a=>({c:a[0],b6:a[0].slice(0,6),t:a.slice(1,7).map(nk),d:a[7],p:a[8]}));
  const byB6=new Map();for(const x of codes){if(!byB6.has(x.b6))byB6.set(x.b6,[]);byB6.get(x.b6).push(x)}
  const group=(rows,f)=>{const m=new Map();for(const r of rows){const k=f(r);if(!m.has(k))m.set(k,[]);m.get(k).push(r)}return m};
  const ope=d.ope.map(([b6,dig,n,k])=>({b6,dig,n:nk(n),k,h:norm(n+"|"+k)}));
  const s1=d.s1.map(([b6,dig,n,k,cond])=>({b6,dig,n:nk(n),k,cond,h:norm(n+"|"+k)}));
  const s2=d.s2.map(([b6,dig,n,k])=>({b6,dig,n:nk(n),k,h:norm(n+"|"+k)}));
  const sub=d.sub.map(([b6,dig,icd,n])=>({b6,dig,icd,n:nk(n),h:norm(n+"|"+icd)}));
  const icd=d.icd.map(([b6,code,n])=>({b6,icd:code,n:nk(n),h:norm(n+"|"+code)}));
  D.dpc={revs:d.revs,codes,byB6,byCode:new Map(codes.map(x=>[x.c,x])),bunrui:d.bunrui,mdc:d.mdc,
    ope,s1,s2,sub,icd,opeB:group(ope,r=>r.b6+"|"+r.dig),s1B:group(s1,r=>r.b6+"|"+r.dig),s2B:group(s2,r=>r.b6+"|"+r.dig),subB:group(sub,r=>r.b6+"|"+r.dig),
    icdB:group(icd,r=>r.b6),icdCode:group(icd,r=>r.icd),dekidaka:d.dekidaka_ope,dummy:d.dummy,
    bh:Object.entries(d.bunrui).map(([b6,n])=>({b6,n:nk(n),h:norm(b6+"|"+n)}))};
};

const dpcName=b6=>nk(D.dpc.bunrui[b6]||"");
const fmtCode=c=>`<span class="dcode">${c.slice(0,6)}<i>${c.slice(6,8)}</i><b>${c.slice(8,10)}</b><i>${c.slice(10,14)}</i></span>`;
const fmtIcd=c=>c&&c.length>3?c.slice(0,3)+"."+c.slice(3):c;

/* ---------- 検索：どこから当たったか（理由）を添えて分類ごとにまとめる ---------- */
function dpcSearch(terms){
  const dd=D.dpc,hits=new Map();
  const add=(b6,score,why)=>{if(!dd.bunrui[b6])return;const e=hits.get(b6)||{b6,score:9,why:[]};e.score=Math.min(e.score,score);if(e.why.length<4&&!e.why.includes(why))e.why.push(why);hits.set(b6,e)};
  if(!terms.length)return[];
  const raw=terms.map(vs=>vs[0]).join("");
  if(/^[0-9x]{6,14}$/i.test(raw)){for(const x of dd.codes)if(x.c.startsWith(raw.toLowerCase()))add(x.b6,0,"番号 "+x.c)}
  const H=h=>terms.every(vs=>vs.some(v=>has(h,v)));
  for(const b of dd.bh)if(H(b.h))add(b.b6,0,"分類名");
  for(const r of dd.icd)if(H(r.h))add(r.b6,1,`ICD ${fmtIcd(r.icd)} ${r.n}`);
  if(D.byomei&&!D.byomei.error){let n=0;for(const r of D.byomei.rows){if(n>300)break;if(r.icd1&&H(r.hn)){const l=dd.icdCode.get(r.icd1);if(l){n++;for(const x of l)add(x.b6,1,`傷病名 ${r.n}（${fmtIcd(r.icd1)}）`)}}}}
  for(const r of dd.ope)if(r.dig!=="99"&&r.dig!=="97"||r.k.startsWith("K"))if(H(r.h)&&!/^KKK/.test(r.k))add(r.b6,2,`手術 ${r.k} ${r.n}`);
  for(const r of dd.s1)if(H(r.h))add(r.b6,3,`処置等1 ${r.n}`);
  for(const r of dd.s2)if(H(r.h))add(r.b6,3,`処置等2 ${r.n}`);
  for(const r of dd.sub)if(H(r.h))add(r.b6,4,`副傷病 ${fmtIcd(r.icd)} ${r.n}`);
  return[...hits.values()].sort((a,b)=>a.score-b.score||a.b6.localeCompare(b.b6));
}
function dpcCard(h,terms){
  const list=D.dpc.byB6.get(h.b6)||[];const n=list.filter(x=>x.p[0]).length;
  return`<div class="card" tabindex="0" role="button" data-open="dpc:B${h.b6}" style="--c:var(--dpc)">
    <div class="nm"><span class="code">${h.b6}</span>${markText(dpcName(h.b6),terms)}</div>
    <div class="val"><span class="v" style="font-size:17px">${n}</span><span class="u">番号</span></div>
    <div class="sub">MDC${h.b6.slice(0,2)} ${esc(D.dpc.mdc[h.b6.slice(0,2)]||"")}</div>
    <div class="tags">${h.why.map(w=>`<span class="tag">${markText(w,terms)}</span>`).join("")}</div>
  </div>`;
}

/* ---------- 画面 ---------- */
function renderDpc(){
  const v=$("#view"),st=S.dpc,d=D.dpc;
  if(!d){v.innerHTML=head("dpc")+loadingHtml("RECEIVING DPC TABLES");return}
  if(d.error){v.innerHTML=head("dpc")+`<div class="empty">DPCデータを読み込めませんでした（${esc(d.error)}）</div>`;return}
  v.innerHTML=head("dpc")+`<div class="tabs2" role="tablist">${[["search","検索・逆引き"],["code","コーディング"],["drug","薬剤・出来高"]].map(([k,l])=>`<button role="tab" data-t="${k}" aria-selected="${st.tab===k}">${l}</button>`).join("")}</div><div id="dbody"></div>`;
  v.querySelectorAll("[data-t]").forEach(b=>b.onclick=()=>{st.tab=b.dataset.t;renderDpc()});
  ({search:dpcSearchTab,code:dpcCodeTab,drug:dpcDrugTab})[st.tab]($("#dbody"));
}
function dpcSearchTab(b){
  const st=S.dpc;
  const box=searchBox("dq","傷病名・ICD・術式・Kコード・薬剤名・分類番号（例：心筋梗塞、I21、K546、ペムブロリズマブ）",st.q,q=>{st.q=q;st.limit=40;res()});
  b.innerHTML=box.html+`<div id="dres"></div>`;box.bind();
  function res(){
    const r=$("#dres"),terms=queryTerms(st.q);
    if(!terms.length){r.innerHTML=`<div class="panel" style="padding:16px;margin-top:14px"><p class="lead" style="margin:0 0 10px">病名・ICD-10・手術（Kコード）・手術・処置等1/2（化学療法の薬剤を含む）・定義副傷病のどれからでも、該当する診断群分類を探せます（逆引き）。分類を選ぶと「コーディング」で手術や処置を選びながら14桁の番号を確定できます。</p>
      <div class="chips">${["急性心筋梗塞","I21","K546","ペムブロリズマブ","人工呼吸","肺炎","060035"].map(x=>`<button class="chip ex">${x}</button>`).join("")}</div></div>`;
      r.querySelectorAll(".ex").forEach(x=>x.onclick=()=>{st.q=x.textContent;$("#dq").value=st.q;res()});return}
    const hits=dpcSearch(terms);
    r.innerHTML=`<div class="meta"><span>${hits.length.toLocaleString()} 分類</span><span>当たった理由をタグで表示</span></div>
      ${hits.length?`<div class="list">${hits.slice(0,st.limit).map(h=>dpcCard(h,terms)).join("")}</div>`:`<div class="empty">該当する分類がありません。</div>`}
      ${hits.length>st.limit?`<button class="more" id="dmore">さらに表示</button>`:""}`;
    const m=$("#dmore");if(m)m.onclick=()=>{st.limit+=40;res()};
  }
  res();
}
/* ---------- コーディング：桁ごとに選んで絞り込む ---------- */
function dpcCandidates(b6,sel){
  return(D.dpc.byB6.get(b6)||[]).filter(x=>Object.entries(sel).every(([pos,val])=>{const [s,l]=DPC_POS[pos];const c=x.c.substr(s,l);return c===val||/^x+$/.test(c)}));
}
function dpcOptionLabel(b6,pi,val,sample){
  const [s,l,name,col]=DPC_POS[pi],dd=D.dpc,key=b6+"|"+val;
  const txt=col!=null&&typeof col==="number"&&sample?sample.t[col]:"";
  if(pi===2){ /* 手術 */
    const L=dd.opeB.get(key)||[];
    const names=L.filter(r=>!/^KKK/.test(r.k)).map(r=>`${r.k} ${r.n}`);
    const head=val==="99"?"手術なし":val==="97"?"その他の手術あり":txt||"手術あり";
    return[head,names];
  }
  if(pi===3||pi===4){
    const L=(pi===3?dd.s1B:dd.s2B).get(key)||[];
    return[val==="0"?"なし":(txt||`${val}あり`),L.map(r=>r.n+(r.k&&!/^\d{4}$/.test(r.k)?` (${r.k})`:""))];
  }
  if(pi===5){const L=dd.subB.get(key)||[];return[val==="0"?"定義副傷病なし":"定義副傷病あり",L.map(r=>`${fmtIcd(r.icd)} ${r.n}`)]}
  return[txt?`${val}：${txt}`:`区分 ${val}`,[]];
}
function dpcCodeTab(b){
  const st=S.dpc,dd=D.dpc;
  if(!st.b6){b.innerHTML=`<div class="empty" style="margin-top:14px">先に「検索・逆引き」で診断群分類を選んでください。</div>`;return}
  const all=dd.byB6.get(st.b6)||[];const cands=dpcCandidates(st.b6,st.sel);
  const facets=DPC_POS.map((p,pi)=>{
    const [s,l]=p;const vals=[...new Set(all.map(x=>x.c.substr(s,l)))].filter(v=>!/^x+$/.test(v)).sort();
    if(vals.length<2&&!(vals.length===1&&st.sel[pi]))return"";
    const opts=vals.map(v=>{
      const withV=dpcCandidates(st.b6,{...st.sel,[pi]:v});const sample=all.find(x=>x.c.substr(s,l)===v);
      const [lab,items]=dpcOptionLabel(st.b6,pi,v,sample);const on=st.sel[pi]===v;
      return`<button class="opt${on?" on":""}" data-pi="${pi}" data-v="${v}" ${withV.length?"":"disabled"}>
        <span class="ov">${esc(v)}</span><span class="ol"><b>${esc(lab)}</b>${items.length?`<small>${/^0+$/.test(v)&&pi>=3?"次だけの場合も「なし」：":""}${esc(items.slice(0,4).join("／"))}${items.length>4?` ほか${items.length-4}件`:""}</small>`:""}</span><span class="oc">${withV.length}</span></button>`}).join("");
    return`<div class="facet"><div class="fh"><span>${esc(p[2])}</span><small>${s+1}${l>1?"-"+(s+l):""}桁目</small>${st.sel[pi]!=null?`<button class="clr" data-clr="${pi}">選び直す</button>`:""}</div>${opts}</div>`;
  }).join("");
  const done=cands.length===1;
  b.innerHTML=`<div class="panel dpc-head">
      <div class="eyebrow">DIAGNOSIS GROUP</div>
      <div class="dh"><span class="code">${st.b6}</span> ${esc(dpcName(st.b6))}</div>
      <div class="note">ICD：${(dd.icdB.get(st.b6)||[]).slice(0,6).map(r=>`${fmtIcd(r.icd)} ${esc(r.n)}`).join("、")}${(dd.icdB.get(st.b6)||[]).length>6?` ほか${(dd.icdB.get(st.b6)||[]).length-6}件`:""}</div>
      <div class="progress"><i style="width:${Math.round((1-(cands.length-1)/Math.max(all.length-1,1))*100)}%"></i></div>
      <div class="meta" style="margin:6px 0 0"><span>候補 ${cands.length} / ${all.length} 番号</span>${Object.keys(st.sel).length?`<button class="linkbtn" id="dreset">すべて選び直す</button>`:""}</div>
    </div>
    ${done?`<div class="confirm"><div class="eyebrow">CODE CONFIRMED ／ コーディング確定</div>${dpcCodeCard(cands[0],true)}</div>`:""}
    <div class="facets">${facets}</div>
    <h3 class="gh">候補の番号</h3><div class="list">${cands.slice(0,60).map(x=>dpcCodeCard(x,false)).join("")}</div>`;
  b.querySelectorAll(".opt").forEach(o=>o.onclick=()=>{const pi=+o.dataset.pi;st.sel[pi]===o.dataset.v?delete st.sel[pi]:st.sel[pi]=o.dataset.v;dpcCodeTab(b)});
  b.querySelectorAll("[data-clr]").forEach(o=>o.onclick=()=>{delete st.sel[+o.dataset.clr];dpcCodeTab(b)});
  const r=$("#dreset");if(r)r.onclick=()=>{st.sel={};dpcCodeTab(b)};
}
function dpcCodeCard(x,big){
  const d0=x.d[0],p0=x.p[0];
  const desc=[x.t[1],x.t[2]&&`処置1:${x.t[2]}`,x.t[3]&&`処置2:${x.t[3]}`,x.t[4]&&`副傷病:${x.t[4]}`,x.t[5]&&`重症度:${x.t[5]}`].filter(Boolean).join("／");
  return`<div class="card${big?" big":""}" tabindex="0" role="button" data-open="dpc:${x.c}" style="--c:var(--dpc)">
    <div class="nm">${fmtCode(x.c)}</div>
    <div class="val">${p0&&p0[0]?`<span class="v">${fmt(p0[0])}</span><span class="u">点/日〜</span>`:`<span class="u" style="color:var(--warn)">包括対象外（出来高）</span>`}</div>
    <div class="sub">${esc(desc||x.t[0])}</div>
    ${d0&&d0[0]!=null?`<div class="tags"><span class="tag">期間Ⅰ ${d0[0]}日</span><span class="tag">Ⅱ ${d0[1]}日</span><span class="tag">Ⅲ ${d0[2]}日</span></div>`:""}
  </div>`;
}
/* ---------- 詳細：番号の内訳・入院期間と点数の3回比較 ---------- */
function openDpc(id){
  if(id.startsWith("B")){S.dpc.b6=id.slice(1);S.dpc.sel={};S.dpc.tab="code";go("dpc");return}
  const dd=D.dpc,x=dd.byCode.get(id);if(!x)return;
  const parts=DPC_POS.map((p,pi)=>{const [s,l,name]=p;const v=x.c.substr(s,l);if(/^x+$/.test(v))return"";
    const [lab,items]=pi>=2?dpcOptionLabel(x.b6,pi,v,x):[x.t[5]||"",[]];
    return`<tr><td>${s+1}${l>1?"-"+(s+l):""}桁</td><td class="n">${esc(v)}</td><td class="w"><b>${esc(name)}</b>：${esc(lab)}${items.length?`<br><span class="note">${/^0+$/.test(v)&&pi>=3?"次だけの場合も「なし」：":""}${esc(items.slice(0,/^0+$/.test(v)?4:8).join("／"))}${items.length>(/^0+$/.test(v)?4:8)?` ほか${items.length-(/^0+$/.test(v)?4:8)}件`:""}</span>`:""}</td></tr>`}).join("");
  const maxDay=Math.max(...x.d.filter(Boolean).map(d=>d[2]||0),1);
  const bars=dd.revs.map((rv,i)=>{const d=x.d[i],p=x.p[i];
    if(!d||d[0]==null)return`<div class="lbar"><div class="ly">${esc(rv.label)}</div><div class="lnone">${p||d?"包括対象外（出来高）":"この改定では該当する番号なし"}</div></div>`;
    const w=v=>v/maxDay*100;
    return`<div class="lbar"><div class="ly">${esc(rv.label)}</div><div class="ltrack">
      <i class="p1" style="width:${w(d[0])}%"></i><i class="p2" style="left:${w(d[0])}%;width:${w(d[1]-d[0])}%"></i><i class="p3" style="left:${w(d[1])}%;width:${w(d[2]-d[1])}%"></i>
      <b style="left:${w(d[0])}%">${d[0]}</b><b style="left:${w(d[1])}%">${d[1]}</b><b style="left:${w(d[2])}%">${d[2]}</b></div></div>`}).join("");
  const rows=dd.revs.map((rv,i)=>{const d=x.d[i],p=x.p[i];const prev=x.p[i+1];
    return`<tr${i===0?' class="cur"':""}><td>${esc(rv.label)}</td>${[0,1,2].map(k=>`<td class="n">${d&&d[k]!=null?d[k]+"日":"—"}</td>`).join("")}${[0,1,2].map(k=>`<td class="n">${p&&p[k]!=null?fmt(p[k]):"—"}${p&&prev&&p[k]!=null&&prev[k]!=null?"<br>"+delta(prev[k],p[k]):""}</td>`).join("")}</tr>`}).join("");
  const total=(d,p)=>d&&p&&d[0]!=null?p[0]*d[0]+p[1]*(d[1]-d[0]):null;
  sheet("dpc",`<div class="eyebrow">MDC${x.c.slice(0,2)} · ${esc(dd.mdc[x.c.slice(0,2)]||"")}</div><h2>${fmtCode(x.c)}</h2><div class="sub" style="margin-top:4px">${esc(x.t[0])}</div>
    ${x.p[0]&&x.p[0][0]?`<div class="big"><span class="v">${fmt(x.p[0][0])}</span><span class="u">点/日（入院期間Ⅰ・${esc(dd.revs[0].label)}）</span></div>`:x.d[0]==null?`<div class="warnbox" style="margin-top:8px">この番号は最新の改定（${esc(dd.revs[0].label)}）にはありません。${dd.revs.filter((r,i)=>x.d[i]).map(r=>esc(r.label)).join("・")}の番号です。</div>`:`<div class="warnbox" style="margin-top:8px">この番号は包括評価の対象外です（出来高で算定）。</div>`}`,
  `<div class="blk"><h3>CODE BREAKDOWN ／ 番号の内訳</h3><div class="tbl"><table><tr><th>桁</th><th>値</th><th>意味</th></tr><tr><td>1-6桁</td><td class="n">${x.b6}</td><td class="w"><b>分類</b>：${esc(dpcName(x.b6))}</td></tr>${parts}</table></div></div>
   <div class="blk"><h3>LENGTH OF STAY ／ 入院期間Ⅰ・Ⅱ・Ⅲ（3回の改定）</h3><div class="lbars">${bars}</div>
     <div class="legend"><span><i class="p1"></i>期間Ⅰ</span><span><i class="p2"></i>期間Ⅱ</span><span><i class="p3"></i>期間Ⅲ</span></div></div>
   <div class="blk"><h3>POINTS ／ 1日あたり点数と入院日数</h3><div class="tbl"><table><tr><th>改定</th><th>日Ⅰ</th><th>日Ⅱ</th><th>日Ⅲ</th><th>点Ⅰ</th><th>点Ⅱ</th><th>点Ⅲ</th></tr>${rows}</table></div>
     <p class="note">期間Ⅱまで入院した場合の包括点数の目安：${dd.revs.map((rv,i)=>{const t=total(x.d[i],x.p[i]);return`${esc(rv.label)} ${t!=null?fmt(t)+"点":"—"}`}).join("／")}（点Ⅰ×日Ⅰ＋点Ⅱ×（日Ⅱ−日Ⅰ）。医療機関別係数は含みません）</p></div>
   <div class="btns"><button class="btn pri" data-open="dpc:B${x.b6}">この分類でコーディングする</button></div>
   <p class="note">出典：厚生労働省「診断群分類（DPC）電子点数表」（${dd.revs.map(r=>esc(r.label)).join("・")}）。</p>`);
}
/* ---------- 薬剤・出来高 ---------- */
function dpcDrugTab(b){
  const st=S.dpc,dd=D.dpc;
  const box=searchBox("ddq","処置等2の薬剤・処置名で逆引き（例：ペムブロリズマブ、ニボルマブ、放射線）",st.dq,q=>{st.dq=q;res()});
  b.innerHTML=`<div class="chips" style="margin-top:12px"><button class="chip" data-s="s2" aria-pressed="${st.dsub==="s2"}">手術・処置等2（化学療法など）</button><button class="chip" data-s="s1" aria-pressed="${st.dsub==="s1"}">手術・処置等1</button><button class="chip" data-s="deki" aria-pressed="${st.dsub==="deki"}">出来高算定手術</button><button class="chip" data-s="high" aria-pressed="${st.dsub==="high"}">高額薬剤</button></div>
    <div id="dsrch">${box.html}</div><div id="ddres"></div>`;
  box.bind();
  b.querySelectorAll("[data-s]").forEach(x=>x.onclick=()=>{st.dsub=x.dataset.s;dpcDrugTab(b)});
  function res(){
    const r=$("#ddres"),terms=queryTerms(st.dq);
    if(st.dsub==="deki"){$("#dsrch").hidden=true;
      r.innerHTML=`<p class="note" style="margin-top:12px">DPC算定でも手術料を出来高で算定する手術（移植術・厚生労働大臣が指定するもの）。</p><div class="tbl"><table><tr><th>Kコード</th><th>名称</th><th>区分</th></tr>${dd.dekidaka.map(([k,n,c])=>`<tr><td class="n">${esc(k)}</td><td class="w">${esc(n)}</td><td>${esc(c)}</td></tr>`).join("")}</table></div>`;return}
    if(st.dsub==="high"){$("#dsrch").hidden=true;
      r.innerHTML=`<div class="warnbox" style="margin-top:12px">高額薬剤（新たに薬価収載された薬剤などで、使用すると出来高算定となるもの）の判定一覧は、厚生労働省から新薬収載のたびにPDFで公表されています。現在このデータの取り込みを準備中です。</div>`;return}
    $("#dsrch").hidden=false;
    const src=st.dsub==="s1"?dd.s1:dd.s2;
    if(!terms.length){r.innerHTML=`<p class="note" style="margin-top:12px">薬剤名・処置名を入れると、その薬剤・処置が「手術・処置等${st.dsub==="s1"?1:2}」に定義されている診断群分類と、番号の桁の値を一覧します。</p>`;return}
    const hit=src.filter(x=>terms.every(vs=>vs.some(v=>has(x.h,v))));
    const g=new Map();for(const x of hit){const k=x.n;if(!g.has(k))g.set(k,[]);g.get(k).push(x)}
    r.innerHTML=`<div class="meta"><span>${g.size} 件の薬剤・処置／${hit.length} 分類</span></div>`+[...g].slice(0,40).map(([n,l])=>`<div class="part"><button><span>${markText(n,terms)}${l[0].k?` <span class="note">${esc(l[0].k)}</span>`:""}</span><span class="n">${l.length} 分類</span></button><div class="body" hidden>${l.map(x=>`<button class="sec-link" data-open="dpc:B${x.b6}"><span class="code" style="color:var(--dpc)">${x.b6}</span><span style="flex:1">${esc(dpcName(x.b6))}</span><span class="note">${st.dsub==="s1"?11:12}桁目＝${esc(x.dig)}</span></button>`).join("")}</div></div>`).join("");
    r.querySelectorAll(".part>button").forEach(x=>x.onclick=()=>{const bd=x.nextElementSibling;bd.hidden=!bd.hidden});
  }
  res();
}
/* 点数画面（手術）からの連携：このKコードが関係するDPC分類 */
function dpcForK(kbn){
  if(!D.dpc||D.dpc.error)return"";
  const key=kbn.replace("-","");const l=D.dpc.ope.filter(r=>r.k.replace("-","").startsWith(key)&&!/^KKK/.test(r.k));
  if(!l.length)return"";
  const b6s=[...new Set(l.map(r=>r.b6))];
  return`<div class="blk" style="--mod:var(--dpc)"><h3>DPC ／ この手術が定義されている診断群分類 ${b6s.length}件</h3><div class="list">${b6s.slice(0,12).map(b6=>`<button class="sec-link" data-open="dpc:B${b6}"><span class="code" style="color:var(--dpc)">${b6}</span><span style="flex:1">${esc(dpcName(b6))}</span></button>`).join("")}</div></div>`;
}
/* 薬価画面からの連携：成分がDPCの手術・処置等2に指定されている分類 */
function dpcForDrug(r){
  if(!D.dpc||D.dpc.error)return"";
  const ing=norm(r.i.replace(/[（(].*?[)）]/g,""));if(ing.length<3)return"";
  const l=D.dpc.s2.filter(x=>{const n=norm(x.n.replace(/[（(].*?[)）]/g,""));return n.length>=3&&(ing.includes(n)||n.includes(ing))});
  if(!l.length)return"";
  const b6s=[...new Set(l.map(x=>x.b6))];
  return`<div class="blk" style="--mod:var(--dpc)"><h3>DPC ／ 手術・処置等2に指定されている分類 ${b6s.length}件</h3><p class="note">この成分を使うと、次の分類では12桁目（手術・処置等2）が変わります。</p><div class="list">${b6s.slice(0,12).map(b6=>`<button class="sec-link" data-open="dpc:B${b6}"><span class="code" style="color:var(--dpc)">${b6}</span><span style="flex:1">${esc(dpcName(b6))}</span></button>`).join("")}</div></div>`;
}

MODS.push({key:"dpc",label:"DPC",en:"DPC / PDPS",title:"DPC 診断群分類",
  lead:()=>D.dpc&&!D.dpc.error?`${esc(D.dpc.revs[0].label)} 電子点数表・${D.dpc.byB6.size.toLocaleString()}分類／${D.dpc.codes.filter(x=>x.d[0]).length.toLocaleString()}番号（${D.dpc.revs.map(r=>esc(r.label)).join("・")}を比較）`:"",
  count:()=>D.dpc.codes.filter(x=>x.p[0]).length,
  sat:label=>`<button class="sat" data-go="dpc" style="--c:var(--dpc)"><div><div class="k">${label}</div><div class="s">分類・逆引き・コーディング・3回比較</div></div><div class="v">${D.dpc.byB6.size.toLocaleString()}<span class="note"> 分類</span></div></button>`,
  search:dpcSearch,card:dpcCard,render:renderDpc,open:openDpc});
