import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import {
    Users,
    Award,
    CheckCircle,
} from "lucide-react";

export const VolunteerManagementTab = () => {
    return (
            <div className="space-y-6">
            <h2 className="text-xl font-semibold text-waterbase-950">
                Volunteer Management
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="border-waterbase-200">
                <CardContent className="p-6 text-center">
                    <Users className="w-12 h-12 text-waterbase-600 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-waterbase-950">
                    127
                    </h3>
                    <p className="text-waterbase-600">Total Volunteers</p>
                </CardContent>
                </Card>

                <Card className="border-waterbase-200">
                <CardContent className="p-6 text-center">
                    <CheckCircle className="w-12 h-12 text-enviro-600 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-waterbase-950">
                    89
                    </h3>
                    <p className="text-waterbase-600">Active This Month</p>
                </CardContent>
                </Card>

                <Card className="border-waterbase-200">
                <CardContent className="p-6 text-center">
                    <Award className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-waterbase-950">
                    1,254
                    </h3>
                    <p className="text-waterbase-600">Points Awarded</p>
                </CardContent>
                </Card>
            </div>

            <Card className="border-waterbase-200">
                <CardHeader>
                <CardTitle>Recent Volunteer Activity</CardTitle>
                <CardDescription>
                    Latest volunteers who signed up for your events
                </CardDescription>
                </CardHeader>
                <CardContent>
                <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>Volunteer management features coming soon</p>
                    <p className="text-sm">
                    You'll be able to view, communicate with, and reward your
                    volunteers here
                    </p>
                </div>
                </CardContent>
            </Card>
            </div>
    )
}