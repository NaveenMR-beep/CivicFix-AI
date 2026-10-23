import React, { useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Camera, Upload, MapPin, ArrowLeft, ArrowRight,
  CheckCircle, AlertCircle, RefreshCw, Sparkles, Check, Trash2, Edit2
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

  // Wizard Step (1 to 5) or 6 for success
  const [step, setStep] = useState<number>(1);

  // Step 1: Category State
  const [category, setCategory] = useState<string>('');
  const [customCategory, setCustomCategory] = useState<string>('');

  // Step 2: Photo State
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Step 3: Location State
  const [latitude, setLatitude] = useState<number>(12.9716);
  const [longitude, setLongitude] = useState<number>(77.5946);
  const [address, setAddress] = useState<string>('MG Road, Bangalore Central Area');
  const [landmark, setLandmark] = useState<string>('');

  // Step 4: Description State
  const [description, setDescription] = useState<string>('');
  const MAX_DESC_LENGTH = 500;

  // Step 5: Submission & Failure State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedComplaint, setSubmittedComplaint] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Category Cards Configuration
  const categories = [
    {
      id: 'pothole',
      emoji: '🛣️',
      title: 'Broken Road / Pothole',
      desc: 'Potholes, broken asphalt, dangerous road craters',
      color: 'hover:border-amber-500 hover:bg-amber-50/50'
    },
    {
      id: 'garbage',
      emoji: '🗑️',
      title: 'Garbage Problem',
      desc: 'Uncollected waste, overflowing bins, open dumps',
      color: 'hover:border-emerald-500 hover:bg-emerald-50/50'
    },
    {
      id: 'streetlight',
      emoji: '💡',
      title: 'Streetlight Not Working',
      desc: 'Dark streets, damaged lamp posts, flickering lights',
      color: 'hover:border-yellow-500 hover:bg-yellow-50/50'
    },
    {
      id: 'water_leak',
      emoji: '💧',
      title: 'Water Leakage',
      desc: 'Burst public pipes, street waterlogging, valve leaks',
      color: 'hover:border-blue-500 hover:bg-blue-50/50'
    },
    {
      id: 'other',
      emoji: '⚠️',
      title: 'Other Problem',
      desc: 'Broken footpath slab, fallen tree branch, or other civic issue',
      color: 'hover:border-purple-500 hover:bg-purple-50/50'
    }
  ];

  // Example description snippets from specifications
  const descriptionExamples = [
    "There is a large pothole near the bus stop.",
    "Garbage has not been collected for three days.",
    "The streetlight near our road is not working.",
    "Water is leaking from a pipe near the footpath."
  ];

  // Photo Selection Handler with 5MB & type validation
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError(null);
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    // Validate format
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const ext = file.name.split('.').pop()?.toLowerCase();
    const isAllowedExt = ext && ['jpg', 'jpeg', 'png', 'webp'].includes(ext);

    if (!allowedTypes.includes(file.type) && !isAllowedExt) {
      setPhotoError('Unsupported file type. Please upload a JPG, PNG, or WebP photo.');
      return;
    }

    // Validate size (5 MB limit)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setPhotoError(`Photo is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 5 MB.`);
      return;
    }

    setImageFile(file);
    const localPreview = URL.createObjectURL(file);
    setImagePreview(localPreview);

    // Upload securely to backend
    setIsUploadingPhoto(true);
    try {
      const uploadRes = await api.uploadPhoto(file);
      if (uploadRes && uploadRes.image_url) {
        setUploadedImageUrl(uploadRes.image_url);
      }
    } catch (err: any) {
      console.warn('Backend image upload fallback:', err.message);
      // Even if background pre-upload fails, preview is retained and we retry on submit
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    setImageFile(null);
    setImagePreview(null);
    setUploadedImageUrl(null);
    setPhotoError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  // Submit Handler
  const handleSubmit = async (bypassDuplicate = false) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setDuplicateWarning(null);

    // Ensure photo is uploaded if selected
    let finalImageUrl = uploadedImageUrl;
    if (imageFile && !finalImageUrl) {
      try {
        const uploadRes = await api.uploadPhoto(imageFile);
        finalImageUrl = uploadRes.image_url;
        setUploadedImageUrl(finalImageUrl);
      } catch (uploadErr: any) {
        setIsSubmitting(false);
        setErrorMessage(`Photo upload failed: ${uploadErr.message}. You can try removing the photo or selecting another one.`);
        return;
      }
    }

    const payload = {
      category,
      custom_category: category === 'other' ? customCategory : undefined,
      title: categories.find(c => c.id === category)?.title || 'Civic Problem',
      description: description.trim() || undefined,
      image_url: finalImageUrl || undefined,
      latitude,
      longitude,
      address,
      landmark: landmark.trim() || undefined,
      allow_duplicate_submission: bypassDuplicate
    };

    try {
      const response = await api.createComplaint(payload);
      setSubmittedComplaint(response);
      setStep(6); // Success confirmation screen
      try {
        confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
      } catch (e) {}
    } catch (err: any) {
      if (err.isDuplicate && err.detail) {
        setDuplicateWarning(err.detail);
      } else {
        setErrorMessage(err.message || 'Submission failed. Your entered details have been preserved. Please check your connection and retry.');
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
              <span className="text-emerald-700 font-extrabold uppercase">
                {step === 1 && 'Step 1: Choose the problem'}
                {step === 2 && 'Step 2: Upload a photograph'}
                {step === 3 && 'Step 3: Select the location'}
                {step === 4 && 'Step 4: Describe the problem'}
                {step === 5 && 'Step 5: Review and submit'}
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
          {/* ================= STEP 1: CHOOSE THE PROBLEM ================= */}
          {step === 1 && (
            <div>
              <div className="text-center mb-6">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
                  Choose the Problem
                </h2>
                <p className="text-sm text-slate-500">
                  Select the category that best describes the issue you want to report.
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
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center justify-between">
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
                disabled={!category || (category === 'other' && !customCategory.trim())}
                onClick={() => setStep(2)}
                className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-lg font-extrabold rounded-2xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>Continue to Photo Upload</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* ================= STEP 2: UPLOAD A PHOTOGRAPH ================= */}
          {step === 2 && (
            <div>
              <div className="text-center mb-6">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
                  Upload a Photograph
                </h2>
                <p className="text-sm text-slate-500">
                  Take a new photo with your camera or select an existing picture from your gallery (Max 5 MB).
                </p>
              </div>

              {photoError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl mb-4 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{photoError}</span>
                </div>
              )}

              {/* Hidden file inputs */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                onChange={handlePhotoSelect}
                className="hidden"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoSelect}
                className="hidden"
              />

              {!imagePreview ? (
                <div className="flex flex-col gap-4 mb-6">
                  {/* Action 1: Take a Photo */}
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="w-full py-6 px-6 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-2xl flex flex-col items-center justify-center gap-2 shadow-md transition-all text-center"
                  >
                    <Camera className="w-10 h-10" />
                    <span className="text-lg font-extrabold">Take a Photo</span>
                    <span className="text-xs text-emerald-100">Opens your device camera directly</span>
                  </button>

                  {/* Action 2: Choose Photo from Gallery */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-5 px-6 bg-slate-100 hover:bg-slate-200 active:scale-[0.99] text-slate-800 rounded-2xl flex items-center justify-center gap-3 border-2 border-dashed border-slate-300 font-bold transition-all text-center"
                  >
                    <Upload className="w-6 h-6 text-slate-600" />
                    <span>Choose Photo from Gallery</span>
                  </button>
                  <p className="text-xs text-slate-400 text-center">
                    Accepted formats: JPG, JPEG, PNG, WebP • Maximum size: 5 MB
                  </p>
                </div>
              ) : (
                <div className="mb-6">
                  {/* Photo Preview Container */}
                  <div className="relative rounded-2xl overflow-hidden border-2 border-slate-200 shadow-md bg-black max-h-80 flex items-center justify-center mb-3">
                    <img
                      src={imagePreview}
                      alt="Complaint Preview"
                      className="w-full h-auto max-h-80 object-contain"
                    />

                    {/* Remove and Replace Controls */}
                    <div className="absolute top-3 right-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-black/75 hover:bg-black text-white text-xs font-bold rounded-xl backdrop-blur-sm transition-all flex items-center gap-1"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Replace</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="p-1.5 bg-rose-600/80 hover:bg-rose-700 text-white rounded-xl backdrop-blur-sm transition-all"
                        title="Remove photo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {isUploadingPhoto ? (
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-2 text-xs text-emerald-800">
                      <RefreshCw className="w-4 h-4 text-emerald-600 animate-spin" />
                      <span>Validating and preparing photograph...</span>
                    </div>
                  ) : (
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-2 text-xs text-emerald-800">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <span>Photograph verified and ready for submission.</span>
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
                  <span>{imagePreview ? 'Confirm Location' : 'Skip Photo & Continue'}</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* ================= STEP 3: SELECT THE LOCATION ================= */}
          {step === 3 && (
            <div>
              <div className="text-center mb-6">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
                  Select the Location
                </h2>
                <p className="text-sm text-slate-500">
                  Use your device GPS or drag the map marker to pinpoint the exact location.
                </p>
              </div>

              {/* Interactive Map Picker with Draggable Marker & Manual Address Entry */}
              <div className="mb-4">
                <MapPicker
                  initialLat={latitude}
                  initialLon={longitude}
                  initialAddress={address}
                  onLocationSelect={(lat, lon, addr) => {
                    setLatitude(lat);
                    setLongitude(lon);
                    setAddress(addr);
                  }}
                />
              </div>

              {/* Landmark or building name */}
              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nearby Landmark (Optional)
                </label>
                <input
                  type="text"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder="e.g., Near Bus Stop #4, Opposite Government School"
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
                  disabled={!address.trim()}
                  onClick={() => setStep(4)}
                  className="w-2/3 py-4 px-6 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold rounded-2xl shadow-md flex items-center justify-center gap-2"
                >
                  <span>Describe Problem</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* ================= STEP 4: DESCRIBE THE PROBLEM ================= */}
          {step === 4 && (
            <div>
              <div className="text-center mb-6">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
                  What is wrong here?
                </h2>
                <p className="text-sm text-slate-500">
                  Provide any helpful details for the repair crew. You can type or click an example below.
                </p>
              </div>

              {/* Voice Input Button */}
              <div className="flex justify-end mb-2">
                <AudioRecorder
                  onTranscript={(transcript) => {
                    setDescription((prev) => (prev ? `${prev} ${transcript}` : transcript).slice(0, MAX_DESC_LENGTH));
                  }}
                />
              </div>

              {/* Text Description Field */}
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Problem Description (Optional)
                </label>
                <textarea
                  rows={4}
                  maxLength={MAX_DESC_LENGTH}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the issue in simple words..."
                  className="w-full p-4 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-base leading-relaxed"
                />
                <div className="flex justify-between items-center text-xs text-slate-400 mt-1">
                  <span>💡 Optional. Your photo and map location provide key inspection details.</span>
                  <span>{description.length} / {MAX_DESC_LENGTH}</span>
                </div>
              </div>

              {/* Clickable Example Suggestions */}
              <div className="mb-6">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  Quick Examples (Tap to use):
                </span>
                <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                  {descriptionExamples.map((ex, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setDescription(ex)}
                      className="text-left text-xs p-2.5 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 rounded-xl border border-slate-200 text-slate-700 transition-all"
                    >
                      "{ex}"
                    </button>
                  ))}
                </div>
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

          {/* ================= STEP 5: REVIEW AND SUBMIT ================= */}
          {step === 5 && (
            <div>
              <div className="text-center mb-6">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
                  Review and Submit
                </h2>
                <p className="text-sm text-slate-500">
                  Please review your complaint summary before submitting.
                </p>
              </div>

              {/* Summary Review Cards */}
              <div className="space-y-4 mb-6">
                {/* 1. Problem Category */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase">Selected Problem Category</span>
                    <h4 className="text-base font-extrabold text-slate-900 mt-0.5">
                      {categories.find(c => c.id === category)?.title || category}
                      {category === 'other' && customCategory && ` (${customCategory})`}
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
                      <span className="text-xs font-bold text-slate-500 uppercase">Uploaded Photograph</span>
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
                    <p className="text-xs text-slate-500 mt-0.5 font-mono">
                      GPS: {latitude.toFixed(4)}, {longitude.toFixed(4)}
                    </p>
                    {landmark && <p className="text-xs text-slate-600 mt-0.5">Landmark: {landmark}</p>}
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
                      {description || 'No additional description provided.'}
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
                        Possible Duplicate Issue Nearby
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
                          View Existing Complaint
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSubmit(true)}
                          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm"
                        >
                          Submit Separate Report Anyway
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Two Actions: Go Back and Edit & Submit Complaint */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setStep(4)}
                  className="sm:w-1/3 py-4 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>Go Back and Edit</span>
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSubmit(false)}
                  className="sm:w-2/3 py-4 px-6 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-lg font-extrabold rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-3 transition-all active:scale-[0.99]"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Submitting Complaint...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      <span>Submit Complaint</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ================= STEP 6: SUCCESS CONFIRMATION ================= */}
          {step === 6 && submittedComplaint && (
            <div className="text-center py-6">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CheckCircle className="w-12 h-12" />
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
                Your complaint has been submitted successfully!
              </h2>

              <p className="text-sm text-slate-600 max-w-md mx-auto mb-8">
                Your report has been queued for municipal review and routed to the corresponding department.
              </p>

              {/* Complaint ID Box */}
              <div className="p-6 bg-emerald-50 rounded-2xl border-2 border-emerald-300 max-w-sm mx-auto mb-8 text-center shadow-inner">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block mb-1">
                  Complaint ID
                </span>
                <span className="text-2xl sm:text-3xl font-mono font-black text-emerald-950 tracking-wider">
                  {submittedComplaint.public_complaint_id || submittedComplaint.tracking_number}
                </span>
                <p className="text-xs text-emerald-700 mt-2">
                  Save this identifier to check status and progress anytime.
                </p>
              </div>

              {/* Action Buttons: View My Complaint & Back to Home */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
                <button
                  onClick={() => onNavigate('track', { trackingNumber: submittedComplaint.tracking_number })}
                  className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 text-white text-base font-extrabold rounded-2xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <span>View My Complaint</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onNavigate('citizen-home')}
                  className="w-full py-4 px-6 bg-slate-100 hover:bg-slate-200 text-slate-800 text-base font-bold rounded-2xl transition-all"
                >
                  Back to Home
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
