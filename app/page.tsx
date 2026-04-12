import { SpaceEditor } from "@/components/space/space-editor";
import { RecentSpacesGrid } from "@/components/shared/recent-spaces-grid";

export default function Home() {
  return (
    <div className="flex min-h-[calc(100vh-7rem)] flex-col items-center justify-center px-6">
      <h1 className="mb-3 text-center font-heading text-4xl font-medium tracking-tight sm:text-5xl">
        enter a space name
      </h1>
      <p className="mb-14 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
        temporary storage
      </p>

      <SpaceEditor />

      <div className="mt-28 w-full max-w-3xl">
        <p className="mb-8 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          recently visited
        </p>
        <RecentSpacesGrid />
      </div>
    </div>
  );
}
