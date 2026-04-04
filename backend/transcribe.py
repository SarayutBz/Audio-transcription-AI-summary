import whisper
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# โหลด model
model = whisper.load_model("base")

# รับ path ไฟล์จาก Node
file_path = sys.argv[1]


print("Processing:", file_path, file=sys.stderr)

# แปลงเสียง
result = model.transcribe(file_path, language="th")

# ส่ง text กลับไป Node
print(result["text"])