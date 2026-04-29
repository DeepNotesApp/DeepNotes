import { createApp } from "vue";

import "highlight.js/styles/atom-one-dark.css";
import "katex/dist/katex.min.css";
import "./styles/globals.css";
import App from "./App.vue";
import { hydrateThemeFromStorage } from "./features/theme/useThemePreference";
import router from "./router";

hydrateThemeFromStorage();

const app = createApp(App);
app.use(router);
app.mount("#app");
