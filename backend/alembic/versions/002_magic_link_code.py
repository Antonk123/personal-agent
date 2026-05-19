"""add code column to magic_links

Revision ID: 002
Revises: 001
Create Date: 2026-05-19
"""

from alembic import op
import sqlalchemy as sa

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "magic_links",
        sa.Column("code", sa.String(6), nullable=True),
    )
    op.create_index(
        "ix_magic_links_code",
        "magic_links",
        ["code"],
    )


def downgrade() -> None:
    op.drop_index("ix_magic_links_code", table_name="magic_links")
    op.drop_column("magic_links", "code")
