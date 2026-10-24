module.exports = ({ config }) => {
  const isProduction =
    process.env.APP_ENV === 'production' ||
    process.env.NODE_ENV === 'production' ||
    process.env.EAS_BUILD_PROFILE === 'production';

  return {
    ...config,
    plugins: (config.plugins || []).map((plugin) => {
      if (
        plugin === 'expo-build-properties' ||
        (Array.isArray(plugin) && plugin[0] === 'expo-build-properties')
      ) {
        return [
          'expo-build-properties',
          {
            android: {
              // Development-only cleartext HTTP permission for local LAN development
              // Keeps production secure by disabling cleartext traffic in production
              usesCleartextTraffic: !isProduction,
            },
          },
        ];
      }
      return plugin;
    }),
  };
};
