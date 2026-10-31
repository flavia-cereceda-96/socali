import { useLocation, Link } from 'react-router-dom';
import { LegalLinks, SUPPORT_EMAIL } from '@/components/LegalLinks';

const LegalPage = () => {
  const privacy = useLocation().pathname === '/privacy';
  return <main className="mx-auto max-w-2xl px-5 py-10 pb-32"><Link to="/" className="text-sm text-secondary-foreground underline">C A L I</Link><h1 className="mt-6 text-3xl font-bold">{privacy ? 'Privacy notice' : 'Terms & community standards'}</h1><p className="mt-2 text-xs text-muted-foreground">Updated October 31, 2026</p>
    <div className="mt-8 space-y-7 text-sm leading-relaxed">
      {privacy ? <>
        <section><h2 className="mb-2 font-semibold text-lg">Information in C A L I</h2><p>C A L I is a social planning app. Account information includes your email, username, profile photo, bio, and preferences. Content you add can include plans, event locations, photos, comments, group messages, votes, and bucket lists. Reports and blocks are also recorded.</p></section>
        <section><h2 className="mb-2 font-semibold text-lg">How information is used</h2><p>Information is used to provide accounts, coordinate plans, show profiles and shared content, deliver notifications you enable, and handle safety reports. Profile information is visible to signed-in users. Event and group content is available according to membership and invitations. Photos use public image links, so anyone with a direct image URL may access that image.</p></section>
        <section><h2 className="mb-2 font-semibold text-lg">Services involved</h2><p>C A L I uses Lovable Cloud to operate accounts, store content, and run app functions. Resend delivers notification emails. Optional AI planning and bio suggestions process the text and relevant planning context you submit. Maps load map data from external map services.</p></section>
        <section><h2 className="mb-2 font-semibold text-lg">Your choices</h2><p>You can edit your profile and preferences, turn off notification emails, report content, block users, and initiate permanent account deletion in Settings. Deletion also removes events and groups you created. Other people may retain copies they previously downloaded or received by email. For access, correction, or privacy questions, contact the support address below.</p></section>
      </> : <>
        <section><h2 className="mb-2 font-semibold text-lg">Using C A L I</h2><p>Keep your account credentials secure and provide information you are entitled to share. You are responsible for the plans and content you post. Only upload photos and other material you have permission to use.</p></section>
        <section><h2 className="mb-2 font-semibold text-lg">Community standards</h2><p>Harassment, threats, hate speech, exploitation, sexual abuse material, spam, impersonation, and unlawful content are not permitted. Do not share another person's private information without permission. Do not use the app to endanger others.</p></section>
        <section><h2 className="mb-2 font-semibold text-lg">Reports and moderation</h2><p>You can report content or block users from content and profile menus. Reported content is hidden from your view while open. The review team can dismiss reports or hide content from the app. Contact support if you want to provide further evidence or question a moderation decision. C A L I is not an emergency service; contact local emergency services for immediate danger.</p></section>
        <section><h2 className="mb-2 font-semibold text-lg">Leaving the app</h2><p>You can delete your account in Settings. Deletion is permanent and also deletes your created events and groups for their members. Review those consequences before confirming.</p></section>
      </>}
      <section><h2 className="mb-2 font-semibold text-lg">Contact</h2><a className="underline text-secondary-foreground break-all" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></section>
    </div><LegalLinks />
  </main>;
};
export default LegalPage;