type VerificationEmailResult = {
  delivered: boolean;
  devCode?: string;
};

const resendApiKey = process.env.RESEND_API_KEY;
const emailFrom = process.env.EMAIL_FROM || 'LifeOS <onboarding@resend.dev>';
const appName = process.env.APP_NAME || 'LifeOS';
const isProduction = process.env.NODE_ENV === 'production';

export async function sendVerificationEmail(email: string, code: string): Promise<VerificationEmailResult> {
  if (!resendApiKey) {
    if (isProduction) {
      throw new Error('RESEND_API_KEY is required to send verification emails in production.');
    }
    console.log(`[email verification] ${email}: ${code}`);
    return { delivered: false, devCode: code };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: emailFrom,
      to: [email],
      subject: `${appName} verification code`,
      text: `Your ${appName} verification code is ${code}. It expires in 10 minutes.`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
          <h1 style="font-size:20px;margin:0 0 12px">${appName} verification code</h1>
          <p>Use this code to verify your email address:</p>
          <p style="font-size:28px;font-weight:700;letter-spacing:4px;margin:20px 0">${code}</p>
          <p style="color:#6b7280">This code expires in 10 minutes. If you did not request it, ignore this email.</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(`Could not send verification email: ${response.status} ${details}`);
  }

  return { delivered: true };
}
