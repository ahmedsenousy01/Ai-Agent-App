import {
  Patient,
  Report,
  Medication,
  VitalSnapshot,
  Appointment,
  Clinician,
  InteractionLog,
  ID,
  ISODate,
} from "../types";

// Helper function to generate IDs
const generateId = (): ID => Math.random().toString(36).substr(2, 9);

// Helper function to generate ISO dates
const generateISODate = (daysAgo: number = 0): ISODate => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
};

// Mock Patients
export const mockPatients: Patient[] = [
  {
    id: "patient-001",
    name: "John Smith",
    room: "201",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    isUrgent: false,
    lastVisit: "2 hours ago",
    isoLastVisit: generateISODate(0.1),
    condition: "Hypertension",
    age: 65,
    gender: "Male",
    phone: "(555) 123-4567",
    email: "john.smith@email.com",
    emergencyContact: "Mary Smith (555) 123-4568",
    allergies: ["Penicillin", "Shellfish"],
    medicalHistory: [
      "Type 2 Diabetes",
      "High Cholesterol",
      "Previous MI (2019)",
    ],
  },
  {
    id: "patient-002",
    name: "Sarah Johnson",
    room: "205",
    avatar:
      "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
    isUrgent: true,
    lastVisit: "30 minutes ago",
    isoLastVisit: generateISODate(0.02),
    condition: "Chest Pain",
    age: 42,
    gender: "Female",
    phone: "(555) 234-5678",
    email: "sarah.johnson@email.com",
    emergencyContact: "David Johnson (555) 234-5679",
    allergies: ["Latex"],
    medicalHistory: ["Family history of CAD", "Smoking history (quit 2020)"],
  },
  {
    id: "patient-003",
    name: "Michael Chen",
    room: "203",
    avatar:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    isUrgent: false,
    lastVisit: "1 day ago",
    isoLastVisit: generateISODate(1),
    condition: "Diabetes Management",
    age: 58,
    gender: "Male",
    phone: "(555) 345-6789",
    email: "michael.chen@email.com",
    emergencyContact: "Lisa Chen (555) 345-6790",
    allergies: ["Sulfa drugs"],
    medicalHistory: [
      "Type 1 Diabetes (diagnosed age 12)",
      "Diabetic neuropathy",
      "Retinopathy",
    ],
  },
  {
    id: "patient-004",
    name: "Emily Rodriguez",
    room: "207",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
    isUrgent: false,
    lastVisit: "3 days ago",
    isoLastVisit: generateISODate(3),
    condition: "Post-surgical Recovery",
    age: 34,
    gender: "Female",
    phone: "(555) 456-7890",
    email: "emily.rodriguez@email.com",
    emergencyContact: "Carlos Rodriguez (555) 456-7891",
    allergies: ["Iodine contrast"],
    medicalHistory: ["Appendectomy (2024)", "Previous C-section (2020)"],
  },
  {
    id: "patient-005",
    name: "Robert Wilson",
    room: "209",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
    isUrgent: true,
    lastVisit: "15 minutes ago",
    isoLastVisit: generateISODate(0.01),
    condition: "Respiratory Distress",
    age: 71,
    gender: "Male",
    phone: "(555) 567-8901",
    email: "robert.wilson@email.com",
    emergencyContact: "Patricia Wilson (555) 567-8902",
    allergies: ["Aspirin"],
    medicalHistory: ["COPD", "Emphysema", "Previous pneumonia (2023)"],
  },
  {
    id: "patient-006",
    name: "Lisa Thompson",
    room: "211",
    avatar:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face",
    isUrgent: false,
    lastVisit: "5 days ago",
    isoLastVisit: generateISODate(5),
    condition: "Routine Checkup",
    age: 29,
    gender: "Female",
    phone: "(555) 678-9012",
    email: "lisa.thompson@email.com",
    emergencyContact: "James Thompson (555) 678-9013",
    allergies: ["None known"],
    medicalHistory: ["Healthy", "Regular exercise", "Vegetarian diet"],
  },
];

// Mock Clinicians
export const mockClinicians: Clinician[] = [
  {
    id: "clinician-001",
    name: "Dr. Sarah Chen",
    role: "Cardiologist",
    avatar:
      "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&h=150&fit=crop&crop=face",
    status: "ONLINE",
    department: "Cardiology",
    phone: "(555) 100-2000",
    email: "sarah.chen@hospital.com",
  },
  {
    id: "clinician-002",
    name: "Dr. Michael Rodriguez",
    role: "Internal Medicine",
    avatar:
      "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&h=150&fit=crop&crop=face",
    status: "ONLINE",
    department: "Internal Medicine",
    phone: "(555) 100-2001",
    email: "michael.rodriguez@hospital.com",
  },
  {
    id: "clinician-003",
    name: "Dr. Jennifer Lee",
    role: "Endocrinologist",
    avatar:
      "https://images.unsplash.com/photo-1594824388852-8b04b7311fef?w=150&h=150&fit=crop&crop=face",
    status: "OFFLINE",
    department: "Endocrinology",
    phone: "(555) 100-2002",
    email: "jennifer.lee@hospital.com",
  },
  {
    id: "clinician-004",
    name: "Dr. David Kim",
    role: "Pulmonologist",
    avatar:
      "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=150&h=150&fit=crop&crop=face",
    status: "ONLINE",
    department: "Pulmonology",
    phone: "(555) 100-2003",
    email: "david.kim@hospital.com",
  },
];

// Mock Medications
export const mockMedications: Medication[] = [
  {
    id: "med-001",
    patientId: "patient-001",
    name: "Lisinopril",
    dosage: "10mg, once daily",
    type: "ACE Inhibitor",
    startedAt: generateISODate(30),
    active: true,
    prescribedBy: "Dr. Sarah Chen",
    instructions: "Take with food, monitor blood pressure",
  },
  {
    id: "med-002",
    patientId: "patient-001",
    name: "Metformin",
    dosage: "500mg, twice daily",
    type: "Antidiabetic",
    startedAt: generateISODate(45),
    active: true,
    prescribedBy: "Dr. Jennifer Lee",
    instructions: "Take with meals",
  },
  {
    id: "med-003",
    patientId: "patient-002",
    name: "Aspirin",
    dosage: "81mg, once daily",
    type: "Antiplatelet",
    startedAt: generateISODate(7),
    active: true,
    prescribedBy: "Dr. Sarah Chen",
    instructions: "Take with water, avoid alcohol",
  },
  {
    id: "med-004",
    patientId: "patient-003",
    name: "Insulin Glargine",
    dosage: "25 units, once daily at bedtime",
    type: "Long-acting Insulin",
    startedAt: generateISODate(365),
    active: true,
    prescribedBy: "Dr. Jennifer Lee",
    instructions: "Inject subcutaneously, rotate injection sites",
  },
  {
    id: "med-005",
    patientId: "patient-005",
    name: "Albuterol",
    dosage: "2 puffs, as needed",
    type: "Bronchodilator",
    startedAt: generateISODate(60),
    active: true,
    prescribedBy: "Dr. David Kim",
    instructions: "Use for shortness of breath, max 4 times daily",
  },
];

// Mock Vital Signs
export const mockVitals: VitalSnapshot[] = [
  {
    id: "vital-001",
    patientId: "patient-001",
    recordedAt: generateISODate(0.1),
    heartRate: "72 bpm",
    bloodPressure: "135/85 mmHg",
    temperature: "98.6°F",
    respiratoryRate: "16 breaths/min",
    oxygenSaturation: "98%",
    weight: "180 lbs",
    height: "5'10\"",
    bmi: "25.8",
  },
  {
    id: "vital-002",
    patientId: "patient-002",
    recordedAt: generateISODate(0.02),
    heartRate: "95 bpm",
    bloodPressure: "150/95 mmHg",
    temperature: "99.2°F",
    respiratoryRate: "20 breaths/min",
    oxygenSaturation: "96%",
    weight: "165 lbs",
    height: "5'6\"",
    bmi: "26.6",
  },
  {
    id: "vital-003",
    patientId: "patient-003",
    recordedAt: generateISODate(1),
    heartRate: "78 bpm",
    bloodPressure: "125/80 mmHg",
    temperature: "98.4°F",
    respiratoryRate: "14 breaths/min",
    oxygenSaturation: "99%",
    weight: "175 lbs",
    height: "5'9\"",
    bmi: "25.8",
  },
  {
    id: "vital-004",
    patientId: "patient-005",
    recordedAt: generateISODate(0.01),
    heartRate: "110 bpm",
    bloodPressure: "140/90 mmHg",
    temperature: "100.1°F",
    respiratoryRate: "28 breaths/min",
    oxygenSaturation: "88%",
    weight: "155 lbs",
    height: "5'8\"",
    bmi: "23.6",
  },
];

// Mock Appointments
export const mockAppointments: Appointment[] = [
  {
    id: "appt-001",
    patientId: "patient-001",
    scheduledFor: generateISODate(-1), // Tomorrow
    reason: "Follow-up for hypertension management",
    location: "Cardiology Clinic, Room 3",
    clinicianName: "Dr. Sarah Chen",
    status: "Scheduled",
    duration: 30,
    notes: "Review blood pressure logs, adjust medication if needed",
  },
  {
    id: "appt-002",
    patientId: "patient-002",
    scheduledFor: generateISODate(0.5), // Today afternoon
    reason: "Cardiac stress test",
    location: "Cardiology Lab",
    clinicianName: "Dr. Sarah Chen",
    status: "Scheduled",
    duration: 60,
    notes: "NPO after midnight, bring current medications",
  },
  {
    id: "appt-003",
    patientId: "patient-003",
    scheduledFor: generateISODate(7), // Next week
    reason: "Diabetes management review",
    location: "Endocrinology Clinic, Room 2",
    clinicianName: "Dr. Jennifer Lee",
    status: "Scheduled",
    duration: 45,
    notes: "Bring glucose logs, review HbA1c results",
  },
  {
    id: "appt-004",
    patientId: "patient-005",
    scheduledFor: generateISODate(0.1), // This morning
    reason: "Respiratory assessment",
    location: "Pulmonology Clinic, Room 1",
    clinicianName: "Dr. David Kim",
    status: "Completed",
    duration: 30,
    notes: "Patient stable, continue current treatment plan",
  },
];

// Mock Reports
export const mockReports: Report[] = [
  {
    id: "report-001",
    patientId: "patient-001",
    title: "Hypertension Assessment",
    type: "Assessment",
    date: generateISODate(1),
    generatedBy: "AI Assistant",
    status: "Generated",
    content: {
      chiefComplaint: "Elevated blood pressure readings at home",
      history:
        "65-year-old male with history of hypertension, diabetes, and previous MI in 2019. Reports good medication compliance.",
      vitalsSummary: "BP: 135/85 mmHg, HR: 72 bpm, Temp: 98.6°F, O2 Sat: 98%",
      labsSummary:
        "Recent labs show HbA1c 7.2%, LDL 95 mg/dL, Creatinine 1.1 mg/dL",
      assessment:
        "Hypertension not at goal. Current medications include Lisinopril 10mg daily and Metformin 500mg BID.",
      plan: "Increase Lisinopril to 20mg daily, recheck BP in 2 weeks, continue diabetes management",
      notes:
        "Patient educated on lifestyle modifications including DASH diet and regular exercise.",
    },
  },
  {
    id: "report-002",
    patientId: "patient-002",
    title: "Chest Pain Evaluation",
    type: "Assessment",
    date: generateISODate(0.02),
    generatedBy: "AI Assistant",
    status: "Reviewed",
    content: {
      chiefComplaint: "Acute chest pain, pressure-like, started 2 hours ago",
      history:
        "42-year-old female with family history of CAD, former smoker (quit 2020). Pain radiates to left arm.",
      vitalsSummary: "BP: 150/95 mmHg, HR: 95 bpm, Temp: 99.2°F, O2 Sat: 96%",
      labsSummary:
        "Troponin I: 0.02 ng/mL (normal), CK-MB: 2.1 ng/mL, CBC within normal limits",
      assessment:
        "Atypical chest pain, low risk for acute coronary syndrome based on initial workup",
      plan: "Continue cardiac monitoring, stress test scheduled, aspirin 81mg daily started",
      notes: "Patient counseled on symptoms to watch for, follow-up in 1 week",
    },
  },
  {
    id: "report-003",
    patientId: "patient-003",
    title: "Diabetes Management Review",
    type: "Follow-up",
    date: generateISODate(2),
    generatedBy: "Manual Entry",
    status: "Approved",
    content: {
      chiefComplaint: "Routine diabetes follow-up",
      history:
        "58-year-old male with Type 1 diabetes since age 12, well-controlled on insulin therapy",
      vitalsSummary:
        "BP: 125/80 mmHg, HR: 78 bpm, Temp: 98.4°F, Weight: 175 lbs",
      labsSummary:
        "HbA1c: 7.1%, Fasting glucose: 145 mg/dL, Microalbumin: 15 mg/g (normal)",
      assessment: "Diabetes well-controlled, no evidence of complications",
      plan: "Continue current insulin regimen, annual eye exam, podiatry referral",
      notes:
        "Patient demonstrates good understanding of diabetes self-management",
    },
  },
];

// Mock Interaction Logs
export const mockInteractionLogs: InteractionLog[] = [
  {
    id: "log-001",
    startedAt: generateISODate(0.1),
    finishedAt: generateISODate(0.1),
    audioDuration: 3500,
    intent: "update_patient",
    toolCalls: [
      {
        tool: "update_patient",
        args: { patientId: "patient-001", updates: { room: "201" } },
        result: { success: true },
        at: generateISODate(0.1),
      },
    ],
    summary: "Updated John Smith's room assignment to 201",
    context: {
      currentScreen: "patients",
      patientId: "patient-001",
    },
    success: true,
  },
  {
    id: "log-002",
    startedAt: generateISODate(0.05),
    finishedAt: generateISODate(0.05),
    audioDuration: 4200,
    intent: "generate_report",
    toolCalls: [
      {
        tool: "create_report",
        args: {
          patientId: "patient-002",
          type: "Assessment",
          title: "Chest Pain Evaluation",
        },
        result: { reportId: "report-002" },
        at: generateISODate(0.05),
      },
    ],
    summary:
      "Generated comprehensive chest pain assessment report for Sarah Johnson",
    context: {
      currentScreen: "patient-details",
      patientId: "patient-002",
    },
    success: true,
  },
];

// Current user (default clinician)
export const currentUser: Clinician = mockClinicians[0]; // Dr. Sarah Chen
