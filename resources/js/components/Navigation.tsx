import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { MapPin, Home, Upload, User, Users, BarChart3, Menu, X, LogOut, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Check if we're on auth pages
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  // Navigation items excluding profile (since it's now in dropdown)
  const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/map", label: "Live Map", icon: MapPin },
    { href: "/report", label: "Report Pollution", icon: Upload },
    { href: "/community", label: "Community", icon: Users },
    { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Still redirect to login even if logout API fails
      navigate('/login');
    }
  };

  return (
    <nav className="bg-white/95 backdrop-blur-sm border-b border-waterbase-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-waterbase-500 to-enviro-500 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-waterbase-950">
              WaterBase
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {/* Show full navigation only if NOT on auth pages */}
            {!isAuthPage && (
              <>
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href;
                  return (
                    <Link key={item.href} to={item.href}>
                      <Button
                        variant={isActive ? "default" : "ghost"}
                        className={cn(
                          "flex items-center space-x-2",
                          isActive
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
                    <DropdownMenuContent align="end" className="w-48">
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
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.href;
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