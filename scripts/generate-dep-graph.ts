import { Project } from "ts-morph";
import fs from "fs";
import path from "path";

// Initialize project based on tsconfig.json
const project = new Project({
  tsConfigFilePath: "tsconfig.json",
});

// Collect all source files under src/
const sourceFiles = project.getSourceFiles("src/**/*.ts");

type Edge = { from: string; to: string };
const graph: Edge[] = [];

// Build import graph
sourceFiles.forEach((file) => {
  const from = path.relative(process.cwd(), file.getFilePath());
  file.getImportDeclarations().forEach((imp) => {
    const resolved = imp.getModuleSpecifierSourceFile();
    if (resolved) {
      const to = path.relative(process.cwd(), resolved.getFilePath());
      graph.push({ from, to });
    }
  });
});

// Ensure output directory exists
const outDir = path.join("docs", "architecture", "_generated");
fs.mkdirSync(outDir, { recursive: true });

// Write graph JSON
const outPath = path.join(outDir, "dependency-graph.json");
fs.writeFileSync(outPath, JSON.stringify({ edges: graph }, null, 2), "utf8");

console.log(`Dependency graph written to ${outPath}`);
