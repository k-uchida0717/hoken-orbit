/* 適応病名：DX審査支払機構（旧 支払基金）が公開するコンピュータチェックのチェックマスタ（診療行為 × 適応と判断する傷病名）
   診療行為の詳細に「適応病名」、傷病名の詳細に「この病名が適応の診療行為」を出し、点数の検索で「病名から探す」を使えるようにする */
"use strict";
COLORS.tekio="#9dff6f";
const SUSP=["","確定病名のみ","疑い病名のみ"];
PREP.tekio=d=>{
  D.tekio={p:d.p,x:d.x||{},n:d.n||{},s:d.s||{},pub:d.pub,page:d.page,src:d.src,rev:null};
};
/* 傷病名コード → 傷病名の行（傷病名データの読み込み後に作る） */
function tekioByCode(){
  const t=D.tekio;if(t.byC)return t.byC;
  if(!D.byomei||D.byomei.error)return new Map(); /* 傷病名データがまだ無いときは作り置きしない */
  t.byC=new Map();for(const r of D.byomei.rows)t.byC.set(r.c,r);
  return t.byC;
}
const tekioOk=()=>D.tekio&&!D.tekio.error;
/* 診療行為コードの適応病名：[{c,flag,r(傷病名の行 or null),cond}] */
function tekioFor(code){
  if(!tekioOk()||!D.tekio.p[code])return null;
  const byC=tekioByCode(),x=D.tekio.x[code]||{};
  return D.tekio.p[code].map(v=>{const c=String(Math.floor(v/10)).padStart(7,"0");return{c,flag:v%10,r:byC.get(c)||null,cond:x[c]||null}});
}
function condText(cond){
  if(!cond)return"";const [sex,lo,hi]=cond,t=[];
  if(sex)t.push(sex===1?"男性のみ":"女性のみ");
  if(lo>0||hi<999)t.push(lo>0&&hi<999?`${lo}〜${hi}歳`:lo>0?`${lo}歳以上`:`${hi}歳以下`);
  return t.join("・");
}
/* 診療行為の詳細に出す「適応病名」の欄 */
function tekioBlock(r){
  const list=tekioFor(r.c);
  if(!list){
    if(!tekioOk()||!"DJKIBMNF".includes(r.k[0]))return"";
    return`<div class="blk" style="--mod:var(--tekio)"><h3>INDICATIONS ／ 適応病名</h3><div class="txt" style="color:var(--dim)">この診療行為は、DX審査支払機構が公開している「適応病名のチェック」の対象に入っていません（＝公開データ上の適応病名の一覧はありません）。算定の条件は留意事項・疑義解釈で確認してください。</div></div>`;
  }
  const known=list.filter(x=>x.r),gone=list.length-known.length;
  const groups=new Map();
  for(const x of known){const ch=icdChapter(x.r.icd1)||"その他";if(!groups.has(ch))groups.set(ch,[]);groups.get(ch).push(x)}
  const order=ICD_CH.map(c=>c[1]);
  const gs=[...groups].sort((a,b)=>order.indexOf(a[0])-order.indexOf(b[0]));
  const nOnly=known.filter(x=>x.flag===1).length,sOnly=known.filter(x=>x.flag===2).length;
  const item=x=>`<button class="sec-link tk" data-open="byomei:${x.r.id}" data-h="${esc(x.r.hn+"|"+norm(x.r.y)+"|"+x.r.icd1.toLowerCase())}"><span class="code" style="color:var(--tekio)">${esc(fmtIcd(x.r.icd1)||"—")}</span><span style="flex:1">${esc(x.r.n)}${x.flag?`<span class="tag" style="margin-left:6px;${x.flag===1?"":"border-color:var(--warn);color:var(--warn)"}">${SUSP[x.flag]}</span>`:""}${x.cond?`<span class="tag" style="margin-left:6px">${esc(condText(x.cond))}</span>`:""}</span></button>`;
  const open=known.length<=40;
  return`<div class="blk" style="--mod:var(--tekio)"><h3>INDICATIONS ／ 適応病名 ${known.length.toLocaleString()}件</h3>
    <p class="note" style="margin-top:0">DX審査支払機構がレセプトのコンピュータチェックで「この診療行為の適応」と判断している傷病名です。${nOnly?`「確定病名のみ」${nOnly}件は疑い病名では適応になりません。`:""}${sOnly?`「疑い病名のみ」${sOnly}件があります。`:""}</p>
    ${known.length>15?`<input class="tkq" type="search" placeholder="この中の病名を絞り込む（例：糖尿、肝、C22）" aria-label="適応病名を絞り込む" style="width:100%;margin:4px 0 8px;padding:8px 12px;border-radius:10px;border:1px solid var(--rim);background:rgba(0,0,0,.25);color:var(--text);font:inherit">`:""}
    <div class="tkl">${gs.map(([ch,l])=>`<div class="part"><button aria-expanded="${open}"><span>${esc(ch)}</span><span class="n">${l.length}</span></button><div class="body"${open?"":" hidden"}>${l.map(item).join("")}</div></div>`).join("")}</div>
    <p class="note">出典：DX審査支払機構「コンピュータチェックに関する公開」チェックマスタ（${esc(D.tekio.pub)}公開）。審査では個別の症例ごとに医学的に判断されるため、この一覧にない病名でも認められる場合や、ある病名でも認められない場合があります。${gone?`ほかに、今の傷病名マスターで廃止された病名が${gone}件含まれています（表示していません）。`:""}</p></div>`;
}
/* 詳細シートを開いた後に、絞り込みと開閉を付ける */
function bindTekio(){
  const root=document.querySelector(".sheet");if(!root)return;
  root.querySelectorAll(".tkl .part>button").forEach(x=>x.onclick=()=>{const bd=x.nextElementSibling;bd.hidden=!bd.hidden;x.setAttribute("aria-expanded",!bd.hidden)});
  const q=root.querySelector(".tkq");if(!q)return;
  q.oninput=()=>{const v=norm(q.value.trim());
    root.querySelectorAll(".tkl .part").forEach(p=>{let n=0;p.querySelectorAll(".tk").forEach(b=>{const ok=!v||b.dataset.h.includes(v);b.hidden=!ok;if(ok)n++});
      p.hidden=!n;const bd=p.querySelector(".body"),bt=p.querySelector("button");if(v){bd.hidden=false;bt.setAttribute("aria-expanded",true)}bt.querySelector(".n").textContent=n})};
}
/* 傷病名 → その病名が適応の診療行為（逆引き。初回に作る） */
function tekioRev(){
  const t=D.tekio;if(t.rev)return t.rev;
  t.rev=new Map();
  for(const [pc,l] of Object.entries(t.p))for(const v of l){const c=String(Math.floor(v/10)).padStart(7,"0");if(!t.rev.has(c))t.rev.set(c,[]);t.rev.get(c).push([pc,v%10])}
  return t.rev;
}
function kensaByCode(){
  if(!D.kensa||D.kensa.error)return new Map();
  if(!D.kensa.byC){D.kensa.byC=new Map();for(const r of D.kensa.rows)D.kensa.byC.set(r.c,r)}
  return D.kensa.byC;
}
/* 傷病名の詳細に出す「この病名が適応になる診療行為」 */
function tekioForDisease(r){
  if(!tekioOk())return"";
  const l=tekioRev().get(r.c)||[],kc=kensaByCode();
  const rows=l.map(([pc,f])=>[kc.get(pc),f,pc]).filter(x=>x[0]);
  if(!rows.length)return`<div class="blk" style="--mod:var(--tekio)"><h3>TESTS & PROCEDURES ／ この病名が適応になる診療行為</h3><div class="txt" style="color:var(--dim)">DX審査支払機構の適応病名チェックで、この病名を適応としている診療行為はありません。</div></div>`;
  const g=new Map();for(const x of rows){const k=x[0].k[0];if(!g.has(k))g.set(k,[]);g.get(k).push(x)}
  return`<div class="blk" style="--mod:var(--tekio)"><h3>TESTS & PROCEDURES ／ この病名が適応になる診療行為 ${rows.length}件</h3>
    <p class="note" style="margin-top:0">DX審査支払機構のコンピュータチェックで、この病名を適応と判断している検査・処置・手術などです。</p>
    ${[...g].sort().map(([k,l])=>`<div class="subh">${esc(k)} ${esc(KPART[k]||"")}</div><div class="list">${l.sort((a,b)=>a[0].k.localeCompare(b[0].k)).map(([x,f])=>`<button class="sec-link" data-open="kensa:${x.id}"><span class="code" style="color:var(--kensa)">${esc(x.k)}</span><span style="flex:1">${esc(x.n)}${f?`<span class="tag" style="margin-left:6px">${SUSP[f]}</span>`:""}</span><span class="note">${fmt(x.p[0])}${x.u}</span></button>`).join("")}</div>`).join("")}
    <p class="note">出典：DX審査支払機構「コンピュータチェックに関する公開」チェックマスタ（${esc(D.tekio.pub)}公開）。</p></div>`;
}
/* 点数の検索「病名から探す」：入力した病名が適応に入っている診療行為を返す。[[行, 一致した病名の配列]] */
function tekioSearch(terms,part){
  if(!tekioOk()||!D.byomei||D.byomei.error||!terms.length)return[];
  const hit=new Set(byomeiSearch(terms).map(r=>r.c));
  const kc=kensaByCode(),byC=tekioByCode(),out=[];
  for(const [pc,l] of Object.entries(D.tekio.p)){
    const r=kc.get(pc);if(!r||r.p[S.kensa.rev]==null||(part&&r.k[0]!==part))continue;
    const m=[];for(const v of l){const c=String(Math.floor(v/10)).padStart(7,"0");if(hit.has(c))m.push([byC.get(c),v%10])}
    if(m.length)out.push([r,m]);
  }
  const ord=k=>{const i="DEJKNLIHGFMBCA".indexOf(k[0]);return i<0?99:i}; /* 検査を先頭に */
  return out.sort((a,b)=>ord(a[0].k)-ord(b[0].k)||a[0].k.localeCompare(b[0].k)||a[0].c.localeCompare(b[0].c));
}
function tekioCard(r,m,terms){
  const names=m.slice(0,6).map(([x,f])=>markText(x.n,terms)+(f?`<span class="only">（${SUSP[f]}）</span>`:"")).join("、")+(m.length>6?` ほか${m.length-6}件`:"");
  return kensaCard(r,S.kensa.rev,[]).replace(/<\/div>\s*$/,`<div class="snip" style="--c:var(--tekio)"><b>適応病名</b>${names}</div></div>`);
}
