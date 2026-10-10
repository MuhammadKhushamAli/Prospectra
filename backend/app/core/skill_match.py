import csv
import os
from rapidfuzz import process, fuzz
from app.models.user_context import UserContext

_TECH_CHOICES = None

def get_tech_choices() -> list[str]:
    """Load and cache technology choices from the CSV file."""
    global _TECH_CHOICES
    if _TECH_CHOICES is None:
        csv_path = os.path.join(
            os.path.dirname(__file__), 
            "..", "utils", "supported_technologies.csv"
        )
        try:
            with open(csv_path, newline='', encoding='utf-8') as f:
                reader = csv.reader(f)
                next(reader, None)
                _TECH_CHOICES = [row[1] for row in reader if len(row) > 1]
        except Exception:
            _TECH_CHOICES = []
    return _TECH_CHOICES


def format_tech_uid(tech_name: str) -> str:
    """Format technology name into Apollo UID format."""
    return tech_name.lower().replace(" ", "_").replace(".", "_")


def match_skill_to_apollo_tech(
    skill: str,
    choices: list[str],
    limit: int = 5,
    score_cutoff: float = 80.0,
) -> list[str]:
    """Fuzzy match a skill against a list of choices."""
    if not skill.strip() or not choices or limit <= 0:
        return []

    results = process.extract(
        skill,
        choices,
        scorer=fuzz.WRatio,
        limit=limit,
        score_cutoff=score_cutoff,
    )
    return [matched_skill for matched_skill, _, _ in results]


def get_apollo_tech_uids_for_user(user_context: UserContext) -> list[str]:
    """Get matching Apollo technology UIDs for a user's skills."""
    skills = []
    if user_context.skills:
        skills.extend(user_context.skills.programming_languages)
        skills.extend(user_context.skills.frameworks)
        skills.extend(user_context.skills.tools)
        
    choices = get_tech_choices()
    matched_uids = set()
    
    for skill in skills:
        matches = match_skill_to_apollo_tech(skill, choices)
        for m in matches:
            matched_uids.add(format_tech_uid(m))
            
    return list(matched_uids)
