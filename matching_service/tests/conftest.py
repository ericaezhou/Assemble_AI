import sys
from pathlib import Path

# Ensure the matching_service root is on sys.path so tests can import matcher.
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
