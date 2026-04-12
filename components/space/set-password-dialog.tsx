"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield } from "lucide-react";

interface SetPasswordDialogProps {
  open: boolean;
  onSubmit: (password: string) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function SetPasswordDialog({
  open,
  onSubmit,
  onCancel,
  loading,
}: SetPasswordDialogProps) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length >= 4 && password === confirm) onSubmit(password);
  }

  const mismatch = confirm.length > 0 && password !== confirm;
  const tooShort = password.length > 0 && password.length < 4;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Set Space Password
          </DialogTitle>
          <DialogDescription>
            This space will be private. Set a password so others can access it.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="set-password">Password</Label>
            <Input
              id="set-password"
              type="password"
              placeholder="Min 4 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            {tooShort && (
              <p className="text-sm text-destructive">
                Password must be at least 4 characters
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Repeat password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            {mismatch && (
              <p className="text-sm text-destructive">Passwords do not match</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={
                !password ||
                password.length < 4 ||
                password !== confirm ||
                loading
              }
            >
              {loading ? "Saving..." : "Save Private"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
