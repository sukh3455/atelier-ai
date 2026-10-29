# 🎨 Atelier AI

> Minimal, ultra-fast, unrestricted AI Chatbot with 100% Free Models, Document Analysis (PDF & Images), Real-Time Web Search, and Cloud Sync.

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/sukh3455/atelier-ai)

---

## ✨ Features

- **100% Free AI Models:** Pre-configured with Groq, OpenRouter Free endpoints, NVIDIA NIM, and Hugging Face.
- **Minimal Obsidian Dark UI:** Clean typography (Inter font), high contrast, optimized for mobile touch and desktop.
- **Photo & Document Analysis:** Extract text and analyze PDFs and images client-side.
- **Real-Time Web Search:** Live DuckDuckGo search integration with clean markdown link formatting.
- **Netlify & Vercel Ready:** Includes Server-Sent Events (SSE) streaming serverless functions for zero-config deployment.
- **Cloud Chat History:** Supabase integration for synchronizing conversations across mobile and desktop.

---

## 🚀 Quick Deploy to Netlify

1. Fork or import this repository on **[Netlify](https://app.netlify.com/)**.
2. Build Settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Functions directory:** `netlify/functions`
3. Add Environment Variables under **Site configuration > Environment variables**:
   - `GROQ_API_KEY`: Your Groq API key
   - `OPENROUTER_API_KEY`: Your OpenRouter API key
   - `NVIDIA_API_KEY`: Your NVIDIA NIM API key
   - `HUGGINGFACE_API_KEY`: Your Hugging Face token
   - `NEXT_PUBLIC_SUPABASE_URL`: (Optional) Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: (Optional) Supabase Anon key

---

## 💻 Local Development

```bash
# Clone the repository
git clone https://github.com/sukh3455/atelier-ai.git
cd atelier-ai

# Install dependencies
npm install

# Configure environment keys
cp .env.example .env.local

# Start development server
node server.js
```
The application will be running on `http://localhost:3000`.

---

## 📄 License
MIT License.
