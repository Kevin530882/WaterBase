import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock } from "lucide-react";

export const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = useMemo(() => searchParams.get('token') || '', [searchParams]);
    const initialEmail = useMemo(() => searchParams.get('email') || '', [searchParams]);
    const [formData, setFormData] = useState({
        email: initialEmail,
        password: "",
        password_confirmation: "",
    });
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setIsLoading(true);
        setError("");
        setMessage("");

        try {
            const response = await fetch('/api/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ ...formData, token }),
            });
            const data = await response.json();

            if (!response.ok) {
                setError(data.message || 'Unable to reset password.');
                return;
            }

            setMessage(data.message);
            setTimeout(() => navigate('/login'), 1200);
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-waterbase-50 to-enviro-50">
            <Navigation />
            <div className="max-w-md mx-auto py-12 px-4">
                <Card className="border-waterbase-200 shadow-lg">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl text-waterbase-950">Choose New Password</CardTitle>
                        <CardDescription className="text-waterbase-600">
                            Set a new password for your WaterbasePH account.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {message && <Alert><AlertDescription>{message}</AlertDescription></Alert>}
                            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
                            {!token && <Alert variant="destructive"><AlertDescription>Missing reset token. Please request a new link.</AlertDescription></Alert>}
                            <div>
                                <Label htmlFor="email">Email Address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                            <div>
                                <Label htmlFor="password">New Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                    <Input
                                        id="password"
                                        type="password"
                                        className="pl-10"
                                        value={formData.password}
                                        onChange={(event) => setFormData({ ...formData, password: event.target.value })}
                                        required
                                        minLength={8}
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="password_confirmation">Confirm Password</Label>
                                <Input
                                    id="password_confirmation"
                                    type="password"
                                    value={formData.password_confirmation}
                                    onChange={(event) => setFormData({ ...formData, password_confirmation: event.target.value })}
                                    required
                                    minLength={8}
                                    disabled={isLoading}
                                />
                            </div>
                            <Button type="submit" className="w-full bg-waterbase-500 hover:bg-waterbase-600" disabled={isLoading || !token}>
                                {isLoading ? 'Resetting...' : 'Reset Password'}
                            </Button>
                            <Link to="/forgot-password" className="block text-center text-sm text-waterbase-600 hover:underline">
                                Request a new link
                            </Link>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
