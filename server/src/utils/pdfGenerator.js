const puppeteer = require('puppeteer');
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');

class PDFGenerator {
  constructor() {
    this.templatesPath = path.join(__dirname, '../templates');
  }

  async generatePDF(templateName, data, options = {}) {
    let browser = null;

    try {
      // Read template file
      const templatePath = path.join(this.templatesPath, `${templateName}.html`);
      const templateContent = await fs.readFile(templatePath, 'utf-8');
      
      // Compile template with Handlebars
      const template = handlebars.compile(templateContent);
      const html = template(data);

      // Keep Chromium flags platform-aware to avoid Windows crashes.
      const launchArgs = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ];

      if (process.platform === 'linux') {
        launchArgs.push(
          '--disable-gpu',
          '--single-process',
          '--no-zygote',
          '--disable-software-rasterizer'
        );
      }

      // Launch browser
      browser = await puppeteer.launch({
        headless: 'new',
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: launchArgs,
        pipe: true,
      });
      
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        // Use template-defined @page margins to keep PDF output aligned with preview.
        margin: {
          top: '0mm',
          right: '0mm',
          bottom: '0mm',
          left: '0mm'
        },
        preferCSSPageSize: true,
        ...options
      });
      
      await browser.close();
      browser = null;
      
      return pdfBuffer;
    } catch (error) {
      console.error('PDF Generation Error:', error);
      throw new Error(`Failed to generate PDF: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close().catch(() => {});
      }
    }
  }

  async generateMainGate(data) {
    return this.generatePDF('main-gate', data);
  }

  async generateRoomFolderSlip(data) {
    return this.generatePDF('room-folder-slip', data);
  }

  async generateRoomDoorSlip(data) {
    return this.generatePDF('room-door-slip', data);
  }

  async generateCBSECopy(data) {
    return this.generatePDF('cbse-copy', data);
  }

  async generateAnswerSheetDispatchRecord(data) {
    return this.generatePDF('answer-sheet-dispatch-record', data);
  }
}

module.exports = new PDFGenerator();
