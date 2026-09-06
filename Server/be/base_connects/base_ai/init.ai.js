'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const path = require('path');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:5000';
let aiProcess = null;

function alive() {
  return new Promise((resolve) => {
    const request = http.get(`${AI_SERVICE_URL}/health`, (res) => resolve(res.statusCode === 200));
    request.on('error', () => resolve(false));
    request.setTimeout(1500, () => { request.destroy(); resolve(false); });
  });
}

function waitForHealth(timeoutMs = Number(process.env.AI_SERVICE_STARTUP_TIMEOUT_MS || 30000)) {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const check = async () => {
      if (await alive()) return resolve();
      if (Date.now() - startedAt >= timeoutMs) return reject(new Error(`Face AI did not become ready within ${timeoutMs}ms (${AI_SERVICE_URL}/health)`));
      setTimeout(check, 500);
    };
    check();
  });
}

async function initAIService() {
  if (await alive()) {
    console.log(`[Face AI] Reusing service at ${AI_SERVICE_URL}`);
    return;
  }
  if (process.env.AI_SERVICE_AUTOSTART === 'false') {
    throw new Error(`Face AI is unavailable at ${AI_SERVICE_URL} and AI_SERVICE_AUTOSTART=false`);
  }
  const directory = path.join(__dirname, '../../AI_model');
  const venvPython = path.join(directory, 'venv', 'Scripts', 'python.exe');
  const executable = fs.existsSync(venvPython) ? venvPython : (process.env.PYTHON_EXECUTABLE || 'python');
  console.log(`[Face AI] Starting local buffalo_l service with ${executable}...`);
  aiProcess = spawn(executable, ['ai_service.py'], { cwd: directory, stdio: 'inherit', windowsHide: true });
  aiProcess.on('error', (error) => console.error('[Face AI] Cannot start Python service:', error.message));
  aiProcess.on('exit', (code) => {
    if (code !== 0 && !process.exitCode) console.error(`[Face AI] Python service stopped unexpectedly (code ${code}).`);
  });
  await waitForHealth();
  console.log(`[Face AI] Healthy at ${AI_SERVICE_URL}`);
}

function stopAIService() {
  if (aiProcess && !aiProcess.killed) aiProcess.kill();
}

process.once('exit', stopAIService);

module.exports = { initAIService, stopAIService };
