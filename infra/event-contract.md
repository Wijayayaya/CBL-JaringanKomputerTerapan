# Event Contract (RabbitMQ)

## Event: `patient.registered`

Producer: Service A
Consumer: Service B

### Payload JSON

```json
{
  "event_id": "uuid",
  "event_type": "patient.registered",
  "occurred_at": "2026-04-02T10:00:00Z",
  "patient": {
    "patient_id": "uuid",
    "name": "string",
    "date_of_birth": "YYYY-MM-DD",
    "gender": "M|F"
  },
  "registration": {
    "registration_id": "uuid",
    "visit_date": "YYYY-MM-DD",
    "clinic_code": "string"
  }
}
```

## Reliability Rules

1. Producer memakai outbox pattern.
2. Consumer idempotent berdasarkan `event_id`.
3. Gunakan retry + DLQ untuk error non-transient.
