import { useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ProfileData = {
  name: string; course: string; year: string;
  section: string; school: string; avatar: string | null;
};

const DEFAULT: ProfileData = {
  name: "", course: "", year: "1st Year",
  section: "", school: "", avatar: null,
};

export function useProfile() {
  const [profile, setProfile] = useState<ProfileData>(DEFAULT);

  const load = useCallback(async () => {
    const v = await AsyncStorage.getItem("profileData");
    if (v) setProfile(JSON.parse(v));
  }, []);

  const save = async (data: ProfileData) => {
    setProfile(data);
    await AsyncStorage.setItem("profileData", JSON.stringify(data));
  };

  return { profile, load, save, setProfile };
}