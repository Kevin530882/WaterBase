import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { RoleGuard } from "./components/RoleGuard";
import * as VIEWS from "./pages";
import { ROUTE } from "./constants";

// Loading component for Suspense fallback
const PageLoader = () => (
    <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-waterbase-500" />
            <p className="text-waterbase-600">Loading page...</p>
        </div>
    </div>
);

export const AppRoutes = () => {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Suspense fallback={<PageLoader />}>
                    <Routes>
                        {/* PUBLIC ROUTES */}
                        <Route path="/" element={<VIEWS.Home />} />
                        <Route path={ROUTE.REGISTER.path} element={<VIEWS.Register />} />
                        <Route path={ROUTE.LOGIN.path} element={<VIEWS.Login />} />
                        <Route path={ROUTE.REPORT_POLLUTION_DEBUG.path} element={<VIEWS.ReportPollutionDebug />} />
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
                        <Route path={ROUTE.ORGANIZATION_PROFILE.path} element={<ProtectedRoute><VIEWS.OrganizationProfile /></ProtectedRoute>} />

                        {/* 404 ROUTE */}
                        <Route path="*" element={<VIEWS.NotFound />} />
                    </Routes>
                </Suspense>
            </BrowserRouter>
        </AuthProvider>
    );
};