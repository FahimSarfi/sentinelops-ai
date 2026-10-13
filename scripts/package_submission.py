"""Package source only, excluding private state and configuration."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
ROOT = Path(__file__).resolve().parents[1]
BLOCKED = {"design-references", "node_modules", ".next", ".next-e2e", "__pycache__", ".pytest_cache",
".venv", "test-results", "playwright-report", ".sentinelops", ".git", ".codex",
".entire", ".agents", ".aws"}
EXT = {".png", ".webp", ".jpg", ".py", ".txt", ".json", ".ts", ".tsx", ".mjs", ".css", ".svg", ".sql",
".md", ".ini", ".yml", ".yaml"}
def eligible(p):
 r = p.relative_to(ROOT)
 if p.is_symlink() or any(x in BLOCKED for x in r.parts): return False
 if p.name.startswith(".env") and p.name != ".env.example": return False
 if p.name == "next-env.d.ts": return False
 if len(r.parts) == 1:
  return p.name in {"README.md", ".gitignore", ".env.example", "docker-compose.yml", "pytest.ini"}
 return r.parts[0] in {"backend", "simulator", "frontend", "scripts", "docs"} and (p.suffix in EXT or p.name in {".gitignore", ".env.example"})
def main():
 target = ROOT / "submission" / "SentinelOps-AI-source.zip"
 target.parent.mkdir(exist_ok=True)
 files = sorted(p for p in ROOT.rglob("*") if p.is_file() and eligible(p))
 with ZipFile(target, "w", ZIP_DEFLATED) as z:
  for p in files: z.write(p, "SentinelOps-AI/" + p.relative_to(ROOT).as_posix())
 with ZipFile(target) as z:
  assert z.testzip() is None
  assert len(z.namelist()) == len(files)
 print(f"Created {target} ({len(files)} source files); integrity verified.")
if __name__ == "__main__": main()
