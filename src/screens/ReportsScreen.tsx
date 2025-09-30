import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Animated,
  Modal,
  Pressable,
} from "react-native";
import {
  Search,
  FileText,
  User,
  Calendar,
  MoreVertical,
  Eye,
  Download,
  CheckCircle,
  Edit3,
  ChevronDown,
} from "lucide-react-native";
import { Report } from "../types";
import { PatientService } from "../services/patientService";
import { useReports } from "../hooks/useDataStore";

interface ReportCardProps {
  report: Report;
  index: number;
  onEdit: () => void;
}

const ReportCard: React.FC<ReportCardProps> = ({ report, index, onEdit }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [buttonLayout, setButtonLayout] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(10)).current;

  // Get patient name from service
  const patient = PatientService.getPatient(report.patientId);
  const patientName = patient?.name || "Unknown Patient";
  const dropdownAnim = useRef(new Animated.Value(0)).current;
  const buttonRef = useRef<any>(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 50,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        delay: index * 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index]);

  useEffect(() => {
    Animated.spring(dropdownAnim, {
      toValue: showDropdown ? 1 : 0,
      tension: 300,
      friction: 20,
      useNativeDriver: true,
    }).start();
  }, [showDropdown]);

  const getStatusColor = (status: Report["status"]) => {
    switch (status) {
      case "Generated":
        return { bg: "#dbeafe", text: "#1e40af", border: "#bfdbfe" };
      case "Reviewed":
        return { bg: "#fef3c7", text: "#92400e", border: "#fcd34d" };
      case "Approved":
        return { bg: "#d1fae5", text: "#065f46", border: "#a7f3d0" };
      default:
        return { bg: "#f1f5f9", text: "#475569", border: "#cbd5e1" };
    }
  };

  const statusColor = getStatusColor(report.status);

  const handleMorePress = () => {
    if (buttonRef.current) {
      buttonRef.current.measure((x, y, width, height, pageX, pageY) => {
        setButtonLayout({ x: pageX, y: pageY, width, height });
        setShowDropdown(true);
      });
    }
  };

  return (
    <Animated.View
      style={[
        styles.reportCard,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.iconContainer}>
        <FileText size={18} color="#2563eb" />
      </View>
      <View style={styles.reportInfo}>
        <Text style={styles.reportTitle} numberOfLines={1}>
          {report.title}
        </Text>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <User size={14} color="#64748b" />
            <Text style={styles.metaText}>{patientName}</Text>
          </View>
          <View style={styles.metaItem}>
            <Calendar size={14} color="#64748b" />
            <Text style={styles.metaText}>{report.date}</Text>
          </View>
        </View>
        <View style={styles.badgeRow}>
          <View
            style={[
              styles.badge,
              {
                backgroundColor: statusColor.bg,
                borderColor: statusColor.border,
              },
            ]}
          >
            <Text style={[styles.badgeText, { color: statusColor.text }]}>
              {report.status}
            </Text>
          </View>
          <View style={[styles.badge, styles.generatedByBadge]}>
            <Text style={[styles.badgeText, styles.generatedByText]}>
              {report.generatedBy}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.menuContainer}>
        <TouchableOpacity
          ref={buttonRef}
          style={styles.moreButton}
          onPress={handleMorePress}
        >
          <MoreVertical size={16} color="#64748b" />
        </TouchableOpacity>

        <Modal
          visible={showDropdown}
          transparent
          animationType="none"
          onRequestClose={() => setShowDropdown(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowDropdown(false)}
          >
            <Animated.View
              style={[
                styles.dropdown,
                {
                  position: "absolute",
                  top: buttonLayout.y + buttonLayout.height + 4,
                  right: 16,
                  opacity: dropdownAnim,
                  transform: [
                    {
                      scale: dropdownAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.95, 1],
                      }),
                    },
                    {
                      translateY: dropdownAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-10, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setShowDropdown(false);
                  // Handle view
                }}
              >
                <Eye size={16} color="#2563eb" />
                <Text style={styles.dropdownText}>View Report</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setShowDropdown(false);
                  // Handle download
                }}
              >
                <Download size={16} color="#059669" />
                <Text style={styles.dropdownText}>Download PDF</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.dropdownItem,
                  report.status === "Approved" && styles.dropdownItemDisabled,
                ]}
                onPress={() => {
                  if (report.status !== "Approved") {
                    setShowDropdown(false);
                    // Handle approve
                  }
                }}
                disabled={report.status === "Approved"}
              >
                <CheckCircle
                  size={16}
                  color={report.status === "Approved" ? "#94a3b8" : "#10b981"}
                />
                <Text
                  style={[
                    styles.dropdownText,
                    report.status === "Approved" && styles.dropdownTextDisabled,
                  ]}
                >
                  {report.status === "Approved"
                    ? "Already Approved"
                    : "Approve Report"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setShowDropdown(false);
                  onEdit();
                }}
              >
                <Edit3 size={16} color="#7c3aed" />
                <Text style={styles.dropdownText}>Edit Report</Text>
              </TouchableOpacity>
            </Animated.View>
          </Pressable>
        </Modal>
      </View>
    </Animated.View>
  );
};

export const ReportsScreen: React.FC<{
  onEditReport?: (report: Report) => void;
}> = ({ onEditReport }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | Report["status"]>(
    "all"
  );
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const dropdownAnim = useRef(new Animated.Value(0)).current;

  // Use the hook to get reports with automatic updates
  const reports = useReports();

  useEffect(() => {
    Animated.spring(dropdownAnim, {
      toValue: showStatusDropdown ? 1 : 0,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [showStatusDropdown]);

  const filteredReports = reports.filter((report) => {
    const patient = PatientService.getPatient(report.patientId);
    const patientName = patient?.name || "Unknown Patient";

    const matchesSearch =
      report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.status.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      filterStatus === "all" || report.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  return (
    <View style={styles.container}>
      {/* Search and Filters */}
      <View style={styles.headerContainer}>
        {/* Search */}
        <View style={styles.searchWrapper}>
          <Search size={18} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by report, patient, or status..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94a3b8"
          />
        </View>

        {/* Status Dropdown */}
        <View style={styles.dropdownWrapper}>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setShowStatusDropdown(!showStatusDropdown)}
          >
            <Text style={styles.dropdownButtonText}>
              {filterStatus === "all" ? "All Status" : filterStatus}
            </Text>
            <Animated.View
              style={{
                transform: [
                  {
                    rotate: dropdownAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0deg", "180deg"],
                    }),
                  },
                ],
              }}
            >
              <ChevronDown size={18} color="#64748b" />
            </Animated.View>
          </TouchableOpacity>

          {showStatusDropdown && (
            <Modal
              transparent
              visible={showStatusDropdown}
              onRequestClose={() => setShowStatusDropdown(false)}
            >
              <Pressable
                style={styles.dropdownOverlay}
                onPress={() => setShowStatusDropdown(false)}
              >
                <Animated.View
                  style={[
                    styles.dropdownMenu,
                    {
                      opacity: dropdownAnim,
                      transform: [
                        {
                          scale: dropdownAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.95, 1],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  {[
                    {
                      value: "all" as const,
                      label: "All Status",
                      color: "#64748b",
                    },
                    {
                      value: "Generated" as const,
                      label: "Generated",
                      color: "#2563eb",
                    },
                    {
                      value: "Reviewed" as const,
                      label: "Reviewed",
                      color: "#f59e0b",
                    },
                    {
                      value: "Approved" as const,
                      label: "Approved",
                      color: "#10b981",
                    },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.dropdownOption,
                        filterStatus === option.value &&
                          styles.dropdownOptionActive,
                      ]}
                      onPress={() => {
                        setFilterStatus(option.value);
                        setShowStatusDropdown(false);
                      }}
                    >
                      <View
                        style={[
                          styles.optionDot,
                          { backgroundColor: option.color },
                        ]}
                      />
                      <Text
                        style={[
                          styles.dropdownOptionText,
                          filterStatus === option.value &&
                            styles.dropdownOptionTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                      {filterStatus === option.value && (
                        <CheckCircle size={16} color="#3b82f6" />
                      )}
                    </TouchableOpacity>
                  ))}
                </Animated.View>
              </Pressable>
            </Modal>
          )}
        </View>
      </View>

      {/* Reports List */}
      <FlatList
        data={filteredReports}
        renderItem={({ item, index }) => (
          <ReportCard
            report={item}
            index={index}
            onEdit={() => onEditReport?.(item)}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <FileText size={24} color="#94a3b8" />
            </View>
            <Text style={styles.emptyText}>No reports found</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc", // slate-50
  },
  headerContainer: {
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    padding: 16,
    gap: 12,
  },
  searchWrapper: {
    position: "relative",
  },
  searchIcon: {
    position: "absolute",
    left: 14,
    top: "50%",
    marginTop: -9,
    zIndex: 1,
  },
  searchInput: {
    paddingLeft: 44,
    paddingRight: 16,
    paddingVertical: 12,
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    fontSize: 15,
    color: "#1e293b",
  },
  dropdownWrapper: {
    position: "relative",
  },
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  dropdownButtonText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#1e293b",
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.15)",
    justifyContent: "flex-start",
    paddingTop: 160,
    paddingHorizontal: 16,
  },
  dropdownMenu: {
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    paddingVertical: 4,
  },
  dropdownOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  dropdownOptionActive: {
    backgroundColor: "#eff6ff",
  },
  optionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dropdownOptionText: {
    flex: 1,
    fontSize: 15,
    color: "#475569",
    fontWeight: "500",
  },
  dropdownOptionTextActive: {
    color: "#1e293b",
    fontWeight: "600",
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  reportCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0", // slate-200
    gap: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: "#dbeafe", // blue-100
    alignItems: "center",
    justifyContent: "center",
  },
  reportInfo: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1e293b", // slate-800
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: "#64748b", // slate-500
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "500",
  },
  generatedByBadge: {
    backgroundColor: "#f3e8ff", // purple-100
    borderColor: "#e9d5ff", // purple-200
  },
  generatedByText: {
    color: "#7c3aed", // purple-700
  },
  menuContainer: {
    position: "relative",
  },
  moreButton: {
    padding: 8,
    borderRadius: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.15)",
  },
  dropdown: {
    width: 200,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    padding: 8,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  dropdownItemDisabled: {
    opacity: 0.5,
  },
  dropdownText: {
    fontSize: 14,
    color: "#475569",
  },
  dropdownTextDisabled: {
    color: "#94a3b8",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#e2e8f0", // slate-200
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: "#64748b", // slate-500
  },
});
