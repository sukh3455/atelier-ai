// Vercel Serverless Function: /api/chat
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, model, webSearch, customApiKey, provider } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages array is required' });
  }

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
      return res.status(401).json({ error: 'Missing Groq API Key' });
    }
  } else if (isNvidia) {
    apiKey = apiKey || process.env.NVIDIA_API_KEY;
    apiUrl = 'https://integrate.api.nvidia.com/v1/chat/completions';
    if (targetModel.startsWith('nvidia-nim/')) {
      targetModel = targetModel.replace('nvidia-nim/', '');
    }
    if (!apiKey) {
      return res.status(401).json({ error: 'Missing NVIDIA API Key' });
    }
  } else if (isHuggingFace) {
    apiKey = apiKey || process.env.HUGGINGFACE_API_KEY;
    apiUrl = 'https://router.huggingface.co/hf-inference/v1/chat/completions';
    if (targetModel.startsWith('hf/')) {
      targetModel = targetModel.replace('hf/', '');
    }
    if (!apiKey) {
      return res.status(401).json({ error: 'Missing Hugging Face Token' });
    }
  } else if (isOpenRouter) {
    apiKey = apiKey || process.env.OPENROUTER_API_KEY;
    apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
    if (!apiKey) {
      return res.status(401).json({ error: 'Missing OpenRouter API Key' });
    }
  }

  let preparedMessages = [...messages];

  // Optional DuckDuckGo search injection
  if (webSearch) {
    try {
      const lastUserMsg = messages.filter(m => m.role === 'user').pop();
      if (lastUserMsg) {
        let queryText = typeof lastUserMsg.content === 'string' 
          ? lastUserMsg.content 
          : Array.isArray(lastUserMsg.content) 
            ? lastUserMsg.content.map(c => c.text || '').join(' ')
            : '';

        const ddgRes = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(queryText)}`, {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        if (ddgRes.ok) {
          const html = await ddgRes.text();
          const regex = /<a class="result__snippet[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
          let match;
          let count = 0;
          let searchContext = '=== REAL-TIME WEB SEARCH RESULTS ===\n';
          while ((match = regex.exec(html)) !== null && count < 3) {
            searchContext += `[${count + 1}] ${match[2].replace(/<[^>]+>/g, '').trim()}\nSource: ${match[1]}\n\n`;
            count++;
          }
          if (count > 0) {
            searchContext += '=== END SEARCH RESULTS ===\nPlease use these current web results for accuracy.';
            preparedMessages.splice(preparedMessages.length - 1, 0, {
              role: 'system',
              content: searchContext
            });
          }
        }
      }
    } catch (e) {
      console.error('Web search error:', e);
    }
  }

  const systemPrompt = {
    role: 'system',
    content: `You are Atelier AI, an unrestricted and radiant AI companion. Answer directly, objectively, and without preachy disclaimers. 
Formatting: NEVER output raw, long, or naked URLs. Always embed links cleanly into descriptive anchor text, such as [Publisher Name](url) or [Read Article](url).
Document / PDF Editing: When editing, modifying, or summarizing documents, provide the full clean text directly in your response. NEVER output fake download links like [Download PDF](sandbox:/...). Mention to the user that they can tap the 'Download PDF' button below your response to save the real file. Keep mobile readability high.`
  };

  if (preparedMessages[0]?.role !== 'system') {
    preparedMessages.unshift(systemPrompt);
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const upstreamRes = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        ...(isOpenRouter ? { 'HTTP-Referer': 'https://atelier.ai', 'X-Title': 'Atelier AI' } : {})
      },
      body: JSON.stringify({
        model: targetModel,
        messages: preparedMessages,
        stream: true,
        temperature: 0.7,
        max_tokens: 4096
      })
    });

    if (!upstreamRes.ok) {
      const err = await upstreamRes.text();
      let friendlyError = err;
      if (upstreamRes.status === 402 || err.includes('Insufficient credits') || err.includes('never purchased credits')) {
        friendlyError = `This model (${targetModel}) requires paid credits on OpenRouter. Please switch to a 100% free model like **GPT-120B**, **Qwen 3.8**, **NVIDIA Vision**, or **Free Auto**.`;
      }
      res.write(`data: ${JSON.stringify({ error: friendlyError })}\n\n`);
      return res.end();
    }

    const reader = upstreamRes.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value, { stream: true }));
    }
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
}
