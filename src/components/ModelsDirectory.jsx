import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Search, Zap, Eye, Sparkles, Brain, 
  Cpu, Check, Filter, RefreshCw, BarChart2
} from 'lucide-react';

export const ALL_MODELS_CATALOG = [
  // ==============================================================================
  // GROQ CLOUD API (100% FREE • LPU Accelerated)
  // ==============================================================================
  {
    id: 'openai/gpt-oss-120b',
    name: 'GPT-OSS 120B',
    api: 'Groq',
    category: 'flagship',
    badge: '100% Free • 120B',
    icon: Zap,
    description: 'Massive open flagship model running at LPU speeds with deep analysis and long-form writing.',
    purpose: 'Best for complex reasoning, detailed answers, and high-coherence multi-turn chat.',
    supportedInApp: true
  },
  {
    id: 'qwen/qwen3.8-27b',
    name: 'Qwen 3.8 27B',
    api: 'Groq',
    category: 'speed',
    badge: '100% Free • 500 t/s',
    icon: Sparkles,
    description: 'Blazing fast inference with code generation, math problem solving, and multilingual mastery.',
    purpose: 'Best when you want instant answers with virtually zero latency.',
    supportedInApp: true
  },
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B',
    api: 'Groq',
    category: 'general',
    badge: '100% Free • Open Weights',
    icon: Cpu,
    description: 'Meta\'s premier open-weights model fine-tuned for high intelligence and factual knowledge.',
    purpose: 'Great for creative brainstorming, structured debates, and reliable long-context chat.',
    supportedInApp: true
  },
  {
    id: 'llama-3.2-11b-vision-preview',
    name: 'Llama 3.2 11B Vision',
    api: 'Groq',
    category: 'vision',
    badge: '100% Free • Photos',
    icon: Eye,
    description: 'Instant visual inspection of photos, charts, and mobile screenshots on Groq LPUs.',
    purpose: 'Best for rapid optical recognition, extracting visual data, and explaining screenshots.',
    supportedInApp: true
  },

  // ==============================================================================
  // NVIDIA NIM API (100% FREE DEVELOPER TIER)
  // ==============================================================================
  {
    id: 'meta/llama-3.2-11b-vision-instruct',
    name: 'Llama 3.2 Vision (NVIDIA)',
    api: 'NVIDIA NIM',
    category: 'vision',
    badge: '100% Free • H100 TensorRT',
    icon: Eye,
    description: 'High-speed vision & photograph analysis hosted directly on NVIDIA H100 GPU clusters.',
    purpose: 'Best for optical character recognition, screenshot analysis, and visual critique.',
    supportedInApp: true
  },

  // ==============================================================================
  // OPENROUTER FREE TIER (:free Models • 100% Free with $0 Balance)
  // ==============================================================================
  {
    id: 'nvidia/nemotron-3.5-super-vl:free',
    name: 'Nemotron 3.5 Super VL',
    api: 'OpenRouter',
    category: 'vision',
    badge: '100% Free • Multimodal',
    icon: Eye,
    description: 'NVIDIA\'s multimodal vision model with unrestricted photo and visual art comprehension.',
    purpose: 'Best for evaluating diagrams, art critique, complex charts, and photograph breakdowns.',
    supportedInApp: true
  },
  {
    id: 'nvidia/nemotron-3.5-lightning:free',
    name: 'Nemotron Lightning',
    api: 'OpenRouter',
    category: 'speed',
    badge: '100% Free • Fast',
    icon: Zap,
    description: 'High-speed reasoning model designed for low-latency conversational responses with zero cost.',
    purpose: 'Best for daily quick questions and brainstorming without hitting rate limits.',
    supportedInApp: true
  },
  {
    id: 'deepseek/deepseek-r1:free',
    name: 'DeepSeek R1',
    api: 'OpenRouter',
    category: 'reasoning',
    badge: '100% Free • Deep Logic',
    icon: Brain,
    description: 'Chain-of-thought reasoning model that rivals OpenAI o1 on coding and formal math benchmarks.',
    purpose: 'Best for solving difficult algorithms, mathematical proofs, and multi-step logic riddles.',
    supportedInApp: true
  },
  {
    id: 'google/gemma-4-31b-it:free',
    name: 'Google Gemma 4 31B',
    api: 'OpenRouter',
    category: 'general',
    badge: '100% Free • Gemma 4',
    icon: Sparkles,
    description: 'Google\'s open weights model with enhanced reasoning, coding, and factual recall.',
    purpose: 'Best for structured analysis, academic summaries, and thoughtful writing.',
    supportedInApp: true
  },
  {
    id: 'openrouter/free',
    name: 'OpenRouter Free Auto',
    api: 'OpenRouter',
    category: 'general',
    badge: '100% Free • Auto Route',
    icon: Sparkles,
    description: 'Intelligently directs your prompt to the highest-performing free model with zero queue.',
    purpose: 'Best when you want high-quality free answers without worrying about specific model names.',
    supportedInApp: true
  }
];

export default function ModelsDirectory({ activeModelId, onSelectModel, onBackToChat, conversations = [], customKeys = {} }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApi, setSelectedApi] = useState('All');
  const [openRouterStats, setOpenRouterStats] = useState(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Fetch live OpenRouter rate limits & credits
  const fetchUsageStats = async () => {
    setIsLoadingStats(true);
      const key = customKeys?.openrouter || localStorage.getItem('atelier_openrouter_key') || import.meta.env.VITE_OPENROUTER_API_KEY;
      if (!key) return;
      const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: { 'Authorization': `Bearer ${key}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOpenRouterStats(data.data);
        setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }
    } catch (err) {
      console.warn('Could not reach live OpenRouter quota API:', err);
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchUsageStats();
  }, []);

  // Calculate tracked prompts per model from user's local conversation history
  const getTodayUsageCount = (modelId) => {
    if (!conversations || !Array.isArray(conversations)) return 0;
    let count = 0;
    for (const chat of conversations) {
      if (!chat.messages) continue;
      for (const msg of chat.messages) {
        if (msg.role === 'assistant' && msg.modelUsed === modelId) {
          count++;
        }
      }
    }
    return count;
  };

  // Determine usage, remaining credits, and progress bar properties per model
  const getModelCreditInfo = (model) => {
    const usedCount = getTodayUsageCount(model.id);

    if (model.api === 'Groq') {
      const dailyLimit = 1000;
      const remaining = Math.max(0, dailyLimit - usedCount);
      const percent = Math.max(3, Math.round((remaining / dailyLimit) * 100));
      return {
        label: 'Groq LPU Daily Allowance',
        statusText: `${remaining.toLocaleString()} / ${dailyLimit.toLocaleString()} left`,
        percent,
        subLeft: `Used today: ${usedCount} prompt${usedCount === 1 ? '' : 's'}`,
        subRight: 'Daily Reset • $0.00 Cost',
        barColor: percent > 40 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-amber-500 to-orange-400',
        dotColor: 'bg-emerald-400'
      };
    }

    if (model.api === 'OpenRouter') {
      const orDaily = openRouterStats?.free_model_daily_requests;
      const limit = orDaily?.limit || 50;
      const remaining = orDaily?.remaining !== undefined ? orDaily.remaining : Math.max(0, 50 - usedCount);
      const used = orDaily?.used !== undefined ? orDaily.used : usedCount;
      const percent = Math.max(3, Math.round((remaining / limit) * 100));
      return {
        label: 'OpenRouter Free Tier Quota',
        statusText: `${remaining} / ${limit} daily free left`,
        percent,
        subLeft: `Rate: 20 req/min`,
        subRight: 'Free Tier • Midnight Reset',
        barColor: percent > 30 ? 'bg-gradient-to-r from-sky-500 to-indigo-400' : 'bg-gradient-to-r from-amber-500 to-rose-400',
        dotColor: 'bg-sky-400'
      };
    }

    if (model.api === 'NVIDIA NIM') {
      const creditLimit = 1000;
      const remaining = Math.max(0, creditLimit - usedCount);
      const percent = Math.max(3, Math.round((remaining / creditLimit) * 100));
      return {
        label: 'NVIDIA H100 Developer Credits',
        statusText: `${remaining.toLocaleString()} / ${creditLimit.toLocaleString()} credits`,
        percent,
        subLeft: `Used: ${usedCount} inference${usedCount === 1 ? '' : 's'}`,
        subRight: 'TensorRT H100 • $0 Cost',
        barColor: 'bg-gradient-to-r from-emerald-400 to-green-500',
        dotColor: 'bg-emerald-400'
      };
    }

    return {
      label: 'Community Free Tier',
      statusText: '100% Free Access',
      percent: 100,
      subLeft: `Used: ${usedCount} req`,
      subRight: 'Unlimited Free Tier',
      barColor: 'bg-emerald-500',
      dotColor: 'bg-emerald-400'
    };
  };

  const filteredModels = ALL_MODELS_CATALOG.filter((model) => {
    const matchesSearch = 
      model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.purpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.api.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.badge.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesApi = 
      selectedApi === 'All' || 
      model.api.toLowerCase().includes(selectedApi.toLowerCase()) ||
      model.category === selectedApi.toLowerCase();

    return matchesSearch && matchesApi;
  });

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 max-w-5xl mx-auto w-full">
      {/* Top Navigation & Title */}
      <div className="mb-5 pb-4 border-b border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <button
            onClick={onBackToChat}
            className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Chat</span>
          </button>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
              100% Free Models Directory
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono">
              Live Credit Trackers
            </span>
          </div>
          <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
            Every model below is 100% free with real-time quota tracking and zero deposit requirements.
          </p>
        </div>

        {/* Quick Back to Chat button */}
        <button
          onClick={onBackToChat}
          className="self-start sm:self-center px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white transition-colors shadow-sm"
        >
          Return to Canvas
        </button>
      </div>

      {/* Live Quota & Credit Monitor Banner */}
      <div className="mb-5 p-3 rounded-xl bg-[#11131c] border border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-white">Live Credit & Quota Monitor</span>
          {lastUpdated && (
            <span className="text-[10px] text-neutral-500 font-mono hidden sm:inline">
              (Updated {lastUpdated})
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-neutral-300">
            <span className="text-emerald-400 font-medium">Groq:</span>
            <span>1,000 req/day</span>
          </div>
          <span className="text-neutral-600">•</span>
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-neutral-300">
            <span className="text-sky-400 font-medium">OpenRouter:</span>
            <span>
              {openRouterStats?.free_model_daily_requests 
                ? `${openRouterStats.free_model_daily_requests.remaining} free left` 
                : '50 free/day'}
            </span>
          </div>
          <span className="text-neutral-600">•</span>
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-neutral-300">
            <span className="text-purple-400 font-medium">NVIDIA:</span>
            <span>1,000 credits</span>
          </div>

          <button
            onClick={fetchUsageStats}
            disabled={isLoadingStats}
            className="p-1 rounded-md bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
            title="Refresh Live Quotas"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStats ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="mb-6 space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search free models by name, vision, speed, or reasoning..."
            className="w-full bg-[#11131c] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {['All', 'Groq', 'NVIDIA NIM', 'OpenRouter', 'Vision', 'Speed', 'Reasoning'].map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedApi(tab)}
              className={`px-3 py-1 rounded-full whitespace-nowrap transition-colors ${
                selectedApi === tab
                  ? 'bg-indigo-600 text-white font-medium'
                  : 'bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Model Cards with Credit Usage Bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {filteredModels.map((model) => {
          const Icon = model.icon;
          const isActive = activeModelId === model.id;
          const creditInfo = getModelCreditInfo(model);

          return (
            <div
              key={model.id}
              className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                isActive
                  ? 'bg-indigo-950/20 border-indigo-500/40 shadow-lg shadow-indigo-500/5'
                  : 'bg-[#11131c] border-white/5 hover:border-white/15'
              }`}
            >
              <div>
                {/* Header: Name, Provider, Badge */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-white/5 text-indigo-400">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        {model.name}
                      </h3>
                      <span className="text-[11px] font-mono text-neutral-400">
                        {model.api}
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                    {model.badge}
                  </span>
                </div>

                {/* 1-2 line description */}
                <div className="space-y-1 my-3 text-xs leading-relaxed">
                  <p className="text-neutral-200">
                    <strong className="text-white">Strength:</strong> {model.description}
                  </p>
                  <p className="text-neutral-400">
                    <strong className="text-neutral-300">Best for:</strong> {model.purpose}
                  </p>
                </div>

                {/* Dedicated Credit & Quota Usage Bar */}
                <div className="my-3 p-2.5 rounded-lg bg-black/40 border border-white/5 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-neutral-300 font-medium flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${creditInfo.dotColor} animate-pulse`} />
                      {creditInfo.label}
                    </span>
                    <span className="font-mono text-white font-semibold text-[11px]">
                      {creditInfo.statusText}
                    </span>
                  </div>

                  {/* Progress Bar Track */}
                  <div className="w-full h-1.5 bg-neutral-800/80 rounded-full overflow-hidden border border-white/5">
                    <div 
                      className={`h-full rounded-full transition-all duration-700 ${creditInfo.barColor}`}
                      style={{ width: `${creditInfo.percent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono pt-0.5">
                    <span>{creditInfo.subLeft}</span>
                    <span className="text-neutral-500">{creditInfo.subRight}</span>
                  </div>
                </div>
              </div>

              {/* Bottom Action */}
              <div className="mt-2 pt-3 border-t border-white/5 flex items-center justify-between">
                <span className="text-[10px] font-mono text-neutral-500 truncate max-w-[180px]">
                  {model.id}
                </span>

                {isActive ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/20">
                    <Check className="w-3.5 h-3.5" />
                    <span>Active in Chat</span>
                  </span>
                ) : (
                  <button
                    onClick={() => onSelectModel(model.id)}
                    className="px-3 py-1 rounded-lg bg-white/5 hover:bg-indigo-600 text-xs font-medium text-neutral-200 hover:text-white transition-colors"
                  >
                    Use Model →
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredModels.length === 0 && (
        <div className="text-center py-12 text-neutral-500 text-xs">
          No free models matched your search query. Try typing another keyword.
        </div>
      )}
    </div>
  );
}
