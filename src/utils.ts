export function toCamelCase(str: string): string {
  const cleaned = str.replace(/[^a-zA-Z0-9]+(.)/g, (_, chr: string) => chr.toUpperCase());
  return cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
}

export function toPascalCase(str: string): string {
  const camel = toCamelCase(str);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

export function mapOpenAPITypeToTypeScript(type: string | undefined, _format: string | undefined): string {
  if (!type) {
    return "any";
  }
  const typeMap: Record<string, string> = {
    string: "string",
    integer: "number",
    number: "number",
    boolean: "boolean",
    file: "Blob",
    object: "any",
  };
  return typeMap[type.toLowerCase()] || "any";
}

export function generateOperationId(method: string, path: string): string {
  const cleanPath = path
    .replace(/\{([^}]+)\}/g, "by_$1")
    .replace(/[^a-zA-Z0-9]+/g, "_");
  return toCamelCase(`${method.toLowerCase()}_${cleanPath}`);
}

export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .toLowerCase();
}
