"""Compatibility entrypoint.

Keep existing command `uvicorn ocr_server:app` working after refactor.
"""

from backend.main import app

