import sys
from pathlib import Path

# Ensure the backend package is importable whether tests run via `pytest` or `python -m pytest`.
BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
