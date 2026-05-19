"""switch memory_fragments embedding dim from 1536 to 1024 (Voyage AI)

Revision ID: 003
Revises: 002
Create Date: 2026-05-19

OpenAI's text-embedding-3-small (1536 dim) was swapped out for Voyage AI's
voyage-3 (1024 dim). Since memory_fragments was unused (embeddings never
worked in prod), we just drop + recreate the column.
"""

from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector


revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_column("memory_fragments", "embedding")
    op.add_column(
        "memory_fragments",
        sa.Column("embedding", Vector(1024), nullable=False),
    )


def downgrade() -> None:
    op.drop_column("memory_fragments", "embedding")
    op.add_column(
        "memory_fragments",
        sa.Column("embedding", Vector(1536), nullable=False),
    )
