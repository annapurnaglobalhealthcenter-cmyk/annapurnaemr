import { z } from 'zod'

export interface AiRequestOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AiUsageMetrics {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AiResponse<T> {
  data: T;
  model: string;
  usage: AiUsageMetrics;
  executionTimeMs: number;
}

export interface AiProvider {
  /**
   * Request a structured clinical JSON response from the LLM.
   */
  requestStructured<T>(
    systemPrompt: string,
    clinicalContext: string,
    schema: z.ZodType<T>,
    options?: AiRequestOptions
  ): Promise<AiResponse<T>>;
}
