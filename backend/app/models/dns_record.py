from dataclasses import dataclass

@dataclass(frozen=True, slots=True)
class DNSRecord:
    """A DNS record for domain verification."""

    type: str
    name: str
    value: str