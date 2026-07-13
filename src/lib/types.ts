export type WithId<T> = T & { id: string };

export type ClassSessionStatus = "scheduled" | "taken";

// Per-student and date-specific (private 1:1 tutoring — each student has
// their own timetable, re-entered week to week, not a shared recurring one).
export type ClassSessionDoc = {
  studentId: string;
  date: string; // ISO date, e.g. "2026-07-14"
  startTime: string;
  endTime: string;
  classLink: string | null;
  status: ClassSessionStatus;
  createdAt: string;
};

export type HomeworkDoc = {
  title: string;
  description: string | null;
  subject?: string | null;
  dueDate: string;
  assignedStudentIds: string[];
  instructionsFileUrl: string | null;
  instructionsFileType: string | null;
  createdAt: string;
};

export type RescheduleRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export type RescheduleRequestDoc = {
  studentId: string;
  classSessionId: string;
  originalDate: string;
  originalStartTime: string;
  originalEndTime: string;
  newDate: string;
  newStartTime: string;
  newEndTime: string;
  status: RescheduleRequestStatus;
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

export type Role = "STUDENT" | "ADMIN" | "PARENT";
export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export type UserDoc = {
  name: string;
  email: string;
  role: Role;
  rollNumber: string | null;
  className: string | null;
  createdAt: string;
  // PARENT-only fields
  linkedStudentIds?: string[];
  approvalStatus?: ApprovalStatus;
};

export type AvailabilityDoc = {
  studentId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

export type TaskStatus = "unscheduled" | "scheduled" | "done";

export type TaskDoc = {
  studentId: string;
  title: string;
  durationMinutes: number;
  deadline: string | null;
  notes: string | null;
  status: TaskStatus;
  createdAt: string;
};

export type ScheduledTaskStatus = "proposed" | "accepted";

export type ScheduledTaskDoc = {
  taskId: string;
  studentId: string;
  date: string; // ISO date, e.g. "2026-07-14"
  startTime: string;
  endTime: string;
  status: ScheduledTaskStatus;
};
