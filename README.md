# 🎓 Saint Joseph College (SJC) — CCS Subject Monitoring System

<div align="center">

![CCS Monitor Banner](https://img.shields.io/badge/Saint%20Joseph%20College-College%20of%20Computer%20Studies-ea580c?style=for-the-badge&logo=graduation-cap)
![React](https://img.shields.io/badge/React-19.0.0-61DAFB?style=for-the-badge&logo=react)
![Vite](https://img.shields.io/badge/Vite-8.1.5-646CFF?style=for-the-badge&logo=vite)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4.0-06B6D4?style=for-the-badge&logo=tailwindcss)
![Supabase](https://img.shields.io/badge/Supabase-Database-3FCF8E?style=for-the-badge&logo=supabase)

**An advanced, real-time Academic Management, Section Allocation, and Subject Enrollment Platform designed for the College of Computer Studies at Saint Joseph College.**

</div>

---

## 📌 Project Overview

The **CCS Subject Monitoring System** is a state-of-the-art web application engineered to streamline academic advising, curriculum tracking, student section allocations, and prerequisite validation for **Saint Joseph College**.

It provides Department Secretaries, Academic Advisers, and Students with unified tools to manage course enrollments, monitor irregular academic standings, track degree progression across 4 academic years, and enforce prerequisite compliance dynamically.

---

## ✨ Key Features

### 🏢 1. Section Allocations & Expansive Course Detail
- **Full-Page Expansive View**: Inspect course offerings with hero banners, unit breakdowns, lecture/lab hour splits, and prerequisites.
- **Seat Capacity Tracking**: Visual progress cards tracking seat fill ratios (e.g., `45 / 45 Capacity`) and section allocations (`BSIT 1-A`, `BSIT 2-A`, etc.).
- **Live Student Search Enrollment**: Real-time matching search list allowing Department Secretaries and Academic Advisers to enroll eligible students directly from the live database.
- **Distraction-Free Enrollment Panel**: Fixed-height scroll containers and debounced search matching (150ms) to ensure smooth typing UX with zero layout jitter.

### 👨‍🎓 2. Student Registry & Academic Records
- **Multi-Year Student Registry**: Filter students across 1st Year, 2nd Year, 3rd Year, and 4th Year levels or search by Name, Student ID, or Section.
- **Academic Standing Analysis**: Automatically tags regular vs. irregular status based on failed subject records and academic concern flags.
- **Semester Subject Records**: Full historical grade records (Midterm and Final Grades) with prerequisite status validation (`PREREQ NOT MET` alert flags).
- **Printable Advising Reports**: One-click printable academic transcripts and advising summaries for academic evaluations.

### 📚 3. Curriculum Management
- **Degree Programs Supported**:
  - **BSIT**: Bachelor of Science in Information Technology
  - **BSCS**: Bachelor of Science in Computer Science
  - **ACT**: Associate in Computer Technology
- **Curriculum Builder**: Add new curriculum subjects dynamically to target academic years and semesters.

### 🔐 4. Role-Based Feature Access
- **Department Secretary**: Full administrative authority — enroll students, edit section capacities, update student statuses, and add curriculum courses.
- **Academic Adviser**: Encode student grades, review advising histories, monitor irregular student concerns, and enroll students.
- **Student View**: Scoped view restricting access strictly to personal academic history, enrolled subjects, and curriculum tracks with privacy protection.

### ⚡ 5. High-Performance Hybrid Data Architecture
- **Supabase Cloud DB Integration**: Real-time cloud syncing for persistent database records.
- **Zero-Latency Hydration**: Instant local cache hydration (`localStorage`) ensures 0.0-second page loads without data flicker or pop-in on refresh.

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend Core** | React 19, JavaScript (ES6+), HTML5 |
| **Build Tool & Bundler** | Vite 8 |
| **Styling & UI** | Tailwind CSS v4, Lucide React Icons |
| **Routing** | React Router v7 |
| **Database & Backend** | Supabase Client SDK |

---

## 📁 Repository Structure

```
css-monitor/
├── public/                     # Static assets & public resources
├── src/
│   ├── components/             # Reusable UI components
│   │   └── ProfileModal.jsx    # User profile & settings modal
│   ├── context/                # React Context Providers
│   │   ├── AuthContext.jsx     # User authentication & role management
│   │   ├── DataContext.jsx     # Master database context & Supabase sync
│   │   └── ThemeContext.jsx    # System theme context
│   ├── layouts/
│   │   └── MainLayout.jsx      # Topbar header & sidebar navigation layout
│   ├── lib/
│   │   └── supabase.js         # Supabase client initialization
│   ├── pages/                  # Main Application Views
│   │   ├── Dashboard.jsx       # Academic statistics & analytics
│   │   ├── EnrollmentSections.jsx # Course allocations & live student enrollment
│   │   ├── Login.jsx           # User authentication login view
│   │   ├── Profile.jsx         # Profile settings view
│   │   ├── StudentRecord.jsx   # Individual student transcript & advising history
│   │   ├── Students.jsx        # Multi-year student registry table
│   │   └── Subjects.jsx        # Master curriculum browser & subject manager
│   ├── index.css               # Base Tailwind CSS directives & global styling
│   └── main.jsx                # Application root entry point
├── package.json                # Project dependencies & npm scripts
├── vite.config.js              # Vite configuration setup
└── README.md                   # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18.0.0 or higher recommended)
- **npm** (v9.0.0 or higher)

### Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/IsaachRy11/capstoneV.2.git
   cd capstoneV.2
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the project root:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Launch Development Server**:
   ```bash
   npm run dev
   ```
   Open your browser and navigate to `http://localhost:5173`.

5. **Build for Production**:
   ```bash
   npm run build
   ```

---

## 🏫 Academic Context

Developed for **Saint Joseph College**, Maasin City, Southern Leyte — **College of Computer Studies (CCS)**.

Designed to fulfill strict academic record standards:
- Dynamic calculation derived from live database context (`DataContext`).
- Normalized string matching for course codes and section assignments.
- Role-scoped administrative controls protecting student privacy.

---

<div align="center">

**Saint Joseph College · College of Computer Studies**  
*Building Excellence in Technological Education*

</div>
