const express = require('express');
const multer = require('multer');
const { exec } = require('child_process');
const cors = require('cors');

const app = express();
app.use(cors());

const upload = multer({ dest: 'uploads/' });

app.post('/upload', upload.single('audio'), (req, res) => {
  const filePath = req.file.path;

  exec(`python transcribe.py ${filePath}`, (err, stdout) => {
    if (err) return res.status(500).send(err);

    res.send(stdout);
  });
});

app.listen(3000, () => console.log("Server running"));