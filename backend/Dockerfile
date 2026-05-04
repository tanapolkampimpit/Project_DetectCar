# Step 1: เลือก Base Image ที่เบาที่สุด
FROM python:3.10-slim

# Step 2: ตั้งค่า Environment ให้ Python ทำงานได้สมบูรณ์
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Step 3: กำหนดโฟลเดอร์ทำงาน
WORKDIR /app

# Step 4: ติดตั้งระบบพื้นฐานที่จำเป็น (เพิ่ม libturbojpeg สำหรับความเร็วในการอ่านรูป)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libturbojpeg \
    && rm -rf /var/lib/apt/lists/*

# Step 5: คัดลอกและติดตั้งไลบรารี (ใช้ --no-cache-dir เพื่อให้ Docker Image เบาลง)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Step 6: คัดลอกโค้ดโปรเจกต์ทั้งหมด
COPY . .

# Step 7: เปิด Port 8000
EXPOSE 8000

# Step 8: รันเซิร์ฟเวอร์ด้วย Granian (Rust-based) แทน Uvicorn เพื่อความแรง
# --interface asgi: บอกว่าใช้กับ FastAPI
# --host 0.0.0.0: ให้คนภายนอกเข้าถึงได้
CMD ["granian", "--interface", "asgi", "--host", "0.0.0.0", "--port", "8000", "app.main:app"]
