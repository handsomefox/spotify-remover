import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { deletePlaylist } from "@/lib/spotify";

export const dynamic = "force-dynamic";

type DeletePayload = {
  playlistIds?: string[];
};

type FailureDetail = {
  id: string;
  message: string;
};

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const accessToken = session?.accessToken;

  if (!accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: DeletePayload;
  try {
    payload = (await request.json()) as DeletePayload;
  } catch (error) {
    console.error("Invalid archive delete payload", error);
    return Response.json({ error: "Invalid payload." }, { status: 400 });
  }

  const playlistIds = Array.isArray(payload.playlistIds)
    ? payload.playlistIds.filter(Boolean)
    : [];

  if (playlistIds.length === 0) {
    return Response.json({ removed: 0, failures: [] });
  }

  const failures: FailureDetail[] = [];
  let removed = 0;

  for (const id of playlistIds) {
    try {
      await deletePlaylist(accessToken, id);
      removed += 1;
    } catch (error) {
      console.error(`Failed to delete archive playlist ${id}`, error);
      failures.push({
        id,
        message: "Failed to delete playlist.",
      });
    }
  }

  return Response.json({ removed, failures });
}
