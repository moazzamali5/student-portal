export async function joinClass(
  sessionId: string,
  classLink: string | null,
): Promise<{ ok: boolean; error?: string }> {
  if (classLink) window.open(classLink, "_blank");
  const res = await fetch(`/api/timetable/${sessionId}/take`, { method: "POST" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { ok: false, error: data.error ?? "Couldn't mark this as taken." };
  }
  return { ok: true };
}
