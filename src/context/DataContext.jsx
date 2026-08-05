import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

const DataContext = createContext();

// Helper: Calculate GWA
export function computeGWA(semesters = []) {
  let totalPoints = 0;
  let totalUnits = 0;

  semesters.forEach((sem) => {
    (sem.subjects || []).forEach((sub) => {
      if (sub.final_grade !== null && sub.final_grade !== undefined && sub.status !== "Dropped") {
        const grade = Number(sub.final_grade);
        const units = Number(sub.units || sub.u || 3);
        if (!isNaN(grade) && grade > 0) {
          totalPoints += grade * units;
          totalUnits += units;
        }
      }
    });
  });

  return totalUnits > 0 ? +(totalPoints / totalUnits).toFixed(2) : 0;
}

// Initial Mock Sections (SJC RGDPD Portal structure)
const INITIAL_SECTIONS = [
  { id: "SEC-IT1A", name: "BSIT 1-A", year: 1, program: "BS Information Technology", maxCapacity: 45, adviser: "Prof. R. Castro", room: "Lab 201" },
  { id: "SEC-IT1B", name: "BSIT 1-B", year: 1, program: "BS Information Technology", maxCapacity: 45, adviser: "Prof. L. Santos", room: "Lab 202" },
  { id: "SEC-IT2A", name: "BSIT 2-A", year: 2, program: "BS Information Technology", maxCapacity: 40, adviser: "Dr. A. Reyes", room: "Lab 301" },
  { id: "SEC-IT3A", name: "BSIT 3-A", year: 3, program: "BS Information Technology", maxCapacity: 40, adviser: "Prof. E. Mendoza", room: "Lab 302" },
  { id: "SEC-IT4A", name: "BSIT 4-A", year: 4, program: "BS Information Technology", maxCapacity: 35, adviser: "Dr. C. Villanueva", room: "Lab 401" },

  { id: "SEC-CS1A", name: "BSCS 1-A", year: 1, program: "BS Computer Science", maxCapacity: 40, adviser: "Prof. G. Ramos", room: "CS Room 1" },
  { id: "SEC-CS2A", name: "BSCS 2-A", year: 2, program: "BS Computer Science", maxCapacity: 40, adviser: "Dr. M. Garcia", room: "CS Room 2" },
  { id: "SEC-CS3A", name: "BSCS 3-A", year: 3, program: "BS Computer Science", maxCapacity: 35, adviser: "Prof. N. Bautista", room: "CS Room 3" },
  { id: "SEC-CS4A", name: "BSCS 4-A", year: 4, program: "BS Computer Science", maxCapacity: 30, adviser: "Dr. H. Soriano", room: "CS Room 4" },

  { id: "SEC-ACT1A", name: "ACT 1-A", year: 1, program: "Associate in Computer Technology", maxCapacity: 45, adviser: "Prof. J. Aquino", room: "Tech Lab 1" },
  { id: "SEC-ACT2A", name: "ACT 2-A", year: 2, program: "Associate in Computer Technology", maxCapacity: 40, adviser: "Prof. D. Navarro", room: "Tech Lab 2" },
];

// Initial Master Curriculum Dataset
const INITIAL_CURRICULUM = {
  "BSIT": {
    programName: "BS Information Technology",
    description: "Prepares students to analyze, design, implement, and administer IT solutions and computing infrastructure.",
    years: [
      {
        year: 1,
        label: "1st Year",
        semesters: [
          {
            sem: 1,
            label: "1st Semester",
            subjects: [
              { code: "IT 101", title: "Introduction to Computing", units: 3, lec: 2, lab: 3, prereq: "None", desc: "Overview of computer systems, digital literacy, hardware architecture, and foundational software engineering concepts." },
              { code: "IT 102", title: "Computer Programming 1 (Fundamentals)", units: 3, lec: 2, lab: 3, prereq: "None", desc: "Introduction to problem solving, logic formulation, control structures, and fundamental syntax in C++/Java." },
              { code: "MATH 101", title: "College Algebra & Trigonometry", units: 3, lec: 3, lab: 0, prereq: "None", desc: "Fundamental algebraic concepts, polynomial functions, exponential equations, and trigonometric systems." },
              { code: "GE 101", title: "Understanding the Self", units: 3, lec: 3, lab: 0, prereq: "None", desc: "Exploration of personal identity, psychological development, and social dynamics." },
              { code: "PE 101", title: "Physical Fitness & Wellness", units: 2, lec: 2, lab: 0, prereq: "None", desc: "Physical education, motor skill development, health maintenance, and movement competency." },
              { code: "NSTP 1", title: "National Service Training Program 1", units: 3, lec: 3, lab: 0, prereq: "None", desc: "Civic welfare training, community engagement, and national service awareness." }
            ]
          },
          {
            sem: 2,
            label: "2nd Semester",
            subjects: [
              { code: "IT 104", title: "Computer Programming 2 (Object-Oriented)", units: 3, lec: 2, lab: 3, prereq: "IT 102", desc: "Object-oriented paradigm, encapsulation, inheritance, polymorphism, abstract classes, and exception handling." },
              { code: "IT 105", title: "Discrete Structures 1", units: 3, lec: 3, lab: 0, prereq: "MATH 101", desc: "Set theory, propositional logic, mathematical induction, graph theory, and combinatorics for computing." },
              { code: "GE 102", title: "Readings in Philippine History", units: 3, lec: 3, lab: 0, prereq: "None", desc: "Analysis of primary historical sources and key socio-political milestones in Philippine history." },
              { code: "GE 103", title: "The Contemporary World", units: 3, lec: 3, lab: 0, prereq: "None", desc: "Global systems, international relations, economic globalization, and modern cultural transformations." },
              { code: "PE 102", title: "Rhythmic Activities", units: 2, lec: 2, lab: 0, prereq: "PE 101", desc: "Cultural dance traditions, movement rhythm, physical coordination, and aerobic wellness." },
              { code: "NSTP 2", title: "National Service Training Program 2", units: 3, lec: 3, lab: 0, prereq: "NSTP 1", desc: "Community outreach projects, literacy training, and public service execution." }
            ]
          }
        ]
      },
      {
        year: 2,
        label: "2nd Year",
        semesters: [
          {
            sem: 1,
            label: "1st Semester",
            subjects: [
              { code: "IT 103", title: "Data Structures & Algorithms", units: 3, lec: 2, lab: 3, prereq: "IT 104", desc: "Linear and non-linear data structures (arrays, linked lists, stacks, queues, trees, graphs) and algorithmic analysis." },
              { code: "IT 201", title: "Database Management Systems 1", units: 3, lec: 2, lab: 3, prereq: "IT 104", desc: "Relational database design, ER modeling, SQL query language, normalization, and ACID transaction properties." },
              { code: "IT 203", title: "Human-Computer Interaction (HCI)", units: 3, lec: 2, lab: 3, prereq: "IT 104", desc: "UI/UX principles, prototyping, usability testing, accessibility guidelines, and user-centered design methodologies." },
              { code: "GE 104", title: "Purposive Communication", units: 3, lec: 3, lab: 0, prereq: "None", desc: "Effective oral and written communication in academic and professional technological settings." },
              { code: "PE 103", title: "Individual & Dual Sports", units: 2, lec: 2, lab: 0, prereq: "PE 101", desc: "Rules, techniques, and sportsmanship in badminton, table tennis, and athletics." }
            ]
          },
          {
            sem: 2,
            label: "2nd Semester",
            subjects: [
              { code: "IT 202", title: "Web Systems & Technologies 1", units: 3, lec: 2, lab: 3, prereq: "IT 201", desc: "Front-end web development utilizing HTML5, CSS3, JavaScript, DOM manipulation, and responsive framework architectures." },
              { code: "IT 204", title: "Object-Oriented Analysis & Design", units: 3, lec: 3, lab: 0, prereq: "IT 103", desc: "UML diagrams, design patterns, software architecture models, and requirement specifications." },
              { code: "IT 205", title: "Networking 1 (Fundamentals & Architecture)", units: 3, lec: 2, lab: 3, prereq: "IT 101", desc: "OSI and TCP/IP models, IP addressing, subnetting, Ethernet technology, and network infrastructure configuration." },
              { code: "GE 105", title: "Art Appreciation", units: 3, lec: 3, lab: 0, prereq: "None", desc: "Visual arts, aesthetics, cultural expression, and creative historical movements." },
              { code: "PE 104", title: "Team Sports", units: 2, lec: 2, lab: 0, prereq: "PE 101", desc: "Basketball, volleyball, team strategy, physical conditioning, and tournament play." }
            ]
          }
        ]
      },
      {
        year: 3,
        label: "3rd Year",
        semesters: [
          {
            sem: 1,
            label: "1st Semester",
            subjects: [
              { code: "IT 301", title: "Quantitative Methods in IT", units: 3, lec: 3, lab: 0, prereq: "MATH 101", desc: "Applied statistics, probability distributions, forecasting models, and quantitative decision analysis." },
              { code: "IT 303", title: "Web Systems & Technologies 2 (Full Stack)", units: 3, lec: 2, lab: 3, prereq: "IT 202", desc: "Server-side web applications, RESTful APIs, Node.js/Express backend, database ORMs, and authentication systems." },
              { code: "IT 305", title: "Systems Integration & Architecture", units: 3, lec: 2, lab: 3, prereq: "IT 204", desc: "Middleware integration, enterprise application architecture, microservices, and system interoperability." },
              { code: "IT 307", title: "Information Assurance & Security 1", units: 3, lec: 2, lab: 3, prereq: "IT 205", desc: "Cryptography, access controls, network vulnerability assessments, threat mitigation, and security policies." },
              { code: "GE 106", title: "Ethics in Technology", units: 3, lec: 3, lab: 0, prereq: "None", desc: "Moral philosophy, intellectual property rights, data privacy laws, and ethical issues in computing." }
            ]
          },
          {
            sem: 2,
            label: "2nd Semester",
            subjects: [
              { code: "IT 302", title: "Mobile Application Development", units: 3, lec: 2, lab: 3, prereq: "IT 303", desc: "Mobile application design, Flutter/React Native frameworks, mobile UI guidelines, and native API integration." },
              { code: "IT 304", title: "Software Engineering 1", units: 3, lec: 3, lab: 0, prereq: "IT 305", desc: "Agile project methodologies, sprint management, requirement gathering, and software testing procedures." },
              { code: "IT 306", title: "Networking 2 (Routing & Switching)", units: 3, lec: 2, lab: 3, prereq: "IT 205", desc: "VLAN configuration, OSPF/EIGRP routing protocols, switch security, and network troubleshooting." },
              { code: "IT 308", title: "Capstone Project 1 (Proposal & Specification)", units: 3, lec: 3, lab: 0, prereq: "IT 305", desc: "IT research proposal defense, system requirement specifications, architectural design, and project planning." }
            ]
          }
        ]
      },
      {
        year: 4,
        label: "4th Year",
        semesters: [
          {
            sem: 1,
            label: "1st Semester",
            subjects: [
              { code: "IT 401", title: "Capstone Project 2 (Implementation & Defense)", units: 3, lec: 1, lab: 6, prereq: "IT 308", desc: "Full software/system development, deployment, user acceptance testing, and final oral defense." },
              { code: "IT 403", title: "Systems Administration & Maintenance", units: 3, lec: 2, lab: 3, prereq: "IT 306", desc: "Linux/Windows server deployment, Active Directory, cloud infrastructure, and backup recovery procedures." },
              { code: "IT 405", title: "IT Technopreneurship & Innovation", units: 3, lec: 3, lab: 0, prereq: "IT 304", desc: "Technology business planning, startup lifecycle, product monetization, and intellectual property." },
              { code: "GE 107", title: "Science, Technology, and Society", units: 3, lec: 3, lab: 0, prereq: "None", desc: "Impact of scientific advancements on social institutions, environmental sustainability, and human culture." }
            ]
          },
          {
            sem: 2,
            label: "2nd Semester",
            subjects: [
              { code: "IT 402", title: "On-the-Job Training / Industry Internship (486 Hours)", units: 6, lec: 0, lab: 18, prereq: "All Academic Courses", desc: "Supervised industry internship immersion in accredited partner companies for IT practical application." }
            ]
          }
        ]
      }
    ]
  },
  "BSCS": {
    programName: "BS Computer Science",
    description: "Focuses on computing theory, mathematical foundations, algorithmic complexity, artificial intelligence, and software design.",
    years: [
      {
        year: 1,
        label: "1st Year",
        semesters: [
          {
            sem: 1,
            label: "1st Semester",
            subjects: [
              { code: "CS 101", title: "Introduction to Computer Science", units: 3, lec: 2, lab: 3, prereq: "None", desc: "Foundational computer science principles, computational thinking, binary representation, and hardware structures." },
              { code: "CS 102", title: "Programming Fundamentals (Python)", units: 3, lec: 2, lab: 3, prereq: "None", desc: "Algorithmic thinking, data structures, recursion, modular programming, and Python syntax." },
              { code: "MATH 101", title: "Calculus 1 (Differential Calculus)", units: 3, lec: 3, lab: 0, prereq: "None", desc: "Limits, continuity, derivatives of algebraic and transcendental functions, and rate optimization." },
              { code: "GE 101", title: "Understanding the Self", units: 3, lec: 3, lab: 0, prereq: "None", desc: "Personal identity, cognitive processes, and emotional intelligence." }
            ]
          },
          {
            sem: 2,
            label: "2nd Semester",
            subjects: [
              { code: "CS 104", title: "Object-Oriented Programming (Java)", units: 3, lec: 2, lab: 3, prereq: "CS 102", desc: "Classes, objects, inheritance, interface implementation, design principles, and exception handling." },
              { code: "MATH 102", title: "Calculus 2 (Integral Calculus)", units: 3, lec: 3, lab: 0, prereq: "MATH 101", desc: "Definite and indefinite integrals, integration techniques, and physical application models." },
              { code: "CS 105", title: "Discrete Mathematics for CS", units: 3, lec: 3, lab: 0, prereq: "CS 102", desc: "Formal logic, proof techniques, graph theory, tree structures, and finite state machines." }
            ]
          }
        ]
      },
      {
        year: 2,
        label: "2nd Year",
        semesters: [
          {
            sem: 1,
            label: "1st Semester",
            subjects: [
              { code: "CS 201", title: "Data Structures & Algorithm Analysis", units: 3, lec: 2, lab: 3, prereq: "CS 104", desc: "Advanced data structures, asymptotic Big-O notation, searching and sorting algorithm analysis." },
              { code: "CS 203", title: "Computer Organization & Architecture", units: 3, lec: 2, lab: 3, prereq: "CS 101", desc: "Digital logic, CPU pipeline design, assembly language programming, and memory hierarchy." }
            ]
          },
          {
            sem: 2,
            label: "2nd Semester",
            subjects: [
              { code: "CS 202", title: "Automata & Formal Languages", units: 3, lec: 3, lab: 0, prereq: "CS 201", desc: "Regular expressions, context-free grammars, Pushdown automata, and Turing machine theory." },
              { code: "CS 204", title: "Operating Systems Principles", units: 3, lec: 2, lab: 3, prereq: "CS 203", desc: "Process scheduling, thread synchronization, memory management, file systems, and virtual memory." }
            ]
          }
        ]
      },
      {
        year: 3,
        label: "3rd Year",
        semesters: [
          {
            sem: 1,
            label: "1st Semester",
            subjects: [
              { code: "CS 301", title: "Artificial Intelligence & Machine Learning", units: 3, lec: 2, lab: 3, prereq: "CS 201", desc: "Search heuristics, neural networks, supervised classification, reinforcement learning, and NLP." },
              { code: "CS 303", title: "Software Engineering 1", units: 3, lec: 3, lab: 0, prereq: "CS 201", desc: "Agile methodologies, software architectural design, requirement analysis, and unit testing." }
            ]
          },
          {
            sem: 2,
            label: "2nd Semester",
            subjects: [
              { code: "CS 302", title: "Compiler Design & Construction", units: 3, lec: 2, lab: 3, prereq: "CS 202", desc: "Lexical analysis, parsing algorithms, intermediate code generation, and code optimization." },
              { code: "CS 308", title: "CS Thesis 1 (Research Proposal)", units: 3, lec: 3, lab: 0, prereq: "CS 301", desc: "Algorithmic research proposal, literature review, methodology design, and proposal defense." }
            ]
          }
        ]
      },
      {
        year: 4,
        label: "4th Year",
        semesters: [
          {
            sem: 1,
            label: "1st Semester",
            subjects: [
              { code: "CS 401", title: "CS Thesis 2 (Defense & Publication)", units: 3, lec: 1, lab: 6, prereq: "CS 308", desc: "Thesis implementation, computational benchmarking, research manuscript writing, and oral defense." }
            ]
          },
          {
            sem: 2,
            label: "2nd Semester",
            subjects: [
              { code: "CS 402", title: "Industry Practicum / Internship (486 Hours)", units: 6, lec: 0, lab: 18, prereq: "All Academic Courses", desc: "Professional computer science internship in software engineering or R&D organizations." }
            ]
          }
        ]
      }
    ]
  },
  "ACT": {
    programName: "Associate in Computer Technology",
    description: "2-year intensive program building practical computer support, web technology, and network technician competencies.",
    years: [
      {
        year: 1,
        label: "1st Year",
        semesters: [
          {
            sem: 1,
            label: "1st Semester",
            subjects: [
              { code: "ACT 101", title: "Computer Fundamentals & Office Productivity", units: 3, lec: 2, lab: 3, prereq: "None", desc: "Word processing, spreadsheet formulas, presentation software, and computer maintenance." },
              { code: "ACT 102", title: "Basic Programming & Logic Formulation", units: 3, lec: 2, lab: 3, prereq: "None", desc: "Flowcharting, pseudocode development, variable scope, and fundamental syntax." }
            ]
          },
          {
            sem: 2,
            label: "2nd Semester",
            subjects: [
              { code: "ACT 103", title: "Computer Hardware & Network Troubleshooting", units: 3, lec: 2, lab: 3, prereq: "ACT 101", desc: "PC assembly, BIOS configuration, OS installation, and basic cabling." }
            ]
          }
        ]
      },
      {
        year: 2,
        label: "2nd Year",
        semesters: [
          {
            sem: 1,
            label: "1st Semester",
            subjects: [
              { code: "ACT 201", title: "Web Design & HTML/CSS", units: 3, lec: 2, lab: 3, prereq: "ACT 102", desc: "Static website creation, responsive layouts, CSS flexbox, and media queries." }
            ]
          },
          {
            sem: 2,
            label: "2nd Semester",
            subjects: [
              { code: "ACT 202", title: "ACT Practicum / Industry Internship (300 Hours)", units: 4, lec: 0, lab: 12, prereq: "All ACT Academic Courses", desc: "On-the-job technical support and IT technician internship." }
            ]
          }
        ]
      }
    ]
  }
};

// 20 COMPREHENSIVE SAMPLE STUDENTS (CURRENT TERM: AY 2026-2027 2ND SEMESTER)
const COMPREHENSIVE_STUDENTS = [
  // --- 1ST YEAR STUDENTS (AY 2026-2027 2ND SEMESTER ENROLLED) ---
  {
    id: "2026-0001",
    name: "Sarah Lopez",
    avatar: "SL",
    course: "BS Information Technology",
    section: "BSIT 1-A",
    yr: 1,
    status: "Regular",
    gwa: 1.58,
    concerns: [],
    semesters: [
      {
        id: "sem-2026-1",
        label: "1st Semester",
        school_year: "2026-2027",
        gwa: 1.58,
        subjects: [
          { code: "IT 101", title: "Introduction to Computing", units: 3, midterm_grade: 1.5, final_grade: 1.5, status: "Passed", prerequisite: null },
          { code: "IT 102", title: "Computer Programming 1", units: 3, midterm_grade: 1.75, final_grade: 1.75, status: "Passed", prerequisite: null },
          { code: "MATH 101", title: "College Algebra", units: 3, midterm_grade: 1.5, final_grade: 1.5, status: "Passed", prerequisite: null },
        ]
      },
      {
        id: "sem-2026-2",
        label: "2nd Semester",
        school_year: "2026-2027",
        gwa: 0.0,
        subjects: [
          { code: "IT 104", title: "Computer Programming 2 (Object-Oriented)", units: 3, midterm_grade: null, final_grade: null, status: "Enrolled", prerequisite: "IT 102" },
          { code: "IT 105", title: "Discrete Structures 1", units: 3, midterm_grade: null, final_grade: null, status: "Enrolled", prerequisite: "MATH 101" },
          { code: "GE 102", title: "Readings in Philippine History", units: 3, midterm_grade: null, final_grade: null, status: "Enrolled", prerequisite: null },
        ]
      }
    ]
  },
  {
    id: "2026-0002",
    name: "Mark Bautista",
    avatar: "MB",
    course: "BS Information Technology",
    section: "BSIT 1-A",
    yr: 1,
    status: "Regular",
    gwa: 1.75,
    concerns: [],
    semesters: [
      {
        id: "sem-2026-1",
        label: "1st Semester",
        school_year: "2026-2027",
        gwa: 1.75,
        subjects: [
          { code: "IT 101", title: "Introduction to Computing", units: 3, midterm_grade: 1.75, final_grade: 1.75, status: "Passed", prerequisite: null },
          { code: "IT 102", title: "Computer Programming 1", units: 3, midterm_grade: 1.75, final_grade: 1.75, status: "Passed", prerequisite: null },
        ]
      },
      {
        id: "sem-2026-2",
        label: "2nd Semester",
        school_year: "2026-2027",
        gwa: 0.0,
        subjects: [
          { code: "IT 104", title: "Computer Programming 2 (Object-Oriented)", units: 3, midterm_grade: null, final_grade: null, status: "Enrolled", prerequisite: "IT 102" },
          { code: "IT 105", title: "Discrete Structures 1", units: 3, midterm_grade: null, final_grade: null, status: "Enrolled", prerequisite: "MATH 101" },
        ]
      }
    ]
  },
  {
    id: "2026-0003",
    name: "Chloe Cruz",
    avatar: "CC",
    course: "BS Information Technology",
    section: "BSIT 1-B",
    yr: 1,
    status: "Regular",
    gwa: 1.50,
    concerns: [],
    semesters: [
      {
        id: "sem-2026-1",
        label: "1st Semester",
        school_year: "2026-2027",
        gwa: 1.50,
        subjects: [
          { code: "IT 101", title: "Introduction to Computing", units: 3, midterm_grade: 1.5, final_grade: 1.5, status: "Passed", prerequisite: null },
          { code: "IT 102", title: "Computer Programming 1", units: 3, midterm_grade: 1.5, final_grade: 1.5, status: "Passed", prerequisite: null },
        ]
      },
      {
        id: "sem-2026-2",
        label: "2nd Semester",
        school_year: "2026-2027",
        gwa: 0.0,
        subjects: [
          { code: "IT 104", title: "Computer Programming 2 (Object-Oriented)", units: 3, midterm_grade: null, final_grade: null, status: "Enrolled", prerequisite: "IT 102" },
          { code: "IT 105", title: "Discrete Structures 1", units: 3, midterm_grade: null, final_grade: null, status: "Enrolled", prerequisite: "MATH 101" },
        ]
      }
    ]
  },
  {
    id: "2026-0004",
    name: "Daniel Mercado",
    avatar: "DM",
    course: "BS Information Technology",
    section: "BSIT 1-B",
    yr: 1,
    status: "Regular",
    gwa: 1.80,
    concerns: [],
    semesters: [
      {
        id: "sem-2026-1",
        label: "1st Semester",
        school_year: "2026-2027",
        gwa: 1.80,
        subjects: [
          { code: "IT 101", title: "Introduction to Computing", units: 3, midterm_grade: 1.75, final_grade: 1.75, status: "Passed", prerequisite: null },
        ]
      },
      {
        id: "sem-2026-2",
        label: "2nd Semester",
        school_year: "2026-2027",
        gwa: 0.0,
        subjects: [
          { code: "IT 104", title: "Computer Programming 2 (Object-Oriented)", units: 3, midterm_grade: null, final_grade: null, status: "Enrolled", prerequisite: "IT 102" },
        ]
      }
    ]
  },
  {
    id: "2026-0005",
    name: "Ethan Garcia",
    avatar: "EG",
    course: "BS Computer Science",
    section: "BSCS 1-A",
    yr: 1,
    status: "Regular",
    gwa: 1.45,
    concerns: [],
    semesters: [
      {
        id: "sem-2026-1",
        label: "1st Semester",
        school_year: "2026-2027",
        gwa: 1.45,
        subjects: [
          { code: "CS 101", title: "Introduction to Computer Science", units: 3, midterm_grade: 1.25, final_grade: 1.25, status: "Passed", prerequisite: null },
          { code: "CS 102", title: "Programming Fundamentals (Python)", units: 3, midterm_grade: 1.5, final_grade: 1.5, status: "Passed", prerequisite: null },
        ]
      },
      {
        id: "sem-2026-2",
        label: "2nd Semester",
        school_year: "2026-2027",
        gwa: 0.0,
        subjects: [
          { code: "CS 104", title: "Object-Oriented Programming (Java)", units: 3, midterm_grade: null, final_grade: null, status: "Enrolled", prerequisite: "CS 102" },
          { code: "MATH 102", title: "Calculus 2 (Integral Calculus)", units: 3, midterm_grade: null, final_grade: null, status: "Enrolled", prerequisite: "MATH 101" },
        ]
      }
    ]
  },

  // --- 2ND YEAR STUDENTS ---
  {
    id: "2025-0014",
    name: "Andrea Tan",
    avatar: "AT",
    course: "BS Information Technology",
    section: "BSIT 2-A",
    yr: 2,
    status: "Regular",
    gwa: 1.50,
    concerns: [],
    semesters: [
      {
        id: "sem-2025-1",
        label: "1st Semester",
        school_year: "2025-2026",
        gwa: 1.50,
        subjects: [
          { code: "IT 101", title: "Introduction to Computing", units: 3, midterm_grade: 1.25, final_grade: 1.25, status: "Passed", prerequisite: null },
          { code: "IT 102", title: "Computer Programming 1", units: 3, midterm_grade: 1.5, final_grade: 1.5, status: "Passed", prerequisite: null }
        ]
      },
      {
        id: "sem-2026-2",
        label: "2nd Semester",
        school_year: "2026-2027",
        gwa: 0.0,
        subjects: [
          { code: "IT 202", title: "Web Systems & Technologies 1", units: 3, midterm_grade: null, final_grade: null, status: "Enrolled", prerequisite: "IT 201" },
          { code: "IT 204", title: "Object-Oriented Analysis & Design", units: 3, midterm_grade: null, final_grade: null, status: "Enrolled", prerequisite: "IT 103" },
          { code: "IT 205", title: "Networking 1 (Fundamentals & Architecture)", units: 3, midterm_grade: null, final_grade: null, status: "Enrolled", prerequisite: "IT 101" }
        ]
      }
    ]
  },
  {
    id: "2025-0009",
    name: "Joshua Villanueva",
    avatar: "JV",
    course: "BS Information Technology",
    section: "BSIT 2-A",
    yr: 2,
    status: "Irregular",
    gwa: 3.25,
    concerns: ["Failed Subject: Failed IT 103"],
    semesters: [
      {
        id: "sem-2026-1",
        label: "1st Semester",
        school_year: "2026-2027",
        gwa: 3.25,
        subjects: [
          { code: "IT 102", title: "Computer Programming 1", units: 3, midterm_grade: 2.25, final_grade: 2.25, status: "Passed", prerequisite: null },
          { code: "IT 103", title: "Data Structures & Algorithms", units: 3, midterm_grade: 5.0, final_grade: 5.0, status: "Failed", prerequisite: "IT 102" }
        ]
      },
      {
        id: "sem-2026-2",
        label: "2nd Semester",
        school_year: "2026-2027",
        gwa: 0.0,
        subjects: [
          { code: "IT 202", title: "Web Systems & Technologies 1", units: 3, midterm_grade: null, final_grade: null, status: "Enrolled", prerequisite: "IT 201" },
          { code: "IT 205", title: "Networking 1 (Fundamentals & Architecture)", units: 3, midterm_grade: null, final_grade: null, status: "Enrolled", prerequisite: "IT 101" }
        ]
      }
    ]
  },
  {
    id: "2025-0002",
    name: "Hannah Ramos",
    avatar: "HR",
    course: "BS Information Technology",
    section: "BSIT 2-A",
    yr: 2,
    status: "Regular",
    gwa: 1.60,
    concerns: [],
    semesters: [
      {
        id: "sem-2026-2",
        label: "2nd Semester",
        school_year: "2026-2027",
        gwa: 0.0,
        subjects: [
          { code: "IT 202", title: "Web Systems & Technologies 1", units: 3, midterm_grade: null, final_grade: null, status: "Enrolled", prerequisite: "IT 201" },
          { code: "IT 204", title: "Object-Oriented Analysis & Design", units: 3, midterm_grade: null, final_grade: null, status: "Enrolled", prerequisite: "IT 103" },
          { code: "IT 205", title: "Networking 1 (Fundamentals & Architecture)", units: 3, midterm_grade: null, final_grade: null, status: "Enrolled", prerequisite: "IT 101" }
        ]
      }
    ]
  },
  {
    id: "2025-0003",
    name: "Ian Ocampo",
    avatar: "IO",
    course: "BS Computer Science",
    section: "BSCS 2-A",
    yr: 2,
    status: "Regular",
    gwa: 1.40,
    concerns: [],
    semesters: [
      {
        id: "sem-2026-2",
        label: "2nd Semester",
        school_year: "2026-2027",
        gwa: 0.0,
        subjects: [
          { code: "CS 202", title: "Automata & Formal Languages", units: 3, midterm_grade: null, final_grade: null, status: "Enrolled", prerequisite: "CS 201" },
          { code: "CS 204", title: "Operating Systems Principles", units: 3, midterm_grade: null, final_grade: null, status: "Enrolled", prerequisite: "CS 203" }
        ]
      }
    ]
  },
  {
    id: "2025-0004",
    name: "Julia Navarro",
    avatar: "JN",
    course: "Associate in Computer Technology",
    section: "ACT 2-A",
    yr: 2,
    status: "Regular",
    gwa: 1.70,
    concerns: [],
    semesters: [
      {
        id: "sem-2026-2",
        label: "2nd Semester",
        school_year: "2026-2027",
        gwa: 0.0,
        subjects: [
          { code: "ACT 202", title: "ACT Practicum / Industry Internship", units: 4, midterm_grade: null, final_grade: null, status: "Enrolled", prerequisite: "All ACT Academic Courses" }
        ]
      }
    ]
  },

  // --- 3RD YEAR STUDENTS ---
  {
    id: "2024-0006",
    name: "Anthony Flores",
    avatar: "AF",
    course: "BS Information Technology",
    section: "BSIT 3-A",
    yr: 3,
    status: "Irregular",
    gwa: 2.35,
    concerns: [
      "Failed MATH 101",
      "Failed IT 103",
      "Failed RES 301",
      "Irregular Status - Monitor Academic Progress"
    ],
    semesters: [
      {
        id: "sem-2024-1",
        label: "1st Semester",
        school_year: "2024-2025",
        gwa: 2.75,
        subjects: [
          { code: "IT 101", title: "Introduction to Computing", units: 3, midterm_grade: 2.0, final_grade: 2.0, status: "Passed", prerequisite: null },
          { code: "IT 102", title: "Computer Programming 1 (Fundamentals)", units: 3, midterm_grade: 2.25, final_grade: 2.25, status: "Passed", prerequisite: null },
          { code: "MATH 101", title: "College Algebra & Trigonometry", units: 3, midterm_grade: 5.0, final_grade: 5.0, status: "Failed", prerequisite: null },
          { code: "GE 101", title: "Understanding the Self", units: 3, midterm_grade: 1.75, final_grade: 1.75, status: "Passed", prerequisite: null },
          { code: "PE 101", title: "Physical Fitness & Wellness", units: 2, midterm_grade: 1.5, final_grade: 1.5, status: "Passed", prerequisite: null },
          { code: "NSTP 1", title: "National Service Training Program 1", units: 3, midterm_grade: 1.5, final_grade: 1.5, status: "Passed", prerequisite: null }
        ]
      },
      {
        id: "sem-2024-2",
        label: "2nd Semester",
        school_year: "2024-2025",
        gwa: 2.10,
        subjects: [
          { code: "IT 104", title: "Computer Programming 2 (Object-Oriented)", units: 3, midterm_grade: 2.0, final_grade: 2.0, status: "Passed", prerequisite: "IT 102" },
          { code: "IT 105", title: "Discrete Structures 1", units: 3, midterm_grade: 2.25, final_grade: 2.25, status: "Passed", prerequisite: "MATH 101" },
          { code: "GE 102", title: "Readings in Philippine History", units: 3, midterm_grade: 1.75, final_grade: 1.75, status: "Passed", prerequisite: null },
          { code: "GE 103", title: "The Contemporary World", units: 3, midterm_grade: 1.75, final_grade: 1.75, status: "Passed", prerequisite: null },
          { code: "PE 102", title: "Rhythmic Activities", units: 2, midterm_grade: 1.5, final_grade: 1.5, status: "Passed", prerequisite: "PE 101" },
          { code: "NSTP 2", title: "National Service Training Program 2", units: 3, midterm_grade: 1.5, final_grade: 1.5, status: "Passed", prerequisite: "NSTP 1" }
        ]
      },
      {
        id: "sem-2025-1",
        label: "1st Semester",
        school_year: "2025-2026",
        gwa: 2.85,
        subjects: [
          { code: "IT 103", title: "Data Structures & Algorithms", units: 3, midterm_grade: 5.0, final_grade: 5.0, status: "Failed", prerequisite: "IT 104" },
          { code: "IT 201", title: "Database Management Systems 1", units: 3, midterm_grade: 2.25, final_grade: 2.25, status: "Passed", prerequisite: "IT 104" },
          { code: "IT 203", title: "Human-Computer Interaction (HCI)", units: 3, midterm_grade: 1.75, final_grade: 1.75, status: "Passed", prerequisite: "IT 104" },
          { code: "GE 104", title: "Purposive Communication", units: 3, midterm_grade: 1.75, final_grade: 1.75, status: "Passed", prerequisite: null },
          { code: "PE 103", title: "Individual & Dual Sports", units: 2, midterm_grade: 1.5, final_grade: 1.5, status: "Passed", prerequisite: "PE 101" }
        ]
      },
      {
        id: "sem-2025-2",
        label: "2nd Semester",
        school_year: "2025-2026",
        gwa: 2.05,
        subjects: [
          { code: "IT 202", title: "Web Systems & Technologies 1", units: 3, midterm_grade: 2.0, final_grade: 2.0, status: "Passed", prerequisite: "IT 201" },
          { code: "IT 204", title: "Object-Oriented Analysis & Design", units: 3, midterm_grade: 2.25, final_grade: 2.25, status: "Passed", prerequisite: "IT 103" },
          { code: "IT 205", title: "Networking 1 (Fundamentals & Architecture)", units: 3, midterm_grade: 2.0, final_grade: 2.0, status: "Passed", prerequisite: "IT 101" },
          { code: "GE 105", title: "Art Appreciation", units: 3, midterm_grade: 1.75, final_grade: 1.75, status: "Passed", prerequisite: null },
          { code: "PE 104", title: "Team Sports", units: 2, midterm_grade: 1.5, final_grade: 1.5, status: "Passed", prerequisite: "PE 101" }
        ]
      },
      {
        id: "sem-2026-1",
        label: "1st Semester",
        school_year: "2026-2027",
        gwa: 2.50,
        subjects: [
          { code: "IT 301", title: "Quantitative Methods in IT", units: 3, midterm_grade: 2.0, final_grade: 2.0, status: "Passed", prerequisite: "MATH 101" },
          { code: "IT 303", title: "Web Systems & Technologies 2 (Full Stack)", units: 3, midterm_grade: 2.25, final_grade: 2.25, status: "Passed", prerequisite: "IT 202" },
          { code: "IT 305", title: "Systems Integration & Architecture", units: 3, midterm_grade: 2.0, final_grade: 2.0, status: "Passed", prerequisite: "IT 204" },
          { code: "IT 307", title: "Information Assurance & Security 1", units: 3, midterm_grade: 2.25, final_grade: 2.25, status: "Passed", prerequisite: "IT 205" },
          { code: "RES 301", title: "Methods of Research", units: 3, midterm_grade: 5.0, final_grade: 5.0, status: "Failed", prerequisite: null }
        ]
      },
      {
        id: "sem-2026-2",
        label: "2nd Semester",
        school_year: "2026-2027",
        gwa: 0.0,
        subjects: [
          { code: "IT 302", title: "Mobile Application Development", units: 3, midterm_grade: null, final_grade: null, status: "Enrolled", prerequisite: "IT 303" },
          { code: "IT 304", title: "Software Engineering 1", units: 3, midterm_grade: null, final_grade: null, status: "Enrolled", prerequisite: "IT 305" },
          { code: "IT 306", title: "Networking 2 (Routing & Switching)", units: 3, midterm_grade: null, final_grade: null, status: "Enrolled", prerequisite: "IT 205" },
          { code: "IT 308", title: "Capstone Project 1 (Proposal & Specification)", units: 3, midterm_grade: null, final_grade: null, status: "Enrolled", prerequisite: "IT 305" }
        ]
      }
    ]
  },
  {
    id: "2024-0002",
    name: "Kevin Reyes",
    avatar: "KR",
    course: "BS Information Technology",
    section: "BSIT 3-A",
    yr: 3,
    status: "Regular",
    gwa: 1.65,
    concerns: [],
    semesters: [
      {
        id: "sem-2026-2",
        label: "2nd Semester",
        school_year: "2026-2027",
        gwa: 0.0,
        subjects: [
          { code: "IT 302", title: "Mobile Application Development", units: 3, midterm_grade: null, final_grade: null, status: "Enrolled", prerequisite: "IT 303" },
          { code: "IT 304", title: "Software Engineering 1", units: 3, midterm_grade: null, final_grade: null, status: "Enrolled", prerequisite: "IT 305" },
          { code: "IT 306", title: "Networking 2 (Routing & Switching)", units: 3, midterm_grade: null, final_grade: null, status: "Enrolled", prerequisite: "IT 205" },
          { code: "IT 308", title: "Capstone Project 1 (Proposal & Specification)", units: 3, midterm_grade: null, final_grade: null, status: "Enrolled", prerequisite: "IT 305" }
        ]
      }
    ]
  },
  {
    id: "2024-0003",
    name: "Laura Santos",
    avatar: "LS",
    course: "BS Information Technology",
    section: "BSIT 3-A",
    yr: 3,
    status: "Regular",
    gwa: 1.55,
    concerns: [],
    semesters: [
      {
        id: "sem-2026-2",
        label: "2nd Semester",
        school_year: "2026-2027",
        gwa: 0.0,
        subjects: [
          { code: "IT 302", title: "Mobile Application Development", units: 3, midterm_grade: null, final_grade: null, status: "Enrolled", prerequisite: "IT 303" },
          { code: "IT 304", title: "Software Engineering 1", units: 3, midterm_grade: null, final_grade: null, status: "Enrolled", prerequisite: "IT 305" },
          { code: "IT 306", title: "Networking 2 (Routing & Switching)", units: 3, midterm_grade: null, final_grade: null, status: "Enrolled", prerequisite: "IT 205" },
          { code: "IT 308", title: "Capstone Project 1 (Proposal & Specification)", units: 3, midterm_grade: null, final_grade: null, status: "Enrolled", prerequisite: "IT 305" }
        ]
      }
    ]
  },
  {
    id: "2024-0004",
    name: "Michael Aquino",
    avatar: "MA",
    course: "BS Computer Science",
    section: "BSCS 3-A",
    yr: 3,
    status: "Regular",
    gwa: 1.35,
    concerns: [],
    semesters: [
      {
        id: "sem-2026-2",
        label: "2nd Semester",
        school_year: "2026-2027",
        gwa: 0.0,
        subjects: [
          { code: "CS 302", title: "Compiler Design & Construction", units: 3, midterm_grade: null, final_grade: null, status: "Enrolled", prerequisite: "CS 202" },
          { code: "CS 308", title: "CS Thesis 1 (Research Proposal)", units: 3, midterm_grade: null, final_grade: null, status: "Enrolled", prerequisite: "CS 301" }
        ]
      }
    ]
  },
  {
    id: "2024-0005",
    name: "Nicole Soriano",
    avatar: "NS",
    course: "BS Information Technology",
    section: "BSIT 3-A",
    yr: 3,
    status: "Regular",
    gwa: 1.70,
    concerns: [],
    semesters: [
      {
        id: "sem-2026-2",
        label: "2nd Semester",
        school_year: "2026-2027",
        gwa: 0.0,
        subjects: [
          { code: "IT 302", title: "Mobile Application Development", units: 3, midterm_grade: null, final_grade: null, status: "Enrolled", prerequisite: "IT 303" },
          { code: "IT 304", title: "Software Engineering 1", units: 3, midterm_grade: null, final_grade: null, status: "Enrolled", prerequisite: "IT 305" },
          { code: "IT 306", title: "Networking 2 (Routing & Switching)", units: 3, midterm_grade: null, final_grade: null, status: "Enrolled", prerequisite: "IT 205" },
          { code: "IT 308", title: "Capstone Project 1 (Proposal & Specification)", units: 3, midterm_grade: null, final_grade: null, status: "Enrolled", prerequisite: "IT 305" }
        ]
      }
    ]
  },

  // --- 4TH YEAR STUDENTS ---
  {
    id: "2023-0003",
    name: "Bianca Santos",
    avatar: "BS",
    course: "BS Information Technology",
    section: "BSIT 4-A",
    yr: 4,
    status: "Regular",
    gwa: 1.50,
    concerns: [],
    semesters: [
      {
        id: "sem-2026-2",
        label: "2nd Semester",
        school_year: "2026-2027",
        gwa: 0.0,
        subjects: [
          { code: "IT 402", title: "On-the-Job Training / Industry Internship (486 Hours)", units: 6, midterm_grade: null, final_grade: null, status: "Enrolled", prerequisite: "All Academic Courses" }
        ]
      }
    ]
  },
  {
    id: "2023-0002",
    name: "Oscar Dela Cruz",
    avatar: "OD",
    course: "BS Information Technology",
    section: "BSIT 4-A",
    yr: 4,
    status: "Regular",
    gwa: 1.65,
    concerns: [],
    semesters: [
      {
        id: "sem-2026-2",
        label: "2nd Semester",
        school_year: "2026-2027",
        gwa: 0.0,
        subjects: [
          { code: "IT 402", title: "On-the-Job Training / Industry Internship (486 Hours)", units: 6, midterm_grade: null, final_grade: null, status: "Enrolled", prerequisite: "All Academic Courses" }
        ]
      }
    ]
  },
  {
    id: "2023-0004",
    name: "Patricia Lim",
    avatar: "PL",
    course: "BS Information Technology",
    section: "BSIT 4-A",
    yr: 4,
    status: "Regular",
    gwa: 1.40,
    concerns: [],
    semesters: [
      {
        id: "sem-2026-2",
        label: "2nd Semester",
        school_year: "2026-2027",
        gwa: 0.0,
        subjects: [
          { code: "IT 402", title: "On-the-Job Training / Industry Internship (486 Hours)", units: 6, midterm_grade: null, final_grade: null, status: "Enrolled", prerequisite: "All Academic Courses" }
        ]
      }
    ]
  },
  {
    id: "2023-0005",
    name: "Quentin Valdez",
    avatar: "QV",
    course: "BS Computer Science",
    section: "BSCS 4-A",
    yr: 4,
    status: "Regular",
    gwa: 1.30,
    concerns: [],
    semesters: [
      {
        id: "sem-2026-2",
        label: "2nd Semester",
        school_year: "2026-2027",
        gwa: 0.0,
        subjects: [
          { code: "CS 402", title: "Industry Practicum / Internship (486 Hours)", units: 6, midterm_grade: null, final_grade: null, status: "Enrolled", prerequisite: "All Academic Courses" }
        ]
      }
    ]
  },
  {
    id: "2023-0006",
    name: "Rachel Torres",
    avatar: "RT",
    course: "BS Information Technology",
    section: "BSIT 4-A",
    yr: 4,
    status: "Regular",
    gwa: 1.70,
    concerns: [],
    semesters: [
      {
        id: "sem-2026-2",
        label: "2nd Semester",
        school_year: "2026-2027",
        gwa: 0.0,
        subjects: [
          { code: "IT 402", title: "On-the-Job Training / Industry Internship (486 Hours)", units: 6, midterm_grade: null, final_grade: null, status: "Enrolled", prerequisite: "All Academic Courses" }
        ]
      }
    ]
  }
];

export function DataProvider({ children }) {
  // Always initialize directly with COMPREHENSIVE_STUDENTS (Preserving auth session ccs_auth_user!)
  const [students, setStudents] = useState(() => {
    try {
      const saved = localStorage.getItem("ccs_students_v5_clean");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return COMPREHENSIVE_STUDENTS;
  });
  const [sections, setSections] = useState(INITIAL_SECTIONS);
  const [curriculum, setCurriculum] = useState(() => INITIAL_CURRICULUM);
  const [loading, setLoading] = useState(false);

  // Fetch real Supabase database records asynchronously (Without overriding semester data with stale rows)
  const fetchSupabaseData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("students")
        .select(`
          id, name, avatar, course, yr, status, gwa,
          concerns(id, concern),
          semesters(id, label, school_year, gwa,
            subjects(id, code, title, units, midterm_grade, final_grade, status, prerequisite, prereq_flag, prereq_note)
          )
        `)
        .order("name");

      if (!error && data && data.length > 0) {
        // ONLY use Supabase data if it contains active semester subjects, otherwise preserve COMPREHENSIVE_STUDENTS
        const formatted = data.map((s) => {
          const matchedFallback = COMPREHENSIVE_STUDENTS.find((cs) => cs.id === s.id);
          const hasValidSubjects = s.semesters && s.semesters.length > 0 && s.semesters.some((sem) => sem.subjects && sem.subjects.length > 0);

          if (!hasValidSubjects && matchedFallback) {
            return matchedFallback;
          }

          return {
            ...s,
            gwa: Number(s.gwa || matchedFallback?.gwa || 0),
            section: s.section || matchedFallback?.section || "BSIT 1-A",
            avatar: s.avatar || matchedFallback?.avatar || "ST",
            concerns: (s.concerns || []).map((c) => c.concern),
            semesters: hasValidSubjects
              ? s.semesters.map((sem) => ({
                  ...sem,
                  gwa: Number(sem.gwa || 0),
                  subjects: (sem.subjects || []).map((sub) => ({
                    ...sub,
                    units: Number(sub.units || 3),
                    midterm_grade: sub.midterm_grade !== null ? Number(sub.midterm_grade) : null,
                    final_grade: sub.final_grade !== null ? Number(sub.final_grade) : null
                  }))
                }))
              : (matchedFallback?.semesters || [])
          };
        });

        // Merge remaining COMPREHENSIVE_STUDENTS not present in Supabase Cloud DB
        const dbIds = new Set(formatted.map((s) => s.id));
        const missing = COMPREHENSIVE_STUDENTS.filter((cs) => !dbIds.has(cs.id));

        const merged = [...formatted, ...missing];
        setStudents(merged);
        try {
          localStorage.setItem("ccs_students_v5_clean", JSON.stringify(merged));
        } catch (e) {}
      }
    } catch (err) {
      console.warn("Supabase fetch notice:", err?.message || "Using mock store");
    }
  }, []);

  useEffect(() => {
    fetchSupabaseData();
  }, [fetchSupabaseData]);

  const saveStudents = (newStudents) => {
    setStudents(newStudents);
    try {
      localStorage.setItem("ccs_students_v5_clean", JSON.stringify(newStudents));
    } catch (e) {}
  };

  const updateStudent = async (updatedStudent) => {
    const recalculatedGwa = computeGWA(updatedStudent.semesters || []);
    const finalStudent = { ...updatedStudent, gwa: recalculatedGwa };

    const exists = students.some((s) => s.id === finalStudent.id);
    const next = exists
      ? students.map((s) => (s.id === finalStudent.id ? finalStudent : s))
      : [...students, finalStudent];
    saveStudents(next);

    try {
      await supabase.from("students").upsert({
        id: finalStudent.id,
        name: finalStudent.name,
        avatar: finalStudent.avatar,
        course: finalStudent.course,
        yr: finalStudent.yr,
        status: finalStudent.status,
        gwa: finalStudent.gwa
      });
    } catch (e) {
      console.warn("Supabase upsert notice:", e.message);
    }
  };

  const updateStudentGrade = async (studentId, semesterId, subjectCode, finalGrade, midtermGrade, remark) => {
    const next = students.map((s) => {
      if (s.id !== studentId) return s;

      const updatedSemesters = (s.semesters || []).map((sem) => {
        if (sem.id !== semesterId) return sem;

        const updatedSubjects = (sem.subjects || []).map((sub) => {
          if (sub.code !== subjectCode) return sub;

          let newStatus = sub.status;
          const fg = Number(finalGrade);
          if (!isNaN(fg)) {
            if (fg >= 1.0 && fg <= 3.0) newStatus = "Passed";
            else if (fg > 3.0) newStatus = "Failed";
          }

          return {
            ...sub,
            final_grade: fg,
            midterm_grade: midtermGrade !== undefined ? Number(midtermGrade) : sub.midterm_grade,
            status: newStatus,
            remark: remark || sub.remark
          };
        });

        const semGWA = computeGWA([{ subjects: updatedSubjects }]);

        return {
          ...sem,
          subjects: updatedSubjects,
          gwa: semGWA
        };
      });

      const overallGWA = computeGWA(updatedSemesters);

      const updatedConcerns = (s.concerns || []).filter((c) => !c.includes(subjectCode));
      if (Number(finalGrade) === 5.0) {
        updatedConcerns.push(`Failed Subject: Failed ${subjectCode}`);
      }

      // Automated Student Status Determination based on subject data
      let autoStatus = s.status;
      if (updatedConcerns.length > 0) {
        autoStatus = "Irregular";
      } else if (s.status === "Irregular" && updatedConcerns.length === 0) {
        autoStatus = "Regular";
      }

      return {
        ...s,
        gwa: overallGWA,
        status: autoStatus,
        semesters: updatedSemesters,
        concerns: updatedConcerns
      };
    });

    saveStudents(next);
  };

  const updateSectionCapacity = (sectionId, newCapacity, newAdviser, newRoom) => {
    const next = sections.map((sec) =>
      sec.id === sectionId
        ? {
            ...sec,
            maxCapacity: Number(newCapacity),
            adviser: newAdviser !== undefined ? newAdviser : sec.adviser,
            room: newRoom !== undefined ? newRoom : sec.room
          }
        : sec
    );
    setSections(next);
    localStorage.setItem("ccs_sections_data", JSON.stringify(next));
  };

  // Add Subject to Master Curriculum
  const addSubjectToCurriculum = (programKey, yearNum, semNum, newSubject) => {
    const updated = JSON.parse(JSON.stringify(curriculum));
    if (!updated[programKey]) return;

    let targetYear = updated[programKey].years.find((y) => y.year === Number(yearNum));
    if (!targetYear) return;

    let targetSem = targetYear.semesters.find((s) => s.sem === Number(semNum));
    if (!targetSem) return;

    targetSem.subjects.push(newSubject);

    setCurriculum(updated);
    localStorage.setItem("ccs_curriculum_data", JSON.stringify(updated));
  };

  return (
    <DataContext.Provider
      value={{
        students,
        sections,
        curriculum,
        loading,
        updateStudent,
        updateStudentGrade,
        updateSectionCapacity,
        addSubjectToCurriculum,
        computeGWA,
        refetchData: fetchSupabaseData
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData must be used within DataProvider");
  return context;
}
