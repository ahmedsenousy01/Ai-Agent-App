import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Dimensions,
  Animated,
} from "react-native";
import {
  FileText,
  User,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  X,
  Share,
  Download,
  Menu,
} from "lucide-react-native";
import Markdown from "react-native-markdown-display";
import { Report } from "../types";

interface ReportViewerProps {
  report: Report;
  visible: boolean;
  onClose: () => void;
  onShare?: () => void;
  onDownload?: () => void;
}

export const ReportViewer: React.FC<ReportViewerProps> = ({
  report,
  visible,
  onClose,
  onShare,
  onDownload,
}) => {
  const [activeSection, setActiveSection] = useState<string>("overview");
  const [sheetOpen, setSheetOpen] = useState(false);
  const screenWidth = Dimensions.get("window").width;
  const sheetWidth = Math.min(280, screenWidth * 0.75); // Responsive sheet width

  // Sheet animations
  const sheetSlideAnim = useRef(new Animated.Value(-sheetWidth)).current;
  const backdropFadeAnim = useRef(new Animated.Value(0)).current;

  // Animate sheet open/close
  useEffect(() => {
    if (sheetOpen) {
      Animated.parallel([
        Animated.timing(sheetSlideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(backdropFadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(sheetSlideAnim, {
          toValue: -sheetWidth,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(backdropFadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [sheetOpen, sheetWidth, sheetSlideAnim, backdropFadeAnim]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Approved":
        return "#10b981";
      case "Reviewed":
        return "#3b82f6";
      case "Generated":
        return "#f59e0b";
      default:
        return "#6b7280";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Approved":
        return CheckCircle;
      case "Reviewed":
        return Clock;
      case "Generated":
        return AlertCircle;
      default:
        return FileText;
    }
  };

  const StatusIcon = getStatusIcon(report.status);

  // Dynamic sections based on report type and available content
  const getSections = () => {
    const baseSections = [
      { id: "overview", label: "Overview", icon: FileText },
    ];

    const content = report.content;

    // Add sections based on report type and available content
    if (report.type === "Discharge") {
      // Discharge report sections
      if (content?.diagnoses)
        baseSections.push({
          id: "diagnoses",
          label: "Diagnoses",
          icon: AlertCircle,
        });
      if (content?.therapy)
        baseSections.push({
          id: "therapy",
          label: "Therapy",
          icon: CheckCircle,
        });
      if (content?.histology)
        baseSections.push({
          id: "histology",
          label: "Histology",
          icon: FileText,
        });
      if (content?.course)
        baseSections.push({ id: "course", label: "Course", icon: Calendar });
      if (content?.recommendations)
        baseSections.push({
          id: "recommendations",
          label: "Recommendations",
          icon: FileText,
        });
      if (content?.lastMedication)
        baseSections.push({
          id: "lastMedication",
          label: "Last Medication",
          icon: FileText,
        });
    } else if (report.type === "Operation") {
      // Operation report sections
      if (content?.patientInfo)
        baseSections.push({
          id: "patientInfo",
          label: "Patient Info",
          icon: User,
        });
      if (content?.surgicalDiagnosis)
        baseSections.push({
          id: "surgicalDiagnosis",
          label: "Surgical Diagnosis",
          icon: AlertCircle,
        });
      if (content?.surgeon || content?.assistants || content?.anesthesiologist)
        baseSections.push({
          id: "surgicalTeam",
          label: "Surgical Team",
          icon: User,
        });
      if (content?.anesthesia)
        baseSections.push({
          id: "anesthesia",
          label: "Anesthesia",
          icon: FileText,
        });
      if (content?.procedure)
        baseSections.push({
          id: "procedure",
          label: "Procedure",
          icon: CheckCircle,
        });
      if (content?.operativeCourse)
        baseSections.push({
          id: "operativeCourse",
          label: "Operative Course",
          icon: Calendar,
        });
    } else {
      // Standard report sections
      if (content?.chiefComplaint)
        baseSections.push({
          id: "complaint",
          label: "Chief Complaint",
          icon: User,
        });
      if (content?.history)
        baseSections.push({ id: "history", label: "History", icon: Calendar });
      if (content?.vitalsSummary)
        baseSections.push({ id: "vitals", label: "Vitals", icon: CheckCircle });
      if (content?.assessment)
        baseSections.push({
          id: "assessment",
          label: "Assessment",
          icon: AlertCircle,
        });
      if (content?.plan)
        baseSections.push({ id: "plan", label: "Plan", icon: FileText });
      if (content?.notes)
        baseSections.push({ id: "notes", label: "Notes", icon: FileText });
    }

    // Always add full report section if markdown is available
    if (content?.markdown)
      baseSections.push({ id: "full", label: "Full Report", icon: FileText });

    return baseSections;
  };

  const sections = getSections();

  const renderSectionContent = () => {
    const content = report.content;

    switch (activeSection) {
      case "overview":
        return (
          <View style={styles.sectionContent}>
            <View style={styles.overviewGrid}>
              <View style={styles.overviewItem}>
                <Text style={styles.overviewLabel}>Report Type</Text>
                <Text style={styles.overviewValue}>{report.type}</Text>
              </View>
              <View style={styles.overviewItem}>
                <Text style={styles.overviewLabel}>Generated By</Text>
                <Text style={styles.overviewValue}>{report.generatedBy}</Text>
              </View>
              <View style={styles.overviewItem}>
                <Text style={styles.overviewLabel}>Date</Text>
                <Text style={styles.overviewValue}>
                  {new Date(report.date).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.overviewItem}>
                <Text style={styles.overviewLabel}>Status</Text>
                <View style={styles.statusContainer}>
                  <StatusIcon size={16} color={getStatusColor(report.status)} />
                  <Text
                    style={[
                      styles.overviewValue,
                      { color: getStatusColor(report.status) },
                    ]}
                  >
                    {report.status}
                  </Text>
                </View>
              </View>
            </View>

            {content?.markdown && (
              <View style={styles.markdownPreview}>
                <Text style={styles.sectionTitle}>Full Report Preview</Text>
                <View style={styles.markdownContainer}>
                  <Markdown style={markdownStyles}>
                    {content.markdown.length > 500
                      ? content.markdown.substring(0, 500) + "..."
                      : content.markdown}
                  </Markdown>
                </View>
                <TouchableOpacity
                  style={styles.expandButton}
                  onPress={() => setActiveSection("full")}
                >
                  <Text style={styles.expandButtonText}>View Full Report</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );

      case "complaint":
        return (
          <View style={styles.sectionContent}>
            <Text style={styles.sectionTitle}>Chief Complaint</Text>
            <View style={styles.markdownContainer}>
              <Markdown style={markdownStyles}>
                {content?.chiefComplaint || "No chief complaint recorded"}
              </Markdown>
            </View>
          </View>
        );

      case "history":
        return (
          <View style={styles.sectionContent}>
            <Text style={styles.sectionTitle}>History of Present Illness</Text>
            <View style={styles.markdownContainer}>
              <Markdown style={markdownStyles}>
                {content?.history || "No history recorded"}
              </Markdown>
            </View>
          </View>
        );

      case "vitals":
        return (
          <View style={styles.sectionContent}>
            <Text style={styles.sectionTitle}>Vital Signs Summary</Text>
            <View style={styles.markdownContainer}>
              <Markdown style={markdownStyles}>
                {content?.vitalsSummary || "No vital signs summary available"}
              </Markdown>
            </View>
          </View>
        );

      case "assessment":
        return (
          <View style={styles.sectionContent}>
            <Text style={styles.sectionTitle}>Clinical Assessment</Text>
            <View style={styles.markdownContainer}>
              <Markdown style={markdownStyles}>
                {content?.assessment || "No assessment recorded"}
              </Markdown>
            </View>
          </View>
        );

      case "plan":
        return (
          <View style={styles.sectionContent}>
            <Text style={styles.sectionTitle}>Treatment Plan</Text>
            <View style={styles.markdownContainer}>
              <Markdown style={markdownStyles}>
                {content?.plan || "No treatment plan recorded"}
              </Markdown>
            </View>
          </View>
        );

      case "notes":
        return (
          <View style={styles.sectionContent}>
            <Text style={styles.sectionTitle}>Clinical Notes</Text>
            <View style={styles.markdownContainer}>
              <Markdown style={markdownStyles}>
                {content?.notes || "No additional notes"}
              </Markdown>
            </View>
          </View>
        );

      case "full":
        return (
          <View style={styles.sectionContent}>
            <Text style={styles.sectionTitle}>Complete Report</Text>
            <View style={styles.markdownContainer}>
              <Markdown style={markdownStyles}>
                {content?.markdown || "No full report content available"}
              </Markdown>
            </View>
          </View>
        );

      // Discharge report sections
      case "diagnoses":
        return (
          <View style={styles.sectionContent}>
            <Text style={styles.sectionTitle}>Diagnoses</Text>
            <View style={styles.markdownContainer}>
              <Markdown style={markdownStyles}>
                {content?.diagnoses || "No diagnoses recorded"}
              </Markdown>
            </View>
          </View>
        );

      case "therapy":
        return (
          <View style={styles.sectionContent}>
            <Text style={styles.sectionTitle}>Therapy</Text>
            <View style={styles.markdownContainer}>
              <Markdown style={markdownStyles}>
                {content?.therapy || "No therapy information recorded"}
              </Markdown>
            </View>
          </View>
        );

      case "histology":
        return (
          <View style={styles.sectionContent}>
            <Text style={styles.sectionTitle}>Histology</Text>
            <View style={styles.markdownContainer}>
              <Markdown style={markdownStyles}>
                {content?.histology || "No histology results available"}
              </Markdown>
            </View>
          </View>
        );

      case "course":
        return (
          <View style={styles.sectionContent}>
            <Text style={styles.sectionTitle}>Course</Text>
            <View style={styles.markdownContainer}>
              <Markdown style={markdownStyles}>
                {content?.course || "No course information recorded"}
              </Markdown>
            </View>
          </View>
        );

      case "recommendations":
        return (
          <View style={styles.sectionContent}>
            <Text style={styles.sectionTitle}>Recommendations</Text>
            <View style={styles.markdownContainer}>
              <Markdown style={markdownStyles}>
                {content?.recommendations || "No recommendations provided"}
              </Markdown>
            </View>
          </View>
        );

      case "lastMedication":
        return (
          <View style={styles.sectionContent}>
            <Text style={styles.sectionTitle}>Last Medication</Text>
            <View style={styles.markdownContainer}>
              <Markdown style={markdownStyles}>
                {content?.lastMedication ||
                  "No medication information recorded"}
              </Markdown>
            </View>
          </View>
        );

      // Operation report sections
      case "patientInfo":
        return (
          <View style={styles.sectionContent}>
            <Text style={styles.sectionTitle}>Patient Information</Text>
            <View style={styles.overviewGrid}>
              {content?.patientInfo?.name && (
                <View style={styles.overviewItem}>
                  <Text style={styles.overviewLabel}>Name</Text>
                  <Text style={styles.overviewValue}>
                    {content.patientInfo.name}
                  </Text>
                </View>
              )}
              {content?.patientInfo?.dateOfBirth && (
                <View style={styles.overviewItem}>
                  <Text style={styles.overviewLabel}>Date of Birth</Text>
                  <Text style={styles.overviewValue}>
                    {content.patientInfo.dateOfBirth}
                  </Text>
                </View>
              )}
              {content?.patientInfo?.dateOfSurgery && (
                <View style={styles.overviewItem}>
                  <Text style={styles.overviewLabel}>Date of Surgery</Text>
                  <Text style={styles.overviewValue}>
                    {content.patientInfo.dateOfSurgery}
                  </Text>
                </View>
              )}
              {content?.patientInfo?.ward && (
                <View style={styles.overviewItem}>
                  <Text style={styles.overviewLabel}>Ward</Text>
                  <Text style={styles.overviewValue}>
                    {content.patientInfo.ward}
                  </Text>
                </View>
              )}
            </View>
          </View>
        );

      case "surgicalDiagnosis":
        return (
          <View style={styles.sectionContent}>
            <Text style={styles.sectionTitle}>Surgical Diagnosis</Text>
            <View style={styles.markdownContainer}>
              <Markdown style={markdownStyles}>
                {content?.surgicalDiagnosis || "No surgical diagnosis recorded"}
              </Markdown>
            </View>
          </View>
        );

      case "surgicalTeam":
        return (
          <View style={styles.sectionContent}>
            <Text style={styles.sectionTitle}>Surgical Team</Text>
            <View style={styles.overviewGrid}>
              {content?.surgeon && (
                <View style={styles.overviewItem}>
                  <Text style={styles.overviewLabel}>Surgeon</Text>
                  <Text style={styles.overviewValue}>{content.surgeon}</Text>
                </View>
              )}
              {content?.assistants && (
                <View style={styles.overviewItem}>
                  <Text style={styles.overviewLabel}>Assistants</Text>
                  <Text style={styles.overviewValue}>{content.assistants}</Text>
                </View>
              )}
              {content?.anesthesiologist && (
                <View style={styles.overviewItem}>
                  <Text style={styles.overviewLabel}>Anesthesiologist</Text>
                  <Text style={styles.overviewValue}>
                    {content.anesthesiologist}
                  </Text>
                </View>
              )}
            </View>
          </View>
        );

      case "anesthesia":
        return (
          <View style={styles.sectionContent}>
            <Text style={styles.sectionTitle}>Anesthesia</Text>
            <View style={styles.markdownContainer}>
              <Markdown style={markdownStyles}>
                {content?.anesthesia || "No anesthesia information recorded"}
              </Markdown>
            </View>
          </View>
        );

      case "procedure":
        return (
          <View style={styles.sectionContent}>
            <Text style={styles.sectionTitle}>Procedure</Text>
            <View style={styles.markdownContainer}>
              <Markdown style={markdownStyles}>
                {content?.procedure || "No procedure information recorded"}
              </Markdown>
            </View>
          </View>
        );

      case "operativeCourse":
        return (
          <View style={styles.sectionContent}>
            <Text style={styles.sectionTitle}>Operative Course</Text>
            <View style={styles.markdownContainer}>
              <Markdown style={markdownStyles}>
                {content?.operativeCourse || "No operative course recorded"}
              </Markdown>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.sectionsButton}
              onPress={() => setSheetOpen(true)}
            >
              <Menu size={20} color="#6b7280" />
            </TouchableOpacity>
            <FileText size={24} color="#1e293b" />
            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle}>{report.title}</Text>
              <Text style={styles.headerSubtitle}>
                {new Date(report.date).toLocaleDateString()}
              </Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            {onShare && (
              <TouchableOpacity style={styles.actionButton} onPress={onShare}>
                <Share size={20} color="#6b7280" />
              </TouchableOpacity>
            )}
            {onDownload && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={onDownload}
              >
                <Download size={20} color="#6b7280" />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.actionButton} onPress={onClose}>
              <X size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content - Full Width */}
        <View style={styles.content}>
          <ScrollView style={styles.contentScroll}>
            {renderSectionContent()}
          </ScrollView>
        </View>

        {/* Sections Sheet */}
        {sheetOpen && (
          <>
            <Animated.View
              style={[styles.backdrop, { opacity: backdropFadeAnim }]}
              pointerEvents={sheetOpen ? "auto" : "none"}
            >
              <TouchableOpacity
                style={StyleSheet.absoluteFill}
                onPress={() => setSheetOpen(false)}
                activeOpacity={1}
              />
            </Animated.View>
            <Animated.View
              style={[
                styles.sheet,
                {
                  width: sheetWidth,
                  transform: [{ translateX: sheetSlideAnim }],
                },
              ]}
            >
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Report Sections</Text>
                <TouchableOpacity onPress={() => setSheetOpen(false)}>
                  <X size={20} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.sheetContent}>
                {sections.map((section) => {
                  const SectionIcon = section.icon;
                  const isActive = activeSection === section.id;

                  return (
                    <TouchableOpacity
                      key={section.id}
                      style={[
                        styles.sheetItem,
                        isActive && styles.sheetItemActive,
                      ]}
                      onPress={() => {
                        setActiveSection(section.id);
                        setSheetOpen(false);
                      }}
                    >
                      <SectionIcon
                        size={18}
                        color={isActive ? "#3b82f6" : "#6b7280"}
                      />
                      <Text
                        style={[
                          styles.sheetItemText,
                          isActive && styles.sheetItemTextActive,
                        ]}
                      >
                        {section.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </Animated.View>
          </>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  sectionsButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    marginRight: 12,
  },
  headerInfo: {
    marginLeft: 12,
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 50,
  },
  sheet: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: "white",
    zIndex: 51,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
  },
  sheetContent: {
    flex: 1,
    padding: 16,
  },
  sheetItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  sheetItemActive: {
    backgroundColor: "#eff6ff",
  },
  sheetItemText: {
    marginLeft: 12,
    fontSize: 14,
    fontWeight: "500",
    color: "#6b7280",
  },
  sheetItemTextActive: {
    color: "#3b82f6",
  },
  content: {
    flex: 1,
  },
  contentScroll: {
    flex: 1,
  },
  sectionContent: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 16,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#374151",
  },
  overviewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 24,
  },
  overviewItem: {
    flex: 1,
    minWidth: 150,
    padding: 16,
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  overviewLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  overviewValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  markdownPreview: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  markdownText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#374151",
    marginBottom: 12,
  },
  expandButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#3b82f6",
    borderRadius: 6,
  },
  expandButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "white",
  },
  markdownContainer: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
});

// Markdown styles for better rendering
const markdownStyles = {
  body: {
    fontSize: 16,
    lineHeight: 24,
    color: "#374151",
  },
  heading1: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: "#1e293b",
    marginBottom: 16,
    marginTop: 24,
  },
  heading2: {
    fontSize: 20,
    fontWeight: "600" as const,
    color: "#1e293b",
    marginBottom: 12,
    marginTop: 20,
  },
  heading3: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: "#374151",
    marginBottom: 8,
    marginTop: 16,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    color: "#374151",
    marginBottom: 12,
  },
  strong: {
    fontWeight: "600" as const,
    color: "#1e293b",
  },
  em: {
    fontStyle: "italic" as const,
    color: "#4b5563",
  },
  list_item: {
    fontSize: 16,
    lineHeight: 24,
    color: "#374151",
    marginBottom: 4,
  },
  bullet_list: {
    marginBottom: 12,
  },
  ordered_list: {
    marginBottom: 12,
  },
  code_inline: {
    backgroundColor: "#f1f5f9",
    color: "#e11d48",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 14,
    fontFamily: "monospace",
  },
  code_block: {
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 12,
  },
  fence: {
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 12,
  },
  blockquote: {
    backgroundColor: "#f8fafc",
    borderLeftWidth: 4,
    borderLeftColor: "#3b82f6",
    paddingLeft: 16,
    paddingVertical: 8,
    marginBottom: 12,
    fontStyle: "italic" as const,
  },
  table: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    marginBottom: 12,
  },
  thead: {
    backgroundColor: "#f8fafc",
  },
  th: {
    padding: 12,
    fontWeight: "600" as const,
    color: "#1e293b",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  td: {
    padding: 12,
    color: "#374151",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  hr: {
    backgroundColor: "#e2e8f0",
    height: 1,
    marginVertical: 16,
  },
};
