import logging

import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.config import settings

logger = logging.getLogger(__name__)


def _format_code(code: str) -> str:
    """Render the 6-digit code as ``123 456`` for easier reading."""
    return f"{code[:3]} {code[3:]}" if len(code) == 6 else code


async def send_magic_link_email(to_email: str, token: str, code: str | None = None):
    """Send magic link email to user.

    Includes both a clickable link (primary CTA) and a 6-digit code that the
    user can paste directly into the PWA — needed because magic links open in
    the system browser on iOS/Android, not in the installed PWA.
    """
    verify_url = f"{settings.app_url}/auth/verify?token={token}"
    formatted_code = _format_code(code) if code else None

    # In dev: log the link instead of sending email
    if not settings.smtp_user:
        logger.warning("=" * 60)
        logger.warning("MAGIC LINK (dev mode - no SMTP configured)")
        logger.warning(f"  To: {to_email}")
        logger.warning(f"  URL: {verify_url}")
        if formatted_code:
            logger.warning(f"  CODE: {formatted_code}")
        logger.warning("=" * 60)
        print(f"\n{'=' * 60}")
        print(f"MAGIC LINK for {to_email}:")
        print(f"  {verify_url}")
        if formatted_code:
            print(f"  CODE: {formatted_code}")
        print(f"{'=' * 60}\n")
        return

    message = MIMEMultipart("alternative")
    message["From"] = settings.from_email
    message["To"] = to_email
    message["Subject"] = "Din inloggningslänk till Cortex"

    code_text_block = (
        f"\nEller skriv in koden {formatted_code} i appen.\n" if formatted_code else ""
    )

    text_content = f"""Hej!

Klicka på länken nedan för att logga in:

{verify_url}
{code_text_block}
Länken är giltig i {settings.magic_link_expiry_minutes} minuter.

/ Cortex
"""

    code_html_block = (
        f"""
              <div style="margin:24px 0 0;padding:18px 20px;border:1px solid #ccfbf1;background:#f0fdfa;border-radius:10px;text-align:center;">
                <p style="margin:0 0 8px;color:#0f766e;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">
                  Eller skriv in koden i appen
                </p>
                <p style="margin:0;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:28px;font-weight:600;letter-spacing:0.18em;color:#0d9488;">
                  {formatted_code}
                </p>
              </div>
"""
        if formatted_code
        else ""
    )

    html_content = f"""\
<!DOCTYPE html>
<html lang="sv">
<body style="margin:0;padding:32px 16px;background:#fafaf9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0a0a0a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:480px;" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding-bottom:24px;">
              <span style="display:inline-flex;align-items:center;gap:8px;">
                <span style="display:inline-block;width:24px;height:24px;background:linear-gradient(135deg,#0d9488,#0f766e);border-radius:6px;"></span>
                <span style="font-size:15px;font-weight:600;letter-spacing:-0.01em;">Cortex</span>
              </span>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;border:1px solid #e7e5e4;border-radius:10px;padding:28px;">
              <h1 style="margin:0 0 8px;font-size:20px;font-weight:600;letter-spacing:-0.015em;color:#0a0a0a;">Logga in</h1>
              <p style="margin:0 0 24px;color:#57534e;font-size:14px;line-height:1.55;">
                Klicka på knappen nedan för att logga in på Cortex.
              </p>
              <a href="{verify_url}" style="display:inline-block;padding:11px 22px;background:#0d9488;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:500;font-size:14px;">
                Logga in
              </a>
{code_html_block}
              <p style="margin:24px 0 0;color:#78716c;font-size:12px;line-height:1.55;">
                Länken är giltig i {settings.magic_link_expiry_minutes} minuter. Om du inte begärt den här mejlen kan du ignorera den.
              </p>
              <p style="margin:16px 0 0;color:#a8a29e;font-size:11px;line-height:1.55;word-break:break-all;font-family:ui-monospace,Menlo,Consolas,monospace;">
                {verify_url}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 4px;color:#a8a29e;font-size:11px;">
              Du får denna mejl eftersom någon angett din adress på Cortex.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""

    message.attach(MIMEText(text_content, "plain"))
    message.attach(MIMEText(html_content, "html"))

    await aiosmtplib.send(
        message,
        hostname=settings.smtp_host,
        port=settings.smtp_port,
        username=settings.smtp_user,
        password=settings.smtp_password,
        use_tls=True,
    )
    logger.info("Magic link email sent to %s via %s", to_email, settings.smtp_host)
