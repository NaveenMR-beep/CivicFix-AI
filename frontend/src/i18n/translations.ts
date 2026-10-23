export type Language = 'en' | 'kn';

export interface Translations {
  appName: string;
  tagline: string;
  subtagline: string;
  reportProblem: string;
  trackComplaint: string;
  problemsNearMe: string;
  togetherText: string;
  howItWorks: string;
  step1Title: string;
  step1Desc: string;
  step2Title: string;
  step2Desc: string;
  step3Title: string;
  step3Desc: string;
  
  // Roles & Nav
  citizenPortal: string;
  staffPortal: string;
  adminPortal: string;
  login: string;
  register: string;
  logout: string;
  myComplaints: string;

  // Wizard Steps
  wizardStep1: string;
  wizardStep2: string;
  wizardStep3: string;
  wizardStep4: string;
  wizardStep5: string;
  
  // Categories
  catPothole: string;
  catGarbage: string;
  catStreetlight: string;
  catWaterLeak: string;
  catOther: string;
  
  // Wizard Actions
  chooseProblem: string;
  takePhoto: string;
  chooseGallery: string;
  changePhoto: string;
  photoQualityGood: string;
  photoQualityBlurry: string;
  useMyLocation: string;
  gettingLocation: string;
  manualAddress: string;
  addressPlaceholder: string;
  locationConfirmed: string;
  whatIsWrong: string;
  descriptionPlaceholder: string;
  voiceInput: string;
  listening: string;
  reviewTitle: string;
  submitButton: string;
  submitting: string;
  successTitle: string;
  successMessage: string;
  complaintIdLabel: string;
  trackExplanation: string;
  backToHome: string;
  trackNow: string;

  // Duplicates
  duplicateAlertTitle: string;
  duplicateAlertDesc: string;
  viewExisting: string;
  submitSeparate: string;

  // Tracking
  trackingTitle: string;
  enterComplaintId: string;
  searchButton: string;
  statusSubmitted: string;
  statusUnderReview: string;
  statusAssigned: string;
  statusInProgress: string;
  statusResolved: string;
  statusRejected: string;
  timelineTitle: string;
  lastUpdated: string;
  confirmAffected: string;
  confirmedAffected: string;
  confirmCount: string;

  // Staff & Admin
  staffDashboardTitle: string;
  totalComplaints: string;
  pendingComplaints: string;
  highPriority: string;
  inProgress: string;
  resolved: string;
  filterCategory: string;
  filterStatus: string;
  filterPriority: string;
  uploadRepairEvidence: string;
  aiVerifyRepair: string;
  assignDepartment: string;
  assignStaff: string;
  priorityScore: string;
  priorityFormulaExplain: string;
  exportCsv: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    appName: "CivicFix AI",
    tagline: "Turn Public Complaints Into Action",
    subtagline: "See a problem in your area? Let us know.",
    reportProblem: "📸 Report a Problem",
    trackComplaint: "🔎 Track My Complaint",
    problemsNearMe: "🗺️ Problems Near Me",
    togetherText: "Together, we can make our streets cleaner, brighter, and safer.",
    howItWorks: "How Reporting Works in 3 Simple Steps",
    step1Title: "1. Snap a Photo",
    step1Desc: "Take a clear picture of the pothole, trash, broken light, or leak.",
    step2Title: "2. Pin Location",
    step2Desc: "Use GPS or click on the map so the repair crew knows the spot.",
    step3Title: "3. Track & Action",
    step3Desc: "AI routes your ticket to the municipal department for quick repair.",

    citizenPortal: "Citizen Portal",
    staffPortal: "Staff Portal",
    adminPortal: "Admin Portal",
    login: "Log In",
    register: "Register",
    logout: "Log Out",
    myComplaints: "My Reports",

    wizardStep1: "1. Choose Problem",
    wizardStep2: "2. Take Photo",
    wizardStep3: "3. Confirm Location",
    wizardStep4: "4. Describe Problem",
    wizardStep5: "5. Review & Submit",

    catPothole: "Broken Road / Pothole",
    catGarbage: "Garbage Problem",
    catStreetlight: "Streetlight Not Working",
    catWaterLeak: "Water Leakage",
    catOther: "Other Problem",

    chooseProblem: "What problem do you want to report?",
    takePhoto: "Take a Photo with Camera",
    chooseGallery: "Choose Photo from Gallery",
    changePhoto: "Change Photo",
    photoQualityGood: "✓ Photo is sharp and clear",
    photoQualityBlurry: "⚠️ Photo appears slightly blurry. For quicker repair, try holding camera steady.",
    useMyLocation: "📍 Use My Current Location",
    gettingLocation: "Locating your GPS position...",
    manualAddress: "Street address or landmark",
    addressPlaceholder: "e.g., Near Metro Station, 100ft Road, Indiranagar",
    locationConfirmed: "Location Confirmed",
    whatIsWrong: "What is wrong here? (Optional)",
    descriptionPlaceholder: "Tell us a few words about what needs fixing...",
    voiceInput: "Tap to Speak",
    listening: "Listening... speak now",
    reviewTitle: "Review Your Complaint Details",
    submitButton: "Submit Complaint",
    submitting: "Submitting to Municipal Crew...",
    successTitle: "Your complaint has been submitted successfully!",
    successMessage: "Thank you for being an active citizen. Your report has been dispatched to the municipal department.",
    complaintIdLabel: "Complaint ID",
    trackExplanation: "You can use this number anytime to track the repair status.",
    backToHome: "Return to Home",
    trackNow: "Track This Complaint Now",

    duplicateAlertTitle: "Similar Problem Already Reported Nearby",
    duplicateAlertDesc: "A nearby resident recently reported a matching issue close to this spot. You can support the existing report to help municipal teams prioritize it, or proceed with a separate ticket.",
    viewExisting: "View Existing Report",
    submitSeparate: "Submit as Separate Complaint",

    trackingTitle: "Track Your Complaint",
    enterComplaintId: "Enter Complaint ID (e.g., CF-2026-000101)",
    searchButton: "Search Status",
    statusSubmitted: "Submitted",
    statusUnderReview: "Under Review",
    statusAssigned: "Assigned to Department",
    statusInProgress: "Work in Progress",
    statusResolved: "Resolved & Repaired",
    statusRejected: "Closed / Duplicate",
    timelineTitle: "Complaint Lifecycle Timeline",
    lastUpdated: "Last Update",
    confirmAffected: "I am affected by this problem too",
    confirmedAffected: "✓ You confirmed this issue",
    confirmCount: "residents confirmed affected",

    staffDashboardTitle: "Municipal Operations Center",
    totalComplaints: "Total Complaints",
    pendingComplaints: "Pending Review",
    highPriority: "High & Critical Priority",
    inProgress: "Work In Progress",
    resolved: "Resolved Tickets",
    filterCategory: "Filter by Category",
    filterStatus: "Filter by Status",
    filterPriority: "Filter by Priority",
    uploadRepairEvidence: "Upload Repair Photo Evidence",
    aiVerifyRepair: "AI Repair Verification",
    assignDepartment: "Assign Department",
    assignStaff: "Assign Staff Officer",
    priorityScore: "AI Priority Score",
    priorityFormulaExplain: "Priority = 0.40 × Severity + 0.35 × Safety Risk + 0.25 × Community Impact",
    exportCsv: "Export to CSV"
  },
  kn: {
    appName: "ಸಿವಿಕ್ ಫಿಕ್ಸ್ ಎಐ",
    tagline: "ಸಾರ್ವಜನಿಕ ಸಮಸ್ಯೆಗಳಿಗೆ ತ್ವರಿತ ಪರಿಹಾರ",
    subtagline: "ನಿಮ್ಮ ಪ್ರದೇಶದಲ್ಲಿ ಸಮಸ್ಯೆ ಕಂಡಿದೆಯೇ? ನಮಗೆ ತಿಳಿಸಿ.",
    reportProblem: "📸 ಸಮಸ್ಯೆಯನ್ನು ವರದಿ ಮಾಡಿ",
    trackComplaint: "🔎 ನನ್ನ ದೂರನ್ನು ಟ್ರ್ಯಾಕ್ ಮಾಡಿ",
    problemsNearMe: "🗺️ ನನ್ನ ಸುತ್ತಮುತ್ತಲಿನ ಸಮಸ್ಯೆಗಳು",
    togetherText: "ನಾವು ಒಟ್ಟಾಗಿ ನಮ್ಮ ರಸ್ತೆಗಳನ್ನು ಸ್ವಚ್ಛ, ಸುಂದರ ಹಾಗೂ ಸುರಕ್ಷಿತವಾಗಿರಿಸೋಣ.",
    howItWorks: "ದೂರು ಸಲ್ಲಿಸುವುದು ಹೇಗೆ? 3 ಸರಳ ಹಂತಗಳು",
    step1Title: "1. ಫೋಟೋ ತೆಗೆಯಿರಿ",
    step1Desc: "ಗುಂಡಿ, ಕಸ, ದೀಪ ಅಥವಾ ನೀರಿನ ಸೋರಿಕೆಯ ಸ್ಪಷ್ಟ ಫೋಟೋ ತೆಗೆಯಿರಿ.",
    step2Title: "2. ಸ್ಥಳವನ್ನು ಗುರುತಿಸಿ",
    step2Desc: "ಜಿಪಿಎಸ್ ಬಳಸಿ ಅಥವಾ ನಕ್ಷೆಯಲ್ಲಿ ಸ್ಥಳವನ್ನು ತೋರಿಸಿ.",
    step3Title: "3. ಪರಿಹಾರ ಪಡೆಯಿರಿ",
    step3Desc: "ಎಐ ತಂತ್ರಜ್ಞಾನವು ಸಂಬಂಧಪಟ್ಟ ಪಾಲಿಕೆ ಇಲಾಖೆಗೆ ತಕ್ಷಣ ಕಳುಹಿಸುತ್ತದೆ.",

    citizenPortal: "ನಾಗರಿಕ ಪೋರ್ಟಲ್",
    staffPortal: "ಸಿಬ್ಬಂದಿ ಪೋರ್ಟಲ್",
    adminPortal: "ಆಡಳಿತ ಪೋರ್ಟಲ್",
    login: "ಲಾಗಿನ್",
    register: "ನೋಂದಣಿ",
    logout: "ನಿರ್ಗಮಿಸಿ",
    myComplaints: "ನನ್ನ ದೂರುಗಳು",

    wizardStep1: "1. ಸಮಸ್ಯೆ ಆಯ್ಕೆಮಾಡಿ",
    wizardStep2: "2. ಫೋಟೋ ತೆಗೆಯಿರಿ",
    wizardStep3: "3. ಸ್ಥಳ ಖಚಿತಪಡಿಸಿ",
    wizardStep4: "4. ವಿವರ ನೀಡಿ",
    wizardStep5: "5. ಪರಿಶೀಲಿಸಿ ಸಲ್ಲಿಸಿ",

    catPothole: "ರಸ್ತೆ ಗುಂಡಿ / ಹಾನಿಯಾದ ರಸ್ತೆ",
    catGarbage: "ಕಸದ ರಾಶಿ / ಕಸದ ತೊಟ್ಟಿ",
    catStreetlight: "ಬೀದಿ ದೀಪ ಉರಿಯುತ್ತಿಲ್ಲ",
    catWaterLeak: "ಕುಡಿಯುವ ನೀರಿನ ಸೋರಿಕೆ",
    catOther: "ಇತರ ಸಾರ್ವಜನಿಕ ಸಮಸ್ಯೆ",

    chooseProblem: "ನೀವು ಯಾವ ಸಮಸ್ಯೆಯನ್ನು ವರದಿ ಮಾಡಲು ಬಯಸುತ್ತೀರಿ?",
    takePhoto: "ಕ್ಯಾಮೆರಾದಿಂದ ಫೋಟೋ ತೆಗೆಯಿರಿ",
    chooseGallery: "ಗ್ಯಾಲರಿಯಿಂದ ಫೋಟೋ ಆರಿಸಿ",
    changePhoto: "ಬೇರೆ ಫೋಟೋ ಆಯ್ಕೆಮಾಡಿ",
    photoQualityGood: "✓ ಫೋಟೋ ಸ್ಪಷ್ಟವಾಗಿದೆ",
    photoQualityBlurry: "⚠️ ಫೋಟೋ ಸ್ವಲ್ಪ ಮಸುಕಾಗಿದೆ. ಪರಿಹಾರ ಬೇಗ ಆಗಲು ಸ್ಪಷ್ಟ ಫೋಟೋ ತೆಗೆಯಿರಿ.",
    useMyLocation: "📍 ನನ್ನ ಪ್ರಸ್ತುತ ಸ್ಥಳವನ್ನು ಬಳಸಿ",
    gettingLocation: "ಸ್ಥಳವನ್ನು ಗುರುತಿಸಲಾಗುತ್ತಿದೆ...",
    manualAddress: "ರಸ್ತೆ ವಿಳಾಸ ಅಥವಾ ಗುರುತಿನ ಸ್ಥಳ",
    addressPlaceholder: "ಉದಾ: ಮೆಟ್ರೋ ನಿಲ್ದಾಣದ ಹತ್ತಿರ, 100 ಅಡಿ ರಸ್ತೆ, ಇಂದಿರಾನಗರ",
    locationConfirmed: "ಸ್ಥಳ ಖಚಿತಗೊಂಡಿದೆ",
    whatIsWrong: "ಇಲ್ಲಿ ಏನು ಸಮಸ್ಯೆಯಾಗಿದೆ? (ಐಚ್ಛಿಕ)",
    descriptionPlaceholder: "ಸಮಸ್ಯೆಯ ಬಗ್ಗೆ ಒಂದೆರಡು ಮಾತುಗಳಲ್ಲಿ ಬರೆಯಿರಿ...",
    voiceInput: "ಮಾತನಾಡಲು ಒತ್ತಿ",
    listening: "ಆಲಿಸುತ್ತಿದೆ... ಮಾತನಾಡಿ",
    reviewTitle: "ನಿಮ್ಮ ದೂರಿನ ವಿವರಗಳನ್ನು ಪರಿಶೀಲಿಸಿ",
    submitButton: "ದೂರು ಸಲ್ಲಿಸಿ",
    submitting: "ಪಾಲಿಕೆಗೆ ಸಲ್ಲಿಸಲಾಗುತ್ತಿದೆ...",
    successTitle: "ನಿಮ್ಮ ದೂರನ್ನು ಯಶಸ್ವಿಯಾಗಿ ಸಲ್ಲಿಸಲಾಗಿದೆ!",
    successMessage: "ಜವಾಬ್ದಾರಿಯುತ ನಾಗರಿಕರಾಗಿದ್ದಕ್ಕೆ ಧನ್ಯವಾದಗಳು. ನಿಮ್ಮ ದೂರನ್ನು ಸಂಬಂಧಿತ ಇಲಾಖೆಗೆ ರವಾನಿಸಲಾಗಿದೆ.",
    complaintIdLabel: "ದೂರು ಸಂಖ್ಯೆ",
    trackExplanation: "ಈ ಸಂಖ್ಯೆಯನ್ನು ಬಳಸಿ ನಿಮ್ಮ ದೂರಿನ ಪ್ರಗತಿಯನ್ನು ಯಾವುದೇ ಸಮಯದಲ್ಲಿ ತಿಳಿಯಬಹುದು.",
    backToHome: "ಮುಖಪುಟಕ್ಕೆ ಹಿಂತಿರುಗಿ",
    trackNow: "ಈಗಲೇ ದೂರನ್ನು ಟ್ರ್ಯಾಕ್ ಮಾಡಿ",

    duplicateAlertTitle: "ಹತ್ತಿರದಲ್ಲೇ ಇಂತಹ ಸಮಸ್ಯೆ ಈಗಾಗಲೇ ವರದಿಯಾಗಿದೆ",
    duplicateAlertDesc: "ಈ ಸ್ಥಳದ ಹತ್ತಿರದಲ್ಲೇ ಮತ್ತೊಬ್ಬರು ಇದೇ ಸಮಸ್ಯೆಯನ್ನು ವರದಿ ಮಾಡಿದ್ದಾರೆ. ಅದನ್ನು ದೃಢೀಕರಿಸಿ ಆದ್ಯತೆ ಹೆಚ್ಚಿಸಬಹುದು ಅಥವಾ ಪ್ರತ್ಯೇಕ ದೂರು ಸಲ್ಲಿಸಬಹುದು.",
    viewExisting: "ಹಳೆಯ ದೂರನ್ನು ವೀಕ್ಷಿಸಿ",
    submitSeparate: "ಪ್ರತ್ಯೇಕ ಹೊಸ ದೂರು ಸಲ್ಲಿಸಿ",

    trackingTitle: "ದೂರಿನ ಸ್ಥಿತಿಗತಿ ತಿಳಿಯಿರಿ",
    enterComplaintId: "ದೂರು ಸಂಖ್ಯೆ ನಮೂದಿಸಿ (ಉದಾ: CF-2026-000101)",
    searchButton: "ಹುಡುಕಿ",
    statusSubmitted: "ಸಲ್ಲಿಸಲಾಗಿದೆ",
    statusUnderReview: "ಪರಿಶೀಲನೆಯಲ್ಲಿದೆ",
    statusAssigned: "ಇಲಾಖೆಗೆ ನಿಯೋಜಿಸಲಾಗಿದೆ",
    statusInProgress: "ಕಾಮಗಾರಿ ಪ್ರಗತಿಯಲ್ಲಿದೆ",
    statusResolved: "ಸಮಸ್ಯೆ ಪರಿಹರಿಸಲಾಗಿದೆ",
    statusRejected: "ಮುಕ್ತಾಯಗೊಳಿಸಲಾಗಿದೆ",
    timelineTitle: "ದೂರಿನ ಪರಿಹಾರ ಹಂತಗಳು",
    lastUpdated: "ಕೊನೆಯ ನವೀಕರಣ",
    confirmAffected: "ಈ ಸಮಸ್ಯೆಯಿಂದ ನನಗೂ ತೊಂದರೆಯಾಗಿದೆ",
    confirmedAffected: "✓ ನೀವು ದೃಢೀಕರಿಸಿದ್ದೀರಿ",
    confirmCount: "ಜನರು ಬಾಧಿತರಾಗಿದ್ದಾರೆಂದು ತಿಳಿಸಿದ್ದಾರೆ",

    staffDashboardTitle: "ಪಾಲಿಕೆ ಸಿಬ್ಬಂದಿ ಕಾರ್ಯಸ್ಥಾನ",
    totalComplaints: "ಒಟ್ಟು ದೂರುಗಳು",
    pendingComplaints: "ಬಾಕಿ ಉಳಿದ ದೂರುಗಳು",
    highPriority: "ಅತಿ ತುರ್ತು ದೂರುಗಳು",
    inProgress: "ಪ್ರಗತಿಯಲ್ಲಿರುವ ಕಾಮಗಾರಿ",
    resolved: "ಪರಿಹರಿಸಿದ ದೂರುಗಳು",
    filterCategory: "ವರ್ಗದ ಪ್ರಕಾರ ಫಿಲ್ಟರ್",
    filterStatus: "ಸ್ಥಿತಿಯ ಪ್ರಕಾರ ಫಿಲ್ಟರ್",
    filterPriority: "ಆದ್ಯತೆಯ ಪ್ರಕಾರ ಫಿಲ್ಟರ್",
    uploadRepairEvidence: "ದುರಸ್ತಿಯ ನಂತರದ ಫೋಟೋ ಸಾಕ್ಷಿ",
    aiVerifyRepair: "ಎಐ ದುರಸ್ತಿ ಪರಿಶೀಲನೆ",
    assignDepartment: "ಇಲಾಖೆಗೆ ವಹಿಸಿ",
    assignStaff: "ಸಿಬ್ಬಂದಿಗೆ ನಿಯೋಜಿಸಿ",
    priorityScore: "ಎಐ ಆದ್ಯತಾ ಅಂಕ",
    priorityFormulaExplain: "ಆದ್ಯತೆ = 0.40 × ತೀವ್ರತೆ + 0.35 × ಸುರಕ್ಷತಾ ಅಪಾಯ + 0.25 × ಸಮುದಾಯ ಪರಿಣಾಮ",
    exportCsv: "ವರದಿ ಡೌನ್‌ಲೋಡ್ (CSV)"
  }
};
