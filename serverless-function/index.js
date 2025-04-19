const sdk = require("node-appwrite");
const fetch = require("node-fetch");

module.exports = async function (req, res) {
  const { log, error } = req;

  const client = new sdk.Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const db = new sdk.Databases(client);

  const remindersCol = process.env.COLLECTION_REMINDERS;
  const tokensCol = process.env.COLLECTION_TOKENS;
  const databaseId = process.env.DATABASE_ID;

  let pushResults = [];

  try {
    const groupA = [
      sdk.Query.equal("taken", false),
      sdk.Query.equal("notificationSend", false)
    ];
    
    const groupB = [
      sdk.Query.equal("repeatSchedule", true),
      sdk.Query.greaterThan("totalRemindersLeft", 0)
    ];
    
    const remindersQuery = sdk.Query.or([
      sdk.Query.and(groupA),
      sdk.Query.and(groupB)
    ]);

    const [tokensRes, remindersRes] = await Promise.all([
      db.listDocuments(databaseId, tokensCol, []),
      db.listDocuments(databaseId, remindersCol, [
        remindersQuery,
        sdk.Query.limit(100)
      ]),
    ]);

    const tokens = tokensRes?.documents || [];
    const reminders = remindersRes?.documents || [];

    const remindersByUser = new Map();

    for (const reminder of reminders) {
      if (!reminder?.userId || !reminder?.time || !reminder?.date) continue;
      const userReminders = remindersByUser.get(reminder.userId) || [];
      userReminders.push(reminder);
      remindersByUser.set(reminder.userId, userReminders);
    }

    for (const token of tokens) {
      try {
        const userId = token?.userId;
        const userTimeZone = token?.timezone || "UTC";
        const pushToken = token?.token;

        if (!userId || !pushToken) continue;

        const { date: currentDate, time: currentTime } = getCurrentDateTimeInTimeZone(userTimeZone);

        log(`⏱️ ${userId} (${userTimeZone}) — ${currentDate} ${currentTime}`);

        const userReminders = (remindersByUser.get(userId) || []).filter(
          (reminder) => reminder.date === currentDate && reminder.time === currentTime
        );

        for (const reminder of userReminders) {
          try {
            const message = buildPushMessage(reminder);
            const messageWithToken = { ...message, to: pushToken };

            const response = await fetch("https://exp.host/--/api/v2/push/send", {
              method: "POST",
              headers: {
                Accept: "application/json",
                "Accept-Encoding": "gzip, deflate",
                "Content-Type": "application/json",
              },
              body: JSON.stringify(messageWithToken),
            });

            const responseJson = await response.json();

            pushResults.push({
              to: pushToken,
              userId,
              reminderId: reminder.$id,
              status: response.status,
              expoResponse: responseJson,
            });
          } catch (pushErr) {
            error(`🚨 Failed to send push for user ${userId}:`, pushErr.message);
            pushResults.push({
              to: pushToken,
              userId,
              reminderId: reminder.$id,
              status: "error",
              error: pushErr.message,
            });
          }

          if (
            reminder.totalRemindersLeft > 0
          ) {
            await db.updateDocument(
              databaseId,
              remindersCol,
              reminder.$id,
              {
                totalRemindersLeft: reminder.totalRemindersLeft - 1,
              }
            );
          }
        }
      } catch (userErr) {
        error(`❌ Error processing user token:`, userErr.message);
      }
    }

    log(`✅ Push notifications attempted: ${pushResults.length}`);

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
    error("💥 Fatal error in push function:", err.message);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, error: err.message }),
    };
  }
};

// Helpers
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
    if (type !== "literal") {
      dateParts[type] = value;
    }
  });

  const date = `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
  const time = `${dateParts.hour}:${dateParts.minute}`;
  return { date, time };
}

function buildPushMessage(reminder) {
  return {
    sound: "default",
    title: `⏰ Time to take ${reminder.medicineName}`,
    body: `📝 ${reminder.description || 'It’s time for your medication!'}\n💊 Dose: ${reminder.medicines?.quantity || 1}\n📅 Frequency: ${reminder.medicines?.frequency || ''}\n🕒 Time: ${reminder.time}\n✅ Tap to mark as taken or snooze`,
    icon: 'https://img.icons8.com/fluency/96/alarm.png',
    data: {
      reminderId: reminder.$id,
      time: reminder.time,
      medicineName: reminder.medicineName,
      description: reminder.description,
    },
    android: {
      categoryIdentifier: "med-reminders-category",
      channelId: "med-reminders",
      color: "#4CAF50",
      priority: "max",
      actions: [
        { title: 'SNOOZE', actionId: 'snooze-action', icon: 'ic_snooze' },
        { title: 'TAKEN', actionId: 'taken-action', icon: 'ic_check' },
      ],
    },
    ios: {
      categoryIdentifier: "med-reminders-category",
      sound: "default",
      actions: [
        { title: "Snooze", identifier: "snooze-action", options: { foreground: true } },
        { title: "Taken", identifier: "taken-action", options: { foreground: true } },
      ],
    },
  };
}
