import { View, Text, StyleSheet } from "react-native";

export default function Calendar() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>📅 Schedule Overview</Text>

      <View style={styles.card}>
        <Text>Monday - Duty (ER) - 6:00 AM</Text>
      </View>

      <View style={styles.card}>
        <Text>Tuesday - Study - Pharmacology</Text>
      </View>

      <View style={styles.card}>
        <Text>Wednesday - Clinical Rotation</Text>
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