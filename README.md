# 🎉 Fiesta de Fin de Año — inscripciones, bebidas y entradas QR

## Cómo funciona

1. **El invitado** entra en la web, pone su nombre, teléfono y qué va a beber.
2. Le sale una **página personal** con los Bizums de los organizadores, el importe (30 €) y un **concepto único** (ej. `FA-WU48 Laura Pérez`) para que sepas quién te ha pagado.
3. El organizador que lo recibe ve el Bizum en su banco, entras al **panel** (`/admin`) y pulsas **Marcar pagado**. Te ofrece mandarle la entrada por WhatsApp con un clic.
4. En ese momento, en la página del invitado aparece su **entrada con QR** (se actualiza sola). Puede descargarla como imagen.
5. **En la puerta**, abres `/puerta` en el móvil, activas la cámara y escaneas. Pantalla verde = adelante; naranja = ya usada; roja = no válida. Si no lee el QR, se escribe el código `FA-XXXX`.

El panel también te calcula la **lista de la compra** (botellas, refrescos, hielo y vasos) y te deja exportar los invitados a Excel.

## Páginas

| Página | Para quién |
|---|---|
| `/` | Formulario de inscripción (el enlace que compartes) |
| `/entrada/…` | Página personal de cada invitado con su pago y su QR |
| `/admin` | Tu panel: pagos, invitados, lista de la compra |
| `/puerta` | Escáner de entradas para el día de la fiesta |

## Personalizar

Edita [config.js](config.js): nombre de la fiesta, fecha, lugar, precio, los Bizums de los organizadores, las bebidas y refrescos que se pueden elegir.

## Probarla en tu Mac

```bash
npm install
```

```bash
ADMIN_PASSWORD=mi-clave npm start
```

Abre http://localhost:3000. La contraseña por defecto del panel es `cambiame` si no pones ninguna.

## Ponerla en internet (Railway, ~5 €/mes o gratis con el crédito de prueba)

Los datos se guardan en un fichero, así que el servidor necesita un **disco persistente** (si no, se borran las inscripciones al reiniciar). Railway lo tiene y es fácil:

1. Sube esta carpeta a un repositorio de GitHub (privado vale).
2. En [railway.com](https://railway.com) → **New Project → Deploy from GitHub repo** → elige el repositorio.
3. En el servicio → **Variables**, añade las de [.env.example](.env.example) (sobre todo `ADMIN_PASSWORD`, `PRECIO` y `DATA_DIR=/data`).
4. **Settings → Volumes → Add volume** con ruta de montaje `/data`.
5. **Settings → Networking → Generate domain**. Ese es el enlace que mandas al grupo.

Alternativas: Render (con disco de pago) o Fly.io (con volumen). La web tiene que ir por **https** para que la cámara de la puerta funcione — todas estas plataformas lo ponen solas.

## Consejos para el día

- Prueba `/puerta` con una entrada tuya antes de la fiesta y da permiso a la cámara.
- Ten el brillo del móvil alto y pide a los invitados que suban el brillo al enseñar el QR.
- Varias personas pueden controlar la puerta a la vez con la misma contraseña.
- Exporta el CSV de vez en cuando como copia de seguridad.

## Despliegue automático (GitHub → Cloudflare)

El código está en el repositorio privado de GitHub `Curro14/fiesta-fin-de-ano`, conectado al Worker `fiesta-fin-de-ano` de Cloudflare.
Cada cambio que se sube a la rama `main` se publica solo en la web, en uno o dos minutos (`npx wrangler deploy`).
Se puede seguir cada despliegue en Cloudflare → Workers & Pages → fiesta-fin-de-ano → Deployments.
La contraseña del panel (`ADMIN_PASSWORD`) y `SESSION_SECRET` están guardadas como secretos en Cloudflare y no cambian al desplegar.
