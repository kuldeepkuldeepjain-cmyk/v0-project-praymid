import nextCoreWebVitals from "eslint-config-next/core-web-vitals"
import nextTypescript from "eslint-config-next/typescript"

const legacyMigrationRules = {
  "@typescript-eslint/no-explicit-any": "warn",
  "@typescript-eslint/no-require-imports": "warn",
  "@next/next/no-html-link-for-pages": "warn",
  "prefer-const": "warn",
  "react/no-unescaped-entities": "warn",
  "react-hooks/immutability": "warn",
  "react-hooks/preserve-manual-memoization": "warn",
  "react-hooks/purity": "warn",
  "react-hooks/refs": "warn",
  "react-hooks/set-state-in-effect": "warn",
  "react-hooks/static-components": "warn",
}

export default [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    linterOptions: { reportUnusedDisableDirectives: "warn" },
    rules: legacyMigrationRules,
  },
]
