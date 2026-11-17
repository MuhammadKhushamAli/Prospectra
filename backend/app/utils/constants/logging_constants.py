"""ANSI color codes and node color mappings for colored logging."""

from typing import Dict

# Standard ANSI escape codes
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

BANNER_LINE = "========================================================"

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
    # Domain & Email Verification
    "domain_verification": BOLD_CYAN,
    "email_verification": BOLD_GREEN,
    "app.domain.verification.service": BOLD_CYAN,
    "app.domain.verification.email_verifier": BOLD_GREEN,
    "app.domain.verification.dns": BOLD_CYAN,
    "app.api.routes.domain": BOLD_CYAN,
}
