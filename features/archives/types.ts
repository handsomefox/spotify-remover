export type ArchivePlaylist = {
  id: string;
  name: string;
  trackTotal: number;
};

export type ExecuteResult = {
  removed: number;
  failures?: { id: string; message: string }[];
};
