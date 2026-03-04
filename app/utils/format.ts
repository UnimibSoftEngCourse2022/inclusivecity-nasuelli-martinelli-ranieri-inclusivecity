export function formatDate(value: string | Date) {
    const d = typeof value === "string" ? new Date(value) : value;
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("it-IT", {year: "numeric", month: "long", day: "numeric"});
}