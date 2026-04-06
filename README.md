# 🎙️ VoxNoto — Audio Transcription & AI Summary

Web app สำหรับแปลงเสียงเป็นข้อความ และสรุปเนื้อหาด้วย AI  
รองรับการอัดเสียงสดและอัปโหลดไฟล์เสียง ผลลัพธ์เป็นภาษาไทย

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│              Vue 3 Frontend                 │
│  Record / Upload Audio                      │
│  SSE Progress: uploading → transcribing     │
│               → summarizing → done          │
└──────────────────┬──────────────────────────┘
                   │ POST /upload (multipart)
                   │ SSE stream response
                   ▼
┌─────────────────────────────────────────────┐
│           Express.js Backend                │
│                                             │
│  1. Upload audio ──────────────► AWS S3     │
│  2. Start job ─────────────────► AWS Transcribe (th-TH) │
│  3. Poll until done ◄──────────── transcript JSON       │
│  4. Summarize ─────────────────► Gemini AI  │
│  5. Stream result ─────────────► Frontend   │
└─────────────────────────────────────────────┘
```

---

## ✨ Features

- 🎤 **อัดเสียงสด** ผ่านไมค์ใน browser
- 📁 **อัปโหลดไฟล์** เสียงทุกรูปแบบ (max 25MB)
- 📝 **Transcription ภาษาไทย** ด้วย AWS Transcribe
- ✨ **AI Summary** สรุปเป็น bullet points ด้วย Gemini
- ⚡ **Real-time Progress** ผ่าน Server-Sent Events (SSE)
- 🔒 **Rate Limiting** 5 requests / 15 นาที / IP
- 📋 **Copy to Clipboard** ทั้ง transcript และ summary

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vue 3, Composition API, Vite |
| Backend | Node.js, Express.js |
| Storage | AWS S3 |
| Speech-to-Text | AWS Transcribe (Thai) |
| AI Summary | Google Gemini API |
| Streaming | Server-Sent Events (SSE) |
| Testing | Jest, Supertest |
| CI | GitHub Actions |

---

## 📁 Project Structure

```
voxnoto-ai/
├── backend/
│   ├── server.js           # Express API (upload, transcribe, summarize)
│   ├── generate-doc.js     # PDF doc generator
│   ├── transcribe.py       # Python transcribe helper
│   ├── package.json
│   ├── .env.example
│   └── __tests__/
│       └── server.test.js
└── frontend/voxnoto-ai/
    ├── src/
    │   └── App.vue         # UI หลัก (record, upload, progress, results)
    ├── package.json
    └── .env.example
```

---

## 🚀 Setup

### Backend

```bash
cd backend
npm install

cp .env.example .env
# แก้ไขค่าใน .env

node server.js
# Server: http://localhost:3000
```

### Frontend

```bash
cd frontend/voxnoto-ai
npm install

cp .env.example .env
# แก้ VITE_API_URL ให้ตรงกับ backend

npm run dev
```

### Environment Variables

**backend/.env**
```
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=ap-southeast-2
S3_BUCKET=your_s3_bucket_name
GEMINI_API_KEY=your_gemini_api_key
```

**frontend/.env**
```
VITE_API_URL=http://localhost:3000
```

---

## 🔄 How It Works

```
1. User อัดเสียง / อัปโหลดไฟล์
        │
        ▼
2. Backend รับไฟล์ → อัปโหลดขึ้น AWS S3
        │
        ▼
3. AWS Transcribe ประมวลผล (th-TH)
   Backend poll ทุก 3 วินาที จนเสร็จ
        │
        ▼
4. Gemini AI สรุปเนื้อหาเป็น bullet points
        │
        ▼
5. ส่งผลลัพธ์กลับ Frontend ผ่าน SSE
   (แสดง progress แบบ real-time ระหว่างรอ)
```

---

## 🧪 Testing

```bash
cd backend
npm test
```
