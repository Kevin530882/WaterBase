import { useState } from "react";
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
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { MapPin, Upload } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { OpenStreetMapSearchableSelect } from "@/components/pagecomponents/openstreetmap-searchable-select";
import { formatDisplayName, NominatimResult } from '@/utils/location';
export const ReportPollutionDebug = () => {
  const { user, isAuthenticated } = useAuth();
  const [showReportForm, setShowReportForm] = useState(false);
  // Quick Photo flow modal
  const [showCameraModal, setShowCameraModal] = useState(false);
  // Dedicated Detailed flow scan modal
  const [showDetailedScanModal, setShowDetailedScanModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  // Quick flow verification and location state
  const [verificationStatus, setVerificationStatus] = useState('idle');
  const [showLocationFields, setShowLocationFields] = useState(false);
  // Detailed flow verification and location state
  const [verificationStatusDetailed, setVerificationStatusDetailed] = useState<'idle'|'verifying'|'success'|'failed'>('idle');
  const [showLocationFieldsDetailed, setShowLocationFieldsDetailed] = useState(false);
  const [fieldsLocked, setFieldsLocked] = useState(false);
  const [userStartedDetailedForm, setUserStartedDetailedForm] = useState(false);
  // Quick flow AI status
  const [aiScanStatus, setAiScanStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  // Detailed flow AI status
  const [aiScanStatusDetailed, setAiScanStatusDetailed] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [aiResults, setAiResults] = useState<null | {
    severity_level: string;
    overall_confidence: number;
    pollution_percentage: number;
    water_predictions: Array<{ class_name: string; confidence: number; mask_area: number }>;
    trash_predictions: Array<{ class_name: string; confidence: number; mask_area: number }>;
    pollution_predictions: Array<{ class_name: string; confidence: number; mask_area: number }>;
    ai_verified: boolean;
  }>(null);
  const [showAiResultModal, setShowAiResultModal] = useState(false);
  const [, setAiAnalysisViewMode] = useState<'quick'|'detailed'>('quick');
  const [waterDetectedByAI, setWaterDetectedByAI] = useState<boolean | null>(null);
  const waterRequiredMessage = 'The uploaded image should show bodies of water. Please upload a photo with a visible body of water.';
  const [disableMetadataCheck, setDisableMetadataCheck] = useState(false);
  const [disableWaterCheck, setDisableWaterCheck] = useState(false);
  const [disableFormValidation, setDisableFormValidation] = useState(false);

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

  const hasWaterPrediction = (
    waterPredictions: Array<{ class_name: string; confidence: number; mask_area: number }>
  ) => {
    return waterPredictions.some((prediction) => prediction.class_name?.toLowerCase() === 'water');
  };

  const verifyImageMetadata = async (file: File) => {
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
        const newAddress = await fetchAddressFromCoordinates(data.gps.latitude,data.gps.longitude);
        setNewReport(prev => ({
          ...prev,
          address: newAddress || '',
          latitude: data.gps.latitude?.toString() || '',
          longitude: data.gps.longitude?.toString() || ''
        }));
        setVerificationStatus('success');
        setShowLocationFields(false);
        return true;
      } else if (response.ok === true && data.tampered === true && data.gps != null) {
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

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    console.log('Selected file:', file);
    if (file) {
      const isValidImageType = file.type.startsWith('image/') && ['image/jpeg', 'image/png', 'image/jpg', 'image/gif'].includes(file.type);
      if (disableFormValidation || isValidImageType) {
        setErrorMessage('');
        setWaterDetectedByAI(null);
        setNewReport((prev) => ({ ...prev, image: file }));
        console.log('Image set in state:', file.name);
        if (disableMetadataCheck) {
          setVerificationStatus('idle');
          setShowLocationFields(true);
          setNewReport((prev) => ({
            ...prev,
            image: file,
            address: '',
            latitude: '',
            longitude: '',
          }));
        } else {
          const metadataOk = await verifyImageMetadata(file);
          if (!metadataOk) {
            setNewReport((prev) => ({ ...prev, image: file, latitude: '', longitude: '' }));
          }
        }

        // Run AI verification immediately after metadata verification
        try {
          setAiScanStatus('scanning');
          const predictFormData = new FormData();
          predictFormData.append('image', file as Blob);
          predictFormData.append('severityByUser', newReport.severityByUser || 'medium');

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
          console.log('AI Prediction:', ai_data);
          const pred = ai_data[0] || ai_data;
          const ai_verified = ai_data.ai_verified ?? false;

          const waterPreds = Array.isArray(pred.water_predictions) ? pred.water_predictions : [];
          const trashPreds = Array.isArray(pred.trash_predictions) ? pred.trash_predictions : [];
          const pollutionPreds = Array.isArray(pred.pollution_predictions) ? pred.pollution_predictions : [];

          const hasWater = hasWaterPrediction(waterPreds);
          const hasTrash = trashPreds.length > 0;
          const hasUnnatural = pollutionPreds.length > 0;

          if (!disableWaterCheck && !hasWater) {
            setAiResults(null);
            setAiScanStatus('error');
            setWaterDetectedByAI(false);
            setFieldsLocked(false);
            setErrorMessage(waterRequiredMessage);
            return;
          }

          let inferredType = 'Clean';
          if (hasWater && hasTrash && hasUnnatural) inferredType = 'Industrial Waste';
          else if (hasWater && hasTrash) inferredType = 'Plastic Pollution';
          else if (hasWater && hasUnnatural) inferredType = 'Unnatural Color - AI';
          else if (!hasWater && !hasTrash && !hasUnnatural) inferredType = 'Clean';

          const summarizePreds = (label: string, preds: Array<{ class_name: string; confidence: number; mask_area: number }>) => {
            if (!preds || preds.length === 0) return `${label}: none`;
            const top = preds
              .slice(0, 5)
              .map((p) => `${p.class_name} (conf: ${Math.round((p.confidence || 0) * 100)}%, area: ${Math.round(p.mask_area || 0)})`)
              .join('; ');
            return `${label}: ${top}`;
          };

          const aiTitle = `AI-generated report: ${inferredType}`;
          const aiContent = [
            `This report was auto-filled by AI based on the uploaded image.`,
            summarizePreds('Water predictions', waterPreds),
            summarizePreds('Trash predictions', trashPreds),
            summarizePreds('Pollution predictions', pollutionPreds),
            `Overall model confidence: ${pred.overall_confidence}%`,
            `Estimated pollution percentage: ${pred.pollution_percentage}%`,
          ].join('\n');

          setAiResults({
            severity_level: pred.severity_level,
            overall_confidence: pred.overall_confidence,
            pollution_percentage: pred.pollution_percentage,
            water_predictions: waterPreds,
            trash_predictions: trashPreds,
            pollution_predictions: pollutionPreds,
            ai_verified,
          });
          setAiScanStatus('success');
          setWaterDetectedByAI(disableWaterCheck ? null : true);
          setErrorMessage('');

          // Quick Photo flow: auto-fill and lock only in quick flow
          if (!userStartedDetailedForm) {
            setNewReport((prev) => ({
              ...prev,
              title: aiTitle,
              content: aiContent,
              pollutionType: inferredType,
              severityByUser: pred.severity_level,
            }));
            setFieldsLocked(true);
          }
        } catch (err) {
          console.error('AI verification error:', err);
          setAiScanStatus('error');
          setWaterDetectedByAI(null);
        }
      } else {
        setErrorMessage('Please select a valid image file (JPEG, PNG, JPG, or GIF).');
      }
    } else {
      setErrorMessage('No image file selected. Please choose an image.');
      setWaterDetectedByAI(null);
      setNewReport({ ...newReport, image: null });
    }
  };

  const validateForm = () => {
    if (disableFormValidation) {
      return true;
    }

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
    if (!disableWaterCheck && waterDetectedByAI === false) {
      setErrorMessage(waterRequiredMessage);
      return;
    }

    if (!disableFormValidation && !validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setShowSubmitModal(true);
    setErrorMessage('');
    setSubmitStatus('idle');

    try {
      // Use cached AI results; backend will decide status
      const new_status = 'pending';

      // Step 2: Submit report with FormData
      const reportFormData = new FormData();
      reportFormData.append('title', newReport.title);
      reportFormData.append('content', newReport.content);
      reportFormData.append('address', newReport.address);
      reportFormData.append('latitude', newReport.latitude);
      reportFormData.append('longitude', newReport.longitude);
      reportFormData.append('pollutionType', newReport.pollutionType);
      reportFormData.append('status', new_status);
      if (newReport.image) {
        reportFormData.append('image', newReport.image as Blob);
      }
      reportFormData.append('severityByUser', newReport.severityByUser);
      reportFormData.append('user_id', (user?.id || 1).toString());
      if (aiResults) {
        reportFormData.append('severityByAI', aiResults.severity_level);
        reportFormData.append('ai_verified', aiResults.ai_verified ? '1' : '0');
        reportFormData.append('ai_confidence', aiResults.overall_confidence.toString());
        reportFormData.append('severityPercentage', aiResults.pollution_percentage.toString());
      } else {
        reportFormData.append('severityByAI', newReport.severityByUser || 'medium');
        reportFormData.append('ai_verified', '0');
        reportFormData.append('ai_confidence', '0');
        reportFormData.append('severityPercentage', '0');
      }

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
        severityByAI: aiResults?.severity_level,
        ai_verified: aiResults?.ai_verified,
        ai_confidence: aiResults?.overall_confidence,
        severityPercentage: aiResults?.pollution_percentage,
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
        setFieldsLocked(false);
        setAiResults(null);
        setWaterDetectedByAI(null);
        setUserStartedDetailedForm(false);
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

const fetchAddressFromCoordinates = async (lat: number, lon: number) => {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'WaterBase-App/1.0'
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data: NominatimResult = await response.json();
    console.log('Reverse Geocoding Response:', data); // Add this for debugging
    if (data && data.display_name) {
      return formatDisplayName(data);
    } else {
      throw new Error('No address found');
    }
  } catch (error) {
    console.error('Error fetching address:', error);
    throw error;
  }
};
const handleGetCurrentLocation = () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        try {
          const address = await fetchAddressFromCoordinates(lat, lon);
          setNewReport({
            ...newReport,
            latitude: lat.toString(),
            longitude: lon.toString(),
            address: address
          });
          setErrorMessage('');
        } catch (error) {
          setNewReport({
            ...newReport,
            latitude: lat.toString(),
            longitude: lon.toString(),
            address: ''
          });
          setErrorMessage('Could not fetch address. Please enter manually or search.');
        }
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

        <Card className="border-amber-200 bg-amber-50/70 mb-8">
          <CardHeader>
            <CardTitle className="text-lg text-waterbase-950">Debug Controls</CardTitle>
            <CardDescription className="text-waterbase-700">
              These toggles only affect this debug page and let you bypass client-side checks.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-waterbase-950">Disable Metadata Check</p>
                <p className="text-xs text-waterbase-700">Skip metadata verification and force manual location input in both modals.</p>
              </div>
              <Switch
                checked={disableMetadataCheck}
                onCheckedChange={(checked) => {
                  setDisableMetadataCheck(checked);
                  setVerificationStatus('idle');
                  setVerificationStatusDetailed('idle');
                  setErrorMessage('');
                }}
                aria-label="Disable metadata check"
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-waterbase-950">Disable Water Check</p>
                <p className="text-xs text-waterbase-700">Allow submission even when AI does not detect water.</p>
              </div>
              <Switch
                checked={disableWaterCheck}
                onCheckedChange={(checked) => {
                  setDisableWaterCheck(checked);
                  if (checked) {
                    setWaterDetectedByAI(null);
                    if (errorMessage === waterRequiredMessage) {
                      setErrorMessage('');
                    }
                  }
                }}
                aria-label="Disable water check"
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-waterbase-950">Disable Other Form Validations</p>
                <p className="text-xs text-waterbase-700">Bypass file type, required fields, and coordinate validations on submit.</p>
              </div>
              <Switch
                checked={disableFormValidation}
                onCheckedChange={(checked) => {
                  setDisableFormValidation(checked);
                  if (checked) {
                    setErrorMessage('');
                  }
                }}
                aria-label="Disable other form validations"
              />
            </div>
          </CardContent>
        </Card>

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
                          onChange={(e) => { setNewReport({ ...newReport, title: e.target.value }); setUserStartedDetailedForm(true); }}
                          disabled={isSubmitting || fieldsLocked}
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-1 block">
                          Content *
                        </label>
                        <Textarea
                          placeholder="Detailed description of what you observed..."
                          value={newReport.content}
                          onChange={(e) => { setNewReport({ ...newReport, content: e.target.value }); }}
                          rows={3}
                          disabled={isSubmitting || fieldsLocked}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium mb-1 block">
                            Pollution Type *
                          </label>
                          <Select
                            value={newReport.pollutionType}
                            onValueChange={(value) => { setNewReport({ ...newReport, pollutionType: value }); setUserStartedDetailedForm(true); }}
                            disabled={isSubmitting || fieldsLocked}
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
                              <SelectItem value="Unnatural Color - AI">Unnatural Color - AI</SelectItem>
                              <SelectItem value="Clean">Clean</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-sm font-medium mb-1 block">
                            Severity Level *
                          </label>
                          <Select
                            value={newReport.severityByUser}
                            onValueChange={(value) => { setNewReport({ ...newReport, severityByUser: value }); setUserStartedDetailedForm(true); }}
                            disabled={isSubmitting || fieldsLocked}
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

                      <div className="pt-2">
                        <Button
                          onClick={() => setShowDetailedScanModal(true)}
                          className="w-full"
                          variant="outline"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Select Photo for Metadata + AI Scan
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
        </div>

        {/* Submit button moved into Quick Photo Report modal */}

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

              {!disableMetadataCheck && verificationStatus === 'verifying' && (
                <div className="text-center py-4">
                  <Loader2 className="w-8 h-8 mx-auto animate-spin text-waterbase-500" />
                  <p className="mt-2 text-waterbase-600">Verifying image metadata...</p>
                </div>
              )}
              {aiScanStatus === 'scanning' && (
                <div className="text-center py-2">
                  <Loader2 className="w-6 h-6 mx-auto animate-spin text-enviro-600" />
                  <p className="mt-1 text-enviro-700">Scanning image for pollution factors...</p>
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
                      disabled={!disableMetadataCheck && verificationStatus === 'verifying'}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Latitude *</label>
                      <Input
                        placeholder="14.5995"
                        value={newReport.latitude}
                        onChange={(e) => setNewReport({ ...newReport, latitude: e.target.value })}
                        disabled={!disableMetadataCheck && verificationStatus === 'verifying'}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Longitude *</label>
                      <Input
                        placeholder="121.0008"
                        value={newReport.longitude}
                        onChange={(e) => setNewReport({ ...newReport, longitude: e.target.value })}
                        disabled={!disableMetadataCheck && verificationStatus === 'verifying'}
                      />
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGetCurrentLocation}
                      disabled={!disableMetadataCheck && verificationStatus === 'verifying'}
                    >
                      <MapPin className="w-4 h-4 mr-2" />
                      Use Current Location
                    </Button>
                  </div>
                </>
              )}

              {aiScanStatus === 'success' && (
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => { setAiAnalysisViewMode('quick'); setShowAiResultModal(true); }}>View AI Analysis</Button>
                </div>
              )}

              <div className="pt-2">
                <Button
                  onClick={handleSubmitReport}
                  disabled={
                    (!disableFormValidation && !newReport.image) ||
                    isSubmitting ||
                    aiScanStatus === 'scanning' ||
                    (!disableMetadataCheck && verificationStatus === 'verifying') ||
                    (!disableWaterCheck && waterDetectedByAI === false)
                  }
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
              </div>

            </div>
          </DialogContent>
        </Dialog>

        {/* Detailed Report: dedicated image selection + metadata + AI scan modal */}
        <Dialog open={showDetailedScanModal} onOpenChange={setShowDetailedScanModal}>
          <DialogContent className="max-w-[95vw] sm:max-w-md md:max-w-2xl lg:max-w-4xl w-full p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>Select Image for Detailed Report</DialogTitle>
              <DialogDescription>
                Choose an image to extract location metadata and run AI pollution detection. Your form remains editable; AI will not auto-fill it.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
              <Input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setErrorMessage('');
                  setWaterDetectedByAI(null);
                  // Save image only (do NOT auto-fill any fields for detailed flow)
                  setNewReport((prev) => ({ ...prev, image: file }));

                  // 1) Metadata verification
                  if (disableMetadataCheck) {
                    setVerificationStatusDetailed('idle');
                    setShowLocationFieldsDetailed(true);
                    setNewReport((prev) => ({
                      ...prev,
                      image: file,
                      address: '',
                      latitude: '',
                      longitude: '',
                    }));
                  } else {
                    setVerificationStatusDetailed('verifying');
                    setShowLocationFieldsDetailed(false);
                    try {
                      const fd = new FormData();
                      fd.append('image', file);
                      const resp = await fetch('/api/reports/verify-image', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
                        body: fd,
                      });
                      const data = await resp.json();
                      if (resp.ok && data.tampered === false && data.gps != null) {
                        const address = await fetchAddressFromCoordinates(data.gps.latitude, data.gps.longitude);
                        setNewReport((prev) => ({
                          ...prev,
                          address: address || prev.address,
                          latitude: data.gps.latitude?.toString() || prev.latitude,
                          longitude: data.gps.longitude?.toString() || prev.longitude,
                        }));
                        setVerificationStatusDetailed('success');
                        setShowLocationFieldsDetailed(false);
                      } else if (resp.ok === true && data.tampered === true && data.gps != null) {
                        setVerificationStatusDetailed('failed');
                        setShowLocationFieldsDetailed(false);
                        setErrorMessage('Error: Image flagged as tampered. Please upload an original, unedited camera photo.');
                      } else {
                        setVerificationStatusDetailed('failed');
                        setShowLocationFieldsDetailed(true);
                        setErrorMessage('No location metadata found. Please enter location manually.');
                      }
                    } catch (err) {
                      setVerificationStatusDetailed('failed');
                      setShowLocationFieldsDetailed(true);
                      setErrorMessage('Failed to verify image metadata. Please enter location manually.');
                    }
                  }

                  // 2) AI scan (do not auto-fill form fields)
                  try {
                    setAiScanStatusDetailed('scanning');
                    const predictFD = new FormData();
                    predictFD.append('image', file as Blob);
                    predictFD.append('severityByUser', newReport.severityByUser || 'medium');
                    const aiResp = await fetch('/api/predict', {
                      method: 'POST',
                      headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
                      body: predictFD,
                    });
                    if (!aiResp.ok) throw new Error('AI prediction failed');
                    const aiData = await aiResp.json();
                    const pred = aiData[0] || aiData;
                    const ai_verified = aiData.ai_verified ?? false;
                    const waterPreds = Array.isArray(pred.water_predictions) ? pred.water_predictions : [];
                    const trashPreds = Array.isArray(pred.trash_predictions) ? pred.trash_predictions : [];
                    const pollutionPreds = Array.isArray(pred.pollution_predictions) ? pred.pollution_predictions : [];

                    if (!disableWaterCheck && !hasWaterPrediction(waterPreds)) {
                      setAiResults(null);
                      setAiScanStatusDetailed('error');
                      setWaterDetectedByAI(false);
                      setErrorMessage(waterRequiredMessage);
                      return;
                    }

                    setAiResults({
                      severity_level: pred.severity_level,
                      overall_confidence: pred.overall_confidence,
                      pollution_percentage: pred.pollution_percentage,
                      water_predictions: waterPreds,
                      trash_predictions: trashPreds,
                      pollution_predictions: pollutionPreds,
                      ai_verified,
                    });
                    setAiScanStatusDetailed('success');
                    setWaterDetectedByAI(disableWaterCheck ? null : true);
                    setErrorMessage('');
                  } catch (err) {
                    setAiScanStatusDetailed('error');
                    setWaterDetectedByAI(null);
                  }
                }}
                className="w-full"
              />

              {!disableMetadataCheck && verificationStatusDetailed === 'verifying' && (
                <div className="text-center py-2">
                  <Loader2 className="w-6 h-6 mx-auto animate-spin text-waterbase-500" />
                  <p className="mt-1 text-waterbase-600">Verifying image metadata...</p>
                </div>
              )}
              {aiScanStatusDetailed === 'scanning' && (
                <div className="text-center py-2">
                  <Loader2 className="w-6 h-6 mx-auto animate-spin text-enviro-600" />
                  <p className="mt-1 text-enviro-700">Scanning image for pollution factors...</p>
                </div>
              )}

              {errorMessage && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}

              {newReport.image && verificationStatusDetailed !== 'verifying' && (
                <div className="flex justify-center">
                  <img
                    src={URL.createObjectURL(newReport.image)}
                    alt="Preview"
                    className="max-w-full max-h-[40vh] object-contain rounded-lg"
                  />
                </div>
              )}

              {showLocationFieldsDetailed && (
                <>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Address *</label>
                    <OpenStreetMapSearchableSelect
                      value={newReport.address}
                      onValueChange={(address: string, coordinates?: { lat: number; lng: number }) => {
                        setNewReport({
                          ...newReport,
                          address,
                          latitude: coordinates?.lat?.toString() || newReport.latitude,
                          longitude: coordinates?.lng?.toString() || newReport.longitude,
                        });
                      }}
                      placeholder="Search for region, province, city, or barangay..."
                      disabled={!disableMetadataCheck && verificationStatusDetailed === 'verifying'}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Latitude *</label>
                      <Input
                        placeholder="14.5995"
                        value={newReport.latitude}
                        onChange={(e) => setNewReport({ ...newReport, latitude: e.target.value })}
                        disabled={!disableMetadataCheck && verificationStatusDetailed === 'verifying'}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Longitude *</label>
                      <Input
                        placeholder="121.0008"
                        value={newReport.longitude}
                        onChange={(e) => setNewReport({ ...newReport, longitude: e.target.value })}
                        disabled={!disableMetadataCheck && verificationStatusDetailed === 'verifying'}
                      />
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGetCurrentLocation}
                      disabled={!disableMetadataCheck && verificationStatusDetailed === 'verifying'}
                    >
                      <MapPin className="w-4 h-4 mr-2" />
                      Use Current Location
                    </Button>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2">
                {aiScanStatusDetailed === 'success' && (
                  <Button variant="outline" onClick={() => { setAiAnalysisViewMode('detailed'); setShowAiResultModal(true); }}>View AI Analysis</Button>
                )}
                <Button
                  onClick={handleSubmitReport}
                  disabled={
                    (!disableFormValidation && !newReport.image) ||
                    isSubmitting ||
                    (!disableMetadataCheck && verificationStatusDetailed === 'verifying') ||
                    aiScanStatusDetailed === 'scanning' ||
                    (!disableWaterCheck && waterDetectedByAI === false) ||
                    (!disableFormValidation && (
                      !newReport.title.trim() || !newReport.content.trim() || !newReport.pollutionType || !newReport.severityByUser ||
                      !newReport.address.trim() || !newReport.latitude || !newReport.longitude
                    ))
                  }
                  className="bg-waterbase-500 hover:bg-waterbase-600"
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
              </div>
            </div>
          </DialogContent>
        </Dialog>
        {/* Read-only AI analysis preview modal */}
        <Dialog open={showAiResultModal} onOpenChange={setShowAiResultModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>AI Analysis Result</DialogTitle>
              <DialogDescription>Auto-filled report details (read-only)</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {aiResults ? (
                <div className="space-y-2 text-sm">
                  <div className="font-medium">Inferred Pollution Type: {(() => {
                    const wp = aiResults.water_predictions?.length > 0;
                    const tp = aiResults.trash_predictions?.length > 0;
                    const up = aiResults.pollution_predictions?.length > 0;
                    if (wp && tp && up) return 'Industrial Waste';
                    if (wp && tp) return 'Plastic Pollution';
                    if (wp && up) return 'Unnatural Color - AI';
                    if (!wp && !tp && !up) return 'Clean';
                    return 'Clean';
                  })()}</div>
                  <div>AI Severity: {aiResults.severity_level}</div>
                  <div>Overall Confidence: {aiResults.overall_confidence}%</div>
                  <div>Estimated Pollution: {aiResults.pollution_percentage}%</div>
                  <div className="mt-2">
                    <div className="font-medium">Water predictions</div>
                    <div className="text-xs text-gray-600">
                      {aiResults.water_predictions?.length ? aiResults.water_predictions.slice(0,5).map((p, i) => (
                        <div key={`w-${i}`}>{p.class_name} — {Math.round((p.confidence||0)*100)}% (area: {Math.round(p.mask_area||0)})</div>
                      )) : 'none'}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">Trash predictions</div>
                    <div className="text-xs text-gray-600">
                      {aiResults.trash_predictions?.length ? aiResults.trash_predictions.slice(0,5).map((p, i) => (
                        <div key={`t-${i}`}>{p.class_name} — {Math.round((p.confidence||0)*100)}% (area: {Math.round(p.mask_area||0)})</div>
                      )) : 'none'}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">Pollution predictions</div>
                    <div className="text-xs text-gray-600">
                      {aiResults.pollution_predictions?.length ? aiResults.pollution_predictions.slice(0,5).map((p, i) => (
                        <div key={`p-${i}`}>{p.class_name} — {Math.round((p.confidence||0)*100)}% (area: {Math.round(p.mask_area||0)})</div>
                      )) : 'none'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-600">No AI results available.</div>
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

