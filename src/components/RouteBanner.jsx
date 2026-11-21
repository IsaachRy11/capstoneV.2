import PhotoHero from "./PhotoHero";

// A slim photo banner above every inner page (the Dashboard and Home have their own big hero). One place decides
// which photo and which short line each page gets, by address. Pages that are really a single record or a form
// (a student's record, Add students, Profile, Settings...) get none.
const BANNERS = [
  [/^\/students$/, { photo: "p42", title: "Students", line: "Search, filter and open any student's record." }],
  [/^\/sections$/, { photo: "p20", title: "Section allocations", line: "Subjects, seats and who is enrolled in each." }],
  [/^\/schedules\/edit$/, { photo: "p48", title: "Edit class times", line: "When and where each subject meets." }],
  [/^\/schedules$/, { photo: "p48", title: "Schedules", line: "The weekly timetable of each section." }],
  [/^\/curriculum$/, { photo: "p24", title: "Curriculum", line: "Every subject of the program, term by term." }],
  [/^\/school-year$/, { photo: "p62", title: "Start a new term", line: "Move the whole site to the next semester, summer or school year." }],
  [/^\/calendar$/, { photo: "p10", title: "Calendar", line: "Classes, exams, holidays and breaks from the school calendar." }],
  [/^\/schedule$/, { photo: "p1", title: "Your schedule", line: "Your subjects this week, by day, time and room." }],
  [/^\/progress\/roadmap$/, { photo: "p77", title: "Roadmap", line: "Your path to graduation, semester by semester." }],
  [/^\/progress$/, { photo: "p54", title: "Subject tracker", line: "What you've passed, what you're taking and what's left." }],
  [/^\/record$/, { photo: "p24", title: "Academic record", line: "Every midterm and final grade, term by term." }],
];

export default function RouteBanner({ pathname, termText }) {
  const hit = BANNERS.find(([re]) => re.test(pathname));
  if (!hit) return null;
  const { photo, title, line } = hit[1];
  return (
    <PhotoHero src={`/photos/${photo}.jpg`} className="no-print rounded-[20px]">
      <div className="flex flex-wrap items-end justify-between gap-3 px-5 py-6 sm:px-8 sm:py-9">
        <div className="min-w-0">
          <p className="font-display text-[26px] font-extrabold leading-tight tracking-[-0.02em] sm:text-[36px]">{title}</p>
          <p className="mt-1 max-w-[560px] text-[14px] opacity-90 sm:text-[15px]">{line}</p>
        </div>
        {termText && <span className="glass rounded-full px-3.5 py-1.5 text-[12px] font-semibold sm:text-[13px]">{termText}</span>}
      </div>
    </PhotoHero>
  );
}
