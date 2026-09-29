"""
EMBER · extract_pdf.py
Turn every local source document listed in data/sources.json into page-aware text chunks.

  PDF  -> PyMuPDF (fitz) per-page text
  DOCX -> word/document.xml paragraphs (single pseudo-page, page = None)
  TXT  -> captured web page text (single pseudo-page, page = None)
  PSI metadata sources (no local file) -> investigation description text from data/raw/psi/details-all.json

Chunks are ~350 tokens with a 60-token overlap and never cross a page boundary, so every chunk keeps
an exact page number for citations. Token counts are an approximation: words x 1.3.

Outputs
  data/interim/text/<sourceId>.json   [{page, text}]
  data/processed/chunks.json          [{id, sourceId, experimentIds, page, text, tokens}]

Usage (PowerShell):  python scripts/py/extract_pdf.py
"""

from __future__ import annotations

import json
import re
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree

import fitz  # PyMuPDF

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "data" / "raw"
INTERIM = ROOT / "data" / "interim" / "text"
PROCESSED = ROOT / "data" / "processed"

CHUNK_TOKENS = 350
OVERLAP_TOKENS = 60
TOKENS_PER_WORD = 1.3
MIN_PAGE_WORDS = 25

WORDS_PER_CHUNK = int(CHUNK_TOKENS / TOKENS_PER_WORD)  # ≈ 269 words
OVERLAP_WORDS = int(OVERLAP_TOKENS / TOKENS_PER_WORD)  # ≈ 46 words


def clean(text: str) -> str:
    """Normalise whitespace and re-join words hyphenated across line breaks."""
    text = text.replace("­", "")  # soft hyphen
    text = re.sub(r"(\w)-\n(\w)", r"\1\2", text)
    text = text.replace("ﬁ", "fi").replace("ﬂ", "fl")
    text = re.sub(r"[ \t\r\f\v]+", " ", text)
    text = re.sub(r"\s*\n\s*", "\n", text)
    text = re.sub(r"\n{2,}", "\n", text)
    return text.strip()


def pdf_pages(path: Path) -> list[dict]:
    pages = []
    with fitz.open(path) as doc:
        for i, page in enumerate(doc, start=1):
            text = clean(page.get_text("text"))
            if len(text.split()) >= MIN_PAGE_WORDS:
                pages.append({"page": i, "text": text})
    return pages


def docx_pages(path: Path) -> list[dict]:
    ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
    with zipfile.ZipFile(path) as z:
        root = ElementTree.fromstring(z.read("word/document.xml"))
    paras = []
    for p in root.iter(f"{{{ns['w']}}}p"):
        runs = [t.text or "" for t in p.iter(f"{{{ns['w']}}}t")]
        line = "".join(runs).strip()
        if line:
            paras.append(line)
    text = clean("\n".join(paras))
    return [{"page": None, "text": text}] if len(text.split()) >= MIN_PAGE_WORDS else []


PSI_FIELDS = [
    ("Objectives", "objective"),
    ("Approach", "approach"),
    ("Hypothesis", "hypothesis"),
    ("Research impacts / Earth benefits", "researchImpacts"),
]


def psi_metadata_pages(accession: str, details: dict) -> list[dict]:
    d = details.get(accession)
    if not d or "error" in d:
        return []
    parts = [f"{d.get('title', '')} ({d.get('investigationAcronym', '')}) — NASA PSI {accession}."]
    for label, key in PSI_FIELDS:
        value = (d.get(key) or "").strip()
        if value:
            parts.append(f"{label}: {value}")
    text = clean("\n".join(parts).replace("�", "'"))
    return [{"page": None, "text": text}] if len(text.split()) >= MIN_PAGE_WORDS else []


def chunk_page(source_id: str, experiment_ids: list[str], page: int | None, text: str, start_index: int) -> list[dict]:
    words = text.split()
    chunks = []
    step = WORDS_PER_CHUNK - OVERLAP_WORDS
    i = 0
    n = start_index
    while i < len(words):
        window = words[i : i + WORDS_PER_CHUNK]
        # Skip a tiny trailing window that is fully contained in the previous overlap
        if chunks and len(window) <= OVERLAP_WORDS:
            break
        body = " ".join(window)
        page_tag = f"p{page}" if page is not None else "p0"
        chunks.append(
            {
                "id": f"{source_id}:{page_tag}:c{n}",
                "sourceId": source_id,
                "experimentIds": experiment_ids,
                **({"page": page} if page is not None else {}),
                "text": body,
                "tokens": max(1, round(len(window) * TOKENS_PER_WORD)),
            }
        )
        n += 1
        i += step
    return chunks


def main() -> int:
    sources = json.loads((ROOT / "data" / "sources.json").read_text(encoding="utf8"))
    details_path = RAW / "psi" / "details-all.json"
    details = json.loads(details_path.read_text(encoding="utf8")) if details_path.exists() else {}
    INTERIM.mkdir(parents=True, exist_ok=True)
    PROCESSED.mkdir(parents=True, exist_ok=True)

    all_chunks: list[dict] = []
    report = []
    for s in sources:
        sid = s["id"]
        exp_ids = s.get("experimentIds", [])
        local = s.get("localPath")
        pages: list[dict] = []
        if local:
            path = ROOT / local
            if not path.exists():
                report.append((sid, "MISSING FILE", local))
                continue
            suffix = path.suffix.lower()
            try:
                if suffix == ".pdf":
                    pages = pdf_pages(path)
                elif suffix == ".docx":
                    pages = docx_pages(path)
                elif suffix == ".txt":
                    text = clean(path.read_text(encoding="utf8"))
                    pages = [{"page": None, "text": text}] if len(text.split()) >= MIN_PAGE_WORDS else []
                else:
                    report.append((sid, "skipped (not text)", suffix))
                    continue
            except Exception as exc:  # corrupt or encrypted document
                report.append((sid, "ERROR", str(exc)[:120]))
                continue
        elif s["type"] == "psi-dataset" and s.get("accession", "").startswith("PSI-"):
            pages = psi_metadata_pages(s["accession"], details)
        else:
            continue

        (INTERIM / f"{sid}.json").write_text(json.dumps(pages, ensure_ascii=False, indent=1), encoding="utf8")
        before = len(all_chunks)
        idx = 0
        for p in pages:
            new = chunk_page(sid, exp_ids, p["page"], p["text"], idx)
            idx += len(new)
            all_chunks.extend(new)
        report.append((sid, f"{len(pages)} pages", f"{len(all_chunks) - before} chunks"))

    (PROCESSED / "chunks.json").write_text(json.dumps(all_chunks, ensure_ascii=False, indent=1), encoding="utf8")
    for row in report:
        print(" | ".join(str(x) for x in row))
    print(f"TOTAL chunks: {len(all_chunks)}  tokens: {sum(c['tokens'] for c in all_chunks)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
