import { Generator, getConfig } from "@tanstack/router-generator";

const config = getConfig(
  {
    routesDirectory: "./src/routes",
    generatedRouteTree: "./src/routeTree.gen.ts",
    quoteStyle: "single",
    semicolons: false,
    disableLogging: true,
  },
  process.cwd(),
);

const generator = new Generator({ config, root: process.cwd() });
await generator.run();
