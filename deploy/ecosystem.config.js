// pm2 ecosystem for istanbul-vitamin frontend
// Start with:  pm2 start deploy/ecosystem.config.js && pm2 save
module.exports = {
  apps: [
    {
      name: "istanbulvitamin-web",
      cwd: "/home/istanbulvitamin/htdocs/istanbulvitamin.com/app/frontend",
      script: "npm",
      args: "run start",
      env: {
        NODE_ENV: "production",
        PORT: "3002",
      },
      exec_mode: "fork",
      max_memory_restart: "600M",
      autorestart: true,
      watch: false,
    },
  ],
};
