import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [
        laravel({
            input: [
                'resources/css/app.css',
                'resources/js/main.tsx',
            ],
            refresh: true,
        }),
        tailwindcss(),
        react(),
    ],
    resolve: {
        alias: {
            '@': '/resources/js',
        },
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    // React ecosystem
                    'react-vendor': ['react', 'react-dom', 'react-router-dom'],

                    // UI libraries
                    'ui-vendor': [
                        '@radix-ui/react-accordion',
                        '@radix-ui/react-alert-dialog',
                        '@radix-ui/react-aspect-ratio',
                        '@radix-ui/react-avatar',
                        '@radix-ui/react-checkbox',
                        '@radix-ui/react-context-menu',
                        '@radix-ui/react-dropdown-menu',
                        '@radix-ui/react-hover-card',
                        '@radix-ui/react-label',
                        '@radix-ui/react-menubar',
                        '@radix-ui/react-navigation-menu',
                        '@radix-ui/react-popover',
                        '@radix-ui/react-progress',
                        '@radix-ui/react-radio-group',
                        '@radix-ui/react-scroll-area',
                        '@radix-ui/react-select',
                        '@radix-ui/react-separator',
                        '@radix-ui/react-slider',
                        '@radix-ui/react-slot',
                        '@radix-ui/react-switch',
                        '@radix-ui/react-tabs',
                        '@radix-ui/react-toast',
                        '@radix-ui/react-toggle-group',
                        '@radix-ui/react-tooltip',
                        'lucide-react',
                    ],

                    // Map-related libraries (heavy)
                    'map-vendor': ['leaflet', 'react-leaflet', 'leaflet.heat'],

                    // Chart libraries
                    'chart-vendor': ['recharts'],

                    // Form and data libraries
                    'form-vendor': [
                        'react-hook-form',
                        '@tanstack/react-query',
                        'react-datepicker',
                        'react-day-picker',
                    ],

                    // Utility libraries
                    'utils-vendor': [
                        'clsx',
                        'class-variance-authority',
                        'tailwind-merge',
                        'date-fns',
                        'axios',
                    ],

                    // Camera/media libraries
                    'media-vendor': ['react-webcam', 'exif-js', 'piexifjs'],

                    // Other UI components
                    'component-vendor': [
                        'cmdk',
                        'embla-carousel-react',
                        'input-otp',
                        'next-themes',
                        'react-resizable-panels',
                        'sonner',
                        'vaul',
                    ],
                },
            },
        },
        chunkSizeWarningLimit: 600, // Temporarily increase limit while we implement splitting
    },
});
