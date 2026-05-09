import { useState } from "react";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, ArrowLeft } from "lucide-react";

export const ForgotPassword = () => {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setIsLoading(true);
        setMessage("");
        setError("");

        try {
            const response = await fetch('/api/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ email }),
            });
            const data = await response.json();

            if (!response.ok) {
                setError(data.message || 'Unable to send reset link.');
                return;
            }

            setMessage(data.message);
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
                        <CardTitle className="text-2xl text-waterbase-950">Reset Password</CardTitle>
                        <CardDescription className="text-waterbase-600">
                            Enter your registered email and we will send a password reset link.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {message && <Alert><AlertDescription>{message}</AlertDescription></Alert>}
                            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
                            <div>
                                <Label htmlFor="email">Email Address</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                    <Input
                                        id="email"
                                        type="email"
                                        className="pl-10"
                                        value={email}
                                        onChange={(event) => setEmail(event.target.value)}
                                        required
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>
                            <Button type="submit" className="w-full bg-waterbase-500 hover:bg-waterbase-600" disabled={isLoading}>
                                {isLoading ? 'Sending...' : 'Send Reset Link'}
                            </Button>
                            <Link to="/login" className="flex items-center justify-center text-sm text-waterbase-600 hover:underline">
                                <ArrowLeft className="w-4 h-4 mr-1" />
                                Back to sign in
                            </Link>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
