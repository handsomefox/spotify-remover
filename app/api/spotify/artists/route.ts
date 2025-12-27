import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getArtistsByIds } from "@/lib/spotify";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const accessToken = session?.accessToken;

  if (!accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let ids: string[] = [];

  try {
    const body = (await request.json()) as { ids?: string[] };
    ids = Array.isArray(body.ids) ? body.ids.filter(Boolean) : [];
  } catch (error) {
    console.error("Invalid artist ids payload", error);
    return Response.json({ error: "Invalid payload." }, { status: 400 });
  }

  if (ids.length === 0) {
    return Response.json({ images: {} });
  }

  try {
    const artists = await getArtistsByIds(accessToken, ids);
    const images = Object.fromEntries(
      artists.map((artist) => [artist.id, artist.imageUrl]),
    );
    return Response.json({ images });
  } catch (error) {
    console.error("Failed to load artist images", error);
    return Response.json(
      { error: "Failed to load artist images." },
      { status: 500 },
    );
  }
}
