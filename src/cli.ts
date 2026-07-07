#!/usr/bin/env node
import { Command } from "commander";
import * as path from "path";
import { parseOpenApi } from "./parser";
import { generateAll } from "./generator";

export interface CliOptions {
  url: string;
  output: string;
}

export function setupProgram(): Command {
  const program = new Command();
  return program
    .name("openapi-angular-cli")
    .description("CLI to generate Angular Models and Services from OpenAPI spec")
    .requiredOption("-u, --url <url>", "URL of the OpenAPI spec")
    .requiredOption("-o, --output <dir>", "Output directory");
}

export async function executeGeneration(options: CliOptions): Promise<void> {
  console.log(`Parsing spec from ${options.url}...`);
  const api = await parseOpenApi(options.url);
  const outputDir = path.resolve(options.output);
  generateAll(api, outputDir);
  console.log("Angular files generated successfully.");
}

export async function runCli(argv: string[]): Promise<void> {
  try {
    const program = setupProgram();
    program.parse(argv);
    const options = program.opts() as CliOptions;
    await executeGeneration(options);
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${errorMsg}`);
    process.exit(1);
  }
}

if (require.main === module) {
  runCli(process.argv);
}
