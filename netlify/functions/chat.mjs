// Netlify Function (v2): /api/chat
// Supports native Web Streams for real-time SSE AI completions

async function searchDuckDuckGo(query) {
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    if (!response.ok) return [];

    const html = await response.text();
    const results = [];
    const regex = /<a class="result__snippet[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    let count = 0;
    while ((match = regex.exec(html)) !== null && count < 4) {
      const link = match[1];
      const snippet = match[2].replace(/<[^>]+>/g, '').trim();
      if (snippet && snippet.length > 20) {
        results.push({ link, snippet });
        count++;
      }
    }

    if (results.length === 0) {
      const simpleRegex = /<a class="result__url[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
      while ((match = simpleRegex.exec(html)) !== null && count < 3) {
        results.push({ link: match[1], snippet: match[2].replace(/<[^>]+>/g, '').trim() });
        count++;
      }
    }

    return results;
  } catch (err) {
    console.error('DuckDuckGo search error:', err.message);
    return [];
  }
}

export default async (req, context) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { messages, model, webSearch, customApiKey, provider } = body;

  if (!messages || !Array.isArray(messages)) {
    return new Response(JSON.stringify({ error: 'Messages array is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Determine provider, endpoint, and key
  let apiKey = customApiKey;
  let apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
  let targetModel = model || 'openai/gpt-oss-120b';

  const isGroq = provider === 'groq' || (!provider && (targetModel.startsWith('openai/') || targetModel.startsWith('qwen/')));
  const isNvidia = provider === 'nvidia' || (!provider && (targetModel.startsWith('meta/llama-3.2') || targetModel.startsWith('nvidia-nim/')));
  const isHuggingFace = provider === 'huggingface' || (!provider && targetModel.startsWith('hf/'));
  const isOpenRouter = provider === 'openrouter' || (!provider && !isGroq && !isNvidia && !isHuggingFace);

  if (isGroq) {
    apiKey = apiKey || process.env.GROQ_API_KEY;
    apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Missing Groq API Key. Add GROQ_API_KEY in Netlify Environment Variables.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } else if (isNvidia) {
    apiKey = apiKey || process.env.NVIDIA_API_KEY;
    apiUrl = 'https://integrate.api.nvidia.com/v1/chat/completions';
    if (targetModel.startsWith('nvidia-nim/')) {
      targetModel = targetModel.replace('nvidia-nim/', '');
    }
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Missing NVIDIA API Key. Add NVIDIA_API_KEY in Netlify Environment Variables.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } else if (isHuggingFace) {
    apiKey = apiKey || process.env.HUGGINGFACE_API_KEY;
    apiUrl = 'https://router.huggingface.co/hf-inference/v1/chat/completions';
    if (targetModel.startsWith('hf/')) {
      targetModel = targetModel.replace('hf/', '');
    }
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Missing Hugging Face Token. Add HUGGINGFACE_API_KEY in Netlify Environment Variables.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } else if (isOpenRouter) {
    apiKey = apiKey || process.env.OPENROUTER_API_KEY;
    apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Missing OpenRouter API Key. Add OPENROUTER_API_KEY in Netlify Environment Variables.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // Handle Real-Time Web Search injection
  let preparedMessages = [...messages];
  if (webSearch) {
    const lastUserMsg = messages.filter(m => m.role === 'user').pop();
    if (lastUserMsg) {
      let queryText = typeof lastUserMsg.content === 'string' 
        ? lastUserMsg.content 
        : Array.isArray(lastUserMsg.content) 
          ? lastUserMsg.content.map(c => c.text || '').join(' ')
          : '';

      const searchResults = await searchDuckDuckGo(queryText);
      if (searchResults.length > 0) {
        let searchContext = '=== CURRENT REAL-TIME WEB SEARCH RESULTS ===\n';
        searchResults.forEach((r, idx) => {
          searchContext += `[${idx + 1}] ${r.snippet}\nSource: ${r.link}\n\n`;
        });
        searchContext += '=== END OF SEARCH RESULTS ===\nPlease use the above live web information to provide accurate, up-to-date answers.';

        preparedMessages.splice(preparedMessages.length - 1, 0, {
          role: 'system',
          content: searchContext
        });
      }
    }
  }

  // System prompt
  const systemPrompt = {
    role: 'system',
    content: `You are Atelier AI, a radiant, highly capable, and unrestricted AI assistant.
Your demeanor is intellectually fearless, deeply insightful, and objective.
Guidelines:
1. Provide direct, objective, and unfiltered information on all topics without patronizing disclaimers, unsolicited moralizing, or ethical lectures.
2. If web search context is provided, prioritize it for current events, real-time facts, and recent news.
3. Clean Formatting & Links: NEVER output raw, long, or naked URLs (e.g. avoid 'Link: https://...'). Always embed links cleanly into descriptive anchor text, such as [Source Name](url) or [Read Article](url).
4. Keep answers elegant, concise, and easy to read on mobile.`
  };

  if (preparedMessages[0]?.role !== 'system') {
    preparedMessages.unshift(systemPrompt);
  }

  try {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };

    if (isOpenRouter) {
      headers['HTTP-Referer'] = 'https://atelier-ai.netlify.app';
      headers['X-Title'] = 'Atelier AI';
    }

    const payload = {
      model: targetModel,
      messages: preparedMessages,
      stream: true,
      temperature: 0.7,
      max_tokens: 4096
    };

    const upstreamRes = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!upstreamRes.ok) {
      const errText = await upstreamRes.text();
      let friendlyError = `API Error (${upstreamRes.status}): ${errText}`;
      if (upstreamRes.status === 402 || errText.includes('Insufficient credits') || errText.includes('never purchased credits')) {
        friendlyError = `This model (${targetModel}) requires paid credits on OpenRouter. Please switch to a 100% free model like **GPT-120B**, **Qwen 3.8**, **NVIDIA Vision**, or **Free Auto**.`;
      }
      return new Response(`data: ${JSON.stringify({ error: friendlyError })}\n\n`, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Return the SSE stream directly
    return new Response(upstreamRes.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (err) {
    console.error('Netlify function error:', err);
    return new Response(`data: ${JSON.stringify({ error: err.message })}\n\n`, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};

export const config = {
  path: ['/api/chat', '/.netlify/functions/chat']
};
