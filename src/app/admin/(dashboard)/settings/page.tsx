import { getAppSettings } from "@/lib/settings";
import { DEFAULT_EMAIL_BODY_HTML, DEFAULT_EMAIL_SUBJECT } from "@/lib/email-template";
import { AutoSendToggle } from "./AutoSendToggle";
import { TestEmailForm } from "./TestEmailForm";
import { EmailTemplateEditor } from "./EmailTemplateEditor";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getAppSettings();

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
      <p className="mt-1 text-sm text-muted">Ajustes globais do robô de prospecção.</p>

      <div className="mt-8 space-y-6">
        <AutoSendToggle initialAutoSendEmail={settings.autoSendEmail} />
        <TestEmailForm initialTestEmailAddress={settings.testEmailAddress} />
        <EmailTemplateEditor
          initialSubject={settings.emailSubject ?? DEFAULT_EMAIL_SUBJECT}
          initialBodyHtml={settings.emailBodyHtml ?? DEFAULT_EMAIL_BODY_HTML}
        />
      </div>
    </div>
  );
}
