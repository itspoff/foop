// utils/formatReason.js
export function formatReason(reason) {
  if (!reason) return "";
  const trimmed = reason.trim();
  if (trimmed.length === 0) return "";

  const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return capitalized.endsWith(".") ? capitalized : capitalized + ".";
}
