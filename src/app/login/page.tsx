import { LoginClient } from "@/components/LoginClient";
import { getT } from "@/lib/i18n";

export default async function LoginPage() {
  const { t } = await getT();

  return (
    <LoginClient
      labels={{
        title: t("auth.loginTitle"),
        email: t("auth.email"),
        code: t("auth.code"),
        sendCode: t("auth.sendCode"),
        verifyCode: t("auth.verifyCode"),
        sending: t("auth.sending"),
        verifying: t("auth.verifying"),
        invalidEmail: t("auth.invalidEmail"),
        invalidCode: t("auth.invalidCode"),
        back: t("auth.back"),
        emailHint: t("auth.emailHint"),
        codeHint: t("auth.codeHint"),
        networkError: t("auth.networkError"),
        failedToSend: t("auth.failedToSend"),
        testMode: t("auth.testMode"),
        testCode: t("auth.testCode"),
        testVisible: t("auth.testVisible"),
        inboxHint: t("auth.inboxHint"),
        emailPlaceholder: t("auth.emailPlaceholder"),
        codePlaceholder: t("auth.codePlaceholder"),
      }}
    />
  );
}
