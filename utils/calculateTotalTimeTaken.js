export function calculateTotalTimeTaken(lockedInAt, previousTime = 0) {
  const now = new Date();
  const lockedAt = new Date(lockedInAt);
  const sessionTime = Math.floor((now - lockedAt) / 1000); // in seconds
  return sessionTime + previousTime;
}
