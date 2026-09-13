import z from "@deepseek-ai/schemastery";
import { WebSearchPlusProvider } from "./provider.js";
import { mapAnthropicResponse } from "./mapper.js";

export const name = "web-search-plus";
export const inject = ["web"];

export const DEFAULT_BASE_URL = "http://100.78.146.24:8317/v1";
export const DEFAULT_MODEL = "gemini-3.7-flash-high";
export const DEFAULT_API_KEY_ENV = "WEB_SEARCH_API_KEY";
export const SETTINGS_NAMESPACE = "web-search-plus";

export const Config = z.object({
  apiKey: z.string().role("secret").description("Optional literal API key"),
  apiKeyEnv: z.string().role("credential-ref").default(DEFAULT_API_KEY_ENV).description("Environment variable name for API key"),
  baseURL: z.string().default(DEFAULT_BASE_URL).description("Base URL for Anthropic-compatible Messages endpoint"),
  model: z.string().default(DEFAULT_MODEL).description("Model name used for executing the search turn"),
  apiVersion: z.string().default("2023-06-01").description("anthropic-version header"),
  maxTokens: z.number().step(1).min(1).default(8192).description("Max tokens to generate for search summary"),
  maxUses: z.number().step(1).min(1).default(8).description("Max web_search tool uses per query"),
});

function resolveOptions(ctx, config = {}) {
  return {
    apiKey: config.apiKey,
    apiKeyEnv: config.apiKeyEnv || DEFAULT_API_KEY_ENV,
    baseURL: config.baseURL || process.env.WEB_SEARCH_BASE_URL || process.env.CPA_BASE_URL || DEFAULT_BASE_URL,
    model: config.model || process.env.WEB_SEARCH_MODEL || DEFAULT_MODEL,
    apiVersion: config.apiVersion || "2023-06-01",
    maxTokens: config.maxTokens || 8192,
    maxUses: config.maxUses || 8,
    resolveApiKey: async () => {
      const credentials = ctx.get?.("credentials");
      if (credentials) {
        const cred = await credentials.resolve(config.apiKeyEnv || DEFAULT_API_KEY_ENV);
        if (cred?.value) return cred.value;
      }
      return undefined;
    },
    recordRequest: (req) => {
      ctx.get?.("agents")?.currentInitiator?.()?.session?.append("web/search-plus-llm-request", req);
    },
  };
}

export function apply(ctx, config = {}) {
  let current = () => config;

  if (ctx.inject) {
    ctx.inject(["settings"], (settingsCtx) => {
      settingsCtx.settings.installSection(ctx, SETTINGS_NAMESPACE, Config, config, {
        setSource: (source) => {
          current = source;
        },
        onChange: () => {},
      });
    });
  }

  const provider = new WebSearchPlusProvider(() => resolveOptions(ctx, current()));
  ctx.web.registerSearchProvider(provider);
}

export { WebSearchPlusProvider, mapAnthropicResponse };
