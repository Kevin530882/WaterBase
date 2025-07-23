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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        // Check for existing auth on app load
        const storedToken = localStorage.getItem('auth_token');
        const storedUser = localStorage.getItem('user');
        
        if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        }
    }, []);

    const login = (token: string, user: User) => {
        // Update state first (this triggers re-renders immediately)
        setToken(token);
        setUser(user);
        
        // Then update localStorage
        localStorage.setItem('auth_token', token);
        localStorage.setItem('user', JSON.stringify(user));
    };

    const logout = async () => {
        try {
        // Call logout API
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
        // Clear state first (triggers re-render immediately)
        setToken(null);
        setUser(null);
        
        // Then clear localStorage
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