import * as assert from "assert";
import * as path from "path";
import * as fs from "fs";
import { toCamelCase, toPascalCase, toKebabCase, mapOpenAPITypeToTypeScript } from "../utils";
import { parseOpenApi } from "../parser";
import { generateAll } from "../generator";

export function testUtils(): void {
  assert.strictEqual(toCamelCase("GetUsers"), "getUsers");
  assert.strictEqual(toCamelCase("user-name"), "userName");
  assert.strictEqual(toPascalCase("user"), "User");
  assert.strictEqual(toKebabCase("UserProfile"), "user-profile");
  assert.strictEqual(mapOpenAPITypeToTypeScript("integer", undefined), "number");
  assert.strictEqual(mapOpenAPITypeToTypeScript("string", "date-time"), "string");
  console.log("Utils tests passed.");
}

export async function testParser(): Promise<any> {
  const specPath = path.join(__dirname, "mock-openapi.json");
  const api = await parseOpenApi(specPath);

  assert.strictEqual(api.models.length, 2);
  const userModel = api.models.find((m) => m.name === "User");
  assert.ok(userModel);
  assert.strictEqual(userModel.properties.length, 4);

  const profileProp = userModel.properties.find((p) => p.name === "profile");
  assert.ok(profileProp);
  assert.strictEqual(profileProp.type, "Profile");

  assert.strictEqual(api.services.length, 1);
  const userServ = api.services[0];
  assert.strictEqual(userServ.name, "Users");
  assert.strictEqual(userServ.methods.length, 3);
  console.log("Parser tests passed.");
  return api;
}

export function testGenerator(api: any): void {
  const tempOut = path.join(__dirname, "../../out-temp-test");
  generateAll(api, tempOut);

  const userModelFile = path.join(tempOut, "models", "user.ts");
  const userServFile = path.join(tempOut, "services", "users.service.ts");
  assert.ok(fs.existsSync(userModelFile));
  assert.ok(fs.existsSync(userServFile));

  const userModelContent = fs.readFileSync(userModelFile, "utf8");
  assert.ok(userModelContent.includes("export interface User"));
  assert.ok(userModelContent.includes("profile?: Profile;"));

  const userServContent = fs.readFileSync(userServFile, "utf8");
  assert.ok(userServContent.includes("export class UsersService"));
  assert.ok(userServContent.includes("getUsers("));

  fs.rmSync(tempOut, { recursive: true, force: true });
  console.log("Generator tests passed.");
}

export async function runAllTests(): Promise<void> {
  testUtils();
  const api = await testParser();
  testGenerator(api);
  console.log("All CLI tool tests passed successfully!");
}

runAllTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
