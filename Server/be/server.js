'use strict';

require('dotenv').config();
const { server } = require('./app');
const { initAIService, stopAIService } = require('./base_connects/base_ai/init.ai');

async function bootstrap() {
  try {
    await initAIService();
    require('./base_connects/base_mqtt/init.mqtt');
    require('./v1/device');
    const port = Number(process.env.SERVER_PORT || 8999);
    server.once('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`[Bootstrap] Port ${port} is already in use. Stop the existing Node server or change SERVER_PORT in .env.`);
      } else {
        console.error('[Bootstrap] HTTP server error:', error.message);
      }
      stopAIService();
      process.exitCode = 1;
    });
    server.listen(port, () => console.log(`System ready: http://localhost:${port}`));
  } catch (error) {
    console.error('[Bootstrap] Startup failed:', error.message);
    stopAIService();
    process.exitCode = 1;
  }
}

bootstrap();
