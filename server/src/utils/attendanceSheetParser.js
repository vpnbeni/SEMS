const { PDFDocument } = require('pdf-lib');
const pdfParse = require('pdf-parse');

/**
 * Parse CBSE attendance sheet PDFs to extract candidate roll numbers and photos.
 *
 * Each page of the attendance sheet belongs to one candidate and contains:
 *   - A "Roll No." field with the candidate's roll number (text)
 *   - An embedded photo (JPEG image) in the top-right area
 *
 * This parser extracts both and returns an array of { rollNumber, imageBuffer, mimeType }
 * entries matched by page index.
 */

/**
 * Extract the roll number from a single page's text.
 * The attendance sheet format has "Roll No.    31683203" near the top.
 */
const extractRollNumber = (pageText) => {
  // Try various patterns for "Roll No." followed by digits
  const patterns = [
    /Roll\s*No\.?\s*[:.]?\s*(\d{5,12})/i,
    /Roll\s*Number\s*[:.]?\s*(\d{5,12})/i,
    /Roll\s*No\.?\s*[:.]?\s*(\d{5,12})/i,
  ];

  for (const pattern of patterns) {
    const match = pageText.match(pattern);
    if (match) return match[1].trim();
  }

  // Fallback: look for any 8-digit number on the page (common CBSE roll number length)
  const fallback = pageText.match(/\b(\d{8})\b/);
  if (fallback) return fallback[1];

  return null;
};

/**
 * Extract images embedded in a single PDF page using pdf-lib's low-level API.
 * Returns an array of { buffer: Buffer, mimeType: string } for each image found.
 */
const extractImagesFromPage = (page) => {
  const images = [];

  try {
    const resources = page.node.Resources();
    if (!resources) return images;

    const xObjects = resources.lookup(page.doc.context.obj('XObject'));
    if (!xObjects) return images;

    const xObjectEntries = xObjects.entries ? xObjects.entries() : [];

    for (const [, ref] of xObjectEntries) {
      try {
        const xObj = xObjects.context.lookup(ref);
        if (!xObj) continue;

        // Check if this is an Image XObject
        const subtypeName = xObj.dict?.get(xObj.dict.context.obj('Subtype'));
        if (!subtypeName) continue;

        const subtypeStr = subtypeName.toString();
        if (!subtypeStr.includes('Image')) continue;

        // Get the image stream data
        const imageData = xObj.getContents();
        if (!imageData || imageData.length === 0) continue;

        // Determine mime type from the filter
        const filter = xObj.dict?.get(xObj.dict.context.obj('Filter'));
        const filterStr = filter ? filter.toString() : '';

        let mimeType = 'image/jpeg'; // default
        if (filterStr.includes('FlateDecode')) {
          mimeType = 'image/png';
        } else if (filterStr.includes('DCTDecode')) {
          mimeType = 'image/jpeg';
        } else if (filterStr.includes('JPXDecode')) {
          mimeType = 'image/jp2';
        }

        // Only include reasonably sized images (candidate photos, not tiny icons)
        // A candidate photo should be at least 1KB
        if (imageData.length > 1024) {
          images.push({
            buffer: Buffer.from(imageData),
            mimeType,
          });
        }
      } catch (entryErr) {
        // Skip entries that can't be processed
        continue;
      }
    }
  } catch (err) {
    console.warn('Failed to extract images from page:', err.message);
  }

  return images;
};

/**
 * Alternative image extraction using raw PDF object traversal.
 * Walks all indirect objects in the PDF looking for Image XObjects,
 * then maps them to pages based on page resource references.
 */
const extractAllImagesFromPdf = (pdfDoc) => {
  const context = pdfDoc.context;
  const imageMap = new Map(); // Map<objectRef, { buffer, mimeType }>

  // Iterate all indirect objects
  context.enumerateIndirectObjects().forEach(([ref, obj]) => {
    try {
      if (!obj || !obj.dict) return;

      const subtype = obj.dict.get(context.obj('Subtype'));
      if (!subtype) return;
      const subtypeStr = subtype.toString();
      if (!subtypeStr.includes('Image')) return;

      const contents = obj.getContents();
      if (!contents || contents.length < 1024) return; // Skip tiny images

      const filter = obj.dict.get(context.obj('Filter'));
      const filterStr = filter ? filter.toString() : '';

      let mimeType = 'image/jpeg';
      if (filterStr.includes('FlateDecode')) {
        mimeType = 'image/png';
      } else if (filterStr.includes('DCTDecode')) {
        mimeType = 'image/jpeg';
      }

      imageMap.set(ref.toString(), {
        buffer: Buffer.from(contents),
        mimeType,
      });
    } catch {
      // Skip
    }
  });

  return imageMap;
};

/**
 * Find which image refs are used on a given page.
 */
const findPageImageRefs = (page, context) => {
  const refs = [];
  try {
    const resources = page.node.Resources();
    if (!resources) return refs;

    const xObjectDict = resources.lookup(context.obj('XObject'));
    if (!xObjectDict || !xObjectDict.entries) return refs;

    for (const [, ref] of xObjectDict.entries()) {
      refs.push(ref.toString());
    }
  } catch {
    // Skip
  }
  return refs;
};

/**
 * Parse a multi-page CBSE attendance sheet PDF.
 *
 * @param {Buffer} pdfBuffer - The raw PDF file buffer
 * @returns {Promise<{ success: boolean, data: Array<{ rollNumber: string, imageBuffer: Buffer, mimeType: string }>, errors: string[] }>}
 */
const parseAttendanceSheetPdf = async (pdfBuffer) => {
  const results = [];
  const errors = [];

  try {
    // Step 1: Extract text per page using pdf-parse
    console.log('Parsing attendance sheet PDF for text...');
    const parsed = await pdfParse(pdfBuffer, {
      // Custom page render to get text per page
      pagerender: null,
    });

    // pdf-parse doesn't give per-page text easily; re-parse with custom renderer
    const pageTexts = [];
    await pdfParse(pdfBuffer, {
      pagerender: (pageData) => {
        return pageData.getTextContent().then((textContent) => {
          const text = textContent.items.map((item) => item.str).join(' ');
          pageTexts.push(text);
          return text;
        });
      },
    });

    console.log(`Extracted text from ${pageTexts.length} pages`);

    // Step 2: Extract images using pdf-lib
    console.log('Extracting images from PDF...');
    const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
    const pages = pdfDoc.getPages();
    console.log(`PDF has ${pages.length} pages`);

    // Build a map of all images in the PDF
    const allImages = extractAllImagesFromPdf(pdfDoc);
    console.log(`Found ${allImages.size} image objects in PDF`);

    // Step 3: Match images to pages
    for (let i = 0; i < pages.length; i++) {
      const pageText = pageTexts[i] || '';
      const rollNumber = extractRollNumber(pageText);

      if (!rollNumber) {
        errors.push(`Page ${i + 1}: Could not extract roll number`);
        continue;
      }

      // Find images referenced by this page
      const pageImageRefs = findPageImageRefs(pages[i], pdfDoc.context);
      let bestImage = null;

      for (const refStr of pageImageRefs) {
        const img = allImages.get(refStr);
        if (img) {
          // Pick the largest image on the page (the candidate photo)
          if (!bestImage || img.buffer.length > bestImage.buffer.length) {
            bestImage = img;
          }
        }
      }

      if (!bestImage) {
        errors.push(`Page ${i + 1} (Roll: ${rollNumber}): No photo found`);
        continue;
      }

      results.push({
        rollNumber,
        imageBuffer: bestImage.buffer,
        mimeType: bestImage.mimeType,
      });
    }

    console.log(`Successfully extracted ${results.length} candidate photos from ${pages.length} pages`);
    if (errors.length > 0) {
      console.warn(`Errors on ${errors.length} pages:`, errors.slice(0, 5));
    }

    return { success: true, data: results, errors };
  } catch (error) {
    console.error('Attendance sheet PDF parsing error:', error);
    return {
      success: false,
      data: results,
      errors: [...errors, `PDF parsing failed: ${error.message}`],
    };
  }
};

module.exports = { parseAttendanceSheetPdf, extractRollNumber };
