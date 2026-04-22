from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import analyze
import uvicorn

# 🟢 เติม lifespan=analyze.lifespan ตรงนี้ เพื่อให้มันโหลดโมเดลตอนเปิดเซิร์ฟเวอร์!
app = FastAPI(
    title="Project Cattmat API",
    lifespan=analyze.lifespan 
)

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# รวม Router ต่างๆ เข้าด้วยกัน
app.include_router(analyze.router)

@app.get("/")
def read_root():
    return {"status": "Service is running"}

if __name__ == "__main__":
    # ตอนนำขึ้น Production จริง แนะนำให้เอา reload=True ออกนะครับ
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)