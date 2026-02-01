const puppeteer = require('puppeteer');
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');

class PDFGenerator {
  constructor() {
    this.templatesPath = path.join(__dirname, '../templates');
  }

  async generatePDF(templateName, data, options = {}) {
    try {
      // Read template file
      const templatePath = path.join(this.templatesPath, `${templateName}.html`);
      const templateContent = await fs.readFile(templatePath, 'utf-8');
      
      // Compile template with Handlebars
      const template = handlebars.compile(templateContent);
      const html = template(data);
      
      // Launch browser (extra args help on Linux/EB where Chromium has fewer resources)
      const browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--single-process',
          '--no-zygote',
          '--disable-software-rasterizer'
        ]
      });
      
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '10mm',
          right: '10mm',
          bottom: '10mm',
          left: '10mm'
        },
        ...options
      });
      
      await browser.close();
      
      return pdfBuffer;
    } catch (error) {
      console.error('PDF Generation Error:', error);
      throw new Error(`Failed to generate PDF: ${error.message}`);
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
}

module.exports = new PDFGenerator();
