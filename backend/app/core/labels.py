# =============================================================================
# Label & Class Definitions
# =============================================================================
# ไฟล์นี้เก็บค่าคงที่ทั้งหมดที่เกี่ยวกับ class labels, mappings, และ metadata
# หากต้องการเพิ่ม/แก้ไข class ใหม่ (เช่น เพิ่มประเภทความเสียหาย, เพิ่ม YOLO class)
# ให้แก้ไขที่ไฟล์นี้ไฟล์เดียว โดยไม่ต้องแก้ไข logic ใน analyzer.py หรือ engine.py
# =============================================================================

# --- Exterior angle labels (ConvNeXt 8-class output) ---
EXTERIOR_LABELS = [
    "Front", "Front-Left", "Left", "Back-Left",
    "Back",  "Back-Right", "Right", "Front-Right",
]

# --- YOLO classification/detection class names ---
YOLO_CLASSES = [
    "chassis_number",
    "dashcam",
    "engine_room",
    "exterior",
    "inspection_document",
    "interior",
    "mileage_screen",
    "others",
    "roof",
    "spare_tire",
    "wheel"
]

# --- Frontend key names (ชื่อที่ frontend ใช้แสดงผล) ---
FRONTEND_KEYS = [
    "Interior",
    "SpareTire",
    "ChassisNumber",
    "Accessories",
    "Dashcam",
    "Odometer",
    "TaxSticker",
    "RegistrationDoc",
    "EngineCompartment",
    "TireFrontLeft",
    "TireFrontRight",
    "TireBackLeft",
    "TireBackRight",
    "Others"
]

# --- รายชื่อ label ทั้งหมดที่ระบบรองรับ ---
LABELS = EXTERIOR_LABELS + FRONTEND_KEYS + YOLO_CLASSES

# --- Mapping: expected_view → YOLO class ที่ยอมรับ ---
# ใช้ตรวจสอบว่า YOLO ทำนายได้ตรงกับมุมที่ user ต้องการหรือไม่
INSURANCE_ANGLE_MAP = {
    "Front":       ["Front"],
    "Front-Left":  ["Front-Left"],
    "Left":        ["Left"],
    "Back-Left":   ["Back-Left"],
    "Back":        ["Back"],
    "Back-Right":  ["Back-Right"],
    "Right":       ["Right"],
    "Front-Right": ["Front-Right"],
    "Roof":        ["Roof", "roof"],

    "Interior":          ["interior"],
    "SpareTire":         ["spare_tire"],
    "ChassisNumber":     ["chassis_number"],
    "Accessories":       ["others"],
    "Dashcam":           ["dashcam"],
    "Odometer":          ["mileage_screen"],
    "TaxSticker":        ["inspection_document"],
    "RegistrationDoc":   ["inspection_document"],
    "EngineCompartment": ["engine_room"],
    "TireFrontLeft":     ["wheel"],
    "TireFrontRight":    ["wheel"],
    "TireBackLeft":      ["wheel"],
    "TireBackRight":     ["wheel"],
    "Others":            ["others"]
}

# --- Swap map: แก้ปัญหากล้องกลับซ้าย-ขวา (mirror) ---
SWAP_MAP = {
    "Front-Left":  "Front-Right",
    "Front-Right": "Front-Left",
    "Left":        "Right",
    "Right":       "Left",
    "Back-Left":   "Back-Right",
    "Back-Right":  "Back-Left",
}

# --- Class metadata: group, ชื่อไทย, ชื่ออังกฤษ ---
CLASS_GROUPS = {
    "chassis_number":     {"group": "Document", "th_name": "เลขตัวถัง", "en_name": "Chassis Number"},
    "dashcam":            {"group": "Accessories", "th_name": "กล้องหน้ารถ", "en_name": "Dashcam"},
    "engine_room":        {"group": "Engine Compartment", "th_name": "ห้องเครื่อง", "en_name": "Engine Room"},
    "inspection_document":{"group": "Document", "th_name": "เอกสารตรวจสภาพรถ", "en_name": "Inspection Document"},
    "interior":           {"group": "Interior", "th_name": "ภายในห้องโดยสาร", "en_name": "Interior"},
    "mileage_screen":     {"group": "Interior", "th_name": "หน้าจอกิโลเมตร", "en_name": "Mileage Screen"},
    "others":             {"group": "Other", "th_name": "อื่นๆ", "en_name": "Others"},
    "roof":               {"group": "Exterior", "th_name": "หลังคา", "en_name": "Roof"},
    "spare_tire":         {"group": "Exterior", "th_name": "ยางอะไหล่", "en_name": "Spare Tire"},
    "wheel":              {"group": "Exterior", "th_name": "ล้อรถ", "en_name": "Wheel"},
    "exterior":           {"group": "Exterior", "th_name": "ภายนอก", "en_name": "Exterior"},
    "Front":              {"group": "Exterior", "th_name": "ด้านหน้า", "en_name": "Front"},
    "Front-Left":         {"group": "Exterior", "th_name": "ด้านหน้าซ้าย", "en_name": "Front-Left"},
    "Left":               {"group": "Exterior", "th_name": "ด้านซ้าย", "en_name": "Left"},
    "Back-Left":          {"group": "Exterior", "th_name": "ด้านหลังซ้าย", "en_name": "Back-Left"},
    "Back":               {"group": "Exterior", "th_name": "ด้านหลัง", "en_name": "Back"},
    "Back-Right":         {"group": "Exterior", "th_name": "ด้านหลังขวา", "en_name": "Back-Right"},
    "Right":              {"group": "Exterior", "th_name": "ด้านขวา", "en_name": "Right"},
    "Front-Right":        {"group": "Exterior", "th_name": "ด้านหน้าขวา", "en_name": "Front-Right"},
}

# --- YOLO model ภาษาไทย → ชื่อ class ภาษาอังกฤษ ---
THAI_TO_EN_CLASS_MAP = {
    "exterior": "exterior",
    "กรณีมีอุปกรณ์ตกแต่ง": "others",
    "กล้องติดหน้ารถ": "dashcam",
    "จอเลขไมล์": "mileage_screen",
    "ภายในอุปกรณ์ตกแต่ง": "interior",
    "ยางอะไหล่": "spare_tire",
    "ล้อที่ให้เห็นยี่ห้อและขนาดยาง": "wheel",
    "หลังคารถยนต์": "roof",
    "ห้องเครื่องยนต์": "engine_room",
    "อื่นๆ(MTPhoto)": "others",
    "เลขตัวถังรถยนต์": "chassis_number",
    "ใบถ่ายรูปตรวจสภาพ": "inspection_document"
}

# --- YOLO class → Frontend key mapping ---
# ใช้แปลงชื่อ class จาก YOLO ให้เป็นชื่อที่ frontend เข้าใจ
YOLO_TO_FRONTEND_MAP = {
    "chassis_number":      "ChassisNumber",
    "dashcam":             "Dashcam",
    "engine_room":         "EngineCompartment",
    "inspection_document": "RegistrationDoc",
    "interior":            "Interior",
    "mileage_screen":      "Odometer",
    "roof":                "Roof",
    "spare_tire":          "SpareTire",
    "others":              "Others",
    # "wheel" ไม่อยู่ใน map นี้เพราะต้องใช้ expected_view เพื่อแยกตำแหน่งล้อ
    # ดู map_yolo_to_frontend() ใน analyzer.py
}

# --- Tire position keys (ใช้ตรวจสอบตำแหน่งล้อ) ---
TIRE_POSITION_KEYS = ["TireFrontLeft", "TireFrontRight", "TireBackLeft", "TireBackRight"]

# --- Damage label mapping: YOLO damage class → ชื่อไทย ---
DAMAGE_LABEL_MAP = {
    "dent": "รอยบุบ",
    "scratch": "รอยขีดข่วน",
    "crack": "รอยร้าว",
    "glass_shatter": "กระจกแตก",
    "broken_glass": "กระจกแตก",
    "broken_light": "ไฟแตก",
    "missing_part": "ชิ้นส่วนหลุดหาย",
    "broken": "แตกหัก",
    "puncture": "รอยทะลุ",
    "tear": "รอยฉีกขาด"
}


# =============================================================================
# Helper functions ที่ขึ้นอยู่กับ label data เท่านั้น (ไม่มี business logic)
# =============================================================================

def normalize_class_name(name: str) -> str:
    """Normalize class name to lowercase for comparison."""
    return name.lower()


def map_yolo_to_frontend(cls_name: str, expected_view: str = "") -> str:
    """
    แปลงชื่อ YOLO class เป็นชื่อ frontend key
    
    Args:
        cls_name: ชื่อ class จาก YOLO model
        expected_view: มุมที่ user ต้องการ (ใช้สำหรับ wheel เพื่อแยกตำแหน่งล้อ)
    
    Returns:
        ชื่อ frontend key ที่ตรงกัน
    """
    cls_lower = cls_name.lower()
    
    # ตรวจสอบจาก map ก่อน
    if cls_lower in YOLO_TO_FRONTEND_MAP:
        return YOLO_TO_FRONTEND_MAP[cls_lower]
    
    # กรณี wheel: ใช้ expected_view เพื่อแยกตำแหน่งล้อ
    if cls_lower == "wheel":
        if expected_view in TIRE_POSITION_KEYS:
            return expected_view
        return "TireFrontLeft"  # Default fallback
    
    return cls_name


# --- Auto-populate INSURANCE_ANGLE_MAP for YOLO classes ---
# เพิ่ม YOLO class เข้าไปใน map โดยอัตโนมัติ (ถ้ายังไม่มี)
for _cls in YOLO_CLASSES:
    if _cls not in INSURANCE_ANGLE_MAP:
        INSURANCE_ANGLE_MAP[_cls] = [_cls]
    _norm = normalize_class_name(_cls)
    if _norm not in INSURANCE_ANGLE_MAP:
        INSURANCE_ANGLE_MAP[_norm] = [_cls]
