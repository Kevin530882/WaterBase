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
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navigation from "@/components/Navigation";
import {
User,
Settings,
Camera,
MapPin,
Award,
BarChart3,
Bell,
Shield,
Edit,
} from "lucide-react";

export const Notification = () => {
    return (
        <TabsContent value="notifications">
            <Card className="border-waterbase-200">
            <CardHeader>
                <CardTitle className="text-waterbase-950">
                Notification Settings
                </CardTitle>
                <CardDescription className="text-waterbase-600">
                Manage how you receive updates and alerts
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                <div className="p-4 bg-waterbase-50 rounded-lg">
                    <Bell className="w-6 h-6 text-waterbase-600 mb-2" />
                    <h4 className="font-medium text-waterbase-950 mb-2">
                    Notification preferences coming soon
                    </h4>
                    <p className="text-sm text-waterbase-600">
                    You'll be able to customize email alerts, push
                    notifications, and SMS updates for report status changes,
                    community events, and cleanup initiatives.
                    </p>
                </div>
                </div>
            </CardContent>
            </Card>
        </TabsContent>
    )
}