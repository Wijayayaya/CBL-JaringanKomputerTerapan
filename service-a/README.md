# Service A - Pendaftaran

Service A menerima input dari FE, menyimpan data pasien+registrasi ke DB A, lalu mengirim event ke broker melalui outbox relay.

## Endpoint

- `GET /health`
- `POST /registrations`

Contoh body `POST /registrations`:

```json
{
  "name": "Budi Santoso",
  "dateOfBirth": "1995-08-17",
  "gender": "M",
  "visitDate": "2026-04-02",
  "clinicCode": "GEN",
  "requireRealtimeValidation": true
}
```

## Menjalankan

1. Salin `.env.example` menjadi `.env`.
2. Install dependency:
   - `npm install`
3. Jalankan service:
   - `npm run dev`

## Catatan Integrasi

- gRPC client memanggil Service B pada `SERVICE_B_GRPC_ADDR`.
- Event `patient.registered` disimpan dulu di tabel `outbox_events` sebelum dipublish ke RabbitMQ.
