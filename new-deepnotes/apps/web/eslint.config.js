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
  {
    files: ["src/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@deepnotes/api-worker",
              message:
                "Use the OpenAPI client and fetch only; do not import the api-worker app.",
            },
            {
              name: "@deepnotes/db",
              message: "Web must not import the database package; use HTTP only.",
            },
            {
              name: "@deepnotes/api",
              message:
                "Use generated src/api types only; do not import @deepnotes/api at runtime (codegen is dev-time).",
            },
            {
              name: "@deepnotes/session",
              message: "Web must not import @deepnotes/session; use @deepnotes/e2ee and HTTP.",
            },
          ],
          patterns: [
            {
              group: ["drizzle-orm", "drizzle-orm/*"],
              message: "Web must not import drizzle-orm.",
            },
          ],
        },
      ],
    },
  },
];
