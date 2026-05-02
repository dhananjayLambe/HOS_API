from django.test import SimpleTestCase

from appointments.utils.default_doctor_availability import default_weekly_availability_json


class DefaultDoctorAvailabilityJsonTests(SimpleTestCase):
    def test_seven_days(self):
        j = default_weekly_availability_json()
        self.assertEqual(len(j), 7)
        days = {d["day"] for d in j}
        self.assertIn("saturday", days)
        self.assertIn("sunday", days)
        sun = next(d for d in j if d["day"] == "sunday")
        self.assertIs(sun.get("is_working"), False)
