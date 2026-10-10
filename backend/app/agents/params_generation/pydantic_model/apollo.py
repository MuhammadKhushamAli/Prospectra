"""Pydantic schema for Apollo organization-search prompt output."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, model_validator


class IntegerRange(BaseModel):
    """An inclusive integer range used by Apollo filters."""

    model_config = ConfigDict(extra="forbid")

    min: int = Field(..., description="Inclusive lower bound.")
    max: int = Field(..., description="Inclusive upper bound.")

    @model_validator(mode="after")
    def min_must_not_exceed_max(self) -> IntegerRange:
        if self.min is not None and self.max is not None and self.min > self.max:
            raise ValueError("min must be less than or equal to max")
        return self



class ApolloPrompt(BaseModel):
    """Structured Apollo organization-search filters generated from a prompt.

    Field names match Apollo's JSON request body. Array notation (``[]``) and
    bracket notation (``[min]``/``[max]``) from the API documentation are
    represented as Python lists and nested range objects respectively.
    """

    model_config = ConfigDict(str_strip_whitespace=True)

    organization_num_employees_ranges: list[str] | None = Field(
        default=None,
        description="Employee-count ranges formatted as 'lower,upper'.",
    )
    organization_locations: list[str] | None = Field(
        default=None,
        description="Company headquarters locations to include.",
    )
    organization_not_locations: list[str] | None = Field(
        default=None,
        description="Company headquarters locations to exclude.",
    )
    target_organizations_catagories: list[str] | None = Field(
        default=None,
        description="Target organization categories.",
    )
    target_organizations_required_skills: list[str] | None = Field(
        default=None,
        description="Skills required by target organizations.",
    )
    revenue_range: IntegerRange | None = Field(
        default=None,
        description="Organization revenue range, expressed as whole currency units.",
    )
    currently_using_any_of_technology_uids: list[str] | None = Field(
        default=None,
        description="DO NOT FILL THIS FIELD. The system will auto-populate it. Leave as null.",
    )
    q_organization_keyword_tags: list[str] | None = Field(
        default=None,
        description="Keywords associated with organizations to include.",
    )
    page: int | None = Field(default=None, ge=1, description="Results page number.")
    per_page: int | None = Field(
        default=None,
        ge=1,
        description="Number of results to return per page.",
    )
