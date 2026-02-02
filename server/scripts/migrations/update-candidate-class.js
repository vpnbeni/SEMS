require('dotenv').config();
const mongoose = require('mongoose');
const Candidate = require('./src/models/Candidate');

async function updateCandidateClasses() {
  try {
    console.log('Connecting to MongoDB...');
    console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Found' : 'Not found');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('Connected to MongoDB');
    console.log('Checking candidate classes...\n');

    // First, check all candidates
    const allCandidates = await Candidate.find({});
    console.log(`Total candidates in database: ${allCandidates.length}`);
    
    if (allCandidates.length > 0) {
      // Show sample of current class values
      const sampleCandidates = allCandidates.slice(0, 5);
      console.log('\nSample candidates:');
      sampleCandidates.forEach(c => {
        console.log(`- ${c.rollNumber}: class="${c.class}" (${typeof c.class})`);
      });
    }

    // Find all candidates (update all to 12th)
    const candidates = await Candidate.find({});

    console.log(`\nFound ${candidates.length} candidates to update\n`);

    if (candidates.length === 0) {
      console.log('No candidates in database. Please import candidates from PDF first.');
      process.exit(0);
    }

    // Check the PDF file name or other indicators
    // For now, we'll assume all current candidates are from "SECONDARY SCHOOL EXAMINATION" (10th class)
    // You can modify this logic based on your specific needs

    let updated = 0;
    for (const candidate of candidates) {
      // Check if the candidate was imported from a PDF
      if (candidate.importedFrom && candidate.importedFrom.fileName) {
        const fileName = candidate.importedFrom.fileName.toUpperCase();
        
        // Try to determine class from filename
        if (fileName.includes('10') || (fileName.includes('SECONDARY') && !fileName.includes('SENIOR'))) {
          candidate.class = '10th';
        } else if (fileName.includes('12') || fileName.includes('SENIOR')) {
          candidate.class = '12th';
        } else {
          // Default to 12th for current "Centre List of Candidates" files (SENIOR SEC)
          candidate.class = '12th';
        }
      } else {
        // For manually added candidates, default to 12th
        candidate.class = '12th';
      }

      await candidate.save();
      updated++;
      
      if (updated % 10 === 0) {
        console.log(`Updated ${updated}/${candidates.length} candidates...`);
      }
    }

    console.log(`\nSuccessfully updated ${updated} candidates`);
    console.log('Done!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error updating candidates:', error);
    process.exit(1);
  }
}

updateCandidateClasses();
