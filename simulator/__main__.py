"""Run from the repository root: python -m simulator --help."""

import argparse
import json
from pathlib import Path
import sys

from dotenv import load_dotenv
import psycopg

from simulator import core


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("seed", "benchmark", "repair", "reset", "verify"))
    parser.add_argument("--email", default=core.DEFAULT_EMAIL)
    parser.add_argument("--samples", type=int, default=100)
    parser.add_argument("--warmup", type=int, default=10)
    parser.add_argument("--output", type=Path, help="Write JSON evidence to this file")
    args = parser.parse_args(argv)
    if args.samples < 2 or args.warmup < 0:
        parser.error("--samples must be >= 2 and --warmup >= 0")
    load_dotenv(Path(__file__).resolve().parents[1] / ".env", override=False)
    try:
        with core.connect() as conn:
            operation = getattr(core, args.command)
            if args.command in ("benchmark", "verify"):
                result = operation(conn, args.email, args.samples, args.warmup)
            else:
                result = operation(conn)
        serialized = json.dumps(result, indent=2) + "\n"
        if args.output:
            args.output.parent.mkdir(parents=True, exist_ok=True)
            args.output.write_text(serialized)
        print(serialized, end="")
        return 1 if result.get("verified") is False else 0
    except psycopg.Error:
        # Do not echo connection strings, credentials, or server error details.
        print("Database operation failed. Check the isolated PostgreSQL 17 service and .env configuration.", file=sys.stderr)
        return 2
    except (ValueError, OSError) as exc:
        print(f"Simulator error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
