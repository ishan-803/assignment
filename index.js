const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const mongoose = require('mongoose');
const File = require('./models/File');

const app = express();
const PORT = 4000;

const storage = multer.memoryStorage();
const upload = multer({ storage });

mongoose.connect('mongodb://localhost:27017/file', {

});

function getBufferHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function checkDuplicate(buffer, filename) {
  const fileHash = getBufferHash(buffer);

  const byHash = await File.findOne({ hash: fileHash });
  if (byHash) {
    return { duplicate: true, type: 'content', file: byHash, hash: fileHash };
  }
  const byName = await File.findOne({ filename });
  if (byName) {
  
    const existingHash = byName.hash || getBufferHash(byName.data);
    if (existingHash === fileHash) {

      return { duplicate: true, type: 'content', file: byName, hash: fileHash };
    }

    return { duplicate: false, type: 'name-conflict', existingFile: byName };
  }

  return { duplicate: false, type: 'new', hash: fileHash };
}

app.post('/upload', upload.single('fileCheck'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    const fileBuffer = req.file.buffer;
    const filename = req.file.originalname;

    const result = await checkDuplicate(fileBuffer, filename);

    if (result.duplicate) {
 
      return res.status(400).json({ message: 'Duplicate file/Content detected. Upload aborted.', existingFilename: result.file.filename });
    }

    if (result.type === 'name-conflict') {

      return res.status(400).json({ message: 'Filename already exists with different content. Rename file or choose overwrite.', existingFilename: result.existingFile.filename });
    }

    const file = new File({
      filename,
      contentType: req.file.mimetype,
      data: fileBuffer,
      hash: result.hash
    });

    await file.save();
    res.status(201).json({ message: `uploaded successfully: ${file.filename}` });
  } catch (err) {
    res.status(400).json({ message: `upload failed: ${err.message}` });
  }
});

app.get('/download/:filename', async (req, res) => {
  try {
    const file = await File.findOne({ filename: req.params.filename });

    if (!file) {
      return res.status(404).json({ message: 'File not found.' });
    }

    res.set({
      'Content-Type': file.contentType,
      'Content-Disposition': `attachment; filename="${file.filename}"`
    });
    res.send(file.data);
  } catch (err) {
    res.status(400).json({ message: `download failed: ${err.message}` });
  }
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));