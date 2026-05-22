const p = require('puppeteer-core');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const browser = await p.launch({
    executablePath: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({width: 1366, height: 900});

  // Aller sur la page d'accueil Vercel d'abord pour voir si connecté
  await page.goto('https://vercel.com/dashboard', {waitUntil: 'domcontentloaded', timeout: 30000});
  await sleep(3000);
  
  console.log('URL:', page.url());
  console.log('Title:', await page.title());
  
  const text = await page.evaluate(() => document.body.innerText);
  const lines = text.split('\n').filter(l => l.trim()).slice(0, 40);
  console.log('\n=== PAGE ===');
  lines.forEach(l => console.log('  ' + l));

  await page.screenshot({path: 'C:\\Users\\ADMIN\\AppData\\Local\\Temp\\vercel_dash.png', fullPage: true});
  console.log('\nScreenshot saved');
  
  await browser.close();
}
main().catch(e => console.error('ERR:', e.message));
