import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getAllLikedTracks,
  getAllOwnedPlaylists,
  getAllPlaylistTracks,
  getCurrentUser,
} from "@/lib/spotify";
import { mapWithConcurrency } from "@/lib/async";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  const accessToken = session?.accessToken;

  if (!accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await getCurrentUser(accessToken);
    const playlists = await getAllOwnedPlaylists(accessToken, user.id);

    const playlistData = await mapWithConcurrency(
      playlists,
      3,
      async (playlist) => ({
        ...playlist,
        tracks: await getAllPlaylistTracks(accessToken, playlist.id),
      }),
    );

    const likedTracks = await getAllLikedTracks(accessToken);

    return Response.json({
      user: {
        id: user.id,
        displayName: user.display_name ?? "",
      },
      likedTracks,
      playlists: playlistData,
    });
  } catch (error) {
    console.error("Failed to load Spotify summary", error);
    return Response.json(
      { error: "Failed to load Spotify data." },
      { status: 500 },
    );
  }
}
