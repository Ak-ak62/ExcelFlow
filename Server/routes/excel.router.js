const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const ExcelFile = require('../models/excelFile.model');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only .xlsx and .xls files are allowed'));
    }
  }
});

// POST /api/excel/upload
router.post('/upload', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', raw: false });
    const sheetsMap = {};

    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const raw = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: '',
        raw: false
      });

      if (!raw.length) return;

      const headers = raw[0].filter(h => h !== '' && h !== null && h !== undefined);
      const rows = raw
        .slice(1)
        .filter(row => row.some(cell => String(cell).trim() !== ''))
        .map(row => {
          const obj = {};
          headers.forEach((h, i) => {
            obj[h] = row[i] !== undefined ? String(row[i]) : '';
          });
          return obj;
        });

      sheetsMap[sheetName] = { headers, rows };
    });

    await ExcelFile.deleteOne({ userId: req.user.userId, fileName: req.file.originalname });

    const fileDoc = await ExcelFile.create({
      userId: req.user.userId,
      fileName: req.file.originalname,
      sheets: sheetsMap
    });

    res.status(201).json({
      fileId: fileDoc._id,
      fileName: fileDoc.fileName,
      sheetNames: workbook.SheetNames
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Upload failed' });
  }
});

// GET /api/excel/my-files
router.get('/my-files', authMiddleware, async (req, res) => {
  try {
    const files = await ExcelFile.find(
      { userId: req.user.userId },
      { _id: 1, fileName: 1, uploadedAt: 1 }
    ).sort({ uploadedAt: -1 });

    res.status(200).json(files);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/excel/:fileId/sheets
router.get('/:fileId/sheets', authMiddleware, async (req, res) => {
  try {
    const file = await ExcelFile.findOne({ _id: req.params.fileId, userId: req.user.userId });
    if (!file) return res.status(404).json({ message: 'File not found' });

    res.status(200).json({
      fileId: file._id,
      fileName: file.fileName,
      sheetNames: Array.from(file.sheets.keys())
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/excel/:fileId/sheet/:sheetName
router.get('/:fileId/sheet/:sheetName', authMiddleware, async (req, res) => {
  try {
    const file = await ExcelFile.findOne({ _id: req.params.fileId, userId: req.user.userId });
    if (!file) return res.status(404).json({ message: 'File not found' });

    const sheet = file.sheets.get(req.params.sheetName);
    if (!sheet) return res.status(404).json({ message: 'Sheet not found' });

    res.status(200).json({
      sheetName: req.params.sheetName,
      headers: sheet.headers,
      rows: sheet.rows
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/excel/:fileId/sheet/:sheetName/row
router.post('/:fileId/sheet/:sheetName/row', authMiddleware, async (req, res) => {
  try {
    const file = await ExcelFile.findOne({ _id: req.params.fileId, userId: req.user.userId });
    if (!file) return res.status(404).json({ message: 'File not found' });

    const sheet = file.sheets.get(req.params.sheetName);
    if (!sheet) return res.status(404).json({ message: 'Sheet not found' });

    const newRow = req.body;
    sheet.rows.push(newRow);
    file.sheets.set(req.params.sheetName, sheet);
    file.markModified('sheets');
    await file.save();

    res.status(201).json({ message: 'Row added', row: newRow, rowIndex: sheet.rows.length - 1 });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/excel/:fileId/sheet/:sheetName/row/:rowIndex
router.delete('/:fileId/sheet/:sheetName/row/:rowIndex', authMiddleware, async (req, res) => {
  try {
    const file = await ExcelFile.findOne({ _id: req.params.fileId, userId: req.user.userId });
    if (!file) return res.status(404).json({ message: 'File not found' });

    const sheet = file.sheets.get(req.params.sheetName);
    if (!sheet) return res.status(404).json({ message: 'Sheet not found' });

    const index = parseInt(req.params.rowIndex, 10);
    if (isNaN(index) || index < 0 || index >= sheet.rows.length) {
      return res.status(400).json({ message: 'Invalid row index' });
    }

    sheet.rows.splice(index, 1);
    file.sheets.set(req.params.sheetName, sheet);
    file.markModified('sheets');
    await file.save();

    res.status(200).json({ message: 'Row deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/excel/:fileId/sheet/:sheetName/autonumber
// Returns the next available number for SOW or CR document types
router.get('/:fileId/sheet/:sheetName/autonumber', authMiddleware, async (req, res) => {
  try {
    const { docType } = req.query; // 'SOW' or 'CR'

    if (!docType) {
      return res.status(400).json({ message: 'docType query param required (SOW or CR)' });
    }

    const file = await ExcelFile.findOne({ _id: req.params.fileId, userId: req.user.userId });
    if (!file) return res.status(404).json({ message: 'File not found' });

    const sheet = file.sheets.get(req.params.sheetName);
    if (!sheet) return res.status(404).json({ message: 'Sheet not found' });

    const prefix = docType.toUpperCase();

    // Find all rows where Document Type starts with the prefix
    const pattern = new RegExp(`^${prefix}#`, 'i');
    const existing = sheet.rows
      .map(row => {
        const docTypeField = row['Document Type'] || '';
        const match = docTypeField.match(/^[A-Z]+#(\d+)$/i);
        if (match && docTypeField.toUpperCase().startsWith(prefix + '#')) {
          return parseInt(match[1], 10);
        }
        return null;
      })
      .filter(n => n !== null);

    const nextNum = existing.length > 0 ? Math.max(...existing) + 1 : 1;
    const nextCode = `${prefix}#${String(nextNum).padStart(3, '0')}`;

    res.status(200).json({ nextCode, prefix, nextNum });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/excel/:fileId
router.delete('/:fileId', authMiddleware, async (req, res) => {
  try {
    const deleted = await ExcelFile.findOneAndDelete({ _id: req.params.fileId, userId: req.user.userId });
    if (!deleted) return res.status(404).json({ message: 'File not found' });
    res.status(200).json({ message: 'File deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;