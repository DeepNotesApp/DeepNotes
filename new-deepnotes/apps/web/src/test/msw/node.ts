import { setupServer } from "msw/node";

import { deepnotesDefaultHandlers } from "./deepnotes-handlers";

/** Shared server for Vitest; call `listen` in `beforeAll` / `close` in `afterAll`. */
export const mswServer = setupServer(...deepnotesDefaultHandlers);
