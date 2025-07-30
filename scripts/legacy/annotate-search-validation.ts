import { Project, SyntaxKind } from "ts-morph";
import path from "path";

// Initialize ts-morph project
const project = new Project({
  tsConfigFilePath: "tsconfig.json",
});

// Patterns of inline validation to annotate
const validationFunctions = [
  "validateDateRange",
  "validateMaxResults",
  "validateSearchQuery",
  "mapFiltersToApiParams",
  "buildSearchParams",
];

// Get all TypeScript files under src/tools
const files = project.getSourceFiles("src/tools/**/*.ts");

// Process files safely
files.forEach((file) => {
  let modified = false;

  file.getDescendantsOfKind(SyntaxKind.CallExpression).forEach((call) => {
    try {
      const expr = call.getExpression();
      const exprText = expr.getText();
      if (validationFunctions.includes(exprText)) {
        // Insert comment above the validation call
        const pos = call.getStart();
        file.insertText(pos, (writer) => {
          writer.writeLine(
            "// @remove-legacy legacy inline validation; consolidate via utils/search-validation.ts",
          );
        });
        modified = true;
      }
    } catch {
      // Skip calls that fail to parse
    }
  });

  if (modified) {
    file.saveSync();
    console.log(`Annotated inline validation in ${file.getFilePath()}`);
  }
});

console.log("Search validation annotation complete.");
