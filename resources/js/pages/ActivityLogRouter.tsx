import { useAuth } from "@/contexts/AuthContext";
import { VolunteerActivityLog } from "./VolunteerActivityLog";
import { OrganizerActivityLog } from "./OrganizerActivityLog";
import { ResearcherActivityLog } from "./ResearcherActivityLog";

export const ActivityLogRouter = () => {
  const { user } = useAuth();

  // Determine which activity log to show based on role
  if (!user) {
    return null;
  }

  switch (user.role) {
    case 'volunteer':
      return <VolunteerActivityLog />;
    case 'ngo':
    case 'lgu':
      return <OrganizerActivityLog />;
    case 'researcher':
      return <ResearcherActivityLog />;
    case 'admin':
      // Admins can view any activity log type, default to volunteer view
      return <VolunteerActivityLog />;
    default:
      return <VolunteerActivityLog />;
  }
};
