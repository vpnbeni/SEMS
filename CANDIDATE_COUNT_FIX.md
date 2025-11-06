# Candidate Count Fix - Class-Specific Counting

## Issue
The candidate count for subjects in the centre datesheet was incorrectly counting candidates across all classes. For example, subject code 041 (Mathematics) exists for both class 10th and 12th, and the system was counting all candidates who had this subject code, regardless of their class.

**Example of the bug:**
- Total class 10th candidates: 315
- Displayed count for code 041 (10th): 344 (incorrectly included class 12th students)

## Root Cause
The `subjectFrequency` Map was using only the subject code as the key, without considering the class level. This caused subjects with the same code across different classes to be counted together.

## Solution
Updated the candidate counting logic to use a composite key of `subjectCode-class` instead of just `subjectCode`.

### Changes Made

**Before:**
```javascript
const key = subject.code
const count = subjectFrequency.get(subject.code) || 0
subjectFrequency.set(subject.code, count + 1)
```

**After:**
```javascript
const key = `${subject.code}-${subject.class}`
const count = subjectFrequency.get(key) || 0
subjectFrequency.set(key, count + 1)
```

When calculating candidate count for each entry:
```javascript
const key = `${entry.subject.code}-${entry.subject.class}`
const candidateCount = subjectFrequency.get(key) || 0
```

## Result
Now the candidate count correctly shows only the candidates from the specific class for each subject:
- Code 041 (10th): Shows only class 10th candidates
- Code 041 (12th): Shows only class 12th candidates
- Room allocation is now accurate based on the correct candidate count

## Additional Fix: Exclude Subjects with 0 Candidates
The centre datesheet was showing subjects that no students had chosen (e.g., Painting, Music with 0 candidates). 

**Updated logic:**
- First, calculate candidate count for each subject (by code + class)
- Then, filter out any subjects where candidateCount = 0
- Only subjects with at least 1 candidate are shown in the centre datesheet

This ensures the centre datesheet truly reflects only the subjects that students have actually chosen.
