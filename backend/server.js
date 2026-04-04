require('dotenv').config()
const express = require('express')
const multer = require('multer')
const cors = require('cors')
const path = require('path')
const fs = require('fs')
const rateLimit = require('express-rate-limit')
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3')
const { TranscribeClient, StartTranscriptionJobCommand, GetTranscriptionJobCommand } = require('@aws-sdk/client-transcribe')
const { GoogleGenerativeAI } = require('@google/generative-ai')

const app = express()
app.use(cors())

// Rate limit: max 5 uploads per IP per 15 minutes
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many requests. Please wait 15 minutes before trying again.' },
  standardHeaders: true,
  legacyHeaders: false,
})

const s3 = new S3Client({ region: process.env.AWS_REGION })
const transcribe = new TranscribeClient({ region: process.env.AWS_REGION })
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

// Max file size 25MB
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 25 * 1024 * 1024 },
})

app.get('/', (_req, res) => {
  res.send('VoxNoto API running')
})

app.post('/upload', uploadLimiter, upload.single('audio'), async (req, res) => {
  const file = req.file
  const ext = path.extname(file.originalname) || '.m4a'
  const s3Key = `audio/${Date.now()}${ext}`
  const jobName = `voxnoto-${Date.now()}`

  // SSE setup
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const send = (step, data = {}) => {
    res.write(`data: ${JSON.stringify({ step, ...data })}\n\n`)
  }

  try {
    // 1. Upload to S3
    send('uploading')
    await s3.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: s3Key,
      Body: fs.createReadStream(file.path),
      ContentType: file.mimetype
    }))
    fs.unlinkSync(file.path)

    // 2. Start Transcribe job
    send('transcribing')
    const s3Uri = `s3://${process.env.S3_BUCKET}/${s3Key}`
    await transcribe.send(new StartTranscriptionJobCommand({
      TranscriptionJobName: jobName,
      Media: { MediaFileUri: s3Uri },
      MediaFormat: ext.replace('.', ''),
      LanguageCode: 'th-TH',
      OutputBucketName: process.env.S3_BUCKET,
      OutputKey: `transcripts/${jobName}.json`
    }))

    // 3. Poll until done
    let status = 'IN_PROGRESS'
    let transcript = ''
    while (status === 'IN_PROGRESS' || status === 'QUEUED') {
      await new Promise(r => setTimeout(r, 3000))
      const { TranscriptionJob } = await transcribe.send(new GetTranscriptionJobCommand({
        TranscriptionJobName: jobName
      }))
      status = TranscriptionJob.TranscriptionJobStatus

      if (status === 'COMPLETED') {
        const s3Object = await s3.send(new GetObjectCommand({
          Bucket: process.env.S3_BUCKET,
          Key: `transcripts/${jobName}.json`
        }))
        const body = await s3Object.Body.transformToString()
        const data = JSON.parse(body)
        transcript = data.results.transcripts[0].transcript
      } else if (status === 'FAILED') {
        throw new Error(TranscriptionJob.FailureReason)
      }
    }

    // 4. Summarize with Gemini
    send('summarizing')
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
    const result = await model.generateContent(
      `สรุปเนื้อหาต่อไปนี้เป็นภาษาไทย แบบกระชับ เป็น bullet points ไม่เกิน 5 ข้อ:\n\n${transcript}`
    )
    const summary = result.response.text()

    // 5. Done
    send('done', { transcript, summary })
    res.end()

  } catch (err) {
    console.error('Error:', err)
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path)
    send('error', { message: err.message })
    res.end()
  }
})

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000')
})
