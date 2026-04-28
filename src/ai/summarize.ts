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
Classify the severity of the following incident report into ONLY one of: low, medium, or high.

Classification Criteria:
- HIGH: Immediate threat to life, active violence, major fire, severe physical abuse, ongoing crime in progress, or large-scale public safety emergency. (e.g., "Armed robbery in progress", "Building on fire", "Severe assault").
- MEDIUM: Serious incidents that require investigation but are not immediately life-threatening. Property damage, non-violent harassment, significant theft, health hazards that are not immediate emergencies. (e.g., "Burglary that happened overnight", "Vandalism", "Persistent workplace harassment", "Illegal dumping of hazardous waste").
- LOW: Minor issues, administrative complaints, general feedback, non-urgent quality of life issues, or reports that are VAGUE, INCOMPLETE, or have "UNSPECIFIED" details. (e.g., "Littering in a park", "Noise complaint", "Unspecified issue at government building", "No description provided").

Text to analyze: "${text}"

Respond with ONLY one word: low, medium, or high.
`;

  const groqApiKey = process.env.GROQ_API_KEY;
  if (groqApiKey) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqApiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.1,
          max_tokens: 10,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const output = data.choices[0]?.message?.content?.trim().toLowerCase();
        if (["low", "medium", "high"].includes(output)) {
          console.log(`[Groq Severity] Output: ${output}`);
          return output as "low" | "medium" | "high";
        }
      }
    } catch (error) {
      console.error("Groq severity failed, falling back to Gemini:", error);
    }
  }

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

export async function getEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) return [];
  
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "models/text-embedding-004",
        content: { parts: [{ text }] }
      })
    });
    
    if (!res.ok) {
        throw new Error(`Embedding failed: ${res.statusText}`);
    }

    const data = await res.json();
    return data.embedding?.values || [];
  } catch (error) {
    console.error("Vector generation failed:", error);
    return [];
  }
}

