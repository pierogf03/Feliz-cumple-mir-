import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {defaults,defaultReasons,type Content,type Settings,type Memory,type Moment,type Reason} from './content';
export function db(){if(!env.DB) throw new Error('Database unavailable'); return env.DB;}
export function bucket(){if(!env.BUCKET) throw new Error('Storage unavailable'); return env.BUCKET;}
export async function isAdmin(){const u=await getChatGPTUser(); const allowed=env.ADMIN_EMAIL?.trim().toLowerCase(); return !!(u&&allowed&&u.email.toLowerCase()===allowed);}
export async function authorize(req:Request){if(!await isAdmin())return Response.json({error:'No tienes permiso para editar este rincón.'},{status:403});if(req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Origen no permitido.'},{status:403});return null;}
export async function getSettings():Promise<Settings>{const row=await db().prepare('SELECT value FROM settings WHERE id=1').first<{value:string}>();return {...defaults,...(row?JSON.parse(row.value):{})};}
export async function getContent(admin=false):Promise<Content>{
 const settings=await getSettings(); const serverTime=Date.now();const unlocked=serverTime>=Date.parse(settings.birthday_date);
 if(!admin&&!unlocked)return {settings:{...settings,letter_content:'',audio_url:''},serverTime,unlocked,memories:[],timeline:[],reasons:[]};
 const results=await db().batch([db().prepare(`SELECT * FROM memories ${admin?'':'WHERE visible=1'} ORDER BY sort_order,created_at`),db().prepare('SELECT * FROM timeline ORDER BY sort_order,id'),db().prepare('SELECT * FROM love_reasons ORDER BY sort_order,id'),db().prepare('SELECT value FROM settings WHERE id=1')]);
 const configured=results[3].results.length>0;
 return {settings,serverTime,unlocked,memories:results[0].results as unknown as Memory[],timeline:settings.timeline_enabled||admin?results[1].results as unknown as Moment[]:[],reasons:configured?results[2].results as unknown as Reason[]:defaultReasons};
}
export const responseHeaders={'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'};
export async function removeUnreferenced(urls:string[]){const settings=await getSettings();for(const url of new Set(urls)){if(!/^\/api\/media\/[a-f0-9-]{36}$/.test(url)||url===settings.cover_url||url===settings.audio_url)continue;const linked=await db().prepare('SELECT id FROM memories WHERE media_url=? OR thumbnail_url=? UNION ALL SELECT id FROM timeline WHERE media_url=? LIMIT 1').bind(url,url,url).first();if(!linked){const id=url.split('/').pop()!;await bucket().delete(id);await db().prepare('DELETE FROM assets WHERE id=?').bind(id).run();}}}
