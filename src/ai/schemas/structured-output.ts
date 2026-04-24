export class StructuredOutputParser {
  static parseJson<T>(raw: string): T {
    const direct = raw.trim();
    if (direct.startsWith("{") || direct.startsWith("[")) {
      return JSON.parse(direct) as T;
    }
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      return JSON.parse(fenced[1].trim()) as T;
    }
    const firstBrace = raw.indexOf("{");
    const lastBrace = raw.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      const maybeJson = raw.slice(firstBrace, lastBrace + 1);
      return JSON.parse(maybeJson) as T;
    }
    throw new Error("No valid JSON payload found in model output.");
  }
}
