/**
 * PM2 process manager config for Kollabo.
 *
 * Usage on the VPS:
 *   pm2 start ecosystem.config.cjs
 *   pm2 save
 *   pm2 startup    # follow the printed command to enable on boot
 */
module.exports = {
  apps: [
    {
      name: "kollabo",
      cwd: "/var/www/kollabo.pk/apps/web",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3001 -H 127.0.0.1",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
        AUTH_URL: "https://kollabo.pk",
        NEXTAUTH_URL: "https://kollabo.pk",
      },
      out_file: "/var/log/kollabo/out.log",
      error_file: "/var/log/kollabo/error.log",
      merge_logs: true,
      time: true,
    },
  ],
};
