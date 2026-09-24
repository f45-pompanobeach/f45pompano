import {adminAuthorized,ensureSchema,eventDb,json,namedUserFromRequest,sha256Hex} from '../_shared.js';

function randomToken(){
  const b=new Uint8Array(32);crypto.getRandomValues(b);
  return btoa(String.fromCharCode(...b)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

async function createIntakeHandoff(request,env){
  let userKey='super-admin';
  let allowed=await adminAuthorized(request,env);
  if(!allowed){
    const user=await namedUserFromRequest(request,env);
    if(user&&user.permissions.includes('intake_admin')){
      allowed=true;
      userKey=user.user_key;
    }
  }
  if(!allowed)return {error:json({ok:false,error:'unauthorized'},401)};

  const db=eventDb(env),token=randomToken(),hash=await sha256Hex(token);
  const now=Math.floor(Date.now()/1000),expires=now+120,iso=new Date().toISOString();
  const write=()=>db.batch([
    db.prepare('DELETE FROM admin_handoff_tokens WHERE expires_at<?').bind(now),
    db.prepare('INSERT INTO admin_handoff_tokens(token_hash,user_key,target,expires_at,created_at) VALUES(?,?,?,?,?)').bind(hash,userKey,'intake_admin',expires,iso)
  ]);
  try{await write()}catch{await ensureSchema(env);await write()}
  return {token,expires,userKey};
}

export async function onRequestPost({request,env}){
  const result=await createIntakeHandoff(request,env);
  if(result.error)return result.error;
  return json({ok:true,token:result.token,expires_at:result.expires,user_key:result.userKey,target:'intake_admin'});
}

export async function onRequestGet({request,env}){
  const result=await createIntakeHandoff(request,env);
  if(result.error)return result.error;
  const u=new URL(request.url);
  const asStaff=u.searchParams.get('staff')==='1';
  const target='https://intake.f45pompano.com/?'+(asStaff?'staff=1&':'admin=1&')+'hub=1';
  const headers=new Headers({'location':target,'cache-control':'no-store, max-age=0'});
  headers.append('set-cookie',`f45_intake_handoff=${result.token}; Domain=.f45pompano.com; Path=/; Max-Age=120; HttpOnly; Secure; SameSite=Lax`);
  return new Response(null,{status:302,headers});
}

export function onRequest(){return json({ok:false,error:'method_not_allowed'},405)}
