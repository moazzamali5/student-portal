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

  // Timetable and homework are per-student now (private 1:1 tutoring), so
  // there's no meaningful "sample" to seed without a real student to attach
  // it to — the admin enters those from /admin/timetable and /admin/homework
  // once students have signed up.

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
