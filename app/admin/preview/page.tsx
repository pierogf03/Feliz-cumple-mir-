import {requireChatGPTUser} from '@/app/chatgpt-auth';
import {isAdmin} from '@/lib/server';
import Experience from '@/app/experience';
export const dynamic='force-dynamic';
export default async function Preview(){await requireChatGPTUser('/admin/preview');if(!await isAdmin())return <main className="access-page"><h1>Esta vista es privada.</h1><a href="/">Volver a la portada</a></main>;return <Experience preview/>;}

