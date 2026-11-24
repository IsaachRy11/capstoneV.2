# Project Architectural & Data Standards

## Rule: Dynamic Data First (Strict No-Hardcoding Policy)
1. **No Static Data Literal Mocking**:
   All student counts, enrolled subject figures, section capacities, GWA values, subject codes, and section assignments MUST be dynamically derived from live database context (`DataContext`).
2. **Normalized Matching**:
   When matching string-based identifiers (e.g. subject codes or section names), always normalize case and whitespace (e.g., `.replace(/\s+/g, '').toLowerCase()`) to prevent state mismatch.
3. **Role-Based Feature Controls**:
   Ensure administrative controls (e.g., encoding grades, editing section capacities, adding curriculum courses) are strictly scoped to appropriate user roles (`secretary`, `adviser`) and hidden for student roles.

## Rule: Autonomous Skill Selection
1. **Proactive & Independent Activation**:
   Always autonomously evaluate, trigger, and inspect relevant `.agents/skills` whenever a user request matches a skill's domain (e.g., UI/styling, web app testing, doc generation, data analysis), even if the user never explicitly names the skill.
2. **Seamless Application**:
   Integrate skill best practices directly into solution planning and execution without waiting for manual user commands.
