interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  ADMIN_USERNAME?: string;
  ADMIN_PASSWORD?: string;
  SESSION_SECRET?: string;
}
const COOKIE_NAME = '__Secure-picshrink_admin';
const SESSION_TTL_SECONDS = 60 * 60 * 12;
const encoder = new TextEncoder();
function jsonResponse(payload: Record<string, unknown>, status = 200, headers: HeadersInit = {}): Response {
  const h = new Headers(headers);
  h.set('Content-Type','application/json; charset=utf-8');
  h.set('Cache-Control','no-store, max-age=0');
  h.set('X-Content-Type-Options','nosniff');
  return new Response(JSON.stringify(payload),{status,headers:h});
}
function b64url(bytes: Uint8Array): string {
  let binary=''; for(let i=0;i<bytes.length;i++) binary+=String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'');
}
function fromB64url(value:string):Uint8Array {
  const normalized=value.replace(/-/g,'+').replace(/_/g,'/');
  const binary=atob(normalized+'='.repeat((4-normalized.length%4)%4));
  const out=new Uint8Array(binary.length); for(let i=0;i<binary.length;i++)out[i]=binary.charCodeAt(i); return out;
}
function constantTimeEqual(a:string,b:string):boolean {
  const aa=encoder.encode(a),bb=encoder.encode(b);
  let result=aa.length^bb.length; const length=Math.max(aa.length,bb.length);
  for(let i=0;i<length;i++)result|=(aa[i]||0)^(bb[i]||0);
  return result===0;
}
async function signingKey(secret:string):Promise<CryptoKey> {
  return crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
}
async function createToken(username:string,secret:string):Promise<string> {
  const payload=b64url(encoder.encode(JSON.stringify({sub:username,exp:Math.floor(Date.now()/1000)+SESSION_TTL_SECONDS})));
  const signature=new Uint8Array(await crypto.subtle.sign('HMAC',await signingKey(secret),encoder.encode(payload)));
  return payload+'.'+b64url(signature);
}
async function isValidToken(token:string,env:Env):Promise<boolean> {
  if(!env.ADMIN_USERNAME||!env.SESSION_SECRET||env.SESSION_SECRET.length<32)return false;
  const parts=token.split('.'); if(parts.length!==2)return false;
  try {
    const payload=JSON.parse(new TextDecoder().decode(fromB64url(parts[0]))) as {sub?:string;exp?:number};
    if(payload.sub!==env.ADMIN_USERNAME||typeof payload.exp!=='number'||payload.exp<=Math.floor(Date.now()/1000))return false;
    return await crypto.subtle.verify('HMAC',await signingKey(env.SESSION_SECRET),fromB64url(parts[1]),encoder.encode(parts[0]));
  } catch { return false; }
}
function getCookie(request:Request):string|null {
  const header=request.headers.get('Cookie')||'';
  for(const item of header.split(';')) {
    const entry=item.trim(),i=entry.indexOf('=');
    if(i>0&&entry.slice(0,i)===COOKIE_NAME)return entry.slice(i+1);
  }
  return null;
}
function cookie(token:string,maxAge:number):string {
  return COOKIE_NAME+'='+token+'; Path=/api/admin; Max-Age='+maxAge+'; HttpOnly; Secure; SameSite=Strict';
}
function sameOrigin(request:Request):boolean {
  const origin=request.headers.get('Origin');
  if(!origin)return true;
  try{return new URL(origin).origin===new URL(request.url).origin;}catch{return false;}
}
async function adminApi(request:Request,env:Env):Promise<Response> {
  const path=new URL(request.url).pathname;
  if(request.method==='GET'&&path==='/api/admin/session') {
    const token=getCookie(request);
    return token&&await isValidToken(token,env)?jsonResponse({authenticated:true}):jsonResponse({authenticated:false},401);
  }
  if(request.method==='POST'&&(path==='/api/admin/login'||path==='/api/admin/logout')) {
    if(!sameOrigin(request))return jsonResponse({error:'Cross-origin request rejected.'},403);
    if(request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase()!=='application/json')
      return jsonResponse({error:'Expected application/json.'},415);
    const length=Number(request.headers.get('Content-Length')||'0');
    if(length>8192)return jsonResponse({error:'Request too large.'},413);
  }
  if(request.method==='POST'&&path==='/api/admin/login') {
    if(!env.ADMIN_USERNAME||!env.ADMIN_PASSWORD||!env.SESSION_SECRET||env.SESSION_SECRET.length<32)
      return jsonResponse({error:'Admin authentication is not configured. Configure the ADMIN_USERNAME, ADMIN_PASSWORD, and SESSION_SECRET Worker secrets.'},503);
    let body:{username?:unknown;password?:unknown};
    try{body=await request.json() as {username?:unknown;password?:unknown};}catch{return jsonResponse({error:'Invalid JSON request.'},400);}
    if(typeof body.username!=='string'||typeof body.password!=='string'||body.username.length>128||body.password.length>256||
       !constantTimeEqual(body.username,env.ADMIN_USERNAME)||!constantTimeEqual(body.password,env.ADMIN_PASSWORD))
      return jsonResponse({error:'Invalid administrator username or password.'},401);
    const token=await createToken(env.ADMIN_USERNAME,env.SESSION_SECRET);
    return jsonResponse({authenticated:true,expiresIn:SESSION_TTL_SECONDS},200,{'Set-Cookie':cookie(token,SESSION_TTL_SECONDS)});
  }
  if(request.method==='POST'&&path==='/api/admin/logout')
    return jsonResponse({authenticated:false},200,{'Set-Cookie':cookie('',0)});
  return jsonResponse({error:'Not found.'},404);
}
export default {
  async fetch(request:Request,env:Env):Promise<Response> {
    const path=new URL(request.url).pathname;
    if(path.startsWith('/api/'))return adminApi(request,env);
    const response=await env.ASSETS.fetch(request);
    const headers=new Headers(response.headers);
    headers.set('X-Content-Type-Options','nosniff');
    headers.set('Referrer-Policy','strict-origin-when-cross-origin');
    headers.set('X-Frame-Options','DENY');
    headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=()');
    return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
  }
};
