"""Data models and Pydantic schemas for SMTP dispatch and IMAP reply detection."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel, EmailStr, Field


@dataclass(frozen=True, slots=True)
class EmailCredentials:
    """Verified SMTP and IMAP credentials associated with an organization."""

    org_id: str
    sender_email: str
    smtp_server: str
    smtp_port: int
    smtp_used: str  # "STARTTLS" | "SSL/TLS" | "PLAIN"
    smtp_username: str
    smtp_password: str
    imap_server: str
    imap_port: int = 993
    esp_provider: str = "google_workspace"
    sender_name: Optional[str] = None


@dataclass(slots=True)
class DetectedReply:
    """Metadata describing a reply detected in the user's mailbox via IMAP."""

    email_id: str
    org_id: str
    company_id: str
    company_name: str
    sender: str
    subject: str
    snippet: str
    date: datetime
    message_id: str | None = None


class SendEmailApiRequest(BaseModel):
    """API payload for sending an outreach email."""

    token: str = Field(..., description="User Supabase JWT auth token")
    org_id: str = Field(..., description="Organization ID")
    email_id: str = Field(..., description="ID of the draft email in emails table")
    company_id: Optional[str] = Field(None, description="Optional target company ID")
    recipient_emails: Optional[List[str]] = Field(
        None,
        description="Target recipient emails. If multiple are given, email is dispatched to each.",
    )
    custom_subject: Optional[str] = Field(None, description="Optional overridden subject")
    custom_body: Optional[str] = Field(None, description="Optional overridden body content")


class SendEmailApiResponse(BaseModel):
    """API response after queuing or sending an outreach email."""

    status: str  # "queued" | "success" | "partial" | "error"
    email_id: str
    message: str
    job_id: Optional[str] = None
    recipients_sent: List[str] = []
    recipients_failed: List[dict[str, str]] = []
    message_ids: List[str] = []


class CheckRepliesApiRequest(BaseModel):
    """API payload for manually triggering reply detection."""

    token: str = Field(..., description="User Supabase JWT auth token")
    org_id: str = Field(..., description="Organization ID")


class CheckRepliesApiResponse(BaseModel):
    """API response from reply detection check."""

    status: str
    job_id: Optional[str] = None
    replies_detected: int = 0
    details: List[dict[str, Any]] = []
