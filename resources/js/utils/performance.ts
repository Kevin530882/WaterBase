// Performance monitoring utilities
export class PerformanceMonitor {
    static measurePageLoad() {
        if (typeof window !== 'undefined' && 'performance' in window) {
            window.addEventListener('load', () => {
                setTimeout(() => {
                    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
                    const loadTime = navigation.loadEventEnd - navigation.fetchStart;

                    console.log(`%c📊 Page Load Performance`, 'color: #4CAF50; font-weight: bold');
                    console.log(`⏱️ Total Load Time: ${Math.round(loadTime)}ms`);
                    console.log(`🚀 DOM Ready: ${Math.round(navigation.domContentLoadedEventEnd - navigation.fetchStart)}ms`);
                    console.log(`📦 Resource Load: ${Math.round(navigation.loadEventEnd - navigation.domContentLoadedEventEnd)}ms`);

                    // Track bundle loading
                    const resources = performance.getEntriesByType('resource');
                    const jsResources = resources.filter(r => r.name.endsWith('.js'));
                    const totalJSSize = jsResources.reduce((sum, r) => sum + (r as any).transferSize || 0, 0);

                    console.log(`📊 Total JS Downloaded: ${Math.round(totalJSSize / 1024)}KB`);
                    console.log(`🔢 Number of JS chunks: ${jsResources.length}`);
                }, 1000);
            });
        }
    }

    static measureChunkLoad(chunkName: string) {
        const start = performance.now();
        return () => {
            const end = performance.now();
            console.log(`⚡ Chunk "${chunkName}" loaded in ${Math.round(end - start)}ms`);
        };
    }
}

// Initialize performance monitoring
if (typeof window !== 'undefined') {
    PerformanceMonitor.measurePageLoad();
}
