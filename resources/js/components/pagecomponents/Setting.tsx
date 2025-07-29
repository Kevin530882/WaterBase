import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Edit, Save, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface SettingProps {
    onProfileUpdate: (updatedData: any) => void;
}

export const Setting = ({ onProfileUpdate }: SettingProps) => {
    const { user, token } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [profileData, setProfileData] = useState({
        firstName: user?.firstName || "",
        lastName: user?.lastName || "",
        email: user?.email || "",
        phoneNumber: user?.phoneNumber || "",
        organization: user?.organization || "",
        areaOfResponsibility: user?.areaOfResponsibility || "",
    });

    const handleSaveChanges = async () => {
        if (!token) return;

        try {
            setIsLoading(true);
            
            // This endpoint should now work
            const response = await fetch('/api/user/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(profileData)
            });

            if (response.ok) {
                const result = await response.json();
                onProfileUpdate(profileData);
                setIsEditing(false);
                console.log('Profile updated successfully');
            } else {
                throw new Error('Failed to update profile');
            }
            
        } catch (error) {
            console.error('Error updating profile:', error);
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