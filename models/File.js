const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  filename: String,
  contentType: String,
  data: Buffer,
  hash: String
});

module.exports = mongoose.model('File', fileSchema, 'fileCheck');