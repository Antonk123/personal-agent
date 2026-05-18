import logging

import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.config import settings

logger = logging.getLogger(__name__)


async def send_magic_link_email(to_email: str, token: str):
    """Send magic link email to user."""
    verify_url = f"{settings.app_url}/auth/verify?token={token}"

    # In dev: log the link instead of sending email
    if not settings.smtp_user:
        logger.warning("=" * 60)
        logger.warning("MAGIC LINK (dev mode - no SMTP configured)")
        logger.warning(f"  To: {to_email}")
        logger.warning(f"  URL: {verify_url}")
        logger.warning("=" * 60)
        print(f"\n{'=' * 60}")
        print(f"MAGIC LINK for {to_email}:")
        print(f"  {verify_url}")
        print(f"{'=' * 60}\n")
        return

    message = MIMEMultipart("alternative")
    message["From"] = settings.from_email
    message["To"] = to_email
    message["Subject"] = "Logga in på Byggagent"

    text_content = f"""Hej!

Klicka på länken nedan för att logga in:

{verify_url}

Länken är giltig i {settings.magic_link_expiry_minutes} minuter.

/ Byggagent
"""

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
                <span style="font-size:15px;font-weight:600;letter-spacing:-0.01em;">Byggagent</span>
              </span>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;border:1px solid #e7e5e4;border-radius:10px;padding:28px;">
              <h1 style="margin:0 0 8px;font-size:20px;font-weight:600;letter-spacing:-0.015em;color:#0a0a0a;">Logga in</h1>
              <p style="margin:0 0 24px;color:#57534e;font-size:14px;line-height:1.55;">
                Klicka på knappen nedan för att logga in på Byggagent.
              </p>
              <a href="{verify_url}" style="display:inline-block;padding:11px 22px;background:#0d9488;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:500;font-size:14px;">
                Logga in
              </a>
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
              Du får denna mejl eftersom någon angett din adress på Byggagent.
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
