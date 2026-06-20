import { createPinia } from "pinia"
import { createApp } from "vue"
// Vue Flow styles first so our Tailwind utilities can override them.
import "@vue-flow/core/dist/style.css"
import "@vue-flow/core/dist/theme-default.css"
import "@vue-flow/controls/dist/style.css"
import "./style.css"
import App from "./App.vue"

createApp(App).use(createPinia()).mount("#app")
