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
import { User, Mail, Lock, Phone, AlertCircle, UserPlus, Loader2, FileText, Eye, Upload } from "lucide-react";
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

const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_DOCUMENT_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
const ACCEPTED_DOCUMENT_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];
const DOCUMENT_TEMPLATE_PLACEHOLDER = "/document-templates/registration-placeholder.svg";
const DOCUMENT_TEMPLATE_PATHS = {
    ngo: {
        sec_certificate: "/storage/document-templates/ngo/NGO Certificate of Incorporation.png",
        articles_bylaws: "/storage/document-templates/ngo/NGO SEC Business Registration.jpg",
        representative_authorization: "/storage/document-templates/ngo/NGO Authorization Letter.png",
    },
    lgu: {
        representative_id: "/storage/document-templates/lgu/LGU Official ID.jpg",
        designation_letter: "/storage/document-templates/lgu/LGU Authorization Letter.png",
        endorsement_letter: "/storage/document-templates/lgu/LGU Endorsement Letter.png",
    },
    researcher: {
        institution_id: "/storage/document-templates/researcher/Researcher School ID.jpg",
        endorsement_letter: "/storage/document-templates/researcher/Researcher Authorization Letter.png",
        research_proof: "/storage/document-templates/researcher/Researcher Ethics Clearance.png",
    },
} as const;

const ROLE_DOCUMENTS = {
    ngo: [
        {
            key: "sec_certificate",
            name: "SEC Certificate of Registration / Incorporation",
            description: "Proves the NGO is legally registered with the SEC.",
        },
        {
            key: "articles_bylaws",
            name: "Articles of Incorporation and By-Laws",
            description: "Shows the organization's purpose, structure, and operating rules.",
        },
        {
            key: "representative_authorization",
            name: "Representative Authorization",
            description: "Confirms the registrant is authorized to represent the organization.",
        },
    ],
    lgu: [
        {
            key: "representative_id",
            name: "Official LGU Employee ID or Government ID",
            description: "Verifies the representative's identity and LGU affiliation.",
        },
        {
            key: "designation_letter",
            name: "Authorization, Office Order, or Designation Letter",
            description: "Confirms the LGU assigned the representative to register.",
        },
        {
            key: "endorsement_letter",
            name: "Official Request or Endorsement Letter",
            description: "Shows official LGU intent using LGU letterhead.",
        },
    ],
    researcher: [
        {
            key: "institution_id",
            name: "Valid School, Institutional, or Employee ID",
            description: "Verifies the researcher's institutional identity.",
        },
        {
            key: "endorsement_letter",
            name: "Endorsement Letter",
            description: "Confirms support from an adviser, department, institution, or research office.",
        },
        {
            key: "research_proof",
            name: "Research Proposal, Ethics Clearance, or Affiliation Proof",
            description: "Shows the research purpose or formal research affiliation.",
        },
    ],
} as const;

type VerificationRole = keyof typeof ROLE_DOCUMENTS;
type RegistrationDocument = typeof ROLE_DOCUMENTS[VerificationRole][number];
type DocumentFiles = Partial<Record<string, File>>;
type DocumentErrors = Partial<Record<string, string>>;

export const Register = () => {
    const [organizationOptions, setOrganizationOptions] = useState<string[]>([]);
    const [documentFiles, setDocumentFiles] = useState<DocumentFiles>({});
    const [documentErrors, setDocumentErrors] = useState<DocumentErrors>({});
    const [selectedTemplateDocument, setSelectedTemplateDocument] = useState<RegistrationDocument | null>(null);
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
        return ['ngo', 'lgu'].includes(role);
    };

    const getRoleDocuments = (role: string): readonly RegistrationDocument[] => {
        return ROLE_DOCUMENTS[role as VerificationRole] ?? [];
    };

    const getTemplatePath = (role: string, documentKey?: string) => {
        if (!documentKey) return DOCUMENT_TEMPLATE_PLACEHOLDER;

        return DOCUMENT_TEMPLATE_PATHS[role as VerificationRole]?.[documentKey as keyof typeof DOCUMENT_TEMPLATE_PATHS[VerificationRole]]
            ?? DOCUMENT_TEMPLATE_PLACEHOLDER;
    };

    const requiresRegistrationDocuments = getRoleDocuments(formData.role).length > 0;

    const validateDocumentFile = (file: File) => {
        const lowerName = file.name.toLowerCase();
        const hasValidType = ACCEPTED_DOCUMENT_TYPES.includes(file.type);
        const hasValidExtension = ACCEPTED_DOCUMENT_EXTENSIONS.some((extension) => lowerName.endsWith(extension));

        if (!hasValidType && !hasValidExtension) {
            return "Invalid file format. Upload a PDF, JPG, JPEG, or PNG file.";
        }

        if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
            return "File is too large. Maximum allowed size is 10MB.";
        }

        return "";
    };

    const handleDocumentChange = (documentKey: string, file?: File) => {
        if (!file) {
            setDocumentFiles((current) => {
                const next = { ...current };
                delete next[documentKey];
                return next;
            });
            return;
        }

        const validationError = validateDocumentFile(file);
        setDocumentErrors((current) => ({ ...current, [documentKey]: validationError }));

        if (validationError) {
            setDocumentFiles((current) => {
                const next = { ...current };
                delete next[documentKey];
                return next;
            });
            return;
        }

        setDocumentFiles((current) => ({ ...current, [documentKey]: file }));
    };

    const getFilePreviewUrl = (file: File) => {
        return file.type.startsWith("image/") ? URL.createObjectURL(file) : "";
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
        }
        if (requiresRegistrationDocuments) {
            const missingDocument = getRoleDocuments(formData.role).find((document) => !documentFiles[document.key]);
            if (missingDocument) {
                setError(`${missingDocument.name} is required for ${formData.role.toUpperCase()} registration`);
                return false;
            }
            const invalidDocument = getRoleDocuments(formData.role).find((document) => documentErrors[document.key]);
            if (invalidDocument) {
                setError(documentErrors[invalidDocument.key] || "Please fix document upload errors before continuing");
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
            }

            getRoleDocuments(formData.role).forEach((document) => {
                const file = documentFiles[document.key];
                if (file) {
                    requestBody.append(`registration_documents[${document.key}]`, file);
                }
            });

            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                },
                body: requestBody,
            });

            const data = await response.json();

            if (response.ok) {
                if (requiresRegistrationDocuments) {
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
                setDocumentFiles({});
                setDocumentErrors({});
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
                            Join WaterbasePH
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
                                    onValueChange={(value) => {
                                        setFormData({ ...formData, role: value });
                                        setDocumentFiles({});
                                        setDocumentErrors({});
                                    }}
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

                            {requiresRegistrationDocuments && (
                                <div className="space-y-3">
                                    <div>
                                        <Label>Required Documents *</Label>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Upload all role-based documents. Accepted formats: PDF, JPG, JPEG, PNG. Max size: 10MB each.
                                        </p>
                                    </div>
                                    {getRoleDocuments(formData.role).map((document) => {
                                        const file = documentFiles[document.key];
                                        const previewUrl = file ? getFilePreviewUrl(file) : "";

                                        return (
                                            <div key={document.key} className="rounded-lg border border-waterbase-100 bg-white p-3 space-y-3">
                                                <div>
                                                    <div className="text-sm font-medium text-waterbase-950">{document.name}</div>
                                                    <p className="text-xs text-gray-500 mt-1">{document.description}</p>
                                                </div>
                                                {file && (
                                                    <div className="flex items-center gap-3 rounded-md bg-waterbase-50 p-2">
                                                        {previewUrl ? (
                                                            <img src={previewUrl} alt={`${document.name} preview`} className="h-12 w-12 rounded object-cover border" />
                                                        ) : (
                                                            <div className="h-12 w-12 rounded border bg-white flex items-center justify-center">
                                                                <FileText className="h-6 w-6 text-waterbase-500" />
                                                            </div>
                                                        )}
                                                        <div className="min-w-0 flex-1">
                                                            <div className="truncate text-sm text-waterbase-900">{file.name}</div>
                                                            <div className="text-xs text-waterbase-600">{(file.size / (1024 * 1024)).toFixed(2)} MB</div>
                                                        </div>
                                                    </div>
                                                )}
                                                {documentErrors[document.key] && (
                                                    <p className="text-xs text-red-600">{documentErrors[document.key]}</p>
                                                )}
                                                <div className="flex flex-col sm:flex-row gap-2">
                                                    <Button type="button" variant="outline" className="flex-1" disabled={isLoading} asChild>
                                                        <label htmlFor={`document-${document.key}`} className="cursor-pointer">
                                                            <Upload className="w-4 h-4 mr-2" />
                                                            {file ? "Replace File" : "Upload File"}
                                                        </label>
                                                    </Button>
                                                    <Input
                                                        id={`document-${document.key}`}
                                                        type="file"
                                                        accept=".pdf,.png,.jpg,.jpeg"
                                                        className="sr-only"
                                                        onChange={(e) => handleDocumentChange(document.key, e.target.files?.[0])}
                                                        disabled={isLoading}
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        className="flex-1"
                                                        onClick={() => setSelectedTemplateDocument(document)}
                                                        disabled={isLoading}
                                                    >
                                                        <Eye className="w-4 h-4 mr-2" />
                                                        View Template
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
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
                                disabled={!formData.agreeToTerms || isLoading || (requiresRegistrationDocuments && getRoleDocuments(formData.role).some((document) => !documentFiles[document.key] || documentErrors[document.key]))}
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

            <Dialog open={!!selectedTemplateDocument} onOpenChange={(open) => !open && setSelectedTemplateDocument(null)}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{selectedTemplateDocument?.name}</DialogTitle>
                        <DialogDescription>
                            Sample document template for this role and document type.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="rounded-lg border border-dashed border-waterbase-200 bg-waterbase-50 p-4">
                        <img
                            src={getTemplatePath(formData.role, selectedTemplateDocument?.key)}
                            alt={`${selectedTemplateDocument?.name ?? "Registration document"} template`}
                            className="mx-auto h-64 w-full rounded-md object-contain bg-white"
                        />
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={showPendingModal} onOpenChange={(open) => setShowPendingModal(open)}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Registration Pending Review</DialogTitle>
                        <DialogDescription>
                            Your registration has been received and is pending admin review. We will notify you via email once your account is approved. You may sign in after approval.
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
