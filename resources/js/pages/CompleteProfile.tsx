import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const CompleteProfile = () => {
    const { token, updateUser } = useAuth();
    const navigate = useNavigate();
    const [phoneNumber, setPhoneNumber] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            const response = await fetch('/api/auth/complete-profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ phoneNumber }),
            });
            const data = await response.json();

            if (!response.ok) {
                setError(data.message || 'Unable to complete profile.');
                return;
            }

            updateUser({ ...data.user, profile_completed: true });
            navigate('/', { replace: true });
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
                        <CardTitle className="text-2xl text-waterbase-950">Complete Your Profile</CardTitle>
                        <CardDescription className="text-waterbase-600">
                            Add your phone number to finish setting up your WaterbasePH account.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
                            <div>
                                <Label htmlFor="phoneNumber">Phone Number</Label>
                                <Input
                                    id="phoneNumber"
                                    type="tel"
                                    placeholder="+63 912 345 6789"
                                    value={phoneNumber}
                                    onChange={(event) => setPhoneNumber(event.target.value)}
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                            <Button type="submit" className="w-full bg-waterbase-500 hover:bg-waterbase-600" disabled={isLoading}>
                                {isLoading ? 'Saving...' : 'Continue'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
