"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DurationPicker } from "@/components/space/duration-picker";
import { MarkdownRenderer } from "@/components/space/markdown-renderer";
import { useUpdateSpace } from "@/hooks/use-space";
import { fadeIn, baseTransition } from "@/lib/animations";
import { Copy, Save, Clock } from "lucide-react";

interface SpaceViewerProps {
  space: {
    id: string;
    name: string;
    content: string;
    duration: number;
    expires_at: string;
    owner_id: string | null;
    updated_at: string;
  };
}

export function SpaceViewer({ space }: SpaceViewerProps) {
  const [content, setContent] = useState(space.content);
  const [duration, setDuration] = useState(space.duration);
  const [isEditing, setIsEditing] = useState(!space.content);
  const updateSpace = useUpdateSpace(space.name);

  const hasChanges = content !== space.content || duration !== space.duration;
  const timeRemaining = formatDistanceToNow(new Date(space.expires_at), {
    addSuffix: true,
  });

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(space.content);
      toast.success("Copied to clipboard!");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to copy";
      toast.error(message);
    }
  }

  async function handleSave() {
    try {
      const updates: { content?: string; duration?: number } = {};
      if (content !== space.content) updates.content = content;
      if (duration !== space.duration) updates.duration = duration;

      await updateSpace.mutateAsync(updates);
      toast.success("Space updated!");
      setIsEditing(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update space";
      toast.error(message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          Expires {timeRemaining}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <Copy className="mr-2 h-4 w-4" />
            Copy
          </Button>
          {!isEditing && (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {isEditing ? (
          <motion.div
            key="editor"
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={baseTransition}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                className="min-h-75 font-mono"
                placeholder="Paste your text here..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-4">
              <div className="space-y-2">
                <Label>Expires In</Label>
                <DurationPicker value={duration} onChange={setDuration} />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleSave}
                  disabled={!hasChanges || !content.trim() || updateSpace.isPending}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {updateSpace.isPending ? "Saving..." : "Save"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setContent(space.content);
                    setDuration(space.duration);
                    setIsEditing(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="viewer"
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={baseTransition}
            className="rounded-lg border border-primary/10 bg-card/80 p-6 backdrop-blur-sm"
          >
            <MarkdownRenderer content={space.content} className="font-mono text-sm" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
