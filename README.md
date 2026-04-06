# Clinic Microservices Starter

Starter project untuk arsitektur:

- Frontend (input data)
- Service A (Pendaftaran) + database sendiri
- Service B (Rekam Medis) + database sendiri
- gRPC (sinkron)
- RabbitMQ (asinkron)

## Struktur

- `frontend/` : aplikasi FE
- `service-a/` : backend pendaftaran
- `service-b/` : backend rekam medis
- `proto/` : kontrak gRPC (contract-first)
- `infra/` : konfigurasi infrastruktur lokal

## Ketentuan Arsitektur

1. Database isolation wajib:
   - Service A hanya akses DB A
   - Service B hanya akses DB B
2. Dilarang query langsung antar database service.
3. Komunikasi lintas service:
   - gRPC untuk validasi real-time
   - RabbitMQ untuk event-driven
4. Kontrak gRPC wajib berasal dari file `.proto`.

## Menjalankan (Rekomendasi: Docker Compose)

Jalankan dari folder `infra`:

```bash
cd "/mnt/storage/Source Code/CBL-JaringanKomputerTerapan/infra"
docker compose up -d --build
```

Service yang tersedia:

- RabbitMQ UI: `http://localhost:15672` (guest/guest)
- Postgres Service A: `localhost:5433`
- Postgres Service B: `localhost:5434`
- Service A HTTP: `http://localhost:8080`
- Service B HTTP: `http://localhost:8081`
- Service B gRPC: `localhost:50051`

## Mode Lokal (Tanpa Container App)

Jika mau menjalankan `npm run dev` untuk service-a/service-b, stop dulu container app agar tidak bentrok port:

```bash
cd "/mnt/storage/Source Code/CBL-JaringanKomputerTerapan/infra"
docker compose stop service-a service-b
```

Lalu jalankan service lokal:

## Menjalankan Service B (Lokal)

```bash
cd service-b
cp .env.example .env
npm install
npm run dev
```

## Menjalankan Service A (Lokal)

```bash
cd service-a
cp .env.example .env
npm install
npm run dev
```

## Menjalankan Frontend (Lokal)

```bash
cd frontend
npm install
npm run dev
```

## Alur Demo End-to-End

1. Buka FE di browser.
2. Input data pasien lalu submit.
3. Service A simpan data ke DB A.
4. Service A menulis outbox event `patient.registered`.
5. Outbox relay publish event ke RabbitMQ.
6. Service B consume event dan membuat draft rekam medis di DB B.
7. Service A selalu memanggil gRPC Service B untuk validasi realtime (otomatis, tanpa toggle di UI).

## Operasional Cepat

Lihat `cheatsheet.txt` di root project untuk perintah:

- stop/up service satuan
- stop/up batch
- reset database (`docker compose down -v`)
