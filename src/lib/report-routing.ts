import { ai } from "@/ai/genkit";
import { DEPARTMENT_DIRECTORY, DEPARTMENT_VALUES, Department } from "@/types/reports";

const ROUTING_MODEL = "googleai/gemini-1.5-flash";

function extractJsonObject(text: string) {
    const fencedMatch = text.match(/```json\s*([\s\S]*?)\s*```/i);
    const candidate = fencedMatch?.[1] ?? text;
    const firstBrace = candidate.indexOf("{");
    const lastBrace = candidate.lastIndexOf("}");

    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
        return null;
    }

    return candidate.slice(firstBrace, lastBrace + 1);
}

function normalizeDepartment(value: unknown): Department | undefined {
    if (typeof value !== "string") {
        return undefined;
    }

    const normalized = value.trim().toLowerCase();
    return DEPARTMENT_VALUES.includes(normalized as Department) ? (normalized as Department) : undefined;
}

function dedupeDepartments(values: Department[]) {
    return [...new Set(values)].filter(Boolean) as Department[];
}

function buildContext(input: {
    title?: string;
    description?: string;
    location?: string;
    issueType?: string;
    rawText?: string;
    institutionType?: string;
    severityLevel?: string;
}) {
    return [
        `Title: ${input.title ?? "N/A"}`,
        `Issue Type: ${input.issueType ?? "N/A"}`,
        `Location: ${input.location ?? "N/A"}`,
        `Institution Type: ${input.institutionType ?? "N/A"}`,
        `Severity: ${input.severityLevel ?? "N/A"}`,
        `Description: ${input.description ?? "N/A"}`,
        `Raw Text: ${input.rawText ?? "N/A"}`,
    ].join("\n");
}

export async function analyzeReportDepartments(input: {
    title?: string;
    description?: string;
    location?: string;
    issueType?: string;
    rawText?: string;
    institutionType?: string;
    severityLevel?: string;
}) {
    const context = buildContext(input);
    const departmentCatalog = DEPARTMENT_DIRECTORY.map((department) => {
        return `- ${department.department}: ${department.description}`;
    }).join("\n");

    try {
        const response = await ai.generate({
            model: ROUTING_MODEL,
            prompt: `You are routing an anonymous incident report to the appropriate departments.
Do not rely on keyword matching alone. Infer the correct departments from the overall meaning, context, and likely responsibility.

Allowed departments:
${departmentCatalog}

Return STRICT JSON only in this exact shape:
{
  "primaryDepartment": "human_rights",
  "departments": ["human_rights", "education"],
  "reasoning": "short explanation"
}

Rules:
- Choose 1 to 3 departments.
- Put the most responsible department first as primaryDepartment.
- Include secondary departments only when the incident genuinely spans them.
- Use only the allowed department names.
- If the report is sparse, still infer the best match from the available context.

Report context:
${context}`,
        });

        const parsedText = extractJsonObject(response.text.trim());
        if (parsedText) {
            const parsed = JSON.parse(parsedText) as {
                primaryDepartment?: unknown;
                departments?: unknown;
            };

            const departments = dedupeDepartments(
                Array.isArray(parsed.departments)
                    ? parsed.departments.map(normalizeDepartment).filter(Boolean) as Department[]
                    : []
            );
            const primaryDepartment = normalizeDepartment(parsed.primaryDepartment) ?? departments[0] ?? "human_rights";

            const finalDepartments = dedupeDepartments([primaryDepartment, ...departments]);

            return {
                primaryDepartment,
                departments: finalDepartments.length ? finalDepartments : [primaryDepartment],
                reasoning:
                    typeof (parsed as { reasoning?: unknown }).reasoning === "string"
                        ? (parsed as { reasoning: string }).reasoning
                        : undefined,
            };
        }
    } catch (error) {
        console.error("Report routing analysis failed:", error);
    }

    return {
        primaryDepartment: "human_rights" as Department,
        departments: ["human_rights" as Department],
        reasoning: "Fallback routing used because semantic analysis was unavailable.",
    };
}

export function departmentsContainDepartment(departments: unknown, department: Department) {
    if (!Array.isArray(departments)) {
        return false;
    }

    return departments.some((value) => value === department);
}
