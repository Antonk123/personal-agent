"""Unit tests for RetrievalService.entity_search.

These tests cover the keyword + transitive-link logic that decides which
memory entities surface for a given query. The DB is replaced with a tiny
fake that returns canned scalars iterables, so we exercise the matching
code paths without touching Postgres.
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Any

import pytest

from app.models.assignment import Assignment, Contact, Decision
from app.models.memory import MemoryFragment
from app.services.retrieval_service import RetrievalService


@dataclass
class _Scalars:
    items: list[Any]

    def scalars(self) -> "_Scalars":
        return self

    def __iter__(self):
        return iter(self.items)


class _FakeDB:
    """Returns a fixed set of rows per model — order of execute() calls
    in entity_search is: Assignment, Contact, Decision, MemoryFragment."""

    def __init__(
        self,
        assignments: list[Assignment] | None = None,
        contacts: list[Contact] | None = None,
        decisions: list[Decision] | None = None,
        fragments: list[MemoryFragment] | None = None,
    ):
        self._queues = {
            "assignment": assignments or [],
            "contact": contacts or [],
            "decision": decisions or [],
            "memory_fragment": fragments or [],
        }
        self._order = ["assignment", "contact", "decision", "memory_fragment"]
        self._call = 0

    async def execute(self, stmt):  # noqa: ARG002 — we don't inspect the stmt
        kind = self._order[self._call]
        self._call += 1
        return _Scalars(self._queues[kind])


def _tenant() -> uuid.UUID:
    return uuid.UUID("11111111-1111-1111-1111-111111111111")


def _make_contact(
    *,
    name: str,
    company: str | None = None,
    role: str | None = None,
    notes: str | None = None,
    assignment_id: uuid.UUID | None = None,
) -> Contact:
    c = Contact(
        tenant_id=_tenant(),
        name=name,
        company=company,
        role=role,
        notes=notes,
        assignment_id=assignment_id,
    )
    c.id = uuid.uuid4()
    return c


def _make_assignment(
    *,
    name: str,
    role: str | None = None,
    client: str | None = None,
    phase: str | None = None,
    status: str = "active",
) -> Assignment:
    a = Assignment(
        tenant_id=_tenant(),
        name=name,
        role=role,
        client=client,
        phase=phase,
        status=status,
    )
    a.id = uuid.uuid4()
    return a


@pytest.mark.asyncio
async def test_contact_matches_via_notes_field():
    """Notes should be searchable so contacts with relevant context surface."""
    contact = _make_contact(
        name="Erik Nilsson",
        company="Acme AB",
        notes="Levererar kontorsmöbler till våra projekt",
    )
    db = _FakeDB(contacts=[contact])

    results = await RetrievalService(db).entity_search(
        _tenant(), "vem levererar kontorsmöbler till oss?"
    )

    types = [r["type"] for r in results]
    assert "contact" in types
    contact_hit = next(r for r in results if r["type"] == "contact")
    assert "Erik Nilsson" in contact_hit["content"]


@pytest.mark.asyncio
async def test_contact_surfaces_when_linked_assignment_matches():
    """A contact with no direct keyword hit should surface if its assignment matches."""
    assignment = _make_assignment(
        name="Renoveringsuppdrag Stockholm",
        role="byggledare",
        client="Vasakronan",
    )
    contact = _make_contact(
        name="Lisa Bergström",
        company="Furniturefab AB",
        assignment_id=assignment.id,
    )
    db = _FakeDB(assignments=[assignment], contacts=[contact])

    results = await RetrievalService(db).entity_search(
        _tenant(), "vad händer i Renoveringsuppdrag Stockholm?"
    )

    contact_results = [r for r in results if r["type"] == "contact"]
    assert len(contact_results) == 1
    assert contact_results[0]["entity_id"] == str(contact.id)
    # Transitive-match relevance should be lower than direct-name match
    assert contact_results[0]["relevance"] < 1.0


@pytest.mark.asyncio
async def test_contact_not_surfaced_when_unrelated():
    """A contact with no keyword hit and no matched assignment should NOT surface."""
    contact = _make_contact(name="Random Person", company="Other Corp")
    db = _FakeDB(contacts=[contact])

    results = await RetrievalService(db).entity_search(
        _tenant(), "vad köper vi för möbler?"
    )

    assert not any(r["type"] == "contact" for r in results)


@pytest.mark.asyncio
async def test_assignment_keyword_match_works():
    """Assignments should also match on role/client/phase, not just name."""
    assignment = _make_assignment(
        name="Projekt Alfa",
        role="byggledare",
        client="Skanska",
    )
    db = _FakeDB(assignments=[assignment])

    results = await RetrievalService(db).entity_search(
        _tenant(), "vilka uppdrag har vi med byggledare-rollen?"
    )

    assert any(r["type"] == "assignment" for r in results)
