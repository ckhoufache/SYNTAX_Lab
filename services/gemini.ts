import { GoogleGenAI } from "@google/genai";
import { Task, Deal } from '../types';

export const generateDailyBriefing = async (tasks: Task[], deals: Deal[]): Promise<string> => {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    return "API Key fehlt. Bitte fügen Sie Ihren Google Gemini API Key hinzu, um KI-Analysen zu erhalten.";
  }

  const ai = new GoogleGenAI({ apiKey });

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
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "Konnte keine Zusammenfassung erstellen.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Fehler bei der Verbindung zum KI-Dienst.";
  }
};