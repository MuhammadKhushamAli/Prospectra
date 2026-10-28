"""LangGraph node for storing accepted companies and verified contacts to Supabase."""

from datetime import datetime, timezone
import os
from typing import Any, Dict, List

from app.models.company import COMPANY_DB_COLUMNS
from app.services.supabase import get_supabase_client
from ..state.state import GraphState

COMPANIES_TABLE = os.environ.get("SUPABASE_COMPANIES_TABLE_NAME", "companies")
CONTACTS_TABLE = os.environ.get("SUPABASE_CONTACTS_TABLE_NAME", "contacts")


async def store_to_db_node(state: GraphState) -> Dict[str, Any]:
    """Node that persists accepted companies and their Reacher-verified emails to Supabase."""
    accepted_companies = state.get("accepted_companies", [])
    if not accepted_companies:
        print("[PHASE 8: STORE TO DB] No accepted companies to store.")
        return {}

    errors = list(state.get("errors", []))

    print(f"\n========================================================")
    print(f"[PHASE 8: STORE TO DB] Persisting {len(accepted_companies)} accepted companies to Supabase...")
    print(f"========================================================")

    try:
        supabase = await get_supabase_client()
        now_iso = datetime.now(timezone.utc).isoformat()

        company_records: List[Dict[str, Any]] = []
        for company in accepted_companies:
            rec: Dict[str, Any] = {
                "id": str(company.id),
                "org_id": str(company.org_id),
                "name": company.name,
                "domain": company.domain,
                "website": company.website or f"https://{company.domain}",
                "linkedin_url": company.linkedin_url,
                "industry": company.industry or "",
                "size": company.size or "",
                "about_text": company.about_text or (company.scraped.about_text if company.scraped else None),
                "need_hypothesis": company.need_hypothesis,
                "needed_skills": company.needed_skills or [],
                "needed_services": company.needed_services or [],
                "need_signals": company.need_signals or [],
                "proposed_solution": company.proposed_solution,
                "services_offered": company.services_offered or (company.scraped.services_offered if company.scraped else []),
                "digital_features": company.digital_features or (company.scraped.digital_features if company.scraped else []),
                "auth_score": company.auth_score,
                "auth_feedback": company.auth_feedback,
                "source": ["searxng"],
                "raw_signals": company.raw_signals or {},
                "status": "pending_review",
            }
            # Restrict strictly to table schema columns
            clean_rec = {k: v for k, v in rec.items() if k in COMPANY_DB_COLUMNS}
            company_records.append(clean_rec)

        if company_records:
            print(f"  [DB COMPANIES] Preparing to store {len(company_records)} company record(s):")
            for idx, r in enumerate(company_records, 1):
                print(f"    [{idx}] {r['name']} ({r['domain']}) | status: {r['status']} | industry: '{r['industry']}' | score: {r.get('auth_score')}")
                print(f"        Needed skills: {r.get('needed_skills')}")
                print(f"        Needed services: {r.get('needed_services')}")
                print(f"        Need hypothesis: {r.get('need_hypothesis')}")
                print(f"        Services offered: {r.get('services_offered')}")
                print(f"        Digital features: {r.get('digital_features')}")
                print(f"        Raw signals keys: {list(r.get('raw_signals', {}).keys())}")

            # Upsert companies on (org_id, domain)
            upsert_res = (
                await supabase.table(COMPANIES_TABLE)
                .upsert(company_records, on_conflict="org_id,domain")
                .execute()
            )
            saved_rows = upsert_res.data or []
            print(f"  [DB COMPANIES SUCCESS] Upserted {len(company_records)} record(s) into table '{COMPANIES_TABLE}'.")

            # Map domain -> company_id from Supabase
            domain_to_id: Dict[str, str] = {}
            for row in saved_rows:
                if row.get("domain") and row.get("id"):
                    domain_to_id[row["domain"].lower()] = str(row["id"])

            # Fallback to in-memory IDs if select was not returned by execute
            for company in accepted_companies:
                dom = company.domain.lower()
                if dom not in domain_to_id:
                    domain_to_id[dom] = str(company.id)

            # Insert verified contacts
            contact_records: List[Dict[str, Any]] = []
            for company in accepted_companies:
                comp_id = domain_to_id.get(company.domain.lower())
                if not comp_id:
                    continue

                for email_obj in company.emails:
                    if not email_obj.is_verified:
                        continue
                    contact_records.append({
                        "company_id": comp_id,
                        "name": f"{email_obj.first_name or ''} {email_obj.last_name or ''}".strip() or None,
                        "role": email_obj.email_of or "Generic",
                        "email": email_obj.email.lower().strip(),
                        "source": f"reacher:{email_obj.source}",
                        "is_reachable": email_obj.is_reachable or "safe",
                        "is_role_account": email_obj.is_role_account,
                        "verified_at": now_iso,
                    })

            if contact_records:
                try:
                    await supabase.table(CONTACTS_TABLE).upsert(contact_records).execute()
                    print(f"  [DB CONTACTS] Upserted {len(contact_records)} verified contact emails into '{CONTACTS_TABLE}'.")
                    for c in contact_records:
                        print(f"    - {c['email']} ({c['role']}) -> status: {c['is_reachable']}")
                except Exception as ce:
                    # Non-fatal if contacts table has constraint differences; record error
                    print(f"  [DB CONTACTS WARNING] Storing contacts returned: {str(ce)}")

    except Exception as e:
        error_msg = f"Failed to store companies to Supabase: {str(e)}"
        print(f"  [DB ERROR] {error_msg}")
        if error_msg not in errors:
            errors.append(error_msg)
        return {"errors": errors}

    print(f"[PHASE 8: STORE TO DB] Completed storage successfully.\n")
    return {"errors": errors}
