import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react()],
	define: {
		global: "globalThis",
		"process.env": {},
	},
	resolve: {
		alias: {
			// Polyfill Node.js modules for browser compatibility
			path: "path-browserify",
			url: "url-polyfill",
			process: "process/browser",
		},
	},
	optimizeDeps: {
		include: [
			"process/browser",
			"path-browserify",
			"url-polyfill",
			"@uiw/react-md-editor",
		],
		esbuildOptions: {
			// Node.js global to browser globalThis
			define: {
				global: "globalThis",
			},
		},
	},
	build: {
		commonjsOptions: {
			transformMixedEsModules: true,
		},
	},
});
