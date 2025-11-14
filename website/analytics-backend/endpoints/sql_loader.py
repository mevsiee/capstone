# endpoints/sql_loader.py
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

def load_sql(name: str) -> str:
    file_path = BASE_DIR / "sql" / name
    return file_path.read_text(encoding="utf-8")
