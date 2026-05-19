# RMU Campus Navigation

React Native (Expo) mobile app for **Regional Maritime University (RMU)** campus navigation. Students, faculty, and admins can browse an interactive campus map, search locations, save favourites, scan QR codes, view campus updates, register accounts, and manage campus data through Supabase.

---

## Table of Contents

1. [System Diagrams](#system-diagrams)
   - [System Flowchart](#1-system-flowchart)
   - [Use Case Diagram](#2-use-case-diagram)
   - [Sequence Diagram](#3-system-sequence-diagram)
   - [Entity Relationship Diagram](#4-entity-relationship-diagram)
   - [Activity Diagram](#5-activity-diagram)
   - [User Flow Diagram](#6-user-flow-diagram)
2. [Features by Role](#features-by-role)
3. [Tech Stack](#tech-stack)
4. [Project Setup](#project-setup)
5. [Project Structure](#project-structure)
6. [Database Schema](#database-schema)
7. [QR Codes](#qr-codes)
8. [Running the App](#running-the-app)
9. [Troubleshooting](#troubleshooting)

---

## System Diagrams

### 1. System Flowchart

Shows the high-level flow of the entire application from launch through role-based navigation to feature access.

```mermaid
flowchart TD
    A([App Launch]) --> B{Auth State\nLoading}
    B --> C{User\nAuthenticated?}

    C -- No --> D[Auth Screens]
    D --> D1[Login Screen]
    D --> D2[Register Screen]
    D --> D3[Forgot Password]

    D1 -- Valid Credentials --> E[Supabase Auth]
    D2 -- Fill Form + Submit --> F[Email Confirmation Sent]
    F --> G[User Confirms Email]
    G --> E
    D3 -- Enter Email --> H[Reset Link Sent]
    H --> I[Reset Password Screen]
    I --> E

    E --> J{Resolve Role}
    J -- admin email / DB role --> K[Admin Navigator]
    J -- role = student --> L[Student Navigator]
    J -- role = faculty --> M[Staff Navigator]

    K --> K1[Dashboard & Analytics]
    K --> K2[Manage Locations & Buildings]
    K --> K3[Manage Events & Dining]
    K --> K4[Manage Notifications]
    K --> K5[Manage Users & Reports]

    L --> L1[Home Dashboard]
    L --> L2[Drawer Sidebar]
    L2 --> L3[Campus Map]
    L2 --> L4[Events & Dining]
    L2 --> L5[Notifications]
    L2 --> L6[Favourites]
    L2 --> L7[Campus Rules]
    L2 --> L8[Safety & Support]
    L2 --> L9[Report Issue]
    L2 --> L10[Scan QR]

    L1 & L3 & L4 & L5 --> N[(Supabase\nDatabase)]
    K1 & K2 & K3 & K4 & K5 --> N

    M --> M1[Staff Dashboard]
    M1 --> N
```

---

### 2. Use Case Diagram

Shows the actors and the system features each can access.

```mermaid
graph LR
    subgraph Actors
        STU([Student])
        FAC([Faculty / Staff])
        ADM([Admin])
    end

    subgraph Authentication
        UC1[Register Account]
        UC2[Login]
        UC3[Reset Password]
    end

    subgraph Campus Navigation
        UC4[View Campus Map]
        UC5[Search Locations]
        UC6[View Location Details]
        UC7[Scan QR Code]
        UC8[Get Directions]
    end

    subgraph Personal Features
        UC9[Save Favourites]
        UC10[View Notifications]
        UC11[Browse Events]
        UC12[View Dining Options]
        UC13[View Campus Rules]
        UC14[View Safety & Support]
        UC15[Report Issue]
    end

    subgraph Admin Management
        UC16[Manage Locations & Buildings]
        UC17[Manage Events]
        UC18[Manage Notifications]
        UC19[Manage Dining & Amenities]
        UC20[Manage Campus Rules]
        UC21[Manage Users]
        UC22[Review Reports]
        UC23[View Analytics]
        UC24[Bulk Import Locations]
    end

    STU --> UC1 & UC2 & UC3
    STU --> UC4 & UC5 & UC6 & UC7 & UC8
    STU --> UC9 & UC10 & UC11 & UC12 & UC13 & UC14 & UC15

    FAC --> UC2 & UC3
    FAC --> UC4 & UC5 & UC6 & UC7 & UC8
    FAC --> UC9 & UC10 & UC11 & UC12 & UC13 & UC14 & UC15
    FAC --> UC18

    ADM --> UC2
    ADM --> UC4 & UC5 & UC6
    ADM --> UC16 & UC17 & UC18 & UC19 & UC20 & UC21 & UC22 & UC23 & UC24
```

---

### 3. System Sequence Diagram

Illustrates the interactions between the user, app, and Supabase backend for the key flows.

```mermaid
sequenceDiagram
    actor U as User
    participant App as React Native App
    participant Auth as Supabase Auth
    participant DB as Supabase DB
    participant Email as Email Service

    Note over U, Email: Registration Flow
    U->>App: Fill Register Form
    App->>App: Zod Validation
    App->>Auth: signUp(email, password, metadata)
    Auth->>Email: Send Confirmation Link
    Auth-->>App: Success (pending confirmation)
    App-->>U: Show EmailSent Screen
    U->>Email: Click Confirmation Link
    Email->>Auth: Verify Email
    Auth->>DB: Trigger: create users row
    U->>App: Login with credentials
    App->>Auth: signInWithPassword()
    Auth-->>App: Session + JWT
    App->>DB: Fetch user profile & role
    DB-->>App: Role = student
    App-->>U: Navigate to Student Home

    Note over U, DB: Viewing Campus Map
    U->>App: Tap Campus Map
    App->>DB: Query locations & buildings
    DB-->>App: Location data
    App-->>U: Render interactive map

    Note over U, DB: Saving a Favourite
    U->>App: Tap heart on Location
    App->>DB: RPC toggle_favourite(location_id)
    DB-->>App: added = true
    App-->>U: Heart filled (saved)

    Note over U, DB: Reporting an Issue
    U->>App: Open Report Screen
    U->>App: Fill title, description, category
    App->>DB: INSERT into reports
    DB-->>App: Confirm inserted
    App-->>U: Show success alert

    Note over U, DB: Admin Creating Notification
    U->>App: Admin → New Notification
    App->>DB: INSERT into notifications (audience, title, message)
    DB-->>App: Realtime broadcast
    App-->>U: Students see notification badge update
```

---

### 4. Entity Relationship Diagram

Shows the database tables in Supabase and their relationships.

```mermaid
erDiagram
    USERS {
        uuid id PK
        text email
        text full_name
        text role
        text department
        text programme
        text student_id
        text staff_id
        text index_number
        text avatar_url
        timestamp last_login_at
        timestamp created_at
    }

    BUILDINGS {
        uuid id PK
        text name
        text description
        text image_url
        float latitude
        float longitude
        int floors
        timestamp created_at
    }

    LOCATIONS {
        uuid id PK
        text name
        text description
        text building
        text category
        text type
        float latitude
        float longitude
        text[] image_urls
        int floor
        text room_number
        text[] features
        jsonb opening_hours
        timestamp created_at
    }

    NOTIFICATIONS {
        uuid id PK
        text title
        text message
        text category
        text audience
        uuid[] recipient_ids
        uuid posted_by FK
        bool is_pinned
        timestamp created_at
    }

    NOTIFICATION_READS {
        uuid id PK
        uuid user_id FK
        uuid notification_id FK
        timestamp read_at
    }

    EVENTS {
        uuid id PK
        text title
        text description
        text location
        text category
        timestamp start_date
        timestamp end_date
        text image_url
        text organizer
        int attendee_count
        bool is_featured
        timestamp created_at
    }

    EVENT_INTERESTS {
        uuid id PK
        uuid user_id FK
        uuid event_id FK
        timestamp created_at
    }

    FAVOURITES {
        uuid id PK
        uuid user_id FK
        uuid location_id FK
        timestamp created_at
    }

    DINING {
        uuid id PK
        text name
        text description
        text category
        jsonb menu_items
        text operating_hours
        text location
        text image_url
    }

    CAMPUS_RULES {
        uuid id PK
        text title
        text description
        text category
        text severity
        timestamp created_at
    }

    REPORTS {
        uuid id PK
        text title
        text description
        text category
        text status
        text priority
        uuid reporter_id FK
        text reporter_name
        text reporter_email
        text[] photo_urls
        text admin_response
        timestamp admin_read_at
        timestamp created_at
    }

    AMENITIES {
        uuid id PK
        text name
        text category
        text type
        text icon_name
        float latitude
        float longitude
        text operating_hours
        text image_url
    }

    DEPARTMENTS {
        uuid id PK
        text name
        text description
        text availability_status
        text operating_hours
        text head_of_department
        text contact_email
        text contact_phone
    }

    USERS ||--o{ NOTIFICATION_READS : "reads"
    USERS ||--o{ EVENT_INTERESTS : "interests"
    USERS ||--o{ FAVOURITES : "saves"
    USERS ||--o{ REPORTS : "submits"
    USERS ||--o{ NOTIFICATIONS : "posts"
    NOTIFICATIONS ||--o{ NOTIFICATION_READS : "tracked by"
    EVENTS ||--o{ EVENT_INTERESTS : "tracked by"
    LOCATIONS ||--o{ FAVOURITES : "saved in"
    BUILDINGS ||--o{ LOCATIONS : "contains"
```

---

### 5. Activity Diagram

Shows the step-by-step activities a student performs from opening the app to completing a task.

```mermaid
flowchart TD
    Start([Open App]) --> CheckAuth{Authenticated?}

    CheckAuth -- No --> ShowLogin[Show Login Screen]
    ShowLogin --> ChoiceAction{User Action}
    ChoiceAction -- Sign In --> EnterCreds[Enter Email & Password]
    ChoiceAction -- Sign Up --> GoRegister[Go to Register Screen]
    ChoiceAction -- Forgot Password --> GoForgot[Go to Forgot Password]

    GoRegister --> FillForm[Fill Registration Form]
    FillForm --> ValidateForm{Zod\nValidation\nPasses?}
    ValidateForm -- No --> ShowErrors[Show Field Errors]
    ShowErrors --> FillForm
    ValidateForm -- Yes --> SubmitReg[Submit to Supabase]
    SubmitReg --> EmailSent[Show Email Sent Screen]
    EmailSent --> ClickLink[User Clicks Email Link]
    ClickLink --> AccountActive[Account Activated]
    AccountActive --> EnterCreds

    GoForgot --> EnterEmail[Enter Email]
    EnterEmail --> SendLink[Send Reset Link]
    SendLink --> ClickReset[User Clicks Reset Link]
    ClickReset --> NewPassword[Enter New Password]
    NewPassword --> EnterCreds

    EnterCreds --> Authenticate[Supabase Auth]
    Authenticate --> ResolveRole{Resolve\nUser Role}

    CheckAuth -- Yes --> ResolveRole

    ResolveRole -- Student --> StudentHome[Student Home Screen]
    ResolveRole -- Admin --> AdminDash[Admin Dashboard]
    ResolveRole -- Faculty --> StaffDash[Staff Dashboard]

    StudentHome --> OpenDrawer{Open\nSidebar?}
    OpenDrawer -- Yes --> ChooseFeature[Select Feature from Sidebar]
    OpenDrawer -- No --> QuickAction[Tap Quick Action Card]

    ChooseFeature & QuickAction --> Feature{Feature}

    Feature -- Map --> ViewMap[View Campus Map]
    ViewMap --> SearchLocation[Search for Location]
    SearchLocation --> ViewDetails[View Location Details]
    ViewDetails --> SaveFav{Save\nFavourite?}
    SaveFav -- Yes --> FavSaved[Favourite Saved]
    SaveFav -- No --> Done1([Done])
    FavSaved --> Done1

    Feature -- Events --> BrowseEvents[Browse Events List]
    BrowseEvents --> Done2([Done])

    Feature -- Report --> FillReport[Fill Report Form]
    FillReport --> SubmitReport[Submit to Supabase]
    SubmitReport --> Confirmation[Show Confirmation]
    Confirmation --> Done3([Done])

    Feature -- QR --> ScanQR[Open QR Scanner]
    ScanQR --> DecodeQR[Decode QR Payload]
    DecodeQR --> OpenLocation[Open Location Details]
    OpenLocation --> Done4([Done])
```

---

### 6. User Flow Diagram

Shows the complete journey of each user type through the application screens.

```mermaid
flowchart LR
    subgraph Entry["Entry Point"]
        SPLASH[Splash / Loading]
    end

    subgraph AuthFlow["Auth Flow"]
        LOGIN[Login Screen]
        REGISTER[Register Screen]
        FORGOT[Forgot Password]
        EMAIL_SENT[Email Sent Screen]
        RESET[Reset Password]
    end

    subgraph StudentFlow["Student Journey"]
        S_HOME[Home Dashboard]
        S_DRAWER[Sidebar Menu]
        S_MAP[Campus Map]
        S_SEARCH[Search Locations]
        S_DETAILS[Location Details]
        S_FAVS[Favourites]
        S_NOTIFS[Notifications]
        S_EVENTS[Events]
        S_DINING[Dining]
        S_RULES[Campus Rules]
        S_SAFETY[Safety & Support]
        S_REPORT[Report Issue]
        S_QR[QR Scanner]
    end

    subgraph AdminFlow["Admin Journey"]
        A_DASH[Admin Dashboard]
        A_LOCS[Manage Locations]
        A_BUILD[Manage Buildings]
        A_EVENTS[Manage Events]
        A_NOTIFS[Manage Notifications]
        A_DINING[Manage Dining]
        A_RULES[Manage Rules]
        A_USERS[Manage Users]
        A_REPORTS[Review Reports]
        A_ANALYTICS[Analytics]
    end

    subgraph StaffFlow["Staff Journey"]
        ST_HOME[Staff Dashboard]
        ST_NOTIFS[Post Notifications]
    end

    SPLASH --> LOGIN

    LOGIN --> REGISTER
    LOGIN --> FORGOT
    REGISTER --> EMAIL_SENT
    FORGOT --> EMAIL_SENT
    EMAIL_SENT --> RESET
    RESET --> LOGIN

    LOGIN -- Student --> S_HOME
    LOGIN -- Admin --> A_DASH
    LOGIN -- Faculty --> ST_HOME

    S_HOME --> S_DRAWER
    S_HOME --> S_MAP
    S_HOME --> S_SEARCH
    S_HOME --> S_EVENTS
    S_HOME --> S_REPORT
    S_HOME --> S_QR

    S_DRAWER --> S_MAP
    S_DRAWER --> S_NOTIFS
    S_DRAWER --> S_FAVS
    S_DRAWER --> S_EVENTS
    S_DRAWER --> S_DINING
    S_DRAWER --> S_RULES
    S_DRAWER --> S_SAFETY
    S_DRAWER --> S_REPORT
    S_DRAWER --> S_QR

    S_MAP --> S_DETAILS
    S_SEARCH --> S_DETAILS
    S_DETAILS --> S_FAVS

    A_DASH --> A_LOCS
    A_DASH --> A_BUILD
    A_DASH --> A_EVENTS
    A_DASH --> A_NOTIFS
    A_DASH --> A_DINING
    A_DASH --> A_RULES
    A_DASH --> A_USERS
    A_DASH --> A_REPORTS
    A_DASH --> A_ANALYTICS

    ST_HOME --> ST_NOTIFS
```

---

## Features by Role

### Student
- Home dashboard with quick access cards and upcoming events
- Interactive campus map with GPS and location search
- Drawer sidebar navigation to all campus features
- Save favourite locations
- Browse events, dining options, campus rules
- Safety & support contacts
- Submit issue reports
- Scan QR codes to open location details
- Real-time notifications with unread badge

### Faculty / Staff
- All student features
- Post campus-wide notifications

### Admin
- Dashboard with live statistics
- Full CRUD: locations, buildings, dining, amenities, campus rules
- Create and manage events and notifications (audience targeting)
- Review and respond to student issue reports
- User management (create student/faculty accounts)
- Bulk import locations from Excel/CSV
- Analytics export (PDF)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native 0.81, Expo 54 |
| Language | JavaScript (React 19) |
| Navigation | React Navigation 7 (Stack, Bottom Tabs, Drawer) |
| Backend | Supabase (Auth, PostgreSQL, Realtime, Storage) |
| Validation | Zod |
| Icons | HugeIcons (`@hugeicons/react-native`) + Ionicons |
| Fonts | Outfit via `@expo-google-fonts/outfit` |
| Map | react-native-maps + OpenStreetMap |
| Other | Expo Location, Camera, Image Picker, Document Picker, XLSX |

---

## Project Setup

### 1. Clone and install

```bash
git clone https://github.com/Jlekan3/CampusUpdate.git
cd CampusUpdate
npm install
```

### 2. Environment variables

Copy the example env and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `GOOGLE_MAPS_API_KEY` | Google Maps JavaScript API key |

### 3. Supabase setup

1. Create a project at [supabase.com](https://supabase.com)
2. Run `database/schema.sql` in the SQL editor to create all tables, RLS policies, triggers, and functions
3. Enable **Email** authentication in Auth settings
4. Enable **email confirmation** (users receive a confirmation link after registration)

### 4. Admin user

After running the schema, add your email to the `ADMIN_EMAILS` list in `src/context/AuthContext.js`:

```js
const ADMIN_EMAILS = ['youremail@rmu.edu.gh'];
```

---

## Project Structure

```
CampusUpdate/
├── App.js                          # Entry: font loading, providers, RootNavigator
├── app.json                        # Expo config (softwareKeyboardLayoutMode: resize)
├── database/
│   └── schema.sql                  # Full Supabase schema, RLS policies, triggers
└── src/
    ├── components/
    │   ├── FormInput.js             # Reusable text input with label + error
    │   ├── OTPInputGroup.js         # 6-box OTP input
    │   ├── StudentSidebar.js        # Drawer sidebar content
    │   ├── CustomButton.js
    │   ├── LocationCard.js
    │   └── Map.js / Map.web.js
    ├── config/
    │   └── supabase.js              # Supabase client
    ├── context/
    │   ├── AuthContext.js           # Auth state, role resolution, register/login/logout
    │   ├── CampusUpdatesContext.js  # Realtime notifications & events
    │   └── ThemeContext.js
    ├── navigation/
    │   ├── RootNavigator.js         # Role-based root routing
    │   ├── AuthNavigator.js         # Login, Register, ForgotPassword, ResetPassword, EmailSent
    │   ├── StudentNavigator.js      # Drawer + Bottom Tabs + Stack
    │   ├── StaffNavigator.js
    │   └── AdminNavigator.js
    ├── screens/
    │   ├── auth/
    │   │   ├── LoginScreen.js
    │   │   ├── RegisterScreen.js    # With programme dropdown
    │   │   ├── ForgotPasswordScreen.js
    │   │   ├── ResetPasswordScreen.js
    │   │   └── EmailSentScreen.js
    │   ├── student/
    │   │   ├── StudentHomeScreen.js # Dashboard with quick actions
    │   │   ├── FavoritesScreen.js
    │   │   ├── NotificationsScreen.js
    │   │   ├── CampusEventsScreen.js
    │   │   ├── DiningScreen.js
    │   │   ├── CampusRulesScreen.js
    │   │   ├── SafetySupportScreen.js
    │   │   └── ReportIssueScreen.js
    │   ├── admin/                   # Full admin CRUD screens
    │   └── common/
    │       ├── MapScreen.js
    │       ├── SearchLocationsScreen.js
    │       ├── LocationDetailsScreen.js
    │       └── QRScannerScreen.js
    ├── services/
    │   ├── databaseService.js       # Supabase CRUD + realtime subscriptions
    │   ├── mapService.js
    │   └── storageService.js
    └── utils/
        ├── theme.js                 # Colors, fonts (Outfit), radius, shadow constants
        ├── validationSchemas.js     # Zod schemas for all forms
        └── constants.js            # Roles, emergency contacts
```

---

## Database Schema

### Tables

| Table | Description |
|-------|-------------|
| `users` | User profiles, roles, index number, programme |
| `buildings` | Campus buildings with coordinates |
| `locations` | Rooms and places (linked to buildings) |
| `notifications` | Announcements with audience targeting |
| `notification_reads` | Per-user read receipts |
| `events` | Campus events |
| `event_interests` | User RSVPs |
| `favourites` | User-saved locations |
| `dining` | Cafés and restaurants |
| `campus_rules` | Student handbook entries |
| `amenities` | Campus facilities |
| `departments` | Staff departments with availability |
| `reports` | Student issue reports |

### RPC Functions

| Function | Description |
|----------|-------------|
| `toggle_favourite(location_id)` | Add/remove favourite, returns boolean |
| `mark_notification_read(notification_id)` | Mark as read |
| `toggle_event_interest(event_id)` | RSVP toggle |
| `touch_user_login()` | Update last_login_at |

---

## QR Codes

Generate QR codes with these payload formats:

| Format | Example | Behaviour |
|--------|---------|-----------|
| Location ID | `location:uuid-here` | Opens location details |
| Coordinates | `geo:5.607,-0.172` | Opens map centred on coords |

QR scanning requires a **physical mobile device**.

---

## Running the App

```bash
npx expo start -c      # start with cleared cache (recommended)
npx expo start         # normal start
```

| Key | Action |
|-----|--------|
| `a` | Open on Android emulator |
| `i` | Open on iOS simulator |
| Scan QR | Open in Expo Go on device |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Fonts not loading | Run `npx expo start -c` to clear Metro cache |
| `Invalid API key` on Supabase | Check `.env.local` has correct `EXPO_PUBLIC_SUPABASE_URL` and key |
| Inputs not tappable | Ensure `softwareKeyboardLayoutMode: "resize"` in `app.json` |
| Map blank | Check Google Maps API key in `src/config/googleMaps.js` |
| Registration email not arriving | Check Supabase Auth → Email settings; check spam folder |
| `permission-denied` | Verify Supabase RLS policies are applied (re-run `schema.sql`) |
| QR does nothing | Check payload format; physical device required |

---

## Security Notes

- Do **not** commit `.env.local` or any API keys.
- Replace placeholder emergency numbers in `src/utils/constants.js` with real RMU contacts.
- Restrict Supabase anon key usage via RLS policies (all implemented in `schema.sql`).
- Review `ADMIN_EMAILS` in `AuthContext.js` before production.

---

## License / Project Context

Final-year project — **RMU Campus Navigation** for Regional Maritime University, Ghana. For internal team use; configure Supabase credentials per environment before any public release.
