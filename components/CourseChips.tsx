import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from "react-native";

interface Course {
  _id: string;
  name: string;
  color?: string;
}

interface CourseChipsProps {
  courses: Course[];
  selectedCourseId: string | null;
  onSelect: (id: string | null) => void;
  colors: any;
}

export function CourseChips({ courses, selectedCourseId, onSelect, colors }: CourseChipsProps) {
  if (courses.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.row}
    >
      {/* "All" chip */}
      <TouchableOpacity
        onPress={() => onSelect(null)}
        style={[
          s.chip,
          {
            backgroundColor: selectedCourseId === null ? colors.primary : colors.card,
            borderColor: selectedCourseId === null ? colors.primary : colors.cardBorder,
          },
        ]}
        activeOpacity={0.75}
      >
        <Text style={[s.chipTxt, { color: selectedCourseId === null ? "#fff" : colors.textSecondary }]}>
          All
        </Text>
      </TouchableOpacity>

      {courses.map(course => {
        const isActive = selectedCourseId === course._id;
        const dotColor = course.color || colors.primary;
        return (
          <TouchableOpacity
            key={course._id}
            onPress={() => onSelect(isActive ? null : course._id)}
            style={[
              s.chip,
              {
                backgroundColor: isActive ? dotColor + "22" : colors.card,
                borderColor: isActive ? dotColor : colors.cardBorder,
              },
            ]}
            activeOpacity={0.75}
          >
            <View style={[s.dot, { backgroundColor: dotColor }]} />
            <Text style={[s.chipTxt, { color: isActive ? dotColor : colors.textSecondary }]}>
              {course.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  row:     { flexDirection: "row", gap: 8, paddingBottom: 4 },
  chip:    { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 0.5 },
  dot:     { width: 7, height: 7, borderRadius: 4 },
  chipTxt: { fontSize: 12, fontWeight: "500" },
});
