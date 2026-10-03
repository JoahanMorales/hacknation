from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

router = APIRouter(prefix="/api/graph", tags=["graph"])

# Generado offline por data/build.py; el layout nunca se calcula en el navegador.
OVERVIEW = Path(__file__).resolve().parent.parent / "fixtures" / "graph" / "overview.json"


@router.get("/overview")
def overview() -> FileResponse:
    if not OVERVIEW.is_file():
        raise HTTPException(503, "graph overview not built: run python3 data/build.py")
    return FileResponse(OVERVIEW, media_type="application/json")
