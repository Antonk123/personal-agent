"""initial schema

Revision ID: 001
Revises:
Create Date: 2025-05-18
"""

from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Enable pgvector extension
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # Tenants
    op.create_table(
        "tenants",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), nullable=False, unique=True, index=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("is_active", sa.Boolean(), default=True),
    )

    # Magic links
    op.create_table(
        "magic_links",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("token", sa.String(255), nullable=False, unique=True, index=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used", sa.Boolean(), default=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Sessions
    op.create_table(
        "sessions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False, index=True),
        sa.Column("token", sa.String(255), nullable=False, unique=True, index=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # User profiles
    op.create_table(
        "user_profiles",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False, unique=True, index=True),
        sa.Column("company_name", sa.String(255)),
        sa.Column("company_description", sa.Text()),
        sa.Column("role", sa.String(255)),
        sa.Column("services", JSONB),
        sa.Column("preferences", JSONB),
        sa.Column("terminology", JSONB),
        sa.Column("onboarding_completed", sa.Boolean(), default=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Assignments
    op.create_table(
        "assignments",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("role", sa.String(255)),
        sa.Column("client", sa.String(255)),
        sa.Column("phase", sa.String(255)),
        sa.Column("status", sa.String(50), default="active"),
        sa.Column("notes", sa.Text()),
        sa.Column("metadata", JSONB),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Contacts
    op.create_table(
        "contacts",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False, index=True),
        sa.Column("assignment_id", UUID(as_uuid=True), sa.ForeignKey("assignments.id"), nullable=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("company", sa.String(255)),
        sa.Column("role", sa.String(255)),
        sa.Column("phone", sa.String(50)),
        sa.Column("email", sa.String(255)),
        sa.Column("notes", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Decisions
    op.create_table(
        "decisions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False, index=True),
        sa.Column("assignment_id", UUID(as_uuid=True), sa.ForeignKey("assignments.id"), nullable=True),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("context", sa.Text()),
        sa.Column("decided_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Conversations
    op.create_table(
        "conversations",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False, index=True),
        sa.Column("title", sa.String(255)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Messages
    op.create_table(
        "messages",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("conversation_id", UUID(as_uuid=True), sa.ForeignKey("conversations.id"), nullable=False, index=True),
        sa.Column("tenant_id", UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False, index=True),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("metadata", JSONB),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Memory fragments (with vector embedding)
    op.create_table(
        "memory_fragments",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False, index=True),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("category", sa.String(50), nullable=False),
        sa.Column("source_conversation_id", UUID(as_uuid=True), sa.ForeignKey("conversations.id"), nullable=True),
        sa.Column("related_assignment_id", UUID(as_uuid=True), sa.ForeignKey("assignments.id"), nullable=True),
        sa.Column("embedding", Vector(1536), nullable=False),
        sa.Column("metadata", JSONB),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("memory_fragments")
    op.drop_table("messages")
    op.drop_table("conversations")
    op.drop_table("decisions")
    op.drop_table("contacts")
    op.drop_table("assignments")
    op.drop_table("user_profiles")
    op.drop_table("sessions")
    op.drop_table("magic_links")
    op.drop_table("tenants")
    op.execute("DROP EXTENSION IF EXISTS vector")
