const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// @supabase/supabase-js uses a CJS/ESM hybrid package.  Metro's
// package-exports resolver (enabled by default in RN ≥ 0.73) picks the
// ESM-only entry point which Hermes cannot parse, producing:
//   ReferenceError: Property 'auth' doesn't exist
// Disabling it lets Metro fall back to the classic main/index resolution.
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
