import type { Metadata } from "next";

type Props = {
  params: Promise<{ name: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { name } = await params;

  return {
    title: name,
    description: `View and edit the "${name}" space on Kliboard — temporary, shareable text clipboard.`,
    openGraph: {
      title: `${name} | Kliboard`,
      description: `View and edit the "${name}" space — temporary, shareable text clipboard.`,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: `${name} | Kliboard`,
      description: `View and edit the "${name}" space — temporary, shareable text clipboard.`,
    },
  };
}

export default function SpaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
