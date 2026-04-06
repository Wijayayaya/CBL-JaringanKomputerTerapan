# Service B - Rekam Medis

Service B menyediakan:

- gRPC untuk kebutuhan sinkron dari Service A
- HTTP API untuk kebutuhan frontend
- RabbitMQ consumer untuk proses asinkron

## Komponen

- gRPC Server: `GetPatientSummary`
- HTTP Server: port `8081`
  - `GET /health`
  - `GET /medical-records`
  - `GET /medical-records/:patientId`
  - `PATCH /medical-records/:patientId`
  - `POST /medical-records/:patientId/allergies`
  - `DELETE /medical-records/:patientId/allergies/:allergyId`
  - `POST /medical-records/:patientId/visits`
- RabbitMQ Consumer: queue `patient.registered`
- DLX/DLQ: `patient.registered.dlx` dan `patient.registered.dlq`
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
- Jika proses event gagal, message akan di-`nack` tanpa requeue dan diarahkan ke DLQ.
