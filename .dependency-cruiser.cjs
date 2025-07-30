/* Minimal Dependency-Cruiser configuration (CommonJS flavour)
   Generated to enable TypeScript-aware graph generation        */

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  options: {
    tsConfig: {
      fileName: "tsconfig.json",
    },
    tsPreCompilationDeps: true,
    combinedDependencies: true,
    doNotFollow: {
      path: "node_modules",
    },
  },
};
