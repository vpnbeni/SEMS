const express = require('express');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// Placeholder routes - to be implemented
router.get('/', (req, res) => {
  res.json({ message: 'Dispatch routes - Coming soon' });
});

router.post('/', (req, res) => {
  res.json({ message: 'Create dispatch - Coming soon' });
});

router.get('/:id', (req, res) => {
  res.json({ message: 'Get dispatch - Coming soon' });
});

router.put('/:id', (req, res) => {
  res.json({ message: 'Update dispatch - Coming soon' });
});

router.delete('/:id', (req, res) => {
  res.json({ message: 'Delete dispatch - Coming soon' });
});

module.exports = router;