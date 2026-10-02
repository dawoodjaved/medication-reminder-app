const sdk = require("node-appwrite");
const fetch = require("node-fetch");

/**
 * Cron (≈ every minute):
 * 1) Send due reminders (timezone-aware)
 * 2) Mark notificationSend=true after successful push
 * 3) Missed-dose caregiver alerts (15m standard / 5m critical)
 * 4) Critical-dose escalation stages
 * 5) Daily caregiver digest (~08:00 local)
 */
module.exports = async function (req, res) {
  const { log, error } = req;

  const client = new sdk.Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const db = new sdk.Databases(client);

  const remindersCol = process.env.COLLECTION_REMINDERS;
  const tokensCol = process.env.COLLECTION_TOKENS;
  const caregiversCol = process.env.COLLECTION_CAREGIVERS;
  const medicinesCol = process.env.COLLECTION_MEDICINES;
  const databaseId = process.env.DATABASE_ID;

  let pushResults = [];

  try {
    const [tokensRes, remindersRes] = await Promise.all([
      db.listDocuments(databaseId, tokensCol, [sdk.Query.limit(200)]),
      db.listDocuments(databaseId, remindersCol, [
        sdk.Query.equal("taken", false),
        sdk.Query.equal("notificationSend", false),
        sdk.Query.limit(100),
      ]),
    ]);

    const tokens = tokensRes?.documents || [];
    const reminders = remindersRes?.documents || [];

    const tokenByUser = new Map();
    for (const t of tokens) {
      if (t?.userId && t?.token) tokenByUser.set(t.userId, t);
    }

    const medCritical = new Map();
    if (medicinesCol) {
      try {
        const meds = await db.listDocuments(databaseId, medicinesCol, [sdk.Query.limit(200)]);
        for (const m of meds.documents || []) {
          medCritical.set(m.$id, !!m.isCritical);
        }
      } catch (e) {
        log("Could not load medicines for critical flags:", e.message);
      }
    }

    const remindersByUser = new Map();
    for (const reminder of reminders) {
      if (!reminder?.userId || !reminder?.time || !reminder?.date) continue;
      const list = remindersByUser.get(reminder.userId) || [];
      list.push(reminder);
      remindersByUser.set(reminder.userId, list);
    }

    for (const token of tokens) {
      try {
        const userId = token?.userId;
        const userTimeZone = token?.timezone || "UTC";
        const pushToken = token?.token;
        if (!userId || !pushToken) continue;
        if (token.notificationsEnabled === false) continue;

        const { date: currentDate, time: currentTime } =
          getCurrentDateTimeInTimeZone(userTimeZone);

        const userReminders = (remindersByUser.get(userId) || []).filter(
          (reminder) =>
            reminder.date === currentDate && reminder.time === currentTime
        );

        for (const reminder of userReminders) {
          try {
            const medId = reminder.medicines?.$id || reminder.medicines || "";
            const isCritical = medCritical.get(medId) || false;
            const message = buildPushMessage(
              reminder,
              token.soundEnabled !== false,
              isCritical
            );
            const response = await fetch("https://exp.host/--/api/v2/push/send", {
              method: "POST",
              headers: {
                Accept: "application/json",
                "Accept-Encoding": "gzip, deflate",
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ ...message, to: pushToken }),
            });

            const responseJson = await response.json();
            pushResults.push({
              to: pushToken,
              userId,
              reminderId: reminder.$id,
              status: response.status,
              expoResponse: responseJson,
            });

            await db.updateDocument(databaseId, remindersCol, reminder.$id, {
              notificationSend: true,
            });
          } catch (pushErr) {
            error(`Failed push for ${userId}:`, pushErr.message);
            pushResults.push({
              to: pushToken,
              userId,
              reminderId: reminder.$id,
              status: "error",
              error: pushErr.message,
            });
          }
        }
      } catch (userErr) {
        error(`Error processing token:`, userErr.message);
      }
    }

    if (caregiversCol) {
      await notifyMissedDoses({
        db,
        databaseId,
        remindersCol,
        caregiversCol,
        medCritical,
        tokenByUser,
        log,
        error,
        pushResults,
      });

      await sendDailyDigests({
        db,
        databaseId,
        remindersCol,
        caregiversCol,
        tokenByUser,
        log,
        error,
        pushResults,
      });
    }

    log(`Push notifications attempted: ${pushResults.length}`);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: true,
        totalSent: pushResults.length,
        results: pushResults,
      }),
    };
  } catch (err) {
    error("Fatal error in push function:", err.message);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, error: err.message }),
    };
  }
};

async function notifyMissedDoses({
  db,
  databaseId,
  remindersCol,
  caregiversCol,
  medCritical,
  tokenByUser,
  log,
  error,
  pushResults,
}) {
  try {
    const overdueRes = await db.listDocuments(databaseId, remindersCol, [
      sdk.Query.equal("taken", false),
      sdk.Query.equal("notificationSend", true),
      sdk.Query.limit(80),
    ]);

    for (const reminder of overdueRes.documents || []) {
      const patientId = reminder.patientId || reminder.userId;
      const tzToken = tokenByUser.get(patientId);
      const tz = tzToken?.timezone || "UTC";
      const { date: nowDate, time: nowTime } = getCurrentDateTimeInTimeZone(tz);
      if (reminder.date !== nowDate) continue;

      const medId = reminder.medicines?.$id || reminder.medicines || "";
      const isCritical = medCritical.get(medId) || false;
      const stage = Number(reminder.escalateStage || 0);
      const alreadyMissed = !!reminder.missedNotified;
      const criticalDone = !!reminder.criticalEscalated;

      // Stage 0: first caregiver alert — 5m critical / 15m standard
      const firstThreshold = isCritical ? 5 : 15;
      if (!alreadyMissed && isAtLeastMinutesPast(reminder.time, nowTime, firstThreshold)) {
        await pushCaregivers({
          db,
          databaseId,
          caregiversCol,
          patientId,
          tokenByUser,
          title: isCritical ? "CRITICAL missed dose" : "Missed dose alert",
          body: `${reminder.medicineName} was due at ${reminder.time} and is still untaken.`,
          data: { reminderId: reminder.$id, type: isCritical ? "critical_missed" : "missed" },
          pushResults,
          error,
        });
        try {
          await db.updateDocument(databaseId, remindersCol, reminder.$id, {
            missedNotified: true,
            escalateStage: 1,
          });
        } catch (e) {
          log("Could not set missedNotified:", e.message);
        }
        continue;
      }

      // Stage 1 (critical only): escalate again at 15m
      if (
        isCritical &&
        alreadyMissed &&
        !criticalDone &&
        stage >= 1 &&
        isAtLeastMinutesPast(reminder.time, nowTime, 15)
      ) {
        await pushCaregivers({
          db,
          databaseId,
          caregiversCol,
          patientId,
          tokenByUser,
          title: "ESCALATION · critical med still untaken",
          body: `${reminder.medicineName} overdue since ${reminder.time}. Please check on the patient.`,
          data: { reminderId: reminder.$id, type: "critical_escalate" },
          pushResults,
          error,
        });
        // Also nudge patient again
        const patientTok = tokenByUser.get(patientId);
        if (patientTok?.token && patientTok.notificationsEnabled !== false) {
          try {
            await fetch("https://exp.host/--/api/v2/push/send", {
              method: "POST",
              headers: { Accept: "application/json", "Content-Type": "application/json" },
              body: JSON.stringify({
                to: patientTok.token,
                sound: "default",
                priority: "high",
                title: "Urgent: take your medicine",
                body: `${reminder.medicineName} is still marked untaken.`,
                data: { reminderId: reminder.$id, type: "critical_patient" },
              }),
            });
          } catch (e) {
            error("Critical patient nudge failed:", e.message);
          }
        }
        try {
          await db.updateDocument(databaseId, remindersCol, reminder.$id, {
            criticalEscalated: true,
            escalateStage: 2,
          });
        } catch (e) {
          log("Could not set criticalEscalated:", e.message);
        }
      }
    }
  } catch (e) {
    error("notifyMissedDoses:", e.message);
  }
}

async function pushCaregivers({
  db,
  databaseId,
  caregiversCol,
  patientId,
  tokenByUser,
  title,
  body,
  data,
  pushResults,
  error,
}) {
  let caregivers = { documents: [] };
  try {
    caregivers = await db.listDocuments(databaseId, caregiversCol, [
      sdk.Query.equal("patientId", patientId),
      sdk.Query.limit(10),
    ]);
  } catch (e) {
    error("Caregiver query failed:", e.message);
    return;
  }

  for (const cg of caregivers.documents) {
    const cgUserId = cg.caregiverUserId;
    if (!cgUserId) continue;
    const cgToken = tokenByUser.get(cgUserId);
    if (!cgToken?.token) continue;

    try {
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          to: cgToken.token,
          sound: "default",
          priority: "high",
          title,
          body,
          data,
        }),
      });
      pushResults.push({ type: data.type, caregiver: cgUserId, reminderId: data.reminderId });
    } catch (e) {
      error("Caregiver push failed:", e.message);
    }
  }
}

/** Once per day ~08:00 in caregiver timezone: summary of patient's today */
async function sendDailyDigests({
  db,
  databaseId,
  remindersCol,
  caregiversCol,
  tokenByUser,
  log,
  error,
  pushResults,
}) {
  try {
    const caregivers = await db.listDocuments(databaseId, caregiversCol, [
      sdk.Query.limit(100),
    ]);

    for (const cg of caregivers.documents || []) {
      const cgUserId = cg.caregiverUserId;
      const patientId = cg.patientId;
      if (!cgUserId || !patientId) continue;

      const cgToken = tokenByUser.get(cgUserId);
      if (!cgToken?.token) continue;
      if (cgToken.dailyDigestEnabled === false) continue;
      if (cgToken.notificationsEnabled === false) continue;

      const tz = cgToken.timezone || "UTC";
      const digestHour = (cgToken.digestHour || "08:00").slice(0, 5);
      const { date: today, time: nowTime } = getCurrentDateTimeInTimeZone(tz);
      if (nowTime !== digestHour) continue;

      // Dedup: store lastDigestDate on token
      if (cgToken.lastDigestDate === today) continue;

      let reminders = { documents: [] };
      try {
        reminders = await db.listDocuments(databaseId, remindersCol, [
          sdk.Query.equal("userId", patientId),
          sdk.Query.equal("date", today),
          sdk.Query.limit(100),
        ]);
      } catch (e) {
        error("Digest reminder query failed:", e.message);
        continue;
      }

      const docs = reminders.documents || [];
      const taken = docs.filter((d) => d.taken).length;
      const pending = docs.filter((d) => !d.taken).length;
      const body = docs.length
        ? `Today: ${taken} taken, ${pending} pending of ${docs.length} doses.`
        : "No doses scheduled for the patient today.";

      try {
        await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify({
            to: cgToken.token,
            sound: "default",
            title: "MedRem daily digest",
            body,
            data: { type: "daily_digest", patientId },
          }),
        });
        pushResults.push({ type: "daily_digest", caregiver: cgUserId });

        try {
          await db.updateDocument(databaseId, process.env.COLLECTION_TOKENS, cgToken.$id, {
            lastDigestDate: today,
          });
        } catch (e) {
          log("Could not set lastDigestDate (add attr):", e.message);
        }
      } catch (e) {
        error("Digest push failed:", e.message);
      }
    }
  } catch (e) {
    error("sendDailyDigests:", e.message);
  }
}

function isAtLeastMinutesPast(scheduledTime, nowTime, minutes) {
  const toMins = (t) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  return toMins(nowTime) - toMins(scheduledTime) >= minutes;
}

function getCurrentDateTimeInTimeZone(timeZone) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(new Date());
  const dateParts = {};
  parts.forEach(({ type, value }) => {
    if (type !== "literal") dateParts[type] = value;
  });

  const date = `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
  const time = `${dateParts.hour}:${dateParts.minute}`;
  return { date, time };
}

function buildPushMessage(reminder, withSound = true, isCritical = false) {
  return {
    sound: withSound ? "default" : null,
    priority: "high",
    title: isCritical
      ? `CRITICAL · Take ${reminder.medicineName}`
      : `Time to take ${reminder.medicineName}`,
    body: `${reminder.description || "It's time for your medication."}\nTime: ${reminder.time}`,
    data: {
      reminderId: reminder.$id,
      time: reminder.time,
      medicineName: reminder.medicineName,
      description: reminder.description,
      medicineId: reminder.medicines?.$id || reminder.medicines || "",
      isCritical,
    },
    android: {
      categoryIdentifier: "med-reminders-category",
      channelId: isCritical ? "med-critical" : "med-reminders",
      color: "#E07A5F",
      priority: "max",
    },
    ios: {
      categoryIdentifier: "med-reminders-category",
      sound: withSound ? "default" : undefined,
    },
  };
}
