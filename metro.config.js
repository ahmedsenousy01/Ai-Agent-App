const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Add support for additional file extensions
config.resolver.sourceExts.push("cjs");

// Configure transformer to handle node modules better
config.transformer.minifierConfig = {
  keep_fnames: true,
  mangle: {
    keep_fnames: true,
  },
};

// Add resolver configuration to handle internal bytecode issues
config.resolver.platforms = ["ios", "android", "native", "web"];

module.exports = config;
