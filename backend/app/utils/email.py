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

    html_content = f"""
<html>
<body style="font-family: sans-serif; padding: 20px;">
    <h2>Logga in på Byggagent</h2>
    <p>Klicka på knappen nedan för att logga in:</p>
    <a href="{verify_url}" style="
        display: inline-block;
        padding: 12px 24px;
        background-color: #2563eb;
        color: white;
        text-decoration: none;
        border-radius: 6px;
        font-weight: bold;
    ">Logga in</a>
    <p style="color: #666; margin-top: 20px; font-size: 14px;">
        Länken är giltig i {settings.magic_link_expiry_minutes} minuter.
    </p>
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
