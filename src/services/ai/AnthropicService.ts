/**
 * AnthropicService
 *
 * Wrapper para a API da Anthropic com suporte a streaming.
 *
 * Arquitetura de produção:
 *   MVP (desktop local): chave direta via EXPO_PUBLIC_ANTHROPIC_KEY
 *   Produção (multi-usuário): proxy via Supabase Edge Function
 *   — a chave nunca fica exposta no cliente
 */

import { AnthropicKeyService } from './AnthropicKeyService';

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const MODEL         = 'claude-haiku-4-5-20251001'; // rápido e barato para coaching
const MAX_TOKENS    = 1024;

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

async function getKey(): Promise<string> {
  const key = await AnthropicKeyService.getKey();
  if (!key || key === 'sua_chave_aqui') {
    throw new Error('ANTHROPIC_KEY não configurada. Adicione nas Configurações ou no .env.local');
  }
  return key;
}

/**
 * Envia mensagens e retorna a resposta completa (sem streaming).
 * Ideal para resumos semanais e micro-insights.
 */
export async function sendMessage(
  systemPrompt: string,
  messages: ChatMessage[],
): Promise<string> {
  const key = await getKey();

  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'x-api-key':         key,
      'anthropic-version': '2023-06-01',
      'content-type':      'application/json',
    },
    body: JSON.stringify({
      model:      MODEL,
      max_tokens: MAX_TOKENS,
      system:     systemPrompt,
      messages,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text ?? '';
}

/**
 * Envia mensagens com streaming.
 * Chama onChunk a cada fragmento de texto recebido.
 * Chama onDone quando o stream encerra.
 */
export async function streamMessage(
  systemPrompt: string,
  messages: ChatMessage[],
  onChunk: (text: string) => void,
  onDone: (fullText: string) => void,
  onError: (err: Error) => void,
): Promise<void> {
  const key = await getKey();

  let res: Response;
  try {
    res = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'x-api-key':         key,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
      },
      body: JSON.stringify({
        model:      MODEL,
        max_tokens: MAX_TOKENS,
        stream:     true,
        system:     systemPrompt,
        messages,
      }),
    });
  } catch (e) {
    onError(e instanceof Error ? e : new Error(String(e)));
    return;
  }

  if (!res.ok) {
    const err = await res.text();
    onError(new Error(`Anthropic API error ${res.status}: ${err}`));
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) { onError(new Error('No response body')); return; }

  const decoder = new TextDecoder();
  let full = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

      for (const line of lines) {
        const json = line.slice(6).trim();
        if (json === '[DONE]') continue;
        try {
          const event = JSON.parse(json);
          if (event.type === 'content_block_delta') {
            const text = event.delta?.text ?? '';
            full += text;
            onChunk(text);
          }
        } catch {}
      }
    }
    onDone(full);
  } catch (e) {
    onError(e instanceof Error ? e : new Error(String(e)));
  } finally {
    reader.releaseLock();
  }
}
