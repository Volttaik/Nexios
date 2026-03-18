'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';

export interface AIModel {
  id: string;
  name: string;
  description: string;
  supportsImages: boolean;
  supportsCode: boolean;
  free?: boolean;
}

export interface AIProvider {
  id: string;
  name: string;
  shortName: string;
  color: string;
  bgGradient: string;
  apiKeyPlaceholder: string;
  models: AIModel[];
  icon: string;
  isFree?: boolean;
  freeNote?: string;
}

export const AI_PROVIDERS: AIProvider[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    shortName: 'Gemini',
    color: '#4285F4',
    bgGradient: 'from-blue-500 to-cyan-500',
    apiKeyPlaceholder: 'AIza...',
    icon: 'G',
    models: [
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Most capable, deep reasoning', supportsImages: true, supportsCode: true },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Fast & highly capable', supportsImages: true, supportsCode: true },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Fastest, multimodal', supportsImages: true, supportsCode: true },
      { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite', description: 'Ultra-fast, free tier', supportsImages: true, supportsCode: true, free: true },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Fast & efficient', supportsImages: true, supportsCode: true },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Stable & powerful', supportsImages: true, supportsCode: true },
    ],
  },
  {
    id: 'groq',
    name: 'Groq (Free)',
    shortName: 'Groq',
    color: '#F55036',
    bgGradient: 'from-red-500 to-orange-500',
    apiKeyPlaceholder: 'gsk_...',
    icon: 'Gq',
    isFree: true,
    freeNote: 'Free tier with generous limits — get key at console.groq.com',
    models: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', description: 'Most capable Llama', supportsImages: false, supportsCode: true, free: true },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', description: 'Ultra-fast responses', supportsImages: false, supportsCode: true, free: true },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', description: 'Great for reasoning', supportsImages: false, supportsCode: true, free: true },
      { id: 'gemma2-9b-it', name: 'Gemma 2 9B', description: "Google's open model", supportsImages: false, supportsCode: true, free: true },
      { id: 'llama-3.2-11b-vision-preview', name: 'Llama 3.2 11B Vision', description: 'Vision capable', supportsImages: true, supportsCode: true, free: true },
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    shortName: 'OpenAI',
    color: '#10A37F',
    bgGradient: 'from-emerald-500 to-teal-500',
    apiKeyPlaceholder: 'sk-...',
    icon: 'OA',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', description: 'Most capable, multimodal', supportsImages: true, supportsCode: true },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast & affordable', supportsImages: true, supportsCode: true },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Powerful & fast', supportsImages: true, supportsCode: true },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Fast & cheap', supportsImages: false, supportsCode: true },
    ],
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    shortName: 'Claude',
    color: '#CC785C',
    bgGradient: 'from-orange-400 to-rose-500',
    apiKeyPlaceholder: 'sk-ant-...',
    icon: 'Cl',
    models: [
      { id: 'claude-opus-4-5', name: 'Claude Opus 4.5', description: 'Most intelligent', supportsImages: true, supportsCode: true },
      { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5', description: 'Best balance', supportsImages: true, supportsCode: true },
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'Great intelligence', supportsImages: true, supportsCode: true },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', description: 'Fast & efficient', supportsImages: true, supportsCode: true },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: 'Lightweight', supportsImages: true, supportsCode: true },
    ],
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    shortName: 'Mistral',
    color: '#FF7000',
    bgGradient: 'from-orange-500 to-amber-500',
    apiKeyPlaceholder: 'your-mistral-key',
    icon: 'Mi',
    models: [
      { id: 'mistral-large-latest', name: 'Mistral Large', description: 'Most powerful', supportsImages: false, supportsCode: true },
      { id: 'mistral-small-latest', name: 'Mistral Small', description: 'Fast & efficient', supportsImages: false, supportsCode: true },
      { id: 'codestral-latest', name: 'Codestral', description: 'Code specialist', supportsImages: false, supportsCode: true },
    ],
  },
  {
    id: 'xai',
    name: 'xAI Grok',
    shortName: 'Grok',
    color: '#1DA1F2',
    bgGradient: 'from-sky-500 to-blue-600',
    apiKeyPlaceholder: 'xai-...',
    icon: 'Xg',
    models: [
      { id: 'grok-3', name: 'Grok 3', description: 'Most capable Grok', supportsImages: false, supportsCode: true },
      { id: 'grok-3-mini', name: 'Grok 3 Mini', description: 'Fast & efficient', supportsImages: false, supportsCode: true },
      { id: 'grok-2-vision-1212', name: 'Grok 2 Vision', description: 'Vision + code', supportsImages: true, supportsCode: true },
      { id: 'grok-2-1212', name: 'Grok 2', description: 'Previous generation', supportsImages: false, supportsCode: true },
    ],
  },
  {
    id: 'replit',
    name: 'Replit Agent',
    shortName: 'Replit',
    color: '#F26207',
    bgGradient: 'from-orange-500 to-amber-400',
    apiKeyPlaceholder: 'sk-ant-... (Anthropic key)',
    icon: 'R',
    isFree: false,
    freeNote: 'Uses your Anthropic API key — same model that powers Replit Agent',
    models: [
      { id: 'claude-sonnet-4-5', name: 'Replit Agent 4 (Sonnet)', description: 'Powers Replit Agent — fast & smart', supportsImages: true, supportsCode: true },
      { id: 'claude-opus-4-5', name: 'Replit Agent 4 (Opus)', description: 'Maximum intelligence', supportsImages: true, supportsCode: true },
      { id: 'claude-3-5-sonnet-20241022', name: 'Replit Agent 3.5', description: 'Previous generation', supportsImages: true, supportsCode: true },
      { id: 'claude-3-5-haiku-20241022', name: 'Replit Agent 3.5 Haiku', description: 'Lightweight & fast', supportsImages: true, supportsCode: true },
    ],
  },
];

export interface AIProviderConfig {
  apiKey: string;
  selectedModel: string;
  enabled: boolean;
}

export interface AISettings {
  activeProvider: string;
  providers: Record<string, AIProviderConfig>;
}

const DEFAULT_SETTINGS: AISettings = {
  activeProvider: 'gemini',
  providers: {
    gemini: { apiKey: '', selectedModel: 'gemini-2.0-flash', enabled: true },
    groq: { apiKey: '', selectedModel: 'llama-3.3-70b-versatile', enabled: false },
    openai: { apiKey: '', selectedModel: 'gpt-4o', enabled: false },
    anthropic: { apiKey: '', selectedModel: 'claude-3-5-sonnet-20241022', enabled: false },
    mistral: { apiKey: '', selectedModel: 'mistral-large-latest', enabled: false },
    xai: { apiKey: '', selectedModel: 'grok-3', enabled: false },
    replit: { apiKey: '', selectedModel: 'claude-sonnet-4-5', enabled: false },
  },
};

interface AIContextType {
  settings: AISettings;
  activeProvider: AIProvider;
  activeModel: AIModel;
  updateSettings: (s: Partial<AISettings>) => void;
  updateProviderConfig: (providerId: string, config: Partial<AIProviderConfig>) => void;
  setActiveProvider: (providerId: string) => void;
  setActiveModel: (modelId: string) => void;
  getApiKey: (providerId: string) => string;
  quotaError: string | null;
  setQuotaError: (err: string | null) => void;
}

const AIContext = createContext<AIContextType>({} as AIContextType);

export function AIProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AISettings>(DEFAULT_SETTINGS);
  const [quotaError, setQuotaError] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('nexios-ai-settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings({
          ...DEFAULT_SETTINGS,
          ...parsed,
          providers: { ...DEFAULT_SETTINGS.providers, ...parsed.providers },
        });
      } catch { /* ignore */ }
    }
  }, []);

  const updateSettings = useCallback((partial: Partial<AISettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...partial };
      localStorage.setItem('nexios-ai-settings', JSON.stringify(next));
      return next;
    });
  }, []);

  const updateProviderConfig = useCallback((providerId: string, config: Partial<AIProviderConfig>) => {
    setSettings(prev => {
      const next = {
        ...prev,
        providers: { ...prev.providers, [providerId]: { ...prev.providers[providerId], ...config } },
      };
      localStorage.setItem('nexios-ai-settings', JSON.stringify(next));
      return next;
    });
  }, []);

  const setActiveProvider = useCallback((providerId: string) => {
    setSettings(prev => {
      const next = {
        ...prev,
        activeProvider: providerId,
        providers: {
          ...prev.providers,
          [providerId]: { ...(prev.providers[providerId] || { apiKey: '', selectedModel: AI_PROVIDERS.find(p => p.id === providerId)?.models[0]?.id || '', enabled: true }), enabled: true },
        },
      };
      localStorage.setItem('nexios-ai-settings', JSON.stringify(next));
      return next;
    });
    setQuotaError(null);
  }, []);

  const setActiveModel = useCallback((modelId: string) => {
    setSettings(prev => {
      const next = {
        ...prev,
        providers: {
          ...prev.providers,
          [prev.activeProvider]: { ...prev.providers[prev.activeProvider], selectedModel: modelId },
        },
      };
      localStorage.setItem('nexios-ai-settings', JSON.stringify(next));
      return next;
    });
  }, []);

  const getApiKey = (providerId: string): string => {
    const userKey = settings.providers[providerId]?.apiKey;
    if (userKey && userKey.trim()) return userKey.trim();
    if (providerId === 'gemini') return process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
    if (providerId === 'openai') return process.env.NEXT_PUBLIC_OPENAI_API_KEY || '';
    return '';
  };

  const activeProvider = AI_PROVIDERS.find(p => p.id === settings.activeProvider) || AI_PROVIDERS[0];
  const activeProviderConfig = settings.providers[settings.activeProvider] || DEFAULT_SETTINGS.providers.gemini;
  const activeModel = activeProvider.models.find(m => m.id === activeProviderConfig.selectedModel) || activeProvider.models[0];

  return (
    <AIContext.Provider value={{
      settings, activeProvider, activeModel,
      updateSettings, updateProviderConfig, setActiveProvider, setActiveModel, getApiKey,
      quotaError, setQuotaError,
    }}>
      {children}
    </AIContext.Provider>
  );
}

export const useAI = () => useContext(AIContext);
