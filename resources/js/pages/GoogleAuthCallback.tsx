import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export const GoogleAuthCallback = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { login } = useAuth();
    const [error, setError] = useState("");

    useEffect(() => {
        const token = searchParams.get('token');

        if (!token) {
            setError('Google sign-in did not return a token.');
            return;
        }

        const finishLogin = async () => {
            try {
                const response = await fetch('/api/user', {
                    headers: {
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                });
                const user = await response.json();

                if (!response.ok) {
                    setError(user.message || 'Unable to complete Google sign-in.');
                    return;
                }

                const profileCompleted = !!user.phoneNumber;
                login(token, { ...user, profile_completed: profileCompleted });
                navigate(profileCompleted ? '/' : '/complete-profile', { replace: true });
            } catch {
                setError('Network error. Please try again.');
            }
        };

        finishLogin();
    }, [login, navigate, searchParams]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-waterbase-50 px-4">
            <div className="text-center">
                {error ? (
                    <p className="text-red-600">{error}</p>
                ) : (
                    <>
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-waterbase-500" />
                        <p className="text-waterbase-700">Completing Google sign-in...</p>
                    </>
                )}
            </div>
        </div>
    );
};
