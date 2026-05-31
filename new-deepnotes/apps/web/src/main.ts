import { createApp } from "vue";

import "highlight.js/styles/atom-one-dark.css";
import "katex/dist/katex.min.css";
import "./styles/globals.css";
import App from "./App.vue";
import { createAppRouter } from "./router";

const app = createApp(App);
app.use(createAppRouter());
app.mount("#app");
