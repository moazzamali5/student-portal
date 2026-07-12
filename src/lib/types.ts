export type WithId<T> = T & { id: string };

export type ClassSessionDoc = {
  dayOfWeek: number;
  subject: string;
  teacher?: string | null;
  room?: string | null;
  startTime: string;
  endTime: string;
  createdAt: string;
};

export type HomeworkDoc = {
  title: string;
  description: string | null;
  subject: string;
  dueDate: string;
  createdAt: string;
};

export type HomeworkSubmissionDoc = {
  homeworkId: string;
  studentId: string;
  fileUrl: string;
  fileType: string;
  submittedAt: string;
};

export type ArticleDoc = {
  title: string;
  url: string;
  createdAt: string;
};

export type ArticleReadDoc = {
  articleId: string;
  studentId: string;
  openedAt: string | null;
  closedAt: string | null;
  summary: string | null;
};

export type UserDoc = {
  name: string;
  email: string;
  role: "STUDENT" | "ADMIN";
  rollNumber: string | null;
  className: string | null;
  createdAt: string;
};
