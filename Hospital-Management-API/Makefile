.PHONY: test test-fast test-parallel test-cov test-app test-fresh test-transactional

test:
	pytest

test-fast:
	pytest -m "not slow and not transactional"

test-parallel:
	pytest -m "not transactional" -n auto

test-transactional:
	pytest -m transactional -p no:xdist

test-cov:
	pytest -m "not transactional" --cov=. --cov-report=term-missing --cov-report=html --cov-config=.coveragerc

test-app:
	pytest $(APP)/tests -v

test-fresh:
	pytest --create-db
