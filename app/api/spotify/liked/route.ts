import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAllLikedTracks } from "@/lib/spotify";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  const accessToken = session?.accessToken;

  if (!accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tracks = await getAllLikedTracks(accessToken);
    return Response.json({ tracks });
  } catch (error) {
    console.error("Failed to load liked tracks", error);
    return Response.json(
      { error: "Failed to load liked tracks." },
      { status: 500 },
    );
  }
}
