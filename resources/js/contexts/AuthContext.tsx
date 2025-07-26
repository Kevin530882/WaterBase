import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    organization: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, user: User) => void;
    logout: () => void;
    isAuthenticated: boolean;
    isLoading: boolean; // Add loading state
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true); // Start with loading = true

    useEffect(() => {
        // Check for existing auth on app load
        const storedToken = localStorage.getItem('auth_token');
        const storedUser = localStorage.getItem('user');
        
        if (storedToken && storedUser) {
        try {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
        } catch (error) {
            console.error('Error parsing stored user data:', error);
            // Clear invalid data
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user');
        }
        }
        
        setIsLoading(false); // Auth check complete
    }, []);

    const login = (token: string, user: User) => {
        setToken(token);
        setUser(user);
        localStorage.setItem('auth_token', token);
        localStorage.setItem('user', JSON.stringify(user));
    };

    const logout = async () => {
        try {
        await fetch('/api/logout', {
            method: 'POST',
            headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            },
        });
        } catch (error) {
        console.error('Logout error:', error);
        } finally {
        setToken(null);
        setUser(null);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        }
    };

    const value = {
        user,
        token,
        login,
        logout,
        isAuthenticated: !!token && !!user,
        isLoading, // Include loading state
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};