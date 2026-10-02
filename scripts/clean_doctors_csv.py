#!/usr/bin/env python3
"""
Normalize pakistan_doctors_enriched.csv into a compact, Appwrite-ready dataset.

Input:  assets/pakistan_doctors_enriched.csv
Output: assets/pakistan_doctors_clean.csv
        assets/pakistan_doctors_clean.jsonl
        assets/pakistan_doctors_meta.json  (cities, specialties, hospitals)
"""

from __future__ import annotations

import ast
import csv
import json
import re
import statistics
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets" / "pakistan_doctors_enriched.csv"
OUT_CSV = ROOT / "assets" / "pakistan_doctors_clean.csv"
OUT_JSONL = ROOT / "assets" / "pakistan_doctors_clean.jsonl"
OUT_META = ROOT / "assets" / "pakistan_doctors_meta.json"

CITY_COORDS: dict[str, tuple[float, float]] = {
    "Karachi": (24.8607, 67.0011),
    "Lahore": (31.5204, 74.3587),
    "Islamabad": (33.6844, 73.0479),
    "Rawalpindi": (33.5651, 73.0169),
    "Peshawar": (34.0151, 71.5249),
    "Quetta": (30.1798, 66.9750),
    "Multan": (30.1575, 71.5249),
    "Faisalabad": (31.4504, 73.1350),
    "Hyderabad": (25.3960, 68.3578),
    "Sialkot": (32.4945, 74.5229),
    "Gujranwala": (32.1877, 74.1945),
    "Bahawalpur": (29.3956, 71.6836),
    "Sargodha": (32.0836, 72.6711),
    "Sukkur": (27.7052, 68.8574),
    "Abbottabad": (34.1688, 73.2215),
    "Mardan": (34.1989, 72.0231),
    "Gujrat": (32.5731, 74.0789),
    "Sheikhupura": (31.7167, 73.9850),
    "Sahiwal": (30.6710, 73.1067),
    "Okara": (30.8081, 73.4458),
    "Kasur": (31.1167, 74.4500),
    "Rahim Yar Khan": (28.4212, 70.2989),
    "Jhelum": (32.9331, 73.7264),
    "Wah Cantt": (33.7715, 72.7518),
    "Larkana": (27.5590, 68.2120),
    "Nawabshah": (26.2442, 68.4100),
    "Mirpur": (33.1478, 73.7519),
    "Muzaffarabad": (34.3700, 73.4711),
    "Gilgit": (35.9208, 74.3144),
}

DAY_MAP = {
    "M": "Mon",
    "Mo": "Mon",
    "Mon": "Mon",
    "Monday": "Mon",
    "Tu": "Tue",
    "Tue": "Tue",
    "Tuesday": "Tue",
    "W": "Wed",
    "We": "Wed",
    "Wed": "Wed",
    "Wednesday": "Wed",
    "Th": "Thu",
    "Thu": "Thu",
    "Thursday": "Thu",
    "F": "Fri",
    "Fr": "Fri",
    "Fri": "Fri",
    "Friday": "Fri",
    "Sa": "Sat",
    "Sat": "Sat",
    "Saturday": "Sat",
    "Su": "Sun",
    "Sun": "Sun",
    "Sunday": "Sun",
}

# specialty (normalized lower) → disease tags used by the app disease search
SPECIALTY_DISEASES: dict[str, list[str]] = {
    "endocrinologist": ["diabetes", "thyroid", "pcos"],
    "diabetologist": ["diabetes"],
    "cardiologist": ["high blood pressure", "hypertension", "heart disease"],
    "interventional cardiologist": ["heart disease", "high blood pressure"],
    "pulmonologist": ["asthma", "cough", "covid", "allergy"],
    "allergy specialist": ["allergy", "asthma"],
    "rheumatologist": ["arthritis"],
    "orthopedic surgeon": ["arthritis", "back pain"],
    "physiotherapist": ["back pain"],
    "neurologist": ["migraine", "epilepsy"],
    "psychiatrist": ["depression", "anxiety"],
    "psychologist": ["depression", "anxiety"],
    "dermatologist": ["acne", "eczema", "skin infection"],
    "gynecologist": ["pregnancy care", "pcos"],
    "obstetrician": ["pregnancy care"],
    "nephrologist": ["kidney disease", "urine infection"],
    "gastroenterologist": ["liver disease", "stomach pain"],
    "hepatologist": ["liver disease"],
    "ophthalmologist": ["eye problems"],
    "eye specialist": ["eye problems"],
    "ent specialist": ["ear infection"],
    "pediatrician": ["child fever"],
    "dentist": ["dental pain"],
    "urologist": ["urine infection"],
    "oncologist": ["cancer"],
    "internal medicine": ["fever", "cough", "covid", "diabetes"],
    "internal medicine specialist": ["fever", "cough", "covid", "diabetes"],
    "general physician": ["fever", "cough"],
}

KNOWN_CITIES = {c.lower(): c for c in CITY_COORDS}
# common aliases / misspellings → canonical
CITY_ALIASES = {
    "isb": "Islamabad",
    "rwp": "Rawalpindi",
    "khi": "Karachi",
    "lhr": "Lahore",
    "peshawer": "Peshawar",
    "faislabad": "Faisalabad",
    "hyderbad": "Hyderabad",
    "rawalpind": "Rawalpindi",
    "islamabd": "Islamabad",
}


def parse_literal(raw: str):
    s = (raw or "").strip()
    if not s:
        return None
    try:
        return ast.literal_eval(s)
    except Exception:
        return None


def as_list(raw: str) -> list:
    v = parse_literal(raw)
    if isinstance(v, list):
        return v
    if isinstance(v, dict):
        items = v.get("items")
        return items if isinstance(items, list) else []
    return []


def as_hospitals(raw: str) -> list[dict]:
    items = as_list(raw)
    out = []
    for h in items:
        if isinstance(h, dict) and h.get("name"):
            out.append(h)
    return out


def title_city(value: str) -> str:
    s = (value or "").strip()
    if not s:
        return ""
    low = s.lower()
    if low in CITY_ALIASES:
        return CITY_ALIASES[low]
    if low in KNOWN_CITIES:
        return KNOWN_CITIES[low]
    # Title-case multi-word cities carefully
    return " ".join(w.capitalize() if w.lower() not in {"cantt", "of"} else w.capitalize() for w in s.split())


def is_video_place(h: dict) -> bool:
    name = (h.get("name") or "").lower()
    city = (h.get("city") or "").lower()
    locality = (h.get("locality") or "").lower()
    return (
        "video" in name
        or city in {"video consultation", "online"}
        or locality in {"online", "video"}
        or bool(h.get("video_consultation"))
    )


def pick_hospital(row: dict) -> dict | None:
    pools: list[dict] = []
    for key in ("bookable_hospitals", "subscribed_hospitals", "hospitals", "all_hospitals"):
        pools.extend(as_hospitals(row.get(key) or ""))
    # de-dupe by hospital_id/name
    seen = set()
    uniq: list[dict] = []
    for h in pools:
        key = str(h.get("hospital_id") or h.get("name"))
        if key in seen:
            continue
        seen.add(key)
        uniq.append(h)
    if not uniq:
        return None
    real = [h for h in uniq if not is_video_place(h)]
    pool = real or uniq
    primary = [h for h in pool if h.get("is_primary")]
    return (primary or pool)[0]


def collect_fees(row: dict, hospital: dict | None) -> list[int]:
    fees: list[int] = []

    def add(val):
        try:
            n = int(float(str(val).replace(",", "").strip()))
        except Exception:
            return
        if 100 <= n <= 50000:
            fees.append(n)

    if hospital and hospital.get("fee") is not None:
        add(hospital.get("fee"))

    for key in ("bookable_hospitals", "subscribed_hospitals", "hospitals", "all_hospitals"):
        for h in as_hospitals(row.get(key) or ""):
            if h.get("fee") is not None:
                add(h.get("fee"))

    cf = row.get("consultation_fee") or ""
    for m in re.findall(r"[\d,]+", cf):
        add(m.replace(",", ""))

    add(row.get("maximum_fee"))
    return fees


def parse_fee(row: dict, hospital: dict | None) -> int:
    fees = collect_fees(row, hospital)
    if not fees:
        return 0
    # Prefer median of plausible fees to avoid outliers / ranges
    return int(statistics.median(fees))


def parse_gender(raw: str) -> str:
    s = (raw or "").strip().lower()
    if s in {"male", "m"}:
        return "male"
    if s in {"female", "f"}:
        return "female"
    return ""


def parse_rating(raw: str) -> float:
    try:
        v = float(str(raw).strip())
        if 0 <= v <= 5:
            return round(v, 2)
    except Exception:
        pass
    return 0.0


def parse_int(raw: str, default: int = 0) -> int:
    try:
        return int(float(str(raw).replace(",", "").strip()))
    except Exception:
        return default


def normalize_days(raw: str, hospital: dict | None) -> list[str]:
    days = as_list(raw)
    if hospital and hospital.get("available_days"):
        hd = hospital.get("available_days")
        if isinstance(hd, list) and hd:
            days = hd
    out: list[str] = []
    for d in days:
        if isinstance(d, dict):
            continue
        mapped = DAY_MAP.get(str(d).strip(), DAY_MAP.get(str(d).strip().title()))
        if mapped and mapped not in out:
            out.append(mapped)
    return out or ["Mon", "Tue", "Wed", "Thu", "Fri"]


def slots_from_opening(opening: str) -> list[str]:
    s = (opening or "").strip()
    # e.g. "05:00 PM" or "10:00 AM - 02:00 PM"
    times = re.findall(r"(\d{1,2}:\d{2}\s*[AaPp][Mm])", s)
    out: list[str] = []
    for t in times:
        try:
            hhmm, ampm = t.strip().upper().split()
            h, m = map(int, hhmm.split(":"))
            if ampm == "PM" and h != 12:
                h += 12
            if ampm == "AM" and h == 12:
                h = 0
            out.append(f"{h:02d}:{m:02d}")
        except Exception:
            continue
    defaults = ["10:00", "11:00", "12:00", "16:00", "17:00", "18:00"]
    if not out:
        return defaults
    # Expand around first opening hour
    base = out[0]
    try:
        h, m = map(int, base.split(":"))
        extras = [f"{(h + i) % 24:02d}:{m:02d}" for i in range(0, 4)]
        merged = []
        for x in extras + defaults:
            if x not in merged:
                merged.append(x)
        return merged[:6]
    except Exception:
        return defaults


def pretty_specialty(raw: str) -> str:
    s = (raw or "").strip().replace("-", " ").replace("_", " ")
    if not s:
        return ""
    # Title-case but keep common acronyms
    words = []
    for w in s.split():
        up = w.upper()
        if up in {"ENT", "ENT.", "OB", "GYN", "MD", "MBBS"}:
            words.append(up.replace(".", ""))
        else:
            words.append(w[:1].upper() + w[1:].lower())
    return " ".join(words)


def specialties_of(row: dict) -> list[str]:
    out: list[str] = []
    primary = pretty_specialty(row.get("primary_specialty") or "")
    if primary:
        out.append(primary)
    for part in re.split(r"[,/|]", row.get("specialty") or ""):
        p = pretty_specialty(part)
        if p and p not in out:
            out.append(p)
    return out

def diseases_for(specs: list[str]) -> list[str]:
    tags: list[str] = []
    for s in specs:
        key = s.lower().strip()
        for d in SPECIALTY_DISEASES.get(key, []):
            if d not in tags:
                tags.append(d)
        # soft match
        for k, vals in SPECIALTY_DISEASES.items():
            if k in key or key in k:
                for d in vals:
                    if d not in tags:
                        tags.append(d)
    return tags


# Extra Pakistani cities (no coords → default to country centroid-ish Islamabad offset)
EXTRA_CITIES = {
    "Rahim Yar Khan",
    "Dera Ghazi Khan",
    "Muzaffargarh",
    "Jhang",
    "Chiniot",
    "Hafizabad",
    "Narowal",
    "Mandi Bahauddin",
    "Attock",
    "Chakwal",
    "Kohat",
    "Dera Ismail Khan",
    "Swat",
    "Mingora",
    "Mansehra",
    "Haripur",
    "Nowshera",
    "Charsadda",
    "Jacobabad",
    "Shikarpur",
    "Khairpur",
    "Thatta",
    "Mirpurkhas",
    "Umerkot",
    "Gwadar",
    "Turbat",
    "Kotli",
    "Bhimber",
    "Skardu",
    "Hunza",
    "Taxila",
    "Kamoke",
    "Muridke",
    "Jaranwala",
    "Gojra",
    "Burewala",
    "Vehari",
    "Khanewal",
    "Pakpattan",
    "Okara",
    "Kasur",
    "Sheikhupura",
    "Gujrat",
    "Sialkot",
    "Sahiwal",
    "Abbottabad",
    "Mardan",
    "Sukkur",
    "Larkana",
    "Nawabshah",
    "Mirpur",
    "Muzaffarabad",
    "Gilgit",
    "Wah Cantt",
    "Jhelum",
}

ALLOWED_CITIES = {c.lower(): c for c in list(CITY_COORDS) + list(EXTRA_CITIES)}


def resolve_city(row: dict, hospital: dict | None) -> str:
    """Only accept known Pakistani cities — never localities/areas."""
    candidates = [
        row.get("city") or "",
        (hospital or {}).get("city") or "",
    ]
    loc = (row.get("locality") or "").strip()
    if loc and "," not in loc:
        candidates.append(loc)

    for c in candidates:
        t = title_city(c)
        low = t.lower()
        if not t or low in {"false", "true", "video consultation", "online"}:
            continue
        if low in ALLOWED_CITIES:
            return ALLOWED_CITIES[low]
        if low in KNOWN_CITIES:
            return KNOWN_CITIES[low]
    return ""


def payment_methods(row: dict, hospital: dict | None) -> list[str]:
    methods = ["cash", "card", "easypaisa", "jazzcash"]
    if hospital and hospital.get("available_for_insurance"):
        methods.append("insurance")
    if str(row.get("video_consultation_available") or "").lower() in {"true", "1", "yes"}:
        methods.append("online")
    # unique preserve order
    seen = set()
    out = []
    for m in methods:
        if m not in seen:
            seen.add(m)
            out.append(m)
    return out


def clean_phone(raw: str) -> str:
    s = re.sub(r"[^\d+]", "", (raw or "").strip())
    return s[:20]


def clean_about(raw: str) -> str:
    s = re.sub(r"\s+", " ", (raw or "").strip())
    return s[:1800]


def initials(name: str) -> str:
    parts = [p for p in re.split(r"\s+", name) if p and p.lower() not in {"dr.", "dr", "prof.", "prof", "assoc.", "assist.", "lt.", "gen.", "col."}]
    letters = "".join(p[0] for p in parts[:2]).upper()
    return letters or "DR"


def build_record(row: dict) -> dict | None:
    name = (row.get("name") or "").strip()
    doctor_id = (row.get("doctor_id") or "").strip()
    if not name or not doctor_id:
        return None

    hospital = pick_hospital(row)
    city = resolve_city(row, hospital)
    area = (hospital or {}).get("locality") or (row.get("locality") or "").strip()
    if area.lower() in {"online", "video consultation"}:
        area = city
    hospital_name = (hospital or {}).get("name") or "Clinic"
    if is_video_place(hospital or {}) and hospital_name:
        # Prefer a non-video name already handled; if only video, label clearly
        hospital_name = hospital_name if "video" in hospital_name.lower() else "Online Video Consultation"
    address = (hospital or {}).get("address") or f"{area}, {city}".strip(", ")

    specs = specialties_of(row)
    specialization = specs[0] if specs else "General Physician"
    gender = parse_gender(row.get("gender") or "")
    fee = parse_fee(row, hospital)
    rating = parse_rating(row.get("rating") or "")
    reviews = parse_int(row.get("reviews_count") or row.get("total_users") or "0")
    exp = parse_int(row.get("experience_years") or "0")
    if exp <= 0:
        m = re.search(r"(\d+)", row.get("experience") or "")
        exp = int(m.group(1)) if m else 0

    lat, lng = CITY_COORDS.get(city, (0.0, 0.0))
    diseases = diseases_for(specs)
    days = normalize_days(row.get("available_days") or "", hospital)
    slots = slots_from_opening(row.get("opening_hours") or "")
    payments = payment_methods(row, hospital)
    pmdc = (row.get("pmdc_id") or "").strip()
    about = clean_about(row.get("description") or "")
    if not about:
        about = f"{name} is a {specialization} based in {city or 'Pakistan'}."

    photo_url = (row.get("profile_image") or "").strip()
    quals = (row.get("qualifications") or "").strip()[:240]
    phone = clean_phone(row.get("phone") or (hospital or {}).get("phone") or "")

    video = str(row.get("video_consultation_available") or "").lower() in {"true", "1", "yes"}
    bookable = str(row.get("is_bookable") or "").lower() in {"true", "1", "yes"}

    search_text = " ".join(
        [
            name,
            specialization,
            " ".join(specs),
            hospital_name,
            city,
            area,
            " ".join(diseases),
            quals,
        ]
    ).lower()

    return {
        "id": doctor_id,
        "name": name[:120],
        "gender": gender or "male",
        "specialization": specialization[:80],
        "specialties": specs[:8],
        "diseases": diseases[:12],
        "experienceYears": max(0, min(exp, 60)),
        "feePkr": fee,
        "rating": rating,
        "reviewCount": max(0, reviews),
        "city": city[:60],
        "area": (area or city)[:80],
        "hospital": hospital_name[:120],
        "address": address[:200],
        "lat": lat,
        "lng": lng,
        "paymentMethods": payments,
        "languages": ["Urdu", "English"],
        "availableDays": days,
        "availableSlots": slots,
        "pmdcId": pmdc[:40],
        "pmdcHint": pmdc[:40] if pmdc else "Unverified",
        "about": about,
        "phone": phone,
        "photo": initials(name),
        "photoUrl": photo_url[:500],
        "qualifications": quals,
        "videoAvailable": video,
        "isBookable": bookable,
        "searchText": search_text[:500],
    }


CSV_FIELDS = [
    "id",
    "name",
    "gender",
    "specialization",
    "specialties",
    "diseases",
    "experienceYears",
    "feePkr",
    "rating",
    "reviewCount",
    "city",
    "area",
    "hospital",
    "address",
    "lat",
    "lng",
    "paymentMethods",
    "languages",
    "availableDays",
    "availableSlots",
    "pmdcId",
    "pmdcHint",
    "about",
    "phone",
    "photo",
    "photoUrl",
    "qualifications",
    "videoAvailable",
    "isBookable",
    "searchText",
]


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"Missing source CSV: {SRC}")

    with SRC.open(newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    cleaned: list[dict] = []
    skipped = 0
    for row in rows:
        rec = build_record(row)
        if not rec or not rec["city"]:
            skipped += 1
            continue
        cleaned.append(rec)

    # Prefer higher rating / more reviews when identical name+city+specialty (rare)
    cleaned.sort(key=lambda r: (-r["rating"], -r["reviewCount"], r["name"]))

    with OUT_CSV.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=CSV_FIELDS)
        w.writeheader()
        for rec in cleaned:
            flat = dict(rec)
            for key in (
                "specialties",
                "diseases",
                "paymentMethods",
                "languages",
                "availableDays",
                "availableSlots",
            ):
                flat[key] = json.dumps(rec[key], ensure_ascii=False)
            w.writerow(flat)

    with OUT_JSONL.open("w", encoding="utf-8") as f:
        for rec in cleaned:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")

    cities = Counter(r["city"] for r in cleaned)
    specs = Counter(r["specialization"] for r in cleaned)
    hospitals = Counter(r["hospital"] for r in cleaned if "video" not in r["hospital"].lower())

    meta = {
        "total": len(cleaned),
        "skipped": skipped,
        "sourceRows": len(rows),
        "cities": [{"name": k, "count": v} for k, v in cities.most_common()],
        "specialties": [{"name": k, "count": v} for k, v in specs.most_common()],
        "topHospitals": [{"name": k, "count": v} for k, v in hospitals.most_common(80)],
    }
    OUT_META.write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"Source rows:  {len(rows)}")
    print(f"Cleaned rows: {len(cleaned)}")
    print(f"Skipped:      {skipped}")
    print(f"Wrote: {OUT_CSV}")
    print(f"Wrote: {OUT_JSONL}")
    print(f"Wrote: {OUT_META}")
    print("Top cities:", cities.most_common(8))
    print("Fee>0:", sum(1 for r in cleaned if r["feePkr"] > 0), "/", len(cleaned))
    print("Rated:", sum(1 for r in cleaned if r["rating"] > 0), "/", len(cleaned))


if __name__ == "__main__":
    main()
