import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TabsContent } from "@/components/ui/tabs";
import { Edit, Save, Upload, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface SettingProps {
    onProfileUpdate: (updatedData: any) => void;
}

export const Setting = ({ onProfileUpdate }: SettingProps) => {
    const { user, token, updateUser } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
    const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(user?.profile_photo || null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [profileData, setProfileData] = useState({
        firstName: user?.firstName || "",
        lastName: user?.lastName || "",
        email: user?.email || "",
        phoneNumber: user?.phoneNumber || "",
        organization: user?.organization || "",
        areaOfResponsibility: user?.areaOfResponsibility || "",
    });

    useEffect(() => {
        setProfilePhotoPreview(user?.profile_photo || null);
        setProfileData({
            firstName: user?.firstName || "",
            lastName: user?.lastName || "",
            email: user?.email || "",
            phoneNumber: user?.phoneNumber || "",
            organization: user?.organization || "",
            areaOfResponsibility: user?.areaOfResponsibility || "",
        });
    }, [user]);

    const cropImageToSquare = async (file: File): Promise<File> => {
        const imageUrl = URL.createObjectURL(file);

        try {
            const image = await new Promise<HTMLImageElement>((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = () => reject(new Error('Failed to load image'));
                img.src = imageUrl;
            });

            const cropSize = Math.min(image.width, image.height);
            const offsetX = Math.floor((image.width - cropSize) / 2);
            const offsetY = Math.floor((image.height - cropSize) / 2);

            const canvas = document.createElement('canvas');
            canvas.width = cropSize;
            canvas.height = cropSize;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                throw new Error('Unable to initialize image editor');
            }

            ctx.drawImage(
                image,
                offsetX,
                offsetY,
                cropSize,
                cropSize,
                0,
                0,
                cropSize,
                cropSize
            );

            const blob = await new Promise<Blob>((resolve, reject) => {
                canvas.toBlob((result) => {
                    if (result) {
                        resolve(result);
                    } else {
                        reject(new Error('Failed to process image'));
                    }
                }, 'image/jpeg', 0.92);
            });

            const baseName = file.name.includes('.') ? file.name.substring(0, file.name.lastIndexOf('.')) : file.name;
            return new File([blob], `${baseName}_square.jpg`, { type: 'image/jpeg' });
        } finally {
            URL.revokeObjectURL(imageUrl);
        }
    };

    const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const croppedFile = await cropImageToSquare(file);
            setProfilePhoto(croppedFile);
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfilePhotoPreview(reader.result as string);
            };
            reader.readAsDataURL(croppedFile);
        }
    };

    const handleSaveChanges = async () => {
        if (!token) return;

        try {
            setIsLoading(true);

            if (profilePhoto) {
                const formData = new FormData();
                formData.append('_method', 'PUT');
                formData.append('profile_photo', profilePhoto);

                Object.entries(profileData).forEach(([key, value]) => {
                    formData.append(key, value);
                });

                const response = await fetch('/api/user/profile', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    },
                    body: formData
                });

                const result = await response.json();

                if (response.ok) {
                    updateUser(result.user);
                    onProfileUpdate(result.user);
                    setIsEditing(false);
                    setProfilePhoto(null);
                    setProfilePhotoPreview(result.user.profile_photo || null);
                    console.log('Profile updated successfully with photo');
                } else {
                    console.error('Profile update error:', result);
                    throw new Error(result.message || 'Failed to update profile');
                }
            } else {
                const response = await fetch('/api/user/profile', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(profileData)
                });

                const result = await response.json();

                if (response.ok) {
                    updateUser(result.user || profileData);
                    onProfileUpdate(result.user || profileData);
                    setIsEditing(false);
                    console.log('Profile updated successfully');
                } else {
                    console.error('Profile update error:', result);
                    throw new Error(result.message || 'Failed to update profile');
                }
            }

        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Error: ' + (error instanceof Error ? error.message : String(error)));
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        // Reset to original user data
        setProfileData({
            firstName: user?.firstName || "",
            lastName: user?.lastName || "",
            email: user?.email || "",
            phoneNumber: user?.phoneNumber || "",
            organization: user?.organization || "",
            areaOfResponsibility: user?.areaOfResponsibility || "",
        });
        setIsEditing(false);
    };

    return (
        <TabsContent value="settings">
            <Card className="border-waterbase-200">
                <CardHeader>
                    <div className="flex items-center justify-between mb-4">
                        <CardTitle className="text-waterbase-950">
                            Account Settings
                        </CardTitle>
                        {!isEditing ? (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsEditing(true)}
                            >
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Profile
                            </Button>
                        ) : (
                            <div className="flex space-x-2">
                                <Button
                                    size="sm"
                                    onClick={handleSaveChanges}
                                    disabled={isLoading}
                                    className="bg-waterbase-500 hover:bg-waterbase-600"
                                >
                                    <Save className="w-4 h-4 mr-2" />
                                    {isLoading ? 'Saving...' : 'Save'}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleCancel}
                                    disabled={isLoading}
                                >
                                    <X className="w-4 h-4 mr-2" />
                                    Cancel
                                </Button>
                            </div>
                        )}
                    </div>
                    
                    <CardDescription className="text-waterbase-600">
                        Update your profile information and preferences
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Profile Photo Upload */}
                    {isEditing && (
                        <div className="flex items-center gap-4 pb-4 border-b border-waterbase-200">
                            <div className="relative">
                                <div className="w-16 h-16 bg-waterbase-100 rounded-full flex items-center justify-center overflow-hidden">
                                    {profilePhotoPreview ? (
                                        <img src={profilePhotoPreview} alt="Profile preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-2xl font-bold text-waterbase-700">
                                            {user?.firstName[0]}{user?.lastName[0]}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex-1">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handlePhotoSelect}
                                    className="hidden"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isLoading}
                                    className="w-full"
                                >
                                    <Upload className="w-4 h-4 mr-2" />
                                    {profilePhoto ? 'Change Photo' : 'Upload Profile Photo'}
                                </Button>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="firstName">First Name</Label>
                            <Input
                                id="firstName"
                                value={profileData.firstName}
                                disabled={!isEditing}
                                onChange={(e) =>
                                    setProfileData({
                                        ...profileData,
                                        firstName: e.target.value,
                                    })
                                }
                                className={isEditing ? "border-waterbase-300" : "bg-gray-50"}
                            />
                        </div>
                        <div>
                            <Label htmlFor="lastName">Last Name</Label>
                            <Input
                                id="lastName"
                                value={profileData.lastName}
                                disabled={!isEditing}
                                onChange={(e) =>
                                    setProfileData({
                                        ...profileData,
                                        lastName: e.target.value,
                                    })
                                }
                                className={isEditing ? "border-waterbase-300" : "bg-gray-50"}
                            />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                            id="email"
                            type="email"
                            value={profileData.email}
                            disabled={!isEditing}
                            onChange={(e) =>
                                setProfileData({ ...profileData, email: e.target.value })
                            }
                            className={isEditing ? "border-waterbase-300" : "bg-gray-50"}
                        />
                    </div>

                    <div>
                        <Label htmlFor="phoneNumber">Phone Number</Label>
                        <Input
                            id="phoneNumber"
                            value={profileData.phoneNumber}
                            disabled={!isEditing}
                            onChange={(e) =>
                                setProfileData({ ...profileData, phoneNumber: e.target.value })
                            }
                            className={isEditing ? "border-waterbase-300" : "bg-gray-50"}
                        />
                    </div>

                    <div>
                        <Label htmlFor="organization">Organization</Label>
                        <Input
                            id="organization"
                            value={profileData.organization}
                            disabled={!isEditing}
                            onChange={(e) =>
                                setProfileData({ ...profileData, organization: e.target.value })
                            }
                            className={isEditing ? "border-waterbase-300" : "bg-gray-50"}
                        />
                    </div>

                    <div>
                        <Label htmlFor="areaOfResponsibility">Area of Responsibility</Label>
                        <Input
                            id="areaOfResponsibility"
                            value={profileData.areaOfResponsibility}
                            disabled={!isEditing}
                            onChange={(e) =>
                                setProfileData({ ...profileData, areaOfResponsibility: e.target.value })
                            }
                            className={isEditing ? "border-waterbase-300" : "bg-gray-50"}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            {user?.role === 'volunteer' 
                                ? 'Your general location or area of interest'
                                : 'The geographic area you manage or oversee'
                            }
                        </p>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
    );
};