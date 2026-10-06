from rapidfuzz import process, fuzz


def match_skill_to_apollo_tech(
    skill: str,
    choices: list[str],
    limit: int = 5,
    score_cutoff: float = 80.0,
) -> list[str]:
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
