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
    id: 'nexios',
    name: 'Nexios AI',
    shortName: 'Nexios',
    color: '#818cf8',
    bgGradient: 'from-indigo-500 to-violet-600',
    apiKeyPlaceholder: 'No key needed — runs locally',
    icon: 'N',
    isFree: true,
    freeNote: 'Built-in AI powered by state-of-the-art models — no API key required.',
    models: [
      { id: 'nexios-core', name: 'Nexios Core', description: 'Fast & intelligent — powered by Claude Sonnet', supportsImages: false, supportsCode: true, free: true },
      { id: 'nexios-ultra', name: 'Nexios Ultra', description: 'Maximum intelligence — powered by Claude Opus', supportsImages: false, supportsCode: true, free: true },
      { id: 'nexios-flash', name: 'Nexios Flash', description: 'Ultra-fast responses — powered by Claude Haiku', supportsImages: false, supportsCode: true, free: true },
      { id: 'nexios-gpt', name: 'Nexios GPT', description: 'GPT-5.2 powered responses', supportsImages: false, supportsCode: true, free: true },
      { id: 'nexios-gpt-pro', name: 'Nexios GPT Pro', description: 'GPT-5.2 Pro — maximum capability', supportsImages: false, supportsCode: true, free: true },
      { id: 'nexios-gemini', name: 'Nexios Gemini', description: 'Google Gemini 3.1 Pro powered', supportsImages: false, supportsCode: true, free: true },
      { id: 'nexios-grok', name: 'Nexios Grok', description: 'Grok 4 powered responses', supportsImages: false, supportsCode: true, free: true },
      { id: 'nexios-deepseek', name: 'Nexios DeepSeek', description: 'DeepSeek V3.2 powered', supportsImages: false, supportsCode: true, free: true },
      { id: 'nexios-reasoning', name: 'Nexios Reasoning', description: 'Advanced reasoning — powered by o4-mini', supportsImages: false, supportsCode: true, free: true },
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
  activeProvider: 'nexios',
  providers: {
    nexios: { apiKey: '', selectedModel: 'nexios-core', enabled: true },
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
        // Migrate: always ensure activeProvider is nexios
        const mergedProviders = { ...DEFAULT_SETTINGS.providers, ...parsed.providers };
        setSettings({
          ...DEFAULT_SETTINGS,
          ...parsed,
          activeProvider: 'nexios',
          providers: mergedProviders,
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

  const setActiveProvider = useCallback((_providerId: string) => {
    // Always nexios — single provider
    setSettings(prev => {
      const next = { ...prev, activeProvider: 'nexios' };
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
          nexios: { ...prev.providers.nexios, selectedModel: modelId },
        },
      };
      localStorage.setItem('nexios-ai-settings', JSON.stringify(next));
      return next;
    });
  }, []);

  const getApiKey = (_providerId: string): string => {
    // Nexios doesn't need API keys — everything goes through OpenClaw backend
    return 'nexios-local';
  };

  const activeProvider = AI_PROVIDERS[0]; // Always Nexios
  const activeProviderConfig = settings.providers.nexios || DEFAULT_SETTINGS.providers.nexios;
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
