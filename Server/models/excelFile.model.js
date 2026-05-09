const mongoose = require('mongoose');

const sheetSchema = new mongoose.Schema({
  headers: [String],
  rows: [mongoose.Schema.Types.Mixed]
}, { _id: false });

const excelFileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  sheets: {
    type: Map,
    of: sheetSchema
  }
}, { versionKey: false });

module.exports = mongoose.model('ExcelFile', excelFileSchema);