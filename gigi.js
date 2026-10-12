/* 疑義解釈・事務連絡：令和8年度改定の厚労省 事務連絡（疑義解釈資料 その1〜、通知の一部訂正など）。歯科・調剤の部分は除いている
   留意事項の画面にタブとして入り、診療行為・留意事項の詳細には「関連する疑義解釈」を出す */
"use strict";
const GIGI_PG=100000; /* data-open の番号：これ以上は「その他の事務連絡」のページ */
PREP.gigi=d=>{
  const docs=d.docs.map(x=>({...x,no:(nk(x.title).match(/[(（]その(\d+)[)）]/)||[])[1]||""}));
  const qa=d.qa.map((q,id)=>({...q,id,hs:norm(q.tp),ht:norm(q.tp+"|"+q.q+"|"+q.a+"|"+q.c.join("|"))}));
  const pages=d.pages.map((p,i)=>({...p,id:GIGI_PG+i,ht:norm(p.t)}));
  const byCode=new Map();for(const q of qa)for(const c of q.c){if(!byCode.has(c))byCode.set(c,[]);byCode.get(c).push(q)}
  D.gigi={docs,qa,pages,byCode,page:d.page,built:d.built};
};
const gigiOk=()=>D.gigi&&!D.gigi.error;
const docLabel=d=>d.no?`疑義解釈 その${d.no}`:d.title.replace(/[（(]令和.*$/,"");
const docDate=d=>d.date?d.date.replace(/^(\d{4})-0?(\d+)-0?(\d+)$/,"$1/$2/$3"):"";
function gigiScore(x,terms){let t=0,title=0;for(const vs of terms)for(const v of vs){if(x.hs&&has(x.hs,v))title++;let at=x.ht.indexOf(v);while(at>=0&&t<99){t++;at=x.ht.indexOf(v,at+v.length)}}return title*1000+t}
function searchGigi(terms,sec){
  if(!gigiOk())return[];
  const code=terms.length===1&&/^[a-n]\d{3}(-\d+)?$/i.test(terms[0][0])?terms[0][0].toUpperCase():null;
  let l=D.gigi.qa.filter(q=>(!sec||q.sec===sec)&&(code?q.c.includes(code):terms.every(vs=>vs.some(v=>has(q.ht,v)))));
  if(terms.length&&!code)l=l.map(q=>[gigiScore(q,terms),q]).sort((a,b)=>b[0]-a[0]).map(a=>a[1]);
  else l=l.slice().sort((a,b)=>D.gigi.docs[b.d].date.localeCompare(D.gigi.docs[a.d].date)||a.d-b.d||String(a.n).localeCompare(String(b.n),"ja",{numeric:true}));
  return l;
}
function searchJimu(terms){
  if(!gigiOk()||!terms.length)return[];
  return D.gigi.pages.filter(p=>terms.every(vs=>vs.some(v=>has(p.ht,v)))).map(p=>[gigiScore(p,terms),p]).sort((a,b)=>b[0]-a[0]).map(a=>a[1]);
}
function gigiCard(q,terms){
  const d=D.gigi.docs[q.d];
  return`<div class="card" tabindex="0" role="button" data-open="gigi:${q.id}" style="--c:var(--ryuui)">
    <div class="nm"><span class="code">問${esc(String(q.n))}</span>${markText(q.tp||"（項目名なし）",terms)}</div>
    <div class="val"><span class="u">${esc(docLabel(d))}</span></div>
    <div class="sub">${esc(q.sec)}｜${esc(docDate(d))}${q.c.length?`｜${q.c.map(esc).join("・")}`:""}</div>
    <div class="snip"><b>問</b>${snippet(q.q,terms)}</div>
    <div class="snip"><b>答</b>${snippet(q.a,terms,60)}</div>
  </div>`;
}
function jimuCard(p,terms){
  const d=D.gigi.docs[p.d];
  return`<div class="card" tabindex="0" role="button" data-open="gigi:${p.id}" style="--c:var(--ryuui)">
    <div class="nm">${esc(docLabel(d))}</div><div class="val"><span class="u">p.${p.pg}</span></div>
    <div class="sub">${esc(docDate(d))}</div>
    <div class="snip">${snippet(p.t,terms)}</div>
  </div>`;
}
const pdfAt=(d,pg)=>`<a href="${esc(d.url)}#page=${pg}" target="_blank" rel="noopener">PDF ${pg}ページ</a>`;
function openGigi(id){
  const g=D.gigi,terms=queryTerms(route.name==="home"?S.home.q:S.ryuui.q);
  if(id>=GIGI_PG){
    const p=g.pages[id-GIGI_PG],d=g.docs[p.d];
    const sib=g.pages.filter(x=>x.d===p.d),i=sib.indexOf(p);
    sheet("ryuui",`<div class="eyebrow">事務連絡 · ${esc(docDate(d))} · p.${p.pg}</div><h2>${esc(d.title)}</h2>`,
      `<div class="blk"><h3>TEXT ／ ${p.pg}ページ目</h3><div class="txt">${emph(linkify(markText(p.t,terms)))}</div>
        <p class="note">出典：厚生労働省 ${esc(d.title)}（${pdfAt(d,p.pg)}）。PDFから自動で文字を取り出しているため、新旧対照表などの表は原文でご確認ください。</p></div>
       <div class="navpn">${sib[i-1]?`<button data-open="gigi:${sib[i-1].id}">← p.${sib[i-1].pg}</button>`:"<span></span>"}${sib[i+1]?`<button data-open="gigi:${sib[i+1].id}">p.${sib[i+1].pg} →</button>`:"<span></span>"}</div>`);
    return;
  }
  const q=g.qa[id],d=g.docs[q.d];
  const same=g.qa.filter(x=>x.d===q.d&&x.sec===q.sec&&x.tp===q.tp&&x!==q);
  const pts=q.c.filter(c=>D.ryuui&&!D.ryuui.error&&D.ryuui.byCode[c]);
  sheet("ryuui",`<div class="eyebrow">${esc(docLabel(d))} · ${esc(q.sec)} · ${esc(docDate(d))}</div><h2><span style="font-family:var(--f-tech);color:var(--ryuui);margin-right:8px">問${esc(String(q.n))}</span>${esc(q.tp||"")}</h2>`,
    `<div class="blk"><h3>QUESTION ／ 問</h3><div class="txt">${emph(linkify(markText(q.q,terms)))}</div></div>
     <div class="blk"><h3>ANSWER ／ 答</h3><div class="txt">${emph(linkify(markText(q.a,terms)))}</div>
       <p class="note">出典：厚生労働省保険局医療課 ${esc(d.title)}（${pdfAt(d,q.pg)}）。PDFから自動で文字を取り出しているため、表や図は原文でご確認ください。後の事務連絡で訂正・廃止されている場合があります。</p></div>
     ${pts.length?`<div class="blk"><h3>NOTICE ／ 関係する区分の留意事項</h3><div class="list">${pts.map(c=>{const s=D.ryuui.byCode[c];return`<button class="sec-link" data-open="ryuui:${s.id}"><span class="code">${esc(c)}</span><span>${esc(s.n)}</span></button>`}).join("")}</div></div>`:""}
     ${same.length?`<div class="blk"><h3>SAME TOPIC ／ 同じ項目の問 ${same.length}件</h3><div class="list">${same.map(x=>`<button class="sec-link" data-open="gigi:${x.id}"><span class="code">問${esc(String(x.n))}</span><span>${esc(x.q.slice(0,70))}…</span></button>`).join("")}</div></div>`:""}`);
}
OPENERS.gigi=openGigi;
/* 区分番号に関係する疑義解釈（診療行為・留意事項の詳細に出す） */
function gigiBlock(code){
  if(!gigiOk()||!code)return"";
  const l=(D.gigi.byCode.get(code)||[]).slice().sort((a,b)=>D.gigi.docs[b.d].date.localeCompare(D.gigi.docs[a.d].date));
  if(!l.length)return"";
  return`<div class="blk" style="--mod:var(--ryuui)"><h3>Q&A ／ ${esc(code)} に関係する疑義解釈 ${l.length}件</h3><div class="list">${l.slice(0,30).map(q=>`<button class="sec-link" data-open="gigi:${q.id}"><span class="code" style="min-width:7.5em">${esc(docLabel(D.gigi.docs[q.d]).replace("疑義解釈 ",""))} 問${esc(String(q.n))}</span><span>${esc(q.tp?q.tp+"：":"")}${esc(q.q.slice(0,60))}…</span></button>`).join("")}</div>${l.length>30?`<p class="note">ほか${l.length-30}件は「留意事項」→「疑義解釈」で ${esc(code)} を検索してください。</p>`:""}</div>`;
}
/* 留意事項の画面の「疑義解釈」「事務連絡」タブの中身 */
function gigiBody(b,tab){
  const st=S.ryuui,g=D.gigi;
  if(!g){b.innerHTML=loadingHtml("RECEIVING Q&A");return}
  if(g.error){b.innerHTML=`<div class="empty">疑義解釈を読み込めませんでした（${esc(g.error)}）</div>`;return}
  const terms=queryTerms(st.q);
  if(tab==="jimu"){
    if(!terms.length){
      const others=g.docs.map((d,i)=>[d,i]).filter(([d])=>!d.qa);
      b.innerHTML=`<div class="panel" style="padding:16px;margin-top:14px"><p class="lead" style="margin:0 0 6px">疑義解釈以外の事務連絡（通知の一部訂正など）の全文を検索します。</p><p class="note" style="margin:0">上の検索欄に言葉や区分番号を入れてください。</p></div>
        <div class="blk"><h3>DOCUMENTS ／ 収録している事務連絡 ${others.length}件</h3><div class="list">${others.sort((a,c)=>c[0].date.localeCompare(a[0].date)).map(([d,i])=>{const p=g.pages.find(x=>x.d===i);return`<button class="sec-link"${p?` data-open="gigi:${p.id}"`:""}><span class="code" style="min-width:6.5em">${esc(docDate(d))}</span><span>${esc(d.title.replace(/[（(]令和.*$/,""))}</span></button>`}).join("")}</div></div>`;
      return;
    }
    const l=searchJimu(terms);
    b.innerHTML=`<div class="meta"><span>${l.length.toLocaleString()} ページ</span><span>一致の多い順</span></div>
      ${l.length?`<div class="list">${l.slice(0,st.limit).map(p=>jimuCard(p,terms)).join("")}</div>`:`<div class="empty">該当する記載がありません。</div>`}
      ${l.length>st.limit?`<button class="more" id="gmore">さらに表示（残り ${(l.length-st.limit).toLocaleString()} 件）</button>`:""}`;
  }else{
    const secs=[...new Set(g.qa.map(q=>q.sec))];
    const l=searchGigi(terms,st.gsec||"");
    DL.gigi=()=>({name:`疑義解釈_${st.q||"一覧"}`,header:["事務連絡","日付","区分","項目","問","問の本文","答","区分番号"],rows:l.map(q=>{const d=g.docs[q.d];return[docLabel(d),d.date,q.sec,q.tp,q.n,q.q,q.a,q.c.join(" ")]})});
    b.innerHTML=`<div class="chips" id="gsc"><button class="chip" data-s="" aria-pressed="${!st.gsec}">すべて</button>${secs.map(s=>`<button class="chip" data-s="${esc(s)}" aria-pressed="${st.gsec===s}">${esc(s)}</button>`).join("")}</div>
      <div class="meta"><span>${l.length.toLocaleString()} 問</span><span>${terms.length?"一致の多い順":"新しい順"} ${l.length?dlBtn("gigi"):""}</span></div>
      ${l.length?`<div class="list">${l.slice(0,st.limit).map(q=>gigiCard(q,terms)).join("")}</div>`:`<div class="empty">該当する疑義解釈がありません。</div>`}
      ${l.length>st.limit?`<button class="more" id="gmore">さらに表示（残り ${(l.length-st.limit).toLocaleString()} 件）</button>`:""}
      <p class="note">出典：厚生労働省「令和８年度診療報酬改定について」掲載の疑義解釈資料（その1〜${esc(String(Math.max(...g.docs.map(d=>+d.no||0))))}）。医科・DPC・ベースアップ評価料・訪問看護の部分を収録し、歯科・調剤は除いています。</p>`;
    $("#gsc").onclick=e=>{const x=e.target.closest("button");if(!x)return;st.gsec=x.dataset.s;st.limit=40;gigiBody(b,tab)};
  }
  const m=$("#gmore");if(m)m.onclick=()=>{st.limit+=40;gigiBody(b,tab)};
}
