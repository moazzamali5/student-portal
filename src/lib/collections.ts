// All Firestore collections and Storage paths for this app live under this
// prefix — the Firebase project ("hicaa-staffinfo") is shared with another
// app, so this keeps our data from colliding with or exposing theirs.
const PREFIX = "studentPortal";

export const COLLECTIONS = {
  users: `${PREFIX}_users`,
  classSessions: `${PREFIX}_classSessions`,
  homework: `${PREFIX}_homework`,
  homeworkSubmissions: `${PREFIX}_homeworkSubmissions`,
  articles: `${PREFIX}_articles`,
  articleReads: `${PREFIX}_articleReads`,
  emailLog: `${PREFIX}_emailLog`,
} as const;

export const STORAGE_PREFIX = PREFIX;
