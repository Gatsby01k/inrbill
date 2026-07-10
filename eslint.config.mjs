import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // request-pipeline-card-3d.tsx imports three/@react-three packages
    // that aren't installed yet (see the notice at the top of that file)
    // — excluded from lint until they're actually added via npm install,
    // same reasoning as the tsconfig.json exclude below.
    ignores: ["node_modules/**", ".next/**", "out/**", "src/components/site/request-pipeline-card-3d.tsx"],
  },
];

export default eslintConfig;
