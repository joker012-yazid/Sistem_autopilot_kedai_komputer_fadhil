# Fadhil CareDesk UI/UX Design Discussion

**Status**: Draft for review  
**Created**: 2026-05-22  
**Project**: Sistem Autopilot Kedai Komputer Fadhil  
**App Name**: Fadhil CareDesk  

Dokumen ini merumuskan keputusan UI/UX yang telah dibincangkan untuk membina sistem web Fadhil CareDesk berdasarkan flow kerja repair yang telah disediakan.

Tujuan dokumen ini ialah menjadi rujukan sebelum sebarang perubahan design atau implementation dibuat pada aplikasi.

## 1. Prinsip Utama Sistem

Fadhil CareDesk akan dibina sebagai **mobile-first responsive web app** untuk operasi repair kedai komputer.

Prinsip utama:

- Sistem bersifat **job-centric**.
- Semua kerja berpusing sekitar **Job ID**, contoh `NO.0007`.
- Repair system tidak mengurus quotation rasmi, invoice, atau payment.
- Quotation, invoice, dan payment kekal diurus dalam POS system.
- Fadhil CareDesk hanya simpan **POS Reference** jika perlu, contohnya nombor quotation, invoice, atau resit dari POS.
- Sistem menjadi rekod rasmi operasi repair, status, keputusan customer, pickup, notification, dan timeline.

## 2. Nama dan Branding

Nama app yang dipilih:

**Fadhil CareDesk**

Branding UI:

- App name: `Fadhil CareDesk`
- Logo sementara MVP: text mark `FC`
- Subtitle English: `Repair Operations`
- Subtitle Bahasa Melayu: `Operasi Servis & Repair`

Customer-facing screen, jika ada, juga akan menggunakan branding `Fadhil CareDesk`.

## 3. Role Sistem

Sistem hanya menggunakan **2 role**.

### Owner / Fadhil

Owner/Fadhil ialah role untuk review, approve, decide, monitor, dan configure sistem.

Owner/Fadhil boleh:

- Buka dashboard action queue.
- Lihat semua job.
- Review diagnosis technician.
- Approve arahan/harga rujukan.
- Record customer decision.
- Monitor pickup dan reminder.
- Decide kes `UNCLAIMED`.
- Lihat customer detail penuh.
- Lihat reports dan export.
- Ubah settings dan flow rules yang dibenarkan.

### Technician

Technician ialah role untuk kerja operasi harian repair.

Technician boleh:

- Scan service note.
- Create job.
- Lihat job queue.
- Take job.
- Release job.
- Diagnosis device.
- Upload evidence.
- Submit diagnosis kepada Owner.
- Repair selepas status `IN PROGRESS`.
- Mark ready pickup.
- Notify customer untuk job assigned.
- Complete pickup.
- Record customer decision jika customer beri keputusan kepada technician.

Technician tidak boleh:

- Approve Owner Review.
- Ubah Settings dan Flow Rules.
- Lihat reports penuh.
- Export report.
- Urus notification job technician lain.

## 4. Navigation Mengikut Role

### Owner / Fadhil Navigation

Owner/Fadhil akan nampak tab:

- Dashboard
- Jobs
- Review
- Pickup
- Notifications
- Customers
- Reports
- Settings

### Technician Navigation

Technician hanya akan nampak tab:

- Scan Job
- Jobs
- My Jobs
- Pickup
- Notifications

Technician tidak akan nampak tab Owner seperti Dashboard, Review, Customers, Reports, dan Settings sebagai menu utama.

## 5. Responsive Layout

Sistem akan dibina sebagai **mobile-first responsive web app**.

### Mobile

Mobile ialah pengalaman utama untuk kerja harian kerana sistem dijangka banyak digunakan melalui telefon.

Mobile UX:

- Navigation menggunakan bottom tab atau compact menu mengikut role.
- Jobs tidak dipaksa menjadi board penuh.
- Jobs di mobile menggunakan status tabs/filter dan list.
- Scan Job dioptimumkan untuk kamera/upload gambar service note.
- Job Detail menggunakan tabs yang boleh scroll/swipe.
- Action button perlu besar dan mudah ditekan.

Technician mobile focus:

- Scan
- My Jobs
- Jobs
- Pickup
- Notifications

Owner mobile focus:

- Dashboard
- Jobs
- Review
- Pickup
- More

### Desktop / Laptop

Desktop/laptop digunakan untuk monitoring, board penuh, reports, dan semakan data besar.

Desktop UX:

- Sidebar kiri sebagai navigation utama.
- Jobs dipaparkan sebagai board penuh ikut status.
- Dashboard Owner menggunakan multi-column action queue.
- Reports menggunakan table, filter, dan export.
- Timeline penuh lebih mudah dibaca.

## 6. Visual Style

Style UI yang dipilih:

**Workshop Warm Practical**

Ciri style:

- Rasa dekat dengan operasi kedai servis komputer.
- Warm, praktikal, dan tidak terlalu korporat.
- Sidebar gelap warm.
- Panel/kad menggunakan off-white atau warna lembut.
- Primary action menggunakan amber/brown.
- Urgent state menggunakan red/rose.
- Layout masih padat dan sesuai untuk kerja harian.

Kawalan design:

- Jangan terlalu coklat atau berat.
- Kontras mesti jelas.
- Status mesti cepat dikenali.
- UI mesti selesa digunakan lama setiap hari.

## 7. Color dan Status System

Semua status ada warna tersendiri, tetapi warna kuat hanya digunakan untuk status urgent atau action-needed.

Cadangan status color:

| Status | UI Color Direction | Tujuan |
| --- | --- | --- |
| `NEW JOB` | Neutral blue/grey | Job baru, belum urgent |
| `WAITING FADHIL REVIEW` | Amber/orange kuat | Perlu tindakan Owner |
| `WAITING CUSTOMER CONFIRMATION` | Indigo/purple sederhana | Menunggu keputusan customer |
| `IN PROGRESS` | Teal/blue sederhana | Repair sedang berjalan |
| `NOT PROCEED` | Grey | Terminal state, tidak urgent |
| `READY PICKUP` | Green kuat | Barang siap, perlu follow-up |
| `UNCLAIMED` | Red kuat | Perlu keputusan Owner |
| `COMPLETE` | Dark neutral | Selesai, masuk history |

Palette umum:

- Main background: warm off-white
- Sidebar: dark espresso / charcoal warm
- Primary action: amber/brown
- Success / pickup: green
- Warning / review: amber
- Danger / unclaimed: red
- Info / progress: teal/blue
- Neutral / complete: slate/stone

## 8. Global Search

Sistem akan mempunyai **Global Search** di topbar atau kawasan navigation utama.

Global Search boleh mencari:

- Job ID, contoh `NO.0007`
- Customer name
- Customer phone
- Device brand/model
- Serial number jika ada
- POS reference jika ada

Behavior:

- Search boleh digunakan dari mana-mana page.
- Result dipaparkan mengikut kategori seperti Jobs, Customers, dan Devices.
- Klik result terus buka Job Detail atau Customer Detail.
- Owner boleh nampak result lebih luas termasuk completed/history.
- Technician hanya nampak result yang dibenarkan ikut permission.

Jobs board masih ada filter sendiri untuk:

- status
- technician
- date range
- overdue/stuck
- pickup reminder stage

## 9. Dashboard Owner

Dashboard Owner akan fokus kepada **action queue**, bukan statistik besar.

Dashboard perlu jawab soalan:

> Apa yang Fadhil perlu buat sekarang?

Blok utama:

### Waiting Fadhil Review

Diagnosis yang technician sudah submit dan perlu Owner approve.

### Waiting Customer Decision

Job yang Owner sudah approve arahan/harga rujukan, tetapi keputusan customer belum direkod.

### Pickup Follow-Up

Job `READY PICKUP` yang perlu follow-up customer mengikut Day 0/7/14/30/60.

### Unclaimed Decision

Job yang sampai Day 90 dan Owner perlu decide next action.

### Problem / Stuck Jobs

Job yang terlalu lama dalam status sama, contoh:

- `NEW JOB` lebih X hari
- `WAITING FADHIL REVIEW` lebih X jam/hari
- `IN PROGRESS` lebih X hari tanpa update

### Today Snapshot

Ringkasan kecil sahaja:

- active jobs
- completed today
- ready pickup
- unclaimed

Statistik penuh tidak menjadi fokus Dashboard. Statistik penuh masuk ke Reports.

## 10. Jobs Page

Halaman Jobs akan menggunakan **board ikut status** pada desktop/laptop.

Column utama:

- `NEW JOB`
- `WAITING FADHIL REVIEW`
- `WAITING CUSTOMER CONFIRMATION`
- `IN PROGRESS`
- `NOT PROCEED`
- `READY PICKUP`
- `UNCLAIMED`
- `COMPLETE`

`COMPLETE` boleh disembunyikan secara default dan hanya muncul apabila filter completed/history dibuka.

### Mobile Jobs

Di phone, Jobs tidak dipaparkan sebagai kanban board penuh.

Mobile Jobs menggunakan:

- status tabs
- filter
- priority list
- search

## 11. Job Card

Job card menggunakan konsep **ringkas + detail progressive**.

### Card Default Ringkas

Card default tunjuk:

- Job ID
- Customer
- Device
- Status age
- Assigned technician ringkas

Contoh:

```text
NO.0007
Aminah - Acer Aspire 5
3 days in WAITING REVIEW
Tech: Hafiz
```

### Detail Tambahan

Detail tambahan muncul dalam hover/klik/side panel:

- Reported issue
- Next action
- Reminder badge
- POS reference badge
- Last update
- Evidence count
- Customer phone
- Full assigned technician info

Badge kecil boleh termasuk:

- `Need Review`
- `Customer Waiting`
- `Day 14`
- `Unclaimed`
- `POS Ref`
- `Evidence 3`

## 12. Side Panel dan Full Job Detail

Jobs board menggunakan gabungan:

- side panel untuk semakan cepat
- full detail page untuk kerja lengkap

Flow:

1. User buka Jobs.
2. Job disusun ikut status.
3. Klik job card buka side panel.
4. Side panel tunjuk ringkasan cepat.
5. Action kecil boleh dibuat terus dari side panel.
6. Action besar dibuka melalui Full Job Detail.

### Side Panel

Side panel tunjuk:

- Job ID
- Customer
- Device
- Status
- Assigned technician
- Reported issue
- Next action
- 3-5 timeline terbaru

Action kecil:

- Take Job
- Release Job
- Notify Customer
- Open Job Detail

### Full Job Detail

Full Job Detail digunakan untuk action besar:

- diagnosis
- upload evidence
- Owner review
- customer decision
- ready pickup
- complete pickup
- full timeline

## 13. Scan Job

Scan Job menggunakan **wizard step-by-step**.

Flow:

1. Scan / Upload Service Note
2. Extract Data
3. Review & Correct
4. Create Job
5. Success Screen

### Step 1: Scan / Upload Service Note

Technician upload gambar/PDF service note atau scan menggunakan kamera.

### Step 2: Extract Data

Sistem cuba extract:

- Service report number, contoh `NO.0007`
- Customer name
- Customer phone
- Device info
- Reported issue

### Step 3: Review & Correct

Technician semak hasil scan dan betulkan data jika OCR salah.

Job tidak akan auto-create selepas scan.

### Step 4: Create Job

Technician tekan confirm untuk create job.

Status awal:

`NEW JOB`

### Step 5: Success Screen

Paparan selepas job berjaya dibuat:

- Job ID
- Open Job
- Create Another Job
- Go to Jobs Board

## 14. Job Detail Tabs

Job Detail menggunakan tabs dalam satu page.

Tab yang dipilih:

- Overview
- Diagnosis & Evidence
- Owner Review
- Customer Decision
- Pickup
- Timeline

### Overview

Tunjuk ringkasan:

- Job ID
- Status
- Customer
- Device
- Reported issue
- Assigned technician
- Next action
- POS Reference jika ada

### Diagnosis & Evidence

Untuk technician:

- tambah diagnosis
- upload evidence
- submit kepada Owner

Evidence boleh termasuk:

- service note
- gambar device
- screenshot error
- video ringkas
- test result

### Owner Review

Untuk Owner/Fadhil:

- semak diagnosis
- semak evidence
- masukkan arahan repair
- masukkan harga rujukan atau POS reference jika perlu
- approve untuk customer confirmation

Technician boleh view status Owner Review tetapi tidak boleh approve.

### Customer Decision

Untuk record keputusan customer selepas komunikasi melalui WhatsApp/phone/in shop.

Owner/Fadhil dan technician boleh record customer decision.

Button utama:

- Proceed Repair
- Not Proceed

`Cancel` tidak digunakan sebagai button utama kerana boleh keliru dengan batal form.

Field:

- Confirmation Method: WhatsApp, Phone Call, In Shop, Other
- Decision Note
- Reason jika Not Proceed
- POS Reference optional
- WhatsApp Screenshot optional
- Other Evidence optional

Jika `Proceed Repair`:

- status jadi `IN PROGRESS`

Jika `Not Proceed`:

- status jadi `NOT PROCEED`
- reason wajib dipilih

WhatsApp screenshot adalah optional, tetapi disediakan kerana komunikasi sebenar berlaku melalui WhatsApp antara Owner dan customer.

Evidence ini akan:

- link kepada Job ID
- muncul dalam Timeline
- dikira dalam evidence count

### Pickup

Untuk:

- mark ready pickup
- rekod reminder
- notify customer
- complete pickup
- handle unclaimed

Reminder schedule:

- Day 0 notify
- Day 7 reminder 1
- Day 14 reminder 2
- Day 30 reminder 3
- Day 60 final notice
- Day 90 mark `UNCLAIMED`

### Timeline

Timeline menyimpan sejarah lengkap job.

Detail penuh diterangkan dalam seksyen Timeline.

## 15. Customer Decision dan WhatsApp Flow

Keputusan customer tidak dibuat sendiri oleh customer melalui approval link untuk MVP.

Flow dipilih:

1. Job masuk `WAITING CUSTOMER CONFIRMATION`.
2. Owner WhatsApp customer secara manual.
3. Owner atau technician record keputusan dalam tab Customer Decision.
4. Sistem update status.

Keputusan:

- Tiada customer approval link untuk MVP.
- WhatsApp kekal tempat komunikasi sebenar.
- Fadhil CareDesk menjadi system of record.

Optional WhatsApp screenshot:

- boleh upload sebagai bukti
- tidak wajib supaya workflow tidak berat
- sangat digalakkan untuk kes penting, harga tinggi, customer berubah keputusan, atau dispute risk

## 16. My Jobs Technician

My Jobs Technician menggunakan **priority list**, bukan board.

Tujuan:

> Technician cepat tahu apa yang perlu dibuat dulu.

Susunan priority:

1. Need Diagnosis
2. Waiting Owner / Customer
3. Ready to Repair
4. Ready Pickup
5. Stuck / Overdue

Setiap item list tunjuk:

- Job ID
- Customer
- Device
- Current status
- Next action
- Last update
- Due/reminder age
- Action button utama

Contoh action:

- Add Diagnosis
- Update Repair
- Notify Customer
- Complete Pickup

## 17. Pickup

Pickup module mengurus:

- job `READY PICKUP`
- reminder schedule
- overdue pickup
- unclaimed workflow
- complete pickup

Pickup module digunakan oleh:

- Owner untuk monitor semua pickup
- Technician untuk job assigned sahaja

## 18. Notifications

Notifications akan menjadi tab/module sendiri.

Module ini ialah **notification log + follow-up queue**, bukan automation penuh dari awal.

Fungsi:

- Senarai semua notification customer berkaitan job.
- Filter status:
  - Pending
  - Sent
  - Failed
  - Need follow-up
- Filter jenis:
  - Ready pickup Day 0
  - Reminder Day 7/14/30/60
  - Customer confirmation follow-up
  - Unclaimed final notice
- Setiap notification link kepada Job ID.
- Simpan channel:
  - WhatsApp
  - Phone call
  - SMS/email jika perlu nanti
- Simpan result:
  - sent successfully
  - customer replied
  - no response
  - failed/wrong number

### Notification Permission

Owner/Fadhil:

- nampak semua notification
- boleh filter semua technician
- boleh rekod follow-up untuk mana-mana job
- boleh lihat failed notification dan overdue follow-up
- boleh ubah template/rules di Settings

Technician:

- hanya nampak notification untuk job assigned kepada dia
- boleh rekod hasil contact customer
- boleh hantar/copy template message untuk job dia
- tidak boleh lihat notification job technician lain

Technician notification queue:

- Today
- Overdue
- Upcoming
- Failed / Need retry

Item notification tunjuk:

- Job ID
- Customer name
- Phone
- Message type
- Due date
- Copy WhatsApp Message
- Mark Contacted
- No Response
- Open Job

## 19. Customers

Customers page menggunakan detail lengkap.

### Customer List

Customer List menyediakan:

- search customer name/phone
- active job count
- last visit/date
- total job history
- quick open active job

### Customer Detail

Customer Detail menyediakan:

- customer profile
- active jobs
- job history
- device history
- contact history
- linked POS references jika ada

Customer profile:

- name
- phone
- secondary contact jika ada
- notes
- consent/preferred contact channel

Device history:

- brand/model
- serial number
- issue history
- previous repair outcome

Contact history:

- WhatsApp/call log
- pickup reminders
- customer decision records
- failed contact attempts

Permission:

- Owner boleh nampak semua customer detail.
- Technician hanya nampak customer detail berkaitan job yang dia assigned atau job yang dia boleh urus.

## 20. Reports

Reports akan bermula ringkas tetapi menyokong export CSV/PDF.

Reports utama:

### Job Summary

- total job created
- completed jobs
- active jobs
- not proceed
- unclaimed
- filter ikut tarikh

### Status Breakdown

Bilangan job mengikut status:

- `NEW JOB`
- `WAITING FADHIL REVIEW`
- `WAITING CUSTOMER CONFIRMATION`
- `IN PROGRESS`
- `READY PICKUP`
- `UNCLAIMED`
- `COMPLETE`
- `NOT PROCEED`

### Technician Workload

- job diambil setiap technician
- job completed
- job still active
- average time from take job to ready pickup

### Pickup Report

- ready pickup
- reminder sent
- overdue pickup
- unclaimed jobs

### Not Proceed Report

- reason customer tidak proceed
- technician involved
- device type
- date range

### Completed Job History

- Job ID
- customer
- device
- technician
- completed date
- POS reference jika ada

Export:

- CSV untuk data table
- PDF untuk report ringkas yang boleh simpan/print
- Owner sahaja boleh export
- Export perlu masuk audit log

## 21. Settings

Settings mengandungi dua bahagian:

- Settings biasa
- Flow Rules

### Settings Biasa

- User / technician account
- Role assignment
- Shop info
- Language default
- Notification template
- Upload rules
- POS reference label/config

### Flow Rules

Flow Rules ialah bahagian khas untuk Owner/Fadhil configure rule operasi tanpa edit code.

Sebahagian rule boleh edit. Sebahagian rule view-only supaya flow penting tidak rosak.

#### Boleh Edit Oleh Owner

Reminder days:

- Day 0
- Day 7
- Day 14
- Day 30
- Day 60
- Day 90 unclaimed

Stuck job threshold:

- `NEW JOB` berapa hari
- `WAITING FADHIL REVIEW` berapa jam/hari
- `WAITING CUSTOMER CONFIRMATION` berapa hari
- `IN PROGRESS` berapa hari tanpa update

Required evidence:

- diagnosis wajib note sahaja atau note + gambar
- ready pickup wajib testing note atau tidak
- complete pickup wajib pickup note atau tidak

Reason list:

- reason `NOT PROCEED`
- reason release job
- reason unclaimed decision

Notification templates:

- BM template
- EN template

#### View-Only / Locked

Status sequence utama:

- `NEW JOB`
- `WAITING FADHIL REVIEW`
- `WAITING CUSTOMER CONFIRMATION`
- `IN PROGRESS`
- `NOT PROCEED`
- `READY PICKUP`
- `UNCLAIMED`
- `COMPLETE`

Locked rules:

- Technician tidak boleh repair sebelum `IN PROGRESS`.
- Owner review diperlukan sebelum customer decision.
- Audit log diperlukan untuk action penting.
- Role utama sistem hanya Owner dan Technician.

## 22. Timeline dan Audit

Timeline menggunakan konsep **layered timeline**.

Sistem menyimpan semua detail, tetapi UI hanya memaparkan ikut tahap keperluan.

### Dashboard

Dashboard hanya tunjuk latest important event.

Contoh:

```text
NO.0007
Waiting Fadhil Review
Last update: Diagnosis submitted by Hafiz, 10:32 AM
Action: Review diagnosis
```

### Jobs Side Panel

Side panel tunjuk 3-5 recent events sahaja.

Contoh:

```text
10:32 AM - Diagnosis submitted
9:50 AM - Evidence uploaded
9:20 AM - Job taken by Hafiz
```

### Job Detail > Timeline

Full timeline menyimpan semua event.

Default behavior:

- event biasa collapsed
- event penting auto-expanded

Event penting auto-expanded:

- status change
- owner review
- customer decision
- ready pickup
- unclaimed decision
- complete pickup

Event biasa collapsed:

- evidence uploaded
- note added
- notification copied/sent
- minor progress update

Filter timeline:

- All
- Status
- Diagnosis
- Evidence
- Owner Review
- Customer Decision
- Pickup
- Notifications
- System/Audit

### Audit Log

Audit log menyimpan action sensitif dan sistem-level.

Contoh audit:

- permission denied
- override
- report export
- settings changes
- role/user changes

Dalam job timeline, hanya audit yang berkaitan job itu dipaparkan.

## 23. Bahasa / Localization

Sistem menyokong dua bahasa:

- Bahasa Melayu
- English

Pilihan bahasa adalah **per user**.

Behavior:

- Setiap user boleh pilih bahasa sendiri.
- Pilihan disimpan pada profile user.
- Technician A boleh guna BM, Technician B boleh guna English.
- Owner boleh set default bahasa untuk user baru.
- Kalau user belum pilih, sistem guna default kedai atau browser language.

Internal status code kekal constant/English untuk sistem.

Contoh display:

| Bahasa Melayu | English |
| --- | --- |
| Papan Pemuka | Dashboard |
| Kerja | Jobs |
| Imbas Job | Scan Job |
| Kerja Saya | My Jobs |
| Semakan | Review |
| Ambil Barang | Pickup |
| Pelanggan | Customers |
| Laporan | Reports |
| Tetapan | Settings |
| Notifikasi | Notifications |

Notification template boleh ada versi BM dan EN.

PDF report ikut bahasa user yang generate report.

## 24. Customer-Facing Screen

Untuk MVP, customer tidak membuat approval sendiri melalui link.

Customer-facing approval link tidak masuk scope MVP.

Keputusan customer direkod oleh Owner/Technician selepas komunikasi sebenar melalui:

- WhatsApp
- phone call
- in shop
- other

Jika customer-facing screen dibuat pada masa depan, branding tetap `Fadhil CareDesk`, tetapi tidak paparkan info dalaman seperti:

- technician note penuh
- audit log
- internal timeline

## 25. Suggested Build Approach

Pendekatan yang dicadangkan:

**Phased Operations Platform**

Design akhir dirancang lengkap, tetapi implementation dibuat berfasa.

### Phase 1: Core Repair Flow

- login role
- Scan Job wizard
- responsive Jobs board/list
- Job Detail tabs
- My Jobs
- Owner Review
- Customer Decision
- optional WhatsApp screenshot evidence

### Phase 2: Pickup & Notifications

- pickup queue
- reminder schedule
- Notifications module
- contact result log
- unclaimed workflow

### Phase 3: Customers & History

- customer detail
- device history
- contact history
- job history

### Phase 4: Reports & Export

- job summary
- status breakdown
- technician workload
- pickup report
- not proceed report
- CSV/PDF export

### Phase 5: Settings & Flow Rules

- user language
- notification templates
- editable reminder/stuck/evidence rules
- locked core flow rules

## 26. Open Items To Confirm Later

Perkara ini belum perlu dikunci sekarang, tetapi perlu diputuskan sebelum implementation detail:

- Exact BM/EN wording untuk semua status dan button.
- Exact notification templates BM/EN.
- Exact POS reference fields yang perlu disimpan.
- Upload limits untuk image/video/PDF.
- Sama ada WhatsApp screenshot perlu image sahaja atau PDF juga dibenarkan.
- Export PDF layout.
- Mobile bottom navigation final structure.
- Desktop sidebar collapsed behavior.
- Data retention policy untuk evidence dan completed job history.

## 27. Summary Keputusan Yang Sudah Dikunci

- App name: `Fadhil CareDesk`
- Logo sementara: `FC`
- Sistem job-centric berdasarkan Job ID.
- Quotation/payment tidak diurus dalam repair system.
- POS Reference boleh disimpan.
- Role hanya Owner/Fadhil dan Technician.
- Technician navigation ringkas.
- Owner navigation fokus tab penting.
- UI style: Workshop Warm Practical.
- Status ada warna tersendiri, urgent lebih kuat.
- Navigation desktop guna sidebar kiri.
- Mobile-first responsive web app.
- Jobs desktop guna board ikut status.
- Jobs mobile guna status tabs/list.
- Job card ringkas + detail progressive.
- Klik job buka side panel, full detail untuk action besar.
- Scan Job guna wizard step-by-step.
- Job Detail guna tabs.
- Owner Review dan Customer Decision tab berasingan.
- Owner dan Technician boleh record Customer Decision.
- WhatsApp screenshot evidence optional tetapi disediakan.
- Dashboard Owner fokus action queue.
- Settings ada Flow Rules, dengan sebahagian rule locked.
- Reports ringkas tetapi ada export CSV/PDF.
- Global Search disediakan.
- Notifications jadi module sendiri.
- Technician hanya urus notification job assigned.
- My Jobs technician guna priority list.
- Customer detail lengkap dengan device/contact history.
- Timeline layered, event penting auto-expanded.
- Dua bahasa BM/EN per user.
- Customer approval link tidak masuk MVP.
