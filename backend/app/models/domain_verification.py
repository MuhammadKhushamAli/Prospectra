from datetime import datetime
from typing import Any
from dataclasses import dataclass

@dataclass(frozen=True, slots=True)
class DomainVerification:
    """A persisted domain verification row.

    The database schema uses ``org_id`` as the primary key, so there is no
    separate ``id`` field to expose here.
    """
    org_id: str
    domain: str
    dns_records: dict[str, Any]
    verification_status: str
    verified_at: datetime | None
    created_at: datetime | None