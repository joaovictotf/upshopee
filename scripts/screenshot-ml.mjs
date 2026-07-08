// Screenshot the /mercadolivrecombr page as admin
import { chromium } from 'playwright';

const DEV_SERVER = 'http://localhost:5195';
const ADMIN_EMAIL = 'victor@shopesync.com';
const ADMIN_PASSWORD = '12345678';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const errors = [];
page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
page.on('pageerror', err => { errors.push(err.message); });

console.log('[1] Loading app...');
await page.goto(DEV_SERVER + '/login', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(1000);

// Fill login form and submit
console.log('[2] Logging in...');
await page.fill('#email', ADMIN_EMAIL);
await page.fill('#password', ADMIN_PASSWORD);

// Listen for navigation
const navPromise = page.waitForURL('**/dashboard**', { timeout: 25000 }).catch(() => null);
await page.click('button[type="submit"]');
const navResult = await navPromise;

if (navResult) {
  console.log('[3] Login successful — redirected to dashboard');
} else {
  console.log('[3] Login did not redirect. Current URL:', page.url());
  // Check if there's an error visible
  const pageText = await page.evaluate(() => document.body.innerText.substring(0, 500));
  console.log('Page text:', pageText);
  await page.screenshot({ path: 'scripts/screenshots/LOGIN-FAIL.png', fullPage: true });
  console.log('Login failed. See LOGIN-FAIL.png');
  await browser.close();
  process.exit(1);
}

// Navigate to /mercadolivrecombr
console.log('[4] Navigating to /mercadolivrecombr...');
await page.goto(DEV_SERVER + '/mercadolivrecombr', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);

// Check what rendered
const is404 = await page.evaluate(() => document.body.innerText.includes('Página não encontrada'));
if (is404) {
  console.log('ERROR: Got 404 page — admin gate may have failed');
  await page.screenshot({ path: 'scripts/screenshots/ML-404-ERROR.png', fullPage: true });
  await browser.close();
  process.exit(1);
}

const hasHeader = await page.evaluate(() => !!document.querySelector('.nav-header-lite-supply'));
const hasCounter = await page.evaluate(() => !!document.querySelector('.mechanical-counter'));
const hasSparkle = await page.evaluate(() => !!document.querySelector('.floating-action-button-container-mlb'));
console.log('Header:', hasHeader, '| Counter:', hasCounter, '| Sparkle:', hasSparkle);

// Check the big value
const bigValue = await page.evaluate(() => {
  const el = document.querySelector('.mechanical-counter__digit-value');
  return el?.textContent;
});
console.log('Revenue display:', bigValue);

// Check metrics
const metrics = await page.evaluate(() => {
  const labels = document.querySelectorAll('.metrics-card__label');
  const values = document.querySelectorAll('.metrics-card__value');
  return Array.from(labels).map((l, i) => l.textContent + ': ' + (values[i]?.textContent || '?'));
});
console.log('Metrics:', metrics.join(' | '));

// Check the products panel
const productsPanel = await page.evaluate(() => {
  const msg = document.querySelector('.products-card__empty-message');
  if (msg) return 'EMPTY: ' + msg.textContent;
  const items = document.querySelectorAll('.products-card__item-name');
  return Array.from(items).map(e => e.textContent).join(' | ');
});
console.log('Products:', productsPanel);

// Check chart
const chartExists = await page.evaluate(() => {
  return !!document.querySelector('.recharts-wrapper');
});
console.log('Chart rendered:', chartExists);

// Screenshot 1: Boost OFF (initial state)
await page.screenshot({ path: 'scripts/screenshots/ML-BOOST-OFF.png', fullPage: true });
console.log('[5] Screenshot: ML-BOOST-OFF.png');

// Click the sparkle to activate
console.log('[6] Activating boost...');
await page.click('.floating-action-button-container-mlb');
await page.waitForTimeout(4000); // Wait for first sale + animation

const bigValueOn = await page.evaluate(() => {
  const el = document.querySelector('.mechanical-counter__digit-value');
  return el?.textContent;
});
console.log('Revenue (boost ON):', bigValueOn);

const metricsOn = await page.evaluate(() => {
  const labels = document.querySelectorAll('.metrics-card__label');
  const values = document.querySelectorAll('.metrics-card__value');
  return Array.from(labels).map((l, i) => l.textContent + ': ' + (values[i]?.textContent || '?'));
});
console.log('Metrics (boost ON):', metricsOn.join(' | '));

const productsOn = await page.evaluate(() => {
  const msg = document.querySelector('.products-card__empty-message');
  if (msg) return 'EMPTY: ' + msg.textContent;
  const items = document.querySelectorAll('.products-card__item-name');
  return Array.from(items).map(e => e.textContent).join(' | ');
});
console.log('Products (boost ON):', productsOn);

const hasActiveClass = await page.evaluate(() => {
  return document.querySelector('.floating-action-button-container-mlb').classList.contains('boost-active');
});
console.log('Boost active class:', hasActiveClass);

await page.screenshot({ path: 'scripts/screenshots/ML-BOOST-ON.png', fullPage: true });
console.log('[7] Screenshot: ML-BOOST-ON.png');

// Toggle OFF
console.log('[8] Deactivating boost...');
await page.click('.floating-action-button-container-mlb');
await page.waitForTimeout(1500);

const bigValueOff = await page.evaluate(() => {
  const el = document.querySelector('.mechanical-counter__digit-value');
  return el?.textContent;
});
console.log('Revenue (boost OFF again):', bigValueOff);

const metricsOff = await page.evaluate(() => {
  const labels = document.querySelectorAll('.metrics-card__label');
  const values = document.querySelectorAll('.metrics-card__value');
  return Array.from(labels).map((l, i) => l.textContent + ': ' + (values[i]?.textContent || '?'));
});
console.log('Metrics (boost OFF again):', metricsOff.join(' | '));

await page.screenshot({ path: 'scripts/screenshots/ML-BOOST-OFF-AGAIN.png', fullPage: true });
console.log('[9] Screenshot: ML-BOOST-OFF-AGAIN.png');

// Report errors
console.log('\n=== CONSOLE ERRORS ===');
console.log('Count:', errors.length);
errors.forEach((e, i) => console.log('  [' + i + ']', e.substring(0, 200)));

await browser.close();
console.log('\nAll screenshots saved to scripts/screenshots/');
