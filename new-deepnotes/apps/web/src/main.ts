import { createApp } from "vue";

import "./styles/globals.css";
import App from "./App.vue";
import { hydrateThemeFromStorage } from "./features/theme/useThemePreference";
import router from "./router";

hydrateThemeFromStorage();

const app = createApp(App);
app.use(router);
app.mount("#app");
