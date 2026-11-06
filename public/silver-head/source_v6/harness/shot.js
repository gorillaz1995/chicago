// node shot.js <jsonSpec>   spec: {size, glb, glass, bg, shots:[{name, yaw, mouth, time, camZ, camY, lookY, transparent}], bench}
const { chromium } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const spec = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const root = __dirname;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.glb': 'model/gltf-binary' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.statusCode = 404; return res.end(); }
  res.setHeader('Content-Type', types[path.extname(p)] || 'application/octet-stream'); fs.createReadStream(p).pipe(res);
});
server.listen(0, async () => {
  const port = server.address().port;
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: spec.size, height: spec.size }, deviceScaleFactor: 1 });
  const logs = []; page.on('console', (m) => logs.push(m.type() + ': ' + m.text())); page.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
  await page.goto(`http://127.0.0.1:${port}/index.html?size=${spec.size}&glb=${spec.glb || 'silver-head_v6.glb'}&glass=${spec.glass === false ? 0 : 1}&twice=${spec.twice ? 1 : 0}`);
  try { await page.waitForFunction(() => window.ready || window.loadError, null, { timeout: 120000 }); } catch (e) { console.log('timeout', logs.join('\n')); }
  const err = await page.evaluate(() => window.loadError);
  if (err) console.log('loadError', err);
  for (const s of spec.shots || []) {
    const r = await page.evaluate((s) => window.renderAt(s.yaw || 0, s.mouth || 0, s.time ?? 6, s.camZ ?? 0.8, s.camY ?? 0, s.lookY ?? 0), s);
    if (s.transparent) await page.evaluate(() => document.documentElement.style.setProperty('--bg', 'transparent'));
    else await page.evaluate((bg) => document.documentElement.style.setProperty('--bg', bg), spec.bg || '#080b0d');
    await page.screenshot({ path: s.name, omitBackground: !!s.transparent, clip: { x: 0, y: 0, width: spec.size, height: spec.size } });
    console.log('shot', s.name, JSON.stringify(r));
  }
  if (spec.info) console.log(JSON.stringify(await page.evaluate(() => window.info())));
  if (spec.bench) console.log('bench ms/frame', await page.evaluate((n) => window.bench(n), spec.bench));
  const bad = logs.filter((l) => /error|warn/i.test(l)); if (bad.length) console.log(bad.slice(0, 20).join('\n'));
  await browser.close(); server.close();
});
