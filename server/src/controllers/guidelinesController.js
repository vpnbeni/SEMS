const path = require('path');
const fs = require('fs').promises;

// Upload guidelines PDF
exports.uploadGuidelines = async (req, res) => {
  try {
    // Check if file was uploaded using express-fileupload
    if (!req.files || !req.files.pdf) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const pdfFile = req.files.pdf;

    // Validate file type
    if (pdfFile.mimetype !== 'application/pdf') {
      return res.status(400).json({
        success: false,
        message: 'Only PDF files are allowed'
      });
    }

    // Define upload path
    const uploadDir = path.join(__dirname, '../../../client/public');
    const filePath = path.join(uploadDir, 'centre-guidelines.pdf');

    // Ensure directory exists
    try {
      await fs.access(uploadDir);
    } catch {
      await fs.mkdir(uploadDir, { recursive: true });
    }

    // Move file to destination
    await pdfFile.mv(filePath);

    res.json({
      success: true,
      message: 'Guidelines uploaded successfully',
      path: '/centre-guidelines.pdf'
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading guidelines',
      error: error.message
    });
  }
};

// Parse and extract guidelines structure
exports.parseGuidelines = async (req, res) => {
  try {
    const pdf = require('pdf-parse');
    const filePath = path.join(__dirname, '../../../client/public/centre-guidelines.pdf');
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({
        success: false,
        message: 'Guidelines PDF not found'
      });
    }

    const dataBuffer = await fs.readFile(filePath);
    const data = await pdf(dataBuffer);
    const text = data.text;

    // Extract chapters with full content
    const chapterRegex = /(?:CHAPTER|Chapter)\s+(\d+|[IVX]+)[:\s]+([^\n]+)/gi;
    const chapters = [];
    const chapterMatches = [];
    
    // First, find all chapter positions
    while ((match = chapterRegex.exec(text)) !== null) {
      chapterMatches.push({
        number: match[1],
        title: match[2].trim(),
        index: match.index
      });
    }
    
    // Extract full content for each chapter
    chapterMatches.forEach((chapterMatch, index) => {
      const number = chapterMatch.number;
      const title = chapterMatch.title;
      const chapterStart = chapterMatch.index;
      
      // Find the end of this chapter (start of next chapter or first appendix)
      let chapterEnd = text.length;
      
      // Check for next chapter
      if (index < chapterMatches.length - 1) {
        chapterEnd = chapterMatches[index + 1].index;
      } else {
        // Look for first appendix
        const appendixMatch = text.substring(chapterStart).search(/APPENDIX-[A-Z]/);
        if (appendixMatch > 0) {
          chapterEnd = chapterStart + appendixMatch;
        }
      }
      
      // Extract full content
      const fullContent = text.substring(chapterStart, chapterEnd).trim();
      
      // Extract first few lines as description
      const lines = fullContent.split('\n').filter(line => line.trim().length > 10);
      const description = lines.slice(1, 3).join(' ').substring(0, 200);
      
      // Clean up the full content
      const contentLines = lines.slice(1); // Skip the title line
      const rawContent = contentLines.join('\n').trim();
      
      // Format the content with structure
      const formattedContent = formatAppendixContent(rawContent);
      
      chapters.push({
        number,
        title,
        description: description.trim(),
        fullContent: rawContent.substring(0, 8000), // Limit to 8000 chars
        formattedContent: formattedContent
      });
    });

    // Extract appendices with full content
    const appendixRegex = /APPENDIX-([A-Z])\n([^\n]+)/gi;
    const appendices = [];
    const appendixMatches = [];
    
    // First, find all appendix positions
    while ((match = appendixRegex.exec(text)) !== null) {
      appendixMatches.push({
        letter: match[1],
        title: match[2].trim(),
        index: match.index
      });
    }
    
    // Extract full content for each appendix
    appendixMatches.forEach((appendixMatch, index) => {
      const letter = appendixMatch.letter;
      const title = appendixMatch.title;
      const appendixStart = appendixMatch.index;
      
      // Find the end of this appendix (start of next appendix or end of document)
      const nextAppendixIndex = index < appendixMatches.length - 1 
        ? appendixMatches[index + 1].index 
        : text.length;
      
      // Extract full content
      const fullContent = text.substring(appendixStart, nextAppendixIndex).trim();
      
      // Extract first few lines as description/subtitle
      const lines = fullContent.split('\n').filter(line => line.trim().length > 10);
      const subtitle = lines.slice(1, 3).join(' ').substring(0, 200);
      
      // Process and format the content
      const contentLines = lines.slice(1); // Skip the title line
      const rawContent = contentLines.join('\n').trim();
      
      // Format the content with structure
      const formattedContent = formatAppendixContent(rawContent);
      
      appendices.push({
        letter,
        title,
        subtitle: subtitle.trim(),
        fullContent: rawContent.substring(0, 8000), // Limit to 8000 chars
        formattedContent: formattedContent
      });
    });

// Helper function to format appendix content
function formatAppendixContent(content) {
  const lines = content.split('\n');
  const formatted = [];
  let inTable = false;
  let tableRows = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (!line) {
      if (inTable && tableRows.length > 0) {
        formatted.push({ type: 'table', rows: tableRows });
        tableRows = [];
        inTable = false;
      }
      continue;
    }
    
    // Detect headings (all caps or numbered headings)
    if (line === line.toUpperCase() && line.length > 5 && line.length < 100 && !line.match(/^\d/)) {
      if (inTable && tableRows.length > 0) {
        formatted.push({ type: 'table', rows: tableRows });
        tableRows = [];
        inTable = false;
      }
      formatted.push({ type: 'heading', text: line });
    }
    // Detect numbered items (1., 2., etc.)
    else if (line.match(/^\d+\.\s+/)) {
      if (inTable && tableRows.length > 0) {
        formatted.push({ type: 'table', rows: tableRows });
        tableRows = [];
        inTable = false;
      }
      formatted.push({ type: 'numbered', text: line });
    }
    // Detect bullet points
    else if (line.match(/^[•\-\*]\s+/) || line.match(/^[a-z]\)\s+/)) {
      if (inTable && tableRows.length > 0) {
        formatted.push({ type: 'table', rows: tableRows });
        tableRows = [];
        inTable = false;
      }
      formatted.push({ type: 'bullet', text: line });
    }
    // Detect table-like content (multiple columns separated by spaces)
    else if (line.match(/\s{3,}/)) {
      inTable = true;
      const columns = line.split(/\s{3,}/).filter(col => col.trim());
      if (columns.length > 1) {
        tableRows.push(columns);
      }
    }
    // Regular paragraph
    else {
      if (inTable && tableRows.length > 0) {
        formatted.push({ type: 'table', rows: tableRows });
        tableRows = [];
        inTable = false;
      }
      formatted.push({ type: 'paragraph', text: line });
    }
  }
  
  // Add any remaining table
  if (inTable && tableRows.length > 0) {
    formatted.push({ type: 'table', rows: tableRows });
  }
  
  return formatted;
}

    // Extract numbered guidelines
    const guidelineRegex = /^(\d+)\.\s+([^\n]{10,200})/gm;
    const guidelines = [];
    
    while ((match = guidelineRegex.exec(text)) !== null) {
      guidelines.push({
        number: match[1],
        text: match[2].trim()
      });
    }

    // Extract major headings
    const headingRegex = /^([A-Z][A-Z\s]{10,80})$/gm;
    const headings = [];
    
    while ((match = headingRegex.exec(text)) !== null) {
      const heading = match[1].trim();
      headings.push(heading);
    }

    res.json({
      success: true,
      data: {
        metadata: {
          pages: data.numpages,
          totalCharacters: text.length
        },
        structure: {
          chapters: chapters.slice(0, 20),
          appendices,
          guidelines: guidelines.slice(0, 50),
          headings: headings.slice(0, 30)
        },
        fullText: text
      }
    });
  } catch (error) {
    console.error('Parse error:', error);
    res.status(500).json({
      success: false,
      message: 'Error parsing guidelines',
      error: error.message
    });
  }
};

// Search within guidelines
exports.searchGuidelines = async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 3 characters'
      });
    }

    const pdf = require('pdf-parse');
    const filePath = path.join(__dirname, '../../../client/public/centre-guidelines.pdf');
    
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdf(dataBuffer);
    const text = data.text;

    // Search for the query (case-insensitive)
    const searchRegex = new RegExp(`.{0,100}${query}.{0,100}`, 'gi');
    const matches = [];
    let match;

    while ((match = searchRegex.exec(text)) !== null) {
      matches.push({
        text: match[0].trim(),
        index: match.index
      });
      
      if (matches.length >= 20) break; // Limit to 20 results
    }

    res.json({
      success: true,
      query,
      totalMatches: matches.length,
      results: matches
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching guidelines',
      error: error.message
    });
  }
};

// Check if guidelines exist
exports.checkGuidelines = async (req, res) => {
  try {
    const filePath = path.join(__dirname, '../../../client/public/centre-guidelines.pdf');
    await fs.access(filePath);
    
    res.json({
      success: true,
      exists: true,
      path: '/centre-guidelines.pdf'
    });
  } catch {
    res.json({
      success: true,
      exists: false
    });
  }
};

// Delete guidelines
exports.deleteGuidelines = async (req, res) => {
  try {
    const filePath = path.join(__dirname, '../../../client/public/centre-guidelines.pdf');
    await fs.unlink(filePath);
    
    res.json({
      success: true,
      message: 'Guidelines deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting guidelines',
      error: error.message
    });
  }
};
