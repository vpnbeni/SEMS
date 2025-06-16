const express = require('express');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// Placeholder routes - to be implemented
router.get('/', (req, res) => {
  res.json({ message: 'Student routes - Coming soon' });
});

router.post('/', (req, res) => {
  res.json({ message: 'Create student - Coming soon' });
});

router.get('/:id', (req, res) => {
  res.json({ message: 'Get student - Coming soon' });
});

router.put('/:id', (req, res) => {
  res.json({ message: 'Update student - Coming soon' });
});

router.delete('/:id', (req, res) => {
  res.json({ message: 'Delete student - Coming soon' });
});

module.exports = router;