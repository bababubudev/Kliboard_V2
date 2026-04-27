import { SpaceEditor } from "@/components/space/space-editor";
import { RecentSpacesGrid } from "@/components/shared/recent-spaces-grid";

export default function Home() {
  return (
    <div className="flex min-h-[calc(100dvh-7rem)] flex-col items-center px-6 pt-24 sm:pt-[18vh]">
      <h1 className="mb-4 text-center font-heading text-4xl font-medium tracking-tight sm:text-5xl">
        create a new space
      </h1>

      <SpaceEditor />

      <div className="mt-28 w-full max-w-3xl pb-16">
        <p className="mb-8 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          recently visited
        </p>
        <RecentSpacesGrid />
      </div>
    </div>
  );
}
