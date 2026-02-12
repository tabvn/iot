import { AcceptInvitationPage } from "@/components/AcceptInvitationPage";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <AcceptInvitationPage token={token} />;
}
