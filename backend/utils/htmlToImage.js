import puppeteer from "puppeteer";

const htmlToImage = async (html) => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });

  const imageBuffer = await page.screenshot({ type: "jpeg", fullPage: true });
  await browser.close();
  return imageBuffer;
};

export default htmlToImage;
