"use client";

import { useEffect, useState } from "react";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { clientAuth } from "@/lib/firebase-client";
import { friendlyFirebaseError } from "@/lib/firebase-errors";
import { Button, Card, ErrorText, Input, Label } from "@/components/ui";

type Profile = {
  name: string;
  email: string;
  rollNumber: string | null;
  className: string | null;
  role: string;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [className, setClassName] = useState("");
  const [profileStatus, setProfileStatus] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data: Profile) => {
        setProfile(data);
        setName(data.name);
        setRollNumber(data.rollNumber ?? "");
        setClassName(data.className ?? "");
      });
  }, []);

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProfileStatus(null);
    setProfileSaving(true);

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, rollNumber, className }),
    });

    setProfileSaving(false);
    setProfileStatus(res.ok ? "Saved." : "Failed to save.");
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordStatus(null);
    setPasswordSaving(true);

    try {
      const user = clientAuth.currentUser;
      if (!user?.email) throw new Error("You need to log in again before changing your password.");

      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      try {
        await reauthenticateWithCredential(user, credential);
      } catch {
        throw new Error("Current password is incorrect.");
      }
      await updatePassword(user, newPassword);

      setPasswordStatus("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setPasswordStatus(friendlyFirebaseError(err, "Failed to update password."));
    } finally {
      setPasswordSaving(false);
    }
  }

  if (!profile) return <p className="text-sm text-slate-500">Loading...</p>;

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Profile</h1>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Your details</h2>
        <p className="mb-3 text-sm text-slate-500">{profile.email}</p>
        <form onSubmit={handleProfileSubmit} className="space-y-3">
          <div>
            <Label>Full name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Roll number</Label>
              <Input value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} />
            </div>
            <div>
              <Label>Class</Label>
              <Input value={className} onChange={(e) => setClassName(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={profileSaving}>
              {profileSaving ? "Saving..." : "Save changes"}
            </Button>
            {profileStatus && <span className="text-sm text-slate-600">{profileStatus}</span>}
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Change password</h2>
        <form onSubmit={handlePasswordSubmit} className="space-y-3">
          <div>
            <Label>Current password</Label>
            <Input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div>
            <Label>New password</Label>
            <Input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={passwordSaving}>
              {passwordSaving ? "Updating..." : "Update password"}
            </Button>
            <ErrorText>{passwordStatus}</ErrorText>
          </div>
        </form>
      </Card>
    </div>
  );
}
