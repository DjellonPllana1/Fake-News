import { twMerge } from "tailwind-merge";

function flattenInputs(input, values) {
  if (!input) {
    return;
  }

  if (Array.isArray(input)) {
    input.forEach((item) => flattenInputs(item, values));
    return;
  }

  if (typeof input === "object") {
    Object.entries(input).forEach(([key, enabled]) => {
      if (enabled) {
        values.push(key);
      }
    });
    return;
  }

  values.push(String(input));
}

export function cn(...inputs) {
  const values = [];
  inputs.forEach((input) => flattenInputs(input, values));
  return twMerge(values.join(" "));
}
