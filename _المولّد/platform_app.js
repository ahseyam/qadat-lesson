const D = __DATA__, LOGO = "__LOGO__";
/* ⛔ مفاتيحُ التخزين المحلي تُنسَب إلى المدرسة. الحادثة (٢٩ سبتمبر ٢٠٢٦):
   منصتان على نطاقٍ واحد (ahseyam.github.io) بمسارين مختلفين — و`localStorage`
   يخصُّ **النطاق لا المسار**. فقرأت منصةُ مدرسةٍ بياناتِ الأخرى من الجهاز نفسِه،
   وظهر في سجلِّ عملياتها حذفُ حصةٍ في مجمعٍ لا يتبعها. وأخطرُ منه أن مفتاحَ
   عنوان الخادم مشتركٌ أيضاً: فربطُ خادمٍ في إحداهما يُحوّل الأخرى إليه.
   ⚠️ والافتراضُ يبقى «ik» لمن لا dbid له — فلا تضيع بياناتُ من يستعملها اليوم. */
const CXW = (typeof D !== "undefined" && D.lab_complex) ? "" : "مجمع ";
const NS = (typeof D !== "undefined" && D.dbid) ? D.dbid : "ik";
const KEY = NS + "_platform_v1", API = NS + "_api_v1";
/* ⛔ مفتاحُ المدرسة في المخزن المشترك: لو كتبت منصتان إلى المفتاح نفسِه
   (`platform:db`) اندمجت بياناتُ مدرستين ولا تُفصلان بعدها. فيُشتقُّ من
   بيانات المدرسة، ولو لُصق رابطُ خادمِ مدرسةٍ أخرى بقيت البياناتُ منفصلة.
   (قادة الأمة — ٢٩ سبتمبر ٢٠٢٦) */
const DBID = (typeof D !== "undefined" && D.dbid) ? D.dbid : "db";
const $ = s => document.querySelector(s);
const el = (t,c,x)=>{const e=document.createElement(t); if(c)e.className=c; if(x!=null)e.textContent=x; return e;};
const arn = n => String(n).replace(/[0-9]/g, c => "٠١٢٣٤٥٦٧٨٩"[+c]);
const uid = () => Math.random().toString(36).slice(2,10);
let DB = {sched:[], prep:{}, obs:{}, peer:{}, rot:{}}, ME = null, PH = 1, CUR = null;
/* تراجعٌ خفيف: لقطةُ الحصة قبل التغيير لا لقطةُ القاعدة كلِّها */
let UNDO = [];

/* ───────── التخزين: محليٌّ دائماً، ومشتركٌ إن رُبط الخادم ───────── */
function load(){ try{ DB = Object.assign(DB, JSON.parse(localStorage.getItem(KEY)||"{}")); }catch(e){} 
  try{ ME = JSON.parse(localStorage.getItem(KEY+"_me")||"null"); }catch(e){} }
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(DB)); }catch(e){ alert("تعذّر الحفظ محلياً — تحقّق من مساحة المتصفح."); } sync(); }
function api(){ try{ return localStorage.getItem(API)||""; }catch(e){ return ""; } }
/* ⛔ مؤشّرُ حالة المزامنة في الهيدر. حُذف تعريفُه سهواً ٢٩ سبتمبر ٢٠٢٦ حين
   أُعيدت كتابةُ طبقة المزامنة، وبقيت نداءاتُه السبعة — فكان كلُّ `save()`
   يسقط بـReferenceError بعد أن يكتب محلياً وقبل أن يُزامن. أي أن المنصةَ كانت
   تحفظ على الجهاز ولا تُرسل شيئاً إلى المخزن المشترك. */
function setSyn(t, cls){
  const s = document.getElementById("syn");
  if(!s) return;
  s.textContent = t; s.className = cls || "";
}

/* ═════════ المزامنة ═════════
   ⛔ حدُّ المخزن القديم المجاني **ألفُ كتابةٍ في اليوم** للمنظومة كلِّها لا لكل
      مستخدم. وكانت المزامنة تُكتب بعد كل توقّفٍ يقارب الثانية — فمعلمٌ يملأ
      تحضيراً واحداً كان يستهلك خمسين كتابة، وعشرون معلماً يستنفدون اليومَ كلَّه.
   العلاج: تأخيرٌ اثنتا عشرةَ ثانية · ولا تُكتب إن لم تتغيّر القاعدة فعلاً ·
      ودفعٌ فوريٌّ عند الأفعال الحاسمة وعند مغادرة الصفحة. */
let syncT = null, lastSent = "", pending = false, writeFails = 0;
const SYNC_WAIT = 12000;

function dbSnapshot(){ try{ return JSON.stringify(DB); }catch(e){ return ""; } }

function pushNow(){
  clearTimeout(syncT); syncT = null;
  if(!api()) return Promise.resolve(false);
  const body = dbSnapshot();
  if(!body || body === lastSent){ pending = false; setSyn(""); return Promise.resolve(true); }
  setSyn("يُحفظ…");
  return fetch(api(), {method:"POST", headers:{"Content-Type":"text/plain;charset=utf-8"}, body:
      JSON.stringify({kind:"platform", id:DBID, data: JSON.parse(body)})})
    .then(r=>{
      if(r.status === 429 || r.status === 503) throw new Error("limit");
      return r.json();
    })
    .then(r=>{
      if(r && r.ok && r.data){
        DB = r.data;
        try{ localStorage.setItem(KEY, JSON.stringify(DB)); }catch(e){}
      }
      lastSent = dbSnapshot(); pending = false; writeFails = 0;
      setSyn("حُفظ للجميع ✓", "oksyn");
      setTimeout(()=>setSyn(""), 2500);
      return true;
    })
    .catch(e=>{
      writeFails++;
      pending = true;
      setSyn(e.message === "limit" ? "تعذّر الحفظ المشترك — يُعاد قريباً" : "محفوظٌ محلياً — بانتظار الشبكة",
             "warnsyn");
      /* ⚠️ لا تُفقد البيانات: تبقى محليةً ويُعاد الدفعُ بتباعدٍ متزايد */
      if(writeFails <= 6) syncT = setTimeout(pushNow, Math.min(60000, 5000 * writeFails));
      return false;
    });
}
function sync(){
  if(!api()){ setSyn("على هذا الجهاز فقط", "warnsyn"); return; }
  pending = true;
  if(dbSnapshot() === lastSent){ pending = false; return; }
  setSyn("سيُحفظ…");
  clearTimeout(syncT);
  syncT = setTimeout(pushNow, SYNC_WAIT);
}
/* الأفعالُ الحاسمة تُدفع فوراً لا بعد اثنتي عشرة ثانية */
function syncFlush(){ if(api() && pending) return pushNow(); return Promise.resolve(true); }
addEventListener("visibilitychange", ()=>{ if(document.visibilityState === "hidden") syncFlush(); });
addEventListener("pagehide", ()=>{
  if(!api() || !pending) return;
  try{ navigator.sendBeacon(api(),
       new Blob([JSON.stringify({kind:"platform", id:DBID, data:DB})], {type:"text/plain"})); }catch(e){}
});
addEventListener("beforeunload", (e)=>{
  if(api() && pending){ syncFlush(); }
});
function pull(){
  if(!api()) return Promise.resolve(false);
  return fetch(api()+"?kind=platform&id=" + DBID + "").then(r=>r.json())
    .then(r=>{ if(r && r.ok && r.data){ DB = Object.assign(DB, r.data); lastSent = dbSnapshot();
      try{ localStorage.setItem(KEY, JSON.stringify(DB)); }catch(e){} return true; } return false; })
    .catch(()=>false);
}
/* ═════════ سلّةُ المحذوفات ═════════
   ⛔ لا يُمحى شيءٌ نهائياً بضغطة: يُنقل إلى السلّة بكامله — الحصةُ وتحضيرُها
      ورصدُها وبطاقاتُ أقرانها — ومعه من حذف ومتى، ويُستردّ بنقرة.
   ⚠️ وتُخزَّن داخل `prep` بمفتاحٍ مسبوقٍ بـ`~trash~` لا في مفتاحٍ جديد:
      دالةُ الدمج في الخادم المنشور تدمج `prep` بالمفاتيح وتتجاهل ما عداها،
      فلو وُضعت في مفتاحٍ مستحدَثٍ ضاعت عند أول مزامنةٍ من جهازٍ آخر.
      (وقد نُصّ عليه في شفرة الخادم — وهي في المجلد الخاصّ — ليُراعى عند تحديثه.) */
/* ═════════ سجلُّ العمليات ═════════
   ⚠️ `~trash~` و`~log~` مفاتيحُ جانبيةٌ داخل `prep` — لا تحضيرات. وُضعت هناك
      لأن خادمَ المستشار يدمج خمسةَ مفاتيحَ ويتجاهل ما عداها، فالمفتاحُ الجديد
      يضيع. ويُستثنيان من كل عدٍّ للتحضيرات. */
const TRASH = "~trash~", LOG = "~log~";
const LOG_MAX = 600;                       /* حدٌّ يمنع تضخّم القاعدة */
/* ⚠️ الوقتُ وحده لا يكفي للترتيب: عمليتان في الميلي‑ثانية نفسها تتساويان
   فيختلّ ترتيبُهما. فيُضاف عدّادٌ متسلسلٌ داخل المفتاح، ويُرتَّب بالمفتاح. */
let logSeq = 0;
function logKey(){
  return LOG + Date.now().toString(36) + "-" + (logSeq++).toString(36).padStart(4, "0")
       + "-" + Math.random().toString(36).slice(2, 6);
}
function logAct(act, what, L){
  if(!ME) return;
  DB.prep[logKey()] = {a: act, w: what, by: ME.name, r: ME.role,
                       t: new Date().toISOString(),
                       lid: L ? L.id : "", gk: L ? L.gk : ""};
  const keys = Object.keys(DB.prep).filter(k=>k.indexOf(LOG) === 0).sort();
  if(keys.length > LOG_MAX) keys.slice(0, keys.length - LOG_MAX).forEach(k=>delete DB.prep[k]);
}
function logList(){
  /* يُرتَّب بالمفتاح لا بالوقت: المفتاحُ يحمل الوقتَ ثم التسلسل فلا يتساوى اثنان */
  return Object.keys(DB.prep || {}).filter(k=>k.indexOf(LOG) === 0)
    .sort().reverse()
    .map(k=>DB.prep[k]).filter(Boolean);
}
function trashKey(id){ return TRASH + id; }
function trashList(){
  return Object.keys(DB.prep || {}).filter(k=>k.indexOf(TRASH) === 0)
    .map(k=>DB.prep[k]).filter(x=>x && x.L)
    .sort((a,b)=>(b.at||"").localeCompare(a.at||""));
}
function dropLesson(id){
  const L = DB.sched.find(x=>x.id===id);
  if(L){
    const obs = {}, peer = {};
    Object.keys(DB.obs).forEach(k=>{ if(k.indexOf(id+"|")===0) obs[k] = DB.obs[k]; });
    Object.keys(DB.peer).forEach(k=>{ if(k.indexOf(id+"|")===0) peer[k] = DB.peer[k]; });
    DB.prep[trashKey(id)] = {L: JSON.parse(JSON.stringify(L)),
      prep: DB.prep[id] ? JSON.parse(JSON.stringify(DB.prep[id])) : null,
      obs: obs, peer: peer, by: (ME && ME.name) || "—", at: new Date().toISOString()};
  }
  if(L) logAct("حذف", [L.teacher, L.stage, L.period, L.week, L.day].filter(Boolean).join(" · "), L);
  DB.__deleted = (DB.__deleted || []).concat([id]);
  DB.sched = DB.sched.filter(y=>y.id!==id);
  delete DB.prep[id];
  Object.keys(DB.obs).forEach(k=>{ if(k.indexOf(id+"|")===0) delete DB.obs[k]; });
  Object.keys(DB.peer).forEach(k=>{ if(k.indexOf(id+"|")===0) delete DB.peer[k]; });
  purgeTrash();
  save(); syncFlush();
}
/* الاستردادُ يعيد كلَّ ما عُلِّق بالحصة لا الحصةَ وحدها */
function restoreLesson(id){
  const t = DB.prep[trashKey(id)];
  if(!t || !t.L) return false;
  if(DB.sched.some(x=>x.gk === t.L.gk && x.id !== id)){
    alert("لا يمكن الاسترداد: خانةُ هذه الحصة شُغِلت بحصةٍ أخرى بعد حذفها.");
    return false;
  }
  DB.sched.push(t.L);
  if(t.prep) DB.prep[t.L.id] = t.prep;
  Object.keys(t.obs || {}).forEach(k=>{ DB.obs[k] = t.obs[k]; });
  Object.keys(t.peer || {}).forEach(k=>{ DB.peer[k] = t.peer[k]; });
  logAct("استرداد", [t.L.teacher, t.L.stage, t.L.period].filter(Boolean).join(" · "), t.L);
  DB.__deleted = (DB.__deleted || []).filter(x=>x !== id);
  delete DB.prep[trashKey(id)];
  save(); syncFlush();
  return true;
}
/* ما مضى عليه ثلاثون يوماً يُمحى نهائياً — وإلا تضخّمت القاعدة بلا حدّ */
function purgeTrash(){
  const cut = Date.now() - 30*24*3600*1000;
  Object.keys(DB.prep || {}).forEach(k=>{
    if(k.indexOf(TRASH) !== 0) return;
    const t = DB.prep[k];
    if(t && t.at && new Date(t.at).getTime() < cut) delete DB.prep[k];
  });
}

/* ───────── أدوات ───────── */
function fld(type, val, onch, opts, ph){
  let e;
  if(type === "sel"){ e = el("select"); (opts||[]).forEach(o=>{ const x=el("option",null,o); x.value=o; e.appendChild(x); });
    /* اسمُ الحقل داخل خانة الاختيار نفسها — فلا يُسأل «ماذا أختار؟» */
    const b = el("option",null, ph ? "— اختر " + ph + " —" : "— اختر —"); b.value="";
    e.insertBefore(b, e.firstChild); }
  else if(type === "area"){ e = el("textarea"); }
  else { e = el("input"); e.type = "text"; }
  if(ph) e.placeholder = ph;
  e.value = val == null ? "" : val;
  e.addEventListener("focus", ()=>{ const r = e.closest(".row2,.stg,td,.cellbox,.f,label,div");
    if(r) r.classList.add("editing"); });
  e.addEventListener("blur", ()=>{ document.querySelectorAll(".editing").forEach(x=>x.classList.remove("editing"));
    e.classList.add("touched"); });
  e.addEventListener("input", ()=>{ e.classList.add("touched"); onch(e.value); });
  e.addEventListener("change", ()=>onch(e.value));
  return e;
}
function lessonTitle(L){
  return [L.subject, L.klass, L.teacher].filter(Boolean).join(" · ") || "حصة بلا بيانات";
}
function lessonSub(L){
  return [L.sector, L.complex, L.stage, L.school, L.week, L.day, "الحصة " + (L.period||""), L.time]
    .filter(Boolean).join(" · ");
}
/* ⚠️ زياراتُ الزائر تُعرف **برقمه الوظيفي** إن وُجد، فالاسمُ يتشابه ويُكتب
   بصيغٍ شتّى. ويُقبل الاسمُ احتياطاً لمن لا رقمَ له في الكشف. */
function isMyVisit(L){
  const e = (ME.emp||"").trim(), n = (ME.name||"").trim();
  if(e && [(L.peer1e||"").trim(), (L.peer2e||"").trim()].indexOf(e) >= 0) return true;
  if(!n) return false;
  /* لا يُطابَق بالاسم على خانةٍ أُسنِدت برقمٍ لشخصٍ آخر */
  if((L.peer1||"").trim() === n && !((L.peer1e||"") && e && L.peer1e !== e)) return true;
  if((L.peer2||"").trim() === n && !((L.peer2e||"") && e && L.peer2e !== e)) return true;
  return false;
}
function myLessons(){
  const n = (ME.name||"").trim();
  if(isEval()) return DB.sched;
  if(ME.role === "teacher")   return DB.sched.filter(L => (L.teacher||"").trim() === n);
  return DB.sched.filter(isMyVisit);
}
function prog(L){                                   /* تقدّم الحصة */
  const p = DB.prep[L.id], issued = p && p.__issued;
  const obs = Object.keys(DB.obs).filter(k=>k.startsWith(L.id+"|")).length;
  const pr  = Object.keys(DB.peer).filter(k=>k.startsWith(L.id+"|")).length;
  const br  = Object.values(DB.obs).some(o=>o.__lid===L.id && (o.bridge||"").trim());
  return {issued:!!issued, obs, pr, br};
}

/* ───────── شاشة الدخول ───────── */
/* ═════════ بوّابةُ المستشار ═════════
   ⚠️ صفحةٌ ساكنةٌ على مستودعٍ عامّ لا تُخفي سرًّا: من يفتح مصدرَ الصفحة يراه.
      فالمخزونُ هنا **بصمةٌ** لا كلمةٌ — PBKDF2-HMAC-SHA256 بمئةٍ وخمسين ألف
      دورةٍ وملحٍ عشوائي، فاستخراجُ الكلمة منها غيرُ عمليّ. وما تحرسه البوّابةُ
      هو الأزرارُ والأدوات، أما البياناتُ فيحرسها أن عنوانَ المخزن لا يُنشر.
   ⚠️ و`crypto.subtle` لا يعمل على `file://` (سياقٌ غيرُ آمن)، والمستشارُ يفتح
      الملفَّ محلياً أحياناً — فمعه تطبيقٌ خالصٌ يُعطي البصمةَ نفسَها بالضبط. */
const AUTH = (function(){
  /* — SHA-256 خالص — */
  const K=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
  0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
  0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
  0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
  0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
  0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
  0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
  0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  function sha256(bytes){
    const l=bytes.length, bl=l*8, wl=(((l+8)>>6)+1)<<4, m=new Int32Array(wl);
    for(let i=0;i<l;i++) m[i>>2]|=bytes[i]<<(24-(i%4)*8);
    m[l>>2]|=0x80<<(24-(l%4)*8); m[wl-1]=bl;
    const H=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    const w=new Int32Array(64);
    for(let i=0;i<wl;i+=16){
      let a=H[0],b=H[1],c=H[2],d=H[3],e=H[4],f=H[5],g=H[6],h=H[7];
      for(let j=0;j<64;j++){
        if(j<16) w[j]=m[i+j];
        else{ const x=w[j-15],y=w[j-2];
          w[j]=(((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3))+w[j-7]+
               (((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10))+w[j-16]|0; }
        const S1=((e>>>6)|(e<<26))^((e>>>11)|(e<<21))^((e>>>25)|(e<<7));
        const t1=h+S1+((e&f)^(~e&g))+K[j]+w[j]|0;
        const S0=((a>>>2)|(a<<30))^((a>>>13)|(a<<19))^((a>>>22)|(a<<10));
        const t2=S0+((a&b)^(a&c)^(b&c))|0;
        h=g;g=f;f=e;e=d+t1|0;d=c;c=b;b=a;a=t1+t2|0;
      }
      H[0]=H[0]+a|0;H[1]=H[1]+b|0;H[2]=H[2]+c|0;H[3]=H[3]+d|0;
      H[4]=H[4]+e|0;H[5]=H[5]+f|0;H[6]=H[6]+g|0;H[7]=H[7]+h|0;
    }
    const o=new Uint8Array(32);
    for(let i=0;i<8;i++){ o[i*4]=H[i]>>>24&255;o[i*4+1]=H[i]>>>16&255;o[i*4+2]=H[i]>>>8&255;o[i*4+3]=H[i]&255; }
    return o;
  }
  function hmac(key, msg){
    let k = key.length>64 ? sha256(key) : key;
    const ip=new Uint8Array(64), op=new Uint8Array(64);
    for(let i=0;i<64;i++){ const b=i<k.length?k[i]:0; ip[i]=b^0x36; op[i]=b^0x5c; }
    const a=new Uint8Array(64+msg.length); a.set(ip); a.set(msg,64);
    const h1=sha256(a);
    const b2=new Uint8Array(96); b2.set(op); b2.set(h1,64);
    return sha256(b2);
  }
  function pbkdf2JS(pw, salt, it){          /* dkLen = 32 ⇒ كتلةٌ واحدة */
    const b=new Uint8Array(salt.length+4); b.set(salt); b[salt.length+3]=1;
    let u=hmac(pw,b), t=u.slice(0);
    for(let i=1;i<it;i++){ u=hmac(pw,u); for(let j=0;j<32;j++) t[j]^=u[j]; }
    return t;
  }
  const enc = s => new TextEncoder().encode(s);
  const hex = a => Array.from(a).map(b=>b.toString(16).padStart(2,"0")).join("");
  const unhex = s => new Uint8Array(s.match(/../g).map(h=>parseInt(h,16)));
  async function derive(pw, saltHex, it){
    const salt = unhex(saltHex);
    if(typeof crypto !== "undefined" && crypto.subtle){
      try{
        const k = await crypto.subtle.importKey("raw", enc(pw), "PBKDF2", false, ["deriveBits"]);
        const bits = await crypto.subtle.deriveBits(
          {name:"PBKDF2", salt: salt, iterations: it, hash:"SHA-256"}, k, 256);
        return hex(new Uint8Array(bits));
      }catch(e){ /* يسقط إلى الخالص */ }
    }
    return hex(pbkdf2JS(enc(pw), salt, it));
  }
  async function sha256hex(s){ return hex(sha256(enc(s))); }
  return {derive, sha256hex};
})();

/* ⛔ المستشارُ يرى ما لا يراه غيرُه: أدواتِ المخزن ورابطَ الدعوة وسجلَّ
   العمليات والتفريغَ والنسخةَ الاحتياطية. والمقيّمُ (مديرٌ أو وكيلٌ أو مشرف)
   يرى عملَه كلَّه ولا يرى أدواتِ المنظومة. طلبَه المستشارُ ٢٩ سبتمبر ٢٠٢٦. */
function isAdmin(){ return !!ME && ME.role === "admin"; }
/* ═════════ الأدوارُ الخمسة وما يجمعها ═════════
   ⛔ كان «evaluator» دوراً واحداً يجمع المديرَ والوكيلَ والمشرف، ففُصلوا ٢٩
      سبتمبر ٢٠٢٦. وما يُشترك فيه ثلاثتُهم يمرّ بـisEval()، وما يخصّ واحداً
      منهم له حارسُه: isPrincipal() · isDeputy() · isSupervisor().
   ⚠️ ولا يُستبدل نصُّ الشرط داخل هذه التعاريف باستدعاءٍ للدالة نفسِها —
      أصاب ذلك isEval وroleTitle مرّتين فصارتا تستدعيان نفسَيهما. */
const EVAL_ROLES_K = ["principal", "deputy", "supervisor", "supervision"];
/* ⛔ مديرُ الإشراف التربوي: يرى نطاقاتِ الإشراف كلَّها ومتابعةَ مشرفيها، ولا
   يُثبَّت على مدرسةٍ ولا على تخصصٍ واحد. (قادة الأمة — ٢٩ سبتمبر ٢٠٢٦) */
function isSupervision(){ return !!ME && ME.role === "supervision"; }
function isEval(){ return !!ME && (EVAL_ROLES_K.indexOf(ME.role) >= 0 || ME.role === "admin"); }
function isPrincipal(){ return !!ME && ME.role === "principal"; }
function isDeputy(){ return !!ME && ME.role === "deputy"; }
function isSupervisor(){ return !!ME && ME.role === "supervisor"; }
/* المدرسةُ نطاقٌ ثابتٌ للمدير والوكيل — لا يختارانه في كل شاشة */
function isSchoolBound(){ return isPrincipal() || isDeputy(); }
/* من يتنقّل بين المجمعات بتخصصه: المشرفُ والزائر */
function isRoving(){ return isSupervisor() || isSupervision() || (ME && ME.role === "peer"); }
/* صفةُ المقيّم في بطاقة الرصد تُشتقّ من دوره لا تُسأل */
function myEvalSlot(){
  const i = EVAL_ROLES_K.indexOf(ME ? ME.role : "");
  return i < 0 ? "" : ["ev1", "ev2", "ev3"][i];
}
function roleTitle(){
  if(isAdmin()) return D.adminrole || "مديرُ المنصة";
  /* ⚠️ لا تُستبدل هذه السطرُ بـroleTitle() — كان استبدالٌ شاملٌ قد أصابها فصارت
     تستدعي نفسَها بلا نهاية وسقط التطبيقُ كلُّه عند أول رسم. */
  return (D.roles.find(r=>r.k===ME.role)||{}).t || "";
}
/* الدورُ الفعّالُ لترشيح المراحل: `who` في المراحل ما زال يقول "evaluator"،
   فيُترجَم له كلُّ من يقيّم — وتبقى قوائمُ المراحل كما هي بلا مساس. */
function effRole(){ return isEval() ? "evaluator" : ME.role; }

function login(){
  document.body.innerHTML = "";
  const w = el("div","login");
  w.appendChild(el("h2","","منصة الحصة الموحَّدة"));
  /* ⛔ اسمُ المدرسة في أول شاشة: الداخلُ يجب أن يعرف منصةَ من يفتح قبل أن
     يختار دوره — وإلا دخل منصةَ مدرسةٍ ليست له. (٢٩ سبتمبر ٢٠٢٦) */
  if(D.school){
    const sc = el("p","", D.school + (D.stagelabel ? " · " + D.stagelabel : ""));
    sc.style.cssText = "font-weight:700;color:#355E91;margin-top:-6px";
    w.appendChild(sc);
  }
  w.appendChild(el("p","","اختر دورك — ولكل دورٍ ما يخصّه فقط"));
  const rs = el("div","roles");
  let pick = null, picked = null;
  /* ── نطاقُ الدور: يظهر بعد اختياره، ولكل دورٍ سؤالُه لا سؤالُ غيره ── */
  const scope = el("div","scope"); scope.style.display = "none";
  const selSector = el("select"), selComplex = el("select"),
        selSchool = el("select"), selSpec = el("select");
  [["القطاع", selSector], ["المجمع التعليمي", selComplex],
   ["مدرستك", selSchool], ["تخصصك", selSpec]].forEach(([t, e])=>{
    e.setAttribute("aria-label", t);
    const l = el("label","f"); l.appendChild(el("span",null,t)); l.appendChild(e);
    e.__lab = l; scope.appendChild(l);
  });
  const opts = (e, list, keep)=>{
    const cur = keep && list.indexOf(e.value) >= 0 ? e.value : (list[0] || "");
    e.innerHTML = "";
    list.forEach(v=>{ const o = el("option",null,v); o.value = v; e.appendChild(o); });
    e.value = cur;
  };
  const fillComplex = ()=>{
    opts(selComplex, D.complexes[selSector.value] || D.complexlist, true);
    fillSchool();
  };
  const fillSchool = ()=> opts(selSchool, (D.bands[selComplex.value] || [])
      .map(b=>b.stage).filter((v,i,a)=>a.indexOf(v) === i), true);
  opts(selSector, D.sectors); opts(selSpec, D.specs); fillComplex();
  selSector.addEventListener("change", fillComplex);
  selComplex.addEventListener("change", fillSchool);

  const showScope = ()=>{
    const sc = picked ? picked.scope : "";
    scope.style.display = sc ? "" : "none";
    /* ⛔ المدير والوكيل: مدرسةٌ واحدةٌ تُثبَّت. والمشرفُ والزائرُ والمعلم: تخصص. */
    selSector.__lab.style.display  = sc === "school" ? "" : "none";
    selComplex.__lab.style.display = sc === "school" ? "" : "none";
    selSchool.__lab.style.display  = sc === "school" ? "" : "none";
    selSpec.__lab.style.display    = sc === "spec" ? "" : "none";
  };
  D.roles.forEach(r=>{
    const b = el("div","role");
    b.appendChild(el("b",null,r.t));
    b.appendChild(el("span",null,r.d));
    b.addEventListener("click", ()=>{
      pick = r.k; picked = r;
      [...rs.children].forEach(x=>x.classList.remove("on")); b.classList.add("on");
      showScope();
    });
    rs.appendChild(b);
  });
  w.appendChild(rs);
  /* ⛔ الرقمُ الوظيفي هو الهوية: الأسماءُ تتشابه وتُكتب بصيغٍ شتّى، فيظهر الشخصُ
     مرّتين في التقارير. فإن وُجد الرقمُ في الكشف استُدعي الاسمُ منه ولم يُكتب. */
  const hasR = D.roster && Object.keys(D.roster).length;
  const no = el("input"); no.type = "text"; no.inputMode = "numeric";
  no.placeholder = hasR ? "الرقم الوظيفي" : "الرقم الوظيفي (اختياري)";
  no.setAttribute("aria-label","الرقم الوظيفي");
  const nm = el("input"); nm.type="text"; nm.placeholder="الاسم";
  nm.setAttribute("aria-label","الاسم");
  const found = el("div","whois");
  no.addEventListener("input", ()=>{
    const k = no.value.replace(/\D/g,"");
    const r = D.roster[k];
    if(r){
      nm.value = r.n; nm.readOnly = true;
      found.className = "whois ok";
      /* ⚠️ لغةُ الكشف غيرُ لغة المنصة (E · حاسب آلي · إسلامية)، فتُترجم.
         و«أخرى» تُترك فارغةً يختارها صاحبُها — لا يُخمَّن له تخصص. */
      const sp = (D.specmap || {})[r.s] || "";
      if(sp && D.specs.indexOf(sp) >= 0) selSpec.value = sp;
      if(D.complexes[selSector.value] && D.complexes[selSector.value].indexOf(r.c) >= 0){
        selComplex.value = r.c; fillSchool();
      }
      found.textContent = r.n + " — " + r.s + (sp && sp !== r.s ? " (" + sp + ")" : "")
                        + " · " + r.g + " · مجمع " + r.c + " · " + r.k
                        + (sp ? "" : " — تخصصُه «أخرى»، فاختره بنفسك.");
    } else {
      nm.readOnly = false;
      found.className = "whois" + (k ? " no" : "");
      found.textContent = k ? "لا يطابق رقماً في الكشف — اكتب اسمك يدوياً." : ""; }
  });
  w.appendChild(no); w.appendChild(found); w.appendChild(nm);
  nm.style.marginBottom="12px";
  w.appendChild(scope);
  const go = el("button","b","دخول");
  go.addEventListener("click", ()=>{
    if(!pick) return alert("اختر دورك أولاً.");
    if(!nm.value.trim()) return alert("اكتب اسمك — به تُعرف حصصك.");
    const sc = picked.scope;
    ME = {role:pick, name:nm.value.trim(), emp:no.value.replace(/\D/g,"")};
    if(sc === "school"){
      if(!selSchool.value) return alert("اختر مدرستك — عليها يُبنى كلُّ ما تراه.");
      ME.sector = selSector.value; ME.complex = selComplex.value; ME.school = selSchool.value;
    } else if(sc === "spec"){
      if(!selSpec.value) return alert("اختر تخصصك — به تُعرف حصصك وزياراتك.");
      ME.spec = selSpec.value;
      const cx = selComplex.value;
      if(cx) ME.complex = cx;
    }
    localStorage.setItem(KEY+"_me", JSON.stringify(ME));
    /* ⚠️ حالةُ الترشيح تُبنى من جديدٍ على نطاق الداخل، وإلا ورث سياقَ سابقه */
    try{ localStorage.removeItem(KEY+"_ctx"); }catch(e){}
    GS = null;
    PH = isEval() ? 1 : (pick === "peer" ? 5 : 2);
    boot();
  });
  w.appendChild(go);
  const note = el("p"); note.style.cssText="margin-top:16px;font-size:14px";
  note.textContent = "بياناتك تُحفظ في هذا الجهاز، وتصل إلى المنظومة عبر الرابط الذي زُوّدت به.";
  w.appendChild(note);
  /* ── مدخلُ المستشار: سطرٌ خفيفٌ لا بطاقةٌ بين البطاقات ── */
  if(D.admin){
    const al = el("button","lnk","دخول المستشار ومدير المنصة");
    al.style.cssText = "margin-top:10px;font-size:14px";
    al.addEventListener("click", adminLogin);
    w.appendChild(al);
  }
  if(D.build){ const bs = el("div","bst", D.build); bs.style.marginTop = "10px"; w.appendChild(bs); }
  document.body.appendChild(w);
}


/* ═════════ دخولُ المستشار ═════════
   ⚠️ صراحةً: صفحةٌ ساكنةٌ على مستودعٍ عامّ لا تُخفي محتواها عمّن يقرأ مصدرَها،
      وهذه البوّابةُ تحرس **الأدواتِ** لا البيانات. وحارسُ البيانات الحقيقي أن
      عنوانَ المخزن لا يُنشر، وأن الخادمَ وحدَه يملكها. */
function adminLogin(){
  document.body.innerHTML = "";
  const w = el("div","login");
  w.appendChild(el("h2","","دخولُ المستشار"));
  w.appendChild(el("p","","البريدُ وكلمةُ المرور — ولك وحدك أدواتُ المنظومة"));
  const em = el("input"); em.type="email"; em.placeholder="البريد";
  em.setAttribute("aria-label","البريد"); em.autocomplete="username";
  const pw = el("input"); pw.type="password"; pw.placeholder="كلمة المرور";
  pw.setAttribute("aria-label","كلمة المرور"); pw.autocomplete="current-password";
  pw.style.marginBottom="12px";
  const msg = el("div","whois");
  w.appendChild(em); w.appendChild(pw); w.appendChild(msg);
  const go = el("button","b","دخول");
  const tryIn = ()=>{
    const e = (em.value||"").trim().toLowerCase(), k = pw.value || "";
    if(!e || !k){ msg.className="whois no"; msg.textContent="اكتب البريد وكلمة المرور."; return; }
    go.disabled = true; msg.className="whois"; msg.textContent="يُتحقَّق…";
    AUTH.sha256hex("cls-user|" + e).then(uh=>
      AUTH.derive(k, D.admin.s, D.admin.it).then(ph=>{
        /* ⚠️ المقارنةُ على الاثنين معاً، ورسالةُ الخطأ واحدةٌ لا تُفرّق بينهما */
        if(uh === D.admin.u && ph === D.admin.h){
          ME = {role:"admin", name: D.adminname || D.owner || "مدير المنصة", emp:""};
          localStorage.setItem(KEY+"_me", JSON.stringify(ME));
          PH = 1; boot();
        } else {
          go.disabled = false; pw.value = "";
          msg.className="whois no"; msg.textContent="البريدُ أو كلمةُ المرور غيرُ صحيحة.";
        }
      })).catch(()=>{ go.disabled=false; msg.className="whois no";
                      msg.textContent="تعذّر التحقّق في هذا المتصفح."; });
  };
  go.addEventListener("click", tryIn);
  pw.addEventListener("keydown", ev=>{ if(ev.key === "Enter") tryIn(); });
  w.appendChild(go);
  const bk = el("button","lnk","‹ رجوعٌ إلى اختيار الدور");
  bk.style.cssText="margin-top:14px;font-size:14px";
  bk.addEventListener("click", login);
  w.appendChild(bk);
  if(D.build){ const bs = el("div","bst", D.build); bs.style.marginTop="10px"; w.appendChild(bs); }
  document.body.appendChild(w);
}

/* ═════════ ترتيبُ المراحل ═════════
   ⚠️ مصدرٌ واحدٌ للشريط الجانبي ولأسهم «السابق/التالي» في الهيدر — وإلا تنقّل
      السهمُ إلى مرحلةٍ لا يراها صاحبُها في الشريط. */
function navItems(){
  let items = D.phases.filter(p=>p.who.includes(effRole()))
    .map(p=>({id:p.id, t:p.t, s:p.s}));
  const mine5 = isEval()
    ? {id:5, t:"لوحة المدرسة والتقارير", s:"تقارير التفعيل والنتائج"}
    : (ME.role === "teacher"
        ? {id:5, t:"تقريري", s:"حصصك ودرجاتُها وإجراءاتُ جسرك"}
        : {id:5, t:"زياراتي المسنَدة", s:"ابدأ من هنا — ما أُسنِد إليك وما بقي"});
  /* ⛔ شريطُ المعلم الزائر: أربعُ خطواتٍ بترتيب زيارته، تبدأ بما أُسنِد إليه،
     وبأسماءٍ تقول له ما يفعل لا ما اسمُ المرحلة — ولا مصفوفةَ جدولةٍ لا يجدولها.
     «حتى لا يضل ويتوه» (٢٩ سبتمبر ٢٠٢٦). */
  if(ME.role === "peer"){
    const T4 = {
      6: ["اقرأ تحضير زميلك", "قبل أن تدخل الفصل"],
      3: ["املأ بطاقة الزيارة", "أثناء الحصة وبعدها مباشرةً"],
      4: ["النتيجة وإجراؤك", "ما نقلتَه لنفسك من الزيارة"],
    };
    return [mine5].concat([6,3,4].map(id=>{
      const p = items.find(x=>x.id === id);
      return p ? {id:id, t:T4[id][0], s:T4[id][1]} : null;
    }).filter(Boolean));
  }
  /* ═════════ شريطُ المستشار ═════════
     ⛔ كان شريطُه شريطَ المعلم حرفياً: «الاستعداد والتحضير» و«تنفيذ الحصة»
        و«رصد الحصة» — وهو لا يحضّر ولا ينفّذ ولا يرصد، والنصوصُ تخاطبه
        بـ«اختر حصتك» و«املأ خانات التحضير». نبّه عليه المستشارُ ٢٩ سبتمبر
        ٢٠٢٦: «ليس من الصحيح أن تظهر له هذه العناصر مثله كالمعلم تماماً».
     فصار شريطُه أربعةَ بنودٍ هي عملُه فعلاً: يرى الحالَ، ويهيّئ الجدول،
     ويقرأ التقارير، ويملك أدواتِ المنظومة. ويفتح أي حصةٍ للمراجعة من
     اللوحة أو التقارير — مراجعةً لا تنفيذاً. */
  if(isAdmin()) return [
    {id: 7, t: "لوحةُ المنظومة", s: "حالُ التفعيل في سطرٍ واحد — وما يحتاج تدخّلك"},
    {id: 1, t: "الجدول والإسناد", s: "تهيئةُ الحصص وإسنادُ الزائرين ومتابعتُهما"},
    {id: 5, t: "التقارير", s: "سبعةُ تقاريرَ تُطبع وتُصدَّر"},
    {id: 8, t: "أدواتُ المنصة", s: "المخزن · الدعوة · السجلّ · السلّة · النسخة · التفريغ"},
  ];
  items.push(mine5);
  return items;
}

/* ───────── الهيكل ───────── */
function render(){ shell(); }
function shell(){
  autoPull();
  document.body.innerHTML = "";
  const top = el("header","top"), tw = el("div","wrap row");
  const left = el("div"); left.style.cssText="display:flex;align-items:center;gap:12px";
  if(LOGO){ const g=document.createElement("img"); g.src="data:image/jpeg;base64,"+LOGO; left.appendChild(g); }
  const ttl = el("div");
  ttl.appendChild(el("h1",null,"منصة الحصة الموحَّدة"));
  ttl.appendChild(el("div",null,D.school)).style.cssText="font-family:JZL,SK;font-size:14px;opacity:.9";
  left.appendChild(ttl);
  /* تنقّلٌ بين المراحل من الهيدر: السابق والتالي ضمن مراحل هذا الدور */
  const seq = navItems().map(p=>p.id);
  const at = seq.indexOf(PH);
  const nav2 = el("div","pnav");
  const mkn = (t, to, dis) => {
    const b = el("button", dis ? "off" : "", t);
    if(!dis) b.addEventListener("click", ()=>{ PH = to; shell(); window.scrollTo(0,0); });
    b.disabled = !!dis; nav2.appendChild(b);
  };
  mkn("◄ السابق", seq[at-1], at <= 0);
  nav2.appendChild(el("i",null, "المرحلة " + arn(at+1) + " من " + arn(seq.length)));
  mkn("التالي ►", seq[at+1], at < 0 || at >= seq.length-1);
  const me = el("div","me");
  me.appendChild(el("span",null,roleTitle() + " · " + ME.name));
  const sv = el("span"); sv.id="syn"; sv.style.cssText="font-size:13px;color:#bfe3c9"; me.appendChild(sv);
  const ob = el("button",null,"خروج");
  ob.addEventListener("click", ()=>{ localStorage.removeItem(KEY+"_me"); ME=null; login(); });
  me.appendChild(ob);
  tw.appendChild(left); tw.appendChild(nav2); tw.appendChild(me); top.appendChild(tw); document.body.appendChild(top);

  /* ── الشريط الجانبي الأيمن: مراحل الدور المختار ── */
  const wide = localStorage.getItem(KEY+"_wide") === "1";
  const body = el("div","body" + (wide ? " wide" : ""));
  const side = el("aside","side");
  /* طيُّ الشريط الجانبي: الجدولُ عريضٌ فيأخذ الشاشةَ كلَّها عند الحاجة */
  const fold = el("button","fold", wide ? "‹" : "›");
  fold.title = wide ? "إظهار الشريط" : "طيُّ الشريط لتوسيع الجدول";
  fold.addEventListener("click", ()=>{
    localStorage.setItem(KEY+"_wide", wide ? "0" : "1"); shell();
  });
  side.appendChild(fold);
  const PEER = ME.role === "peer";
  const sh0 = el("div","sh");
  sh0.appendChild(el("b",null, PEER ? "خطواتُ زيارتك" : "مراحل التطبيق"));
  sh0.appendChild(el("i",null,roleTitle()));
  side.appendChild(sh0);
  const nav = el("nav");
  const items = navItems();
  if(PEER){
    /* عدّادٌ يقول للزائر ما ينتظره بلا أن يفتح شيئاً */
    const asg = DB.sched.filter(isMyVisit);
    const doneIds = new Set(Object.keys(DB.peer)
      .filter(k=>k.split("|")[1] === (ME.name||"").trim()).map(k=>k.split("|")[0]));
    const left = asg.filter(L=>!doneIds.has(L.id)).length;
    const bx = el("div","cw");
    bx.appendChild(el("div","cwh","زياراتك"));
    bx.appendChild(el("div","cwt", left ? arn(left) + " زيارةً تنتظر بطاقتك"
                                        : (asg.length ? "أتممتَ زياراتك كلَّها ✓"
                                                      : "لا زياراتٍ مسنَدةً إليك بعد")));
    if(!asg.length) bx.appendChild(el("div","cws",
      "يُسنِدها وكيلُ المدرسة التعليمي — راجعه إن تأخّرت."));
    side.appendChild(bx);
  }
  items.forEach(p=>{
    const b = el("button", p.id===PH ? "on" : "");
    /* ⛔ العددُ موضعُ المرحلة في مسار هذا الدور لا معرّفُها الداخلي: كان
       الشريطُ يقرأ ١ · ٢ · ٦ · ٣ · ٤ · ٥ لأن «تنفيذ الحصة» أُضيفت متأخرةً
       بمعرّف ٦ ووضعُها الثالث. والمعرّفُ يبقى كما هو لأن التوجيهَ عليه.
       (٢٩ سبتمبر ٢٠٢٦) */
    b.appendChild(el("i",null,arn(items.indexOf(p) + 1)));
    const tx = el("span");
    tx.appendChild(el("b",null,p.t));
    tx.appendChild(el("small",null,p.s));
    b.appendChild(tx);
    b.addEventListener("click", ()=>{ PH=p.id; shell(); });
    nav.appendChild(b);
  });
  side.appendChild(nav);
  /* الحصة المفتوحة، ونقلةٌ سريعة بين مراحلها */
  const L0 = DB.sched.find(x=>x.id===CUR);
  if(L0){
    const cw = el("div","cw");
    cw.appendChild(el("div","cwh","الحصة المفتوحة"));
    cw.appendChild(el("div","cwt", lessonTitle(L0)));
    cw.appendChild(el("div","cws", lessonSub(L0)));
    const g0 = prog(L0);
    const tg = el("div","cwg");
    const tag = (ok,txt)=>tg.appendChild(el("span","tag " + (ok?"ok":"no"), txt));
    tag(g0.issued,"التحضير");
    tag(g0.obs>0,"الرصد " + arn(g0.obs) + "/٣");
    tag(g0.pr>0,"الأقران " + arn(g0.pr) + "/٢");
    cw.appendChild(tg);
    const cb = el("button","b ghost sm","إغلاق الحصة");
    cb.addEventListener("click", ()=>{ CUR=null; shell(); });
    cw.appendChild(cb);
    side.appendChild(cw);
  }
  const st0 = el("div","stbox " + (api() ? "linked" : "local"));
  if(api()){
    /* ⛔ أدواتُ المخزن — الحالةُ و«تحديث» و«رابط الدعوة» و«تغيير» — للمستشار
       وحده. كان يراها كلُّ مقيّمٍ (مديرٌ ووكيلٌ ومشرف)، فطلبَ المستشارُ حصرَها
       فيه: «وهذه كذلك لا تظهر إلا لي أنا فقط كمستشار ومدير للمنصة» (٢٩ سبتمبر
       ٢٠٢٦). وغيرُه لا يرى شيئاً، وتُسحب له البياناتُ تلقائياً عند التنقّل. */
    if(!isAdmin()){ st0.style.display = "none"; }
    else {
      const ln = el("div","okline");
      ln.appendChild(el("b",null,"متصلٌ بمخزن المنظومة"));
      const rf = el("button","lnk","تحديث");
      rf.addEventListener("click", ()=>pull().then(()=>shell()));
      ln.appendChild(rf);
      const inv = el("button","lnk","رابط الدعوة");
      inv.addEventListener("click", invite);
      ln.appendChild(inv);
      const ch = el("button","lnk","تغيير");
      ch.addEventListener("click", srv);
      ln.appendChild(ch);
      st0.appendChild(ln);
    }
  } else if(isAdmin()){
    st0.appendChild(el("b",null,"الحفظ على هذا الجهاز فقط"));
    st0.appendChild(el("span",null,
      "المكتوبُ هنا لا يصل إلى بقية المنظومة، ولا يصل منها شيء — والعلاجُ ربطُ الخادم مرةً واحدة."));
    const sbtn = el("div","stb");
    const lk = el("button","b sm","اربط الخادم");
    lk.addEventListener("click", srv); sbtn.appendChild(lk);
    if(D.guide){
      const gd = el("a","b ghost sm","كيف؟"); gd.href = D.guide; gd.target = "_blank";
      gd.style.textDecoration = "none"; sbtn.appendChild(gd);
    }
    st0.appendChild(sbtn);
  } else {
    /* معلمٌ أو زائرٌ بلا خادم: تنبيهٌ صامتٌ بلا أزرار — الربطُ ليس من شأنه */
    st0.appendChild(el("b",null,"غير متصلٍ بالمنظومة"));
    st0.appendChild(el("span",null,"راجع " + (D.adminref || "مشرف المنصة") + " لتزويدك برابط الدخول الصحيح."));
  }
  side.appendChild(st0);
  const sf = el("div","sf");
  sf.appendChild(el("div",null,D.school));
  if(D.build) sf.appendChild(el("div","bst", D.build));
  side.appendChild(sf);

  const m = el("main"), mw = el("div","mwrap"); m.appendChild(mw);
  body.appendChild(side); body.appendChild(m);
  const bw = el("div","wrap"); bw.appendChild(body);
  document.body.appendChild(bw);
  /* تذييلُ المنصة — بتوقيع صاحبها */
  const ft = el("footer"), fw = el("div","wrap frow");
  const f1 = el("div");
  f1.appendChild(el("b",null, D.school + " — " + D.sysname));
  f1.appendChild(el("span",null, "من التخطيط إلى الدرجة: جدولٌ واحد · تحضيرٌ واحد · استمارةٌ واحدة · تقاريرُ تُصدر نفسها"));
  const f2 = el("div","sig");
  f2.appendChild(el("b",null, D.owner_role));
  /* ⚠️ السطرُ الثاني رابطٌ إن وُجد عنوان — وإلا نصٌّ كما كان */
  if(D.owner_url){
    const a = el("a", null, D.owner);
    a.href = D.owner_url; a.target = "_blank"; a.rel = "noopener";
    a.style.cssText = "color:inherit;text-decoration:none";
    f2.appendChild(a);
  } else f2.appendChild(el("span",null, D.owner));
  if(D.build) f2.appendChild(el("i",null, D.build));
  fw.appendChild(f1); fw.appendChild(f2); ft.appendChild(fw);
  document.body.appendChild(ft);

  /* ⚠️ شاشتا المستشار (٧ لوحة · ٨ أدوات) ليستا في D.phases — ولهما عنوانُهما
     في الشريط، فلا صندوقَ شرحٍ لهما. وبدون هذا الحارس يسقط الرسمُ كلُّه. */
  if(PH !== 5 && D.phases.some(x=>x.id === PH)){
    const p = D.phases.find(x=>x.id===PH);
    const why = el("div","why");
    /* ⚠️ والعنوانُ يوافق الشريطَ: الموضعُ لا المعرّف */
    const _pos = navItems().findIndex(x=>x.id === PH);
    why.appendChild(el("h2",null,"المرحلة " + arn(_pos < 0 ? p.id : _pos + 1) + " · " + p.t));
    why.appendChild(el("p",null,p.why));
    const ol = el("ol"); p.steps.forEach(x=>ol.appendChild(el("li",null,x))); why.appendChild(ol);
    const dv = el("div","docs");
    /* لا يُعرض للمستخدم إلا ما يعنيه — والنجمةُ تعني الجميع */
    p.docs.forEach(([t,u,r])=>{
      if(r && r !== "*" && r.split(",").indexOf(ME.role) < 0) return;
      const a=el("a",null,t); a.href=u; a.target="_blank"; dv.appendChild(a);
    });
    /* نماذجُ معبّأةٌ في تخصص المعلم — يتعلّم منها طريقةَ التحضير */
    if(PH === 2 && ME.role === "teacher" && D.models){
      const sp = (gctx().spec) || "";
      const list = D.models[sp] || [];
      if(list.length){
        /* ⚠️ تُصنَّف بالمرحلة داخل التخصص: المعلمُ يقرأ نموذجَ مرحلته أولاً */
        const byStage = {};
        list.forEach(m=>{ (byStage[m.stage] = byStage[m.stage] || []).push(m); });
        const hd = el("div","mdl");
        hd.appendChild(el("b",null,"نماذج معبّأة في تخصصك (" + sp + ") — مرتَّبةً بالمرحلة:"));
        ["الابتدائية","المتوسطة","الثانوية"].forEach(st=>{
          const arr = byStage[st]; if(!arr || !arr.length) return;
          const r = el("div","mrow");
          r.appendChild(el("i",null, st));
          const ul = el("div","docs");
          arr.forEach(m=>{
            const a = el("a","mini", m.t.split("—").slice(1).join("—").trim() || m.t);
            a.href = m.u; a.target = "_blank"; a.title = m.t; ul.appendChild(a);
          });
          r.appendChild(ul); hd.appendChild(r);
        });
        why.appendChild(hd);
      }
    }
    why.appendChild(dv);
    mw.appendChild(why);
  }
  ({1:ph1, 2:ph2, 3:ph3, 4:ph4, 5:ph5, 6:ph6, 7:phBoard, 8:phTools})[PH](mw);
}

/* ⚠️ صياغةُ الوقت والصفة كانت داخل logView وحدَها، فلمّا احتاجتها اللوحةُ
   كان البديلُ نسخةً ثانيةً تفترق عنها. فاستُخرجتا دالّتين يقرأ منهما الاثنان. */
const ROLE_SHORT = {teacher:"معلم", peer:"زائر", evaluator:"مقيّم",
                    principal:"مدير", deputy:"وكيل", supervisor:"مشرف",
                    supervision:"مدير إشراف", admin:"مشرف المنصة"};
function roleName(k){ return ROLE_SHORT[k] || "—"; }
function agoTxt(t){
  const d = new Date(t || Date.now());
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if(mins < 1) return "الآن";
  if(mins < 60) return "قبل " + arn(mins) + " د";
  if(mins < 1440) return "قبل " + arn(Math.floor(mins / 60)) + " س";
  return arn(d.getDate()) + "/" + arn(d.getMonth() + 1) + " " +
         arn(String(d.getHours()).padStart(2, "0")) + ":" +
         arn(String(d.getMinutes()).padStart(2, "0"));
}

/* ═════════ لوحةُ المنظومة — للمستشار وحده ═════════
   ⛔ عملُ المستشار أن يعرف **أين تقف المنظومة** وما يحتاج تدخّله، لا أن
      يحضّر حصةً. فهذه أولُ شاشةٍ يفتحها: الحالُ في سطر، ثم ما تعطّل. */
function phBoard(m){
  const sch = DB.sched || [];
  const named = sch.filter(L=>(L.teacher||"").trim());
  let issued = 0, obsd = 0, appr = 0, peerd = 0, noPeer = 0;
  named.forEach(L=>{
    const g = prog(L);
    if(g.issued) issued++;
    if(g.obs > 0) obsd++;
    if(g.pr > 0) peerd++;
    if(L.approved) appr++;
    if(!(L.peer1e || L.peer1 || L.peer2e || L.peer2)) noPeer++;
  });
  const linked = !!api();

  /* ── الحالُ في سطر ── */
  const c1 = el("div","card"), h1 = el("h3");
  h1.appendChild(el("span",null,"حالُ المنظومة"));
  h1.appendChild(el("small",null, D.school + (D.stagelabel ? " · " + D.stagelabel : "")));
  c1.appendChild(h1);
  const p1 = el("div","pad");
  kpis(p1, [[arn(named.length), "حصةً مجدولةً باسم معلم"],
            [arn(issued), "صدر تحضيرُها"],
            [arn(obsd), "بدأ رصدُها"],
            [arn(appr), "اعتُمدت نتيجتُها"]]);
  c1.appendChild(p1); m.appendChild(c1);

  /* ── ما يحتاج تدخّلك ── */
  const c2 = el("div","card"), h2 = el("h3");
  h2.appendChild(el("span",null,"ما يحتاج تدخّلك"));
  h2.appendChild(el("small",null,"مرتَّبٌ بالأهمّ — وكلُّ بندٍ يفتح موضعَه"));
  c2.appendChild(h2);
  const p2 = el("div","pad");
  const items = [];
  const add = (bad, txt, act, go) => items.push({bad, txt, act, go});
  add(!linked, linked ? "المخزن المشترك مربوط — ويرى الجميعُ البياناتِ نفسَها"
                      : "المخزن المشترك غيرُ مربوط — ما يُكتب يبقى على جهاز صاحبه",
      linked ? "" : "اربط الخادم", ()=>srv());
  add(!named.length, named.length ? arn(named.length) + " حصةً مجدولةً"
                                  : "لا حصةَ مجدولةٌ بعد — والجدولُ أولُ الطريق",
      "افتح الجدول", ()=>{ PH = 1; setctx("tab","fill"); shell(); });
  add(noPeer > 0, noPeer ? arn(noPeer) + " حصةً بلا معلمٍ زائرٍ مُسنَد"
                         : "كلُّ حصةٍ مجدولةٍ لها زائرُها",
      noPeer ? "افتح الإسناد" : "", ()=>{ PH = 1; setctx("tab","assign"); shell(); });
  add(named.length > issued, named.length - issued > 0
        ? arn(named.length - issued) + " حصةً لم يصدر تحضيرُها بعد"
        : "كلُّ الحصص صدر تحضيرُها",
      "افتح تقرير التفعيل", ()=>{ PH = 5; RPT = "active"; shell(); });
  add(obsd > appr, obsd - appr > 0
        ? arn(obsd - appr) + " حصةً رُصدت ولم تُعتمد نتيجتُها"
        : "لا حصةَ تنتظر الاعتماد",
      "افتح تقرير المدرسة", ()=>{ PH = 5; RPT = "school"; shell(); });

  items.sort((a,b)=>(b.bad?1:0) - (a.bad?1:0));
  const t = el("table"), tr = el("tr");
  ["", "الحال", ""].forEach(x=>tr.appendChild(el("th",null,x)));
  t.appendChild(tr);
  items.forEach(it=>{
    const r = el("tr");
    const st = el("td");
    st.appendChild(el("span","tag " + (it.bad ? "no" : "ok"), it.bad ? "يحتاج" : "تمّ"));
    r.appendChild(st);
    r.appendChild(el("td",null,it.txt)).style.textAlign = "start";
    const ac = el("td");
    if(it.act){
      const b = el("button","b " + (it.bad ? "" : "ghost"), it.act);
      b.style.cssText = "padding:4px 12px;font-size:14px";
      b.addEventListener("click", it.go); ac.appendChild(b);
    }
    r.appendChild(ac); t.appendChild(r);
  });
  p2.appendChild(t); c2.appendChild(p2); m.appendChild(c2);

  /* ── آخرُ ما جرى ── */
  const lg = logList().slice(0, 6);
  const c3 = el("div","card"), h3 = el("h3");
  h3.appendChild(el("span",null,"آخرُ ما جرى"));
  h3.appendChild(el("small",null,"ستُّ عملياتٍ — والسجلُّ كاملاً في أدوات المنصة"));
  c3.appendChild(h3);
  const p3 = el("div","pad");
  if(!lg.length) p3.appendChild(el("div","empty","لا عمليات بعد."));
  else{
    const t3 = el("table"), r3 = el("tr");
    ["متى","من","الصفة","العملية"].forEach(x=>r3.appendChild(el("th",null,x)));
    t3.appendChild(r3);
    lg.forEach(x=>{
      const r = el("tr");
      [agoTxt(x.t), x.by || "—", roleName(x.r), x.a + (x.w ? " · " + x.w : "")]
        .forEach((v,i)=>{ const td = el("td",null,v); if(i) td.style.textAlign="center"; r.appendChild(td); });
      t3.appendChild(r);
    });
    p3.appendChild(t3);
  }
  c3.appendChild(p3); m.appendChild(c3);
}

/* ═════════ أدواتُ المنصة — للمستشار وحده ═════════ */
function phTools(m){
  const mk = (title, sub, rows) => {
    const c = el("div","card"), h = el("h3");
    h.appendChild(el("span",null,title));
    if(sub) h.appendChild(el("small",null,sub));
    c.appendChild(h);
    const p = el("div","pad");
    rows.forEach(([lab, desc, btn, fn, warn])=>{
      const w = el("div","vday");
      w.appendChild(el("b",null,lab));
      w.appendChild(el("i",null,desc));
      const b = el("button","b " + (warn ? "warn" : "ghost") + " sm", btn);
      b.addEventListener("click", fn);
      b.style.marginInlineStart = "auto";
      w.appendChild(b);
      p.appendChild(w);
    });
    c.appendChild(p); m.appendChild(c);
  };
  mk("المخزن المشترك", api() ? "مربوطٌ — ويرى الجميعُ البياناتِ نفسَها" : "غيرُ مربوط", [
    ["الخادم", api() || "لم يُربط بعد", api() ? "تغيير" : "اربط الخادم", ()=>srv()],
    ["رابط الدعوة", "يُرسَل للمدرسة فيُربط جهازُ من يفتحه تلقائياً", "انسخ الرابط", ()=>invite()],
    ["تحديثٌ الآن", "سحبُ ما كتبه غيرُك على أجهزتهم", "تحديث", ()=>pull().then(()=>shell())],
  ]);
  mk("السجلّ والاسترداد", "ما جرى وما حُذف", [
    ["سجلّ العمليات", "من فعل ماذا ومتى — آخر ٦٠٠ عملية", "افتح السجلّ",
     ()=>{ PH = 1; setctx("tab","log"); shell(); }],
    ["سلّة المحذوفات", "يُحفظ المحذوفُ ثلاثين يوماً ويُستردُّ بنقرة", "افتح السلّة",
     ()=>{ PH = 1; setctx("tab","trash"); shell(); }],
  ]);
  mk("النسخ والتفريغ", "⚠️ الأخيرُ لا يُستردّ", [
    ["نسخةٌ احتياطية", "تُنزَّل بياناتُ المنظومة كلُّها ملفاً على جهازك", "نزّل النسخة", ()=>backup()],
    ["تفريغُ البيانات", "محوٌ كاملٌ على كل الأجهزة — بعد نسخةٍ وتأكيدٍ مكتوب",
     "تفريغ", ()=>wipeAll(), true],
  ]);
}

function srv(){
  const cur = api();
  const v = prompt(
    "الصق رابط المخزن المشترك ليرى كلُّ أفراد المنظومة البيانات نفسها،\n" +
    "أو اتركه فارغاً للعمل على هذا الجهاز وحده:\n\n" +
    /* ⛔ النصُّ يختلف باختلاف من يقرؤه: المستشارُ هو من يُنشئ الخادمَ ويوزّع
       رابطَه، فلا يُقال له «اطلبه من مشرف المنصة» — وهو هو. (٢٩ سبتمبر ٢٠٢٦) */
    (isAdmin()
      ? "وهو رابطُ الخادم الذي نشرتَه — ينتهي بـ.workers.dev أو بنطاقك.\n"
        + "وبعد الربط انسخ «رابط الدعوة» وأرسله للمدرسة."
      : "والرابطُ يُطلب من " + (D.adminref || "مشرف المنصة") + " — ولا يُنشأ من الصفحة."),
    cur);
  if(v === null) return;
  const u = v.trim();
  localStorage.setItem(API, u);
  if(!u){ shell(); return; }
  testSrv(u).then(r=>{
    if(!r.ok){ alert("⛔ الرابط لا يستجيب كما ينبغي:\n" + r.why +
      (isAdmin() ? "\n\nتأكّد أنه رابطُ الخادم الذي نشرتَه، بلا مسافةٍ ولا شَرطةٍ في آخره."
                 : "\n\nتأكّد أنه الرابطُ الذي سلَّمه " + (D.adminref || "مشرف المنصة") + ".")); shell(); return; }
    pull().then(()=>{ alert("✓ رُبط المخزن المشترك.\n" + r.note); shell(); });
  });
}
/* اختبارُ الرابط قبل اعتماده.
   ⚠️ درسان تعلَّمناهما من خادمٍ حقيقي:
   ١) دالةُ الدمج تُسقط ما خرج عن بنيتها عمداً، فيُفحَص بمفتاحٍ داخل `rot` لا بحقلٍ مستحدَث.
   ٢) مخزنُ KV «متّسقٌ في النهاية»: القراءةُ فورَ الكتابة قد ترجع قديمةً لثوانٍ.
      فالحكمُ يقع على **ردّ الكتابة نفسه** (وهو يعيد المدموج)، والقراءةُ تُحاوَل
      ثلاثاً بفاصلٍ ولا يُحكم بالفشل إن تأخّرت. */
function testSrv(u){
  const key = "__probe_" + Date.now(), val = "" + Math.random();
  const g = u + (u.indexOf("?") < 0 ? "?" : "&") + "kind=probe&id=t";
  const readBack = (n) => fetch(g).then(r=>r.json())
    .then(r=>{
      if(r && r.ok && r.data && r.data.rot && r.data.rot[key] === val) return true;
      if(n <= 0) return false;
      return new Promise(res=>setTimeout(res, 1500)).then(()=>readBack(n - 1));
    }).catch(()=>false);
  return fetch(u, {method:"POST", headers:{"Content-Type":"text/plain;charset=utf-8"},
      body: JSON.stringify({kind:"probe", id:"t", data:{rot:{[key]: val}}})})
    .then(r=>r.json())
    .then(w=>{
      if(!(w && w.ok && w.data && w.data.rot && w.data.rot[key] === val))
        return {ok:false, why:"استجاب ولم يُرجع ما كُتب فيه — تأكّد أن المخزن KV مربوطٌ "
                             + "باسم DB وأنك ألصقت الكود كاملاً."};
      return readBack(3).then(seen=>({ok:true, note: seen
        ? "كُتب واستُرجع بنجاح — البيانات ستُشارَك بين الأجهزة."
        : "الكتابةُ تعمل. والقراءةُ تأخّرت ثوانيَ لأن مخزن كلاودفلير يتّسق تدريجياً — وهذا طبيعي."}));
    })
    .catch(e=>({ok:false, why:"تعذّر الاتصال: " + e.message}));
}



/* ═════════ اختيار الحصة ═════════ */
function picker(m, title, cb){
  const list = myLessons();
  const c = el("div","card");
  const h = el("h3"); h.appendChild(el("span",null,title));
  h.appendChild(el("small",null, arn(list.length) + " حصة تخصّك")); c.appendChild(h);
  const p = el("div","pad");
  if(!list.length){
    p.appendChild(el("div","empty", ME.role==="teacher"
      ? "لا حصص باسمك في الجدول — تأكّد أن اسمك مكتوبٌ في الجدول كما هو مسجَّل."
      : "لا حصص مسنَدة إليك بعد."));
  } else {
    const t = el("table"), tr = el("tr");
    ["الحصة","المدرسة","الموعد","الحالة",""].forEach(x=>tr.appendChild(el("th",null,x)));
    t.appendChild(tr);
    list.forEach(L=>{
      const g = prog(L), r = el("tr");
      r.appendChild(el("td",null, lessonTitle(L)));
      r.appendChild(el("td",null, [L.school,L.stage].filter(Boolean).join(" · ")));
      r.appendChild(el("td",null, [L.week,L.day,"الحصة "+(L.period||"")].filter(Boolean).join(" · ")));
      const st = el("td");
      st.appendChild(el("span","tag " + (g.issued?"ok":"no"), g.issued?"التحضير مُصدَر":"التحضير لم يُصدَر"));
      r.appendChild(st);
      const b = el("td"); const go = el("button","b alt","افتح"); go.style.padding="5px 14px";
      go.addEventListener("click", ()=>{ CUR = L.id; cb(L); });
      b.appendChild(go); r.appendChild(b);
      t.appendChild(r);
    });
    p.appendChild(t);
  }
  c.appendChild(p); m.appendChild(c);
}

/* ═════════ المرحلة ٣: أداء الحصة ═════════ */
function ph3(m){
  const L = DB.sched.find(x=>x.id===CUR);
  if(!L){ picker(m, ME.role==="peer" ? "اختر الحصة التي تزورها" : "اختر الحصة التي ترصدها", ()=>shell()); return; }
  const P = DB.prep[L.id] || {};
  const head = el("div","card");
  const h = el("h3"); h.appendChild(el("span",null, lessonTitle(L)));
  h.appendChild(el("small",null, lessonSub(L))); head.appendChild(h);
  const hp = el("div","pad"), bar = el("div","bar");
  const back = el("button","b ghost","تغيير الحصة"); back.addEventListener("click", ()=>{ CUR=null; shell(); });
  bar.appendChild(back);
  const pr = el("button","b ghost","طباعة"); pr.addEventListener("click", ()=>window.print()); bar.appendChild(pr);
  hp.appendChild(bar);
  if(!P.__issued){
    const w = el("div","msg bad");
    w.textContent = "تحضير هذه الحصة لم يُصدَر بعد — والرصد قبل قراءة التحضير يُفقد الشواهد معناها.";
    hp.appendChild(w);
  }
  head.appendChild(hp); m.appendChild(head);

  /* تحضير المعلم للقراءة */
  const pc = el("div","card");
  const ph = el("h3"); ph.appendChild(el("span",null,"تحضير المعلم — للقراءة"));
  ph.appendChild(el("small",null, P.__issued ? ("صدر: " + P.__issued) : "لم يُصدَر بعد")); pc.appendChild(ph);
  const pp = el("div","pad");
  const det = el("details"); det.appendChild(el("summary",null,"افتح التحضير كاملاً")).style.cssText="cursor:pointer;color:var(--navy);font-weight:700";
  const box = el("div"); box.style.marginTop="10px";
  D.sections.forEach(sec=>{
    const t = el("div"); t.style.cssText="font-weight:700;color:var(--navy2);margin:9px 0 4px";
    t.textContent = sec.t + " · " + sec.n; box.appendChild(t);
    sec.rows.forEach(r=>{
      const rw = el("div","row2"), lb = el("div","lab", r.label), fl = pfield(r, P, true);
      rw.appendChild(lb); rw.appendChild(fl); box.appendChild(rw);
    });
  });
  det.appendChild(box); pp.appendChild(det); pc.appendChild(pp); m.appendChild(pc);

  if(ME.role === "peer") peerCard(m, L);
  else evalForms(m, L);
}

function peerCard(m, L){
  const K = L.id + "|" + ME.name;
  const V = DB.peer[K] = DB.peer[K] || {};
  const c = el("div","card");
  const h = el("h3"); h.appendChild(el("span",null,"بطاقة زيارة الأقران — شاهدتُ وأطبّق"));
  h.appendChild(el("small",null,"إجراءٌ واحد تنقله لنفسك")); c.appendChild(h);
  const p = el("div","pad");
  D.peerq.forEach((q,i)=>{
    const w = el("div"); w.style.marginBottom="10px";
    const t = el("div","lab", arn(i+1) + " · " + q); t.style.marginBottom="5px";
    w.appendChild(t);
    w.appendChild(fld("area", V["q"+i], v=>{ V["q"+i]=v; V.__lid=L.id; V.__by=ME.name; save(); }));
    p.appendChild(w);
  });
  const dt = el("label","f"); dt.appendChild(el("span",null,"تاريخ التطبيق المزمع"));
  dt.appendChild(fld("txt", V.when, v=>{ V.when=v; save(); }, null, "مثال: الأحد القادم — حصة الرابعة"));
  p.appendChild(dt);
  const bar = el("div","bar");
  const done = el("button","b","حفظ البطاقة");
  done.addEventListener("click", ()=>{ V.__done=1; V.__lid=L.id; V.__by=ME.name;
    logAct("بطاقة أقران", lessonTitle(L), L); save(); syncFlush();
    alert("حُفظت بطاقتك — ويظهر إجراؤك في تقاريرك."); shell(); });
  bar.appendChild(done); p.appendChild(bar);
  c.appendChild(p); m.appendChild(c);
}

function evalForms(m, L){
  if(L.approved){
    const w = el("div","card"), p2 = el("div","pad");
    p2.appendChild(el("div","msg ok",
      "هذه الحصة معتمدةٌ ومقفولة — رصدُها مغلقٌ للتعديل. "
      + "ولفكِّ الاعتماد: مرحلةُ «بعد الحصة»."));
    w.appendChild(p2); m.appendChild(w);
  }
  const K = L.id + "|" + ME.name;
  const V = DB.obs[K] = DB.obs[K] || {sc:{}, ind:{}};
  V.__lid = L.id; V.__by = ME.name;
  const role = el("div","card");
  const rh = el("h3"); rh.appendChild(el("span",null,"صفتك في هذه الزيارة")); role.appendChild(rh);
  const rp = el("div","pad");
  /* ⛔ الصفةُ تُشتقُّ من الدور الذي دخل به لا تُسأل: كان المقيّمُ دوراً واحداً
     فيختارها بيده، وقد يختار غيرَ صفته فتُنسب درجتُه إلى خانةٍ ليست له.
     ومنذ فصل الأدوار (٢٩ سبتمبر ٢٠٢٦) صارت معلومةً من الدخول. */
  const auto = {principal: D.evalroles[0], deputy: D.evalroles[1],
                supervisor: D.evalroles[2], supervision: D.evalroles[2]}[ME.role];
  if(auto){
    if(V.role !== auto){ V.role = auto; save(); }
    const tag = el("div"); tag.appendChild(el("span","tag ok", auto));
    tag.appendChild(el("small",null," — من دورك عند الدخول، ولا تُبدَّل هنا"));
    rp.appendChild(tag);
  } else {
    rp.appendChild(fld("sel", V.role, v=>{ V.role=v; save(); }, D.evalroles));
  }
  role.appendChild(rp); m.appendChild(role);

  /* الاستمارة */
  D.domains.forEach((dm,di)=>{
    const c = el("div","card");
    const h = el("h3"); h.appendChild(el("span",null,"المجال " + arn(di+1) + " · " + dm.t));
    const sc = el("small"); sc.id = "dsc"+di; h.appendChild(sc); c.appendChild(h);
    const t = el("table"), tr = el("tr");
    ["#","المؤشر"].forEach(x=>tr.appendChild(el("th",null,x)));
    D.levels.forEach(([n,v])=>tr.appendChild(el("th",null, n+" ("+arn(v)+")")));
    tr.appendChild(el("th",null,"لا ينطبق"));
    t.appendChild(tr);
    dm.inds.forEach((ind,ii)=>{
      const key = di+"_"+ii, r = el("tr");
      if(V.ind[key] != null) setTimeout(()=>markRow(r, V.ind[key]), 0);
      r.appendChild(el("td",null, arn(di+1)+"·"+arn(ii+1))).style.textAlign="center";
      r.appendChild(el("td",null, ind));
      D.levels.concat([["NA",0]]).forEach(([n,v])=>{
        const td = el("td"); td.style.textAlign="center";
        const rb = el("input"); rb.type="radio"; rb.name="o"+key; rb.value = (n==="NA"?"na":v);
        rb.style.cssText="width:17px;height:17px";
        rb.setAttribute("aria-label", ind + " — " + n);
        if(V.ind[key] === rb.value) rb.checked = true;
        rb.addEventListener("focus", ()=>r.classList.add("editing"));
        rb.addEventListener("blur", ()=>r.classList.remove("editing"));
        /* ⚠️ الرصدُ يُلوَّن بدرجته: أخضرُ للمتحقق وأحمرُ لغير المتحقق ورماديٌّ
           لِـ«لا ينطبق» — فيرى الراصدُ بلمحةٍ ما أتمّه وما بقي. */
        if(L.approved) rb.disabled = true;
        rb.addEventListener("change", ()=>{
          const first = Object.keys(V.ind).length === 0;
          V.ind[key]=rb.value;
          if(first) logAct("بدء الرصد", (V.role || ME.name) + " — " + lessonTitle(L), L);
          save(); score(L,V); markRow(r, rb.value);
        });
        td.appendChild(rb); r.appendChild(td);
      });
      t.appendChild(r);
    });
    c.appendChild(t); m.appendChild(c);
  });

  /* بطاقة الإستراتيجية — تُفتح على ما أعلنه المعلم */
  const b = D.bank.find(x=>x.name === L.strategy) || D.bank.find(x=>x.key === V.strat);
  const sc = el("div","card");
  const sh = el("h3"); sh.appendChild(el("span",null,"بطاقة تشخيص الإستراتيجية"));
  sh.appendChild(el("small",null, b ? b.name : "لم تُعلَن إستراتيجيةٌ لهذه الحصة في الجدول")); sc.appendChild(sh);
  const sp = el("div","pad");
  if(b){
    V.strat = b.key;
    const t = el("table"), tr = el("tr");
    ["#","المؤشر"].forEach(x=>tr.appendChild(el("th",null,x)));
    D.slevels.forEach(([n,v])=>tr.appendChild(el("th",null, n+" ("+arn(v)+")")));
    t.appendChild(tr);
    b.inds.forEach((ind,i)=>{
      const r = el("tr");
      r.appendChild(el("td",null, arn(i+1))).style.textAlign="center";
      r.appendChild(el("td",null, ind));
      D.slevels.forEach(([n,v])=>{
        const td = el("td"); td.style.textAlign="center";
        const rb = el("input"); rb.type="radio"; rb.name="s"+i; rb.value=v;
        rb.style.cssText="width:17px;height:17px";
        if(String(V.sc[i]) === String(v)) rb.checked = true;
        rb.addEventListener("change", ()=>{ V.sc[i]=v; save(); score(L,V); });
        td.appendChild(rb); r.appendChild(td);
      });
      t.appendChild(r);
    });
    sp.appendChild(t);
    const cv = el("div"); cv.style.cssText="color:var(--grey);font-size:14.5px;margin-top:7px";
    cv.textContent = "التحويل إلى درجة مؤشر الإستراتيجية: " + D.convert; sp.appendChild(cv);
  } else sp.appendChild(el("div","empty","اختر الإستراتيجية في جدول الحصص لتفتح بطاقتها."));
  sc.appendChild(sp); m.appendChild(sc);

  /* ما قاله الطلاب */
  const tc = el("div","card");
  const th = el("h3"); th.appendChild(el("span",null, D.tulab_t)); tc.appendChild(th);
  const tp = el("div","pad");
  D.tulab.forEach((q,i)=>{
    const w = el("div"); w.style.marginBottom="8px";
    w.appendChild(el("div","lab", q)).style.marginBottom="4px";
    w.appendChild(fld("txt", V["tu"+i], v=>{ V["tu"+i]=v; save(); }));
    tp.appendChild(w);
  });
  tc.appendChild(tp); m.appendChild(tc);

  const bar = el("div","score noprint"); bar.id="scorebar"; document.body.appendChild(bar);
  score(L,V);
}

function score(L,V){
  let got=0, max=0, na=0;
  D.domains.forEach((dm,di)=>{
    let dg=0, dm2=0;
    dm.inds.forEach((_,ii)=>{
      const v = V.ind[di+"_"+ii];
      if(v === "na"){ na++; return; }
      dm2 += 4; if(v) dg += parseInt(v,10);
    });
    got += dg; max += dm2;
    const e = document.getElementById("dsc"+di);
    if(e) e.textContent = dm2 ? (arn(dg) + " من " + arn(dm2)) : "—";
  });
  const pct = max ? Math.round(got/max*1000)/10 : 0;
  const lvl = pct>=90?"متميّز": pct>=75?"جيد جداً": pct>=50?"جيد":"يحتاج تحسيناً";
  let sgot = 0; for(let i=0;i<10;i++) sgot += Number(V.sc[i]||0);
  const m23 = sgot>=90?4: sgot>=75?3: sgot>=50?2:1;
  V.res = {got, max, pct, lvl, na, sgot, m23};
  const bar = document.getElementById("scorebar");
  if(bar){
    bar.innerHTML = "";
    bar.appendChild(el("span",null,"الاستمارة:"));
    bar.appendChild(el("span","big", arn(got) + " من " + arn(max)));
    bar.appendChild(el("span",null,"(" + arn(pct) + "٪ · " + lvl + ")"));
    bar.appendChild(el("span",null,"| لا ينطبق: " + arn(na)));
    if(V.strat) bar.appendChild(el("span",null,"| البطاقة: " + arn(sgot) + " من ١٠٠ ← درجة المؤشر " + arn(m23)));
    const go = el("button","b alt","إنهاء ← بعد الحصة");
    go.style.cssText="padding:6px 14px;font-size:15px";
    go.addEventListener("click", ()=>{ save(); PH=4; shell(); });
    bar.appendChild(go);
  }
  return V.res;
}

/* ═════════ المرحلة ٤: بعد الحصة ═════════ */
function ph4(m){
  const L = DB.sched.find(x=>x.id===CUR);
  if(!L){ picker(m, "اختر الحصة", ()=>shell()); return; }
  const rows = Object.entries(DB.obs).filter(([k,v])=>v.__lid===L.id);
  const head = el("div","card");
  const h = el("h3"); h.appendChild(el("span",null, lessonTitle(L)));
  h.appendChild(el("small",null, lessonSub(L))); head.appendChild(h);
  const hp = el("div","pad"), bar = el("div","bar");
  const back = el("button","b ghost","تغيير الحصة"); back.addEventListener("click", ()=>{ CUR=null; shell(); });
  bar.appendChild(back);
  const pr = el("button","b ghost","طباعة التقرير"); pr.addEventListener("click", ()=>window.print()); bar.appendChild(pr);
  if(ME.role !== "teacher"){
    const wa = el("button","b alt","إرسال للمعلم عبر واتساب");
    wa.addEventListener("click", ()=>sendWA(L, rows)); bar.appendChild(wa);
  }
  /* ⛔ الاعتمادُ يقفل الحصة: بعده لا تُعدَّل خانتُها ولا تحضيرُها ولا رصدُها،
     وإلا تغيّرت أسسُ درجةٍ صدرت. والفكُّ للمقيّم وحده وبتأكيدٍ ويُسجَّل. */
  if(isEval()){
    if(!L.approved){
      const ap = el("button","b","اعتماد النتيجة وقفل الحصة");
      ap.addEventListener("click", ()=>{
        if(!rows.length) return alert("لا تُعتمد حصةٌ لم يرصدها أحد.");
        if(!confirm("بعد الاعتماد تُقفل الحصة: لا يُعدَّل جدولُها ولا تحضيرُها ولا رصدُها.\n\nأتُتابع؟")) return;
        L.approved = {by: ME.name, no: ME.emp || "", at: new Date().toISOString()};
        logAct("اعتماد", lessonTitle(L), L); save(); shell(); syncFlush();
      });
      bar.appendChild(ap);
    } else {
      const un = el("button","b warn","فكُّ الاعتماد");
      un.addEventListener("click", ()=>{
        if(!confirm("فكُّ الاعتماد يُعيد فتحَ الحصة للتعديل — ويُسجَّل باسمك.\n\nأتُتابع؟")) return;
        logAct("فكُّ اعتماد", lessonTitle(L) + " — كان اعتمدها " + (L.approved.by||"—"), L);
        delete L.approved; save(); shell();
      });
      bar.appendChild(un);
    }
  }
  hp.appendChild(bar);
  if(L.approved){
    const lk = el("div","msg ok");
    const d = new Date(L.approved.at);
    lk.textContent = "◆ حصةٌ معتمدةٌ ومقفلة — اعتمدها " + (L.approved.by || "—")
      + " في " + arn(d.getDate()) + "/" + arn(d.getMonth()+1)
      + ". لا تُعدَّل بياناتُها ولا تحضيرُها ولا رصدُها.";
    hp.appendChild(lk);
  }
  head.appendChild(hp); m.appendChild(head);

  const c = el("div","card");
  const ch = el("h3"); ch.appendChild(el("span",null,"نتيجة الزيارة"));
  ch.appendChild(el("small",null, arn(rows.length) + " مقيّماً رصد")); c.appendChild(ch);
  const p = el("div","pad");
  if(!rows.length) p.appendChild(el("div","empty","لم يرصد أحدٌ هذه الحصة بعد."));
  else{
    const t = el("table"), tr = el("tr");
    ["المقيّم","الصفة","الدرجة","النسبة","المستوى","لا ينطبق","البطاقة","درجة المؤشر"]
      .forEach(x=>tr.appendChild(el("th",null,x)));
    t.appendChild(tr);
    let sp=0, sn=0;
    rows.forEach(([k,v])=>{
      const R = v.res || {};
      sp += R.pct||0; sn++;
      const r = el("tr");
      [v.__by, v.role||"—", arn((R.got||0)+" من "+(R.max||0)), arn(R.pct||0)+"٪", R.lvl||"—",
       arn(R.na||0), arn(R.sgot||0)+" من ١٠٠", arn(R.m23||0)].forEach(x=>r.appendChild(el("td",null,x)));
      t.appendChild(r);
    });
    p.appendChild(t);
    const avg = sn ? Math.round(sp/sn*10)/10 : 0;
    const k = el("div","kpi"); k.style.marginTop="12px";
    [[arn(avg)+"٪","متوسط النسبة"], [arn(sn),"عدد المقيّمين"],
     [arn(Object.keys(DB.peer).filter(x=>DB.peer[x].__lid===L.id).length),"بطاقات الأقران"]]
      .forEach(([b,s])=>{ const d=el("div"); d.appendChild(el("b",null,b)); d.appendChild(el("span",null,s)); k.appendChild(d); });
    p.appendChild(k);
  }
  c.appendChild(p); m.appendChild(c);

  /* بطاقة الجسر */
  const bc = el("div","card");
  const bh = el("h3"); bh.appendChild(el("span",null,"بطاقة الجسر"));
  bh.appendChild(el("small",null,"إجراءٌ واحد محدد يُنقل إلى الحصص اليومية ويُتحقق منه في الزيارة التالية"));
  bc.appendChild(bh);
  const bp = el("div","pad");
  const prev = prevBridge(L);
  if(prev){
    const w = el("div","msg ok");
    w.appendChild(el("b",null,"إجراء الزيارة السابقة: "));
    w.appendChild(el("span",null, prev.text));
    bp.appendChild(w);
    const ck = el("div","ticks");
    ["طُبّق ويُرى ثابتاً","طُبّق جزئياً","لم يُطبَّق"].forEach((o,i)=>{
      const l = el("label","tk"), rb = el("input"); rb.type="radio"; rb.name="prevchk"; rb.value=o;
      const K0 = L.id+"|"+ME.name;
      const V0 = DB.obs[K0] || (DB.obs[K0]={sc:{},ind:{},__lid:L.id,__by:ME.name});
      if(V0.prevchk===o) rb.checked=true;
      rb.addEventListener("change", ()=>{ V0.prevchk=o; save(); });
      l.appendChild(rb); l.appendChild(el("span",null,o)); ck.appendChild(l);
    });
    bp.appendChild(ck);
  }
  const K = L.id+"|"+ME.name;
  const V = DB.obs[K] || (DB.obs[K] = {sc:{}, ind:{}, __lid:L.id, __by:ME.name});
  const ro = ME.role === "teacher";
  if(ro) bp.appendChild(el("div","ro", (rows.find(([k,v])=>(v.bridge||"").trim())||[null,{}])[1].bridge || "—"));
  else bp.appendChild(fld("area", V.bridge, v=>{ V.bridge=v; save(); }, null,
    "إجراء واحد محدد يمكن رؤيته — لا عبارة عامة"));
  bc.appendChild(bp); m.appendChild(bc);
}

function prevBridge(L){
  const same = DB.sched.filter(x=>x.teacher===L.teacher && x.id!==L.id);
  for(const s of same){
    const hit = Object.values(DB.obs).find(v=>v.__lid===s.id && (v.bridge||"").trim());
    if(hit) return {text:hit.bridge, lesson:s};
  }
  return null;
}

function sendWA(L, rows){
  const ph = prompt("رقم جوال المعلم (مثال 05xxxxxxxx):", "");
  if(!ph) return;
  const num = ph.replace(/\D/g,"").replace(/^0/,"966");
  if(num.length < 11) return alert("رقم غير صحيح.");
  const R = (rows[0]||[null,{}])[1].res || {};
  const br = (rows.find(([k,v])=>(v.bridge||"").trim())||[null,{}])[1].bridge || "";
  const t = ["تقرير زيارة صفية — " + D.school,
    lessonTitle(L), lessonSub(L),
    R.got!=null ? ("الاستمارة: " + R.got + " من " + R.max + " (" + R.pct + "٪ — " + R.lvl + ")") : "",
    R.sgot ? ("بطاقة الإستراتيجية: " + R.sgot + " من 100 ← درجة المؤشر " + R.m23) : "",
    br ? ("إجراء بطاقة الجسر: " + br) : "",
    "المقيّم: " + ME.name].filter(Boolean).join("\n");
  window.open("https://wa.me/" + num + "?text=" + encodeURIComponent(t), "_blank");
}

/* ═════════ المرحلة ٥: التقارير ═════════ */
let RPT = "school";
const REPORTS = [
  ["school",  "تقرير المدارس",        "لكل مدرسة: كم حصة، وكم حُضِّر ورُصد، ومتوسط النسبة"],
  ["teacher", "تقرير المعلمين",       "لكل معلم: عددُ الحصص والنسبةُ والمستوى وإجراءُ الجسر"],
  ["spec",    "تقرير التخصصات",       "لكل مادة: عدد الحصص ومتوسط النسبة — لتُعرف المادة المتعثّرة"],
  ["ind",     "تقرير المؤشرات",       "ترتيب المؤشرات الخمسين بمتوسط درجتها — مادة خطة التحسين"],
  ["strat",   "تقرير الإستراتيجيات",  "أيُّ إستراتيجيةٍ تُطبَّق أكثر، وبأي درجة"],
  ["appr",    "تقرير الاتجاهات",      "توزيع الاتجاهات التدريسية المعلنة"],
  ["active",  "تقرير التفعيل",        "مَن فعّل ومَن لم يفعّل: معلمون ومقيّمون وزائرون"],
];

function agg(){                                    /* تجميعٌ واحد تُبنى عليه التقارير كلها */
  const byLesson = {};
  Object.values(DB.obs).forEach(v=>{
    if(!v.__lid || !v.res) return;
    (byLesson[v.__lid] = byLesson[v.__lid] || []).push(v);
  });
  return DB.sched.map(L=>{
    const obs = byLesson[L.id] || [];
    const pct = obs.length ? obs.reduce((a,v)=>a+(v.res.pct||0),0)/obs.length : null;
    const sg  = obs.length ? obs.reduce((a,v)=>a+(v.res.sgot||0),0)/obs.length : null;
    const peers = Object.values(DB.peer).filter(v=>v.__lid===L.id).length;
    const P = DB.prep[L.id] || {};
    return {L, obs, pct, sg, peers, issued: !!P.__issued,
            bridge: (obs.find(v=>(v.bridge||"").trim())||{}).bridge || ""};
  });
}
function lvlOf(p){ return p==null?"—": p>=90?"متميّز": p>=75?"جيد جداً": p>=50?"جيد":"يحتاج تحسيناً"; }
function avg(a){ return a.length ? Math.round(a.reduce((x,y)=>x+y,0)/a.length*10)/10 : null; }
function num(v){ return v==null ? "—" : arn(v); }

function ph5(m){
  if(ME.role === "teacher") return myTeacherReport(m);
  if(ME.role === "peer") return myPeerReport(m);
  const nav = el("div","card"); const nh=el("h3");
  nh.appendChild(el("span",null,"التقارير"));
  nh.appendChild(el("small",null,"كل ما ينتجه التطبيق — للطباعة أو التصدير")); nav.appendChild(nh);
  const np = el("div","pad"), bb = el("div","bar");
  REPORTS.forEach(([k,t])=>{
    const b = el("button", "b " + (RPT===k ? "" : "ghost"), t);
    b.addEventListener("click", ()=>{ RPT=k; shell(); }); bb.appendChild(b);
  });
  np.appendChild(bb);
  const meta = REPORTS.find(r=>r[0]===RPT);
  np.appendChild(el("div",null,meta[2])).style.cssText="color:var(--grey);font-family:JZL,SK;margin-top:8px";
  const bar2 = el("div","bar");
  const pr = el("button","b ghost","طباعة"); pr.addEventListener("click", ()=>window.print());
  const cs = el("button","b ghost","تصدير CSV"); cs.addEventListener("click", ()=>exportCSV(meta[1]));
  bar2.appendChild(pr); bar2.appendChild(cs);
  /* ⛔ النسخةُ الاحتياطيةُ والتفريغُ للمستشار وحده — الأولى تُنزِّل المنظومةَ
     كلَّها، والثاني يمحوها على كل الأجهزة. (٢٩ سبتمبر ٢٠٢٦) */
  if(isAdmin()){
    const bk = el("button","b ghost","نسخة احتياطية"); bk.addEventListener("click", backup);
    bar2.appendChild(bk);
    const wp = el("button","b warn","تفريغ البيانات");
    wp.title = "محوٌ كاملٌ للمنظومة — بعد نسخةٍ احتياطيةٍ وتأكيدٍ مكتوب";
    wp.style.marginInlineStart = "auto";
    wp.addEventListener("click", wipeAll);
    bar2.appendChild(wp);
  }
  np.appendChild(bar2);
  nav.appendChild(np); m.appendChild(nav);

  const c = el("div","card");
  const h = el("h3"); h.appendChild(el("span",null, meta[1])); c.appendChild(h);
  const p = el("div","pad"); p.id = "rptbody";
  ({school:rSchool, teacher:rTeacher, spec:rSpec, ind:rInd, strat:rStrat, appr:rAppr, active:rActive})[RPT](p);
  c.appendChild(p); m.appendChild(c);
}

function tbl(p, heads, rows){
  if(!rows.length){ p.appendChild(el("div","empty","لا بيانات بعد — تظهر التقارير بعد جدولة الحصص ورصدها.")); return; }
  const t = el("table"), tr = el("tr");
  heads.forEach(x=>tr.appendChild(el("th",null,x)));
  t.appendChild(tr);
  rows.forEach(r=>{
    const x = el("tr");
    r.forEach((v,i)=>{
      const td = el("td");
      if(v && v.tag){ td.appendChild(el("span","tag "+v.cls, v.tag)); }
      else td.textContent = v == null ? "—" : v;
      if(i) td.style.textAlign = "center";
      x.appendChild(td);
    });
    t.appendChild(x);
  });
  p.appendChild(t);
  window.__rpt = {heads, rows: rows.map(r=>r.map(v=>v && v.tag ? v.tag : v))};
}

function kpis(p, list){
  const k = el("div","kpi"); k.style.marginBottom="12px";
  list.forEach(([b,s])=>{ const d=el("div"); d.appendChild(el("b",null,b)); d.appendChild(el("span",null,s)); k.appendChild(d); });
  p.appendChild(k);
}

function rSchool(p){
  const A = agg(), by = {};
  A.forEach(x=>{ const k = x.L.school || "—"; (by[k] = by[k] || []).push(x); });
  kpis(p, [[arn(A.length),"حصة مجدولة"],
           [arn(A.filter(x=>x.issued).length),"حُضِّرت"],
           [arn(A.filter(x=>x.obs.length).length),"رُصدت"],
           [num(avg(A.filter(x=>x.pct!=null).map(x=>x.pct)))+"٪","متوسط النسبة"]]);
  /* ⚠️ المدرسةُ هي نطاقُ المرحلة نفسه، فلا يُكرَّر عمودان
     بالقيمة ذاتها: المجمعُ والقطاعُ هما ما يفرّق بينها. */
  tbl(p, ["المدرسة","المجمع","القطاع","الحصص","حُضِّرت","رُصدت","بطاقات الأقران","متوسط النسبة","المستوى"],
    Object.entries(by).map(([k,v])=>{
      const a = avg(v.filter(x=>x.pct!=null).map(x=>x.pct));
      return [k, v[0].L.complex||"—", v[0].L.sector||"—", arn(v.length),
              arn(v.filter(x=>x.issued).length), arn(v.filter(x=>x.obs.length).length),
              arn(v.reduce((s,x)=>s+x.peers,0)), num(a)+"٪", lvlOf(a)];
    }));
}

/* ⛔ التجميعُ بالرقم الوظيفي متى وُجد: الاسمُ وحده يُنشئ شخصين من واحد */
function whoKey(L){ return (L.teacherNo || "").trim() || ("~" + (L.teacher||"—").trim()); }
function whoName(L){
  const r = (D.roster||{})[(L.teacherNo||"").trim()];
  return r ? r.n : (L.teacher || "—");
}
function rTeacher(p){
  const A = agg(), by = {};
  A.forEach(x=>{ const k = whoKey(x.L); (by[k] = by[k] || []).push(x); });
  tbl(p, ["المعلم","الرقم الوظيفي","المدرسة","المادة","حصصه","حُضِّرت","رُصدت",
          "متوسط النسبة","المستوى","البطاقة","إجراء الجسر"],
    Object.entries(by).map(([k,v])=>{
      const a = avg(v.filter(x=>x.pct!=null).map(x=>x.pct));
      const s = avg(v.filter(x=>x.sg!=null).map(x=>x.sg));
      const br = (v.find(x=>x.bridge)||{}).bridge || "";
      return [whoName(v[0].L), (v[0].L.teacherNo||"—"), v[0].L.school||"—",
              v[0].L.subject||"—", arn(v.length),
              arn(v.filter(x=>x.issued).length), arn(v.filter(x=>x.obs.length).length),
              num(a)+"٪", lvlOf(a), s==null?"—":num(s)+" من ١٠٠", br || "—"];
    }));
}

function rSpec(p){
  const A = agg(), by = {};
  A.forEach(x=>{ const k = x.L.subject || "—"; (by[k] = by[k] || []).push(x); });
  const rows = Object.entries(by).map(([k,v])=>{
    const a = avg(v.filter(x=>x.pct!=null).map(x=>x.pct));
    return [k, arn(v.length), arn(new Set(v.map(x=>x.L.teacher)).size),
            arn(v.filter(x=>x.issued).length), num(a)+"٪", lvlOf(a), a];
  }).sort((x,y)=>(x[6]==null?999:x[6])-(y[6]==null?999:y[6]));
  tbl(p, ["المادة","الحصص","المعلمون","حُضِّرت","متوسط النسبة","المستوى"], rows.map(r=>r.slice(0,6)));
}

function rInd(p){
  const acc = {};
  Object.values(DB.obs).forEach(v=>{
    Object.entries(v.ind||{}).forEach(([k,val])=>{
      if(val === "na" || !val) return;
      (acc[k] = acc[k] || []).push(Number(val));
    });
  });
  const rows = Object.entries(acc).map(([k,arr])=>{
    const [di,ii] = k.split("_").map(Number);
    const dm = D.domains[di] || {inds:[]};
    const a = avg(arr);
    return [arn(di+1)+"·"+arn(ii+1), (dm.inds[ii]||"—"), arn(arr.length), num(a) + " من ٤",
            {tag: a>=3.5?"قوي": a>=2.5?"متوسط":"ضعيف", cls: a>=3.5?"ok": a>=2.5?"mid":"no"}, a];
  }).sort((x,y)=>x[5]-y[5]);
  if(rows.length) kpis(p, [[arn(rows.length),"مؤشراً مرصوداً"],
    [rows[0][0],"أضعف مؤشر"], [rows[rows.length-1][0],"أقوى مؤشر"]]);
  tbl(p, ["الرمز","المؤشر","مرات الرصد","متوسط الدرجة","الحكم"], rows.map(r=>r.slice(0,5)));
}

function rStrat(p){
  const A = agg(), by = {};
  A.forEach(x=>{ const k = x.L.strategy || "—"; (by[k] = by[k] || []).push(x); });
  tbl(p, ["الإستراتيجية","مرات الإعلان","المعلمون","متوسط البطاقة من ١٠٠","درجة المؤشر"],
    Object.entries(by).map(([k,v])=>{
      const s = avg(v.filter(x=>x.sg!=null).map(x=>x.sg));
      const m = s==null?null: s>=90?4: s>=75?3: s>=50?2:1;
      return [k, arn(v.length), arn(new Set(v.map(x=>x.L.teacher)).size), num(s), num(m)];
    }).sort((a,b)=>b[1].length-a[1].length));
}

function rAppr(p){
  const A = agg(), by = {};
  A.forEach(x=>{ const k = x.L.approach || "—"; (by[k] = by[k] || []).push(x); });
  tbl(p, ["الاتجاه التدريسي","الحصص","المعلمون","متوسط النسبة"],
    Object.entries(by).map(([k,v])=>{
      const a = avg(v.filter(x=>x.pct!=null).map(x=>x.pct));
      return [k, arn(v.length), arn(new Set(v.map(x=>x.L.teacher)).size), num(a)+"٪"];
    }));
}

function rActive(p){
  /* كل فردٍ في المنظومة وما فعّله فعلاً */
  const people = {};
  /* ⛔ المفتاحُ الرقمُ الوظيفي متى وُجد: الاسمُ وحده يجعل «محمد العلي» و«محمد علي»
     شخصين، فينقسم تفعيلُ الواحد على اثنين. */
  const put = (name, role, no) => { if(!(name||"").trim()) return;
    const k = (no||"").trim() || ("~" + name.trim());
    people[k] = people[k] || {name:name.trim(), no:(no||"").trim(),
                              roles:new Set(), sched:0, prep:0, obs:0, peer:0};
    if(no && !people[k].no) people[k].no = no;
    people[k].roles.add(role); return people[k]; };
  DB.sched.forEach(L=>{
    const t = put(L.teacher, "معلم", L.teacherNo); if(t) t.sched++;
    [L.peer1, L.peer2].forEach(n=>{ const x = put(n, "زائر"); if(x) x.sched += 0; });
    [L.ev1, L.ev2, L.ev3].forEach(n=>put(n, "مقيّم"));
  });
  Object.entries(DB.prep).forEach(([lid,P])=>{
    if(lid.indexOf(TRASH) === 0 || lid.indexOf(LOG) === 0) return;   /* مفاتيحُ جانبية */
    if(!P.__issued) return;
    const L = DB.sched.find(x=>x.id===lid); if(!L) return;
    const x = put(L.teacher, "معلم", L.teacherNo); if(x) x.prep++;
  });
  /* ⛔ الرصدُ يُنسب إلى المقيّم المسنَد في الجدول لا إلى اسم الدخول:
     لو اختلف الاسمان حرفاً ظهر الشخصُ مرتين — مرةً «لم يفعّل» ومرةً «مفعِّل».
     ومفتاحُ الرصد يحمل صفةَ المقيّم، فمنها يُعرف صاحبُها في الجدول. */
  const SLOT = {}; D.evalroles.forEach((r,i)=>{ SLOT[r] = ["ev1","ev2","ev3"][i]; });
  Object.entries(DB.obs).forEach(([k,v])=>{
    const L = DB.sched.find(z=>z.id===v.__lid) || {};
    const role = k.split("|")[1] || "";
    const named = L[SLOT[role]] || v.__by;
    const x = put(named, "مقيّم"); if(x){ x.obs++; if(v.__by && v.__by !== named) x.alias = v.__by; }
  });
  Object.entries(DB.peer).forEach(([k,v])=>{
    const named = k.split("|")[1] || v.__by;     /* مفتاحُ الأقران يحمل اسمَ الزائر */
    const x = put(named, "زائر"); if(x) x.peer++;
  });
  const rows = Object.values(people).map(x=>{
    const active = x.prep + x.obs + x.peer;
    return [x.name + (x.alias ? "  (دخل باسم: " + x.alias + ")" : ""), x.no || "—",
            [...x.roles].join(" · "), arn(x.sched), arn(x.prep), arn(x.obs), arn(x.peer),
            {tag: active ? "مفعِّل" : "لم يفعّل", cls: active ? "ok" : "no"}, active];
  }).sort((a,b)=>a[8]-b[8]);
  const off = rows.filter(r=>!r[8]).length;
  kpis(p, [[arn(rows.length),"فرداً في المنظومة"], [arn(rows.length-off),"فعّلوا"], [arn(off),"لم يفعّلوا"]]);
  tbl(p, ["الاسم","الرقم الوظيفي","الدور","حصصه المجدولة","تحضيرات صدرت",
          "استمارات رصدها","بطاقات أقران","التفعيل"],
    rows.map(r=>r.slice(0,8)));
}

function exportCSV(name){
  const R = window.__rpt;
  if(!R) return alert("لا جدول لتصديره.");
  const esc = v => '"' + String(v==null?"":v).replace(/"/g,'""') + '"';
  const csv = "﻿" + [R.heads.map(esc).join(","), ...R.rows.map(r=>r.map(esc).join(","))].join("\n");
  const a = document.createElement("a");
  a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
  a.download = name + ".csv"; a.click();
}

/* ═════════ الإقلاع ═════════ */
let lastPull = 0;
/* غيرُ المقيّم لا يملك زرَّ تحديث، فتُسحب له البياناتُ تلقائياً كل نصف دقيقة عند التنقّل */
function autoPull(){
  if(!api() || isAdmin()) return;
  const now = Date.now();
  if(now - lastPull < 30000) return;
  lastPull = now;
  pull().then(ok=>{ if(ok && PH !== 2) render(); });
}
function boot(){ if(!ME) login(); else shell(); }
/* ⛔ لا يُطلب من معلمةٍ أن تلصق رابطاً: الرابطُ الذي تصلها يحمل المخزن في #srv=
   فيُربط جهازُها من أول فتحةٍ ثم يُنظَّف العنوان فلا يبقى فيه شيء. */
function adoptSrv(){
  try{
    const h = location.hash || "", q = location.search || "";
    let m = h.match(/[#&]srv=([^&]+)/) || q.match(/[?&]srv=([^&]+)/);
    if(!m) return false;
    const u = decodeURIComponent(m[1]);
    if(!/^https?:\/\//.test(u)) return false;
    if(api() === u) return false;
    localStorage.setItem(API, u);
    history.replaceState(null, "", location.pathname);
    return true;
  }catch(e){ return false; }
}
/* هجرةُ خريطة الزمن: كانت تُحفظ بالموضع (t_0…t_6) فتُنقل إلى مفاتيحها.
   ⛔ ولا هجرةَ مدارسَ هنا: المدرسةُ واحدةٌ بمرحلتين، ولا اندماجَ ولا إعادةَ
      ترقيمِ أسابيعَ سابقة — فحُذف ما كان لغيرها. */
function migrate(){
  let n = 0;
  Object.values(DB.prep || {}).forEach(P=>{
    if(!P || P.__tmig) return;
    let moved = 0;
    (D.tlegacy || []).forEach((k, j)=>{
      if(P["t_" + j] != null && P["t_" + j] !== ""){ P["tk_" + k] = P["t_" + j]; moved++; }
      delete P["t_" + j];
    });
    if(moved){ P.__tmig = 1; n++; }
  });
  (DB.sched||[]).forEach(L=>{
    if(!L.sector){ L.sector = D.sectors[0]; n++; }
    if(!L.gk || L.gk.split("|").length < 7)
      L.gk = [L.sector, L.complex, L.stage, L.period, L.week, L.day, L.spec].join("|");
  });
  if(n) save();
}
load();
try{ migrate(); }catch(e){}
adoptSrv();
if(api()) pull().then(boot); else boot();

/* ═════════ المرحلة ٢: الاستعداد والتحضير ═════════ */
function ph2(m){
  const L = DB.sched.find(x=>x.id===CUR);
  if(!L){ picker(m, "اختر الحصة التي تحضّر لها", ()=>shell()); return; }
  const P = DB.prep[L.id] = DB.prep[L.id] || {};
  const ro = ME.role !== "teacher" || !!L.approved;   /* المعتمدةُ للقراءة */
  const head = el("div","card");
  const h = el("h3"); h.appendChild(el("span",null, lessonTitle(L)));
  h.appendChild(el("small",null, lessonSub(L))); head.appendChild(h);
  const hp = el("div","pad"), bar = el("div","bar");
  const back = el("button","b ghost","تغيير الحصة");
  back.addEventListener("click", ()=>{ CUR=null; shell(); });
  bar.appendChild(back);
  if(!ro){
    const iss = el("button","b"); iss.id="issue";
    iss.addEventListener("click", ()=>issue(L,P));
    bar.appendChild(iss);
    let sh = false;
    const ha = el("button","b ghost","إظهار كل التلميحات");
    ha.addEventListener("click", ()=>{ sh=!sh;
      document.querySelectorAll(".hint").forEach(x=>x.style.display = sh ? "" : "none");
      ha.textContent = sh ? "إخفاء التلميحات" : "إظهار كل التلميحات"; });
    bar.appendChild(ha);
  }
  const pr = el("button","b ghost","طباعة"); pr.addEventListener("click", ()=>window.print());
  bar.appendChild(pr);
  hp.appendChild(bar);
  const out = el("div"); out.id = "issueOut"; hp.appendChild(out);
  if(P.__issued){
    const w = el("div","msg ok"); w.textContent = "صدر هذا التحضير في " + P.__issued;
    hp.appendChild(w);
  }
  head.appendChild(hp); m.appendChild(head);

  /* ضخُّ بيانات الحصة الأساسية من خليّة الجدول — كما في نموذج إكسل التحضير */
  inject(L, P);
  const c0 = el("div","card"); const h0 = el("h3");
  h0.appendChild(el("span",null,"بيانات الحصة"));
  h0.appendChild(el("small",null,"مضخوخةٌ من خليّة الجدول — أكمل ما بقي")); c0.appendChild(h0);
  const src = el("div","srcbar");
  src.appendChild(el("span",null,"مصدرها: " + lessonSub(L)));
  const rb = el("button","b ghost sm","أعد الضخّ من الجدول");
  /* ⛔ يكتب فوق ما كتبه المعلم — فلا يُنفَّذ إلا بعد أن يُسمّى له ما سيضيع */
  rb.addEventListener("click", ()=>{
    const will = [["الاسم", P.i_teacher], ["المادة", P.i_subject], ["الفصل", P.i_klass],
                  ["الحصة", P.i_period], ["التاريخ", P.i_date], ["الإستراتيجية", P.f_strat]]
                 .filter(x=>(x[1]||"").trim()).map(x=>x[0]);
    if(will.length && !confirm("سيُكتب فوق ما أدخلتَه في: " + will.join(" · ")
        + "\nوتُستبدل قيمُها بما في الجدول.\n\nأتُتابع؟")) return;
    inject(L, P, true); save(); shell();
  });
  if(ME.role === "teacher") src.appendChild(rb);
  c0.appendChild(src);
  const g0 = el("div","grid"); g0.style.padding = "14px 16px";
  D.info.forEach(f=>{
    const w = el("label","f");
    w.appendChild(el("span",null, f.l + (f.u ? " (" + f.u + ")" : "")));
    if(ro) w.appendChild(el("div","ro", P["i_"+f.k] || "—"));
    else w.appendChild(fld("txt", P["i_"+f.k], v=>{ P["i_"+f.k]=v; save(); refresh(P); }));
    g0.appendChild(w);
  });
  c0.appendChild(g0); m.appendChild(c0);

  D.sections.forEach(sec=>{
    const c = el("div","card"), hh = el("h3");
    hh.appendChild(el("span",null, sec.t)); hh.appendChild(el("small",null, sec.n));
    c.appendChild(hh);
    const pd = el("div","pad");
    sec.rows.forEach(r=>{
      const rw = el("div","row2"), lb = el("div","lab"), fl = el("div");
      const tt = el("div"); tt.textContent = r.label; lb.appendChild(tt);
      if(r.ind){ const i = el("div"); i.style.cssText = "font-size:12.5px;color:var(--teal2);font-weight:400";
        i.textContent = "يغذّي " + r.ind; lb.appendChild(i); }
      if(r.hint && !ro){
        const hb = el("button","hb noprint","؟");
        const hd = el("div","hint", r.hint); hd.style.display = "none";
        hb.addEventListener("click", ()=>{ hd.style.display = hd.style.display === "none" ? "" : "none"; });
        lb.appendChild(hb); fl.appendChild(hd);
      }
      if(r.note){ const n = el("div");
        n.style.cssText = "color:var(--grey);font-size:14px;margin-bottom:4px";
        n.textContent = r.note + ":"; fl.appendChild(n); }
      fl.appendChild(pfield(r, P, ro));
      rw.appendChild(lb); rw.appendChild(fl); pd.appendChild(rw);
    });
    c.appendChild(pd); m.appendChild(c);
  });
  refresh(P);
}

function pfield(r, P, ro){
  const K = "f_" + r.k;
  const set = (k,v)=>{ P[k]=v; save(); refresh(P); };
  /* ⚠️ عنوانُ الحقل في عمودٍ مجاورٍ لا في <label for>, فيُحقن aria-label
     وإلا قرأ قارئُ الشاشة حقلاً بلا اسم. */
  const A = (e, extra)=>{ if(e && e.setAttribute)
    e.setAttribute("aria-label", r.label + (extra ? " — " + extra : "")); return e; };
  if(r.t === "line") return ro ? el("div","ro", P[K]||"—") : A(fld("txt", P[K], v=>set(K,v)));
  if(r.t === "area") return ro ? el("div","ro", P[K]||"—") : A(fld("area", P[K], v=>set(K,v)));
  if(r.t === "select") return ro ? el("div","ro", P[K]||"—") : A(fld("sel", P[K], v=>set(K,v), r.items, r.label));
  if(r.t === "lines"){
    const w = el("div");
    for(let i=1;i<=r.n;i++){
      const ln = el("div"); ln.style.cssText = "display:flex;gap:8px;align-items:center;margin:3px 0";
      ln.appendChild(el("b",null, arn(i) + "."));
      const kk = K + "_" + i;
      ln.appendChild(ro ? el("div","ro", P[kk]||"—") : A(fld("txt", P[kk], v=>set(kk,v)), arn(i)));
      w.appendChild(ln);
    }
    return w;
  }
  if(r.t === "ticks" || r.t === "ticks_note"){
    const w = el("div");
    if(ro){ const pk = r.items.filter((_,i)=>P[K+"#"+i]);
      w.appendChild(el("div","ro", pk.length ? pk.join("  ·  ") : "—")); }
    else{
      const tw = el("div","ticks");
      r.items.forEach((it,i)=>{
        const l = el("label","tk"), cb = el("input"); cb.type = "checkbox";
        cb.checked = !!P[K+"#"+i];
        cb.setAttribute("aria-label", r.label + " — " + it);
        cb.addEventListener("change", ()=>set(K+"#"+i, cb.checked));
        l.appendChild(cb); l.appendChild(el("span",null,it)); tw.appendChild(l);
      });
      w.appendChild(tw);
    }
    if(r.t === "ticks_note"){
      const n = el("div"); n.style.marginTop = "6px";
      n.appendChild(ro ? el("div","ro", P[K+"_note"]||"—") : A(fld("txt", P[K+"_note"], v=>set(K+"_note",v)), r.note||"كيف"));
      w.appendChild(n);
    }
    return w;
  }
  if(r.t === "time"){
    /* ⛔ مجموعتان لا سطرٌ واحد — مطابقاً للمطبوع حرفاً بحرف:
       لو صُفَّت خانتا التمايز مع صف المجموع قرأها القارئُ جامعةً فبلغ ٦١ والحصةُ ٤٥.
       فالأولى: التهيئة · التنفيذ · التقويم · الغلق · المجموع (وهو مجموعُ الأربع).
       والثانية تحتها: زمنا التمايز — وهما **داخل** التنفيذ لا يُضافان. */
    const w = el("div");
    const g1 = el("div","g5");
    D.tmain.forEach(k=>{
      const lb = D.tlabels[k], b = el("div");
      b.appendChild(el("label", k === "total" ? "auto" : null, lb));
      if(k === "total"){
        const d = el("div","ro sum"); d.id = "tsumcell";
        d.textContent = arn(tsum(P).parts); b.appendChild(d);
      } else {
        const K2 = "tk_" + k;
        /* ⛔ لا إعادةَ بناءٍ عند كل حرف: كانت تُفقد التركيزَ وتقفز الصفحةُ لأعلى.
           تُحدَّث خانةُ المرحلة في مكانها وحدها. */
        b.appendChild(ro ? el("div","ro", P[K2]||"—")
          : A(fld("txt", P[K2], v=>{ P[K2] = v; fillStageTimes(P);
              syncStageInputs(P); save(); refresh(P); }), lb));
      }
      g1.appendChild(b);
    });
    w.appendChild(g1);
    const hd = el("div","tdiff");
    hd.textContent = D.tdifft + " — داخلَه لا يُضافان إليه:";
    w.appendChild(hd);
    const g2 = el("div","g2");
    D.tdiff.forEach(k=>{
      const lb = D.tlabels[k], K2 = "tk_" + k, b = el("div","care");
      b.appendChild(el("label",null,lb));
      b.appendChild(ro ? el("div","ro", P[K2]||"—")
        : A(fld("txt", P[K2], v=>set(K2,v)), lb));
      g2.appendChild(b);
    });
    w.appendChild(g2);
    if(!ro){
      const rb = el("button","b ghost sm","وزّع الزمن على المراحل");
      rb.style.cssText = "margin-top:9px";
      rb.title = "التهيئةُ والغلقُ كما في الخريطة، والتنفيذُ والتقويمُ يُقسمان على النشاطين";
      rb.addEventListener("click", ()=>{
        const mine = D.stages.filter(([k])=>(P["st_"+k+"_time"]||"").trim() && !P["st_"+k+"_time_auto"])
                             .map(([,n])=>n);
        if(mine.length && !confirm("سيُكتب فوق الأزمنة التي كتبتَها بنفسك في: "
            + mine.join(" · ") + "\n\nأتُتابع؟")) return;
        fillStageTimes(P, true); save(); shell();
      });
      w.appendChild(rb);
    }
    const s2 = el("div"); s2.id = "tsum";
    s2.style.cssText = "display:flex;gap:10px;flex-wrap:wrap;margin-top:8px;font-size:14.5px";
    w.appendChild(s2);
    return w;
  }
  if(r.t === "stages"){
    const w = el("div"), hd = el("div","stg");
    ["المرحلة", D.lab_t, D.lab_l, "نمط العمل وتقويمه"].forEach(x=>{
      const d = el("div","stn",x); d.style.color = "var(--teal2)"; hd.appendChild(d); });
    w.appendChild(hd);
    D.stages.forEach(([k,name])=>{
      const st = el("div","stg"), c0 = el("div","stn",name);
      c0.appendChild(ro ? el("div","ro", (P["st_"+k+"_time"]||"—") + " د")
                        : (function(){
                            const e2 = A(fld("txt", P["st_"+k+"_time"], v=>{
                              P["st_"+k+"_time_auto"] = 0;   /* صار بيد المعلم */
                              set("st_"+k+"_time", v);
                            }, null, "الزمن"), name + " — الزمن");
                            e2.dataset.stt = k; return e2;
                          })());
      st.appendChild(c0);
      st.appendChild(ro ? el("div","ro", P["st_"+k+"_t"]||"—") : A(fld("area", P["st_"+k+"_t"], v=>set("st_"+k+"_t",v)), name + " — " + D.lab_t));
      st.appendChild(ro ? el("div","ro", P["st_"+k+"_l"]||"—") : A(fld("area", P["st_"+k+"_l"], v=>set("st_"+k+"_l",v)), name + " — " + D.lab_l));
      const md = el("div");
      D.modes.forEach((grp,gi)=>{
        if(ro){ const pk = grp.filter((_,i)=>P["st_"+k+"_m"+gi+"#"+i]);
          md.appendChild(el("div",null, pk.join(" · ") || "—")); }
        else{
          const tw = el("div","ticks"); tw.style.gap = "2px 10px";
          grp.forEach((it,i)=>{
            const l = el("label","tk"), cb = el("input"); cb.type = "checkbox";
            cb.checked = !!P["st_"+k+"_m"+gi+"#"+i];
            cb.style.cssText = "width:15px;height:15px";
            cb.addEventListener("change", ()=>set("st_"+k+"_m"+gi+"#"+i, cb.checked));
            l.style.fontSize = "13.5px";
            l.appendChild(cb); l.appendChild(el("span",null,it)); tw.appendChild(l);
          });
          md.appendChild(tw);
        }
      });
      st.appendChild(md); w.appendChild(st);
    });
    return w;
  }
  return el("div");
}

function n2(x){
  const m = String(x||"").replace(/[٠-٩]/g, d=>"٠١٢٣٤٥٦٧٨٩".indexOf(d));
  const v = parseFloat(m); return isNaN(v) ? 0 : v;
}
/* ⚠️ خريطةُ الزمن أربعُ خاناتٍ ومراحلُ الحصة أربع، لكنّ «التنفيذ» يتوزّع على
   النشاطين و«التقويم» بينهما. فالاقتراحُ: التهيئةُ والغلقُ كما هما، والتنفيذُ
   والتقويمُ يُقسمان على النشاطين — ويبقى للمعلم تعديلُهما. */
function stageTimes(P){
  const ex = n2(P.tk_exec), ev = n2(P.tk_eval), body = ex + ev;
  return {warm: n2(P.tk_warm), close: n2(P.tk_close),
          act1: Math.ceil(body/2), act2: Math.floor(body/2)};
}
/* ⛔ الزمنُ يتبع الخريطة ما دام لم يُلمَس بيد: يُعلَّم المولَّدُ بـ`_auto`،
   فإن عدّله المعلمُ سقطت العلامةُ وصار رأيُه هو المعتمد. */
function fillStageTimes(P, force){
  const t = stageTimes(P); let n = 0;
  D.stages.forEach(([k])=>{
    const key = "st_" + k + "_time", flag = key + "_auto";
    if(t[k] == null) return;
    const mine = (P[key]||"").trim() && !P[flag];      /* كتبه المعلمُ بنفسه */
    if(!force && mine) return;
    const v = t[k] > 0 ? arn(t[k]) : "";
    if(P[key] !== v){ P[key] = v; n++; }
    P[flag] = 1;
  });
  return n;
}
function stagesSum(P){ return D.stages.reduce((a,[k])=>a + n2(P["st_"+k+"_time"]), 0); }
function tsum(P){
  /* ⚠️ بالمفتاح لا بالموضع: إعادةُ ترتيب الخانات لا تُزحزح قيمةً واحدة */
  const parts = D.tsum_keys.reduce((a,k)=>a + n2(P["tk_"+k]), 0);
  const total = n2(P["i_dur"]);                 /* زمنُ الحصة من بيانات الحصة */
  const care = n2(P["tk_care"]), gift = n2(P["tk_gift"]);
  const exec = n2(P["tk_exec"]);
  const stg = D.stages.reduce((a,[k])=>a + n2(P["st_"+k+"_time"]), 0);
  return {parts, total, care, gift, exec, stg,
          ok: total > 0 && parts === total,
          stgok: stg === 0 || stg === parts,
          inside: (care + gift) <= (exec || parts)};
}
function missing(P){
  const out = [];
  D.info.forEach(f=>{ if(["teacher","subject","klass","topic","dur"].includes(f.k) && !(P["i_"+f.k]||"").trim()) out.push(f.l); });
  D.sections.forEach(sec=>sec.rows.forEach(r=>{
    if(!r.req) return;
    const K = "f_" + r.k;
    if(["line","area","select"].includes(r.t)){ if(!(P[K]||"").trim()) out.push(r.label); }
    else if(r.t === "lines"){ if(!(P[K+"_1"]||"").trim()) out.push(r.label); }
    else if(r.t === "ticks" || r.t === "ticks_note"){
      if(!r.items.some((_,i)=>P[K+"#"+i])) out.push(r.label);
      if(r.t === "ticks_note" && !(P[K+"_note"]||"").trim()) out.push(r.label + " (كيف؟)");
    }
    else if(r.t === "time"){
      const t = tsum(P);
      if(!t.total) out.push("خريطة الزمن — اكتب «زمن الحصة» في بيانات الحصة أولاً");
      else if(!t.ok) out.push("خريطة الزمن — المجموع " + arn(t.parts) + " والمطلوب " + arn(t.total)
                              + " (الفرق " + arn(Math.abs(t.parts - t.total)) + " د)");
      if(!t.inside) out.push("زمنا الأولى بالرعاية والموهوبين أكبرُ من زمن التنفيذ — وهما داخله لا خارجه");
      if(t.parts && !t.stgok) out.push("أزمنةُ المراحل مجموعها " + arn(t.stg)
        + " وخريطةُ الزمن " + arn(t.parts) + " — اضغط «وزّع الزمن على المراحل»");
    }
    else if(r.t === "stages"){ D.stages.forEach(([k,n])=>{
      if(!(P["st_"+k+"_t"]||"").trim() || !(P["st_"+k+"_l"]||"").trim()) out.push("مرحلة " + n); }); }
  }));
  return [...new Set(out)];
}
function refresh(P){
  const ts0 = tsum(P), cell = document.getElementById("tsumcell");
  if(cell){ cell.textContent = arn(ts0.parts);
    cell.className = "ro sum " + (ts0.total ? (ts0.ok ? "good" : "bad") : ""); }
  const s = document.getElementById("tsum");
  if(s){
    const t = tsum(P); s.innerHTML = "";
    const mk = (txt,bg,fg)=>{ const e = el("span",null,txt);
      e.style.cssText = "border-radius:6px;padding:3px 9px;background:" + bg + ";color:" + (fg||"inherit"); return e; };
    s.appendChild(mk("مجموع المراحل: " + arn(t.parts), "var(--head)"));
    s.appendChild(mk("زمن الحصة: " + (t.total ? arn(t.total) : "—"), "var(--head)"));
    s.appendChild(mk(t.ok ? "✓ متطابق" : "✗ غير متطابق",
      t.ok ? "var(--okbg)" : "var(--badbg)", t.ok ? "var(--ok)" : "var(--bad)"));
  }
  const b = document.getElementById("issue");
  if(b){ const mm = missing(P);
    b.textContent = mm.length ? ("إصدار التحضير — ينقصه " + arn(mm.length)) : "إصدار التحضير ✓"; }
}
function issue(L,P){
  const out = document.getElementById("issueOut"); out.innerHTML = "";
  const mm = missing(P);
  if(mm.length){
    const box = el("div","msg bad");
    box.appendChild(el("b",null,"لا يُصدَّر التحضير قبل اكتمال ما يقابله مؤشرٌ في الاستمارة — الناقص:"));
    const ul = el("ul"); mm.forEach(x=>ul.appendChild(el("li",null,x))); box.appendChild(ul);
    out.appendChild(box); window.scrollTo({top:0,behavior:"smooth"}); return;
  }
  P.__issued = new Date().toISOString().slice(0,16).replace("T"," ");
  logAct("إصدار التحضير", lessonTitle(L), L); syncFlush();
  save(); refresh(P);
  const box = el("div","msg ok");
  box.appendChild(el("b",null,"صدر التحضير. "));
  box.appendChild(el("span",null,"ظهر الآن للزائرين والمقيّمين في مرحلة أداء الحصة."));
  out.appendChild(box);
}

/* ═════════ المرحلة ١: جدول الحصص الموحَّدة للتقويم الخارجي ═════════
   ⛔ لا يُذكر اسمُ البرنامج السابق في أي نصٍّ يراه المستخدم: هو برنامجٌ آخر،
      وهذه منصةُ الحصص الموحَّدة وحدها. (وبنيةُ الجدول مستمَدّةٌ من ملفٍ سابق.)
   · صفوفُ الجدول: (الأسبوع × اليوم × تخصص الزائر)، وأعمدتُه الحصصُ بأوقاتها،
     وتحت كل حصةٍ خمسةُ حقول. وبنيةُ الأعمدة تأتي من D.bands لا من افتراض.
   · والدورانُ مقروءٌ من الورقة الأولى لا محسوباً — وله وجهان:
     «من يزورنا» للمدرسة، و«أين أزور» للمشرف.
   · ولا أربعاء، والأسبوعُ الرابعُ ثلاثةُ أيامٍ لا أربعة — كما في الأصل. */
let GS = null;
function gctx(){
  if(!GS){
    try{ GS = JSON.parse(localStorage.getItem(KEY+"_ctx")||"null"); }catch(e){}
    GS = GS || {};
  }
  /* ── النطاقُ يُورَث من الدخول: المدرسةُ للمدير والوكيل، والتخصصُ لمن يتنقّل ── */
  if(!GS.sector) GS.sector = (ME && ME.sector) || D.sectors[0];
  const cl = D.complexes[GS.sector] || D.complexlist;
  if(!GS.complex || cl.indexOf(GS.complex) < 0) GS.complex = (ME && ME.complex &&
      cl.indexOf(ME.complex) >= 0) ? ME.complex : cl[0];
  if(!Array.isArray(GS.stages)) GS.stages = [];
  if(GS.spec == null) GS.spec = (ME && ME.spec) || "";
  /* ⛔ المديرُ والوكيلُ مربوطان بمدرستهما: القطاعُ والمجمعُ والمدرسةُ تُفرض ولا
     تُترك للاختيار، فلا يريان جدولَ مدرسةٍ ليست لهما. (٢٩ سبتمبر ٢٠٢٦) */
  if(typeof isSchoolBound === "function" && isSchoolBound() && ME.school){
    GS.sector = ME.sector || GS.sector;
    GS.complex = ME.complex || GS.complex;
    GS.stages = [ME.school];
  }
  if(!GS.tab) GS.tab = (ME && ME.role === "peer") ? "visits" : "fill";
  /* تبويبٌ محفوظٌ من دورٍ آخر لا يُعرض لهذا الدور */
  if(ME && ME.role === "teacher" && (GS.tab === "sup" || GS.tab === "visits")) GS.tab = "fill";
  if(ME && typeof isSchoolBound === "function" && isSchoolBound()
     && (GS.tab === "sup" || GS.tab === "visits")) GS.tab = "fill";
  return GS;
}
function setctx(k,v){ gctx()[k]=v; localStorage.setItem(KEY+"_ctx", JSON.stringify(GS)); }
function bandsOf(cx){ return D.bands[cx] || []; }
function schoolsOf(cx){                              /* أسماءُ المدارس = نطاقاتُ المراحل */
  const out = [];
  bandsOf(cx).forEach(b=>{ if(out.indexOf(b.stage) < 0) out.push(b.stage); });
  return out;
}
function groupOf(cx, wk, day){ return ((D.rot[cx]||{})[wk]||{})[day] || ""; }
/* ⚠️ في العالمي يزور فريقُ الهوية الوطنية مجمعاً بعينه في يومٍ بعينه، فقد يجتمع
   مع الفريق الدائر في اليوم نفسه — فتُعاد مجموعتان لا واحدة. */
function groupsOf(c, wk, day){
  /* ⛔ مدرسةٌ واحدةٌ بلا مجمعاتٍ تُقسَّم عليها الفرق: فنطاقاتُ الإشراف الخمسةُ
     كلُّها حاضرةٌ كلَّ يوم، ويُضيّق المشرفُ بمرشّحَي التخصص واليوم. */
  if(D.norot) return (D.specgroups || []).slice();
  const out = [];
  const g = groupOf(c.complex, wk, day);
  if(g) out.push(g);
  if(c.sector === "عالمي" && D.natdays && D.natdays[day] === c.complex
     && out.indexOf(D.natgroup) < 0) out.push(D.natgroup);
  return out;
}
function isNatSpec(sp){ return (D.natspecs||[]).indexOf(sp) >= 0; }
function calOf(wk){ return D.cal.find(c=>c.w === wk) || null; }
function todayISO(){ const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0"); }
/* الأسبوعُ الجاري: الذي يقع اليومُ بين طرفيه — وإلا فالقادمُ الأقرب */
function currentWeek(){
  const t = todayISO();
  const inIt = D.cal.find(c=>t >= c.from && t <= c.to);
  if(inIt) return inIt.w;
  const next = D.cal.find(c=>t < c.from);
  return next ? next.w : null;
}
function dayDate(wk, day){ const c = calOf(wk); return c ? (c.days[day]||{}) : {}; }
function gkey(cx, band, wk, day, spec){
  return [gctx().sector, cx, band.stage, band.per, wk, day, spec].join("|");
}
function findLesson(gk){ return DB.sched.find(x=>x.gk === gk); }
function isMine(L){ return (L.teacher||"").trim() === (ME.name||"").trim(); }
/* المقيّمُ يكتب في الجدول كلِّه · والمعلمُ في مدارسه التي اختارها وفي خانته وحدها */
function canEdit(c, band, L){
  if(L && L.approved) return false;          /* ⛔ معتمدةٌ فمقفولة — حتى للمقيّم */
  if(isEval()) return true;
  if(ME.role !== "teacher") return false;
  if(c.stages.length && c.stages.indexOf(band.stage) < 0) return false;
  return !L || !(L.teacher||"").trim() || isMine(L);
}

function ph1(m){
  const c = gctx(), T = ME.role === "teacher";
  const top = el("div","card");
  const th = el("h3");
  th.appendChild(el("span",null,"جدول الحصص الموحَّدة للتقويم الخارجي"));
    /* ⚠️ وصفُ البنية يُقرأ من البيانات: مدرسةٌ واحدةٌ لا تشبه مجمعاً بمدارس. */
  th.appendChild(el("small",null, D.lab_gridsub ||
    "البنيةُ نفسها: الأسبوع واليوم وتخصص الزائر صفوفاً، ومدارسُ المجمع وحصصُها أعمدة"));
  top.appendChild(th);
  const tp = el("div","pad");
  const gr = el("div","grid");
  const lab = (t)=>{ const w = el("label","f"); w.appendChild(el("span",null,t)); return w; };
  const ws = lab("نوع التعليم");
  if(D.onesector) ws.style.display = "none";
  ws.appendChild(fld("sel", c.sector, v=>{
    setctx("sector", v);
    const l = D.complexes[v] || [];
    if(l.indexOf(c.complex) < 0) setctx("complex", l[0] || "");
    setctx("stages", []); shell();
  }, D.sectors));
  gr.appendChild(ws);
  const wc = lab(D.lab_complex || "المجمع التعليمي");
  wc.appendChild(fld("sel", c.complex, v=>{ setctx("complex", v); setctx("stages", []); shell(); },
                     D.complexes[c.sector] || D.complexlist));
  gr.appendChild(wc);
  /* ⛔ التخصصُ مرشِّحٌ لكل من يتنقّل — لا للمعلم وحده. كان المشرفُ يرى المجمعَ
     كلَّه ويبحث بيده: «أليس من المفترض أن يوجد زر خاص باختيار تخصص المشرف
     التربوي الزائر لتظهر حصصه فقط». (٢٩ سبتمبر ٢٠٢٦) */
  if(T || isRoving()){
    const ws = lab(T ? "تخصصك" : "التخصص الذي تزوره");
    ws.appendChild(fld("sel", c.spec, v=>{ setctx("spec", v); shell(); },
                       T ? D.specs : ["كل التخصصات"].concat(D.specs)));
    gr.appendChild(ws);
  }
  /* ⛔ ومرشِّحُ اليوم: «وكذلك زر لليوم الذي يزور فيه لتظهر له حصص ذلك اليوم» */
  if(!T){
    const wd = lab("اليوم");
    wd.appendChild(fld("sel", c.vday || "كل الأيام",
                       v=>{ setctx("vday", v === "كل الأيام" ? "" : v); shell(); },
                       ["كل الأيام"].concat(D.days)));
    gr.appendChild(wd);
  }
  tp.appendChild(gr);
  /* ⛔ زيارةُ اليوم بضغطةٍ: يضبط الأسبوعَ واليومَ والمجمعَ الذي يزوره فريقُه */
  if(isSupervisor()){
    const qb = el("div","bar");
    const t0 = el("button","b sm","زيارتي اليوم");
    t0.title = "يضبط الأسبوعَ واليومَ والمجمعَ من تاريخ اليوم";
    t0.addEventListener("click", ()=>{ jumpToToday(); shell(); });
    qb.appendChild(t0);
    const aw = el("button","b ghost sm","كلُّ الأسبوع");
    aw.addEventListener("click", ()=>{ setctx("vday",""); shell(); });
    qb.appendChild(aw);
    const hint = el("small",null, todayHint());
    hint.style.cssText = "margin-inline-start:10px;color:var(--grey)";
    qb.appendChild(hint);
    tp.appendChild(qb);
  }

  /* ⚠️ المعلمُ قد يكون منتدباً، فيختار أكثر من مرحلةٍ يدرّس فيها */
  const sw = el("div","stpick");
  /* ⛔ المديرُ والوكيلُ لا يختاران مدرسةً: مدرستُهما واحدةٌ ثُبِّتت عند الدخول،
     فيُعرض اسمُها ولا يُعرض اختيار. (٢٩ سبتمبر ٢٠٢٦) */
  const bound = isSchoolBound() && ME.school;
  if(bound){
    sw.appendChild(el("b",null,"مدرستك:"));
    const tag = el("div","ticks");
    tag.appendChild(el("span","tag ok", D.lab_complex ? ME.complex : (ME.school + " · مجمع " + ME.complex)));
    sw.appendChild(tag);
    sw.appendChild(el("small",null,
      "أعمدةُ مدرستك وحدها مفتوحةٌ لك — ولتغييرها اخرج وادخل بمدرسةٍ أخرى."));
  }
  if(!bound) sw.appendChild(el("b",null, T ? "مراحلُ التدريس — اختر واحدةً أو أكثر:"
                                : "ترشيحُ الأعمدة بالمدرسة (اختياري):"));
  const sl = el("div","ticks");
  if(!bound) schoolsOf(c.complex).forEach(st=>{
    const l = el("label","tk"), cb = el("input"); cb.type = "checkbox";
    cb.checked = c.stages.indexOf(st) >= 0;
    cb.addEventListener("change", ()=>{
      const a = c.stages.slice(), i = a.indexOf(st);
      if(cb.checked){ if(i < 0) a.push(st); } else if(i >= 0) a.splice(i,1);
      setctx("stages", a); shell();
    });
    l.appendChild(cb); l.appendChild(el("span",null,st)); sl.appendChild(l);
  });
  if(!bound) sw.appendChild(sl);
  if(T && !bound) sw.appendChild(el("small",null, c.stages.length
    ? "الأعمدةُ المفتوحةُ للإدخال: " + c.stages.join(" · ") + " — وسواها للقراءة."
    : "لا مرحلةَ مختارةٌ بعد، فكلُّ الأعمدة مفتوحةٌ للإدخال."));
  tp.appendChild(sw);

  const bar = el("div","bar");
  const tab = (k, t)=>{
    const b = el("button","b " + (c.tab === k ? "" : "ghost"), t);
    b.addEventListener("click", ()=>{ setctx("tab", k); shell(); });
    bar.appendChild(b);
  };
  /* ⛔ لا يُعرض زرٌّ لمن لا يملك فعلَه: الزائرُ لا يعدّل خانةً فلا معنى لتراجعه */
  if(ME.role !== "peer"){
    const ub = el("button","b ghost", UNDO.length ? "تراجع (" + arn(UNDO.length) + ")" : "تراجع");
    ub.disabled = !UNDO.length;
    if(UNDO.length) ub.title = "آخر تغيير: " + UNDO[UNDO.length-1].label;
    ub.addEventListener("click", undo);
    bar.appendChild(ub);
  }
  /* ═════════ أزرارُ كلِّ دورٍ وحدَه ═════════
     ⛔ «ما لا يخصه قم بحذفه واستبداله بما يخصه فقط» (٢٩ سبتمبر ٢٠٢٦):
        · المديرُ والوكيلُ لا يتنقّلان بين المجمعات، فلا «خطة زياراتي» ولا
          «أين أزور — جدول المشرفين»؛ ولهما بدلاً منهما «جدول مدرستي».
        · الوكيلُ وحدَه يُسنِد المعلمين الزائرين — فله «إسناد الزائرين».
        · الزائرُ لا يُعدّل خانةً، فلا تراجعَ ولا سلّةَ ولا جدولَ تعبئة. */
  const R = ME.role;
  tab("fill", R === "teacher" ? "جدولي"
            : (R === "peer" ? "جدول المجمع (للاطّلاع)"
            : (isSchoolBound() ? "جدول مدرستي" : "جدول التعبئة")));
  if(R !== "peer"){
    const n = trashList().filter(t=>isEval() || t.by === ME.name).length;
    if(n) tab("trash", "سلّة المحذوفات (" + arn(n) + ")");
  }
  if(isAdmin()) tab("log", "سجلّ العمليات");        /* ⛔ سجلُّ من فعل ماذا — للمستشار وحده */
  if(isDeputy()) tab("assign", "إسناد الزائرين");
  if(isRoving()) tab("visits", R === "peer" ? "زياراتي المسنَدة" : "خطة زياراتي");
  tab("school", R === "teacher" ? "من يزورنا"
              : (isSchoolBound() ? "من يزور مدرستنا"
                                 : (D.lab_schooltab || "جدول المجمع")));
  /* جدولُ دوران المشرفين لا يعني إلا من يدور فيه */
  /* ⛔ بلا دورانٍ لا جدولَ دوران: كلُّ الخلايا مدرسةٌ واحدة. */
  if(!D.norot && (isSupervisor() || isAdmin())) tab("sup", "أين أزور — جدول المشرفين");
  const pr = el("button","b ghost","طباعة"); pr.addEventListener("click", ()=>window.print());
  bar.appendChild(pr);
  if(isAdmin()){        /* ⛔ النسخةُ الاحتياطيةُ تُنزِّل بياناتِ المنظومة كلِّها */
    const bk = el("button","b ghost","نسخة احتياطية"); bk.addEventListener("click", backup); bar.appendChild(bk);
  }
  tp.appendChild(bar);
  top.appendChild(tp); m.appendChild(top);

  /* مرشِّحاتٌ تختصر ٤٨ صفاً إلى ما يعنيك */
  if(c.tab === "fill"){
    const fb = el("div","filt");
    const q = fld("txt", c.q||"", v=>{ setctx("q", v); redrawGrid(); }, null, "ابحث باسم معلمٍ أو فصل");
    q.setAttribute("aria-label", "بحثٌ في الجدول");
    fb.appendChild(q);
    /* ⛔ القيمةُ الفارغةُ ليست خياراً في القائمة، فيعرض المتصفحُ «— اختر —»
       ويظنُّ القارئُ أن عليه اختياراً. والفارغُ معناه «كل الأسابيع» فيُسمَّ به. */
    const wk = fld("sel", c.onlyw || "كل الأسابيع",
                   v=>{ setctx("onlyw", v === "كل الأسابيع" ? "" : v); shell(); },
                   ["كل الأسابيع"].concat(D.weeks));
    wk.setAttribute("aria-label", "ترشيحٌ بالأسبوع"); fb.appendChild(wk);
    const only = el("label","tk");
    const cb = el("input"); cb.type="checkbox"; cb.checked = !!c.onlyfull;
    cb.addEventListener("change", ()=>{ setctx("onlyfull", cb.checked); shell(); });
    only.appendChild(cb); only.appendChild(el("span",null,"المعبّأ فقط")); fb.appendChild(only);
    const now = el("button","b ghost sm","اذهب إلى الأسبوع الجاري");
    now.addEventListener("click", ()=>{ setctx("onlyw", currentWeek() || ""); shell(); });
    fb.appendChild(now);
    tp.appendChild(fb);
  }
  if(c.tab === "log") return logView(m, c);
  if(c.tab === "assign") return assignView(m, c);
  if(c.tab === "trash") return trashView(m, c);
  if(c.tab === "visits") return visitPlan(m, c);
  if(c.tab === "school") return rotSchool(m, c);
  if(c.tab === "sup") return rotSup(m, c);
  grid(m, c, T);
  myList(m, c);
}

/* صفوفُ الورقة: الأسبوع × اليوم × تخصصَي مجموعة ذلك اليوم */
function rowsOf(c){
  const out = [];
  const only = c.onlyw && c.onlyw !== "كل الأسابيع" ? c.onlyw : null;
  /* ⛔ مرشِّحا المشرف: تخصصُه ويومُ زيارته. كان يرى صفوفَ المجمع كلِّها (أربعُ
     مجموعاتٍ × ثمانيةُ تخصصاتٍ × أربعةُ أيام) ويبحث بيده. (٢٩ سبتمبر ٢٠٢٦)
     ⚠️ ولا يُرشَّح للمعلم بهذين: تخصصُه يلوّن صفَّه ولا يُخفي ما عداه، ليرى
        جدولَ مدرسته كاملاً كما في الإكسل. */
  const filt = !!(ME && isRoving());
  const oneSpec = filt && c.spec && c.spec !== "كل التخصصات" ? c.spec : null;
  const oneDay = filt && c.vday ? c.vday : null;
  D.weeks.forEach(wk=>{
    if(only && wk !== only) return;
    D.days.forEach(day=>{
      if(oneDay && day !== oneDay) return;
      const gs = groupsOf(c, wk, day);
      if(!gs.length) return;
      const dt = dayDate(wk, day);
      let i = 0;
      gs.forEach(gp=>{
        (D.pairs[gp] || []).forEach(sp=>{
          if(oneSpec && sp !== oneSpec) return;
          out.push({wk, day, gp, spec: sp, sub: i++, dt, nat: gp === D.natgroup});
        });
      });
    });
  });
  return out;
}

/* ═════════ زيارةُ اليوم ═════════
   ⛔ المشرفُ يفتح المنصةَ صباحَ يوم زيارته، فيجب أن تكون أمامه بلا بحث:
      الأسبوعُ من التقويم، واليومُ من اسم اليوم، والمجمعُ من جدول دوران فريقه. */
const DOW = ["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
function todayName(){ return DOW[new Date().getDay()]; }
function supComplexOn(wk, day){
  const gp = groupOfSpec(gctx().spec, gctx().sector);
  if(!gp) return "";
  if(gp === D.natgroup) return (D.natdays || {})[day] || "";
  return ((D.sup[gp] || {})[wk] || {})[day] || "";
}
function jumpToToday(){
  const wk = currentWeek() || D.weeks[0];
  setctx("onlyw", wk);
  const dn = todayName();
  /* ⚠️ الجمعةُ والسبتُ والأربعاءُ ليست أيامَ زيارة، فيُنتقل إلى أقرب يومٍ فيه
     لفريقه مجمع — ولا تُترك الشاشةُ فارغةً بلا تفسير. */
  const days = D.days.indexOf(dn) >= 0
      ? [dn].concat(D.days.filter(d=>d !== dn))
      : D.days.slice();
  let hit = "";
  for(const d of days){ if(supComplexOn(wk, d)){ hit = d; break; } }
  if(!hit){ setctx("vday",""); return false; }
  setctx("vday", hit);
  const cx = supComplexOn(wk, hit);
  if(cx && (D.complexes[gctx().sector] || []).indexOf(cx) >= 0){
    setctx("complex", cx); setctx("stages", []);
  }
  return true;
}
function todayHint(){
  const wk = currentWeek();
  const dn = todayName();
  if(!wk) return "اليومُ خارج أسابيع التقويم";
  const cx = supComplexOn(wk, dn);
  return cx ? ("اليوم: " + dn + " · " + wk + " · " + CXW + cx)
            : (dn + " ليس يومَ زيارةٍ لفريقك — يُنتقل إلى أقرب يوم");
}

function grid(m, c, T){
  const bands = bandsOf(c.complex), rows = rowsOf(c);
  const CURW = currentWeek();
  const g = el("div","card");
  const gh = el("h3");
  gh.appendChild(el("span",null, CXW + c.complex + (D.onesector ? "" : " · " + c.sector)));
  gh.appendChild(el("small",null, arn(rows.length) + " صفاً · " + arn(bands.length) + " عمود حصة"));
  const CURW2 = CURW;
  g.appendChild(gh);
  const wrap = el("div","gwrap");
  const t = el("table","mx");

  /* ⚠️ مع table-layout:fixed تأتي الأعرضُ من صف الرأس الأول، والرأسُ المدموج
     (المدرسة) يقسّم عرضَه على حصصه — فتضيق أعمدةُ المدرسة ذات الثلاث حصص
     وتتّسع ذاتُ الحصتين، فتتداخل الكلمات. و`colgroup` يفرض عرضاً واحداً لكلٍّ. */
  const cg = document.createElement("colgroup");
  [88, 104, 112].forEach(w=>{ const c = document.createElement("col"); c.style.width = w+"px"; cg.appendChild(c); });
  bands.forEach(()=>{ const c = document.createElement("col"); c.style.width = "186px"; cg.appendChild(c); });
  t.appendChild(cg);

  /* رأسٌ من ثلاثة صفوف كما في الملف: المدرسة ثم الحصة ثم الحقول */
  const h1 = el("tr");
  const corner = el("th","corner","المرحلة"); corner.colSpan = 3; corner.rowSpan = 2; h1.appendChild(corner);
  let i = 0;
  while(i < bands.length){
    let j = i; while(j < bands.length && bands[j].stage === bands[i].stage) j++;
    const th = el("th","band" + (T && c.stages.length && c.stages.indexOf(bands[i].stage) < 0 ? " off" : ""));
    th.colSpan = j - i; th.textContent = bands[i].stage;
    h1.appendChild(th); i = j;
  }
  t.appendChild(h1);
  const h2 = el("tr");
  /* ⛔ أُلغي عمودُ «الحصة ٣ (صفوف أولية)» ٢٩ سبتمبر ٢٠٢٦: مشرفُ الأولية صار
     يتابع الابتدائيةَ كلَّها (أولية + عليا)، فتكفيه الأولى والثانية. فلم يبقَ
     عمودٌ زائدٌ ولا تمييزَ له. */
  bands.forEach(b=>{
    const th = el("th");
    th.appendChild(el("b",null, b.per));
    th.appendChild(el("i",null, b.time ? "غالباً " + b.time : "—"));
    h2.appendChild(th);
  });
  t.appendChild(h2);
  const h3 = el("tr");
  ["الأسبوع","اليوم", D.lab_spec].forEach(x=>h3.appendChild(el("th","sub3",x)));
  bands.forEach(()=>h3.appendChild(el("th","sub3",
    D.lab_teacher_short + " · إستراتيجية · اتجاه · فصل · بدء")));
  t.appendChild(h3);

  const qq = (c.q||"").trim();
  const keep = rows.filter(r=>{
    if(!qq && !c.onlyfull) return true;
    const any = bands.some(b=>{
      const L = findLesson(gkey(c.complex, b, r.wk, r.day, r.spec));
      if(!L || !(L.teacher||"").trim()) return false;
      if(c.onlyfull && !qq) return true;
      const hay = (L.teacher||"") + " " + (L.klass||"") + " " + (L.strategy||"");
      return hay.indexOf(qq) >= 0;
    });
    return any;
  });
  const shown = (qq || c.onlyfull) ? keep : rows;
  if(!shown.length){
    wrap.appendChild(el("div","empty","لا صفَّ يطابق الترشيح — أزل البحث أو «المعبّأ فقط»."));
    g.appendChild(wrap); m.appendChild(g); return;
  }
  let lw = null, ld = null;
  shown.forEach(r=>{
    const tr = el("tr", r.sub ? "" : "sep");
    if(r.wk !== lw){
      const td = el("td","cw" + (r.wk === CURW ? " now" : ""));
      td.rowSpan = shown.filter(x=>x.wk === r.wk).length;
      td.appendChild(el("b",null, r.wk));
      const cc = calOf(r.wk);
      if(cc){ td.appendChild(el("i",null, cc.range)); td.appendChild(el("u",null, cc.hrange)); }
      tr.appendChild(td); lw = r.wk; ld = null;
    }
    const dk = r.wk + "|" + r.day;
    if(dk !== ld){
      const isToday = r.dt && r.dt.g === todayISO();
      const td = el("td","cd" + (isToday ? " today" : ""));
      td.rowSpan = shown.filter(x=>x.wk === r.wk && x.day === r.day).length;
      td.appendChild(el("b",null, r.day + (isToday ? "  ●" : "")));
      if(r.dt && r.dt.gt){
        td.appendChild(el("i",null, r.dt.gt));
        td.appendChild(el("u",null, r.dt.ht));
      }
      const gsAll = groupsOf(c, r.wk, r.day);
      td.appendChild(el("div","gsel ro2", gsAll.join(" + ")));
      tr.appendChild(td); ld = dk;
    }
    const mine = ME.role === "teacher" && r.spec === gctx().spec;
    const sc = el("td","cs" + (mine ? " hit" : "") + (r.nat ? " nat" : ""));
    sc.appendChild(el("div",null, r.spec));
    if(r.nat) sc.appendChild(el("div","natmark", D.natgroup));
    if(mine) sc.appendChild(el("div","mark","تخصصك"));
    tr.appendChild(sc);
    bands.forEach(b=>{
      const td = el("td","cell");
      td.appendChild(cellEditor(c, b, r));
      tr.appendChild(td);
    });
    t.appendChild(tr);
  });
  wrap.appendChild(t); g.appendChild(wrap);
  const n = el("div","pad note");
  /* ⚠️ التذكيرُ يصف بنيةَ المدرسة التي يُقرأ فيها — لا بنيةَ غيرها */
  n.appendChild(el("div", null, D.lab_complex
    ? "وقتُ البدء يُكتب في الخانة — فقد تختلف مواعيدُ الحصص بين المرحلة الأولية "
      + "والعليا، والمكتوبُ في رأس العمود هو الغالبُ تذكيراً لا إلزاماً."
    : "وقتُ البدء يُكتب في الخانة — فقد تختلف مواعيدُ الحصص بين مدارس المجمع الواحد، "
      + "والمكتوبُ في رأس العمود هو الغالبُ في الملف تذكيراً لا إلزاماً."));
  g.appendChild(n);
  m.appendChild(g);
}

function cellEditor(c, band, r){
  const gk = gkey(c.complex, band, r.wk, r.day, r.spec);
  const w = el("div","cellbox");
  const cur = () => findLesson(gk);
  const ensure = ()=>{
    let x = cur();
    if(!x){
      x = {id:uid(), gk:gk, sector:c.sector, complex:c.complex, stage:band.stage, school:band.stage,
           period:band.per, week:r.wk, day:r.day, date:(r.dt||{}).g || "",
           datetxt:(r.dt||{}).gt || "", hijri:(r.dt||{}).ht || "", spec:r.spec, group:r.gp,
           subject:r.spec, teacher:"", strategy:"", approach:"", klass:"", time:"",
           peer1:"", peer2:"", peer1e:"", peer2e:"", ev1:"", ev2:"", ev3:""};
      DB.sched.push(x);
    }
    return x;
  };
  const L0 = cur(), ed = canEdit(c, band, L0);
  const paint = ()=>{
    const x = cur(), on = !!(x && (x.teacher||"").trim());
    w.className = "cellbox" + (on ? (ME.role === "teacher" && !isMine(x) ? " other" : " on") : "")
                            + (ed ? "" : " locked") + (x && x.approved ? " appr" : "");
    const a = w.querySelector(".crow2"); if(a) a.style.display = on ? "" : "none";
  };
  const mk = (key, ph, opts, cls) => {
    const x = cur(), v = x ? (x[key]||"") : "";
    if(!ed){ const d = el("div","cin ro2" + (cls ? " "+cls : ""), v || "—"); w.appendChild(d); return; }
    const e = fld(opts ? "sel" : "txt", v, val=>{
      snap(gk, "تعديل " + ph);
      const y = ensure(), was = y[key];
      y[key] = val;
      if(key === "teacher"){
        /* الرقمُ يُلتقط من الكشف بالاسم إن أمكن — وإلا بقي فارغاً */
        const hit = Object.keys(D.roster||{}).find(k=>D.roster[k].n === val);
        y.teacherNo = hit || "";
      }
      if(key === "teacher" && (val||"").trim() && !(was||"").trim())
        logAct("تسجيل حصة", val + " — " + band.stage + " · " + band.per + " · " + r.wk + " " + r.day, y);
      else if(String(was||"") !== String(val||""))
        logAct("تعديل", ph + ": «" + (was||"—") + "» ← «" + (val||"—") + "»", y);
      if(!(y.teacher||"").trim() && !y.strategy && !y.approach && !(y.klass||"").trim()
         && !(y.time||"").trim() && !DB.prep[y.id])
        DB.sched = DB.sched.filter(z=>z.id!==y.id);
      save(); paint();
    }, opts, ph);
    e.className = "cin" + (cls ? " " + cls : "");
    if(opts) e.title = ph;
    w.appendChild(e);
  };
  mk("teacher", D.lab_teacher_short, null, "nm");
  mk("strategy", "الاستراتيجية", D.bank.map(b=>b.name));
  mk("approach", "الاتجاه التدريسي", D.approaches);
  const rowlet = el("div","crow");
  if(ed){
    const kl = fld("txt", L0 ? (L0.klass||"") : "", v=>{ snap(gk,"تعديل الفصل"); ensure().klass = v; save(); paint(); }, null, "الفصل");
    const tm = fld("txt", L0 ? (L0.time||"") : "", v=>{ snap(gk,"تعديل الوقت"); ensure().time = v; save(); paint(); }, null, band.time || "وقت البدء");
    kl.className = "cin sm"; tm.className = "cin sm";
    rowlet.appendChild(kl); rowlet.appendChild(tm);
  } else {
    rowlet.appendChild(el("div","cin sm ro2", (L0 && L0.klass) || "—"));
    rowlet.appendChild(el("div","cin sm ro2", (L0 && L0.time) || "—"));
  }
  w.appendChild(rowlet);
  if(ed && ME.role === "teacher" && !(L0 && (L0.teacher||"").trim())){
    const me = el("button","cme","سجّلني هنا");
    me.addEventListener("click", ()=>{ snap(gk,"تسجيل الاسم");
      const y = ensure(); y.teacher = ME.name; y.teacherNo = ME.emp || "";
      logAct("تسجيل حصة", ME.name + " — " + band.stage + " · " + band.per + " · " + r.wk + " " + r.day, y);
      save(); shell(); });
    w.appendChild(me);
  }
  const act = el("div","crow2");
  const st = el("button","cst","ابدأ الحصة ←");
  st.addEventListener("click", ()=>{ const y = cur(); if(!y) return; CUR = y.id; PH = 2; shell(); });
  act.appendChild(st);
  if(ed && L0 && ((L0.teacher||"").trim() || L0.strategy || (L0.klass||"").trim())){
    const cx2 = el("button","cclr","✕");
    cx2.title = "مسحُ هذه الخانة";
    cx2.setAttribute("aria-label", "مسح خانة الحصة");
    cx2.addEventListener("click", ()=>clearCell(gk));
    act.appendChild(cx2);
  }
  w.appendChild(act);
  paint();
  return w;
}

/* الوجه الأول من الورقة الأولى: من يزور هذا المجمع */
function rotSchool(m, c){
  const card = el("div","card"), h = el("h3");
  h.appendChild(el("span",null, D.lab_complex ? "من يزور مدرستنا" : "جدول زيارات المجمعات"));
  h.appendChild(el("small",null,"أيُّ فريقِ تخصّصٍ يزور المجمع في كل يومٍ من كل أسبوع"));
  card.appendChild(h);
  const wrap = el("div","gwrap");
  D.complexlist.forEach(cx=>{
    const ttl = el("div","wk", CXW + cx + (cx === c.complex && !D.lab_complex ? "  ← مجمعك" : ""));
    if(cx === c.complex) ttl.className = "wk on";
    wrap.appendChild(ttl);
    const t = el("table","mx2"), hr = el("tr");
    hr.appendChild(el("th",null,"اليوم \\ الأسبوع"));
    D.weeks.forEach(w=>{
      const th = el("th");
      th.appendChild(el("b",null,w));
      const cc = calOf(w); if(cc) th.appendChild(el("i",null, cc.range));
      hr.appendChild(th);
    });
    t.appendChild(hr);
    D.days.forEach(d=>{
      const r = el("tr");
      r.appendChild(el("td","cs", d));
      D.weeks.forEach(w=>{
        const v = groupOf(cx, w, d);
        const td = el("td","mid", v || "—");
        if(!v) td.className += " dim";
        r.appendChild(td);
      });
      t.appendChild(r);
    });
    wrap.appendChild(t);
  });
  card.appendChild(wrap); m.appendChild(card);
}

/* الوجه الثاني: أين يزور فريقُ كل تخصص */
function rotSup(m, c){
  const card = el("div","card"), h = el("h3");
  h.appendChild(el("span",null,"جدول زيارات المشرفين"));
  h.appendChild(el("small",null,"إلى أي مجمعٍ يذهب فريقُ كل تخصصٍ في كل يومٍ من كل أسبوع"));
  card.appendChild(h);
  const wrap = el("div","gwrap");
  const mygp = (function(){
    let g = "";
    Object.keys(D.pairs).forEach(k=>{ if(D.pairs[k].indexOf(gctx().spec) >= 0) g = k; });
    return g;
  })();
  D.specgroups.forEach(gp=>{
    const ttl = el("div","wk" + (gp === mygp ? " on" : ""), gp + (gp === mygp ? "  ← فريقك" : ""));
    wrap.appendChild(ttl);
    const t = el("table","mx2"), hr = el("tr");
    hr.appendChild(el("th",null,"اليوم \\ الأسبوع"));
    D.weeks.forEach(w=>{
      const th = el("th");
      th.appendChild(el("b",null,w));
      const cc = calOf(w); if(cc) th.appendChild(el("i",null, cc.range));
      hr.appendChild(th);
    });
    t.appendChild(hr);
    D.days.forEach(d=>{
      const r = el("tr");
      r.appendChild(el("td","cs", d));
      D.weeks.forEach(w=>{
        const v = ((D.sup[gp]||{})[w]||{})[d] || "";
        const td = el("td","mid", v || "—");
        if(!v) td.className += " dim";
        r.appendChild(td);
      });
      t.appendChild(r);
    });
    wrap.appendChild(t);
  });
  card.appendChild(wrap); m.appendChild(card);
}

function myList(m, c){
  let here = DB.sched.filter(x=>x.gk && x.gk.indexOf(c.sector + "|" + c.complex + "|") === 0);
  if(ME.role === "teacher") here = here.filter(isMine);
  const s2 = el("div","card"), sh = el("h3");
  sh.appendChild(el("span",null, ME.role === "teacher" ? "حصصك المسجَّلة"
    : ("الحصص المسجَّلة في " + (D.lab_complex || "المجمع"))));
  sh.appendChild(el("small",null, arn(here.length) + " حصة")); s2.appendChild(sh);
  const sp = el("div","pad");
  if(!here.length){
    sp.appendChild(el("div","empty", ME.role === "teacher"
      ? "لا حصةَ مسجَّلةٌ بعد — والتسجيل بزرّ «سجّلني هنا» في خانة الحصة التي ستُنفَّذ فيها."
      : ("لم تُسجَّل حصصٌ بعد في " + (D.lab_complex ? "هذه المدرسة" : "هذا المجمع") + ".")));
  } else {
    const tb = el("table"), tr = el("tr");
    const heads = ["المدرسة والحصة","الأسبوع واليوم", D.lab_teacher_short, "الاستراتيجية والاتجاه", D.lab_spec];
    if(ME.role !== "teacher") heads.push("الزائران","المقيّمون");
    heads.push("التقدّم","");
    heads.forEach(x=>tr.appendChild(el("th",null,x)));
    tb.appendChild(tr);
    here.forEach(L=>{
      const pg = prog(L), r = el("tr");
      r.appendChild(el("td",null, [L.stage, L.period, L.time].filter(Boolean).join(" · ")));
      r.appendChild(el("td",null, [L.week, L.day].filter(Boolean).join(" · ")));
      r.appendChild(el("td",null, [L.teacher, L.klass].filter(Boolean).join(" · ") || "—"));
      r.appendChild(el("td",null, [L.strategy, L.approach].filter(Boolean).join(" · ") || "—"));
      r.appendChild(el("td",null, L.spec || "—"));
      if(ME.role !== "teacher"){
        /* ⛔ كان نصًّا حرًّا بالأسماء يراه كلُّ مقيّمٍ ويكتب فيه — والأسماءُ
           تتشابه. صار عرضاً للقراءة، والإسنادُ بالرقم في تبويب «إسناد
           الزائرين» عند الوكيل وحده. (٢٩ سبتمبر ٢٠٢٦) */
        const pe = el("td","nar");
        const names = [L.peer1, L.peer2].filter(Boolean);
        if(names.length) pe.textContent = names.join(" · ");
        else{
          pe.appendChild(el("span","tag no","لم يُسنَد"));
          if(isDeputy()){
            const g = el("button","lnk","أسنِدهما");
            g.addEventListener("click", ()=>{ setctx("tab","assign"); shell(); });
            pe.appendChild(g);
          }
        }
        r.appendChild(pe);
        const ev = el("td","nar");
        ev.appendChild(fld("txt", [L.ev1,L.ev2,L.ev3].filter(Boolean).join("، "), v=>{
          const a = v.split(/[،,]/).map(z=>z.trim()); L.ev1=a[0]||""; L.ev2=a[1]||""; L.ev3=a[2]||""; save();
        }, null, "المقيّمون الثلاثة"));
        r.appendChild(ev);
      }
      const td = el("td");
      const tag = (cls,txt)=>{ td.appendChild(el("span","tag "+cls,txt)); td.appendChild(document.createTextNode(" ")); };
      if(L.approved) tag("ok", "معتمدة ◆");
      tag(pg.issued?"ok":"no", pg.issued?"حُضِّر":"لم يُحضَّر");
      tag(pg.obs>=3?"ok":(pg.obs?"mid":"no"), "تقييم "+arn(pg.obs)+"/٣");
      tag(pg.pr>=2?"ok":(pg.pr?"mid":"no"), "أقران "+arn(pg.pr)+"/٢");
      r.appendChild(td);
      const ac = el("td","nowrap");
      const go = el("button","b alt","افتح"); go.style.cssText="padding:4px 12px;font-size:14px";
      go.addEventListener("click", ()=>{ CUR = L.id; PH = 2; shell(); });
      ac.appendChild(go);
      if(isEval() || isMine(L)){
        const x = el("button","b warn","حذف"); x.style.cssText="padding:4px 10px;font-size:14px;margin-inline-start:6px";
        x.addEventListener("click", ()=>{
          if(!confirm("حذف هذه الحصة وكل ما عُلِّق بها؟")) return;
          dropLesson(L.id); shell();
        });
        ac.appendChild(x);
      }
      r.appendChild(ac);
      tb.appendChild(r);
    });
    sp.appendChild(tb);
  }
  s2.appendChild(sp); m.appendChild(s2);
}

function backup(){
  const a = document.createElement("a");
  a.href = "data:application/json;charset=utf-8," + encodeURIComponent(JSON.stringify(DB, null, 1));
  a.download = "نسخة-منصة-الحصة-الموحدة.json"; a.click();
}


/* ══ ضخُّ بيانات الحصة من الجدول إلى التحضير ══
   يُملأ الفارغ فقط، فلا يُمحى ما كتبه المعلم — إلا بطلبه (force). */
function inject(L, P, force){
  const set = (k, v) => { if(v && (force || !P[k])) P[k] = v; };
  set("i_teacher", L.teacher);
  set("i_subject", L.subject || L.spec);
  set("i_klass",   L.klass);
  set("i_period",  L.period ? ("الحصة " + L.period + (L.time ? " — " + L.time : "")) : "");
  set("i_date",    [L.day, L.datetxt, L.hijri].filter(Boolean).join(" · ") ||
                   [L.week, L.day].filter(Boolean).join(" · "));
  set("f_strat",   L.strategy);
  if(L.approach){
    const i = D.approaches.indexOf(L.approach);
    if(i >= 0){
      const any = D.approaches.some((_,k)=>P["f_dir#"+k]);
      if(force || !any) P["f_dir#"+i] = true;
    }
  }
  return P;
}

/* تغييرُ اسم المدرسة يُعيد ترقيم مفاتيح حصص هذا السياق — فلا تُيتَّم حصةٌ واحدة */
function rekeySchool(c, oldName, newName){
  if(oldName === newName) return;
  const pre = [c.sector, c.complex, c.stage, oldName].join("|") + "|";
  let n = 0;
  DB.sched.forEach(L=>{
    if(L.gk && L.gk.indexOf(pre) === 0){
      L.gk = [c.sector, c.complex, c.stage, newName].join("|") + "|" + L.gk.slice(pre.length);
      L.school = newName; n++;
    }
  });
  if(n) save();
}

/* رابطُ الدعوة: عنوانُ المنصة ومعه المخزن — تُرسله فيُفتح مربوطاً بلا لصقٍ ولا شرح */
function invite(){
  const u = location.origin + location.pathname + "#srv=" + encodeURIComponent(api());
  const done = ()=>alert("نُسخ رابط الدعوة.\n\nأرسله لمن يعنيه — يفتحه فيُربط جهازه تلقائياً،\n"
    + "ولا يُطلب منه لصقُ شيء.\n\n" + u);
  if(navigator.clipboard && navigator.clipboard.writeText)
    navigator.clipboard.writeText(u).then(done).catch(()=>prompt("انسخ رابط الدعوة:", u));
  else prompt("انسخ رابط الدعوة:", u);
}

/* ══ التراجع: يحفظ حال الحصة قبل كل تغيير، ويعيدها بنقرة ══ */
function snap(gk, label){
  const L = DB.sched.find(x=>x.gk === gk);
  UNDO.push({gk: gk, label: label,
             lesson: L ? JSON.parse(JSON.stringify(L)) : null,
             prep: L && DB.prep[L.id] ? JSON.parse(JSON.stringify(DB.prep[L.id])) : null});
  if(UNDO.length > 25) UNDO.shift();
}
function undo(){
  const u = UNDO.pop();
  if(!u) return;
  const cur = DB.sched.find(x=>x.gk === u.gk);
  if(u.lesson){
    if(cur) Object.assign(cur, u.lesson);
    else DB.sched.push(u.lesson);
    if(u.prep) DB.prep[u.lesson.id] = u.prep;
  } else if(cur){
    dropLesson(cur.id);                      /* لم تكن موجودةً فتُحذف حذفاً معلَناً */
    shell(); return;
  }
  save(); shell();
}
/* مسحُ الخانة: يُنبَّه إن كان فيها تحضيرٌ أو رصد */
function clearCell(gk){
  const L = DB.sched.find(x=>x.gk === gk);
  if(!L) return;
  const p = prog(L);
  if(p.issued || p.obs || p.pr){
    if(!confirm("هذه الحصة فيها " +
      [p.issued ? "تحضيرٌ مُصدَر" : "", p.obs ? "رصدٌ " + arn(p.obs) : "", p.pr ? "أقران " + arn(p.pr) : ""]
        .filter(Boolean).join(" و") + ".\nالمسحُ يحذفها وما عُلِّق بها. أتُتابع؟")) return;
  }
  snap(gk, "مسحُ خانة");
  dropLesson(L.id);
  shell();
}

/* ═════════ المرحلة ٦: تنفيذ الحصة — ورقةُ التنفيذ ═════════
   المعلمُ يُمسكها في الحصة، والزائرُ يقرؤها قبل دخوله. مصدرُها التحضيرُ المُصدَر
   لا إدخالٌ جديد، فلا تتكرّر الكتابةُ ولا تفترق الورقةُ عن التحضير. */
function ph6(m){
  const L = DB.sched.find(x=>x.id===CUR);
  if(!L){ picker(m, "اختر الحصة لعرض ورقة تنفيذها", ()=>shell()); return; }
  const P = DB.prep[L.id] || {};
  const head = el("div","card");
  const h = el("h3");
  h.appendChild(el("span",null, lessonTitle(L)));
  h.appendChild(el("small",null, lessonSub(L))); head.appendChild(h);
  const hp = el("div","pad"), bar = el("div","bar");
  const back = el("button","b ghost","تغيير الحصة");
  back.addEventListener("click", ()=>{ CUR=null; shell(); });
  bar.appendChild(back);
  const pr = el("button","b","اطبع ورقة التنفيذ");
  pr.addEventListener("click", ()=>window.print()); bar.appendChild(pr);
  hp.appendChild(bar);
  if(!P.__issued){
    const w = el("div","msg bad");
    w.textContent = ME.role === "teacher"
      ? "لم تُصدَر ورقةُ التحضير بعد — أكملها في مرحلة «الاستعداد والتحضير» ثم عد إلى هنا."
      : "تحضيرُ هذه الحصة لم يُصدَر بعد، فورقةُ التنفيذ ناقصة.";
    hp.appendChild(w);
  } else hp.appendChild(el("div","msg ok","ورقةُ تنفيذٍ من تحضيرٍ صدر في " + P.__issued));
  head.appendChild(hp); m.appendChild(head);

  const box = (title, note) => {
    const c = el("div","card"), hh = el("h3");
    hh.appendChild(el("span",null,title));
    if(note) hh.appendChild(el("small",null,note));
    c.appendChild(hh); const p2 = el("div","pad"); c.appendChild(p2); m.appendChild(c); return p2;
  };
  const line = (p2, k, v) => {
    const r = el("div","runrow");
    r.appendChild(el("b",null,k)); r.appendChild(el("div",null, v || "—"));
    p2.appendChild(r);
  };
  /* بطاقةُ الحصة */
  const b0 = box("بطاقة الحصة", "من الجدول والتحضير");
  const g0 = el("div","grid");
  D.info.forEach(f=>{
    const w = el("label","f"); w.appendChild(el("span",null,f.l));
    w.appendChild(el("div","ro", P["i_"+f.k] || "—")); g0.appendChild(w);
  });
  b0.appendChild(g0);
  /* الأهداف والسؤال الأساسي */
  const b1 = box("السؤال الأساسي والأهداف", "ما تُقاس عليه الحصة");
  line(b1, "السؤال الأساسي", P.f_q_main);
  ["obj_know","obj_skill","obj_emo"].forEach((k,i)=>{
    const lab = ["الهدف المعرفي","الهدف المهاري","الهدف الوجداني"][i];
    const vs = [P["f_"+k+"_1"], P["f_"+k+"_2"]].filter(Boolean);
    line(b1, lab, vs.join(" · "));
  });
  /* خريطة الزمن */
  const b2 = box("خريطة الزمن", "بالدقائق — ومجموعُها زمنُ الحصة");
  const tw = el("div","g5");
  D.tmain.forEach(k=>{
    const d = el("div"); d.appendChild(el("label",null, D.tlabels[k]));
    d.appendChild(el("div", k === "total" ? "ro sum" : "ro",
                     k === "total" ? arn(tsum(P).parts) : (P["tk_"+k] || "—")));
    tw.appendChild(d);
  });
  b2.appendChild(tw);
  const th2 = el("div","tdiff", D.tdifft + " — داخلَه لا يُضافان إليه:");
  b2.appendChild(th2);
  const tw2 = el("div","g2");
  D.tdiff.forEach(k=>{
    const d = el("div","care"); d.appendChild(el("label",null, D.tlabels[k]));
    d.appendChild(el("div","ro", P["tk_"+k] || "—")); tw2.appendChild(d);
  });
  b2.appendChild(tw2);
  /* مراحل الحصة */
  const b3 = box("مراحل الحصة", "ما يفعله كلٌّ في كل مرحلة");
  D.stages.forEach(([k,name])=>{
    const r = el("div","stg");
    const c0 = el("div","stn", name);
    c0.appendChild(el("div","ro", (P["st_"+k+"_time"]||"—") + " د")); r.appendChild(c0);
    r.appendChild(el("div","ro", P["st_"+k+"_t"] || "—"));
    r.appendChild(el("div","ro", P["st_"+k+"_l"] || "—"));
    const md = el("div");
    D.modes.forEach((grp,gi)=>{
      const pk = grp.filter((_,i)=>P["st_"+k+"_m"+gi+"#"+i]);
      md.appendChild(el("div","ro", pk.length ? pk.join(" · ") : "—"));
    });
    r.appendChild(md); b3.appendChild(r);
  });
  /* الإستراتيجية وبطاقتها */
  const st = P.f_strat || L.strategy || "";
  const bank = D.bank.find(x=>x.name === st);
  const b4 = box("الإستراتيجية المعلنة", st || "لم تُعلَن");
  if(bank){
    const ul = el("ol"); ul.style.cssText = "padding-inline-start:22px;font-size:15.5px";
    bank.inds.forEach(x=>ul.appendChild(el("li",null,x)));
    b4.appendChild(el("div",null,"مؤشراتُ تطبيقها العشرة — وهي ما يرصده الزائر:"))
      .style.cssText = "font-family:JZL,SK;color:var(--grey);margin-bottom:6px";
    b4.appendChild(ul);
  } else b4.appendChild(el("div","empty","اختر الإستراتيجية في التحضير لتظهر بطاقتُها هنا."));
  /* المهمتان والربط */
  const b5 = box("التمايز والربط بالحياة", "ما يُرى في الحصة لا ما يُقال");
  line(b5, "المهمة المكيَّفة", P.f_adapt);
  line(b5, "المهمة الإثرائية", P.f_enrich);
  line(b5, "الربط بالحياة", P.f_life);
  line(b5, "نشاط التفكير", P.f_think);
  line(b5, "المهمة على المنصة", P.f_platform);
  /* التقويم */
  const b6 = box("التقويم والتغذية الراجعة", "أدواتُ الحصة");
  line(b6, "التقويم التشخيصي", P.f_diag);
  line(b6, "التقويم البنائي", P.f_form);
  line(b6, "التغذية الراجعة", P.f_fb);
  line(b6, "التقييم الختامي", [P.f_final_1, P.f_final_2].filter(Boolean).join(" · "));
  line(b6, "أسئلة التفكير العليا", [P.f_higher_1, P.f_higher_2].filter(Boolean).join(" · "));
  line(b6, "قيمة الأسبوع", P.f_value);
}

function redrawGrid(){ shell(); }

/* ═════════ خطةُ زيارات المشرف/الزائر ═════════
   ⚠️ المشرفُ لا يبقى في مجمعٍ واحد: دورانُ الفرق ينقله كل يومٍ إلى مجمعٍ آخر.
   فالخطةُ تُبنى من SUP (أين يزور فريقُه) ثم تُجمع حصصُ تخصصه في ذلك المجمع
   مرتَّبةً بترتيب الحصص — وهو ترتيبُ يومه فعلاً: ابتدائيةٌ ثم متوسطةٌ ثم ثانوية. */
function groupOfSpec(sp, sector){
  /* في العالمي تعود موادُّ الهوية الثلاثُ إلى فريقها لا إلى الفرق الدائرة */
  if(sector === "عالمي" && isNatSpec(sp)) return D.natgroup;
  let g = "";
  Object.keys(D.pairs).forEach(k=>{ if(k !== D.natgroup && (D.pairs[k]||[]).indexOf(sp) >= 0) g = k; });
  return g;
}
function visitPlan(m, c){
  const myGp = groupOfSpec(c.spec, c.sector);
  const card = el("div","card"), h = el("h3");
  h.appendChild(el("span",null,"خطة الزيارات"));
  h.appendChild(el("small",null, myGp
    ? ("فريق " + myGp + (myGp === D.natgroup ? " — " + D.natsup : ""))
    : "اختر تخصصك لتظهر خطتك"));
  card.appendChild(h);
  const tp = el("div","pad"), fb = el("div","filt");
  const sp = fld("sel", c.spec, v=>{ setctx("spec", v); shell(); }, D.specs, "التخصص");
  sp.setAttribute("aria-label","تخصصك"); fb.appendChild(sp);
  const wk = fld("sel", c.vwk || currentWeek() || D.weeks[0],
                 v=>{ setctx("vwk", v); shell(); }, D.weeks, "الأسبوع");
  wk.setAttribute("aria-label","الأسبوع"); fb.appendChild(wk);
  const pr = el("button","b ghost sm","اطبع الخطة");
  pr.addEventListener("click", ()=>window.print()); fb.appendChild(pr);
  tp.appendChild(fb); card.appendChild(tp); m.appendChild(card);
  if(!myGp){
    const w = el("div","card"), p2 = el("div","pad");
    p2.appendChild(el("div","empty","اختر تخصصك أعلاه لتُبنى خطةُ زياراتك."));
    w.appendChild(p2); m.appendChild(w); return;
  }
  const week = c.vwk || currentWeek() || D.weeks[0];
  const cal = calOf(week);
  let total = 0, ready = 0;
  const wrap = el("div","card");
  const wh = el("h3");
  wh.appendChild(el("span",null, week));
  wh.appendChild(el("small",null, cal ? cal.range + " · " + cal.hrange : "")); wrap.appendChild(wh);
  const body = el("div","pad");
  D.days.forEach(day=>{
    const cx = myGp === D.natgroup ? (D.natdays||{})[day] : ((D.sup[myGp]||{})[week]||{})[day];
    if(!cx) return;
    const dt = cal ? (cal.days[day]||{}) : {};
    const dh = el("div","vday");
    dh.appendChild(el("b",null, day + " — " + CXW + cx));
    dh.appendChild(el("i",null, [dt.gt, dt.ht].filter(Boolean).join(" · ")));
    body.appendChild(dh);
    const bands = bandsOf(cx);
    const rows = [];
    (D.pairs[myGp]||[]).forEach(spec=>{
      bands.forEach(b=>{
        const L = findLesson([c.sector, cx, b.stage, b.per, week, day, spec].join("|"));
        if(!L || !(L.teacher||"").trim()) return;
        const pg = prog(L);
        total++; if(pg.issued) ready++;
        rows.push([L.time || b.time || "—", b.stage, b.per, spec, L.teacher, L.klass || "—",
                   [L.strategy, L.approach].filter(Boolean).join(" · ") || "—",
                   {tag: pg.issued ? "حُضِّر" : "لم يُحضَّر", cls: pg.issued ? "ok" : "no"},
                   {btn: "افتح", id: L.id}]);
      });
    });
    if(!rows.length){
      body.appendChild(el("div","vempty","لا حصصَ مسجَّلةً لتخصصك في هذا المجمع بعد — راجع مسؤول الجدولة."));
      return;
    }
    const t = el("table");
    const hr = el("tr");
    ["وقت البدء","المدرسة","الحصة","التخصص",D.lab_teacher_short,"الفصل","الإستراتيجية والاتجاه","التحضير",""]
      .forEach(x=>hr.appendChild(el("th",null,x)));
    t.appendChild(hr);
    rows.forEach(r=>{
      const tr = el("tr");
      r.forEach(cell=>{
        const td = el("td");
        if(cell && cell.tag) td.appendChild(el("span","tag "+cell.cls, cell.tag));
        else if(cell && cell.btn){
          const b = el("button","b alt", cell.btn);
          b.style.cssText = "padding:4px 12px;font-size:14px";
          b.addEventListener("click", ()=>{ CUR = cell.id; PH = 6; shell(); });
          td.appendChild(b);
        } else td.textContent = cell;
        tr.appendChild(td);
      });
      t.appendChild(tr);
    });
    body.appendChild(t);
  });
  wrap.appendChild(body);
  const kp = el("div","pad");
  kpis(kp, [[arn(total),"حصة في خطتك"], [arn(ready),"جاهزةٌ بتحضيرٍ مُصدَر"],
            [arn(total-ready),"تنتظر تحضيرها"]]);
  wrap.insertBefore(kp, body);
  m.appendChild(wrap);
  const n = el("div","card"), np = el("div","pad note");
  np.appendChild(el("div",null,
    "الترتيبُ هو ترتيبُ يومك فعلاً: تبدأ بالابتدائية ثم المتوسطة ثم الثانوية بحسب أوقات الحصص. "
    + "و«افتح» تعرض ورقةَ تنفيذ الحصة — اقرأها قبل دخولك فهي ما تبحث عن شواهده."));
  n.appendChild(np); m.appendChild(n);
}

/* تلوينُ صفّ المؤشر بحسب ما رُصد فيه */
function markRow(r, val){
  if(!r || !r.classList) return;
  r.classList.remove("m4","m3","m2","m1","mna");
  if(val === "na") r.classList.add("mna");
  else if(val === "4") r.classList.add("m4");
  else if(val === "3") r.classList.add("m3");
  else if(val === "2") r.classList.add("m2");
  else if(val === "1") r.classList.add("m1");
}

/* تحديثُ خانات أزمنة المراحل في مكانها — بلا إعادة بناءٍ تُفقد التركيز */
function syncStageInputs(P){
  document.querySelectorAll("[data-stt]").forEach(e=>{
    const v = P["st_" + e.dataset.stt + "_time"] || "";
    if(e.value !== v) e.value = v;
  });
}

/* ═════════ عرضُ سلّة المحذوفات ═════════ */
function trashView(m, c){
  let list = trashList();
  if(!isEval()) list = list.filter(t=>t.by === ME.name);
  const card = el("div","card"), h = el("h3");
  h.appendChild(el("span",null,"سلّة المحذوفات"));
  h.appendChild(el("small",null,"يُحفظ المحذوفُ ثلاثين يوماً ثم يُمحى نهائياً"));
  card.appendChild(h);
  const p = el("div","pad");
  if(!list.length){
    p.appendChild(el("div","empty","لا محذوفات — وما يُحذف يظهر هنا ويُستردّ بنقرة."));
  } else {
    const t = el("table"), tr = el("tr");
    ["الحصة","الموعد","المدرسة","ما حُذف معها","من حذفها","متى",""]
      .forEach(x=>tr.appendChild(el("th",null,x)));
    t.appendChild(tr);
    list.forEach(e=>{
      const L = e.L, r = el("tr");
      r.appendChild(el("td",null, [L.teacher, L.klass, L.spec].filter(Boolean).join(" · ") || "—"));
      r.appendChild(el("td",null, [L.week, L.day, L.period, L.time].filter(Boolean).join(" · ")));
      r.appendChild(el("td",null, [L.stage, L.complex].filter(Boolean).join(" · ")));
      const what = [];
      if(e.prep && e.prep.__issued) what.push("تحضيرٌ مُصدَر");
      else if(e.prep) what.push("تحضيرٌ غيرُ مُصدَر");
      const no = Object.keys(e.obs||{}).length, np = Object.keys(e.peer||{}).length;
      if(no) what.push("رصد " + arn(no));
      if(np) what.push("أقران " + arn(np));
      r.appendChild(el("td",null, what.join(" · ") || "—"));
      r.appendChild(el("td",null, e.by || "—"));
      const d = new Date(e.at || Date.now());
      const days = Math.floor((Date.now() - d.getTime())/86400000);
      r.appendChild(el("td",null, days <= 0 ? "اليوم" : "قبل " + arn(days) + " يوماً"));
      const ac = el("td","nowrap");
      const rb = el("button","b alt","استرداد");
      rb.style.cssText = "padding:5px 14px;font-size:14px";
      rb.addEventListener("click", ()=>{ if(restoreLesson(L.id)){ setctx("tab","fill"); shell(); } });
      ac.appendChild(rb);
      if(isEval()){
        const xb = el("button","b warn","محوٌ نهائي");
        xb.style.cssText = "padding:5px 10px;font-size:14px;margin-inline-start:6px";
        xb.addEventListener("click", ()=>{
          if(!confirm("محوٌ نهائيٌّ لا يُستردّ بعده. أتُتابع؟")) return;
          delete DB.prep[trashKey(L.id)]; save(); shell();
        });
        ac.appendChild(xb);
      }
      r.appendChild(ac); t.appendChild(r);
    });
    p.appendChild(t);
  }
  card.appendChild(p); m.appendChild(card);
  const n = el("div","card"), np2 = el("div","pad note");
  np2.appendChild(el("div",null,
    "الاستردادُ يعيد الحصةَ وتحضيرَها ورصدَها وبطاقاتِ أقرانها معاً. "
    + "ويمتنع إن كانت خانتُها قد شُغِلت بحصةٍ أخرى بعد الحذف."));
  n.appendChild(np2); m.appendChild(n);
}

/* ═════════ إسنادُ المعلمين الزائرين — للوكيل التعليمي ═════════
   ⛔ طلبَه المستشارُ ٢٩ سبتمبر ٢٠٢٦: «لا تنسى إسناد الحصص المعدة للحضور بواسطة
      الوكيل التعليمي للمعلمين الزائرين حتى تظهر في حساباتهم».
   ⚠️ والإسنادُ **بالرقم الوظيفي** لا بالاسم: الأسماءُ تتشابه وتُكتب بصيغٍ شتّى
      فيرى معلمٌ زيارةَ آخر. ويُحفظ الاسمُ معه ليُقرأ، والمطابقةُ على الرقم.
      (حقول: peer1/peer2 للاسم — كما كانت — وpeer1e/peer2e للرقم.) */
function assignView(m, c){
  const card = el("div","card"), h = el("h3");
  h.appendChild(el("span",null,"إسناد المعلمين الزائرين"));
  h.appendChild(el("small",null,
    "لكل حصةٍ زائران — يُسنَدان بالرقم الوظيفي فتظهر الحصةُ في حسابَيهما"));
  card.appendChild(h);
  const tp = el("div","pad"), fb = el("div","filt");
  const wk = fld("sel", c.onlyw || "كل الأسابيع",
                 v=>{ setctx("onlyw", v === "كل الأسابيع" ? "" : v); shell(); },
                 ["كل الأسابيع"].concat(D.weeks), "الأسبوع");
  wk.setAttribute("aria-label","الأسبوع"); fb.appendChild(wk);
  const dy = fld("sel", c.vday || "كل الأيام",
                 v=>{ setctx("vday", v === "كل الأيام" ? "" : v); shell(); },
                 ["كل الأيام"].concat(D.days), "اليوم");
  dy.setAttribute("aria-label","اليوم"); fb.appendChild(dy);
  const on = el("label","tk"), cb = el("input"); cb.type = "checkbox";
  cb.checked = !!c.asgOnly;
  cb.addEventListener("change", ()=>{ setctx("asgOnly", cb.checked); shell(); });
  on.appendChild(cb); on.appendChild(el("span",null,"ما لم يُسنَد بعد"));
  fb.appendChild(on);
  tp.appendChild(fb); card.appendChild(tp); m.appendChild(card);

  /* حصصُ مدرسته وحدها — لا المجمع كلُّه */
  let here = DB.sched.filter(L=> L.complex === ME.complex
      && (!ME.school || L.stage === ME.school));
  if(c.onlyw) here = here.filter(L=>L.week === c.onlyw);
  if(c.vday)  here = here.filter(L=>L.day === c.vday);
  here = here.filter(L=>(L.teacher||"").trim());
  if(c.asgOnly) here = here.filter(L=>!(L.peer1e||L.peer1||L.peer2e||L.peer2));
  const box = el("div","card"), bh = el("h3");
  bh.appendChild(el("span",null, ME.school || ME.complex));
  bh.appendChild(el("small",null, arn(here.length) + " حصةً مجدولةً باسم معلمٍ"));
  box.appendChild(bh);
  const bp = el("div","pad");
  if(!here.length){
    bp.appendChild(el("div","empty",
      "لا حصةَ تطابق الترشيح — وتُسنَد الزياراتُ بعد أن يُكتب اسمُ المعلم في خانتها."));
    box.appendChild(bp); m.appendChild(box); return;
  }
  const t = el("table"), tr = el("tr");
  ["الموعد","الحصة والمدرسة","المعلم","التخصص","الزائر ١","الزائر ٢"]
    .forEach(x=>tr.appendChild(el("th",null,x)));
  t.appendChild(tr);
  /* خانةُ رقمٍ تُظهر الاسمَ من الكشف وتحفظ الاثنين */
  const slot = (L, i)=>{
    const ke = "peer" + i + "e", kn = "peer" + i;
    const td = el("td","nar"), box2 = el("div");
    const inp = el("input"); inp.type = "text"; inp.inputMode = "numeric";
    inp.value = L[ke] || ""; inp.placeholder = "الرقم الوظيفي";
    inp.setAttribute("aria-label", "الرقم الوظيفي للزائر " + arn(i));
    const who = el("div","whois");
    const paint = ()=>{
      const k = (inp.value||"").replace(/\D/g,"");
      const r = D.roster[k];
      if(!k){ who.className = "whois"; who.textContent = L[kn] || ""; return; }
      if(r){ who.className = "whois ok"; who.textContent = r.n; }
      else  { who.className = "whois no"; who.textContent = "لا يطابق رقماً في الكشف"; }
    };
    inp.addEventListener("input", paint);
    inp.addEventListener("change", ()=>{
      const k = (inp.value||"").replace(/\D/g,"");
      const r = D.roster[k];
      L[ke] = k;
      L[kn] = r ? r.n : (k ? L[kn] || "" : "");
      save();
      logAct("إسناد زائر", (r ? r.n : k || "—") + " ← " + lessonTitle(L), L);
      paint();
    });
    paint();
    box2.appendChild(inp); box2.appendChild(who); td.appendChild(box2);
    return td;
  };
  here.forEach(L=>{
    const r = el("tr");
    r.appendChild(el("td",null,[L.week, L.day, L.time].filter(Boolean).join(" · ")));
    r.appendChild(el("td",null,[L.period, L.stage].filter(Boolean).join(" · ")));
    r.appendChild(el("td",null, L.teacher || "—"));
    r.appendChild(el("td",null, L.spec || "—"));
    r.appendChild(slot(L, 1));
    r.appendChild(slot(L, 2));
    t.appendChild(r);
  });
  bp.appendChild(t); box.appendChild(bp); m.appendChild(box);
}

/* ═════════ عرضُ سجلّ العمليات — للمقيّم ═════════ */
function logView(m, c){
  const all = logList();
  const card = el("div","card"), h = el("h3");
  h.appendChild(el("span",null,"سجلّ العمليات"));
  h.appendChild(el("small",null, arn(all.length) + " عملية · تُحفظ آخرُ " + arn(LOG_MAX)));
  card.appendChild(h);
  const tp = el("div","pad"), fb = el("div","filt");
  const who = [...new Set(all.map(x=>x.by).filter(Boolean))];
  const f1 = fld("sel", c.lgby||"", v=>{ setctx("lgby", v); shell(); }, ["الجميع"].concat(who), "الشخص");
  f1.setAttribute("aria-label","ترشيحٌ بالشخص"); fb.appendChild(f1);
  const acts = [...new Set(all.map(x=>x.a).filter(Boolean))];
  const f2 = fld("sel", c.lgact||"", v=>{ setctx("lgact", v); shell(); }, ["كل العمليات"].concat(acts), "نوع العملية");
  f2.setAttribute("aria-label","ترشيحٌ بنوع العملية"); fb.appendChild(f2);
  const pr = el("button","b ghost sm","طباعة السجل");
  pr.addEventListener("click", ()=>window.print()); fb.appendChild(pr);
  tp.appendChild(fb); card.appendChild(tp); m.appendChild(card);

  let list = all;
  if(c.lgby && c.lgby !== "الجميع") list = list.filter(x=>x.by === c.lgby);
  if(c.lgact && c.lgact !== "كل العمليات") list = list.filter(x=>x.a === c.lgact);
  const w = el("div","card"), p = el("div","pad");
  if(!list.length) p.appendChild(el("div","empty","لا عمليات مطابقة."));
  else {
    const t = el("table"), tr = el("tr");
    ["متى","من","الصفة","العملية","التفصيل"].forEach(x=>tr.appendChild(el("th",null,x)));
    t.appendChild(tr);
    list.slice(0, 300).forEach(e=>{
      const r = el("tr");
      r.appendChild(el("td",null, agoTxt(e.t)));
      r.appendChild(el("td",null, e.by || "—"));
      r.appendChild(el("td",null, roleName(e.r)));
      const ac = el("td");
      const cls = e.a === "حذف" ? "no" : (e.a === "استرداد" || e.a === "إصدار التحضير" ? "ok" : "mid");
      ac.appendChild(el("span","tag " + cls, e.a || "—"));
      r.appendChild(ac);
      r.appendChild(el("td",null, e.w || "—"));
      t.appendChild(r);
    });
    p.appendChild(t);
    if(list.length > 300)
      p.appendChild(el("div","note","عُرضت أحدثُ ٣٠٠ عملية من " + arn(list.length) + "."));
  }
  w.appendChild(p); m.appendChild(w);
  const n = el("div","card"), np = el("div","pad note");
  np.appendChild(el("div",null,
    "يُسجَّل ما يغيّر الحقيقة: تسجيلُ حصةٍ وتعديلُ حقلٍ وحذفٌ واستردادٌ وإصدارُ تحضيرٍ "
    + "وبدءُ رصدٍ وبطاقةُ أقرانٍ وتغييرُ دوران — ولا تُسجَّل القراءةُ ولا التنقّل."));
  n.appendChild(np); m.appendChild(n);
}

/* ═════════ تقريرُ المعلم عن نفسه ═════════ */
function myTeacherReport(m){
  const mine = DB.sched.filter(L=>
    (ME.emp && L.teacherNo === ME.emp) || (L.teacher||"").trim() === (ME.name||"").trim());
  const A = agg().filter(x=>mine.some(L=>L.id === x.L.id));
  const pcts = A.filter(x=>x.pct != null).map(x=>x.pct);
  const card = el("div","card"), h = el("h3");
  h.appendChild(el("span",null,"تقريري — " + ME.name));
  h.appendChild(el("small",null, ME.emp ? "الرقم الوظيفي " + ME.emp : ""));
  card.appendChild(h);
  const p = el("div","pad");
  kpis(p, [[arn(mine.length),"حصةً لك"],
           [arn(A.filter(x=>x.issued).length),"حضّرتَها وأصدرتَها"],
           [arn(A.filter(x=>x.obs.length).length),"رُصدت"],
           [num(avg(pcts)) + "٪","متوسط نسبتك"]]);
  card.appendChild(p); m.appendChild(card);
  const w = el("div","card"), wh = el("h3");
  wh.appendChild(el("span",null,"حصصك")); w.appendChild(wh);
  const wp = el("div","pad");
  if(!mine.length){
    wp.appendChild(el("div","empty",
      "لا حصةَ باسمك بعد — سجّل نفسك في خانة حصتك من «جدولي»."));
  } else {
    const t = el("table"), tr = el("tr");
    ["الموعد","المدرسة والحصة","الإستراتيجية","التحضير","الرصد","نسبتك","المستوى","إجراء الجسر",""]
      .forEach(x=>tr.appendChild(el("th",null,x)));
    t.appendChild(tr);
    A.forEach(x=>{
      const L = x.L, r = el("tr");
      r.appendChild(el("td",null,[L.week,L.day,L.time].filter(Boolean).join(" · ")));
      r.appendChild(el("td",null,[L.stage,L.period].filter(Boolean).join(" · ")));
      r.appendChild(el("td",null,[L.strategy,L.approach].filter(Boolean).join(" · ")||"—"));
      const a = el("td");
      a.appendChild(el("span","tag "+(x.issued?"ok":"no"), x.issued?"صدر":"لم يصدر"));
      if(L.approved) a.appendChild(el("span","tag ok"," معتمدة ◆"));
      r.appendChild(a);
      r.appendChild(el("td",null, arn(x.obs.length) + "/٣"));
      r.appendChild(el("td",null, x.pct==null ? "—" : num(x.pct)+"٪"));
      r.appendChild(el("td",null, lvlOf(x.pct)));
      r.appendChild(el("td",null, x.bridge || "—"));
      const ac = el("td");
      const go = el("button","b alt","افتح"); go.style.cssText="padding:4px 12px;font-size:14px";
      go.addEventListener("click", ()=>{ CUR = L.id; PH = x.issued ? 6 : 2; shell(); });
      ac.appendChild(go); r.appendChild(ac);
      t.appendChild(r);
    });
    wp.appendChild(t);
  }
  w.appendChild(wp); m.appendChild(w);
  /* أضعفُ مؤشراتك — من رصد المقيّمين */
  const acc = {};
  A.forEach(x=>x.obs.forEach(v=>{
    Object.entries(v.ind||{}).forEach(([k,val])=>{
      if(val === "na" || !val) return; (acc[k] = acc[k] || []).push(Number(val));
    });
  }));
  const ind = Object.entries(acc).map(([k,arr])=>{
    const [di,ii] = k.split("_").map(Number);
    const dm = D.domains[di] || {inds:[]};
    return [arn(di+1)+"·"+arn(ii+1), dm.inds[ii]||"—", avg(arr)];
  }).sort((a,b)=>a[2]-b[2]).slice(0,8);
  if(ind.length){
    const c2 = el("div","card"), h2 = el("h3");
    h2.appendChild(el("span",null,"أضعفُ مؤشراتك"));
    h2.appendChild(el("small",null,"ثمانيةٌ ترتيباً — ابدأ بها في حصتك القادمة")); c2.appendChild(h2);
    const p2 = el("div","pad");
    tbl(p2, ["الرمز","المؤشر","متوسطك من ٤"],
      ind.map(r=>[r[0], r[1], num(r[2])]));
    c2.appendChild(p2); m.appendChild(c2);
  }
  const bar = el("div","card"), bp = el("div","pad bar");
  const pr = el("button","b ghost","اطبع تقريري");
  pr.addEventListener("click", ()=>window.print()); bp.appendChild(pr);
  bar.appendChild(bp); m.appendChild(bar);
}

/* ═════════ سجلُّ زيارات الزائر ═════════ */
function myPeerReport(m){
  const me = (ME.name||"").trim();
  const asg = DB.sched.filter(isMyVisit);
  const done = Object.keys(DB.peer).filter(k=>k.split("|")[1] === me);
  const doneIds = new Set(done.map(k=>k.split("|")[0]));
  const card = el("div","card"), h = el("h3");
  h.appendChild(el("span",null,"سجلّ زياراتي — " + ME.name)); card.appendChild(h);
  const p = el("div","pad");
  kpis(p, [[arn(asg.length),"زيارةً مسنَدةً إليك"],
           [arn(asg.filter(L=>doneIds.has(L.id)).length),"أتممتَ بطاقتها"],
           [arn(asg.filter(L=>!doneIds.has(L.id)).length),"تنتظر بطاقتك"]]);
  card.appendChild(p); m.appendChild(card);
  const w = el("div","card"), wh = el("h3");
  wh.appendChild(el("span",null,"زياراتك")); w.appendChild(wh);
  const wp = el("div","pad");
  if(!asg.length) wp.appendChild(el("div","empty","لا زياراتٍ مسنَدةً إليك بعد."));
  else{
    const t = el("table"), tr = el("tr");
    ["الموعد","المجمع والمدرسة","المعلم","التخصص","تحضيره","بطاقتك",""]
      .forEach(x=>tr.appendChild(el("th",null,x)));
    t.appendChild(tr);
    asg.forEach(L=>{
      const pg = prog(L), r = el("tr");
      r.appendChild(el("td",null,[L.week,L.day,L.time].filter(Boolean).join(" · ")));
      r.appendChild(el("td",null,[L.complex,L.stage].filter(Boolean).join(" · ")));
      r.appendChild(el("td",null, L.teacher || "—"));
      r.appendChild(el("td",null, L.spec || "—"));
      const a = el("td");
      a.appendChild(el("span","tag "+(pg.issued?"ok":"no"), pg.issued?"صدر":"لم يصدر"));
      r.appendChild(a);
      const b = el("td");
      const has = doneIds.has(L.id);
      b.appendChild(el("span","tag "+(has?"ok":"no"), has?"مكتملة":"لم تُملأ"));
      r.appendChild(b);
      const ac = el("td");
      const go = el("button","b alt", has ? "راجع" : "املأ");
      go.style.cssText="padding:4px 12px;font-size:14px";
      go.addEventListener("click", ()=>{ CUR = L.id; PH = 3; shell(); });
      ac.appendChild(go); r.appendChild(ac);
      t.appendChild(r);
    });
    wp.appendChild(t);
  }
  w.appendChild(wp); m.appendChild(w);
  const bar = el("div","card"), bp = el("div","pad bar");
  const pr = el("button","b ghost","اطبع سجلّي");
  pr.addEventListener("click", ()=>window.print()); bp.appendChild(pr);
  bar.appendChild(bp); m.appendChild(bar);
}

/* ═════════ تفريغُ البيانات — محروسٌ بثلاث بوّابات ═════════
   ⛔ لا يُفتح إلا للمقيّم · ويأخذ نسخةً احتياطيةً أولاً · ويطلب كلمةً مكتوبة.
      ويستعمل `__replace` لأن الدمجَ في الخادم يمنع المحوَ عمداً. */
function wipeAll(){
  if(!isAdmin()) return;          /* ⛔ بوّابةٌ رابعة: الدورُ نفسُه */
  const n = DB.sched.length, p = Object.keys(DB.prep).filter(k=>k.indexOf(TRASH)&&k.indexOf(LOG)).length;
  if(!confirm("تفريغٌ كاملٌ لبيانات المنظومة على كل الأجهزة:\n\n"
    + "• " + arn(n) + " حصة\n• التحضيراتُ والرصدُ وبطاقاتُ الأقران\n"
    + "• سلّةُ المحذوفات وسجلُّ العمليات\n\nلا يُستردُّ شيءٌ بعده. أتُتابع؟")) return;
  const w = prompt("ستُحفظ نسخةٌ احتياطيةٌ على جهازك أولاً.\n\n"
    + "للتأكيد اكتب كلمة:  تفريغ");
  if((w||"").trim() !== "تفريغ"){ alert("أُلغي التفريغ."); return; }
  backup();                                    /* نسخةٌ قبل المحو */
  const empty = {sched:[], prep:{}, obs:{}, peer:{}, rot:{}};
  DB = empty; lastSent = ""; UNDO = [];
  try{ localStorage.setItem(KEY, JSON.stringify(DB)); }catch(e){}
  if(!api()){ alert("فُرّغت بيانات هذا الجهاز."); shell(); return; }
  fetch(api(), {method:"POST", headers:{"Content-Type":"text/plain;charset=utf-8"},
      body: JSON.stringify({kind:"platform", id:DBID, data:empty, __replace:true})})
    .then(r=>r.json())
    .then(r=>{
      if(r && r.ok && r.replaced){
        lastSent = dbSnapshot();
        logAct("تفريغ البيانات", "بدايةٌ نظيفةٌ بعد التجربة", null);
        save();
        alert("فُرّغت بيانات المنظومة على المخزن المشترك.\nوالنسخةُ الاحتياطيةُ على جهازك.");
      } else {
        alert("⛔ لم يستجب الخادمُ للاستبدال.\n\n"
              + (isAdmin() ? "خادمُك يعمل بشفرةٍ قديمةٍ لا تعرف الاستبدال — انشر النسخة الجديدة ثم أعد المحاولة."
                           : "راجع " + (D.adminref || "مشرف المنصة") + " لترقيته ثم أعد المحاولة."));
      }
      shell();
    })
    .catch(e=>{ alert("تعذّر الاتصال بالخادم: " + e.message); shell(); });
}
