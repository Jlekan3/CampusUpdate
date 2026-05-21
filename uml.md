# RMU Campus Navigation App — UML Diagrams

> Render these diagrams in VS Code with the **Mermaid** extension, or paste any block into [mermaid.live](https://mermaid.live).

---

## 1. Use Case Diagram

```mermaid
graph LR
  subgraph Actors
    G(["👤 Guest"])
    S(["🎓 Student"])
    F(["👔 Staff / Faculty"])
    A(["🔑 Admin"])
  end

  subgraph Guest Features
    UC1[Browse Campus Map]
    UC2[Search Locations]
    UC3[View Campus Rules]
    UC4[View Dining Info]
    UC5[View Emergency Contacts]
    UC6[Scan QR Code]
  end

  subgraph Student Features
    UC7[Login / Register]
    UC8[OTP Verification]
    UC9[View Student Dashboard]
    UC10[Save Favourite Locations]
    UC11[Report an Issue]
    UC12[View Campus Events]
    UC13[View Notifications]
    UC14[View & Edit Profile]
  end

  subgraph Staff Features
    UC15[View Staff Dashboard]
    UC16[View Safety & Support]
    UC17[View Campus Alerts]
  end

  subgraph Admin Features
    UC18[Manage Users\nStudents & Staff]
    UC19[Manage Buildings]
    UC20[Manage Locations]
    UC21[Manage Events]
    UC22[Manage Notifications]
    UC23[Manage Dining]
    UC24[Manage Campus Rules]
    UC25[Manage Emergency Contacts]
    UC26[View Analytics & Reports]
  end

  G --> UC1 & UC2 & UC3 & UC4 & UC5 & UC6
  S --> UC7 & UC8 & UC9 & UC10 & UC11 & UC12 & UC13 & UC14
  S --> UC1 & UC2 & UC3 & UC4 & UC5 & UC6
  F --> UC15 & UC16 & UC17
  F --> UC1 & UC2 & UC12 & UC13
  A --> UC18 & UC19 & UC20 & UC21 & UC22 & UC23 & UC24 & UC25 & UC26
```

---

## 2. System Architecture Flowchart

```mermaid
flowchart TD
  subgraph CLIENT["📱 Mobile Client — React Native / Expo"]
    UI[Screens & Components]
    NAV[React Navigation\nRootNavigator]
    CTX[Context Layer\nAuthContext · CampusUpdatesContext · ThemeContext]
    SVC[Services Layer\ndatabaseService · storageService]
  end

  subgraph SUPABASE["☁️ Supabase Backend"]
    AUTH[Auth Service\nEmail OTP · Anonymous · Password]
    DB[(PostgreSQL Database\nusers · locations · buildings\nevents · notifications · dining\ncampus_rules · safety_and_support\nreports · favourites · amenities)]
    STORAGE[Storage Buckets\nprofiles · locations]
    EDGE[Edge Functions\nsend-welcome-email]
    RLS[Row-Level Security\nPolicies per table & role]
  end

  subgraph EXTERNAL["🌐 External Services"]
    BREVO[Brevo SMTP\nEmail Delivery]
  end

  UI --> NAV --> CTX --> SVC
  SVC --> AUTH
  SVC --> DB
  SVC --> STORAGE
  SVC --> EDGE
  AUTH --> DB
  DB --> RLS
  EDGE --> BREVO
  AUTH --> BREVO

  style CLIENT fill:#EFF6FF,stroke:#3B82F6
  style SUPABASE fill:#F0FDF4,stroke:#22C55E
  style EXTERNAL fill:#FEF9EC,stroke:#F59E0B
```

---

## 3. Login Flowchart

```mermaid
flowchart TD
  A([User opens app]) --> B{Saved session?}
  B -->|No| C[Show Login Screen]
  B -->|Yes & FORCE_REQUIRE_LOGIN| D[Sign out silently] --> C

  C --> E[Enter email + password]
  E --> F{Form valid?}
  F -->|No| G[Show field errors] --> E
  F -->|Yes| H[signInWithPassword]
  H --> I{Auth success?}
  I -->|No| J[Show error message] --> E
  I -->|Yes| K[onAuthStateChange fires]

  K --> L{must_change_password?}
  L -->|Yes| M[Force Change Password Screen]
  M --> N[User sets new password]
  N --> O[Clear flag in user_metadata]
  O --> P

  L -->|No| P[Resolve role from\nuser_metadata → users table]
  P --> Q{Role?}

  Q -->|admin| R[🔑 Admin Dashboard]
  Q -->|faculty| S[👔 Staff Dashboard]
  Q -->|student| T[🎓 Student Dashboard]
  Q -->|guest / anon| U[👤 Guest Dashboard]

  style R fill:#FEF2F2,stroke:#EF4444
  style S fill:#EFF6FF,stroke:#3B82F6
  style T fill:#F0FDF4,stroke:#22C55E
  style U fill:#F5F3FF,stroke:#8B5CF6
```

---

## 4. Registration Flow

```mermaid
flowchart TD
  A([Student opens Register screen]) --> B[Fill registration form\nName · Student ID · Index No\nDepartment → Programme\nEmail · Password · Photo]

  B --> C{Form valid?\nEmail @st.rmu.edu.gh\nAll required fields}
  C -->|No| D[Show validation errors] --> B
  C -->|Yes| E[supabase.auth.signUp\nno avatar upload yet]

  E --> F{signUp success?}
  F -->|No| G[Show error e.g. email exists] --> B
  F -->|Yes| H[Navigate to OTP Verification\npass email + avatarUri]

  H --> I[User checks email\nfor 8-digit code]
  I --> J[Enter OTP code]
  J --> K[supabase.auth.verifyOtp]

  K --> L{OTP valid?}
  L -->|No| M[Show error · allow resend] --> I
  L -->|Yes| N{Avatar selected?}

  N -->|Yes| O[Upload avatar to\nprofiles storage bucket]
  O --> P[Update user_metadata.avatar_url\nUpdate public.users.avatar_url]
  P --> Q

  N -->|No| Q[supabase.auth.signOut\nprevent auto-routing to dashboard]
  Q --> R[Show success modal\nAccount Created!]
  R --> S[Redirect to Login\nafter 3 seconds]
  S --> T([User logs in normally])

  style T fill:#F0FDF4,stroke:#22C55E
```

---

## 5. Sequence Diagram — Admin Creates a New User

```mermaid
sequenceDiagram
  actor Admin
  participant Screen as ManagePeopleScreen
  participant DB as databaseService
  participant Auth as Supabase Auth
  participant PG as Supabase DB (public.users)
  participant EF as Edge Function
  participant Email as Brevo Email

  Admin->>Screen: Fill form (name, email, dept, role…)
  Admin->>Screen: Tap "Create Account"

  Screen->>Screen: generateTempPassword()
  Screen->>DB: createUserWithAuthAndFirestore(email, tempPw, payload)

  DB->>Auth: tempClient.auth.signUp(email, tempPw,\n{ must_change_password: true })
  Auth-->>DB: { user: { id, email, user_metadata } }

  DB->>PG: upsert users row\n(all profile fields)
  PG-->>DB: OK

  DB->>EF: invoke('send-welcome-email',\n{ email, full_name, password, role })
  EF->>Email: POST /v3/smtp/email (Brevo API)
  Email-->>EF: 201 Accepted
  EF-->>DB: { ok: true }

  DB-->>Screen: user object
  Screen->>Admin: Alert — Account created!\nTemp password shown as backup

  Note over Admin,Email: Later — User first login

  actor User
  User->>Auth: signInWithPassword(email, tempPw)
  Auth-->>User: Session (must_change_password: true)
  User->>Screen: RootNavigator detects flag
  Screen->>User: ForceChangePasswordScreen
  User->>Auth: updateUser({ password: newPw })
  User->>Auth: updateUser({ data: { must_change_password: false } })
  Auth-->>User: Session updated
  User->>Screen: RootNavigator routes to role dashboard
```

---

## 6. Activity Diagram — Full App Lifecycle

```mermaid
flowchart TD
  Start([App Launch]) --> Init[Load AuthContext\nCheck stored session]
  Init --> Loading{authLoading?}
  Loading -->|true| Spinner[Show loading spinner]
  Spinner --> Loading
  Loading -->|false| HasUser{User session\nexists?}

  HasUser -->|No| AuthStack
  HasUser -->|Yes| ForceCheck{must_change\n_password?}

  ForceCheck -->|Yes| ForceScreen[Force Change\nPassword Screen]
  ForceScreen --> ChangeOK[Password updated\nFlag cleared]
  ChangeOK --> RoleRoute

  ForceCheck -->|No| RoleRoute{Resolve Role}

  subgraph AuthStack[Auth Stack]
    direction TB
    Login[Login Screen]
    Register[Register Screen]
    OTP[OTP Verification]
    ForgotPw[Forgot Password]
    ResetPw[Reset Password]
    Login --> Register
    Login --> ForgotPw --> OTP --> ResetPw
    Register --> OTP
  end

  RoleRoute -->|admin| AdminFlow
  RoleRoute -->|faculty| StaffFlow
  RoleRoute -->|student| StudentFlow
  RoleRoute -->|guest| GuestFlow

  subgraph AdminFlow[Admin Navigator]
    direction TB
    ADash[Admin Dashboard]
    AUsers[Manage People]
    AMap[Campus Map]
    ABuildings[Manage Buildings]
    AEvents[Manage Events]
    ANotifs[Manage Notifications]
  end

  subgraph StaffFlow[Staff Navigator]
    direction TB
    SHome[Staff Home]
    SMap[Campus Map]
    SNotifs[Alerts]
    SFavs[Saved Locations]
  end

  subgraph StudentFlow[Student Navigator]
    direction TB
    STHome[Student Home]
    STMap[Campus Map]
    STFavs[Favourites]
    STNotifs[Notifications]
    STSearch[Search Locations]
    STReport[Report Issue]
    STEvents[Events]
  end

  subgraph GuestFlow[Guest Navigator]
    direction TB
    GHome[Guest Home]
    GMap[Campus Map]
    GSearch[Search]
    GRules[Campus Rules]
    GDining[Dining]
    GEmergency[Emergency & Support]
  end

  AuthStack -->|Successful login| RoleRoute

  style AuthStack fill:#FEF9EC,stroke:#F59E0B
  style AdminFlow fill:#FEF2F2,stroke:#EF4444
  style StaffFlow fill:#EFF6FF,stroke:#3B82F6
  style StudentFlow fill:#F0FDF4,stroke:#22C55E
  style GuestFlow fill:#F5F3FF,stroke:#8B5CF6
```

---

*Generated for: RMU Campus Navigation App · Regional Maritime University, Ghana*
