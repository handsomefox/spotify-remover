import { getServerSession } from "next-auth";
import type { NextRequest } from "next/server";
import { authOptions } from "@/lib/auth";
import { getAllPlaylistTracks } from "@/lib/spotify";

export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{ playlistId: string }>;
};

export async function GET(_: NextRequest, context: Context) {
  const session = await getServerSession(authOptions);
  const accessToken = session?.accessToken;

  if (!accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { playlistId } = await context.params;
  if (!playlistId) {
    return Response.json({ error: "Missing playlist id." }, { status: 400 });
  }

  try {
    const tracks = await getAllPlaylistTracks(accessToken, playlistId);
    return Response.json({ tracks });
  } catch (error) {
    console.error("Failed to load playlist tracks", error);
    return Response.json(
      { error: "Failed to load playlist tracks." },
      { status: 500 },
    );
  }
}
