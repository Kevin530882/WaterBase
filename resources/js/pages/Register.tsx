import { useEffect, useState } from "react";
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
import { User, Mail, Lock, Phone, MapPin, AlertCircle, UserPlus, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SearchableSelect } from "@/components/pagecomponents/searchable-select";

export const Register = () => {
    const [organizationOptions, setOrganizationOptions] = useState<string[]>([]);
    const [organizationProofFile, setOrganizationProofFile] = useState<File | null>(null);
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        confirmPassword: "",
        phoneNumber: "",
        organization: "",
        areaOfResponsibility: "",
        role: "",
        agreeToTerms: false,
    });

    const shouldShowOrganizationFields = (role: string) => {
        return ['ngo', 'lgu', 'researcher'].includes(role);
    };

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [showPendingModal, setShowPendingModal] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const loadOrganizations = async () => {
            try {
                const response = await fetch('/api/organizations', {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' },
                });

                if (!response.ok) return;

                const result = await response.json();
                const organizations = Array.isArray(result?.data) ? result.data : [];
                const uniqueOrganizations = Array.from(new Set(
                    organizations
                        .map((name: string) => (name || '').trim())
                        .filter((name: string) => !!name)
                )).sort((a, b) => a.localeCompare(b));

                setOrganizationOptions(uniqueOrganizations);
            } catch (error) {
                console.error('Failed to load organizations:', error);
            }
        };

        loadOrganizations();
    }, []);

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
        if (shouldShowOrganizationFields(formData.role)) {
            if (!formData.organization.trim()) {
                setError("Organization is required for your role");
                return false;
            }
            if (!formData.areaOfResponsibility) {
                setError("Area of responsibility is required for your role");
                return false;
            }
            if (!organizationProofFile) {
                setError("Proof of legitimacy document is required for organization accounts");
                return false;
            }
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
            const requestBody = new FormData();
            requestBody.append('firstName', formData.firstName);
            requestBody.append('lastName', formData.lastName);
            requestBody.append('email', formData.email);
            requestBody.append('password', formData.password);
            requestBody.append('password_confirmation', formData.confirmPassword);
            requestBody.append('phoneNumber', formData.phoneNumber);
            requestBody.append('role', formData.role);

            if (shouldShowOrganizationFields(formData.role)) {
                requestBody.append('organization', formData.organization);
                requestBody.append('areaOfResponsibility', formData.areaOfResponsibility);

                if (organizationProofFile) {
                    requestBody.append('organization_proof_document', organizationProofFile);
                }
            }

            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                },
                body: requestBody,
            });

            const data = await response.json();

            if (response.ok) {
                const isOrg = shouldShowOrganizationFields(formData.role);
                if (isOrg) {
                    // Show a modal to clearly tell organization users they must wait for approval
                    setShowPendingModal(true);
                } else {
                    setSuccess("Account created successfully! Redirecting to login...");
                    setTimeout(() => navigate('/login'), 1000);
                }

                // Clear the form
                setFormData({
                    firstName: "",
                    lastName: "",
                    email: "",
                    password: "",
                    confirmPassword: "",
                    phoneNumber: "",
                    organization: "",
                    areaOfResponsibility: "",
                    role: "",
                    agreeToTerms: false,
                });
                setOrganizationProofFile(null);
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
                            Create your account to start reporting and monitoring water pollution
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
                                        <SelectItem value="volunteer">Volunteer</SelectItem>
                                        <SelectItem value="ngo">NGO</SelectItem>
                                        <SelectItem value="lgu">Local Government Unit</SelectItem>
                                        <SelectItem value="researcher">Researcher</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Conditionally show organization field */}
                            {shouldShowOrganizationFields(formData.role) && (
                                <div>
                                    <Label htmlFor="organization">Organization *</Label>
                                    <Input
                                        id="organization"
                                        placeholder="Type your organization name"
                                        value={formData.organization}
                                        onChange={(e) =>
                                            setFormData({ ...formData, organization: e.target.value })
                                        }
                                        list="organization-suggestions"
                                        disabled={isLoading}
                                    />
                                    {organizationOptions.length > 0 && (
                                        <datalist id="organization-suggestions">
                                            {organizationOptions.map((organizationName) => (
                                                <option key={organizationName} value={organizationName} />
                                            ))}
                                        </datalist>
                                    )}
                                    <p className="text-xs text-gray-500 mt-1">
                                        You can type a new organization name or pick an existing suggestion.
                                    </p>
                                </div>
                            )}

                            {shouldShowOrganizationFields(formData.role) && (
                                <div>
                                    <Label htmlFor="organizationProof">Proof of Legitimacy *</Label>
                                    <Input
                                        id="organizationProof"
                                        type="file"
                                        accept=".pdf,.png,.jpg,.jpeg"
                                        onChange={(e) => setOrganizationProofFile(e.target.files?.[0] ?? null)}
                                        disabled={isLoading}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Upload SEC registration, government accreditation, or equivalent proof (PDF/JPG/PNG, max 10MB).
                                    </p>
                                </div>
                            )}

                            {/* Updated Area of Responsibility field with searchable select */}
                            {shouldShowOrganizationFields(formData.role) && (
                                <div>
                                    <Label htmlFor="areaOfResponsibility">Area of Responsibility *</Label>
                                    <SearchableSelect
                                        value={formData.areaOfResponsibility}
                                        onValueChange={(value) =>
                                            setFormData({ ...formData, areaOfResponsibility: value })
                                        }
                                        placeholder="Search for region, province, city, or barangay..."
                                        disabled={isLoading}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Type at least 2 characters to search for locations
                                    </p>
                                </div>
                            )}

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
                                    <a
                                        href="/terms"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-waterbase-600 hover:underline"
                                    >
                                        Terms of Service
                                    </a>{" "}
                                    and{" "}
                                    <a
                                        href="/privacy"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-waterbase-600 hover:underline"
                                    >
                                        Privacy Policy
                                    </a>
                                </Label>
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-waterbase-500 hover:bg-waterbase-600"
                                disabled={!formData.agreeToTerms || isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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

            <Dialog open={showPendingModal} onOpenChange={(open) => setShowPendingModal(open)}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Organization Registration Pending</DialogTitle>
                        <DialogDescription>
                            Your organization registration has been received and is pending admin review. We will notify you via email once your organization is approved. You may sign in after approval.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            onClick={() => {
                                setShowPendingModal(false);
                                navigate('/login');
                            }}
                        >
                            Go to Login
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
};