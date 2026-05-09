import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Navigation from "@/components/Navigation";
import { Link } from "react-router-dom";
import {
  MapPin,
  Camera,
  Users,
  BarChart3,
  Smartphone,
  Globe,
  Shield,
  Zap,
} from "lucide-react";
import { BrandWordmark } from "@/components/BrandWordmark";

export const Home = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-waterbase-50 to-enviro-50">
      <Navigation />
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-waterbase-950 mb-6">
              Transforming Water
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-waterbase-500 to-enviro-500">
                {" "}
                Protection{" "}
              </span>
              in the Philippines
            </h1>
            <p className="text-xl text-waterbase-700 mb-8 max-w-3xl mx-auto">
              WaterbasePH empowers communities to monitor and report water
              pollution through AI-powered verification, creating transparency
              and driving environmental action.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/map">
                <Button
                  size="lg"
                  className="bg-waterbase-500 hover:bg-waterbase-600 text-white px-8 py-3"
                >
                  <MapPin className="w-5 h-5 mr-2" />
                  View Live Map
                </Button>
              </Link>
              <Link to="/report">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-waterbase-300 text-waterbase-700 hover:bg-waterbase-50 px-8 py-3"
                >
                  <Camera className="w-5 h-5 mr-2" />
                  Report Pollution
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-waterbase-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
          <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-enviro-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse delay-300"></div>
        </div>
      </section>

      {/* Key Features */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-waterbase-950 mb-4">
              Empowering Environmental Action
            </h2>
            <p className="text-lg text-waterbase-700 max-w-2xl mx-auto">
              Our comprehensive platform brings together citizens, NGOs, and
              government agencies to create meaningful change in water
              protection efforts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-waterbase-200 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-waterbase-100 rounded-lg flex items-center justify-center mb-4">
                  <Camera className="w-6 h-6 text-waterbase-600" />
                </div>
                <CardTitle className="text-waterbase-950">
                  Smart Reporting
                </CardTitle>
                <CardDescription className="text-waterbase-600">
                  Capture geotagged photos of pollution with AI-powered
                  verification for accurate reporting.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-waterbase-200 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-enviro-100 rounded-lg flex items-center justify-center mb-4">
                  <MapPin className="w-6 h-6 text-enviro-600" />
                </div>
                <CardTitle className="text-waterbase-950">
                  Live Mapping
                </CardTitle>
                <CardDescription className="text-waterbase-600">
                  Real-time visualization of pollution hotspots and cleanup
                  progress across the Philippines.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-waterbase-200 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-waterbase-100 rounded-lg flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-waterbase-600" />
                </div>
                <CardTitle className="text-waterbase-950">
                  Community Driven
                </CardTitle>
                <CardDescription className="text-waterbase-600">
                  Connect citizens, NGOs, and local government units for
                  collaborative environmental action.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-waterbase-200 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-enviro-100 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6 text-enviro-600" />
                </div>
                <CardTitle className="text-waterbase-950">
                  Data Transparency
                </CardTitle>
                <CardDescription className="text-waterbase-600">
                  Public dashboards showing environmental impact, cleanup
                  statistics, and progress tracking.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Platform Features */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-3xl font-bold text-waterbase-950 mb-6">
                Built for Every Stakeholder
              </h3>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-waterbase-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Smartphone className="w-5 h-5 text-waterbase-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-waterbase-950 mb-2">
                      Mobile-First Design
                    </h4>
                    <p className="text-waterbase-600">
                      Optimized for smartphones with offline capabilities,
                      enabling reports from remote areas.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-enviro-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-enviro-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-waterbase-950 mb-2">
                      AI-Powered Verification
                    </h4>
                    <p className="text-waterbase-600">
                      Advanced image detection ensures report accuracy and
                      reduces false submissions.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-waterbase-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Zap className="w-5 h-5 text-waterbase-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-waterbase-950 mb-2">
                      Real-Time Updates
                    </h4>
                    <p className="text-waterbase-600">
                      Instant notifications about cleanup progress, appeals, and
                      community campaigns.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="aspect-[4/3] bg-gradient-to-br from-waterbase-100 to-enviro-100 rounded-2xl p-8 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-waterbase-500 to-enviro-500 rounded-full flex items-center justify-center mb-4 mx-auto">
                    <Globe className="w-12 h-12 text-white" />
                  </div>
                  <p className="text-waterbase-700 font-medium">
                    Interactive Map Visualization
                  </p>
                  <p className="text-sm text-waterbase-600 mt-2">
                    Real-time pollution monitoring across the Philippines
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-waterbase-500 to-enviro-500">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Join the Movement for Cleaner Waters
          </h3>
          <p className="text-xl text-waterbase-100 mb-8">
            Whether you're a concerned citizen, environmental organization, or
            government agency, WaterbasePH provides the tools you need to make a
            real impact.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/report">
              <Button
                size="lg"
                variant="secondary"
                className="bg-white text-waterbase-600 hover:bg-waterbase-50 px-8 py-3"
              >
                Start Reporting
              </Button>
            </Link>
            <Link to="/community">
              <Button
                size="lg"
                variant="outline"
                className="border-white text-white bg-white/10 hover:bg-white hover:text-waterbase-600 px-8 py-3"
              >
                Join Community
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-waterbase-950 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-waterbase-500 to-enviro-500 rounded-lg flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <BrandWordmark className="text-xl text-white" />
              </div>
              <p className="text-waterbase-300 mb-4">
                Transforming water protection through community engagement, AI
                verification, and transparent environmental monitoring across
                the Philippines.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-waterbase-300">
                <li>
                  <Link
                    to="/map"
                    className="hover:text-white transition-colors"
                  >
                    Live Map
                  </Link>
                </li>
                <li>
                  <Link
                    to="/report"
                    className="hover:text-white transition-colors"
                  >
                    Report Pollution
                  </Link>
                </li>
                <li>
                  <Link
                    to="/community"
                    className="hover:text-white transition-colors"
                  >
                    Community
                  </Link>
                </li>
                <li>
                  <Link
                    to="/dashboard"
                    className="hover:text-white transition-colors"
                  >
                    Dashboard
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-waterbase-300">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    API
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Support
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-waterbase-800 mt-8 pt-8 text-center text-waterbase-400">
            <p>
              &copy; 2024 WaterbasePH. Environmental protection through technology
              and community.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
