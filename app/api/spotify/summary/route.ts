import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getAllLikedTracks,
  getAllOwnedPlaylists,
  getAllPlaylistTracks,
  getCurrentUser,
} from "@/lib/spotify";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await getCurrentUser(session.accessToken);
    const playlists = await getAllOwnedPlaylists(session.accessToken, user.id);

    const playlistData = await Promise.all(
      playlists.map(async (playlist) => ({
        ...playlist,
        tracks: await getAllPlaylistTracks(session.accessToken, playlist.id),
      })),
    );

    const likedTracks = await getAllLikedTracks(session.accessToken);

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
