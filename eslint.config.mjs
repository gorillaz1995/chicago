import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/** Flat config: Next.js core rules plus TypeScript, skipping generated and static files. */
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "public/**", "next-env.d.ts"]),
  {
    files: ["src/components/silver-head/SilverHeadCanvas.tsx"],
    rules: {
      // The head mutates Three.js objects and a shared control ref on purpose.
      "react-hooks/immutability": "warn",
    },
  },
]);

export default eslintConfig;
