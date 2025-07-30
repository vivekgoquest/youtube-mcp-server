import { Project, SyntaxKind } from "ts-morph";

// Consolidate legacy patterns across utils modules
const project = new Project({ tsConfigFilePath: "tsconfig.json" });

// Target utility files
const utilPatterns = [
  "src/utils/search-enrichment.ts",
  "src/utils/response-validator.ts",
  "src/utils/quota-calculator.ts",
];

utilPatterns.forEach((pattern) => {
  const file = project.getSourceFile(pattern);
  if (!file) {
    console.warn(`File not found: ${pattern}`);
    return;
  }

  let modified = false;

  // Remove any fallback comments marked "@remove-legacy"
  file
    .getDescendantsOfKind(SyntaxKind.SingleLineCommentTrivia)
    .filter((c) => c.getText().includes("@remove-legacy"))
    .forEach((c) => {
      (c as any).remove();
      modified = true;
    });

  // Remove unused helper functions named legacy*
  file.getFunctions().forEach((fn) => {
    const name = fn.getName();
    if (name && /^legacy[A-Z]/.test(name)) {
      (fn as any).remove();
      modified = true;
    }
  });

  // Optionally remove empty import statements
  file.getImportDeclarations().forEach((decl) => {
    if (decl.getNamedImports().length === 0 && decl.getModuleSpecifierValue()) {
      decl.remove();
      modified = true;
    }
  });

  if (modified) {
    file.saveSync();
    console.log(`Cleaned legacy patterns in ${pattern}`);
  }
});

console.log("Utils consolidation complete.");
