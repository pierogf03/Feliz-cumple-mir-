import {requireChatGPTUser} from '@/app/chatgpt-auth';
import {isAdmin} from '@/lib/server';
import Admin from './panel';
export const dynamic='force-dynamic';
export default async function Page(){await requireChatGPTUser('/admin');if(!await isAdmin())return <main className="access-page"><p className="eyebrow">NUESTRO RINCÓN · ACCESO PRIVADO</p><h1>Solo para quien<br/>prepara la sorpresa.</h1><p>Esta cuenta no tiene permiso de edición. Accede con la cuenta administradora configurada para este rincón.</p><a className="primary" href="/signout-with-chatgpt?return_to=/admin">Cambiar de cuenta</a><a href="/">Volver a la portada</a></main>;return <Admin/>;}

