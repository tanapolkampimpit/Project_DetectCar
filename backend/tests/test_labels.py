import unittest

from app.core.labels import map_yolo_to_frontend
from app.services.view_service import validate_expected_view


class LabelTests(unittest.TestCase):
    def test_maps_known_yolo_class_to_frontend_key(self):
        self.assertEqual(map_yolo_to_frontend("mileage_screen"), "Odometer")

    def test_maps_wheel_to_expected_tire_position(self):
        self.assertEqual(map_yolo_to_frontend("wheel", "TireBackRight"), "TireBackRight")

    def test_rejects_unknown_expected_view(self):
        with self.assertRaises(ValueError) as ctx:
            validate_expected_view("UnknownView")

        detail = ctx.exception.args[0]
        self.assertEqual(detail["error"], "invalid_expected_view")
        self.assertIn("valid_values", detail)


if __name__ == "__main__":
    unittest.main()
