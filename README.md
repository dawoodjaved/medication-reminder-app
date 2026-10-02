# MedRem

MedRem helps patients stay on schedule with their medicines — and keeps caregivers in the loop when something is missed. Built for real daily use in Pakistan: reminders that fire on time, a clear Today view, refill awareness, and a local doctor directory you can actually book from.

---

## What you can do

**For patients**
- See the next dose up front, mark Taken or Snooze, and catch overdue items before they pile up
- Add medicines by hand or by scanning the label (OCR)
- Track inventory with low-stock warnings and a simple days-left refill estimate
- Review the week on a calendar strip and share adherence reports as PDF
- Search Pakistani doctors by city, specialty, fee, or rating, then book an appointment
- Invite a caregiver with a shareable link
- Optional Face ID / fingerprint lock on launch
- Adjustable text size (S / M / L) across the app

**For caregivers**
- Sign in and work in the linked patient’s scope (same meds, same schedule — no guessing)
- Live feed of Taken / Pending doses, plus missed-dose alerts and escalations for critical meds
- Daily digest push so the morning starts with a clear picture

**Offline-friendly**
Taken and Snooze actions queue locally when the network drops, then sync when you’re back online.

---

## Stack

| Layer | Choice |
|-------|--------|
| App | React Native, Expo Router (~52) |
| Backend | Appwrite (auth, database, serverless cron for push) |
| Auth | Phone OTP; email/password for invite claim flows |
| OCR | On-device ML Kit + OCR.space (key via env) |
| Design | Cobalt & Sand — navy headers, warm sand surfaces, coral CTAs |

Brand assets: `assets/medrem-logo.jpg` (wordmark) and `assets/medrem-icon.jpg` (app mark).

---

## Setup

1. Clone and install:

```bash
git clone https://github.com/dawoodjaved/medication-reminder-app.git
cd medication-reminder-app
npm install
```

2. Copy env template and fill values locally (never commit real keys):

```bash
cp .env.example .env
```

| Variable | Used for |
|----------|----------|
| `EXPO_PUBLIC_GROQ_API_KEY` | Optional AI assist when parsing scanned labels |
| `EXPO_PUBLIC_OCR_SPACE_KEY` | Cloud OCR fallback for label photos |
| `APPWRITE_API_KEY` | Serverless function + doctor import scripts only |
| `APPWRITE_ENDPOINT` / `APPWRITE_PROJECT_ID` / `APPWRITE_DATABASE_ID` | Script-side Appwrite access |

Client Appwrite endpoint and project id live in `config/appwriteConfig.ts` (public identifiers, not secrets). API keys belong in Appwrite Function env or your local `.env` — nowhere in source.

3. Start:

```bash
npx expo start
```

Use Expo Go on a phone, or press `w` for web. For a store/build artifact:

```bash
npm install -g eas-cli
eas build:configure
eas build -p android --profile preview
# eas build -p ios --profile preview
```

---

## App map (short)

```
Launch → session restore → onboarding (first run) or home
Tabs: Today · Meds · Calendar · Reports · Doctors · Profile
Plus: scan/add medicine, edit reminder, caregiver hub,
      invite accept, doctor detail, book / manage appointments
```

Caregiver vs patient is resolved once at launch from the `caregivers` collection. Almost every query is scoped to that `patientId`, so the wrong person’s data is hard to touch by accident.

---

## Doctor directory (optional import)

Large CSV/JSONL dumps stay out of git. Clean and upload from your machine:

```bash
npm run doctors:clean    # scripts/clean_doctors_csv.py
npm run doctors:upload   # needs APPWRITE_API_KEY in the environment
```

Meta for the cleaned set is in `assets/pakistan_doctors_meta.json`.

---

## Serverless reminders

`serverless-function/index.js` runs on a schedule: sends due reminder pushes (timezone-aware), marks `notificationSend`, notifies caregivers on missed doses, and escalates critical meds. Deploy it as an Appwrite Function with `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, and `APPWRITE_API_KEY` set in the function’s secrets — not in the repo.

---

## Flow diagram

![App flow](/assets/images/Diagram.png)

---

## Privacy & secrets checklist

- `.env` / `.env.local` are gitignored
- No API keys or test passwords in source
- Doctor bulk files are gitignored; regenerate with the scripts above
- Product/engineering notes stay local; this README is the public doc

---

## License / status

Private project. Features and copy in this README are updated as MedRem grows.
