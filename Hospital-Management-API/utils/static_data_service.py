
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

    @staticmethod
    def get_medicine_type_choices():
        return [
            ('tablet', 'Tablet'),
            ('syrup', 'Syrup'),
            ('cream', 'Cream'),
            ('injection', 'Injection'),
            ('insulin', 'Insulin'),
            ('spray', 'Spray'),
            ('drop', 'Drop'),
            ('powder', 'Powder'),
            ('ointment', 'Ointment'),
            ('gel', 'Gel'),
            ('patch', 'Patch'),
            ('lotion', 'Lotion'),
            ('other', 'Other'),
        ]

    @staticmethod
    def get_timing_choices():
        return [
            ('before_breakfast', 'Before Breakfast'),
            ('after_breakfast', 'After Breakfast'),
            ('before_lunch', 'Before Lunch'),
            ('after_lunch', 'After Lunch'),
            ('before_dinner', 'Before Dinner'),
            ('after_dinner', 'After Dinner'),
            ('empty_stomach', 'Empty Stomach'),
            ('bedtime', 'Bedtime'),
            ('morning', 'Morning'),
            ('afternoon', 'Afternoon'),
            ('evening', 'Evening'),
            ('night', 'Night'),
        ]

    @staticmethod
    def get_prescription_status_choices():
        return [
            ('active', 'Active'),
            ('completed', 'Completed'),
            ('discontinued', 'Discontinued'),
        ]
    @staticmethod
    def get_dosage_unit_choices():
        return [
            ('tablet', 'Tablet'),
            ('ml', 'Milliliter'),
            ('g', 'Gram'),
            ('drop', 'Drop'),
            ('spray', 'Spray'),
            ('unit', 'Unit'),
        ]
    
    @staticmethod
    def get_duration_type_choices():
        return [
            ('fixed', 'Fixed'),
            ('stat', 'STAT (Immediate)'),
            ('sos', 'SOS (As Needed)')
        ]

    @staticmethod
    def get_test_type_choices():
        return [
            ('blood', 'Blood Test'),
            ('xray', 'X-Ray'),
            ('ultrasound', 'Ultrasound'),
            ('ct', 'CT Scan'),
            ('mri', 'MRI Scan'),
            ('ecg', 'ECG'),
            ('echo', 'ECHO'),
            ('tmt', 'TMT'),
            ('pet', 'PET Scan'),
            ('eeg', 'EEG'),
            ('dexa', 'DEXA Scan'),
            ('prt', 'PRT Scan'),
            ('mammo', 'Mammography'),
            ('urine', 'Urine Test'),
            ('biopsy', 'Biopsy'),
            ('other', 'Other'),
        ]

    @staticmethod
    def get_test_category_choices():
        return [
            ('blood-tests', 'Blood Tests'),
            ('digital-xray', 'Digital X-Ray'),
            ('ultrasound', 'Ultrasound (USG)'),
            ('ct-scan', 'CT Scan'),
            ('mri-scan', 'MRI Scan'),
            ('ecg', 'ECG'),
            ('echo', 'ECHO'),
            ('tmt', 'TMT'),
            ('pet-scan', 'PET Scan'),
            ('eeg', 'EEG'),
            ('dexa-scan', 'DEXA Scan'),
            ('mammography', 'Mammography'),
            ('urine-tests', 'Urine Tests'),
            ('biopsy', 'Biopsy'),
            ('wellness', 'Wellness Packages')
        ]

    @staticmethod
    def get_imaging_view_choices():
        return [
            ('pa', 'PA View'),
            ('ap', 'AP View'),
            ('lateral', 'Lateral View'),
            ('oblique', 'Oblique View'),
            ('axial', 'Axial View'),
            ('coronal', 'Coronal View'),
            ('sagittal', 'Sagittal View'),
            ('transvaginal', 'Transvaginal View')
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
    def get_consultation_tag_choices():
        return [
            ('follow_up', 'Follow-Up'),
            ('critical', 'Critical'),
            ('review', 'Review')
        ]