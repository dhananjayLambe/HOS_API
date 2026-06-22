.PHONY: test test-fast test-parallel test-cov test-app test-fresh test-transactional test-doctor-dashboard test-doctor-reports-dashboard test-doctor-practice-overview test-doctor-dashboard-all

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

test-doctor-dashboard:
	DJANGO_SETTINGS_MODULE=main.settings_test python -m pytest doctor/tests/test_patients_dashboard.py -v

test-doctor-reports-dashboard:
	DJANGO_SETTINGS_MODULE=main.settings_test python -m pytest doctor/tests/test_reports_dashboard.py -v

test-doctor-practice-overview:
	DJANGO_SETTINGS_MODULE=main.settings_test python -m pytest doctor/tests/test_practice_overview.py -v

test-doctor-dashboard-all:
	DJANGO_SETTINGS_MODULE=main.settings_test python -m pytest doctor/tests/test_patients_dashboard.py doctor/tests/test_reports_dashboard.py doctor/tests/test_practice_overview.py -v
