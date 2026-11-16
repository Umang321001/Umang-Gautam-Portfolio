(() => {
 const tokenKey="umang_fullstack_token", userKey="umang_fullstack_user";
 const getToken=()=>localStorage.getItem(tokenKey);
 const getUser=()=>{try{return JSON.parse(localStorage.getItem(userKey)||"null")}catch{return null}};
 async function api(url, options={}) {
  const headers={"Content-Type":"application/json",...(options.headers||{})};
  if(getToken()) headers.Authorization="Bearer "+getToken();
  const res=await fetch(url,{...options,headers});
  const data=await res.json().catch(()=>({}));
  if(!res.ok){if(res.status===401){logout(false);showAuth("login")}throw new Error(data.error||"Something went wrong");}
  return data;
 }
 function logout(announce=true){localStorage.removeItem(tokenKey);localStorage.removeItem(userKey);renderBar();window.dispatchEvent(new Event("authchange"));if(announce)toastAuth("Signed out");}
 function toastAuth(msg){let el=document.getElementById("authToast");if(!el){el=document.createElement("div");el.id="authToast";el.className="auth-toast";document.body.append(el)}el.textContent=msg;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2200)}
 function renderBar(){
  let bar=document.getElementById("accountBar");if(!bar){bar=document.createElement("div");bar.id="accountBar";bar.className="account-bar";document.body.prepend(bar)}
  const user=getUser();
  bar.innerHTML=user?`<span>Signed in as <b>${escapeHtml(user.name)}</b></span><button id="accountLogout" class="auth-mini">Sign out</button>`:`<span>Cloud sync enabled · Sign in to save your work</span><button id="accountLogin" class="auth-mini">Sign in / Create account</button>`;
  document.getElementById(user?"accountLogout":"accountLogin").onclick=()=>user?logout():showAuth("login");
 }
 function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
 function showAuth(mode="login"){
  let modal=document.getElementById("authModal");
  if(!modal){modal=document.createElement("div");modal.id="authModal";modal.className="auth-shade";modal.innerHTML=`<section class="auth-card"><button class="auth-x" id="authClose">×</button><div class="auth-kicker">UMANG GAUTAM · ACCOUNT</div><h2 id="authTitle">Welcome back</h2><p id="authSub">Sign in to sync your work across devices.</p><form id="authForm"><label id="nameWrap" hidden>Your name<input id="authName" maxlength="70" autocomplete="name"></label><label>Email address<input id="authEmail" type="email" required autocomplete="email"></label><label>Password<input id="authPassword" type="password" minlength="8" required autocomplete="current-password"></label><p id="authError" class="auth-error"></p><button class="auth-submit" id="authSubmit">Sign in</button></form><button class="auth-switch" id="authSwitch">New here? Create an account</button><small>Passwords are securely hashed on the server. Never share your password.</small></section>`;document.body.append(modal);
   document.getElementById("authClose").onclick=()=>modal.classList.remove("open");
   modal.addEventListener("click",e=>{if(e.target===modal)modal.classList.remove("open")});
   document.getElementById("authSwitch").onclick=()=>showAuth(mode==="login"?"register":"login");
   document.getElementById("authForm").onsubmit=async e=>{e.preventDefault();const btn=document.getElementById("authSubmit"),err=document.getElementById("authError");btn.disabled=true;err.textContent="";
    try{const payload={email:document.getElementById("authEmail").value.trim(),password:document.getElementById("authPassword").value};if(mode==="register")payload.name=document.getElementById("authName").value.trim();const data=await api("/api/auth/"+(mode==="login"?"login":"register"),{method:"POST",body:JSON.stringify(payload)});localStorage.setItem(tokenKey,data.token);localStorage.setItem(userKey,JSON.stringify(data.user));modal.classList.remove("open");renderBar();window.dispatchEvent(new Event("authchange"));toastAuth("Welcome, "+data.user.name+"!");}
    catch(ex){err.textContent=ex.message}finally{btn.disabled=false}
   };
  }
  mode=mode==="register"?"register":"login";
  document.getElementById("authTitle").textContent=mode==="login"?"Welcome back":"Create your account";
  document.getElementById("authSub").textContent=mode==="login"?"Sign in to sync your work across devices.":"Create one account to use all three apps.";
  document.getElementById("nameWrap").hidden=mode!=="register";
  document.getElementById("authName").required=mode==="register";
  document.getElementById("authPassword").autocomplete=mode==="login"?"current-password":"new-password";
  document.getElementById("authSubmit").textContent=mode==="login"?"Sign in":"Create account";
  document.getElementById("authSwitch").textContent=mode==="login"?"New here? Create an account":"Already have an account? Sign in";
  document.getElementById("authError").textContent="";
  modal.classList.add("open");
 }
 const css=`.account-bar{display:flex;justify-content:flex-end;align-items:center;gap:12px;padding:10px max(22px,calc((100% - 1200px)/2));background:#0c1629;border-bottom:1px solid #293b58;color:#91a4c1;font:12px system-ui}.account-bar b{color:#edf4ff}.auth-mini{border:1px solid #3b5073;border-radius:9px;background:#172640;color:#edf4ff;padding:8px 12px;cursor:pointer}.auth-shade{position:fixed;inset:0;background:#020713d9;display:none;align-items:center;justify-content:center;padding:18px;z-index:1000}.auth-shade.open{display:flex}.auth-card{position:relative;width:min(430px,100%);padding:28px;border:1px solid #3b5073;border-radius:20px;background:#14223a;color:#edf4ff;box-shadow:0 25px 90px #0009;font:14px system-ui}.auth-card h2{margin:8px 0;font-size:28px}.auth-card p{color:#91a4c1}.auth-kicker{color:#59dfc8;font-size:10px;letter-spacing:2px;font-weight:800}.auth-x{position:absolute;right:15px;top:12px;background:transparent;color:#edf4ff;border:0;font-size:25px;cursor:pointer}.auth-card label{display:block;margin:14px 0;color:#cbd8ec;font-size:12px}.auth-card input{display:block;width:100%;margin-top:6px;padding:12px;border:1px solid #293b58;border-radius:9px;background:#0b1426;color:#edf4ff;box-sizing:border-box}.auth-submit{width:100%;padding:12px;border:0;border-radius:9px;background:linear-gradient(135deg,#829dff,#59dfc8);font-weight:800;cursor:pointer;color:#071020}.auth-submit:disabled{opacity:.5}.auth-switch{display:block;margin:14px auto;background:none;border:0;color:#59dfc8;cursor:pointer}.auth-card small{display:block;color:#7185a4;text-align:center;line-height:1.5}.auth-error{color:#ff9caf!important;min-height:18px;font-size:12px}.auth-toast{position:fixed;right:20px;bottom:20px;padding:12px 16px;background:#203653;color:#edf4ff;border:1px solid #48628b;border-radius:11px;opacity:0;transform:translateY(8px);transition:.2s;z-index:1200;pointer-events:none}.auth-toast.show{opacity:1;transform:none}`;
 const style=document.createElement("style");style.textContent=css;document.head.append(style);
 window.AppAuth={api,getToken,getUser,showAuth,logout,toast:toastAuth};
 document.addEventListener("DOMContentLoaded",renderBar);renderBar();
})();