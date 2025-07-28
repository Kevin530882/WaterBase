import { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Zap, AlertCircle, CheckCircle, Upload as UploadIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Camera, MapPin, Upload, Smartphone } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { SearchableSelect } from "@/components/pagecomponents/searchable-select";

export const ReportPollution = () => {
  const { user, isAuthenticated } = useAuth();
  const [showReportForm, setShowReportForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Form state
  const [newReport, setNewReport] = useState({
    title: "",
    content: "",
    address: "",
    latitude: "",
    longitude: "",
    pollutionType: "",
    severityByUser: "",
    image: null as File | null,
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        setErrorMessage('Please select a valid image file (JPEG, PNG, or GIF)');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage('Image file size must be less than 5MB');
        return;
      }
      
      setNewReport({ ...newReport, image: file });
      setErrorMessage('');
    }
  };

  const convertImageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          resolve(reader.result as string);
        } else {
          reject(new Error('Failed to convert image'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const validateForm = () => {
    if (!newReport.title.trim()) {
      setErrorMessage('Title is required');
      return false;
    }
    if (!newReport.content.trim()) {
      setErrorMessage('Content description is required');
      return false;
    }
    if (!newReport.address.trim()) {
      setErrorMessage('Address is required');
      return false;
    }
    if (!newReport.latitude || !newReport.longitude) {
      setErrorMessage('Latitude and longitude are required');
      return false;
    }
    if (!newReport.pollutionType) {
      setErrorMessage('Pollution type is required');
      return false;
    }
    if (!newReport.severityByUser) {
      setErrorMessage('Severity level is required');
      return false;
    }
    if (!newReport.image) {
      setErrorMessage('Image is required');
      return false;
    }
    
    // Validate coordinates are numbers
    const lat = parseFloat(newReport.latitude);
    const lng = parseFloat(newReport.longitude);
    if (isNaN(lat) || isNaN(lng)) {
      setErrorMessage('Please enter valid latitude and longitude values');
      return false;
    }
    
    // Validate coordinate ranges
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setErrorMessage('Please enter valid coordinate values');
      return false;
    }
    
    return true;
  };

  const handleSubmitReport = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setSubmitStatus('idle');

    try {
      // Convert image to base64
      const imageBase64 = await convertImageToBase64(newReport.image!);

      const reportData = {
        title: newReport.title,
        content: newReport.content,
        address: newReport.address,
        latitude: parseFloat(newReport.latitude),
        longitude: parseFloat(newReport.longitude),
        pollutionType: newReport.pollutionType,
        status: 'pending', // Default status
        image: imageBase64,
        severityByUser: newReport.severityByUser,
        user_id: user?.id || 1, // Use authenticated user ID
      };

      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify(reportData),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitStatus('success');
        
        // Reset form
        setNewReport({
          title: "",
          content: "",
          address: "",
          latitude: "",
          longitude: "",
          pollutionType: "",
          severityByUser: "",
          image: null,
        });

        // Close dialog after 2 seconds
        setTimeout(() => {
          setShowReportForm(false);
          setSubmitStatus('idle');
        }, 2000);
      } else {
        throw new Error(data.message || 'Failed to submit report');
      }
    } catch (error) {
      console.error('Submit error:', error);
      setSubmitStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAIGenerate = () => {
    // Non-functional for now as requested
    console.log("AI Generate Report - Coming Soon");
  };

  // Auto-detect location (optional enhancement)
  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setNewReport({
            ...newReport,
            latitude: position.coords.latitude.toString(),
            longitude: position.coords.longitude.toString(),
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
          setErrorMessage('Could not get current location. Please enter coordinates manually.');
        }
      );
    } else {
      setErrorMessage('Geolocation is not supported by this browser.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-waterbase-50 to-enviro-50">
      <Navigation />

      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-waterbase-950 mb-4">
            Report Water Pollution
          </h1>
          <p className="text-lg text-waterbase-700 max-w-2xl mx-auto">
            Help protect our waterways by reporting pollution incidents in your
            area. Your reports are verified using AI and contribute to
            environmental protection efforts.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="border-waterbase-200">
            <CardHeader>
              <div className="w-12 h-12 bg-waterbase-100 rounded-lg flex items-center justify-center mb-4">
                <Camera className="w-6 h-6 text-waterbase-600" />
              </div>
              <CardTitle className="text-waterbase-950">
                Quick Photo Report
              </CardTitle>
              <CardDescription className="text-waterbase-600">
                Capture and submit photos of water pollution with automatic
                location tagging.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full bg-waterbase-500 hover:bg-waterbase-600"
                disabled
              >
                <Camera className="w-4 h-4 mr-2" />
                Take Photo Report (Coming Soon)
              </Button>
            </CardContent>
          </Card>

          <Card className="border-waterbase-200">
            <CardHeader>
              <div className="w-12 h-12 bg-enviro-100 rounded-lg flex items-center justify-center mb-4">
                <Upload className="w-6 h-6 text-enviro-600" />
              </div>
              <CardTitle className="text-waterbase-950">
                Detailed Report
              </CardTitle>
              <CardDescription className="text-waterbase-600">
                Submit a comprehensive report with photos and detailed
                information.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={showReportForm} onOpenChange={setShowReportForm}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full border-enviro-300 text-enviro-700 hover:bg-enviro-50"
                    disabled={!isAuthenticated}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Create Detailed Report
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Report Water Pollution</DialogTitle>
                    <DialogDescription>
                      Submit a detailed pollution report for your area
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    {/* Status Messages */}
                    {submitStatus === 'success' && (
                      <Alert className="border-green-200 bg-green-50">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-700">
                          Report submitted successfully! Thank you for helping protect our waterways.
                        </AlertDescription>
                      </Alert>
                    )}

                    {(submitStatus === 'error' || errorMessage) && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{errorMessage}</AlertDescription>
                      </Alert>
                    )}

                    <div>
                      <label className="text-sm font-medium mb-1 block">
                        Title *
                      </label>
                      <Input
                        placeholder="Brief description of the pollution"
                        value={newReport.title}
                        onChange={(e) =>
                          setNewReport({ ...newReport, title: e.target.value })
                        }
                        disabled={isSubmitting}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-1 block">
                        Content *
                      </label>
                      <Textarea
                        placeholder="Detailed description of what you observed..."
                        value={newReport.content}
                        onChange={(e) =>
                          setNewReport({
                            ...newReport,
                            content: e.target.value,
                          })
                        }
                        rows={3}
                        disabled={isSubmitting}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-1 block">
                        Address *
                      </label>
                      <SearchableSelect
                        value={newReport.address}
                        onValueChange={(value) =>
                          setNewReport({
                            ...newReport,
                            address: value,
                          })
                        }
                        placeholder="Search for region, province, city, or barangay..."
                        disabled={isSubmitting}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Search for the specific location where pollution was observed
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-sm font-medium mb-1 block">
                          Latitude *
                        </label>
                        <Input
                          placeholder="14.5995"
                          value={newReport.latitude}
                          onChange={(e) =>
                            setNewReport({
                              ...newReport,
                              latitude: e.target.value,
                            })
                          }
                          disabled={isSubmitting}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">
                          Longitude *
                        </label>
                        <Input
                          placeholder="121.0008"
                          value={newReport.longitude}
                          onChange={(e) =>
                            setNewReport({
                              ...newReport,
                              longitude: e.target.value,
                            })
                          }
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>

                    <div className="text-center">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleGetCurrentLocation}
                        disabled={isSubmitting}
                      >
                        <MapPin className="w-4 h-4 mr-2" />
                        Use Current Location
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-1 block">
                          Pollution Type *
                        </label>
                        <Select
                          value={newReport.pollutionType}
                          onValueChange={(value) =>
                            setNewReport({ ...newReport, pollutionType: value })
                          }
                          disabled={isSubmitting}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select pollution type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Industrial Waste">Industrial Waste</SelectItem>
                            <SelectItem value="Plastic Pollution">Plastic Pollution</SelectItem>
                            <SelectItem value="Sewage Discharge">Sewage Discharge</SelectItem>
                            <SelectItem value="Chemical Pollution">Chemical Pollution</SelectItem>
                            <SelectItem value="Oil Spill">Oil Spill</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-1 block">
                          Severity Level *
                        </label>
                        <Select
                          value={newReport.severityByUser}
                          onValueChange={(value) =>
                            setNewReport({ ...newReport, severityByUser: value })
                          }
                          disabled={isSubmitting}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select severity" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-1 block">
                        Upload Image *
                      </label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                          id="image-upload"
                          disabled={isSubmitting}
                        />
                        <label
                          htmlFor="image-upload"
                          className="cursor-pointer flex flex-col items-center"
                        >
                          <UploadIcon className="w-8 h-8 text-gray-400 mb-2" />
                          <span className="text-sm text-gray-600">
                            {newReport.image 
                              ? `Selected: ${newReport.image.name}`
                              : 'Click to upload image or drag and drop'
                            }
                          </span>
                          <span className="text-xs text-gray-500 mt-1">
                            JPEG, PNG, GIF up to 5MB
                          </span>
                        </label>
                      </div>
                    </div>

                    <div className="flex space-x-2 pt-4">
                      <Button
                        onClick={handleSubmitReport}
                        disabled={isSubmitting || submitStatus === 'success'}
                        className="flex-1 bg-waterbase-500 hover:bg-waterbase-600"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Submitting...
                          </>
                        ) : (
                          'Submit Report'
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleAIGenerate}
                        disabled={isSubmitting}
                        className="flex-1 border-enviro-300 text-enviro-700 hover:bg-enviro-50"
                      >
                        <Zap className="w-4 h-4 mr-1" />
                        AI Generate (Soon)
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {!isAuthenticated && (
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Please log in to submit a report
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 bg-white rounded-lg shadow-sm border border-waterbase-200 p-8">
          <h2 className="text-2xl font-bold text-waterbase-950 mb-6 text-center">
            How It Works
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-waterbase-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Smartphone className="w-8 h-8 text-waterbase-600" />
              </div>
              <h3 className="font-semibold text-waterbase-950 mb-2">
                1. Capture
              </h3>
              <p className="text-waterbase-600 text-sm">
                Take photos of pollution and gather location details
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-enviro-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-enviro-600" />
              </div>
              <h3 className="font-semibold text-waterbase-950 mb-2">
                2. Submit
              </h3>
              <p className="text-waterbase-600 text-sm">
                Upload your report with description and location details
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-waterbase-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-waterbase-600" />
              </div>
              <h3 className="font-semibold text-waterbase-950 mb-2">
                3. Verify & Map
              </h3>
              <p className="text-waterbase-600 text-sm">
                Report is reviewed and added to the public pollution map
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};