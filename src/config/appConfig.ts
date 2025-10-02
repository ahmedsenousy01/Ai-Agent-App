// App configuration
export const appConfig = {
  // App settings
  environment: process.env.APP_ENV || "development",
  debugMode: process.env.DEBUG_MODE === "true" || true,

  // Audio settings
  audio: {
    maxRecordingDuration: 120000, // 2 minutes in milliseconds
    minRecordingDuration: 800, // 0.8 seconds
    sampleRate: 44100,
    bitRate: 128000,
  },

  // AI settings
  ai: {
    maxToolCalls: 5,
  },

  // UI settings
  ui: {
    animationDuration: 300,
    statusDisplayDuration: 3000,
    processingSteps: [
      "Processing request...",
      "Getting patient profile...",
      "Accessing medical records...",
      "Generating report...",
      "Finalizing results...",
    ],
    editingSteps: [
      "Processing edit request...",
      "Analyzing current report...",
      "Applying modifications...",
      "Validating changes...",
      "Updating report...",
    ],
  },
};
