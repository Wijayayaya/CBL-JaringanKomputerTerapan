# Service B - Rekam Medis

Service B menyediakan gRPC untuk kebutuhan sinkron dan consumer RabbitMQ untuk proses asinkron.

## Komponen

- gRPC Server: `GetPatientSummary`
- RabbitMQ Consumer: queue `patient.registered`
- Idempotency: tabel `processed_events`

## Menjalankan

1. Salin `.env.example` menjadi `.env`.
2. Install dependency:
   - `npm install`
3. Jalankan service:
   - `npm run dev`

## Perilaku Event

- Saat event `patient.registered` masuk, service membuat/menjaga draft `medical_records`.
- Event duplikat akan diabaikan berdasarkan `event_id`.
