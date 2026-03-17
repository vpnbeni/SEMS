import { headers } from "next/headers";
import { redirect } from "next/navigation";

function getCntrOrigin(host: string): string {
  if (host.startsWith("stage.")) return "https://stagecntr.capabble.cloud";
  return "https://cntr.capabble.cloud";
}

export default async function SignupPage() {
  const headersList = await headers();
  const host = headersList.get("host") || "";
  const cntrOrigin = getCntrOrigin(host);
  redirect(`${cntrOrigin}/#/signup`);
}
