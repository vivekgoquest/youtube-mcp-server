// jscodeshift codemod: Annotate legacy catch blocks for Error Handling consolidation
// Usage: npx jscodeshift -t scripts/codemods/annotate-error-handling.js src/

module.exports = function (fileInfo, api) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);

  // Find all catch clauses without ErrorHandler.handleToolError or handleSystemError calls
  root.find(j.CatchClause).forEach((path) => {
    const catches = path.node.body.body;
    const hasErrorHandler = catches.some((statement) => {
      return (
        j(statement)
          .find(j.CallExpression, {
            callee: {
              object: { name: "ErrorHandler" },
            },
          })
          .size() > 0
      );
    });

    if (!hasErrorHandler) {
      // Insert a comment above the catch clause
      path.node.comments = path.node.comments || [];
      path.node.comments.push(
        j.commentLine(
          " @remove-legacy  // legacy error path; consolidate via utils/error-handler",
          true,
          false,
        ),
      );
    }
  });

  return root.toSource({ quote: "single" });
};
