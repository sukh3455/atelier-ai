import React, { useState } from 'react';
import { 
  ArrowLeft, Search, Zap, Eye, Sparkles, Brain, 
  Cpu, Check, Filter
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

export default function ModelsDirectory({ activeModelId, onSelectModel, onBackToChat }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApi, setSelectedApi] = useState('All');

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
      <div className="mb-6 pb-4 border-b border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
              Zero Paid Models
            </span>
          </div>
          <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
            1–2 line guide: Every model below is 100% free with zero credit requirements.
          </p>
        </div>

        {/* Quick Back to Chat button */}
        <button
          onClick={onBackToChat}
          className="self-start sm:self-center px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white transition-colors"
        >
          Return to Canvas
        </button>
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

      {/* Grid of Model Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {filteredModels.map((model) => {
          const Icon = model.icon;
          const isActive = activeModelId === model.id;

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
