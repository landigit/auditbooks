export const indicators = {
  UNPAID: "unpaid",
  SUCCESS: "success",
  ERROR: "error",
  PAID: "paid",
  DRAFT: "draft",
  CANCELLED: "cancelled",
  SUBMITTED: "submitted",
};

const getStatus = (color: string) => {
  const statusMap: Record<string, string> = {
    orange: "unpaid",
    green: "success",
    red: "error",
    blue: "submitted",
    gray: "draft",
    grey: "draft",
  };
  return statusMap[color.toLowerCase()] || color;
};

export function getBgColorClass(color: string) {
  const status = getStatus(color);
  return `bg-indicator-${status}-bg`;
}

export function getColorClass(color: string, type: "bg" | "text" | "border") {
  const status = getStatus(color);
  if (type === "bg") return `bg-indicator-${status}-bg`;
  if (type === "text") return `text-indicator-${status}-text`;
  if (type === "border") return `border-indicator-${status}-border`;

  return "";
}

export function getTextColorClass(color: string) {
  const status = getStatus(color);
  return `text-indicator-${status}-text`;
}

export function getBgTextColorClass(color: string) {
  const bg = getBgColorClass(color);
  const text = getTextColorClass(color);
  return [bg, text].join(" ");
}
