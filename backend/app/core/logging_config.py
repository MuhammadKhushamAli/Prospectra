"""Prospecta colored logging configuration.

Provides ANSI/colorama-backed distinct colors for every LangGraph node in the discovery
pipeline, colored router messages, red styling for all exceptions, errors, and tracebacks,
and a ColoredFormatter for the standard Python logging library.
"""

from __future__ import annotations

import logging
import sys
import traceback
from typing import Any, Dict, Optional

try:
    import colorama

    colorama.init(autoreset=True)
except ImportError:
    pass

# Standard ANSI escape codes (supported on modern Windows terminal, PowerShell, Linux, macOS)
RESET = "\033[0m"
BOLD = "\033[1m"
DIM = "\033[2m"

# Standard / Bright Foreground Colors
BLACK = "\033[30m"
RED = "\033[91m"
BOLD_RED = "\033[1;91m"
GREEN = "\033[92m"
BOLD_GREEN = "\033[1;92m"
YELLOW = "\033[93m"
BOLD_YELLOW = "\033[1;93m"
BLUE = "\033[94m"
BOLD_BLUE = "\033[1;94m"
MAGENTA = "\033[95m"
BOLD_MAGENTA = "\033[1;95m"
CYAN = "\033[96m"
BOLD_CYAN = "\033[1;96m"
WHITE = "\033[97m"
BOLD_WHITE = "\033[1;97m"

# 256-color extended ANSI codes for unique visual differentiation
ORANGE = "\033[38;5;208m"
BOLD_ORANGE = "\033[1;38;5;208m"
PURPLE = "\033[38;5;135m"
BOLD_PURPLE = "\033[1;38;5;135m"
TEAL = "\033[38;5;37m"
BOLD_TEAL = "\033[1;38;5;37m"
EMERALD = "\033[38;5;42m"
BOLD_EMERALD = "\033[1;38;5;42m"

# Distinct color assignments for each LangGraph node & system component
NODE_COLORS: Dict[str, str] = {
    # Node 0: Load User Context
    "load_user_context": BOLD_CYAN,
    "user_context": BOLD_CYAN,
    # Node 1: Prompt Generation
    "prompt_gen": BOLD_MAGENTA,
    "param_gen": BOLD_MAGENTA,
    # Node 2: Company Search
    "company_search": BOLD_BLUE,
    "searxng": BOLD_BLUE,
    # Node 3: Scrape Companies
    "scrape_companies": BOLD_YELLOW,
    "web_scraper": BOLD_YELLOW,
    # Node 4: Prefilter Companies
    "prefilter_companies": BOLD_TEAL,
    "prefilter": BOLD_TEAL,
    # Node 5: Email Verification
    "verify_emails": BOLD_GREEN,
    "reacher": BOLD_GREEN,
    # Node 6: Company Auth LLM
    "company_auth": BOLD_PURPLE,
    "auth_llm": BOLD_PURPLE,
    # Node 7: Filter & Buyer Fit
    "filter_companies": BOLD_ORANGE,
    "buyer_fit": BOLD_ORANGE,
    # Node 8: Store to DB
    "store_to_db": BOLD_EMERALD,
    "db": BOLD_EMERALD,
    # Graph Router
    "router": BOLD_BLUE,
    # ARQ Worker & Tasks
    "arq_worker": BOLD_CYAN,
    "worker": BOLD_CYAN,
    # Email Writer Nodes
    "email_writer": BOLD_MAGENTA,
    "email_review": BOLD_YELLOW,
}


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
    """Logger that prints formatted output using the node's assigned distinct color,

    while ensuring exceptions and errors are always rendered in bright red.
    """

    def __init__(self, node_name: str, phase_name: str = "", color: Optional[str] = None):
        self.node_name = node_name
        self.phase_name = phase_name
        self.color = color or NODE_COLORS.get(node_name, BOLD_CYAN)

    def banner(self, title: str) -> None:
        """Print a prominent phase banner in the node's color."""
        line = "========================================================"
        print(f"\n{self.color}{line}{RESET}")
        print(f"{self.color}{title}{RESET}")
        print(f"{self.color}{line}{RESET}")

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


_node_loggers: Dict[str, NodeLogger] = {}


def get_node_logger(node_name: str, phase_name: str = "") -> NodeLogger:
    """Retrieve or create a cached NodeLogger for the given node."""
    key = f"{node_name}:{phase_name}"
    if key not in _node_loggers:
        _node_loggers[key] = NodeLogger(node_name, phase_name)
    return _node_loggers[key]


class ColoredLoggingFormatter(logging.Formatter):
    """Standard library logging.Formatter that colors log level tags and formats

    all exceptions and tracebacks in bright red.
    """

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

        # Color the logger name according to node mapping if known
        name_color = NODE_COLORS.get(record.name, DIM)
        colored_name = f"{name_color}{record.name}{RESET}"

        # If it's an ERROR or CRITICAL log, format the message in red
        if record.levelno >= logging.ERROR:
            msg_str = f"{BOLD_RED}{record.getMessage()}{RESET}"
        elif record.levelno == logging.WARNING:
            msg_str = f"{YELLOW}{record.getMessage()}{RESET}"
        else:
            msg_str = record.getMessage()

        base = f"{timestamp} {level_tag} {colored_name}: {msg_str}"

        if record.exc_info:
            if not record.exc_text:
                record.exc_text = self.formatException(record.exc_info)
        if record.exc_text:
            base = f"{base}\n{BOLD_RED}{record.exc_text}{RESET}"
        if record.stack_info:
            base = f"{base}\n{BOLD_RED}{self.formatStack(record.stack_info)}{RESET}"

        return base

    def formatException(self, ei: Any) -> str:
        tb_lines = super().formatException(ei)
        return f"{BOLD_RED}{tb_lines}{RESET}"


def setup_colored_logging(default_level: int = logging.INFO) -> None:
    """Configure Python's root logger and standard exception hook to render

    distinct node colors and bright red exceptions across the application.
    """
    root = logging.getLogger()
    root.setLevel(default_level)

    # Avoid adding duplicate handlers if already configured
    has_colored_handler = any(
        isinstance(getattr(h, "formatter", None), ColoredLoggingFormatter)
        for h in root.handlers
    )
    if not has_colored_handler:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(ColoredLoggingFormatter())
        # Replace existing handlers on root
        root.handlers = [handler]

    # Intercept unhandled exceptions so they are printed in bold red
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

