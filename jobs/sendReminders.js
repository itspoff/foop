import { formatReminder } from "../utils/formatReminder.js";

export async function sendReminders(db) {
  const reminders = await db
    .collection("reminders")
    .find({
      remind_at: { $lte: now },
      sent: false,
    })
    .toArray();

  for (const reminder of reminders) {
    try {
      let channel;
      try {
        channel = await client.channels.fetch(reminder.channel_id);
      } catch (err) {
        console.warn(`Channel not accessible for user ${reminder.user_id}, falling back to DM`);
      }

      const content = `<@${reminder.user_id}> \`You have a reminder!\` \n> ${formatReminder(reminder)}`;

      if (channel) {
        await channel.send({ content });
      } else {
        const user = await client.users.fetch(reminder.user_id);
        await user.send({ content });
      }

      await db.collection("reminders").updateOne({ _id: reminder._id }, { $set: { sent: true } });
    } catch (err) {
      console.error("❌ Failed to send reminder:", err);
    }
  }
}
