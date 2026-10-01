import { defineConfig } from 'vite';
export default defineConfig({
  server: { port: 5199, strictPort: true, hmr: process.env.PV_NO_HMR ? false : true },
});
