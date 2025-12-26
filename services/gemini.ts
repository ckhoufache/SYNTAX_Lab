
import { GoogleGenAI } from "@google/genai";
import { Task, Deal } from '../types';

export const generateDailyBriefing = async (tasks: Task[], deals: Deal[], userApiKey?: string): Promise<string> => {
  // Wir priorisieren den vom Nutzer in den Settings hinterlegten Key
  const apiKey = userApiKey || process.env.API_KEY;
  
  if (!apiKey) {
    throw new Error("API_KEY_MISSING");
  }

  const ai = new GoogleGenAI({ apiKey });

  const taskSummary = tasks
    .filter(t => !t.isCompleted)
    .map(t => `- ${t.title} (Priorität: ${t.priority}, Fällig: ${t.dueDate})`)
    .slice(0, 5)
    .join('\n');

  const dealSummary = deals
    .filter(d => d.stage !== 'Gewonnen' && d.stage !== 'Verloren')
    .map(d => `- ${d.title}: ${d.value.toLocaleString('de-DE', {minimumFractionDigits: 2})}€ (Phase: ${d.stage})`)
    .slice(0, 5)
    .join('\n');

  const currentStatus = `
AKTUELLER STATUS:
AUFGABEN:
${taskSummary || 'Keine dringenden Aufgaben.'}

PIPELINE-HIGHLIGHTS:
${dealSummary || 'Keine aktiven Deals in kritischen Phasen.'}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: currentStatus.trim(),
      config: {
        systemInstruction: `Du bist der Strategie-Assistent für ein Custom CRM. 
Analysiere die aktuelle Lage und erstelle ein kurzes, prägnantes Briefing für den heutigen Tag.

DEINE AUFGABE:
1. Begrüße den Nutzer motivierend.
2. Nenne die wichtigste Aufgabe für heute.
3. Gib einen kurzen Tipp zum Deal mit dem höchsten Potenzial.
Maximal 4 Sätze. Antworte in professionellem Deutsch. Benutze Euro-Beträge mit 2 Nachkommastellen.`,
        temperature: 0.7,
        topP: 0.95,
      }
    });
    
    return response.text || "Analyse abgeschlossen. Sie sind gut aufgestellt für heute!";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.message?.includes('403') || error.message?.includes('API_KEY_INVALID')) {
        throw new Error("API_KEY_INVALID");
    }
    return "KI-Briefing momentan nicht verfügbar. Prüfen Sie Ihren API-Key in den Einstellungen.";
  }
};
