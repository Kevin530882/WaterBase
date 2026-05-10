import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
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
      return <Navigate to="/admin/dashboard" replace />;
    default:
      return <VolunteerActivityLog />;
  }
};
