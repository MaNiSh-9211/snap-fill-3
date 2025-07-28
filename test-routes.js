const express = require('express');
const router = express.Router();

// Test each route one by one
router.get('/test1', (req, res) => res.json({ success: true }));
router.get('/test2/:id', (req, res) => res.json({ success: true, id: req.params.id }));
router.get('/test3/:id/report', (req, res) => res.json({ success: true, id: req.params.id }));

module.exports = router;