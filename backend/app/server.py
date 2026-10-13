"""FastAPI entrypoint for the Prospectra backend."""

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI  # noqa: E402

from app.api.routes.company_search import router as company_search_router  # noqa: E402
from app.api.routes.domain import router as domain_router  # noqa: E402
from app.api.routes.write_email import router as write_email_router  # noqa: E402

app = FastAPI(title="Prospectra")

app.include_router(company_search_router, prefix="/api/v1")
app.include_router(write_email_router, prefix="/api/v1")
app.include_router(domain_router, prefix="/api/v1")