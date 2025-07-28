import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export const useLoginRedirect = () => {
    const { user, isAuthenticated } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (isAuthenticated && user) {
            // Redirect based on user role after login
            switch (user.role) {
                case 'admin':
                navigate('/admin/dashboard', { replace: true });
                break;
                case 'ngo':
                case 'lgu':
                navigate('/portal/organizer', { replace: true });
                break;
                case 'volunteer':
                navigate('/portal/volunteer', { replace: true });
                break;
                default:
                navigate('/dashboard', { replace: true });
            }
        }
    }, [isAuthenticated, user, navigate]);
};