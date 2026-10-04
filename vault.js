/* ログインと暗号化データの読み込み
   公開サイトにはデータを暗号化して置き（*.bin）、IDとパスワードでログインした人のブラウザ内だけで復号する。
   vault.json が無いとき（手元での確認など）は、暗号化していない *.json をそのまま読む。

   しくみ
   ・データは共通の鍵（マスター鍵）で AES-GCM 暗号化（事前に gzip 圧縮）
   ・マスター鍵は利用者ごとに、その人のパスワードから PBKDF2 で作った鍵で包んで vault.json に置く
   ・ID は SHA-256 のハッシュだけを置く（ID そのものは公開しない） */
"use strict";
const VAULT=(()=>{
  let cfg=null,key=null;
  const b64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
  const hex=buf=>[...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,"0")).join("");
  const enc=new TextEncoder();
  const store={get(k){try{return sessionStorage.getItem(k)||localStorage.getItem(k)}catch(e){return null}},
    set(k,v,keep){try{(keep?localStorage:sessionStorage).setItem(k,v)}catch(e){}},
    del(k){try{sessionStorage.removeItem(k);localStorage.removeItem(k)}catch(e){}}};

  async function importMaster(raw){return crypto.subtle.importKey("raw",raw,"AES-GCM",false,["decrypt"])}
  async function decrypt(k,buf){const u=new Uint8Array(buf);return crypto.subtle.decrypt({name:"AES-GCM",iv:u.slice(0,12)},k,u.slice(12))}
  async function gunzip(buf){
    const ds=new DecompressionStream("gzip");
    return new Response(new Blob([buf]).stream().pipeThrough(ds)).text();
  }
  async function check(k){ /* 鍵が正しいか、vault.json の確認用の暗号文で確かめる */
    try{return new TextDecoder().decode(await decrypt(k,b64(cfg.check)))==="orbit-ok"}catch(e){return false}
  }
  async function tryLogin(id,pw,keep){
    const h=hex(await crypto.subtle.digest("SHA-256",enc.encode(id.trim().toLowerCase())));
    const slot=cfg.users[h];if(!slot)return false;
    const base=await crypto.subtle.importKey("raw",enc.encode(pw),"PBKDF2",false,["deriveKey"]);
    const kek=await crypto.subtle.deriveKey({name:"PBKDF2",salt:b64(slot.s),iterations:cfg.iter,hash:"SHA-256"},base,{name:"AES-GCM",length:256},false,["decrypt"]);
    let raw;try{raw=await decrypt(kek,b64(slot.w))}catch(e){return false}
    const k=await importMaster(raw);if(!(await check(k)))return false;
    key=k;store.set("orbit.vk",btoa(String.fromCharCode(...new Uint8Array(raw))),keep);
    return true;
  }
  function loginScreen(title){
    return new Promise(resolve=>{
      const el=document.createElement("div");el.className="login";
      el.innerHTML=`<form class="login-card panel" id="lf" autocomplete="on">
        <svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="5" fill="#7dffcf"/><ellipse cx="20" cy="20" rx="17" ry="7" fill="none" stroke="#4fe3ff" stroke-width="1.4" transform="rotate(-25 20 20)"/><ellipse cx="20" cy="20" rx="17" ry="7" fill="none" stroke="#b38cff" stroke-width="1.4" transform="rotate(35 20 20)"/><circle cx="34" cy="13" r="2.6" fill="#ffc46b"/></svg>
        <div class="eyebrow" style="--mod:var(--core)">MEMBERS ONLY</div>
        <h2 class="h" style="font-size:22px">${title||"保険診療オービット"}</h2>
        <p class="lead">管理者から受け取ったIDとパスワードでログインしてください。</p>
        <label for="lid">ID</label><input id="lid" name="username" autocomplete="username" required>
        <label for="lpw">パスワード</label><input id="lpw" name="password" type="password" autocomplete="current-password" required>
        <label class="keep"><input id="lkeep" type="checkbox" checked> この端末でログインしたままにする</label>
        <p class="err" id="lerr" hidden>IDまたはパスワードが違います。</p>
        <button class="btn pri" id="lbtn" type="submit">ログイン</button>
      </form>`;
      document.body.appendChild(el);
      el.querySelector("#lf").addEventListener("submit",async e=>{
        e.preventDefault();const btn=el.querySelector("#lbtn");btn.disabled=true;btn.textContent="確認中…";
        const ok=await tryLogin(el.querySelector("#lid").value,el.querySelector("#lpw").value,el.querySelector("#lkeep").checked);
        if(ok){el.remove();resolve()}else{el.querySelector("#lerr").hidden=false;btn.disabled=false;btn.textContent="ログイン"}
      });
      setTimeout(()=>el.querySelector("#lid").focus(),50);
    });
  }
  return{
    get locked(){return!!cfg},
    async init(title){
      try{const r=await fetch("vault.json",{cache:"no-store"});cfg=r.ok?await r.json():null}catch(e){cfg=null}
      if(!cfg)return; /* 暗号化なしの配信（手元での確認用） */
      const saved=store.get("orbit.vk");
      if(saved){try{const k=await importMaster(b64(saved));if(await check(k)){key=k;return}}catch(e){}store.del("orbit.vk")}
      await loginScreen(title);
    },
    async json(name){
      if(!cfg){const r=await fetch(name);if(!r.ok)throw new Error(name+" "+r.status);return r.json()}
      const r=await fetch(name.replace(/\.json$/,".bin"));if(!r.ok)throw new Error(name+" "+r.status);
      return JSON.parse(await gunzip(await decrypt(key,await r.arrayBuffer())));
    },
    logout(){store.del("orbit.vk");location.reload()}
  };
})();
