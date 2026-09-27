import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'Para mi preciosita · 27.09.2026',description:'Un pequeño rincón, todo nuestro.',robots:{index:false,follow:false},icons:{icon:'/favicon.svg'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="es"><body>{children}</body></html>;}