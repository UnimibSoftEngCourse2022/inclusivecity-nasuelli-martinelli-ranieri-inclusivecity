import {reactRouter} from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import {defineConfig} from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import {VitePWA} from "vite-plugin-pwa";

export default defineConfig({
    server: {
        host: true,
    },
    plugins: [
        tailwindcss(),
        reactRouter(),
        tsconfigPaths(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.ico', 'apple-icon-180.png'],
            manifest: {
                name: 'InclusiveCity',
                short_name: 'InclusiveCity',
                description: 'Mappe accessibili per tutti',
                theme_color: '#ffffff',
                icons: [
                    {
                        src: '/icons/manifest-icon-192.png',
                        sizes: '192x192',
                        type: 'image/png',
                        purpose: 'any maskable'
                    },
                    {
                        src: '/icons/manifest-icon-512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any maskable'
                    },
                    {
                        src: '/icons/apple-icon-180.png',
                        sizes: '180x180',
                        type: 'image/png'
                    }
                ]
            }
        })
    ],
});