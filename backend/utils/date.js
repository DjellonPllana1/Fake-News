export function formatDateTime(value = new Date()) {
  return new Date(value).toISOString().slice(0, 16).replace("T", " ");
}

export function timeAgo(dateText = "") {
  const parsed = new Date(String(dateText).replace(" ", "T"));

  if (Number.isNaN(parsed.valueOf())) {
    return dateText;
  }

  const minutes = Math.max(1, Math.round((Date.now() - parsed.getTime()) / 60000));

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.round(minutes / 60);

  if (hours < 24) {
    return `${hours} hours ago`;
  }

  const days = Math.round(hours / 24);

  return days > 30 ? dateText.slice(0, 10) : `${days} days ago`;
}
