UPDATE vehicle_types
SET
  luggage_small = 2,
  updated_at = NOW()
WHERE id = 'business_7' OR name = '7座车（商务型）';

UPDATE vehicle_types
SET
  seats = 9,
  luggage_medium = 9,
  description = '适合行李较多',
  updated_at = NOW()
WHERE id = 'large_9' OR name = '9座车（大空间）';
