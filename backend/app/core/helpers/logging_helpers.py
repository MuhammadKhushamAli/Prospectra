"""Helper classes and ANSI formatting functions for Prospectra colored logging."""

from __future__ import annotations

import logging
import sys
import traceback
from typing import Any, Dict, Optional

from app.utils.constants.logging_constants import (
    BANNER_LINE,
    BOLD_CYAN,
    BOLD_GREEN,
    BOLD_RED,
    BOLD_YELLOW,
    CYAN,
    DIM,
    GREEN,
    NODE_COLORS,
    RED,
    RESET,
    YELLOW,
)


def color_text(text: Any, color_code: str) -> str:
    """Wrap text in an ANSI color code and reset."""
    return f"{color_code}{text}{RESET}"


def red(text: Any, bold: bool = True) -> str:
    """Format text in red (for errors, exceptions, and rejections)."""
    return color_text(text, BOLD_RED if bold else RED)


def green(text: Any, bold: bool = True) -> str:
    """Format text in green (for successes, acceptances, passes)."""
    return color_text(text, BOLD_GREEN if bold else GREEN)


def yellow(text: Any, bold: bool = True) -> str:
    """Format text in yellow (for warnings, cautions)."""
    return color_text(text, BOLD_YELLOW if bold else YELLOW)


class NodeLogger:
    """Logger that prints formatted output using the node's assigned distinct color."""

    def __init__(self, node_name: str, phase_name: str = "", color: Optional[str] = None):
        self.node_name = node_name
        self.phase_name = phase_name
        self.color = color or NODE_COLORS.get(node_name, BOLD_CYAN)

    def banner(self, title: str) -> None:
        """Print a prominent phase banner in the node's color."""
        print(f"\n{self.color}{BANNER_LINE}{RESET}")
        print(f"{self.color}{title}{RESET}")
        print(f"{self.color}{BANNER_LINE}{RESET}")

    def header(self, msg: str) -> None:
        """Print a phase header or summary header in the node's color."""
        print(f"{self.color}{msg}{RESET}")

    def info(self, msg: str) -> None:
        """Print informational text in the node's color."""
        print(f"{self.color}{msg}{RESET}")

    def item(self, msg: str) -> None:
        """Print an indented item or detail."""
        print(f"{self.color}  {msg}{RESET}")

    def success(self, msg: str) -> None:
        """Print a success confirmation in bold green."""
        print(f"{BOLD_GREEN}{msg}{RESET}")

    def warning(self, msg: str) -> None:
        """Print a warning in bold yellow."""
        print(f"{BOLD_YELLOW}{msg}{RESET}")

    def error(self, msg: str, exc: Optional[BaseException] = None) -> None:
        """Print an error message in bold red."""
        print(f"{BOLD_RED}{msg}{RESET}")
        if exc is not None:
            tb_lines = traceback.format_exception(type(exc), exc, exc.__traceback__)
            print(f"{BOLD_RED}{''.join(tb_lines)}{RESET}")

    def exception(self, msg: str, exc: Optional[BaseException] = None) -> None:
        """Print an exception header and full traceback in bold red."""
        print(f"{BOLD_RED}[EXCEPTION] {msg}{RESET}")
        if exc is not None:
            tb_lines = traceback.format_exception(type(exc), exc, exc.__traceback__)
            print(f"{BOLD_RED}{''.join(tb_lines)}{RESET}")
        elif sys.exc_info()[0] is not None:
            tb_lines = traceback.format_exc()
            print(f"{BOLD_RED}{tb_lines}{RESET}")


class ColoredLoggingFormatter(logging.Formatter):
    """Standard library logging.Formatter that colors log level tags and formats exceptions in red."""

    LEVEL_MAP: Dict[int, str] = {
        logging.DEBUG: f"{DIM}[DEBUG]{RESET}",
        logging.INFO: f"{CYAN}[INFO]{RESET}",
        logging.WARNING: f"{BOLD_YELLOW}[WARNING]{RESET}",
        logging.ERROR: f"{BOLD_RED}[ERROR]{RESET}",
        logging.CRITICAL: f"{BOLD_RED}[CRITICAL]{RESET}",
    }

    def format(self, record: logging.LogRecord) -> str:
        level_tag = self.LEVEL_MAP.get(record.levelno, f"[{record.levelname}]")
        timestamp = self.formatTime(record, self.datefmt or "%Y-%m-%d %H:%M:%S")
        name_color = NODE_COLORS.get(record.name, DIM)
        colored_name = f"{name_color}{record.name}{RESET}"

        if record.levelno >= logging.ERROR:
            msg_str = f"{BOLD_RED}{record.getMessage()}{RESET}"
        elif record.levelno == logging.WARNING:
            msg_str = f"{YELLOW}{record.getMessage()}{RESET}"
        else:
            msg_str = record.getMessage()

        base = f"{timestamp} {level_tag} {colored_name}: {msg_str}"

        if record.exc_info and not record.exc_text:
            record.exc_text = self.formatException(record.exc_info)
        if record.exc_text:
            base = f"{base}\n{BOLD_RED}{record.exc_text}{RESET}"
        if record.stack_info:
            base = f"{base}\n{BOLD_RED}{self.formatStack(record.stack_info)}{RESET}"

        return base

    def formatException(self, ei: Any) -> str:
        tb_lines = super().formatException(ei)
        return f"{BOLD_RED}{tb_lines}{RESET}"


class RequestLogFilter(logging.Filter):
    """Filter that suppresses verbose HTTP request logs, connection logs, and access logs."""

    SILENCED_LOGGERS = (
        "httpx",
        "httpcore",
        "uvicorn.access",
        "urllib3",
        "requests",
    )

    def filter(self, record: logging.LogRecord) -> bool:
        if record.levelno >= logging.WARNING:
            return True
        name = record.name or ""
        for silenced in self.SILENCED_LOGGERS:
            if name == silenced or name.startswith(f"{silenced}."):
                return False
        msg = record.getMessage()
        if "HTTP Request:" in msg or 'HTTP/1.1"' in msg or 'HTTP/2"' in msg:
            return False
        return True


__all__ = [
    "ColoredLoggingFormatter",
    "NodeLogger",
    "RequestLogFilter",
    "color_text",
    "green",
    "red",
    "yellow",
]

