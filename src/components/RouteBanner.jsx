import ArtHero from "./ArtHero";

// A slim illustrated banner above every inner page (the Dashboard and Home have their own bigger hero). One place
// decides the color and the line each page gets, by address. Pages that are really a single record or a form
// (a student's record, Add students, Profile, Settings...) get none.
const BANNERS = [
  [/^\/students$/, { tone: "a", seed: 0, title: "Students", line: "Search, filter and open any student's record." }],
  [/^\/sections$/, { tone: "c", seed: 3, title: "Section allocations", line: "Subjects, seats and who is enrolled in each." }],
  [/^\/schedules\/edit$/, { tone: "b", seed: 5, title: "Edit class times", line: "When and where each subject meets." }],
  [/^\/schedules$/, { tone: "b", seed: 2, title: "Schedules", line: "The weekly timetable of each section." }],
  [/^\/curriculum$/, { tone: "c", seed: 6, title: "Curriculum", line: "Every subject of the program, term by term." }],
  [/^\/school-year$/, { tone: "a", seed: 4, title: "Start a new term", line: "Move the whole site to the next semester, summer or school year." }],
  [/^\/calendar$/, { tone: "b", seed: 8, title: "Calendar", line: "Classes, exams, holidays and breaks from the school calendar." }],
  [/^\/schedule$/, { tone: "c", seed: 1, title: "Your schedule", line: "Your subjects this week, by day, time and room." }],
  [/^\/progress\/roadmap$/, { tone: "a", seed: 7, title: "Roadmap", line: "Your path to graduation, semester by semester." }],
  [/^\/progress$/, { tone: "c", seed: 9, title: "Subject tracker", line: "What you've passed, what you're taking and what's left." }],
  [/^\/record$/, { tone: "b", seed: 10, title: "Academic record", line: "Every midterm and final grade, term by term." }],
];

export default function RouteBanner({ pathname, termText }) {
  const hit = BANNERS.find(([re]) => re.test(pathname));
  if (!hit) return null;
  const { tone, seed, title, line } = hit[1];
  return (
    <ArtHero tone={tone} seed={seed} className="no-print rounded-[20px]">
      <div className="flex flex-wrap items-end justify-between gap-3 px-5 py-6 sm:px-8 sm:py-9">
        <div className="min-w-0">
          <p className="font-display text-[26px] font-extrabold leading-tight tracking-[-0.02em] sm:text-[36px]">{title}</p>
          <p className="mt-1 max-w-[560px] text-[14px] opacity-90 sm:text-[15px]">{line}</p>
        </div>
        {termText && <span className="glass rounded-full px-3.5 py-1.5 text-[12px] font-semibold sm:text-[13px]">{termText}</span>}
      </div>
    </ArtHero>
  );
}
