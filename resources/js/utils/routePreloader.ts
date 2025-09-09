// Route preloader for improving perceived performance
export class RoutePreloader {
    private static preloadedRoutes = new Set<string>();

    /**
     * Preload a route component
     */
    static async preload(routeName: string) {
        if (this.preloadedRoutes.has(routeName)) {
            return;
        }

        this.preloadedRoutes.add(routeName);

        try {
            switch (routeName) {
                case 'dashboard':
                    await import('../pages/Dashboard');
                    break;
                case 'map':
                    await import('../pages/MapView');
                    break;
                case 'report':
                    await import('../pages/ReportPollution');
                    break;
                case 'community':
                    await import('../pages/Community');
                    break;
                case 'profile':
                    await import('../pages/Profile');
                    break;
                // Add more routes as needed
            }
        } catch (error) {
            console.warn(`Failed to preload route: ${routeName}`, error);
            this.preloadedRoutes.delete(routeName);
        }
    }

    /**
     * Preload common routes that users frequently access
     */
    static preloadCommonRoutes() {
        // Use requestIdleCallback for better performance
        if ('requestIdleCallback' in window) {
            requestIdleCallback(() => {
                this.preload('dashboard');
                this.preload('map');
                this.preload('profile');
            });
        } else {
            // Fallback for browsers without requestIdleCallback
            setTimeout(() => {
                this.preload('dashboard');
                this.preload('map');
                this.preload('profile');
            }, 1000);
        }
    }
}
