import * as fs from "fs";
import * as path from "path";
import Handlebars from "handlebars";
import { ParsedApi, ModelDefinition, ServiceDefinition } from "./parser";
import { toKebabCase } from "./utils";

export function loadTemplate(name: string): Handlebars.TemplateDelegate {
  const tPath = path.join(__dirname, "..", "templates", `${name}.hbs`);
  if (!fs.existsSync(tPath)) {
    throw new Error(`Template not found at "${tPath}". Expected .hbs template files in templates directory.`);
  }
  const content = fs.readFileSync(tPath, "utf8");
  return Handlebars.compile(content);
}

export function generateModels(
  models: ModelDefinition[],
  outputDir: string,
  template: Handlebars.TemplateDelegate
): void {
  const modelsDir = path.join(outputDir, "models");
  fs.mkdirSync(modelsDir, { recursive: true });

  for (const m of models) {
    const fileContent = template(m);
    const fileName = `${toKebabCase(m.name)}.ts`;
    const filePath = path.join(modelsDir, fileName);
    fs.writeFileSync(filePath, fileContent, "utf8");
  }
}

export function generateServices(
  services: ServiceDefinition[],
  outputDir: string,
  template: Handlebars.TemplateDelegate
): void {
  const servicesDir = path.join(outputDir, "services");
  fs.mkdirSync(servicesDir, { recursive: true });

  for (const s of services) {
    const fileContent = template(s);
    const fileName = `${toKebabCase(s.name)}.service.ts`;
    const filePath = path.join(servicesDir, fileName);
    fs.writeFileSync(filePath, fileContent, "utf8");
  }
}

export function generateAll(api: ParsedApi, outputDir: string): void {
  const modelTemplate = loadTemplate("model");
  const serviceTemplate = loadTemplate("service");
  generateModels(api.models, outputDir, modelTemplate);
  generateServices(api.services, outputDir, serviceTemplate);
}
