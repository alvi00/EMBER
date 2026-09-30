"""
EMBER · build_measurements.py
Normalise collected test data into Measurement rows (src/lib/schema.ts) -> data/processed/measurements.json

Sources used (each row stores sourceId + page where the value appears):
  FLEX droplet tests ........ PSI-69 experimental table (274 tests)
  BASS-II SIBAL fabric ...... NTRS 20150008962 appendix table (concurrent flow, flow ramps, quench / no-ignition / blow-off)
  Saffire-I ................. PSI-98 experimental table + NTRS 20170008805 (spread rates)
  Saffire-II ................ PSI-99 experimental table (µg and 1 g reference columns) + NTRS 20170008805 (silicone results)
  Saffire IV–VI ............. NTRS 20260001992 Table 1 (pressure, O2, spread / growth rates)
  Partial-g limits .......... NTRS 20130010991 Table I (ULOI / MOC at 1 g, Martian, Lunar, 0 g)
  ACME CFI-G ................ PSI-159 experimental table, normal flames (self-extinguished vs flow terminated)

Outcome mapping (raw text kept in `rawOutcome`, mapping listed on /methods):
  FLEX  "Extinction" -> self-extinguished (flame went out before the droplet was consumed)
        "Completion" -> burned            (droplet burned to completion)
        "Disruption" -> burned            (droplet burned until it disrupted)
  BASS-II "Quenched" -> self-extinguished at the final (reduced) flow speed; "Blow-off" -> self-extinguished at the final
        (increased) flow; "No ignition" -> no-ignition; blank / "No Blow-off" -> burned at the final flow.
        Reused samples are excluded, as in the source paper.
  Saffire-II µg burn length "~ 0" -> self-extinguished (igniter flame did not spread); a measured spread length -> burned.
        1 g reference: "Complete" -> burned; partial length then extinction -> self-extinguished; "~ 0" -> no-ignition.
  Partial-g Table I: ULOI (lowest O2 with propagation) -> burned; MOC (highest O2 without propagation) -> self-extinguished.
  CFI-G "SE" -> self-extinguished; "FT" (flame persisted until fuel flow was terminated) -> burned; "-" rows skipped.

Usage (PowerShell):  python scripts/py/build_measurements.py
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from clean_tables import (  # noqa: E402
    ATM_TO_KPA,
    BAR_TO_KPA,
    MBAR_TO_KPA,
    MMHG_TO_KPA,
    PSIA_TO_KPA,
    is_missing,
    read_table,
    to_number,
)

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "data" / "raw"
INTERIM_TEXT = ROOT / "data" / "interim" / "text"


def find_page(source_id: str, phrase: str) -> int | None:
    """Page number of the first page in the extracted source text containing `phrase` (whitespace-insensitive)."""
    path = INTERIM_TEXT / f"{source_id}.json"
    if not path.exists():
        return None
    target = re.sub(r"\s+", " ", phrase).lower()
    for p in json.loads(path.read_text(encoding="utf8")):
        if target in re.sub(r"\s+", " ", p["text"]).lower():
            return p["page"]
    return None


def mid_id(*parts: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", "-".join(parts).lower()).strip("-")


def r1(x: float | None, d: int = 2) -> float | None:
    return None if x is None else round(x, d)


rows: list[dict] = []


def add(**kw):
    rows.append({k: v for k, v in kw.items() if v is not None and v != ""})


# ---------------------------------------------------------------- FLEX
def flex():
    src = "psi-69-experimental-table-flex"
    mapping = {"Extinction": "self-extinguished", "Completion": "burned", "Disruption": "burned"}
    for r in read_table(RAW / "psi" / "PSI-69" / "PSI-69_Experimental table_FLEX.csv"):
        raw = r.get("Test end", "").strip()
        if raw not in mapping:
            continue
        o2 = to_number(r.get("O initial ambient composition; mole fraction"))
        co2 = to_number(r.get("CO initial ambient composition; mole fraction")) or 0
        he = to_number(r.get("He initial ambient composition; mole fraction")) or 0
        p = to_number(r.get("Ambient pressure; mmHg"))
        d0 = to_number(r.get("Droplet initial diameter; mm"))
        dext = to_number(r.get("Visible flame extinction diameter; mm"))
        diluent = "CO2" if co2 > 0 else ("He" if he > 0 else "N2")
        notes = []
        if d0 is not None:
            notes.append(f"initial droplet diameter {d0} mm")
        if dext is not None:
            notes.append(f"visible flame extinction diameter {dext} mm")
        if co2 > 0:
            notes.append(f"CO2 mole fraction {co2}")
        if he > 0:
            notes.append(f"He mole fraction {he}")
        add(
            id=mid_id("flex", r.get("FLEX Test #", ""), r.get("FLEX Identifier", "")),
            experimentId="flex",
            testId=f"FLEX {r.get('FLEX Test #')} ({r.get('FLEX Identifier')})",
            fuel=r.get("Fuel", "").strip(),
            fuelFamily="Liquid fuel droplets",
            geometry="droplet",
            o2Percent=r1(o2 * 100 if o2 is not None else None, 1),
            pressureKpa=r1(p * MMHG_TO_KPA if p else None, 1),  # 0 in the table = not recorded
            gravityG=0,
            outcome=mapping[raw],
            rawOutcome=raw,
            burnDurationS=to_number(r.get("Burn time; s")),
            diluent=diluent,
            sourceId=src,
            notes="; ".join(notes) or None,
        )


# ---------------------------------------------------------------- BASS-II SIBAL (NTRS 20150008962 appendix)
BASS_II_SIBAL = [
    # test, width cm, flow start, flow final, O2 %, comment (verbatim from the appendix)
    ("GMT45-T1", 2.2, 10, 10, 18.5, ""),
    ("GMT45-T2", 2.2, 10, 5, 18.5, ""),
    ("GMT45-T4", 2.2, 10, 2.2, 18.7, "Quenched"),
    ("GMT45-T15", 2.2, 10, 29, 18.7, "No Blow-off"),
    ("GMT100-T5", 2.2, 10, 2.4, 18.8, ""),
    ("GMT100-T6", 2.2, 4.5, 2.6, 18.8, ""),
    ("GMT100-T13", 2.2, 4, 2.2, 17.5, "Quenched"),
    ("GMT100-T16", 2.2, 4, 3, 17.6, ""),
    ("GMT175-T9", 2.2, 10, 10, 16.4, "No ignition"),
    ("GMT175-T10", 2.2, 5, 5, 16.4, "No ignition"),
    ("GMT175-T18", 2.2, 5, 2.6, 17.4, "Quenched"),
    ("GMT178-T11", 2.2, 4, 4, 17.1, ""),
    ("GMT178-T12", 2.2, 5, 5, 16.8, "No ignition"),
    ("GMT178-T14", 2.2, 4, 2.8, 16.9, "Quenched"),
    ("GMT178-T17", 2.2, 6, 53, 16.9, "No Blow-off"),
    ("GMT190-T19", 1.2, 11, 11, 17.2, ""),
    ("GMT190-T20", 1.2, 11, 3, 17.2, "Quenched"),
    ("GMT190-T21", 1.2, 11, 47, 17.2, "Blow-off"),
]


def bass_ii():
    src = "ntrs-20150008962"
    page = find_page(src, "Test summary of flat SIBAL fabrics")
    for test, width, f0, f1, o2, comment in BASS_II_SIBAL:
        outcome = {"Quenched": "self-extinguished", "Blow-off": "self-extinguished", "No ignition": "no-ignition"}.get(comment, "burned")
        flow_note = f"flow {f0} cm/s" if f0 == f1 else f"flow ramped {f0} → {f1} cm/s during the test; value is the final flow"
        add(
            id=mid_id("bass-ii", test),
            experimentId="bass-ii",
            testId=test,
            fuel="Cotton-fiberglass fabric (SIBAL)",
            fuelFamily="Thin fabric (cotton/fiberglass)",
            geometry="thin-sheet",
            o2Percent=o2,
            pressureKpa=None,
            flowCmS=f1,
            gravityG=0,
            outcome=outcome,
            rawOutcome=comment or "flame sustained",
            sourceId=src,
            page=page,
            notes=f"{width} cm wide sample, concurrent flow; {flow_note}. O2 marked * in source for GMT45-T1/T2.",
        )


# ---------------------------------------------------------------- Saffire-I
def saffire_i():
    page = find_page("ntrs-20170008805", "average concurrent-flow flame spread rate is 1.8 mm/s")
    for sample, direction, rate in (("S1", "Concurrent", 1.8), ("S2", "Opposed", 1.3)):
        add(
            id=mid_id("saffire-i", sample),
            experimentId="saffire-i",
            testId=f"Saffire-I {sample}",
            fuel="Cotton-fiberglass fabric (SIBAL), 94 × 40.6 cm",
            fuelFamily="Thin fabric (cotton/fiberglass)",
            geometry="thin-sheet",
            o2Percent=21.6,
            flowCmS=20,
            gravityG=0,
            outcome="burned",
            rawOutcome=f"{direction} flame spread over the sample",
            spreadRateMmS=rate,
            sourceId="ntrs-20170008805",
            page=page,
            notes=f"{direction} flow. O2 given as 21.5–21.7% in the PSI-98 table (value shown is the midpoint). Average spread rate from NTRS 20170008805.",
        )


# ---------------------------------------------------------------- Saffire-II (µg + 1 g reference columns)
def saffire_ii():
    src = "psi-99-experimental-table-saffire-2"
    table = read_table(RAW / "psi" / "PSI-99" / "PSI-99_Experimental table_SAFFIRE-2.csv")
    for r in table:
        sample = r.get("Sample Number", "")
        material = r.get("Material", "").strip()
        if not re.fullmatch(r"2-\d", sample) or not material:
            continue  # skip note rows and rows with no material named
        flow = to_number(r.get("Air Flow (cm/s)"))
        o2 = to_number(r.get("Percent O2 (Note 1)"))
        direction = r.get("Flow Direction", "").strip()
        thickness = r.get("Samle Thickness", "").strip()
        ug_len = r.get("?-g Burn Length", "").strip()
        ug_rate = r.get("?-g Spread Length", "").strip()
        one_g_len = r.get("1-g Burn Length", "").strip()
        one_g_rate = r.get("1-g Spread Rate", "").strip()
        family = "Silicone" if "Silicone" in material else ("PMMA (acrylic)" if "PMMA" in material else "Thin fabric (cotton/fiberglass)")
        geometry = "thick" if ("PMMA" in material and "Nomex" not in material) else "thin-sheet"
        th_mm = to_number(thickness) if re.fullmatch(r"\d?\.\d+ mm", thickness) else None
        base = dict(fuel=material, fuelFamily=family, geometry=geometry, thicknessMm=th_mm, sourceId=src)

        if material == "PMMA & Nomex":
            add(id=mid_id("saffire-ii", sample, "pmma"), experimentId="saffire-ii", testId=f"Saffire-II {sample} (PMMA part)",
                fuel="PMMA (0.85 mm)", fuelFamily="PMMA (acrylic)", geometry="thin-sheet", thicknessMm=0.85,
                o2Percent=o2, flowCmS=flow, gravityG=0, outcome="burned", rawOutcome=ug_len, sourceId=src,
                notes=f"{direction} flow. PMMA portion completely consumed (table note 2).")
            add(id=mid_id("saffire-ii", sample, "nomex"), experimentId="saffire-ii", testId=f"Saffire-II {sample} (Nomex part)",
                fuel="Nomex (0.37 mm)", fuelFamily="Thin polymer films (Mylar/Ultem/Nomex)", geometry="thin-sheet", thicknessMm=0.37,
                o2Percent=o2, flowCmS=flow, gravityG=0, outcome="no-ignition", rawOutcome="Nomex was not ignited (table note 2)",
                sourceId=src, notes=f"{direction} flow; the burning PMMA did not ignite the Nomex. 1 g burn length ~0 for Nomex.")
            continue

        ug_outcome = "self-extinguished" if ug_len.startswith("~ 0") else "burned"
        rate = to_number(ug_rate)
        add(id=mid_id("saffire-ii", sample, "ug"), experimentId="saffire-ii", testId=f"Saffire-II {sample}",
            o2Percent=o2, flowCmS=flow, gravityG=0, outcome=ug_outcome, rawOutcome=f"µg burn length: {ug_len}",
            spreadRateMmS=rate, notes=f"{direction} flow; thickness as listed: {thickness}.", **base)

        if one_g_len:
            if one_g_len.startswith("Complete"):
                g_out = "burned"
            elif one_g_len.startswith("~ 0"):
                g_out = "no-ignition"
            else:
                g_out = "self-extinguished"
            add(id=mid_id("saffire-ii", sample, "1g"), experimentId="saffire-ii", testId=f"Saffire-II {sample} 1 g reference",
                gravityG=1, outcome=g_out, rawOutcome=f"1 g burn length: {one_g_len}; spread rate: {one_g_rate}",
                spreadRateMmS=to_number(one_g_rate),
                notes=f"Normal-gravity reference test on the same material ({'upward' if direction == 'Concurrent' else 'downward'} burning); O2 and flow not listed.",
                **base)


# ---------------------------------------------------------------- Saffire IV–VI (NTRS 20260001992 Table 1)
SAFFIRE_IV_VI = [
    # flight/sample, material, sides, pressure mbar, O2 fraction, growth mm/s, spread mm/s, peak HRR W
    ("IV-2", "PMMA", 2, 1000, 0.22, 0.22, None, None),
    ("V-3", "PMMA", 1, 745, 0.26, 0.26, None, None),
    ("VI-3", "PMMA", 2, 544, 0.30, 0.38, None, 3240),
    ("VI-4", "PMMA", 1, 550, 0.29, 0.27, None, 1487),
    ("IV-1", "SIBAL", 2, 980, 0.23, None, 3.6, None),
    ("V-2", "Cotton", 2, 741, 0.28, None, 3.4, None),
    ("VI-2", "SIBAL", 2, 541, 0.31, None, 4.05, 3376),
]


def saffire_iv_vi():
    src = "ntrs-20260001992"
    page = find_page(src, "Table 1: Sample materials and test data")
    for sample, material, sides, mbar, xo2, growth, spread, hrr in SAFFIRE_IV_VI:
        is_pmma = material == "PMMA"
        notes = [f"{sides}-sided burn, 40 cm wide, 20 cm/s opposed flow"]
        if growth is not None:
            notes.append(f"flame length growth rate {growth} mm/s")
        if hrr is not None:
            notes.append(f"peak heat release {hrr} W")
        add(
            id=mid_id("saffire", sample),
            experimentId="saffire-iv-vi",
            testId=f"Saffire {sample}",
            fuel={"PMMA": f"PMMA ({'10' if sides == 2 else '5'} mm)", "SIBAL": "Cotton-fiberglass fabric (SIBAL)", "Cotton": "Cotton fabric"}[material],
            fuelFamily="PMMA (acrylic)" if is_pmma else "Thin fabric (cotton/fiberglass)",
            geometry="thick" if is_pmma else "thin-sheet",
            thicknessMm=(10 if sides == 2 else 5) if is_pmma else None,
            o2Percent=r1(xo2 * 100, 1),
            pressureKpa=r1(mbar * MBAR_TO_KPA, 1),
            flowCmS=20,
            gravityG=0,
            outcome="burned",
            rawOutcome="sample burned (Table 1)",
            spreadRateMmS=spread,
            sourceId=src,
            page=page,
            notes="; ".join(notes),
        )


# ---------------------------------------------------------------- Partial-g limits (NTRS 20130010991 Table I)
PARTIAL_G = {
    # material: (pressure psia, {level: (ULOI, MOC)})
    "Mylar G": (10.2, {"1g": (21.2, 20.0), "mars": (18.0, 17.0), "lunar": (15.6, 14.1), "0g": (17.0, 16.0)}),
    "Ultem 1000": (10.2, {"1g": (23.5, 23.0), "mars": (22.0, 21.1), "lunar": (21.0, 19.9), "0g": (24.0, 23.0)}),
    "Nomex HT90-40": (14.7, {"1g": (23.5, 22.1), "mars": (19.9, 19.0), "lunar": (21.0, 19.9), "0g": (23.0, 22.0)}),
}
G_LEVEL = {"1g": 1.0, "mars": 0.38, "lunar": 0.166, "0g": 0.0}
G_LABEL = {"1g": "1 g (NASA-STD-6001 Test 1, WSTF)", "mars": "Martian gravity (drop-tower centrifuge)", "lunar": "Lunar gravity (drop-tower centrifuge)", "0g": "0 g with 30 cm/s concurrent flow"}


def partial_g():
    src = "ntrs-20130010991"
    page = find_page(src, "Table I: Limiting Oxygen Molar Concentrations")
    for material, (psia, levels) in PARTIAL_G.items():
        for level, (uloi, moc) in levels.items():
            for kind, o2, outcome in (("ULOI", uloi, "burned"), ("MOC", moc, "self-extinguished")):
                add(
                    id=mid_id("partial-g", material, level, kind),
                    experimentId="partial-g-centrifuge",
                    testId=f"{material} · {level} · {kind}",
                    fuel=material,
                    fuelFamily="Thin polymer films (Mylar/Ultem/Nomex)",
                    geometry="thin-sheet",
                    o2Percent=o2,
                    pressureKpa=r1(psia * PSIA_TO_KPA, 1),
                    flowCmS=30 if level == "0g" else None,
                    gravityG=G_LEVEL[level],
                    outcome=outcome,
                    rawOutcome=f"{kind}{'*' if level != '1g' else ''} = {o2}% O2",
                    sourceId=src,
                    page=page,
                    notes=f"{G_LABEL[level]}. {'Upward limiting oxygen index: lowest O2 with propagation' if kind == 'ULOI' else 'Maximum oxygen concentration without propagation'}; reduced-g limits (*) use a shortened criterion because drops last 5.18 s.",
                )


# ---------------------------------------------------------------- ACME CFI-G (normal flames)
def cfi_g():
    src = "psi-159-experimental-table-cfi-g-normal-flames"
    for r in read_table(RAW / "psi" / "PSI-159" / "PSI-159_Experimental table_CFI-G_Normal Flames.csv"):
        code = r.get("Self-ext or flow term", "").strip()
        if code not in {"SE", "FT"}:
            continue
        xo2 = to_number(r.get("XO2 before test"))
        p = to_number(r.get("approx p (bar)"))
        test = r.get("Test", "").strip()
        comments = [] if is_missing(r.get("Comments")) else [r["Comments"].strip()]
        if r.get("Hot ignition", "").strip():
            comments.append(f"hot ignition: {r['Hot ignition'].strip()}")
        add(
            id=mid_id("cfi-g", test),
            experimentId="acme-cfi-g",
            testId=test,
            fuel=r.get("Fuel", "").strip() or "gaseous alkane",
            fuelFamily="Gaseous fuel flames",
            geometry="gas-jet",
            o2Percent=r1(xo2 * 100 if xo2 is not None else None, 1),
            pressureKpa=r1(p * BAR_TO_KPA if p is not None else None, 1),
            gravityG=0,
            outcome="self-extinguished" if code == "SE" else "burned",
            rawOutcome="SE (self-extinguished)" if code == "SE" else "FT (flame persisted until fuel flow terminated)",
            burnDurationS=to_number(r.get("burn time (sec)")),
            sourceId=src,
            notes="; ".join(["normal spherical diffusion flame on a porous burner", *comments]),
        )


def main() -> int:
    flex()
    bass_ii()
    saffire_i()
    saffire_ii()
    saffire_iv_vi()
    partial_g()
    cfi_g()
    ids = [r["id"] for r in rows]
    dup = {i for i in ids if ids.count(i) > 1}
    if dup:
        print("duplicate ids:", sorted(dup)[:10])
        return 1
    out = ROOT / "data" / "processed" / "measurements.json"
    out.write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf8")
    from collections import Counter

    print(f"measurements: {len(rows)}")
    for k, v in Counter(r["experimentId"] for r in rows).items():
        print(f"  {k:22} {v}")
    print("  outcomes:", dict(Counter(r["outcome"] for r in rows)))
    print("  families:", dict(Counter(r["fuelFamily"] for r in rows)))
    missing_pages = sorted({r["sourceId"] for r in rows if r["sourceId"].startswith("ntrs") and "page" not in r})
    if missing_pages:
        print("  WARNING no page found for:", missing_pages)
    return 0


if __name__ == "__main__":
    sys.exit(main())
