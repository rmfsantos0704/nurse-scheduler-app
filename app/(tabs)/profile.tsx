import { View, Text, StyleSheet } from "react-native";

export default function Profile() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>👤 Student Profile</Text>

      <View style={styles.card}>
        <Text>Name: Juan Dela Cruz</Text>
        <Text>Course: BS Nursing</Text>
        <Text>Year: 3rd Year</Text>
      </View>

      <View style={styles.card}>
        <Text>⚙️ Settings</Text>
        <Text>- Notifications</Text>
        <Text>- Theme: Light Pink</Text>
        <Text>- Account Sync</Text>
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