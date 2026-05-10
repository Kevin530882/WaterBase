import { Badge } from "@/components/ui/badge";
import Navigation from "@/components/Navigation";
import { Events } from "../components/pagecomponents/volunteer/Events";

export const VolunteerPortal = () => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-waterbase-50 to-enviro-50">
            <Navigation />

            <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-waterbase-950 mb-2">
                        Volunteer Portal
                    </h1>
                    <p className="text-waterbase-700 mb-4">
                        Join cleanup events and make a difference in water conservation
                    </p>
                    <div className="flex items-center space-x-4">
                        <Badge variant="outline" className="bg-enviro-50 text-enviro-700">
                            Volunteer Access
                        </Badge>
                    </div>
                </div>

                <Events />
            </div>
        </div>
    );
};
