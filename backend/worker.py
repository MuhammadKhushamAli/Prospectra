"""Standalone entrypoint to run the Prospectra ARQ worker process separately from the FastAPI server."""

from dotenv import load_dotenv  # noqa: E402
load_dotenv()

from arq import run_worker  # noqa: E402

from app.worker.worker_config import WorkerSettings  # noqa: E402

if __name__ == "__main__":
    run_worker(WorkerSettings)
