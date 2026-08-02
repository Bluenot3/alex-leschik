import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  queryDatabase, readText, readSelect, readNumber, readCheckbox, NotionError,
} from "../_lib/notion";
import { publicUrl } from "../_lib/r2";

const PAGE_SIZE = 48;

/**
 * Public, heavily cached listing.
 *
 * Notion allows roughly three requests a second across the whole
 * integration, so serving it per-visitor would throttle under any real
 * traffic. The CDN answer collapses that to about one query per five
 * minutes, and stale-while-revalidate keeps it instant while refreshing.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const db = process.env.NOTION_ZENGEN_DB;
  if (!db) {
    // Not configured yet — an empty archive, not an error.
    res.setHeader("Cache-Control", "public, s-maxage=60");
    return res.status(200).json({ images: [], nextCursor: null, configured: false });
  }

  const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;
  const collection = typeof req.query.collection === "string" ? req.query.collection : "";

  const filters: Record<string, unknown>[] = [
    { property: "Key", rich_text: { is_not_empty: true } },
  ];
  if (collection) filters.push({ property: "Collection", select: { equals: collection } });

  try {
    const data = await queryDatabase(db, {
      page_size: PAGE_SIZE,
      start_cursor: cursor,
      filter: filters.length > 1 ? { and: filters } : filters[0],
      sorts: [{ property: "Added", direction: "descending" }],
    });

    const images = data.results
      .map((row) => {
        const key = readText(row.properties.Key);
        if (!key) return null;
        const thumbKey = readText(row.properties["Thumb Key"]);
        return {
          id: row.id,
          url: publicUrl(key),
          thumbUrl: publicUrl(thumbKey || key),
          title: readText(row.properties.Title),
          prompt: readText(row.properties.Prompt),
          collection: readSelect(row.properties.Collection),
          width: readNumber(row.properties.Width),
          height: readNumber(row.properties.Height),
          featured: readCheckbox(row.properties.Featured),
          createdAt: row.created_time,
        };
      })
      .filter(Boolean);

    res.setHeader(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=3600",
    );
    return res.status(200).json({
      images,
      nextCursor: data.has_more ? data.next_cursor : null,
      configured: true,
    });
  } catch (err) {
    console.error("[zengen/list] failed:", err);
    const status = err instanceof NotionError ? err.status : 500;
    res.setHeader("Cache-Control", "no-store");
    return res.status(status).json({ error: "Could not read the archive" });
  }
}
