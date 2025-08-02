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
import { Zap, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Upload } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { OpenStreetMapSearchableSelect } from "@/components/pagecomponents/openstreetmap-searchable-select";

export const ReportPollution = () => {
  const { user, isAuthenticated } = useAuth();
  const [showReportForm, setShowReportForm] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [verificationStatus, setVerificationStatus] = useState('idle');
  const [showLocationFields, setShowLocationFields] = useState(false);

  const [newReport, setNewReport] = useState({
    title: "",
    content: "",
    address: "",
    latitude: "",
    longitude: "",
    pollutionType: "",
    severityByUser: "",
    image: null,
  });

  const verifyImageMetadata = async (file) => {
    setVerificationStatus('verifying');
    setShowLocationFields(false);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const response = await fetch('/api/reports/verify-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: formData,
      });
      const data = await response.json();
      console.log('Verify image response:', response);
      console.log('Verify image data:', data);
      if (response.ok && data.tampered === false && data.gps != null) {
        setNewReport(prev => ({
          ...prev,
          address: data.address || '',
          latitude: data.latitude?.toString() || '',
          longitude: data.longitude?.toString() || ''
        }));
        setVerificationStatus('success');
        setShowLocationFields(false);
        return true;
      } else if (response.ok === false && data.tampered === true && data.gps != null) {
        setVerificationStatus('failed');
        setShowLocationFields(false);
        setErrorMessage('Error: Image flagged as tampered. Please upload an original, unedited camera photo.');
        return false;
      } else {
        setVerificationStatus('failed');
        setShowLocationFields(true);
        setErrorMessage('No location metadata found. Please enter location manually.');
        return false;
      }
    } catch (error) {
      console.error('Verify image error:', error);
      setVerificationStatus('failed');
      setShowLocationFields(true);
      setErrorMessage('Failed to verify image metadata. Please enter location manually.');
      return false;
    }
  };

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    console.log('Selected file:', file);
    if (file) {
      if (file.type.startsWith('image/') && ['image/jpeg', 'image/png', 'image/jpg', 'image/gif'].includes(file.type)) {
        setNewReport({ ...newReport, image: file });
        console.log('Image set in state:', file.name);
        const isValid = await verifyImageMetadata(file);
        if (!isValid) {
          setNewReport({ ...newReport, image: file, latitude: '', longitude: '' });
        }
      } else {
        setErrorMessage('Please select a valid image file (JPEG, PNG, JPG, or GIF).');
      }
    } else {
      setErrorMessage('No image file selected. Please choose an image.');
      setNewReport({ ...newReport, image: null });
    }
  };

  const validateForm = () => {
    console.log('Form values before validation:', newReport);
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
    if (!newReport.latitude || !newReport.longitude) {
      setErrorMessage('Latitude and longitude are required');
      return false;
    }
    if (!newReport.severityByUser) {
      setErrorMessage('Severity level is required');
      return false;
    }
    if (!newReport.image || !(newReport.image instanceof File)) {
      setErrorMessage('A valid image file is required');
      return false;
    }

    const lat = parseFloat(newReport.latitude);
    const lng = parseFloat(newReport.longitude);
    if (isNaN(lat) || isNaN(lng)) {
      setErrorMessage('Please enter valid latitude and longitude values');
      return false;
    }

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
    setShowSubmitModal(true);
    setErrorMessage('');
    setSubmitStatus('idle');

    try {
      // Step 1: Call /api/predict with FormData
      const predictFormData = new FormData();

      // Debug: Check if the image is still valid
      console.log('Image file before prediction:', {
        name: newReport.image?.name,
        type: newReport.image?.type,
        size: newReport.image?.size,
        isFile: newReport.image instanceof File
      });

      predictFormData.append('image', newReport.image);
      predictFormData.append('severityByUser', newReport.severityByUser);

      console.log('Submitting to /api/predict:', {
        image: newReport.image.name,
        severityByUser: newReport.severityByUser,
      });

      const ai_response = await fetch('/api/predict', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: predictFormData,
      });

      if (!ai_response.ok) {
        const text = await ai_response.text();
        console.error('AI Prediction response:', {
          status: ai_response.status,
          statusText: ai_response.statusText,
          body: text,
        });
        throw new Error(`Prediction failed: ${text}`);
      }

      const ai_data = await ai_response.json();
      console.log('AI Response:', ai_response);
      console.log('AI Data:', ai_data);

      let new_status = 'pending';
      if (ai_data.ai_verified === true) {
        new_status = 'verified';
      }

      // Step 2: Submit report with FormData
      const reportFormData = new FormData();
      reportFormData.append('title', newReport.title);
      reportFormData.append('content', newReport.content);
      reportFormData.append('address', newReport.address);
      reportFormData.append('latitude', newReport.latitude);
      reportFormData.append('longitude', newReport.longitude);
      reportFormData.append('pollutionType', newReport.pollutionType);
      reportFormData.append('status', new_status);
      reportFormData.append('image', newReport.image);
      reportFormData.append('severityByUser', newReport.severityByUser);
      reportFormData.append('user_id', (user?.id || 1).toString());
      reportFormData.append('severityByAI', ai_data[0].severity_level);
      reportFormData.append('ai_verified', ai_data.ai_verified ? '1' : '0');
      reportFormData.append('ai_confidence', ai_data[0].overall_confidence.toString());
      reportFormData.append('severityPercentage', ai_data[0].pollution_percentage.toString());

      console.log('Submitting to /api/reports:', {
        title: newReport.title,
        content: newReport.content,
        address: newReport.address,
        latitude: newReport.latitude,
        longitude: newReport.longitude,
        pollutionType: newReport.pollutionType,
        status: new_status,
        image: newReport.image?.name || 'undefined',
        severityByUser: newReport.severityByUser,
        user_id: user?.id || 1,
        severityByAI: ai_data[0].severity_level,
        ai_verified: ai_data.ai_verified,
        ai_confidence: ai_data[0].overall_confidence,
        severityPercentage: ai_data[0].pollution_percentage,
      });

      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: reportFormData,
      });

      if (!response.ok) {
        const text = await response.text();
        console.error('Report submission response:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: text,
        });
        throw new Error(`Report submission failed: ${text}`);
      }

      const data = await response.json();
      console.log('Report Response:', response);
      console.log('Report Data:', data);

      if (data.status === 'success') {
        setSubmitStatus('success');
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
        setTimeout(() => {
          setShowReportForm(false);
          setShowCameraModal(false);
          setShowSubmitModal(false);
          setSubmitStatus('idle');
          setVerificationStatus('idle');
        }, 5000);
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
                <Upload className="w-6 h-6 text-waterbase-600" />
              </div>
              <CardTitle className="text-waterbase-950">
                Quick Photo Report
              </CardTitle>
              <CardDescription className="text-waterbase-600">
                Upload a photo of water pollution using your device's camera.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full bg-waterbase-500 hover:bg-waterbase-600"
                onClick={() => setShowCameraModal(true)}
              >
                <Upload className="w-4 h-4 mr-2" />
                Take Photo Report
              </Button>
              {newReport.image && (
                <div className="mt-4">
                  <img
                    src={URL.createObjectURL(newReport.image)}
                    alt="Preview"
                    className="max-w-full h-auto rounded-lg"
                  />
                </div>
              )}
            </CardContent>
          </Card>
          <div>
            <Card className="border-waterbase-200">
              <CardHeader>
                <div className="w-12 h-12 bg-enviro-100 rounded-lg flex items-center justify-center mb-4">
                  <Upload className="w-6 h-6 text-enviro-600" />
                </div>
                <CardTitle className="text-waterbase-950">
                  Detailed Report
                </CardTitle>
                <CardDescription className="text-waterbase-600">
                  Submit a comprehensive report with detailed information.
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
        </div>

        <div className="mt-8">
          <Card className="border-waterbase-200">
            <CardHeader>
              <CardTitle className="text-waterbase-950">Submit Report</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleSubmitReport}
                disabled={!newReport.image || isSubmitting}
                className="w-full bg-waterbase-500 hover:bg-waterbase-600"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Report'
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {(submitStatus === 'error' || errorMessage) && !showReportForm && !showCameraModal && (
          <div className="mt-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          </div>
        )}

        <Dialog open={showCameraModal} onOpenChange={setShowCameraModal}>
          <DialogContent className="max-w-[95vw] sm:max-w-md md:max-w-2xl lg:max-w-4xl w-full p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>Upload Photo Report</DialogTitle>
              <DialogDescription>
                Use your device's camera or upload an image of the pollution.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
              <Input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageSelect}
                className="w-full"
              />

              {verificationStatus === 'verifying' && (
                <div className="text-center py-4">
                  <Loader2 className="w-8 h-8 mx-auto animate-spin text-waterbase-500" />
                  <p className="mt-2 text-waterbase-600">Verifying image metadata...</p>
                </div>
              )}

              {(verificationStatus === 'failed' || errorMessage) && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}

              {newReport.image && verificationStatus !== 'verifying' && (
                <div className="flex justify-center">
                  <img
                    src={URL.createObjectURL(newReport.image)}
                    alt="Preview"
                    className="max-w-full max-h-[40vh] object-contain rounded-lg"
                  />
                </div>
              )}

              {showLocationFields && (
                <>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Address *</label>
                    <OpenStreetMapSearchableSelect
                      value={newReport.address}
                      onValueChange={(address: string, coordinates?: { lat: number; lng: number }) => {
                        setNewReport({
                          ...newReport,
                          address,
                          latitude: coordinates?.lat.toString() || newReport.latitude,
                          longitude: coordinates?.lng.toString() || newReport.longitude,
                        });
                      }}
                      placeholder="Search for region, province, city, or barangay..."
                      disabled={verificationStatus === 'verifying'}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Latitude *</label>
                      <Input
                        placeholder="14.5995"
                        value={newReport.latitude}
                        onChange={(e) => setNewReport({ ...newReport, latitude: e.target.value })}
                        disabled={verificationStatus === 'verifying'}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Longitude *</label>
                      <Input
                        placeholder="121.0008"
                        value={newReport.longitude}
                        onChange={(e) => setNewReport({ ...newReport, longitude: e.target.value })}
                        disabled={verificationStatus === 'verifying'}
                      />
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGetCurrentLocation}
                      disabled={verificationStatus === 'verifying'}
                    >
                      <MapPin className="w-4 h-4 mr-2" />
                      Use Current Location
                    </Button>
                  </div>
                </>
              )}

            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showSubmitModal} onOpenChange={(open) => {
          if (!isSubmitting) setShowSubmitModal(open);
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {submitStatus === 'success' ? 'Submission Successful' : 'Submitting Report'}
              </DialogTitle>
              <DialogDescription>
                {submitStatus === 'success'
                  ? 'Your report has been successfully submitted and verified.'
                  : 'Please wait while we process and verify your report...'}
              </DialogDescription>
            </DialogHeader>
            {isSubmitting ? (
              <div className="text-center">
                <Loader2 className="w-8 h-8 mx-auto animate-spin text-waterbase-500" />
                <p className="mt-2 text-waterbase-600">Processing...</p>
              </div>
            ) : submitStatus === 'success' ? (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  Report submitted successfully! Thank you for helping protect our waterways.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}
          </DialogContent>
        </Dialog>

        <div className="mt-12 bg-white rounded-lg shadow-sm border border-waterbase-200 p-8">
          <h2 className="text-2xl font-bold text-waterbase-950 mb-6 text-center">
            How It Works
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-waterbase-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-waterbase-600" />
              </div>
              <h3 className="font-semibold text-waterbase-950 mb-2">
                1. Capture
              </h3>
              <p className="text-waterbase-600 text-sm">
                Take photos of pollution using your device's camera
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

