"""LangGraph definition for the Email Writer workflow."""

from typing import Any, Dict, List, Optional

from langgraph.graph import END, START, StateGraph

from app.langgraph.email_writer.helpers.router_helpers import route_after_existing_email
from app.langgraph.email_writer.state.state import EmailGraphState
from app.langgraph.email_writer.tools.check_email_logic import check_email_logic
from app.langgraph.email_writer.tools.email_review_tool import email_review_node
from app.langgraph.email_writer.tools.email_writer_tool import email_writer_node
from app.langgraph.email_writer.tools.get_company_tool import get_company_node
from app.langgraph.email_writer.tools.get_existing_email_tool import (
    get_existing_email_node,
    is_email_already_generated,
    is_email_sent,
)
from app.langgraph.email_writer.tools.store_email import store_email_node
from app.langgraph.tools.load_user_context import load_user_context_node

workflow = StateGraph(EmailGraphState)

workflow.add_node("load_user_context", load_user_context_node)
workflow.add_node("get_company", get_company_node)
workflow.add_node("get_existing_email", get_existing_email_node)
workflow.add_node("email_writer", email_writer_node)
workflow.add_node("email_review", email_review_node)
workflow.add_node("store_email", store_email_node)

workflow.add_edge(START, "load_user_context")
workflow.add_edge("load_user_context", "get_company")
workflow.add_edge("get_company", "get_existing_email")
workflow.add_conditional_edges(
    "get_existing_email",
    route_after_existing_email,
    {
        "email_writer": "email_writer",
        END: END,
    },
)
workflow.add_edge("email_writer", "email_review")

workflow.add_conditional_edges(
    "email_review",
    check_email_logic,
)
workflow.add_edge("store_email", END)

email_writer_graph = workflow.compile()


async def run_email_writer_workflow(
    user_id: str,
    org_id: str,
    target_company_id: str,
    recipient_emails: Optional[List[str]] = None,
    org_domain: Optional[str] = None,
    user_feedback: Optional[str] = None,
) -> Dict[str, Any]:
    """Execute the full Email Writer pipeline async with optional selected recipients and user feedback."""
    initial_state = {
        "user_id": user_id,
        "org_id": org_id,
        "target_company_id": target_company_id,
        "recipient_emails": recipient_emails or [],
        "org_domain": org_domain,
        "user_feedback": user_feedback,
        "errors": [],
    }

    result = await email_writer_graph.ainvoke(initial_state)
    return result


__all__ = [
    "route_after_existing_email",
    "is_email_already_generated",
    "is_email_sent",
    "email_writer_graph",
    "run_email_writer_workflow",
]
