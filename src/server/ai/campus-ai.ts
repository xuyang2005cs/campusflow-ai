import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { createModels, type AuthEvent, type AuthPrompt, type MutableModels, type Tool } from '@earendil-works/pi-ai';
import { openaiProvider } from '@earendil-works/pi-ai/providers/openai';
import { FileCredentialStore } from './file-credential-store.js';
import { getOrCreateInstallationId } from './installation-id.js';
import { ExtractionResultSchema, validateExtractionResult } from './extraction-schema.js';
import { extractionPrompt } from './prompts/extract-campus-items.js';
import type { ExtractedItem } from '../../shared/types.js';

export interface AiStatus {
  connected: boolean;
  provider: 'openai';
  authLabel: 'Sign in with ChatGPT';
  planLabel: '使用 ChatGPT 计划';
  model: string | null;
  loginState: 'idle' | 'waiting' | 'connected' | 'failed';
  message: string | null;
}

const submitTool: Tool = {
  name: 'submit_extracted_items',
  description: '提交从校园通知中提取并标准化的行动项。',
  parameters: ExtractionResultSchema,
  constrainedSampling: { type: 'json_schema', strict: 'prefer' },
};

export class CampusAi {
  private readonly models: MutableModels;
  private readonly installationIdPath: string;
  private loginState: AiStatus['loginState'] = 'idle';
  private loginMessage: string | null = null;
  private authUrl: string | null = null;
  private loginPromise: Promise<void> | null = null;

  constructor(localRoot = resolve('.local')) {
    this.installationIdPath = resolve(localRoot, 'installation-id');
    this.models = createModels({ credentials: new FileCredentialStore(resolve(localRoot, 'auth.json')) });
    this.models.setProvider(openaiProvider());
  }

  async status(): Promise<AiStatus> {
    const auth = await this.models.checkAuth('openai').catch(() => undefined);
    const connected = auth?.type === 'oauth';
    if (connected) this.loginState = 'connected';
    const selectedModel = connected ? await this.selectModel() : undefined;
    return {
      connected, provider: 'openai', authLabel: 'Sign in with ChatGPT', planLabel: '使用 ChatGPT 计划',
      model: selectedModel?.id ?? null,
      loginState: connected ? 'connected' : this.loginState,
      message: this.loginMessage,
    };
  }

  async beginLogin(): Promise<{ authUrl: string | null; status: AiStatus }> {
    if (!this.loginPromise) {
      this.loginState = 'waiting'; this.loginMessage = '正在等待 ChatGPT 授权'; this.authUrl = null;
      const deviceId = await getOrCreateInstallationId(this.installationIdPath);
      this.loginPromise = this.models.login('openai', 'oauth', {
        notify: (event) => this.handleAuthEvent(event),
        prompt: async (prompt) => this.handlePrompt(prompt),
      }, { getDeviceId: () => deviceId }).then(() => {
        this.loginState = 'connected'; this.loginMessage = 'ChatGPT 已连接';
      }).catch((error: unknown) => {
        this.loginState = 'failed';
        this.loginMessage = error instanceof Error ? this.friendlyLoginError(error.message) : '授权没有完成，请重试';
      }).finally(() => { this.loginPromise = null; });
      await this.waitForAuthUrl();
    }
    return { authUrl: this.authUrl, status: await this.status() };
  }

  async logout(): Promise<void> {
    await this.models.logout('openai');
    this.loginState = 'idle'; this.loginMessage = null; this.authUrl = null;
  }

  async extract(text: string, localDateTime: string, timezone: string): Promise<ExtractedItem[]> {
    if (!(await this.status()).connected) throw new AiError('AI_NOT_CONNECTED', 'ChatGPT 尚未连接');
    const model = await this.selectModel();
    if (!model) throw new AiError('MODEL_UNAVAILABLE', '当前没有可用的 ChatGPT 模型');
    try {
      const response = await this.models.complete(model, {
        messages: [{ role: 'user', content: extractionPrompt(text, localDateTime, timezone), timestamp: Date.now() }],
        tools: [submitTool],
      });
      const call = response.content.find((block) => block.type === 'toolCall' && block.name === submitTool.name);
      if (!call || call.type !== 'toolCall') throw new Error('模型没有返回结构化结果');
      const parsed = validateExtractionResult(call.arguments);
      return parsed.items.map((item) => ({ ...item, id: randomUUID(), selected: true }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/429|limit|quota|usage/i.test(message)) throw new AiError('USAGE_LIMIT', '已达到当前使用限制，请稍后重试');
      if (/timeout|timed out|abort/i.test(message)) throw new AiError('AI_TIMEOUT', '本次整理超时，请重试');
      if (/schema|结构|tool|format/i.test(message)) throw new AiError('INVALID_AI_RESPONSE', '本次结果格式异常，请重试');
      throw new AiError('AI_REQUEST_FAILED', '本次整理失败，请重试');
    }
  }

  private async selectModel() {
    const models = await this.models.getAvailable('openai');
    return models.find((model) => model.input.includes('text')) ?? models[0];
  }

  private handleAuthEvent(event: AuthEvent): void {
    if (event.type === 'auth_url') this.authUrl = event.url;
    if (event.type === 'progress' || event.type === 'info') this.loginMessage = event.message;
  }

  private async handlePrompt(prompt: AuthPrompt): Promise<string> {
    if (prompt.type === 'manual_code') {
      this.loginMessage = '请在已打开的 OpenAI 页面完成授权';
      return await new Promise<string>((_resolve, reject) => {
        prompt.signal?.addEventListener('abort', () => reject(new Error('callback completed')), { once: true });
      });
    }
    throw new Error('该授权步骤需要在浏览器中完成');
  }

  private async waitForAuthUrl(): Promise<void> {
    for (let index = 0; index < 30 && !this.authUrl && this.loginState === 'waiting'; index += 1) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  private friendlyLoginError(message: string): string {
    if (/cancel|denied/i.test(message)) return '你已取消 ChatGPT 授权';
    if (/timeout/i.test(message)) return '授权等待超时，请重新连接';
    if (/country|region|territory.+not supported/i.test(message)) return '当前网络区域不支持 OpenAI 凭据交换';
    if (/invalid_client|client.+unavailable/i.test(message)) return 'OpenAI 尚未为当前账号启用此登录客户端';
    const tokenStatus = message.match(/token request failed \((\d{3})\)/i)?.[1];
    if (tokenStatus) return `OpenAI 授权码交换失败（HTTP ${tokenStatus}）`;
    if (/id token/i.test(message)) return 'OpenAI 授权响应缺少 ID token';
    if (/scope|chatgpt\.tokens\.use\.direct/i.test(message)) return 'OpenAI 授权范围不完整';
    if (/credential|auth\.json/i.test(message)) return '本机 OAuth 凭据保存失败';
    if (/state mismatch/i.test(message)) return 'OAuth 会话已过期，请重新连接';
    return 'ChatGPT 授权未完成，请重试';
  }
}

export class AiError extends Error {
  constructor(readonly code: string, message: string) { super(message); }
}
