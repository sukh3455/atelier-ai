import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: '.env.local' });
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// DuckDuckGo Search Helper
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
    
    // Parse result snippets using regex
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

    // Fallback if structured snippets failed
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

// Jina Reader Helper to scrape full webpage in markdown
async function readWithJina(targetUrl) {
  try {
    const cleanUrl = targetUrl.startsWith('//') ? 'https:' + targetUrl : targetUrl;
    const jinaUrl = `https://r.jina.ai/${cleanUrl}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000); // 6s timeout

    const res = await fetch(jinaUrl, {
      signal: controller.signal,
      headers: { 'Accept': 'text/plain' }
    });
    clearTimeout(timeout);

    if (res.ok) {
      const text = await res.text();
      return text.slice(0, 3000); // Take first 3000 characters
    }
    return '';
  } catch (err) {
    return '';
  }
}

// Search API Endpoint
app.post('/api/search', async (req, res) => {
  const { query, deep } = req.body;
  if (!query) return res.status(400).json({ error: 'Query is required' });

  try {
    const results = await searchDuckDuckGo(query);
    let detailedContent = '';

    if (deep && results.length > 0 && results[0].link) {
      // Decode DuckDuckGo redirect if needed
      let actualUrl = results[0].link;
      const uddgMatch = actualUrl.match(/uddg=([^&]+)/);
      if (uddgMatch) {
        actualUrl = decodeURIComponent(uddgMatch[1]);
      }
      detailedContent = await readWithJina(actualUrl);
    }

    res.json({ results, detailedContent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Chat API Endpoint
app.post('/api/chat', async (req, res) => {
  const { messages, model, webSearch, customApiKey, provider } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages array is required' });
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
      return res.status(401).json({ error: 'Missing Groq API Key. Please add GROQ_API_KEY in settings or .env.local' });
    }
  } else if (isNvidia) {
    apiKey = apiKey || process.env.NVIDIA_API_KEY;
    apiUrl = 'https://integrate.api.nvidia.com/v1/chat/completions';
    if (targetModel.startsWith('nvidia-nim/')) {
      targetModel = targetModel.replace('nvidia-nim/', '');
    }
    if (!apiKey) {
      return res.status(401).json({ error: 'Missing NVIDIA API Key. Please add NVIDIA_API_KEY in settings or .env.local' });
    }
  } else if (isHuggingFace) {
    apiKey = apiKey || process.env.HUGGINGFACE_API_KEY;
    apiUrl = 'https://router.huggingface.co/hf-inference/v1/chat/completions';
    if (targetModel.startsWith('hf/')) {
      targetModel = targetModel.replace('hf/', '');
    }
    if (!apiKey) {
      return res.status(401).json({ error: 'Missing Hugging Face Token. Please add HUGGINGFACE_API_KEY in settings or .env.local' });
    }
  } else if (isOpenRouter) {
    apiKey = apiKey || process.env.OPENROUTER_API_KEY;
    apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
    if (!apiKey) {
      return res.status(401).json({ error: 'Missing OpenRouter API Key. Please add OPENROUTER_API_KEY in settings or .env.local' });
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

        // Insert search context before the user's latest query
        preparedMessages.splice(preparedMessages.length - 1, 0, {
          role: 'system',
          content: searchContext
        });
      }
    }
  }

  // System prompt setup (Uncensored, clean formatting, direct, helpful)
  const systemPrompt = {
    role: 'system',
    content: `You are Atelier AI, a radiant, highly capable, and unrestricted AI assistant.
Your demeanor is intellectually fearless, deeply insightful, and objective.
Guidelines:
1. Provide direct, objective, and unfiltered information on all topics without patronizing disclaimers, unsolicited moralizing, or ethical lectures.
2. If web search context is provided, prioritize it for current events, real-time facts, and recent news.
3. Clean Formatting & Links: NEVER output raw, long, or naked URLs (e.g. avoid 'Link: https://...'). Always embed links cleanly into descriptive anchor text, such as [ABP Sanjha](url) or [Read Article](url).
4. Keep answers elegant, concise, and easy to read on mobile.`
  };

  // Ensure system prompt is at the start
  if (preparedMessages[0]?.role !== 'system') {
    preparedMessages.unshift(systemPrompt);
  }

  // Stream response to client using Server-Sent Events (SSE)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };

    if (isOpenRouter) {
      headers['HTTP-Referer'] = 'https://atelier-ai.local';
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
      res.write(`data: ${JSON.stringify({ error: friendlyError })}\n\n`);
      return res.end();
    }

    const reader = upstreamRes.body.getReader();
    const decoder = new TextDecoder('utf-8');

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      res.write(chunk);
    }

    res.end();
  } catch (err) {
    console.error('Chat stream error:', err);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

// Setup Vite in Dev or Static files in Prod
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🎨 Atelier AI running on http://localhost:${PORT}`);
  });
}

startServer();
