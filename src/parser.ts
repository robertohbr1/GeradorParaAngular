import SwaggerParser from "@apidevtools/swagger-parser";
import {
  mapOpenAPITypeToTypeScript,
  generateOperationId,
  toCamelCase,
  toPascalCase,
  toKebabCase,
} from "./utils";

export interface ModelProperty {
  name: string;
  type: string;
  optional: boolean;
  description?: string;
}

export interface ModelImport {
  name: string;
  file: string;
}

export interface ModelDefinition {
  name: string;
  description?: string;
  properties: ModelProperty[];
  imports: ModelImport[];
}

export interface MethodParameter {
  name: string;
  type: string;
  optional: boolean;
  in: "path" | "query" | "body" | "header";
}

export interface QueryParamDefinition {
  name: string;
  originalName: string;
}

export interface ServiceMethod {
  name: string;
  description?: string;
  httpMethod: string;
  urlPath: string;
  responseType: string;
  hasBody: boolean;
  parameters: MethodParameter[];
  queryParams: QueryParamDefinition[];
}

export interface ServiceDefinition {
  name: string;
  basePath: string;
  methods: ServiceMethod[];
  imports: ModelImport[];
}

export interface ParsedApi {
  models: ModelDefinition[];
  services: ServiceDefinition[];
}

export interface RawOperation {
  path: string;
  method: string;
  spec: any;
}

export function extractSchemaName(ref: string): string {
  const parts = ref.split("/");
  return parts[parts.length - 1];
}

export function getTypeFromSchema(property: any): string {
  if (property.$ref) {
    return extractSchemaName(property.$ref);
  }
  if (property.type === "array" && property.items) {
    if (property.items.$ref) {
      return `${extractSchemaName(property.items.$ref)}[]`;
    }
    const innerType = mapOpenAPITypeToTypeScript(property.items.type, property.items.format);
    return `${innerType}[]`;
  }
  return mapOpenAPITypeToTypeScript(property.type, property.format);
}

export function getBaseTypeName(property: any): string | null {
  if (property.$ref) {
    return extractSchemaName(property.$ref);
  }
  if (property.type === "array" && property.items && property.items.$ref) {
    return extractSchemaName(property.items.$ref);
  }
  return null;
}

export function getImportsForSchema(properties: Record<string, any>, currentSchemaName: string): ModelImport[] {
  const imports: ModelImport[] = [];
  const added = new Set<string>();

  for (const key of Object.keys(properties)) {
    const prop = properties[key];
    const typeName = getBaseTypeName(prop);
    if (typeName && typeName !== currentSchemaName && !added.has(typeName)) {
      added.add(typeName);
      imports.push({ name: typeName, file: toKebabCase(typeName) });
    }
  }
  return imports;
}

export function parseSingleSchema(name: string, schema: any): ModelDefinition {
  const properties: ModelProperty[] = [];
  const propsObj = schema.properties || {};
  const requiredList: string[] = schema.required || [];

  for (const propName of Object.keys(propsObj)) {
    const propSchema = propsObj[propName];
    properties.push({
      name: propName,
      type: getTypeFromSchema(propSchema),
      optional: !requiredList.includes(propName),
      description: propSchema.description,
    });
  }

  return {
    name,
    description: schema.description,
    properties,
    imports: getImportsForSchema(propsObj, name),
  };
}

export function parseSchemas(schemas: any): ModelDefinition[] {
  if (!schemas) {
    return [];
  }
  const definitions: ModelDefinition[] = [];
  for (const name of Object.keys(schemas)) {
    const schema = schemas[name];
    if (schema.type === "object" && schema.properties) {
      definitions.push(parseSingleSchema(name, schema));
    }
  }
  return definitions;
}

export function getOperationsByTag(paths: any): Record<string, RawOperation[]> {
  const groups: Record<string, RawOperation[]> = {};
  if (!paths) {
    return groups;
  }
  for (const path of Object.keys(paths)) {
    const pathObj = paths[path];
    for (const method of Object.keys(pathObj)) {
      const isHttpVerb = ["get", "post", "put", "delete", "patch"].includes(method.toLowerCase());
      if (isHttpVerb) {
        const spec = pathObj[method];
        const tag = spec.tags && spec.tags.length > 0 ? spec.tags[0] : "Api";
        if (!groups[tag]) {
          groups[tag] = [];
        }
        groups[tag].push({ path, method, spec });
      }
    }
  }
  return groups;
}

export function parseRequestBody(requestBody: any): MethodParameter {
  const content = requestBody.content || {};
  const jsonContent = content["application/json"] || {};
  const schema = jsonContent.schema || {};
  return {
    name: "body",
    type: getTypeFromSchema(schema),
    optional: !requestBody.required,
    in: "body",
  };
}

export function parseParameters(spec: any): MethodParameter[] {
  const params: MethodParameter[] = [];
  const rawParams = spec.parameters || [];
  for (const p of rawParams) {
    const type = p.schema ? getTypeFromSchema(p.schema) : getTypeFromSchema(p);
    params.push({
      name: p.name,
      type,
      optional: !p.required,
      in: p.in,
    });
  }
  if (spec.requestBody) {
    params.push(parseRequestBody(spec.requestBody));
  }
  return params;
}

export function getQueryParams(parameters: MethodParameter[]): QueryParamDefinition[] {
  return parameters
    .filter((p) => p.in === "query")
    .map((p) => ({
      name: toCamelCase(p.name),
      originalName: p.name,
    }));
}

export function getResponseType(spec: any): string {
  const responses = spec.responses || {};
  const successResponse = responses["200"] || responses["201"] || responses["default"];
  if (!successResponse) {
    return "any";
  }
  if (successResponse.schema) {
    return getTypeFromSchema(successResponse.schema);
  }
  const content = successResponse.content || {};
  const jsonContent = content["application/json"] || {};
  if (jsonContent.schema) {
    return getTypeFromSchema(jsonContent.schema);
  }
  return "any";
}

export function parseServiceMethod(raw: RawOperation): ServiceMethod {
  const spec = raw.spec;
  const name = spec.operationId ? toCamelCase(spec.operationId) : generateOperationId(raw.method, raw.path);
  const parameters = parseParameters(spec);
  const queryParams = getQueryParams(parameters);
  const responseType = getResponseType(spec);
  const urlPath = raw.path.replace(/\{([^}]+)\}/g, (_, pName) => `\${${toCamelCase(pName)}}`);

  return {
    name,
    description: spec.summary || spec.description,
    httpMethod: raw.method.toLowerCase(),
    urlPath,
    responseType,
    hasBody: ["post", "put", "patch"].includes(raw.method.toLowerCase()) && parameters.some((p) => p.in === "body"),
    parameters: parameters.map((p) => ({ ...p, name: toCamelCase(p.name) })),
    queryParams,
  };
}

export function getServiceImports(methods: ServiceMethod[]): ModelImport[] {
  const imports: ModelImport[] = [];
  const added = new Set<string>();
  const primitives = ["number", "string", "boolean", "any", "Date", "Blob", "void"];

  for (const m of methods) {
    const types = [m.responseType, ...m.parameters.map((p) => p.type)];
    for (const t of types) {
      const baseType = t.replace(/\[\]$/, "");
      if (!primitives.includes(baseType) && !added.has(baseType)) {
        added.add(baseType);
        imports.push({ name: baseType, file: toKebabCase(baseType) });
      }
    }
  }
  return imports;
}

export interface SwaggerOrOpenApiDocument {
  basePath?: string;
  paths?: Record<string, any>;
  components?: {
    schemas?: Record<string, any>;
  };
  definitions?: Record<string, any>;
}

export function parseServices(api: SwaggerOrOpenApiDocument, basePath: string): ServiceDefinition[] {
  const operationsByTag = getOperationsByTag(api.paths);
  const services: ServiceDefinition[] = [];

  for (const tag of Object.keys(operationsByTag)) {
    const methods = operationsByTag[tag].map(parseServiceMethod);
    services.push({
      name: toPascalCase(tag),
      basePath,
      methods,
      imports: getServiceImports(methods),
    });
  }
  return services;
}

export async function parseOpenApi(urlOrPath: string): Promise<ParsedApi> {
  const bundle = await SwaggerParser.bundle(urlOrPath);
  const api = bundle as unknown as SwaggerOrOpenApiDocument;
  const basePath = api.basePath || "";
  const schemas = api.components?.schemas || api.definitions || {};

  return {
    models: parseSchemas(schemas),
    services: parseServices(api, basePath),
  };
}
