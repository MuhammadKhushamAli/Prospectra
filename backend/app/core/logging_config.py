"""Prospectra colored logging configuration."""

from __future__ import annotations

import logging
import sys
import traceback
from typing import Any, Dict

try:
    import colorama

    colorama.init(autoreset=True)
except ImportError:
    pass

from app.core.helpers.logging_helpers import (
    ColoredLoggingFormatter,
    NodeLogger,
    color_text,
    green,
    red,
    yellow,
)
from app.utils.constants.logging_constants import (
    BLACK,
    BLUE,
    BOLD,
    BOLD_BLUE,
    BOLD_CYAN,
    BOLD_EMERALD,
    BOLD_GREEN,
    BOLD_MAGENTA,
    BOLD_ORANGE,
    BOLD_PURPLE,
    BOLD_RED,
    BOLD_TEAL,
    BOLD_WHITE,
    BOLD_YELLOW,
    CYAN,
    DIM,
    EMERALD,
    GREEN,
    MAGENTA,
    NODE_COLORS,
    ORANGE,
    PURPLE,
    RED,
    RESET,
    TEAL,
    WHITE,
    YELLOW,
)

_node_loggers: Dict[str, NodeLogger] = {}


def get_node_logger(node_name: str, phase_name: str = "") -> NodeLogger:
    """Retrieve or create a cached NodeLogger for the given node."""
    key = f"{node_name}:{phase_name}"
    if key not in _node_loggers:
        _node_loggers[key] = NodeLogger(node_name, phase_name)
    return _node_loggers[key]


def setup_colored_logging(default_level: int = logging.INFO) -> None:
    """Configure Python's root logger and standard exception hook with colored formatting."""
    root = logging.getLogger()
    root.setLevel(default_level)

    has_colored_handler = any(
        isinstance(getattr(h, "formatter", None), ColoredLoggingFormatter)
        for h in root.handlers
    )
    if not has_colored_handler:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(ColoredLoggingFormatter())
        root.handlers = [handler]

    def _colored_excepthook(
        exc_type: type[BaseException],
        exc_value: BaseException,
        exc_traceback: Any,
    ) -> None:
        tb_str = "".join(
            traceback.format_exception(exc_type, exc_value, exc_traceback)
        )
        sys.stderr.write(f"\n{BOLD_RED}{tb_str}{RESET}\n")

    sys.excepthook = _colored_excepthook


__all__ = [
    "BLACK",
    "BLUE",
    "BOLD",
    "BOLD_BLUE",
    "BOLD_CYAN",
    "BOLD_EMERALD",
    "BOLD_GREEN",
    "BOLD_MAGENTA",
    "BOLD_ORANGE",
    "BOLD_PURPLE",
    "BOLD_RED",
    "BOLD_TEAL",
    "BOLD_WHITE",
    "BOLD_YELLOW",
    "CYAN",
    "ColoredLoggingFormatter",
    "DIM",
    "EMERALD",
    "GREEN",
    "MAGENTA",
    "NODE_COLORS",
    "NodeLogger",
    "ORANGE",
    "PURPLE",
    "RED",
    "RESET",
    "TEAL",
    "WHITE",
    "YELLOW",
    "color_text",
    "get_node_logger",
    "green",
    "red",
    "setup_colored_logging",
    "yellow",
]
