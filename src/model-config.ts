import fs from 'fs';
import path from 'path';

import { DATA_DIR } from './config.js';

export interface ModelEntry {
  id: string;
  name: string;
  provider: 'anthropic' | 'openrouter';
}

// ─── Anthropic models ─────────────────────────────────────────────────────────
export const ANTHROPIC_MODELS: ModelEntry[] = [
  { id: 'claude-sonnet-4-6',          name: 'Sonnet 4.6', provider: 'anthropic' },
  { id: 'claude-opus-4-6',            name: 'Opus 4.6',   provider: 'anthropic' },
  { id: 'claude-haiku-4-5-20251001',  name: 'Haiku 4.5',  provider: 'anthropic' },
];

// ─── OpenRouter models ────────────────────────────────────────────────────────
// Add any model from https://openrouter.ai/models — copy the Model ID from
// the model's page and add an entry here. Uncomment to enable.
export const OPENROUTER_MODELS: ModelEntry[] = [
  // { id: 'openai/gpt-4o',                          name: 'GPT-4o',           provider: 'openrouter' },
  // { id: 'openai/gpt-4o-mini',                     name: 'GPT-4o Mini',      provider: 'openrouter' },
  // { id: 'google/gemini-2.0-flash-exp:free',        name: 'Gemini 2.0 Flash', provider: 'openrouter' },
  // { id: 'meta-llama/llama-3.3-70b-instruct',       name: 'Llama 3.3 70B',   provider: 'openrouter' },
  // { id: 'deepseek/deepseek-r1',                    name: 'DeepSeek R1',      provider: 'openrouter' },
];

// ─────────────────────────────────────────────────────────────────────────────

export const ALL_MODELS: ModelEntry[] = [...ANTHROPIC_MODELS, ...OPENROUTER_MODELS];

export interface ModelConfig {
  conversationModel: ModelEntry;
  cronModel: ModelEntry;
}

const CONFIG_PATH = path.join(DATA_DIR, 'model-config.json');

export const DEFAULT_CONFIG: ModelConfig = {
  conversationModel: ANTHROPIC_MODELS[0], // Sonnet 4.6
  cronModel:         ANTHROPIC_MODELS[2], // Haiku 4.5
};

export function readModelConfig(): ModelConfig {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return DEFAULT_CONFIG;
    const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    return {
      conversationModel: raw.conversationModel ?? DEFAULT_CONFIG.conversationModel,
      cronModel:         raw.cronModel         ?? DEFAULT_CONFIG.cronModel,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function writeModelConfig(config: ModelConfig): void {
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

/**
 * Returns the env vars to inject into the container for model selection.
 * For OpenRouter models: overrides ANTHROPIC_BASE_URL and ANTHROPIC_API_KEY,
 * and clears CLAUDE_CODE_OAUTH_TOKEN so the API key takes precedence.
 */
export function buildModelEnv(
  config: ModelConfig,
  isScheduledTask: boolean,
  openrouterKey?: string,
): Record<string, string> {
  const model = isScheduledTask ? config.cronModel : config.conversationModel;

  if (model.provider === 'openrouter') {
    if (!openrouterKey) {
      // No OpenRouter key configured — fall back to Anthropic default
      return { ANTHROPIC_MODEL: DEFAULT_CONFIG.conversationModel.id };
    }
    return {
      ANTHROPIC_MODEL:          model.id,
      ANTHROPIC_BASE_URL:       'https://openrouter.ai/api/v1',
      ANTHROPIC_API_KEY:        openrouterKey,
      CLAUDE_CODE_OAUTH_TOKEN:  '', // disable oauth so API key takes precedence
    };
  }

  return { ANTHROPIC_MODEL: model.id };
}
