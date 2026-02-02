const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

async function parseCentreGuidelines() {
  try {
    const pdfPath = path.join(__dirname, '../client/public/centre-guidelines.pdf');
    
    // Check if file exists
    if (!fs.existsSync(pdfPath)) {
      console.log('❌ Centre guidelines PDF not found at:', pdfPath);
      return;
    }

    console.log('📄 Reading centre-guidelines.pdf...\n');
    
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdf(dataBuffer);

    console.log('='.repeat(80));
    console.log('PDF METADATA');
    console.log('='.repeat(80));
    console.log('Total Pages:', data.numpages);
    console.log('Info:', JSON.stringify(data.info, null, 2));
    console.log('\n');

    console.log('='.repeat(80));
    console.log('FULL TEXT CONTENT');
    console.log('='.repeat(80));
    console.log(data.text);
    console.log('\n');

    // Try to extract structured information
    console.log('='.repeat(80));
    console.log('EXTRACTED STRUCTURE');
    console.log('='.repeat(80));

    const text = data.text;
    
    // Extract chapters
    const chapterRegex = /(?:CHAPTER|Chapter)\s+(\d+|[IVX]+)[:\s]+([^\n]+)/gi;
    const chapters = [];
    let match;
    
    while ((match = chapterRegex.exec(text)) !== null) {
      chapters.push({
        number: match[1],
        title: match[2].trim()
      });
    }

    if (chapters.length > 0) {
      console.log('\n📚 CHAPTERS FOUND:');
      chapters.forEach((chapter, index) => {
        console.log(`  ${index + 1}. Chapter ${chapter.number}: ${chapter.title}`);
      });
    } else {
      console.log('\n📚 No chapters found with standard format');
    }

    // Extract annexures
    const annexureRegex = /(?:ANNEXURE|Annexure|ANNEX|Annex)\s+([A-Z0-9]+)[:\s-]+([^\n]+)/gi;
    const annexures = [];
    
    while ((match = annexureRegex.exec(text)) !== null) {
      annexures.push({
        number: match[1],
        title: match[2].trim()
      });
    }

    if (annexures.length > 0) {
      console.log('\n📎 ANNEXURES FOUND:');
      annexures.forEach((annexure, index) => {
        console.log(`  ${index + 1}. Annexure ${annexure.number}: ${annexure.title}`);
      });
    } else {
      console.log('\n📎 No annexures found with standard format');
    }

    // Extract sections
    const sectionRegex = /(?:SECTION|Section)\s+(\d+|[IVX]+)[:\s]+([^\n]+)/gi;
    const sections = [];
    
    while ((match = sectionRegex.exec(text)) !== null) {
      sections.push({
        number: match[1],
        title: match[2].trim()
      });
    }

    if (sections.length > 0) {
      console.log('\n📋 SECTIONS FOUND:');
      sections.forEach((section, index) => {
        console.log(`  ${index + 1}. Section ${section.number}: ${section.title}`);
      });
    } else {
      console.log('\n📋 No sections found with standard format');
    }

    // Extract numbered points/guidelines
    const guidelineRegex = /^(\d+)\.\s+([^\n]+)/gm;
    const guidelines = [];
    
    while ((match = guidelineRegex.exec(text)) !== null) {
      if (match[2].length > 10 && match[2].length < 200) { // Filter out noise
        guidelines.push({
          number: match[1],
          text: match[2].trim()
        });
      }
    }

    if (guidelines.length > 0) {
      console.log('\n📝 NUMBERED GUIDELINES (first 20):');
      guidelines.slice(0, 20).forEach((guideline) => {
        console.log(`  ${guideline.number}. ${guideline.text}`);
      });
      if (guidelines.length > 20) {
        console.log(`  ... and ${guidelines.length - 20} more`);
      }
    }

    // Extract headings (all caps lines)
    const headingRegex = /^([A-Z][A-Z\s]{10,})$/gm;
    const headings = [];
    
    while ((match = headingRegex.exec(text)) !== null) {
      const heading = match[1].trim();
      if (heading.length < 100) { // Filter out long lines
        headings.push(heading);
      }
    }

    if (headings.length > 0) {
      console.log('\n📌 MAJOR HEADINGS (first 15):');
      headings.slice(0, 15).forEach((heading, index) => {
        console.log(`  ${index + 1}. ${heading}`);
      });
      if (headings.length > 15) {
        console.log(`  ... and ${headings.length - 15} more`);
      }
    }

    // Summary
    console.log('\n');
    console.log('='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log('Total Pages:', data.numpages);
    console.log('Total Characters:', text.length);
    console.log('Chapters Found:', chapters.length);
    console.log('Sections Found:', sections.length);
    console.log('Annexures Found:', annexures.length);
    console.log('Numbered Guidelines:', guidelines.length);
    console.log('Major Headings:', headings.length);
    console.log('='.repeat(80));

    // Return structured data
    return {
      metadata: {
        pages: data.numpages,
        info: data.info
      },
      content: {
        fullText: text,
        chapters,
        sections,
        annexures,
        guidelines,
        headings
      }
    };

  } catch (error) {
    console.error('❌ Error parsing PDF:', error.message);
    console.error(error);
  }
}

// Run the parser
parseCentreGuidelines()
  .then(() => {
    console.log('\n✅ Parsing complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
