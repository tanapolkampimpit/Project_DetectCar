# Prompt สร้างภาพ System Diagram: Project_DetectCar

สร้างภาพ System Diagram ภาษาไทย สำหรับระบบตรวจรูปรถยนต์ของบริษัท โดยแสดงภาพรวมการไหลของข้อมูลตั้งแต่ Messenger ไปถ่ายรูปรถที่บ้านลูกค้า ส่งรูปเข้าบริษัท เข้าสู่ Backend API เพื่อทำนายด้านรถ จัดเรียงรูป ตรวจรอยบาดแผล สร้างรูป mask แล้วส่งผลให้ Admin ตรวจสอบ

ภาพต้องเป็น technical system diagram ที่ดูง่าย ไม่ใช่ภาพ marketing และไม่ต้องใส่รายละเอียดโค้ดเยอะ

## ชื่อ Diagram

System Diagram: ระบบ AI ตรวจรูปรถยนต์และรอยบาดแผล

## Actor ภายนอกระบบ

1. Messenger / เจ้าหน้าที่ถ่ายภาพ
   - ถ่ายรูปหลายมุม เช่น Front, Back, Left, Right
   - ส่งรูปเข้าระบบบริษัท
   
2. Admin / เจ้าหน้าที่บริษัท
   - ตรวจสอบรูปที่จัดเรียงแล้ว
   - ตรวจสอบรูปที่มี mask รอยเสียหาย
   - ยืนยันผลสุดท้าย

## System Boundary

วาดกรอบใหญ่ชื่อ `Company Car Inspection System`

ภายในกรอบนี้มี component หลัก:

1. Upload Channel
   - รับรูปจาก Messenger
   - ส่งรูปเข้า Backend API

2. Backend API Gateway
   - FastAPI
   - รับ request รูปภาพ
   - ตรวจชนิดไฟล์
   - ตรวจขนาดไฟล์
   - ส่งต่อไปยัง service ที่เกี่ยวข้อง

3. Image Quality Service
   - Decode รูป
   - ตรวจภาพเบลอ
   - Resize / Normalize
   - ถ้าภาพเบลอมาก ให้ส่ง error กลับ

4. View Prediction Service
   - API: `POST /api/v1/predict_view`
   - ใช้ AI ทำนายด้านรถ
   - โมเดลที่ใช้:
     - YOLO General: ตรวจประเภทภาพ
     - ConvNeXt: ทำนายด้านรถ
   - Output:
     - predicted side
     - confidence
     - is_car
     - match

5. Image Sorting Service
   - รับผลทำนายด้านรถ
   - จัดรูปเข้าช่องด้านรถที่ถูกต้อง
   - ตัวอย่างช่อง:
     - Front
     - Back
     - Left
     - Right
     - Front-Left
     - Front-Right
     - Back-Left
     - Back-Right

6. Damage Detection Service
   - API: `POST /api/v1/predict_damage`
   - ใช้ YOLO Damage ตรวจรอยเสียหาย
   - Output:
     - damage type
     - confidence
     - bounding box
   - ตัวอย่างรอยเสียหาย:
     - รอยบุบ
     - รอยขีดข่วน
     - รอยแตก
     - ไฟแตก
     - กระจกแตก

7. Mask / Annotation Service
   - นำ bounding box หรือ mask จาก AI ไปวาดบนรูป
   - สร้างรูปผลลัพธ์ที่แสดงตำแหน่งรอยเสียหาย
   - ใส่ label และ confidence แบบสั้น ๆ

8. Result Package
   - รวมข้อมูลสำหรับ Admin
   - ประกอบด้วย:
     - รูปที่จัดเรียงตามด้านรถ
     - รูปที่มี mask / bounding box รอยเสียหาย
     - JSON ผลวิเคราะห์

9. Health & Monitoring
   - API: `GET /api/v1/health`
   - แสดงสถานะ backend
   - แสดง queue depth, latency, total processed, device

## Data Flow หลัก

ให้วาดลูกศรตามลำดับนี้:

Customer Car
→ Messenger takes photos
→ Upload Channel
→ Backend API Gateway
→ Image Quality Service
→ View Prediction Service
→ Image Sorting Service
→ Damage Detection Service
→ Mask / Annotation Service
→ Result Package
→ Admin Review

## Data Flow ย่อยสำหรับ View Prediction

แสดงเป็นเส้นย่อยใน diagram:

Image
→ Backend API `predict_view`
→ Quality Check
→ YOLO General
→ ConvNeXt View Classifier
→ Analyzer
→ Predicted Side + Confidence
→ Image Sorting Service

## Data Flow ย่อยสำหรับ Damage Detection

แสดงเป็นเส้นย่อยใน diagram:

Sorted Image
→ Backend API `predict_damage`
→ Quality Check
→ YOLO Damage Detector
→ Damage Boxes / Mask
→ Masked Image
→ Admin

## API Layer ที่ควรแสดง

วาดกล่อง `Backend API`

ภายในกล่องมี endpoint:

- `POST /api/v1/predict_view`
  - ทำนายด้านรถ

- `POST /api/v1/predict_damage`
  - ตรวจรอยบาดแผล

- `GET /api/v1/health`
  - ตรวจสถานะระบบ

## AI Model Layer ที่ควรแสดง

วาดกล่อง `AI Models`

ภายในกล่องมี:

- `YOLO General`
  - แยกประเภทรูป เช่น exterior, interior, wheel, roof

- `ConvNeXt View Classifier`
  - ทำนายด้านรถ 8 มุม

- `YOLO Damage Detector`
  - ตรวจรอยบาดแผลและส่ง bounding box

## ตัวอย่าง Output ใน Diagram

แสดงกล่อง output สั้น ๆ:

```json
{
  "predicted_side": "Front",
  "confidence": 92.5,
  "is_car": true,
  "match": true,
  "damages": [
    {
      "type": "scratch",
      "confidence": 72.3,
      "box": [150, 200, 400, 350]
    }
  ]
}
```

## รูปแบบภาพที่ต้องการ

- ใช้ diagram แนวนอน 16:9
- วาง actor ภายนอกไว้ซ้ายและขวา
  - ซ้าย: Customer + Messenger
  - กลาง: Company Car Inspection System
  - ขวา: Admin
- ใช้ system boundary เป็นกรอบใหญ่
- ใช้ลูกศรแสดง data flow ชัดเจน
- ใช้กล่อง component เรียงเป็น layer:
  - Upload Layer
  - API Layer
  - Processing Layer
  - AI Model Layer
  - Result Layer
  - Admin Review
- ใช้ไอคอนเรียบง่าย:
  - บ้าน + รถ = Customer Car
  - คนถือมือถือ = Messenger
  - server = Backend API
  - shield/check = Quality Check
  - AI chip = AI Models
  - grid = Image Sorting
  - highlighted car damage = Masked Image
  - desktop user = Admin
- สีที่แนะนำ:
  - External actors: สีฟ้า
  - Backend/API: สีเทาเข้ม
  - Processing: สีน้ำเงิน
  - AI Models: สีเขียว
  - Damage/Mask: สีส้มแดง
  - Admin/Result: สีม่วง
- ข้อความในกล่องต้องสั้น อ่านง่าย
- ไม่ต้องแสดง code หรือ file path มากเกินไป
- ให้ภาพเหมาะสำหรับอธิบาย architecture กับทีมบริษัท

## คำบรรยายใต้ภาพ

Messenger เป็นเจ้าหน้าที่ภาคสนามที่บริษัทส่งไปถ่ายรูปรถที่บ้านลูกค้า จากนั้นรูปถูกส่งเข้า Company Car Inspection System ผ่าน Backend API ระบบตรวจคุณภาพรูป ทำนายด้านรถ จัดเรียงรูป ตรวจรอยบาดแผล และสร้างรูปที่มี mask หรือ bounding box ก่อนส่ง Result Package ให้ Admin ตรวจสอบและยืนยันผล
