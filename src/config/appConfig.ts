// App configuration
export const appConfig = {
  // API Keys (in production, these would come from environment variables)
  googleGeminiApiKey: process.env.GOOGLE_GEMINI_API_KEY || "mock-api-key",

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
    maxProcessingTime: 30000, // 30 seconds
    maxToolCalls: 5,
    timeoutMs: 10000, // 10 seconds
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
