import base from "../../eslint.config.js";

export default [
  ...base,
  {
    ignores: [
      "src/api/api-types.generated.ts",
      "src/api/openapi.json",
      "src/components/ui/**",
    ],
  },
];
