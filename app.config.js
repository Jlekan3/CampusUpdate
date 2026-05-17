module.exports = ({ config }) => {
  const existingPlugins = Array.isArray(config.plugins) ? config.plugins : [];
  const plugins = existingPlugins.includes('expo-font')
    ? existingPlugins
    : [...existingPlugins, 'expo-font'];

  return {
    ...config,
    plugins,
  };
};
