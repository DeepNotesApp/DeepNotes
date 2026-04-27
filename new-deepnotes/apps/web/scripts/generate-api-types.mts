import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getOpenApiDocument } from "../../../packages/api/src/openapi.ts";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const webRoot = join(scriptDir, "..");
const outDir = join(webRoot, "src", "api");

mkdirSync(outDir, { recursive: true });
const jsonPath = join(outDir, "openapi.json");
const typesPath = join(outDir, "api-types.generated.ts");

writeFileSync(jsonPath, `${JSON.stringify(getOpenApiDocument(), null, 2)}\n`);

execSync(
  `pnpm exec openapi-typescript "${jsonPath}" -o "${typesPath}"`,
  { cwd: webRoot, stdio: "inherit" },
);
