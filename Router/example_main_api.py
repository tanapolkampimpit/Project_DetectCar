from fastapi import FastAPI
import uvicorn

# 1. นำเข้า Router ที่เราแพ็คไว้
from detectcar_router import router as detectcar_router

# 2. สร้าง API หลัก (จำลองว่าเป็น API ของทีมอื่น)
app = FastAPI(title="Main API ของทีมอื่น")

# 3. นำ Router ของเราไปเสียบเข้า API หลัก
app.include_router(detectcar_router, prefix="/detectcar", tags=["DetectCar"])

@app.get("/")
def home():
    return {"message": "นี่คือหน้าแรกของ API หลัก"}

if __name__ == "__main__":
    print("🚀 เริ่มต้นรัน API หลักและ Router...")
    # เวลาเริ่มรัน ให้รันไฟล์นี้
    uvicorn.run("example_main_api:app", host="127.0.0.1", port=8000, reload=True)
