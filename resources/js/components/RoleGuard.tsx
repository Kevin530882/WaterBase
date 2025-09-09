import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

interface Props { 
    roles: string | string[]; 
    children: React.ReactNode; 
}

export const RoleGuard = ({ roles, children }: Props) => {
    const { user } = useAuth();
    
    if (!user) {
        return <Navigate to="/login" replace />;
    }
    
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    const hasAccess = allowedRoles.includes(user.role);
    
    if (!hasAccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
                    <p className="text-gray-600 mb-6">You don't have permission to access this page.</p>
                    <button 
                        onClick={() => window.history.back()}
                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }
    
    return <>{children}</>;
};