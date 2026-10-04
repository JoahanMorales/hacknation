"""Export a pinned source ZIP without local environments or raw downloads.

Usage: python docs/demo/package_source.py --output-dir /absolute/output/path
Uses git archive (committed files only), validates contents and writes a manifest.
"""

import argparse
import hashlib
import json
import subprocess
import zipfile
from pathlib import Path, PurePosixPath

RUNTIME_SHA = "ee957e9a0846a5d6de9f0efd0660e66f21e213b7"
ROOT = Path(__file__).resolve().parents[2]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    output = args.output_dir.resolve()
    output.mkdir(parents=True, exist_ok=True)
    archive = output / f"Constellation_Source_{RUNTIME_SHA[:7]}.zip"
    if archive.exists():
        raise SystemExit(f"Refusing to overwrite existing archive: {archive}")
    actual = subprocess.check_output(["git", "rev-parse", RUNTIME_SHA], cwd=ROOT, text=True).strip()
    assert actual == RUNTIME_SHA
    subprocess.run(["git", "archive", "--format=zip", f"--output={archive}", RUNTIME_SHA], cwd=ROOT, check=True)
    with zipfile.ZipFile(archive) as bundle:
        names = bundle.namelist()
        for name in names:
            parts = PurePosixPath(name).parts
            assert not {".git", ".cache", ".venv", "node_modules"}.intersection(parts), name
            assert not name.startswith("data/raw/"), name
            assert not (PurePosixPath(name).name.startswith(".env") and PurePosixPath(name).name != ".env.example"), name
            assert not name.endswith((".pem", ".key", ".p12", ".pfx", ".safetensors", ".pt", ".onnx")), name
        required = ["README.md", "pyproject.toml", "uv.lock", "web/package-lock.json", "app/fixtures/graph/overview.json", "app/fixtures/graph/annotations.json", "app/fixtures/deep/deep.json"]
        assert all(name in names for name in required), "Missing essential setup or processed data"
        assert bundle.testzip() is None
    report = {"runtime_sha": RUNTIME_SHA, "zip": archive.name, "bytes": archive.stat().st_size,
              "sha256": hashlib.sha256(archive.read_bytes()).hexdigest(), "files": len(names),
              "required_files_verified": required, "includes_submission_docs": False,
              "note": "Pinned runtime backup. Demo submission documents are prepared separately on HACK-014."}
    (output / "source-manifest.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report))


if __name__ == "__main__":
    main()
