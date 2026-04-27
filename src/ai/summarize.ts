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

export async function generateSeverityFromText(text: string): Promise<"low" | "medium" | "high"> {
  const prompt = `
Classify the severity of the following incident into ONLY one of:
low, medium, high.

Rules:
- high = immediate danger, violence, fire, abuse, life-threatening
- medium = serious issue but not life-threatening
- low = minor issue, complaint, inconvenience

Text: "${text}"

Respond with ONLY one word: low, medium, or high.
`;

  try {
    const response = await ai.generate({ prompt });
    const output = response.text.trim().toLowerCase();

    if (["low", "medium", "high"].includes(output)) {
      return output as "low" | "medium" | "high";
    }
  } catch (error) {
    console.error("AI severity logic failed:", error);
  }

  return "medium"; // fallback
}
