
import { GoogleGenAI } from "@google/genai";
import { Task, Deal, BrainProcessStep, BrainPrompt } from '../types';

export const generateDailyBriefing = async (
    tasks: Task[], 
    deals: Deal[], 
    userApiKey?: string,
    brainProcess?: BrainProcessStep[],
    brainPrompts?: BrainPrompt[]
): Promise<string> => {
  const apiKey = userApiKey || process.env.API_KEY;
  if (!apiKey) { throw new Error("API_KEY_MISSING"); }

  const ai = new GoogleGenAI({ apiKey });

  // 1. Prepare Data
  const taskSummary = tasks
    .filter(t => !t.isCompleted)
    .sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .map(t => `- ${t.title} (${t.priority.toUpperCase()}, Fällig: ${t.dueDate})`)
    .slice(0, 5)
    .join('\n');

  const dealSummary = deals
    .filter(d => d.stage !== 'Gewonnen' && d.stage !== 'Verloren')
    .map(d => `- ${d.title}: ${d.value}€ (Phase: ${d.stage})`)
    .slice(0, 5)
    .join('\n');

  // 2. Prepare Brain Context (Minified to save tokens)
  const processContext = brainProcess 
    ? brainProcess.map(p => `${p.phase}: ${p.title} -> SOP: ${p.linkedSop || 'None'}`).join('\n') 
    : "Kein Prozess definiert.";

  const promptContext = brainPrompts
    ? brainPrompts.map(p => `Prompt ${p.promptId} für ${p.tool}`).join(', ')
    : "Keine Prompts.";

  const fullPrompt = `
  AKTUELLER STATUS:
  
  OFFENE AUFGABEN (Top 5):
  ${taskSummary || 'Keine Aufgaben.'}
  
  PIPELINE (Top 5):
  ${dealSummary || 'Pipeline leer.'}
  
  UNTERNEHMENS-PROZESS (BRAIN):
  ${processContext}
  
  VERFÜGBARE PROMPTS:
  ${promptContext}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: fullPrompt.trim(),
      config: {
        systemInstruction: `Du bist der "Strategic Intelligence Officer" dieses CRM. 
        Deine Aufgabe ist es, den Nutzer basierend auf seinem definierten "Brain"-Prozess zu steuern.
        
        REGELN:
        1. Analysiere die Pipeline. Wenn ein Deal in einer Phase steckt, schau im "Brain"-Prozess nach, was der nächste logische Schritt ist (z.B. SOP lesen, Prompt nutzen).
        2. Nenne KONKRETE Handlungsempfehlungen. Nicht "Melde dich beim Kunden", sondern "Nutze Prompt PMT-SALES-01 für den Sniper Outreach bei Kunde X".
        3. Fasse dich kurz (Max 4 Sätze).
        4. Sei motivierend aber professionell militärisch-präzise.
        `,
        temperature: 0.5,
      }
    });
    
    return response.text || "Analyse abgeschlossen. Datenlage unklar.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.message?.includes('403') || error.message?.includes('API_KEY_INVALID')) {
        throw new Error("API_KEY_INVALID");
    }
    return "KI-Dienst momentan nicht verfügbar.";
  }
};
