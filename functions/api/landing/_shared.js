import {adminAuthorized,cleanSlug,ensureSchema,eventDb,json} from '../leads/_shared.js';

const PAGE_PREFIX='landing_page:';
const GLOBAL_KEY='landing_global';

export {adminAuthorized,json};

function cleanText(v,max=160){return String(v??'').trim().replace(/\s+/g,' ').slice(0,max)}
function cleanUrl(v){
  const s=String(v??'').trim().slice(0,500);
  if(!s)return '';
  if(s.startsWith('/'))return s;
  try{const u=new URL(s);return /^https?:$/.test(u.protocol)?u.toString():''}catch{return ''}
}
function cleanCost(v){return cleanText(v,40)}
function bool(v,def=true){return v===undefined?def:Boolean(v)}

export function sanitizeGlobal(input={}){
  const raw=Array.isArray(input.qualifiedZipCodes)?input.qualifiedZipCodes:String(input.qualifiedZipCodes||'').split(',');
  const zips=[...new Set(raw.map(v=>String(v).trim()).filter(v=>/^\d{5}$/.test(v)))].slice(0,40);
  return {
    qualifiedZipCodes:zips,
    defaultVideoUrl:cleanUrl(input.defaultVideoUrl||'/trial-video.mp4')||'/trial-video.mp4'
  };
}

export function sanitizePage(input={},existingSlug=''){
  const slug=cleanSlug(input.slug||existingSlug);
  if(!slug||slug==='social-trial')throw new Error('invalid_slug');
  const pageKind=input.pageKind==='root'?'root':'partner';
  if(pageKind==='root'&&slug!=='root')throw new Error('invalid_root_slug');
  return {
    slug,
    pageKind,
    partner:cleanText(input.partner,pageKind==='root'?80:100),
    promoCode:cleanText(input.promoCode,60),
    trialType:cleanText(input.trialType,80)||'3 Classes',
    trialCost:cleanCost(input.trialCost)||'$30',
    trialDuration:cleanText(input.trialDuration,80)||'7 days',
    firstClassBookingText:cleanText(input.firstClassBookingText,260),
    regularPrice:cleanCost(input.regularPrice),
    percentageSavings:cleanText(input.percentageSavings,40),
    videoUrl:cleanUrl(input.videoUrl),
    mindbodyUrl:cleanUrl(input.mindbodyUrl),
    enabled:bool(input.enabled,true)
  };
}

async function readSetting(env,key){
  const db=eventDb(env);
  if(!db||typeof db.prepare!=='function')return null;
  let row=null;
  try{
    row=await db.prepare('SELECT setting_value,updated_at FROM lead_app_settings WHERE setting_key=? LIMIT 1').bind(key).first();
  }catch{
    if(!await ensureSchema(env))return null;
    row=await db.prepare('SELECT setting_value,updated_at FROM lead_app_settings WHERE setting_key=? LIMIT 1').bind(key).first();
  }
  if(!row)return null;
  try{return {value:JSON.parse(row.setting_value),updated_at:row.updated_at}}catch{return null}
}
async function writeSetting(env,key,value){
  await ensureSchema(env);
  const now=new Date().toISOString();
  await eventDb(env).prepare(`INSERT INTO lead_app_settings(setting_key,setting_value,updated_at) VALUES(?,?,?) ON CONFLICT(setting_key) DO UPDATE SET setting_value=excluded.setting_value,updated_at=excluded.updated_at`).bind(key,JSON.stringify(value),now).run();
  return now;
}
export async function getGlobal(env){return (await readSetting(env,GLOBAL_KEY))?.value||{}}
export async function setGlobal(env,value){const v=sanitizeGlobal(value);return {value:v,updated_at:await writeSetting(env,GLOBAL_KEY,v)}}
export async function getPage(env,slug){const s=cleanSlug(slug==='root'?'root':slug);if(!s)return null;return (await readSetting(env,PAGE_PREFIX+s))?.value||null}
export async function setPage(env,input){const value=sanitizePage(input,input.slug);return {value,updated_at:await writeSetting(env,PAGE_PREFIX+value.slug,value)}}
export async function deletePage(env,slug){
  const s=cleanSlug(slug);if(!s||s==='social-trial')throw new Error('invalid_slug');
  await ensureSchema(env);await eventDb(env).prepare('DELETE FROM lead_app_settings WHERE setting_key=?').bind(PAGE_PREFIX+s).run();return true;
}
export async function listPages(env){
  if(!await ensureSchema(env))return [];
  const q=await eventDb(env).prepare(`SELECT setting_key,setting_value,updated_at FROM lead_app_settings WHERE setting_key LIKE 'landing_page:%' ORDER BY setting_key`).all();
  const out=[];for(const row of q.results||[]){try{const v=JSON.parse(row.setting_value);out.push({...v,updated_at:row.updated_at})}catch{}}
  return out;
}
