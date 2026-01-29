class Form66Parser {
  parseTextFile(content) {
    try {
      const lines = content.split('\n');
      const records = [];
      
      let centreNo = '';
      let centreName = '';
      let currentExam = null;
      let inRollNumberSection = false;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip empty lines
        if (!line) continue;
        
        // Look for centre information - Format: "CENTRE - 827403 INTL BHARTI SCHOOL GOHANA ROAD ROHTAK HARYANA"
        const centreMatch = line.match(/CENTRE\s*[-:]\s*(\d+)\s+(.+)/i);
        if (centreMatch) {
          centreNo = centreMatch[1];
          centreName = centreMatch[2].trim();
          console.log(`Found centre: ${centreNo} - ${centreName}`);
          continue;
        }
        
        // Look for date and subject - Format: "15.02.2025 184 ENGLISH (LANGUAGE AND LITERATURE)"
        const dateMatch = line.match(/(\d{2}\.\d{2}\.\d{4})\s+(\d+)\s+(.+)/);
        if (dateMatch) {
          // Save previous exam if exists
          if (currentExam && currentExam.rollNumbers.length > 0) {
            this.saveExamRecords(currentExam, records);
          }
          
          currentExam = {
            centreNo: centreNo,
            centreName: centreName,
            examDate: dateMatch[1],
            subjectCode: dateMatch[2],
            subject: dateMatch[3].trim(),
            rollNumbers: []
          };
          inRollNumberSection = true;
          console.log(`Found exam: ${currentExam.examDate} - ${currentExam.subjectCode} ${currentExam.subject}`);
          continue;
        }
        
        // Look for roll number ranges - Format: "17248737-17248800 64 I"
        const rollRangeMatch = line.match(/(\d{7,8})-(\d{7,8})\s+(\d+)/);
        if (rollRangeMatch && currentExam && inRollNumberSection) {
          const startRoll = parseInt(rollRangeMatch[1]);
          const endRoll = parseInt(rollRangeMatch[2]);
          const count = parseInt(rollRangeMatch[3]);
          
          console.log(`Found roll range: ${startRoll}-${endRoll} (${count} students)`);
          
          // Generate roll numbers in range - add exactly 'count' numbers from this range
          let added = 0;
          for (let roll = startRoll; roll <= endRoll && added < count; roll++) {
            currentExam.rollNumbers.push(roll.toString());
            added++;
          }
          console.log(`  Added ${added} roll numbers (total now: ${currentExam.rollNumbers.length})`);
          continue;
        }
        
        // Look for subject total - marks end of current exam section
        if (line.includes('SUBJECT') && line.includes('TOTAL') && currentExam) {
          console.log(`Subject total found, saving ${currentExam.rollNumbers.length} records`);
          if (currentExam.rollNumbers.length > 0) {
            this.saveExamRecords(currentExam, records);
          }
          currentExam = null;
          inRollNumberSection = false;
        }
      }
      
      // Add last exam if exists
      if (currentExam && currentExam.rollNumbers.length > 0) {
        console.log(`Saving final exam with ${currentExam.rollNumbers.length} records`);
        this.saveExamRecords(currentExam, records);
      }
      
      console.log(`✅ Parsed ${records.length} records from Form 66`);
      return records;
    } catch (error) {
      console.error('Form66 Parser Error:', error);
      throw new Error(`Failed to parse Form 66 file: ${error.message}`);
    }
  }
  
  saveExamRecords(exam, records) {
    exam.rollNumbers.forEach(rollNo => {
      records.push({
        rollNo: rollNo,
        centreNo: exam.centreNo,
        centreName: exam.centreName,
        examDate: exam.examDate,
        subjectCode: exam.subjectCode,
        subject: exam.subject,
        class: this.detectClass(exam.subjectCode),
        candidateName: '',
        subjects: [{
          code: exam.subjectCode,
          name: exam.subject
        }]
      });
    });
  }
  
  detectClass(subjectCode) {
    // CBSE Class Detection:
    // Class X subjects: 3-digit codes (100+) like 184 (English), 041 (Math)
    // Class XII subjects: 2-digit codes (1-99) like 048 (Physical Education), 064 (Home Science)
    const code = parseInt(subjectCode);
    if (code >= 100) {
      return 'X';
    }
    return 'XII';
  }
}

module.exports = new Form66Parser();
