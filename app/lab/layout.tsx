import { notFound } from "next/navigation";

// Model preview pages for development only.
export default function LabLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production") notFound();
  return children;
}
