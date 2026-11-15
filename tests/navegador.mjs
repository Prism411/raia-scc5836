import { chromium } from 'playwright-core';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function chromiumLocal() {
  if (process.env.RAIA_CHROMIUM) return process.env.RAIA_CHROMIUM;
  const base = path.join(os.homedir(), '.cache', 'ms-playwright');
  if (!fs.existsSync(base)) return undefined;
  const dirs = fs.readdirSync(base).filter(d => /^chromium-\d+$/.test(d)).sort((a, b) => +b.split('-')[1] - +a.split('-')[1]);
  for (const d of dirs) {
    for (const sub of ['chrome-linux64/chrome', 'chrome-linux/chrome']) {
      const p = path.join(base, d, sub); if (fs.existsSync(p)) return p;
    }
  }
  return undefined;
}

export async function abrirNavegador() {
  return chromium.launch({
    executablePath: chromiumLocal(),
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required']
  });
}

export async function esperarPronta(page, ms = 60000) {
  await page.waitForFunction(() => window.__raia && window.__raia.state && window.__raia.state.loading === false && window.__raia.db, null, { timeout: ms });
  await page.waitForTimeout(800);
}
