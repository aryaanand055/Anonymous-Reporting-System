# **App Name**: SentinelFlow

## Core Features:

- Report Submission Form: Users can submit new reports through a dedicated form with fields for title, description, location, department (dropdown), priority (dropdown), and an auto-generated timestamp, all stored in Firestore.
- Homepage Dashboard Navigation: A central landing page featuring three clickable cards for Admin, Human Rights, and Fire Department dashboards, along with a prominent button to initiate new report submissions.
- Admin Control Dashboard: Provides administrators with a real-time, comprehensive view of all submitted reports, offering filtering options by department, priority, and status, and allowing for status updates.
- Departmental Dashboards (HR & Fire): Dedicated, real-time dashboards for the Human Rights and Fire departments, displaying only reports relevant to their respective departments and supporting optional status updates.
- Real-time Data Synchronization: Ensures instant updates across all dashboards using Firestore's 'onSnapshot()' listeners, reflecting new reports or status changes without manual refreshes.
- Report Display with Visual Cues: Presents report details in a clean, card-based or table format, with intuitive color-coded indicators for priority (High: red, Medium: amber, Low: green) and status (Pending: gray, In Progress: blue, Resolved: green).
- Firestore Data Management: Handles all CRUD (Create, Read, Update, Delete) operations for report documents within a structured Firestore collection, including automatic timestamping for new entries.

## Style Guidelines:

- Primary color: Deep forest green (#145A32), symbolizing professionalism and stability for key interactive elements.
- Background color: Soft off-white (#F4F6F6), providing a clean and unobtrusive canvas for information.
- Accent color: Vibrant green (#1E8449), used for highlights and to provide visual emphasis where needed.
- Primary text color: Dark charcoal (#1C1C1C) for optimal readability.
- Secondary text color: Muted gray (#6E6E6E) for supplementary information.
- Priority indicators: Deep red for 'High', amber for 'Medium', and green for 'Low'.
- Status indicators: Gray for 'Pending', blue for 'In Progress', and green for 'Resolved'.
- Body and headline font: 'Inter', a modern sans-serif typeface, for an objective and information-first presentation across the application.
- Use minimal and context-aware icons, prioritizing clear labels and avoiding visual clutter, as specified.
- Minimalistic and information-first layout with clean spacing, precise alignment, and subtle shadows for visual separation.
- UI elements such as cards feature soft rounded corners, creating a modern and user-friendly aesthetic.
- Subtle hover effects (slight elevation) for interactive elements like cards, with no other unnecessary animations to maintain an 'information-first' focus.