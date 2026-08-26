import { AiProvider, AiRequestOptions, AiResponse } from '../interfaces'
import { z } from 'zod'
// import OpenAI from 'openai' // In a real app, this runs strictly server-side

export class OpenAiProvider implements AiProvider {
  
  // private openai: OpenAI;
  
  constructor() {
    // Ensure this code is NEVER run in the browser
    if (typeof window !== 'undefined') {
      throw new Error("SECURITY BREACH: AI Provider cannot be instantiated in the browser.")
    }
    // this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }

  async requestStructured<T>(
    systemPrompt: string,
    clinicalContext: string,
    schema: z.ZodType<T>,
    options?: AiRequestOptions
  ): Promise<AiResponse<T>> {
    const start = Date.now()

    /* 
    // REAL IMPLEMENTATION (Commented out for safety as requested)
    const response = await this.openai.chat.completions.create({
      model: options?.model || 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: clinicalContext }
      ],
      response_format: { type: 'json_object' } // Force JSON
    })
    
    const rawJson = JSON.parse(response.choices[0].message.content)
    
    // STRICT VALIDATION: If the LLM hallucinated the structure, this throws an error and fails safely
    const parsedData = schema.parse(rawJson) 
    
    return {
      data: parsedData,
      model: response.model,
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0
      },
      executionTimeMs: Date.now() - start
    }
    */

    throw new Error("OpenAI Provider is locked in development. Use MockAiProvider.")
  }
}
