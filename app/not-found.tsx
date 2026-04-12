import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center px-6 text-center">
      <FileQuestion className="mb-4 h-16 w-16 text-muted-foreground/50" />
      <h1 className="font-heading text-4xl font-medium tracking-tight">404</h1>
      <p className="mt-2 text-muted-foreground">
        This page does not exist.
      </p>
      <Button className="mt-8" render={<Link href="/" />}>
        Go Home
      </Button>
    </div>
  );
}
