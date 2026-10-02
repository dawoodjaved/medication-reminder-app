#!/usr/bin/env python3
"""
Create (if needed) the Appwrite `doctors` collection and upload cleaned doctors.

Requires:
  APPWRITE_API_KEY   — API key with databases write access
Optional:
  APPWRITE_ENDPOINT  (default https://fra.cloud.appwrite.io/v1)
  APPWRITE_PROJECT_ID (default from app config)
  APPWRITE_DATABASE_ID (default medrem_db)
  APPWRITE_DOCTORS_COLLECTION (default doctors)
  DOCTORS_JSONL path (default assets/pakistan_doctors_clean.jsonl)
  UPLOAD_LIMIT (default 0 = all)
  SKIP_SCHEMA=1 to skip attribute/index creation
  DRY_RUN=1 to only print counts

Usage:
  export APPWRITE_API_KEY=your_key
  python3 scripts/upload_doctors_appwrite.py
"""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JSONL = Path(os.environ.get("DOCTORS_JSONL", ROOT / "assets" / "pakistan_doctors_clean.jsonl"))

ENDPOINT = os.environ.get("APPWRITE_ENDPOINT", "https://fra.cloud.appwrite.io/v1").rstrip("/")
PROJECT = os.environ.get("APPWRITE_PROJECT_ID", "6abac4d80027b9f5ed92")
DATABASE = os.environ.get("APPWRITE_DATABASE_ID", "medrem_db")
COLLECTION = os.environ.get("APPWRITE_DOCTORS_COLLECTION", "doctors")
API_KEY = os.environ.get("APPWRITE_API_KEY", "").strip()

UPLOAD_LIMIT = int(os.environ.get("UPLOAD_LIMIT", "0") or "0")
SKIP_SCHEMA = os.environ.get("SKIP_SCHEMA", "").strip() in {"1", "true", "yes"}
DRY_RUN = os.environ.get("DRY_RUN", "").strip() in {"1", "true", "yes"}
BATCH_SLEEP = float(os.environ.get("BATCH_SLEEP", "0.05"))


def headers() -> dict:
    if not API_KEY:
        raise SystemExit(
            "Missing APPWRITE_API_KEY.\n"
            "Create a key in Appwrite Console → Overview → API Keys "
            "(scopes: databases.read, databases.write) and export it."
        )
    return {
        "Content-Type": "application/json",
        "X-Appwrite-Project": PROJECT,
        "X-Appwrite-Key": API_KEY,
    }


def req(method: str, path: str, body: dict | None = None, ok: set[int] | None = None):
    ok = ok or {200, 201}
    url = f"{ENDPOINT}{path}"
    data = None if body is None else json.dumps(body).encode("utf-8")
    request = urllib.request.Request(url, data=data, headers=headers(), method=method)
    try:
        with urllib.request.urlopen(request, timeout=60) as resp:
            raw = resp.read().decode("utf-8")
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        try:
            payload = json.loads(raw) if raw else {}
        except Exception:
            payload = {"message": raw}
        if e.code in (ok or set()):
            return e.code, payload
        type_ = payload.get("type") or ""
        # Treat already-exists as success for idempotent schema setup
        if e.code == 409 or "already exists" in str(payload).lower():
            return e.code, payload
        raise SystemExit(f"{method} {path} → {e.code}: {payload}") from None


def ensure_collection() -> None:
    print(f"Ensuring collection `{COLLECTION}` in `{DATABASE}`…")
    status, _ = req(
        "POST",
        f"/databases/{DATABASE}/collections",
        {
            "collectionId": COLLECTION,
            "name": "Doctors",
            "permissions": ['read("any")'],
            "documentSecurity": False,
            "enabled": True,
        },
        ok={200, 201, 409},
    )
    print(f"  collection status={status}")


def create_attr(kind: str, body: dict) -> None:
    key = body["key"]
    status, payload = req(
        "POST",
        f"/databases/{DATABASE}/collections/{COLLECTION}/attributes/{kind}",
        body,
        ok={200, 201, 202, 409},
    )
    msg = payload.get("message") or payload.get("key") or ""
    print(f"  attr {kind}:{key} → {status} {msg}")


def create_index(key: str, typ: str, attrs: list[str], orders: list[str] | None = None) -> None:
    body = {"key": key, "type": typ, "attributes": attrs}
    if orders:
        body["orders"] = orders
    status, payload = req(
        "POST",
        f"/databases/{DATABASE}/collections/{COLLECTION}/indexes",
        body,
        ok={200, 201, 202, 409},
    )
    print(f"  index {key} → {status}")


def wait_attributes_ready(timeout_s: int = 120) -> None:
    print("Waiting for attributes to become available…")
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        _, payload = req("GET", f"/databases/{DATABASE}/collections/{COLLECTION}")
        attrs = payload.get("attributes") or []
        if not attrs:
            time.sleep(2)
            continue
        statuses = {a.get("key"): a.get("status") for a in attrs}
        pending = [k for k, s in statuses.items() if s not in {"available", None}]
        if not pending:
            print(f"  {len(attrs)} attributes available")
            return
        print(f"  pending: {pending[:8]}…")
        time.sleep(3)
    print("  warning: timed out waiting; continuing anyway")


def ensure_schema() -> None:
    ensure_collection()
    # string attrs
    strings = [
        ("name", 128, True),
        ("gender", 16, True),
        ("specialization", 80, True),
        ("city", 60, True),
        ("area", 80, False),
        ("hospital", 120, True),
        ("address", 200, False),
        ("pmdcId", 40, False),
        ("pmdcHint", 40, False),
        ("about", 2000, False),
        ("phone", 24, False),
        ("photo", 8, False),
        ("photoUrl", 500, False),
        ("qualifications", 240, False),
        ("searchText", 500, True),
    ]
    for key, size, required in strings:
        create_attr(
            "string",
            {"key": key, "size": size, "required": required, "array": False},
        )

    for key, size in (
        ("specialties", 80),
        ("diseases", 40),
        ("paymentMethods", 24),
        ("languages", 24),
        ("availableDays", 8),
        ("availableSlots", 8),
    ):
        create_attr(
            "string",
            {"key": key, "size": size, "required": False, "array": True},
        )

    for key, required in (
        ("experienceYears", True),
        ("feePkr", True),
        ("reviewCount", True),
    ):
        create_attr(
            "integer",
            {"key": key, "required": required, "min": 0, "max": 100000000, "array": False},
        )

    for key in ("rating", "lat", "lng"):
        create_attr(
            "float",
            {"key": key, "required": False, "array": False},
        )

    for key in ("videoAvailable", "isBookable"):
        create_attr("boolean", {"key": key, "required": False, "array": False, "default": False})

    wait_attributes_ready()

    create_index("idx_city", "key", ["city"], ["ASC"])
    create_index("idx_spec", "key", ["specialization"], ["ASC"])
    create_index("idx_gender", "key", ["gender"], ["ASC"])
    create_index("idx_fee", "key", ["feePkr"], ["ASC"])
    create_index("idx_rating", "key", ["rating"], ["DESC"])
    create_index("idx_city_spec", "key", ["city", "specialization"], ["ASC", "ASC"])
    create_index("idx_search", "fulltext", ["searchText"])
    create_index("idx_name_ft", "fulltext", ["name"])


def doc_payload(rec: dict) -> dict:
    # Appwrite document id must match [a-zA-Z0-9._-]{1,36}
    doc_id = str(rec["id"])[:36]
    data = {
        "name": rec["name"],
        "gender": rec["gender"],
        "specialization": rec["specialization"],
        "specialties": rec.get("specialties") or [],
        "diseases": rec.get("diseases") or [],
        "experienceYears": int(rec.get("experienceYears") or 0),
        "feePkr": int(rec.get("feePkr") or 0),
        "rating": float(rec.get("rating") or 0),
        "reviewCount": int(rec.get("reviewCount") or 0),
        "city": rec["city"],
        "area": rec.get("area") or "",
        "hospital": rec.get("hospital") or "",
        "address": rec.get("address") or "",
        "lat": float(rec.get("lat") or 0),
        "lng": float(rec.get("lng") or 0),
        "paymentMethods": rec.get("paymentMethods") or ["cash"],
        "languages": rec.get("languages") or ["Urdu", "English"],
        "availableDays": rec.get("availableDays") or [],
        "availableSlots": rec.get("availableSlots") or [],
        "pmdcId": rec.get("pmdcId") or "",
        "pmdcHint": rec.get("pmdcHint") or "",
        "about": (rec.get("about") or "")[:2000],
        "phone": rec.get("phone") or "",
        "photo": rec.get("photo") or "DR",
        "photoUrl": rec.get("photoUrl") or "",
        "qualifications": rec.get("qualifications") or "",
        "videoAvailable": bool(rec.get("videoAvailable")),
        "isBookable": bool(rec.get("isBookable")),
        "searchText": rec.get("searchText") or rec["name"].lower(),
    }
    return doc_id, data


def upsert_document(doc_id: str, data: dict) -> str:
    # Try create; on conflict update
    status, payload = req(
        "POST",
        f"/databases/{DATABASE}/collections/{COLLECTION}/documents",
        {
            "documentId": doc_id,
            "data": data,
            "permissions": ['read("any")'],
        },
        ok={200, 201, 409},
    )
    if status == 409:
        status, payload = req(
            "PATCH",
            f"/databases/{DATABASE}/collections/{COLLECTION}/documents/{doc_id}",
            {"data": data},
        )
        return "updated"
    return "created"


def load_records() -> list[dict]:
    if not JSONL.exists():
        raise SystemExit(f"Missing {JSONL}. Run scripts/clean_doctors_csv.py first.")
    records = []
    with JSONL.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    if UPLOAD_LIMIT > 0:
        records = records[:UPLOAD_LIMIT]
    return records


def main() -> None:
    records = load_records()
    print(f"Records to upload: {len(records)}")
    print(f"Target: {ENDPOINT} / project={PROJECT} / db={DATABASE} / col={COLLECTION}")
    if DRY_RUN:
        print("DRY_RUN=1 — exiting before schema/upload")
        return

    if not SKIP_SCHEMA:
        ensure_schema()
        # Indexes may still be building; brief pause helps first writes
        time.sleep(2)

    created = updated = failed = 0
    for i, rec in enumerate(records, 1):
        try:
            doc_id, data = doc_payload(rec)
            result = upsert_document(doc_id, data)
            if result == "created":
                created += 1
            else:
                updated += 1
        except Exception as e:
            failed += 1
            print(f"  FAIL {rec.get('id')} {rec.get('name')}: {e}", file=sys.stderr)
        if i % 100 == 0:
            print(f"  … {i}/{len(records)} (created={created} updated={updated} failed={failed})")
            time.sleep(BATCH_SLEEP)
        else:
            time.sleep(BATCH_SLEEP)

    print(f"Done. created={created} updated={updated} failed={failed}")


if __name__ == "__main__":
    main()
