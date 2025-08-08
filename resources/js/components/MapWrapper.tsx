import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

// Lazy load the heavy map component
const LazyMapComponent = lazy(() => import('./MapComponent'));

interface MapWrapperProps {
    reports: any[];
    onReportSelect?: (report: any) => void;
    className?: string;
}

const MapWrapper = ({ reports, onReportSelect, className }: MapWrapperProps) => {
    return (
        <Suspense
            fallback={
                <div className={`flex items-center justify-center bg-gray-100 rounded-lg ${className || 'h-64'}`}>
                    <div className="text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-waterbase-500" />
                        <p className="text-sm text-waterbase-600">Loading map...</p>
                    </div>
                </div>
            }
        >
            <LazyMapComponent
                reports={reports}
                onReportSelect={onReportSelect}
                className={className}
            />
        </Suspense>
    );
};

export default MapWrapper;
