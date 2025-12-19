import { GoogleGenAI } from "@google/genai";
import { Task, Deal } from '../types';

/* Fix: Updated daily briefing generation to follow @google/genai guidelines */
export const generateDailyBriefing = async (tasks: Task[], deals: Deal[]): Promise<string> => {
  // Obtain API key exclusively from process.env.API_KEY as per guidelines
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    return "API Key fehlt. Bitte stellen Sie sicher, dass process.env.API_KEY konfiguriert ist.";
  }

  // Always use named parameter for apiKey during initialization
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
    // Select gemini-3-flash-preview for basic text tasks as per guidelines
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    // Directly access .text property (not a method)
    return response.text || "Konnte keine Zusammenfassung erstellen.";
  } catch (error: any) {
    console.error("Gemini Error:", error);
    
    // Spezifische Behandlung für Quota Exceeded (429)
    if (error.message && (error.message.includes('429') || error.message.includes('RESOURCE_EXHAUSTED'))) {
        return "Das KI-Nutzungslimit ist vorübergehend erreicht (Quota Exceeded). Bitte versuchen Sie es später erneut.";
    }

    return "Fehler bei der Verbindung zum KI-Dienst.";
  }
};