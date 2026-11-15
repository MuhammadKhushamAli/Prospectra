"""Shared dataclass serialization and dictionary-compatibility helpers."""

from __future__ import annotations

from dataclasses import asdict, dataclass, fields, is_dataclass
import json
from typing import Any, Iterator


@dataclass(slots=True)
class DictCompatibleDataclass:
    """Base mixin for dataclasses that also support dictionary-style access and serialization."""

    def to_dict(self, exclude_none: bool = False) -> dict[str, Any]:
        """Convert this dataclass instance (and nested dataclasses) into a standard dictionary."""
        raw = asdict(self)
        if exclude_none:
            return {k: v for k, v in raw.items() if v is not None}
        return raw

    def get(self, key: str, default: Any = None) -> Any:
        """Return attribute value for `key` if present, otherwise `default`."""
        return getattr(self, key, default)

    def __getitem__(self, key: str) -> Any:
        """Allow `instance[key]` dictionary-style subscripting."""
        if hasattr(self, key):
            return getattr(self, key)
        raise KeyError(key)

    def __contains__(self, key: object) -> bool:
        """Return True if `key` is a defined field on this dataclass."""
        if not isinstance(key, str):
            return False
        return any(f.name == key for f in fields(self))

    def keys(self) -> list[str]:
        """Return field names of the dataclass."""
        return [f.name for f in fields(self)]

    def values(self) -> list[Any]:
        """Return field values of the dataclass."""
        return [getattr(self, f.name) for f in fields(self)]

    def items(self) -> list[tuple[str, Any]]:
        """Return (field_name, value) pairs for `dict(instance)` conversion."""
        return [(f.name, getattr(self, f.name)) for f in fields(self)]

    def __iter__(self) -> Iterator[str]:
        """Iterate over field names like a mapping."""
        for f in fields(self):
            yield f.name


def dataclass_to_json(instance: Any, indent: int = 2, exclude_none: bool = False) -> str:
    """Serialize a dataclass or mapping into a formatted JSON string."""
    if isinstance(instance, DictCompatibleDataclass):
        payload = instance.to_dict(exclude_none=exclude_none)
    elif is_dataclass(instance) and not isinstance(instance, type):
        payload = asdict(instance)
        if exclude_none:
            payload = {k: v for k, v in payload.items() if v is not None}
    else:
        payload = instance
    return json.dumps(payload, indent=indent, default=str)
