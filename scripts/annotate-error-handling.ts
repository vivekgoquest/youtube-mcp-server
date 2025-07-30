import { Project, SyntaxKind } from "ts-morph";
import path from "path";

// Initialize project using tsconfig
const project = new Project({
  tsConfigFilePath: "tsconfig.json",
});

// Get all TypeScript source files under src/
const files = project.getSourceFiles("src/**/*.ts");

// Process each file safely
files.forEach((file) => {
  try {
    let modified = false;

    // Find all catch clauses
    const catches = file.getDescendantsOfKind(SyntaxKind.CatchClause);

    catches.forEach((clause) => {
      try {
        // Check if catch block contains any ErrorHandler calls
        const hasErrorHandler = clause
          .getDescendantsOfKind(SyntaxKind.CallExpression)
          .some((call) => {
            const expr = call.getExpression().getText();
            return expr.startsWith("ErrorHandler.");
          });

        if (!hasErrorHandler) {
          // Prepend a comment above the catch clause
          const start = clause.getStart();
          file.insertText(start, (writer) => {
            writer.writeLine(
              "// @remove-legacy legacy error path; consolidate via utils/error-handler",
            );
          });
          modified = true;
        }
      } catch {
        // Skip problematic clause
      }
    });

    if (modified) {
      file.saveSync();
      console.log(`Annotated legacy catch blocks in ${file.getFilePath()}`);
    }
  } catch (err: any) {
    console.warn(
      `Skipping file ${file.getFilePath()} due to error: ${err.message}`,
    );
  }
});

console.log("Error handling annotation complete.");
