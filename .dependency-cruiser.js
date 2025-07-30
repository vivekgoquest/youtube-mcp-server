/* Minimal Dependency-Cruiser configuration
   Generated to enable TypeScript-aware graph generation               */

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  /*  No rules for now – we only need the graph      */
  /*  Rules can be added later for architectural lint */
  options: {
    /* Resolve imports using the project’s tsconfig   */
    tsConfig: {
      fileName: "tsconfig.json",
    },

    /* Consider files that are imported only via type
       references, decorators, etc.                  */
    tsPreCompilationDeps: true,

    /* Show npm package + relative imports as one    */
    combinedDependencies: true,

    /* Don’t traverse node_modules for speed         */
    doNotFollow: {
      path: "node_modules",
    },
  },
};
