"""FastAPI entrypoint for running Prospectra backend with Uvicorn."""

import uvicorn

from app.core.logging_config import setup_colored_logging
from app.server import app

if __name__ == "__main__":
    setup_colored_logging()
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True, access_log=False)
