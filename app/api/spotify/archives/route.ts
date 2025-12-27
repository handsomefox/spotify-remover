import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getArchivePlaylists, getCurrentUser } from "@/lib/spotify";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  const accessToken = session?.accessToken;

  if (!accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await getCurrentUser(accessToken);
    const playlists = await getArchivePlaylists(accessToken, user.id);
    return Response.json({ playlists });
  } catch (error) {
    console.error("Failed to load archive playlists", error);
    return Response.json(
      { error: "Failed to load archive playlists." },
      { status: 500 },
    );
  }
}
