import unittest

from app.services.view_matcher import (
    build_exterior_results,
    decide_exterior_class,
    decide_yolo_class,
    has_yolo_exterior,
)


class ViewMatcherTests(unittest.TestCase):
    def test_exterior_detection_above_threshold_uses_convnext(self):
        detections = [{"label": "exterior", "confidence": 88.0}]
        self.assertTrue(has_yolo_exterior(detections, [0.2] * 8, 60.0))

    def test_others_with_strong_convnext_probability_counts_as_exterior(self):
        detections = [{"label": "others", "confidence": 75.0}]
        self.assertTrue(has_yolo_exterior(detections, [0.45] + [0.05] * 7, 60.0))

    def test_yolo_class_match_returns_expected_frontend_label(self):
        best, is_car, match = decide_yolo_class(
            "Odometer",
            [{"label": "mileage_screen", "confidence": 91.0}],
            60.0,
        )

        self.assertEqual(best, {"label": "Odometer", "confidence": 91.0})
        self.assertTrue(is_car)
        self.assertTrue(match)

    def test_exterior_match_uses_swapped_frontend_labels(self):
        probs = [0.9, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01]
        best, is_car, match = decide_exterior_class(
            "Front",
            probs,
            [{"label": "exterior", "confidence": 90.0}],
            True,
            60.0,
        )

        self.assertEqual(best["label"], "Front")
        self.assertTrue(is_car)
        self.assertTrue(match)

    def test_exterior_results_are_sorted_by_confidence(self):
        results = build_exterior_results([0.1, 0.8, 0.2, 0.0, 0.0, 0.0, 0.0, 0.0])
        self.assertEqual(results[0]["label"], "Front-Right")
        self.assertEqual(results[0]["confidence"], 80.0)


if __name__ == "__main__":
    unittest.main()
