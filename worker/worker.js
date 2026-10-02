/**
 * marivi-hf-proxy
 * -----------------------------------------------------------------
 * Proxy serverless (Cloudflare Worker) entre el portfolio estático
 * (GitHub Pages) y la API de Inference Providers de Hugging Face
 * (el "router" de chat compatible con OpenAI).
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
      const { messages, max_tokens, temperature } = await request.json();

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return new Response(JSON.stringify({ error: "Falta el campo 'messages' (array)" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders(env) },
        });
      }

      const model = env.HF_MODEL || "openai/gpt-oss-20b:groq";

      // Hugging Face Inference Providers: endpoint "router", compatible con
      // el formato de Chat Completions de OpenAI (mensajes con role/content).
      const hfResponse = await fetch("https://router.huggingface.co/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.HF_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: max_tokens || 250,
          temperature: temperature || 0.7,
        }),
      });

      const data = await hfResponse.json();

      if (!hfResponse.ok) {
        const message = data?.error?.message || data?.error || "Error en Hugging Face";
        return new Response(JSON.stringify({ error: message }), {
          status: hfResponse.status,
          headers: { "Content-Type": "application/json", ...corsHeaders(env) },
        });
      }

      const text = data?.choices?.[0]?.message?.content?.trim() || null;

      if (!text) {
        return new Response(JSON.stringify({ error: "Respuesta vacía del modelo" }), {
          status: 502,
          headers: { "Content-Type": "application/json", ...corsHeaders(env) },
        });
      }

      return new Response(JSON.stringify({ text }), {
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
