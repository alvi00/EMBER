"""
EMBER · build_registry.py
Build data/sources.json and data/processed/experiments.json from what was actually collected:

  * NASA PSI investigation metadata   data/raw/psi/details-all.json   (via the PSI public API, Playwright browser)
  * PSI documents + experimental tables data/raw/psi/<PSI-n>/...
  * NTRS citation metadata + PDFs       data/raw/ntrs/selected-metadata.json, data/raw/ntrs/<id>.pdf
  * NASA web explainer text             data/raw/web/why-nasa-studies-flames.json

Curated fields (category, plain-language summary, why-it-matters) are paraphrases of the PSI objective / approach /
impact text or the cited NTRS abstract for that experiment. Condition ranges are computed from the PSI experimental
tables where a table exists, otherwise copied from the cited text; each range lists its source ids. Nothing here is
invented: when a value is not stated in a collected source it is omitted.

Every experiment is written with verified = False. Only a human reviewer may change that.

Usage (PowerShell):  python scripts/py/build_registry.py
"""

from __future__ import annotations

import csv
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "data" / "raw"
ACCESSED = "2026-09-30"
PSI_URL = "https://psi.nasa.gov/physci/repo/data/investigations/{acc}"

MMHG_TO_KPA = 0.133322  # 1 mmHg = 0.133322 kPa
ATM_TO_KPA = 101.325  # 1 atm = 101.325 kPa
BAR_TO_KPA = 100.0  # 1 bar = 100 kPa
PSIA_TO_KPA = 6.894757  # 1 psia = 6.894757 kPa


def slug(text: str, limit: int = 64) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return s[:limit].rstrip("-")


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf8"))


def fix_text(value: str | None) -> str:
    return re.sub(r"\s+", " ", (value or "").replace("�", "'")).strip()


def read_csv_rows(path: Path) -> list[dict]:
    with path.open(encoding="utf-8-sig", errors="replace", newline="") as f:
        return list(csv.DictReader(f))


def num(value) -> float | None:
    if value is None:
        return None
    m = re.search(r"-?\d+(?:\.\d+)?", str(value))
    return float(m.group()) if m else None


def rng(values: list[float], note: str | None = None, digits: int = 1) -> dict | None:
    vals = [v for v in values if v is not None]
    if not vals:
        return None
    out = {"min": round(min(vals), digits), "max": round(max(vals), digits)}
    if note:
        out["note"] = note
    return out


# ---------------------------------------------------------------------------------------------------------------
# Condition ranges computed from PSI experimental tables (spreadsheet error cells / text are treated as missing)
# ---------------------------------------------------------------------------------------------------------------


def table(acc: str, name_part: str) -> Path | None:
    folder = RAW / "psi" / acc
    for p in folder.glob("*Experimental table*"):
        if name_part.lower() in p.name.lower():
            return p
    return None


def conditions_flex() -> dict:
    rows = read_csv_rows(table("PSI-69", "FLEX"))
    o2 = [num(r.get("O initial ambient composition; mole fraction")) for r in rows]
    p = [num(r.get("Ambient pressure; mmHg")) for r in rows]
    dil = set()
    for r in rows:
        if (num(r.get("CO initial ambient composition; mole fraction")) or 0) > 0:
            dil.add("CO2")
        if (num(r.get("He initial ambient composition; mole fraction")) or 0) > 0:
            dil.add("He")
        if (num(r.get("N initial ambient composition; mole fraction")) or 0) > 0:
            dil.add("N2")
    fuels = sorted({r["Fuel"].strip() for r in rows if r.get("Fuel", "").strip()})
    return {
        "o2Percent": rng([v * 100 for v in o2 if v is not None], "initial ambient O2 mole fraction × 100"),
        "pressureKpa": rng([v * MMHG_TO_KPA for v in p if v is not None], "converted from mmHg"),
        "gravityG": {"min": 0, "max": 0, "note": "ISS microgravity"},
        "diluent": sorted(dil),
        "_fuels": fuels,
        "_tests": len(rows),
    }


def conditions_flex2() -> dict:
    rows = read_csv_rows(table("PSI-68", "Flex2"))
    fuels = [r["Sample (Fuel Type)"].strip() for r in rows if r.get("Sample (Fuel Type)", "").strip()]
    return {
        "o2Percent": {"min": 17.0, "max": 30.0, "note": "O2 mole fraction values 0.17–0.30 listed in the PSI table"},
        "pressureKpa": {"min": round(0.5 * ATM_TO_KPA, 1), "max": round(3.0 * ATM_TO_KPA, 1), "note": "0.5–3.0 atm"},
        "flowCmS": {"min": 0.1, "max": 5.0, "note": "flow velocity range listed in the PSI table"},
        "gravityG": {"min": 0, "max": 0, "note": "ISS microgravity"},
        "diluent": ["N2", "He"],
        "_fuels": fuels,
    }


def conditions_cfi() -> dict:
    rows = read_csv_rows(table("PSI-39", "CFI"))
    o2 = [num(r.get("Oxygen")) for r in rows]
    p = [num(r.get("Pressure")) for r in rows]
    he = any((num(r.get("Helium")) or 0) > 0 for r in rows)
    fuels = sorted({r.get("Fuel ", r.get("Fuel", "")).strip() for r in rows if r.get("Fuel ", r.get("Fuel", "")).strip()})
    return {
        "o2Percent": rng([v * 100 for v in o2 if v is not None], "O2 mole fraction × 100"),
        "pressureKpa": rng([v * ATM_TO_KPA for v in p if v is not None], "converted from atm"),
        "gravityG": {"min": 0, "max": 0, "note": "ISS microgravity"},
        "diluent": ["N2"] + (["He"] if he else []),
        "_fuels": fuels,
        "_tests": len(rows),
    }


def conditions_bass2() -> dict:
    rows = read_csv_rows(table("PSI-25", "BASS-II"))
    o2 = [num(r.get("Calibrated  initial O2 % by vol ")) for r in rows]
    o2 = [v for v in o2 if v is not None and 5 < v < 30]
    return {
        "o2Percent": rng(o2, "calibrated initial O2 (% by volume) from the PSI experimental table"),
        "flowCmS": {"min": 0, "max": 53, "note": "wind tunnel up to 53 cm/s (NTRS 20160000593); PSI metadata states up to 40 cm/s"},
        "gravityG": {"min": 0, "max": 0, "note": "ISS microgravity"},
        "diluent": ["N2"],
        "_tests": len(rows),
    }


def conditions_flame_design() -> dict:
    o2, p = [], []
    for part in ("Normal Flame", "Inverse Flame"):
        path = table("PSI-10", part)
        if not path:
            continue
        for r in read_csv_rows(path):
            o2.append(num(r.get("XO2 (init)")))
            p.append(num(r.get("pmean (atm)")))
    return {
        "o2Percent": rng([v * 100 for v in o2 if v is not None and v < 1.0], "initial O2 mole fraction × 100"),
        "pressureKpa": rng([v * ATM_TO_KPA for v in p if v is not None], "mean chamber pressure, converted from atm"),
        "gravityG": {"min": 0, "max": 0, "note": "ISS microgravity"},
        "diluent": ["N2"],
    }


def conditions_cfi_g() -> dict:
    o2, p, fuels, years = [], [], set(), []
    for part in ("Normal Flames", "Inverse Flames"):
        path = table("PSI-159", part)
        if not path:
            continue
        for r in read_csv_rows(path):
            o2.append(num(r.get(" XO2 before test")))
            p.append(num(r.get("approx p (bar)")))
            if r.get("Fuel", "").strip():
                fuels.add(r["Fuel"].strip())
            code = re.match(r"\s*(\d{2})(\d{3})", r.get("Test", "") or "")
            if code and 1 <= int(code.group(2)) <= 366:
                years.append(2000 + int(code.group(1)))
    return {
        "o2Percent": rng([v * 100 for v in o2 if v is not None and v < 1.0], "O2 mole fraction before test × 100"),
        "pressureKpa": rng([v * BAR_TO_KPA for v in p if v is not None], "converted from bar"),
        "gravityG": {"min": 0, "max": 0, "note": "ISS microgravity"},
        "_fuels": sorted(fuels),
        "_years": {"start": min(years), "end": max(years)} if years else None,
    }


# ---------------------------------------------------------------------------------------------------------------
# Curated experiment table (text paraphrased from the cited PSI metadata / NTRS abstracts)
# ---------------------------------------------------------------------------------------------------------------

MICRO = {"min": 0, "max": 0, "note": "ISS microgravity"}
LOW_G_CYGNUS = {"min": 0, "max": 0, "note": "orbiting Cygnus spacecraft (microgravity)"}


def curated(details: dict) -> list[dict]:
    flex = conditions_flex()
    flex2 = conditions_flex2()
    cfi = conditions_cfi()
    bass2 = conditions_bass2()
    fd = conditions_flame_design()
    cfig = conditions_cfi_g()

    def strip(c: dict) -> dict:
        return {k: v for k, v in c.items() if not k.startswith("_") and v}

    E = []

    E.append(dict(
        id="bass", psi="PSI-26", acronym="BASS", category=["solid", "suppression"], platform="ISS",
        facility="Microgravity Science Glovebox (MSG)",
        fuels=["Cotton-fiberglass fabric (SIBAL)", "PMMA (spheres, slabs, cylinders)", "Nomex fabric", "Ultem"],
        conditions={"flowCmS": {"min": 0, "max": 40, "note": "variable-speed fan, up to 40 cm/s"}, "gravityG": MICRO, "diluent": ["N2"]},
        conditionsSourceIds=["psi-26"],
        summaryPlain="BASS burned fabric and plastic samples inside a small wind tunnel on the ISS to see how solid materials catch fire, spread flame and go out when air drifts past them slowly. It also tested whether blowing in an inert gas puts those flames out.",
        whyItMatters="NASA qualifies cabin materials with a 1 g test; BASS checks whether that test is conservative when the air only moves because fans move it, and whether inert-gas suppression works on real material shapes.",
        extraSources=["ntrs-20150008962"],
    ))
    E.append(dict(
        id="bass-ii", psi="PSI-25", acronym="BASS-II", category=["solid"], platform="ISS",
        facility="Microgravity Science Glovebox (MSG)",
        fuels=["PMMA (films, slabs, rods, spheres)", "Cotton-fiberglass fabric (SIBAL)", "Nomex", "Wax candle"],
        conditions=strip(bass2), conditionsSourceIds=["psi-25", "psi-25-experimental-table-bass-ii", "ntrs-20160000593"],
        summaryPlain="BASS-II burned thin and thick samples — acrylic slabs, rods, spheres and fabric — while the crew turned the air speed and the oxygen level up and down, mapping when flames grow, spread, shrink or go out.",
        whyItMatters="It measured the low-speed and low-oxygen limits where solid materials stop burning in microgravity — the data needed to judge whether 1 g material screening is conservative in space.",
        extraSources=["ntrs-20160000593", "ntrs-20150008962", "ntrs-20160012691", "ntrs-20170006615", "ntrs-20150019858"],
        _tests=bass2.get("_tests"),
    ))
    E.append(dict(
        id="flex", psi="PSI-69", acronym="FLEX", category=["droplet", "suppression"], platform="ISS",
        facility="Combustion Integrated Rack (CIR), Multi-user Droplet Combustion Apparatus (MDCA)",
        fuels=flex["_fuels"], conditions=strip(flex), conditionsSourceIds=["psi-69", "psi-69-experimental-table-flex"],
        summaryPlain="FLEX lit single fuel droplets a few millimetres across in the ISS combustion chamber and slowly lowered the oxygen or added carbon dioxide or helium to find the point where the flame can no longer survive.",
        whyItMatters="It tells designers how much inert gas or how little oxygen is needed to stop a liquid-fuel fire in weightlessness, and it revealed cool flames that keep burning after the visible flame goes out.",
        extraSources=["ntrs-20150023456", "ntrs-20130014061", "ntrs-20090014812", "ntrs-20210022617"],
    ))
    E.append(dict(
        id="flex-2", psi="PSI-68", acronym="FLEX-2", category=["droplet"], platform="ISS",
        facility="Combustion Integrated Rack (CIR), Multi-user Droplet Combustion Apparatus (MDCA)",
        fuels=flex2["_fuels"], conditions=strip(flex2), conditionsSourceIds=["psi-68", "psi-68-experimental-table-flex2"],
        summaryPlain="FLEX-2 extended FLEX to fuel mixtures, droplet pairs and slowly moving droplets, across pressures from half to three atmospheres, to build benchmark data for computer models of burning liquid fuels.",
        whyItMatters="Validated droplet-burning models underpin predictions of how spilled or sprayed liquids would burn in a cabin; FLEX-2 also probed how droplets interact and when flames go out.",
        extraSources=["ntrs-20210022617"],
    ))
    E.append(dict(
        id="cfi", psi="PSI-39", acronym="CFI", category=["droplet"], platform="ISS",
        facility="Combustion Integrated Rack (CIR), Multi-User Droplet Combustion Apparatus (MDCA)",
        fuels=cfi["_fuels"] or ["n-dodecane"], conditions=strip(cfi), conditionsSourceIds=["psi-39", "psi-39-experimental-table-cfi"],
        summaryPlain="The Cool Flames Investigation burned droplets of n-dodecane and related fuels at different pressures and with helium dilution to study cool flames — faint, low-temperature flames that are hard to see and easy to miss.",
        whyItMatters="Cool flames can persist after a visible flame is gone, so detection and extinguishment strategies need to account for them; the data also test chemistry models used across combustion safety.",
        extraSources=["ntrs-20210022617"],
        _tests=cfi.get("_tests"),
    ))
    E.append(dict(
        id="saffire-i", psi="PSI-98", acronym="Saffire-I", category=["solid", "large-scale"], platform="Cygnus",
        facility="Saffire flow unit in the Cygnus pressurized cargo module (after departing the ISS)",
        fuels=["Cotton-fiberglass fabric (SIBAL), 94 × 40.6 cm"],
        conditions={"o2Percent": {"min": 21.5, "max": 21.7, "note": "PSI experimental table"}, "flowCmS": {"min": 20, "max": 20}, "gravityG": LOW_G_CYGNUS},
        conditionsSourceIds=["psi-98", "psi-98-experimental-table-saffire-1"],
        years={"start": 2016}, yearsNote="Launched 22 March 2016 on Cygnus OA-6 (NTRS 20170000230). PSI metadata lists 2001–2008, which appears to duplicate the SAME record.",
        summaryPlain="Saffire-I set the first large fire ever lit on purpose inside a spacecraft — a fabric sheet almost a metre long, burned in an empty cargo ship after it left the ISS, with and against the airflow.",
        whyItMatters="Earlier space tests used samples around 15 cm long; fires do not scale linearly, so this was the first look at how a realistic-size fire grows in a real vehicle.",
        extraSources=["ntrs-20170008805", "ntrs-20170001636", "ntrs-20170000230", "ntrs-20170002628"],
    ))
    E.append(dict(
        id="saffire-ii", psi="PSI-99", acronym="Saffire-II", category=["solid", "large-scale"], platform="Cygnus",
        facility="Saffire flow unit in the Cygnus pressurized cargo module",
        fuels=["Silicone", "Cotton-fiberglass fabric (SIBAL)", "PMMA (flat and structured)", "PMMA with Nomex"],
        conditions={"o2Percent": {"min": 21.5, "max": 22.1, "note": "approximate, derived from CO2 production per PSI table note"}, "flowCmS": {"min": 20, "max": 30, "note": "20 or 30 cm/s depending on sample"}, "gravityG": LOW_G_CYGNUS},
        conditionsSourceIds=["psi-99", "psi-99-experimental-table-saffire-2"],
        summaryPlain="Saffire-II burned nine different material samples in the same orbiting cargo ship and compared how far each spread in weightlessness with how it behaved in the standard 1 g screening test.",
        whyItMatters="It directly checks NASA's material-screening assumptions on real spacecraft materials such as silicone, acrylic and Nomex.",
        extraSources=["ntrs-20170008805", "ntrs-20200000557", "ntrs-20170001636", "ntrs-20170000230"],
    ))
    E.append(dict(
        id="saffire-iii", psi="PSI-100", acronym="Saffire-III", category=["solid", "large-scale"], platform="Cygnus",
        facility="Saffire flow unit in the Cygnus pressurized cargo module",
        fuels=["Cotton-fiberglass fabric (SIBAL)"],
        conditions={"flowCmS": {"min": 30, "max": 30}, "gravityG": LOW_G_CYGNUS},
        conditionsSourceIds=["psi-100", "psi-100-experimental-table-saffire-3"],
        summaryPlain="Saffire-III repeated the large fabric burn of Saffire-I at a faster airflow of 30 cm/s, spreading both with and against the flow.",
        whyItMatters="Comparing the two flights shows how cabin ventilation speed changes how fast a large fire grows.",
        extraSources=["ntrs-20170001636", "ntrs-20170000230"],
    ))
    E.append(dict(
        id="saffire-iv-vi", psi=None, acronym="Saffire IV–VI", fullName="Spacecraft Fire Experiments IV, V and VI",
        category=["solid", "large-scale"], platform="Cygnus",
        facility="Saffire flow unit + far-field diagnostics in the Cygnus vehicle",
        fuels=["PMMA (5 mm 1-sided, 10 mm 2-sided, structured)", "Cotton fabric", "Cotton-fiberglass fabric (SIBAL)", "Nomex"],
        conditions={"o2Percent": {"min": 22, "max": 31, "note": "O2 mole fraction 0.22–0.31 across flights (Table 1, NTRS 20260001992)"},
                    "pressureKpa": {"min": 54.1, "max": 100.0, "note": "541–1000 mbar across flights (Table 1, NTRS 20260001992)"},
                    "flowCmS": {"min": 5, "max": 20, "note": "20 cm/s opposed flow, reduced to 5 cm/s near test end"},
                    "gravityG": LOW_G_CYGNUS},
        conditionsSourceIds=["ntrs-20260001992", "ntrs-20210017785"],
        years={"start": 2020}, yearsNote="Saffire IV flew May 2020 (NG-13) and Saffire V January 2021 (NG-14) per NTRS 20210011521; the Saffire VI flight date is not stated in the collected sources (results published 2024).",
        agencies=["NASA"],
        objectives="Observe the growth and spread of realistic fires over thin and thick solid samples at current and anticipated exploration atmospheres; assess the impact of the fire on the spacecraft and the transport of heat and smoke; demonstrate combustion-product measurement and post-fire cleanup systems.",
        summaryPlain="The last three Saffire flights burned larger acrylic and fabric samples inside Cygnus, lowered the cabin pressure and raised the oxygen to mimic planned exploration atmospheres, and measured the heat, carbon monoxide, carbon dioxide and smoke that spread through the whole vehicle.",
        whyItMatters="These are the only data on what a realistic fire does to an entire spacecraft cabin — and they show the toxic gases and smoke, not heat or pressure, become the first hazard.",
        sourceIds=["ntrs-20210011521", "ntrs-20240002981", "ntrs-20260001992", "ntrs-20220002714", "ntrs-20210017785", "ntrs-20170000230"],
        hasRawData=False, kind="flight",
    ))
    E.append(dict(
        id="acme-s-flame", psi="PSI-23", acronym="ACME s-Flame", category=["gaseous-nonpremixed"], platform="ISS",
        facility="Combustion Integrated Rack (CIR), ACME hardware",
        fuels=["Hydrogen", "Methane", "Ethylene", "Mixtures with N2 / He / CO2 diluents"],
        conditions={"o2Percent": {"min": 21, "max": 30, "note": "~21% and ~30% O2 atmospheres (PSI table)"}, "gravityG": MICRO, "diluent": ["N2", "He", "CO2"]},
        conditionsSourceIds=["psi-23", "psi-23-experimental-table-acme-s-flame"],
        summaryPlain="s-Flame fed gas through a small porous sphere to make perfectly round flames, then watched how they grow, pulse and eventually go out as heat escapes by radiation.",
        whyItMatters="Spherical flames are the simplest test of the chemistry and radiation models that predict when any flame extinguishes on its own.",
        extraSources=["ntrs-20210022542"],
    ))
    E.append(dict(
        id="acme-bre", psi="PSI-20", acronym="ACME BRE", category=["gaseous-nonpremixed", "solid"], platform="ISS",
        facility="Combustion Integrated Rack (CIR), ACME hardware",
        fuels=["Methane", "Ethylene (with N2 dilution) emulating condensed fuels such as PMMA and Nylon"],
        conditions={"o2Percent": {"min": 21, "max": 40, "note": "approximate O2 levels of ignited tests (PSI table)"},
                    "pressureKpa": {"min": round(8.2 * PSIA_TO_KPA, 1), "max": round(14.7 * PSIA_TO_KPA, 1), "note": "exploration atmospheres 8.2, 10.2 and 14.7 psia named in PSI objectives"},
                    "gravityG": MICRO},
        conditionsSourceIds=["psi-20", "psi-20-experimental-table-acme-bre"],
        summaryPlain="The Burning Rate Emulator is a gas burner tuned to behave like a burning solid, so it can stand in for plastics such as acrylic or nylon and show whether they would keep burning in still air in space.",
        whyItMatters="Turning off ventilation is a standard step in fighting a spacecraft fire; BRE tested whether flames survive without airflow in the higher-oxygen atmospheres planned for exploration.",
        extraSources=["ntrs-20170009141", "ntrs-20210022542"],
    ))
    E.append(dict(
        id="acme-cld", psi="PSI-21", acronym="ACME CLD Flame", category=["gaseous-nonpremixed"], platform="ISS",
        facility="Combustion Integrated Rack (CIR), ACME hardware",
        fuels=["Methane", "Ethylene (N2-diluted)"],
        conditions={"gravityG": MICRO, "diluent": ["N2"]}, conditionsSourceIds=["psi-21"],
        summaryPlain="CLD Flame studied weak, heavily diluted gas flames surrounded by a slow stream of air, measuring their shape, temperature, soot and where they lift off or go out.",
        whyItMatters="Soot and extinction models validated here feed the fire and smoke simulations used to design spacecraft fire detection.",
        extraSources=["ntrs-20210022542"],
    ))
    E.append(dict(
        id="acme-e-field", psi="PSI-22", acronym="ACME E-FIELD Flames", category=["gaseous-nonpremixed"], platform="ISS",
        facility="Combustion Integrated Rack (CIR), ACME hardware",
        fuels=["Methane", "Ethylene (N2-diluted)"],
        conditions={"gravityG": MICRO, "diluent": ["N2"]}, conditionsSourceIds=["psi-22"],
        summaryPlain="E-FIELD Flames placed a high-voltage mesh above small gas flames to see how an electric field pushes ions around and changes flame shape, soot and stability.",
        whyItMatters="PSI notes it was not aimed at space applications, but electric-field control of flames could one day help manage combustion devices such as waste processors.",
        extraSources=["ntrs-20210022542"],
    ))
    E.append(dict(
        id="acme-flame-design", psi="PSI-10", acronym="ACME Flame Design", category=["gaseous-nonpremixed"], platform="ISS",
        facility="Combustion Integrated Rack (CIR), ACME hardware",
        fuels=["Ethylene", "Methane"], conditions=strip(fd), conditionsSourceIds=["psi-10", "psi-10-experimental-table-flame-design-normal-flame"],
        summaryPlain="Flame Design made round 'normal' and 'inverse' flames (fuel into air, or air into fuel) to find when soot starts to form and when the flames go out.",
        whyItMatters="Knowing the limits of soot formation and extinction helps predict smoke production and self-extinguishment of fires.",
        extraSources=["ntrs-20210022542"],
    ))
    E.append(dict(
        id="acme-cfi-g", psi="PSI-159", acronym="ACME CFI-G", category=["gaseous-nonpremixed"], platform="ISS",
        facility="Combustion Integrated Rack (CIR), ACME hardware",
        fuels=cfig["_fuels"] or ["Propane", "n-butane", "n-pentane"], conditions=strip(cfig),
        conditionsSourceIds=["psi-159", "psi-159-experimental-table-cfi-g-normal-flames"],
        years=cfig["_years"], yearsNote="Derived from the YYDDD test codes in the PSI experimental tables.",
        summaryPlain="CFI-G tried to create steady cool flames from gaseous fuels on a spherical burner, and to find when they go out or flip into ordinary hot flames.",
        whyItMatters="Cool flames are hard to see; understanding when they appear and transition matters for detecting smouldering, low-temperature reactions.",
        extraSources=["ntrs-20210022542"],
    ))
    E.append(dict(
        id="same", psi="PSI-102", acronym="SAME", category=["smoke"], platform="ISS",
        facility="Microgravity Science Glovebox (MSG)",
        fuels=["Spacecraft materials heated below ignition (e.g. Teflon, Kapton, cotton lampwick, silicone rubber)", "Dibutyl phthalate (DBP)"],
        conditions={"gravityG": MICRO}, conditionsSourceIds=["psi-102"],
        summaryPlain="SAME heated common spacecraft materials until they smoked — without flaming — and measured the smoke particles and how two kinds of smoke detector responded.",
        whyItMatters="Smoke detectors are tuned on Earth; if microgravity smoke is made of different-sized particles, a detector could miss a real fire.",
        extraSources=["ntrs-20130000422"],
    ))
    E.append(dict(
        id="same-r", psi="PSI-101", acronym="SAME-R", category=["smoke"], platform="ISS",
        facility="Microgravity Science Glovebox (MSG)",
        fuels=["Teflon", "Kapton", "Cotton", "Silicone rubber", "Pyrell foam"],
        conditions={"flowCmS": {"min": 0, "max": 8, "note": "quiescent to 8 cm/s during heating (NTRS 20130000422)"}, "gravityG": MICRO},
        conditionsSourceIds=["psi-101", "ntrs-20130000422"],
        summaryPlain="The SAME reflight repeated the smoke tests with a new foam material, hotter heating, no-flow cases and better instruments, completing 66 test points in 2010.",
        whyItMatters="It produced the particle-size data needed to design next-generation spacecraft smoke detectors.",
        extraSources=["ntrs-20130000422"],
    ))
    E.append(dict(
        id="spice", psi="PSI-107", acronym="SPICE", category=["gaseous-nonpremixed", "smoke"], platform="ISS",
        facility="Microgravity Science Glovebox (MSG)",
        fuels=["Methane", "Ethylene", "Propane", "Propylene", "Propylene mixtures"],
        conditions={"flowCmS": {"min": 5.4, "max": 65, "note": "co-flow air velocity (PSI approach)"}, "gravityG": MICRO},
        conditionsSourceIds=["psi-107"],
        years={"start": 2009, "end": 2009}, yearsNote="SPICE tests ran in the ISS MSG from February through June 2009 (PSI-107 SPICE final report).",
        summaryPlain="SPICE turned up the fuel on small jet flames until they began to release smoke — the 'smoke point' — across 526 flames with different nozzles and airflows.",
        whyItMatters="Smoke points measure how sooty a fuel is; they feed the smoke-production models used to size spacecraft fire detection.",
        extraSources=[],
    ))
    E.append(dict(
        id="slice", psi="PSI-106", acronym="SLICE", category=["gaseous-nonpremixed"], platform="ISS",
        facility="Microgravity Science Glovebox (MSG)",
        fuels=["Methane", "Ethylene", "Ethane", "Propane", "N2-diluted mixtures"],
        conditions={"gravityG": MICRO, "diluent": ["N2"]}, conditionsSourceIds=["psi-106", "psi-106-experimental-table-slice"],
        years={"start": 2012, "end": 2012}, yearsNote="Test dates February–March 2012 from the PSI experimental table.",
        summaryPlain="SLICE studied small gas flames in a gentle co-flow of air to find how fast the air can move before the flame lifts off the burner and blows out.",
        whyItMatters="Lift-off and blow-out limits describe how ventilation can stabilise or extinguish a flame.",
        extraSources=[],
    ))
    E.append(dict(
        id="daft", psi="PSI-47", acronym="DAFT / DAFT-2", category=["smoke"], platform="ISS",
        facility="Hand-held particle counters (modified TSI P-Trak, DustTrak)",
        fuels=["Arizona Road Dust aerosol (no combustion)"],
        conditions={"gravityG": MICRO}, conditionsSourceIds=["psi-47"],
        summaryPlain="DAFT checked that a modified commercial particle counter would work in weightlessness before it was used to measure smoke in SAME.",
        whyItMatters="Reliable particle counting in microgravity is a prerequisite for validating any spacecraft smoke detector.",
        extraSources=[],
    ))
    E.append(dict(
        id="confined-combustion", psi=None, acronym="Confined Combustion", fullName="Confined Combustion (flame spread between baffles, ISS MSG)",
        category=["solid"], platform="ISS", facility="Microgravity Science Glovebox (MSG), BASS flow duct",
        fuels=["Cotton-fiberglass fabric (SIBAL)"],
        conditions={"o2Percent": {"min": 21.3, "max": 22.9, "note": "daily MSG variation at ISS ambient"}, "pressureKpa": {"min": 101.3, "max": 101.3, "note": "1.0 atm"},
                    "flowCmS": {"min": 0, "max": 55, "note": "duct capability"}, "gravityG": MICRO},
        conditionsSourceIds=["ntrs-20205004657"],
        years={"start": 2020}, yearsNote="Year of the ICES-2020 paper reporting the ISS tests (NTRS 20205004657).",
        agencies=["NASA", "NSF", "CASIS"],
        objectives="Examine the effects of confinement on concurrent, purely forced-flow flame spread over a thin fabric in microgravity, using parallel baffles of different materials and spacings.",
        summaryPlain="Confined Combustion burned fabric strips between two parallel walls on the ISS, changing the gap and the wall material, to see how tight spaces change a fire.",
        whyItMatters="Real spacecraft fires start behind panels and in racks; the tests show confinement can first make a fire bigger, then starve it.",
        sourceIds=["ntrs-20205004657"], hasRawData=False, kind="flight",
    ))
    E.append(dict(
        id="luci", psi=None, acronym="LUCI", fullName="Lunar Combustion Investigation",
        category=["solid"], platform="Sounding rocket", facility="Spinning Blue Origin New Shepard sounding rocket",
        fuels=["Cotton-fiberglass fabric", "PMMA rod (4 mm)"],
        conditions={"gravityG": {"min": 0.166, "max": 0.166, "note": "lunar gravity simulated by vehicle rotation"}, "pressureKpa": {"min": 101.3, "max": 101.3, "note": "air at normal pressure"}},
        conditionsSourceIds=["ntrs-20250010653"],
        years={"start": 2025}, yearsNote="Launched 4 February 2025 (NTRS 20250010653).",
        agencies=["NASA"],
        objectives="Demonstrate material flammability experiments in partial gravity by burning samples for more than 25 seconds in simulated lunar gravity, measuring flame spread, growth and the oxygen level at extinction.",
        summaryPlain="LUCI spun a suborbital rocket so that its experiment felt Moon-like gravity for minutes, and burned a fabric sheet and an acrylic rod — the first long-duration burns ever made in lunar gravity.",
        whyItMatters="Lunar habitats and landers will have fires in one-sixth gravity, where some materials may burn more readily than on Earth; LUCI is the stepping stone to burning samples on the Moon itself.",
        sourceIds=["ntrs-20250010653", "ntrs-20260000646"], hasRawData=False, kind="flight",
    ))
    E.append(dict(
        id="partial-g-centrifuge", psi=None, acronym="ZGF partial-g", fullName="Partial-gravity material flammability tests in the GRC Zero Gravity Facility centrifuge",
        category=["solid"], platform="Drop tower", facility="NASA Glenn Zero Gravity Facility (5.2 s drop) with rotating centrifuge",
        fuels=["Thin charring fuels", "Mylar"],
        conditions={"gravityG": {"min": 0.166, "max": 0.38, "note": "lunar and Martian gravity via centrifuge (0.38 g Earth stated for Mars)"}},
        conditionsSourceIds=["ntrs-20130010991"],
        years={"start": 2012}, yearsNote="Year of the earliest collected report (NTRS 20130010991); later tests reported in NTRS 20250002114.",
        agencies=["NASA"],
        objectives="Determine material flammability limits at Martian and lunar gravity in a drop-tower centrifuge and compare them with the NASA-STD-6001 normal-gravity screening test.",
        summaryPlain="Engineers spun small burning samples inside a drop-tower capsule so that, during five seconds of free fall, they felt Moon or Mars gravity, then compared the lowest oxygen level that supports burning with Earth results.",
        whyItMatters="These tests found that some materials burn at lower oxygen in partial gravity than on Earth — the key reason NASA is revisiting its 1 g material screening for lunar missions.",
        sourceIds=["ntrs-20130010991", "ntrs-20250002114"], hasRawData=False, kind="flight",
    ))
    E.append(dict(
        id="sofie", psi=None, acronym="SoFIE", fullName="Solid Fuel Ignition and Extinction",
        category=["solid", "suppression"], platform="ISS", facility="Combustion Integrated Rack (CIR) insert",
        fuels=["Solid spacecraft materials (varies by investigation)"],
        conditions={"gravityG": MICRO}, conditionsSourceIds=["ntrs-20200000361"],
        years={"start": 2021}, yearsNote="Planned start of ISS operations (July 2021) per the 2019 NTRS presentation 20200000361.",
        agencies=["NASA"],
        objectives="Study ignition and flammability of solid spacecraft materials in practical geometries at oxygen concentrations and pressures representative of NASA exploration atmospheres, including suppression by diluents, flow reduction and venting.",
        summaryPlain="SoFIE is a reusable insert for the ISS combustion rack that lets several research teams ignite real spacecraft materials at different pressures and oxygen levels.",
        whyItMatters="It is the facility built to answer the open questions the earlier experiments raised — especially in exploration atmospheres.",
        sourceIds=["ntrs-20200000361", "nasa-web-why-flames"], hasRawData=False, kind="flight",
    ))

    # Ground investigations that re-analysed PSI flight data
    E.append(dict(id="flex-cool-flame-cfd", psi="PSI-117", acronym="PSI-117 FLEX cool-flame CFD", category=["droplet"], platform="Ground",
                  fuels=["n-alkanes (FLEX data)"], conditions={}, conditionsSourceIds=[],
                  summaryPlain="A ground study that built a 3-D computer model of droplet cool flames and checked it against FLEX flight data.",
                  whyItMatters="Validated cool-flame models help define safe operating envelopes where a flame might linger unseen.", extraSources=[]))
    E.append(dict(id="bass-flame-spread-modeling", psi="PSI-62", acronym="PSI-62 BASS modeling", category=["solid"], platform="Ground",
                  fuels=["PMMA", "Wax"], conditions={}, conditionsSourceIds=[],
                  summaryPlain="A ground study that modelled concurrent flame spread over BASS samples and reconstructed 3-D soot and temperature from flight images.",
                  whyItMatters="Aims to predict flammability limits of new cabin materials without flying every one.", extraSources=[]))
    E.append(dict(id="spice-soot-analysis", psi="PSI-60", acronym="PSI-60 SPICE analysis", category=["gaseous-nonpremixed", "smoke"], platform="Ground",
                  fuels=["Ethylene", "Propane"], conditions={}, conditionsSourceIds=[],
                  summaryPlain="A ground study that extracted soot temperature and amount from 1600+ SPICE flight images and compared them with soot models.",
                  whyItMatters="Better soot models mean better predictions of smoke from a spacecraft fire.", extraSources=[]))
    E.append(dict(id="cool-flame-counterflow", psi="PSI-142", acronym="PSI-142 cool-flame limits", category=["droplet", "gaseous-nonpremixed"], platform="Ground",
                  fuels=["n-heptane", "Dimethyl ether (DME)"], conditions={}, conditionsSourceIds=[],
                  summaryPlain="Ground experiments and simulations with ozone-assisted counterflow flames that map when hot flames turn into cool or warm flames, building on FLEX.",
                  whyItMatters="Explains the unexpected cool flames seen on the ISS and when they can occur.", extraSources=[]))
    E.append(dict(id="same-smoke-modeling", psi="PSI-115", acronym="PSI-115 SAME modeling", category=["smoke"], platform="Ground",
                  fuels=["Dibutyl phthalate (DBP) vapour"], conditions={}, conditionsSourceIds=[],
                  summaryPlain="A ground study that simulated how smoke particles grow near a heated sample with and without gravity, using the SAME geometry.",
                  whyItMatters="Links microgravity smoke-particle size to the airflow around a smouldering source — key for detector design.", extraSources=[]))
    return E


def main() -> int:
    details = load_json(RAW / "psi" / "details-all.json")
    ntrs_meta = {str(x["id"]): x for x in load_json(RAW / "ntrs" / "selected-metadata.json") if "error" not in x}
    web = load_json(RAW / "web" / "why-nasa-studies-flames.json")

    experiments_curated = curated(details)
    acc_to_exp: dict[str, str] = {e["psi"]: e["id"] for e in experiments_curated if e.get("psi")}

    sources: list[dict] = []

    # 1) PSI investigation records
    for acc, d in details.items():
        if "error" in d:
            continue
        acronym = d.get("investigationAcronym") or acc
        sources.append({
            "id": slug(acc),
            "title": f"{fix_text(d.get('title'))} ({acronym}) — NASA PSI investigation record",
            "type": "psi-dataset",
            "url": PSI_URL.format(acc=acc),
            "accessed": ACCESSED,
            "license": d.get("licenseIdentifier") or None,
            "doi": d.get("doi") or None,
            "accession": acc,
            "experimentIds": [acc_to_exp[acc]] if acc in acc_to_exp else [],
            "publisher": "NASA Physical Sciences Informatics",
            "note": "Investigation metadata (objectives, approach, hypothesis, impacts) from the PSI public repository API.",
        })

    # 2) PSI local files (documents + experimental tables)
    for folder in sorted((RAW / "psi").glob("PSI-*")):
        acc = folder.name
        d = details.get(acc, {})
        acronym = d.get("investigationAcronym") or acc
        for f in sorted(folder.iterdir()):
            if f.suffix.lower() not in {".pdf", ".docx", ".csv", ".xlsx", ".xls"}:
                continue
            stem = f.stem[len(acc) + 1 :] if f.stem.startswith(acc + "_") else f.stem
            category, _, name = stem.partition("_")
            is_pres = category.lower().startswith("presentation")
            sid = slug(f"{acc}-{stem}")
            sources.append({
                "id": sid,
                "title": f"{acronym}: {name or stem} ({category})",
                "type": "presentation" if is_pres else "psi-dataset",
                "url": PSI_URL.format(acc=acc),
                "accessed": ACCESSED,
                "license": d.get("licenseIdentifier") or None,
                "doi": d.get("doi") or None,
                "accession": acc,
                "localPath": f.relative_to(ROOT).as_posix(),
                "experimentIds": [acc_to_exp[acc]] if acc in acc_to_exp else [],
                "publisher": "NASA Physical Sciences Informatics",
                "note": f"File '{f.name}' in the PSI '{category}' folder of {acc}. Download from the investigation page.",
            })

    # 3) NTRS
    ntrs_map = {
        "20210011521": ["saffire-iv-vi"], "20240002981": ["saffire-iv-vi"], "20260001992": ["saffire-iv-vi"],
        "20220002714": ["saffire-iv-vi"], "20210017785": ["saffire-iv-vi"],
        "20170008805": ["saffire-i", "saffire-ii", "saffire-iii"], "20170001636": ["saffire-i", "saffire-ii", "saffire-iii"],
        "20170000230": ["saffire-i", "saffire-ii", "saffire-iii", "saffire-iv-vi"], "20170002628": ["saffire-i", "saffire-ii", "saffire-iii", "saffire-iv-vi"],
        "20200000557": ["saffire-ii"],
        "20160000593": ["bass-ii", "bass"], "20150008962": ["bass", "bass-ii"], "20160012691": ["bass-ii"],
        "20170006615": ["bass-ii"], "20150019858": ["bass-ii"], "20205004657": ["confined-combustion"],
        "20150023456": ["flex"], "20210022617": ["flex", "flex-2", "cfi"], "20130014061": ["flex"], "20090014812": ["flex"],
        "20250010653": ["luci"], "20260000646": ["luci", "partial-g-centrifuge"], "20130010991": ["partial-g-centrifuge"],
        "20250002114": ["partial-g-centrifuge"], "20130000422": ["same", "same-r"], "20170009141": ["acme-bre"],
        "20200000361": ["sofie"],
        "20210022542": ["acme-s-flame", "acme-bre", "acme-cld", "acme-e-field", "acme-flame-design", "acme-cfi-g"],
    }
    for nid, x in ntrs_meta.items():
        local = RAW / "ntrs" / f"{nid}.pdf"
        sti = (x.get("stiType") or "").upper()
        year = int(x["date"][:4]) if x.get("date") else None
        doi = x.get("doi")
        if doi and doi.startswith("https://doi.org/"):
            doi = doi[len("https://doi.org/") :]
        if doi and doi.startswith("doi:"):
            doi = doi[4:]
        sources.append({
            "id": f"ntrs-{nid}",
            "title": fix_text(x["title"]),
            "authors": x.get("authors") or None,
            "year": year,
            "type": "presentation" if sti in {"PRESENTATION", "POSTER"} else "ntrs-report",
            "url": f"https://ntrs.nasa.gov/citations/{nid}",
            "accessed": ACCESSED,
            "license": "NTRS public use permitted" if x.get("copyright") == "PUBLIC_USE_PERMITTED" else None,
            "doi": doi or None,
            "accession": nid,
            "localPath": local.relative_to(ROOT).as_posix() if local.exists() else None,
            "experimentIds": ntrs_map.get(nid, []),
            "publisher": x.get("publication") or ("; ".join(x.get("meetings") or []) or "NASA Technical Reports Server"),
            "note": f"NTRS {sti.replace('_', ' ').lower()}",
        })

    # 4) NASA web explainer (text captured with the Playwright browser)
    web_txt = RAW / "web" / "why-nasa-studies-flames.txt"
    text = web["text"]
    start = text.find("Why NASA is studying flames in space\nSpace combustion")
    body = text[start:] if start >= 0 else text
    web_txt.write_text(body.replace("�", "'"), encoding="utf8")
    sources.append({
        "id": "nasa-web-why-flames",
        "title": "Why NASA is studying flames in space",
        "year": int(web["date"][:4]) if web.get("date") else None,
        "type": "nasa-web",
        "url": web["url"],
        "accessed": ACCESSED,
        "localPath": web_txt.relative_to(ROOT).as_posix(),
        "experimentIds": ["flex", "sofie", "saffire-i"],
        "publisher": "NASA Science — Biological and Physical Sciences",
        "note": "Public explainer article.",
    })

    # Clean None values
    sources = [{k: v for k, v in s.items() if v is not None} for s in sources]
    source_ids = {s["id"] for s in sources}

    # Experiments
    experiments = []
    for e in experiments_curated:
        acc = e.get("psi")
        d = details.get(acc, {}) if acc else {}
        if acc:
            start_raw = d.get("investigationStartDate") or ""
            end_raw = d.get("investigationEndDate") or ""
            years = e.get("years") or {}
            if not years:
                sy = num(start_raw[-4:]) if start_raw else None
                ey = num(end_raw[-4:]) if end_raw else None
                if sy:
                    years = {"start": int(sy)}
                    if ey:
                        years["end"] = int(ey)
            if not years:
                # Fall back to the experimental-table test dates for investigations without PSI dates
                years = years_from_table(acc)
            agencies = [a.strip() for a in re.split(r"\s{2,}|,(?![^()]*\))", fix_text(d.get("spaceProgram"))) if a.strip()]
            base_sources = [slug(acc)] + [s["id"] for s in sources if s.get("accession") == acc and s["id"] != slug(acc)]
            sources_all = base_sources + [s for s in e.get("extraSources", []) if s in source_ids]
            pubs = len(d.get("publications", []))
            exp = {
                "id": e["id"],
                "acronym": e["acronym"],
                "fullName": fix_text(d.get("title")),
                "category": e["category"],
                "platform": e["platform"],
                "facility": e.get("facility") or fix_text(d.get("experimentHardware")) or None,
                "years": years,
                "yearsNote": e.get("yearsNote"),
                "agencies": agencies or ["NASA"],
                "fuels": e["fuels"],
                "conditions": e.get("conditions", {}),
                "conditionsSourceIds": e.get("conditionsSourceIds", []),
                "objectives": fix_text(d.get("objective")) or fix_text(d.get("approach")),
                "summaryPlain": e["summaryPlain"],
                "whyItMatters": e["whyItMatters"],
                "psiUrl": PSI_URL.format(acc=acc),
                "psiAccession": acc,
                "doi": d.get("doi") or None,
                "keywords": [],
                "sourceIds": list(dict.fromkeys(sources_all)),
                "hasRawData": any(f.get("s3_path", "").split("/")[2:3] == ["Raw Data"] for f in d.get("added", [])),
                "verified": False,
                "publicationCount": pubs,
                "kind": "ground" if e["platform"] == "Ground" else "flight",
            }
        else:
            exp = {
                "id": e["id"],
                "acronym": e["acronym"],
                "fullName": e["fullName"],
                "category": e["category"],
                "platform": e["platform"],
                "facility": e.get("facility"),
                "years": e["years"],
                "yearsNote": e.get("yearsNote"),
                "agencies": e.get("agencies", ["NASA"]),
                "fuels": e["fuels"],
                "conditions": e.get("conditions", {}),
                "conditionsSourceIds": e.get("conditionsSourceIds", []),
                "objectives": e["objectives"],
                "summaryPlain": e["summaryPlain"],
                "whyItMatters": e["whyItMatters"],
                "keywords": [],
                "sourceIds": [s for s in e["sourceIds"] if s in source_ids],
                "hasRawData": e.get("hasRawData", False),
                "verified": False,
                "kind": e.get("kind", "flight"),
            }
        experiments.append({k: v for k, v in exp.items() if v not in (None, "")})

    # Every source must reference experiments that exist; make experiment → source links bidirectional
    exp_ids = {e["id"] for e in experiments}
    for s in sources:
        s["experimentIds"] = [x for x in s.get("experimentIds", []) if x in exp_ids]
    for e in experiments:
        for sid in e["sourceIds"]:
            s = next(x for x in sources if x["id"] == sid)
            if e["id"] not in s["experimentIds"]:
                s["experimentIds"].append(e["id"])

    (ROOT / "data").mkdir(exist_ok=True)
    (ROOT / "data" / "processed").mkdir(parents=True, exist_ok=True)
    (ROOT / "data" / "sources.json").write_text(json.dumps(sources, ensure_ascii=False, indent=1), encoding="utf8")
    (ROOT / "data" / "processed" / "experiments.json").write_text(json.dumps(experiments, ensure_ascii=False, indent=1), encoding="utf8")
    print(f"sources: {len(sources)}  experiments: {len(experiments)}")
    for e in experiments:
        print(f"  {e['id']:28} {e['platform']:15} {e['years']}  sources={len(e['sourceIds'])}  cond={list(e['conditions'].keys())}")
    return 0


def years_from_table(acc: str) -> dict:
    """Derive a year range from test dates in the PSI experimental table (used only when PSI lists no dates)."""
    years: list[int] = []
    for path in (RAW / "psi" / acc).glob("*Experimental table*.csv"):
        text = path.read_text(encoding="utf-8-sig", errors="replace")
        for m in re.finditer(r"\b(20[0-2]\d)\b", text):
            years.append(int(m.group(1)))
        for m in re.finditer(r"\b\d{1,2}-[A-Za-z]{3}-(\d{2})\b", text):
            years.append(2000 + int(m.group(1)))
        for m in re.finditer(r"(?<![\d.])(1[0-9]|2[0-5])(\d{3})(?![\d.])", text):
            # YYDDD test-day codes used by ACME tables
            ddd = int(m.group(2))
            if 1 <= ddd <= 366 and "Test Day" in text:
                years.append(2000 + int(m.group(1)))
    years = [y for y in years if 1995 <= y <= 2026]
    if not years:
        return {"start": 0}
    return {"start": min(years), "end": max(years)}


if __name__ == "__main__":
    sys.exit(main())
