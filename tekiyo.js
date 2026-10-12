/* 摘要欄：別表Ⅰ 診療報酬明細書の「摘要」欄への記載事項等一覧（医科）
   留意事項の画面のタブで全文検索し、診療行為・留意事項の詳細には該当する記載事項を出す */
"use strict";
const TEKIYO_ID=200000; /* data-open の番号（疑義解釈と分ける） */
PREP.tekiyo=d=>{
  const rows=d.rows.map((x,i)=>({...x,id:TEKIYO_ID+i,
    hs:norm(x.n+"|"+x.kt),ht:norm([x.n,x.kt,...x.it.map(t=>t.t+"|"+t.c.map(c=>c[0]+" "+c[1]).join("|"))].join("|"))}));
  const byK=new Map(),byC=new Map();
  for(const r of rows){for(const k of r.k){if(!byK.has(k))byK.set(k,[]);byK.get(k).push(r)}
    for(const it of r.it)for(const c of it.c)for(const code of c[0].match(/\d{9}/g)||[]){if(!byC.has(code))byC.set(code,[]);if(!byC.get(code).includes(r))byC.get(code).push(r)}}
  D.tekiyo={rows,byK,byC,src:d.src,built:d.built};
};
const tekiyoOk=()=>D.tekiyo&&!D.tekiyo.error;
function searchTekiyo(terms){
  if(!tekiyoOk()||!terms.length)return[];
  const code=terms.length===1&&/^[a-o]\d{3}(-\d+){0,2}$/i.test(terms[0][0])?terms[0][0].toUpperCase():null;
  if(code)return D.tekiyo.byK.get(code)||[];
  return D.tekiyo.rows.filter(r=>terms.every(vs=>vs.some(v=>has(r.ht,v)))).map(r=>[gigiScore(r,terms),r]).sort((a,b)=>b[0]-a[0]).map(a=>a[1]);
}
function tekiyoCard(r,terms){
  const t=r.it.map(i=>i.t).join(" ");
  return`<div class="card" tabindex="0" role="button" data-open="tekiyo:${r.id}" style="--c:var(--ryuui)">
    <div class="nm"><span class="code">${esc(r.k[0]||r.kt.split("\n")[0])}</span>${markText(r.n,terms)}</div>
    <div class="val"><span class="u">項番${esc(r.no)}</span></div>
    <div class="sub">記載事項 ${r.it.length}件・レセ電コード ${r.it.reduce((s,i)=>s+i.c.length,0)}件</div>
    <div class="snip">${snippet(t,terms)}</div>
  </div>`;
}
/* 記載事項の本文とコードの表 */
function tekiyoItems(r,terms,code){
  return r.it.map(i=>`<div class="txt" style="margin-top:10px">${emph(linkify(markText(i.t||"（記載事項の文言なし）",terms)))}</div>
    ${i.c.length?`<div class="tbl" style="margin-top:6px"><table><tr><th>レセ電コード</th><th>レセプト表示文言</th></tr>${i.c.map(c=>`<tr${code&&c[0].includes(code)?' class="cur"':""}><td style="font-family:var(--f-tech);white-space:nowrap">${esc(c[0])}</td><td class="w">${markText(c[1],terms)}${c[2]?'<span class="tag" style="margin-left:6px">紙レセのみ</span>':""}${c[3]?'<span class="tag" style="margin-left:6px;border-color:var(--warn);color:var(--warn)">令和8年6月適用</span>':""}</td></tr>`).join("")}</table></div>`:""}`).join("");
}
function openTekiyo(id){
  const r=D.tekiyo.rows[id-TEKIYO_ID],terms=queryTerms(route.name==="home"?S.home.q:S.ryuui.q);
  const secs=r.k.filter(k=>D.ryuui&&!D.ryuui.error&&D.ryuui.byCode[k]);
  sheet("ryuui",`<div class="eyebrow">別表Ⅰ 摘要欄への記載事項（医科） · 項番${esc(r.no)}</div><h2>${r.k.length?`<span style="font-family:var(--f-tech);color:var(--ryuui);margin-right:8px">${esc(r.k.join("・"))}</span>`:""}${esc(r.n)}</h2>${r.kt&&!r.k.includes(r.kt)?`<div class="sub" style="margin-top:4px">${esc(r.kt.replace(/\n/g," "))}</div>`:""}`,
    `<div class="blk"><h3>RECEIPT ／ 摘要欄への記載事項</h3>${tekiyoItems(r,terms)}
      <p class="note">出典：厚生労働省「診療報酬請求書等の記載要領等について」別表Ⅰ 診療報酬明細書の「摘要」欄への記載事項等一覧（医科）（${/^http/.test(D.tekiyo.src)?`<a href="${esc(D.tekiyo.src)}" target="_blank" rel="noopener">Excel</a>`:esc(D.tekiyo.src)}）。</p></div>
     ${secs.length?`<div class="blk"><h3>NOTICE ／ 関係する区分の留意事項</h3><div class="list">${secs.map(c=>{const s=D.ryuui.byCode[c];return`<button class="sec-link" data-open="ryuui:${s.id}"><span class="code">${esc(c)}</span><span>${esc(s.n)}</span></button>`}).join("")}</div></div>`:""}`);
}
OPENERS.tekiyo=openTekiyo;
/* 診療行為（区分番号＋診療行為コード）・留意事項の詳細に出す欄 */
function tekiyoBlock(k,code){
  if(!tekiyoOk())return"";
  const l=[...new Set([...(code&&D.tekiyo.byC.get(code)||[]),...(D.tekiyo.byK.get(k)||[])])];
  if(!l.length)return"";
  return`<div class="blk" style="--mod:var(--ryuui)"><h3>RECEIPT ／ レセプト摘要欄への記載事項 ${l.length}件</h3>
    ${l.slice(0,6).map(r=>`<div class="subh"><button class="sec-link" data-open="tekiyo:${r.id}" style="padding:0"><span class="code">項番${esc(r.no)}</span><span>${esc(r.n)}</span></button></div>${tekiyoItems(r,[],code)}`).join("")}
    ${l.length>6?`<p class="note">ほか${l.length-6}件は「留意」→「摘要欄」で ${esc(k)} を検索してください。</p>`:""}
    <p class="note">出典：厚生労働省 別表Ⅰ 診療報酬明細書の「摘要」欄への記載事項等一覧（医科）。</p></div>`;
}
/* 留意事項の画面の「摘要欄」タブ */
function tekiyoBody(b){
  const st=S.ryuui,g=D.tekiyo;
  if(!g){b.innerHTML=loadingHtml("RECEIVING RECEIPT RULES");return}
  if(g.error){b.innerHTML=`<div class="empty">摘要欄の記載事項を読み込めませんでした（${esc(g.error)}）</div>`;return}
  const terms=queryTerms(st.q);
  if(!terms.length){
    b.innerHTML=`<div class="panel" style="padding:16px;margin-top:14px"><p class="lead" style="margin:0 0 10px">レセプトの「摘要」欄に書く必要がある事項（別表Ⅰ・医科 ${g.rows.length}項番）を検索します。区分番号・項目名・記載事項の文言・レセ電コードで探せます。</p>
      <div class="chips">${["B001-2-12","CT","算定日","前回実施","820100001"].map(x=>`<button class="chip ex">${x}</button>`).join("")}</div></div>`;
    b.querySelectorAll(".ex").forEach(x=>x.onclick=()=>{st.q=x.textContent;$("#rq").value=st.q;tekiyoBody(b)});
    return;
  }
  const l=searchTekiyo(terms);
  DL.tekiyo=()=>({name:`摘要欄_${st.q}`,header:["項番","区分","診療行為名称等","記載事項","レセ電コード","表示文言","紙レセのみ","令和8年6月適用"],
    rows:l.flatMap(r=>r.it.flatMap(i=>(i.c.length?i.c:[["","",0,0]]).map(c=>[r.no,r.kt,r.n,i.t,c[0],c[1],c[2]?"○":"",c[3]?"※":""])))});
  b.innerHTML=`<div class="meta"><span>${l.length.toLocaleString()} 項番</span><span>一致の多い順 ${l.length?dlBtn("tekiyo"):""}</span></div>
    ${l.length?`<div class="list">${l.slice(0,st.limit).map(r=>tekiyoCard(r,terms)).join("")}</div>`:`<div class="empty">該当する記載事項がありません。</div>`}
    ${l.length>st.limit?`<button class="more" id="tmore">さらに表示（残り ${(l.length-st.limit).toLocaleString()} 件）</button>`:""}`;
  const m=$("#tmore");if(m)m.onclick=()=>{st.limit+=40;tekiyoBody(b)};
}
