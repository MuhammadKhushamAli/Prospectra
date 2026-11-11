"""FastAPI entrypoint for the Prospectra backend."""

from contextlib import asynccontextmanager

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI  # noqa: E402

from app.api.routes.company_search import router as company_search_router  # noqa: E402
from app.api.routes.domain import router as domain_router  # noqa: E402
from app.api.routes.jobs import router as jobs_router  # noqa: E402
from app.api.routes.write_email import router as write_email_router  # noqa: E402
from app.core.arq_config import close_arq_pool, get_arq_pool  # noqa: E402


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize ARQ Redis pool on startup; close pool on shutdown."""
    await get_arq_pool()
    yield
    await close_arq_pool()


app = FastAPI(title="Prospectra", lifespan=lifespan)

app.include_router(company_search_router, prefix="/api/v1")
app.include_router(write_email_router, prefix="/api/v1")
app.include_router(domain_router, prefix="/api/v1")
app.include_router(jobs_router, prefix="/api/v1")