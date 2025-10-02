import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  ArrowLeft,
  Activity,
  Heart,
  Thermometer,
  Wind,
  Droplets,
  Weight,
  Calendar,
  ChevronRight,
} from "lucide-react-native";
import { Patient, Report } from "../types";
import {
  usePatientVitals,
  usePatientMedications,
  usePatientReports,
} from "../hooks/useDataStore";
import { ReportViewer } from "../components/ReportViewer";

interface PatientDetailsProps {
  patient: Patient;
  onBack: () => void;
}

interface VitalStat {
  label: string;
  value: string;
  icon: React.ComponentType<any>;
  color: string;
}

type Tab = "overview" | "history" | "medications" | "reports";

// Staggered fade-in animation hook
const useStaggeredFadeIn = (itemCount: number, active: boolean) => {
  const animatedValues = useRef(
    Array.from({ length: itemCount }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    if (active) {
      const animations = animatedValues.map((value) => {
        return Animated.timing(value, {
          toValue: 1,
          duration: 300,
          easing: Easing.ease,
          useNativeDriver: true,
        });
      });
      Animated.stagger(100, animations).start();
    } else {
      animatedValues.forEach((value) => value.setValue(0));
    }
  }, [active, itemCount]);

  return animatedValues;
};

export const PatientDetailsScreen: React.FC<PatientDetailsProps> = ({
  patient,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [reportViewerVisible, setReportViewerVisible] = useState(false);

  // Handle report viewing
  const handleViewReport = (report: Report) => {
    setSelectedReport(report);
    setReportViewerVisible(true);
  };

  const handleCloseReportViewer = () => {
    setReportViewerVisible(false);
    setSelectedReport(null);
  };

  // Get real data from data store with automatic updates
  const patientVitals = usePatientVitals(patient.id);
  const patientMedications = usePatientMedications(patient.id);
  const patientReports = usePatientReports(patient.id);

  // Convert real data to display format
  const vitals = patientVitals
    ? [
        {
          label: "Heart Rate",
          value: patientVitals.heartRate || "N/A",
          icon: Heart,
          color: "#ef4444",
        },
        {
          label: "Blood Pressure",
          value: patientVitals.bloodPressure || "N/A",
          icon: Activity,
          color: "#3b82f6",
        },
        {
          label: "Temperature",
          value: patientVitals.temperature || "N/A",
          icon: Thermometer,
          color: "#f97316",
        },
        {
          label: "Respiratory Rate",
          value: patientVitals.respiratoryRate || "N/A",
          icon: Wind,
          color: "#06b6d4",
        },
        {
          label: "Oxygen Saturation",
          value: patientVitals.oxygenSaturation || "N/A",
          icon: Droplets,
          color: "#10b981",
        },
        {
          label: "Weight",
          value: patientVitals.weight || "N/A",
          icon: Weight,
          color: "#8b5cf6",
        },
      ]
    : [];

  const medications = patientMedications.map((med) => ({
    name: med.name,
    dosage: med.dosage,
    type: med.type,
  }));

  const reports = patientReports.map((report) => ({
    id: report.id,
    title: report.title,
    date: new Date(report.date).toLocaleDateString(),
    type: report.type,
  }));

  const animatedVitals = useStaggeredFadeIn(
    vitals.length,
    activeTab === "overview"
  );
  const animatedMedications = useStaggeredFadeIn(
    medications.length,
    activeTab === "medications"
  );
  const animatedReports = useStaggeredFadeIn(
    reports.length,
    activeTab === "reports"
  );

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "history", label: "History" },
    { id: "medications", label: "Medications" },
    { id: "reports", label: "Reports" },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={["#3b82f6", "#9333ea"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <ArrowLeft size={20} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Patient Details</Text>
        </View>

        <View style={styles.patientHeader}>
          <View style={styles.patientAvatarContainer}>
            <Image
              source={{ uri: patient.avatar }}
              style={styles.patientAvatar}
            />
          </View>
          <View style={styles.patientInfo}>
            <Text style={styles.patientName}>{patient.name}</Text>
            <Text style={styles.patientCondition}>{patient.condition}</Text>
            <Text style={styles.patientId}>
              ID: {patient.id}2345 • {patient.room}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.tabs}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={[styles.tab, activeTab === tab.id && styles.tabActive]}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === tab.id && styles.tabTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {activeTab === "overview" && (
          <View style={styles.section}>
            {/* Vitals */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>Vitals</Text>
              <View style={styles.vitalsGrid}>
                {vitals.map((vital, index) => {
                  const Icon = vital.icon;
                  return (
                    <Animated.View
                      key={vital.label}
                      style={[
                        styles.vitalCard,
                        {
                          opacity: animatedVitals[index],
                          transform: [
                            {
                              translateY: animatedVitals[index].interpolate({
                                inputRange: [0, 1],
                                outputRange: [10, 0],
                              }),
                            },
                          ],
                        },
                      ]}
                    >
                      <View style={styles.vitalCardContent}>
                        <View style={styles.vitalHeader}>
                          <Icon size={16} color={vital.color} />
                          <Text style={styles.vitalLabel}>{vital.label}</Text>
                        </View>
                        <Text style={styles.vitalValue}>{vital.value}</Text>
                      </View>
                    </Animated.View>
                  );
                })}
              </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <TouchableOpacity
                style={[styles.actionCard, styles.actionCardBlue]}
              >
                <Calendar size={20} color="#2563eb" />
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>Schedule Appointment</Text>
                  <Text style={styles.actionSubtitle}>
                    Next available: Tomorrow 2:30 PM
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionCard, styles.actionCardGreen]}
              >
                <Activity size={20} color="#16a34a" />
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>Generate Report</Text>
                  <Text style={styles.actionSubtitle}>
                    Create new assessment report
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {activeTab === "medications" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Current Medications</Text>
            {medications.map((medication, index) => (
              <Animated.View
                key={medication.name}
                style={[
                  styles.medicationCard,
                  {
                    opacity: animatedMedications[index],
                    transform: [
                      {
                        translateY: animatedMedications[index].interpolate({
                          inputRange: [0, 1],
                          outputRange: [10, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <View>
                  <Text style={styles.medicationName}>{medication.name}</Text>
                  <Text style={styles.medicationDosage}>
                    {medication.dosage}
                  </Text>
                  <View style={styles.medicationType}>
                    <Text style={styles.medicationTypeText}>
                      {medication.type}
                    </Text>
                  </View>
                </View>
              </Animated.View>
            ))}
          </View>
        )}

        {activeTab === "reports" && (
          <View style={styles.section}>
            <View style={styles.reportsHeader}>
              <Text style={styles.sectionTitle}>Generated Reports</Text>
              <TouchableOpacity style={styles.newReportButton}>
                <Text style={styles.newReportText}>New Report</Text>
              </TouchableOpacity>
            </View>
            {reports.map((report, index) => {
              // Find the full report object from patientReports
              const fullReport = patientReports.find((r) => r.id === report.id);

              return (
                <Animated.View
                  key={report.id}
                  style={[
                    {
                      opacity: animatedReports[index],
                      transform: [
                        {
                          translateY: animatedReports[index].interpolate({
                            inputRange: [0, 1],
                            outputRange: [10, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={styles.reportCard}
                    onPress={() => fullReport && handleViewReport(fullReport)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.reportContent}>
                      <View style={styles.reportInfo}>
                        <Text style={styles.reportTitle}>{report.title}</Text>
                        <View style={styles.reportMeta}>
                          <Text style={styles.reportDate}>{report.date}</Text>
                          <Text style={styles.reportDot}>•</Text>
                          <View style={styles.reportBadge}>
                            <Text style={styles.reportBadgeText}>
                              {report.type}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <ChevronRight size={20} color="#94a3b8" />
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        )}

        {activeTab === "history" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Medical History</Text>
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                Medical history will be populated from CRM integration
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Report Viewer Modal */}
      {selectedReport && (
        <ReportViewer
          report={selectedReport}
          visible={reportViewerVisible}
          onClose={handleCloseReportViewer}
          onShare={() => {
            // TODO: Implement share functionality
            console.log("Share report:", selectedReport.id);
          }}
          onDownload={() => {
            // TODO: Implement download functionality
            console.log("Download report:", selectedReport.id);
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc", // slate-50
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
  },
  headerTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  patientHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  patientAvatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    overflow: "hidden",
  },
  patientAvatar: {
    width: "100%",
    height: "100%",
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 20,
    fontWeight: "600",
    color: "white",
    marginBottom: 4,
  },
  patientCondition: {
    fontSize: 14,
    color: "#dbeafe", // blue-100
    marginBottom: 4,
  },
  patientId: {
    fontSize: 12,
    color: "#c7d2fe", // blue-200
  },
  tabsContainer: {
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0", // slate-200
  },
  tabs: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 24,
  },
  tab: {
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: "#3b82f6", // blue-500
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#64748b", // slate-500
  },
  tabTextActive: {
    color: "#2563eb", // blue-600
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionBlock: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b", // slate-800
    marginBottom: 16,
  },
  vitalsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    margin: -6, // Negative margin for gap
  },
  vitalCard: {
    width: "50%",
    padding: 6,
  },
  vitalCardContent: {
    backgroundColor: "#f8fafc", // slate-50
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0", // slate-200
  },
  vitalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  vitalLabel: {
    fontSize: 12,
    color: "#64748b", // slate-600
  },
  vitalValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1e293b", // slate-800
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 12,
    gap: 12,
  },
  actionCardBlue: {
    backgroundColor: "#eff6ff", // blue-50
    borderColor: "#bfdbfe", // blue-200
  },
  actionCardGreen: {
    backgroundColor: "#f0fdf4", // green-50
    borderColor: "#bbf7d0", // green-200
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 13,
    color: "#64748b",
  },
  medicationCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 12,
  },
  medicationName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 4,
  },
  medicationDosage: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 8,
  },
  medicationType: {
    backgroundColor: "#dbeafe", // blue-100
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  medicationTypeText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#1e40af", // blue-700
  },
  reportsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  newReportButton: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  newReportText: {
    color: "white",
    fontSize: 13,
    fontWeight: "600",
  },
  reportCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 12,
  },
  reportContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  reportInfo: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 8,
  },
  reportMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  reportDate: {
    fontSize: 13,
    color: "#64748b",
  },
  reportDot: {
    fontSize: 13,
    color: "#cbd5e1",
  },
  reportBadge: {
    backgroundColor: "#e2e8f0", // slate-200
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  reportBadgeText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#475569", // slate-600
  },
  emptyState: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
  },
});
