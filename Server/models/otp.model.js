const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  otpHash: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600 // Auto-delete after 10 minutes (TTL index)
  }
}, { versionKey: false });

module.exports = mongoose.model('Otp', otpSchema);