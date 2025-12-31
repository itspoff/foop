export async function generateUniqueCode(missions) {
  const MAX_ATTEMPTS = 10;

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const code = Math.floor(1000 + Math.random() * 9000).toString(); // ensures 1000–9999
    const exists = await missions.findOne({ code });
    if (!exists) return code;
  }

  throw new Error("⚠️ Could not generate a unique 4-digit code after several attempts.");
}
