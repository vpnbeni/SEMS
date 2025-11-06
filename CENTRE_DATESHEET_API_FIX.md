# Centre Datesheet API Fix

## Issue
The centre datesheet data was not being fetched in the Answer Sheets page. The "Used" tab showed the new columns but no data was displayed.

## Root Cause
The `centreDatesheetService.ts` and `answerSheetService.ts` were using the raw `axios` import instead of the centralized `api` instance that includes authentication interceptors.

### Problem Code
```typescript
// centreDatesheetService.ts - BEFORE
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

async getEntries() {
  const response = await axios.get(`${API_URL}/centre-datesheet/entries`)
  return response.data
}
```

This meant:
- No authentication token was being sent with requests
- The API endpoint requires authentication (`protect` middleware)
- Requests were failing with 401 Unauthorized

## Solution
Updated both services to use the centralized `api` instance from `client/src/services/api.ts` which:
- Automatically adds authentication tokens to all requests
- Handles token refresh
- Provides consistent error handling
- Includes request/response interceptors

### Fixed Code
```typescript
// centreDatesheetService.ts - AFTER
import api from './api'

async getEntries() {
  const response = await api.get('/centre-datesheet/entries')
  return response.data
}
```

## Files Modified

### 1. `client/src/services/centreDatesheetService.ts`
**Changes:**
- Replaced `import axios from 'axios'` with `import api from './api'`
- Removed `API_URL` constant
- Changed `axios.get()` to `api.get()`
- Updated endpoint from full URL to relative path

### 2. `client/src/services/answerSheetService.ts`
**Changes:**
- Replaced `import axios from 'axios'` with `import api from './api'`
- Removed `API_URL` constant
- Updated all 11 methods to use `api` instead of `axios`:
  - `getAnswerSheets()`
  - `getAnswerSheetById()`
  - `createAnswerSheet()`
  - `updateAnswerSheet()`
  - `deleteAnswerSheet()`
  - `useSheets()`
  - `discardSheets()`
  - `getStatistics()`
  - `parseTemplate()`
  - `downloadTemplate()`
  - `uploadExcel()`

## Benefits of Using Centralized API

### 1. Authentication
```typescript
// Automatically adds token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
```

### 2. Token Refresh
```typescript
// Automatically refreshes expired tokens
if (status === 401 && !originalRequest._retry) {
  // Try to refresh token
  const refreshToken = localStorage.getItem('refreshToken')
  // ... refresh logic
}
```

### 3. Error Handling
```typescript
// Consistent error handling with toast notifications
switch (status) {
  case 400: toast.error('Bad request')
  case 401: toast.error('Session expired')
  case 403: toast.error('Permission denied')
  case 404: toast.error('Not found')
  // ... etc
}
```

### 4. Request Caching Prevention
```typescript
// Adds timestamp to prevent caching
config.params = {
  ...config.params,
  _t: Date.now(),
}
```

## Testing

### Manual Testing
1. Open the Answer Sheets page
2. Check browser console for any errors
3. Click on "Used" tab
4. Verify centre datesheet entries are fetched
5. Click "Use" on an answer sheet
6. Verify the link modal shows available exams

### API Testing
Use the test file: `test-centre-datesheet-api-direct.html`

1. Open the file in a browser
2. Enter your authentication token
3. Click "Test GET /api/centre-datesheet/entries"
4. Verify the response shows entries with candidate counts

### Expected Response
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "examDate": "2025-02-15T00:00:00.000Z",
      "dayName": "SATURDAY",
      "subjectCode": "041",
      "subjectName": "MATHEMATICS STANDARD",
      "class": "10",
      "timeSlot": {
        "start": "10:30 AM",
        "end": "01:30 PM"
      },
      "duration": 180,
      "candidateCount": 45,
      "roomsNeeded": 2
    }
  ],
  "count": 15
}
```

## Verification Checklist

- [x] Services use centralized `api` instance
- [x] Authentication token is sent with requests
- [x] No TypeScript errors
- [x] API endpoint returns data correctly
- [x] Link modal displays available exams
- [x] Used tab shows linked exam details

## Common Issues

### Issue: "No entries found"
**Cause:** No CBSE datesheet imported or no candidates with subjects

**Solution:**
1. Import CBSE datesheet from Datesheets page
2. Link subjects to candidates
3. Refresh Answer Sheets page

### Issue: "401 Unauthorized"
**Cause:** No authentication token or expired token

**Solution:**
1. Login again to get a fresh token
2. Check localStorage for 'token' key
3. Verify token is not expired

### Issue: "Network error"
**Cause:** Server not running or wrong API URL

**Solution:**
1. Start the server: `cd server && npm start`
2. Verify API URL in `.env` file
3. Check server is running on http://localhost:5000

## Best Practices

### Always Use Centralized API
```typescript
// ✅ CORRECT
import api from './api'
const response = await api.get('/endpoint')

// ❌ WRONG
import axios from 'axios'
const response = await axios.get('http://localhost:5000/api/endpoint')
```

### Relative Paths
```typescript
// ✅ CORRECT - Relative to baseURL
await api.get('/centre-datesheet/entries')

// ❌ WRONG - Full URL
await api.get('http://localhost:5000/api/centre-datesheet/entries')
```

### Error Handling
```typescript
// ✅ CORRECT - Let interceptor handle errors
try {
  const response = await api.get('/endpoint')
  return response.data
} catch (error) {
  // Interceptor already showed toast
  console.error('Error:', error)
}

// ❌ WRONG - Duplicate error handling
try {
  const response = await api.get('/endpoint')
  return response.data
} catch (error) {
  alert('Error!') // Interceptor already showed toast
}
```

## Summary

The fix was simple but critical:
1. Use centralized `api` instance instead of raw `axios`
2. This ensures authentication tokens are sent with all requests
3. Provides consistent error handling and token refresh
4. Follows the existing pattern used by other services

The centre datesheet data should now be fetched correctly and displayed in the Answer Sheets page.
