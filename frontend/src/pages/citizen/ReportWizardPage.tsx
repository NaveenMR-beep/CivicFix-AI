import React, { useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Camera, Upload, MapPin, ArrowLeft, ArrowRight,
  CheckCircle, AlertCircle, RefreshCw, Eye, Sparkles, Check
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../api/client';
import { MapPicker } from '../../components/MapPicker';
import { AudioRecorder } from '../../components/AudioRecorder';

interface ReportWizardPageProps {
  onNavigate: (view: string, params?: any) => void;
}

export const ReportWizardPage: React.FC<ReportWizardPageProps> = ({ onNavigate }) => {
  const { language, t } = useLanguage();

  // Wizard Step (1 to 5) or 'success'
  const [step, setStep] = useState<number>(1);

  // Form State
  const [category, setCategory] = useState<string>('');
  const [customCategory, setCustomCategory] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

  // AI Classification state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);

  // Location State
  const [latitude, setLatitude] = useState<number>(12.9716);
  const [longitude, setLongitude] = useState<number>(77.5946);
  const [address, setAddress] = useState<string>('Bangalore Central Area');
  const [landmark, setLandmark] = useState<string>('');

  // Description State
  const [description, setDescription] = useState<string>('');

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedComplaint, setSubmittedComplaint] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Duplicate prompt state
  const [duplicateWarning, setDuplicateWarning] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Category Cards Configuration
  const categories = [
    {
      id: 'pothole',
      emoji: '🛣️',
      title: t.catPothole,
      desc: 'Potholes, broken asphalt, dangerous road craters',
      color: 'hover:border-amber-500 hover:bg-amber-50/50'
    },
    {
      id: 'garbage',
      emoji: '🗑️',
      title: t.catGarbage,
      desc: 'Uncollected waste, overflowing bins, open dumps',
      color: 'hover:border-emerald-500 hover:bg-emerald-50/50'
    },
    {
      id: 'streetlight',
      emoji: '💡',
      title: t.catStreetlight,
      desc: 'Dark streets, damaged lamp posts, flickering lights',
      color: 'hover:border-yellow-500 hover:bg-yellow-50/50'
    },
    {
      id: 'water_leak',
      emoji: '💧',
      title: t.catWaterLeak,
      desc: 'Burst public pipes, street waterlogging, valve leaks',
      color: 'hover:border-blue-500 hover:bg-blue-50/50'
    },
    {
      id: 'other',
      emoji: '⚠️',
      title: t.catOther,
      desc: 'Fallen tree branches, broken footpaths, other civic issues',
      color: 'hover:border-purple-500 hover:bg-purple-50/50'
    }
  ];

  // Handle Photo Selection & trigger AI Image Analysis
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setImageFile(file);

    const localPreview = URL.createObjectURL(file);
    setImagePreview(localPreview);

    // Call real AI computer-vision analysis
    setIsAnalyzing(true);
    setErrorMessage(null);
    try {
      const result = await api.analyzeImage(file);
      setAiResult(result);
      if (result.image_url) {
        setUploadedImageUrl(result.image_url);
      }
      // If user hasn't typed description yet, auto-suggest AI description
      if (!description && result.suggested_description) {
        setDescription(result.suggested_description);
      }
    } catch (err: any) {
      // If AI service failed, user can still proceed normally
      console.warn('AI analysis notice:', err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Submission handler
  const handleSubmit = async (bypassDuplicate = false) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setDuplicateWarning(null);

    const payload = {
      category,
      custom_category: category === 'other' ? customCategory : undefined,
      title: categories.find(c => c.id === category)?.title || 'Civic Issue',
      description,
      image_url: uploadedImageUrl || (imagePreview ? imagePreview : undefined),
      latitude,
      longitude,
      address,
      landmark,
      allow_duplicate_submission: bypassDuplicate
    };

    try {
      const response = await api.createComplaint(payload);
      setSubmittedComplaint(response);
      setStep(6); // Success screen
      try {
        confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
      } catch (e) {}
    } catch (err: any) {
      if (err.isDuplicate && err.detail) {
        // Suspected duplicate found nearby!
        setDuplicateWarning(err.detail);
      } else {
        setErrorMessage(err.message || 'Failed to submit complaint. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 bg-slate-50 py-8 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        {/* Step Indicator Progress Bar */}
        {step <= 5 && (
          <div className="mb-6">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
              <span className="text-emerald-700 font-extrabold">
                {step === 1 && t.wizardStep1}
                {step === 2 && t.wizardStep2}
                {step === 3 && t.wizardStep3}
                {step === 4 && t.wizardStep4}
                {step === 5 && t.wizardStep5}
              </span>
              <span>Step {step} of 5</span>
            </div>
            <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 transition-all duration-300 rounded-full"
                style={{ width: `${(step / 5) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Wizard Container Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md">
          {/* ================= SCREEN 1: CHOOSE PROBLEM ================= */}
          {step === 1 && (
            <div>
              <div className="text-center mb-6">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
                  {t.chooseProblem}
                </h2>
                <p className="text-sm text-slate-500">
                  Tap the card that matches what you see on the street.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {categories.map((cat) => {
                  const isSelected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`p-5 rounded-2xl border-2 text-left transition-all duration-200 flex flex-col items-start gap-3 shadow-sm ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/70 ring-4 ring-emerald-100'
                          : `border-slate-200 bg-white ${cat.color}`
                      }`}
                    >
                      <span className="text-4xl">{cat.emoji}</span>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 flex items-center justify-between">
                          {cat.title}
                          {isSelected && <Check className="w-5 h-5 text-emerald-600 ml-2" />}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">{cat.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {category === 'other' && (
                <div className="mb-6 p-4 bg-purple-50 rounded-2xl border border-purple-200">
                  <label className="block text-xs font-bold text-purple-900 uppercase mb-1">
                    Describe the Problem Category
                  </label>
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="e.g., Broken footpath slab, Open manhole cover"
                    className="w-full px-4 py-3 rounded-xl border border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-sm"
                  />
                </div>
              )}

              <button
                type="button"
                disabled={!category}
                onClick={() => setStep(2)}
                className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-lg font-extrabold rounded-2xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>Continue to Photo</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* ================= SCREEN 2: TAKE OR UPLOAD PHOTO ================= */}
          {step === 2 && (
            <div>
              <div className="text-center mb-6">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
                  Take or Upload a Photo
                </h2>
                <p className="text-sm text-slate-500">
                  A photo helps municipal engineers inspect the issue before dispatch.
                </p>
              </div>

              {/* Hidden file inputs */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoSelect}
                className="hidden"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
              />

              {!imagePreview ? (
                <div className="flex flex-col gap-4 mb-6">
                  {/* Camera Button */}
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="w-full py-6 px-6 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-2xl flex flex-col items-center justify-center gap-2 shadow-md transition-all text-center"
                  >
                    <Camera className="w-10 h-10" />
                    <span className="text-lg font-extrabold">{t.takePhoto}</span>
                    <span className="text-xs text-emerald-100">Opens your device camera directly</span>
                  </button>

                  {/* Gallery Button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-5 px-6 bg-slate-100 hover:bg-slate-200 active:scale-[0.99] text-slate-800 rounded-2xl flex items-center justify-center gap-3 border-2 border-dashed border-slate-300 font-bold transition-all text-center"
                  >
                    <Upload className="w-6 h-6 text-slate-600" />
                    <span>{t.chooseGallery}</span>
                  </button>
                </div>
              ) : (
                <div className="mb-6">
                  {/* Image Preview Box */}
                  <div className="relative rounded-2xl overflow-hidden border-2 border-slate-200 shadow-md bg-black max-h-80 flex items-center justify-center mb-3">
                    <img
                      src={imagePreview}
                      alt="Complaint Preview"
                      className="w-full h-auto max-h-80 object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview(null);
                        setImageFile(null);
                        setAiResult(null);
                      }}
                      className="absolute top-3 right-3 px-3 py-1.5 bg-black/75 hover:bg-black text-white text-xs font-bold rounded-xl backdrop-blur-sm transition-all"
                    >
                      {t.changePhoto}
                    </button>
                  </div>

                  {/* Real-Time AI Computer Vision Inspection Panel */}
                  {isAnalyzing && (
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center gap-3">
                      <RefreshCw className="w-5 h-5 text-emerald-600 animate-spin" />
                      <div>
                        <p className="text-sm font-bold text-emerald-900">
                          AI Analyzing Image Quality & Features...
                        </p>
                        <p className="text-xs text-emerald-700">
                          Inspecting edge clarity, surface patterns, and civic issue signatures.
                        </p>
                      </div>
                    </div>
                  )}

                  {!isAnalyzing && aiResult && (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-slate-900 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-emerald-600" />
                          AI Inspection Result
                        </span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                          Confidence: {Math.round(aiResult.confidence * 100)}%
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 mb-2">
                        Detected: <strong>{language === 'kn' ? aiResult.category_label_kn : aiResult.category_label_en}</strong>
                      </p>

                      {aiResult.detected_features && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {aiResult.detected_features.map((feat: string, idx: number) => (
                            <span key={idx} className="text-[11px] px-2 py-0.5 bg-white border border-slate-200 rounded-md text-slate-600">
                              ✓ {feat}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Blurriness Advice */}
                      {aiResult.quality_advice ? (
                        <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <span>{aiResult.quality_advice}</span>
                        </div>
                      ) : (
                        <div className="text-xs text-emerald-700 flex items-center gap-1 font-medium">
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                          {t.photoQualityGood}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Navigation */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-1/3 py-4 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="w-2/3 py-4 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl shadow-md flex items-center justify-center gap-2"
                >
                  <span>{imagePreview ? 'Confirm Location' : 'Skip Photo'}</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* ================= SCREEN 3: CONFIRM LOCATION ================= */}
          {step === 3 && (
            <div>
              <div className="text-center mb-6">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
                  {t.wizardStep3}
                </h2>
                <p className="text-sm text-slate-500">
                  Confirm the spot on the map or enter a nearby street/landmark.
                </p>
              </div>

              {/* Leaflet Map Picker Component */}
              <div className="mb-4">
                <MapPicker
                  initialLat={latitude}
                  initialLon={longitude}
                  onLocationSelect={(lat, lon, addr) => {
                    setLatitude(lat);
                    setLongitude(lon);
                    setAddress(addr);
                  }}
                />
              </div>

              {/* Landmark input */}
              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nearby Landmark or Building (Optional)
                </label>
                <input
                  type="text"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder="e.g., In front of Post Office, Next to Tea Stall"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>

              {/* Navigation */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-1/3 py-4 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="w-2/3 py-4 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl shadow-md flex items-center justify-center gap-2"
                >
                  <span>Describe Problem</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* ================= SCREEN 4: DESCRIBE PROBLEM ================= */}
          {step === 4 && (
            <div>
              <div className="text-center mb-6">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
                  {t.whatIsWrong}
                </h2>
                <p className="text-sm text-slate-500">
                  You can type a few words or tap the microphone to speak.
                </p>
              </div>

              {/* Voice Input Button */}
              <div className="flex justify-end mb-2">
                <AudioRecorder
                  onTranscript={(transcript) => {
                    setDescription((prev) => (prev ? `${prev} ${transcript}` : transcript));
                  }}
                />
              </div>

              {/* Text Description Field */}
              <div className="mb-6">
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t.descriptionPlaceholder}
                  className="w-full p-4 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-base leading-relaxed"
                />
                <p className="text-xs text-slate-400 mt-1">
                  💡 This field is optional. Our team will inspect using your photo and map location.
                </p>
              </div>

              {/* Navigation */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="w-1/3 py-4 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStep(5)}
                  className="w-2/3 py-4 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl shadow-md flex items-center justify-center gap-2"
                >
                  <span>Review & Submit</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* ================= SCREEN 5: REVIEW AND SUBMIT ================= */}
          {step === 5 && (
            <div>
              <div className="text-center mb-6">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
                  {t.reviewTitle}
                </h2>
                <p className="text-sm text-slate-500">
                  Please check the details below before sending to municipal staff.
                </p>
              </div>

              {/* Summary Review Cards */}
              <div className="space-y-4 mb-6">
                {/* 1. Problem Category */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase">Problem Type</span>
                    <h4 className="text-base font-extrabold text-slate-900 mt-0.5">
                      {categories.find(c => c.id === category)?.title || category}
                    </h4>
                  </div>
                  <button
                    onClick={() => setStep(1)}
                    className="text-xs font-bold text-emerald-700 hover:underline"
                  >
                    Edit
                  </button>
                </div>

                {/* 2. Photo */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Thumbnail"
                        className="w-14 h-14 rounded-xl object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-slate-200 flex items-center justify-center text-slate-500 text-xs">
                        No Photo
                      </div>
                    )}
                    <div>
                      <span className="text-xs font-bold text-slate-500 uppercase">Photograph</span>
                      <p className="text-sm font-semibold text-slate-800">
                        {imagePreview ? 'Photo attached' : 'No photo uploaded'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setStep(2)}
                    className="text-xs font-bold text-emerald-700 hover:underline"
                  >
                    Edit
                  </button>
                </div>

                {/* 3. Location */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-start justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase">Location</span>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">{address}</p>
                    {landmark && <p className="text-xs text-slate-600 mt-0.5">Near: {landmark}</p>}
                  </div>
                  <button
                    onClick={() => setStep(3)}
                    className="text-xs font-bold text-emerald-700 hover:underline shrink-0 ml-2"
                  >
                    Edit
                  </button>
                </div>

                {/* 4. Description */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-start justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase">Description</span>
                    <p className="text-sm text-slate-800 mt-0.5">
                      {description || 'No additional comment provided.'}
                    </p>
                  </div>
                  <button
                    onClick={() => setStep(4)}
                    className="text-xs font-bold text-emerald-700 hover:underline shrink-0 ml-2"
                  >
                    Edit
                  </button>
                </div>
              </div>

              {/* Error Alert */}
              {errorMessage && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-sm mb-6 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Duplicate Detection Alert Modal / Banner */}
              {duplicateWarning && (
                <div className="p-5 bg-amber-50 border-2 border-amber-300 rounded-2xl mb-6 shadow-md">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-base font-extrabold text-amber-900 mb-1">
                        {t.duplicateAlertTitle}
                      </h4>
                      <p className="text-xs text-amber-800 leading-relaxed mb-3">
                        {duplicateWarning.message}
                      </p>
                      
                      {duplicateWarning.existing_complaint && (
                        <div className="p-3 bg-white/80 rounded-xl border border-amber-200 text-xs text-slate-800 mb-3">
                          <p><strong>Existing ID:</strong> {duplicateWarning.existing_complaint.tracking_number}</p>
                          <p><strong>Distance:</strong> {duplicateWarning.existing_complaint.distance_meters} meters away</p>
                          <p><strong>Status:</strong> {duplicateWarning.existing_complaint.status}</p>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (duplicateWarning.existing_complaint?.tracking_number) {
                              onNavigate('track', { trackingNumber: duplicateWarning.existing_complaint.tracking_number });
                            }
                          }}
                          className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm"
                        >
                          {t.viewExisting}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSubmit(true)}
                          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm"
                        >
                          {t.submitSeparate}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSubmit(false)}
                className="w-full py-5 px-6 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xl font-extrabold rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-3 transition-all active:scale-[0.99]"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-6 h-6 animate-spin" />
                    <span>{t.submitting}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-6 h-6" />
                    <span>{t.submitButton}</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* ================= SCREEN 6: SUCCESS CONFIRMATION ================= */}
          {step === 6 && submittedComplaint && (
            <div className="text-center py-6">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CheckCircle className="w-12 h-12" />
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-3">
                {t.successTitle}
              </h2>

              <p className="text-base text-slate-600 max-w-md mx-auto mb-8">
                {t.successMessage}
              </p>

              {/* Complaint ID Box */}
              <div className="p-6 bg-emerald-50 rounded-2xl border-2 border-emerald-300 max-w-sm mx-auto mb-8 text-center shadow-inner">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block mb-1">
                  {t.complaintIdLabel}
                </span>
                <span className="text-2xl sm:text-3xl font-mono font-black text-emerald-950 tracking-wider">
                  {submittedComplaint.tracking_number}
                </span>
                <p className="text-xs text-emerald-700 mt-2">
                  {t.trackExplanation}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
                <button
                  onClick={() => onNavigate('track', { trackingNumber: submittedComplaint.tracking_number })}
                  className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 text-white text-base font-extrabold rounded-2xl shadow-md transition-all"
                >
                  {t.trackNow}
                </button>
                <button
                  onClick={() => onNavigate('citizen-home')}
                  className="w-full py-4 px-6 bg-slate-100 hover:bg-slate-200 text-slate-800 text-base font-bold rounded-2xl transition-all"
                >
                  {t.backToHome}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
