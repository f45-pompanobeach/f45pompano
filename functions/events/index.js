import {ensureSchema,eventDb,eventWindowIsActive} from '../api/leads/_shared.js';

export async function onRequestGet({request,env}){
  if(!await ensureSchema(env))return Response.redirect(new URL('/tableleads/',request.url),302);
  const url=new URL(request.url),kit=String(url.searchParams.get('kit')||'').toUpperCase().trim();
  if(!/^[A-D]$/.test(kit))return Response.redirect(new URL('/tableleads/',request.url),302);
  const event=await eventDb(env).prepare('SELECT event_key,name,slug,event_date,start_time,end_time,qr_kit,enabled,archived FROM lead_events WHERE qr_kit=? AND archived=0 AND enabled=1 ORDER BY event_date DESC LIMIT 1').bind(kit).first();
  if(event&&eventWindowIsActive(event))return Response.redirect(new URL('/events/'+encodeURIComponent(event.slug)+'/',request.url),302);
  const fallback=new URL('/tableleads/',request.url);fallback.searchParams.set('kit',kit);return Response.redirect(fallback,302);
}