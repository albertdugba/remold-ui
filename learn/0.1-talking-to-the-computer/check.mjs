// The robot checker for lesson 0.1. Run: node learn/0.1-talking-to-the-computer/check.mjs
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const file = join(dirname(fileURLToPath(import.meta.url)), "hello.js");
let out = "";
try {
  out = execFileSync(process.execPath, [file], { encoding: "utf8" });
} catch (err) {
  console.log("❌ hello.js crashed before it finished. Here's what the computer said:\n");
  console.log(String(err.stderr || err.message));
  console.log("Tip: look for the line number in the message above, and check your quotes and brackets on that line.");
  process.exit(1);
}

const lines = out.trim().split("\n").map((l) => l.trim());
const checks = [
  ["Step 1 prints the hello message", lines[0] === "Hello from Remold!"],
  ["Step 2 prints your name (any words at all)", lines.length >= 2 && lines[1].length > 0 && lines[1] !== "120" && lines[1] !== "60 * 2"],
  ["Step 3 prints the number 120", lines.includes("120")],
  ["Step 4 prints the words 60 * 2", lines.includes("60 * 2")],
];

console.log("Your program printed:\n" + lines.map((l) => "  " + l).join("\n") + "\n");
let ok = true;
for (const [name, pass] of checks) { console.log(`${pass ? "✅" : "❌"} ${name}`); ok &&= pass; }
console.log(ok ? "\n🎉 Lesson 0.1 done. Tell Claude, and we'll start 0.2." : "\nNot yet. Fix the ❌ lines and run the check again.");
process.exit(ok ? 0 : 1);
