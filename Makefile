.PHONY: dev down test lint typecheck migrate seed
dev:
	docker compose up --build
down:
	docker compose down
test:
	docker compose run --rm api pytest -q /app/tests
lint:
	docker compose run --rm api ruff check .
	docker compose run --rm web npm run lint
typecheck:
	docker compose run --rm web npm run typecheck
migrate:
	docker compose run --rm api alembic upgrade head
seed:
	docker compose run --rm api python -m app.fixtures ../../tests/fixtures/reddit.json $(PRODUCT_ID)
