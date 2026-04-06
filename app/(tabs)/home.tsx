import { View, Text, StyleSheet, FlatList } from "react-native";
import { useEffect, useState } from "react";
import { getSchedulesByDate } from "../../src/services/api";

export default function Home() {
  const [schedules, setSchedules] = useState<any[]>([]);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      const data = await getSchedulesByDate(today);
      setSchedules(data);
    } catch (error) {
      console.log("Error fetching schedules:", error);
    }
  };

  const now = new Date();

  const nextEvent = schedules.find((item) => {
    const eventTime = new Date(`${item.date}T${item.startTime}`);
    return eventTime > now;
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🏠 Today’s Schedule</Text>

      {/* NEXT EVENT */}
      {nextEvent && (
        <View style={styles.highlightCard}>
          <Text style={styles.cardTitle}>⏭ Next Event</Text>
          <Text>{nextEvent.title}</Text>
          <Text>{nextEvent.startTime}</Text>
        </View>
      )}

      {/* LIST */}
      <FlatList
        data={schedules}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.type}</Text>
            <Text>{item.title}</Text>
            <Text>{item.startTime}</Text>
            <Text>
              {item.isCompleted ? "✅ Done" : "⏳ Pending"}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", marginTop: 20 }}>
            No schedules for today 🎉
          </Text>
        }
      />
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
    marginBottom: 15,
  },
  card: {
    backgroundColor: "#FFE4EC",
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
  },
  highlightCard: {
    backgroundColor: "#FFDEE9",
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
  },
  cardTitle: {
    fontWeight: "bold",
    color: "#C97C95",
  },
});