import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { RoleGuard } from "./components/RoleGuard";
import * as VIEWS from "./pages";
import { ROUTE } from "./constants";

export const AppRoutes = () => {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    {/* PUBLIC ROUTES */}
                    <Route path="/" element={<VIEWS.Home />} />
                    <Route path={ROUTE.REGISTER.path} element={<VIEWS.Register />} />
                    <Route path={ROUTE.LOGIN.path} element={<VIEWS.Login />} />
                    {/* PRIVATE ROUTES - All with Navigation */}
                    <Route path={ROUTE.MAP.path} element={<ProtectedRoute><VIEWS.MapView /></ProtectedRoute>} />
                    <Route path={ROUTE.RESEARCH_MAP.path} element={<ProtectedRoute><VIEWS.ResearchMap /></ProtectedRoute>} />
                    <Route path={ROUTE.REPORT_POLLUTION.path} element={<ProtectedRoute><VIEWS.ReportPollution /></ProtectedRoute>} />
                    <Route path={ROUTE.COMMUNITY.path} element={<ProtectedRoute><VIEWS.Community /></ProtectedRoute>} />
                    <Route path={ROUTE.DASHBOARD.path} element={<ProtectedRoute><VIEWS.Dashboard /></ProtectedRoute>} />
                    <Route path={ROUTE.ORGANIZER_PORTAL.path} element={
                        <ProtectedRoute>
                            <RoleGuard roles={['ngo', 'lgu']}>
                                <VIEWS.OrganizerPortal />
                            </RoleGuard>
                        </ProtectedRoute>
                    } />
                    <Route path={ROUTE.VOLUNTEER_PORTAL.path} element={
                        <ProtectedRoute>
                            <RoleGuard roles={['volunteer']}>
                                <VIEWS.VolunteerPortal />
                            </RoleGuard>
                        </ProtectedRoute>
                    } />
                    <Route path={ROUTE.ADMIN_DASHBOARD.path} element={
                        <ProtectedRoute>
                            <RoleGuard roles={['admin']}>
                                <VIEWS.AdminDashboard />
                            </RoleGuard>
                        </ProtectedRoute>
                    } />
                    <Route path={ROUTE.ADMIN_REPORTS.path} element={
                        <ProtectedRoute>
                            <RoleGuard roles={['admin']}>
                                <VIEWS.AdminReports />
                            </RoleGuard>
                        </ProtectedRoute>
                    } />
                    <Route path={ROUTE.ADMIN_USERS.path} element={
                        <ProtectedRoute>
                            <RoleGuard roles={['admin']}>
                                <VIEWS.AdminUsers />
                            </RoleGuard>
                        </ProtectedRoute>
                    } />
                    <Route path={ROUTE.PROFILE.path} element={<ProtectedRoute><VIEWS.Profile /></ProtectedRoute>} />

                    {/* 404 ROUTE */}
                    <Route path="*" element={<VIEWS.NotFound />} />   
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
};