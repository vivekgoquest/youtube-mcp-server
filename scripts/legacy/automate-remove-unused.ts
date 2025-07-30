import { Project } from "ts-morph";
import fs from "fs";
import path from "path";

const reportPath = path.join(
  "docs",
  "architecture",
  "_generated",
  "unused-symbols.txt",
);
if (!fs.existsSync(reportPath)) {
  console.error(`Report file not found: ${reportPath}`);
  process.exit(1);
}

// Read report lines: "file:line – symbol"
const lines = fs
  .readFileSync(reportPath, "utf8")
  .split("\n")
  .filter(Boolean)
  .map((line) => {
    const [location, symbol] = line.split(" - ").map((s) => s.trim());
    const [file] = location.split(":");
    return { file, symbol };
  });

const project = new Project({
  tsConfigFilePath: "tsconfig.json",
});

let removedCount = 0;

for (const { file, symbol } of lines) {
  const sourceFile = project.getSourceFile(file);
  if (!sourceFile) {
    console.warn(`Source file not found: ${file}`);
    continue;
  }

  // Get all declarations exported under this symbol
  const exported = sourceFile.getExportedDeclarations().get(symbol);
  if (!exported) {
    console.warn(
      `No exported declaration found for symbol "${symbol}" in ${file}`,
    );
    continue;
  }

  for (const decl of exported) {
    try {
      decl.remove();
      removedCount++;
      console.log(`Removed unused export "${symbol}" from ${file}`);
    } catch (e: any) {
      console.warn(`Failed to remove "${symbol}" in ${file}: ${e.message}`);
    }
  }
  // Save after modifications
  sourceFile.saveSync();
}

console.log(`Done: removed ${removedCount} unused exports.`);
