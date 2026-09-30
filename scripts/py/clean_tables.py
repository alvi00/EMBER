"""
EMBER · clean_tables.py
Shared helpers for turning PSI / NTRS tables into clean rows, plus a CLI that writes cleaned copies of every PSI
experimental table to data/interim/tables/ (UTF-8, trimmed headers, blank rows removed).

Rules (listed on /methods):
  * Header cells are trimmed and runs of whitespace collapsed ("Calibrated  initial O2 % by vol " -> "Calibrated initial O2 % by vol").
  * Spreadsheet error cells (#DIV/0!, #REF!, #N/A, #VALUE!, #NAME?, #NUM!, #NULL!) and dashes / "none" / "n/a" are MISSING,
    never values.
  * Numbers are parsed only when the cell is a single number (optionally with a unit or a leading "~");
    ranges such as "10 -> 2.2" are kept as text and handled explicitly by build_measurements.py.

Unit conversions (every one is used by build_measurements.py and listed on /methods):
  mmHg  -> kPa : × 0.133322
  atm   -> kPa : × 101.325
  bar   -> kPa : × 100
  mbar  -> kPa : × 0.1
  psia  -> kPa : × 6.894757
  mole fraction -> % : × 100
  cm -> mm : × 10
"""

from __future__ import annotations

import csv
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

ERROR_CELLS = {"#div/0!", "#ref!", "#n/a", "#value!", "#name?", "#num!", "#null!", "-", "--", "none", "n/a", "na", ""}

MMHG_TO_KPA = 0.133322
ATM_TO_KPA = 101.325
BAR_TO_KPA = 100.0
MBAR_TO_KPA = 0.1
PSIA_TO_KPA = 6.894757


def clean_header(h: str) -> str:
    return re.sub(r"\s+", " ", (h or "").replace("﻿", "")).strip()


def is_missing(cell) -> bool:
    return cell is None or str(cell).strip().lower() in ERROR_CELLS


def to_number(cell) -> float | None:
    """Parse a single numeric cell such as '22.2', '~ 21.5', '20 cm/s', '0.37 mm'. Returns None for missing/ambiguous."""
    if is_missing(cell):
        return None
    s = str(cell).strip().lstrip("~").strip()
    m = re.fullmatch(r"(-?\d+(?:\.\d+)?)\s*[a-zA-Z/%°]*\.?", s)
    return float(m.group(1)) if m else None


def read_table(path: Path) -> list[dict]:
    with path.open(encoding="utf-8-sig", errors="replace", newline="") as f:
        reader = csv.reader(f)
        rows = list(reader)
    if not rows:
        return []
    header = [clean_header(h) for h in rows[0]]
    out = []
    for r in rows[1:]:
        if not any(c.strip() for c in r):
            continue
        out.append({header[i]: (r[i].strip() if i < len(r) else "") for i in range(len(header)) if header[i]})
    return out


def main() -> int:
    out_dir = ROOT / "data" / "interim" / "tables"
    out_dir.mkdir(parents=True, exist_ok=True)
    n = 0
    for path in sorted((ROOT / "data" / "raw" / "psi").glob("PSI-*/*Experimental table*.csv")):
        rows = read_table(path)
        if not rows:
            continue
        fields = list(rows[0].keys())
        with (out_dir / path.name).open("w", encoding="utf8", newline="") as f:
            w = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
            w.writeheader()
            for r in rows:
                w.writerow({k: ("" if is_missing(v) else v) for k, v in r.items()})
        n += 1
        print(f"{path.name}: {len(rows)} rows, {len(fields)} columns")
    print(f"cleaned {n} tables -> {out_dir.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
