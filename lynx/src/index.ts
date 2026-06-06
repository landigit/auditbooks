import { createApp } from 'vue-lynx';
import { createPinia } from 'pinia';
import App from './App.vue';
import './lib/ipc.js';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.mount();
