import { NextResponse } from "next/server";
import { getSearchSuggestions, type SearchSuggestions } from "@/lib/shop/search";

/** Backs the header's live search dropdown. Never exposes raw backend/
 *  database errors - a failure just means "search is unavailable right
 *  now", not a stack trace. */
export async function GET(request: Request): Promise<NextResponse<SearchSuggestions | { message: string }>> {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";

  try {
    const suggestions = await getSearchSuggestions(query);
    return NextResponse.json(suggestions);
  } catch (error) {
    console.error("Search suggestions failed:", error);
    return NextResponse.json({ message: "Search is currently unavailable." }, { status: 500 });
  }
}
