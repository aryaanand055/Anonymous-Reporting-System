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

export async function analyzeReportDetails(text: string): Promise<{
  location: string;
  district: string;
  institutionType: string;
  issueType: string;
  isSpam: boolean;
  spamReason?: string;
}> {
  const prompt = `
Analyze the following text from an incident reporting system.

Your task is to:
1. Extract structured details.
2. Determine whether the report is SPAM or a VALID INCIDENT.

---

### CORE RULE: WHAT COUNTS AS A VALID INCIDENT
A report is VALID (isSpam: false) ONLY if it clearly describes a real-world external issue such as:
- Crime (theft, assault, fraud, etc.)
- Safety hazards (fire, broken infrastructure, exposed wires, unsafe conditions)
- Public issues (pollution, sanitation, water problems)
- Administrative issues (corruption, mismanagement, service denial)

The issue MUST involve the outside world — NOT the system, device, or conversation.

---

### WHAT COUNTS AS SPAM (isSpam: true)

Classify as SPAM if ANY of the following apply:

1. **System/Meta Complaints / Device ID**
   - Complaints about the app/system/device OR identifying as hardware.
   - Example: "This system is slow", "I am a PC 13", "Device ID 445"

2. **Meta-Talk / Questions About System**
   - Talking about recording, usage, or instructions
   - Example: "Is this recording?", "How do I use this?"

3. **Generic Conversation**
   - Greetings, small talk, or polite phrases
   - Example: "Hello", "Thank you", "Bye"

4. **Testing / Placeholder Content**
   - Clearly test inputs or meaningless checks
   - Example: "Test", "Testing 123", "Check check"

5. **Nonsense / Gibberish / Audio Tags**
   - Random text or transcription artifacts
   - Example: "asdfghjkl", "[Music]", "[Laughter] [Music]"

6. **No Clear Incident**
   - Vague statements with no real issue
   - Example: "Something is wrong", "Not good here"

---

### STRICT DECISION RULES (MERCILESS MODE)

1. **"When in doubt, it is SPAM"**: If you are not 100% sure an actual incident is being reported, mark isSpam = true.
2. **Vague Problem Rule**: Statements like "there is a problem", "I am in a situation", or "it's not good" with no further detail → isSpam = true.
3. **No Concrete Issue**: If the "issueType" remains "Unspecified" after analysis → isSpam = true.
4. **Relevant Only**: If the text describes anything other than a public safety issue, crime, or administrative complaint → isSpam = true.
5. **Human-Only Rule**: If the text looks like transcription noise, meta-talk about the device, or a test → isSpam = true.

- spamReason MUST be empty ("") ONLY if isSpam = false.

---

### EXAMPLES OF VALID INCIDENTS (isSpam: false)
- "A guy snatched a bag and ran off" -> issueType: "Snatching/Theft", institutionType: "Road"
- "Robbery happened at the store" -> issueType: "Robbery", institutionType: "Store"
- "Stalking incident in the park" -> issueType: "Stalking", institutionType: "Park"

### EXTRACTION PRAGMATISM
- **Don't be over-cautious**: If you see a name like "Nilambu" or "Thauryo", use it! Even if you don't know the exact "Type", use your best guess (e.g., "Public Road").
- **Prioritize Data**: It is better to have a "best guess" location than "Unspecified".

### FIELD EXTRACTION RULES
- "location": The most specific spot mentioned (e.g., "Fifth Thaunyo").
- "district": The larger area or town (e.g., "Nilambu").
- "institutionType": The type of environment (e.g., "Street", "Hospital").
- "issueType": What happened (e.g., "Snatching", "Theft").

### INPUT
Text: "${text}"

---

### OUTPUT FORMAT (STRICT JSON ONLY)
{
  "location": "Unspecified",
  "district": "Unspecified",
  "institutionType": "Unspecified",
  "issueType": "Unspecified",
  "isSpam": false,
  "spamReason": ""
}

If no incident is described, "isSpam" MUST be true.

Description: "${text}"
`;

  // Heuristic safety net for extremely short common spam or audio tags
  const lowerText = text.toLowerCase().trim();
  const commonSpam = ["hello", "hi", "test", "testing", "how are you", "thank you", "thanks", "bye", "what is this", "report it all"];
  const audioTags = /^[\[\(](music|laughter|applause|silence|noise|cough|breathing|unintelligible|speaking in foreign language|background noise)[\s\S]*[\]\)]$/i;

  if (
    commonSpam.includes(lowerText) || 
    audioTags.test(lowerText) ||
    lowerText.includes("(speaking in foreign language)") ||
    lowerText.includes("what is this") ||
    lowerText.includes("report it all") ||
    (lowerText.length < 5 && !/\d/.test(lowerText))
  ) {
    return {
      location: "Unspecified",
      district: "Unspecified",
      institutionType: "Unspecified",
      issueType: "Unspecified",
      isSpam: true,
      spamReason: "Heuristic: Non-speech audio tag or common testing phrase"
    };
  }

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
          max_tokens: 512,
          response_format: { type: "json_object" }
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices[0]?.message?.content ?? "";
        return JSON.parse(content);
      }
    } catch (error) {
      console.error("Groq extraction failed:", error);
    }
  }

  // Fallback to Gemini (via genkit)
  try {
    const response = await ai.generate({ prompt });
    const jsonMatch = response.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error("Gemini extraction failed:", error);
  }

  return {
    location: "Unspecified",
    district: "Unspecified",
    institutionType: "Unspecified",
    issueType: "Unspecified",
    isSpam: false,
  };
}

