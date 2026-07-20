/**
 * marivi-hf-proxy
 * -----------------------------------------------------------------
 * Proxy serverless (Cloudflare Worker) entre el portfolio estático
 * (GitHub Pages) y la API de Inference de Hugging Face.
 *
 * El token de Hugging Face (HF_TOKEN) se guarda como "secret" de
 * Cloudflare y NUNCA se envía al navegador ni se sube al repositorio.
 * El frontend solo conoce la URL pública de este Worker.
 *
 * Despliegue rápido (ver README.md para más detalle):
 *   1. npm install -g wrangler
 *   2. wrangler login
 *   3. wrangler secret put HF_TOKEN        (pega tu token hf_xxx)
 *   4. wrangler deploy
 */

function corsHeaders(env) {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export default {
  async fetch(request, env) {
    // Preflight CORS
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(env) });
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Método no permitido" }), {
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders(env) },
      });
    }

    if (!env.HF_TOKEN) {
      return new Response(
        JSON.stringify({ error: "HF_TOKEN no configurado en el Worker. Ejecuta: wrangler secret put HF_TOKEN" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders(env) } }
      );
    }

    try {
      const { prompt, max_new_tokens, temperature } = await request.json();

      if (!prompt || typeof prompt !== "string") {
        return new Response(JSON.stringify({ error: "Falta el campo 'prompt'" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders(env) },
        });
      }

      const model = env.HF_MODEL || "Qwen/Qwen2.5-72B-Instruct";

      const hfResponse = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.HF_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: max_new_tokens || 250,
            temperature: temperature || 0.7,
            return_full_text: false,
          },
        }),
      });

      const data = await hfResponse.json();

      if (!hfResponse.ok) {
        return new Response(JSON.stringify({ error: data.error || "Error en Hugging Face" }), {
          status: hfResponse.status,
          headers: { "Content-Type": "application/json", ...corsHeaders(env) },
        });
      }

      return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json", ...corsHeaders(env) },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message || "Error interno" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders(env) },
      });
    }
  },
};
