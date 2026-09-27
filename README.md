# Nuestro rincón

Un regalo de cumpleaños con portada en vino y champagne, álbum de recuerdos, carta, música y un panel privado.

## Personalizar sin tocar código

Abre la dirección publicada seguida de `/admin` e ingresa la **contraseña del panel** (`ADMIN_PASSWORD` en Vercel). Solo quien tenga esa contraseña puede editar el rincón.

- **Recuerdos:** carga múltiples fotos, videos y GIF. Arrastra tarjetas para ordenar o usa las flechas; el ojo oculta un recuerdo sin eliminarlo. Edita sus títulos, mensajes y fechas con el lápiz.
- **GIF:** conserva los archivos animados originales. Admite archivo o URL HTTPS directa; no incluye GIF de Chiikawa de terceros.
- **Carta:** sustituye el texto inicial por tu mensaje. Se conservan los párrafos.
- **Nuestra historia:** agrega momentos con fecha, foto y descripción; activa o desactiva la sección.
- **Frases:** agrega, ordena, edita o elimina razones.
- **Música:** carga MP3, M4A, WAV, OGG o AAC, o usa una URL HTTPS directa. Guarda el cambio. Nunca suena automáticamente.
- **Configuración:** cambia portada, saludo, texto de bienvenida y fecha en hora de Lima.
- **Previsualizar:** abre la experiencia antes del cumpleaños, solo para la cuenta administradora.

Pulsa **Guardar** en cada sección después de editarla. Los archivos de los recuerdos se guardan al subirlos. La portada y la canción se publican cuando guardas su configuración. Los cambios se reflejan en visitantes abiertos en aproximadamente 20 segundos.

## La fecha

La fecha inicial es **27 de septiembre de 2026, 00:00, America/Lima**, equivalente a `2026-09-27T05:00:00Z`. El contador toma la hora del servidor y avanza con un reloj monotónico del navegador. No usa la zona horaria del teléfono. Nunca muestra números negativos. El servidor oculta recuerdos, carta y música antes de la fecha, salvo la previsualización administradora.

## Archivos y privacidad

En Vercel, los datos viven en **Turso** (SQLite) y los archivos en **Vercel Blob**. El panel usa sesión con contraseña (`ADMIN_PASSWORD` + `AUTH_SECRET`). No hay claves privadas en el cliente ni almacenamiento de recuerdos en localStorage.

Límite por archivo: **95 MB**. Las fotos se optimizan a WebP con miniatura de 720 px y versión de hasta 2200 px. Los GIF se conservan sin recomprimir. Los videos se cargan al abrirlos; se extrae una miniatura en el navegador cuando el formato lo permite y se puede cargar otra manualmente. Los videos conservan su formato original: algunos MOV de iPhone/HEVC no se reproducen en todos los navegadores; exportar a MP4 H.264 ofrece mayor compatibilidad. No se incluye transcodificación de video.

Las URL externas deben ser enlaces directos accesibles a la imagen, GIF o audio; páginas de Spotify, YouTube o galerías no son archivos de audio/GIF. La disponibilidad de esos enlaces depende de su proveedor.

El álbum comienza sin fotos ni videos personales. La imagen de la rosa es decorativa y fue generada para este regalo. La carta inicial contiene indicaciones para reemplazarla antes de compartir.

`noindex` y `nofollow` están activos, pero no son controles de acceso. Un sitio público puede ser visto por quien tenga su enlace. La publicación inicial se mantiene privada en Sites hasta elegir a quién compartirla.

## Desarrollo y despliegue

React 19, TypeScript, Next.js App Router, Tailwind 4, primitivas accesibles Radix. Animaciones CSS con soporte para movimiento reducido. Producción en **Vercel** con **Turso** (SQLite) y **Vercel Blob** para archivos. El flujo Sites/Cloudflare sigue disponible con `npm run dev:sites` y `npm run build:sites`.

```sh
npm ci
cp .env.example .env.local
npm run db:push
npm run dev
npm run build
```

Variables en Vercel (y en `.env.local`): `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` (Turso en producción), `BLOB_READ_WRITE_TOKEN`, `ADMIN_PASSWORD`, `AUTH_SECRET` (mín. 16 caracteres). El panel `/admin` usa contraseña, no ChatGPT. El esquema está en `db/schema.ts` y las migraciones en `drizzle/`.

La carpeta ignorada `.sites-runtime` contiene herramientas y datos de verificación locales. No se publica y no contiene recuerdos del usuario.
