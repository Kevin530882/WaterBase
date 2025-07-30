import { useState, useEffect, useRef } from "react";
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
import { Zap, AlertCircle, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Camera, MapPin, Upload } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { OpenStreetMapSearchableSelect } from "@/components/pagecomponents/openstreetmap-searchable-select";
import piexif from "piexifjs";

export const ReportPollution = () => {
  const { user, isAuthenticated } = useAuth();
  const [showReportForm, setShowReportForm] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

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

  useEffect(() => {
    if (showCameraModal && !stream) {
      startCamera();
    }
    return () => {
      if (stream) {
        stopCamera();
      }
    };
  }, [showCameraModal]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setCameraError('');
    } catch (err) {
      setCameraError('Unable to access camera. Please ensure permissions are granted.');
      setShowCameraModal(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;
            const imageData = canvas.toDataURL('image/jpeg');
            const exifObj = {
              'GPS': {
                [piexif.GPSIFD.GPSLatitudeRef]: latitude >= 0 ? 'N' : 'S',
                [piexif.GPSIFD.GPSLatitude]: piexif.GPSHelper.degToDmsRational(Math.abs(latitude)),
                [piexif.GPSIFD.GPSLongitudeRef]: longitude >= 0 ? 'E' : 'W',
                [piexif.GPSIFD.GPSLongitude]: piexif.GPSHelper.degToDmsRational(Math.abs(longitude)),
              },
            };
            const exifBinary = piexif.dump(exifObj);
            const modifiedImage = piexif.insert(exifBinary, imageData);
            fetch(modifiedImage)
              .then((res) => res.blob())
              .then((blob) => {
                const file = new File([blob], "pollution-photo.jpg", { type: "image/jpeg" });
                setNewReport({ ...newReport, image: file });
                stopCamera();
                setShowCameraModal(false);
              });
          },
          (error) => {
            setErrorMessage('Unable to get location. Please ensure location services are enabled.');
            setShowCameraModal(false);
          }
        );
      }
    }
  };

  const convertImageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      // Check file size first (limit to 10MB)
      if (file.size > 10 * 1024 * 1024) {
        reject(new Error('Image file too large. Please select an image smaller than 10MB.'));
        return;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions (max 1024x768)
        const MAX_WIDTH = 1024;
        const MAX_HEIGHT = 768;
        let { width, height } = img;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = (height * MAX_WIDTH) / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = (width * MAX_HEIGHT) / height;
            height = MAX_HEIGHT;
          }
        }

        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;

        // Draw and compress image
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to base64 with compression (0.6 quality = 60%)
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);

        // Check if compressed size is still too large
        const compressedSize = compressedBase64.length * 0.75; // Estimate binary size
        if (compressedSize > 5 * 1024 * 1024) { // 5MB limit after compression
          reject(new Error('Image is too large even after compression. Please use a smaller image.'));
          return;
        }

        resolve(compressedBase64);
      };

      img.onerror = () => reject(new Error('Failed to load image'));

      // Read file as data URL to load into image element
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
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
      const imageBase64 = await convertImageToBase64(newReport.image);

      const reportData = {
        title: newReport.title,
        content: newReport.content,
        address: newReport.address,
        latitude: parseFloat(newReport.latitude),
        longitude: parseFloat(newReport.longitude),
        pollutionType: newReport.pollutionType,
        status: 'pending',
        image: imageBase64,
        severityByUser: newReport.severityByUser,
        user_id: user?.id || 1,
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
      if (response.ok && data.status === 'success') {
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
          setShowSubmitModal(false);
          setSubmitStatus('idle');
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
                <Camera className="w-6 h-6 text-waterbase-600" />
              </div>
              <CardTitle className="text-waterbase-950">
                Quick Photo Report
              </CardTitle>
              <CardDescription className="text-waterbase-600">
                Capture photos of water pollution directly with your camera.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full bg-waterbase-500 hover:bg-waterbase-600"
                onClick={() => setShowCameraModal(true)}
              >
                <Camera className="w-4 h-4 mr-2" />
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

                      <div>
                        <label className="text-sm font-medium mb-1 block">
                          Address *
                        </label>
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
                          placeholder="Search for barangay, city, or province in Philippines..."
                          disabled={isSubmitting}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Search for the specific location where pollution was observed. Coordinates will be auto-filled.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-sm font-medium mb-1 block">
                            Latitude * {newReport.latitude && <span className="text-green-600 text-xs">(Auto-filled)</span>}
                          </label>
                          <Input
                            placeholder="14.5995 (will auto-fill from address)"
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
                            Longitude * {newReport.longitude && <span className="text-green-600 text-xs">(Auto-filled)</span>}
                          </label>
                          <Input
                            placeholder="121.0008 (will auto-fill from address)"
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
                    <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Submitting...
                  </>
                ) : (
                  'Submit Report'
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {(submitStatus === 'error' || errorMessage) && !showReportForm && (
          <div className="mt-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          </div>
        )}

        <Dialog open={showCameraModal} onOpenChange={(open) => {
          setShowCameraModal(open);
          if (!open) stopCamera();
        }}>
          <DialogContent className="max-w-4xl w-full">
            <DialogHeader>
              <DialogTitle>Take a Photo</DialogTitle>
              <DialogDescription>
                Use your camera to capture a photo of the pollution.
              </DialogDescription>
            </DialogHeader>
            {cameraError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{cameraError}</AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                <video ref={videoRef} autoPlay playsInline className="w-full rounded-lg" />
                <canvas ref={canvasRef} className="hidden" />
                <Button
                  onClick={takePhoto}
                  className="w-full bg-waterbase-500 hover:bg-waterbase-600"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Capture Photo
                </Button>
              </div>
            )}
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
                <div className="w-8 h-8 mx-auto animate-spin rounded-full border-4 border-waterbase-500 border-t-transparent" />
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
                <Camera className="w-8 h-8 text-waterbase-600" />
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