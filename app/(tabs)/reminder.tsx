import { View, Text, StyleSheet } from "react-native";

export default function Reminders() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔔 Active Reminders</Text>

      <View style={styles.card}>
        <Text>⏰ Duty Preparation</Text>
        <Text>5:00 AM - Tomorrow</Text>
      </View>

      <View style={styles.card}>
        <Text>💊 Medication Practice</Text>
        <Text>6:00 PM - Today</Text>
      </View>

      <View style={styles.card}>
        <Text>📚 Study Reminder</Text>
        <Text>8:00 PM - Tonight</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF5F8",
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FF6FA1",
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#FFE4EC",
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
  },
});