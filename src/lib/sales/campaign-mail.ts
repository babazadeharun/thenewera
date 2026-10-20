import { withImap, mailConfigured, mailboxFromKey } from "@/lib/mail/imap";
import { email } from "./campaign-policy";

// Header-only read; never marks messages read, moves them or exposes admin mail to Workspaces.
export async function inspectReplies(
  address: string,
  since: Date,
  messageIds: string[],
) {
  if (!mailConfigured()) throw Error("IMAP_NOT_CONFIGURED");
  return withImap(async (c) => {
    await c.select(mailboxFromKey("inbox"));
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const d = new Date(since.getTime() - 86400000),
      date = `${d.getUTCDate()}-${months[d.getUTCMonth()]}-${d.getUTCFullYear()}`;
    const uids = await c.search(
      `SINCE ${date} FROM "${address.replace(/["\\]/g, "")}"`,
    );
    if (uids.length > 200) throw Error("INBOX_REVIEW_REQUIRED");
    const headers = await c.fetchOverview(uids);
    for (const h of headers) {
      if (!h.from.some((x) => email(x.address) === address)) continue;
      const refs =
        ((h.inReplyTo || "") + " " + (h.references || "")).match(
          /<[^<>\s]+>/g,
        ) || [];
      const matched = refs.some((x) => messageIds.includes(x));
      const fresh =
        Number.isFinite(Date.parse(h.date)) &&
        Date.parse(h.date) >= since.getTime() &&
        Date.parse(h.date) <= Date.now() + 300000;
      if (!matched && !fresh) continue;
      return {
        found: true,
        confirmed:
          matched &&
          (!h.autoSubmitted || h.autoSubmitted.toLowerCase() === "no"),
        messageId: h.messageId || "",
      };
    }
    return { found: false, confirmed: false, messageId: "" };
  });
}
