import unittest
from types import SimpleNamespace

from app.services.analyzer import build_result


class FakeProbs:
    def __init__(self, data):
        self.data = data


class FakeYoloOut:
    names = {0: "interior", 1: "others"}
    boxes = None

    def __init__(self, probs):
        self.probs = FakeProbs(probs)


class FakeSettings:
    DAMAGE_CONFIDENCE_THRESHOLD = 0.15
    DAMAGE_NMS_IOU_THRESHOLD = 0.85
    MIN_CAR_AREA_RATIO = 0.08
    MATCH_THRESHOLD = 60.0
    BLUR_THRESHOLD = 50.0


class AnalyzerTests(unittest.TestCase):
    def test_builds_matching_yolo_class_result(self):
        item = SimpleNamespace(expected_view="Interior", blur_score=120.0)
        result = build_result(
            item=item,
            probs=[0.0] * 8,
            yolo_gen_out=FakeYoloOut([0.92, 0.08]),
            yolo_damage_out=None,
            total_ms=12.5,
            settings=FakeSettings,
        )

        self.assertEqual(result["prediction"], {"label": "Interior", "confidence": 92.0})
        self.assertTrue(result["is_car"])
        self.assertTrue(result["match"])
        self.assertEqual(result["damages"], [])
        self.assertEqual(result["time_ms"], 12.5)

    def test_non_car_result_clears_damages_and_prediction_label(self):
        item = SimpleNamespace(expected_view="Interior", blur_score=120.0)
        result = build_result(
            item=item,
            probs=[0.0] * 8,
            yolo_gen_out=None,
            yolo_damage_out=None,
            total_ms=10.0,
            settings=FakeSettings,
        )

        self.assertEqual(result["prediction"]["label"], "Unknown")
        self.assertFalse(result["is_car"])
        self.assertFalse(result["match"])
        self.assertEqual(result["damages"], [])


if __name__ == "__main__":
    unittest.main()
