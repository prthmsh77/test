import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, TextInput, FlatList, Alert, KeyboardAvoidingView, Platform, Share, Linking, ActivityIndicator } from "react-native";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as SMS from 'expo-sms';
import { useAuthStore } from "../../src/store/authStore";
import { api } from "../../src/services/api";

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relation: string;
  is_confirmed: boolean;
}

const RELATIONS = ["Parent", "Spouse", "Sibling", "Friend", "Guide", "Other"];

export default function EmergencyContactsScreen() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relation, setRelation] = useState("Parent");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadContacts = useCallback(async () => {
    if (token) api.setToken(token);
    setIsLoading(true);
    const { data, error } = await api.getEmergencyContacts();
    if (data) {
      setContacts(data as EmergencyContact[]);
    } else {
      console.error("Failed to load contacts:", error);
    }
    setIsLoading(false);
  }, [token]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const handleAdd = async () => {
    if (!name.trim() || phone.length < 10) {
      Alert.alert("Error", "Please enter a valid name and 10-digit phone number.");
      return;
    }

    setIsSaving(true);
    const { data, error } = await api.addEmergencyContact({
      name: name.trim(),
      phone: "+91" + phone.trim(),
      relation,
    });

    if (error || !data) {
      Alert.alert("Error", error || "Could not add contact. Please try again.");
      setIsSaving(false);
      return;
    }

    setIsSaving(false);
    setName("");
    setPhone("");
    setShowForm(false);
    await loadContacts();

    const newContact = { name: name.trim(), phone: phone.trim() };
    Alert.alert(
      "Contact Added ✓",
      `Send a confirmation message to ${newContact.name}?`,
      [
        { text: "Later", style: "cancel" },
        {
          text: "Send Direct SMS",
          onPress: () => sendNativeSMSConfirmation(newContact),
        },
        {
          text: "Send via WhatsApp",
          onPress: () => sendWhatsAppConfirmation(newContact),
        },
      ]
    );
  };

  const sendNativeSMSConfirmation = async (contact: { name: string; phone: string }) => {
    const isAvailable = await SMS.isAvailableAsync();
    if (isAvailable) {
      const message = `Hi ${contact.name}! 🏔️\n\nI've added you as my Emergency Contact on Shikhar (India's Trekking Safety App).\n\nWhen I start a trek, you'll receive my live location link.\n\nIn case of emergency, you'll be automatically notified.\n\n— Sent via Shikhar App`;
      await SMS.sendSMSAsync([contact.phone], message);
    } else {
      Alert.alert("Error", "SMS is not available on this device.");
    }
  };

  const sendWhatsAppConfirmation = (contact: { name: string; phone: string }) => {
    const message = `Hi ${contact.name}! 🏔️\n\nI've added you as my Emergency Contact on *Shikhar* (India's Trekking Safety App).\n\nWhen I start a trek, you'll receive my live location link so you can track me in real-time.\n\nIn case of emergency, you'll be automatically notified via SMS and calls.\n\n— Sent via Shikhar App`;
    const url = `whatsapp://send?phone=91${contact.phone}&text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert("Error", "WhatsApp is not installed on this device.");
    });
  };

  const handleDelete = (id: string) => {
    Alert.alert("Remove Contact", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          const { error } = await api.deleteEmergencyContact(id);
          if (error) {
            Alert.alert("Error", error || "Could not remove contact.");
            return;
          }
          setContacts((prev) => prev.filter((c) => c.id !== id));
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Emergency Contacts</Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={20} color="#60A5FA" />
          <Text style={styles.infoText}>
            These contacts will be notified via SMS when you start a trek, and will receive escalation alerts if you go silent.
          </Text>
        </View>

        {/* Contact List */}
        {isLoading ? (
          <ActivityIndicator color="#FFF" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={contacts}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            onRefresh={loadContacts}
            refreshing={isLoading}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color="#333" />
                <Text style={styles.emptyText}>No emergency contacts yet</Text>
                <Text style={styles.emptySubtext}>
                  Add up to 5 contacts who will be notified during your treks.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.contactCard}>
                <View style={styles.contactInfo}>
                  <View style={styles.contactAvatar}>
                    <Text style={styles.contactInitial}>
                      {item.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.contactName}>{item.name}</Text>
                    <Text style={styles.contactPhone}>{item.phone}</Text>
                    <View style={styles.contactMeta}>
                      <View style={styles.relationBadge}>
                        <Text style={styles.relationText}>{item.relation}</Text>
                      </View>
                      <View style={[styles.statusBadge, item.is_confirmed ? styles.confirmed : styles.pending]}>
                        <Text style={[styles.statusText, { color: item.is_confirmed ? "#4ADE80" : "#FACC15" }]}>
                          {item.is_confirmed ? "Confirmed" : "Pending"}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => handleDelete(item.id)}>
                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        )}

        {/* Add Form */}
        {showForm ? (
          <View style={styles.formOverlay}>
            <Text style={styles.formTitle}>Add Emergency Contact</Text>

            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Contact name"
              placeholderTextColor="#555"
              value={name}
              onChangeText={setName}
              autoFocus
            />

            <Text style={styles.label}>Phone</Text>
            <View style={styles.phoneRow}>
              <Text style={styles.phonePrefix}>+91</Text>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="00000 00000"
                placeholderTextColor="#555"
                keyboardType="phone-pad"
                maxLength={10}
                value={phone}
                onChangeText={setPhone}
              />
            </View>

            <Text style={styles.label}>Relation</Text>
            <View style={styles.relationRow}>
              {RELATIONS.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.relationChip, relation === r && styles.relationChipActive]}
                  onPress={() => setRelation(r)}
                >
                  <Text style={[styles.relationChipText, relation === r && styles.relationChipTextActive]}>
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.formButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowForm(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addBtn, isSaving && styles.addBtnDisabled]}
                onPress={handleAdd}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.addBtnText}>Add Contact</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          contacts.length < 5 && (
            <TouchableOpacity style={styles.floatingAdd} onPress={() => setShowForm(true)}>
              <Ionicons name="add" size={28} color="#000" />
            </TouchableOpacity>
          )
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "#1A1A1A", justifyContent: "center", alignItems: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#FFF" },
  infoCard: {
    flexDirection: "row", backgroundColor: "#0A1530", marginHorizontal: 20,
    padding: 14, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: "#1A2540",
    alignItems: "flex-start", gap: 10,
  },
  infoText: { color: "#60A5FA", fontSize: 13, lineHeight: 20, flex: 1 },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  emptyState: { alignItems: "center", paddingTop: 60 },
  emptyText: { color: "#555", fontSize: 18, fontWeight: "600", marginTop: 16 },
  emptySubtext: { color: "#444", fontSize: 14, textAlign: "center", marginTop: 8, paddingHorizontal: 40 },
  contactCard: {
    backgroundColor: "#111", borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: "#1A1A1A",
  },
  contactInfo: { flexDirection: "row", alignItems: "center" },
  contactAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: "#222",
    justifyContent: "center", alignItems: "center", marginRight: 12,
  },
  contactInitial: { color: "#FFF", fontSize: 18, fontWeight: "bold" },
  contactName: { color: "#FFF", fontSize: 16, fontWeight: "600" },
  contactPhone: { color: "#888", fontSize: 13, marginTop: 2 },
  contactMeta: { flexDirection: "row", gap: 8, marginTop: 6 },
  relationBadge: { backgroundColor: "#1A1A1A", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  relationText: { color: "#888", fontSize: 11 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  confirmed: { backgroundColor: "#0A2A0A" },
  pending: { backgroundColor: "#2A2A0A" },
  statusText: { fontSize: 11 },
  formOverlay: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "#111", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, borderTopWidth: 1, borderColor: "#222",
  },
  formTitle: { color: "#FFF", fontSize: 20, fontWeight: "bold", marginBottom: 20 },
  label: { color: "#888", fontSize: 12, fontWeight: "600", marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: "#1A1A1A", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    color: "#FFF", fontSize: 16, borderWidth: 1, borderColor: "#222",
  },
  phoneRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  phonePrefix: { color: "#FFF", fontSize: 16, fontWeight: "600" },
  relationRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  relationChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: "#1A1A1A", borderWidth: 1, borderColor: "#222",
  },
  relationChipActive: { backgroundColor: "#FFF", borderColor: "#FFF" },
  relationChipText: { color: "#888", fontSize: 13 },
  relationChipTextActive: { color: "#000", fontWeight: "bold" },
  formButtons: { flexDirection: "row", gap: 12, marginTop: 24 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: "center",
    borderWidth: 1, borderColor: "#333",
  },
  cancelBtnText: { color: "#888", fontSize: 16, fontWeight: "600" },
  addBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: "center", backgroundColor: "#FFF" },
  addBtnDisabled: { backgroundColor: "#555" },
  addBtnText: { color: "#000", fontSize: 16, fontWeight: "bold" },
  floatingAdd: {
    position: "absolute", bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28, backgroundColor: "#FFF",
    justifyContent: "center", alignItems: "center",
    shadowColor: "#FFF", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12,
    elevation: 5,
  },
});
