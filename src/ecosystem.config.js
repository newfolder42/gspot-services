module.exports = {
  apps: [
    {
      name: 'gspot-service',
      script: './dist/app/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
