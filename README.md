# MedRem

Medication reminder app for patients and caregivers. Stay on schedule, track adherence, and find doctors in Pakistan.

## Features

- Today dashboard — next dose, Taken / Snooze, overdue list
- Add medicines manually or by scanning the label (OCR)
- Push reminders with missed-dose alerts for caregivers
- Week calendar, adherence reports (PDF), refill estimates
- Caregiver invites, live feed, and patient-scoped access
- Doctor directory (Pakistan) with filters and appointment booking
- Offline queue for Taken / Snooze, optional biometric lock
- Adjustable text size (S / M / L)

## Technologies

- **App:** React Native, Expo Router
- **Backend:** Appwrite (auth, database, serverless push)
- **Auth:** Phone OTP, email/password for invites
- **OCR:** ML Kit + OCR.space
- **Storage:** AsyncStorage (settings, offline queue)

## How to start

```bash
git clone https://github.com/dawoodjaved/medication-reminder-app.git
cd medication-reminder-app
npm install
cp .env.example .env
npx expo start
```

Fill in `.env` with your keys (never commit real secrets). Scan the QR code with Expo Go, or press `w` for web.
