import "dotenv/config";
import { adminAuth, adminDb } from "../src/lib/firebase-admin";
import { COLLECTIONS } from "../src/lib/collections";

async function main() {
  const adminEmail = (process.env.SUPER_ADMIN_EMAIL ?? "moazzamaligujjar5@gmail.com").toLowerCase();
  const adminPassword = "ChangeMe123!";
  const db = adminDb();
  const auth = adminAuth();

  let uid: string;
  try {
    const existing = await auth.getUserByEmail(adminEmail);
    uid = existing.uid;
  } catch {
    const created = await auth.createUser({ email: adminEmail, password: adminPassword, displayName: "Super Admin" });
    uid = created.uid;
    console.log(`Admin created: ${adminEmail} (password: ${adminPassword} — change after first login)`);
  }

  await auth.setCustomUserClaims(uid, { role: "ADMIN" });
  await db.collection(COLLECTIONS.users).doc(uid).set(
    {
      name: "Super Admin",
      email: adminEmail,
      role: "ADMIN",
      rollNumber: null,
      className: null,
      createdAt: new Date().toISOString(),
    },
    { merge: true },
  );
  console.log(`Admin ready: ${adminEmail}`);

  const classCount = (await db.collection(COLLECTIONS.classSessions).count().get()).data().count;
  if (classCount === 0) {
    const batch = db.batch();
    const sample = [
      { dayOfWeek: 1, subject: "Mathematics", teacher: "Mr. Khan", room: "101", startTime: "09:00", endTime: "09:45" },
      { dayOfWeek: 1, subject: "English", teacher: "Ms. Ali", room: "102", startTime: "10:00", endTime: "10:45" },
      { dayOfWeek: 2, subject: "Physics", teacher: "Mr. Ahmed", room: "Lab 1", startTime: "09:00", endTime: "09:45" },
      { dayOfWeek: 3, subject: "Chemistry", teacher: "Ms. Fatima", room: "Lab 2", startTime: "11:00", endTime: "11:45" },
      { dayOfWeek: 4, subject: "Computer Science", teacher: "Mr. Raza", room: "103", startTime: "09:00", endTime: "09:45" },
    ];
    for (const s of sample) {
      batch.set(db.collection(COLLECTIONS.classSessions).doc(), { ...s, createdAt: new Date().toISOString() });
    }
    await batch.commit();
    console.log("Sample timetable created.");
  }

  const homeworkCount = (await db.collection(COLLECTIONS.homework).count().get()).data().count;
  if (homeworkCount === 0) {
    await db.collection(COLLECTIONS.homework).add({
      title: "Algebra worksheet",
      description: "Complete exercises 1-10 from chapter 3.",
      subject: "Mathematics",
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    });
    console.log("Sample homework created.");
  }

  const articleCount = (await db.collection(COLLECTIONS.articles).count().get()).data().count;
  if (articleCount === 0) {
    await db.collection(COLLECTIONS.articles).add({
      title: "How photosynthesis works",
      url: "https://en.wikipedia.org/wiki/Photosynthesis",
      createdAt: new Date().toISOString(),
    });
    console.log("Sample article created.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
