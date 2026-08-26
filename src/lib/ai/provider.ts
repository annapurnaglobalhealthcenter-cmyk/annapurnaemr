import { openai } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import { z } from 'zod'

export async function getClinicalSuggestions(clinicalContext: string) {
  const result = await generateObject({
    model: openai('gpt-4o-mini'), // Abstraction supports switching to Anthropic/Gemini easily
    system: `You are an expert Clinical Decision Support AI. 
      Analyze the provided clinical context (symptoms, vitals) and suggest a differential diagnosis and treatment plan. 
      You are strictly an assistant. The final decision rests with the human doctor.`,
    prompt: clinicalContext,
    schema: z.object({
      differentials: z.array(z.object({
        condition_name: z.string(),
        certainty: z.enum(['Provisional', 'Confirmed']),
        notes: z.string().optional()
      })).describe('List of potential diagnoses'),
      medications: z.array(z.object({
        medication_name: z.string(),
        dosage: z.string(),
        frequency: z.string(),
        duration_days: z.number().optional()
      })).describe('Suggested medications'),
      clinical_summary: z.string().describe('A brief summary of the presentation')
    })
  })
  
  return result.object
}
