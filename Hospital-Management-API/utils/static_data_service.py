
class StaticDataService:
    @staticmethod
    def get_location_choices():
        return [
            ('head', 'Head'),
            ('left_eye', 'Left Eye'),
            ('right_eye', 'Right Eye'),
            ('nose', 'Nose'),
            ('throat', 'Throat'),
            ('chest', 'Chest'),
            ('left_arm', 'Left Arm'),
            ('right_arm', 'Right Arm'),
            ('abdomen', 'Abdomen'),
            ('back', 'Back'),
            ('left_leg', 'Left Leg'),
            ('right_leg', 'Right Leg'),
            ('pelvis', 'Pelvis'),
            ('whole_body', 'Whole Body'),
            ('skin', 'Skin'),
            ('others', 'Others'),
        ]

    @staticmethod
    def get_diagnosis_type_choices():
        return [
            ('suspected', 'Suspected'),
            ('confirmed', 'Confirmed'),
            ('rule_out', 'Rule Out'),
            ('follow_up', 'Follow-up')
        ]
    @staticmethod
    def get_advice_templates():
        return [
            "Quit Smoking",
            "Avoid Sugary Foods",
            "Exercise Regularly",
            "Limit Alcohol Intake",
            "Eat More Vegetables",
            "Drink More Water",
            "Get Enough Sleep",
            "Manage Stress Effectively",
            "Have Regular Health Checkups",
            "Reduce Screen Time",
            "Practice Mindfulness",
            "Limit Processed Foods"
        ]