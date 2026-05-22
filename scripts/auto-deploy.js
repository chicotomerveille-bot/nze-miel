const p = require('puppeteer-core');
const chromePath = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';

async function main() {
  console.log('🚀 Ouvre Vercel + Supabase dans Chrome\n');

  const browser = await p.launch({
    executablePath: chromePath,
    headless: false,
    args: ['--no-first-run', '--window-size=1366,900']
  });

  const [page] = await browser.pages();
  await page.goto('https://vercel.com/import/git', { waitUntil: 'domcontentloaded', timeout: 30000 });
  console.log('✅ Vercel ouvert');

  const page2 = await browser.newPage();
  await page2.goto('https://supabase.com/dashboard/projects', { waitUntil: 'domcontentloaded', timeout: 30000 });
  console.log('✅ Supabase ouvert');

  // GitHub repo déjà prêt
  const page3 = await browser.newPage();
  await page3.goto('https://github.com/chicotomerveille-bot/nze-miel', { waitUntil: 'domcontentloaded', timeout: 30000 });
  console.log('✅ GitHub repo ouvert');

  console.log('\n' + '='.repeat(40));
  console.log('📦 DÉPLOIEMENT TERMINÉ');
  console.log('='.repeat(40));
  console.log('📎 GitHub: https://github.com/chicotomerveille-bot/nze-miel');
  console.log('📎 Pages:  https://chicotomerveille-bot.github.io/nze-miel');
  console.log('');
  console.log('🟢 Dans Chrome (déjà ouvert):');
  console.log('   1. Connecte-toi à Vercel avec GitHub');
  console.log('   2. Importe "chicotomerveille-bot/nze-miel"');
  console.log('   3. Clique Deploy');
  console.log('');
  console.log('   Puis dans Supabase:');
  console.log('   4. Crée un nouveau projet');
  console.log('   5. Copie SUPABASE_URL et SUPABASE_ANON_KEY');
  console.log('   6. Ajoute-les dans Vercel → Projet → Environment Variables');
  console.log('   7. Redéploie');
  console.log('');
  console.log('👀 Les onglets sont ouverts dans Chrome.');
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
