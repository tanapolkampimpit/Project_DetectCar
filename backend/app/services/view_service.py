from typing import TYPE_CHECKING

from app.core.labels import INSURANCE_ANGLE_MAP

if TYPE_CHECKING:
    from app.core.engine import BatchItem


def validate_expected_view(expected_view: str):
    if expected_view not in INSURANCE_ANGLE_MAP:
        raise ValueError({
            "error": "invalid_expected_view",
            "message": "Invalid expected_view.",
            "valid_values": list(INSURANCE_ANGLE_MAP.keys()),
        })


def prepare_single_item(request_id: str, expected_view: str, img, tensor, blur_score: float, loop):
    from app.core.engine import BatchItem

    return BatchItem(
        request_id=request_id,
        expected_view=expected_view,
        img=img,
        tensor=tensor,
        future=loop.create_future(),
        blur_score=blur_score,
    )
