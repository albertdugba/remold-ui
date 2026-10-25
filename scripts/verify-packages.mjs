import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const packagesDirectory = join(root, "packages");
const packageDirectories = readdirSync(packagesDirectory)
  .map((name) => join(packagesDirectory, name))
  .filter((directory) => existsSync(join(directory, "package.json")));
const packingDirectory = mkdtempSync(join(tmpdir(), "remold-pack-"));

function exportTargets(value) {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(exportTargets);
  if (value && typeof value === "object") return Object.values(value).flatMap(exportTargets);
  return [];
}

try {
  for (const packageDirectory of packageDirectories) {
    const manifestPath = join(packageDirectory, "package.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    const targets = exportTargets(manifest.exports).filter((target) => target.startsWith("."));

    for (const target of targets) {
      if (!existsSync(join(packageDirectory, target))) {
        throw new Error(`${manifest.name}: missing export target ${target}`);
      }
    }

    execFileSync("pnpm", ["pack", "--pack-destination", packingDirectory], {
      cwd: packageDirectory,
      stdio: "inherit",
    });
  }

  const archives = readdirSync(packingDirectory).filter((file) => file.endsWith(".tgz"));
  if (archives.length !== packageDirectories.length) {
    throw new Error(`Expected ${packageDirectories.length} package archives, found ${archives.length}`);
  }
} finally {
  rmSync(packingDirectory, { force: true, recursive: true });
}
