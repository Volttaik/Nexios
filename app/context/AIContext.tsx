'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';

export interface AIModel {
  id: string;
  name: string;
  description: string;
  supportsImages: boolean;
  supportsCode: boolean;
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
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Fastest, multimodal', supportsImages: true, supportsCode: true },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Fast & efficient', supportsImages: true, supportsCode: true },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Most capable', supportsImages: true, supportsCode: true },
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    shortName: 'OpenAI',
    color: '#10A37F',
    bgGradient: 'from-emerald-500 to-teal-500',
    apiKeyPlaceholder: 'sk-...',
    icon: 'AI',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', description: 'Most capable', supportsImages: true, supportsCode: true },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast & affordable', supportsImages: true, supportsCode: true },
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
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'Best intelligence', supportsImages: true, supportsCode: true },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: 'Fast & light', supportsImages: true, supportsCode: true },
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
    openai: { apiKey: '', selectedModel: 'gpt-4o', enabled: false },
    anthropic: { apiKey: '', selectedModel: 'claude-3-5-sonnet-20241022', enabled: false },
    mistral: { apiKey: '', selectedModel: 'mistral-large-latest', enabled: false },
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
}

const AIContext = createContext<AIContextType>({} as AIContextType);

export function AIProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AISettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const saved = localStorage.getItem('nexios-ai-settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed, providers: { ...DEFAULT_SETTINGS.providers, ...parsed.providers } });
      } catch { /* ignore */ }
    }
  }, []);

  const saveSettings = (s: AISettings) => {
    setSettings(s);
    localStorage.setItem('nexios-ai-settings', JSON.stringify(s));
  };

  const updateSettings = useCallback((partial: Partial<AISettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...partial };
      localStorage.setItem('nexios-ai-settings', JSON.stringify(next));
      return next;
    });
  }, []);

  const updateProviderConfig = useCallback((providerId: string, config: Partial<AIProviderConfig>) => {
    setSettings(prev => {
      const next = { ...prev, providers: { ...prev.providers, [providerId]: { ...prev.providers[providerId], ...config } } };
      localStorage.setItem('nexios-ai-settings', JSON.stringify(next));
      return next;
    });
  }, []);

  const setActiveProvider = useCallback((providerId: string) => {
    setSettings(prev => {
      const next = { ...prev, activeProvider: providerId, providers: { ...prev.providers, [providerId]: { ...prev.providers[providerId], enabled: true } } };
      localStorage.setItem('nexios-ai-settings', JSON.stringify(next));
      return next;
    });
  }, []);

  const setActiveModel = useCallback((modelId: string) => {
    setSettings(prev => {
      const next = { ...prev, providers: { ...prev.providers, [prev.activeProvider]: { ...prev.providers[prev.activeProvider], selectedModel: modelId } } };
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
    <AIContext.Provider value={{ settings, activeProvider, activeModel, updateSettings, updateProviderConfig, setActiveProvider, setActiveModel, getApiKey }}>
      {children}
    </AIContext.Provider>
  );
}

export const useAI = () => useContext(AIContext);
