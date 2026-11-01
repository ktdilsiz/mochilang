module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    ...(process.env.MOCHIREAD_BASE_URL
      ? { baseUrl: process.env.MOCHIREAD_BASE_URL }
      : {}),
  },
});
