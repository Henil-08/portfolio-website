import { redirect } from "next/navigation";

// The brand lives on two pages: the design system and the world proposals.
export default function BrandIndex() {
  redirect("/docs/brand/system");
}
