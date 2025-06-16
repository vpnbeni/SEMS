const express = require('express');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// Placeholder routes - to be implemented
router.get('/', (req, res) => {
  res.json({ message: 'Date sheet routes - Coming soon' });
});

router.post('/', (req, res) => {
  res.json({ message: 'Create date sheet - Coming soon' });
});

router.get('/:id', (req, res) => {
  res.json({ message: 'Get date sheet - Coming soon' });
});

router.put('/:id', (req, res) => {
  res.json({ message: 'Update date sheet - Coming soon' });
});

router.delete('/:id', (req, res) => {
  res.json({ message: 'Delete date sheet - Coming soon' });
});

module.exports = router;