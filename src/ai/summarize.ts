import { ai } from "./genkit";

export async function generateReportSummary(description: string) {
  try {
    const response = await ai.generate({
      prompt: `Summarize this incident report description into a single, concise sentence (max 15 words) that captures the core issue: "${description}"`,
    });
    
    return response.text;
  } catch (error) {
    console.error("AI summarization failed:", error);
    return null;
  }
}
