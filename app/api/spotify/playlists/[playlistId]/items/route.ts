import { getServerSession } from "next-auth";
import type { NextRequest } from "next/server";
import { authOptions } from "@/lib/auth";
import {
  getAllPlaylistTrackItems,
  getPlaylistTrackItemsPage,
} from "@/lib/spotify";

export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{ playlistId: string }>;
};

export async function GET(request: NextRequest, context: Context) {
  const session = await getServerSession(authOptions);
  const accessToken = session?.accessToken;

  if (!accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { playlistId } = await context.params;
  if (!playlistId) {
    return Response.json({ error: "Missing playlist id." }, { status: 400 });
  }

  const { searchParams } = request.nextUrl;
  const offsetParam = searchParams.get("offset");
  const limitParam = searchParams.get("limit");
  const offset = offsetParam ? Number(offsetParam) : null;
  const limit = limitParam ? Number(limitParam) : null;
  const usePaging = Number.isFinite(offset) || Number.isFinite(limit);

  try {
    if (usePaging) {
      const page = await getPlaylistTrackItemsPage(
        accessToken,
        playlistId,
        Number.isFinite(offset) ? (offset as number) : 0,
        Number.isFinite(limit) ? (limit as number) : 100,
      );
      return Response.json(page);
    }

    const items = await getAllPlaylistTrackItems(accessToken, playlistId);
    return Response.json({ items });
  } catch (error) {
    console.error("Failed to load playlist items", error);
    return Response.json(
      { error: "Failed to load playlist items." },
      { status: 500 },
    );
  }
}
