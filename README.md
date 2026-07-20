# Portfolio de Mariví Gómez

Sitio estático bilingüe (ES/EN) con dos herramientas de IA (Simulador de Perfil y Estratega de Eventos IA) y un chat asistente, todo alimentado por un modelo gratuito de Hugging Face.

## Estructura del proyecto

```
marivi-portfolio/
├── index.html        → estructura de la web
├── i18n.js            → todo el contenido en español e inglés
├── app.js             → render, cambio de idioma, chat e IA
├── config.js           → URL pública de tu Worker (SIN secretos, se sube a GitHub)
└── worker/
    ├── worker.js        → código del Cloudflare Worker (el proxy)
    └── wrangler.toml    → configuración de despliegue del Worker
```

## Por qué hace falta un Worker

GitHub Pages solo sirve archivos estáticos: no hay servidor donde esconder un secreto.
Si el token de Hugging Face estuviera en `app.js`, cualquiera podría verlo abriendo el
código fuente de tu web publicada. Por eso el token vive **solo** en Cloudflare, como
secreto de servidor, y tu web le pide a ese servidor que hable con Hugging Face por ti.

```
Navegador (GitHub Pages) → Worker (Cloudflare, con el token secreto) → Hugging Face
```

## 1. Consigue un token gratuito de Hugging Face

1. Crea una cuenta en https://huggingface.co/join
2. Ve a https://huggingface.co/settings/tokens y genera un token de tipo "Read".
3. Guárdalo, lo necesitarás en el paso 3 (nunca lo pegues en el código).

## 2. Despliega el Worker en Cloudflare (gratis)

1. Crea una cuenta gratuita en https://dash.cloudflare.com/sign-up
2. En tu ordenador, instala Wrangler (la CLI de Cloudflare):
   ```bash
   npm install -g wrangler
   wrangler login
   ```
3. Entra en la carpeta del worker y despliega:
   ```bash
   cd marivi-portfolio/worker
   wrangler deploy
   ```
4. Guarda tu token de Hugging Face como secreto (te pedirá que lo pegues):
   ```bash
   wrangler secret put HF_TOKEN
   ```
5. Al desplegar, Cloudflare te dará una URL parecida a:
   `https://marivi-hf-proxy.tu-usuario.workers.dev`

   Opcional: en `wrangler.toml`, cambia `ALLOWED_ORIGIN` por la URL real de tu
   GitHub Pages (por ejemplo `https://tu-usuario.github.io`) para que solo tu
   web pueda usar el Worker, y vuelve a ejecutar `wrangler deploy`.

## 3. Conecta tu web con el Worker

Edita `config.js` y pon la URL que te dio Cloudflare:

```js
const WORKER_URL = "https://marivi-hf-proxy.tu-usuario.workers.dev";
```

Este archivo sí se sube a GitHub sin problema: solo contiene una URL pública, no el token.

## 4. Publica en GitHub Pages

1. Crea un repositorio en GitHub y sube el contenido de `marivi-portfolio/`
   (puedes excluir la carpeta `worker/` del sitio público si prefieres, o dejarla,
   no contiene secretos).
2. En el repo, ve a **Settings → Pages**.
3. En "Source", selecciona la rama `main` y la carpeta `/ (root)`.
4. Guarda. En un par de minutos tu web estará en
   `https://tu-usuario.github.io/nombre-del-repo/`

## Cambiar el modelo de IA

Por defecto se usa `Qwen/Qwen2.5-72B-Instruct` (gratuito vía Inference API de
Hugging Face). Puedes cambiarlo editando `HF_MODEL` en `worker/wrangler.toml`
y volviendo a desplegar con `wrangler deploy`.

## Notas

- El token de Hugging Free tiene límites de uso gratuito; si recibes errores de
  "rate limit", espera unos minutos o valora pasar a un modelo más ligero.
- Todo el contenido (formación, experiencia, habilidades) vive en `i18n.js`:
  edítalo ahí para actualizar tu CV en los dos idiomas a la vez.
