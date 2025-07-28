import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import Navigation from "@/components/Navigation";
import { User, Mail, Lock, Phone, MapPin, AlertCircle, UserPlus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const Register = () => {

    const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phoneNumber: "",
    organization: "",
    role: "",
    agreeToTerms: false,
    });

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const navigate = useNavigate();

    // Form validation
    const validateForm = () => {
    if (!formData.firstName.trim()) {
        setError("First name is required");
        return false;
    }
    if (!formData.lastName.trim()) {
        setError("Last name is required");
        return false;
    }
    if (!formData.email.trim()) {
        setError("Email is required");
        return false;
    }
    if (!formData.phoneNumber.trim()) {
        setError("Phone number is required");
        return false;
    }
    if (!formData.role) {
        setError("Please select a user type");
        return false;
    }
    if (formData.password.length < 8) {
        setError("Password must be at least 8 characters long");
        return false;
    }
    if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match");
        return false;
    }
    if (!formData.agreeToTerms) {
        setError("You must agree to the Terms of Service and Privacy Policy");
        return false;
    }
    return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!validateForm()) {
        return;
    }

    setIsLoading(true);

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                password: formData.password,
                password_confirmation: formData.confirmPassword,
                phoneNumber: formData.phoneNumber,
                role: formData.role,
                organization: formData.organization,
            }),
        });

        const data = await response.json();

        if (response.ok) {
            setSuccess("Account created successfully! Redirecting to login...");
            
            // Clear the form
            setFormData({
                firstName: "",
                lastName: "",
                email: "",
                password: "",
                confirmPassword: "",
                phoneNumber: "",
                organization: "",
                role: "",
                agreeToTerms: false,
            });

            // Redirect to login after 1 second
            setTimeout(() => {
                navigate('/login');
            }, 1000);
        } else {
        // Handle validation errors from Laravel
        if (data.errors) {
            const errorMessages = Object.values(data.errors).flat();
            setError(errorMessages.join(', '));
        } else {
            setError(data.message || 'Registration failed. Please try again.');
        }
        }
    } catch (error) {
        console.error('Registration error:', error);
        setError('Network error. Please check your connection and try again.');
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
                        <div className="w-16 h-16 bg-gradient-to-br from-waterbase-500 to-enviro-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <User className="w-8 h-8 text-white" />
                        </div>
                        <CardTitle className="text-2xl text-waterbase-950">
                        Join WaterBase
                        </CardTitle>
                        <CardDescription className="text-waterbase-600">
                        Create your account to start reporting and monitoring water
                        pollution
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            {success && (
                                <Alert className="border-green-200 bg-green-50">
                                <UserPlus className="h-4 w-4 text-green-600" />
                                <AlertDescription className="text-green-700">{success}</AlertDescription>
                                </Alert>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                <Label htmlFor="firstName">First Name</Label>
                                <Input
                                    id="firstName"
                                    placeholder="Maria"
                                    value={formData.firstName}
                                    onChange={(e) =>
                                    setFormData({ ...formData, firstName: e.target.value })
                                    }
                                    required
                                    disabled={isLoading}
                                />
                                </div>
                                <div>
                                <Label htmlFor="lastName">Last Name</Label>
                                <Input
                                    id="lastName"
                                    placeholder="Santos"
                                    value={formData.lastName}
                                    onChange={(e) =>
                                    setFormData({ ...formData, lastName: e.target.value })
                                    }
                                    required
                                    disabled={isLoading}
                                />
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="email">Email Address</Label>
                                <div className="relative">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="maria@example.com"
                                    className="pl-10"
                                    value={formData.email}
                                    onChange={(e) =>
                                    setFormData({ ...formData, email: e.target.value })
                                    }
                                    required
                                    disabled={isLoading}
                                />
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="phoneNumber">Phone Number</Label>
                                <div className="relative">
                                <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input
                                    id="phoneNumber"
                                    type="tel"
                                    placeholder="+63 912 345 6789"
                                    className="pl-10"
                                    value={formData.phoneNumber}
                                    onChange={(e) =>
                                    setFormData({ ...formData, phoneNumber: e.target.value })
                                    }
                                    required
                                    disabled={isLoading}
                                />
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="role">User Type</Label>
                                <Select
                                value={formData.role}
                                onValueChange={(value) =>
                                    setFormData({ ...formData, role: value })
                                }
                                disabled={isLoading}
                                >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select your role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="user">Concerned Citizen</SelectItem>
                                    <SelectItem value="ngo">NGO</SelectItem>
                                    <SelectItem value="lgu">Local Government Unit</SelectItem>
                                    <SelectItem value="researcher">Researcher</SelectItem>
                                    <SelectItem value="student">Student</SelectItem>
                                </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor="organization">Organization</Label>
                                <div className="relative">
                                <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input
                                    id="organization"
                                    placeholder="Environmental Watch PH"
                                    className="pl-10"
                                    value={formData.organization}
                                    onChange={(e) =>
                                    setFormData({ ...formData, organization: e.target.value })
                                    }
                                    disabled={isLoading}
                                />
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="password">Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        className="pl-10"
                                        value={formData.password}
                                        onChange={(e) =>
                                        setFormData({ ...formData, password: e.target.value })
                                        }
                                        required
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="confirmPassword">Confirm Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        placeholder="••••••••"
                                        className="pl-10"
                                        value={formData.confirmPassword}
                                        onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            confirmPassword: e.target.value,
                                        })
                                        }
                                        required
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center space-x-2">
                                <Checkbox
                                id="terms"
                                checked={formData.agreeToTerms}
                                onCheckedChange={(checked) =>
                                    setFormData({
                                    ...formData,
                                    agreeToTerms: checked as boolean,
                                    })
                                }
                                disabled={isLoading}
                                />
                                <Label htmlFor="terms" className="text-sm">
                                I agree to the{" "}
                                <Link
                                    to="/terms"
                                    className="text-waterbase-600 hover:underline"
                                >
                                    Terms of Service
                                </Link>{" "}
                                and{" "}
                                <Link
                                    to="/privacy"
                                    className="text-waterbase-600 hover:underline"
                                >
                                    Privacy Policy
                                </Link>
                                </Label>
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-waterbase-500 hover:bg-waterbase-600"
                                disabled={!formData.agreeToTerms || isLoading}
                            >
                                {isLoading ? (
                                <>
                                    <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    Creating Account...
                                </>
                                ) : (
                                <>
                                    <UserPlus className="w-4 h-4 mr-2" />
                                    Create Account
                                </>
                                )}
                            </Button>

                            <div className="text-center text-sm text-gray-600">
                                Already have an account?{" "}
                                <Link
                                to="/login"
                                className="text-waterbase-600 hover:underline font-medium"
                                >
                                Sign in
                                </Link>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};