"""Shared UUID validation helpers used across multiple backend modules."""

import uuid
from typing import Any


def is_valid_uuid(val: Any) -> bool:
    """Validate whether a value is a non-empty, valid UUID string or UUID object."""
    if not val or not isinstance(val, (str, uuid.UUID)):
        return False
    try:
        uuid.UUID(str(val))
        return True
    except (ValueError, TypeError, AttributeError):
        return False
