import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, Globe, Image, FileText, Send, Plus, 
  Trash2, Settings, Menu, X, Copy, Check, RotateCcw, 
  Zap, Brain, Eye, Paperclip, ChevronDown, RefreshCw
} from 'lucide-react';
import { marked } from 'marked';
import { extractTextFromPDF } from './utils/pdfParser';
import ModelsDirectory from './components/ModelsDirectory';

// Custom renderer to format links into clean, compact badges
const markedRenderer = {
  link({ href, title, text }) {
    let label = text;
    // If the link text is a raw URL, shorten it to just the clean domain name
    if (text.startsWith('http://') || text.startsWith('https://')) {
      try {
        const u = new URL(text);
        label = '🔗 ' + u.hostname.replace(/^www\./, '') + ' ↗';
      } catch (e) {
        label = text.length > 28 ? text.slice(0, 25) + '...' : text;
      }
    }
    return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="link-badge" title="${href}">${label}</a>`;
  }
};
marked.use({ renderer: markedRenderer });

// Verified Clean Models
const MODEL_OPTIONS = [
  {
    id: 'openai/gpt-oss-120b',
    name: 'GPT-120B',
    fullName: 'GPT-OSS 120B (Groq)',
    provider: 'groq',
    badge: '120B Flagship',
    description: 'Fast, massive open flagship model'
  },
  {
    id: 'qwen/qwen3.8-27b',
    name: 'Qwen 3.8',
    fullName: 'Qwen 3.8 27B (Groq)',
    provider: 'groq',
    badge: '500 t/s',
    description: 'Blazing fast inference speed'
  },
  {
    id: 'nvidia/nemotron-3.5-super-vl:free',
    name: 'Vision',
    fullName: 'Nemotron Vision (OpenRouter)',
    provider: 'openrouter',
    badge: 'Photos / Vision',
    description: 'Understands photos, screenshots & art'
  },
  {
    id: 'nvidia/nemotron-3.5-lightning:free',
    name: 'Nemotron Fast',
    fullName: 'Nemotron Lightning (OpenRouter)',
    provider: 'openrouter',
    badge: 'Fast Free',
    description: 'NVIDIA reasoning model on free tier'
  },
  {
    id: 'meta/llama-3.2-11b-vision-instruct',
    name: 'NVIDIA Vision',
    fullName: 'Llama 3.2 Vision (NVIDIA NIM)',
    provider: 'nvidia',
    badge: 'NVIDIA H100',
    description: 'Ultra-fast vision & photo analysis on NVIDIA TensorRT'
  },
  {
    id: 'deepseek/deepseek-r1:free',
    name: 'DeepSeek R1',
    fullName: 'DeepSeek R1 (OpenRouter Free)',
    provider: 'openrouter',
    badge: 'Deep Logic',
    description: 'Chain-of-thought logic rivaling o1 on math & coding'
  },
  {
    id: 'openrouter/free',
    name: 'Free Auto',
    fullName: 'OpenRouter Free Auto',
    provider: 'openrouter',
    badge: 'Auto Route',
    description: 'Routes to top active free models'
  }
];

export default function App() {
  // Chat History
  const [conversations, setConversations] = useState(() => {
    const saved = localStorage.getItem('atelier_chats_v1');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
    }
    return [{
      id: 'canvas-1',
      title: 'New Conversation',
      createdAt: new Date().toISOString(),
      messages: []
    }];
  });

  const [activeChatId, setActiveChatId] = useState(() => {
    return localStorage.getItem('atelier_active_chat') || 'canvas-1';
  });

  // Current inputs
  const [inputPrompt, setInputPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState('openai/gpt-oss-120b');
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  
  // Attachments
  const [attachedImage, setAttachedImage] = useState(null); // { dataUrl, name }
  const [attachedPDF, setAttachedPDF] = useState(null); // { text, name, numPages }
  const [isParsingPDF, setIsParsingPDF] = useState(false);

  // Modals, Panels & Views
  const [currentView, setCurrentView] = useState('chat'); // 'chat' | 'models'
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2200);
  };

  // Custom API Key Overrides
  const [customGroqKey, setCustomGroqKey] = useState(() => localStorage.getItem('atelier_groq_key') || '');
  const [customOpenRouterKey, setCustomOpenRouterKey] = useState(() => localStorage.getItem('atelier_openrouter_key') || '');
  const [customNvidiaKey, setCustomNvidiaKey] = useState(() => localStorage.getItem('atelier_nvidia_key') || '');
  const [customHuggingFaceKey, setCustomHuggingFaceKey] = useState(() => localStorage.getItem('atelier_hf_key') || '');

  const messagesEndRef = useRef(null);
  const fileInputImageRef = useRef(null);
  const fileInputPdfRef = useRef(null);
  const textareaRef = useRef(null);

  const currentChat = conversations.find(c => c.id === activeChatId) || conversations[0];

  useEffect(() => {
    localStorage.setItem('atelier_chats_v1', JSON.stringify(conversations));
  }, [conversations]);

  useEffect(() => {
    localStorage.setItem('atelier_active_chat', activeChatId);
  }, [activeChatId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentChat?.messages, isStreaming]);

  // Handle New Chat
  const handleNewChat = () => {
    if (currentChat.messages.length === 0) {
      showToast('Already on a new chat');
      textareaRef.current?.focus();
      return;
    }

    const newId = 'canvas-' + Date.now();
    const newChat = {
      id: newId,
      title: 'New Chat',
      createdAt: new Date().toISOString(),
      messages: []
    };
    setConversations([newChat, ...conversations]);
    setActiveChatId(newId);
    setIsSidebarOpen(false);
    setAttachedImage(null);
    setAttachedPDF(null);
    setInputPrompt('');
    showToast('New chat started');
    textareaRef.current?.focus();
  };

  // Delete Chat
  const handleDeleteChat = (id, e) => {
    e.stopPropagation();
    if (conversations.length <= 1) {
      setConversations([{
        id: 'canvas-1',
        title: 'New Conversation',
        createdAt: new Date().toISOString(),
        messages: []
      }]);
      setActiveChatId('canvas-1');
      return;
    }
    const filtered = conversations.filter(c => c.id !== id);
    setConversations(filtered);
    if (activeChatId === id) {
      setActiveChatId(filtered[0].id);
    }
  };

  // Handle Image Upload
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setAttachedImage({
        dataUrl: event.target.result,
        name: file.name
      });
      if (selectedModel !== 'nvidia/nemotron-3.5-super-vl:free') {
        setSelectedModel('nvidia/nemotron-3.5-super-vl:free');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Handle PDF Upload
  const handlePDFSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      alert('Please select a valid PDF file.');
      return;
    }

    setIsParsingPDF(true);
    try {
      const parsed = await extractTextFromPDF(file);
      setAttachedPDF(parsed);
    } catch (err) {
      alert(err.message || 'Error extracting text from PDF');
    } finally {
      setIsParsingPDF(false);
      e.target.value = '';
    }
  };

  // Send Message
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if ((!inputPrompt.trim() && !attachedImage && !attachedPDF) || isStreaming) return;

    const userText = inputPrompt.trim();
    let messageContent = userText;

    if (attachedPDF) {
      messageContent = `${userText ? userText + '\n\n' : ''}[Attached PDF Document: "${attachedPDF.name}" (${attachedPDF.numPages} pages)]\n\`\`\`text\n${attachedPDF.text}\n\`\`\``;
    }

    let finalContent = messageContent;
    if (attachedImage) {
      finalContent = [
        { type: 'text', text: messageContent || 'Please analyze this image in detail.' },
        { type: 'image_url', image_url: { url: attachedImage.dataUrl } }
      ];
    }

    const newUserMessage = {
      role: 'user',
      content: finalContent,
      displayContent: userText || (attachedImage ? 'Uploaded an image for analysis' : 'Uploaded PDF for analysis'),
      imagePreview: attachedImage?.dataUrl,
      pdfInfo: attachedPDF ? { name: attachedPDF.name, pages: attachedPDF.numPages } : null,
      modelUsed: selectedModel,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedMessages = [...currentChat.messages, newUserMessage];
    let newTitle = currentChat.title;
    if (currentChat.messages.length === 0) {
      newTitle = userText ? (userText.slice(0, 28) + (userText.length > 28 ? '...' : '')) : (attachedImage?.name || attachedPDF?.name || 'New Chat');
    }

    setConversations(prev => prev.map(c => {
      if (c.id === activeChatId) {
        return { ...c, title: newTitle, messages: updatedMessages };
      }
      return c;
    }));

    setInputPrompt('');
    setAttachedImage(null);
    setAttachedPDF(null);
    setIsStreaming(true);

    const assistantMessageIndex = updatedMessages.length;
    const initialAssistantMessage = {
      role: 'assistant',
      content: '',
      modelUsed: selectedModel,
      webSearchUsed: webSearchEnabled,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setConversations(prev => prev.map(c => {
      if (c.id === activeChatId) {
        return { ...c, messages: [...updatedMessages, initialAssistantMessage] };
      }
      return c;
    }));

    const currentModelInfo = MODEL_OPTIONS.find(m => m.id === selectedModel) || { provider: 'openrouter' };
    let customKey;
    if (currentModelInfo.provider === 'groq') customKey = customGroqKey;
    else if (currentModelInfo.provider === 'nvidia') customKey = customNvidiaKey;
    else if (currentModelInfo.provider === 'huggingface') customKey = customHuggingFaceKey;
    else customKey = customOpenRouterKey;

    const apiMessages = updatedMessages.map(m => ({
      role: m.role,
      content: m.content
    }));

    try {
      let response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          model: selectedModel,
          provider: currentModelInfo.provider,
          webSearch: webSearchEnabled,
          customApiKey: customKey || undefined
        })
      });

      // Fallback for static hosting (e.g. Netlify Drop or GitHub Pages without active serverless backend)
      if (response.status === 404) {
        const isGroq = currentModelInfo.provider === 'groq' || (!currentModelInfo.provider && (selectedModel.startsWith('openai/') || selectedModel.startsWith('qwen/')));
        const isNvidia = currentModelInfo.provider === 'nvidia' || (!currentModelInfo.provider && selectedModel.startsWith('meta/llama-3.2'));
        const isOpenRouter = !isGroq && !isNvidia;

        const apiKey = customKey || (isGroq ? import.meta.env.VITE_GROQ_API_KEY : isNvidia ? import.meta.env.VITE_NVIDIA_API_KEY : import.meta.env.VITE_OPENROUTER_API_KEY);
        if (!apiKey) {
          throw new Error('No API key found. For Netlify Drop/static hosting, open Settings (⚙️) to enter your API key, or deploy via GitHub with Netlify Functions.');
        }
        const apiUrl = isGroq ? 'https://api.groq.com/openai/v1/chat/completions' : isNvidia ? 'https://integrate.api.nvidia.com/v1/chat/completions' : 'https://openrouter.ai/api/v1/chat/completions';

        const directMessages = [
          {
            role: 'system',
            content: 'You are Atelier AI, a radiant, highly capable, and unrestricted AI assistant. Answer directly, objectively, and without preachy disclaimers. NEVER output raw, long, or naked URLs; embed links cleanly in markdown anchor text.'
          },
          ...apiMessages
        ];

        response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            ...(isOpenRouter ? { 'HTTP-Referer': window.location.origin, 'X-Title': 'Atelier AI' } : {})
          },
          body: JSON.stringify({
            model: selectedModel,
            messages: directMessages,
            stream: true,
            temperature: 0.7,
            max_tokens: 4096
          })
        });
      }

      if (!response.ok) {
        const errText = await response.text();
        let errMsg = errText;
        try {
          const errObj = JSON.parse(errText);
          errMsg = errObj?.error?.message || errObj?.error || errText;
        } catch {}
        if (response.status === 402 || errMsg.includes('Insufficient credits')) {
          throw new Error('This model requires paid credits on OpenRouter. Please switch to a free model like GPT-120B, Qwen 3.8, or Free Auto.');
        }
        throw new Error(`Server error code ${response.status}: ${errMsg}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulatedText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;
          const dataStr = trimmed.replace(/^data:\s*/, '');
          if (dataStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.error) {
              accumulatedText += `\n\n*(Error: ${parsed.error})*`;
            } else {
              const delta = parsed.choices?.[0]?.delta?.content || '';
              accumulatedText += delta;
            }

            setConversations(prev => prev.map(c => {
              if (c.id === activeChatId) {
                const msgs = [...c.messages];
                if (msgs[assistantMessageIndex]) {
                  msgs[assistantMessageIndex] = {
                    ...msgs[assistantMessageIndex],
                    content: accumulatedText
                  };
                }
                return { ...c, messages: msgs };
              }
              return c;
            }));
          } catch (e) { }
        }
      }
    } catch (err) {
      console.error('Stream error:', err);
      setConversations(prev => prev.map(c => {
        if (c.id === activeChatId) {
          const msgs = [...c.messages];
          if (msgs[assistantMessageIndex]) {
            msgs[assistantMessageIndex] = {
              ...msgs[assistantMessageIndex],
              content: `⚠️ **Connection Error:** Could not reach the model. ${err.message}`
            };
          }
          return { ...c, messages: msgs };
        }
        return c;
      }));
    } finally {
      setIsStreaming(false);
    }
  };

  const copyToClipboard = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const currentModelObj = MODEL_OPTIONS.find(m => m.id === selectedModel) || MODEL_OPTIONS[0];

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#090a0f] text-neutral-100 relative">
      <div className="ambient-bg" />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-3.5 py-1.5 rounded-full bg-neutral-800/95 border border-white/10 text-xs text-neutral-200 shadow-2xl backdrop-blur-md flex items-center gap-1.5 transition-all">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* =========================================================================
          MINIMAL HEADER
         ========================================================================= */}
      <header className="sticky top-0 z-30 h-14 panel-glass border-b border-white/5 px-3 sm:px-6 flex items-center justify-between">
        {/* Left: Mobile Drawer & Clean Title */}
        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="md:hidden p-1.5 rounded-lg hover:bg-white/5 text-neutral-400 hover:text-white transition-colors"
            title="Chat History"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500" />
            <h1 className="text-sm font-semibold tracking-tight text-white">
              Atelier
            </h1>
          </div>
        </div>

        {/* Center: Sleek Compact Model Selector */}
        <div className="relative">
          <button 
            onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-neutral-200 transition-colors whitespace-nowrap"
          >
            <span className="text-neutral-100 font-medium">{currentModelObj.name}</span>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
          </button>

          {/* Model Dropdown Menu */}
          {isModelDropdownOpen && (
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-64 sm:w-72 bg-[#12141e] border border-white/10 rounded-xl p-1.5 z-50 shadow-2xl">
              <div className="text-[10px] uppercase font-mono text-neutral-400 px-2 py-1 tracking-wider border-b border-white/5 mb-1">
                Select Model
              </div>
              <div className="space-y-0.5">
                {MODEL_OPTIONS.map((m) => {
                  const isSelected = m.id === selectedModel;
                  return (
                    <button
                      key={m.id}
                      onClick={() => {
                        setSelectedModel(m.id);
                        setIsModelDropdownOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between transition-colors ${
                        isSelected ? 'bg-indigo-600/20 text-indigo-300' : 'hover:bg-white/5 text-neutral-300'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="text-xs font-medium text-white">{m.fullName}</div>
                        <div className="text-[11px] text-neutral-400 truncate">{m.description}</div>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-neutral-400 font-mono shrink-0">
                        {m.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-1">
          {/* Models Guide Button */}
          <button
            onClick={() => setCurrentView(currentView === 'models' ? 'chat' : 'models')}
            className={`p-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1 ${
              currentView === 'models'
                ? 'bg-indigo-600/30 border-indigo-500/50 text-indigo-300'
                : 'border-transparent text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
            title="Browse All Models & Guides"
          >
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="hidden md:inline text-xs">Models Guide</span>
          </button>

          {/* Live Web Toggle */}
          <button
            onClick={() => setWebSearchEnabled(!webSearchEnabled)}
            className={`p-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1 ${
              webSearchEnabled 
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' 
                : 'border-transparent text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
            title="Toggle Live Web Search"
          >
            <Globe className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">{webSearchEnabled ? 'Web On' : 'Web Off'}</span>
          </button>

          {/* New Chat */}
          <button
            onClick={() => {
              if (currentView === 'models') setCurrentView('chat');
              handleNewChat();
            }}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 active:scale-90 active:rotate-90 transition-all"
            title="Start New Chat"
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* Settings */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* =========================================================================
          MAIN CONTAINER (Sidebar + Chat Area)
         ========================================================================= */}
      <div className="flex-1 flex overflow-hidden">
        {/* Minimal Sidebar Drawer */}
        <aside className={`
          fixed md:static inset-y-0 left-0 z-40 w-64 bg-[#0e1017] border-r border-white/5 flex flex-col transition-transform duration-200
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <div className="p-3 border-b border-white/5 flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider font-mono">
              Conversations
            </span>
            <button 
              onClick={() => setIsSidebarOpen(false)} 
              className="md:hidden p-1 text-neutral-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-2 space-y-1">
            <button
              onClick={() => {
                if (currentView === 'models') setCurrentView('chat');
                handleNewChat();
              }}
              className="w-full py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-medium text-neutral-200 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Conversation</span>
            </button>

            <button
              onClick={() => {
                setCurrentView(currentView === 'models' ? 'chat' : 'models');
                setIsSidebarOpen(false);
              }}
              className={`w-full py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                currentView === 'models'
                  ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
                  : 'bg-white/5 hover:bg-white/10 border-white/5 text-neutral-300'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>{currentView === 'models' ? 'Return to Chat' : 'Models Directory & Guide'}</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
            {conversations.map((chat) => {
              const isActive = chat.id === activeChatId;
              return (
                <div
                  key={chat.id}
                  onClick={() => {
                    setActiveChatId(chat.id);
                    setIsSidebarOpen(false);
                  }}
                  className={`group flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer text-xs transition-colors ${
                    isActive 
                      ? 'bg-indigo-600/15 text-indigo-200 font-medium' 
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
                  }`}
                >
                  <span className="truncate pr-2">{chat.title}</span>
                  <button
                    onClick={(e) => handleDeleteChat(chat.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 transition-opacity"
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </aside>

        {isSidebarOpen && (
          <div 
            onClick={() => setIsSidebarOpen(false)} 
            className="md:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
          />
        )}

        {/* =========================================================================
            MAIN CONTENT (Models Directory View OR Chat Canvas)
           ========================================================================= */}
        {currentView === 'models' ? (
          <ModelsDirectory 
            activeModelId={selectedModel}
            onSelectModel={(id) => {
              setSelectedModel(id);
              setCurrentView('chat');
              showToast('Switched to ' + id);
            }}
            onBackToChat={() => setCurrentView('chat')}
          />
        ) : (
          <main className="flex-1 flex flex-col h-[calc(100vh-56px)] overflow-hidden relative">
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6">
            {/* Minimal Greeting Screen */}
            {currentChat.messages.length === 0 ? (
              <div className="max-w-md mx-auto my-auto text-center py-16 px-4">
                <div className="w-10 h-10 mx-auto rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-semibold text-white tracking-tight mb-1.5">
                  How can I help you today?
                </h2>
                <p className="text-xs text-neutral-400 mb-6">
                  Connected with real-time web • Photos & PDF uploads
                </p>

                <div className="space-y-2 text-left">
                  {[
                    'Summarize the latest world & technology news today',
                    'Explain quantum entanglement in simple terms',
                    'Upload a photo or diagram to analyze its contents',
                    'Upload a PDF document to extract key takeaways'
                  ].map((promptText, idx) => (
                    <button
                      key={idx}
                      onClick={() => setInputPrompt(promptText)}
                      className="w-full p-2.5 rounded-lg panel-card hover:border-white/20 text-xs text-neutral-300 hover:text-white transition-all text-left flex items-center justify-between"
                    >
                      <span className="truncate">{promptText}</span>
                      <span className="text-neutral-500 text-[10px]">↵</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Message List */
              currentChat.messages.map((msg, index) => {
                const isUser = msg.role === 'user';
                return (
                  <div 
                    key={index} 
                    className={`flex flex-col max-w-2xl mx-auto ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    {/* User Label / Assistant Badge */}
                    <div className="text-[11px] text-neutral-500 mb-1 px-1 font-mono flex items-center gap-2">
                      <span>{isUser ? 'You' : (MODEL_OPTIONS.find(m => m.id === msg.modelUsed)?.name || 'Atelier')}</span>
                      <span>{msg.timestamp}</span>
                      {msg.webSearchUsed && (
                        <span className="text-emerald-400 flex items-center gap-0.5">
                          • <Globe className="w-2.5 h-2.5" /> Web
                        </span>
                      )}
                    </div>

                    {/* Bubble */}
                    <div className={`relative max-w-full rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      isUser 
                        ? 'bg-neutral-800 text-white rounded-br-sm' 
                        : 'bg-[#11131c] border border-white/5 text-neutral-200 rounded-bl-sm w-full overflow-hidden'
                    }`}>
                      {/* Attached Image Preview */}
                      {msg.imagePreview && (
                        <div className="mb-2.5 rounded-lg overflow-hidden border border-white/10 max-w-xs">
                          <img src={msg.imagePreview} alt="Attached" className="w-full h-auto object-cover max-h-56" />
                        </div>
                      )}

                      {/* Attached PDF Badge */}
                      {msg.pdfInfo && (
                        <div className="mb-2.5 flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10 text-xs text-neutral-300 font-mono">
                          <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                          <span className="truncate">{msg.pdfInfo.name}</span>
                          <span className="text-neutral-500 shrink-0">({msg.pdfInfo.pages} pages)</span>
                        </div>
                      )}

                      {/* Content */}
                      {isUser ? (
                        <p className="whitespace-pre-wrap">{msg.displayContent || msg.content}</p>
                      ) : (
                        <div 
                          className="prose-minimal"
                          dangerouslySetInnerHTML={{ 
                            __html: marked.parse(msg.content || (isStreaming && index === currentChat.messages.length - 1 ? '*(Thinking...)*' : '')) 
                          }}
                        />
                      )}

                      {/* Assistant Actions */}
                      {!isUser && msg.content && (
                        <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-end">
                          <button
                            onClick={() => copyToClipboard(msg.content, index)}
                            className="p-1 text-neutral-400 hover:text-white transition-colors"
                            title="Copy response"
                          >
                            {copiedIndex === index ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* =========================================================================
              CLEAN FLOATING INPUT DOCK
             ========================================================================= */}
          <div className="p-3 sm:p-4 max-w-2xl w-full mx-auto">
            {/* Attachment preview banner */}
            {(attachedImage || attachedPDF) && (
              <div className="mb-2 p-2 rounded-xl bg-[#12141e] border border-white/10 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 truncate">
                  {attachedImage ? (
                    <>
                      <img src={attachedImage.dataUrl} alt="Thumbnail" className="w-8 h-8 rounded object-cover" />
                      <span className="truncate text-neutral-300">{attachedImage.name} (Vision Ready)</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 text-indigo-400" />
                      <span className="truncate text-neutral-300">{attachedPDF.name} ({attachedPDF.numPages} pages)</span>
                    </>
                  )}
                </div>
                <button 
                  onClick={() => { setAttachedImage(null); setAttachedPDF(null); }}
                  className="p-1 text-neutral-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {isParsingPDF && (
              <div className="mb-2 text-xs text-neutral-400 flex items-center gap-2 font-mono">
                <RefreshCw className="w-3 h-3 animate-spin text-indigo-400" />
                Extracting text from PDF...
              </div>
            )}

            {/* Input Bar */}
            <form 
              onSubmit={handleSendMessage}
              className="bg-[#12141e] border border-white/10 rounded-2xl p-1.5 sm:p-2 flex items-end gap-1.5 shadow-xl"
            >
              <input 
                type="file" 
                ref={fileInputImageRef} 
                onChange={handleImageSelect} 
                accept="image/*" 
                className="hidden" 
              />
              <input 
                type="file" 
                ref={fileInputPdfRef} 
                onChange={handlePDFSelect} 
                accept="application/pdf" 
                className="hidden" 
              />

              {/* Attachments */}
              <div className="flex items-center pb-1 pl-1">
                <button
                  type="button"
                  onClick={() => fileInputImageRef.current?.click()}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
                  title="Upload Image"
                >
                  <Image className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => fileInputPdfRef.current?.click()}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
                  title="Upload PDF"
                >
                  <FileText className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setWebSearchEnabled(!webSearchEnabled)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    webSearchEnabled ? 'text-emerald-400 bg-emerald-500/10' : 'text-neutral-400 hover:text-white hover:bg-white/5'
                  }`}
                  title="Toggle Web Search"
                >
                  <Globe className="w-4 h-4" />
                </button>
              </div>

              {/* Text Input */}
              <textarea
                ref={textareaRef}
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                rows={1}
                placeholder="Ask anything..."
                className="flex-1 bg-transparent border-0 focus:ring-0 text-white placeholder-neutral-500 text-sm resize-none max-h-32 py-1.5 px-1 focus:outline-none"
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={isStreaming || (!inputPrompt.trim() && !attachedImage && !attachedPDF)}
                className={`p-2 rounded-xl transition-all ${
                  isStreaming || (!inputPrompt.trim() && !attachedImage && !attachedPDF)
                    ? 'text-neutral-600 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }`}
                title="Send"
              >
                {isStreaming ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>
          </div>
        </main>
        )}
      </div>

      {/* =========================================================================
          SETTINGS MODAL
         ========================================================================= */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#12141e] border border-white/10 w-full max-w-sm rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <h3 className="text-sm font-semibold text-white">Settings</h3>
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="p-1 rounded text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 py-3 text-xs max-h-[70vh] overflow-y-auto pr-1">
              {/* Cloud Sync Status */}
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-xs text-white">Supabase Cloud Sync</div>
                  <div className="text-[10px] text-emerald-400 font-mono">mmjyroepqmtfncmjlnym • Active</div>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>

              <div>
                <label className="block text-neutral-300 font-mono mb-1">
                  GROQ API KEY
                </label>
                <input
                  type="password"
                  value={customGroqKey}
                  onChange={(e) => {
                    setCustomGroqKey(e.target.value);
                    localStorage.setItem('atelier_groq_key', e.target.value);
                  }}
                  placeholder="gsk_..."
                  className="w-full bg-[#090a0f] border border-white/10 rounded-lg px-2.5 py-1.5 text-neutral-200 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-neutral-300 font-mono mb-1">
                  OPENROUTER API KEY
                </label>
                <input
                  type="password"
                  value={customOpenRouterKey}
                  onChange={(e) => {
                    setCustomOpenRouterKey(e.target.value);
                    localStorage.setItem('atelier_openrouter_key', e.target.value);
                  }}
                  placeholder="sk-or-v1-..."
                  className="w-full bg-[#090a0f] border border-white/10 rounded-lg px-2.5 py-1.5 text-neutral-200 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-neutral-300 font-mono mb-1">
                  NVIDIA NIM API KEY
                </label>
                <input
                  type="password"
                  value={customNvidiaKey}
                  onChange={(e) => {
                    setCustomNvidiaKey(e.target.value);
                    localStorage.setItem('atelier_nvidia_key', e.target.value);
                  }}
                  placeholder="nvapi-..."
                  className="w-full bg-[#090a0f] border border-white/10 rounded-lg px-2.5 py-1.5 text-neutral-200 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-neutral-300 font-mono mb-1">
                  HUGGING FACE TOKEN
                </label>
                <input
                  type="password"
                  value={customHuggingFaceKey}
                  onChange={(e) => {
                    setCustomHuggingFaceKey(e.target.value);
                    localStorage.setItem('atelier_hf_key', e.target.value);
                  }}
                  placeholder="hf_..."
                  className="w-full bg-[#090a0f] border border-white/10 rounded-lg px-2.5 py-1.5 text-neutral-200 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
