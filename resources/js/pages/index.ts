import { lazy } from 'react';

// Lazy load all page components for code splitting
export const AdminBadges = lazy(() => import('./AdminBadges').then(m => ({ default: m.AdminBadges })));
export const AdminDashboard = lazy(() => import('./AdminDashboard').then(m => ({ default: m.AdminDashboard })));
export const AdminReports = lazy(() => import('./AdminReports').then(m => ({ default: m.AdminReports })));
export const AdminUsers = lazy(() => import('./AdminUsers').then(m => ({ default: m.AdminUsers })));
export const Community = lazy(() => import('./Community').then(m => ({ default: m.Community })));
export const Dashboard = lazy(() => import('./Dashboard').then(m => ({ default: m.Dashboard })));
export const Home = lazy(() => import('./Home').then(m => ({ default: m.Home })));
export const Login = lazy(() => import('./Login').then(m => ({ default: m.Login })));
export const MapView = lazy(() => import('./MapView').then(m => ({ default: m.MapView })));
export const NotFound = lazy(() => import('./NotFound').then(m => ({ default: m.NotFound })));
export const OrganizerPortal = lazy(() => import('./OrganizerPortal').then(m => ({ default: m.OrganizerPortal })));
export const OrganizationProfile = lazy(() => import('./OrganizationProfile').then(m => ({ default: m.OrganizationProfile })));
export const Profile = lazy(() => import('./Profile').then(m => ({ default: m.Profile })));
export const ReportPollutionDebug = lazy(() => import('./ReportPollutionDebug').then(m => ({ default: m.ReportPollutionDebug })));
export const Register = lazy(() => import('./Register').then(m => ({ default: m.Register })));
export const ReportPollution = lazy(() => import('./ReportPollution').then(m => ({ default: m.ReportPollution })));
export const ResearchMap = lazy(() => import('./ResearchMap').then(m => ({ default: m.ResearchMap })));
export const VolunteerPortal = lazy(() => import('./VolunteerPortal').then(m => ({ default: m.VolunteerPortal })));