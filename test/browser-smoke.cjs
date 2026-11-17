const { chromium } = require("playwright");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const types = { ".html":"text/html", ".css":"text/css", ".js":"text/javascript", ".png":"image/png" };
const server = http.createServer((req,res) => {
  const pathname = decodeURIComponent(new URL(req.url,"http://localhost").pathname);
  const file = path.resolve(root, "." + pathname);
  if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403).end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404).end(); return; }
    res.writeHead(200, {"Content-Type":types[path.extname(file)] || "application/octet-stream"}).end(data);
  });
});
(async () => {
  await new Promise(resolve => server.listen(4173,"127.0.0.1",resolve));
  const browser = await chromium.launch({headless:true});
  const page = await browser.newPage({viewport:{width:1440,height:1000}, deviceScaleFactor:1});
  const errors=[];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("http://127.0.0.1:4173/", {waitUntil:"networkidle"});
  await page.screenshot({path:"artifacts/countdown-desktop.png",fullPage:true});
  await page.getByRole("button",{name:"Add a date"}).click();
  await page.getByLabel("What are you counting down to?").fill("Seeing Tommy again");
  await page.getByLabel("When is it?").fill("2027-06-01T12:00");
  await page.getByRole("button",{name:"Save countdown"}).click();
  await page.getByText("Seeing Tommy again").first().waitFor();
  await page.getByRole("button",{name:/Share this countdown/}).waitFor();
  await page.screenshot({path:"artifacts/countdown-created-desktop.png",fullPage:true});
  const link = new URL(page.url());
  await page.reload();
  await page.getByText("Seeing Tommy again").first().waitFor();
  const mobile = await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  await mobile.goto("http://127.0.0.1:4173/",{waitUntil:"networkidle"});
  await mobile.screenshot({path:"artifacts/countdown-mobile.png",fullPage:true});
  if(errors.length) throw new Error(errors.join("\n"));
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
})().catch(async e=>{ console.error(e); server.close(); process.exit(1); });
