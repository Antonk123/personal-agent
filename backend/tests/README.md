# Backend tests

Minimal smoke-suite för FastAPI-appen. Verifierar att alla routers är
monterade och att endpoints returnerar förväntade statuskoder utan att
behöva en riktig Postgres-instans.

## Köra

```bash
cd backend
python3 -m venv .venv
./.venv/bin/pip install -r <(python3 -c "import tomllib,sys; d=tomllib.load(open('pyproject.toml','rb')); print('\n'.join(d['project']['dependencies'] + d['project']['optional-dependencies']['dev']))")
./.venv/bin/pytest
```

Vi installerar inte paketet självt (`pip install .`) eftersom flat-layout
(`app/` + `alembic/` + `tests/` på top-level) krockar med setuptools'
auto-discovery. Istället sätter `pyproject.toml` `pythonpath = ["."]` i
pytest-konfigen så `app` är importerbar utan install. Dockerfile gör
samma sak — kopierar `pyproject.toml` separat, installerar deps, sen
COPY:ar resten.

För verbose output och första-fel-stopp:

```bash
pytest -vv -x
```

## Strategi

- `conftest.py` override:ar `get_db` med en `AsyncMock` — vi kör inga
  riktiga DB-queries i smoke-testerna.
- En `httpx.AsyncClient` med `ASGITransport` pratar direkt mot ASGI-appen,
  utan uvicorn. Lifespan triggas inte, så Redis behövs inte.
- Endpoints som faktiskt anropar tjänster (t.ex. `/auth/magic-link`)
  monkey-patchar service-metoderna per test.
- 401-tester triggas på endpoints bakom `get_current_tenant`-middlewaren —
  de bailar ut innan DB-anropet, så ingen mock krävs där.

## Lägga till nya tester

- Routes som kräver tenant: testa `Authorization`-felet (401) som baseline.
- Routes utan auth som träffar DB: monkey-patcha relevant service-klass i
  routerns modul (t.ex. `app.routers.auth.AuthService`).
- För integrationstest mot riktig DB: skapa en separat suite med egen
  fixture som spinner upp testcontainers-postgres.
