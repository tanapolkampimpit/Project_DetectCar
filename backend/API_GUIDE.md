# คู่มือการเชื่อมต่อ API: Project_DetectCar

คู่มือนี้ให้รายละเอียดทางเทคนิคสำหรับการเชื่อมต่อ Frontend ภายนอกกับระบบ Backend ของ **Project_DetectCar**

## Base URL
ค่าเริ่มต้น: `http://localhost:8000/api/v1`

---

## 1. วิเคราะห์รูปภาพเดี่ยว (Analyze Single Image)
วิเคราะห์รูปภาพรถหนึ่งรูปเพื่อตรวจหามุมมอง (Orientation) และคุณภาพของภาพ

- **Endpoint:** `POST /analyze`
- **Content-Type:** `multipart/form-data`

### พารามิเตอร์ที่ต้องส่ง (Request Parameters)
| พารามิเตอร์ | ประเภท | จำเป็น | รายละเอียด |
| :--- | :--- | :--- | :--- |
| `file` | Binary | ใช่ | ไฟล์รูปภาพ (JPEG, PNG, ฯลฯ) |
| `expected_view` | String | ใช่ | หนึ่งในชื่อมุมที่กำหนด (ดูรายการด้านล่าง) ค่าเริ่มต้น: `Front` |

### ชื่อมุมที่รองรับ (`expected_view`)
`Front`, `Front-Left`, `Left`, `Back-Left`, `Back`, `Back-Right`, `Right`, `Front-Right`

### ตัวอย่างผลลัพธ์ (Success Response)
```json
{
  "status": "success",
  "prediction": {
    "label": "Front",
    "confidence": 98.5
  },
  "is_car": true,
  "match": true,
  "quality": {
    "is_blurry": false,
    "blur_score": 120.4,
    "is_too_far": false,
    "car_area_ratio": 0.45
  },
  "time_ms": 150.2
}
```

---

## 2. วิเคราะห์แบบกลุ่ม (Analyze Batch / Auto-Swap)
วิเคราะห์รูปภาพหลายรูปพร้อมกัน เหมาะสำหรับหน้าสรุปผลหรือการอัปโหลดแบบกลุ่ม

- **Endpoint:** `POST /analyze_batch`
- **Content-Type:** `multipart/form-data`

### พารามิเตอร์ที่ต้องส่ง (Request Parameters)
| พารามิเตอร์ | ประเภท | จำเป็น | รายละเอียด |
| :--- | :--- | :--- | :--- |
| `files` | Binary[] | ใช่ | ไฟล์รูปภาพหลายไฟล์ |
| `expected_views` | String[] | ใช่ | รายการมุมที่คาดหวังซึ่งตรงกับแต่ละไฟล์ (ส่งเป็น string แยกด้วยคอมม่าหากส่งค่าเดียว) |

### ตัวอย่างผลลัพธ์ (Success Response)
```json
{
  "status": "success",
  "batch_id": "a1b2c3d4",
  "results": [
    {
      "filename": "car1.jpg",
      "original_expected": "Front",
      "predicted_label": "Front",
      "final_assigned_view": "Front",
      "is_car": true,
      "match": true,
      "confidence": 99.1,
      "needs_swap": false,
      "quality": { ... }
    },
    {
      "filename": "car2.jpg",
      "original_expected": "Rear",
      "predicted_label": "Left",
      "final_assigned_view": "Left",
      "is_car": true,
      "match": false,
      "confidence": 95.5,
      "needs_swap": true,
      "quality": { ... }
    }
  ]
}
```

---

## ตัวอย่างการเขียนโค้ด (JavaScript/Fetch)

```javascript
// ตัวอย่างการส่งรูปภาพเดี่ยว
async function uploadImage(file, expectedView) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('expected_view', expectedView);

  try {
    const response = await fetch('http://localhost:8000/api/v1/analyze', {
      method: 'POST',
      body: formData,
    });
    const data = await response.json();
    console.log('ผลลัพธ์:', data);
  } catch (error) {
    console.error('เกิดข้อผิดพลาด:', error);
  }
}
```

## รหัสข้อผิดพลาด (Error Codes)
- `400`: รูปแบบไฟล์ไม่ถูกต้อง หรือระบุ `expected_view` ผิด
- `413`: ขนาดไฟล์ใหญ่เกินไป (จำกัดที่ 10MB)
- `429`: เซิร์ฟเวอร์ทำงานหนักเกินไป (คิวเต็ม)
- `503`: การประมวลผลใช้เวลานานเกินไป (Timeout)
- `500`: ข้อผิดพลาดภายในเซิร์ฟเวอร์
