import { Project, SyntaxKind } from "ts-morph";
import path from "path";

// Initialize project
const project = new Project({ tsConfigFilePath: "tsconfig.json" });

// Glob all tool files
const files = project.getSourceFiles("src/tools/**/*.ts");

files.forEach((file) => {
  let modified = false;

  // Find the legacy comment markers
  const comments = file
    .getDescendantsOfKind(SyntaxKind.SingleLineCommentTrivia)
    .filter((c) => c.getText().includes("@remove-legacy"));

  comments.forEach((comment) => {
    // Remove the comment
    comment.remove();
    modified = true;

    // Also remove the next statement if it's a validate* or buildSearchParams call
    const stmt = comment.getParent().getNextSibling();
    if (stmt && stmt.getKind() === SyntaxKind.ExpressionStatement) {
      const exprText = stmt.getFirstChild()?.getText() || "";
      if (/^(validate|buildSearchParams)/.test(exprText)) {
        stmt.remove();
      }
    }
  });

  if (modified) {
    file.saveSync();
    console.log(`Consolidated search-validation in ${file.getFilePath()}`);
  }
});

console.log("Search-validation consolidation complete.");
