export type PageSnapshotType = 'periodic' | 'manual' | 'pre-restore';

export interface PageSnapshotInfo {
  id: string;
  creationDate: Date;
  authorId: string;
  type: PageSnapshotType;
}
