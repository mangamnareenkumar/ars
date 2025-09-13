import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import archiver from 'archiver';
import fetch from 'node-fetch';

const __dirname = path.resolve();
// const __dirname = import.meta.dirname;

export const generateCombinedHtmlReport = async (regNos, req, type, template, includeCharts) => {
  const allHtmlSections = [];

  for (const regNo of regNos) {
    const previewUrl = `${req.protocol}://${req.get('host')}${req.baseUrl}/generate-pdf/${regNo}?type=${type}&template=${template}&includeCharts=${includeCharts}`;
    
    const htmlContent = await fetch(previewUrl).then(res => res.text());

    allHtmlSections.push(`
      <div style="page-break-after: always;">
        ${htmlContent}
      </div>
    `);
  }

  return `
    <!DOCTYPE html>
    <html>
    <head><title>Batch Report</title></head>
    <body>
      ${allHtmlSections.join('')}
    </body>
    </html>
  `;
};


export const handleDownloadPdf = async (req, res) => {
  const {
    students = '',
    type = 'semester',
    template = 'classic',
    includeCharts = 'false',
    isIndividual = 'false'
  } = req.query;

  const regNos = students.split(',').map(s => s.trim()).filter(Boolean);
  const individual = isIndividual === 'true';

  if (regNos.length === 0) {
    return res.status(400).send('No student registration numbers provided.');
  }

  const browser = await puppeteer.launch({ headless: 'new' });

  if (regNos.length === 1) {
    return await generateSinglePdf(res, browser, regNos[0], req, type, template, includeCharts);
  }

  if (individual) {
    return await generateIndividualPdfsZip(res, browser, regNos, req, type, template, includeCharts);
  }

  return await generateCombinedPdf(res, browser, regNos, req, type, template, includeCharts);
};

const generateSinglePdf = async (res, browser, regNo, req, type, template, includeCharts) => {
  const previewUrl = `${req.protocol}://${req.get('host')}${req.baseUrl}/generate-pdf/${regNo}?type=${type}&template=${template}&includeCharts=${includeCharts}`;
  const page = await browser.newPage();
  await page.goto(previewUrl, { waitUntil: 'networkidle0' });
  const pdfBuffer = await page.pdf({ format: 'A4', printBackground: false });
  await browser.close();

  const filePath = path.join(__dirname, `${regNo}.pdf`);
  fs.writeFileSync(filePath, pdfBuffer);

  res.download(filePath, `${type}_report_${regNo}.pdf`, () => {
    fs.unlink(filePath, () => {});
  });
};

const generateIndividualPdfsZip = async (res, browser, regNos, req, type, template, includeCharts) => {
  const tempDir = path.join(__dirname, 'temp_reports');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

  for (const regNo of regNos) {
    const previewUrl = `${req.protocol}://${req.get('host')}${req.baseUrl}/generate-pdf/${regNo}?type=${type}&template=${template}&includeCharts=${includeCharts}`;
    const page = await browser.newPage();
    await page.goto(previewUrl, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: false });
    const filePath = path.join(tempDir, `${regNo}.pdf`);
    fs.writeFileSync(filePath, pdfBuffer);
    await page.close();
  }

  await browser.close();

  const zipPath = path.join(__dirname, 'batch_reports.zip');
  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  archive.pipe(output);
  archive.directory(tempDir, false);
  await archive.finalize();

  output.on('close', () => {
    res.download(zipPath, `individual_reports_${new Date().toISOString().slice(0, 10)}.zip`, () => {
      fs.rmSync(tempDir, { recursive: true, force: true });
      fs.unlinkSync(zipPath);
    });
  });
};

const generateCombinedPdf = async (res, browser, regNos, req, type, template, includeCharts) => {
  const previewUrl = `${req.protocol}://${req.get('host')}${req.baseUrl}/preview-pdf?students=${regNos.join(',')}&type=${type}&template=${template}&includeCharts=${includeCharts}`;
  const page = await browser.newPage();
  await page.goto(previewUrl, { waitUntil: 'networkidle0' });
  const pdfBuffer = await page.pdf({ format: 'A4', printBackground: false });
  await browser.close();

  const filePath = path.join(__dirname, 'combined_report.pdf');
  fs.writeFileSync(filePath, pdfBuffer);

  res.download(filePath, `combined_report_${new Date().toISOString().slice(0, 10)}.pdf`, () => {
    fs.unlink(filePath, () => {});
  });
};