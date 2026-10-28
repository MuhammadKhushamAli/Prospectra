"""Pydantic schema for company authenticity scoring."""

from __future__ import annotations

from typing import List, Literal, Optional
from pydantic import BaseModel, Field, model_validator


class CompanyAuth(BaseModel):
    """Company authenticity and buyer-fit evaluation."""

    score: int = Field(
        ...,
        ge=0,
        le=100,
        description="Authenticity score from 0 to 100 indicating fit as a client prospect.",
    )
    feedback: Optional[str] = Field(
        default=None,
        description="Explanation required when the score is below 70.",
    )
    is_real_operating_business: bool = Field(
        ...,
        description="True if the company is an actual operating business, not a directory, listicle, or job board.",
    )
    is_service_provider: bool = Field(
        ...,
        description="True if the company is an IT consultancy, dev shop, agency, or software vendor selling the same technical services.",
    )
    has_in_house_tech_team: Literal["yes", "no", "unknown"] = Field(
        ...,
        description="Whether the company appears to have an in-house engineering team.",
    )
    matched_industry: Optional[str] = Field(
        default=None,
        description="Specific target industry from the user context matching this company.",
    )
    need_signals: List[str] = Field(
        default_factory=list,
        description="Specific evidence from scraped profile indicating a need for user skills (e.g. manual booking, outdated portal).",
    )
    need_hypothesis: str = Field(
        default="",
        description="Reasoned conclusion on why this specific company needs the user's technical skills, formulated after analyzing their scraped website data, services, and operational gaps.",
    )
    proposed_solution: str = Field(
        default="",
        description="One-sentence solution we can pitch to this company based on user's skills.",
    )
    needed_skills: List[str] = Field(
        default_factory=list,
        description="Specific technical skills of the user that this business needs (e.g. React, Python, Mobile App Development, FastAPI, Automation).",
    )
    needed_services: List[str] = Field(
        default_factory=list,
        description="Specific types of digital services or software solutions this company needs (e.g. 'Online Booking & Scheduling Portal', 'Customer Mobile App', 'Inventory Management Dashboard', 'Workflow Automation').",
    )
    user_skills: List[str] = Field(
        default_factory=list,
        description="Specific user skills this company has an operational need for.",
    )
    target_industries: List[str] = Field(
        default_factory=list,
        description="Target industries matching this company.",
    )
    corrected_name: Optional[str] = Field(
        default=None,
        description="Cleaner formal company name if the scraped title had website noise.",
    )

    @model_validator(mode="after")
    def sync_skills_and_validate_feedback(self) -> CompanyAuth:
        if not self.needed_skills and self.user_skills:
            self.needed_skills = list(self.user_skills)
        elif not self.user_skills and self.needed_skills:
            self.user_skills = list(self.needed_skills)

        if self.score < 70 and not self.feedback:
            raise ValueError("feedback is required when score is below 70")
        return self
