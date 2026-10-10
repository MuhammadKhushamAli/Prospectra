"""Pydantic schema for company authenticity scoring."""

from __future__ import annotations

from pydantic import BaseModel, Field, model_validator


class CompanyAuth(BaseModel):
    """Company authenticity score with conditional feedback.

    The score is always required. If the score falls below 70, feedback
    explaining the low score is mandatory.
    """

    score: int = Field(
        ...,
        ge=0,
        le=100,
        description="Authenticity score from 0 to 100.",
    )
    feedback: str | None = Field(
        default=None,
        description="Explanation required when the score is below 70.",
    )

    @model_validator(mode="after")
    def feedback_required_when_score_below_70(self) -> CompanyAuth:
        if self.score < 70 and not self.feedback:
            raise ValueError(
                "feedback is required when score is below 70"
            )
        return self
