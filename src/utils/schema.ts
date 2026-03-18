import type { ZodTypeAny } from "zod";

export function zodToJsonSchema(schema: ZodTypeAny): Record<string, unknown> {
  return zodToJson(schema);
}

function zodToJson(schema: ZodTypeAny): Record<string, unknown> {
  const def = schema._def;
  const typeName = def.typeName;

  switch (typeName) {
    case "ZodObject": {
      const shape = def.shape();
      const properties: Record<string, unknown> = {};
      const required: string[] = [];

      for (const [key, value] of Object.entries(shape)) {
        const zodValue = value as ZodTypeAny;
        properties[key] = zodToJson(zodValue);
        if (!zodValue.isOptional()) {
          required.push(key);
        }
      }

      return {
        type: "object",
        properties,
        ...(required.length > 0 && { required }),
      };
    }
    case "ZodArray":
      return {
        type: "array",
        items: zodToJson(def.type),
      };
    case "ZodString":
      return {
        type: "string",
        ...(def.description && { description: def.description }),
      };
    case "ZodNumber":
      return {
        type: "number",
        ...(def.description && { description: def.description }),
      };
    case "ZodBoolean":
      return {
        type: "boolean",
        ...(def.description && { description: def.description }),
      };
    case "ZodOptional":
      return zodToJson(def.innerType);
    case "ZodDefault":
      return { ...zodToJson(def.innerType), default: def.defaultValue() };
    case "ZodEnum":
      return { type: "string", enum: def.values };
    default:
      return { type: "string" };
  }
}
