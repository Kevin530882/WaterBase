import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { MapPin, Home, Upload, User, Users, BarChart3, Menu, X, LogOut, ChevronDown, Bell, Award, Shield, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchUnreadCount } from "@/services/notificationService";
import { toast } from "sonner";

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated, token } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Check if we're on auth pages
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  const getNavigationItems = () => {
    const baseItems = [
      { href: "/", label: "Home", icon: Home },
      { href: "/map", label: "Live Map", icon: MapPin },
      { href: "/report", label: "Report Pollution", icon: Upload },
    ];

    if (!user) return baseItems;

    // Add role-specific items
    switch (user.role) {
      case 'admin':
        return [
          { href: "/admin/dashboard", label: "Admin Dashboard", icon: BarChart3 },
          { href: "/admin/reports", label: "Admin Reports", icon: Upload },
          { href: "/admin/users", label: "Admin Users", icon: Users },
          { href: "/admin/devices", label: "Admin Devices", icon: Shield },
          { href: "/admin/badges", label: "Admin Badges", icon: Award },
          { href: "/admin/organizations", label: "Organization Approvals", icon: ShieldAlert },
        ];
      case 'ngo':
      case 'lgu':
        return [
          ...baseItems,
          { href: "/portal/organizer", label: "Organizer Portal", icon: Users },
          { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
        ];
      case 'volunteer':
        return [
          ...baseItems,
          { href: "/portal/volunteer", label: "Volunteer Portal", icon: Users },
          { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
        ];
      default:
        return [
          ...baseItems,
          { href: "/community", label: "Community", icon: Users },
          { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
        ];
    }
  };

  // Handle community click with role-based redirect
  const handleCommunityClick = (e: React.MouseEvent) => {
    e.preventDefault();

    if (!user) {
      navigate('/community');
      return;
    }

    switch (user.role) {
      case 'ngo':
      case 'lgu':
        navigate('/portal/organizer');
        break;
      case 'volunteer':
        navigate('/portal/volunteer');
        break;
      case 'admin':
        navigate('/admin/dashboard');
        break;
      default:
        navigate('/community');
    }
  };

  const navigationItems = getNavigationItems();

  useEffect(() => {
    if (!token || !isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    let mounted = true;

    const loadUnreadCount = async () => {
      try {
        const count = await fetchUnreadCount(token);
        if (mounted) {
          setUnreadCount(count);
        }
      } catch {
        // Keep the nav resilient even if notifications endpoint is unavailable.
      }
    };

    loadUnreadCount();
    const intervalId = window.setInterval(loadUnreadCount, 60000);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, [token, isAuthenticated]);

  const handleLogout = async () => {
    try {
      await logout();
      
      // Show success feedback
      toast.success("Logout successful! See you soon.", {
        duration: 2000,
        position: "top-center",
      });
      
      setTimeout(() => navigate('/login'), 500);
    } catch (error) {
      console.error('Logout error:', error);
      // Still redirect to login even if logout API fails
      toast.error("Logout encountered an issue, but you've been signed out.", {
        duration: 2000,
        position: "top-center",
      });
      setTimeout(() => navigate('/login'), 500);
    }
  };

  return (
    <nav className="bg-white/95 backdrop-blur-sm border-b border-waterbase-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-waterbase-500 to-enviro-500 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-waterbase-950">
              WaterBase
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {/* Show full navigation only if NOT on auth pages */}
            {!isAuthPage && (
              <>
                {navigationItems.map((item) => {
                  const Icon = item.icon;

                  // Special handling for Community link
                  if (item.label === "Community" && user) {
                    return (
                      <button
                        key={item.label}
                        onClick={handleCommunityClick}
                        className={cn(
                          "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                          location.pathname === item.href
                            ? "bg-waterbase-500 text-white hover:bg-waterbase-600"
                            : "text-waterbase-700 hover:text-waterbase-900 hover:bg-waterbase-50",
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </button>
                    );
                  }

                  return (
                    <Link key={item.label} to={item.href}>
                      <Button
                        variant={location.pathname === item.href ? "default" : "ghost"}
                        className={cn(
                          "flex items-center space-x-2",
                          location.pathname === item.href
                            ? "bg-waterbase-500 text-white hover:bg-waterbase-600"
                            : "text-waterbase-700 hover:text-waterbase-900 hover:bg-waterbase-50",
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </Button>
                    </Link>
                  );
                })}

                {isAuthenticated && (
                  <Button
                    variant="ghost"
                    className="relative text-waterbase-700 hover:text-waterbase-900 hover:bg-waterbase-50"
                    onClick={() => navigate('/profile?tab=notifications')}
                    aria-label="Open notifications"
                  >
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </Button>
                )}

                {/* Profile Dropdown - only show when authenticated and not on auth pages */}
                {isAuthenticated && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant={location.pathname === "/profile" ? "default" : "ghost"}
                        className={cn(
                          "flex items-center space-x-2",
                          location.pathname === "/profile"
                            ? "bg-waterbase-500 text-white hover:bg-waterbase-600"
                            : "text-waterbase-700 hover:text-waterbase-900 hover:bg-waterbase-50",
                        )}
                      >
                        <User className="w-4 h-4" />
                        <span>{user?.firstName || "Profile"}</span>
                        <ChevronDown className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 z-[9999]">
                      <DropdownMenuItem asChild>
                        <Link to="/profile" className="flex items-center space-x-2 cursor-pointer">
                          <User className="w-4 h-4" />
                          <span>Profile</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={handleLogout}
                        className="flex items-center space-x-2 cursor-pointer text-red-600 focus:text-red-600"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </>
            )}

            {/* Auth buttons - show on auth pages OR when not authenticated */}
            {(isAuthPage || !isAuthenticated) && (
              <div className="flex items-center space-x-2">
                <Link to="/login">
                  <Button
                    variant={location.pathname === '/login' ? "default" : "ghost"}
                    className={cn(
                      location.pathname === '/login'
                        ? "bg-waterbase-500 text-white hover:bg-waterbase-600"
                        : "text-waterbase-700 hover:text-waterbase-900 hover:bg-waterbase-50"
                    )}
                  >
                    Login
                  </Button>
                </Link>
                <Link to="/register">
                  <Button
                    variant={location.pathname === '/register' ? "default" : "outline"}
                    className={cn(
                      location.pathname === '/register'
                        ? "bg-waterbase-500 text-white hover:bg-waterbase-600"
                        : "border-waterbase-500 text-waterbase-500 hover:bg-waterbase-500 hover:text-white"
                    )}
                  >
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-waterbase-700"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-waterbase-200">
            <div className="flex flex-col space-y-2">
              {/* Show full navigation only if NOT on auth pages */}
              {!isAuthPage && (
                <>
                  {navigationItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.href;

                    // Special handling for Community link with role-based redirect
                    if (item.label === "Community" && user) {
                      const getCommunityLabel = () => {
                        if (user.role === 'admin') return "Admin Dashboard";
                        if (user.role === 'ngo' || user.role === 'lgu') return "Organizer Portal";
                        if (user.role === 'volunteer') return "Volunteer Portal";
                        return "Community";
                      };

                      const getCommunityPath = () => {
                        if (user.role === 'admin') return '/admin/dashboard';
                        if (user.role === 'ngo' || user.role === 'lgu') return '/portal/organizer';
                        if (user.role === 'volunteer') return '/portal/volunteer';
                        return '/community';
                      };

                      const communityPath = getCommunityPath();
                      const communityLabel = getCommunityLabel();
                      const isActiveRoute = location.pathname === communityPath;

                      return (
                        <div key={item.href}>
                          <Button
                            variant={isActiveRoute ? "default" : "ghost"}
                            className={cn(
                              "w-full justify-start space-x-2",
                              isActiveRoute
                                ? "bg-waterbase-500 text-white"
                                : "text-waterbase-700 hover:text-waterbase-900 hover:bg-waterbase-50",
                            )}
                            onClick={(e) => {
                              e.preventDefault();
                              handleCommunityClick(e);
                              setIsMobileMenuOpen(false);
                            }}
                          >
                            <Icon className="w-4 h-4" />
                            <span>{communityLabel}</span>
                          </Button>
                        </div>
                      );
                    }

                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Button
                          variant={isActive ? "default" : "ghost"}
                          className={cn(
                            "w-full justify-start space-x-2",
                            isActive
                              ? "bg-waterbase-500 text-white"
                              : "text-waterbase-700 hover:text-waterbase-900 hover:bg-waterbase-50",
                          )}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </Button>
                      </Link>
                    );
                  })}

                  {/* Mobile Profile - only show when authenticated and not on auth pages */}
                  {isAuthenticated && (
                    <>
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full justify-start space-x-2 relative",
                          "text-waterbase-700 hover:text-waterbase-900 hover:bg-waterbase-50"
                        )}
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          navigate('/profile?tab=notifications');
                        }}
                      >
                        <Bell className="w-4 h-4" />
                        <span>Notifications</span>
                        {unreadCount > 0 && (
                          <span className="ml-auto min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
                      </Button>

                      <Link
                        to="/profile"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Button
                          variant={location.pathname === "/profile" ? "default" : "ghost"}
                          className={cn(
                            "w-full justify-start space-x-2",
                            location.pathname === "/profile"
                              ? "bg-waterbase-500 text-white"
                              : "text-waterbase-700 hover:text-waterbase-900 hover:bg-waterbase-50",
                          )}
                        >
                          <User className="w-4 h-4" />
                          <span>Profile</span>
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          handleLogout();
                        }}
                        className="w-full justify-start space-x-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                      </Button>
                    </>
                  )}
                </>
              )}

              {/* Mobile Auth buttons - show on auth pages OR when not authenticated */}
              {(isAuthPage || !isAuthenticated) && (
                <div className="flex flex-col space-y-2">
                  <Link
                    to="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Button
                      variant={location.pathname === '/login' ? "default" : "ghost"}
                      className={cn(
                        "w-full justify-start",
                        location.pathname === '/login'
                          ? "bg-waterbase-500 text-white"
                          : "text-waterbase-700 hover:text-waterbase-900 hover:bg-waterbase-50"
                      )}
                    >
                      Login
                    </Button>
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Button
                      variant={location.pathname === '/register' ? "default" : "outline"}
                      className={cn(
                        "w-full justify-start",
                        location.pathname === '/register'
                          ? "bg-waterbase-500 text-white"
                          : "border-waterbase-500 text-waterbase-500 hover:bg-waterbase-500 hover:text-white"
                      )}
                    >
                      Sign Up
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;