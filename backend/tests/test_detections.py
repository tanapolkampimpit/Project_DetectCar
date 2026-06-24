import unittest

from app.services.detections import (
    extract_damage_detections,
    extract_yolo_detections,
    filter_hallucinated_interior,
    largest_car_area_ratio,
    suppress_overlapping_damages,
)


class FakeVector(list):
    def tolist(self):
        return list(self)


class FakeProbs:
    def __init__(self, data):
        self.data = data


class FakeBoxes:
    def __init__(self):
        self.cls = [0, 1]
        self.conf = [0.91, 0.42]
        self.xyxy = [
            FakeVector([1.2, 2.4, 10.6, 20.8]),
            FakeVector([0.0, 0.0, 1.0, 1.0]),
        ]
        self.xyxyn = [
            FakeVector([0.1, 0.1, 0.6, 0.5]),
            FakeVector([0.0, 0.0, 0.1, 0.1]),
        ]


class FakeYoloOut:
    names = {0: "exterior", 1: "interior"}

    def __init__(self, boxes=None, probs=None):
        self.boxes = boxes
        self.probs = probs


class FakeMissingPartYoloOut(FakeYoloOut):
    names = {0: "scratch", 1: "missing_part"}


class DetectionTests(unittest.TestCase):
    def test_extracts_yolo_box_detections_sorted_by_confidence(self):
        detections = extract_yolo_detections(FakeYoloOut(boxes=FakeBoxes()))

        self.assertEqual(detections[0], {"label": "exterior", "confidence": 91.0})
        self.assertEqual(detections[1], {"label": "interior", "confidence": 42.0})

    def test_extracts_yolo_probability_detections(self):
        detections = extract_yolo_detections(FakeYoloOut(probs=FakeProbs([0.25, 0.75])))

        self.assertEqual(detections[0], {"label": "interior", "confidence": 75.0})

    def test_extracts_damage_detections_above_threshold(self):
        damages = extract_damage_detections(None, FakeYoloOut(boxes=FakeBoxes()), min_confidence=0.5)

        self.assertEqual(len(damages), 1)
        self.assertEqual(damages[0]["label"], "exterior")
        self.assertEqual(damages[0]["box"], [1.2, 2.4, 10.6, 20.8])

    def test_ignores_missing_part_damage_class(self):
        damages = extract_damage_detections(None, FakeMissingPartYoloOut(boxes=FakeBoxes()), min_confidence=0.1)

        self.assertEqual(damages, [
            {"label": "scratch", "confidence": 91.0, "box": [1.2, 2.4, 10.6, 20.8]}
        ])

    def test_calculates_largest_car_area_ratio(self):
        self.assertAlmostEqual(largest_car_area_ratio(FakeYoloOut(boxes=FakeBoxes())), 0.2)

    def test_filters_hallucinated_interior_for_large_exterior_car(self):
        detections = [
            {"label": "interior", "confidence": 91.0},
            {"label": "exterior", "confidence": 88.0},
        ]

        filtered = filter_hallucinated_interior(detections, 0.25, "Front")

        self.assertEqual(filtered, [{"label": "exterior", "confidence": 88.0}])

    def test_suppresses_overlapping_damage_boxes_by_confidence(self):
        damages = [
            {"label": "scratch", "confidence": 39.17, "box": [439.53, 707.17, 699.58, 820.45]},
            {"label": "dent", "confidence": 62.59, "box": [439.9, 705.21, 698.13, 822.38]},
        ]

        filtered = suppress_overlapping_damages(damages, iou_threshold=0.85)

        self.assertEqual(filtered, [
            {"label": "dent", "confidence": 62.59, "box": [439.9, 705.21, 698.13, 822.38]}
        ])


if __name__ == "__main__":
    unittest.main()
