const express = require('express')
const multer = require('multer')
const { exec } = require('child_process')
const cors = require('cors')
const path = require('path')

const app = express()
app.use(cors())

// เก็บไฟล์แบบมีชื่อจริง (สำคัญมาก)
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.m4a'
    cb(null, Date.now() + "-" + file.fieldname + ext)
  }
})

const upload = multer({ storage })



app.get('/',(req,res) =>{
    return res.send("Hello world")
})


app.post('/upload', upload.single('audio'), (req, res) => {
  let filePath = req.file.path.replace(/\\/g, "/")

  console.log("File:", filePath)

  exec(`python transcribe.py "${filePath}"`, { encoding: 'utf8' }, (err, stdout, stderr) => {
    console.log("STDOUT:", stdout)
    console.log("STDERR:", stderr)

    if (err) {
      console.error("Error:", err)
      return res.status(500).json({ error: stderr || err.message })
    }

    res.send(stdout.trim())
  })
})

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000")
})