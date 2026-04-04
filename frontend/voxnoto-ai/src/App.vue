<script setup>
import { ref, onMounted, onUnmounted } from "vue";

const step = ref("idle");
const transcript = ref("");
const summary = ref("");
const errorMsg = ref("");
const isRecording = ref(false);
const copied = ref("");

let mediaRecorder = null;
let chunks = [];

const stepOrder = ["uploading", "transcribing", "summarizing", "done"];

function isDone(key) {
  return stepOrder.indexOf(step.value) > stepOrder.indexOf(key);
}

function isActive(key) {
  return step.value === key;
}

const busy = () =>
  step.value !== "idle" && step.value !== "done" && step.value !== "error";

function onBeforeUnload(e) {
  if (busy()) {
    e.preventDefault();
    e.returnValue = "";
  }
}

onMounted(() => window.addEventListener("beforeunload", onBeforeUnload));
onUnmounted(() => window.removeEventListener("beforeunload", onBeforeUnload));

async function processFile(file) {
  step.value = "uploading";
  transcript.value = "";
  summary.value = "";
  errorMsg.value = "";

  const formData = new FormData();
  formData.append("audio", file);

  const res = await fetch(`${import.meta.env.VITE_API_URL}/upload`, {
    method: "POST",
    body: formData,
  });

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const lines = decoder.decode(value).split("\n");
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = JSON.parse(line.slice(6));
      if (data.step === "done") {
        transcript.value = data.transcript;
        summary.value = data.summary;
        step.value = "done";
      } else if (data.step === "error") {
        errorMsg.value = data.message;
        step.value = "error";
      } else {
        step.value = data.step;
      }
    }
  }
}

function onFileChange(e) {
  const file = e.target.files[0];
  if (file) processFile(file);
  e.target.value = "";
}

async function toggleRecord() {
  if (isRecording.value) {
    mediaRecorder.stop();
    isRecording.value = false;
    return;
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  chunks = [];
  mediaRecorder = new MediaRecorder(stream);
  mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
  mediaRecorder.onstop = () => {
    const blob = new Blob(chunks, { type: "audio/webm" });
    const file = new File([blob], "recording.webm", { type: "audio/webm" });
    stream.getTracks().forEach((t) => t.stop());
    processFile(file);
  };
  mediaRecorder.start();
  isRecording.value = true;
}

async function copyText(text, key) {
  await navigator.clipboard.writeText(text);
  copied.value = key;
  setTimeout(() => (copied.value = ""), 2000);
}

function reset() {
  step.value = "idle";
  transcript.value = "";
  summary.value = "";
  errorMsg.value = "";
}
</script>

<template>
  <div class="page">
    <div class="container">

      <!-- Header -->
      <header class="header">
        <div class="logo">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="6" fill="#2563EB"/>
            <path d="M12 5v14M8 8v8M16 8v8M4 11v2M20 11v2" stroke="white" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
          <span>VoxNoto</span>
        </div>
        <p class="tagline">Audio transcription &amp; AI summary</p>
      </header>

      <!-- Upload Card -->
      <div class="card upload-card" v-if="step === 'idle' || step === 'error'">
        <div class="card-body center">
          <div class="upload-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M12 15V3m0 0L8 7m4-4l4 4" stroke="#2563EB" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M3 15v3a2 2 0 002 2h14a2 2 0 002-2v-3" stroke="#94A3B8" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
          </div>
          <p class="upload-hint">Drop an audio file or choose an option</p>

          <div class="btn-group">
            <button
              :class="['btn', 'btn-primary', { 'btn-danger': isRecording }]"
              @click="toggleRecord"
            >
              <span v-if="!isRecording">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="4" fill="currentColor"/><path d="M19 10v2a7 7 0 01-14 0v-2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M12 19v3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
                Record Audio
              </span>
              <span v-else class="recording-label">
                <span class="rec-dot" /> Stop Recording
              </span>
            </button>

            <label class="btn btn-secondary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
              Upload File
              <input type="file" accept="audio/*" @change="onFileChange" hidden />
            </label>
          </div>

          <p v-if="step === 'error'" class="error-text">{{ errorMsg }}</p>
        </div>
      </div>

      <!-- Progress Card -->
      <div class="card" v-if="busy()">
        <div class="card-body">
          <p class="card-label">Processing your audio</p>
          <div class="steps">
            <div
              v-for="(s, i) in [
                { key: 'uploading', label: 'Uploading to S3', icon: '☁' },
                { key: 'transcribing', label: 'Transcribing audio', icon: '🎙' },
                { key: 'summarizing', label: 'Generating summary', icon: '✨' },
              ]"
              :key="s.key"
              class="step-row"
            >
              <div :class="['step-icon', { active: isActive(s.key), done: isDone(s.key) }]">
                <svg v-if="isDone(s.key)" width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13l4 4L19 7" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span v-else-if="isActive(s.key)" class="spinner" />
                <span v-else class="step-num">{{ i + 1 }}</span>
              </div>
              <span :class="['step-label', { 'step-label--active': isActive(s.key), 'step-label--done': isDone(s.key) }]">
                {{ s.label }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Results -->
      <template v-if="step === 'done'">
        <div class="card result-card">
          <div class="card-body">
            <div class="result-header">
              <div class="result-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 12h6M9 16h4M7 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2h-2M9 4h6v4H9V4z" stroke="#2563EB" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
                Transcript
              </div>
              <button class="btn-copy" @click="copyText(transcript, 'transcript')">
                {{ copied === 'transcript' ? '✓ Copied' : 'Copy' }}
              </button>
            </div>
            <p class="result-text">{{ transcript }}</p>
          </div>
        </div>

        <div class="card result-card">
          <div class="card-body">
            <div class="result-header">
              <div class="result-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="#7C3AED" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
                AI Summary
              </div>
              <button class="btn-copy" @click="copyText(summary, 'summary')">
                {{ copied === 'summary' ? '✓ Copied' : 'Copy' }}
              </button>
            </div>
            <p class="result-text summary-text">{{ summary }}</p>
          </div>
        </div>

        <div class="center">
          <button class="btn btn-ghost" @click="reset">
            ← Start over
          </button>
        </div>
      </template>

    </div>
  </div>
</template>

<style scoped>
* { box-sizing: border-box; }

.page {
  min-height: 100vh;
  background: #F8FAFC;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 48px 20px 80px;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}

.container {
  width: 100%;
  max-width: 560px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Header */
.header {
  text-align: center;
  margin-bottom: 12px;
}

.logo {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 1.4rem;
  font-weight: 700;
  color: #0F172A;
  margin-bottom: 6px;
}

.tagline {
  color: #94A3B8;
  font-size: 0.9rem;
  margin: 0;
}

/* Card */
.card {
  background: #ffffff;
  border: 1px solid #E2E8F0;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04);
}

.card-body {
  padding: 28px;
}

.card-label {
  font-size: 0.78rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #94A3B8;
  margin: 0 0 20px;
}

/* Upload Card */
.upload-card .card-body.center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 40px 28px;
}

.upload-icon {
  width: 56px;
  height: 56px;
  background: #EFF6FF;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-hint {
  color: #64748B;
  font-size: 0.95rem;
  margin: 0;
}

.btn-group {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 0.92rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.15s;
  text-decoration: none;
}

.btn-primary {
  background: #2563EB;
  color: white;
}
.btn-primary:hover { background: #1D4ED8; }

.btn-danger {
  background: #EF4444;
  color: white;
}
.btn-danger:hover { background: #DC2626; }

.btn-secondary {
  background: #F1F5F9;
  color: #334155;
  border: 1px solid #E2E8F0;
}
.btn-secondary:hover { background: #E2E8F0; }

.btn-ghost {
  background: transparent;
  color: #64748B;
  font-size: 0.88rem;
  padding: 8px 16px;
}
.btn-ghost:hover { color: #334155; background: #F1F5F9; border-radius: 8px; }

.recording-label {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rec-dot {
  width: 8px;
  height: 8px;
  background: white;
  border-radius: 50%;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.8); }
}

.error-text {
  color: #EF4444;
  font-size: 0.85rem;
  margin: 0;
  text-align: center;
  max-width: 400px;
}

/* Steps */
.steps {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.step-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.step-icon {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #F1F5F9;
  border: 2px solid #E2E8F0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.3s;
}

.step-icon.active {
  background: #EFF6FF;
  border-color: #2563EB;
}

.step-icon.done {
  background: #2563EB;
  border-color: #2563EB;
}

.step-num {
  font-size: 0.75rem;
  font-weight: 600;
  color: #94A3B8;
}

.spinner {
  width: 12px;
  height: 12px;
  border: 2px solid #BFDBFE;
  border-top-color: #2563EB;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  display: block;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.step-label {
  font-size: 0.92rem;
  color: #94A3B8;
  transition: color 0.3s;
}

.step-label--active {
  color: #1E40AF;
  font-weight: 500;
}

.step-label--done {
  color: #475569;
}

/* Result Card */
.result-card .card-body {
  padding: 24px 28px;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.result-title {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 0.82rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #475569;
}

.btn-copy {
  font-size: 0.8rem;
  color: #64748B;
  background: #F8FAFC;
  border: 1px solid #E2E8F0;
  border-radius: 6px;
  padding: 4px 12px;
  cursor: pointer;
  transition: all 0.15s;
  font-weight: 500;
}
.btn-copy:hover { background: #F1F5F9; color: #334155; }

.result-text {
  font-size: 0.95rem;
  line-height: 1.75;
  color: #334155;
  margin: 0;
}

.summary-text {
  white-space: pre-line;
}

.center {
  display: flex;
  justify-content: center;
}
</style>
