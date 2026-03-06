import type { Metadata } from "next";
import { SignupChat } from "@/components/signup/SignupChat";

export const metadata: Metadata = {
  title: "Register Your Centre | Capabble",
  description:
    "Create your exam centre on Capabble in a few quick steps with our guided onboarding assistant.",
};

export default function SignupPage() {
  return <SignupChat />;
}
