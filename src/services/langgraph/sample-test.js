const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });  
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('https://sanp-fill.vercel.app/', { waitUntil: 'networkidle' });

  // Click login button
  const loginBtn = page.locator('button:has-text("Login")').first();
  await highlightElement(page, loginBtn);
  await loginBtn.click();

  // Define input locators
  const usernameInput = page.locator('input#username, input[name=username], input[placeholder="Username"], input[placeholder="Enter username"]');
  const passwordInput = page.locator('input#password, input[name=password], input[placeholder="Password"], input[placeholder="Enter password"]');

  // Wait & fill username
  await usernameInput.waitFor({ state: 'visible', timeout: 5000 });
  await highlightElement(page, usernameInput);
  await usernameInput.fill('manish-9211');

  // Wait & fill password
  await passwordInput.waitFor({ state: 'visible', timeout: 5000 });
  await highlightElement(page, passwordInput);
  await passwordInput.fill('kaku');

  // Click login submit
  const submitBtn = page.locator('form#loginForm button[type="submit"], button:has-text("Login")');
  await highlightElement(page, submitBtn);
  await submitBtn.click();

  // Wait for dashboard
  await page.waitForURL('**/dashboard**', { timeout: 10000 });

  // Click Delete Question
  const delBtn = page.locator('button:has-text("Delete Question")');
  await delBtn.waitFor({ state: 'visible', timeout: 5000 });
  await highlightElement(page, delBtn);
  await delBtn.click();

  await page.waitForTimeout(2000);
  await browser.close();
})();

// Highlight helper
async function highlightElement(page, locator) {
  const elementHandle = await locator.elementHandle();
  if (elementHandle) {
    await page.evaluate(el => {
      el.style.outline = '3px solid red';
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, elementHandle);
  }
}
