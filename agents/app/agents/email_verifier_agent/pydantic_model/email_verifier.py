"""Pydantic schemas for the email-verifier agent."""

from pydantic import BaseModel, Field


class EmailVerification(BaseModel):
    """LLM-generated email verification."""
    
    score: float = Field(
        ...,
        description="A score from 0 to 100 indicating the quality and relevance of the email.",
    )
    feedback: str = Field(
        ...,
        description="Feedback on why the email scored what it did, especially if the score is below 70.",
    )
