
import { GoogleGenAI } from "@google/genai";
import { Task, Deal } from '../types';

export const generateDailyBriefing = async (tasks: Task[], deals: Deal[]): Promise<string> => {
  // Obtain API key exclusively from process.env.API_KEY as per guidelines
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    throw new Error("API_KEY_MISSING");
  }

  // Always use named parameter for apiKey during initialization
  // We create a new instance right before the call to ensure the latest key from the dialog is used
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const taskSummary = tasks
    .filter(t => !t.isCompleted)
    .map(t => `- [${t.priority.toUpperCase()}] ${t.title} (Fällig: ${t.dueDate})`)
    .join('\n');

  const dealSummary = deals
    .filter(d => d.stage === 'Verhandlung' || d.stage === 'Angebot')
    .map(d => `- ${d.title}: ${d.value}€ (${d.stage})`)
    .join('\n');

  const prompt = `
    Du bist ein hilfreicher CRM-Assistent. Erstelle eine kurze, motivierende Zusammenfassung für den Vertriebsmitarbeiter basierend auf den folgenden Daten.
    Sprich den Nutzer direkt an. Halte es kurz (max 3 Sätze).
    
    Offene Aufgaben:
    ${taskSummary}

    Wichtige Deals in der Pipeline:
    ${dealSummary}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    
    return response.text || "Konnte keine Zusammenfassung erstellen.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    // Check for specific key-related errors as per guidelines
    if (error.message && error.message.includes("Requested entity was not found.")) {
        throw new Error("API_KEY_INVALID");
    }

    if (error.message && (error.message.includes('429') || error.message.includes('RESOURCE_EXHAUSTED'))) {
        return "Das KI-Nutzungslimit ist erreicht. Bitte versuchen Sie es später erneut.";
    }

    return "Fehler bei der KI-Analyse. Bitte prüfen Sie Ihre Internetverbindung.";
  }
};
