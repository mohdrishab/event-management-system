# 🎓 University Event & Leave Management System

A modern **University Event / Leave Application Management Platform** designed to simplify how students request permissions for academic events and how faculty review, approve, or reject them.

Built with a **modern full-stack architecture (React + Supabase + Vite + Tailwind)**, the system provides a smooth workflow for **students, faculty, and HoDs** while keeping the approval process transparent and efficient.

---

# ✨ Overview

Universities frequently face challenges managing student requests for events such as:

* Hackathons
* Workshops
* Conferences
* Technical competitions
* Academic leave requests

Traditional manual processes are slow, paper-based, and difficult to track.

This platform digitizes the entire process — allowing students to submit requests and faculty to review them instantly.

---

# 🚀 Current Features

## 👨‍🎓 Student Portal

Students can easily submit and track event applications.

**Capabilities**

* Submit event/leave application
* Provide event details and reason
* Upload event images or supporting documents
* Track approval status
* View decision history

**Application details include**

* Student name
* USN (University Seat Number)
* Event name
* Event duration
* Event location
* Organizer
* Reason for attending

---

## 👨‍🏫 Faculty Dashboard

Faculty members can review and manage student applications.

**Key Features**

* View all pending applications
* Approve or reject requests
* Mark applications as priority
* View student details and event information
* See decision history

---

## ❤️ Swipe Approval Mode (Unique Feature)

Inspired by modern UI interactions, faculty can quickly review applications using a **swipe interface**.

* 👉 Swipe right → Approve
* 👈 Swipe left → Reject

This makes reviewing multiple applications **fast and intuitive**.

---

## 🏛 HoD Administration Panel

Heads of Department have additional administrative controls.

**Capabilities**

* Assign applications to faculty members
* Manage faculty approval permissions
* Monitor decision history
* Manage staff roles

---

## 📊 Application History

A searchable decision history allows faculty to review past actions.

**Search by**

* Student name
* USN
* Event name

Each record shows:

* Application details
* Approval status
* Faculty decision maker
* Timestamp of action

---

# 🧠 Smart Workflow

The platform follows a clear workflow:

1️⃣ Student submits application
2️⃣ Application enters **Pending Queue**
3️⃣ Faculty reviews request
4️⃣ Faculty **Approves or Rejects**
5️⃣ Decision is stored and visible in history

---

# 🛠 Tech Stack

### Frontend

* React
* TypeScript
* Vite
* TailwindCSS
* Lucide Icons

### Backend

* Supabase (PostgreSQL + API)

### Infrastructure

* Vercel Deployment

---

# 📂 Project Structure

```
src/
 ├─ components/
 ├─ pages/
 │   ├─ StudentDashboard.tsx
 │   ├─ TeacherDashboard.tsx
 │   └─ Login.tsx
 ├─ services/
 │   └─ storageService.ts
 ├─ lib/
 │   └─ supabaseClient.ts
 ├─ types/
 └─ main.tsx
```

---

# 🔐 Authentication Model

Users are divided into three roles:

| Role      | Permissions            |
| --------- | ---------------------- |
| Student   | Submit applications    |
| Professor | Review applications    |
| HoD       | Administrative control |

---

# 📈 Planned Future Features

The platform is actively evolving. Upcoming features include:

---

## 📱 Mobile App

Native mobile applications for:

* Android
* iOS

Students and faculty will be able to manage applications directly from their phones.

---

## 🔔 Real-Time Notifications

Students will receive instant notifications when:

* Their application is approved
* Their application is rejected
* Faculty requests additional information

---

## 📄 Auto-Generated Permission Letters

Approved applications will automatically generate a **PDF permission letter** that students can download and present.

---

## 🧾 QR Code Attendance System

Events will include QR code attendance verification so colleges can confirm that approved students actually attended.

---

## 📊 Analytics Dashboard

Department heads will gain insights into:

* Number of student applications
* Approval rates
* Most popular events
* Faculty workload

---

## 🤖 AI-Assisted Review

AI tools may assist faculty by identifying:

* duplicate applications
* suspicious submissions
* missing information

---

## 📁 Document Verification

Students will be able to upload supporting documents such as:

* Event invitations
* Registration confirmations
* Participation certificates

---

# 🎯 Vision

The long-term goal of this platform is to create a **complete digital ecosystem for university event participation and student leave management**.

By automating administrative workflows, universities can:

* Reduce paperwork
* Improve transparency
* Increase participation in academic events
* Save faculty time

---

# 💡 Inspiration

This project was created to modernize how academic institutions manage event participation and leave approvals.

A system like this can support **thousands of students while keeping the process efficient and organized**.

---

# 🤝 Contributing

Contributions, suggestions, and improvements are welcome.

If you have ideas for features or improvements, feel free to open an issue or submit a pull request.

---



⭐ If you found this project useful, consider giving it a star!
>
