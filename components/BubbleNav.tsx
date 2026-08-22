import {
  View, StyleSheet, TouchableOpacity,
  Animated, Pressable, Platform, Image,
} from "react-native";
import { useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";

const SNOWED_ICON = require("../assets/images/notification-icon.png");

// 6 destinations — compact semicircle arc above the bubble
const NAV_ITEMS = [
  { key: "home",        icon: "home-outline",          route: "/(tabs)/home"        },
  { key: "calendar",    icon: "calendar-outline",      route: "/(tabs)/calendar"    },
  { key: "courses",     icon: "library-outline",       route: "/(tabs)/courses"     },
  { key: "reminders",   icon: "notifications-outline", route: "/(tabs)/reminders"   },
  { key: "notes",       icon: "document-text-outline", route: "/(tabs)/notes"       },
  { key: "research",    icon: "globe-outline",         route: "/(tabs)/research"    },
] as const;

// Keep the destinations close enough to feel like one navigation cluster.
// 6 destinations — symmetrical arc with a consistent radius of ~113
const RADIAL = [
  { dx: -110, dy: -25 },  // home      — far left
  { dx:  -80, dy: -80 },  // calendar  — mid left
  { dx:  -30, dy: -110 }, // courses   — top left
  { dx:   30, dy: -110 }, // reminders — top right
  { dx:   80, dy: -80 },  // notes     — mid right
  { dx:  110, dy: -25 },  // research  — far right
];

const OPEN_MS  = 160;
const CLOSE_MS = 120;
const STAGGER  = 20;

export function BubbleNav() {
  const { colors, mode } = useTheme();
  const insets   = useSafeAreaInsets();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const anims = useRef(NAV_ITEMS.map(() => new Animated.Value(0))).current;
  const scrim = useRef(new Animated.Value(0)).current;

  const openMenu = () => {
    setOpen(true);
    Animated.timing(scrim, { toValue: 1, duration: OPEN_MS, useNativeDriver: true }).start();
    NAV_ITEMS.forEach((_, i) => {
      Animated.timing(anims[i], {
        toValue: 1, duration: OPEN_MS, delay: i * STAGGER, useNativeDriver: true,
      }).start();
    });
  };

  const closeMenu = (cb?: () => void) => {
    Animated.timing(scrim, { toValue: 0, duration: CLOSE_MS, useNativeDriver: true }).start();
    Animated.parallel(
      anims.map(a => Animated.timing(a, { toValue: 0, duration: CLOSE_MS, useNativeDriver: true }))
    ).start(() => { setOpen(false); cb?.(); });
  };

  const navigate = (route: string) => closeMenu(() => router.navigate(route as any));

  const bottomInset = insets.bottom > 0 ? insets.bottom : (Platform.OS === "android" ? 16 : 0);
  const iconBg = mode === "light" ? colors.primaryDark : colors.primaryLight;

  return (
    <>
      {open && (
        <Animated.View style={[s.scrim, { opacity: scrim }]} pointerEvents="auto">
          <Pressable style={StyleSheet.absoluteFill} onPress={() => closeMenu()} />
        </Animated.View>
      )}

      <View style={[s.container, { bottom: bottomInset + 24 }]} pointerEvents="box-none">
        {NAV_ITEMS.map((item, i) => {
          const { dx, dy } = RADIAL[i];
          const isActive   = pathname.includes(item.key);

          return (
            <Animated.View
              key={item.key}
              pointerEvents={open ? "auto" : "none"}
              style={[
                s.itemWrap,
                {
                  opacity: anims[i],
                  transform: [
                    { translateX: anims[i].interpolate({ inputRange: [0,1], outputRange: [0, dx] }) },
                    { translateY: anims[i].interpolate({ inputRange: [0,1], outputRange: [0, dy] }) },
                    { scale:      anims[i].interpolate({ inputRange: [0,1], outputRange: [0.3, 1] }) },
                  ],
                },
              ]}
            >
              <TouchableOpacity
                onPress={() => navigate(item.route)}
                activeOpacity={0.8}
                style={[
                  s.navBubble,
                  {
                    backgroundColor: isActive ? colors.primary : colors.card,
                    borderColor:     isActive ? colors.primary : colors.cardBorder,
                    shadowColor:     colors.primary,
                  },
                ]}
              >
                <Ionicons
                  name={item.icon as any}
                  size={20}
                  color={isActive ? "#fff" : colors.primary}
                />
              </TouchableOpacity>
            </Animated.View>
          );
        })}

        {/* Main bubble — SnowEd mascot */}
        <TouchableOpacity
          onPress={() => open ? closeMenu() : openMenu()}
          activeOpacity={0.88}
          style={[s.mainBubble, { backgroundColor: iconBg, shadowColor: colors.primary }]}
        >
          {open
            ? <Ionicons name="close" size={26} color="#fff" />
            : <Image source={SNOWED_ICON} style={s.mascot} resizeMode="contain" />
          }
        </TouchableOpacity>
      </View>
    </>
  );
}

const MAIN = 64;
const NAV  = 48;

const s = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    zIndex: 90,
  },
  container: {
    position: "absolute", alignSelf: "center",
    alignItems: "center", justifyContent: "center",
    zIndex: 100, width: MAIN, height: MAIN,
  },
  itemWrap:  { position: "absolute" },
  navBubble: {
    width: NAV, height: NAV, borderRadius: NAV / 2,
    borderWidth: 1, alignItems: "center", justifyContent: "center",
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3,
    shadowRadius: 8, elevation: 8,
  },
  mainBubble: {
    width: MAIN, height: MAIN, borderRadius: MAIN / 2,
    alignItems: "center", justifyContent: "center",
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45,
    shadowRadius: 14, elevation: 14,
  },
  mascot: { width: 42, height: 42 },
});