import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const { isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    // Show loading spinner while checking authentication
    if (isLoading) {
        return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
            <div className="w-8 h-8 animate-spin rounded-full border-4 border-waterbase-500 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
            </div>
        </div>
        );
    }

    // Only redirect if we're sure the user is not authenticated
    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <>{children}</>;
};